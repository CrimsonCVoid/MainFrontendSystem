-- ============================================
-- PRE-GENERATED PROMOTIONAL CODES
-- ============================================
-- 100 promotional codes with 3 free project credits each
-- These codes are hardcoded and managed by the dev/admin
-- Users can redeem these codes to unlock projects without payment

-- Create promo_keys table if it doesn't exist (with 20-char key support)
-- Note: These are system-level promo keys, not org-specific
CREATE TABLE IF NOT EXISTS promo_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_code VARCHAR(20) UNIQUE NOT NULL,
  is_used BOOLEAN DEFAULT FALSE NOT NULL,
  used_by_user_id UUID,
  used_for_project_id UUID,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  created_by TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  notes TEXT,
  credits_total INT DEFAULT 1,
  credits_remaining INT DEFAULT 1
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_promo_keys_key_code ON promo_keys(key_code);
CREATE INDEX IF NOT EXISTS idx_promo_keys_is_used ON promo_keys(is_used);
CREATE INDEX IF NOT EXISTS idx_promo_keys_used_by_user_id ON promo_keys(used_by_user_id);
CREATE INDEX IF NOT EXISTS idx_promo_keys_created_at ON promo_keys(created_at);

-- Enable Row Level Security
ALTER TABLE promo_keys ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can validate keys" ON promo_keys;

-- Policy: Allow authenticated users to validate keys (read only)
CREATE POLICY "Users can validate keys" ON promo_keys
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Add credits columns if table existed without them
ALTER TABLE promo_keys
ADD COLUMN IF NOT EXISTS credits_total INT DEFAULT 1,
ADD COLUMN IF NOT EXISTS credits_remaining INT DEFAULT 1;

-- Update existing keys to have credits_total = 1 and credits_remaining based on is_used
UPDATE promo_keys
SET credits_total = 1,
    credits_remaining = CASE WHEN is_used THEN 0 ELSE 1 END
WHERE credits_total IS NULL;

-- Make columns NOT NULL with defaults after backfill
ALTER TABLE promo_keys
ALTER COLUMN credits_total SET DEFAULT 1,
ALTER COLUMN credits_remaining SET DEFAULT 1;

