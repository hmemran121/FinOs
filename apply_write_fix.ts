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

        const sql = fs.readFileSync('supabase/migrations/allow_admin_profile_writes.sql', 'utf8');
        console.log("Applying Write Permissions for Super Admins...");
        await client.query(sql);
        console.log("✅ Permissions updated successfully!");
    } catch (err) {
        console.error("❌ Failed to update permissions:", err);
    } finally {
        await client.end();
    }
}

applyFix();
