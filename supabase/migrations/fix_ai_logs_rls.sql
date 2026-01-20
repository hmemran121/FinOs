-- Enable RLS on ai_usage_logs
ALTER TABLE ai_usage_logs ENABLE ROW LEVEL SECURITY;

-- Ensure user_id column exists (Safety Check)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_usage_logs' AND column_name = 'user_id') THEN 
        ALTER TABLE ai_usage_logs ADD COLUMN user_id UUID DEFAULT auth.uid(); 
    END IF; 
END $$;

-- 1. Regular User Policies
-- Allow users to INSERT their own logs (CRITICAL)
DROP POLICY IF EXISTS "Users can insert own ai logs" ON ai_usage_logs;
CREATE POLICY "Users can insert own ai logs" ON ai_usage_logs FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Allow users to view their own logs
DROP POLICY IF EXISTS "Users can view own ai logs" ON ai_usage_logs;
CREATE POLICY "Users can view own ai logs" ON ai_usage_logs FOR SELECT
USING (auth.uid() = user_id);

-- 2. Super Admin Policies
-- Allow Super Admins to view ALL logs (Bypass)
DROP POLICY IF EXISTS "Super Admin View All AI Logs" ON ai_usage_logs;
CREATE POLICY "Super Admin View All AI Logs" ON ai_usage_logs FOR SELECT
USING (
  public.is_super_admin()
);

-- Note: user_id is populated locally by the app now.
