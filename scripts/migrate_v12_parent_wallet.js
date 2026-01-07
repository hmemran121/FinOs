import pg from 'pg';
const { Client } = pg;

const CONNECTION_STRING = 'postgresql://postgres:howladerFinos@db.liwnjbvintygnvhgbguw.supabase.co:5432/postgres';

const SQL = `
-- Migration: Add parent_wallet_id to wallets table if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'wallets' AND column_name = 'parent_wallet_id'
    ) THEN
        RAISE NOTICE 'Adding parent_wallet_id column to wallets...';
        -- Use TEXT to match the 'id' column type (which is TEXT/VARCHAR due to SQLite sync)
        ALTER TABLE public.wallets ADD COLUMN parent_wallet_id TEXT;
    ELSE
        RAISE NOTICE 'Column parent_wallet_id already exists.';
    END IF;
END
$$;
`;

async function runMigration() {
    console.log("🚀 Connecting to Supabase for V12 (Parent Wallet Fix)...");
    const client = new Client({
        connectionString: CONNECTION_STRING,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log("✅ Connected.");
        await client.query(SQL);
        console.log("✅ Migration applied successfully!");

    } catch (err) {
        console.error("❌ Migration Failed:", err);
    } finally {
        await client.end();
    }
}

runMigration();
