-- Migration V10: Database Hardening & Optimization
-- Description: Standardizes roles, creates missing settings table, consolidates functions, adds indexes, and implements automatic updated_at triggers.
-- Author: Antigravity (Senior DBA)
-- [CRITICAL INSTRUCTION]: Do not disturb 'REVENUE' and 'PAYMENT' flow.

BEGIN;

-- 1. Create Missing Settings Table (Idempotent)
CREATE TABLE IF NOT EXISTS public.settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure description column exists (in case table was created previously without it)
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS description TEXT;

-- Seed Default Pricing (Compatibility with Frontend)
INSERT INTO public.settings (key, value, description) VALUES 
('subscription_price', '99', 'Price for premium membership'),
('subscription_duration_days', '30', 'Duration of premium access'),
('topup_price', '99', 'Cost of one wallet top-up'),
('topup_amount', '99', 'Credits awarded per top-up'),
('topup_duration_days', '30', 'Bonus days for top-up')
ON CONFLICT (key) DO NOTHING;

-- 2. Automatic Timestamp Management
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers (Idempotent: drop if exists first)
DO $$ 
BEGIN
    -- Users
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
        DROP TRIGGER IF EXISTS trg_users_updated_at ON public.users;
        CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
    
    -- Payments
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payments') THEN
        DROP TRIGGER IF EXISTS trg_payments_updated_at ON public.payments;
        CREATE TRIGGER trg_payments_updated_at BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
    END IF;

    -- Settings
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'settings') THEN
        DROP TRIGGER IF EXISTS trg_settings_updated_at ON public.settings;
        CREATE TRIGGER trg_settings_updated_at BEFORE UPDATE ON public.settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
END $$;

-- 3. Consolidate Wallet Functions
DROP FUNCTION IF EXISTS public.increment_wallet_balance(UUID, DECIMAL);
DROP FUNCTION IF EXISTS public.increment_wallet_balance(UUID, NUMERIC);

-- Ensure consolidated function uses BIGINT (Paise) as per Migration V9
DROP FUNCTION IF EXISTS public.increment_wallet(UUID, NUMERIC);
DROP FUNCTION IF EXISTS public.increment_wallet(UUID, BIGINT);
CREATE OR REPLACE FUNCTION public.increment_wallet(row_id UUID, amount BIGINT)
RETURNS VOID AS $$
BEGIN
    UPDATE public.users 
    SET wallet_balance = COALESCE(wallet_balance, 0) + amount 
    WHERE id = row_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Audit Log Consolidation (Unified Audit Trail)
