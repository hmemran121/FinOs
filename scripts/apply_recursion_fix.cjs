const fs = require('fs');
const { Client } = require('pg');

// Using the remote connection string from .env.local
const connectionString = 'postgresql://postgres.liwnjbvintygnvhgbguw:howladerFinos@aws-1-ap-south-1.pooler.supabase.com:6543/postgres';

const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false } // Required for Supabase/Cloud connections usually
});

async function run() {
    try {
        console.log('Connecting to Supabase...');
        await client.connect();
        console.log('Connected. Reading SQL...');
        const sql = fs.readFileSync('supabase/migrations/fix_recursion_security_definer.sql', 'utf8');
        console.log('Executing SQL migration...');
        await client.query(sql);
        console.log('✅ Successfully updated is_super_admin() to SECURITY DEFINER.');
    } catch (err) {
        if (err.code === 'MODULE_NOT_FOUND') {
            console.error('❌ PG module not found. Please run: npm install pg');
        } else {
            console.error('❌ Failed to update function:', err);
        }
        process.exit(1);
    } finally {
        try { await client.end(); } catch (e) { }
    }
}

run();
