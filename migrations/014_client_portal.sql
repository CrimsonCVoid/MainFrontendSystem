-- ============================================
-- CLIENT PORTAL & ESTIMATE SHARING SYSTEM
-- ============================================
-- Enables contractors to share estimates with clients via secure links.
-- Clients can view, approve with signature, or request changes.

-- ============================================
-- ESTIMATE SHARES TABLE
-- ============================================
-- Shareable estimate links with tracking and approval workflow
CREATE TABLE IF NOT EXISTS estimate_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,

  -- Share token (public-facing identifier)
  share_token TEXT UNIQUE NOT NULL,

  -- Client information
  client_name TEXT,
  client_email TEXT,
  client_phone TEXT,

  -- Share settings
  expires_at TIMESTAMPTZ,
  password_hash TEXT, -- Optional password protection

  -- Tracking
  view_count INTEGER DEFAULT 0,
  last_viewed_at TIMESTAMPTZ,

  -- Approval workflow
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'viewed', 'approved', 'rejected', 'expired')),
  approved_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,

  -- Signature data (stored as base64 PNG)
  signature_data JSONB, -- { image: "base64...", captured_at: "ISO date", ip_address: "..." }

  -- Notes from creator
  notes TEXT,

  -- Audit
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ESTIMATE SHARE VIEWS TABLE
-- ============================================
-- Track each time a shared estimate is viewed
CREATE TABLE IF NOT EXISTS estimate_share_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  share_id UUID NOT NULL REFERENCES estimate_shares(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT,
  referrer TEXT
);

-- ============================================
-- ESTIMATE RESPONSES TABLE
-- ============================================
-- Client questions, comments, and formal responses
CREATE TABLE IF NOT EXISTS estimate_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  share_id UUID NOT NULL REFERENCES estimate_shares(id) ON DELETE CASCADE,

  -- Response type
  response_type TEXT NOT NULL CHECK (response_type IN ('question', 'comment', 'approval', 'rejection')),

  -- Content
  message TEXT,
  signature_data JSONB, -- For approval responses

  -- Metadata
  client_name TEXT, -- May differ from share.client_name if changed
  ip_address TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_estimate_shares_token ON estimate_shares(share_token);
