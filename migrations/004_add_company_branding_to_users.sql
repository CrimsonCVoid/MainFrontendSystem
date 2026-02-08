-- Migration: Add company branding fields to users table
-- Description: Stores contractor company logo URL and company info for PDF proposals
-- Created: 2026-01-13

-- Add company branding columns to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS company_name TEXT,
ADD COLUMN IF NOT EXISTS company_logo_url TEXT,
ADD COLUMN IF NOT EXISTS company_phone TEXT,
ADD COLUMN IF NOT EXISTS company_address TEXT;

-- Add comments for documentation
COMMENT ON COLUMN users.company_name IS 'Contractor company name for PDF branding';
COMMENT ON COLUMN users.company_logo_url IS 'URL to company logo in Supabase Storage';
COMMENT ON COLUMN users.company_phone IS 'Company phone number for proposals';
COMMENT ON COLUMN users.company_address IS 'Company address for proposals';

-- Create storage bucket for company logos (run via Supabase Dashboard or separate script)
-- INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
-- VALUES (
--   'company-logos',
--   'company-logos',
--   true,
--   2097152, -- 2MB limit
--   ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
-- );
