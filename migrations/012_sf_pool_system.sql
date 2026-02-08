-- ============================================
-- SQUARE FOOTAGE POOL BILLING SYSTEM
-- ============================================
-- Organizations buy SF to share among members
-- Members create projects that subtract from the pool
-- Full transaction history for audit trail

-- Add SF pool tracking to organizations table
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS sf_pool_total INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS sf_pool_used INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS sf_pool_updated_at TIMESTAMPTZ DEFAULT now();

-- Add comment for documentation
COMMENT ON COLUMN organizations.sf_pool_total IS 'Total square footage purchased for this organization';
COMMENT ON COLUMN organizations.sf_pool_used IS 'Square footage consumed by projects';
COMMENT ON COLUMN organizations.sf_pool_updated_at IS 'Last time the pool was modified';

-- Create SF pool transactions table for audit trail
CREATE TABLE IF NOT EXISTS sf_pool_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,

  -- Transaction type: "purchase" (adds SF) or "usage" (subtracts SF)
  transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('purchase', 'usage', 'refund', 'adjustment')),

  -- Amount (positive for purchase/refund, negative for usage)
  sf_amount INTEGER NOT NULL,

  -- Running balance after this transaction
  sf_balance_after INTEGER NOT NULL,

  -- Purchase details (for purchase transactions)
  price_cents INTEGER,
  stripe_payment_id VARCHAR(255),
  stripe_session_id VARCHAR(255),

  -- Metadata
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_sf_pool_transactions_org_id ON sf_pool_transactions(org_id);
CREATE INDEX IF NOT EXISTS idx_sf_pool_transactions_created_at ON sf_pool_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sf_pool_transactions_type ON sf_pool_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_sf_pool_transactions_project ON sf_pool_transactions(project_id) WHERE project_id IS NOT NULL;

-- RLS Policies
ALTER TABLE sf_pool_transactions ENABLE ROW LEVEL SECURITY;

-- Allow org members to view their org's SF transactions
CREATE POLICY "Org members can view SF transactions" ON sf_pool_transactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.org_id = sf_pool_transactions.org_id
        AND organization_members.user_id = auth.uid()
    )
  );

-- Allow org members to insert transactions (controlled by API)
CREATE POLICY "Org members can insert SF transactions" ON sf_pool_transactions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.org_id = sf_pool_transactions.org_id
        AND organization_members.user_id = auth.uid()
    )
  );

-- ============================================
-- FUNCTION: Deduct SF from pool atomically
-- ============================================
-- Used when a project consumes SF from the pool
-- Returns: { success: boolean, message: string, remaining: number }

CREATE OR REPLACE FUNCTION deduct_sf_from_pool(
  p_org_id UUID,
  p_user_id UUID,
  p_project_id UUID,
  p_sf_amount INTEGER,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_total INTEGER;
  v_current_used INTEGER;
  v_available INTEGER;
  v_new_used INTEGER;
  v_new_balance INTEGER;
BEGIN
  -- Lock the organization row to prevent race conditions
  SELECT sf_pool_total, sf_pool_used
  INTO v_current_total, v_current_used
  FROM organizations
  WHERE id = p_org_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Organization not found',
      'remaining', 0
    );
  END IF;

  v_available := v_current_total - v_current_used;

  -- Check if there's enough SF available
  IF p_sf_amount > v_available THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Insufficient square footage. Available: ' || v_available || ' SF, Required: ' || p_sf_amount || ' SF',
      'remaining', v_available
    );
  END IF;

  -- Calculate new values
  v_new_used := v_current_used + p_sf_amount;
  v_new_balance := v_current_total - v_new_used;

  -- Update the organization pool
  UPDATE organizations
  SET
    sf_pool_used = v_new_used,
    sf_pool_updated_at = now()
  WHERE id = p_org_id;

  -- Create transaction record
  INSERT INTO sf_pool_transactions (
    org_id,
    user_id,
    project_id,
    transaction_type,
    sf_amount,
    sf_balance_after,
    notes
  ) VALUES (
    p_org_id,
    p_user_id,
    p_project_id,
    'usage',
    -p_sf_amount,  -- Negative for usage
    v_new_balance,
    COALESCE(p_notes, 'Project SF consumption')
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Successfully deducted ' || p_sf_amount || ' SF',
    'remaining', v_new_balance
  );
