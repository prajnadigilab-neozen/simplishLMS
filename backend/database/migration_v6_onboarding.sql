-- ==========================================
-- FEATURE: ONBOARDING & PHONE CONSTRAINTS (v6)
-- ==========================================

-- 1. Add onboarding_completed flag to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;

-- 2. Ensure phone is unique (already is, but reinforcement)
-- Note: schema.sql already has UNIQUE(phone)

-- 3. Add index for onboarding_completed
CREATE INDEX IF NOT EXISTS idx_users_onboarding ON users(onboarding_completed);
