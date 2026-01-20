/**
 * Automated RLS Setup Script
 * 
 * This script will:
 * 1. Connect to Supabase using DATABASE_URL
 * 2. Enable RLS on all user-scoped tables
 * 3. Create policies for data isolation
 * 4. Verify the setup
 */

import pkg from 'pg';
const { Client } = pkg;

const DATABASE_URL = 'postgresql://postgres.liwnjbvintygnvhgbguw:howladerFinos@aws-1-ap-south-1.pooler.supabase.com:6543/postgres';

async function setupRLS() {
    const client = new Client({
        connectionString: DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log('🔌 Connecting to Supabase...');
        await client.connect();
        console.log('✅ Connected!\n');

        // ========================================
        // STEP 1: Enable RLS on all tables
        // ========================================
        console.log('📋 Step 1: Enabling RLS on all user-scoped tables...');

        const tables = [
            'profiles', 'wallets', 'channels', 'transactions',
            'financial_plans', 'financial_plan_components', 'financial_plan_settlements',
            'budgets', 'commitments', 'notifications', 'categories_user',
            'ai_usage_logs', 'ai_memories'
        ];

        for (const table of tables) {
            try {
                await client.query(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;`);
                console.log(`   ✅ RLS enabled on ${table}`);
            } catch (e) {
                console.log(`   ⚠️ ${table}: ${e.message}`);
            }
        }

        console.log('\n');

        // ========================================
        // STEP 2: Drop existing policies
        // ========================================
        console.log('🗑️  Step 2: Dropping existing policies...');

        const policyDrops = [
            // Profiles
            `DROP POLICY IF EXISTS "Users can view own profile" ON profiles`,
            `DROP POLICY IF EXISTS "Users can insert own profile" ON profiles`,
            `DROP POLICY IF EXISTS "Users can update own profile" ON profiles`,
            `DROP POLICY IF EXISTS "Users can delete own profile" ON profiles`,

            // Wallets
            `DROP POLICY IF EXISTS "Users can view own wallets" ON wallets`,
            `DROP POLICY IF EXISTS "Users can insert own wallets" ON wallets`,
            `DROP POLICY IF EXISTS "Users can update own wallets" ON wallets`,
            `DROP POLICY IF EXISTS "Users can delete own wallets" ON wallets`,

            // Channels
            `DROP POLICY IF EXISTS "Users can view own channels" ON channels`,
            `DROP POLICY IF EXISTS "Users can insert own channels" ON channels`,
            `DROP POLICY IF EXISTS "Users can update own channels" ON channels`,
            `DROP POLICY IF EXISTS "Users can delete own channels" ON channels`,

            // Transactions
            `DROP POLICY IF EXISTS "Users can view own transactions" ON transactions`,
            `DROP POLICY IF EXISTS "Users can insert own transactions" ON transactions`,
            `DROP POLICY IF EXISTS "Users can update own transactions" ON transactions`,
            `DROP POLICY IF EXISTS "Users can delete own transactions" ON transactions`,

            // Financial Plans
            `DROP POLICY IF EXISTS "Users can view own plans" ON financial_plans`,
            `DROP POLICY IF EXISTS "Users can insert own plans" ON financial_plans`,
            `DROP POLICY IF EXISTS "Users can update own plans" ON financial_plans`,
            `DROP POLICY IF EXISTS "Users can delete own plans" ON financial_plans`,

            // Financial Plan Components
            `DROP POLICY IF EXISTS "Users can view own plan components" ON financial_plan_components`,
            `DROP POLICY IF EXISTS "Users can insert own plan components" ON financial_plan_components`,
            `DROP POLICY IF EXISTS "Users can update own plan components" ON financial_plan_components`,
            `DROP POLICY IF EXISTS "Users can delete own plan components" ON financial_plan_components`,

            // Financial Plan Settlements
            `DROP POLICY IF EXISTS "Users can view own settlements" ON financial_plan_settlements`,
            `DROP POLICY IF EXISTS "Users can insert own settlements" ON financial_plan_settlements`,
            `DROP POLICY IF EXISTS "Users can update own settlements" ON financial_plan_settlements`,
            `DROP POLICY IF EXISTS "Users can delete own settlements" ON financial_plan_settlements`,

            // Budgets
            `DROP POLICY IF EXISTS "Users can view own budgets" ON budgets`,
            `DROP POLICY IF EXISTS "Users can insert own budgets" ON budgets`,
            `DROP POLICY IF EXISTS "Users can update own budgets" ON budgets`,
            `DROP POLICY IF EXISTS "Users can delete own budgets" ON budgets`,

            // Commitments
            `DROP POLICY IF EXISTS "Users can view own commitments" ON commitments`,
            `DROP POLICY IF EXISTS "Users can insert own commitments" ON commitments`,
            `DROP POLICY IF EXISTS "Users can update own commitments" ON commitments`,
            `DROP POLICY IF EXISTS "Users can delete own commitments" ON commitments`,

            // Notifications
            `DROP POLICY IF EXISTS "Users can view own notifications" ON notifications`,
            `DROP POLICY IF EXISTS "Users can insert own notifications" ON notifications`,
            `DROP POLICY IF EXISTS "Users can update own notifications" ON notifications`,
            `DROP POLICY IF EXISTS "Users can delete own notifications" ON notifications`,

            // Categories User
            `DROP POLICY IF EXISTS "Users can view own categories" ON categories_user`,
            `DROP POLICY IF EXISTS "Users can insert own categories" ON categories_user`,
            `DROP POLICY IF EXISTS "Users can update own categories" ON categories_user`,
            `DROP POLICY IF EXISTS "Users can delete own categories" ON categories_user`,

            // AI Usage Logs
            `DROP POLICY IF EXISTS "Users can view own ai logs" ON ai_usage_logs`,
            `DROP POLICY IF EXISTS "Users can insert own ai logs" ON ai_usage_logs`,
            `DROP POLICY IF EXISTS "Users can update own ai logs" ON ai_usage_logs`,
            `DROP POLICY IF EXISTS "Users can delete own ai logs" ON ai_usage_logs`,

            // AI Memories
            `DROP POLICY IF EXISTS "Users can view own ai memories" ON ai_memories`,
            `DROP POLICY IF EXISTS "Users can insert own ai memories" ON ai_memories`,
            `DROP POLICY IF EXISTS "Users can update own ai memories" ON ai_memories`,
            `DROP POLICY IF EXISTS "Users can delete own ai memories" ON ai_memories`,
        ];

        for (const drop of policyDrops) {
            try {
                await client.query(drop);
            } catch (e) {
                // Ignore errors (policy might not exist)
            }
        }
        console.log('   ✅ Old policies dropped\n');

        // ========================================
        // STEP 3: Create new policies
        // ========================================
        console.log('🔐 Step 3: Creating RLS policies...');

        const policies = [
            // PROFILES
            `CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id)`,
            `CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id)`,
            `CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id)`,
            `CREATE POLICY "Users can delete own profile" ON profiles FOR DELETE USING (auth.uid() = id)`,

            // WALLETS
            `CREATE POLICY "Users can view own wallets" ON wallets FOR SELECT USING (auth.uid() = user_id)`,
            `CREATE POLICY "Users can insert own wallets" ON wallets FOR INSERT WITH CHECK (auth.uid() = user_id)`,
            `CREATE POLICY "Users can update own wallets" ON wallets FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)`,
            `CREATE POLICY "Users can delete own wallets" ON wallets FOR DELETE USING (auth.uid() = user_id)`,

            // CHANNELS
            `CREATE POLICY "Users can view own channels" ON channels FOR SELECT USING (auth.uid() = user_id)`,
            `CREATE POLICY "Users can insert own channels" ON channels FOR INSERT WITH CHECK (auth.uid() = user_id)`,
            `CREATE POLICY "Users can update own channels" ON channels FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)`,
            `CREATE POLICY "Users can delete own channels" ON channels FOR DELETE USING (auth.uid() = user_id)`,

            // TRANSACTIONS
            `CREATE POLICY "Users can view own transactions" ON transactions FOR SELECT USING (auth.uid() = user_id)`,
            `CREATE POLICY "Users can insert own transactions" ON transactions FOR INSERT WITH CHECK (auth.uid() = user_id)`,
            `CREATE POLICY "Users can update own transactions" ON transactions FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)`,
            `CREATE POLICY "Users can delete own transactions" ON transactions FOR DELETE USING (auth.uid() = user_id)`,

            // FINANCIAL PLANS
            `CREATE POLICY "Users can view own plans" ON financial_plans FOR SELECT USING (auth.uid() = user_id)`,
            `CREATE POLICY "Users can insert own plans" ON financial_plans FOR INSERT WITH CHECK (auth.uid() = user_id)`,
            `CREATE POLICY "Users can update own plans" ON financial_plans FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)`,
            `CREATE POLICY "Users can delete own plans" ON financial_plans FOR DELETE USING (auth.uid() = user_id)`,

            // FINANCIAL PLAN COMPONENTS
            `CREATE POLICY "Users can view own plan components" ON financial_plan_components FOR SELECT USING (auth.uid() = user_id)`,
            `CREATE POLICY "Users can insert own plan components" ON financial_plan_components FOR INSERT WITH CHECK (auth.uid() = user_id)`,
            `CREATE POLICY "Users can update own plan components" ON financial_plan_components FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)`,
            `CREATE POLICY "Users can delete own plan components" ON financial_plan_components FOR DELETE USING (auth.uid() = user_id)`,

            // FINANCIAL PLAN SETTLEMENTS
            `CREATE POLICY "Users can view own settlements" ON financial_plan_settlements FOR SELECT USING (auth.uid() = user_id)`,
            `CREATE POLICY "Users can insert own settlements" ON financial_plan_settlements FOR INSERT WITH CHECK (auth.uid() = user_id)`,
            `CREATE POLICY "Users can update own settlements" ON financial_plan_settlements FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)`,
            `CREATE POLICY "Users can delete own settlements" ON financial_plan_settlements FOR DELETE USING (auth.uid() = user_id)`,

            // BUDGETS
            `CREATE POLICY "Users can view own budgets" ON budgets FOR SELECT USING (auth.uid() = user_id)`,
            `CREATE POLICY "Users can insert own budgets" ON budgets FOR INSERT WITH CHECK (auth.uid() = user_id)`,
            `CREATE POLICY "Users can update own budgets" ON budgets FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)`,
            `CREATE POLICY "Users can delete own budgets" ON budgets FOR DELETE USING (auth.uid() = user_id)`,

            // COMMITMENTS
            `CREATE POLICY "Users can view own commitments" ON commitments FOR SELECT USING (auth.uid() = user_id)`,
            `CREATE POLICY "Users can insert own commitments" ON commitments FOR INSERT WITH CHECK (auth.uid() = user_id)`,
            `CREATE POLICY "Users can update own commitments" ON commitments FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)`,
            `CREATE POLICY "Users can delete own commitments" ON commitments FOR DELETE USING (auth.uid() = user_id)`,

            // NOTIFICATIONS
            `CREATE POLICY "Users can view own notifications" ON notifications FOR SELECT USING (auth.uid() = user_id)`,
            `CREATE POLICY "Users can insert own notifications" ON notifications FOR INSERT WITH CHECK (auth.uid() = user_id)`,
            `CREATE POLICY "Users can update own notifications" ON notifications FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)`,
            `CREATE POLICY "Users can delete own notifications" ON notifications FOR DELETE USING (auth.uid() = user_id)`,

            // CATEGORIES USER
            `CREATE POLICY "Users can view own categories" ON categories_user FOR SELECT USING (auth.uid() = user_id)`,
            `CREATE POLICY "Users can insert own categories" ON categories_user FOR INSERT WITH CHECK (auth.uid() = user_id)`,
            `CREATE POLICY "Users can update own categories" ON categories_user FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)`,
            `CREATE POLICY "Users can delete own categories" ON categories_user FOR DELETE USING (auth.uid() = user_id)`,

            // AI USAGE LOGS
            `CREATE POLICY "Users can view own ai logs" ON ai_usage_logs FOR SELECT USING (auth.uid() = user_id)`,
            `CREATE POLICY "Users can insert own ai logs" ON ai_usage_logs FOR INSERT WITH CHECK (auth.uid() = user_id)`,
            `CREATE POLICY "Users can update own ai logs" ON ai_usage_logs FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)`,
            `CREATE POLICY "Users can delete own ai logs" ON ai_usage_logs FOR DELETE USING (auth.uid() = user_id)`,

            // AI MEMORIES
            `CREATE POLICY "Users can view own ai memories" ON ai_memories FOR SELECT USING (auth.uid() = user_id)`,
            `CREATE POLICY "Users can insert own ai memories" ON ai_memories FOR INSERT WITH CHECK (auth.uid() = user_id)`,
            `CREATE POLICY "Users can update own ai memories" ON ai_memories FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)`,
            `CREATE POLICY "Users can delete own ai memories" ON ai_memories FOR DELETE USING (auth.uid() = user_id)`,
        ];

        let successCount = 0;
        for (const policy of policies) {
            try {
                await client.query(policy);
                successCount++;
            } catch (e) {
                console.log(`   ⚠️ Policy failed: ${e.message}`);
            }
        }
        console.log(`   ✅ Created ${successCount} policies\n`);

        // ========================================
        // STEP 4: Verify setup
        // ========================================
        console.log('🔍 Step 4: Verifying RLS setup...\n');

        const rlsCheck = await client.query(`
      SELECT 
        tablename,
        rowsecurity as rls_enabled
      FROM pg_tables
      WHERE schemaname = 'public'
        AND tablename IN (
          'profiles', 'wallets', 'channels', 'transactions',
          'financial_plans', 'financial_plan_components', 'financial_plan_settlements',
          'budgets', 'commitments', 'notifications', 'categories_user',
          'ai_usage_logs', 'ai_memories'
        )
      ORDER BY tablename
    `);

        console.log('📊 RLS Status:');
        rlsCheck.rows.forEach(row => {
            const status = row.rls_enabled ? '✅' : '❌';
            console.log(`   ${status} ${row.tablename}: ${row.rls_enabled ? 'ENABLED' : 'DISABLED'}`);
        });

        const policyCheck = await client.query(`
      SELECT 
        tablename,
        COUNT(*) as policy_count
      FROM pg_policies
      WHERE schemaname = 'public'
      GROUP BY tablename
      ORDER BY tablename
    `);

        console.log('\n📊 Policy Count:');
        policyCheck.rows.forEach(row => {
            console.log(`   ${row.tablename}: ${row.policy_count} policies`);
        });

        console.log('\n✅ RLS Setup Complete!');
        console.log('\n🎯 Next Steps:');
        console.log('   1. Refresh your app');
        console.log('   2. Login with a user');
        console.log('   3. You should only see that user\'s data');
        console.log('   4. Try switching users - data should be isolated\n');

    } catch (error) {
        console.error('❌ Error:', error);
        throw error;
    } finally {
        await client.end();
        console.log('🔌 Disconnected from Supabase');
    }
}

// Run the setup
setupRLS()
    .then(() => {
        console.log('\n🎉 Done!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n💥 Failed:', error);
        process.exit(1);
    });
