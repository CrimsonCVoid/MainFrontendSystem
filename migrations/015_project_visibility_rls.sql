-- Migration 015: Project Visibility RLS Policy
-- Enforces organization-level project visibility settings
--
-- Organizations can set `settings.projectVisibility` to:
--   'all' (default) - All members can see AND edit all projects
--   'own-only' - Members can only see/edit their own projects (admins/owners see all)
--
-- Projects are assigned to BOTH an organization AND a specific user (creator)

-- ============================================
-- SELECT POLICY - Who can view projects
-- ============================================

DROP POLICY IF EXISTS "Members can view org projects" ON projects;

CREATE POLICY "Members can view org projects" ON projects
  FOR SELECT USING (
    -- Legacy: user-owned projects without org
    (organization_id IS NULL AND user_id = auth.uid())
    OR
    -- Org projects: check membership and visibility settings
    EXISTS (
      SELECT 1
      FROM organization_members om
      JOIN organizations o ON o.id = om.org_id
      WHERE om.org_id = projects.organization_id
        AND om.user_id = auth.uid()
        AND (
          -- Admins and owners ALWAYS see all projects
          om.role IN ('owner', 'admin')
          OR
          -- Visibility is 'all' - everyone sees all projects
          COALESCE((o.settings->>'projectVisibility'), 'all') = 'all'
          OR
          -- Visibility is 'own-only' - members only see their own
          projects.user_id = auth.uid()
        )
    )
  );

-- ============================================
-- UPDATE POLICY - Who can edit projects
-- ============================================

DROP POLICY IF EXISTS "Members can update org projects" ON projects;

CREATE POLICY "Members can update org projects" ON projects
  FOR UPDATE USING (
    -- Legacy: user-owned projects without org
    (organization_id IS NULL AND user_id = auth.uid())
    OR
    -- Org projects: respect visibility for editing too
    EXISTS (
      SELECT 1
      FROM organization_members om
      JOIN organizations o ON o.id = om.org_id
      WHERE om.org_id = projects.organization_id
        AND om.user_id = auth.uid()
        AND (
          -- Admins and owners can update all projects
          om.role IN ('owner', 'admin')
          OR
          -- Members: check visibility setting
          (
            om.role IN ('member')
            AND (
              -- Visibility 'all' - members can edit any project
              COALESCE((o.settings->>'projectVisibility'), 'all') = 'all'
              OR
              -- Visibility 'own-only' - members only edit their own
              projects.user_id = auth.uid()
            )
          )
        )
    )
  );

-- ============================================
-- DELETE POLICY - Who can delete projects
-- ============================================

DROP POLICY IF EXISTS "Admins can delete org projects" ON projects;

CREATE POLICY "Admins can delete org projects" ON projects
  FOR DELETE USING (
    -- Legacy support
    (organization_id IS NULL AND user_id = auth.uid())
    OR
    -- Org projects: admins/owners can delete any, members only their own when own-only
    EXISTS (
      SELECT 1
      FROM organization_members om
      JOIN organizations o ON o.id = om.org_id
      WHERE om.org_id = projects.organization_id
        AND om.user_id = auth.uid()
        AND (
          -- Admins and owners can delete all projects
          om.role IN ('owner', 'admin')
          OR
          -- Members: check visibility setting for delete permission
          (
            om.role = 'member'
            AND (
              COALESCE((o.settings->>'projectVisibility'), 'all') = 'all'
              OR
              projects.user_id = auth.uid()
            )
          )
        )
    )
  );

-- ============================================
-- INDEX for performance
-- ============================================

CREATE INDEX IF NOT EXISTS idx_organizations_settings_visibility
  ON organizations ((settings->>'projectVisibility'));

CREATE INDEX IF NOT EXISTS idx_projects_user_id
  ON projects (user_id);

CREATE INDEX IF NOT EXISTS idx_projects_org_user
  ON projects (organization_id, user_id);

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON POLICY "Members can view org projects" ON projects IS
  'Controls project visibility based on org settings. Admins/owners always see all.
   When projectVisibility=all, everyone sees all. When own-only, members see only their projects.';

COMMENT ON POLICY "Members can update org projects" ON projects IS
  'Controls project editing based on org settings. Same rules as viewing.';

COMMENT ON POLICY "Admins can delete org projects" ON projects IS
  'Controls project deletion. Admins/owners delete any. Members follow visibility rules.';
