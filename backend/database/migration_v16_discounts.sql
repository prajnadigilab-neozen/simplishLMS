-- Migration V16: Discount and Coupon Management System
-- Description: Creates the discount_master and user_discount_usage tables, seeds master coupons, and enables RLS.

-- Enable UUID extension if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Create discount_master table
CREATE TABLE IF NOT EXISTS public.discount_master (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_type TEXT NOT NULL,
    coupon_code TEXT NOT NULL UNIQUE,
    discount_type TEXT CHECK (discount_type IN ('PERCENTAGE', 'FREE_MONTHS', 'FREE_ACCESS')) NOT NULL,
    discount_value NUMERIC NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    max_usage INTEGER NOT NULL,
    current_usage INTEGER DEFAULT 0,
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for coupon code lookup
CREATE INDEX IF NOT EXISTS idx_discount_master_code ON public.discount_master (coupon_code);

-- 2. Create user_discount_usage table
CREATE TABLE IF NOT EXISTS public.user_discount_usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    coupon_id UUID REFERENCES public.discount_master(id) ON DELETE CASCADE,
    customer_type TEXT NOT NULL,
    coupon_code TEXT NOT NULL,
    discount_applied TEXT NOT NULL,
    purchase_type TEXT CHECK (purchase_type IN ('NEW', 'RENEWAL', 'TOPUP')) NOT NULL,
    amount_before_discount DECIMAL(10, 2) NOT NULL,
    discount_amount DECIMAL(10, 2) NOT NULL,
    final_amount DECIMAL(10, 2) NOT NULL,
    transaction_id TEXT NOT NULL,
    used_on TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_discount_usage_user ON public.user_discount_usage (user_id);
CREATE INDEX IF NOT EXISTS idx_user_discount_usage_coupon ON public.user_discount_usage (coupon_id);

-- 3. Modify payments table to track applied coupon codes
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS coupon_code TEXT;

-- 4. Enable RLS
ALTER TABLE public.discount_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_discount_usage ENABLE ROW LEVEL SECURITY;

-- 5. Set RLS Policies (Bypassed by service_role, enforced for other roles)
DROP POLICY IF EXISTS "Admins can manage discount_master" ON public.discount_master;
CREATE POLICY "Admins can manage discount_master" ON public.discount_master
    FOR ALL TO authenticated
    USING (auth.jwt() ->> 'role' IN ('admin', 'super_admin'))
    WITH CHECK (auth.jwt() ->> 'role' IN ('admin', 'super_admin'));

DROP POLICY IF EXISTS "Authenticated users can view discount_master" ON public.discount_master;
CREATE POLICY "Authenticated users can view discount_master" ON public.discount_master
    FOR SELECT TO authenticated
    USING (is_active = true);

DROP POLICY IF EXISTS "Admins can manage user_discount_usage" ON public.user_discount_usage;
CREATE POLICY "Admins can manage user_discount_usage" ON public.user_discount_usage
    FOR ALL TO authenticated
    USING (auth.jwt() ->> 'role' IN ('admin', 'super_admin'))
    WITH CHECK (auth.jwt() ->> 'role' IN ('admin', 'super_admin'));

DROP POLICY IF EXISTS "Users can view own discount usage" ON public.user_discount_usage;
CREATE POLICY "Users can view own discount usage" ON public.user_discount_usage
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own discount usage" ON public.user_discount_usage;
CREATE POLICY "Users can insert own discount usage" ON public.user_discount_usage
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- 6. Seed initial customer discounts from the matrix
INSERT INTO public.discount_master (customer_type, coupon_code, discount_type, discount_value, description, start_date, end_date, max_usage, current_usage)
VALUES
('Beta Users', 'BETA50-Y2K7', 'PERCENTAGE', 50, '50% discount for Beta Users', NOW() - INTERVAL '1 day', NOW() + INTERVAL '1 year', 1000, 0),
('Student', 'STUDENT50-X9W2', 'PERCENTAGE', 50, '50% discount for Students', NOW() - INTERVAL '1 day', NOW() + INTERVAL '1 year', 5000, 0),
('School Bulk Purchase', 'SCHOOL60-A1Z8', 'PERCENTAGE', 60, '60% discount for School Bulk Purchase', NOW() - INTERVAL '1 day', NOW() + INTERVAL '1 year', 500, 0),
('College Bulk Purchase', 'COLLEGE40-B3C4', 'PERCENTAGE', 40, '40% discount for College Bulk Purchase', NOW() - INTERVAL '1 day', NOW() + INTERVAL '1 year', 500, 0),
('Institutions', 'INST35-D5E6', 'PERCENTAGE', 35, '35% discount for Institutional purchases', NOW() - INTERVAL '1 day', NOW() + INTERVAL '1 year', 1000, 0),
('Rural Karnataka Program', 'RURAL55-F7G8', 'PERCENTAGE', 55, '55% discount for Rural Karnataka Program', NOW() - INTERVAL '1 day', NOW() + INTERVAL '1 year', 2000, 0),
('Referral Program', 'REFERRAL-H9K0', 'FREE_MONTHS', 1, 'Free months extension for Referral Program (+1 month on monthly/quarterly, +2 months on annual)', NOW() - INTERVAL '1 day', NOW() + INTERVAL '1 year', 10000, 0),
('Renewal Customers', 'RENEW30-L1M2', 'PERCENTAGE', 30, '30% discount for Renewal Customers', NOW() - INTERVAL '1 day', NOW() + INTERVAL '1 year', 2000, 0),
('Launch Promotion', 'LAUNCH50-N3P4', 'PERCENTAGE', 50, '50% discount for Launch Promotion', NOW() - INTERVAL '1 day', NOW() + INTERVAL '1 year', 5000, 0),
('Ambassadors / Influencers / Moderators', 'AMB100-Q5R6', 'FREE_ACCESS', 100, '100% free access for Ambassadors, Influencers, and Moderators', NOW() - INTERVAL '1 day', NOW() + INTERVAL '1 year', 200, 0)
ON CONFLICT (coupon_code) DO NOTHING;
