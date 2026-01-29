-- ============================================
-- ORGANIZATION BASE SF POOL (50,000 SF)
-- ============================================
-- All organizations start with a free 50,000 SF pool.
-- Regular (individual) users follow per-project pricing.
-- ============================================

-- Base SF for all organizations
DO $$
DECLARE
  BASE_SF CONSTANT INTEGER := 50000;
BEGIN

  -- ============================================
  -- STEP 1: Update create_organization function
  -- ============================================
  -- New organizations will start with 50,000 SF base pool

  CREATE OR REPLACE FUNCTION create_organization(
    p_user_id UUID,
    p_name TEXT,
    p_slug TEXT,
    p_logo_url TEXT DEFAULT NULL
  )
  RETURNS UUID AS $func$
  DECLARE
    v_org_id UUID;
    v_base_sf INTEGER := 50000;  -- Base SF for all organizations
  BEGIN
    -- Verify user exists
    IF NOT EXISTS (SELECT 1 FROM users WHERE id = p_user_id) THEN
      RAISE EXCEPTION 'User not found';
    END IF;

    -- Create organization with base SF pool
    INSERT INTO organizations (
      name,
      slug,
      logo_url,
      created_by,
      billing_owner_id,
      plan,
      billing_status,
      settings,
      sf_pool_total,
      sf_pool_used,
      sf_pool_updated_at
    )
    VALUES (
      p_name,
      p_slug,
      p_logo_url,
      p_user_id,
      p_user_id,
      'free',
      'inactive',
      '{}'::jsonb,
      v_base_sf,  -- Start with 50,000 SF
      0,
      now()
    )
    RETURNING id INTO v_org_id;

    -- Add user as owner
    INSERT INTO organization_members (org_id, user_id, role)
    VALUES (v_org_id, p_user_id, 'owner');

    -- Set as active org if user doesn't have one
    UPDATE users
    SET active_org_id = v_org_id
    WHERE id = p_user_id AND active_org_id IS NULL;

    -- Create initial SF transaction record for base allocation
    INSERT INTO sf_pool_transactions (
      org_id,
      user_id,
      transaction_type,
      sf_amount,
      sf_balance_after,
      notes
    )
    VALUES (
      v_org_id,
      p_user_id,
      'adjustment',
      v_base_sf,
      v_base_sf,
      'Initial organization SF allocation (50,000 SF base)'
    );

    RETURN v_org_id;
  END;
  $func$ LANGUAGE plpgsql SECURITY DEFINER;

  -- ============================================
  -- STEP 2: Update migrate_user_to_default_org function
  -- ============================================
  -- Existing users who get migrated also get 50,000 SF base

  CREATE OR REPLACE FUNCTION migrate_user_to_default_org(p_user_id UUID, p_user_email TEXT)
  RETURNS UUID AS $func$
  DECLARE
    v_org_id UUID;
    v_slug TEXT;
    v_base_slug TEXT;
    v_counter INT := 0;
    v_base_sf INTEGER := 50000;  -- Base SF for all organizations
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

    -- Create organization with "My Company" name and base SF pool
    INSERT INTO organizations (
      name,
      slug,
      created_by,
      billing_owner_id,
      plan,
      billing_status,
      sf_pool_total,
      sf_pool_used,
      sf_pool_updated_at
    )
    VALUES (
      'My Company',
      v_slug,
      p_user_id,
      p_user_id,
      'free',
      'inactive',
      v_base_sf,  -- Start with 50,000 SF
      0,
      now()
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

    -- Create initial SF transaction record for base allocation
    INSERT INTO sf_pool_transactions (
      org_id,
      user_id,
      transaction_type,
      sf_amount,
      sf_balance_after,
      notes
    )
    VALUES (
      v_org_id,
      p_user_id,
      'adjustment',
      v_base_sf,
      v_base_sf,
      'Initial organization SF allocation (50,000 SF base)'
    );

    RETURN v_org_id;
  END;
  $func$ LANGUAGE plpgsql SECURITY DEFINER;

END $$;

-- ============================================
-- STEP 3: Grant base SF to existing organizations
-- ============================================
-- Organizations that have 0 SF total will get the 50,000 SF base

DO $$
DECLARE
  v_base_sf INTEGER := 50000;
  r RECORD;
  v_updated_count INT := 0;
BEGIN
  -- Find all organizations with 0 SF pool total
  FOR r IN
    SELECT o.id, o.name, o.billing_owner_id
    FROM organizations o
    WHERE (o.sf_pool_total IS NULL OR o.sf_pool_total = 0)
      AND o.deleted_at IS NULL
  LOOP
    -- Update organization with base SF
    UPDATE organizations
    SET
      sf_pool_total = v_base_sf,
      sf_pool_used = COALESCE(sf_pool_used, 0),
      sf_pool_updated_at = now()
    WHERE id = r.id;

    -- Create transaction record for the base allocation
    -- Only if sf_pool_transactions table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sf_pool_transactions') THEN
      INSERT INTO sf_pool_transactions (
        org_id,
        user_id,
        transaction_type,
        sf_amount,
        sf_balance_after,
        notes
      )
      VALUES (
        r.id,
        COALESCE(r.billing_owner_id, (SELECT user_id FROM organization_members WHERE org_id = r.id AND role = 'owner' LIMIT 1)),
        'adjustment',
        v_base_sf,
        v_base_sf - COALESCE((SELECT sf_pool_used FROM organizations WHERE id = r.id), 0),
        'Granted base SF allocation (50,000 SF) to existing organization'
      );
    END IF;

    v_updated_count := v_updated_count + 1;
  END LOOP;

  RAISE NOTICE 'Granted base 50,000 SF to % existing organizations', v_updated_count;
END $$;

-- ============================================
-- DONE! All organizations now have base SF pool
-- ============================================
-- New organizations: Created with 50,000 SF automatically
-- Existing organizations: Granted 50,000 SF base (if they had 0)
-- ============================================
