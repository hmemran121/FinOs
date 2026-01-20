/**
 * Supabase RLS (Row Level Security) Migration
 * 
 * Purpose: Ensure users can only access their own data
 * 
 * What this does:
 * 1. Enables RLS on all user-scoped tables
 * 2. Creates policies to restrict access to user's own data
 * 3. Ensures data isolation between users
 * 
 * Run this in Supabase SQL Editor
 */

-- ========================================
-- ENABLE RLS ON ALL USER-SCOPED TABLES
-- ========================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_plan_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_plan_settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE commitments ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories_user ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_memories ENABLE ROW LEVEL SECURITY;

-- ========================================
-- DROP EXISTING POLICIES (IF ANY)
-- ========================================

-- Profiles
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can delete own profile" ON profiles;

-- Wallets
DROP POLICY IF EXISTS "Users can view own wallets" ON wallets;
DROP POLICY IF EXISTS "Users can insert own wallets" ON wallets;
DROP POLICY IF EXISTS "Users can update own wallets" ON wallets;
DROP POLICY IF EXISTS "Users can delete own wallets" ON wallets;

-- Channels
DROP POLICY IF EXISTS "Users can view own channels" ON channels;
DROP POLICY IF EXISTS "Users can insert own channels" ON channels;
DROP POLICY IF EXISTS "Users can update own channels" ON channels;
DROP POLICY IF EXISTS "Users can delete own channels" ON channels;

-- Transactions
DROP POLICY IF EXISTS "Users can view own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can insert own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can update own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can delete own transactions" ON transactions;

-- Financial Plans
DROP POLICY IF EXISTS "Users can view own plans" ON financial_plans;
DROP POLICY IF EXISTS "Users can insert own plans" ON financial_plans;
DROP POLICY IF EXISTS "Users can update own plans" ON financial_plans;
DROP POLICY IF EXISTS "Users can delete own plans" ON financial_plans;

-- Financial Plan Components
DROP POLICY IF EXISTS "Users can view own plan components" ON financial_plan_components;
DROP POLICY IF EXISTS "Users can insert own plan components" ON financial_plan_components;
DROP POLICY IF EXISTS "Users can update own plan components" ON financial_plan_components;
DROP POLICY IF EXISTS "Users can delete own plan components" ON financial_plan_components;

-- Financial Plan Settlements
DROP POLICY IF EXISTS "Users can view own settlements" ON financial_plan_settlements;
DROP POLICY IF EXISTS "Users can insert own settlements" ON financial_plan_settlements;
DROP POLICY IF EXISTS "Users can update own settlements" ON financial_plan_settlements;
DROP POLICY IF EXISTS "Users can delete own settlements" ON financial_plan_settlements;

-- Budgets
DROP POLICY IF EXISTS "Users can view own budgets" ON budgets;
DROP POLICY IF EXISTS "Users can insert own budgets" ON budgets;
DROP POLICY IF EXISTS "Users can update own budgets" ON budgets;
DROP POLICY IF EXISTS "Users can delete own budgets" ON budgets;

-- Commitments
DROP POLICY IF EXISTS "Users can view own commitments" ON commitments;
DROP POLICY IF EXISTS "Users can insert own commitments" ON commitments;
DROP POLICY IF EXISTS "Users can update own commitments" ON commitments;
DROP POLICY IF EXISTS "Users can delete own commitments" ON commitments;

-- Notifications
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can insert own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can delete own notifications" ON notifications;

-- Categories User
DROP POLICY IF EXISTS "Users can view own categories" ON categories_user;
DROP POLICY IF EXISTS "Users can insert own categories" ON categories_user;
DROP POLICY IF EXISTS "Users can update own categories" ON categories_user;
DROP POLICY IF EXISTS "Users can delete own categories" ON categories_user;

-- AI Usage Logs
DROP POLICY IF EXISTS "Users can view own ai logs" ON ai_usage_logs;
DROP POLICY IF EXISTS "Users can insert own ai logs" ON ai_usage_logs;
DROP POLICY IF EXISTS "Users can update own ai logs" ON ai_usage_logs;
DROP POLICY IF EXISTS "Users can delete own ai logs" ON ai_usage_logs;

