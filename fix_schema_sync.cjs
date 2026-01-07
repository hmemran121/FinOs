
const { Client } = require('pg');

const connectionString = 'postgresql://postgres.liwnjbvintygnvhgbguw:howladerFinos@aws-1-ap-south-1.pooler.supabase.com:6543/postgres';

async function fixSchema() {
    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log("✅ Connected to Supabase.");

        const sql = `
            -- 1. Add user_id to financial tables
            ALTER TABLE public.financial_plans ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) DEFAULT auth.uid();
            ALTER TABLE public.financial_plan_components ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) DEFAULT auth.uid();
            ALTER TABLE public.financial_plan_settlements ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) DEFAULT auth.uid();

            -- 2. Update RLS policies to use user_id
            DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.financial_plans;
            CREATE POLICY "Users can manage their own plans" ON public.financial_plans 
            FOR ALL TO authenticated 
            USING (auth.uid() = user_id) 
            WITH CHECK (auth.uid() = user_id);

            DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.financial_plan_components;
            CREATE POLICY "Users can manage their own components" ON public.financial_plan_components 
            FOR ALL TO authenticated 
            USING (auth.uid() = user_id) 
            WITH CHECK (auth.uid() = user_id);

            DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.financial_plan_settlements;
            CREATE POLICY "Users can manage their own settlements" ON public.financial_plan_settlements 
            FOR ALL TO authenticated 
            USING (auth.uid() = user_id) 
            WITH CHECK (auth.uid() = user_id);

            -- 3. Check profiles updated_at type (just in case, to confirm)
            -- We will handle this in the JS code by checking if we need to convert timestamps
        `;

        console.log("➡️ Fixing Schema and Security Policies...");
        await client.query(sql);
        console.log("✅ Schema fixed! Added user_id and enabled owner-based RLS.");

    } catch (err) {
        console.error("❌ Error fixing schema:", err.message);
    } finally {
        await client.end();
    }
}

fixSchema();
