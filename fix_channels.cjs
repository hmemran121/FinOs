
const { Client } = require('pg');

const connectionString = 'postgresql://postgres:howladerFinos@db.liwnjbvintygnvhgbguw.supabase.co:5432/postgres';

async function fixChannels() {
    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log("✅ Connected to Supabase PostgreSQL.");

        const sql = `
            -- Fix Channels table
            CREATE TABLE IF NOT EXISTS public.channels (
                id TEXT PRIMARY KEY,
                wallet_id TEXT NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,
                type TEXT NOT NULL,
                balance REAL DEFAULT 0,
                updated_at TIMESTAMPTZ DEFAULT NOW(),
                version INTEGER DEFAULT 1,
                device_id TEXT DEFAULT 'unknown',
                is_deleted BOOLEAN DEFAULT FALSE,
                user_id UUID REFERENCES auth.users(id)
            );

            -- Indexes for performance
            CREATE INDEX IF NOT EXISTS idx_channels_wallet_id ON public.channels(wallet_id);
            CREATE INDEX IF NOT EXISTS idx_channels_user_id ON public.channels(user_id);

            -- Enable RLS
            ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;

            -- Create Policy (ignoring error if exists)
            DO $$ 
            BEGIN 
                IF NOT EXISTS (
                    SELECT 1 FROM pg_policies WHERE tablename = 'channels' AND policyname = 'Users can manage their own channels'
                ) THEN
                    CREATE POLICY "Users can manage their own channels" 
                    ON public.channels FOR ALL 
                    USING (auth.uid() = user_id);
                END IF;
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
            
            -- Try adding table to publication (ignore if already added)
            DO $$ 
            BEGIN 
                ALTER PUBLICATION supabase_realtime ADD TABLE public.channels;
            EXCEPTION WHEN others THEN 
                NULL;
            END $$;

            ALTER TABLE public.channels REPLICA IDENTITY FULL;
        `;

        console.log("➡️ Creating Channels on Supabase...");
        await client.query(sql);
        console.log("✅ Channels table created and Realtime enabled!");

    } catch (err) {
        console.error("❌ Error fixing channels:", err);
    } finally {
        await client.end();
    }
}

fixChannels();
