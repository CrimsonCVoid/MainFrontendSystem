# INTEGRATION_PLAN.md — M1: roof_pipeline Labeler + PDF Service Extraction

**Target:** `/Users/carterbrady/WebsiteDesign-MMR/` (Next.js 14 / React 18 / Tailwind 3 / Supabase SSR)
**Source:** `/Users/carterbrady/Mymetalrooferbackupmvp-firstcommit/` (Next.js 15 / React 19 / Tailwind 4 + `roof_pipeline/` Python)
**Branch:** `Ky-Testing` (dirty: `.claude/settings.json` modified; `.aidesigner/`, `.claude/agents/`, `.claude/commands/`, `app/api/roof-reconstruct/` untracked)
**Decisions locked:** Planning at target `.planning/` · Option A (FastAPI sidecar) · destructive ops pre-approved per phase.

---

## DECISIONS THAT NEED YOUR ANSWER BEFORE PHASE 2

These are blockers. I will not run any code deletion until these resolve.

### D1. Ky's `roof-reconstruct` engine vs. new Konva labeler — coexist or supersede?
- `app/api/roof-reconstruct/route.ts` (commit `69e85f1`) proxies to `ALGORITHM_API_URL`, returns `sketch_json`, caches in `projects.sketch_json`.
- `components/dashboard/RoofViewer3D.tsx:243` consumes `sketch_json` to reconstruct panels in Babylon.
- The new labeler outputs polygon vertex lists — a different data shape than Ky's `sketch_json`.
- **Question:** Does the labeler REPLACE Ky's reconstruction (labeler becomes the canonical source of `sketch_json`), or is it a LABELING LAYER on top of already-reconstructed roofs (labeler edits what `roof-reconstruct` produced)?
- **Until answered:** I treat `app/api/roof-reconstruct/` as KEEP and `app/api/roof-generate/` as KEEP.

### D2. `RoofViewer3D` + Babylon vs. Konva labeler — which is primary?
- Target has a 3D Babylon roof viewer at `components/dashboard/RoofViewer3D.tsx` (used in landing + project pages).
- Source labeler is 2D Konva-over-hillshade.
- They're not interchangeable — 2D labeling → 3D viewing is the natural pipeline.
- **Assumption (flag if wrong):** Labeler lives at `app/(protected)/projects/[id]/label/` as a pre-step. Labeler writes panel polygons → `roof-reconstruct` (or its successor) converts to 3D `sketch_json` → `RoofViewer3D` renders. No changes to `RoofViewer3D` in this milestone.

### D3. Labeler data schema vs. existing `projects.sketch_json`
- Source labeler persists via its own `POST /api/labels/{sampleId}` sidecar endpoint, which today writes to local disk or a sample store — not Supabase.
- Target expects labeler output to land in a Supabase `projects` row or a new `labels` table.
- **Question:** New `labels` table, or extend `projects` with a `labeler_polygons` JSONB column? Migration will be needed either way — flag whether you want schema work in-scope for Phase 3 or deferred.

### D4. `sample_id` vs. `project_id` in the labeler route
- Source route is `/labeling/[sampleId]` — a standalone sample concept.
- Target flow is project-centric (`/projects/[id]`).
- **Plan:** Mount labeler at `app/(protected)/projects/[id]/label/page.tsx`. Inside the component, map `project.id` → the labeler's `sampleId` parameter (rename in the port, or pass through under the target URL). Confirm the rename is OK.

---

## Section 1 — Target File Classification

### Legend
- **KEEP** — untouched by this milestone.
- **DELETE-P2** — deleted in Phase 2 (client-side PDF or clearly dead code).
- **REWIRE-P5** — kept but PDF callsite swapped to `/api/pdf/*` in Phase 5.
- **FLAG** — needs decision in D1–D4 above.

