
const { Client } = require('pg');

const connectionString = 'postgresql://postgres:howladerFinos@db.liwnjbvintygnvhgbguw.supabase.co:5432/postgres';

async function applyFix() {
    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log("✅ Connected to Supabase PostgreSQL.");

        const sql = `
            -- Standardize Foreign Key Relationships for Global Intelligence
            
            -- Ensure wallets.user_id points to profiles.id
            ALTER TABLE public.wallets 
            DROP CONSTRAINT IF EXISTS fk_wallets_user_id;
            
            ALTER TABLE public.wallets 
            ADD CONSTRAINT fk_wallets_user_id 
            FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

            -- Ensure transactions.user_id points to profiles.id
            ALTER TABLE public.transactions 
            DROP CONSTRAINT IF EXISTS fk_transactions_user_id;
            
            ALTER TABLE public.transactions 
            ADD CONSTRAINT fk_transactions_user_id 
            FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

            -- Ensure channels.user_id points to profiles.id
            ALTER TABLE public.channels 
            DROP CONSTRAINT IF EXISTS fk_channels_user_id;
            
            ALTER TABLE public.channels 
            ADD CONSTRAINT fk_channels_user_id 
            FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

            -- Reload PostgREST Schema Cache
            NOTIFY pgrst, 'reload schema';
        `;

        console.log("➡️ Establishing formal database relationships...");
        await client.query(sql);
        console.log("✅ Relationships established and schema cache reloaded!");

    } catch (err) {
        console.error("❌ Error establishing relationships:", err);
    } finally {
        await client.end();
    }
}

applyFix();
