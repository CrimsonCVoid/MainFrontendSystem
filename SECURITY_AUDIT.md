# Security Audit — 2026-04-21

Scope: Next.js + Supabase dashboard (this repo), the Python + FastAPI
sidecar at `/Users/carterbrady/Mymetalrooferbackupmvp-firstcommit`, and
a secondary Next.js labeling UI at
`/Users/carterbrady/Mymetalrooferbackupmvp-firstcommit/frontend`
(informational — no audit-target routes).

All fixes land on `security-audit-2026-04-21` branches in both repos.

## Executive summary

| Severity | Count | Fixed | Deferred / Residual |
|---|---|---|---|
| Critical | 7  | 7 | 0 |
| High     | 4  | 3 | 1 (snapshot idempotency) |
| Medium   | 5+ | 0 | tracked below |
| Low      | 1  | 0 | dead env var removal (see ROTATE_THESE.md) |

Seven Critical findings were fixed. One High remains as documented
residual risk (duplicate snapshot POSTs can both spend a Google Solar
API call before the "cached" short-circuit kicks in — compute/$ DoS, not
data access). Medium/Low items are left for a follow-up pass per the
scope of this engagement.

## Findings

### C-1 — IDOR on `/api/projects`  (Critical)

- **Exploit**: `GET /api/projects?orgId=<any-uuid>` returned that org's
  projects with no membership check. `POST /api/projects` blindly wrote
  the caller-supplied `orgId` into a new row.
- **Affected**: `app/api/projects/route.ts`
- **Fix**: route both branches through `getOrgContext(supabase, orgId)`
  (existing helper); return 403 when membership can't be proven.
- **Commit**: `c8d00a2`

### C-2 — IDOR on `/api/approvals`  (Critical)

- **Exploit**: `GET /api/approvals?orgId=<victim-org>` enumerated that
  org's pending estimate shares (project names + addresses + status).
- **Affected**: `app/api/approvals/route.ts`
- **Fix**: same `getOrgContext` gate; also bounded `limit` to [1, 200]
  so `?limit=9999999` can't trigger a table scan.
- **Commit**: `903eb7b`

### C-3 — IDOR on `/api/audit`  (Critical)

- **Exploit**: `GET /api/audit?orgId=<victim-org>` returned the full
  audit trail for that org plus every member's email and full name. RLS
  on `activity_logs` masked the IDOR on the logs themselves (returned
  `[]` silently for non-admins) but the `organization_members` member
  query leaked regardless.
- **Affected**: `app/api/audit/route.ts`
- **Fix**: require `getOrgContext` membership AND `isOrgAdmin`. Clamp
  `limit` to [1, 500]. Validate `startDate` against ISO-8601 before
  passing it to `.gte()`.
- **Commit**: `bda7ff0`

### C-4 — Defence-in-depth: service_role writes in snapshot  (High, was Critical)

- **Exploit**: `POST /api/projects/[id]/snapshot` depended entirely on
  RLS on `projects` returning null to non-members; one regression in
  that policy (or a future swap to the service_role client for the
  SELECT) would open it back up silently.
- **Affected**: `app/api/projects/[id]/snapshot/route.ts`
- **Fix**: pull `organization_id` + `user_id` from the project row and
  explicitly verify the caller either owns the project or is an org
  member before we touch the service_role client. Downgraded from
  Critical to High because the RLS-based 404 did work in the base case.
- **Commit**: `8f3688d`

### C-5 — Admin gate missing: `/api/admin/promo-keys/generate`  (Critical)

- **Exploit**: The route carried an explicit `TODO: add proper admin
  role check` with a comment "for now, any authenticated user can
  generate keys". Paired with a service_role INSERT this was a direct
  business-logic hole: any logged-in user could mint unlimited promo
  keys, each worth a free project.
- **Affected**: `app/api/admin/promo-keys/generate/route.ts`
- **Fix**: allowlist via `PLATFORM_ADMIN_EMAILS` env var (comma list).
  Route fails closed with 503 "Admin role not configured" when unset.
  Defence-in-depth: migration 019 also blocks direct `INSERT` on
  `promo_keys` from anon/authenticated roles.
- **Commit**: `1d1896c`
- **Operator action**: populate `PLATFORM_ADMIN_EMAILS` — see ROTATE_THESE.md.

