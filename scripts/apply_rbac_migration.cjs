const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

const runMigration = async () => {
    if (!process.env.DATABASE_URL) {
        console.error('❌ DATABASE_URL is missing in .env.local');
        process.exit(1);
    }

    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log('✅ Connected to Supabase Postgres');

        await client.query('BEGIN');

        // 1. Add Columns
        console.log('Adding RBAC columns...');
        await client.query(`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'MEMBER'`);
        await client.query(`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS organization_id TEXT`);
        await client.query(`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS permissions TEXT DEFAULT '{}'`);
        await client.query(`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_super_admin INTEGER DEFAULT 0`);

        // 2. Enable RLS
        console.log('Enabling RLS on profiles...');
        await client.query(`ALTER TABLE profiles ENABLE ROW LEVEL SECURITY`);

        // 3. Create Policies (Drop logic included to be idempotent)
        console.log('Applying RLS Policies...');

        // Policy: Users can see themselves
        await client.query(`DROP POLICY IF EXISTS "Users can view own profile" ON profiles`);
        await client.query(`
            CREATE POLICY "Users can view own profile" 
            ON profiles FOR SELECT 
            USING (auth.uid()::text = id::text)
        `);

        // Policy: Super Admins can see everyone
        await client.query(`DROP POLICY IF EXISTS "Super Admins can view all" ON profiles`);
        await client.query(`
            CREATE POLICY "Super Admins can view all" 
            ON profiles FOR SELECT 
            USING (is_super_admin = 1)
        `);

        // Policy: Users can view members of their own organization
        await client.query(`DROP POLICY IF EXISTS "Users can view org members" ON profiles`);
        await client.query(`
            CREATE POLICY "Users can view org members" 
            ON profiles FOR SELECT 
            USING (organization_id IS NOT NULL AND organization_id = (SELECT organization_id FROM profiles WHERE id::text = auth.uid()::text))
        `);

        // Policy: Users can update own profile (excluding sensitive fields like role/is_super_admin)
        await client.query(`DROP POLICY IF EXISTS "Users can update own profile" ON profiles`);
        await client.query(`
            CREATE POLICY "Users can update own profile" 
            ON profiles FOR UPDATE
            USING (auth.uid()::text = id::text)
            WITH CHECK (auth.uid()::text = id::text)
        `);

        // Policy: Super Admins can update everyone
        await client.query(`DROP POLICY IF EXISTS "Super Admins can update all" ON profiles`);
        await client.query(`
            CREATE POLICY "Super Admins can update all" 
            ON profiles FOR UPDATE
            USING ( (SELECT is_super_admin FROM profiles WHERE id::text = auth.uid()::text) = 1 )
        `);

        await client.query('COMMIT');
        console.log('🎉 Migration Successful!');

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('❌ Migration Failed:', err);
    } finally {
        await client.end();
    }
};

runMigration();
