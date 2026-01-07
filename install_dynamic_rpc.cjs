
const { Client } = require('pg');

const connectionString = 'postgresql://postgres:howladerFinos@db.liwnjbvintygnvhgbguw.supabase.co:5432/postgres';

async function installDynamicTableLoader() {
    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log("✅ Connected to Supabase.");

        const sql = `
            -- Create a secure RPC function to list all public tables
            CREATE OR REPLACE FUNCTION get_public_tables()
            RETURNS TABLE (table_name text)
            LANGUAGE plpgsql
            SECURITY DEFINER -- Run as creator to access system catalogs
            AS $$
            BEGIN
                RETURN QUERY
                SELECT tablename::text
                FROM pg_catalog.pg_tables
                WHERE schemaname = 'public'
                AND tablename NOT LIKE 'pg_%' 
                AND tablename NOT LIKE 'sql_%'
                AND tablename != 'schema_migrations'; -- optional exclusion
            END;
            $$;

            -- Grant access to this function
            GRANT EXECUTE ON FUNCTION get_public_tables() TO anon, authenticated, service_role;
        `;

        console.log("➡️ Installing Dynamic Table Loader RPC...");
        await client.query(sql);
        console.log("✅ RPC 'get_public_tables' installed! App can now fetch table list dynamically.");

    } catch (err) {
        console.error("❌ Error installing RPC:", err);
    } finally {
        await client.end();
    }
}

installDynamicTableLoader();
