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
    'recurring_transactions',
    'financial_goals',
    'financial_plans',
    'financial_plan_items',
    'ai_usage_logs',
    'ai_memories'
];

async function run() {
    try {
        console.log('🔌 Connecting to Database...');
        await client.connect();

        console.log('🛡️ Applying UNIVERSAL RLS Policies for ALL tables...');

        // Ensure the helper function exists
        await client.query(`
      CREATE OR REPLACE FUNCTION public.check_if_super_admin()
      RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
      BEGIN
        RETURN EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = 1);
      END;
      $$;
    `);

        for (const table of TABLES) {
            console.log(`🔧 Configuring Table: ${table}`);

            // 1. Enable RLS
            await client.query(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;`);

            // 2. Clear old policies
            await client.query(`DROP POLICY IF EXISTS "User Access Own Data" ON ${table};`);
            await client.query(`DROP POLICY IF EXISTS "Super Admin Full Access" ON ${table};`);
            await client.query(`DROP POLICY IF EXISTS "Public Read Access" ON ${table};`); // Cleanup

            // 3. Policy: User can ALL (Select, Insert, Update, Delete) their own data
            // Assumption: All tables have 'user_id' column, EXCEPT 'profiles' uses 'id'
            const userIdCol = table === 'profiles' ? 'id' : 'user_id';

            await client.query(`
            CREATE POLICY "User Access Own Data"
            ON ${table}
            FOR ALL
            USING ( auth.uid()::text = ${userIdCol}::text )
            WITH CHECK ( auth.uid()::text = ${userIdCol}::text );
        `);

            // 4. Policy: Super Admin can ALL everything (Admin Override)
            await client.query(`
            CREATE POLICY "Super Admin Full Access"
            ON ${table}
            FOR ALL
            USING ( check_if_super_admin() )
            WITH CHECK ( check_if_super_admin() );
        `);
        }

        console.log('✅ Applied "User Owns Data" + "Super Admin Access" to all tables.');
        console.log('🎉 Dashboard sync should now work perfectly for everyone.');

    } catch (err) {
        console.error('❌ Error executing SQL:', err);
    } finally {
        await client.end();
    }
}

run();
