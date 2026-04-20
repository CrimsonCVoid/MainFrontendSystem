# Roadmap — M1: roof_pipeline Integration + PDF Service Extraction

## Phase 1 — Inventory & Removal Plan
**Status:** IN PROGRESS
**Artifact:** `INTEGRATION_PLAN.md` at repo root.
**Deliverable:** Full inventory (target files classified keep/delete/rewrite; source files mapped copy/port with destinations), dependency delta, React 18 backport feasibility, import graph of deleted-PDF-code callsites.
**Gate:** User approval of plan before any code changes.

## Phase 2 — Remove Old System
**Status:** BLOCKED on Phase 1 approval
**Scope:**
- Delete target `lib/pdf-export.ts`, `lib/pdf-generator.ts`, and components whose sole purpose is client-side PDF.
- Keep UI shells that trigger PDFs (they'll rewire in Phase 5).
- Audit `app/api/roof-generate/`, `app/api/roof-reconstruct/`, `app/api/test-generate/` for deletion candidacy. `roof-reconstruct/` is Ky's active work — flag, don't delete without approval.
- Preserve orgs/projects/auth/stripe/billing/tasks surface completely.
- Atomic commit per deletion.

## Phase 3 — Port Labeling Frontend
**Status:** BLOCKED on Phase 2
**Scope:**
- Copy source `src/app/labeling/`, `src/components/labeling/`, `src/components/canvas/`, `src/stores/labeler-store.ts`, `src/lib/schemas.ts`, `src/lib/api.ts`, `src/lib/errors.ts` into target `app/(protected)/projects/[id]/label/` + target `components/` + target `lib/`.
- Backport React 19 → 18, Next 15 → 14, Tailwind 4 → 3.
- Swap `@base-ui/react` → existing Radix; swap `sonner` if target toast differs.
- Unify on target's `@supabase/ssr`. Drop source's standalone Supabase client.
- TypeScript strict, no `any`, Zod at every boundary.

## Phase 4 — FastAPI PDF Sidecar (Option A)
**Status:** BLOCKED on Phase 3
**Scope:**
- Extend source `roof_pipeline/api/` with new router `pdf.py`:
  - `POST /api/pdf/cutsheets` → `write_cutsheets_pdf` → signed Supabase Storage URL
  - `POST /api/pdf/shop-drawings` → `shop_drawings` → signed URL
  - `POST /api/pdf/proposal` → ReportLab port of target `lib/pdf-generator.ts`
- Auth: Supabase JWT forwarded from Next.js, verified with service role. Per-org rate limit.
- Deploy to existing DO droplet (`ALGORITHM_API_URL`). No new infra.
- Thin Next.js proxy routes at `app/api/pdf/*/route.ts` with Zod validation + ownership check, mirroring `app/api/roof-reconstruct/route.ts`.

## Phase 5 — Rewire & Verify
**Status:** BLOCKED on Phase 4
**Scope:**
- Rewire `components/project/ProposalBuilder.tsx`, `components/project/EstimationTab.tsx`, `app/(protected)/projects/[id]/project-page-client.tsx`, and any other Phase-1-identified callsites to use `/api/pdf/*`.
- Progress UI for async jobs > 5s.
- Remove `pdf-lib`, `jspdf`, `html2canvas` from `package.json`.
- `next build` clean, zero type errors, zero `any`, verify no PDF libs in browser bundle via bundle analyzer.
- Round-trip coordinate tests if `ts_export.py` / `ts_render_pdf.py` touched.
- E2E: label a gable in the target, snap, export cutsheets PDF, diff vs source reference PDF.

## Exit Criteria for M1
- Labeler live at `app/(protected)/projects/[id]/label/`, auth-gated, project-scoped.
- All three PDF types (cutsheets, shop drawings, proposal) generated server-side via sidecar.
- Zero client-side PDF libs in production bundle.
- `next build` clean. TypeScript strict passes.
- Gable smoke test passes bit-for-bit vs source reference output.
- No regressions in orgs / projects / auth / stripe / billing / tasks / client portal.
