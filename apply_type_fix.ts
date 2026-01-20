import pg from 'pg';
import fs from 'fs';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const { Client } = pg;

async function applyFix() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
        console.error("DATABASE_URL is missing.");
        return;
    }

    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log("Connected to database.");

        const sql = fs.readFileSync('supabase/migrations/fix_super_admin_type.sql', 'utf8');
        console.log("Applying type fix for is_super_admin()...");
        await client.query(sql);
        console.log("✅ Fix applied successfully!");
    } catch (err) {
        console.error("❌ Failed to apply fix:", err);
    } finally {
        await client.end();
    }
}

applyFix();