### 1.1 PDF-client code (the reason for the milestone)
| File | Action | Reason |
|---|---|---|
| `lib/pdf-generator.ts` | **DELETE-P2** | `jsPDF` client-side generator; layout port to ReportLab in Phase 4. |
| `lib/pdf-export.ts` | **DELETE-P2** | `pdf-lib` client-side roof-plan exporter; port to ReportLab in Phase 4. |
| `lib/capture-3d.ts` | **KEEP** | Browser canvas screenshot. Only called by commented-out code in `EstimationTab.tsx:302`. Keep file; leave uses commented unless Phase 5 decides to send 3D screenshot to sidecar (see D-P5 below). |

### 1.2 PDF callsites (Phase 5 rewire surface)
| File | Action | Reason |
|---|---|---|
| `components/project/EstimationTab.tsx` | **REWIRE-P5** | Imports `generateAndDownloadProposal` from `lib/pdf-generator`; primary handler at lines 297–346. Swap to `POST /api/pdf/proposal`, show progress, trigger download from signed URL. |
| `components/project/ProposalBuilder.tsx` | **REWIRE-P5** | Imports `jsPDF` at line 28; rendered at `project-page-client.tsx:1138`. **NOT dead** — the earlier inventory marked it DELETE, corrected here. Strip `jsPDF` import; wire PDF button to `POST /api/pdf/proposal`. |
| `app/(protected)/projects/[id]/project-page-client.tsx` | **REWIRE-P5** | `import { generateAndDownloadProposal } from "@/lib/pdf-generator"` at line 51. Remove import once callsites swap; replace with a helper that POSTs to `/api/pdf/proposal` and handles the signed URL. |

### 1.3 Roof API routes
| File | Action | Reason |
|---|---|---|
| `app/api/roof-generate/route.ts` | **FLAG (D1)** | Ky's work; proxies to algorithm droplet. Keep until D1 decided. |
| `app/api/roof-reconstruct/route.ts` | **FLAG (D1)** | Ky's fresh work (commit `69e85f1`), caches `sketch_json`. Keep until D1 decided. |
| `app/api/test-generate/route.ts` | **DELETE-P2** | Dev endpoint, no production consumers. Safe to remove. |

### 1.4 PDF-related target surface (all other files)
The following areas are **KEEP** in full and should not be touched by any phase of this milestone:
- `app/(auth)/**`, `app/(protected)/dashboard/**`, `app/(protected)/settings/**`, `app/(protected)/org/**`, `app/(protected)/admin/**`, `app/(protected)/audit/**`
- `app/api/orgs/**`, `app/api/promo-keys/**`, `app/api/admin/**`, `app/api/stripe/**`, `app/api/profile`, `app/api/clients`, `app/api/crew`, `app/api/tasks`, `app/api/schedule`, `app/api/audit`, `app/api/warranties`, `app/api/tickets`, `app/api/upload-logo`, `app/api/geocode`, `app/api/invites/**`, `app/api/approvals`, `app/api/email/**`, `app/api/user/**`, `app/api/projects`
- `middleware.ts`, `app/layout.tsx`, `app/page.tsx`, `app/login/**`, `app/onboarding/**`, `app/subscription/**`, `app/invite/**`, `app/estimate/**`
- All of `lib/` except the two files called out in §1.1 — in particular `lib/supabase-server.ts`, `lib/supabaseClient.ts`, `lib/org-auth.ts`, `lib/backend.ts`, `lib/editor.ts`, `lib/drawings.ts`, `lib/drawings-babylon.ts`, `lib/positioning.ts`, `lib/panel-config.ts`, `lib/panel-profiles.ts`, `lib/pricing.ts`, `lib/project-*.ts`, `lib/tasks-crm.ts`, `lib/tutorial.ts`, `lib/warranties.ts`, `lib/invoicing.ts`, `lib/email.ts`, `lib/bom-calculator.ts`, `lib/formatting.ts`, `lib/utils.ts`, `lib/estimate-*.ts`, `lib/csv-export.ts`, `lib/color-schemes.ts`, `lib/clients.ts`, `lib/activity-log.ts`, `lib/database.types.ts`, `lib/auth.ts`, `lib/sf-pool.ts`, `lib/promo-*.ts`, `lib/mock-data.ts`, `lib/org*.ts`, `lib/preview-url.ts`, `lib/earcut.js`
- All of `components/` except the two in §1.2 and the collision list in §1.5.
- All of `hooks/`, `migrations/`, `schema.sql`, `public/`.

