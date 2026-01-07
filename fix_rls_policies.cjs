
const { Client } = require('pg');

const connectionString = 'postgresql://postgres:howladerFinos@db.liwnjbvintygnvhgbguw.supabase.co:5432/postgres';

async function fixPolicies() {
    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log("✅ Connected to Supabase.");

        const sql = `
            -- 1. Fix Channels Policies
            DROP POLICY IF EXISTS "Users can manage their own channels" ON public.channels;
            DROP POLICY IF EXISTS "Users can view their own channels" ON public.channels;
            DROP POLICY IF EXISTS "Users can insert their own channels" ON public.channels;
            DROP POLICY IF EXISTS "Users can update their own channels" ON public.channels;
            DROP POLICY IF EXISTS "Users can delete their own channels" ON public.channels;

            CREATE POLICY "Users can view their own channels" ON public.channels FOR SELECT USING (auth.uid() = user_id);
            CREATE POLICY "Users can insert their own channels" ON public.channels FOR INSERT WITH CHECK (auth.uid() = user_id);
            CREATE POLICY "Users can update their own channels" ON public.channels FOR UPDATE USING (auth.uid() = user_id);
            CREATE POLICY "Users can delete their own channels" ON public.channels FOR DELETE USING (auth.uid() = user_id);

            -- 2. Verify Wallets Policies
            -- (Re-applying just in case)
            DROP POLICY IF EXISTS "Users can view their own wallets" ON public.wallets;
            DROP POLICY IF EXISTS "Users can insert their own wallets" ON public.wallets;
            DROP POLICY IF EXISTS "Users can update their own wallets" ON public.wallets;
            DROP POLICY IF EXISTS "Users can delete their own wallets" ON public.wallets;

            CREATE POLICY "Users can view their own wallets" ON public.wallets FOR SELECT USING (auth.uid() = user_id);
            CREATE POLICY "Users can insert their own wallets" ON public.wallets FOR INSERT WITH CHECK (auth.uid() = user_id);
            CREATE POLICY "Users can update their own wallets" ON public.wallets FOR UPDATE USING (auth.uid() = user_id);
            CREATE POLICY "Users can delete their own wallets" ON public.wallets FOR DELETE USING (auth.uid() = user_id);

            -- 3. Verify Transactions Policies
            DROP POLICY IF EXISTS "Users can view their own transactions" ON public.transactions;
            DROP POLICY IF EXISTS "Users can insert their own transactions" ON public.transactions;
            DROP POLICY IF EXISTS "Users can update their own transactions" ON public.transactions;
            DROP POLICY IF EXISTS "Users can delete their own transactions" ON public.transactions;

            CREATE POLICY "Users can view their own transactions" ON public.transactions FOR SELECT USING (auth.uid() = user_id);
            CREATE POLICY "Users can insert their own transactions" ON public.transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
            CREATE POLICY "Users can update their own transactions" ON public.transactions FOR UPDATE USING (auth.uid() = user_id);
            CREATE POLICY "Users can delete their own transactions" ON public.transactions FOR DELETE USING (auth.uid() = user_id);

            -- 4. Ensure RLS is enabled
            ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;
            ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
            ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

            -- 5. Grant Permissions (just in case default roles are weird)
            GRANT ALL ON public.channels TO authenticated;
            GRANT ALL ON public.wallets TO authenticated;
            GRANT ALL ON public.transactions TO authenticated;
            GRANT ALL ON public.currencies TO authenticated;
            GRANT ALL ON public.channel_types TO authenticated;
        `;

        console.log("➡️ Applying Hardened Policies...");
        await client.query(sql);
        console.log("✅ Policies successfully applied.");

    } catch (err) {
        console.error("❌ Error applying policies:", err);
    } finally {
        await client.end();
    }
}

fixPolicies();
