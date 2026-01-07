
const { Client } = require('pg');

const connectionString = 'postgresql://postgres.liwnjbvintygnvhgbguw:howladerFinos@aws-1-ap-south-1.pooler.supabase.com:6543/postgres';

async function unifySchema() {
    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log("✅ Connected to Supabase.");

        const sql = `
            -- Drop defaults first to allow type changes
            ALTER TABLE public.financial_plans ALTER COLUMN updated_at DROP DEFAULT;
            ALTER TABLE public.financial_plan_components ALTER COLUMN updated_at DROP DEFAULT;
            ALTER TABLE public.financial_plan_settlements ALTER COLUMN updated_at DROP DEFAULT;

            -- Convert updated_at to TIMESTAMPTZ (Standardized for all tables)
            ALTER TABLE public.financial_plans ALTER COLUMN updated_at TYPE TIMESTAMPTZ USING to_timestamp(updated_at / 1000.0);
            ALTER TABLE public.financial_plan_components ALTER COLUMN updated_at TYPE TIMESTAMPTZ USING to_timestamp(updated_at / 1000.0);
            ALTER TABLE public.financial_plan_settlements ALTER COLUMN updated_at TYPE TIMESTAMPTZ USING to_timestamp(updated_at / 1000.0);

            -- Set new defaults
            ALTER TABLE public.financial_plans ALTER COLUMN updated_at SET DEFAULT now();
            ALTER TABLE public.financial_plan_components ALTER COLUMN updated_at SET DEFAULT now();
            ALTER TABLE public.financial_plan_settlements ALTER COLUMN updated_at SET DEFAULT now();

            -- Add user_id correctly with security linking
            ALTER TABLE public.financial_plans ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) DEFAULT auth.uid();
            ALTER TABLE public.financial_plan_components ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) DEFAULT auth.uid();
            ALTER TABLE public.financial_plan_settlements ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) DEFAULT auth.uid();

            -- Enable RLS and setup owner-scoped policies
            ALTER TABLE public.financial_plans ENABLE ROW LEVEL SECURITY;
            ALTER TABLE public.financial_plan_components ENABLE ROW LEVEL SECURITY;
            ALTER TABLE public.financial_plan_settlements ENABLE ROW LEVEL SECURITY;

            DROP POLICY IF EXISTS "Users can manage their own plans" ON public.financial_plans;
            CREATE POLICY "Users can manage their own plans" ON public.financial_plans FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

            DROP POLICY IF EXISTS "Users can manage their own components" ON public.financial_plan_components;
            CREATE POLICY "Users can manage their own components" ON public.financial_plan_components FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

            DROP POLICY IF EXISTS "Users can manage their own settlements" ON public.financial_plan_settlements;
            CREATE POLICY "Users can manage their own settlements" ON public.financial_plan_settlements FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
        `;

        console.log("➡️ standardized Schema (TIMESTAMPTZ + RLS)...");
        await client.query(sql);
        console.log("✅ Successfully unified schema!");

    } catch (err) {
        console.error("❌ Error unifying schema:", err.message);
    } finally {
        await client.end();
    }
}

unifySchema();
