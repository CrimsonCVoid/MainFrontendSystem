-- Migration 007: Row Level Security Policies for Organizations
-- Ensures multi-tenant data isolation

-- Enable RLS on organization tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_domain_rules ENABLE ROW LEVEL SECURITY;

-- ============================================
-- ORGANIZATIONS POLICIES
-- ============================================

-- Users can view organizations they belong to
DROP POLICY IF EXISTS "Users can view their organizations" ON organizations;
CREATE POLICY "Users can view their organizations" ON organizations
  FOR SELECT USING (
    id IN (SELECT org_id FROM organization_members WHERE user_id = auth.uid())
  );

-- Only owners can update their organization
DROP POLICY IF EXISTS "Owners and admins can update organization" ON organizations;
CREATE POLICY "Owners and admins can update organization" ON organizations
  FOR UPDATE USING (
    id IN (SELECT org_id FROM organization_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
  );

-- Users can create organizations
DROP POLICY IF EXISTS "Users can create organizations" ON organizations;
CREATE POLICY "Users can create organizations" ON organizations
  FOR INSERT WITH CHECK (created_by = auth.uid());

-- Only owners can delete organizations
DROP POLICY IF EXISTS "Only owners can delete organizations" ON organizations;
CREATE POLICY "Only owners can delete organizations" ON organizations
  FOR DELETE USING (
    id IN (SELECT org_id FROM organization_members WHERE user_id = auth.uid() AND role = 'owner')
  );

-- ============================================
-- ORGANIZATION MEMBERS POLICIES
-- ============================================

-- View members of orgs you belong to
DROP POLICY IF EXISTS "View members of your orgs" ON organization_members;
CREATE POLICY "View members of your orgs" ON organization_members
  FOR SELECT USING (
    org_id IN (SELECT org_id FROM organization_members WHERE user_id = auth.uid())
  );

-- Owners and admins can add members
DROP POLICY IF EXISTS "Admins can add members" ON organization_members;
CREATE POLICY "Admins can add members" ON organization_members
  FOR INSERT WITH CHECK (
    org_id IN (SELECT org_id FROM organization_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
  );

-- Owners and admins can update member roles
DROP POLICY IF EXISTS "Admins can update members" ON organization_members;
CREATE POLICY "Admins can update members" ON organization_members
  FOR UPDATE USING (
    org_id IN (SELECT org_id FROM organization_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
  );

-- Owners and admins can remove members
DROP POLICY IF EXISTS "Admins can remove members" ON organization_members;
CREATE POLICY "Admins can remove members" ON organization_members
  FOR DELETE USING (
    org_id IN (SELECT org_id FROM organization_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
  );

-- ============================================
-- ORG INVITES POLICIES
-- ============================================

-- View invites for orgs you manage
DROP POLICY IF EXISTS "View invites for managed orgs" ON org_invites;
CREATE POLICY "View invites for managed orgs" ON org_invites
  FOR SELECT USING (
    org_id IN (SELECT org_id FROM organization_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
    OR token IS NOT NULL -- Allow public access to validate tokens
  );

-- Owners and admins can create invites
DROP POLICY IF EXISTS "Admins can create invites" ON org_invites;
CREATE POLICY "Admins can create invites" ON org_invites
  FOR INSERT WITH CHECK (
    org_id IN (SELECT org_id FROM organization_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
  );

-- Owners and admins can update invites (revoke)
DROP POLICY IF EXISTS "Admins can update invites" ON org_invites;
CREATE POLICY "Admins can update invites" ON org_invites
  FOR UPDATE USING (
    org_id IN (SELECT org_id FROM organization_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
  );

-- Owners and admins can delete invites
DROP POLICY IF EXISTS "Admins can delete invites" ON org_invites;
CREATE POLICY "Admins can delete invites" ON org_invites
  FOR DELETE USING (
    org_id IN (SELECT org_id FROM organization_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
  );

-- ============================================
-- ORG DOMAIN RULES POLICIES
-- ============================================

-- View domain rules for orgs you manage
DROP POLICY IF EXISTS "View domain rules" ON org_domain_rules;
CREATE POLICY "View domain rules" ON org_domain_rules
  FOR SELECT USING (
    org_id IN (SELECT org_id FROM organization_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
    OR enabled = TRUE -- Allow domain checking during signup
  );

-- Owners and admins can manage domain rules
DROP POLICY IF EXISTS "Admins can manage domain rules" ON org_domain_rules;
CREATE POLICY "Admins can manage domain rules" ON org_domain_rules
  FOR ALL USING (
    org_id IN (SELECT org_id FROM organization_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
  );

-- ============================================
-- PROJECTS POLICIES (Updated for org scope)
-- ============================================

-- Drop existing project policies
DROP POLICY IF EXISTS "Users can view their projects" ON projects;
DROP POLICY IF EXISTS "Users can create projects" ON projects;
DROP POLICY IF EXISTS "Users can update projects" ON projects;
DROP POLICY IF EXISTS "Users can delete projects" ON projects;

-- Members can view org projects
CREATE POLICY "Members can view org projects" ON projects
  FOR SELECT USING (
    organization_id IN (SELECT org_id FROM organization_members WHERE user_id = auth.uid())
    OR (organization_id IS NULL AND user_id = auth.uid()) -- Legacy: user-owned projects without org
  );

-- Members can create org projects
CREATE POLICY "Members can create org projects" ON projects
  FOR INSERT WITH CHECK (
    organization_id IN (SELECT org_id FROM organization_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'member'))
    OR (organization_id IS NULL AND user_id = auth.uid()) -- Legacy support
  );

-- Members can update org projects
CREATE POLICY "Members can update org projects" ON projects
  FOR UPDATE USING (
    organization_id IN (SELECT org_id FROM organization_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'member'))
    OR (organization_id IS NULL AND user_id = auth.uid()) -- Legacy support
  );

-- Only admins can delete org projects
CREATE POLICY "Admins can delete org projects" ON projects
  FOR DELETE USING (
    organization_id IN (SELECT org_id FROM organization_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
    OR (organization_id IS NULL AND user_id = auth.uid()) -- Legacy support
  );

-- ============================================
-- PROJECT ESTIMATES POLICIES (Updated for org scope)
-- ============================================

DROP POLICY IF EXISTS "Users can view their estimates" ON project_estimates;
DROP POLICY IF EXISTS "Users can create estimates" ON project_estimates;
DROP POLICY IF EXISTS "Users can update estimates" ON project_estimates;
DROP POLICY IF EXISTS "Users can delete estimates" ON project_estimates;

CREATE POLICY "Members can view org estimates" ON project_estimates
  FOR SELECT USING (
    organization_id IN (SELECT org_id FROM organization_members WHERE user_id = auth.uid())
    OR (organization_id IS NULL AND user_id = auth.uid())
  );

CREATE POLICY "Members can create org estimates" ON project_estimates
  FOR INSERT WITH CHECK (
    organization_id IN (SELECT org_id FROM organization_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'member'))
    OR (organization_id IS NULL AND user_id = auth.uid())
  );

CREATE POLICY "Members can update org estimates" ON project_estimates
  FOR UPDATE USING (
    organization_id IN (SELECT org_id FROM organization_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'member'))
    OR (organization_id IS NULL AND user_id = auth.uid())
  );

CREATE POLICY "Admins can delete org estimates" ON project_estimates
  FOR DELETE USING (
    organization_id IN (SELECT org_id FROM organization_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
    OR (organization_id IS NULL AND user_id = auth.uid())
  );
