-- Migration: Create project_estimates table
-- Description: Stores multiple estimate variations per project
-- Created: 2026-01-12

CREATE TABLE IF NOT EXISTS project_estimates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,  -- e.g., "Option A - Premium Materials"
  materials_cost NUMERIC(10, 2),
  labor_cost NUMERIC(10, 2),
  permits_fees NUMERIC(10, 2),
  contingency NUMERIC(10, 2),
  total_cost NUMERIC(10, 2) GENERATED ALWAYS AS (
    COALESCE(materials_cost, 0) +
    COALESCE(labor_cost, 0) +
    COALESCE(permits_fees, 0) +
    COALESCE(contingency, 0)
  ) STORED,
  notes TEXT,
  is_active BOOLEAN DEFAULT TRUE,  -- Currently selected estimate
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_project_estimates_project_id ON project_estimates(project_id);
CREATE INDEX IF NOT EXISTS idx_project_estimates_user_id ON project_estimates(user_id);
CREATE INDEX IF NOT EXISTS idx_project_estimates_is_active ON project_estimates(is_active);
CREATE INDEX IF NOT EXISTS idx_project_estimates_created_at ON project_estimates(created_at);

-- Enable Row Level Security
ALTER TABLE project_estimates ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own estimates
CREATE POLICY "Users can view own estimates" ON project_estimates
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own estimates
CREATE POLICY "Users can create own estimates" ON project_estimates
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own estimates
CREATE POLICY "Users can update own estimates" ON project_estimates
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own estimates
CREATE POLICY "Users can delete own estimates" ON project_estimates
  FOR DELETE
  USING (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_project_estimates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER update_project_estimates_updated_at_trigger
  BEFORE UPDATE ON project_estimates
  FOR EACH ROW
  EXECUTE FUNCTION update_project_estimates_updated_at();

COMMENT ON TABLE project_estimates IS 'Stores multiple estimate variations per project for contractors to present to clients';
COMMENT ON COLUMN project_estimates.name IS 'Estimate name/label (e.g., "Option A - Premium")';
COMMENT ON COLUMN project_estimates.is_active IS 'Whether this is the currently active/selected estimate';
COMMENT ON COLUMN project_estimates.total_cost IS 'Auto-calculated total of all cost components';
