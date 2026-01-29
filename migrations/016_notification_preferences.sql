-- ============================================
-- NOTIFICATION PREFERENCES SYSTEM
-- ============================================
-- User-level preferences for email notifications

-- ============================================
-- NOTIFICATION PREFERENCES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Estimate notifications
  email_estimate_approved BOOLEAN DEFAULT TRUE,
  email_estimate_rejected BOOLEAN DEFAULT TRUE,
  email_estimate_viewed BOOLEAN DEFAULT FALSE, -- Off by default (can be noisy)
  email_estimate_question BOOLEAN DEFAULT TRUE,

  -- SF Pool notifications
  email_sf_pool_low BOOLEAN DEFAULT TRUE,
  sf_pool_warning_threshold INTEGER DEFAULT 5, -- Warn when pool drops below this

  -- Team activity (usually admin-only)
  email_team_activity BOOLEAN DEFAULT FALSE,
  email_new_member_joined BOOLEAN DEFAULT TRUE,

  -- Project notifications
  email_project_assigned BOOLEAN DEFAULT TRUE,
  email_project_archived BOOLEAN DEFAULT FALSE,

  -- Digest preferences
  digest_frequency TEXT DEFAULT 'instant' CHECK (digest_frequency IN ('instant', 'daily', 'weekly', 'none')),

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- RLS POLICIES
-- ============================================
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- Users can only manage their own preferences
CREATE POLICY "Users can view their own preferences"
  ON notification_preferences FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own preferences"
  ON notification_preferences FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own preferences"
  ON notification_preferences FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Get or create notification preferences for a user
CREATE OR REPLACE FUNCTION get_notification_preferences(p_user_id UUID)
RETURNS notification_preferences
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prefs notification_preferences;
BEGIN
  SELECT * INTO v_prefs
  FROM notification_preferences
  WHERE user_id = p_user_id;

  -- Create default preferences if none exist
  IF NOT FOUND THEN
    INSERT INTO notification_preferences (user_id)
    VALUES (p_user_id)
    RETURNING * INTO v_prefs;
  END IF;

  RETURN v_prefs;
END;
$$;

-- Update notification preferences
CREATE OR REPLACE FUNCTION update_notification_preferences(
  p_user_id UUID,
  p_email_estimate_approved BOOLEAN DEFAULT NULL,
  p_email_estimate_rejected BOOLEAN DEFAULT NULL,
  p_email_estimate_viewed BOOLEAN DEFAULT NULL,
  p_email_estimate_question BOOLEAN DEFAULT NULL,
  p_email_sf_pool_low BOOLEAN DEFAULT NULL,
  p_sf_pool_warning_threshold INTEGER DEFAULT NULL,
  p_email_team_activity BOOLEAN DEFAULT NULL,
  p_email_new_member_joined BOOLEAN DEFAULT NULL,
  p_email_project_assigned BOOLEAN DEFAULT NULL,
  p_email_project_archived BOOLEAN DEFAULT NULL,
  p_digest_frequency TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prefs notification_preferences;
BEGIN
  -- Ensure preferences exist
  PERFORM get_notification_preferences(p_user_id);

  -- Update only provided fields
  UPDATE notification_preferences
  SET
    email_estimate_approved = COALESCE(p_email_estimate_approved, email_estimate_approved),
    email_estimate_rejected = COALESCE(p_email_estimate_rejected, email_estimate_rejected),
    email_estimate_viewed = COALESCE(p_email_estimate_viewed, email_estimate_viewed),
    email_estimate_question = COALESCE(p_email_estimate_question, email_estimate_question),
    email_sf_pool_low = COALESCE(p_email_sf_pool_low, email_sf_pool_low),
    sf_pool_warning_threshold = COALESCE(p_sf_pool_warning_threshold, sf_pool_warning_threshold),
    email_team_activity = COALESCE(p_email_team_activity, email_team_activity),
    email_new_member_joined = COALESCE(p_email_new_member_joined, email_new_member_joined),
    email_project_assigned = COALESCE(p_email_project_assigned, email_project_assigned),
    email_project_archived = COALESCE(p_email_project_archived, email_project_archived),
    digest_frequency = COALESCE(p_digest_frequency, digest_frequency),
    updated_at = NOW()
  WHERE user_id = p_user_id
  RETURNING * INTO v_prefs;

  RETURN json_build_object(
    'success', true,
    'preferences', row_to_json(v_prefs)
  );
END;
$$;

-- Get users who want a specific notification type for an org
CREATE OR REPLACE FUNCTION get_users_for_notification(
  p_org_id UUID,
  p_notification_type TEXT
)
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  full_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.id as user_id,
    u.email,
    u.full_name
  FROM organization_members om
  JOIN users u ON u.id = om.user_id
  JOIN notification_preferences np ON np.user_id = om.user_id
  WHERE om.org_id = p_org_id
    AND CASE p_notification_type
      WHEN 'estimate_approved' THEN np.email_estimate_approved
      WHEN 'estimate_rejected' THEN np.email_estimate_rejected
      WHEN 'estimate_viewed' THEN np.email_estimate_viewed
      WHEN 'estimate_question' THEN np.email_estimate_question
      WHEN 'sf_pool_low' THEN np.email_sf_pool_low
      WHEN 'team_activity' THEN np.email_team_activity
      WHEN 'new_member_joined' THEN np.email_new_member_joined
      WHEN 'project_assigned' THEN np.email_project_assigned
      WHEN 'project_archived' THEN np.email_project_archived
      ELSE TRUE
    END;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_notification_preferences(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION update_notification_preferences(UUID, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN, INTEGER, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_users_for_notification(UUID, TEXT) TO authenticated;

-- ============================================
-- ACTIVITY LOG EXTENSION
-- ============================================
-- Add new action types for the features being added
-- (Assumes activity_log table exists from previous migrations)

-- Note: If you need to add new action types, update the check constraint:
-- ALTER TABLE activity_log DROP CONSTRAINT IF EXISTS activity_log_action_check;
-- ALTER TABLE activity_log ADD CONSTRAINT activity_log_action_check
--   CHECK (action IN (
--     'project.created', 'project.updated', 'project.deleted', 'project.archived', 'project.restored',
--     'project.reassigned', 'project.unlocked',
--     'estimate.created', 'estimate.shared', 'estimate.approved', 'estimate.rejected',
--     'member.invited', 'member.joined', 'member.removed', 'member.role_changed',
--     'sf_pool.purchased', 'sf_pool.used', 'sf_pool.refunded',
--     'promo_key.redeemed'
--   ));