END;
$$;

-- ============================================
-- FUNCTION: Add SF to pool (after purchase)
-- ============================================
-- Used when admin purchases SF for the organization
-- Returns: { success: boolean, message: string, new_total: number }

CREATE OR REPLACE FUNCTION add_sf_to_pool(
  p_org_id UUID,
  p_user_id UUID,
  p_sf_amount INTEGER,
  p_price_cents INTEGER,
  p_stripe_session_id TEXT DEFAULT NULL,
  p_stripe_payment_id TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_total INTEGER;
  v_current_used INTEGER;
  v_new_total INTEGER;
  v_new_balance INTEGER;
BEGIN
  -- Lock the organization row
  SELECT sf_pool_total, sf_pool_used
  INTO v_current_total, v_current_used
  FROM organizations
  WHERE id = p_org_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Organization not found',
      'new_total', 0
    );
  END IF;

  -- Calculate new values
  v_new_total := v_current_total + p_sf_amount;
  v_new_balance := v_new_total - v_current_used;

  -- Update the organization pool
  UPDATE organizations
  SET
    sf_pool_total = v_new_total,
    sf_pool_updated_at = now()
  WHERE id = p_org_id;

  -- Create transaction record
  INSERT INTO sf_pool_transactions (
    org_id,
    user_id,
    project_id,
    transaction_type,
    sf_amount,
    sf_balance_after,
    price_cents,
    stripe_session_id,
    stripe_payment_id,
    notes
  ) VALUES (
    p_org_id,
    p_user_id,
    NULL,  -- No project for purchases
    'purchase',
    p_sf_amount,  -- Positive for purchases
    v_new_balance,
    p_price_cents,
    p_stripe_session_id,
    p_stripe_payment_id,
    COALESCE(p_notes, 'SF pool purchase')
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Successfully added ' || p_sf_amount || ' SF to pool',
    'new_total', v_new_total,
    'remaining', v_new_balance
  );
END;
$$;

-- ============================================
-- FUNCTION: Refund SF to pool
-- ============================================
-- Used when a project is deleted or refunded
-- Returns: { success: boolean, message: string, remaining: number }

CREATE OR REPLACE FUNCTION refund_sf_to_pool(
  p_org_id UUID,
  p_user_id UUID,
  p_project_id UUID,
  p_sf_amount INTEGER,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_total INTEGER;
  v_current_used INTEGER;
  v_new_used INTEGER;
  v_new_balance INTEGER;
BEGIN
  -- Lock the organization row
  SELECT sf_pool_total, sf_pool_used
  INTO v_current_total, v_current_used
  FROM organizations
  WHERE id = p_org_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Organization not found',
      'remaining', 0
    );
  END IF;

  -- Calculate new values (reduce used, don't go below 0)
  v_new_used := GREATEST(0, v_current_used - p_sf_amount);
  v_new_balance := v_current_total - v_new_used;

  -- Update the organization pool
  UPDATE organizations
  SET
    sf_pool_used = v_new_used,
    sf_pool_updated_at = now()
  WHERE id = p_org_id;

  -- Create transaction record
  INSERT INTO sf_pool_transactions (
    org_id,
    user_id,
    project_id,
    transaction_type,
    sf_amount,
    sf_balance_after,
    notes
  ) VALUES (
    p_org_id,
    p_user_id,
    p_project_id,
    'refund',
    p_sf_amount,  -- Positive for refunds
    v_new_balance,
    COALESCE(p_notes, 'SF refund')
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Successfully refunded ' || p_sf_amount || ' SF',
    'remaining', v_new_balance
  );
END;
$$;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION deduct_sf_from_pool TO authenticated;
GRANT EXECUTE ON FUNCTION add_sf_to_pool TO authenticated;
GRANT EXECUTE ON FUNCTION refund_sf_to_pool TO authenticated;
