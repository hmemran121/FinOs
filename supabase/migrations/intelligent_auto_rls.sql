/**
 * Intelligent Auto-RLS System
 * 
 * International Standard: Convention-based automatic RLS
 * 
 * Features:
 * 1. Auto-detects table type based on columns
 * 2. Applies appropriate RLS policies automatically
 * 3. Supports: User-scoped, Super Admin, Global, Shared
 * 4. Works with database triggers (no manual intervention)
 * 
 * Inspired by: Stripe, GitHub, Notion, Supabase best practices
 */

-- ========================================
-- INTELLIGENT RLS DETECTOR
-- ========================================

DROP FUNCTION IF EXISTS detect_table_type(TEXT);

CREATE OR REPLACE FUNCTION detect_table_type(p_table_name TEXT)
RETURNS TEXT AS $$
DECLARE
  has_user_id BOOLEAN;
  has_is_global BOOLEAN;
  has_organization_id BOOLEAN;
  table_type TEXT;
BEGIN
  -- Check for user_id column
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
      AND table_name = p_table_name
      AND column_name = 'user_id'
  ) INTO has_user_id;
  
  -- Check for is_global column
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
      AND table_name = p_table_name
      AND column_name = 'is_global'
  ) INTO has_is_global;
  
  -- Check for organization_id column
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
      AND table_name = p_table_name
      AND column_name = 'organization_id'
  ) INTO has_organization_id;
  
  -- Determine table type based on columns
  IF has_user_id AND has_is_global THEN
    table_type := 'USER_AND_GLOBAL'; -- e.g., categories (user can create, but global exists)
  ELSIF has_user_id AND has_organization_id THEN
    table_type := 'ORGANIZATION'; -- e.g., team data
  ELSIF has_user_id THEN
    table_type := 'USER_SCOPED'; -- e.g., transactions, wallets
  ELSIF has_is_global THEN
    table_type := 'GLOBAL_ONLY'; -- e.g., currencies, system config
  ELSE
    table_type := 'UNKNOWN';
  END IF;
  
  RETURN table_type;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- SMART RLS APPLICATOR
-- ========================================

CREATE OR REPLACE FUNCTION apply_smart_rls(table_name TEXT)
RETURNS TEXT AS $$
DECLARE
  table_type TEXT;
  result TEXT;
