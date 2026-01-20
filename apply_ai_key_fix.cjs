
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const connectionString = 'postgresql://postgres:howladerFinos@db.liwnjbvintygnvhgbguw.supabase.co:5432/postgres';

async function applyAiKeyFix() {
    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log("✅ Connected to Supabase.");

        const sqlPath = path.join(__dirname, 'supabase', 'migrations', 'fix_ai_key_access.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log("➡️ Executing AI Key Access Resolution SQL...");
        await client.query(sql);
        console.log("✅ AI Key Access Resolution Applied Successfully!");

    } catch (err) {
        console.error("❌ Error applying AI Key fix:", err);
    } finally {
        await client.end();
    }
}

applyAiKeyFix();
