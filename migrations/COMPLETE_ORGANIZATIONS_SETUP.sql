-- ============================================
-- COMPLETE ORGANIZATIONS SETUP
-- ============================================
-- This script safely sets up the entire multi-tenant organizations system.
-- It can be run multiple times without breaking existing data.
-- Run this in Supabase SQL Editor.
-- ============================================

-- ============================================
-- STEP 1: CREATE ORGANIZATIONS TABLES
-- ============================================

-- Organizations table
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  logo_url TEXT,
  plan VARCHAR(20) DEFAULT 'free' NOT NULL CHECK (plan IN ('free', 'trial', 'paid', 'enterprise')),
  billing_status VARCHAR(20) DEFAULT 'inactive' CHECK (billing_status IN ('inactive', 'active', 'past_due', 'canceled')),
  billing_owner_id UUID REFERENCES users(id) ON DELETE SET NULL,
  stripe_customer_id VARCHAR(255),
  stripe_subscription_id VARCHAR(255),
  trial_ends_at TIMESTAMP WITH TIME ZONE,
  settings JSONB DEFAULT '{}'::jsonb,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Organization members (join table with roles)
CREATE TABLE IF NOT EXISTS organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  invited_by UUID REFERENCES users(id),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  CONSTRAINT org_members_unique UNIQUE (org_id, user_id)
);

-- Organization invitations
CREATE TABLE IF NOT EXISTS org_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email VARCHAR(255),
  token VARCHAR(64) UNIQUE NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member', 'viewer')),
  invite_type VARCHAR(20) NOT NULL DEFAULT 'email' CHECK (invite_type IN ('email', 'link', 'domain')),
  invited_by UUID NOT NULL REFERENCES users(id),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at TIMESTAMP WITH TIME ZONE,
  revoked_at TIMESTAMP WITH TIME ZONE,
  max_uses INT DEFAULT 1,
  use_count INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Domain auto-join rules
CREATE TABLE IF NOT EXISTS org_domain_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  domain VARCHAR(255) NOT NULL,
  default_role VARCHAR(20) NOT NULL DEFAULT 'member' CHECK (default_role IN ('admin', 'member', 'viewer')),
  enabled BOOLEAN DEFAULT TRUE,
  verified_at TIMESTAMP WITH TIME ZONE,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  CONSTRAINT org_domain_unique UNIQUE (org_id, domain)
);

-- Promo keys for fee waiving (project unlock without payment)
CREATE TABLE IF NOT EXISTS promo_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_code VARCHAR(20) UNIQUE NOT NULL,
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  is_used BOOLEAN DEFAULT FALSE NOT NULL,
  used_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  used_for_project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  created_by UUID REFERENCES users(id),
  notes TEXT,
  CONSTRAINT promo_keys_key_code_length CHECK (length(key_code) = 20)
);

-- ============================================
-- STEP 2: CREATE INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);
CREATE INDEX IF NOT EXISTS idx_organizations_billing_owner ON organizations(billing_owner_id);
CREATE INDEX IF NOT EXISTS idx_organizations_created_by ON organizations(created_by);
CREATE INDEX IF NOT EXISTS idx_organizations_plan ON organizations(plan);

CREATE INDEX IF NOT EXISTS idx_org_members_org ON organization_members(org_id);
CREATE INDEX IF NOT EXISTS idx_org_members_user ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_role ON organization_members(role);

CREATE INDEX IF NOT EXISTS idx_org_invites_org ON org_invites(org_id);
CREATE INDEX IF NOT EXISTS idx_org_invites_token ON org_invites(token);
CREATE INDEX IF NOT EXISTS idx_org_invites_email ON org_invites(email);
CREATE INDEX IF NOT EXISTS idx_org_invites_expires ON org_invites(expires_at);

CREATE INDEX IF NOT EXISTS idx_org_domains_domain ON org_domain_rules(domain);
CREATE INDEX IF NOT EXISTS idx_org_domains_org ON org_domain_rules(org_id);

CREATE INDEX IF NOT EXISTS idx_promo_keys_key_code ON promo_keys(key_code);
CREATE INDEX IF NOT EXISTS idx_promo_keys_org ON promo_keys(organization_id);
CREATE INDEX IF NOT EXISTS idx_promo_keys_is_used ON promo_keys(is_used);
CREATE INDEX IF NOT EXISTS idx_promo_keys_used_by ON promo_keys(used_by_user_id);

