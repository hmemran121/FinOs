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

        console.log('--- Phase 1: Fixing Security Definer (Type Check) ---');
        const sql1 = fs.readFileSync('supabase/migrations/fix_recursion_security_definer.sql', 'utf8');
        await client.query(sql1);
        console.log('✅ Applied Security Definer Fix.');

        console.log('--- Phase 2: Re-applying Global Stats RPC ---');
        const sql2 = fs.readFileSync('supabase/migrations/create_get_global_stats.sql', 'utf8');
        await client.query(sql2);
        console.log('✅ Re-applied Global Stats RPC.');

        console.log('🎉 All Remote Fixes Applied.');
    } catch (err) {
        console.error('❌ Failed:', err);
        process.exit(1);
    } finally {
        try { await client.end(); } catch (e) { }
    }
}

run();
