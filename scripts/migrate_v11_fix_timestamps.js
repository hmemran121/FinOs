import pg from 'pg';
const { Client } = pg;

const CONNECTION_STRING = 'postgresql://postgres:howladerFinos@db.liwnjbvintygnvhgbguw.supabase.co:5432/postgres';

const TABLES_TO_FIX = [
    'financial_plans',
    'financial_plan_components',
    'financial_plan_settlements',
    'transactions',
    'wallets',
    'channels',
    'categories',
    'commitments',
    'budgets',
    'transfers',
    'profiles',
    'currencies',
    'channel_types'
];

async function runMigration() {
    console.log("🚀 Connecting to Supabase for V11 (Timestamp Fix)...");
    const client = new Client({
        connectionString: CONNECTION_STRING,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log("✅ Connected.");

        for (const table of TABLES_TO_FIX) {
            try {
                // Check if table exists
                const res = await client.query(`SELECT 1 FROM information_schema.tables WHERE table_name = '${table}'`);
                if (res.rows.length === 0) {
                    console.log(`⚠️ Table '${table}' does not exist. Skipping.`);
                    continue;
                }

                console.log(`📦 updating table: ${table}...`);

                // 1. Drop Default
                await client.query(`ALTER TABLE public.${table} ALTER COLUMN updated_at DROP DEFAULT`);

                // 2. Change Type with Explicit Cast
                await client.query(`ALTER TABLE public.${table} ALTER COLUMN updated_at TYPE BIGINT USING (extract(epoch from updated_at::timestamptz) * 1000)::bigint`);

                // 3. Set New Default (BIGINT milliseconds)
                await client.query(`ALTER TABLE public.${table} ALTER COLUMN updated_at SET DEFAULT (extract(epoch from now()) * 1000)::bigint`);

                console.log(`✅ ${table} updated to BIGINT.`);

            } catch (e) {
                console.warn(`❌ Failed to update ${table}:`, e.message);
            }
        }

        console.log("🎉 All tables processed.");

    } catch (err) {
        console.error("❌ Migration Failed:", err);
    } finally {
        await client.end();
    }
}

runMigration();
