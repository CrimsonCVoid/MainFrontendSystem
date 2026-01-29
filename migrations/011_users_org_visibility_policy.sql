-- ============================================
-- USERS TABLE - ORG MEMBER VISIBILITY
-- ============================================
-- Allow users to see other users who are in the same organization
-- This enables the members list to show all org members

-- First, ensure RLS is enabled on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Users can view org members" ON users;

-- Policy: Users can always view their own profile
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT
  USING (auth.uid() = id);

-- Policy: Users can update their own profile
CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE
  USING (auth.uid() = id);

-- Policy: Users can insert their own profile (for ensureUserRecord on sign-in)
DROP POLICY IF EXISTS "Users can insert own profile" ON users;
CREATE POLICY "Users can insert own profile" ON users
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Policy: Users can view other users who are in the same organization
-- This allows the members list to display all org members
CREATE POLICY "Users can view org members" ON users
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM organization_members om1
      JOIN organization_members om2 ON om1.org_id = om2.org_id
      WHERE om1.user_id = auth.uid()
        AND om2.user_id = users.id
    )
  );

-- Grant necessary permissions
GRANT SELECT ON users TO authenticated;
GRANT UPDATE ON users TO authenticated;
GRANT INSERT ON users TO authenticated;
