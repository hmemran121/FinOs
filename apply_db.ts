
import pg from 'pg';
import fs from 'fs';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local FIRST (to take precedence)
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
// Then load .env (defaults)
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const { Client } = pg;

async function run() {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
        console.error("Error: DATABASE_URL is missing in .env file.");
        console.error("Please create a .env file based on .env.example and add your connection string.");
        process.exit(1);
    }

    // Debug: Log masked connection info
    const maskedUrl = connectionString.replace(/:([^:@]+)@/, ':****@');
    console.log(`Debug: Using connection string: ${maskedUrl}`);

    console.log(`Connecting to database...`);

    // Create a client using the connection string
    // We disable rejectUnauthorized for Supabase (typical for their poolers/direct access requirements in some envs)
    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log("✅ Connected successfully.");

        // 1. Run Migration
        console.log("➡️  Running migration.sql...");
        const migrationSql = fs.readFileSync('migration.sql', 'utf8');
        await client.query(migrationSql);
        console.log("✅ Migration applied.");

        // 2. Run Seed
        console.log("➡️  Running seed.sql...");
        const seedSql = fs.readFileSync('seed.sql', 'utf8');
        await client.query(seedSql);
        console.log("✅ Seed applied.");

        console.log("\n🎉 Database setup complete!");

    } catch (err) {
        console.error("\n❌ Database Error:", err);
        if (err.measure === 'password authentication failed for user "postgres"') {
            console.error("   -> Double check your password in DATABASE_URL.");
        }
    } finally {
        await client.end();
    }
}

run();
