-- Migration 006: Add organization_id to Existing Tables
-- Enables multi-tenant data scoping

-- Add organization_id to projects
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_projects_org ON projects(organization_id);

-- Add organization_id to project_estimates
ALTER TABLE project_estimates
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_project_estimates_org ON project_estimates(organization_id);

-- Add organization_id to payments
ALTER TABLE payments
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_payments_org ON payments(organization_id);

-- Add organization_id to promo_keys (optional - may want org-specific keys)
ALTER TABLE promo_keys
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_promo_keys_org ON promo_keys(organization_id);

-- Add active_org_id to users (for org switching)
ALTER TABLE users
ADD COLUMN IF NOT EXISTS active_org_id UUID REFERENCES organizations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_users_active_org ON users(active_org_id);

-- Add comments for documentation
COMMENT ON COLUMN projects.organization_id IS 'The organization this project belongs to';
COMMENT ON COLUMN users.active_org_id IS 'The currently active organization for this user';
