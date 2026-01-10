
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY; // Using anon key for this script as it relies on RLS or direct DB access
const dbUrl = process.env.DATABASE_URL;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials in .env.local");
    process.exit(1);
}

// Since system_config is a system table, we might need a more privileged client or use the SQL editor.
// However, the previous script used a 'pg' client which is perfect.

const { Client } = require('pg');

async function setup() {
    const client = new Client({
        connectionString: dbUrl,
    });

    try {
        await client.connect();
        console.log("Connected to Supabase PostgreSQL.");

        const initialVersions = JSON.stringify({
            categories_global: 1,
            channel_types: 1,
            plan_suggestions: 1
        });

        // 1. Check if key exists
        const checkRes = await client.query("SELECT * FROM system_config WHERE key = 'static_data_versions'");

        if (checkRes.rows.length === 0) {
            console.log("Creating 'static_data_versions' config...");
            await client.query("INSERT INTO system_config (key, value) VALUES ('static_data_versions', $1)", [initialVersions]);
        } else {
            console.log("'static_data_versions' already exists.");
        }

        // 2. Optional: Remove old key to keep it clean
        await client.query("DELETE FROM system_config WHERE key = 'global_data_version'");

        console.log("✅ Granular Smart Sync Setup Complete.");
    } catch (err) {
        console.error("❌ Setup Failed:", err);
    } finally {
        await client.end();
    }
}

setup();
