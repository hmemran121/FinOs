const fs = require('fs');
const { Client } = require('pg');

const connectionString = 'postgresql://postgres.liwnjbvintygnvhgbguw:howladerFinos@aws-1-ap-south-1.pooler.supabase.com:6543/postgres';

const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
});

async function run() {
    try {
        console.log('Connecting to Supabase...');
        await client.connect();

        console.log('--- Phase 0: Dropping Existing Functions ---');
        try {
            await client.query('DROP FUNCTION IF EXISTS public.get_global_stats()');
            console.log('🗑️ Dropped get_global_stats');
            await client.query('DROP FUNCTION IF EXISTS public.is_super_admin()');
            console.log('🗑️ Dropped is_super_admin');
        } catch (e) {
            console.log('⚠️ Notice during drop:', e.message);
        }

        console.log('--- Phase 1: Recreating is_super_admin (Robust Type Check) ---');
        const sql1 = fs.readFileSync('supabase/migrations/fix_recursion_security_definer.sql', 'utf8');
        await client.query(sql1);
        console.log('✅ Created is_super_admin (Robust).');

        console.log('--- Phase 2: Recreating get_global_stats ---');
        const sql2 = fs.readFileSync('supabase/migrations/create_get_global_stats.sql', 'utf8');
        await client.query(sql2);
        console.log('✅ Created get_global_stats.');

        console.log('🎉 Force Recreate Complete.');
    } catch (err) {
        console.error('❌ Failed:', err);
        process.exit(1);
    } finally {
        try { await client.end(); } catch (e) { }
    }
}

run();
