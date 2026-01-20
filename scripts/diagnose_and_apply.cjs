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

        // 1. Diagnose current function
        const resBefore = await client.query(`
        SELECT prosrc FROM pg_proc WHERE proname = 'is_super_admin';
    `);
        console.log('--- CURRENT FUNCTION BODY (BEFORE) ---');
        if (resBefore.rows.length > 0) {
            console.log(resBefore.rows[0].prosrc);
        } else {
            console.log('(Function not found)');
        }

        // 2. Apply Fix
        console.log('\n--- APPLYING FIX ---');
        console.log('Reading sql...');
        const sql1 = fs.readFileSync('supabase/migrations/fix_recursion_security_definer.sql', 'utf8');
        await client.query(sql1);
        console.log('✅ Applied is_super_admin fix.');

        const sql2 = fs.readFileSync('supabase/migrations/create_get_global_stats.sql', 'utf8');
        await client.query(sql2);
        console.log('✅ Applied get_global_stats.');

        // 3. Verify Update
        console.log('\n--- VERIFYING UPDATE (AFTER) ---');
        const resAfter = await client.query(`
        SELECT prosrc FROM pg_proc WHERE proname = 'is_super_admin';
    `);
        if (resAfter.rows.length > 0) {
            console.log(resAfter.rows[0].prosrc);
            const body = resAfter.rows[0].prosrc;
            if (body.includes("is_super_admin::int = 1")) {
                console.log('✅ SUCCESS: Logic updated to INT cast.');
            } else {
                console.error('❌ FAILURE: Logic NOT updated.');
            }
        } else {
            console.error('❌ Function missing after update.');
        }

    } catch (err) {
        console.error('❌ Failed:', err);
        process.exit(1);
    } finally {
        try { await client.end(); } catch (e) { }
    }
}

run();