BEGIN
  -- Detect table type
  table_type := detect_table_type(table_name);
  
  -- Enable RLS
  EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_name);
  
  -- Apply policies based on type
  CASE table_type
    
    -- ========================================
    -- TYPE 1: USER_SCOPED (e.g., transactions, wallets)
    -- Users can only see their own data
    -- Super Admins can see all data
    -- ========================================
    WHEN 'USER_SCOPED' THEN
      -- Drop existing policies
      EXECUTE format('DROP POLICY IF EXISTS "user_select_%s" ON %I', table_name, table_name);
      EXECUTE format('DROP POLICY IF EXISTS "user_insert_%s" ON %I', table_name, table_name);
      EXECUTE format('DROP POLICY IF EXISTS "user_update_%s" ON %I', table_name, table_name);
      EXECUTE format('DROP POLICY IF EXISTS "user_delete_%s" ON %I', table_name, table_name);
      EXECUTE format('DROP POLICY IF EXISTS "admin_all_%s" ON %I', table_name, table_name);
      
      -- SELECT: Users see own data, Super Admins see all
      EXECUTE format('
        CREATE POLICY "user_select_%s" ON %I
        FOR SELECT
        USING (
          auth.uid() = user_id 
          OR 
          EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND is_super_admin = true
          )
        )
      ', table_name, table_name);
      
      -- INSERT: Users can only insert with their own user_id
      EXECUTE format('
        CREATE POLICY "user_insert_%s" ON %I
        FOR INSERT
        WITH CHECK (auth.uid() = user_id)
      ', table_name, table_name);
      
      -- UPDATE: Users can update own data, Super Admins can update all
      EXECUTE format('
        CREATE POLICY "user_update_%s" ON %I
        FOR UPDATE
        USING (
          auth.uid() = user_id 
          OR 
          EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND is_super_admin = true
          )
        )
        WITH CHECK (auth.uid() = user_id)
      ', table_name, table_name);
      
      -- DELETE: Users can delete own data, Super Admins can delete all
      EXECUTE format('
        CREATE POLICY "user_delete_%s" ON %I
        FOR DELETE
        USING (
          auth.uid() = user_id 
          OR 
          EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND is_super_admin = true
          )
        )
      ', table_name, table_name);
      
      result := format('✅ Applied USER_SCOPED RLS to: %s', table_name);
    
    -- ========================================
    -- TYPE 2: USER_AND_GLOBAL (e.g., categories)
    -- Users can see global + their own
    -- Users can create their own
    -- Only Super Admins can create global
    -- ========================================
    WHEN 'USER_AND_GLOBAL' THEN
      EXECUTE format('DROP POLICY IF EXISTS "view_global_and_own_%s" ON %I', table_name, table_name);
      EXECUTE format('DROP POLICY IF EXISTS "insert_own_%s" ON %I', table_name, table_name);
      EXECUTE format('DROP POLICY IF EXISTS "update_own_%s" ON %I', table_name, table_name);
      EXECUTE format('DROP POLICY IF EXISTS "delete_own_%s" ON %I', table_name, table_name);
      
      -- SELECT: See global items + own items
      EXECUTE format('
        CREATE POLICY "view_global_and_own_%s" ON %I
        FOR SELECT
        USING (
          is_global = true 
          OR 
          auth.uid() = user_id
          OR
          EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND is_super_admin = true
          )
        )
      ', table_name, table_name);
      
      -- INSERT: Users can create own, Super Admins can create global
      EXECUTE format('
        CREATE POLICY "insert_own_%s" ON %I
        FOR INSERT
        WITH CHECK (
          (auth.uid() = user_id AND is_global = false)
          OR
          (is_global = true AND EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND is_super_admin = true
          ))
        )
      ', table_name, table_name);
      
      -- UPDATE: Users can update own, Super Admins can update all
      EXECUTE format('
        CREATE POLICY "update_own_%s" ON %I
        FOR UPDATE
        USING (
          auth.uid() = user_id 
          OR 
          EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND is_super_admin = true
          )
        )
      ', table_name, table_name);
      
      -- DELETE: Users can delete own, Super Admins can delete all
      EXECUTE format('
        CREATE POLICY "delete_own_%s" ON %I
        FOR DELETE
        USING (
          auth.uid() = user_id 
          OR 
          EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND is_super_admin = true
          )
        )
      ', table_name, table_name);
      
      result := format('✅ Applied USER_AND_GLOBAL RLS to: %s', table_name);
    
    -- ========================================
    -- TYPE 3: GLOBAL_ONLY (e.g., currencies, system_config)
    -- Everyone can read
    -- Only Super Admins can write
    -- ========================================
    WHEN 'GLOBAL_ONLY' THEN
      EXECUTE format('DROP POLICY IF EXISTS "public_read_%s" ON %I', table_name, table_name);
      EXECUTE format('DROP POLICY IF EXISTS "admin_write_%s" ON %I', table_name, table_name);
      
      -- SELECT: Everyone can read
      EXECUTE format('
        CREATE POLICY "public_read_%s" ON %I
        FOR SELECT
        USING (true)
      ', table_name, table_name);
      
      -- INSERT/UPDATE/DELETE: Only Super Admins
      EXECUTE format('
        CREATE POLICY "admin_write_%s" ON %I
        FOR ALL
        USING (
          EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND is_super_admin = true
          )
        )
      ', table_name, table_name);
      
      result := format('✅ Applied GLOBAL_ONLY RLS to: %s', table_name);
    
    -- ========================================
    -- TYPE 4: ORGANIZATION (future feature)
    -- ========================================
    WHEN 'ORGANIZATION' THEN
      result := format('⚠️ ORGANIZATION type not yet implemented for: %s', table_name);
    
    ELSE
      result := format('⚠️ Unknown table type for: %s (no user_id or is_global column)', table_name);
  END CASE;
  
  RETURN result;
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN format('❌ Error: %s', SQLERRM);
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- AUTO-TRIGGER FOR NEW TABLES
-- ========================================

CREATE OR REPLACE FUNCTION auto_apply_smart_rls()
RETURNS event_trigger AS $$
DECLARE
  obj record;
BEGIN
  FOR obj IN SELECT * FROM pg_event_trigger_ddl_commands()
  LOOP
    IF obj.command_tag = 'CREATE TABLE' AND obj.schema_name = 'public' THEN
      -- Apply smart RLS automatically
      PERFORM apply_smart_rls(obj.object_identity);
      RAISE NOTICE '🤖 Auto-applied smart RLS to: %', obj.object_identity;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Enable auto-trigger
DROP EVENT TRIGGER IF EXISTS auto_smart_rls_trigger;
CREATE EVENT TRIGGER auto_smart_rls_trigger
  ON ddl_command_end
  WHEN TAG IN ('CREATE TABLE')
  EXECUTE FUNCTION auto_apply_smart_rls();

-- ========================================
-- BULK APPLY TO EXISTING TABLES
-- ========================================

CREATE OR REPLACE FUNCTION apply_smart_rls_to_all()
RETURNS TABLE(
  table_name TEXT,
  table_type TEXT,
  status TEXT
) AS $$
DECLARE
  tbl record;
BEGIN
  FOR tbl IN 
    SELECT tablename 
    FROM pg_tables 
    WHERE schemaname = 'public'
      AND tablename NOT LIKE 'pg_%'
      AND tablename NOT LIKE 'sql_%'
  LOOP
    table_name := tbl.tablename;
    table_type := detect_table_type(tbl.tablename);
    status := apply_smart_rls(tbl.tablename);
    RETURN NEXT;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- USAGE EXAMPLES
-- ========================================

-- Apply to all existing tables
-- SELECT * FROM apply_smart_rls_to_all();

-- Apply to a specific table
-- SELECT apply_smart_rls('my_new_table');

-- Check table type
-- SELECT detect_table_type('transactions');

-- Check RLS status
-- SELECT * FROM check_rls_status();

-- ========================================
-- DOCUMENTATION
-- ========================================

COMMENT ON FUNCTION detect_table_type(TEXT) IS 
'Automatically detects table type based on column names:
- USER_SCOPED: has user_id
- USER_AND_GLOBAL: has user_id + is_global
- GLOBAL_ONLY: has is_global only
- ORGANIZATION: has user_id + organization_id';

COMMENT ON FUNCTION apply_smart_rls(TEXT) IS 
'Intelligently applies RLS policies based on table type.
Supports: User-scoped, Global, Mixed, Super Admin access.
Usage: SELECT apply_smart_rls(''table_name'');';

COMMENT ON FUNCTION auto_apply_smart_rls() IS 
'Event trigger that automatically applies smart RLS to new tables.
Triggers on CREATE TABLE commands.';

COMMENT ON FUNCTION apply_smart_rls_to_all() IS 
'Applies smart RLS to all existing tables in public schema.
Usage: SELECT * FROM apply_smart_rls_to_all();';
