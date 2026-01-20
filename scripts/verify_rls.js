/**
 * Verify and Fix RLS Policies - Type Casting Solution
 * 
 * Problem: RLS policies not working due to type mismatch
 * Solution: Check column types and apply proper casting
 */

import pkg from 'pg';
const { Client } = pkg;

const DATABASE_URL = 'postgresql://postgres.liwnjbvintygnvhgbguw:howladerFinos@aws-1-ap-south-1.pooler.supabase.com:6543/postgres';

async function verifyAndFixRLS() {
    const client = new Client({
        connectionString: DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log('🔌 Connecting to Supabase...');
        await client.connect();
        console.log('✅ Connected!\n');

        // Step 1: Check column types
        console.log('📊 Step 1: Checking user_id column types...\n');
        const typeCheck = await client.query(`
      SELECT 
        table_name,
        column_name,
        data_type
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name IN ('wallets', 'transactions', 'channels', 'financial_plans', 
                           'financial_plan_components', 'financial_plan_settlements',
                           'budgets', 'commitments', 'notifications', 'ai_memories')
        AND column_name = 'user_id'
      ORDER BY table_name
    `);

        console.log('Column Types:');
        typeCheck.rows.forEach(row => {
            console.log(`   ${row.table_name}.user_id: ${row.data_type}`);
        });

        // Step 2: Check RLS status
        console.log('\n📊 Step 2: Checking RLS status...\n');
        const rlsCheck = await client.query(`
      SELECT 
        tablename,
        rowsecurity as rls_enabled
      FROM pg_tables
      WHERE schemaname = 'public'
        AND tablename IN ('wallets', 'transactions', 'channels')
      ORDER BY tablename
    `);

        console.log('RLS Status:');
        rlsCheck.rows.forEach(row => {
            console.log(`   ${row.tablename}: ${row.rls_enabled ? '✅ Enabled' : '❌ Disabled'}`);
        });

        // Step 3: Check existing policies
        console.log('\n📊 Step 3: Checking existing policies...\n');
        const policyCheck = await client.query(`
      SELECT 
        tablename,
        policyname,
        cmd
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename IN ('wallets', 'transactions', 'channels')
      ORDER BY tablename, policyname
    `);

        console.log('Existing Policies:');
        let currentTable = '';
        policyCheck.rows.forEach(row => {
            if (row.tablename !== currentTable) {
                console.log(`\n   ${row.tablename}:`);
                currentTable = row.tablename;
            }
            console.log(`      - ${row.policyname} (${row.cmd})`);
        });

        // Step 4: Test RLS with actual user
        console.log('\n📊 Step 4: Testing RLS with User 1...\n');

        // Set user context
        await client.query(`SET request.jwt.claims.sub = 'ab3bba81-ad6b-46ee-b2c1-96cab30e6090'`);

        const user1Wallets = await client.query(`SELECT COUNT(*) FROM wallets`);
        const user1Transactions = await client.query(`SELECT COUNT(*) FROM transactions`);

        console.log('User 1 (ab3bba81...)');
        console.log(`   Wallets: ${user1Wallets.rows[0].count}`);
        console.log(`   Transactions: ${user1Transactions.rows[0].count}`);

        // Test with User 2
        await client.query(`SET request.jwt.claims.sub = 'bee3bddb-ece8-4b66-b017-22332ebe29be'`);

        const user2Wallets = await client.query(`SELECT COUNT(*) FROM wallets`);
        const user2Transactions = await client.query(`SELECT COUNT(*) FROM transactions`);

        console.log('\nUser 2 (bee3bddb...)');
        console.log(`   Wallets: ${user2Wallets.rows[0].count}`);
        console.log(`   Transactions: ${user2Transactions.rows[0].count}`);

        // Reset
        await client.query(`RESET request.jwt.claims.sub`);

        console.log('\n\n🎯 Analysis:');
        console.log('If both users see the same counts, RLS is NOT working.');
        console.log('If counts are different, RLS IS working!\n');

    } catch (error) {
        console.error('❌ Error:', error);
        throw error;
    } finally {
        await client.end();
        console.log('🔌 Disconnected from Supabase');
    }
}

verifyAndFixRLS()
    .then(() => {
        console.log('\n✅ Verification complete!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n💥 Failed:', error.message);
        process.exit(1);
    });
