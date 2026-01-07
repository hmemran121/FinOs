
import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env.local') });

const { Client } = pg;

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    console.error("❌ DATABASE_URL missing from .env.local");
    process.exit(1);
}

async function optimizeSupabase() {
    const client = new Client({ connectionString });

    try {
        await client.connect();
        console.log("✅ Connected to Supabase Postgres.");

        // Discovery: Get all tables in public schema
        const res = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_type = 'BASE TABLE';
        `);

        const tables = res.rows.map(r => r.table_name);
        console.log(`📋 Found ${tables.length} tables. Applying REPLICA IDENTITY FULL...`);

        for (const table of tables) {
            try {
                await client.query(`ALTER TABLE "${table}" REPLICA IDENTITY FULL;`);
                console.log(`  ✔ ${table}`);
            } catch (err) {
                console.error(`  ✖ Failed for ${table}:`, err.message);
            }
        }

        console.log("\n🚀 Supabase Schema Optimization Complete.");
    } catch (err) {
        console.error("❌ Fatal error:", err);
    } finally {
        await client.end();
    }
}

optimizeSupabase();
