import pg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
console.log(`Loading env from ${envPath}`);

if (fs.existsSync(envPath)) {
    const envConfig = dotenv.parse(fs.readFileSync(envPath));
    for (const k in envConfig) {
        process.env[k] = envConfig[k];
    }
}

const dbUrl = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;

if (!dbUrl) {
    console.error("❌ No DATABASE_URL found in .env.local.");
    process.exit(1);
}

const client = new pg.Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false }
});

async function migrate() {
    try {
        const host = dbUrl.split('@')[1]?.split('/')[0] || 'unknown';
        console.log(`🔌 Connecting to Host: ${host}`);

        await client.connect();
        console.log("✅ Connected.");

        // 1. Enable Vector Extension
        console.log("🔌 Enabling 'vector' extension...");
        await client.query("CREATE EXTENSION IF NOT EXISTS vector;");

        // 2. Add Embedding Column (Gemini uses 768 dimensions)
        console.log("🧬 Adding embedding column to categories...");
        await client.query("ALTER TABLE categories ADD COLUMN IF NOT EXISTS embedding vector(768);");

        // 3. Create Matching Function
        console.log("🧠 Creating 'match_categories' function...");
        const funcSql = `
            CREATE OR REPLACE FUNCTION match_categories (
                query_embedding vector(768),
                match_threshold float,
                match_count int,
                filter_user_id uuid
            )
            returns setof categories
            language plpgsql
            as $$
            begin
                return query
                select *
                from categories
                where (user_id = filter_user_id OR is_global = true)
                and 1 - (categories.embedding <=> query_embedding) > match_threshold
                order by categories.embedding <=> query_embedding
                limit match_count;
            end;
            $$;
        `;
        await client.query(funcSql);

        // 4. Reload Schema Cache
        console.log("🔄 Reloading PostgREST Schema Cache...");
        await client.query("NOTIFY pgrst, 'reload schema';");

        console.log("✅ Vector RAG Architecture initialized successfully.");

        // 5. Add Columns (Idempotent) - Original profiles table alterations
        const sql = `
            ALTER TABLE profiles 
            ADD COLUMN IF NOT EXISTS custom_logo_url TEXT;
            ALTER TABLE profiles 
            ADD COLUMN IF NOT EXISTS custom_app_name TEXT;
            ALTER TABLE profiles 
            ADD COLUMN IF NOT EXISTS glass_effects_enabled INTEGER DEFAULT 1;
            ALTER TABLE profiles 
            ADD COLUMN IF NOT EXISTS is_read_only INTEGER DEFAULT 0;
            ALTER TABLE profiles 
            ADD COLUMN IF NOT EXISTS maintenance_mode INTEGER DEFAULT 0;
        `;
        await client.query(sql);
        console.log("✅ ALTER TABLE commands executed for 'profiles'.");

        // 6. Inspect Actual Schema
        console.log("🕵️ Inspecting 'profiles' table columns:");
        const res = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'profiles'
            ORDER BY column_name;
        `);

        const cols = res.rows.map(r => `${r.column_name} (${r.data_type})`);
        console.log("📜 Current Columns:", cols);

        if (hasLogo) {
            console.log("✅ SUCCESS: Required columns exist.");
        } else {
            console.error("❌ FAILURE: Columns still missing!");
        }

    } catch (err) {
        console.error("❌ Error:", err.message);
    } finally {
        await client.end();
    }
}

migrate();
