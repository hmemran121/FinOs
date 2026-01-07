
const { Client } = require('pg');

const connectionString = 'postgresql://postgres.liwnjbvintygnvhgbguw:howladerFinos@aws-1-ap-south-1.pooler.supabase.com:6543/postgres';

async function unifySchema() {
    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log("✅ Connected to Supabase.");

        const sql = `
            -- 1. Helper Function for Precision Timestamps
            CREATE OR REPLACE FUNCTION current_ms() RETURNS BIGINT AS $$
              SELECT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT;
            $$ LANGUAGE SQL;

            -- 2. Trigger Function to auto-update server_updated_at
            CREATE OR REPLACE FUNCTION set_server_updated_at()
            RETURNS TRIGGER AS $$
            BEGIN
              NEW.server_updated_at := current_ms();
              RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;

            -- 3. Loop through all tables and add sync columns + triggers
            DO $$
            DECLARE
                t text;
                sync_tables text[] := ARRAY[
                    'profiles', 'currencies', 'channel_types', 'categories_user', 'categories_global',
                    'wallets', 'channels', 'transactions', 'commitments',
                    'transfers', 'budgets', 'financial_plans',
                    'financial_plan_components', 'financial_plan_settlements'
                ];
            BEGIN
                FOREACH t IN ARRAY sync_tables LOOP
                    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = t AND table_schema = 'public') THEN
                        -- Ensure sync columns exist
                        EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS server_updated_at BIGINT DEFAULT current_ms()', t);
                        EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS version INT8 DEFAULT 1', t);
                        EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS device_id TEXT DEFAULT ''unknown''', t);
                        EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS is_deleted SMALLINT DEFAULT 0', t);
                        EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS updated_at BIGINT DEFAULT current_ms()', t);
                        EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) DEFAULT auth.uid()', t);

                        -- Drop old updated_at column if it was timestamptz to avoid conflicts (optional/caution)
                        -- For this project, we are standardizing on BIGINT for all sync tables.

                        -- Setup trigger
                        EXECUTE format('DROP TRIGGER IF EXISTS tr_set_server_updated_at ON public.%I', t);
                        EXECUTE format('CREATE TRIGGER tr_set_server_updated_at BEFORE INSERT OR UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION set_server_updated_at()', t);
                    END IF;
                END LOOP;
            END;
            $$;
        `;

        console.log("➡️ Applying Sync Engine Schema to Supabase...");
        await client.query(sql);
        console.log("✅ Successfully upgraded remote schema for Ultra-Sync.");

    } catch (err) {
        console.error("❌ Error unifying schema:", err.message);
        // Fallback: If ALTER TYPE fails (e.g. if tables already have data in a way that blocks casting), 
        // try a simpler approach or just adding columns if they are missing.
    } finally {
        await client.end();
    }
}

unifySchema();
