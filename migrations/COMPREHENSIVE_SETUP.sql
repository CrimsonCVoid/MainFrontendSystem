-- ============================================
-- COMPREHENSIVE NON-DESTRUCTIVE SETUP SCRIPT
-- ============================================
-- Run this in Supabase SQL Editor to ensure all tables,
-- columns, policies, and functions exist.
-- Safe to run multiple times.
--
-- ORDER: Tables → Columns → Indexes → RLS → Functions → Policies → Grants
-- ============================================

-- ============================================
-- STEP 1: CREATE ALL TABLES (without policies)
-- ============================================

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Organizations table
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  logo_url TEXT,
  plan VARCHAR(20) DEFAULT 'free',
  billing_status VARCHAR(20) DEFAULT 'inactive',
  billing_owner_id UUID,
  stripe_customer_id VARCHAR(255),
  stripe_subscription_id VARCHAR(255),
  trial_ends_at TIMESTAMPTZ,
  settings JSONB DEFAULT '{}'::jsonb,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Organization members table
CREATE TABLE IF NOT EXISTS organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  user_id UUID NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'member',
  invited_by UUID,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add unique constraint if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'org_members_unique') THEN
    ALTER TABLE organization_members ADD CONSTRAINT org_members_unique UNIQUE (org_id, user_id);
  END IF;
END $$;

-- Organization invites table
CREATE TABLE IF NOT EXISTS org_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  email VARCHAR(255),
  token VARCHAR(64) UNIQUE NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'member',
  invite_type VARCHAR(20) NOT NULL DEFAULT 'email',
  invited_by UUID NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + interval '7 days'),
  accepted_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  max_uses INT DEFAULT 1,
  use_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Promo keys table
CREATE TABLE IF NOT EXISTS promo_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_code VARCHAR(20) UNIQUE NOT NULL,
  organization_id UUID,
  is_used BOOLEAN DEFAULT FALSE NOT NULL,
  used_by_user_id UUID,
  used_for_project_id UUID,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID,
  notes TEXT
);

-- Project estimates table
CREATE TABLE IF NOT EXISTS project_estimates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  materials_cost NUMERIC(10, 2),
  labor_cost NUMERIC(10, 2),
  permits_fees NUMERIC(10, 2),
  contingency NUMERIC(10, 2),
  notes TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Estimate shares table
CREATE TABLE IF NOT EXISTS estimate_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL,
  organization_id UUID,
  share_token TEXT UNIQUE NOT NULL,
  client_name TEXT,
  client_email TEXT,
  client_phone TEXT,
  expires_at TIMESTAMPTZ,
  password_hash TEXT,
  view_count INTEGER DEFAULT 0,
  last_viewed_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending',
  approved_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  signature_data JSONB,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Share views tracking
CREATE TABLE IF NOT EXISTS estimate_share_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  share_id UUID NOT NULL,
  viewed_at TIMESTAMPTZ DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT,
  referrer TEXT
);

-- Client responses
CREATE TABLE IF NOT EXISTS estimate_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  share_id UUID NOT NULL,
  response_type TEXT NOT NULL,
  message TEXT,
  signature_data JSONB,
  client_name TEXT,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Project revenue tracking
CREATE TABLE IF NOT EXISTS project_revenue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID,
  organization_id UUID,
  estimated_revenue DECIMAL(12,2),
  actual_revenue DECIMAL(12,2),
  estimated_cost DECIMAL(12,2),
  actual_cost DECIMAL(12,2),
  margin_percent DECIMAL(5,2),
  payment_status TEXT DEFAULT 'unpaid',
  invoice_number TEXT,
  notes TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Material costs reference
CREATE TABLE IF NOT EXISTS material_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID,
  material_type TEXT NOT NULL,
  material_name TEXT NOT NULL,
  unit TEXT NOT NULL,
  cost_per_unit DECIMAL(10,2) NOT NULL,
  supplier TEXT,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bill of Materials per project
