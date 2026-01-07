
const { Client } = require('pg');

const connectionString = 'postgresql://postgres:howladerFinos@db.liwnjbvintygnvhgbguw.supabase.co:5432/postgres';

async function migrateFinancialPlans() {
    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log("✅ Connected to Supabase via Direct Postgres Connection.");

        const sql = `
            -- 1. Create financial_plans table
            CREATE TABLE IF NOT EXISTS public.financial_plans (
                id TEXT PRIMARY KEY,
                wallet_id TEXT,
                plan_type TEXT,
                title TEXT,
                status TEXT,
                planned_date TEXT,
                finalized_at TEXT,
                total_amount NUMERIC(15, 2),
                note TEXT,
                updated_at BIGINT NOT NULL DEFAULT (extract(epoch from now()) * 1000)::BIGINT,
                version INTEGER NOT NULL DEFAULT 1,
                device_id TEXT NOT NULL DEFAULT 'unknown',
                is_deleted SMALLINT NOT NULL DEFAULT 0
            );

            -- 2. Create financial_plan_components table
            CREATE TABLE IF NOT EXISTS public.financial_plan_components (
                id TEXT PRIMARY KEY,
                plan_id TEXT,
                name TEXT,
                component_type TEXT,
                quantity NUMERIC(15, 2),
                unit TEXT,
                expected_cost NUMERIC(15, 2),
                final_cost NUMERIC(15, 2),
                category_id TEXT,
                updated_at BIGINT NOT NULL DEFAULT (extract(epoch from now()) * 1000)::BIGINT,
                version INTEGER NOT NULL DEFAULT 1,
                device_id TEXT NOT NULL DEFAULT 'unknown',
                is_deleted SMALLINT NOT NULL DEFAULT 0
            );

            -- 3. Create financial_plan_settlements table
            CREATE TABLE IF NOT EXISTS public.financial_plan_settlements (
                id TEXT PRIMARY KEY,
                plan_id TEXT,
                channel_id TEXT,
                amount NUMERIC(15, 2),
                updated_at BIGINT NOT NULL DEFAULT (extract(epoch from now()) * 1000)::BIGINT,
                version INTEGER NOT NULL DEFAULT 1,
                device_id TEXT NOT NULL DEFAULT 'unknown',
                is_deleted SMALLINT NOT NULL DEFAULT 0
            );

            -- 4. Enable Row Level Security (RLS)
            ALTER TABLE public.financial_plans ENABLE ROW LEVEL SECURITY;
            ALTER TABLE public.financial_plan_components ENABLE ROW LEVEL SECURITY;
            ALTER TABLE public.financial_plan_settlements ENABLE ROW LEVEL SECURITY;

            -- 5. Create access policies (Allow all for authenticated users)
            DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.financial_plans;
            CREATE POLICY "Enable all for authenticated users" ON public.financial_plans FOR ALL TO authenticated USING (true) WITH CHECK (true);
            
            DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.financial_plan_components;
            CREATE POLICY "Enable all for authenticated users" ON public.financial_plan_components FOR ALL TO authenticated USING (true) WITH CHECK (true);
            
            DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.financial_plan_settlements;
            CREATE POLICY "Enable all for authenticated users" ON public.financial_plan_settlements FOR ALL TO authenticated USING (true) WITH CHECK (true);

            -- 6. Enable Realtime Replication
            -- Note: We use a block to safely add tables to the publication
            DO $$
            BEGIN
              IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'financial_plans') THEN
                ALTER PUBLICATION supabase_realtime ADD TABLE public.financial_plans;
              END IF;
              IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'financial_plan_components') THEN
                ALTER PUBLICATION supabase_realtime ADD TABLE public.financial_plan_components;
              END IF;
              IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'financial_plan_settlements') THEN
                ALTER PUBLICATION supabase_realtime ADD TABLE public.financial_plan_settlements;
              END IF;
            END $$;
        `;

        console.log("➡️ Running Financial Plans Migrations...");
        await client.query(sql);
        console.log("✅ Migrations completed! Financial Plans tables are now live in Supabase.");

    } catch (err) {
        console.error("❌ Error running migrations:", err);
    } finally {
        await client.end();
    }
}

migrateFinancialPlans();