CREATE INDEX IF NOT EXISTS idx_estimate_shares_project ON estimate_shares(project_id);
CREATE INDEX IF NOT EXISTS idx_estimate_shares_org ON estimate_shares(organization_id);
CREATE INDEX IF NOT EXISTS idx_estimate_shares_status ON estimate_shares(status);
CREATE INDEX IF NOT EXISTS idx_estimate_shares_created ON estimate_shares(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_estimate_share_views_share ON estimate_share_views(share_id);
CREATE INDEX IF NOT EXISTS idx_estimate_responses_share ON estimate_responses(share_id);

-- ============================================
-- RLS POLICIES
-- ============================================
ALTER TABLE estimate_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE estimate_share_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE estimate_responses ENABLE ROW LEVEL SECURITY;

-- Authenticated users can manage shares for projects they have access to
CREATE POLICY "Users can view shares for their org projects"
  ON estimate_shares FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT org_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create shares for their org projects"
  ON estimate_shares FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT org_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update shares for their org projects"
  ON estimate_shares FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT org_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

-- View tracking - authenticated users can view for their orgs
CREATE POLICY "Users can view share views for their org"
  ON estimate_share_views FOR SELECT
  TO authenticated
  USING (
    share_id IN (
      SELECT id FROM estimate_shares WHERE organization_id IN (
        SELECT org_id FROM organization_members WHERE user_id = auth.uid()
      )
    )
  );

-- Responses - authenticated users can view for their orgs
CREATE POLICY "Users can view responses for their org shares"
  ON estimate_responses FOR SELECT
  TO authenticated
  USING (
    share_id IN (
      SELECT id FROM estimate_shares WHERE organization_id IN (
        SELECT org_id FROM organization_members WHERE user_id = auth.uid()
      )
    )
  );

-- ============================================
-- PUBLIC ACCESS FUNCTIONS (SECURITY DEFINER)
-- ============================================
-- These functions allow unauthenticated clients to interact with shared estimates

-- Get share details by token (public access)
CREATE OR REPLACE FUNCTION get_estimate_share_by_token(p_token TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_share RECORD;
  v_project RECORD;
  v_org RECORD;
  v_estimate RECORD;
BEGIN
  -- Find the share
  SELECT * INTO v_share
  FROM estimate_shares
  WHERE share_token = p_token;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Share not found');
  END IF;

  -- Check expiration
  IF v_share.expires_at IS NOT NULL AND v_share.expires_at < NOW() THEN
    -- Update status to expired
    UPDATE estimate_shares SET status = 'expired', updated_at = NOW() WHERE id = v_share.id;
    RETURN json_build_object('success', false, 'error', 'This estimate link has expired');
  END IF;

  -- Get project data
  SELECT * INTO v_project
  FROM projects
  WHERE id = v_share.project_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Project not found');
  END IF;

  -- Get organization data (for branding)
  SELECT id, name, logo_url, settings INTO v_org
  FROM organizations
  WHERE id = v_share.organization_id;

  -- Get estimate data
  SELECT * INTO v_estimate
  FROM project_estimates
  WHERE project_id = v_share.project_id
  ORDER BY created_at DESC
  LIMIT 1;

  -- Return combined data
  RETURN json_build_object(
    'success', true,
    'share', json_build_object(
      'id', v_share.id,
      'status', v_share.status,
      'client_name', v_share.client_name,
      'client_email', v_share.client_email,
      'notes', v_share.notes,
      'requires_password', v_share.password_hash IS NOT NULL,
      'approved_at', v_share.approved_at,
      'created_at', v_share.created_at
    ),
    'project', json_build_object(
      'id', v_project.id,
      'name', v_project.name,
      'address', v_project.address,
      'city', v_project.city,
      'state', v_project.state,
      'postal_code', v_project.postal_code,
      'square_footage', v_project.square_footage,
      'roof_data', v_project.roof_data
    ),
    'organization', json_build_object(
      'id', v_org.id,
      'name', v_org.name,
      'logo_url', v_org.logo_url,
      'settings', v_org.settings
    ),
    'estimate', CASE WHEN v_estimate IS NOT NULL THEN json_build_object(
      'id', v_estimate.id,
      'name', v_estimate.name,
      'materials_cost', v_estimate.materials_cost,
      'labor_cost', v_estimate.labor_cost,
      'permits_fees', v_estimate.permits_fees,
      'contingency', v_estimate.contingency,
      'notes', v_estimate.notes
    ) ELSE NULL END
  );
END;
$$;

-- Record a view (public access)
CREATE OR REPLACE FUNCTION record_estimate_view(
  p_token TEXT,
  p_ip_address TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_referrer TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_share RECORD;
BEGIN
  -- Find the share
  SELECT * INTO v_share
  FROM estimate_shares
  WHERE share_token = p_token;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Share not found');
  END IF;

  -- Insert view record
  INSERT INTO estimate_share_views (share_id, ip_address, user_agent, referrer)
  VALUES (v_share.id, p_ip_address, p_user_agent, p_referrer);

  -- Update share view count and status
  UPDATE estimate_shares
  SET
    view_count = view_count + 1,
    last_viewed_at = NOW(),
    status = CASE WHEN status = 'pending' THEN 'viewed' ELSE status END,
    updated_at = NOW()
  WHERE id = v_share.id;

  RETURN json_build_object('success', true);
END;
$$;

-- Submit client response (public access)
CREATE OR REPLACE FUNCTION submit_estimate_response(
  p_token TEXT,
  p_response_type TEXT,
  p_message TEXT DEFAULT NULL,
  p_signature_data JSONB DEFAULT NULL,
  p_client_name TEXT DEFAULT NULL,
  p_ip_address TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_share RECORD;
BEGIN
  -- Validate response type
  IF p_response_type NOT IN ('question', 'comment', 'approval', 'rejection') THEN
    RETURN json_build_object('success', false, 'error', 'Invalid response type');
  END IF;

  -- Find the share
  SELECT * INTO v_share
  FROM estimate_shares
  WHERE share_token = p_token;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Share not found');
  END IF;

  -- Check if already approved/rejected
  IF v_share.status IN ('approved', 'rejected') AND p_response_type IN ('approval', 'rejection') THEN
    RETURN json_build_object('success', false, 'error', 'This estimate has already been ' || v_share.status);
  END IF;

  -- Insert response
  INSERT INTO estimate_responses (share_id, response_type, message, signature_data, client_name, ip_address)
  VALUES (v_share.id, p_response_type, p_message, p_signature_data, p_client_name, p_ip_address);

  -- Update share status if approval/rejection
  IF p_response_type = 'approval' THEN
    UPDATE estimate_shares
    SET
      status = 'approved',
      approved_at = NOW(),
      signature_data = p_signature_data,
      updated_at = NOW()
    WHERE id = v_share.id;
  ELSIF p_response_type = 'rejection' THEN
    UPDATE estimate_shares
    SET
      status = 'rejected',
      rejected_at = NOW(),
      updated_at = NOW()
    WHERE id = v_share.id;
  END IF;

  RETURN json_build_object(
    'success', true,
    'message', CASE
      WHEN p_response_type = 'approval' THEN 'Estimate approved successfully'
      WHEN p_response_type = 'rejection' THEN 'Feedback submitted successfully'
      ELSE 'Response submitted successfully'
    END
  );
END;
$$;

-- Grant execute to anon and authenticated
GRANT EXECUTE ON FUNCTION get_estimate_share_by_token(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION record_estimate_view(TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION submit_estimate_response(TEXT, TEXT, TEXT, JSONB, TEXT, TEXT) TO anon, authenticated;
