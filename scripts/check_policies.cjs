const { Client } = require('pg');

const connectionString = 'postgresql://postgres.liwnjbvintygnvhgbguw:howladerFinos@aws-1-ap-south-1.pooler.supabase.com:6543/postgres';

const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
});

async function run() {
    try {
        await client.connect();
        const res = await client.query(`
      SELECT policyname, cmd, qual, with_check 
      FROM pg_policies 
      WHERE tablename = 'profiles';
    `);

        console.log("📋 Policies on 'profiles':");
        res.rows.forEach(r => {
            console.log(`- [${r.cmd}] ${r.policyname}`);
            console.log(`  USING: ${r.qual}`);
        });

    } catch (err) {
        console.error('Error fetching policies:', err);
    } finally {
        try { await client.end(); } catch (e) { }
    }
}

run();
