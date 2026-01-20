const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const connectionString = 'postgresql://postgres.liwnjbvintygnvhgbguw:howladerFinos@aws-1-ap-south-1.pooler.supabase.com:6543/postgres';

async function applyFix() {
    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log("🔌 Connected.");

        // Read SQL file
        const sqlPath = path.join(__dirname, '../supabase/migrations/enable_replica_identity_full.sql');
        if (!fs.existsSync(sqlPath)) {
            throw new Error(`SQL file not found at ${sqlPath}`);
        }
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log("📜 Executing SQL...");
        await client.query(sql);
        console.log("✅ RLS Fix Applied Successfully!");

    } catch (err) {
        console.error("❌ Failed:", err);
    } finally {
        await client.end();
    }
}

applyFix();
