import pg from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

const { Client } = pg;

// Load .env.local
dotenv.config({ path: '.env.local' });

const CONNECTION_STRING = process.env.DATABASE_URL;

if (!CONNECTION_STRING) {
    console.error("❌ Error: DATABASE_URL not found in .env.local");
    process.exit(1);
}

async function applyConfig() {
    console.log("🚀 Connecting to Supabase to apply Smart Sync configuration...");
    const client = new Client({
        connectionString: CONNECTION_STRING,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log("✅ Connected to Supabase.");

        const sqlPath = path.resolve('supabase_system_config.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log("🛠️ Applying SQL script...");
        await client.query(sql);

        console.log("🚀 Smart Sync configuration applied successfully!");
        console.log("   - Table 'system_config' created.");
        console.log("   - Default 'global_data_version' set to 1.");

    } catch (err) {
        console.error("\n❌ Setup Failed:", err.message);
    } finally {
        await client.end();
    }
}

applyConfig();
