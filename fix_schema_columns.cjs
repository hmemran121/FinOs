
const { Client } = require('pg');

const connectionString = 'postgresql://postgres:howladerFinos@db.liwnjbvintygnvhgbguw.supabase.co:5432/postgres';

async function fixSchema() {
    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log("✅ Connected to Supabase.");

        const sql = `
            ALTER TABLE public.wallets ADD COLUMN IF NOT EXISTS is_visible BOOLEAN DEFAULT TRUE;
            ALTER TABLE public.wallets ADD COLUMN IF NOT EXISTS is_primary BOOLEAN DEFAULT FALSE;
            ALTER TABLE public.wallets ADD COLUMN IF NOT EXISTS uses_primary_income BOOLEAN DEFAULT FALSE;
            
            -- Also ensure channels have type
            ALTER TABLE public.channels ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'CASH';

            -- Force schema cache reload just in case
            NOTIFY pgrst, 'reload schema';
        `;

        console.log("➡️ Applying missing columns...");
        await client.query(sql);
        console.log("✅ Schema updated.");

    } catch (err) {
        console.error("❌ Error fixing schema:", err);
    } finally {
        await client.end();
    }
}

fixSchema();
