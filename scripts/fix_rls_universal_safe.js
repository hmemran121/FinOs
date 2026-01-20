import pg from 'pg';

const { Client } = pg;

const connectionString = 'postgresql://postgres.liwnjbvintygnvhgbguw:howladerFinos@aws-1-ap-south-1.pooler.supabase.com:6543/postgres';

const client = new Client({
    connectionString,
});

const TABLES = [
    'profiles',
    'wallets',
    'transactions',
    'categories',
    'budgets',
    // 'recurring_transactions', // Skipping potentially missing one
    'financial_goals',
    'financial_plans',
    'ai_usage_logs',
    'ai_memories'
];

async function run() {
    try {
        console.log('🔌 Connecting to Database...');
        await client.connect();

        console.log('🛡️ Applying UNIVERSAL RLS Policies (Retry Safe)...');

        // Ensure function exists (idempotent)
        await client.query(`
      CREATE OR REPLACE FUNCTION public.check_if_super_admin()
      RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
      BEGIN
        RETURN EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = 1);
      END;
      $$;
    `);

        for (const table of TABLES) {
            try {
                console.log(`🔧 Configuring Table: ${table}`);

                // 1. Enable RLS
                await client.query(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;`);

                // 2. Clear old policies
                await client.query(`DROP POLICY IF EXISTS "User Access Own Data" ON ${table};`);
                await client.query(`DROP POLICY IF EXISTS "Super Admin Full Access" ON ${table};`);
                await client.query(`DROP POLICY IF EXISTS "Public Read Access" ON ${table};`);

                // 3. User Policy
                const userIdCol = table === 'profiles' ? 'id' : 'user_id';
                await client.query(`
                CREATE POLICY "User Access Own Data"
                ON ${table} FOR ALL
                USING ( auth.uid()::text = ${userIdCol}::text )
                WITH CHECK ( auth.uid()::text = ${userIdCol}::text );
            `);

                // 4. Admin Policy
                await client.query(`
                CREATE POLICY "Super Admin Full Access"
                ON ${table} FOR ALL
                USING ( check_if_super_admin() )
                WITH CHECK ( check_if_super_admin() );
            `);
                console.log(`✅ Success for ${table}`);
            } catch (e) {
                console.error(`⚠️ Failed to configure ${table} (Skipping):`, e.message);
            }
        }

        console.log('🎉 Final Policy Application Complete.');

    } catch (err) {
        console.error('❌ General Error:', err);
    } finally {
        await client.end();
    }
}

run();
