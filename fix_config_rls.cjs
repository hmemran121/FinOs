
const { Client } = require('pg');

const connectionString = 'postgresql://postgres:howladerFinos@db.liwnjbvintygnvhgbguw.supabase.co:5432/postgres';

async function fixConfigPolicies() {
    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log("✅ Connected to Supabase.");

        const sql = `
            -- 1. Enable RLS
            ALTER TABLE public.currencies ENABLE ROW LEVEL SECURITY;
            ALTER TABLE public.channel_types ENABLE ROW LEVEL SECURITY;

            -- 2. Drop existing potentially restrictive policies
            DROP POLICY IF EXISTS "Allow public read access" ON public.currencies;
            DROP POLICY IF EXISTS "Allow public read access" ON public.channel_types;
            DROP POLICY IF EXISTS "Enable read access for all users" ON public.currencies;
            DROP POLICY IF EXISTS "Enable read access for all users" ON public.channel_types;

            -- 3. Create permissive policies for CONFIG tables (Read Only for everyone, or at least authenticated)
            -- We want authenticated users to digest this config.
            CREATE POLICY "Allow public read access" ON public.currencies FOR SELECT USING (true);
            CREATE POLICY "Allow public read access" ON public.channel_types FOR SELECT USING (true);

            -- 4. Grant access just in case
            GRANT SELECT ON public.currencies TO anon, authenticated;
            GRANT SELECT ON public.channel_types TO anon, authenticated;

            -- 5. Set Replica Identity for Realtime
            ALTER TABLE public.currencies REPLICA IDENTITY FULL;
            ALTER TABLE public.channel_types REPLICA IDENTITY FULL;

            -- 6. Ensure publication includes them
            ALTER PUBLICATION supabase_realtime ADD TABLE public.currencies;
            ALTER PUBLICATION supabase_realtime ADD TABLE public.channel_types;
        `;

        console.log("➡️ Applying Config RLS Policies...");
        await client.query(sql);
        console.log("✅ Config RLS Policies applied.");

    } catch (err) {
        // Ignore "already exists" errors for publication
        if (err.code === '42710') {
            console.log("ℹ️ Tables already in publication.");
        } else {
            console.error("❌ Error applying policies:", err);
        }
    } finally {
        await client.end();
    }
}

fixConfigPolicies();
