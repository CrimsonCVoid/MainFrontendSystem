# Secrets that must be rotated after the 2026-04-21 security audit

See `Mymetalrooferbackupmvp-firstcommit/ROTATE_THESE.md` for the full
context. This file is a pointer — the rotations themselves are one
coordinated operation across both repos.

## What lives in this repo

- `.env.local` holds:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY` ← **surfaced in an agent transcript during recon — rotate**
  - `BACKEND_API_KEY` / `INTERNAL_API_KEY` ← **surfaced; rotate in lockstep with the FastAPI `.env`**
  - `RESEND_API_KEY` ← **surfaced; rotate via Resend dashboard**
  - `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` ← confirm HTTP-referrer restriction in Google Cloud Console

## New env vars required by this audit

Add to `.env.local` before merging the security branch:

```
PLATFORM_ADMIN_EMAILS=you@example.com,ops@example.com
```

Without it, `/api/admin/promo-keys/generate` returns 503 "Admin role not
configured" — that's the fail-closed behavior from the C-5 fix.

## Dead config to remove

Both of these are unreferenced in source (confirmed by grep during the
audit's Phase 2 triage):

```
DEV_BYPASS_AUTH=true
NEXT_PUBLIC_DEV_BYPASS_AUTH=true
```

Delete them to avoid accidental "let's turn it back on" in a later hotfix.
