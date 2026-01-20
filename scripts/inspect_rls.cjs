const { Client } = require('pg');

const connectionString = 'postgresql://postgres.liwnjbvintygnvhgbguw:howladerFinos@aws-1-ap-south-1.pooler.supabase.com:6543/postgres';

async function inspectRLS() {
    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        const res = await client.query(`
      SELECT policyname, cmd, qual, with_check 
      FROM pg_policies 
      WHERE tablename = 'ai_usage_logs';
    `);

        console.log("🛡️ RLS Policies for ai_usage_logs:");
        res.rows.forEach(r => {
            console.log(`\n--- ${r.policyname} (${r.cmd}) ---`);
            console.log(`USING: ${r.qual}`);
            console.log(`WITH CHECK: ${r.with_check}`);
        });

    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

inspectRLS();
