
const { Client } = require('pg');

const connectionString = 'postgresql://postgres:howladerFinos@db.liwnjbvintygnvhgbguw.supabase.co:5432/postgres';

async function enableRealtime() {
    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log("✅ Connected to Supabase PostgreSQL.");

        const sql = `
            -- Enable Realtime for the tables
            -- First, ensure the publication exists
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
                    CREATE PUBLICATION supabase_realtime;
                END IF;
            END $$;

            -- Add tables to the publication
            ALTER PUBLICATION supabase_realtime ADD TABLE public.categories;
            ALTER PUBLICATION supabase_realtime ADD TABLE public.wallets;
            ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;
            ALTER PUBLICATION supabase_realtime ADD TABLE public.commitments;
            
            -- Set replica identity to FULL so we get old data on deletes/updates if needed
            -- (Required for some realtime features)
            ALTER TABLE public.categories REPLICA IDENTITY FULL;
            ALTER TABLE public.wallets REPLICA IDENTITY FULL;
            ALTER TABLE public.transactions REPLICA IDENTITY FULL;
            ALTER TABLE public.commitments REPLICA IDENTITY FULL;
        `;

        console.log("➡️ Enabling Supabase Realtime for tables...");
        try {
            await client.query(sql);
            console.log("✅ Realtime enabled successfully!");
        } catch (e) {
            // It might fail if tables are already in publication
            console.log("⚠️ Some tables might already be in publication, check logs for specifics if error persists.");
            console.error(e.message);
        }

    } catch (err) {
        console.error("❌ Error enabling realtime:", err);
    } finally {
        await client.end();
    }
}

enableRealtime();
