-- ============================================================================
-- Migration: 019_security_hardening.sql
-- Purpose:   Close RLS gaps surfaced by the 2026-04-21 security audit.
-- Scope:     Idempotent. Safe to re-run. Does not change any working behavior
--            if run against a schema where the policies are already correct.
-- ============================================================================
--
-- Findings addressed:
--   C-7 (Critical)  — training_samples, training_labels, snap_features,
--                     pipeline_runs have no CREATE TABLE in the repo and
--                     unknown RLS state. All four are written only by
--                     service_role clients (FastAPI sidecar + Next.js
--                     snapshot/cutsheet routes). Enable RLS defensively so
--                     any non-service-role access fails closed.
--   H-4 (High)      — activity_logs had `INSERT WITH CHECK (true)`,
--                     letting any authenticated user forge audit entries.
--                     All legitimate inserts go through the SECURITY
--                     DEFINER `log_activity()` RPC, which bypasses RLS
--                     anyway — so we lock down direct INSERT.
--   Defensive       — Ensure RLS is on for the tables the browser is known
--                     to hit via `/rest/v1/` with the anon key: users,
--                     projects, organizations, organization_members,
--                     activity_logs, proposals, estimate_shares, promo_keys.
--                     No policy changes; just a belt-and-suspenders
--                     ALTER TABLE ... ENABLE ROW LEVEL SECURITY in case a
--                     hotfix somewhere disabled it.
--
-- Tables this migration touches (all idempotent):
--   training_samples, training_labels, snap_features, pipeline_runs,
--   activity_logs, users, projects, organizations, organization_members,
--   estimate_shares, proposals, promo_keys
--
-- What it explicitly does NOT do:
--   - Create any tables (those are owned by the sidecar / manual setup).
--   - Grant permissive policies to the anon role on any pipeline table.
--     The architecture is: only service_role touches training/pipeline
--     tables. If you later want browser-direct reads, add a dedicated
--     policy — don't weaken this migration.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Pipeline tables: default-deny for anon/authenticated, service_role only
--    Using DO blocks so the migration survives any of these being absent.
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = 'public' AND table_name = 'training_samples') THEN
    EXECUTE 'ALTER TABLE public.training_samples ENABLE ROW LEVEL SECURITY';
    EXECUTE 'ALTER TABLE public.training_samples FORCE ROW LEVEL SECURITY';
    -- Drop any previously permissive policies before re-creating the deny rule
    EXECUTE 'DROP POLICY IF EXISTS "training_samples_deny_client" ON public.training_samples';
    EXECUTE $p$CREATE POLICY "training_samples_deny_client" ON public.training_samples
             FOR ALL TO anon, authenticated USING (false) WITH CHECK (false)$p$;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = 'public' AND table_name = 'training_labels') THEN
    EXECUTE 'ALTER TABLE public.training_labels ENABLE ROW LEVEL SECURITY';
    EXECUTE 'ALTER TABLE public.training_labels FORCE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "training_labels_deny_client" ON public.training_labels';
    EXECUTE $p$CREATE POLICY "training_labels_deny_client" ON public.training_labels
             FOR ALL TO anon, authenticated USING (false) WITH CHECK (false)$p$;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = 'public' AND table_name = 'snap_features') THEN
    EXECUTE 'ALTER TABLE public.snap_features ENABLE ROW LEVEL SECURITY';
    EXECUTE 'ALTER TABLE public.snap_features FORCE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "snap_features_deny_client" ON public.snap_features';
    EXECUTE $p$CREATE POLICY "snap_features_deny_client" ON public.snap_features
             FOR ALL TO anon, authenticated USING (false) WITH CHECK (false)$p$;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = 'public' AND table_name = 'pipeline_runs') THEN
    EXECUTE 'ALTER TABLE public.pipeline_runs ENABLE ROW LEVEL SECURITY';
    EXECUTE 'ALTER TABLE public.pipeline_runs FORCE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "pipeline_runs_deny_client" ON public.pipeline_runs';
    EXECUTE $p$CREATE POLICY "pipeline_runs_deny_client" ON public.pipeline_runs
             FOR ALL TO anon, authenticated USING (false) WITH CHECK (false)$p$;
  END IF;
END
$$;

