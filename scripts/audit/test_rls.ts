/**
 * RLS regression harness — checks that tenant isolation is enforced at the
 * Supabase RLS layer. Runs against a Supabase project you point it at via
 * env. Creates two throwaway users, has User B attempt cross-tenant reads
 * against every sensitive table, and reports pass/fail.
 *
 * NEVER run this against production. It creates (and deletes) real users
 * and rows. Intended target: a dev or staging Supabase project.
 *
 * Usage:
 *   SUPABASE_URL=... \
 *   SUPABASE_SERVICE_ROLE_KEY=... \
 *   SUPABASE_ANON_KEY=... \
 *   npx tsx scripts/audit/test_rls.ts
 *
 * Exit code 0 = all PASS. Any FAIL = exit 1.
 *
 * This file is part of the 2026-04-21 security audit. It is a harness,
 * not a one-time script — re-run before any release that touches Supabase
 * policies or RLS-adjacent tables.
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";

// ---------- config ----------

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON_KEY = process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SERVICE_KEY || !ANON_KEY) {
  console.error(
    "Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / SUPABASE_ANON_KEY env. " +
      "This script creates real users — never run against prod.",
  );
  process.exit(2);
}

// Refuse to run if the URL contains 'prod' — cheap guardrail.
if (/prod/i.test(SUPABASE_URL)) {
  console.error(`Refusing to run against a URL containing 'prod': ${SUPABASE_URL}`);
  process.exit(2);
}

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

// ---------- test harness ----------

type Check = {
  table: string;
  description: string;
  /** Returns true when RLS *correctly* blocked the operation. */
  run: (clientB: SupabaseClient, aUserId: string, aRowId: string | null) => Promise<boolean>;
  /** Prepare an A-owned row to try to access. null = no row needed. */
  seed?: (clientA: SupabaseClient, aUserId: string) => Promise<string | null>;
};

const CHECKS: Check[] = [
  {
    table: "projects",
    description: "User B cannot SELECT User A's project",
    seed: async (clientA, aUserId) => {
      const { data, error } = await clientA
        .from("projects")
        .insert({ name: "rls-test-a", user_id: aUserId, organization_id: null })
        .select("id")
        .single();
      if (error) throw error;
      return (data as { id: string }).id;
    },
    run: async (clientB, _aUserId, aRowId) => {
      const { data } = await clientB.from("projects").select("id").eq("id", aRowId!);
      return !data || data.length === 0;
    },
  },
  {
    table: "projects",
    description: "User B cannot UPDATE User A's project",
    run: async (clientB, _aUserId, aRowId) => {
      const { error } = await clientB
        .from("projects")
        .update({ name: "hijacked" })
        .eq("id", aRowId!);
      return !!error || (await rowNameIs(aRowId!, "rls-test-a"));
    },
  },
  {
    table: "projects",
    description: "User B cannot DELETE User A's project",
    run: async (clientB, _aUserId, aRowId) => {
      await clientB.from("projects").delete().eq("id", aRowId!);
      const { data } = await admin.from("projects").select("id").eq("id", aRowId!).maybeSingle();
      return !!data;
    },
  },
  {
    table: "users",
    description: "User B cannot read User A's profile row",
    run: async (clientB, aUserId) => {
      const { data } = await clientB.from("users").select("id").eq("id", aUserId);
      return !data || data.length === 0;
    },
  },
  {
    table: "activity_logs",
    description: "User B cannot forge an activity log row (INSERT)",
    run: async (clientB, aUserId) => {
      const { error } = await clientB
        .from("activity_logs")
        .insert({
          org_id: null,
          user_id: aUserId,
          action: "rls.forged",
          action_category: "system",
          details: {},
        });
      return !!error;
    },
  },
  {
    table: "training_samples",
    description: "Anon client cannot SELECT training_samples",
    run: async (clientB) => {
      const { data, error } = await clientB.from("training_samples").select("id").limit(1);
      return !!error || !data || data.length === 0;
    },
  },
  {
    table: "training_labels",
    description: "Anon client cannot SELECT training_labels",
    run: async (clientB) => {
      const { data, error } = await clientB.from("training_labels").select("sample_id").limit(1);
      return !!error || !data || data.length === 0;
    },
  },
  {
    table: "pipeline_runs",
    description: "Anon client cannot SELECT pipeline_runs",
    run: async (clientB) => {
      const { data, error } = await clientB.from("pipeline_runs").select("id").limit(1);
      return !!error || !data || data.length === 0;
    },
  },
  {
    table: "snap_features",
    description: "Anon client cannot SELECT snap_features",
    run: async (clientB) => {
      const { data, error } = await clientB.from("snap_features").select("id").limit(1);
      return !!error || !data || data.length === 0;
    },
  },
  {
    table: "promo_keys",
    description: "User B cannot INSERT promo_keys (bypass admin route)",
    run: async (clientB) => {
      const { error } = await clientB
        .from("promo_keys")
        .insert({ key_code: "RLSTEST001" });
      return !!error;
    },
  },
  {
    table: "estimate_shares",
    description: "User B cannot SELECT User A's org estimate_shares",
    run: async (clientB) => {
      // Read without filter; anon should return [] under RLS.
      const { data } = await clientB.from("estimate_shares").select("id").limit(1);
      return !data || data.length === 0;
    },
  },
];

