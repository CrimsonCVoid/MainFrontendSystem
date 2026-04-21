/**
 * Race-condition regression harness — fires 20 concurrent POSTs to
 * /api/promo-keys/consume as the same user and asserts credits only
 * decrement by the actual number of successful responses (i.e. no
 * double-spend).
 *
 * Depends on the Phase 5 fix: /api/promo-keys/consume now delegates to
 * the `consume_promo_credit(uuid)` SECURITY DEFINER RPC added in
 * migrations/019_security_hardening.sql. That RPC does a single
 * UPDATE ... WHERE credits > 0 RETURNING, which Postgres serializes.
 *
 * NEVER run against production — this writes to users.promo_project_credits.
 *
 * Usage:
 *   SUPABASE_URL=... \
 *   SUPABASE_SERVICE_ROLE_KEY=... \
 *   SUPABASE_ANON_KEY=... \
 *   APP_BASE_URL=http://localhost:3000 \
 *   npx tsx scripts/audit/test_race.ts
 */

import { createClient } from "@supabase/supabase-js";

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

const INITIAL_CREDITS = 5;
const CONCURRENT_REQUESTS = 20;

async function main() {
  const stamp = Date.now();
  const email = `race-${stamp}@example.test`;
  const password = "RaceTest!#2026";

  // Seed a user with INITIAL_CREDITS credits
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (createErr || !created.user) throw new Error(`createUser failed: ${createErr?.message}`);
  const userId = created.user.id;

  // Seed the credits row
  await (admin.from("users") as any)
    .update({ promo_project_credits: INITIAL_CREDITS })
    .eq("id", userId);

  // Sign in as that user to get an access token
  const userClient = createClient(SUPABASE_URL!, ANON_KEY!, { auth: { persistSession: false } });
  const { data: signIn, error: signInErr } = await userClient.auth.signInWithPassword({
    email,
    password,
  });
  if (signInErr || !signIn.session) throw new Error(`signIn failed: ${signInErr?.message}`);
  const accessToken = signIn.session.access_token;

  // Fire CONCURRENT_REQUESTS calls in parallel
  const promises = Array.from({ length: CONCURRENT_REQUESTS }, () =>
    fetch(`${APP_BASE_URL}/api/promo-keys/consume`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    }).then((r) => r.json().then((body) => ({ ok: r.ok, status: r.status, body }))),
  );
  const results = await Promise.all(promises);

  // Read the final balance via the admin client
  const { data: after } = await (admin
    .from("users") as any)
    .select("promo_project_credits")
    .eq("id", userId)
    .single();
  const finalCredits: number = (after as any)?.promo_project_credits ?? -1;

  const successes = results.filter((r) => r.ok && r.body?.success === true).length;
  const expectedFinal = Math.max(0, INITIAL_CREDITS - successes);
  const passed = finalCredits === expectedFinal && successes === Math.min(CONCURRENT_REQUESTS, INITIAL_CREDITS);

  console.log({
    initialCredits: INITIAL_CREDITS,
    requestsFired: CONCURRENT_REQUESTS,
    successfulResponses: successes,
    finalCredits,
    expectedFinal,
    verdict: passed ? "PASS" : "FAIL",
  });

  // Cleanup
  await admin.auth.admin.deleteUser(userId).catch(() => {});

  if (!passed) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});
