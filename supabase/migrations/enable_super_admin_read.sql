-- Allow Super Admins to READ (SELECT) all user data tables
-- This enables Remote View without necessitating Local Sync (if Sync is scoped)

CREATE OR REPLACE FUNCTION is_super_admin() RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND is_super_admin = 1
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- 1. Transactions
DROP POLICY IF EXISTS "Users can view own transactions" ON transactions;
CREATE POLICY "Users can view own transactions" ON transactions
FOR SELECT USING (auth.uid() = user_id OR is_super_admin());

-- 2. Wallets
DROP POLICY IF EXISTS "Users can view own wallets" ON wallets;
CREATE POLICY "Users can view own wallets" ON wallets
FOR SELECT USING (auth.uid() = user_id OR is_super_admin());

-- 3. Commitments
DROP POLICY IF EXISTS "Users can view own commitments" ON commitments;
CREATE POLICY "Users can view own commitments" ON commitments
FOR SELECT USING (auth.uid() = user_id OR is_super_admin());

-- 4. Financial Plans
DROP POLICY IF EXISTS "Users can view own plans" ON financial_plans;
CREATE POLICY "Users can view own plans" ON financial_plans
FOR SELECT USING (auth.uid() = user_id OR is_super_admin());

-- 5. AI Usage Logs
DROP POLICY IF EXISTS "Users can view own ai logs" ON ai_usage_logs;
CREATE POLICY "Users can view own ai logs" ON ai_usage_logs
FOR SELECT USING (auth.uid() = user_id OR is_super_admin());
