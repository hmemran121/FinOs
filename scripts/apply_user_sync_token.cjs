
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

async function setup() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
    });

    try {
        await client.connect();
        console.log("Connected to PostgreSQL...");

        const sqlPath = path.join(__dirname, 'setup_user_sync_token.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log("Applying User Sync Token Schema & Triggers...");
        await client.query(sql);

        console.log("✅ Success! User Sync Token mechanism is now active in Supabase.");
    } catch (err) {
        console.error("❌ Setup failed:", err);
    } finally {
        await client.end();
    }
}

setup();
