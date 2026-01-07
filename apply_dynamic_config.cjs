
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const connectionString = 'postgresql://postgres:howladerFinos@db.liwnjbvintygnvhgbguw.supabase.co:5432/postgres';

async function applyDynamicConfig() {
    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log("✅ Connected to Supabase PostgreSQL.");

        const migration = fs.readFileSync(path.join(__dirname, 'migration_v6_dynamic_config.sql'), 'utf8');
        const seed = fs.readFileSync(path.join(__dirname, 'seed_dynamic_config.sql'), 'utf8');

        console.log("➡️ Applying Migration v6...");
        await client.query(migration);

        console.log("➡️ Seeding Data...");
        await client.query(seed);

        console.log("✅ Dynamic Configuration Tables Created & Seeded!");

    } catch (err) {
        console.error("❌ Error applying config:", err);
    } finally {
        await client.end();
    }
}

applyDynamicConfig();