-- FORCE ROW LEVEL SECURITY is the critical bit on pipeline tables. Without
-- FORCE, a table-owning role (common in Supabase when the schema was created
-- by a dashboard user) bypasses RLS even when it's "enabled". FORCE closes
-- that door so only service_role, which is documented to bypass RLS, can
-- touch these rows.

-- ---------------------------------------------------------------------------
-- 2. activity_logs: forbid direct INSERT (H-4)
--    All legitimate writes go through log_activity() SECURITY DEFINER RPC.
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "System can insert logs" ON public.activity_logs;
DROP POLICY IF EXISTS "activity_logs_no_direct_insert" ON public.activity_logs;

CREATE POLICY "activity_logs_no_direct_insert" ON public.activity_logs
  FOR INSERT TO anon, authenticated
  WITH CHECK (false);

-- Also forbid direct UPDATE/DELETE from non-service-role. Audit entries are
-- append-only via the RPC.
DROP POLICY IF EXISTS "activity_logs_no_direct_update" ON public.activity_logs;
CREATE POLICY "activity_logs_no_direct_update" ON public.activity_logs
  FOR UPDATE TO anon, authenticated USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "activity_logs_no_direct_delete" ON public.activity_logs;
CREATE POLICY "activity_logs_no_direct_delete" ON public.activity_logs
  FOR DELETE TO anon, authenticated USING (false);

-- ---------------------------------------------------------------------------
-- 3. promo_keys: explicit write denial (C-5 defence-in-depth)
--    Direct mutation must go through service_role. The admin-gen API route
--    is broken (no admin check) — that fix lives in the Next.js code, but
--    locking the table makes service_role the only write path.
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "promo_keys_no_direct_insert" ON public.promo_keys;
CREATE POLICY "promo_keys_no_direct_insert" ON public.promo_keys
  FOR INSERT TO anon, authenticated WITH CHECK (false);

DROP POLICY IF EXISTS "promo_keys_no_direct_update" ON public.promo_keys;
CREATE POLICY "promo_keys_no_direct_update" ON public.promo_keys
  FOR UPDATE TO anon, authenticated USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "promo_keys_no_direct_delete" ON public.promo_keys;
CREATE POLICY "promo_keys_no_direct_delete" ON public.promo_keys
  FOR DELETE TO anon, authenticated USING (false);

-- ---------------------------------------------------------------------------
-- 4. Belt-and-suspenders: ensure RLS is ON for every browser-facing table.
--    If an earlier hotfix disabled RLS anywhere, this turns it back on.
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'users',
    'projects',
    'organizations',
    'organization_members',
    'org_invites',
    'activity_logs',
    'estimate_shares',
    'proposals',
    'proposal_otps',
    'proposal_signatures',
    'promo_keys',
    'project_estimates'
  ]) LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables
               WHERE table_schema = 'public' AND table_name = t) THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    END IF;
  END LOOP;
END
$$;

-- ---------------------------------------------------------------------------
-- 5. Atomic promo-key credit consumption (Phase 5 H-1 race fix)
--    Replaces the non-transactional read-then-update pattern in
--    /api/promo-keys/consume/route.ts. Returns the new balance when a
--    credit was successfully deducted, or NULL if the user had none.
--    Only decrements when current balance > 0, in a single statement.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.consume_promo_credit(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_balance integer;
BEGIN
  UPDATE public.users
     SET promo_project_credits = promo_project_credits - 1
   WHERE id = p_user_id
     AND COALESCE(promo_project_credits, 0) > 0
   RETURNING promo_project_credits INTO v_new_balance;

  RETURN v_new_balance;  -- NULL iff no row was updated (balance was 0)
END;
$$;

REVOKE ALL ON FUNCTION public.consume_promo_credit(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consume_promo_credit(uuid) TO authenticated;

COMMENT ON FUNCTION public.consume_promo_credit IS
  'Atomically decrements a user''s promo_project_credits by 1. Returns the new balance, or NULL if the user had no credits. Use instead of read-then-update to prevent double-spend under concurrent requests.';

-- ---------------------------------------------------------------------------
-- 6. Nudge PostgREST to reload its schema cache so the new function is
--    reachable via supabase.rpc() without a ~60 s wait.
--    Safe no-op when pgrst isn't listening.
-- ---------------------------------------------------------------------------

NOTIFY pgrst, 'reload schema';

-- ============================================================================
-- End of 019_security_hardening.sql
-- ============================================================================
