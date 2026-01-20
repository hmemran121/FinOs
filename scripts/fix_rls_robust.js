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

        console.log('🛡️ Applying ROBUST RLS Fixes...');

        // 1. Create a Secure Function to check Admin Status (Bypasses RLS on profiles)
        await client.query(`
      CREATE OR REPLACE FUNCTION public.fn_is_super_admin()
      RETURNS BOOLEAN AS $$
      BEGIN
        RETURN EXISTS (
          SELECT 1
          FROM profiles
          WHERE id = auth.uid()
          AND is_super_admin = 1
        );
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `);
        console.log('✅ Function fn_is_super_admin created');

        // 2. Drop old policies
        await client.query('DROP POLICY IF EXISTS "Super Admin Write Access" ON system_config;');

        // 3. Create new Policy using the function
        await client.query(`
      CREATE POLICY "Super Admin Write Access"
      ON system_config
      FOR ALL
      USING ( fn_is_super_admin() )
      WITH CHECK ( fn_is_super_admin() );
    `);
        console.log('✅ New Robust Policy Applied');

        console.log('🎉 Fixed! The recursion issue should be gone.');

    } catch (err) {
        console.error('❌ Error executing SQL:', err);
    } finally {
        await client.end();
    }
}

run();
