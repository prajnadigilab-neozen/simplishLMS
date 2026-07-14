-- Migration V15: Web-to-App Attribution System
-- Description: Creates the pending_attributions table to track APK downloads and attribute user installations.

CREATE TABLE IF NOT EXISTS public.pending_attributions (
    id SERIAL PRIMARY KEY,
    ip_address VARCHAR(45) NOT NULL,
    user_agent TEXT NOT NULL,
    utm_source VARCHAR(100),
    utm_medium VARCHAR(100),
    utm_campaign VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookup on attribution matching
CREATE INDEX IF NOT EXISTS idx_attribution_match ON public.pending_attributions (ip_address, created_at DESC);

-- Enable RLS on the table for security audit compliance
ALTER TABLE public.pending_attributions ENABLE ROW LEVEL SECURITY;

-- Allow anonymous insertion / service role full access
DROP POLICY IF EXISTS "Allow service role full access" ON public.pending_attributions;
CREATE POLICY "Allow service role full access" ON public.pending_attributions
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
