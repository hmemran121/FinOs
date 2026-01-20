/**
 * Test RLS with Actual Supabase Client
 * This tests RLS the same way the app does
 */

import { createClient } from '@supabase/supabase-js';

// Use actual keys from your .env.local
const SUPABASE_URL = 'https://liwnjbvintygnvhgbguw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxpd25qYnZpbnR5Z252aGdiZ3V3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY1MTQ4NzgsImV4cCI6MjA1MjA5MDg3OH0.Qg0Ql6Vv8Gf-kcMNgIqnCXTjlLQnxGrCJJXzBPGFXxE';

async function testRLSWithClient() {
    console.log('🔌 Creating Supabase clients...\n');

    // Create two separate clients for two users
    const client1 = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const client2 = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    try {
        // Login User 1
        console.log('👤 Logging in User 1 (howlader.mdemran121@gmail.com)...');
        const { data: session1, error: error1 } = await client1.auth.signInWithPassword({
            email: 'howlader.mdemran121@gmail.com',
            password: 'Emran@123'
        });

        if (error1) {
            console.error('❌ User 1 login failed:', error1.message);
            return;
        }
        console.log('✅ User 1 logged in:', session1.user.id.substring(0, 8) + '...\n');

        // Query as User 1
        const { data: user1Wallets, error: w1Error } = await client1
            .from('wallets')
            .select('*');

        const { data: user1Transactions, error: t1Error } = await client1
            .from('transactions')
            .select('*');

        console.log('📊 User 1 Data:');
        console.log(`   Wallets: ${user1Wallets?.length || 0}`);
        console.log(`   Transactions: ${user1Transactions?.length || 0}`);
        if (w1Error) console.log(`   Wallet Error: ${w1Error.message}`);
        if (t1Error) console.log(`   Transaction Error: ${t1Error.message}`);

        // Login User 2
        console.log('\n👤 Logging in User 2 (canvahme@gmail.com)...');
        const { data: session2, error: error2 } = await client2.auth.signInWithPassword({
            email: 'canvahme@gmail.com',
            password: 'Emran@123'
        });

        if (error2) {
            console.error('❌ User 2 login failed:', error2.message);
            return;
        }
        console.log('✅ User 2 logged in:', session2.user.id.substring(0, 8) + '...\n');

        // Query as User 2
        const { data: user2Wallets, error: w2Error } = await client2
            .from('wallets')
            .select('*');

        const { data: user2Transactions, error: t2Error } = await client2
            .from('transactions')
            .select('*');

        console.log('📊 User 2 Data:');
        console.log(`   Wallets: ${user2Wallets?.length || 0}`);
        console.log(`   Transactions: ${user2Transactions?.length || 0}`);
        if (w2Error) console.log(`   Wallet Error: ${w2Error.message}`);
        if (t2Error) console.log(`   Transaction Error: ${t2Error.message}`);

        // Analysis
        console.log('\n\n🎯 Analysis:');
        const user1WalletCount = user1Wallets?.length || 0;
        const user2WalletCount = user2Wallets?.length || 0;
        const user1TxCount = user1Transactions?.length || 0;
        const user2TxCount = user2Transactions?.length || 0;

        if (user1WalletCount === user2WalletCount && user1TxCount === user2TxCount) {
            console.log('❌ RLS NOT WORKING - Both users see same data!');
            console.log('   Problem: RLS policies not being enforced');
        } else {
            console.log('✅ RLS WORKING - Users see different data!');
            console.log('   User 1: ' + user1WalletCount + ' wallets, ' + user1TxCount + ' transactions');
            console.log('   User 2: ' + user2WalletCount + ' wallets, ' + user2TxCount + ' transactions');
        }

        // Logout
        await client1.auth.signOut();
        await client2.auth.signOut();

    } catch (error) {
        console.error('❌ Error:', error);
    }
}

testRLSWithClient()
    .then(() => {
        console.log('\n✅ Test complete!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n💥 Failed:', error.message);
        process.exit(1);
    });
