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

        console.log('🛡️ Applying RLS Policy Fixes...');

        // 1. Enable RLS
        await client.query('ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;');
        console.log('✅ RLS Enabled');

        // 2. Allow Public Read
        await client.query('DROP POLICY IF EXISTS "Public Read Access" ON system_config;');
        await client.query(`
      CREATE POLICY "Public Read Access"
      ON system_config FOR SELECT
      USING (true);
    `);
        console.log('✅ Public Read Policy Applied');

        // 3. Allow Super Admin Write
        await client.query('DROP POLICY IF EXISTS "Super Admin Write Access" ON system_config;');
        await client.query(`
      CREATE POLICY "Super Admin Write Access"
      ON system_config FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid()
          AND profiles.is_super_admin = 1
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid()
          AND profiles.is_super_admin = 1
        )
      );
    `);
        console.log('✅ Super Admin Write Policy Applied');

        console.log('🎉 All permissions fixed successfully!');
    } catch (err) {
        console.error('❌ Error executing SQL:', err);
    } finally {
        await client.end();
    }
}

run();
