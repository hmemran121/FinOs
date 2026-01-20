const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

// User provided credentials
const connectionString = 'postgresql://postgres.liwnjbvintygnvhgbguw:howladerFinos@aws-1-ap-south-1.pooler.supabase.com:6543/postgres';

async function runMigration() {
    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false } // Required for Supabase Pooling
    });

    try {
        await client.connect();
        console.log("🔌 Connected to Supabase Database.");

        const sqlPath = path.resolve(__dirname, '../supabase/migrations/reset_versions_to_v5.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log("📜 Executing Migration: reset_versions_to_v5.sql");
        await client.query(sql);

        console.log("✅ Migration executed successfully.");
    } catch (err) {
        console.error("❌ Migration Failed:", err);
    } finally {
        await client.end();
    }
}

runMigration();
