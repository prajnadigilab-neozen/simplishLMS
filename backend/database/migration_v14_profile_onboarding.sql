-- Migration V14: Profile Onboarding Fields
-- Description: Adds columns to public.users table to support the progressive onboarding funnel.

ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS dob DATE,
ADD COLUMN IF NOT EXISTS employment_status TEXT DEFAULT 'Student',
ADD COLUMN IF NOT EXISTS personal_address TEXT,
ADD COLUMN IF NOT EXISTS place TEXT,
ADD COLUMN IF NOT EXISTS pincode TEXT;

-- Enforce constraints (Indian Pincodes are 6 digits)
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS pincode_check;
ALTER TABLE public.users ADD CONSTRAINT pincode_check CHECK (pincode IS NULL OR pincode ~ '^\d{6}$');
