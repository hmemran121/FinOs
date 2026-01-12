const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

const secureTables = async () => {
    if (!process.env.DATABASE_URL) {
        console.error('❌ DATABASE_URL is missing.');
        process.exit(1);
    }

    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    // Tables that are strictly per-user
    const userTables = [
        'categories_user',
        'wallets',
        'channels',
        'transactions',
        'transfers',
        'commitments',
        'budgets',
        'financial_plans',
        'financial_plan_components',
        'financial_plan_settlements',
        'plan_suggestions',
        'notifications',
        'ai_memories',
        'ai_usage_logs'
    ];

    // Global reference tables (Read by all, Write by Super Admin)
    const globalTables = [
        'categories_global',
        'currencies',
        'channel_types'
    ];

    try {
        await client.connect();
        console.log('✅ Connected to Postgres. Securing Tables...');

        await client.query('BEGIN');

        // Sync Fields Definition (Standard)
        const syncFields = `
            updated_at BIGINT DEFAULT (extract(epoch from now()) * 1000),
            server_updated_at BIGINT DEFAULT (extract(epoch from now()) * 1000),
            version INTEGER DEFAULT 1,
            device_id TEXT DEFAULT 'unknown',
            user_id TEXT DEFAULT 'unknown',
            is_deleted INTEGER DEFAULT 0
        `;

        // 0. Create Tables if not exist
        console.log('🏗️ Ensuring Schema Existence...');

        // Global Tables
        await client.query(`CREATE TABLE IF NOT EXISTS categories_global (id TEXT PRIMARY KEY, name TEXT NOT NULL, icon TEXT, color TEXT, type TEXT, parent_id TEXT, "order" INTEGER, embedding TEXT, ${syncFields})`);
        await client.query(`CREATE TABLE IF NOT EXISTS currencies (code TEXT PRIMARY KEY, name TEXT NOT NULL, symbol TEXT NOT NULL, ${syncFields})`);
        await client.query(`CREATE TABLE IF NOT EXISTS channel_types (id TEXT PRIMARY KEY, name TEXT NOT NULL, icon_name TEXT NOT NULL, color TEXT NOT NULL, is_default INTEGER DEFAULT 0, ${syncFields})`);

        // User Tables
        await client.query(`CREATE TABLE IF NOT EXISTS categories_user (id TEXT PRIMARY KEY, name TEXT NOT NULL, icon TEXT, color TEXT, type TEXT, parent_id TEXT, "order" INTEGER, embedding TEXT, ${syncFields})`);
        await client.query(`CREATE TABLE IF NOT EXISTS wallets (id TEXT PRIMARY KEY, name TEXT NOT NULL, currency TEXT NOT NULL, initial_balance REAL, color TEXT, icon TEXT, is_visible INTEGER DEFAULT 1, is_primary INTEGER DEFAULT 0, uses_primary_income INTEGER DEFAULT 0, parent_wallet_id TEXT, ${syncFields})`);
        await client.query(`CREATE TABLE IF NOT EXISTS channels (id TEXT PRIMARY KEY, wallet_id TEXT NOT NULL, type TEXT NOT NULL, balance REAL DEFAULT 0, ${syncFields})`); // Removed FK constraint for simplicity/flexibility in sync
        await client.query(`CREATE TABLE IF NOT EXISTS transactions (id TEXT PRIMARY KEY, amount REAL NOT NULL, date TEXT NOT NULL, wallet_id TEXT, channel_type TEXT, category_id TEXT, note TEXT, type TEXT, is_split INTEGER DEFAULT 0, to_wallet_id TEXT, to_channel_type TEXT, linked_transaction_id TEXT, is_sub_ledger_sync INTEGER DEFAULT 0, sub_ledger_id TEXT, sub_ledger_name TEXT, ${syncFields})`);
        await client.query(`CREATE TABLE IF NOT EXISTS transfers (id TEXT PRIMARY KEY, from_wallet_id TEXT NOT NULL, to_wallet_id TEXT NOT NULL, from_channel TEXT NOT NULL, to_channel TEXT NOT NULL, amount REAL NOT NULL, date TEXT NOT NULL, note TEXT, ${syncFields})`);
        await client.query(`CREATE TABLE IF NOT EXISTS commitments (id TEXT PRIMARY KEY, name TEXT NOT NULL, amount REAL NOT NULL, frequency TEXT NOT NULL, certainty_level TEXT NOT NULL, type TEXT NOT NULL, wallet_id TEXT, next_date TEXT NOT NULL, status TEXT DEFAULT 'ACTIVE', history TEXT DEFAULT '[]', is_recurring INTEGER DEFAULT 0, ${syncFields})`);
        await client.query(`CREATE TABLE IF NOT EXISTS budgets (id TEXT PRIMARY KEY, name TEXT NOT NULL, amount REAL NOT NULL, category_id TEXT, period TEXT, ${syncFields})`);
        await client.query(`CREATE TABLE IF NOT EXISTS financial_plans (id TEXT PRIMARY KEY, wallet_id TEXT, plan_type TEXT, title TEXT, status TEXT, planned_date TEXT, finalized_at TEXT, total_amount REAL, note TEXT, ${syncFields})`);
        await client.query(`CREATE TABLE IF NOT EXISTS financial_plan_components (id TEXT PRIMARY KEY, plan_id TEXT, name TEXT, component_type TEXT, quantity REAL, unit TEXT, expected_cost REAL, final_cost REAL, category_id TEXT, group_id TEXT, group_parent_id TEXT, ${syncFields})`);
        await client.query(`CREATE TABLE IF NOT EXISTS financial_plan_settlements (id TEXT PRIMARY KEY, plan_id TEXT, channel_id TEXT, amount REAL, ${syncFields})`);
        await client.query(`CREATE TABLE IF NOT EXISTS plan_suggestions (id TEXT PRIMARY KEY, name TEXT NOT NULL, usage_count INTEGER DEFAULT 0, ${syncFields})`);
        await client.query(`CREATE TABLE IF NOT EXISTS notifications (id TEXT PRIMARY KEY, type TEXT, priority TEXT, title TEXT, message TEXT, is_read INTEGER DEFAULT 0, action_url TEXT, data TEXT, created_at BIGINT, ${syncFields})`);
        await client.query(`CREATE TABLE IF NOT EXISTS ai_memories (id TEXT PRIMARY KEY, memory_key TEXT, memory_value TEXT, memory_type TEXT, confidence REAL, last_used_at BIGINT, created_at BIGINT, ${syncFields})`);
        await client.query(`CREATE TABLE IF NOT EXISTS ai_usage_logs (id TEXT PRIMARY KEY, key_id TEXT, activity_type TEXT, model TEXT, input_tokens INTEGER DEFAULT 0, output_tokens INTEGER DEFAULT 0, total_tokens INTEGER DEFAULT 0, timestamp BIGINT, status TEXT, error_msg TEXT, ${syncFields})`);

        // 1. Secure User Tables
        for (const table of userTables) {
            console.log(`🔒 Securing [${table}]...`);

            // Enable RLS
            await client.query(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY`);

            // Drop existing policies (to be clean)
            await client.query(`DROP POLICY IF EXISTS "User own rows" ON ${table}`);
            await client.query(`DROP POLICY IF EXISTS "Super Admin all" ON ${table}`);

            // Policy: User Owns Data
            // user_id is text, auth.uid() is uuid. cast both to text for safety.
            await client.query(`
                CREATE POLICY "User own rows"
                ON ${table}
                FOR ALL
                USING (user_id::text = auth.uid()::text)
                WITH CHECK (user_id::text = auth.uid()::text)
            `);

            // Policy: Super Admin Access
            await client.query(`
                CREATE POLICY "Super Admin all"
                ON ${table}
                FOR ALL
                USING ( (SELECT is_super_admin FROM profiles WHERE id::text = auth.uid()::text LIMIT 1) = 1 )
            `);
        }

        // 2. Secure Global Tables
        for (const table of globalTables) {
            console.log(`🌍 Securing Global [${table}]...`);

            // Enable RLS
            await client.query(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY`);

            // Drop existing
            await client.query(`DROP POLICY IF EXISTS "Public Read" ON ${table}`);
            await client.query(`DROP POLICY IF EXISTS "Super Admin Write" ON ${table}`);

            // Policy: Public Read
            await client.query(`
                CREATE POLICY "Public Read"
                ON ${table}
                FOR SELECT
                USING (true)
            `);

            // Policy: Super Admin Write
            await client.query(`
                CREATE POLICY "Super Admin Write"
                ON ${table}
                FOR ALL
                USING ( (SELECT is_super_admin FROM profiles WHERE id::text = auth.uid()::text LIMIT 1) = 1 )
            `);
        }

        await client.query('COMMIT');
        console.log('🎉 All tables secured with RBAC RLS policies!');

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('❌ Security Update Failed:', err);
    } finally {
        await client.end();
    }
};

secureTables();