### 1.5 Components that adjoin the labeler (no action unless D1–D3 shift)
These stay untouched under the current assumption but must be audited when the labeler lands:
- `components/viewer-3d.tsx`
- `components/dashboard/RoofViewer3D.tsx` — consumes `sketch_json`; labeler output format must not break it (D3).
- `lib/drawings.ts`, `lib/drawings-babylon.ts`, `lib/editor.ts` — 3D pipeline the labeler feeds into.

---

## Section 2 — Source → Target Port Map

### 2.1 Labeler pages
| Source | Target | Changes |
|---|---|---|
| `frontend/src/app/labeling/[sampleId]/page.tsx` | `app/(protected)/projects/[id]/label/page.tsx` | (a) Rename `sampleId` → `projectId` in params and threading. (b) **Remove React 19 `use(params)`** — Next 14 params are a sync object; just destructure directly. (c) Swap `sonner` `toast.error/success` → target's `useToast()` from `hooks/use-toast.ts` (variant `destructive` for errors). (d) Ownership / org check via `createSupabaseServerClient()` in a server component wrapper around the client page. (e) `import { use } from "react"` → delete line. |

### 2.2 Labeler components
| Source | Target | Changes |
|---|---|---|
| `frontend/src/components/labeling/LabelingHeader.tsx` | `components/labeling/LabelingHeader.tsx` | Verify target `Button` export. `useRouter` from `next/navigation` works in Next 14. |
| `frontend/src/components/labeling/LabelingToolbar.tsx` | `components/labeling/LabelingToolbar.tsx` | Replace `@base-ui/react` `Tooltip` + `TooltipTrigger render={...}` pattern → target's `@radix-ui/react-tooltip` declarative `<Tooltip><TooltipTrigger asChild>...</TooltipTrigger><TooltipContent>...</TooltipContent></Tooltip>`. Verify target has `components/ui/badge.tsx` and `components/ui/separator.tsx`; if not, port the shadcn versions from source `components/ui/`. |

### 2.3 Canvas components (all under `components/canvas/`)
| Source | Target | Changes |
|---|---|---|
| `HillshadeCanvas.tsx` | `components/canvas/HillshadeCanvas.tsx` | Downgrade `react-konva` to ^18.2.10 (React 18 compat). `use-image` ^1.1.4 works on React 18 unchanged. Stage ref cast likely needs `Konva.Stage` type hint. |
| `PolygonLayer.tsx` | `components/canvas/PolygonLayer.tsx` | Same react-konva downgrade. No other changes. |
| `DrawingLayer.tsx` | `components/canvas/DrawingLayer.tsx` | Same. |
| `SnapPreviewLayer.tsx` | `components/canvas/SnapPreviewLayer.tsx` | Same. |
| `MagnetIndicator.tsx` | `components/canvas/MagnetIndicator.tsx` | Same. |
| `AutoCloseIndicator.tsx` | `components/canvas/AutoCloseIndicator.tsx` | Same. |

### 2.4 Store
| Source | Target | Changes |
|---|---|---|
| `frontend/src/stores/labeler-store.ts` | `stores/labeler-store.ts` | Pin `zustand` to ^4.4.7 (v5 is React 19 only). `zundo` ^2.3.0 works. `useLabelerStore.temporal.getState().undo()` usage in toolbar stays the same under `zundo` 2.x. |

