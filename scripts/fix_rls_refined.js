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

        console.log('🛡️ Refining RLS Policies (Fixing Loop for Users)...');

        // 1. Drop existing broad policies
        await client.query('DROP POLICY IF EXISTS "Super Admin Write Access" ON system_config;');
        await client.query('DROP POLICY IF EXISTS "Public Read Access" ON system_config;');

        // 2. Create Explicit READ Policy (No Function Call = No Error for Anon)
        await client.query(`
      CREATE POLICY "Public Read Access"
      ON system_config FOR SELECT
      USING (true);
    `);
        console.log('✅ READ Policy set to Public (Safe)');

        // 3. Create Explicit WRITE Policies (Only triggers function for writes)
        // We split into INSERT, UPDATE, DELETE so SELECT is never touched by the function
        await client.query(`
      CREATE POLICY "Super Admin Insert Access"
      ON system_config FOR INSERT
      WITH CHECK ( check_if_super_admin() );
    `);

        await client.query(`
      CREATE POLICY "Super Admin Update Access"
      ON system_config FOR UPDATE
      USING ( check_if_super_admin() )
      WITH CHECK ( check_if_super_admin() );
    `);

        await client.query(`
      CREATE POLICY "Super Admin Delete Access"
      ON system_config FOR DELETE
      USING ( check_if_super_admin() );
    `);
        console.log('✅ WRITE Policies restricted to Super Admin function');

        // 4. Safety Net: Grant Execute to Anon (Just in case)
        await client.query(`
      GRANT EXECUTE ON FUNCTION public.check_if_super_admin TO anon;
      GRANT EXECUTE ON FUNCTION public.check_if_super_admin TO authenticated;
      GRANT EXECUTE ON FUNCTION public.check_if_super_admin TO service_role;
    `);
        console.log('✅ Function permissions patched for safety.');

        console.log('🎉 Policies Refined. Dashboard should load for everyone now.');

    } catch (err) {
        console.error('❌ Error executing SQL:', err);
    } finally {
        await client.end();
    }
}

run();
