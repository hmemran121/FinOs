/**
 * Clean and Reset Profiles RLS
 * Remove all conflicting policies and keep only the correct ones
 */

import pkg from 'pg';
const { Client } = pkg;

const DATABASE_URL = 'postgresql://postgres.liwnjbvintygnvhgbguw:howladerFinos@aws-1-ap-south-1.pooler.supabase.com:6543/postgres';

async function cleanProfilesRLS() {
    const client = new Client({
        connectionString: DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log('🔌 Connecting to Supabase...');
        await client.connect();
        console.log('✅ Connected!\n');

        console.log('🧹 Cleaning ALL profiles policies...\n');

        // Get all existing policies
        const existing = await client.query(`
      SELECT policyname 
      FROM pg_policies 
      WHERE schemaname = 'public' AND tablename = 'profiles'
    `);

        console.log(`Found ${existing.rows.length} existing policies. Dropping all...\n`);

        // Drop ALL existing policies
        for (const row of existing.rows) {
            try {
                await client.query(`DROP POLICY IF EXISTS "${row.policyname}" ON profiles`);
                console.log(`   ✅ Dropped: ${row.policyname}`);
            } catch (e) {
                console.log(`   ⚠️ Failed to drop: ${row.policyname}`);
            }
        }

        console.log('\n🔧 Creating clean RLS policies...\n');

        // CREATE ONLY NECESSARY POLICIES

        // 1. Users can view own profile
        await client.query(`
      CREATE POLICY "profiles_select_own" ON profiles
      FOR SELECT
      USING (auth.uid() = id)
    `);
        console.log('   ✅ SELECT policy: Users see own profile only');

        // 2. Users can insert own profile
        await client.query(`
      CREATE POLICY "profiles_insert_own" ON profiles
      FOR INSERT
      WITH CHECK (auth.uid() = id)
    `);
        console.log('   ✅ INSERT policy: Users create own profile only');

        // 3. Users can update own profile
        await client.query(`
      CREATE POLICY "profiles_update_own" ON profiles
      FOR UPDATE
      USING (auth.uid() = id)
      WITH CHECK (auth.uid() = id)
    `);
        console.log('   ✅ UPDATE policy: Users update own profile only');

        // 4. Users can delete own profile
        await client.query(`
      CREATE POLICY "profiles_delete_own" ON profiles
      FOR DELETE
      USING (auth.uid() = id)
    `);
        console.log('   ✅ DELETE policy: Users delete own profile only');

        console.log('\n✅ Clean RLS setup complete!\n');

        // Verify
        const final = await client.query(`
      SELECT policyname, cmd 
      FROM pg_policies 
      WHERE schemaname = 'public' AND tablename = 'profiles'
      ORDER BY policyname
    `);

        console.log('📊 Final Policies:');
        final.rows.forEach(row => {
            console.log(`   ✅ ${row.policyname} (${row.cmd})`);
        });

        console.log('\n🎯 Test it now:');
        console.log('   1. Refresh your app');
        console.log('   2. Login');
        console.log('   3. Check console: Should see "Received 1 items" for profiles\n');

    } catch (error) {
        console.error('❌ Error:', error);
        throw error;
    } finally {
        await client.end();
        console.log('🔌 Disconnected from Supabase');
    }
}

cleanProfilesRLS()
    .then(() => {
        console.log('\n✅ Done!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n💥 Failed:', error.message);
        process.exit(1);
    });