### 2.5 Lib
| Source | Target | Changes |
|---|---|---|
| `frontend/src/lib/api.ts` | `lib/labeler-api.ts` | Rename to avoid collision with any future target `lib/api.ts`. `API_BASE` env: keep `NEXT_PUBLIC_API_URL` (matches existing target env pattern — confirm none collide). |
| `frontend/src/lib/schemas.ts` | `lib/labeler-schemas.ts` | Rename for clarity. If the target zod we land on is v3, review for any v4-only syntax (source uses v4) and convert. |
| `frontend/src/lib/errors.ts` | `lib/labeler-errors.ts` | Simple error types. Rename for namespace clarity. |
| `frontend/src/lib/supabase.ts` | **DROP** | Do not port. Unify on target's `lib/supabase-server.ts` + `lib/supabaseClient.ts`. |

### 2.6 Python PDF service — extension of existing `roof_pipeline/api/`
Sidecar lives on the existing DO droplet. Reuse source's `roof_pipeline/api/` as-is for auth/CORS/logging (confirmed: `main.py` already registers `snap`, `pipeline`, `labels`, `errors`, `solar`, `hillshade`; uses `deps.get_supabase()` for Supabase JWT auth and `deps.get_settings()` for config). Add **one new router**:

- `roof_pipeline/api/pdf.py` — three endpoints:
  - `POST /api/pdf/cutsheets` — calls `roof_pipeline.cutsheets.write_cutsheets_pdf(polygons, planes, full_mesh, tmp_path)`; uploads to Supabase Storage bucket `pdf-outputs`; returns `{ url }` (signed, ~1h TTL).
  - `POST /api/pdf/shop-drawings` — calls `roof_pipeline.shop_drawings.generate_shop_drawings(roof_dict, tmp_path)`; same upload + signed URL response.
  - `POST /api/pdf/proposal` — NEW ReportLab layout (see §4.2 spec below). Takes project + estimate dict; returns signed URL.
- Extend `roof_pipeline/api/config.py` `Settings`:
  - `pdf_output_bucket: str = "pdf-outputs"`
  - `pdf_signed_url_ttl_seconds: int = 3600`
- Register in `main.py`: `app.include_router(pdf_router, prefix="/api/pdf", tags=["pdf"])`.
- Reuse existing per-request Supabase client from `deps.py` for auth; rate-limit per org via `x-org-id` header (new dep: None; implement with simple in-memory token bucket).

### 2.7 Next.js proxy routes (new in target)
Mirror the pattern in `app/api/roof-reconstruct/route.ts`:
- `app/api/pdf/cutsheets/route.ts`
- `app/api/pdf/shop-drawings/route.ts`
- `app/api/pdf/proposal/route.ts`

Each:
1. `createSupabaseServerClient()` → `auth.getUser()` → 401 if none.
2. Zod-validate request body.
3. Fetch project row; verify org ownership.
4. Forward to `ALGORITHM_API_URL/api/pdf/*` with `x-api-key: INTERNAL_API_KEY` and JWT forward.
5. Return `{ url }` to the client.

---

## Section 3 — Dependency Delta (applied at the START of Phase 3)

### 3.1 ADD to target `package.json`
| Package | Version | Why |
|---|---|---|
| `konva` | `^10.2.5` | Canvas primitive for labeler. React-18 compatible. |
| `react-konva` | `^18.2.10` | **Downgraded from source's `^19.2.3`** — highest version supporting React 18. |
| `zustand` | `^4.4.7` | **Downgraded from source's `^5.0.12`** — v5 requires React 19. Basic API unchanged for our usage. |
| `zundo` | `^2.3.0` | Undo/redo middleware. Works on zustand 4.x. |
| `use-image` | `^1.1.4` | `useImage` hook for hillshade tile load. |
| `swr` | `^2.4.1` | Data fetching in labeler page. |
| `zod` | `^3.23.8` | **Not present in target**. Source uses v4 — port under v3 (revalidate each schema; v4 → v3 has API differences on `z.error`, `z.coerce`, `.strictObject`, etc.). |

