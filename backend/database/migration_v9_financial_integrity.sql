-- Migration V9: Financial Integrity & GST Compliance
-- Description: Migrates Rupee/Float currency to Paise/BigInt, handles GST breakdown, and back-calculates historical data.

BEGIN;

-- 1. Add State column to users and set default
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS state TEXT DEFAULT 'Karnataka';

-- 2. Modify payments table for Paise math & Tax breakdown
-- Drop dependent views first to allow modification
DROP VIEW IF EXISTS public.revenue_summary CASCADE;

-- Rename column first to keep path clear
ALTER TABLE public.payments RENAME COLUMN amount TO amount_temp;
ALTER TABLE public.payments ADD COLUMN amount_paise BIGINT;
ALTER TABLE public.payments ADD COLUMN taxable_amount_paise BIGINT;
ALTER TABLE public.payments ADD COLUMN cgst_paise BIGINT DEFAULT 0;
ALTER TABLE public.payments ADD COLUMN sgst_paise BIGINT DEFAULT 0;
ALTER TABLE public.payments ADD COLUMN igst_paise BIGINT DEFAULT 0;
ALTER TABLE public.payments ADD COLUMN gst_rate NUMERIC DEFAULT 18;
ALTER TABLE public.payments ADD COLUMN invoice_no TEXT;
ALTER TABLE public.payments ADD COLUMN state TEXT;

-- 3. Back-calculate historical data (Assuming 18% GST inclusive)
-- Formula: Taxable = Total / 1.18
UPDATE public.payments 
SET 
    amount_paise = (amount_temp * 100)::BIGINT,
    taxable_amount_paise = ((amount_temp * 100) / 1.18)::BIGINT,
    igst_paise = (amount_temp * 100)::BIGINT - ((amount_temp * 100) / 1.18)::BIGINT,
    gst_rate = 18,
    state = 'Inter-state (Historical)'
WHERE amount_temp IS NOT NULL;

-- Remove temp column
ALTER TABLE public.payments DROP COLUMN amount_temp;

-- 4. Migrate User Wallet to Paise
ALTER TABLE public.users RENAME COLUMN wallet_balance TO wallet_balance_temp;
ALTER TABLE public.users ADD COLUMN wallet_balance BIGINT DEFAULT 0;

UPDATE public.users 
SET wallet_balance = (COALESCE(wallet_balance_temp, 0) * 100)::BIGINT;

ALTER TABLE public.users DROP COLUMN wallet_balance_temp;

-- 5. Update Atomic Wallet Function for BIGINT
CREATE OR REPLACE FUNCTION increment_wallet(row_id UUID, amount_paise BIGINT)
RETURNS VOID AS $$
BEGIN
    UPDATE users 
    SET wallet_balance = COALESCE(wallet_balance, 0) + amount_paise 
    WHERE id = row_id;
END;
$$ LANGUAGE plpgsql;

-- 6. Seed Financial Settings
INSERT INTO public.settings (key, value) VALUES 
('gst_rate', '18'),
('cgst_rate', '9'),
('sgst_rate', '9'),
('base_state', 'Karnataka'),
('invoice_prefix', 'Lab-SL/26-27/'),
('invoice_enabled', 'true'),
('next_invoice_number', '1')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- 7. Recreate revenue_summary view with Paise-aware logic
CREATE OR REPLACE VIEW public.revenue_summary AS
SELECT 
    COUNT(*) as total_transactions,
    COALESCE(SUM(amount_paise), 0)::NUMERIC / 100 as total_revenue_gross,
    COALESCE(SUM(taxable_amount_paise), 0)::NUMERIC / 100 as total_revenue_net,
    COALESCE(SUM(cgst_paise + sgst_paise + igst_paise), 0)::NUMERIC / 100 as total_tax_collected
FROM public.payments
WHERE status = 'completed';

COMMIT;

COMMENT ON COLUMN public.payments.amount_paise IS 'Transaction amount in Paise (Integer) to prevent decimal leakage.';
COMMENT ON COLUMN public.users.wallet_balance IS 'User wallet balance in Paise (Integer).';
