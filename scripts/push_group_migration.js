import pg from 'pg';
const { Client } = pg;
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONNECTION_STRING = process.env.DATABASE_URL_BYPASS || process.env.DATABASE_URL;

if (!CONNECTION_STRING) {
    console.error("❌ DATABASE_URL or DATABASE_URL_BYPASS not found in .env.local");
    process.exit(1);
}

async function runMigration() {
    console.log("🚀 Connecting to Supabase PostgreSQL...");
    const client = new Client({
        connectionString: CONNECTION_STRING,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log("✅ Connected.");

        const sqlPath = path.join(__dirname, 'add_group_parent_id.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log("📦 Executing Migration from add_group_parent_id.sql...");
        await client.query(sql);
        console.log("✅ Migration applied successfully!");

    } catch (err) {
        console.error("❌ Migration Failed:", err);
    } finally {
        await client.end();
    }
}

runMigration();
