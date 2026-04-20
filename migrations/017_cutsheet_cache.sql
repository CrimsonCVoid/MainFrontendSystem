-- Migration: Cache cutsheet-data per project
-- Description: Persists the computed cutsheet payload so reopening the
--              Cut Sheet tab doesn't hit the sidecar + DSM download +
--              plane-fit pipeline on every view. Cache is invalidated
--              by comparing cutsheet_cache_updated_at against the
--              training_labels.updated_at for the same sample.
-- Created: 2026-04-20

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS cutsheet_cache JSONB,
  ADD COLUMN IF NOT EXISTS cutsheet_cache_updated_at TIMESTAMPTZ;

COMMENT ON COLUMN projects.cutsheet_cache IS
  'Cached cutsheet-data payload (panels, totals, plan_view, vertices_3d_ft). Invalidated when training_labels.updated_at > cutsheet_cache_updated_at.';

COMMENT ON COLUMN projects.cutsheet_cache_updated_at IS
  'Timestamp the cutsheet_cache was last written. Compared against training_labels.updated_at for staleness.';
