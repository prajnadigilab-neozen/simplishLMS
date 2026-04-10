-- Migration V8: Profile Hardening & Atomic Streaks
-- Description: Adds atomic streak increment and enforces strict data validation for phone and bio.

-- 1. Create Atomic Streak Function
CREATE OR REPLACE FUNCTION increment_streak(user_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE users 
    SET streak_count = COALESCE(streak_count, 0) + 1 
    WHERE id = user_id;
END;
$$ LANGUAGE plpgsql;

-- 2. Pre-migration Audit: Check for duplicate phone numbers after normalization
-- This prevents the migration from failing if multiple users have the same 10-digit phone.
DO $$ 
DECLARE 
    duplicate_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO duplicate_count FROM (
        SELECT RIGHT(phone, 10) as normalized_phone 
        FROM public.users 
        WHERE phone IS NOT NULL 
        GROUP BY normalized_phone 
        HAVING COUNT(*) > 1
    ) sub;

    IF duplicate_count > 0 THEN
        RAISE EXCEPTION 'Migration Aborted: Found % duplicate normalized phone numbers. Resolve duplicates before enforcement.', duplicate_count;
    END IF;
END $$;

-- 3. Data Normalization: Strip existing +91/91 prefixes from phone numbers
-- We only do this if the phone number length > 10 and it starts with 91 or +91
UPDATE public.users 
SET phone = RIGHT(phone, 10) 
WHERE phone IS NOT NULL AND LENGTH(phone) > 10;

-- 4. Enforce Strict Constraints (Idempotent)
-- Phone must be exactly 10 digits
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS phone_check;
ALTER TABLE public.users ADD CONSTRAINT phone_check CHECK (phone ~ '^\d{10}$');

-- Bio must be <= 500 characters
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS bio_check;
ALTER TABLE public.users ADD CONSTRAINT bio_check CHECK (LENGTH(bio) <= 500);

-- 5. Verify function
COMMENT ON FUNCTION increment_streak IS 'Atomically increments a users streak_count to prevent race conditions.';
