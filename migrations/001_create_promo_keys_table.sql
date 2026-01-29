-- Migration: Create promo_keys table
-- Description: Stores promotional keys for one-time free project unlocks
-- Created: 2026-01-12

CREATE TABLE IF NOT EXISTS promo_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_code VARCHAR(10) UNIQUE NOT NULL,
  is_used BOOLEAN DEFAULT FALSE NOT NULL,
  used_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  used_for_project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  created_by VARCHAR(255),
  metadata JSONB DEFAULT '{}'::jsonb,

  CONSTRAINT promo_keys_key_code_check CHECK (length(key_code) = 10)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_promo_keys_key_code ON promo_keys(key_code);
CREATE INDEX IF NOT EXISTS idx_promo_keys_is_used ON promo_keys(is_used);
CREATE INDEX IF NOT EXISTS idx_promo_keys_used_by_user_id ON promo_keys(used_by_user_id);
CREATE INDEX IF NOT EXISTS idx_promo_keys_created_at ON promo_keys(created_at);

-- Enable Row Level Security
ALTER TABLE promo_keys ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users to validate keys (read only)
CREATE POLICY "Users can validate keys" ON promo_keys
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Policy: Only service role can insert/update keys (admin only)
-- Note: Regular users cannot insert keys - this is enforced by default (no INSERT policy)

COMMENT ON TABLE promo_keys IS 'Promotional keys for one-time free project unlocks';
COMMENT ON COLUMN promo_keys.key_code IS 'Unique 10-character alphanumeric key (no ambiguous characters)';
COMMENT ON COLUMN promo_keys.is_used IS 'Whether the key has been redeemed';
COMMENT ON COLUMN promo_keys.used_by_user_id IS 'User who redeemed the key';
COMMENT ON COLUMN promo_keys.used_for_project_id IS 'Project that was unlocked with this key';
COMMENT ON COLUMN promo_keys.used_at IS 'Timestamp when key was redeemed';
COMMENT ON COLUMN promo_keys.metadata IS 'Additional tracking data (campaign, partner, etc.)';
