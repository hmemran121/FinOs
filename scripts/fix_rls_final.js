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

        console.log('🛡️ Applying FINAL RLS Fix (Email Whitelist)...');

        // 1. Drop complex policies that might be failing
        await client.query('DROP POLICY IF EXISTS "Super Admin Write Access" ON system_config;');
        await client.query('DROP POLICY IF EXISTS "Public Read Access" ON system_config;');

        // 2. Re-apply Public Read
        await client.query(`
      CREATE POLICY "Public Read Access"
      ON system_config FOR SELECT
      USING (true);
    `);

        // 3. Apply Simple Email-Based Write Policy (Fail-Safe)
        // This avoids all lookups to 'profiles' table which causes recursion/permission errors.
        await client.query(`
      CREATE POLICY "Super Admin Write Access"
      ON system_config
      FOR ALL
      USING (
        auth.jwt() ->> 'email' = 'hmetest121@gmail.com'
      )
      WITH CHECK (
        auth.jwt() ->> 'email' = 'hmetest121@gmail.com'
      );
    `);

        console.log('✅ Policy updated to trust hmetest121@gmail.com directly.');

    } catch (err) {
        console.error('❌ Error executing SQL:', err);
    } finally {
        await client.end();
    }
}

run();
