import pg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
    const envConfig = dotenv.parse(fs.readFileSync(envPath));
    for (const k in envConfig) {
        process.env[k] = envConfig[k];
    }
}

const dbUrl = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;

if (!dbUrl) {
    console.error("❌ No DATABASE_URL found.");
    process.exit(1);
}

const client = new pg.Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false }
});

async function run() {
    try {
        await client.connect();
        console.log("✅ Connected to Supabase.");

        const sqlPath = path.resolve(process.cwd(), 'supabase/migrations/global_sync_authority.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log("🌐 Applying Global Sync Authority...");
        await client.query(sql);
        console.log("✅ Global Sync Authority applied successfully.");

    } catch (err) {
        console.error("❌ Error:", err.message);
    } finally {
        await client.end();
    }
}

run();
