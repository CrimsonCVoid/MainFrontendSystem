-- ============================================================================
-- Migration: 020_add_source_to_training_samples.sql
-- Purpose:   Add nullable `source` column to training_samples so the
--            3DEP-vs-Google benchmark spike can distinguish which ingest
--            path produced each sample.
-- Scope:     Idempotent. Safe to re-run. Does not alter existing rows —
--            legacy pre-benchmark samples keep source=NULL.
-- ============================================================================
--
-- Context:
--   MMR's production ingest writes training_samples rows from the FastAPI
--   sidecar's /api/solar/ingest endpoint (Google Solar DSMs only). A
--   benchmark spike in benchmarks/3dep_vs_google/ (Python repo) wants to
--   upload USGS 3DEP LiDAR DSMs as additional training_samples rows and
--   tell them apart during comparison.
--
-- What this does:
--   - Adds `source TEXT NULL` to public.training_samples.
--   - Values the codebase writes today: 'google', '3dep', or NULL.
--   - No CHECK constraint: the benchmark treats values liberally, and we
--     don't want a future source like '3dep-ept' blocked at the DB.
--
-- What this does NOT do:
--   - Does not backfill. Legacy rows stay NULL; consumers MUST treat NULL
--     as "unknown, assume google" if they need a default.
--   - Does not change RLS. Migration 019 already enables deny-by-default
--     for training_samples; only service_role writes.
--   - Does not create indexes. This column is low-cardinality and only
--     queried during ad-hoc benchmark reports, not application hot paths.
-- ============================================================================

ALTER TABLE public.training_samples
  ADD COLUMN IF NOT EXISTS source TEXT;

COMMENT ON COLUMN public.training_samples.source IS
  'Origin of DSM data. Values in use: ''google'' (Solar API), ''3dep'' (USGS LiDAR). '
  'NULL for legacy pre-benchmark samples — consumers should treat NULL as ''google''.';
