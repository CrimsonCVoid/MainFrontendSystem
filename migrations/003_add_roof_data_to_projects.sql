-- Migration: Add roof_data column to projects table
-- Description: Stores roof geometry, measurements, and panel configuration from 3D algorithm
-- Created: 2026-01-12

ALTER TABLE projects
ADD COLUMN IF NOT EXISTS roof_data JSONB;

-- Create index for JSONB queries
CREATE INDEX IF NOT EXISTS idx_projects_roof_data ON projects USING GIN (roof_data);

-- Create index for total_area_sf within roof_data (for efficient square footage lookups)
CREATE INDEX IF NOT EXISTS idx_projects_roof_data_total_area_sf
  ON projects ((roof_data->>'total_area_sf'));

COMMENT ON COLUMN projects.roof_data IS 'JSONB storage for roof geometry, measurements, and configuration from 3D algorithm';

-- Example roof_data structure:
-- {
--   "planes": [
--     {
--       "id": "plane1",
--       "vertices": [[x, y, z], ...],
--       "normal": [x, y, z],
--       "area_sf": 1250.5
--     }
--   ],
--   "measurements": {
--     "ridge_length_ft": 45.5,
--     "eave_length_ft": 30.2,
--     "rake_left_length_ft": 25.8,
--     "rake_right_length_ft": 25.8,
--     "total_perimeter_ft": 127.3
--   },
--   "total_area_sf": 2500,
--   "panel_count": 42,
--   "panel_type": "standing-seam",
--   "seam_width_inches": 18,
--   "generated_at": "2026-01-12T10:30:00Z"
-- }
