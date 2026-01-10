
const { Client } = require('pg');

const connectionString = 'postgresql://postgres.liwnjbvintygnvhgbguw:howladerFinos@aws-1-ap-south-1.pooler.supabase.com:6543/postgres';

async function diagnoseSchema() {
    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log("✅ Connected to Supabase.");

        const res = await client.query(`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'commitments'
            ORDER BY column_name;
        `);

        console.log("📊 Commitments Table Columns:");
        console.table(res.rows);

    } catch (err) {
        console.error("❌ Error diagnosing schema:", err.message);
    } finally {
        await client.end();
    }
}

diagnoseSchema();
