import pg from 'pg';
const { Client } = pg;

const CONNECTION_STRING = 'postgresql://postgres:howladerFinos@db.liwnjbvintygnvhgbguw.supabase.co:5432/postgres';

async function cleanupTriggers() {
    const client = new Client({
        connectionString: CONNECTION_STRING,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log("✅ Connected to Supabase.");

        // Find all triggers that might be trying to update updated_at
        const res = await client.query(`
            SELECT event_object_table as table_name, trigger_name 
            FROM information_schema.triggers 
            WHERE event_object_schema = 'public' 
            AND (trigger_name LIKE '%updated_at%' OR trigger_name LIKE '%timestamp%')
        `);

        console.log(`🔍 Found ${res.rows.length} potential triggers.`);

        for (const row of res.rows) {
            console.log(`🔥 Dropping trigger ${row.trigger_name} on ${row.table_name}...`);
            await client.query(`DROP TRIGGER IF EXISTS "${row.trigger_name}" ON public."${row.table_name}" CASCADE;`);
            console.log(`✅ Dropped ${row.trigger_name}`);
        }

        console.log("🎉 Trigger cleanup complete.");

    } catch (err) {
        console.error("❌ Cleanup Failed:", err);
    } finally {
        await client.end();
    }
}

cleanupTriggers();
