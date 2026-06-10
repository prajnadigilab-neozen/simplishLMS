-- Migration V12: Refund Processing Support
-- Description: Creates the public.refunds table, sets up performance indexes, RLS policies, and triggers.
-- Author: Antigravity

BEGIN;

-- 1. Create refunds table
CREATE TABLE IF NOT EXISTS public.refunds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    payment_id TEXT REFERENCES public.payments(transaction_id) ON DELETE CASCADE,
    razorpay_refund_id TEXT UNIQUE,
    refund_amount_paise BIGINT NOT NULL,
    refund_type TEXT CHECK (refund_type IN ('full', 'partial')) NOT NULL,
    reason_category TEXT CHECK (reason_category IN (
        'Duplicate payment / Charged twice',
        'Order cancelled by customer',
        'Defective / Item not as described',
        'Service not rendered / Product not received',
        'Other'
    )) NOT NULL,
    reason_notes TEXT,
    status TEXT CHECK (status IN ('pending', 'completed', 'failed')) DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraint: Notes required if reason is 'Other'
    CONSTRAINT chk_refund_other_reason_notes CHECK (
        (reason_category != 'Other') OR (reason_notes IS NOT NULL AND length(trim(reason_notes)) > 0)
    )
);

-- 2. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_refunds_user_id ON public.refunds(user_id);
CREATE INDEX IF NOT EXISTS idx_refunds_payment_id ON public.refunds(payment_id);
CREATE INDEX IF NOT EXISTS idx_refunds_status ON public.refunds(status);

-- 3. Automatic Updated At Trigger
DROP TRIGGER IF EXISTS trg_refunds_updated_at ON public.refunds;
CREATE TRIGGER trg_refunds_updated_at 
    BEFORE UPDATE ON public.refunds 
    FOR EACH ROW 
    EXECUTE FUNCTION public.update_updated_at_column();

-- Helper Function to avoid RLS recursion on the users table
-- This function runs with the privileges of the owner (bypassing RLS)
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT AS $$
BEGIN
    RETURN (SELECT role::TEXT FROM public.users WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies
-- Users can view their own refunds
DROP POLICY IF EXISTS "Users can view own refunds" ON public.refunds;
CREATE POLICY "Users can view own refunds" ON public.refunds 
    FOR SELECT TO authenticated 
    USING (auth.uid() = user_id);

-- Admins/Super Admins/Moderators can view all refunds
DROP POLICY IF EXISTS "Admins can view all refunds" ON public.refunds;
CREATE POLICY "Admins can view all refunds" ON public.refunds 
    FOR SELECT TO authenticated 
    USING (public.get_my_role() IN ('admin', 'super_admin', 'moderator'));

-- Users can insert their own refund requests
DROP POLICY IF EXISTS "Users can insert own refunds" ON public.refunds;
CREATE POLICY "Users can insert own refunds" ON public.refunds 
    FOR INSERT TO authenticated 
    WITH CHECK (
        (auth.uid() = user_id) OR
        (auth.role() = 'service_role') OR
        (public.get_my_role() IN ('admin', 'super_admin', 'moderator'))
    );

-- Admins/Super Admins/Moderators can update refunds (e.g. status)
DROP POLICY IF EXISTS "Admins can update refunds" ON public.refunds;
CREATE POLICY "Admins can update refunds" ON public.refunds 
    FOR UPDATE TO authenticated 
    USING (public.get_my_role() IN ('admin', 'super_admin', 'moderator'));

COMMIT;

COMMENT ON TABLE public.refunds IS 'Contains all transaction refund records mapped to Razorpay pay_id payments.';
