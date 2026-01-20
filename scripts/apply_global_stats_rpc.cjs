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
        console.log('Connected. Reading SQL...');
        const sql = fs.readFileSync('supabase/migrations/create_get_global_stats.sql', 'utf8');
        console.log('Executing Global Stats RPC creation...');
        await client.query(sql);
        console.log('✅ Successfully created get_global_stats RPC function.');
    } catch (err) {
        console.error('❌ Failed to create function:', err);
        process.exit(1);
    } finally {
        try { await client.end(); } catch (e) { }
    }
}

run();
