// Copy-paste this ENTIRE script into your browser console (F12)
// This will diagnose Super Admin status and data access issues

(async function () {
    console.log('🔍 SUPER ADMIN DIAGNOSTIC TOOL');
    console.log('='.repeat(60));

    try {
        // Import Supabase client from the app
        const { supabase } = await import('/services/supabase.ts');

        // Get current user
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            console.error('❌ Not logged in:', authError);
            return;
        }

        console.log('✅ Logged in as:', user.email);
        console.log('🆔 User ID:', user.id);
        console.log('');

        // Check profile
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        if (profileError) {
            console.error('❌ Profile error:', profileError);
            return;
        }

        console.log('👤 PROFILE DATA:');
        console.log('   Name:', profile.name);
        console.log('   is_super_admin:', profile.is_super_admin, `(type: ${typeof profile.is_super_admin})`);
        console.log('   role:', profile.role);
        console.log('');

        const isSuperAdmin = !!profile.is_super_admin;
        console.log(`🔐 Super Admin Status: ${isSuperAdmin ? '✅ YES - AUTHORIZED' : '❌ NO - UNAUTHORIZED'}`);
        console.log('');

        if (!isSuperAdmin) {
            console.error('⚠️ YOU ARE NOT A SUPER ADMIN!');
            console.log('💡 To fix, run this SQL in Supabase:');
            console.log(`   UPDATE profiles SET is_super_admin = true WHERE id = '${user.id}';`);
            return;
        }

        // Test data access
        console.log('🧪 TESTING DATA ACCESS...');
        console.log('');

        // Test 1: Transactions
        const { data: transactions, error: txError } = await supabase
            .from('transactions')
            .select('id, user_id, amount, date')
            .limit(20);

        console.log('📊 TRANSACTIONS:');
        if (txError) {
            console.error('   ❌ Error:', txError.message);
            console.error('   🔍 Details:', txError);
        } else {
            console.log(`   ✅ Found: ${transactions?.length || 0} transactions`);
            if (transactions && transactions.length > 0) {
                const uniqueUsers = [...new Set(transactions.map(t => t.user_id))];
                console.log(`   👥 Unique users: ${uniqueUsers.length}`);
                console.log(`   📝 User IDs:`, uniqueUsers);
                console.table(transactions.slice(0, 5));
            } else {
                console.warn('   ⚠️ NO TRANSACTIONS FOUND!');
            }
        }
        console.log('');

        // Test 2: Wallets
        const { data: wallets, error: walletError } = await supabase
            .from('wallets')
            .select('id, user_id, name')
            .limit(20);

        console.log('💰 WALLETS:');
        if (walletError) {
            console.error('   ❌ Error:', walletError.message);
            console.error('   🔍 Details:', walletError);
        } else {
            console.log(`   ✅ Found: ${wallets?.length || 0} wallets`);
            if (wallets && wallets.length > 0) {
                const uniqueUsers = [...new Set(wallets.map(w => w.user_id))];
                console.log(`   👥 Unique users: ${uniqueUsers.length}`);
                console.log(`   📝 User IDs:`, uniqueUsers);
                console.table(wallets.slice(0, 5));
            } else {
                console.warn('   ⚠️ NO WALLETS FOUND!');
            }
        }
        console.log('');

        // Test 3: All Profiles
        const { data: allProfiles, error: allProfilesError } = await supabase
            .from('profiles')
            .select('id, name, email, is_super_admin')
            .limit(50);

        console.log('👥 ALL PROFILES:');
        if (allProfilesError) {
            console.error('   ❌ Error:', allProfilesError.message);
        } else {
            console.log(`   ✅ Found: ${allProfiles?.length || 0} profiles`);
            if (allProfiles) {
                console.table(allProfiles);
            }
        }
        console.log('');

        // Summary
        console.log('='.repeat(60));
        console.log('📋 DIAGNOSTIC SUMMARY:');
        console.log('='.repeat(60));
        console.log(`✅ Super Admin: ${isSuperAdmin ? 'YES' : 'NO'}`);
        console.log(`📊 Transactions visible: ${transactions?.length || 0}`);
        console.log(`💰 Wallets visible: ${wallets?.length || 0}`);
        console.log(`👥 Profiles visible: ${allProfiles?.length || 0}`);
        console.log('');

        if (isSuperAdmin && (!transactions?.length && !wallets?.length)) {
            console.error('🚨 CRITICAL ISSUE DETECTED:');
            console.error('   You ARE a Super Admin but CANNOT see any data!');
            console.error('   This means RLS policies are BLOCKING your access.');
            console.error('');
            console.error('💡 SOLUTION:');
            console.error('   1. Go to Supabase Dashboard → SQL Editor');
            console.error('   2. Run the super_admin_bypass_fix.sql migration');
            console.error('   3. Or run: node scripts/apply_super_admin_fix.js');
        } else if (isSuperAdmin && transactions?.length) {
            console.log('✅ SUCCESS: Super Admin access is working correctly!');
        }

    } catch (error) {
        console.error('❌ DIAGNOSTIC FAILED:', error);
    }
})();