-- Insert 100 pre-generated promotional codes with 3 credits each
-- Character set: ABCDEFGHJKLMNPQRSTUVWXYZ23456789 (excludes 0, O, I, 1 for clarity)
-- Format: MMRFREE26 (prefix) + 11 chars = 20 chars total
-- These are system-generated codes (not org-specific, created_by = 'system')
INSERT INTO promo_keys (key_code, is_used, credits_total, credits_remaining, created_by, metadata)
VALUES
  -- Batch 1 (codes 1-25)
  ('MMRFREE26ABTK4H7JNP', FALSE, 3, 3, 'system', '{"type": "promotional", "batch": 1}'),
  ('MMRFREE26CD9FK3MNQR', FALSE, 3, 3, 'system', '{"type": "promotional", "batch": 1}'),
  ('MMRFREE26EFH2LQ8RST', FALSE, 3, 3, 'system', '{"type": "promotional", "batch": 1}'),
  ('MMRFREE26GJK5NP7TUV', FALSE, 3, 3, 'system', '{"type": "promotional", "batch": 1}'),
  ('MMRFREE26HLM8QS3VWX', FALSE, 3, 3, 'system', '{"type": "promotional", "batch": 1}'),
  ('MMRFREE26JNQ2TW6XYZ', FALSE, 3, 3, 'system', '{"type": "promotional", "batch": 1}'),
  ('MMRFREE26KPR5VY9ZAB', FALSE, 3, 3, 'system', '{"type": "promotional", "batch": 1}'),
  ('MMRFREE26LST8XA2CBD', FALSE, 3, 3, 'system', '{"type": "promotional", "batch": 1}'),
  ('MMRFREE26MVW2BD5EFG', FALSE, 3, 3, 'system', '{"type": "promotional", "batch": 1}'),
  ('MMRFREE26NXY5CG8HJK', FALSE, 3, 3, 'system', '{"type": "promotional", "batch": 1}'),
  ('MMRFREE26PAB8EJ2KLM', FALSE, 3, 3, 'system', '{"type": "promotional", "batch": 1}'),
  ('MMRFREE26QCD2FM5LNP', FALSE, 3, 3, 'system', '{"type": "promotional", "batch": 1}'),
  ('MMRFREE26REF5HP8NQR', FALSE, 3, 3, 'system', '{"type": "promotional", "batch": 1}'),
  ('MMRFREE26SGH8JR2QTS', FALSE, 3, 3, 'system', '{"type": "promotional", "batch": 1}'),
  ('MMRFREE26TJK2KT5SVU', FALSE, 3, 3, 'system', '{"type": "promotional", "batch": 1}'),
  ('MMRFREE26ULM5MW8VXW', FALSE, 3, 3, 'system', '{"type": "promotional", "batch": 1}'),
  ('MMRFREE26VNQ8PY2XZY', FALSE, 3, 3, 'system', '{"type": "promotional", "batch": 1}'),
  ('MMRFREE26WPR2QB5ZAC', FALSE, 3, 3, 'system', '{"type": "promotional", "batch": 1}'),
  ('MMRFREE26XST5TD8BCE', FALSE, 3, 3, 'system', '{"type": "promotional", "batch": 1}'),
  ('MMRFREE26YVW8VG2DEF', FALSE, 3, 3, 'system', '{"type": "promotional", "batch": 1}'),
  ('MMRFREE26ZXY2XJ5FGH', FALSE, 3, 3, 'system', '{"type": "promotional", "batch": 1}'),
  ('MMRFREE26AAB5ZL8HJK', FALSE, 3, 3, 'system', '{"type": "promotional", "batch": 1}'),
  ('MMRFREE26BCD8AN2KLM', FALSE, 3, 3, 'system', '{"type": "promotional", "batch": 1}'),
  ('MMRFREE26CEF2CP5MNQ', FALSE, 3, 3, 'system', '{"type": "promotional", "batch": 1}'),
  ('MMRFREE26DGH5ER8PQR', FALSE, 3, 3, 'system', '{"type": "promotional", "batch": 1}'),

  -- Batch 2 (codes 26-50)
  ('MMRFREE26FJK8GT2RST', FALSE, 3, 3, 'system', '{"type": "promotional", "batch": 2}'),
  ('MMRFREE26GLM2HV5TUV', FALSE, 3, 3, 'system', '{"type": "promotional", "batch": 2}'),
  ('MMRFREE26HNQ5JX8WYZ', FALSE, 3, 3, 'system', '{"type": "promotional", "batch": 2}'),
  ('MMRFREE26JPR8KZ2YAB', FALSE, 3, 3, 'system', '{"type": "promotional", "batch": 2}'),
  ('MMRFREE26KST2LB5ACD', FALSE, 3, 3, 'system', '{"type": "promotional", "batch": 2}'),
  ('MMRFREE26LVW5MD8CEF', FALSE, 3, 3, 'system', '{"type": "promotional", "batch": 2}'),
  ('MMRFREE26MXY8NF2EGH', FALSE, 3, 3, 'system', '{"type": "promotional", "batch": 2}'),
  ('MMRFREE26NAB2PH5GJK', FALSE, 3, 3, 'system', '{"type": "promotional", "batch": 2}'),
  ('MMRFREE26PCD5QJ8KLM', FALSE, 3, 3, 'system', '{"type": "promotional", "batch": 2}'),
  ('MMRFREE26QEF8RL2MNP', FALSE, 3, 3, 'system', '{"type": "promotional", "batch": 2}'),
  ('MMRFREE26RGH2SN5PQR', FALSE, 3, 3, 'system', '{"type": "promotional", "batch": 2}'),
  ('MMRFREE26SJK5TQ8RST', FALSE, 3, 3, 'system', '{"type": "promotional", "batch": 2}'),
  ('MMRFREE26TLM8US2TUV', FALSE, 3, 3, 'system', '{"type": "promotional", "batch": 2}'),
  ('MMRFREE26UNQ2VW5WXY', FALSE, 3, 3, 'system', '{"type": "promotional", "batch": 2}'),
  ('MMRFREE26VPR5XY8YZA', FALSE, 3, 3, 'system', '{"type": "promotional", "batch": 2}'),
  ('MMRFREE26WST8ZA2BCD', FALSE, 3, 3, 'system', '{"type": "promotional", "batch": 2}'),
  ('MMRFREE26XVW2BC5DEF', FALSE, 3, 3, 'system', '{"type": "promotional", "batch": 2}'),
  ('MMRFREE26YXY5DE8FGH', FALSE, 3, 3, 'system', '{"type": "promotional", "batch": 2}'),
  ('MMRFREE26ZAB8FG2HJK', FALSE, 3, 3, 'system', '{"type": "promotional", "batch": 2}'),
  ('MMRFREE26ABC2HJ5KLM', FALSE, 3, 3, 'system', '{"type": "promotional", "batch": 2}'),
  ('MMRFREE26BDE5JL8MNP', FALSE, 3, 3, 'system', '{"type": "promotional", "batch": 2}'),
  ('MMRFREE26CFG8KN2PQR', FALSE, 3, 3, 'system', '{"type": "promotional", "batch": 2}'),
  ('MMRFREE26DHJ2LP5RST', FALSE, 3, 3, 'system', '{"type": "promotional", "batch": 2}'),
  ('MMRFREE26EKL5MQ8TUV', FALSE, 3, 3, 'system', '{"type": "promotional", "batch": 2}'),

  -- Batch 3 (codes 51-75)
  ('MMRFREE26FMN8NS2VWX', FALSE, 3, 3, 'system', '{"type": "promotional", "batch": 3}'),
  ('MMRFREE26GPQ2PT5XYZ', FALSE, 3, 3, 'system', '{"type": "promotional", "batch": 3}'),
  ('MMRFREE26HRS5QW8ZAB', FALSE, 3, 3, 'system', '{"type": "promotional", "batch": 3}'),
  ('MMRFREE26JTU8RY2BCD', FALSE, 3, 3, 'system', '{"type": "promotional", "batch": 3}'),
  ('MMRFREE26KVW2SA5DEF', FALSE, 3, 3, 'system', '{"type": "promotional", "batch": 3}'),
  ('MMRFREE26LXY5TB8FGH', FALSE, 3, 3, 'system', '{"type": "promotional", "batch": 3}'),
  ('MMRFREE26MAB8UC2HJK', FALSE, 3, 3, 'system', '{"type": "promotional", "batch": 3}'),
  ('MMRFREE26NCD2VE5KLM', FALSE, 3, 3, 'system', '{"type": "promotional", "batch": 3}'),
  ('MMRFREE26PEF5WG8MNP', FALSE, 3, 3, 'system', '{"type": "promotional", "batch": 3}'),
  ('MMRFREE26QGH8XJ2PQR', FALSE, 3, 3, 'system', '{"type": "promotional", "batch": 3}'),
  ('MMRFREE26RJK2YL5RST', FALSE, 3, 3, 'system', '{"type": "promotional", "batch": 3}'),
  ('MMRFREE26SLM5ZN8TUV', FALSE, 3, 3, 'system', '{"type": "promotional", "batch": 3}'),
  ('MMRFREE26TNQ8AP2WXY', FALSE, 3, 3, 'system', '{"type": "promotional", "batch": 3}'),
  ('MMRFREE26UPR2BQ5YZA', FALSE, 3, 3, 'system', '{"type": "promotional", "batch": 3}'),
  ('MMRFREE26VST5CS8ABC', FALSE, 3, 3, 'system', '{"type": "promotional", "batch": 3}'),
  ('MMRFREE26WVW8DT2CDE', FALSE, 3, 3, 'system', '{"type": "promotional", "batch": 3}'),
  ('MMRFREE26XXY2EV5EFG', FALSE, 3, 3, 'system', '{"type": "promotional", "batch": 3}'),
  ('MMRFREE26YAB5FW8GHJ', FALSE, 3, 3, 'system', '{"type": "promotional", "batch": 3}'),
  ('MMRFREE26ZCD8GX2JKL', FALSE, 3, 3, 'system', '{"type": "promotional", "batch": 3}'),
  ('MMRFREE26AEF2HY5LMN', FALSE, 3, 3, 'system', '{"type": "promotional", "batch": 3}'),
  ('MMRFREE26BGH5JZ8NPQ', FALSE, 3, 3, 'system', '{"type": "promotional", "batch": 3}'),
  ('MMRFREE26CJK8KA2QRS', FALSE, 3, 3, 'system', '{"type": "promotional", "batch": 3}'),
  ('MMRFREE26DLM2LB5STU', FALSE, 3, 3, 'system', '{"type": "promotional", "batch": 3}'),
  ('MMRFREE26ENQ5MC8UVW', FALSE, 3, 3, 'system', '{"type": "promotional", "batch": 3}'),
  ('MMRFREE26FPR8ND2WXY', FALSE, 3, 3, 'system', '{"type": "promotional", "batch": 3}'),

  -- Batch 4 (codes 76-100)
  ('MMRFREE26GST2PE5YZA', FALSE, 3, 3, 'system', '{"type": "promotional", "batch": 4}'),
  ('MMRFREE26HVW5QF8ABC', FALSE, 3, 3, 'system', '{"type": "promotional", "batch": 4}'),
  ('MMRFREE26JXY8RG2CDE', FALSE, 3, 3, 'system', '{"type": "promotional", "batch": 4}'),
  ('MMRFREE26KAB2SH5EFG', FALSE, 3, 3, 'system', '{"type": "promotional", "batch": 4}'),
  ('MMRFREE26LCD5TJ8GHJ', FALSE, 3, 3, 'system', '{"type": "promotional", "batch": 4}'),
  ('MMRFREE26MEF8UK2JKL', FALSE, 3, 3, 'system', '{"type": "promotional", "batch": 4}'),
  ('MMRFREE26NGH2VL5MNP', FALSE, 3, 3, 'system', '{"type": "promotional", "batch": 4}'),
  ('MMRFREE26PJK5WM8PQR', FALSE, 3, 3, 'system', '{"type": "promotional", "batch": 4}'),
  ('MMRFREE26QLM8XN2RST', FALSE, 3, 3, 'system', '{"type": "promotional", "batch": 4}'),
  ('MMRFREE26RNQ2YP5TUV', FALSE, 3, 3, 'system', '{"type": "promotional", "batch": 4}'),
  ('MMRFREE26SPR5ZQ8VWX', FALSE, 3, 3, 'system', '{"type": "promotional", "batch": 4}'),
  ('MMRFREE26TST8AR2XYZ', FALSE, 3, 3, 'system', '{"type": "promotional", "batch": 4}'),
  ('MMRFREE26UVW2BS5ZAB', FALSE, 3, 3, 'system', '{"type": "promotional", "batch": 4}'),
  ('MMRFREE26VXY5CT8BCD', FALSE, 3, 3, 'system', '{"type": "promotional", "batch": 4}'),
  ('MMRFREE26WAB8DU2DEF', FALSE, 3, 3, 'system', '{"type": "promotional", "batch": 4}'),
  ('MMRFREE26XCD2EV5FGH', FALSE, 3, 3, 'system', '{"type": "promotional", "batch": 4}'),
  ('MMRFREE26YEF5FW8HJK', FALSE, 3, 3, 'system', '{"type": "promotional", "batch": 4}'),
  ('MMRFREE26ZGH8GX2KLM', FALSE, 3, 3, 'system', '{"type": "promotional", "batch": 4}'),
  ('MMRFREE26AJK2HY5MNP', FALSE, 3, 3, 'system', '{"type": "promotional", "batch": 4}'),
  ('MMRFREE26BLM5JZ8PQR', FALSE, 3, 3, 'system', '{"type": "promotional", "batch": 4}'),
  ('MMRFREE26CNQ8KA2RST', FALSE, 3, 3, 'system', '{"type": "promotional", "batch": 4}'),
  ('MMRFREE26DPR2LB5TUV', FALSE, 3, 3, 'system', '{"type": "promotional", "batch": 4}'),
  ('MMRFREE26EST5MC8VWX', FALSE, 3, 3, 'system', '{"type": "promotional", "batch": 4}'),
  ('MMRFREE26FVW8ND2XYZ', FALSE, 3, 3, 'system', '{"type": "promotional", "batch": 4}'),
  ('MMRFREE26GXY2PE5ZAB', FALSE, 3, 3, 'system', '{"type": "promotional", "batch": 4}')
