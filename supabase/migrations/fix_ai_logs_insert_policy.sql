-- FIX: Missing INSERT Policy for AI Usage Logs
-- This resolves the 403 Forbidden error during sync

-- Drop existing INSERT policy if it exists (for clean re-run)
DROP POLICY IF EXISTS "Users can insert own ai logs" ON ai_usage_logs;
DROP POLICY IF EXISTS "user_insert_ai_usage_logs" ON ai_usage_logs;

-- Create INSERT Policy
-- Crucial: CHECK that the row being inserted belongs to the authenticated user
CREATE POLICY "user_insert_ai_usage_logs" ON ai_usage_logs
FOR INSERT
WITH CHECK (
    auth.uid() = user_id
);

-- OPTIONAL: Add UPDATE policy just in case (though logs are usually append-only)
DROP POLICY IF EXISTS "Users can update own ai logs" ON ai_usage_logs;
CREATE POLICY "user_update_ai_usage_logs" ON ai_usage_logs
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Force cache reload
NOTIFY pgrst, 'reload schema';