### 3.2 DO NOT ADD
| Package | Reason |
|---|---|
| `sonner` | Target uses `hooks/use-toast.ts` (shadcn/Radix). Rewrite source's `toast.error/success` calls at port time. Avoids a duplicate toast system. |
| `@base-ui/react` | Target has `@radix-ui/react-tooltip`. Swap at port time. |
| `tw-animate-css` | Source `globals.css`-only dependency — target's Tailwind 3 `tailwindcss-animate` is already sufficient. Skip. |

### 3.3 REMOVE (end of Phase 5)
| Package | Confirmation |
|---|---|
| `pdf-lib` | Only `lib/pdf-export.ts` imports it. Dead after Phase 2. |
| `jspdf` | Only `lib/pdf-generator.ts` + `components/project/ProposalBuilder.tsx:28` import it. `ProposalBuilder.tsx` rewires in Phase 5, then safe to drop. |
| `html2canvas` | Only `components/project/ProposalBuilder.tsx` imports it. Rewires in Phase 5. |

### 3.4 Tailwind 4 → 3 translation (Phase 3)
Source `frontend/src/app/globals.css` uses Tailwind 4 directives: `@import "tailwindcss"`, `@theme inline { ... }`, `@custom-variant dark`, `oklch()` color values.
- **Not porting globals** — target already has its own `globals.css` + `tailwind.config.ts`. Labeler components use only utility classes; no theme tokens need to move.
- If any labeler component uses an `oklch()` inline style or custom CSS file, convert to hsl/hex at port time.

### 3.5 Node engines
Neither package.json pins engines. Add `"engines": { "node": ">=18.17.0" }` to target during Phase 3 (safe; Next 14 needs ≥18.17).

---

## Section 4 — PDF Surface Port Spec

### 4.1 Python callables (reused as-is; no code changes in Phase 4 beyond wrapping)

**`cutsheets.write_cutsheets_pdf(polygons, planes, full_mesh, out_path) -> Path`**
- Inputs: `dict[int, ndarray]` (panel_id → N×3 vertices in meters), `dict[int, Plane]`, `trimesh.Trimesh`, output path.
- Outputs: multi-page PDF (cover + per-panel dimensioned sheets). Matplotlib → ReportLab.
- Side effects: writes to `out_path`; uses `tempfile` internally for PNGs.

**`shop_drawings.generate_shop_drawings(roof_dict, output_path) -> Path`**
- Inputs: nested `roof_dict` (see `shop_drawings.roof_dict_from_pipeline()` at line 1986 of source) with `roof_panels`, `edges`, `sheets`, `estimate_number`, `project_name`, `primary_slope`.
- Outputs: 4-page ANSI-B PDF (panel layout, trim diagram, cut list, edge details).

**`ts_export.write_ts_json(polygons, planes, full_mesh, out_path) -> Path`** + **`ts_render_pdf.render_pdf_from_json(json_path, out_path) -> Path`**
- TS-compatible intermediate. Useful for debugging and for the TS frontend path that already exists. Exposed in sidecar as `/api/pdf/ts-json` (optional — not strictly needed for this milestone; include if low-cost).
- **Round-trip coordinate test required** (per project constraint): Phase 4 tests must call `write_ts_json` → `render_pdf_from_json` on the gable sample and assert bit-for-bit PDF equality with a checked-in reference.

### 4.2 Proposal PDF — ReportLab port spec (derived from target `lib/pdf-generator.ts`)
Letter portrait, 18mm L/R margins, 16mm top.
- **Header band (~22mm):** logo (38×19mm) or company name (Helvetica 14 bold); contact line in 8pt gray.
- **Title row:** "Estimate" (14 bold, `rgb(28,28,28)`) left, estimate number right.
- **Project/Client two-column block** at 8pt; labels in `rgb(100,100,100)`.
- **Line items table:** Description / Qty / Unit / Amount. Right-align numeric columns. Alternating row bg `rgb(248,248,248)`. Border 0.5pt.
- **Totals block:** subtotal, tax (if rate), discount, deposit, **TOTAL** (14 bold).
- **Notes block (optional):** 10 bold header + 8pt wrapped body.
- **Footer:** estimate date, valid-through, page number (8pt gray).
- **Page 2 (terms, optional):** 12 bold header, 8pt paragraphs from `customTerms[]`.
- **Roof image slot (optional):** lower-right of page 1 if `roofImageDataUrl` supplied.