### C-6 — FastAPI sidecar has no auth on 18/20 routes  (Critical)

- **Exploit**: the Burp log showed the browser hitting
  `:8000/api/labels/{project_id}` and `/api/hillshade/{project_id}` with
  no `Authorization` header, succeeding. Every route used a service_role
  Supabase client, so Row-Level Security was bypassed. Any caller on
  the network could read or overwrite any sample's labels, download its
  DSM/RGB imagery, trigger pipeline runs, or export cutsheet data.
- **Affected**: `roof_pipeline/api/*.py` (labels, hillshade, pipeline,
  snap, solar). Only `pdf_router.*` was protected.
- **Fix**: new `require_principal` dependency accepts either an
  `X-Internal-API-Key` matching `settings.internal_api_key` OR a
  Supabase HS256 JWT (`audience="authenticated"`) verified against a
  new `settings.supabase_jwt_secret`. `verify_sample_access(principal,
  sample_id, supabase)` then enforces ownership via `projects.id =
  sample_id` → `user_id` or org membership. Every previously-unauth
  route now carries both deps.
- **Commit**: `e47ef76` (in sibling repo `Mymetalrooferbackupmvp-firstcommit`)
- **Operator action**: populate `SUPABASE_JWT_SECRET` — see ROTATE_THESE.md.

### C-7 — Pipeline tables have unknown RLS state  (Critical)

- **Exploit**: `training_samples`, `training_labels`, `snap_features`,
  `pipeline_runs` have no `CREATE TABLE` anywhere in either repo —
  they exist only in Supabase, created by hand or by a missing
  migration. If RLS was off on any of them, the browser (with the
  anon key) could `.from("training_samples").select("*")` directly
  via `/rest/v1/`.
- **Fix**: migration `019_security_hardening.sql` uses `DO` blocks to
  `ENABLE` + `FORCE` RLS and add default-deny policies for anon and
  authenticated on any of those four tables that exist. Service_role
  still bypasses RLS, so the FastAPI sidecar and Next.js snapshot
  route keep working; only browser-direct reads are now blocked.
- **Commit**: `af7fecc`

### H-1 — TOCTOU double-spend on `/api/promo-keys/consume`  (High)

- **Exploit**: the route read `promo_project_credits`, decided whether
  to allow, then did a separate UPDATE. Under concurrent POSTs, two
  requests could both observe balance=N and both write N-1, landing
  the user with two project unlocks for one credit.
- **Affected**: `app/api/promo-keys/consume/route.ts`
- **Fix**: delegate to the new `consume_promo_credit(uuid)` SECURITY
  DEFINER RPC from migration 019. The RPC does a single
  `UPDATE users SET credits = credits - 1 WHERE id = $1 AND credits > 0
  RETURNING credits` — Postgres serializes the row lock.
- **Commit**: `7accae8`

### H-2 — FastAPI exception handlers leaked `str(exc)`  (High)

- **Exploit**: the global exception handlers in `roof_pipeline/api/main.py`
  echoed the raw exception message into the response body. Supabase
  errors would leak internal schema/table names; generic errors could
  leak file paths or connection fragments.
