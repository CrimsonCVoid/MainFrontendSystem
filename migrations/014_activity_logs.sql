-- ============================================
-- ACTIVITY LOGS TABLE
-- ============================================
-- Comprehensive logging for admin visibility
-- Tracks all significant actions: project creation, SF usage, payments, etc.

CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Context
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,

  -- Action details
  action VARCHAR(100) NOT NULL, -- e.g., 'project.created', 'sf.purchased', 'member.invited'
  action_category VARCHAR(50) NOT NULL, -- e.g., 'project', 'billing', 'member', 'auth'

  -- Rich metadata
  details JSONB DEFAULT '{}'::jsonb, -- Flexible payload for action-specific data

  -- Snapshot data (for historical accuracy)
  user_email VARCHAR(255),
  user_name VARCHAR(255),
  org_name VARCHAR(255),
  project_name VARCHAR(255),

  -- Metrics (for quick queries)
  sf_amount INT, -- SF involved in this action (if applicable)
  amount_cents INT, -- Money involved (if applicable)

  -- Status
  status VARCHAR(20) DEFAULT 'success', -- success, failed, pending
  error_message TEXT,

  -- Request context
  ip_address INET,
  user_agent TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_activity_logs_org_id ON activity_logs(org_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_project_id ON activity_logs(project_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON activity_logs(action);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action_category ON activity_logs(action_category);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_org_created ON activity_logs(org_id, created_at DESC);

-- Enable RLS
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Admins/owners can read their org's logs
DROP POLICY IF EXISTS "Admins can view org activity logs" ON activity_logs;
CREATE POLICY "Admins can view org activity logs" ON activity_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.org_id = activity_logs.org_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin')
    )
  );

-- Policy: System can insert logs
DROP POLICY IF EXISTS "System can insert logs" ON activity_logs;
CREATE POLICY "System can insert logs" ON activity_logs
  FOR INSERT
  WITH CHECK (true);

-- ============================================
-- HELPER FUNCTION: Log Activity
-- ============================================
CREATE OR REPLACE FUNCTION log_activity(
  p_org_id UUID,
  p_user_id UUID,
  p_action VARCHAR(100),
  p_category VARCHAR(50),
  p_details JSONB DEFAULT '{}'::jsonb,
  p_project_id UUID DEFAULT NULL,
  p_sf_amount INT DEFAULT NULL,
  p_amount_cents INT DEFAULT NULL,
  p_status VARCHAR(20) DEFAULT 'success',
  p_error_message TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_log_id UUID;
  v_user_email VARCHAR(255);
  v_user_name VARCHAR(255);
  v_org_name VARCHAR(255);
  v_project_name VARCHAR(255);
BEGIN
  -- Get user info
  SELECT email, raw_user_meta_data->>'full_name'
  INTO v_user_email, v_user_name
  FROM auth.users WHERE id = p_user_id;

  -- Get org name
  SELECT name INTO v_org_name
  FROM organizations WHERE id = p_org_id;

  -- Get project name if applicable
  IF p_project_id IS NOT NULL THEN
    SELECT name INTO v_project_name
    FROM projects WHERE id = p_project_id;
  END IF;

  -- Insert log entry
  INSERT INTO activity_logs (
    org_id, user_id, project_id,
    action, action_category, details,
    user_email, user_name, org_name, project_name,
    sf_amount, amount_cents,
    status, error_message
  )
  VALUES (
    p_org_id, p_user_id, p_project_id,
    p_action, p_category, p_details,
    v_user_email, v_user_name, v_org_name, v_project_name,
    p_sf_amount, p_amount_cents,
    p_status, p_error_message
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION log_activity TO authenticated;

-- ============================================
-- ACTIVITY LOG VIEWS FOR ADMIN
-- ============================================

-- View: Project creation summary by user
CREATE OR REPLACE VIEW admin_project_summary AS
SELECT
  al.org_id,
  al.user_id,
  al.user_email,
  al.user_name,
  COUNT(*) as project_count,
  SUM(COALESCE(al.sf_amount, 0)) as total_sf_used,
  MIN(al.created_at) as first_project,
  MAX(al.created_at) as last_project
FROM activity_logs al
WHERE al.action = 'project.created'
  AND al.status = 'success'
GROUP BY al.org_id, al.user_id, al.user_email, al.user_name;

-- View: Daily activity summary
CREATE OR REPLACE VIEW admin_daily_activity AS
SELECT
  al.org_id,
  DATE(al.created_at) as activity_date,
  al.action_category,
  COUNT(*) as action_count,
  COUNT(DISTINCT al.user_id) as unique_users,
  SUM(COALESCE(al.sf_amount, 0)) as total_sf,
  SUM(COALESCE(al.amount_cents, 0)) as total_revenue_cents
FROM activity_logs al
GROUP BY al.org_id, DATE(al.created_at), al.action_category
ORDER BY activity_date DESC;

COMMENT ON TABLE activity_logs IS 'Comprehensive activity logging for admin visibility and audit trails';
