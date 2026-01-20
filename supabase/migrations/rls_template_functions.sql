/**
 * RLS Template Function
 * 
 * এই function ব্যবহার করে যেকোনো নতুন user-scoped table-এ RLS apply করতে পারবেন
 * 
 * Usage:
 * SELECT apply_user_rls('your_new_table_name');
 */

-- ========================================
-- CREATE REUSABLE RLS FUNCTION
-- ========================================

CREATE OR REPLACE FUNCTION apply_user_rls(table_name TEXT)
RETURNS TEXT AS $$
DECLARE
  result TEXT;
BEGIN
  -- Step 1: Enable RLS
  EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_name);
  
  -- Step 2: Drop existing policies (if any)
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
    RETURN format('❌ Error applying RLS on %s: %s', table_name, SQLERRM);
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- USAGE EXAMPLES
-- ========================================

-- Example 1: Apply RLS to a new table
-- SELECT apply_user_rls('my_new_table');

-- Example 2: Apply RLS to multiple tables at once
-- SELECT apply_user_rls(tablename) 
-- FROM (VALUES ('table1'), ('table2'), ('table3')) AS t(tablename);

-- ========================================
-- AUTOMATIC RLS FOR FUTURE TABLES
-- ========================================

/**
 * Option 1: Manual approach (Recommended)
 * 
 * যখনই নতুন table তৈরি করবেন, এই command run করুন:
 * SELECT apply_user_rls('your_new_table_name');
 */

/**
 * Option 2: Database Trigger (Advanced)
 * 
 * এটি automatically সব নতুন table-এ RLS apply করবে
 * (শুধু যদি table-এ user_id column থাকে)
 */

CREATE OR REPLACE FUNCTION auto_apply_rls()
RETURNS event_trigger AS $$
DECLARE
  obj record;
  has_user_id boolean;
BEGIN
  FOR obj IN SELECT * FROM pg_event_trigger_ddl_commands()
  LOOP
    -- Check if it's a CREATE TABLE command
    IF obj.command_tag = 'CREATE TABLE' THEN
      -- Check if table has user_id column
      SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = obj.object_identity 
          AND column_name = 'user_id'
      ) INTO has_user_id;
      
      -- If has user_id, apply RLS
      IF has_user_id THEN
        PERFORM apply_user_rls(obj.object_identity);
        RAISE NOTICE 'Auto-applied RLS to table: %', obj.object_identity;
      END IF;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Create event trigger (OPTIONAL - uncomment to enable)
-- DROP EVENT TRIGGER IF EXISTS auto_rls_trigger;
-- CREATE EVENT TRIGGER auto_rls_trigger
--   ON ddl_command_end
--   WHEN TAG IN ('CREATE TABLE')
--   EXECUTE FUNCTION auto_apply_rls();

-- ========================================
-- HELPER: Check RLS Status
-- ========================================

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

-- Usage: SELECT * FROM check_rls_status();

-- ========================================
-- HELPER: Bulk Apply RLS
-- ========================================

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

-- Usage: 
-- SELECT * FROM bulk_apply_rls(ARRAY['table1', 'table2', 'table3']);

-- ========================================
-- DOCUMENTATION
-- ========================================

COMMENT ON FUNCTION apply_user_rls(TEXT) IS 
'Applies standard RLS policies to a user-scoped table. 
Requires table to have a user_id column.
Usage: SELECT apply_user_rls(''table_name'');';

COMMENT ON FUNCTION check_rls_status() IS 
'Returns RLS status for all tables in public schema.
Usage: SELECT * FROM check_rls_status();';

COMMENT ON FUNCTION bulk_apply_rls(TEXT[]) IS 
'Applies RLS to multiple tables at once.
Usage: SELECT * FROM bulk_apply_rls(ARRAY[''table1'', ''table2'']);';