- **Fix**: client now gets a generic string ("Invalid input" / "Internal
  error") plus the `trace_id` for correlation; the full message is
  logged server-side at exception level.
- **Commit**: `e47ef76` (bundled with C-6)

### H-3 — CORS wildcards on the sidecar  (High)

- **Exploit**: `allow_methods=["*"]`, `allow_headers=["*"]`,
  `allow_credentials=True` on the FastAPI app. Not itself exploitable
  without another vuln, but amplifies anything that gets past.
- **Fix**: explicit allowlist — `GET`/`POST`/`OPTIONS` and only the
  headers actually used (`Authorization`, `Content-Type`,
  `X-Internal-API-Key`, `X-Requested-With`). `expose_headers=["X-Trace-ID"]`.
- **Commit**: `e47ef76` (bundled with C-6)

### H-4 — `activity_logs` audit-log forgery  (High)

- **Exploit**: the INSERT policy was `WITH CHECK (true)`, letting any
  authenticated user insert an `activity_logs` row with any `user_id`
  / `org_id` / action — log injection useful for hiding traces.
- **Fix**: migration 019 replaces the policy with deny-all for anon and
  authenticated. Legitimate inserts already go through `log_activity()`
  SECURITY DEFINER RPC, which bypasses RLS — no app-level change needed.
- **Commit**: `af7fecc`

## Residual risk (not fixed in this pass)

- **Snapshot idempotency (H, deferred)**. Two concurrent
  `POST /api/projects/[id]/snapshot` calls can both pass the membership
  gate and both spend a Google Solar API call before either writes the
  "cached" row. Not a data-access issue but a $ / compute DoS. Fix
  options: advisory lock keyed on projectId, or a stub "in-progress"
  row with a uniqueness constraint. Tracked in commit `8f3688d`'s body.

- **`/api/user/tutorial` POST accepts arbitrary body JSON** (Medium).
  Not yet validated with zod. Follow-up.

- **`/api/proposals` POST relies on `proposals` RLS** (Medium). RLS
  exists (migration 018) but the API layer doesn't explicitly check
  org membership before the insert. Defence-in-depth gap.

- **No rate limiting on auth-adjacent endpoints** (Medium).
  `/api/promo-keys/consume`, `/api/admin/promo-keys/generate`, and
  signup flows could benefit from per-IP rate limits (Upstash /
  Vercel / Next.js middleware).

- **Phase 6 client-bundle scan** (`npm run build` + grep `.next/static/`)
  not performed in this engagement's runtime. Should be run in CI
  before the first deploy post-audit to confirm `SUPABASE_SERVICE_ROLE_KEY`
  never landed in a client chunk (grep across `lib/` suggests it didn't —
  all service-role usages are under `app/api/**` — but build-time
  verification is the authoritative check).

- **Google Maps API key referrer restriction** — verify in GCP console
  (not programmatically testable). See ROTATE_THESE.md.

- **`DEV_BYPASS_AUTH` / `NEXT_PUBLIC_DEV_BYPASS_AUTH`** env vars in
  `.env.local` have zero code references — dead config. Remove before
  someone wires them up to a real bypass. See ROTATE_THESE.md.

## Regression suite

Three harnesses live in `scripts/audit/` and are chained by `npm run audit`:

- `test_rls.ts` — creates two throwaway users against a non-prod
  Supabase; asserts cross-tenant reads/writes fail at the RLS layer.
- `test_idor.ts` — fires HTTP requests against `APP_BASE_URL` as User B
  targeting User A's resources; asserts every IDOR-target endpoint
  returns 403.
- `test_race.ts` — seeds 5 promo credits, fires 20 concurrent
  `/api/promo-keys/consume` POSTs, asserts no double-spend.

All three refuse to run against a URL containing `prod` and must be
pointed at staging/dev. They were **not executed** in this pass — the
engagement was scoped to static code-level fixes — but they're wired to
be re-run before any change that touches RLS, IDOR-shaped routes, or
the credit-consumption path.

## Operator checklist before merge

See `ROTATE_THESE.md` (this repo) and the sibling `ROTATE_THESE.md` in
`Mymetalrooferbackupmvp-firstcommit`.

## Commit index (this repo's branch `security-audit-2026-04-21`)

```
af7fecc  fix(security): [CRITICAL] lock down pipeline-table RLS + forbid audit-log forgery (C-7, H-4)
c8d00a2  fix(security): [CRITICAL] block cross-org project access in /api/projects (C-1)
903eb7b  fix(security): [CRITICAL] block cross-org approval enumeration in /api/approvals (C-2)
bda7ff0  fix(security): [CRITICAL] require admin role for /api/audit + validate inputs (C-3)
1d1896c  fix(security): [CRITICAL] gate /api/admin/promo-keys/generate behind env-based admin list (C-5)
7accae8  fix(security): [HIGH] atomic promo credit decrement to kill double-spend race (H-1)
8f3688d  fix(security): [HIGH] explicit tenant check before service_role writes in snapshot (C-4)
```

Backend branch (`Mymetalrooferbackupmvp-firstcommit/security-audit-2026-04-21`):

```
e47ef76  fix(security): [CRITICAL] add auth + tenant enforcement to FastAPI sidecar (C-6, H-2, H-3)
```