CREATE TABLE IF NOT EXISTS project_bom (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID,
  material_type TEXT NOT NULL,
  quantity DECIMAL(12,2) NOT NULL,
  unit TEXT NOT NULL,
  unit_cost DECIMAL(10,2),
  total_cost DECIMAL(12,2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Email queue
CREATE TABLE IF NOT EXISTS email_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID,
  to_email TEXT NOT NULL,
  to_name TEXT,
  subject TEXT NOT NULL,
  template_type TEXT NOT NULL,
  template_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  attachment_url TEXT,
  status TEXT DEFAULT 'pending',
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notification preferences
CREATE TABLE IF NOT EXISTS notification_preferences (
  user_id UUID PRIMARY KEY,
  email_estimate_approved BOOLEAN DEFAULT TRUE,
  email_estimate_rejected BOOLEAN DEFAULT TRUE,
  email_estimate_viewed BOOLEAN DEFAULT TRUE,
  email_sf_pool_low BOOLEAN DEFAULT TRUE,
  email_team_activity BOOLEAN DEFAULT FALSE,
  sf_pool_warning_threshold INTEGER DEFAULT 5,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- STEP 2: ADD ALL MISSING COLUMNS
-- ============================================

-- Users columns
ALTER TABLE users ADD COLUMN IF NOT EXISTS company_name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS company_logo_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS company_phone TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS company_address TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS company_email TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS company_website TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS active_org_id UUID;

-- Projects columns
ALTER TABLE projects ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS postal_code TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS square_footage NUMERIC;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS roof_data JSONB;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS organization_id UUID;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS payment_required BOOLEAN DEFAULT TRUE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS payment_completed BOOLEAN DEFAULT FALSE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS payment_id TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS archived_by UUID;

-- Organizations columns
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS sf_pool_total INTEGER DEFAULT 0;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS sf_pool_used INTEGER DEFAULT 0;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS sf_pool_updated_at TIMESTAMPTZ;

-- Project estimates columns
ALTER TABLE project_estimates ADD COLUMN IF NOT EXISTS organization_id UUID;

-- Promo keys columns (in case table existed without this)
ALTER TABLE promo_keys ADD COLUMN IF NOT EXISTS organization_id UUID;

-- Estimate shares columns (in case table existed without this)
ALTER TABLE estimate_shares ADD COLUMN IF NOT EXISTS organization_id UUID;

-- Project revenue columns (in case table existed without this)
ALTER TABLE project_revenue ADD COLUMN IF NOT EXISTS organization_id UUID;

-- Material costs columns (in case table existed without this)
ALTER TABLE material_costs ADD COLUMN IF NOT EXISTS organization_id UUID;

-- Project BOM columns (in case table existed without this)
ALTER TABLE project_bom ADD COLUMN IF NOT EXISTS project_id UUID;

-- Email queue columns (in case table existed without this)
ALTER TABLE email_queue ADD COLUMN IF NOT EXISTS organization_id UUID;

-- ============================================
-- STEP 3: CREATE INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_users_active_org ON users(active_org_id);
CREATE INDEX IF NOT EXISTS idx_projects_user ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_org ON projects(organization_id);
CREATE INDEX IF NOT EXISTS idx_projects_address ON projects(address);
CREATE INDEX IF NOT EXISTS idx_projects_created ON projects(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);
CREATE INDEX IF NOT EXISTS idx_org_members_org ON organization_members(org_id);
CREATE INDEX IF NOT EXISTS idx_org_members_user ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_invites_token ON org_invites(token);
CREATE INDEX IF NOT EXISTS idx_promo_keys_code ON promo_keys(key_code);
CREATE INDEX IF NOT EXISTS idx_promo_keys_org ON promo_keys(organization_id);
CREATE INDEX IF NOT EXISTS idx_project_estimates_project ON project_estimates(project_id);
CREATE INDEX IF NOT EXISTS idx_project_estimates_user ON project_estimates(user_id);
CREATE INDEX IF NOT EXISTS idx_project_estimates_org ON project_estimates(organization_id);
CREATE INDEX IF NOT EXISTS idx_estimate_shares_token ON estimate_shares(share_token);
CREATE INDEX IF NOT EXISTS idx_estimate_shares_project ON estimate_shares(project_id);
CREATE INDEX IF NOT EXISTS idx_estimate_shares_org ON estimate_shares(organization_id);
CREATE INDEX IF NOT EXISTS idx_estimate_share_views_share ON estimate_share_views(share_id);
CREATE INDEX IF NOT EXISTS idx_estimate_responses_share ON estimate_responses(share_id);
CREATE INDEX IF NOT EXISTS idx_project_revenue_org ON project_revenue(organization_id);
CREATE INDEX IF NOT EXISTS idx_project_revenue_project ON project_revenue(project_id);
CREATE INDEX IF NOT EXISTS idx_material_costs_org ON material_costs(organization_id);
CREATE INDEX IF NOT EXISTS idx_project_bom_project ON project_bom(project_id);
CREATE INDEX IF NOT EXISTS idx_email_queue_status ON email_queue(status, created_at);

-- ============================================
-- STEP 4: ENABLE ROW LEVEL SECURITY
-- ============================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_estimates ENABLE ROW LEVEL SECURITY;
ALTER TABLE estimate_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE estimate_share_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE estimate_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_revenue ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_bom ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 5: CREATE HELPER FUNCTIONS (before policies)
-- ============================================

-- Check if user is org member
CREATE OR REPLACE FUNCTION is_org_member(p_org_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM organization_members
    WHERE org_id = p_org_id AND user_id = p_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Check if user is org admin
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

-- Updated at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- STEP 6: DROP OLD POLICIES (clean slate)
-- ============================================

-- Users
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Users can insert own profile" ON users;
DROP POLICY IF EXISTS "Users can view org members" ON users;

-- Projects
DROP POLICY IF EXISTS "Users can view their projects" ON projects;
DROP POLICY IF EXISTS "Users can create projects" ON projects;
DROP POLICY IF EXISTS "Users can update projects" ON projects;
DROP POLICY IF EXISTS "Users can delete projects" ON projects;
DROP POLICY IF EXISTS "Members can view org projects" ON projects;
DROP POLICY IF EXISTS "Members can create org projects" ON projects;
DROP POLICY IF EXISTS "Members can update org projects" ON projects;
DROP POLICY IF EXISTS "Admins can delete org projects" ON projects;

-- Organizations
DROP POLICY IF EXISTS "Users can view their organizations" ON organizations;
DROP POLICY IF EXISTS "Admins can update organization" ON organizations;
DROP POLICY IF EXISTS "Users can create organizations" ON organizations;
DROP POLICY IF EXISTS "Owners and admins can update organization" ON organizations;
DROP POLICY IF EXISTS "Only owners can delete organizations" ON organizations;

-- Organization members
DROP POLICY IF EXISTS "View members of your orgs" ON organization_members;
DROP POLICY IF EXISTS "Admins can manage members" ON organization_members;
DROP POLICY IF EXISTS "Users can view own membership" ON organization_members;
DROP POLICY IF EXISTS "Admins can add members" ON organization_members;
DROP POLICY IF EXISTS "Admins can update members" ON organization_members;
DROP POLICY IF EXISTS "Admins can remove members" ON organization_members;

-- Org invites
DROP POLICY IF EXISTS "View invites for managed orgs" ON org_invites;
DROP POLICY IF EXISTS "Admins can create invites" ON org_invites;
DROP POLICY IF EXISTS "Admins can update invites" ON org_invites;
DROP POLICY IF EXISTS "Admins can delete invites" ON org_invites;

-- Promo keys
DROP POLICY IF EXISTS "Admins can view org promo keys" ON promo_keys;
DROP POLICY IF EXISTS "Users can validate promo keys" ON promo_keys;
DROP POLICY IF EXISTS "Admins can create promo keys" ON promo_keys;
DROP POLICY IF EXISTS "Admins can update promo keys" ON promo_keys;
DROP POLICY IF EXISTS "Admins can delete promo keys" ON promo_keys;
DROP POLICY IF EXISTS "Admins can manage promo keys" ON promo_keys;

-- Project estimates
DROP POLICY IF EXISTS "Users can view own estimates" ON project_estimates;
DROP POLICY IF EXISTS "Users can create own estimates" ON project_estimates;
DROP POLICY IF EXISTS "Users can update own estimates" ON project_estimates;
DROP POLICY IF EXISTS "Users can delete own estimates" ON project_estimates;
DROP POLICY IF EXISTS "Members can view org estimates" ON project_estimates;
DROP POLICY IF EXISTS "Members can create org estimates" ON project_estimates;
DROP POLICY IF EXISTS "Members can update org estimates" ON project_estimates;
DROP POLICY IF EXISTS "Admins can delete org estimates" ON project_estimates;
DROP POLICY IF EXISTS "Users can view estimates" ON project_estimates;
DROP POLICY IF EXISTS "Users can create estimates" ON project_estimates;
DROP POLICY IF EXISTS "Users can update estimates" ON project_estimates;
DROP POLICY IF EXISTS "Users can delete estimates" ON project_estimates;

-- Estimate shares
DROP POLICY IF EXISTS "Users can view shares for their org projects" ON estimate_shares;
DROP POLICY IF EXISTS "Users can create shares for their org projects" ON estimate_shares;
DROP POLICY IF EXISTS "Users can update shares for their org projects" ON estimate_shares;

-- Revenue/BOM
DROP POLICY IF EXISTS "Members can manage project revenue" ON project_revenue;
DROP POLICY IF EXISTS "Members can manage material costs" ON material_costs;
DROP POLICY IF EXISTS "Members can manage project bom" ON project_bom;
DROP POLICY IF EXISTS "Users can manage own notification prefs" ON notification_preferences;

-- ============================================
-- STEP 7: CREATE ALL POLICIES
-- ============================================

-- USERS POLICIES
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON users
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can view org members" ON users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM organization_members om1
      JOIN organization_members om2 ON om1.org_id = om2.org_id
      WHERE om1.user_id = auth.uid() AND om2.user_id = users.id
    )
  );

-- PROJECTS POLICIES
CREATE POLICY "Members can view org projects" ON projects
  FOR SELECT USING (
    user_id = auth.uid()
    OR (organization_id IS NOT NULL AND is_org_member(organization_id, auth.uid()))
  );

CREATE POLICY "Members can create org projects" ON projects
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    OR (organization_id IS NOT NULL AND is_org_member(organization_id, auth.uid()))
  );

CREATE POLICY "Members can update org projects" ON projects
  FOR UPDATE USING (
    user_id = auth.uid()
    OR (organization_id IS NOT NULL AND is_org_member(organization_id, auth.uid()))
  );

CREATE POLICY "Admins can delete org projects" ON projects
  FOR DELETE USING (
    user_id = auth.uid()
    OR (organization_id IS NOT NULL AND is_org_admin(organization_id, auth.uid()))
  );

-- ORGANIZATIONS POLICIES
CREATE POLICY "Users can view their organizations" ON organizations
  FOR SELECT USING (is_org_member(id, auth.uid()));

CREATE POLICY "Admins can update organization" ON organizations
  FOR UPDATE USING (is_org_admin(id, auth.uid()));

CREATE POLICY "Users can create organizations" ON organizations
  FOR INSERT WITH CHECK (created_by = auth.uid());

-- ORGANIZATION MEMBERS POLICIES
CREATE POLICY "View members of your orgs" ON organization_members
  FOR SELECT USING (user_id = auth.uid() OR is_org_member(org_id, auth.uid()));

CREATE POLICY "Admins can manage members" ON organization_members
  FOR ALL USING (is_org_admin(org_id, auth.uid()));

-- ORG INVITES POLICIES
CREATE POLICY "View invites for managed orgs" ON org_invites
  FOR SELECT USING (is_org_admin(org_id, auth.uid()) OR token IS NOT NULL);

CREATE POLICY "Admins can create invites" ON org_invites
  FOR INSERT WITH CHECK (is_org_admin(org_id, auth.uid()));

CREATE POLICY "Admins can update invites" ON org_invites
  FOR UPDATE USING (is_org_admin(org_id, auth.uid()));

CREATE POLICY "Admins can delete invites" ON org_invites
  FOR DELETE USING (is_org_admin(org_id, auth.uid()));

-- PROMO KEYS POLICIES
CREATE POLICY "Admins can view org promo keys" ON promo_keys
  FOR SELECT USING (
    (organization_id IS NOT NULL AND is_org_admin(organization_id, auth.uid()))
    OR (auth.uid() IS NOT NULL AND is_used = FALSE)
  );

CREATE POLICY "Admins can manage promo keys" ON promo_keys
  FOR ALL USING (organization_id IS NOT NULL AND is_org_admin(organization_id, auth.uid()));

-- PROJECT ESTIMATES POLICIES
CREATE POLICY "Users can view estimates" ON project_estimates
  FOR SELECT USING (
    user_id = auth.uid()
    OR (organization_id IS NOT NULL AND is_org_member(organization_id, auth.uid()))
  );

CREATE POLICY "Users can create estimates" ON project_estimates
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    OR (organization_id IS NOT NULL AND is_org_member(organization_id, auth.uid()))
  );

