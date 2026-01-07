import pg from 'pg';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';

const { Client } = pg;

// Use the connection string from valid credentials
const CONNECTION_STRING = 'postgresql://postgres:howladerFinos@db.liwnjbvintygnvhgbguw.supabase.co:5432/postgres';

async function seedSupabase() {
    console.log("🚀 Connecting to Supabase for Seeding...");
    const client = new Client({
        connectionString: CONNECTION_STRING,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log("✅ Connected.");

        // MANUALLY PARSE THE TS FILE to avoid node loader issues
        const dataPath = path.resolve('data/planSuggestionsData.ts');
        const rawContent = fs.readFileSync(dataPath, 'utf-8');

        // Extract array content
        const match = rawContent.match(/export const PLAN_SUGGESTIONS_SEED = \[(.*?)\];/s);
        if (!match) throw new Error("Could not parse PLAN_SUGGESTIONS_SEED from file");

        // Clean up the string to be valid JSON-ish array
        let arrayStr = match[1]
            .replace(/\/\/.*$/gm, '') // Remove comments
            .replace(/\s+/g, ' ')     // Collapse whitespace
            .replace(/,\s*$/, '');    // Remove trailing comma if any

        // Parse items carefully
        // Simple strategy: split by ", " which separates our static string list mostly
        // A safer bet is evaluating it if we trust the source (we wrote it) 
        // OR using a regex to capture "Strings"

        const PLAN_SUGGESTIONS_SEED = [];
        const stringReg = /"([^"]+)"/g;
        let m;
        while ((m = stringReg.exec(arrayStr)) !== null) {
            PLAN_SUGGESTIONS_SEED.push(m[1]);
        }

        console.log(`📂 Parsed ${PLAN_SUGGESTIONS_SEED.length} items from source file.`);

        // Fetch existing names to avoid duplicates (though constraint handles it, this is cleaner)
        const res = await client.query("SELECT name FROM plan_suggestions");
        const existingNames = new Set(res.rows.map(r => r.name));

        console.log(`📦 Found ${existingNames.size} existing items in DB.`);

        const newItems = PLAN_SUGGESTIONS_SEED.filter(name => !existingNames.has(name));

        if (newItems.length === 0) {
            console.log("✨ All items already exist. Nothing to seed.");
            return;
        }

        console.log(`🌱 Preparing to seed ${newItems.length} new items...`);

        // Insert in batches of 50
        const BATCH_SIZE = 50;
        let insertedCount = 0;

        for (let i = 0; i < newItems.length; i += BATCH_SIZE) {
            const batch = newItems.slice(i, i + BATCH_SIZE);

            const values = [];
            const placeholders = batch.map((name, idx) => {
                const baseIdx = idx * 6; // 6 variables per row
                values.push(uuidv4(), name, 0, Date.now(), 1, 'server_seed');
                return `($${baseIdx + 1}, $${baseIdx + 2}, $${baseIdx + 3}, $${baseIdx + 4}, $${baseIdx + 5}, $${baseIdx + 6})`;
            }).join(',');

            const query = `
                INSERT INTO plan_suggestions (id, name, usage_count, updated_at, version, device_id)
                VALUES ${placeholders}
                ON CONFLICT (name) DO NOTHING;
            `;

            await client.query(query, values);
            insertedCount += batch.length;
            process.stdout.write(`\r✅ Progress: ${insertedCount} / ${newItems.length}`);
        }

        console.log("\n✅ Seeding Complete!");

    } catch (err) {
        console.error("\n❌ Seeding Failed:", err);
    } finally {
        await client.end();
    }
}

seedSupabase();
