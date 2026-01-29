-- ============================================
-- PUBLIC INVITE LOOKUP FUNCTION
-- ============================================
-- This function allows public (unauthenticated) access to invite details
-- It bypasses RLS to return invite + organization info for the accept invite page

-- Function to get invite details by token (PUBLIC ACCESS)
CREATE OR REPLACE FUNCTION get_invite_by_token(p_token TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSON;
  v_invite RECORD;
BEGIN
  -- Find the invite with organization details
  SELECT
    i.id,
    i.org_id,
    i.email,
    i.token,
    i.role,
    i.invite_type,
    i.expires_at,
    i.accepted_at,
    i.revoked_at,
    i.max_uses,
    i.use_count,
    i.created_at,
    o.id AS org_id,
    o.name AS org_name,
    o.logo_url AS org_logo_url
  INTO v_invite
  FROM org_invites i
  JOIN organizations o ON o.id = i.org_id
  WHERE i.token = p_token;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Invite not found'
    );
  END IF;

  -- Check if invite is valid
  IF v_invite.revoked_at IS NOT NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'This invite has been revoked',
      'organization', json_build_object(
        'id', v_invite.org_id,
        'name', v_invite.org_name,
        'logo_url', v_invite.org_logo_url
      )
    );
  END IF;

  IF v_invite.use_count >= v_invite.max_uses THEN
    RETURN json_build_object(
      'success', false,
      'error', 'This invite has reached its usage limit',
      'organization', json_build_object(
        'id', v_invite.org_id,
        'name', v_invite.org_name,
        'logo_url', v_invite.org_logo_url
      )
    );
  END IF;

  IF v_invite.expires_at < NOW() THEN
    RETURN json_build_object(
      'success', false,
      'error', 'This invite has expired',
      'organization', json_build_object(
        'id', v_invite.org_id,
        'name', v_invite.org_name,
        'logo_url', v_invite.org_logo_url
      )
    );
  END IF;

  -- Return valid invite data
  RETURN json_build_object(
    'success', true,
    'invite', json_build_object(
      'id', v_invite.id,
      'role', v_invite.role,
      'invite_type', v_invite.invite_type,
      'expires_at', v_invite.expires_at,
      'email', v_invite.email
    ),
    'organization', json_build_object(
      'id', v_invite.org_id,
      'name', v_invite.org_name,
      'logo_url', v_invite.org_logo_url
    )
  );
END;
$$;

-- Grant execute permission to anonymous users (for public invite links)
GRANT EXECUTE ON FUNCTION get_invite_by_token(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION get_invite_by_token(TEXT) TO authenticated;

-- ============================================
-- ACCEPT INVITE FUNCTION
-- ============================================
-- Allows authenticated users to accept an invite and join an organization
-- Bypasses RLS to insert the membership record

CREATE OR REPLACE FUNCTION accept_invite(p_token TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_invite RECORD;
  v_existing_member RECORD;
  v_org RECORD;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Authentication required'
    );
  END IF;

  -- Find the invite
  SELECT * INTO v_invite
  FROM org_invites
  WHERE token = p_token;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Invite not found'
    );
  END IF;

  -- Check if invite is valid
  IF v_invite.revoked_at IS NOT NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'This invite has been revoked'
    );
  END IF;

  IF v_invite.use_count >= v_invite.max_uses THEN
    RETURN json_build_object(
      'success', false,
      'error', 'This invite has reached its usage limit'
    );
  END IF;

  IF v_invite.expires_at < NOW() THEN
    RETURN json_build_object(
      'success', false,
      'error', 'This invite has expired'
    );
  END IF;

  -- For email invites, verify email matches
  IF v_invite.invite_type = 'email' AND v_invite.email IS NOT NULL THEN
    DECLARE
      v_user_email TEXT;
    BEGIN
      SELECT email INTO v_user_email
      FROM auth.users
      WHERE id = v_user_id;

      IF LOWER(v_user_email) != LOWER(v_invite.email) THEN
        RETURN json_build_object(
          'success', false,
          'error', 'This invite was sent to a different email address'
        );
      END IF;
    END;
  END IF;

  -- Check if already a member
  SELECT * INTO v_existing_member
  FROM organization_members
  WHERE org_id = v_invite.org_id AND user_id = v_user_id;

  IF FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'You are already a member of this organization'
    );
  END IF;

  -- Add user as member
  INSERT INTO organization_members (org_id, user_id, role, invited_by)
  VALUES (v_invite.org_id, v_user_id, v_invite.role, v_invite.invited_by);

  -- Update invite usage
  UPDATE org_invites
  SET
    use_count = use_count + 1,
    accepted_at = CASE WHEN max_uses = 1 THEN NOW() ELSE accepted_at END
  WHERE id = v_invite.id;

  -- Set as active org if user doesn't have one
  UPDATE users
  SET active_org_id = v_invite.org_id
  WHERE id = v_user_id AND active_org_id IS NULL;

  -- Get org details for response
  SELECT id, name, slug, logo_url INTO v_org
  FROM organizations
  WHERE id = v_invite.org_id;

  RETURN json_build_object(
    'success', true,
    'message', 'Successfully joined organization',
    'organization', json_build_object(
      'id', v_org.id,
      'name', v_org.name,
      'slug', v_org.slug,
      'logo_url', v_org.logo_url
    ),
    'role', v_invite.role
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION accept_invite(TEXT) TO authenticated;
