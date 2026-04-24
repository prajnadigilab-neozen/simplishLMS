-- Migration V11: RLS Bypass for Service Role & Admins
-- Description: Updates RLS policies to explicitly allow the service_role and administrative roles to manage user progress and results.
-- Author: Antigravity

BEGIN;

-- 1. USER PROGRESS POLICIES
-- Update Update Policy
DROP POLICY IF EXISTS "Users can update their own progress" ON public.user_progress;
CREATE POLICY "Users can update their own progress" 
ON public.user_progress FOR UPDATE 
TO authenticated 
USING (
  (auth.uid() = user_id) OR 
  (auth.role() = 'service_role') OR
  (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'super_admin', 'moderator')))
);

-- Update Insert Policy
DROP POLICY IF EXISTS "Users can insert their own progress" ON public.user_progress;
CREATE POLICY "Users can insert their own progress" 
ON public.user_progress FOR INSERT 
TO authenticated 
WITH CHECK (
  (auth.uid() = user_id) OR 
  (auth.role() = 'service_role') OR
  (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'super_admin', 'moderator')))
);

-- 2. ASSESSMENT RESULTS POLICIES
-- Update Insert Policy
DROP POLICY IF EXISTS "Users can insert own results" ON public.assessment_results;
CREATE POLICY "Users can insert own results" 
ON public.assessment_results FOR INSERT 
TO authenticated 
WITH CHECK (
  (auth.uid() = user_id) OR 
  (auth.role() = 'service_role') OR
  (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'super_admin', 'moderator')))
);

COMMIT;

COMMENT ON TABLE public.user_progress IS 'Tracks student lesson completion. Policies updated in V11 to allow service_role bypass.';
