
const { Client } = require('pg');

const connectionString = 'postgresql://postgres:howladerFinos@db.liwnjbvintygnvhgbguw.supabase.co:5432/postgres';

async function forceTriggers() {
    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log("✅ Connected to Supabase PostgreSQL.");

        const sql = `
            -- 1. Create the function/trigger handler
            CREATE OR REPLACE FUNCTION update_updated_at_column()
            RETURNS TRIGGER AS $$
            BEGIN
                NEW.updated_at = NOW();
                RETURN NEW;
            END;
            $$ language 'plpgsql';

            -- 2. Define the tables to protect
            DO $$
            DECLARE
                t text;
                tables text[] := ARRAY['wallets', 'transactions', 'categories', 'commitments', 'channels', 'transfers', 'budgets', 'profiles', 'currencies', 'channel_types'];
            BEGIN
                FOREACH t IN ARRAY tables
                LOOP
                    -- Verify table exists
                    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = t) THEN
                        -- Drop existing trigger to avoid duplicates
                        EXECUTE format('DROP TRIGGER IF EXISTS update_%I_updated_at ON public.%I', t, t);
                        
                        -- Create the trigger
                        EXECUTE format('CREATE TRIGGER update_%I_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()', t, t);
                        
                        RAISE NOTICE 'Trigger added for %', t;
                    END IF;
                END LOOP;
            END $$;
        `;

        console.log("➡️ Installing automatic 'updated_at' triggers...");
        await client.query(sql);
        console.log("✅ All triggers installed. Updates will now auto-refresh timestamp.");

    } catch (err) {
        console.error("❌ Error installing triggers:", err);
    } finally {
        await client.end();
    }
}

forceTriggers();
