const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function run() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
        console.error("❌ Error: DATABASE_URL is missing in .env.local");
        process.exit(1);
    }

    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log("✅ Connected to Supabase.");

        const sql = fs.readFileSync('supabase_v30_patch.sql', 'utf8');
        console.log("➡️  Applying patch...");
        await client.query(sql);
        console.log("✅ Patch applied successfully!");

    } catch (err) {
        console.error("❌ Database Error:", err);
    } finally {
        await client.end();
    }
}

run();
