
import pg from 'pg';
import fs from 'fs';
import path from 'path';

const { Client } = pg;

// Use the exact connection string provided by the user
const connectionString = 'postgresql://postgres.liwnjbvintygnvhgbguw:howladerFinos@aws-1-ap-south-1.pooler.supabase.com:6543/postgres';

const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false } // Required for Supabase pooling
});

async function applyFix() {
    try {
        await client.connect();
        console.log('✅ Connected to Database.');

        const sqlPath = path.resolve('supabase/migrations/create_system_update_signals.sql');
        const sql = fs.readFileSync(sqlPath, 'utf-8');

        console.log('📝 Executing SQL...');
        await client.query(sql);

        console.log('🚀 Migration Applied Successfully!');
    } catch (err) {
        console.error('❌ Migration Failed:', err);
    } finally {
        await client.end();
    }
}

applyFix();
