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

async function runFix() {
    try {
        await client.connect();
        console.log("✅ Connected to Supabase.");

        const sqlPath = path.resolve(process.cwd(), 'supabase/migrations/super_admin_bypass_corrected.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log("🛡️ Applying CORRECTED Super Admin RLS Bypass Fix...");
        await client.query(sql);
        console.log("✅ RLS Bypass Fix Applied successfully!");
        console.log("🎉 Super Admins can now see all user data!");

    } catch (err) {
        console.error("❌ Error running fix:", err.message);
        console.error("Full error:", err);
    } finally {
        await client.end();
    }
}

runFix();
