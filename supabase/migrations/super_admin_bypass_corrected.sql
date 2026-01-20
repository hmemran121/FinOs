/**
 * Super Admin RLS Bypass Fix - CORRECTED VERSION
 * Fixes type casting issues between UUID and TEXT
 */

-- 1. Create security definer function to check admin status
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()::text
    AND (is_super_admin = true OR is_super_admin = 1)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Apply bypass to transactions
DROP POLICY IF EXISTS "Users can view own transactions" ON transactions;
DROP POLICY IF EXISTS "user_select_transactions" ON transactions;
DROP POLICY IF EXISTS "admin_select_bypass_transactions" ON transactions;

CREATE POLICY "admin_select_bypass_transactions" ON transactions
FOR SELECT
USING (auth.uid() = user_id::uuid OR is_super_admin());

-- 3. Apply bypass to wallets
DROP POLICY IF EXISTS "Users can view own wallets" ON wallets;
DROP POLICY IF EXISTS "user_select_wallets" ON wallets;
DROP POLICY IF EXISTS "admin_select_bypass_wallets" ON wallets;

CREATE POLICY "admin_select_bypass_wallets" ON wallets
FOR SELECT
USING (auth.uid() = user_id::uuid OR is_super_admin());

-- 4. Apply bypass to channels
DROP POLICY IF EXISTS "Users can view own channels" ON channels;
DROP POLICY IF EXISTS "user_select_channels" ON channels;
DROP POLICY IF EXISTS "admin_select_bypass_channels" ON channels;

CREATE POLICY "admin_select_bypass_channels" ON channels
FOR SELECT
USING (auth.uid() = user_id::uuid OR is_super_admin());

-- 5. Apply bypass to financial_plans
DROP POLICY IF EXISTS "Users can view own plans" ON financial_plans;
DROP POLICY IF EXISTS "user_select_financial_plans" ON financial_plans;
DROP POLICY IF EXISTS "admin_select_bypass_financial_plans" ON financial_plans;

CREATE POLICY "admin_select_bypass_financial_plans" ON financial_plans
FOR SELECT
USING (auth.uid() = user_id::uuid OR is_super_admin());

-- 6. Apply bypass to financial_plan_components
DROP POLICY IF EXISTS "Users can view own plan components" ON financial_plan_components;
DROP POLICY IF EXISTS "user_select_financial_plan_components" ON financial_plan_components;
DROP POLICY IF EXISTS "admin_select_bypass_financial_plan_components" ON financial_plan_components;

CREATE POLICY "admin_select_bypass_financial_plan_components" ON financial_plan_components
FOR SELECT
USING (auth.uid() = user_id::uuid OR is_super_admin());

-- 7. Apply bypass to financial_plan_settlements
DROP POLICY IF EXISTS "Users can view own settlements" ON financial_plan_settlements;
DROP POLICY IF EXISTS "user_select_financial_plan_settlements" ON financial_plan_settlements;
DROP POLICY IF EXISTS "admin_select_bypass_financial_plan_settlements" ON financial_plan_settlements;

CREATE POLICY "admin_select_bypass_financial_plan_settlements" ON financial_plan_settlements
FOR SELECT
USING (auth.uid() = user_id::uuid OR is_super_admin());

-- 8. Apply bypass to budgets
DROP POLICY IF EXISTS "Users can view own budgets" ON budgets;
DROP POLICY IF EXISTS "user_select_budgets" ON budgets;
DROP POLICY IF EXISTS "admin_select_bypass_budgets" ON budgets;

CREATE POLICY "admin_select_bypass_budgets" ON budgets
FOR SELECT
USING (auth.uid() = user_id::uuid OR is_super_admin());

-- 9. Apply bypass to commitments
DROP POLICY IF EXISTS "Users can view own commitments" ON commitments;
DROP POLICY IF EXISTS "user_select_commitments" ON commitments;
DROP POLICY IF EXISTS "admin_select_bypass_commitments" ON commitments;

CREATE POLICY "admin_select_bypass_commitments" ON commitments
FOR SELECT
USING (auth.uid() = user_id::uuid OR is_super_admin());

-- 10. Apply bypass to notifications
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
DROP POLICY IF EXISTS "user_select_notifications" ON notifications;
DROP POLICY IF EXISTS "admin_select_bypass_notifications" ON notifications;

CREATE POLICY "admin_select_bypass_notifications" ON notifications
FOR SELECT
USING (auth.uid() = user_id::uuid OR is_super_admin());

-- 11. Apply bypass to categories_user
DROP POLICY IF EXISTS "Users can view own categories" ON categories_user;
DROP POLICY IF EXISTS "user_select_categories_user" ON categories_user;
DROP POLICY IF EXISTS "admin_select_bypass_categories_user" ON categories_user;

CREATE POLICY "admin_select_bypass_categories_user" ON categories_user
FOR SELECT
USING (auth.uid() = user_id::uuid OR is_super_admin());

-- 12. Apply bypass to ai_usage_logs
DROP POLICY IF EXISTS "Users can view own ai logs" ON ai_usage_logs;
DROP POLICY IF EXISTS "user_select_ai_usage_logs" ON ai_usage_logs;
DROP POLICY IF EXISTS "admin_select_bypass_ai_usage_logs" ON ai_usage_logs;

CREATE POLICY "admin_select_bypass_ai_usage_logs" ON ai_usage_logs
FOR SELECT
USING (auth.uid() = user_id::uuid OR is_super_admin());

-- 13. Apply bypass to ai_memories
DROP POLICY IF EXISTS "Users can view own ai memories" ON ai_memories;
DROP POLICY IF EXISTS "user_select_ai_memories" ON ai_memories;
DROP POLICY IF EXISTS "admin_select_bypass_ai_memories" ON ai_memories;

CREATE POLICY "admin_select_bypass_ai_memories" ON ai_memories
FOR SELECT
USING (auth.uid() = user_id::uuid OR is_super_admin());

-- 14. Profiles (special case - id column instead of user_id)
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "user_select_profiles" ON profiles;
DROP POLICY IF EXISTS "admin_select_bypass_profiles" ON profiles;

CREATE POLICY "admin_select_bypass_profiles" ON profiles
FOR SELECT
USING (auth.uid()::text = id OR is_super_admin());

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
