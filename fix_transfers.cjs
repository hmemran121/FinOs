
const { Client } = require('pg');

const connectionString = 'postgresql://postgres:howladerFinos@db.liwnjbvintygnvhgbguw.supabase.co:5432/postgres';

async function fixTransfers() {
    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log("✅ Connected to Supabase PostgreSQL.");

        const sql = `
            -- Fix Transfers table
            CREATE TABLE IF NOT EXISTS public.transfers (
                id TEXT PRIMARY KEY,
                from_wallet_id TEXT NOT NULL,
                to_wallet_id TEXT NOT NULL,
                from_channel TEXT NOT NULL,
                to_channel TEXT NOT NULL,
                amount REAL NOT NULL,
                date TEXT NOT NULL,
                note TEXT,
                updated_at TIMESTAMPTZ DEFAULT NOW(),
                version INTEGER DEFAULT 1,
                device_id TEXT DEFAULT 'unknown',
                is_deleted BOOLEAN DEFAULT FALSE,
                user_id UUID REFERENCES auth.users(id)
            );

            -- Ensure columns exist if table already existed
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='transfers' AND column_name='user_id') THEN
                    ALTER TABLE public.transfers ADD COLUMN user_id UUID REFERENCES auth.users(id);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='transfers' AND column_name='updated_at') THEN
                    ALTER TABLE public.transfers ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='transfers' AND column_name='device_id') THEN
                    ALTER TABLE public.transfers ADD COLUMN device_id TEXT DEFAULT 'unknown';
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='transfers' AND column_name='version') THEN
                    ALTER TABLE public.transfers ADD COLUMN version INTEGER DEFAULT 1;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='transfers' AND column_name='is_deleted') THEN
                    ALTER TABLE public.transfers ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE;
                END IF;
            END $$;

            -- Enable RLS
            ALTER TABLE public.transfers ENABLE ROW LEVEL SECURITY;

            -- Create Policy (ignoring error if exists)
            DO $$ 
            BEGIN 
                CREATE POLICY "Users can manage their own transfers" 
                ON public.transfers FOR ALL 
                USING (auth.uid() = user_id);
            EXCEPTION WHEN others THEN 
                NULL;
            END $$;

            -- Enable Realtime
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
                    CREATE PUBLICATION supabase_realtime;
                END IF;
            END $$;
            
            ALTER PUBLICATION supabase_realtime ADD TABLE public.transfers;
            ALTER TABLE public.transfers REPLICA IDENTITY FULL;
        `;

        console.log("➡️ Fixing Transfers on Supabase...");
        await client.query(sql);
        console.log("✅ Transfers table fixed and Realtime enabled!");

    } catch (err) {
        console.error("❌ Error fixing transfers:", err);
    } finally {
        await client.end();
    }
}

fixTransfers();
