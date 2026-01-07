
const { Client } = require('pg');

const connectionString = 'postgresql://postgres:howladerFinos@db.liwnjbvintygnvhgbguw.supabase.co:5432/postgres';

async function hardenRealtime() {
    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log("✅ Connected to Supabase PostgreSQL.");

        const coreTables = ['categories', 'wallets', 'transactions', 'commitments', 'transfers', 'budgets', 'profiles', 'channels'];

        let sql = `
            -- Ensure publication exists
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
                    CREATE PUBLICATION supabase_realtime;
                END IF;
            END $$;
        `;

        for (const table of coreTables) {
            sql += `
                -- Enable Realtime for ${table}
                DO $$ 
                BEGIN 
                    ALTER PUBLICATION supabase_realtime ADD TABLE public.${table};
                EXCEPTION WHEN others THEN 
                    NULL; -- Already exists
                END $$;

                -- Set Replica Identity to FULL for accurate change tracking
                ALTER TABLE public.${table} REPLICA IDENTITY FULL;
            `;
        }

        console.log("➡️ Hardening Realtime (Tables & Replica Identity)...");
        await client.query(sql);
        console.log("✅ All core tables are now Realtime-Ready with FULL identity!");

    } catch (err) {
        console.error("❌ Error hardening realtime:", err);
    } finally {
        await client.end();
    }
}

hardenRealtime();
