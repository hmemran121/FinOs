const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSuperAdminAndData() {
    console.log('🔍 Checking Super Admin Status and Data Access...\n');

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        console.error('❌ Not logged in or auth error:', authError);
        return;
    }

    console.log('✅ User ID:', user.id);
    console.log('📧 Email:', user.email, '\n');

    // Check profile
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

    if (profileError) {
        console.error('❌ Profile fetch error:', profileError);
        return;
    }

    console.log('👤 Profile Data:');
    console.log('   - is_super_admin:', profile.is_super_admin, `(type: ${typeof profile.is_super_admin})`);
    console.log('   - role:', profile.role);
    console.log('   - name:', profile.name, '\n');

    // Check if Super Admin
    const isSuperAdmin = !!profile.is_super_admin;
    console.log(`🔐 Super Admin Status: ${isSuperAdmin ? '✅ YES' : '❌ NO'}\n`);

    if (!isSuperAdmin) {
        console.log('⚠️ User is NOT a Super Admin. Cannot access all data.');
        console.log('💡 To fix: Run this SQL in Supabase:');
        console.log(`   UPDATE profiles SET is_super_admin = true WHERE id = '${user.id}';`);
        return;
    }

    // Test data access
    console.log('🧪 Testing Data Access...\n');

    // Test 1: Transactions
    const { data: transactions, error: txError } = await supabase
        .from('transactions')
        .select('id, user_id, amount, date')
        .limit(10);

    console.log('📊 Transactions:');
    if (txError) {
        console.error('   ❌ Error:', txError.message);
    } else {
        console.log(`   ✅ Found ${transactions?.length || 0} transactions`);
        if (transactions && transactions.length > 0) {
            const uniqueUsers = [...new Set(transactions.map(t => t.user_id))];
            console.log(`   👥 Unique users: ${uniqueUsers.length}`);
            console.log(`   📝 Sample:`, transactions.slice(0, 3));
        }
    }

    // Test 2: Wallets
    const { data: wallets, error: walletError } = await supabase
        .from('wallets')
        .select('id, user_id, name')
        .limit(10);

    console.log('\n💰 Wallets:');
    if (walletError) {
        console.error('   ❌ Error:', walletError.message);
    } else {
        console.log(`   ✅ Found ${wallets?.length || 0} wallets`);
        if (wallets && wallets.length > 0) {
            const uniqueUsers = [...new Set(wallets.map(w => w.user_id))];
            console.log(`   👥 Unique users: ${uniqueUsers.length}`);
            console.log(`   📝 Sample:`, wallets.slice(0, 3));
        }
    }

    // Test 3: Profiles (all users)
    const { data: allProfiles, error: allProfilesError } = await supabase
        .from('profiles')
        .select('id, name, email, is_super_admin')
        .limit(20);

    console.log('\n👥 All Profiles:');
    if (allProfilesError) {
        console.error('   ❌ Error:', allProfilesError.message);
    } else {
        console.log(`   ✅ Found ${allProfiles?.length || 0} profiles`);
        if (allProfiles) {
            allProfiles.forEach(p => {
                const isSA = p.is_super_admin ? '🔐' : '👤';
                console.log(`   ${isSA} ${p.name || 'Unknown'} (${p.email || 'no email'})`);
            });
        }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📋 SUMMARY:');
    console.log('='.repeat(60));
    console.log(`Super Admin: ${isSuperAdmin ? '✅ YES' : '❌ NO'}`);
    console.log(`Transactions visible: ${transactions?.length || 0}`);
    console.log(`Wallets visible: ${wallets?.length || 0}`);
    console.log(`Profiles visible: ${allProfiles?.length || 0}`);

    if (isSuperAdmin && (!transactions?.length && !wallets?.length)) {
        console.log('\n⚠️ WARNING: Super Admin but NO DATA visible!');
        console.log('This means RLS policies are blocking access.');
        console.log('\n💡 Solution: Run the RLS bypass fix:');
        console.log('   node scripts/apply_super_admin_fix.js');
    }
}

checkSuperAdminAndData().catch(console.error);
