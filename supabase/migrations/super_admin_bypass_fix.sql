/**
 * Super Admin RLS Bypass Fix
 * 
 * This script ensures that users marked as 'is_super_admin' in the profiles table
 * can see all data across all tables, bypassing strict data isolation.
 */

-- 1. Create a security-definer function to check admin status
-- This function is NOT subject to RLS on the profiles table
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND is_super_admin = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Define a function to apply bypass policies to a table
CREATE OR REPLACE FUNCTION public.apply_admin_bypass(p_table_name TEXT, p_uid_column TEXT DEFAULT 'user_id')
RETURNS VOID AS $$
BEGIN
    -- Enable RLS
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', p_table_name);

    -- Drop existing restrictive policies (standard names)
    EXECUTE format('DROP POLICY IF EXISTS "Users can view own %s" ON %I', p_table_name, p_table_name);
    EXECUTE format('DROP POLICY IF EXISTS "user_select_%s" ON %I', p_table_name, p_table_name);
    
    -- Create Bypass SELECT Policy
    EXECUTE format('
        CREATE POLICY "admin_select_bypass_%s" ON %I
        FOR SELECT
        USING (auth.uid() = %I OR is_super_admin())
    ', p_table_name, p_table_name, p_uid_column);

    -- Drop existing UPDATE policies
    EXECUTE format('DROP POLICY IF EXISTS "Users can update own %s" ON %I', p_table_name, p_table_name);
    EXECUTE format('DROP POLICY IF EXISTS "user_update_%s" ON %I', p_table_name, p_table_name);

    -- Create Bypass UPDATE Policy
    EXECUTE format('
        CREATE POLICY "admin_update_bypass_%s" ON %I
        FOR UPDATE
        USING (auth.uid() = %I OR is_super_admin())
        WITH CHECK (auth.uid() = %I OR is_super_admin())
    ', p_table_name, p_table_name, p_uid_column, p_uid_column);

    -- Drop existing DELETE policies
    EXECUTE format('DROP POLICY IF EXISTS "Users can delete own %s" ON %I', p_table_name, p_table_name);
    EXECUTE format('DROP POLICY IF EXISTS "user_delete_%s" ON %I', p_table_name, p_table_name);

    -- Create Bypass DELETE Policy
    EXECUTE format('
        CREATE POLICY "admin_delete_bypass_%s" ON %I
        FOR DELETE
        USING (auth.uid() = %I OR is_super_admin())
    ', p_table_name, p_table_name, p_uid_column);

END;
$$ LANGUAGE plpgsql;

-- 3. Apply to all relevant tables
SELECT apply_admin_bypass('profiles', 'id');
SELECT apply_admin_bypass('wallets');
SELECT apply_admin_bypass('channels');
SELECT apply_admin_bypass('transactions');
SELECT apply_admin_bypass('financial_plans');
SELECT apply_admin_bypass('financial_plan_components');
SELECT apply_admin_bypass('financial_plan_settlements');
SELECT apply_admin_bypass('budgets');
SELECT apply_admin_bypass('commitments');
SELECT apply_admin_bypass('notifications');
SELECT apply_admin_bypass('categories_user');
SELECT apply_admin_bypass('ai_usage_logs');
SELECT apply_admin_bypass('ai_memories');

-- 4. Reload Schema Cache
NOTIFY pgrst, 'reload schema';
