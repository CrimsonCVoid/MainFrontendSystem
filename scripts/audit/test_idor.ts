/**
 * IDOR regression harness — creates two users in separate orgs and has
 * User B attempt to access User A's resources through every route that
 * takes an `orgId` / project id from query or body.
 *
 * NEVER run against production. Creates + deletes real users and orgs.
 *
 * Usage:
 *   SUPABASE_URL=... \
 *   SUPABASE_SERVICE_ROLE_KEY=... \
 *   SUPABASE_ANON_KEY=... \
 *   APP_BASE_URL=http://localhost:3000 \
 *   npx tsx scripts/audit/test_idor.ts
 *
 * APP_BASE_URL must point at a running Next.js dev or staging server —
 * we hit the HTTP endpoints rather than calling handlers directly, so
 * middleware + RLS are exercised end to end.
 *
 * Exit code 0 = all PASS. Any FAIL = exit 1.
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";

// ---------- config ----------

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON_KEY = process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const APP_BASE_URL = process.env.APP_BASE_URL ?? "http://localhost:3000";

if (!SUPABASE_URL || !SERVICE_KEY || !ANON_KEY) {
  console.error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / SUPABASE_ANON_KEY env.");
  process.exit(2);
}

if (/prod/i.test(SUPABASE_URL)) {
  console.error(`Refusing to run against a URL containing 'prod': ${SUPABASE_URL}`);
  process.exit(2);
}

const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

// ---------- test harness ----------

type IdorCheck = {
  name: string;
  /** Build a request object to fire while authenticated as User B. */
  build: (ctx: SeedCtx) => { method: "GET" | "POST" | "PATCH" | "DELETE"; path: string; body?: unknown };
  /** A Response is a PASS (IDOR blocked) when this returns true. */
  passed: (res: Response, body: unknown, ctx: SeedCtx) => boolean;
};

type SeedCtx = {
  userA: { id: string; accessToken: string; orgId: string };
  userB: { id: string; accessToken: string; orgId: string };
  projectAId: string;
};

const CHECKS: IdorCheck[] = [
  {
    name: "GET /api/projects?orgId=<A> returns 403 for B",
    build: ({ userA }) => ({ method: "GET", path: `/api/projects?orgId=${userA.orgId}` }),
    passed: (res) => res.status === 403,
  },
  {
    name: "GET /api/approvals?orgId=<A> returns 403 for B",
    build: ({ userA }) => ({ method: "GET", path: `/api/approvals?orgId=${userA.orgId}` }),
    passed: (res) => res.status === 403,
  },
  {
    name: "GET /api/audit?orgId=<A> returns 403 for B",
    build: ({ userA }) => ({ method: "GET", path: `/api/audit?orgId=${userA.orgId}` }),
    passed: (res) => res.status === 403,
  },
  {
    name: "POST /api/projects/<A-owned-id>/snapshot returns 403 for B",
    build: ({ projectAId }) => ({
      method: "POST",
      path: `/api/projects/${projectAId}/snapshot`,
    }),
    passed: (res) => res.status === 403,
  },
  {
    name: "POST /api/projects with orgId=<A> returns 403 for B",
    build: ({ userA }) => ({
      method: "POST",
      path: "/api/projects",
      body: { name: "idor-hijack", orgId: userA.orgId },
    }),
    passed: (res) => res.status === 403,
  },
  {
    name: "POST /api/admin/promo-keys/generate returns 403 for non-admin B",
    build: () => ({
      method: "POST",
      path: "/api/admin/promo-keys/generate",
      body: { count: 1 },
    }),
    // 503 is an acceptable result when PLATFORM_ADMIN_EMAILS is unset in
    // the test env — that's also fail-closed. Only a 2xx indicates a real
    // bypass.
    passed: (res) => res.status >= 400,
  },
];

// ---------- harness plumbing ----------

async function signUp(
  email: string,
  password: string,
): Promise<{ userId: string; accessToken: string }> {
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !data.user) throw new Error(`createUser failed: ${error?.message}`);
  const client = createClient(SUPABASE_URL!, ANON_KEY!, { auth: { persistSession: false } });
  const signIn = await client.auth.signInWithPassword({ email, password });
  if (signIn.error || !signIn.data.session) {
    throw new Error(`signIn failed: ${signIn.error?.message}`);
  }
  return { userId: data.user.id, accessToken: signIn.data.session.access_token };
}

async function createOrgForUser(userId: string, name: string): Promise<string> {
  const { data, error } = await (admin as any).rpc("create_organization", {
    p_user_id: userId,
    p_name: name,
    p_slug: `idor-${name.toLowerCase()}-${Date.now()}`,
    p_logo_url: null,
  });
  if (error) throw new Error(`create_organization failed: ${error.message}`);
  return data as string;
}

async function createProjectOwnedByA(userId: string, orgId: string): Promise<string> {
  const { data, error } = await admin
    .from("projects")
    .insert({
      name: "idor-test-project-A",
      user_id: userId,
      organization_id: orgId,
      latitude: 35.2271,
      longitude: -80.8431,
      address: "1 Test St",
      city: "Testville",
      state: "NC",
      postal_code: "28000",
    })
    .select("id")
    .single();
  if (error) throw new Error(`project seed failed: ${error.message}`);
  return (data as { id: string }).id;
}

async function fireRequest(
  accessToken: string,
  req: { method: string; path: string; body?: unknown },
) {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  };
  const res = await fetch(`${APP_BASE_URL}${req.path}`, {
    method: req.method,
    headers,
    body: req.body === undefined ? undefined : JSON.stringify(req.body),
  });
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  return { res, body };
}

async function main() {
  const stamp = Date.now();
  const passA = "IdorTestA!#2026";
  const passB = "IdorTestB!#2026";

  const a = await signUp(`idor-a-${stamp}@example.test`, passA);
  const b = await signUp(`idor-b-${stamp}@example.test`, passB);
  const orgA = await createOrgForUser(a.userId, "orgA");
  const orgB = await createOrgForUser(b.userId, "orgB");
  const projectAId = await createProjectOwnedByA(a.userId, orgA);

  const ctx: SeedCtx = {
    userA: { id: a.userId, accessToken: a.accessToken, orgId: orgA },
    userB: { id: b.userId, accessToken: b.accessToken, orgId: orgB },
    projectAId,
  };

  type Row = { pass: string; name: string; status: number };
  const rows: Row[] = [];
  let failures = 0;

  try {
    for (const check of CHECKS) {
      const req = check.build(ctx);
      const { res, body } = await fireRequest(ctx.userB.accessToken, req);
      const passed = check.passed(res, body, ctx);
      if (!passed) failures++;
      rows.push({
        pass: passed ? "PASS" : "FAIL",
        name: check.name,
        status: res.status,
      });
    }
  } finally {
    await admin.from("projects").delete().eq("id", projectAId).catch(() => {});
    await admin.from("organizations").delete().eq("id", orgA).catch(() => {});
    await admin.from("organizations").delete().eq("id", orgB).catch(() => {});
    await admin.auth.admin.deleteUser(a.userId).catch(() => {});
    await admin.auth.admin.deleteUser(b.userId).catch(() => {});
  }

  console.table(rows);
  if (failures > 0) {
    console.error(`\n${failures} IDOR check(s) FAILED.`);
    process.exit(1);
  }
  console.log(`\nAll ${rows.length} IDOR checks passed.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});
