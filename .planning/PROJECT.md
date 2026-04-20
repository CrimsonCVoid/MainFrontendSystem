# Project: WebsiteDesign-MMR (My Metal Roofer)

## Current Milestone
**M1 — roof_pipeline Integration + PDF Service Extraction**

Migrate the topology-aware labeling + snap engine from the `Mymetalrooferbackupmvp-firstcommit` backup MVP into this Next.js production app, and split the codebase along a trust boundary: public client UI vs server-only PDF/geometry service.

## Repos in Play
- **Target (this repo):** `/Users/carterbrady/WebsiteDesign-MMR/` — Next.js 14, React 18, Tailwind 3, Supabase SSR, Babylon.js viewer, Stripe, Resend. Production surface.
- **Source (read-only, copy-from):** `/Users/carterbrady/Mymetalrooferbackupmvp-firstcommit/` — Next.js 15 labeler + `roof_pipeline/` Python pipeline + FastAPI sidecar.

## Trust Boundary
| Layer | Examples | Lives Where |
|---|---|---|
| **Public client** | Labeling canvas, Konva drawing, snap-preview UI, hillshade renderer, Zod schemas, API client stubs, public pricing/estimator shell | Target `app/` + `components/` + `lib/` (client-only modules) |
| **Server-only** | PDF generation (cutsheets, shop drawings, proposals), panel_snap_v2 solver, plane fitting, mesh build, DSM loading, service-role Supabase queries, Stripe/Resend keys, business-sensitive pricing rules | FastAPI sidecar on existing DO droplet + Next.js route handlers with `runtime = 'nodejs'` |

## Non-Negotiable Constraints
- Python 3.11, no new pipeline-module deps beyond source `requirements.txt`.
- TypeScript strict, no `any`, Zod at every API boundary.
- Supabase schema additions require justification in INTEGRATION_PLAN.md.
- Reuse existing DigitalOcean droplet (`ALGORITHM_API_URL`). No new infra.
- `mesh.py`, `shop_drawings.py`, `cutsheets.py`, `ts_export.py`, `ts_render_pdf.py` keep working bit-for-bit on the gable smoke test.
- After Phase 5: zero `pdf-lib` / `jspdf` / `html2canvas` imports in the production browser bundle.
- No secrets in any file that ships to the browser. `NEXT_PUBLIC_*` audit before finalize.

## Decisions Locked In
- **PDF path:** Option A — Python FastAPI sidecar reusing source `roof_pipeline/api/`. Proposal layout ported to ReportLab.
- **Planning home:** This repo's `.planning/`.
- **Destructive ops:** Pre-approved per phase (approved list at phase start, autonomous within phase).
- **Framework direction:** Default backport source (React 19 → 18, Next 15 → 14, Tailwind 4 → 3). Phase 1 to flag any labeler feature that won't survive.

## Current Branch Context
- Branch: `Ky-Testing`
- Last commit: `69e85f1 Wire up Ky's reconstruction engine to backend API + Supabase caching`
- Dirty: `.claude/settings.json` modified; `.aidesigner/`, `.claude/agents/`, `.claude/commands/`, `app/api/roof-reconstruct/` untracked.
- **Caution:** `app/api/roof-reconstruct/` is Ky's fresh reconstruction work. Do not delete in Phase 2 without confirming with stakeholders — may supersede or coexist with the new labeler flow.
