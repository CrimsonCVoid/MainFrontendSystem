-- ============================================
-- FIX PROMO KEY REDEMPTION FOR ORGANIZATIONS
-- ============================================
-- The original redeem_promo_key function only allowed project owners
-- to redeem codes. This update allows any organization member to
-- redeem codes for projects in their organization.

CREATE OR REPLACE FUNCTION redeem_promo_key(
  p_key_code TEXT,
  p_user_id UUID,
  p_project_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_key RECORD;
  v_project RECORD;
  v_has_access BOOLEAN := FALSE;
BEGIN
  -- Normalize key (remove dashes and spaces, uppercase)
  p_key_code := UPPER(REPLACE(REPLACE(p_key_code, '-', ''), ' ', ''));

  -- Find the key
  SELECT * INTO v_key
  FROM promo_keys
  WHERE key_code = p_key_code;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Invalid promo code'
    );
  END IF;

  -- Check if key has remaining credits
  IF v_key.credits_remaining <= 0 THEN
    RETURN json_build_object(
      'success', false,
      'error', 'This promo code has no remaining credits'
    );
  END IF;

  -- Get the project
  SELECT * INTO v_project
  FROM projects
  WHERE id = p_project_id;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Project not found'
    );
  END IF;

  -- Check if project is already unlocked
  IF v_project.payment_completed THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Project is already unlocked'
    );
  END IF;

  -- Check access: user owns the project OR is member of the project's organization
  IF v_project.user_id = p_user_id THEN
    v_has_access := TRUE;
  ELSIF v_project.organization_id IS NOT NULL THEN
    -- Check if user is a member of the project's organization
    SELECT EXISTS (
      SELECT 1 FROM organization_members
      WHERE org_id = v_project.organization_id AND user_id = p_user_id
    ) INTO v_has_access;
  END IF;

  IF NOT v_has_access THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Access denied - you must be a member of this organization'
    );
  END IF;

  -- Decrement credits_remaining and update tracking
  UPDATE promo_keys
  SET
    credits_remaining = credits_remaining - 1,
    is_used = CASE WHEN credits_remaining - 1 = 0 THEN TRUE ELSE FALSE END,
    used_at = CASE WHEN credits_remaining - 1 = 0 THEN NOW() ELSE used_at END,
    used_by_user_id = COALESCE(used_by_user_id, p_user_id),
    used_for_project_id = COALESCE(used_for_project_id, p_project_id)
  WHERE id = v_key.id;

  -- Unlock the project
  UPDATE projects
  SET
    payment_completed = TRUE,
    payment_required = FALSE,
    payment_id = 'promo_' || v_key.id,
    updated_at = NOW()
  WHERE id = p_project_id;

  RETURN json_build_object(
    'success', true,
    'message', 'Project unlocked successfully!',
    'credits_remaining', v_key.credits_remaining - 1
  );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION redeem_promo_key(TEXT, UUID, UUID) TO authenticated;
