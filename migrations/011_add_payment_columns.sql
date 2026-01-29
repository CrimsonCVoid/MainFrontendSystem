-- ============================================
-- ADD PAYMENT COLUMNS TO PROJECTS
-- ============================================
-- Required for promo key redemption and payment tracking

-- Add payment tracking columns
ALTER TABLE projects ADD COLUMN IF NOT EXISTS payment_required BOOLEAN DEFAULT TRUE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS payment_completed BOOLEAN DEFAULT FALSE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS payment_id TEXT;

-- Set existing projects as paid (if they exist)
-- Comment this out if you want all existing projects to remain locked
UPDATE projects SET payment_completed = TRUE WHERE payment_completed IS NULL;

-- Create index for payment queries
CREATE INDEX IF NOT EXISTS idx_projects_payment_completed ON projects(payment_completed);
 