
const { Client } = require('pg');

const connectionString = 'postgresql://postgres:howladerFinos@db.liwnjbvintygnvhgbguw.supabase.co:5432/postgres';

async function alignSupabaseSchema() {
    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log("✅ Connected to Supabase PostgreSQL.");

        const sql = `
            -- 1. Align Profiles table
            ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;
            ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD';
            ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS theme TEXT DEFAULT 'DARK';
            ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ai_enabled BOOLEAN DEFAULT TRUE;
            ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS biometric_enabled BOOLEAN DEFAULT TRUE;
            ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS device_id TEXT;
            ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;
            ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;

            -- 2. Create Budgets table
            CREATE TABLE IF NOT EXISTS public.budgets (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                amount REAL NOT NULL,
                category_id TEXT,
                period TEXT,
                updated_at TIMESTAMPTZ DEFAULT NOW(),
                version INTEGER DEFAULT 1,
                device_id TEXT DEFAULT 'unknown',
                is_deleted BOOLEAN DEFAULT FALSE,
                user_id UUID REFERENCES auth.users(id)
            );

            -- Indexes
            CREATE INDEX IF NOT EXISTS idx_budgets_user_id ON public.budgets(user_id);

            -- RLS
            ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'budgets' AND policyname = 'Users can manage their own budgets') THEN
                    CREATE POLICY "Users can manage their own budgets" ON public.budgets FOR ALL USING (auth.uid() = user_id);
                END IF;
            END $$;

            -- Enable Realtime
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
                    CREATE PUBLICATION supabase_realtime;
                END IF;
            END $$;
            
            DO $$ 
            BEGIN 
                ALTER PUBLICATION supabase_realtime ADD TABLE public.budgets;
            EXCEPTION WHEN others THEN NULL;
            END $$;

            DO $$ 
            BEGIN 
                ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
            EXCEPTION WHEN others THEN NULL;
            END $$;

            ALTER TABLE public.profiles REPLICA IDENTITY FULL;
            ALTER TABLE public.budgets REPLICA IDENTITY FULL;
        `;

        console.log("➡️ Aligning Supabase schema (Profiles & Budgets)...");
        await client.query(sql);
        console.log("✅ Supabase schema aligned!");

    } catch (err) {
        console.error("❌ Error aligning schema:", err);
    } finally {
        await client.end();
    }
}

alignSupabaseSchema();
