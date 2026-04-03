-- ==========================================
-- SECURITY: ROW LEVEL SECURITY (v5)
-- ==========================================

-- 1. Enable RLS on core tables
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_logs ENABLE ROW LEVEL SECURITY;

-- 2. USER PROGRESS POLICIES
-- Students: Can only see their OWN progress
CREATE POLICY "Users can view their own progress" 
ON user_progress FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own progress" 
ON user_progress FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own progress" 
ON user_progress FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Admins/Moderators: Can see ALL progress (service role is already bypassing, but for clarity)
CREATE POLICY "Admins can view all progress" 
ON user_progress FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND (users.role = 'admin' OR users.role = 'moderator' OR users.role = 'super_admin')
  )
);

-- 3. ASSESSMENT RESULTS POLICIES
CREATE POLICY "Users can view their own results" 
ON assessment_results FOR SELECT 
USING (auth.uid() = user_id);

-- 4. PAYMENTS POLICIES
CREATE POLICY "Users can view their own payments" 
ON payments FOR SELECT 
USING (auth.uid() = user_id);

-- 5. SYSTEM LOGS POLICIES
CREATE POLICY "Admins can view system logs" 
ON system_logs FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND (users.role = 'super_admin')
  )
);