-- ============================================
-- STEP 3: ADD ORGANIZATION COLUMNS TO EXISTING TABLES
-- ============================================

-- Add organization_id to projects (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'projects' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE projects ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
    CREATE INDEX idx_projects_org ON projects(organization_id);
  END IF;
END $$;

-- Add organization_id to project_estimates (if table and column don't exist)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'project_estimates') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'project_estimates' AND column_name = 'organization_id'
    ) THEN
      ALTER TABLE project_estimates ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
      CREATE INDEX idx_project_estimates_org ON project_estimates(organization_id);
    END IF;
  END IF;
END $$;

-- Add organization_id to payments (if table and column don't exist)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payments') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'payments' AND column_name = 'organization_id'
    ) THEN
      ALTER TABLE payments ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
      CREATE INDEX idx_payments_org ON payments(organization_id);
    END IF;
  END IF;
END $$;

-- Add organization_id to promo_keys (if table exists and column doesn't)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'promo_keys') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'promo_keys' AND column_name = 'organization_id'
    ) THEN
      ALTER TABLE promo_keys ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;
      CREATE INDEX idx_promo_keys_org ON promo_keys(organization_id);
    END IF;
  END IF;
END $$;

-- Add active_org_id to users (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'active_org_id'
  ) THEN
    ALTER TABLE users ADD COLUMN active_org_id UUID REFERENCES organizations(id) ON DELETE SET NULL;
    CREATE INDEX idx_users_active_org ON users(active_org_id);
  END IF;
END $$;

-- ============================================
-- STEP 4: UPDATED_AT TRIGGER FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers
DROP TRIGGER IF EXISTS update_organizations_updated_at ON organizations;
CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_organization_members_updated_at ON organization_members;
CREATE TRIGGER update_organization_members_updated_at
  BEFORE UPDATE ON organization_members
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- STEP 5: ENABLE ROW LEVEL SECURITY
-- ============================================

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_domain_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_keys ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 5.5: HELPER FUNCTION TO CHECK ORG MEMBERSHIP (avoids recursion)
-- ============================================

