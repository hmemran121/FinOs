
import pg from 'pg';
import fs from 'fs';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const { Client } = pg;

async function run() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
        console.error("No DATABASE_URL found.");
        process.exit(1);
    }

    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log("✅ Connected to database.");

        // Read seed.sql
        const sqlContent = fs.readFileSync('seed.sql', 'utf8');

        // Split by semicolon to get individual statements
        // We filter out empty lines to avoid errors
        const statements = sqlContent
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0);

        console.log(`Found ${statements.length} statements to execute.`);

        for (let i = 0; i < statements.length; i++) {
            const statement = statements[i];

            // Skip purely empty lines if filter missed them
            if (!statement) continue;

            try {
                await client.query(statement);

                // Log progress every 20 items or so
                if ((i + 1) % 20 === 0) {
                    console.log(`   Processed ${i + 1}/${statements.length}...`);
                }
            } catch (err: any) {
                // If it's the "invalid message format" again, we need to know exactly which line caused it.
                // If it's duplicate key, we can ignore (usually codes 23505)
                if (err.code === '23505') {
                    // duplicate key, ignore
                } else {
                    console.error(`❌ Error on statement #${i + 1}: ${err.message}`);
                    console.error(`   Statement start: "${statement.substring(0, 50)}..."`);
                }
            }
        }

        console.log("✅ Seed completed successfully!");

    } catch (err) {
        console.error("❌ Seed Script Error:", err);
    } finally {
        await client.end();
    }
}

run();
