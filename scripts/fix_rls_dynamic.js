import pg from 'pg';

const { Client } = pg;

const connectionString = 'postgresql://postgres.liwnjbvintygnvhgbguw:howladerFinos@aws-1-ap-south-1.pooler.supabase.com:6543/postgres';

const client = new Client({
    connectionString,
});

async function run() {
    try {
        console.log('🔌 Connecting to Database...');
        await client.connect();

        console.log('🛡️ Applying INTERNATIONAL STANDARD DYNAMIC RLS...');

        // 1. Create a Secure, Reusable Function to Check Admin Status
        // SECURITY DEFINER: Means this function runs with the privileges of the Creator (Postgres Admin),
        // bypassing any RLS on the 'profiles' table that caused the infinite loop/403 before.
        await client.query(`
      CREATE OR REPLACE FUNCTION public.check_if_super_admin()
      RETURNS BOOLEAN
      LANGUAGE plpgsql
      SECURITY DEFINER -- Crucial: Runs as Admin
      SET search_path = public -- Security Best Practice
      AS $$
      BEGIN
        RETURN EXISTS (
          SELECT 1
          FROM profiles
          WHERE id = auth.uid() -- Automatically gets the current user's ID
          AND is_super_admin = 1 -- Checks the dynamic flag in DB
        );
      END;
      $$;
    `);
        console.log('✅ Dynamic Function check_if_super_admin() created.');

        // 2. Grant Execute Permission (Crucial for it to work for logged-in users)
        await client.query(`
      GRANT EXECUTE ON FUNCTION public.check_if_super_admin TO authenticated;
      GRANT EXECUTE ON FUNCTION public.check_if_super_admin TO service_role;
    `);
        console.log('✅ Execute permissions granted.');

        // 3. Reset Policies on system_config
        await client.query('DROP POLICY IF EXISTS "Super Admin Write Access" ON system_config;');
        await client.query('DROP POLICY IF EXISTS "Public Read Access" ON system_config;');

        // 4. Re-apply Public Read
        await client.query(`
      CREATE POLICY "Public Read Access"
      ON system_config FOR SELECT
      USING (true);
    `);

        // 5. Apply Dynamic Write Policy
        // Now it calls the function. If you change 'is_super_admin' in profiles table,
        // access is instantly granted/revoked for that user. No hardcoded emails.
        await client.query(`
      CREATE POLICY "Super Admin Write Access"
      ON system_config
      FOR ALL
      USING ( check_if_super_admin() )
      WITH CHECK ( check_if_super_admin() );
    `);

        console.log('✅ Dynamic Policy Applied. Any user with is_super_admin=1 can now access.');

    } catch (err) {
        console.error('❌ Error executing SQL:', err);
    } finally {
        await client.end();
    }
}

run();
