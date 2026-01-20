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
    console.error("❌ No DATABASE_URL found in .env.local.");
    process.exit(1);
}

const client = new pg.Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false }
});

async function runMigration() {
    try {
        await client.connect();
        console.log("✅ Connected to Supabase.");

        console.log("🗑️ Dropping 'gemini_keys' column from 'profiles' table...");
        await client.query("ALTER TABLE profiles DROP COLUMN IF EXISTS gemini_keys;");

        console.log("🔄 Reloading PostgREST Schema Cache...");
        await client.query("NOTIFY pgrst, 'reload schema';");

        console.log("✅ Column 'gemini_keys' successfully removed from Supabase.");

    } catch (err) {
        console.error("❌ Error running migration:", err.message);
    } finally {
        await client.end();
    }
}

runMigration();
