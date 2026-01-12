const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

const fixRecursion = async () => {
    if (!process.env.DATABASE_URL) {
        console.error('❌ DATABASE_URL is missing.');
        process.exit(1);
    }

    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log('✅ Connected to Postgres');

        await client.query('BEGIN');

        // 1. Create a Helper Function to break recursion
        // SECURITY DEFINER = runs as owner, bypassing RLS checks
        console.log('Creating helper function...');
        await client.query(`
            CREATE OR REPLACE FUNCTION get_auth_org_id()
            RETURNS text
            LANGUAGE sql
            SECURITY DEFINER
            SET search_path = public
            AS $$
                SELECT organization_id FROM profiles WHERE id::text = auth.uid()::text LIMIT 1;
            $$;
        `);

        // 2. Drop the recursive policy
        console.log('Dropping recursive policy...');
        await client.query(`DROP POLICY IF EXISTS "Users can view org members" ON profiles`);

        // 3. Re-create policy using the helper function
        console.log('Creating optimized policy...');
        await client.query(`
            CREATE POLICY "Users can view org members" 
            ON profiles FOR SELECT 
            USING (
                organization_id IS NOT NULL 
                AND 
                organization_id = get_auth_org_id()
            )
        `);

        await client.query('COMMIT');
        console.log('🎉 Infinite Recursion Fixed!');

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('❌ Fix Failed:', err);
    } finally {
        await client.end();
    }
};

fixRecursion();
