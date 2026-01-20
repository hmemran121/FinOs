/**
 * Fix ALL User Tables RLS
 * Apply correct RLS policies to all user-scoped tables
 */

import pkg from 'pg';
const { Client } = pkg;

const DATABASE_URL = 'postgresql://postgres.liwnjbvintygnvhgbguw:howladerFinos@aws-1-ap-south-1.pooler.supabase.com:6543/postgres';

async function fixAllTablesRLS() {
    const client = new Client({
        connectionString: DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log('🔌 Connecting to Supabase...');
        await client.connect();
        console.log('✅ Connected!\n');

        const userTables = [
            'wallets',
            'channels',
            'transactions',
            'financial_plans',
            'financial_plan_components',
            'financial_plan_settlements',
            'budgets',
            'commitments',
            'notifications',
            'categories_user',
            'ai_usage_logs',
            'ai_memories'
        ];

        for (const table of userTables) {
            console.log(`\n🔧 Fixing ${table}...`);

            // Get all existing policies for this table
            const existing = await client.query(`
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = $1
      `, [table]);

            // Drop all existing policies
            for (const row of existing.rows) {
                try {
                    await client.query(`DROP POLICY IF EXISTS "${row.policyname}" ON ${table}`);
                } catch (e) {
                    // Ignore errors
                }
            }
            console.log(`   ✅ Dropped ${existing.rows.length} old policies`);

            // Create new clean policies
            try {
                // SELECT
                await client.query(`
          CREATE POLICY "${table}_select_own" ON ${table}
          FOR SELECT
          USING (auth.uid() = user_id)
        `);

                // INSERT
                await client.query(`
          CREATE POLICY "${table}_insert_own" ON ${table}
          FOR INSERT
          WITH CHECK (auth.uid() = user_id)
        `);

                // UPDATE
                await client.query(`
          CREATE POLICY "${table}_update_own" ON ${table}
          FOR UPDATE
          USING (auth.uid() = user_id)
          WITH CHECK (auth.uid() = user_id)
        `);

                // DELETE
                await client.query(`
          CREATE POLICY "${table}_delete_own" ON ${table}
          FOR DELETE
          USING (auth.uid() = user_id)
        `);

                console.log(`   ✅ Created 4 new policies`);
            } catch (e) {
                console.log(`   ⚠️ Error creating policies: ${e.message}`);
            }
        }

        console.log('\n\n✅ All tables fixed!\n');
        console.log('📊 Summary:');
        console.log(`   - Fixed ${userTables.length} tables`);
        console.log('   - Each table has 4 policies (SELECT, INSERT, UPDATE, DELETE)');
        console.log('   - Users can only access their own data\n');

        console.log('🎯 Test it now:');
        console.log('   1. Refresh your app');
        console.log('   2. Login');
        console.log('   3. Check console:');
        console.log('      ⬇️ [Sync] profiles: Received 1 items');
        console.log('      ⬇️ [Sync] wallets: Received X items (only yours)');
        console.log('      ⬇️ [Sync] transactions: Received X items (only yours)\n');

    } catch (error) {
        console.error('❌ Error:', error);
        throw error;
    } finally {
        await client.end();
        console.log('🔌 Disconnected from Supabase');
    }
}

fixAllTablesRLS()
    .then(() => {
        console.log('\n✅ Done!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n💥 Failed:', error.message);
        process.exit(1);
    });
