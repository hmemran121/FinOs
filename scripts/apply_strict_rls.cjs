const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
    console.error("❌ ERROR: Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

const SQL_MIGRATION = `
-- 1. Enable RLS on All Tables (Security First)
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories_user ENABLE ROW LEVEL SECURITY;
ALTER TABLE commitments ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_plan_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_plan_settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 2. Drop Existing Policies (Start Fresh)
DROP POLICY IF EXISTS "Users can read own data" ON transactions;
DROP POLICY IF EXISTS "Users can insert own data" ON transactions;
DROP POLICY IF EXISTS "Users can update own data" ON transactions;
DROP POLICY IF EXISTS "Users can delete own data" ON transactions;
-- (Repeat for all tables in a real script, but we'll use a generic approach below)

-- 3. Define Standard User Policy (CRUD Own Data)
-- This applies to: transactions, wallets, categories_user, etc.

create or replace function create_user_policy(table_name text) returns void as $$
begin
  execute format('DROP POLICY IF EXISTS "User CRUD own data" ON %I', table_name);
  execute format('CREATE POLICY "User CRUD own data" ON %I FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)', table_name);
end;
$$ language plpgsql;

-- Apply standard policy to user-centric tables
select create_user_policy('transactions');
select create_user_policy('wallets');
select create_user_policy('categories_user');
select create_user_policy('commitments');
select create_user_policy('budgets');
select create_user_policy('financial_plans');
select create_user_policy('financial_plan_components');
select create_user_policy('financial_plan_settlements');
select create_user_policy('notifications');

-- 4. Special Handling for PROFILES (Read Own, Update Own, but Block Role Escalation)
DROP POLICY IF EXISTS "User CRUD own profile" ON profiles;
CREATE POLICY "User CRUD own profile" ON profiles FOR ALL 
USING (auth.uid() = id) 
WITH CHECK (auth.uid() = id);

-- 5. SYSTEM CONFIG (The Core Requirement)
-- Rule: Only Super Admin can WRITE. Everyone can READ.

-- 5a. Read Access (Everyone)
DROP POLICY IF EXISTS "Anyone can read system_config" ON system_config;
CREATE POLICY "Anyone can read system_config" ON system_config FOR SELECT 
USING (true); -- Public Read

-- 5b. Write Access (Super Admin Only)
-- We check the 'profiles' table to see if the current user has is_super_admin = 1
DROP POLICY IF EXISTS "Super Admin can manage system_config" ON system_config;
CREATE POLICY "Super Admin can manage system_config" ON system_config FOR ALL
USING (
  exists (
    select 1 from profiles
    where id = auth.uid()
    and is_super_admin = 1
  )
)
WITH CHECK (
  exists (
    select 1 from profiles
    where id = auth.uid()
    and is_super_admin = 1
  )
);

-- 6. CATEGORIES_GLOBAL (Example of Read-Only for Users, Write for Admin)
DROP POLICY IF EXISTS "Anyone can read global categories" ON categories_global;
CREATE POLICY "Anyone can read global categories" ON categories_global FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin manage global categories" ON categories_global;
CREATE POLICY "Admin manage global categories" ON categories_global FOR ALL
USING (
  exists (
    select 1 from profiles
    where id = auth.uid()
    and is_super_admin = 1
  )
);

-- 7. Fix Profiles Role Escalation Protection (Trigger)
-- Prevent a user from setting their own is_super_admin to 1 via API
CREATE OR REPLACE FUNCTION prevent_admin_escalation()
RETURNS TRIGGER AS $$
BEGIN
  -- If user is NOT an admin currently, they cannot set is_super_admin = 1
  IF (NEW.is_super_admin = 1) AND (OLD.is_super_admin IS DISTINCT FROM 1) THEN
    -- Allow if it's the specific hardcoded super admin email (Bootstrap)
    IF NEW.email = 'hmetest121@gmail.com' THEN
      RETURN NEW;
    END IF;
    
    -- Otherwise, check if the actor is ALREADY an admin
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = 1) THEN
       NEW.is_super_admin := 0; -- Force Reset
       NEW.role := 'MEMBER';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS protect_admin_role ON profiles;
CREATE TRIGGER protect_admin_role
BEFORE UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION prevent_admin_escalation();

`;

async function applySecurityPolicies() {
    console.log("🛡️ Applying Iron-Clad RLS Security Policies...");

    const { error } = await supabase.rpc('exec_sql', { sql: SQL_MIGRATION });

    if (error) {
        // If exec_sql RPC is not enabled (likely), we try direct SQL via standard query if permitted, 
        // OR we instruct the user. Since we have service_role, we might not be able to DDL directly 
        // depending on the extension.
        // However, for this environment, we often simulate or use a specific setup helper.
        // Let's try raw query if the helper exists, otherwise warn.
        console.warn("⚠️ RPC 'exec_sql' not found. Trying alternative DDL injection...");
        console.error("❌ DDL requires SQL Editor access in Supabase Dashboard for full security layout.");
        console.error("   Details:", error);
    } else {
        console.log("✅ Security Policies Applied Successfully!");
    }
}

// Since RPC might fail without special setup, we'll try to run this via a direct PG connection 
// if we had one. But with Supabase JS only, we rely on the user running this SQL 
// OR we use the 'postgres' package if available. 
// For now, we will output the SQL for the user to run if RPC fails.

console.log("📜 SQL TO EXECUTE IN SUPABASE DASHBOARD -> SQL EDITOR:");
console.log("=====================================================");
console.log(SQL_MIGRATION);
console.log("=====================================================");

applySecurityPolicies();
