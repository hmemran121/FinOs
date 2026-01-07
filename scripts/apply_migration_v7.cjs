const fs = require('fs');
const path = require('path');
const pg = require('pg');
const dotenv = require('dotenv');

// Load environment variables from .env.local FIRST (to take precedence)
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });
// Then load .env (defaults)
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const { Client } = pg;

async function run() {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
        console.error("Error: DATABASE_URL is missing in .env file.");
        process.exit(1);
    }

    console.log(`Connecting to database...`);

    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log("✅ Connected successfully.");

        // Run Migration
        console.log("➡️  Running migration_v7_settings.sql...");
        const migrationPath = path.resolve(__dirname, '../migration_v7_settings.sql');
        const migrationSql = fs.readFileSync(migrationPath, 'utf8');
        await client.query(migrationSql);
        console.log("✅ Migration applied.");

    } catch (err) {
        console.error("\n❌ Database Error:", err);
    } finally {
        await client.end();
    }
}

run();
