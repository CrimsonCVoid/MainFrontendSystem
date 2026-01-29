-- ============================================
-- ARCHIVE SYSTEM FOR PROJECTS
-- ============================================
-- Enables soft-delete of projects with admin-only restore capability.
-- Archived projects are hidden from normal views but accessible to admins.

-- Add archive columns to projects
ALTER TABLE projects ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS archived_by UUID REFERENCES auth.users(id);

-- Index for efficient archive queries
CREATE INDEX IF NOT EXISTS idx_projects_archived ON projects(organization_id, archived_at);
CREATE INDEX IF NOT EXISTS idx_projects_archived_at ON projects(archived_at) WHERE archived_at IS NOT NULL;

-- Function to archive a project (admin only)
CREATE OR REPLACE FUNCTION archive_project(
  p_project_id UUID,
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_project RECORD;
  v_org_id UUID;
  v_is_admin BOOLEAN;
BEGIN
  -- Get project
  SELECT * INTO v_project FROM projects WHERE id = p_project_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Project not found');
  END IF;

  -- Check if already archived
  IF v_project.archived_at IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Project is already archived');
  END IF;

  v_org_id := v_project.organization_id;

  -- Check if user is admin/owner of the organization
  IF v_org_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM organization_members
      WHERE org_id = v_org_id AND user_id = p_user_id AND role IN ('owner', 'admin')
    ) INTO v_is_admin;

    IF NOT v_is_admin THEN
      RETURN jsonb_build_object('success', false, 'error', 'Admin permission required');
    END IF;
  ELSE
    -- For projects without org, only owner can archive
    IF v_project.user_id != p_user_id THEN
      RETURN jsonb_build_object('success', false, 'error', 'Only project owner can archive');
    END IF;
  END IF;

  -- Archive the project
  UPDATE projects SET
    archived_at = NOW(),
    archived_by = p_user_id,
    updated_at = NOW()
  WHERE id = p_project_id;

  RETURN jsonb_build_object(
    'success', true,
    'archived_at', NOW(),
    'project_name', v_project.name
  );
END;
$$;

-- Function to unarchive/restore a project with optional reassignment (admin only)
CREATE OR REPLACE FUNCTION unarchive_project(
  p_project_id UUID,
  p_user_id UUID,
  p_new_owner_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_project RECORD;
  v_org_id UUID;
  v_is_admin BOOLEAN;
  v_new_owner_email TEXT;
BEGIN
  -- Get project
  SELECT * INTO v_project FROM projects WHERE id = p_project_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Project not found');
  END IF;

  -- Check if actually archived
  IF v_project.archived_at IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Project is not archived');
  END IF;

  v_org_id := v_project.organization_id;

  -- Check if user is admin/owner of the organization
  IF v_org_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM organization_members
      WHERE org_id = v_org_id AND user_id = p_user_id AND role IN ('owner', 'admin')
    ) INTO v_is_admin;

    IF NOT v_is_admin THEN
      RETURN jsonb_build_object('success', false, 'error', 'Admin permission required');
    END IF;

    -- If reassigning, verify new owner is org member
    IF p_new_owner_id IS NOT NULL THEN
      IF NOT EXISTS (
        SELECT 1 FROM organization_members
        WHERE org_id = v_org_id AND user_id = p_new_owner_id
      ) THEN
        RETURN jsonb_build_object('success', false, 'error', 'New owner must be organization member');
      END IF;

      SELECT email INTO v_new_owner_email FROM users WHERE id = p_new_owner_id;
    END IF;
  END IF;

  -- Unarchive and optionally reassign
  UPDATE projects SET
    archived_at = NULL,
    archived_by = NULL,
    user_id = COALESCE(p_new_owner_id, user_id),
    updated_at = NOW()
  WHERE id = p_project_id;

  RETURN jsonb_build_object(
    'success', true,
    'restored', true,
    'reassigned', p_new_owner_id IS NOT NULL,
    'new_owner_email', v_new_owner_email,
    'project_name', v_project.name
  );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION archive_project(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION unarchive_project(UUID, UUID, UUID) TO authenticated;