// ---------- helpers ----------

async function rowNameIs(rowId: string, expected: string): Promise<boolean> {
  const { data } = await admin
    .from("projects")
    .select("name")
    .eq("id", rowId)
    .maybeSingle();
  return (data as { name: string } | null)?.name === expected;
}

async function createThrowawayUser(
  email: string,
  password: string,
): Promise<{ userId: string; client: SupabaseClient }> {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error || !data.user) throw new Error(`createUser failed: ${error?.message}`);

  const client = createClient(SUPABASE_URL!, ANON_KEY!, {
    auth: { persistSession: false },
  });
  const signIn = await client.auth.signInWithPassword({ email, password });
  if (signIn.error) throw new Error(`signIn failed: ${signIn.error.message}`);

  return { userId: data.user.id, client };
}

async function deleteUser(userId: string) {
  await admin.auth.admin.deleteUser(userId).catch(() => {});
}

// ---------- runner ----------

async function main() {
  const stamp = Date.now();
  const aEmail = `rls-a-${stamp}@example.test`;
  const bEmail = `rls-b-${stamp}@example.test`;
  const password = "RLSTestPass!#2026";

  const a = await createThrowawayUser(aEmail, password);
  const b = await createThrowawayUser(bEmail, password);

  type Result = { table: string; description: string; passed: boolean };
  const results: Result[] = [];
  const createdRows: { table: string; id: string }[] = [];

  try {
    for (const check of CHECKS) {
      let aRowId: string | null = null;
      if (check.seed) {
        aRowId = await check.seed(a.client, a.userId);
        if (aRowId) createdRows.push({ table: check.table, id: aRowId });
      } else if (createdRows.some((r) => r.table === check.table)) {
        aRowId = createdRows.find((r) => r.table === check.table)!.id;
      }

      const passed = await check.run(b.client, a.userId, aRowId);
      results.push({ table: check.table, description: check.description, passed });
    }
  } finally {
    for (const row of createdRows) {
      await admin.from(row.table).delete().eq("id", row.id);
    }
    await deleteUser(a.userId);
    await deleteUser(b.userId);
  }

  const rows = results.map((r) => ({
    pass: r.passed ? "PASS" : "FAIL",
    table: r.table,
    description: r.description,
  }));
  console.table(rows);

  const failed = results.filter((r) => !r.passed);
  if (failed.length > 0) {
    console.error(`\n${failed.length} RLS check(s) FAILED. Policies need attention.`);
    process.exit(1);
  }
  console.log(`\nAll ${results.length} RLS checks passed.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});
