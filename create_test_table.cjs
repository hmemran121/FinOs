
const { Client } = require('pg');

// Using the Bypass URL from .env.local
const connectionString = 'postgresql://postgres.liwnjbvintygnvhgbguw:howladerFinos@aws-1-ap-south-1.pooler.supabase.com:6543/postgres';

async function createTestTable() {
    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log("✅ Connected to Supabase via TRANSACTION POOLER (Port 6543).");

        const sql = `
            CREATE TABLE IF NOT EXISTS public.test (
                id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                item_name text NOT NULL,
                created_at timestamptz DEFAULT now()
            );

            -- Also ensure RLS is enabled and accessible
            ALTER TABLE public.test ENABLE ROW LEVEL SECURITY;
            
            DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.test;
            CREATE POLICY "Enable all for authenticated users" ON public.test FOR ALL TO authenticated USING (true) WITH CHECK (true);
            
            -- Insert a test record to verify
            INSERT INTO public.test (item_name) VALUES ('Test Row Created by Antigravity Agent');
        `;

        console.log("➡️ Attempting to create 'test' table...");
        await client.query(sql);
        console.log("✅ SUCCESS! Table 'test' created and record inserted via Bypass URL.");

    } catch (err) {
        console.error("❌ Still Blocked:", err.message);
    } finally {
        await client.end();
    }
}

createTestTable();
