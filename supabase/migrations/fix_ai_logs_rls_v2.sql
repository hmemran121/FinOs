-- Fix RLS Policy for ai_usage_logs to use native UUID comparison
-- This resolves the "new row violates row-level security policy" error

ALTER TABLE ai_usage_logs ENABLE ROW LEVEL SECURITY;

-- Ensure user_id is UUID
ALTER TABLE ai_usage_logs 
  ALTER COLUMN user_id TYPE UUID USING user_id::UUID;

-- 1. INSERT Policy
DROP POLICY IF EXISTS "Users can insert own ai logs" ON ai_usage_logs;
CREATE POLICY "Users can insert own ai logs" 
ON ai_usage_logs 
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id
);

-- 2. SELECT Policy
DROP POLICY IF EXISTS "Users can view own ai logs" ON ai_usage_logs;
CREATE POLICY "Users can view own ai logs" 
ON ai_usage_logs 
FOR SELECT 
USING (
  auth.uid() = user_id
);

-- 3. BYPASS for Admins (Optional but good for support)
-- Ensure Super Admins can view all logs
DROP POLICY IF EXISTS "Super Admin View All AI Logs" ON ai_usage_logs;
CREATE POLICY "Super Admin View All AI Logs" 
ON ai_usage_logs 
FOR SELECT 
USING (
  is_super_admin()
);