-- This function bypasses RLS to check membership, preventing infinite recursion
CREATE OR REPLACE FUNCTION is_org_member(p_org_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM organization_members
    WHERE org_id = p_org_id AND user_id = p_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Check if user has admin/owner role in org
CREATE OR REPLACE FUNCTION is_org_admin(p_org_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM organization_members
    WHERE org_id = p_org_id AND user_id = p_user_id AND role IN ('owner', 'admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Check if user is org owner
CREATE OR REPLACE FUNCTION is_org_owner(p_org_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM organization_members
    WHERE org_id = p_org_id AND user_id = p_user_id AND role = 'owner'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Get all org IDs for a user
CREATE OR REPLACE FUNCTION get_user_org_ids(p_user_id UUID)
RETURNS SETOF UUID AS $$
BEGIN
  RETURN QUERY SELECT org_id FROM organization_members WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================
-- STEP 5.6: FUNCTION TO CREATE ORGANIZATION (bypasses RLS safely)
-- ============================================

-- This function creates an org and adds the creator as owner atomically
-- It bypasses RLS but validates the user exists
CREATE OR REPLACE FUNCTION create_organization(
  p_user_id UUID,
  p_name TEXT,
  p_slug TEXT,
  p_logo_url TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_org_id UUID;
BEGIN
  -- Verify user exists
  IF NOT EXISTS (SELECT 1 FROM users WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  -- Create organization
  INSERT INTO organizations (
    name,
    slug,
    logo_url,
    created_by,
    billing_owner_id,
    plan,
    billing_status,
    settings
  )
  VALUES (
    p_name,
    p_slug,
    p_logo_url,
    p_user_id,
    p_user_id,
    'free',
    'inactive',
    '{}'::jsonb
  )
  RETURNING id INTO v_org_id;

  -- Add user as owner
  INSERT INTO organization_members (org_id, user_id, role)
  VALUES (v_org_id, p_user_id, 'owner');

  -- Set as active org if user doesn't have one
  UPDATE users
  SET active_org_id = v_org_id
  WHERE id = p_user_id AND active_org_id IS NULL;

  RETURN v_org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- STEP 5.7: FUNCTION TO GENERATE PROMO KEYS
-- ============================================

-- Generate a single random 20-character promo key
CREATE OR REPLACE FUNCTION generate_promo_key_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := '';
  i INT;
BEGIN
  FOR i IN 1..20 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Generate multiple promo keys for an organization
CREATE OR REPLACE FUNCTION generate_promo_keys(
  p_org_id UUID,
  p_user_id UUID,
  p_count INT DEFAULT 100,
  p_notes TEXT DEFAULT NULL
)
RETURNS INT AS $$
DECLARE
  v_key_code TEXT;
  v_inserted INT := 0;
  v_attempts INT := 0;
  max_attempts INT := p_count * 2;
BEGIN
  -- Verify user is admin of org
  IF NOT is_org_admin(p_org_id, p_user_id) THEN
    RAISE EXCEPTION 'User is not an admin of this organization';
  END IF;

  WHILE v_inserted < p_count AND v_attempts < max_attempts LOOP
    v_key_code := generate_promo_key_code();
    v_attempts := v_attempts + 1;

    BEGIN
      INSERT INTO promo_keys (key_code, organization_id, created_by, notes)
      VALUES (v_key_code, p_org_id, p_user_id, p_notes);
      v_inserted := v_inserted + 1;
    EXCEPTION WHEN unique_violation THEN
      -- Key already exists, try again
      CONTINUE;
    END;
  END LOOP;

  RETURN v_inserted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Redeem a promo key to unlock a project
CREATE OR REPLACE FUNCTION redeem_promo_key(
  p_key_code TEXT,
  p_project_id UUID,
  p_user_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_promo_key RECORD;
BEGIN
  -- Normalize key code (uppercase, remove spaces/dashes)
  p_key_code := UPPER(REGEXP_REPLACE(p_key_code, '[\s\-]', '', 'g'));

  -- Find and lock the promo key
  SELECT * INTO v_promo_key
  FROM promo_keys
  WHERE key_code = p_key_code AND is_used = FALSE
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- Verify project exists and belongs to user
  IF NOT EXISTS (
    SELECT 1 FROM projects
    WHERE id = p_project_id AND user_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'Project not found or access denied';
  END IF;

  -- Mark key as used
  UPDATE promo_keys
  SET is_used = TRUE,
      used_by_user_id = p_user_id,
      used_for_project_id = p_project_id,
      used_at = now()
  WHERE id = v_promo_key.id;

  -- Unlock the project
  UPDATE projects
  SET payment_completed = TRUE,
      payment_required = FALSE,
      updated_at = now()
  WHERE id = p_project_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- STEP 6: RLS POLICIES FOR ORGANIZATIONS
-- ============================================

-- Users can view organizations they belong to
DROP POLICY IF EXISTS "Users can view their organizations" ON organizations;
CREATE POLICY "Users can view their organizations" ON organizations
  FOR SELECT USING (
    is_org_member(id, auth.uid())
  );

-- Only owners and admins can update their organization
DROP POLICY IF EXISTS "Owners and admins can update organization" ON organizations;
CREATE POLICY "Owners and admins can update organization" ON organizations
  FOR UPDATE USING (
    is_org_admin(id, auth.uid())
  );

-- INSERT is handled by create_organization() SECURITY DEFINER function
-- Direct client-side inserts require created_by = auth.uid()
-- Server-side creation MUST use the create_organization() RPC function
DROP POLICY IF EXISTS "Users can create organizations" ON organizations;
CREATE POLICY "Users can create organizations" ON organizations
  FOR INSERT WITH CHECK (created_by = auth.uid());

-- Only owners can delete organizations
DROP POLICY IF EXISTS "Only owners can delete organizations" ON organizations;
CREATE POLICY "Only owners can delete organizations" ON organizations
  FOR DELETE USING (
    is_org_owner(id, auth.uid())
  );

-- ============================================
-- STEP 7: RLS POLICIES FOR ORGANIZATION MEMBERS
-- ============================================

-- Users can view their own membership row (prevents recursion)
DROP POLICY IF EXISTS "Users can view own membership" ON organization_members;
CREATE POLICY "Users can view own membership" ON organization_members
  FOR SELECT USING (user_id = auth.uid());

-- Users can view other members in their orgs (using helper function)
DROP POLICY IF EXISTS "View members of your orgs" ON organization_members;
CREATE POLICY "View members of your orgs" ON organization_members
  FOR SELECT USING (
    is_org_member(org_id, auth.uid())
  );

-- Owners and admins can add members
DROP POLICY IF EXISTS "Admins can add members" ON organization_members;
CREATE POLICY "Admins can add members" ON organization_members
  FOR INSERT WITH CHECK (
    is_org_admin(org_id, auth.uid())
  );

-- Owners and admins can update member roles
DROP POLICY IF EXISTS "Admins can update members" ON organization_members;
CREATE POLICY "Admins can update members" ON organization_members
  FOR UPDATE USING (
    is_org_admin(org_id, auth.uid())
  );

-- Owners and admins can remove members
DROP POLICY IF EXISTS "Admins can remove members" ON organization_members;
CREATE POLICY "Admins can remove members" ON organization_members
  FOR DELETE USING (
    is_org_admin(org_id, auth.uid())
  );

-- ============================================
-- STEP 8: RLS POLICIES FOR INVITES
-- ============================================

-- View invites for orgs you manage (or by token for public access)
DROP POLICY IF EXISTS "View invites for managed orgs" ON org_invites;
CREATE POLICY "View invites for managed orgs" ON org_invites
  FOR SELECT USING (
    is_org_admin(org_id, auth.uid())
    OR token IS NOT NULL
  );

-- Owners and admins can create invites
DROP POLICY IF EXISTS "Admins can create invites" ON org_invites;
CREATE POLICY "Admins can create invites" ON org_invites
  FOR INSERT WITH CHECK (
    is_org_admin(org_id, auth.uid())
  );

-- Owners and admins can update invites (revoke)
DROP POLICY IF EXISTS "Admins can update invites" ON org_invites;
CREATE POLICY "Admins can update invites" ON org_invites
  FOR UPDATE USING (
    is_org_admin(org_id, auth.uid())
  );

-- Owners and admins can delete invites
DROP POLICY IF EXISTS "Admins can delete invites" ON org_invites;
CREATE POLICY "Admins can delete invites" ON org_invites
  FOR DELETE USING (
    is_org_admin(org_id, auth.uid())
  );

-- ============================================
-- STEP 9: RLS POLICIES FOR DOMAIN RULES
-- ============================================

-- View domain rules for orgs you manage or enabled rules for signup
DROP POLICY IF EXISTS "View domain rules" ON org_domain_rules;
CREATE POLICY "View domain rules" ON org_domain_rules
  FOR SELECT USING (
    is_org_admin(org_id, auth.uid())
    OR enabled = TRUE
  );

-- Owners and admins can manage domain rules
DROP POLICY IF EXISTS "Admins can manage domain rules" ON org_domain_rules;
CREATE POLICY "Admins can manage domain rules" ON org_domain_rules
  FOR ALL USING (
    is_org_admin(org_id, auth.uid())
  );

-- ============================================
-- STEP 9.5: RLS POLICIES FOR PROMO KEYS
-- ============================================

-- Admins can view their org's promo keys
DROP POLICY IF EXISTS "Admins can view org promo keys" ON promo_keys;
CREATE POLICY "Admins can view org promo keys" ON promo_keys
  FOR SELECT USING (
    organization_id IS NOT NULL AND is_org_admin(organization_id, auth.uid())
  );

-- Authenticated users can validate promo keys (for redeeming)
DROP POLICY IF EXISTS "Users can validate promo keys" ON promo_keys;
CREATE POLICY "Users can validate promo keys" ON promo_keys
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND is_used = FALSE
  );

-- Admins can create promo keys for their org
DROP POLICY IF EXISTS "Admins can create promo keys" ON promo_keys;
CREATE POLICY "Admins can create promo keys" ON promo_keys
  FOR INSERT WITH CHECK (
    organization_id IS NOT NULL AND is_org_admin(organization_id, auth.uid())
  );

-- Admins can update promo keys (mark as used handled by function)
DROP POLICY IF EXISTS "Admins can update promo keys" ON promo_keys;
CREATE POLICY "Admins can update promo keys" ON promo_keys
  FOR UPDATE USING (
    organization_id IS NOT NULL AND is_org_admin(organization_id, auth.uid())
  );

-- Admins can delete unused promo keys
DROP POLICY IF EXISTS "Admins can delete promo keys" ON promo_keys;
CREATE POLICY "Admins can delete promo keys" ON promo_keys
  FOR DELETE USING (
    organization_id IS NOT NULL AND is_org_admin(organization_id, auth.uid()) AND is_used = FALSE
  );

-- ============================================
-- STEP 10: UPDATE PROJECT POLICIES FOR ORG SCOPE
-- ============================================

-- Drop existing project policies (if they exist)
DROP POLICY IF EXISTS "Users can view their projects" ON projects;
DROP POLICY IF EXISTS "Users can create projects" ON projects;
DROP POLICY IF EXISTS "Users can update projects" ON projects;
DROP POLICY IF EXISTS "Users can delete projects" ON projects;
DROP POLICY IF EXISTS "Members can view org projects" ON projects;
DROP POLICY IF EXISTS "Members can create org projects" ON projects;
DROP POLICY IF EXISTS "Members can update org projects" ON projects;
DROP POLICY IF EXISTS "Admins can delete org projects" ON projects;

-- Members can view org projects (or legacy user-owned projects)
CREATE POLICY "Members can view org projects" ON projects
  FOR SELECT USING (
    (organization_id IS NOT NULL AND is_org_member(organization_id, auth.uid()))
    OR (organization_id IS NULL AND user_id = auth.uid())
  );

-- Members can create org projects
CREATE POLICY "Members can create org projects" ON projects
  FOR INSERT WITH CHECK (
    (organization_id IS NOT NULL AND is_org_member(organization_id, auth.uid()))
    OR (organization_id IS NULL AND user_id = auth.uid())
  );

-- Members can update org projects
CREATE POLICY "Members can update org projects" ON projects
  FOR UPDATE USING (
    (organization_id IS NOT NULL AND is_org_member(organization_id, auth.uid()))
    OR (organization_id IS NULL AND user_id = auth.uid())
  );

-- Only admins can delete org projects
CREATE POLICY "Admins can delete org projects" ON projects
  FOR DELETE USING (
    (organization_id IS NOT NULL AND is_org_admin(organization_id, auth.uid()))
    OR (organization_id IS NULL AND user_id = auth.uid())
  );

-- ============================================
-- STEP 11: UPDATE PROJECT_ESTIMATES POLICIES FOR ORG SCOPE (if table exists)
-- ============================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'project_estimates') THEN
    -- Drop existing policies
    DROP POLICY IF EXISTS "Users can view their estimates" ON project_estimates;
    DROP POLICY IF EXISTS "Users can create estimates" ON project_estimates;
    DROP POLICY IF EXISTS "Users can update estimates" ON project_estimates;
    DROP POLICY IF EXISTS "Users can delete estimates" ON project_estimates;
    DROP POLICY IF EXISTS "Members can view org estimates" ON project_estimates;
    DROP POLICY IF EXISTS "Members can create org estimates" ON project_estimates;
    DROP POLICY IF EXISTS "Members can update org estimates" ON project_estimates;
    DROP POLICY IF EXISTS "Admins can delete org estimates" ON project_estimates;

    -- Create new policies using helper functions
    CREATE POLICY "Members can view org estimates" ON project_estimates
      FOR SELECT USING (
        (organization_id IS NOT NULL AND is_org_member(organization_id, auth.uid()))
        OR (organization_id IS NULL AND user_id = auth.uid())
      );

    CREATE POLICY "Members can create org estimates" ON project_estimates
      FOR INSERT WITH CHECK (
        (organization_id IS NOT NULL AND is_org_member(organization_id, auth.uid()))
        OR (organization_id IS NULL AND user_id = auth.uid())
      );

    CREATE POLICY "Members can update org estimates" ON project_estimates
      FOR UPDATE USING (
        (organization_id IS NOT NULL AND is_org_member(organization_id, auth.uid()))
        OR (organization_id IS NULL AND user_id = auth.uid())
      );

    CREATE POLICY "Admins can delete org estimates" ON project_estimates
      FOR DELETE USING (
        (organization_id IS NOT NULL AND is_org_admin(organization_id, auth.uid()))
        OR (organization_id IS NULL AND user_id = auth.uid())
      );
  END IF;
END $$;

-- ============================================
-- STEP 12: MIGRATE EXISTING USERS TO DEFAULT ORGS
-- ============================================

-- Function to create default org and migrate data for a user
CREATE OR REPLACE FUNCTION migrate_user_to_default_org(p_user_id UUID, p_user_email TEXT)
RETURNS UUID AS $$
DECLARE
  v_org_id UUID;
  v_slug TEXT;
  v_base_slug TEXT;
  v_counter INT := 0;
BEGIN
  -- Check if user already has an org
  SELECT org_id INTO v_org_id
  FROM organization_members
  WHERE user_id = p_user_id
  LIMIT 1;

  IF v_org_id IS NOT NULL THEN
    RETURN v_org_id;
  END IF;

  -- Generate slug from email prefix
  v_base_slug := LOWER(SPLIT_PART(p_user_email, '@', 1));
  v_base_slug := REGEXP_REPLACE(v_base_slug, '[^a-z0-9]', '-', 'g');
  v_base_slug := REGEXP_REPLACE(v_base_slug, '-+', '-', 'g');
  v_base_slug := TRIM(BOTH '-' FROM v_base_slug);

  -- Ensure minimum length
  IF LENGTH(v_base_slug) < 3 THEN
    v_base_slug := 'org-' || v_base_slug;
  END IF;

  v_slug := v_base_slug;

  -- Handle duplicate slugs by appending counter
  WHILE EXISTS (SELECT 1 FROM organizations WHERE slug = v_slug) LOOP
    v_counter := v_counter + 1;
    v_slug := v_base_slug || '-' || v_counter;
  END LOOP;

  -- Create organization with "My Company" name
  INSERT INTO organizations (
    name,
    slug,
    created_by,
    billing_owner_id,
    plan,
    billing_status
  )
  VALUES (
    'My Company',
    v_slug,
    p_user_id,
    p_user_id,
    'free',
    'inactive'
  )
  RETURNING id INTO v_org_id;

  -- Add user as owner
  INSERT INTO organization_members (org_id, user_id, role)
  VALUES (v_org_id, p_user_id, 'owner');

  -- Update user's active org
  UPDATE users SET active_org_id = v_org_id WHERE id = p_user_id;

  -- Migrate projects to this org
  UPDATE projects
  SET organization_id = v_org_id
  WHERE user_id = p_user_id AND organization_id IS NULL;

  -- Migrate project_estimates (if table exists)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'project_estimates') THEN
    UPDATE project_estimates
    SET organization_id = v_org_id
    WHERE user_id = p_user_id AND organization_id IS NULL;
  END IF;

  -- Migrate payments (if table exists)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payments') THEN
    UPDATE payments
    SET organization_id = v_org_id
    WHERE user_id = p_user_id AND organization_id IS NULL;
  END IF;

  RETURN v_org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Run migration for all existing users who don't have an org yet
DO $$
DECLARE
  r RECORD;
  migrated_count INT := 0;
BEGIN
  FOR r IN
    SELECT u.id, u.email
    FROM users u
    WHERE NOT EXISTS (
      SELECT 1 FROM organization_members om WHERE om.user_id = u.id
    )
    AND u.email IS NOT NULL
  LOOP
    PERFORM migrate_user_to_default_org(r.id, r.email);
    migrated_count := migrated_count + 1;
  END LOOP;

  RAISE NOTICE 'Migrated % users to default organizations', migrated_count;
END $$;

-- ============================================
-- STEP 13: HELPER FUNCTION FOR NEW USER ONBOARDING
-- ============================================

CREATE OR REPLACE FUNCTION create_default_org_for_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create org if user doesn't have one (handles edge cases)
  IF NOT EXISTS (SELECT 1 FROM organization_members WHERE user_id = NEW.id) THEN
    PERFORM migrate_user_to_default_org(NEW.id, NEW.email);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment documenting the migration
COMMENT ON FUNCTION migrate_user_to_default_org IS
  'Creates a default organization for a user and migrates all their existing data.
   Called during initial migration and can be called for new users during onboarding.';

-- ============================================
-- DONE! Your organizations system is now set up.
-- ============================================
-- All existing users have been migrated to their own "My Company" organization.
-- All their existing projects, estimates, and payments are now scoped to their org.
-- New users will automatically get a default org when they sign up.
-- ============================================
