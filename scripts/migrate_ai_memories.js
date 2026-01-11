import dotenv from 'dotenv';
import pg from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';

// Load .env.local
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const dbUrl = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL;

if (!dbUrl) {
    console.error("❌ No DATABASE_URL found in .env.local");
    process.exit(1);
}

const { Client } = pg;
const client = new Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false }
});

const sql = `
CREATE TABLE IF NOT EXISTS ai_memories (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    memory_key TEXT,
    memory_value TEXT,
    memory_type TEXT,
    confidence REAL,
    last_used_at BIGINT,
    created_at BIGINT,
    updated_at BIGINT NOT NULL DEFAULT 0,
    server_updated_at BIGINT DEFAULT 0,
    version INTEGER NOT NULL DEFAULT 1,
    device_id TEXT NOT NULL DEFAULT 'unknown',
    is_deleted INTEGER NOT NULL DEFAULT 0
);

ALTER TABLE ai_memories ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ai_memories' AND policyname = 'Users can insert their own memories') THEN
        CREATE POLICY "Users can insert their own memories" ON ai_memories FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ai_memories' AND policyname = 'Users can update their own memories') THEN
        CREATE POLICY "Users can update their own memories" ON ai_memories FOR UPDATE USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ai_memories' AND policyname = 'Users can delete their own memories') THEN
        CREATE POLICY "Users can delete their own memories" ON ai_memories FOR DELETE USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ai_memories' AND policyname = 'Users can select their own memories') THEN
        CREATE POLICY "Users can select their own memories" ON ai_memories FOR SELECT USING (auth.uid() = user_id);
    END IF;
END $$;
`;

async function run() {
    try {
        await client.connect();
        console.log("🚀 Connected to Database");
        await client.query(sql);
        console.log("✅ Table ai_memories created/verified with RLS policies.");
    } catch (e) {
        console.error("❌ Error:", e);
    } finally {
        await client.end();
    }
}

run();
