import { createClient } from '@supabase/supabase-js';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
    const envConfig = dotenv.parse(fs.readFileSync(envPath));
    for (const k in envConfig) {
        process.env[k] = envConfig[k];
    }
}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
// Check if Service Role Key is available (better for updates), otherwise Anon might be RLS restricted?
// Usually Anon key allows update if RLS allows it for 'authenticated' user. 
// But this script is 'server-side', so ideally Service Role. 
// If not, we might fail due to RLS if we are not "logged in" as a user.
// However, the previous migration used 'pg' (SQL connection), so it bypassed RLS.
// Here we are using supabase-js (REST).
// If we have DATABASE_URL, we could use PG to update?
// Postgres vector update via PG is easy: `UPDATE categories SET embedding = '...' WHERE id = ...`
// So let's use PG instead of supabase-js! It's safer for permissions.

// Redoing with PG + Gemini
import pg from 'pg';

const dbUrl = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
const geminiKey = process.env.VITE_GEMINI_API_KEY;

if (!dbUrl) { console.error("❌ Database URL missing."); process.exit(1); }
if (!geminiKey) { console.error("❌ Gemini API Key missing."); process.exit(1); }

const pgClient = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
const genAI = new GoogleGenAI({ apiKey: geminiKey });

async function backfill() {
    try {
        await pgClient.connect();
        console.log("✅ Connected to DB.");

        // 1. Fetch categories without embeddings
        const res = await pgClient.query("SELECT id, name FROM categories WHERE embedding IS NULL");
        const categories = res.rows;

        console.log(`found ${categories.length} categories to index.`);

        if (categories.length === 0) {
            console.log("🎉 All categories are already indexed!");
            return;
        }

        console.log("🚀 Starting embedding generation...");

        for (let i = 0; i < categories.length; i++) {
            const cat = categories[i];
            const progress = `[${i + 1}/${categories.length}]`;

            try {
                // Generate Embedding using @google/genai SDK (v1)
                const result = await genAI.models.embedContent({
                    model: "text-embedding-004",
                    contents: cat.name
                });

                // Result structure for @google/genai usually has embedding inside
                // Debug showed: { embeddings: [ { values: [...] } ] }
                const embedding = result.embeddings?.[0]?.values;

                if (!embedding) {
                    console.error(`${progress} ❌ No embedding returned for: ${cat.name}`);
                    if (i === 0) console.log("Debug Result:", JSON.stringify(result, null, 2));
                    continue;
                }

                const vectorStr = JSON.stringify(embedding);

                // Update DB
                await pgClient.query(
                    `UPDATE categories SET embedding = $1 WHERE id = $2`,
                    [vectorStr, cat.id]
                );

                console.log(`${progress} ✅ Indexed: ${cat.name}`);

                // Rate limit handling (simple sleep)
                await new Promise(r => setTimeout(r, 200));

            } catch (e) {
                console.error(`${progress} ❌ Failed: ${cat.name}`, e.message);
                // Continue to next...
            }
        }

        console.log("🏁 Backfill complete.");

    } catch (e) {
        console.error("Critical Error:", e);
    } finally {
        await pgClient.end();
    }
}

backfill();
