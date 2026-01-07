import pg from 'pg';
const { Client } = pg;

const CONNECTION_STRING = 'postgresql://postgres:howladerFinos@db.liwnjbvintygnvhgbguw.supabase.co:5432/postgres';

const SQL = `
-- Create the plan_suggestions table
CREATE TABLE IF NOT EXISTS public.plan_suggestions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    usage_count INTEGER DEFAULT 0,
    updated_at BIGINT NOT NULL DEFAULT (extract(epoch from now()) * 1000),
    version INTEGER NOT NULL DEFAULT 1,
    device_id TEXT NOT NULL DEFAULT 'unknown',
    is_deleted BOOLEAN NOT NULL DEFAULT false
);

-- Enable Row Level Security
ALTER TABLE public.plan_suggestions ENABLE ROW LEVEL SECURITY;

-- Create Policy: Allow all operations for authenticated users
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'plan_suggestions' AND policyname = 'Enable all for users'
    ) THEN
        CREATE POLICY "Enable all for users" ON public.plan_suggestions FOR ALL USING (true) WITH CHECK (true);
    END IF;
END
$$;

-- Create Policy: Allow read access for public/anon
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'plan_suggestions' AND policyname = 'Enable read for anon'
    ) THEN
        CREATE POLICY "Enable read for anon" ON public.plan_suggestions FOR SELECT USING (true);
    END IF;
END
$$;
`;

async function runMigration() {
    console.log("🚀 Connecting to Supabase...");
    const client = new Client({
        connectionString: CONNECTION_STRING,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log("✅ Connected.");

        console.log("📦 Executing Migration...");
        await client.query(SQL);
        console.log("✅ Migration applied successfully!");

        // Verify
        const res = await client.query("SELECT * FROM information_schema.tables WHERE table_name = 'plan_suggestions'");
        if (res.rows.length > 0) {
            console.log("✅ Verified: Table 'plan_suggestions' exists.");
        } else {
            console.error("❌ Verification Failed: Table not found.");
        }

    } catch (err) {
        console.error("❌ Migration Failed:", err);
    } finally {
        await client.end();
    }
}

runMigration();
