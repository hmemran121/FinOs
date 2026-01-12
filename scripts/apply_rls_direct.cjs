const { Client } = require('pg');
const fs = require('fs');

const DATABASE_URL = 'postgresql://postgres.liwnjbvintygnvhgbguw:howladerFinos@aws-1-ap-south-1.pooler.supabase.com:6543/postgres';

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

-- 3. Define Standard User Policy (CRUD Own Data)
create or replace function create_user_policy(table_name text) returns void as $$
begin
  execute format('DROP POLICY IF EXISTS "User CRUD own data" ON %I', table_name);
  execute format('CREATE POLICY "User CRUD own data" ON %I FOR ALL USING (auth.uid()::text = user_id::text) WITH CHECK (auth.uid()::text = user_id::text)', table_name);
end;
$$ language plpgsql;

select create_user_policy('transactions');
select create_user_policy('wallets');
select create_user_policy('categories_user');
select create_user_policy('commitments');
select create_user_policy('budgets');
select create_user_policy('financial_plans');
select create_user_policy('financial_plan_components');
select create_user_policy('financial_plan_settlements');
select create_user_policy('notifications');

-- 4. Special Handling for PROFILES (Read Own, Update Own)
DROP POLICY IF EXISTS "User CRUD own profile" ON profiles;
CREATE POLICY "User CRUD own profile" ON profiles FOR ALL 
USING (auth.uid()::text = id::text) 
WITH CHECK (auth.uid()::text = id::text);

-- 5. SYSTEM CONFIG (The Core Requirement)
-- Rule: Only Super Admin can WRITE. Everyone can READ.

-- 5a. Read Access (Everyone)
DROP POLICY IF EXISTS "Anyone can read system_config" ON system_config;
CREATE POLICY "Anyone can read system_config" ON system_config FOR SELECT 
USING (true); 

-- 5b. Write Access (Super Admin Only)
DROP POLICY IF EXISTS "Super Admin can manage system_config" ON system_config;
CREATE POLICY "Super Admin can manage system_config" ON system_config FOR ALL
USING (
  exists (
    select 1 from profiles
    where id::text = auth.uid()::text
    and is_super_admin = 1
  )
)
WITH CHECK (
  exists (
    select 1 from profiles
    where id::text = auth.uid()::text
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
    where id::text = auth.uid()::text
    and is_super_admin = 1
  )
);

-- 7. Fix Profiles Role Escalation Protection (Trigger)
CREATE OR REPLACE FUNCTION prevent_admin_escalation()
RETURNS TRIGGER AS $$
BEGIN
  IF (NEW.is_super_admin = 1) AND (OLD.is_super_admin IS DISTINCT FROM 1) THEN
    -- Allow hardcoded bootstrap email
    IF NEW.email = 'hmetest121@gmail.com' THEN
      RETURN NEW;
    END IF;
    -- Otherwise, check if ALREADY admin
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE id::text = auth.uid()::text AND is_super_admin = 1) THEN
       NEW.is_super_admin := 0; 
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

-- 8. Ensure Initial Super Admin is Set (Bootstrap)
UPDATE profiles 
SET is_super_admin = 1, role = 'SUPER_ADMIN' 
WHERE email = 'hmetest121@gmail.com';
`;

async function run() {
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false } // Required for Supabase
  });

  try {
    console.log("🔌 Connecting to Supabase (Postgres)...");
    await client.connect();

    console.log("🛡️ Applying Iron-Clad RLS Security Policies...");
    await client.query(SQL_MIGRATION);

    console.log("✅ Security Policies Applied Successfully!");
    console.log("🚀 Super Admin setup complete for: hmetest121@gmail.com");

  } catch (err) {
    console.error("❌ Migration Failed:", err);
  } finally {
    await client.end();
  }
}

run();