CREATE POLICY "Users can update estimates" ON project_estimates
  FOR UPDATE USING (
    user_id = auth.uid()
    OR (organization_id IS NOT NULL AND is_org_member(organization_id, auth.uid()))
  );

CREATE POLICY "Users can delete estimates" ON project_estimates
  FOR DELETE USING (
    user_id = auth.uid()
    OR (organization_id IS NOT NULL AND is_org_member(organization_id, auth.uid()))
  );

-- ESTIMATE SHARES POLICIES
CREATE POLICY "Users can view shares for their org projects" ON estimate_shares
  FOR SELECT TO authenticated USING (
    organization_id IS NULL
    OR organization_id IN (SELECT org_id FROM organization_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can create shares for their org projects" ON estimate_shares
  FOR INSERT TO authenticated WITH CHECK (
    organization_id IS NULL
    OR organization_id IN (SELECT org_id FROM organization_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can update shares for their org projects" ON estimate_shares
  FOR UPDATE TO authenticated USING (
    organization_id IS NULL
    OR organization_id IN (SELECT org_id FROM organization_members WHERE user_id = auth.uid())
  );

-- REVENUE/BOM POLICIES
CREATE POLICY "Members can manage project revenue" ON project_revenue
  FOR ALL USING (
    organization_id IS NULL
    OR organization_id IN (SELECT org_id FROM organization_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Members can manage material costs" ON material_costs
  FOR ALL USING (
    organization_id IS NULL
    OR organization_id IN (SELECT org_id FROM organization_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Members can manage project bom" ON project_bom
  FOR ALL USING (
    project_id IN (
      SELECT p.id FROM projects p
      WHERE p.user_id = auth.uid()
      OR p.organization_id IN (SELECT org_id FROM organization_members WHERE user_id = auth.uid())
    )
  );

-- NOTIFICATION PREFERENCES POLICIES
CREATE POLICY "Users can manage own notification prefs" ON notification_preferences
  FOR ALL USING (user_id = auth.uid());

-- ============================================
-- STEP 8: PUBLIC ACCESS FUNCTIONS FOR CLIENT PORTAL
-- ============================================

-- Drop existing functions first (to handle signature changes)
DROP FUNCTION IF EXISTS get_estimate_share_by_token(TEXT);
DROP FUNCTION IF EXISTS record_estimate_view(TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS submit_estimate_response(TEXT, TEXT, TEXT, JSONB, TEXT, TEXT);
DROP FUNCTION IF EXISTS create_organization(UUID, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS redeem_promo_key(TEXT, UUID, UUID);

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
  SELECT * INTO v_share FROM estimate_shares WHERE share_token = p_token;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Share not found');
  END IF;

  IF v_share.expires_at IS NOT NULL AND v_share.expires_at < NOW() THEN
    UPDATE estimate_shares SET status = 'expired', updated_at = NOW() WHERE id = v_share.id;
    RETURN json_build_object('success', false, 'error', 'This estimate link has expired');
  END IF;

  SELECT * INTO v_project FROM projects WHERE id = v_share.project_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Project not found');
  END IF;

  SELECT id, name, logo_url, settings INTO v_org FROM organizations WHERE id = v_share.organization_id;

  SELECT * INTO v_estimate FROM project_estimates
    WHERE project_id = v_share.project_id ORDER BY created_at DESC LIMIT 1;

  RETURN json_build_object(
    'success', true,
    'share', json_build_object(
      'id', v_share.id, 'status', v_share.status, 'client_name', v_share.client_name,
      'client_email', v_share.client_email, 'notes', v_share.notes,
      'requires_password', v_share.password_hash IS NOT NULL,
      'approved_at', v_share.approved_at, 'created_at', v_share.created_at
    ),
    'project', json_build_object(
      'id', v_project.id, 'name', v_project.name, 'address', v_project.address,
      'city', v_project.city, 'state', v_project.state, 'postal_code', v_project.postal_code,
      'square_footage', v_project.square_footage, 'roof_data', v_project.roof_data
    ),
    'organization', json_build_object(
      'id', v_org.id, 'name', v_org.name, 'logo_url', v_org.logo_url, 'settings', v_org.settings
    ),
    'estimate', CASE WHEN v_estimate IS NOT NULL THEN json_build_object(
      'id', v_estimate.id, 'name', v_estimate.name, 'materials_cost', v_estimate.materials_cost,
      'labor_cost', v_estimate.labor_cost, 'permits_fees', v_estimate.permits_fees,
      'contingency', v_estimate.contingency, 'notes', v_estimate.notes
    ) ELSE NULL END
  );
END;
$$;

-- Record a view (public access)
CREATE OR REPLACE FUNCTION record_estimate_view(
  p_token TEXT, p_ip_address TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL, p_referrer TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_share RECORD;
BEGIN
  SELECT * INTO v_share FROM estimate_shares WHERE share_token = p_token;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Share not found');
  END IF;

  INSERT INTO estimate_share_views (share_id, ip_address, user_agent, referrer)
  VALUES (v_share.id, p_ip_address, p_user_agent, p_referrer);

  UPDATE estimate_shares SET
    view_count = view_count + 1, last_viewed_at = NOW(),
    status = CASE WHEN status = 'pending' THEN 'viewed' ELSE status END,
    updated_at = NOW()
  WHERE id = v_share.id;

  RETURN json_build_object('success', true);
END;
$$;

-- Submit client response (public access)
CREATE OR REPLACE FUNCTION submit_estimate_response(
  p_token TEXT, p_response_type TEXT, p_message TEXT DEFAULT NULL,
  p_signature_data JSONB DEFAULT NULL, p_client_name TEXT DEFAULT NULL,
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
  IF p_response_type NOT IN ('question', 'comment', 'approval', 'rejection') THEN
    RETURN json_build_object('success', false, 'error', 'Invalid response type');
  END IF;

  SELECT * INTO v_share FROM estimate_shares WHERE share_token = p_token;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Share not found');
  END IF;

  IF v_share.status IN ('approved', 'rejected') AND p_response_type IN ('approval', 'rejection') THEN
    RETURN json_build_object('success', false, 'error', 'This estimate has already been ' || v_share.status);
  END IF;

  INSERT INTO estimate_responses (share_id, response_type, message, signature_data, client_name, ip_address)
  VALUES (v_share.id, p_response_type, p_message, p_signature_data, p_client_name, p_ip_address);

  IF p_response_type = 'approval' THEN
    UPDATE estimate_shares SET status = 'approved', approved_at = NOW(),
      signature_data = p_signature_data, updated_at = NOW() WHERE id = v_share.id;
  ELSIF p_response_type = 'rejection' THEN
    UPDATE estimate_shares SET status = 'rejected', rejected_at = NOW(),
      updated_at = NOW() WHERE id = v_share.id;
  END IF;

  RETURN json_build_object('success', true, 'message',
    CASE WHEN p_response_type = 'approval' THEN 'Estimate approved successfully'
         WHEN p_response_type = 'rejection' THEN 'Feedback submitted successfully'
         ELSE 'Response submitted successfully' END
  );
END;
$$;

-- Create organization function
CREATE OR REPLACE FUNCTION create_organization(
  p_user_id UUID, p_name TEXT, p_slug TEXT, p_logo_url TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_org_id UUID;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM users WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  INSERT INTO organizations (name, slug, logo_url, created_by, billing_owner_id, plan, billing_status, settings)
  VALUES (p_name, p_slug, p_logo_url, p_user_id, p_user_id, 'free', 'inactive', '{}'::jsonb)
  RETURNING id INTO v_org_id;

  INSERT INTO organization_members (org_id, user_id, role) VALUES (v_org_id, p_user_id, 'owner');
  UPDATE users SET active_org_id = v_org_id WHERE id = p_user_id AND active_org_id IS NULL;

  RETURN v_org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Redeem promo key function
CREATE OR REPLACE FUNCTION redeem_promo_key(p_key_code TEXT, p_project_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_promo_key RECORD;
BEGIN
  p_key_code := UPPER(REGEXP_REPLACE(p_key_code, '[\s\-]', '', 'g'));

  SELECT * INTO v_promo_key FROM promo_keys
  WHERE key_code = p_key_code AND is_used = FALSE FOR UPDATE;

  IF NOT FOUND THEN RETURN FALSE; END IF;

  IF NOT EXISTS (SELECT 1 FROM projects WHERE id = p_project_id AND user_id = p_user_id) THEN
    RAISE EXCEPTION 'Project not found or access denied';
  END IF;

  UPDATE promo_keys SET is_used = TRUE, used_by_user_id = p_user_id,
    used_for_project_id = p_project_id, used_at = NOW() WHERE id = v_promo_key.id;

  UPDATE projects SET payment_completed = TRUE, payment_required = FALSE,
    updated_at = NOW() WHERE id = p_project_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- STEP 9: GRANT PERMISSIONS
-- ============================================

GRANT SELECT, INSERT, UPDATE ON users TO authenticated;
GRANT ALL ON projects TO authenticated;
GRANT ALL ON organizations TO authenticated;
GRANT ALL ON organization_members TO authenticated;
GRANT ALL ON org_invites TO authenticated;
GRANT ALL ON promo_keys TO authenticated;
GRANT ALL ON project_estimates TO authenticated;
GRANT ALL ON estimate_shares TO authenticated;
GRANT ALL ON estimate_share_views TO authenticated;
GRANT ALL ON estimate_responses TO authenticated;
GRANT ALL ON project_revenue TO authenticated;
GRANT ALL ON material_costs TO authenticated;
GRANT ALL ON project_bom TO authenticated;
GRANT ALL ON email_queue TO authenticated;
GRANT ALL ON notification_preferences TO authenticated;

-- Function grants
GRANT EXECUTE ON FUNCTION get_estimate_share_by_token(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION record_estimate_view(TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION submit_estimate_response(TEXT, TEXT, TEXT, JSONB, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION create_organization(UUID, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION redeem_promo_key(TEXT, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_org_member(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_org_admin(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_org_owner(UUID, UUID) TO authenticated;

-- ============================================
-- DONE! Run this script in Supabase SQL Editor.
-- ============================================
