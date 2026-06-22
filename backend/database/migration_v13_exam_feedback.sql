-- Migration V13: Post-Exam Feedback Schema
-- Description: Creates the exam_feedback table to capture student satisfaction ratings, categorization tags, and sanitized comments.
-- Author: Antigravity

BEGIN;

-- 1. CREATE TABLE
CREATE TABLE IF NOT EXISTS public.exam_feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    exam_id UUID NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CONSTRAINT chk_rating CHECK (rating >= 1 AND rating <= 5),
    feedback_tags TEXT[] DEFAULT '{}'::TEXT[],
    comments VARCHAR(500),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. CREATE INDEXES
-- Idempotency protection: Enforce one feedback submission per user per exam
CREATE UNIQUE INDEX IF NOT EXISTS idx_exam_feedback_user_exam ON public.exam_feedback(user_id, exam_id);

-- Performance tuning: Fast lookups by exam
CREATE INDEX IF NOT EXISTS idx_exam_feedback_exam_id ON public.exam_feedback(exam_id);

-- Performance tuning: Fast queries for average rating aggregation
CREATE INDEX IF NOT EXISTS idx_exam_feedback_rating ON public.exam_feedback(rating);

-- Performance tuning: Compound index for admin/analytical rating queries filtered by exam
CREATE INDEX IF NOT EXISTS idx_exam_feedback_exam_rating ON public.exam_feedback(exam_id, rating);

-- 3. ENABLE ROW LEVEL SECURITY (RLS)
ALTER TABLE public.exam_feedback ENABLE ROW LEVEL SECURITY;

-- 4. CONFIGURE SECURITY POLICIES
-- Insert Policy: Authenticated users can insert their own feedback, or the backend service role
DROP POLICY IF EXISTS "Users can insert their own feedback" ON public.exam_feedback;
CREATE POLICY "Users can insert their own feedback"
ON public.exam_feedback FOR INSERT
TO authenticated
WITH CHECK (
    (auth.uid() = user_id) OR
    (auth.role() = 'service_role')
);

-- Select Policy: Users can view their own feedback; Admins, super admins, and moderators can view all feedback
DROP POLICY IF EXISTS "Users can view feedback" ON public.exam_feedback;
CREATE POLICY "Users can view feedback"
ON public.exam_feedback FOR SELECT
TO authenticated
USING (
    (auth.uid() = user_id) OR
    (auth.role() = 'service_role') OR
    (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'super_admin', 'moderator')))
);

COMMIT;

COMMENT ON TABLE public.exam_feedback IS 'Stores voluntary student feedback and ratings immediately after exam completion.';
