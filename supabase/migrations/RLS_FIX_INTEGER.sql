-- FINAL FIX: Handle INTEGER is_super_admin column
-- Run this in Supabase SQL Editor

-- Step 1: Create is_super_admin function (INTEGER version)
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND is_super_admin = 1  -- INTEGER comparison, not BOOLEAN
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 2: Apply bypass policies

-- TRANSACTIONS
DROP POLICY IF EXISTS "Users can view own transactions" ON transactions;
DROP POLICY IF EXISTS "user_select_transactions" ON transactions;
DROP POLICY IF EXISTS "admin_select_bypass_transactions" ON transactions;

CREATE POLICY "admin_select_bypass_transactions" ON transactions
FOR SELECT
USING (user_id = auth.uid() OR is_super_admin());

-- WALLETS  
DROP POLICY IF EXISTS "Users can view own wallets" ON wallets;
DROP POLICY IF EXISTS "user_select_wallets" ON wallets;
DROP POLICY IF EXISTS "admin_select_bypass_wallets" ON wallets;

CREATE POLICY "admin_select_bypass_wallets" ON wallets
FOR SELECT
USING (user_id = auth.uid() OR is_super_admin());

-- CHANNELS
DROP POLICY IF EXISTS "Users can view own channels" ON channels;
DROP POLICY IF EXISTS "user_select_channels" ON channels;
DROP POLICY IF EXISTS "admin_select_bypass_channels" ON channels;

CREATE POLICY "admin_select_bypass_channels" ON channels
FOR SELECT
USING (user_id = auth.uid() OR is_super_admin());

-- FINANCIAL_PLANS
DROP POLICY IF EXISTS "Users can view own plans" ON financial_plans;
DROP POLICY IF EXISTS "user_select_financial_plans" ON financial_plans;
DROP POLICY IF EXISTS "admin_select_bypass_financial_plans" ON financial_plans;

CREATE POLICY "admin_select_bypass_financial_plans" ON financial_plans
FOR SELECT
USING (user_id = auth.uid() OR is_super_admin());

-- FINANCIAL_PLAN_COMPONENTS
DROP POLICY IF EXISTS "Users can view own plan components" ON financial_plan_components;
DROP POLICY IF EXISTS "user_select_financial_plan_components" ON financial_plan_components;
DROP POLICY IF EXISTS "admin_select_bypass_financial_plan_components" ON financial_plan_components;

CREATE POLICY "admin_select_bypass_financial_plan_components" ON financial_plan_components
FOR SELECT
USING (user_id = auth.uid() OR is_super_admin());

-- FINANCIAL_PLAN_SETTLEMENTS
DROP POLICY IF EXISTS "Users can view own settlements" ON financial_plan_settlements;
DROP POLICY IF EXISTS "user_select_financial_plan_settlements" ON financial_plan_settlements;
DROP POLICY IF EXISTS "admin_select_bypass_financial_plan_settlements" ON financial_plan_settlements;

CREATE POLICY "admin_select_bypass_financial_plan_settlements" ON financial_plan_settlements
FOR SELECT
USING (user_id = auth.uid() OR is_super_admin());

-- BUDGETS
DROP POLICY IF EXISTS "Users can view own budgets" ON budgets;
DROP POLICY IF EXISTS "user_select_budgets" ON budgets;
DROP POLICY IF EXISTS "admin_select_bypass_budgets" ON budgets;

CREATE POLICY "admin_select_bypass_budgets" ON budgets
FOR SELECT
USING (user_id = auth.uid() OR is_super_admin());

-- COMMITMENTS
DROP POLICY IF EXISTS "Users can view own commitments" ON commitments;
DROP POLICY IF EXISTS "user_select_commitments" ON commitments;
DROP POLICY IF EXISTS "admin_select_bypass_commitments" ON commitments;

CREATE POLICY "admin_select_bypass_commitments" ON commitments
FOR SELECT
USING (user_id = auth.uid() OR is_super_admin());

-- NOTIFICATIONS
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
DROP POLICY IF EXISTS "user_select_notifications" ON notifications;
DROP POLICY IF EXISTS "admin_select_bypass_notifications" ON notifications;

CREATE POLICY "admin_select_bypass_notifications" ON notifications
FOR SELECT
USING (user_id = auth.uid() OR is_super_admin());

-- CATEGORIES_USER
DROP POLICY IF EXISTS "Users can view own categories" ON categories_user;
DROP POLICY IF EXISTS "user_select_categories_user" ON categories_user;
DROP POLICY IF EXISTS "admin_select_bypass_categories_user" ON categories_user;

CREATE POLICY "admin_select_bypass_categories_user" ON categories_user
FOR SELECT
USING (user_id = auth.uid() OR is_super_admin());

-- AI_USAGE_LOGS
DROP POLICY IF EXISTS "Users can view own ai logs" ON ai_usage_logs;
DROP POLICY IF EXISTS "user_select_ai_usage_logs" ON ai_usage_logs;
DROP POLICY IF EXISTS "admin_select_bypass_ai_usage_logs" ON ai_usage_logs;

CREATE POLICY "admin_select_bypass_ai_usage_logs" ON ai_usage_logs
FOR SELECT
USING (user_id = auth.uid() OR is_super_admin());

-- AI_MEMORIES
DROP POLICY IF EXISTS "Users can view own ai memories" ON ai_memories;
DROP POLICY IF EXISTS "user_select_ai_memories" ON ai_memories;
DROP POLICY IF EXISTS "admin_select_bypass_ai_memories" ON ai_memories;

CREATE POLICY "admin_select_bypass_ai_memories" ON ai_memories
FOR SELECT
USING (user_id = auth.uid() OR is_super_admin());

-- PROFILES
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "user_select_profiles" ON profiles;
DROP POLICY IF EXISTS "admin_select_bypass_profiles" ON profiles;

CREATE POLICY "admin_select_bypass_profiles" ON profiles
FOR SELECT
USING (id = auth.uid() OR is_super_admin());

-- Reload schema
NOTIFY pgrst, 'reload schema';
