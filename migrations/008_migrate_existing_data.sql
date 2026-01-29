-- Migration 008: Migrate Existing Users to Default Organizations
-- Creates a default "My Company" org for each existing user and migrates their data

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
  v_base_slug := REGEXP_REPLACE(v_base_slug, '-+', '-', 'g'); -- Collapse multiple dashes
  v_base_slug := TRIM(BOTH '-' FROM v_base_slug); -- Remove leading/trailing dashes

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

  -- Migrate project_estimates
  UPDATE project_estimates
  SET organization_id = v_org_id
  WHERE user_id = p_user_id AND organization_id IS NULL;

  -- Migrate payments
  UPDATE payments
  SET organization_id = v_org_id
  WHERE user_id = p_user_id AND organization_id IS NULL;

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

-- Create helper function for new user onboarding
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

-- Optional: Trigger to auto-create org for new users
-- Uncomment if you want automatic org creation on user insert
-- DROP TRIGGER IF EXISTS create_org_for_new_user ON users;
-- CREATE TRIGGER create_org_for_new_user
--   AFTER INSERT ON users
--   FOR EACH ROW
--   EXECUTE FUNCTION create_default_org_for_user();

-- Add comment documenting the migration
COMMENT ON FUNCTION migrate_user_to_default_org IS
  'Creates a default organization for a user and migrates all their existing data.
   Called during initial migration and can be called for new users during onboarding.';