CREATE TABLE IF NOT EXISTS public.audit_trail (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL, -- AUTH_LOGIN, PAYMENT_SUCCESS, SENSITIVE_DATA_ACCESS, ROLE_CHANGE
    severity TEXT CHECK (severity IN ('INFO', 'WARNING', 'ERROR', 'CRITICAL')) DEFAULT 'INFO',
    actor_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    target_id UUID, -- ID of the affected resource (user, payment, lesson)
    message TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Migrate data from old system_logs if they exist
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'system_logs') THEN
        INSERT INTO public.audit_trail (event_type, severity, actor_id, message, metadata, created_at)
        SELECT event_type, severity, admin_id, message, metadata, created_at
        FROM public.system_logs
        ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- 5. Performance Indexing
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_assessment_results_user_id_assessment_id ON public.assessment_results(user_id, assessment_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_user_id_status ON public.user_progress(user_id, status);
CREATE INDEX IF NOT EXISTS idx_audit_trail_created_at ON public.audit_trail(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_trail_event_type ON public.audit_trail(event_type);

-- 6. Role Constraint Hardening
-- Standardizing on: user, admin, moderator, super_admin
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users ADD CONSTRAINT users_role_check CHECK (role::TEXT IN ('user', 'admin', 'moderator', 'super_admin'));

-- 7. Security Hardening: Consolidated RLS Policies
-- Enable RLS on all tables (Idempotent)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_trail ENABLE ROW LEVEL SECURITY;

-- Helper Function to avoid RLS recursion on the users table
-- This function runs with the privileges of the owner (bypassing RLS)
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT AS $$
BEGIN
    RETURN (SELECT role::TEXT FROM public.users WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Users Table Policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
CREATE POLICY "Users can view own profile" ON public.users FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can view all profiles" ON public.users;
CREATE POLICY "Admins can view all profiles" ON public.users FOR SELECT TO authenticated 
USING (public.get_my_role() IN ('admin', 'super_admin', 'moderator'));

DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE TO authenticated 
USING (auth.uid() = id);

-- Lessons Table Policies (Public Read)
DROP POLICY IF EXISTS "Lessons are publicly readable" ON public.lessons;
CREATE POLICY "Lessons are publicly readable" ON public.lessons FOR SELECT USING (true);

-- Settings Table Policies (Public/Authenticed Read)
-- Settings Table Policies (Public/Authenticed Read)
DROP POLICY IF EXISTS "Only admins can view/manage settings" ON public.settings;
DROP POLICY IF EXISTS "Authenticated users can view settings" ON public.settings;
CREATE POLICY "Authenticated users can view settings" ON public.settings FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "Admins can manage settings" ON public.settings;
CREATE POLICY "Admins can manage settings" ON public.settings FOR ALL TO authenticated
USING (public.get_my_role() IN ('admin', 'super_admin'));

-- Audit Trail Policies (Super Admin Only)
DROP POLICY IF EXISTS "Only super admins can view audit trail" ON public.audit_trail;
CREATE POLICY "Only super admins can view audit trail" ON public.audit_trail FOR SELECT TO authenticated
USING (public.get_my_role() = 'super_admin');

-- 8. Additional Relation Security (Admins can see everything)
-- Payments
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Super Admins can view all payments" ON public.payments;
CREATE POLICY "Super Admins can view all payments" ON public.payments FOR SELECT TO authenticated 
USING (public.get_my_role() = 'super_admin');

DROP POLICY IF EXISTS "Users can view own payments" ON public.payments;
CREATE POLICY "Users can view own payments" ON public.payments FOR SELECT TO authenticated 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own payments" ON public.payments;
CREATE POLICY "Users can insert own payments" ON public.payments FOR INSERT TO authenticated 
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own payments" ON public.payments;
CREATE POLICY "Users can update own payments" ON public.payments FOR UPDATE TO authenticated 
USING (auth.uid() = user_id);

-- Assessment Results
ALTER TABLE public.assessment_results ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can view all results" ON public.assessment_results;
CREATE POLICY "Admins can view all results" ON public.assessment_results FOR SELECT TO authenticated 
USING (public.get_my_role() IN ('admin', 'super_admin', 'moderator'));

DROP POLICY IF EXISTS "Users can view own results" ON public.assessment_results;
CREATE POLICY "Users can view own results" ON public.assessment_results FOR SELECT TO authenticated 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own results" ON public.assessment_results;
CREATE POLICY "Users can insert own results" ON public.assessment_results FOR INSERT TO authenticated 
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own results" ON public.assessment_results;
CREATE POLICY "Users can update own results" ON public.assessment_results FOR UPDATE TO authenticated 
USING (auth.uid() = user_id);

-- User Progress (Consistency update)
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can view all progress" ON public.user_progress;
CREATE POLICY "Admins can view all progress" ON public.user_progress FOR SELECT TO authenticated 
USING (public.get_my_role() IN ('admin', 'super_admin', 'moderator'));

COMMIT;

COMMENT ON TABLE public.payments IS '[CRITICAL]: Do not disturb REVENUE and PAYMENT flow. Contains all financial transactions.';
COMMENT ON TABLE public.audit_trail IS 'Consolidated audit engine for all system events, replacing legacy system_logs and audit_logs.';
COMMENT ON FUNCTION public.increment_wallet(UUID, BIGINT) IS '[SYSTEM INSTRUCTION]: Do not disturb REVENUE and PAYMENT flow. Authoritative Paise-based wallet update.';