ON CONFLICT (key_code) DO NOTHING;

-- Update redeem_promo_key function to handle multi-credit keys
CREATE OR REPLACE FUNCTION redeem_promo_key(
  p_key_code TEXT,
  p_user_id UUID,
  p_project_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_key RECORD;
  v_project RECORD;
BEGIN
  -- Normalize key (remove dashes and spaces, uppercase)
  p_key_code := UPPER(REPLACE(REPLACE(p_key_code, '-', ''), ' ', ''));

  -- Find the key
  SELECT * INTO v_key
  FROM promo_keys
  WHERE key_code = p_key_code;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Invalid promo code'
    );
  END IF;

  -- Check if key has remaining credits
  IF v_key.credits_remaining <= 0 THEN
    RETURN json_build_object(
      'success', false,
      'error', 'This promo code has no remaining credits'
    );
  END IF;

  -- Check project exists and belongs to user
  SELECT * INTO v_project
  FROM projects
  WHERE id = p_project_id AND user_id = p_user_id;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Project not found or access denied'
    );
  END IF;

  -- Check if project is already unlocked
  IF v_project.payment_completed THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Project is already unlocked'
    );
  END IF;

  -- Decrement credits_remaining and update tracking
  UPDATE promo_keys
  SET
    credits_remaining = credits_remaining - 1,
    is_used = CASE WHEN credits_remaining - 1 = 0 THEN TRUE ELSE FALSE END,
    used_at = CASE WHEN credits_remaining - 1 = 0 THEN NOW() ELSE used_at END,
    used_by_user_id = COALESCE(used_by_user_id, p_user_id),
    used_for_project_id = COALESCE(used_for_project_id, p_project_id)
  WHERE id = v_key.id;

  -- Unlock the project
  UPDATE projects
  SET
    payment_completed = TRUE,
    payment_required = FALSE,
    payment_id = 'promo_' || v_key.id,
    updated_at = NOW()
  WHERE id = p_project_id;

  RETURN json_build_object(
    'success', true,
    'message', 'Project unlocked successfully!',
    'credits_remaining', v_key.credits_remaining - 1
  );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION redeem_promo_key(TEXT, UUID, UUID) TO authenticated;