Decision for Phase 5 client-side: the current browser can still capture the 3D preview via `html2canvas` and POST it as a data URL. After Phase 5, `html2canvas` is removed — so Phase 5 must either (a) drop the preview image from the proposal, or (b) render it server-side from the mesh using matplotlib. **Recommend (b)** — use `trimesh` + matplotlib headless render (already a source dependency) server-side. **D-P5: confirm (b) is acceptable to you.**

---

## Section 5 — Schema / Storage additions

### 5.1 Supabase Storage
- New bucket: `pdf-outputs` (private; signed URL access). Org-scoped path: `pdf-outputs/{org_id}/{project_id}/{kind}/{timestamp}.pdf`.
- Service-role key used only inside the FastAPI sidecar, never in the browser.

### 5.2 Tables — DEFERRED pending D3
Labeler persistence touches this — depends on D3 answer:
- Option A: extend `projects` with `labeler_polygons JSONB` + `labeler_planes JSONB` columns (simpler; one-row-per-project).
- Option B: new `labels` table keyed by `(project_id, version)` (supports history; more moving parts).

No migration authored yet. Will land in Phase 3 after D3 answer.

---

## Section 6 — Risks to be aware of

1. **`react-konva@18.2.10` + `konva@10.2.5` on React 18:** Version pin not verified on actual npm registry at plan time — confirm during Phase 3 `npm install` step; if peer-dep errors, fall back to `react-konva@18.2.9` or earliest `konva` that satisfies its peer range.
2. **`zod` v4 → v3 schema rewrites:** Source uses zod v4. Any `z.*` call in source `schemas.ts` and `api.ts` needs a v3-idiom review at port time. Low volume; straightforward.
3. **`sketch_json` compatibility:** If D1 resolves to "labeler supersedes Ky's reconstruction," `RoofViewer3D.tsx:243` consumer must be updated to read the labeler format. Either a conversion layer in the labeler's save endpoint, or a `RoofViewer3D` adapter function.
4. **`ProposalBuilder` is live, not dead:** My earlier draft said delete. It's rendered at `project-page-client.tsx:1138`. It stays; only the jsPDF import goes.
5. **Sidecar deployment:** `ALGORITHM_API_URL` env var exists already (used by `roof-reconstruct`). Phase 4 deploy step = add new `INTERNAL_API_KEY` env var and deploy an updated `roof_pipeline/api/` image to the existing droplet. No new droplet — constraint honored.
6. **Round-trip test coverage:** Any touch to `ts_export.py` / `ts_render_pdf.py` in Phase 4/5 triggers the bit-for-bit gable test. Plan has not added tests; will add under `roof_pipeline/api/tests/test_pdf.py` in Phase 4.
7. **Dirty working tree on `Ky-Testing`:** Must be stashed or committed before Phase 2 destructive ops. Recommend you commit Ky's untracked `app/api/roof-reconstruct/` yourself before giving Phase 2 the go-ahead; I won't touch it.

---

## Section 7 — Exit criteria for Phase 1

- [x] `PROJECT.md` + `ROADMAP.md` at `.planning/`.
- [x] `INTEGRATION_PLAN.md` at repo root (this document).
- [x] Three inventory passes complete (target files, source port map, dep delta).
- [x] PDF import graph enumerated (3 callsites, 3 deletable modules).
- [x] React 18 backport strategy per file.
- [ ] **D1, D2, D3, D4, D-P5** decisions from you.
- [ ] Your go/no-go on Phase 2 delete list: `lib/pdf-export.ts`, `lib/pdf-generator.ts`, `app/api/test-generate/route.ts`.

**Phase 2 will not run until D1–D4 + D-P5 are resolved.**