-- AI Memories
DROP POLICY IF EXISTS "Users can view own ai memories" ON ai_memories;
DROP POLICY IF EXISTS "Users can insert own ai memories" ON ai_memories;
DROP POLICY IF EXISTS "Users can update own ai memories" ON ai_memories;
DROP POLICY IF EXISTS "Users can delete own ai memories" ON ai_memories;

-- ========================================
-- CREATE RLS POLICIES
-- ========================================

-- PROFILES
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can delete own profile"
  ON profiles FOR DELETE
  USING (auth.uid() = id);

-- WALLETS
CREATE POLICY "Users can view own wallets"
  ON wallets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own wallets"
  ON wallets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own wallets"
  ON wallets FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own wallets"
  ON wallets FOR DELETE
  USING (auth.uid() = user_id);

-- CHANNELS
CREATE POLICY "Users can view own channels"
  ON channels FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own channels"
  ON channels FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own channels"
  ON channels FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own channels"
  ON channels FOR DELETE
  USING (auth.uid() = user_id);

-- TRANSACTIONS
CREATE POLICY "Users can view own transactions"
  ON transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transactions"
  ON transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own transactions"
  ON transactions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own transactions"
  ON transactions FOR DELETE
  USING (auth.uid() = user_id);

-- FINANCIAL PLANS
CREATE POLICY "Users can view own plans"
  ON financial_plans FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own plans"
  ON financial_plans FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own plans"
  ON financial_plans FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own plans"
  ON financial_plans FOR DELETE
  USING (auth.uid() = user_id);

-- FINANCIAL PLAN COMPONENTS
CREATE POLICY "Users can view own plan components"
  ON financial_plan_components FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own plan components"
  ON financial_plan_components FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own plan components"
  ON financial_plan_components FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own plan components"
  ON financial_plan_components FOR DELETE
  USING (auth.uid() = user_id);

-- FINANCIAL PLAN SETTLEMENTS
CREATE POLICY "Users can view own settlements"
  ON financial_plan_settlements FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own settlements"
  ON financial_plan_settlements FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own settlements"
  ON financial_plan_settlements FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own settlements"
  ON financial_plan_settlements FOR DELETE
  USING (auth.uid() = user_id);

-- BUDGETS
CREATE POLICY "Users can view own budgets"
  ON budgets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own budgets"
  ON budgets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own budgets"
  ON budgets FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own budgets"
  ON budgets FOR DELETE
  USING (auth.uid() = user_id);

-- COMMITMENTS
CREATE POLICY "Users can view own commitments"
  ON commitments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own commitments"
  ON commitments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own commitments"
  ON commitments FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own commitments"
  ON commitments FOR DELETE
  USING (auth.uid() = user_id);

-- NOTIFICATIONS
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notifications"
  ON notifications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own notifications"
  ON notifications FOR DELETE
  USING (auth.uid() = user_id);

-- CATEGORIES USER
CREATE POLICY "Users can view own categories"
  ON categories_user FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own categories"
  ON categories_user FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own categories"
  ON categories_user FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own categories"
  ON categories_user FOR DELETE
  USING (auth.uid() = user_id);

-- AI USAGE LOGS
CREATE POLICY "Users can view own ai logs"
  ON ai_usage_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own ai logs"
  ON ai_usage_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own ai logs"
  ON ai_usage_logs FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own ai logs"
  ON ai_usage_logs FOR DELETE
  USING (auth.uid() = user_id);

-- AI MEMORIES
CREATE POLICY "Users can view own ai memories"
  ON ai_memories FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own ai memories"
  ON ai_memories FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own ai memories"
  ON ai_memories FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own ai memories"
  ON ai_memories FOR DELETE
  USING (auth.uid() = user_id);

-- ========================================
-- VERIFICATION
-- ========================================

-- Check RLS status
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'profiles', 'wallets', 'channels', 'transactions',
    'financial_plans', 'financial_plan_components', 'financial_plan_settlements',
    'budgets', 'commitments', 'notifications', 'categories_user',
    'ai_usage_logs', 'ai_memories'
  )
ORDER BY tablename;

-- Check policies
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd as operation
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
