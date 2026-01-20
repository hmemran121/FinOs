/**
 * Setup RLS Template Functions
 * 
 * This script creates helper functions for easy RLS management
 */

import pkg from 'pg';
const { Client } = pkg;

const DATABASE_URL = 'postgresql://postgres.liwnjbvintygnvhgbguw:howladerFinos@aws-1-ap-south-1.pooler.supabase.com:6543/postgres';

async function setupRLSFunctions() {
    const client = new Client({
        connectionString: DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log('🔌 Connecting to Supabase...');
        await client.connect();
        console.log('✅ Connected!\n');

        console.log('📋 Creating RLS helper functions...\n');

        // Create apply_user_rls function
        await client.query(`
      CREATE OR REPLACE FUNCTION apply_user_rls(table_name TEXT)
      RETURNS TEXT AS $$
      DECLARE
        result TEXT;
      BEGIN
        -- Step 1: Enable RLS
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_name);
        
        -- Step 2: Drop existing policies
        EXECUTE format('DROP POLICY IF EXISTS "Users can view own %s" ON %I', table_name, table_name);
        EXECUTE format('DROP POLICY IF EXISTS "Users can insert own %s" ON %I', table_name, table_name);
        EXECUTE format('DROP POLICY IF EXISTS "Users can update own %s" ON %I', table_name, table_name);
        EXECUTE format('DROP POLICY IF EXISTS "Users can delete own %s" ON %I', table_name, table_name);
        
        -- Step 3: Create new policies
        EXECUTE format('
          CREATE POLICY "Users can view own %s" 
          ON %I FOR SELECT 
          USING (auth.uid() = user_id)
        ', table_name, table_name);
        
        EXECUTE format('
          CREATE POLICY "Users can insert own %s" 
          ON %I FOR INSERT 
          WITH CHECK (auth.uid() = user_id)
        ', table_name, table_name);
        
        EXECUTE format('
          CREATE POLICY "Users can update own %s" 
          ON %I FOR UPDATE 
          USING (auth.uid() = user_id) 
          WITH CHECK (auth.uid() = user_id)
        ', table_name, table_name);
        
        EXECUTE format('
          CREATE POLICY "Users can delete own %s" 
          ON %I FOR DELETE 
          USING (auth.uid() = user_id)
        ', table_name, table_name);
        
        result := format('✅ RLS applied successfully on table: %s', table_name);
        RETURN result;
        
      EXCEPTION
        WHEN OTHERS THEN
          RETURN format('❌ Error: %s', SQLERRM);
      END;
      $$ LANGUAGE plpgsql;
    `);
        console.log('✅ Created apply_user_rls() function');

        // Create check_rls_status function
        await client.query(`
      CREATE OR REPLACE FUNCTION check_rls_status()
      RETURNS TABLE(
        table_name TEXT,
        rls_enabled BOOLEAN,
        policy_count BIGINT
      ) AS $$
      BEGIN
        RETURN QUERY
        SELECT 
          t.tablename::TEXT,
          t.rowsecurity,
          COUNT(p.policyname)
        FROM pg_tables t
        LEFT JOIN pg_policies p ON t.tablename = p.tablename
        WHERE t.schemaname = 'public'
        GROUP BY t.tablename, t.rowsecurity
        ORDER BY t.tablename;
      END;
      $$ LANGUAGE plpgsql;
    `);
        console.log('✅ Created check_rls_status() function');

        // Create bulk_apply_rls function
        await client.query(`
      CREATE OR REPLACE FUNCTION bulk_apply_rls(table_names TEXT[])
      RETURNS TABLE(
        table_name TEXT,
        status TEXT
      ) AS $$
      DECLARE
        tbl TEXT;
      BEGIN
        FOREACH tbl IN ARRAY table_names
        LOOP
          table_name := tbl;
          status := apply_user_rls(tbl);
          RETURN NEXT;
        END LOOP;
      END;
      $$ LANGUAGE plpgsql;
    `);
        console.log('✅ Created bulk_apply_rls() function');

        console.log('\n🎉 All helper functions created!\n');
        console.log('📖 Usage Examples:\n');
        console.log('   -- Apply RLS to a new table:');
        console.log('   SELECT apply_user_rls(\'my_new_table\');\n');
        console.log('   -- Check RLS status:');
        console.log('   SELECT * FROM check_rls_status();\n');
        console.log('   -- Apply RLS to multiple tables:');
        console.log('   SELECT * FROM bulk_apply_rls(ARRAY[\'table1\', \'table2\']);\n');

    } catch (error) {
        console.error('❌ Error:', error);
        throw error;
    } finally {
        await client.end();
        console.log('🔌 Disconnected from Supabase');
    }
}

setupRLSFunctions()
    .then(() => {
        console.log('\n✅ Done!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n💥 Failed:', error);
        process.exit(1);
    });
