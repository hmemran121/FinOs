-- Robust RLS Fix V3.1: Drop Policies First

-- 1. Disable RLS momentarily
ALTER TABLE ai_usage_logs DISABLE ROW LEVEL SECURITY;

-- 2. CRITICAL: Drop ALL policies that might depend on user_id BEFORE altering it
DROP POLICY IF EXISTS "Users can insert own ai logs" ON ai_usage_logs;
DROP POLICY IF EXISTS "Users can view own ai logs" ON ai_usage_logs;
DROP POLICY IF EXISTS "Super Admin View All AI Logs" ON ai_usage_logs;
DROP POLICY IF EXISTS "user_select_ai_usage_logs" ON ai_usage_logs;
DROP POLICY IF EXISTS "admin_select_bypass_ai_usage_logs" ON ai_usage_logs;

-- 3. Drop the DEFAULT constraint
ALTER TABLE ai_usage_logs ALTER COLUMN user_id DROP DEFAULT;

-- 4. Clean up 'unknown' values (cannot be cast to UUID)
DELETE FROM ai_usage_logs WHERE user_id = 'unknown' OR user_id IS NULL;

-- 5. Alter Type with strict casting
ALTER TABLE ai_usage_logs 
  ALTER COLUMN user_id TYPE UUID USING user_id::UUID;

-- 6. Re-Apply Default
ALTER TABLE ai_usage_logs ALTER COLUMN user_id SET DEFAULT auth.uid();

-- 7. Re-Enable RLS
ALTER TABLE ai_usage_logs ENABLE ROW LEVEL SECURITY;

-- 8. Apply Policies
CREATE POLICY "Users can insert own ai logs" 
ON ai_usage_logs 
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id
);

CREATE POLICY "Users can view own ai logs" 
ON ai_usage_logs 
FOR SELECT 
USING (
  auth.uid() = user_id
);

CREATE POLICY "Super Admin View All AI Logs" 
ON ai_usage_logs 
FOR SELECT 
USING (
  is_super_admin()
);
