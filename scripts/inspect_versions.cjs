const fs = require('fs');
const { Client } = require('pg');

// User provided credentials
const connectionString = 'postgresql://postgres.liwnjbvintygnvhgbguw:howladerFinos@aws-1-ap-south-1.pooler.supabase.com:6543/postgres';

async function inspectVersions() {
    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log("🔌 Connected.");

        const res = await client.query("SELECT value FROM system_config WHERE key = 'static_data_versions'");
        if (res.rows.length > 0) {
            console.log("📊 Current static_data_versions:");
            console.log(JSON.stringify(JSON.parse(res.rows[0].value), null, 2));
        } else {
            console.log("⚠️ static_data_versions NOT FOUND");
        }

    } catch (err) {
        console.error("❌ Failed:", err);
    } finally {
        await client.end();
    }
}

inspectVersions();
