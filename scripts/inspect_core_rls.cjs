const { Client } = require('pg');

const connectionString = 'postgresql://postgres.liwnjbvintygnvhgbguw:howladerFinos@aws-1-ap-south-1.pooler.supabase.com:6543/postgres';

async function inspectPolicies() {
    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();

        const tables = ['wallets', 'transactions'];

        for (const t of tables) {
            const res = await client.query(`
          SELECT policyname, cmd, qual, with_check 
          FROM pg_policies 
          WHERE tablename = '${t}';
        `);

            console.log(`\n🛡️ RLS Policies for ${t}:`);
            if (res.rows.length === 0) console.log("   (No policies found!)");
            res.rows.forEach(r => {
                console.log(`--- ${r.policyname} (${r.cmd}) ---`);
                console.log(`   USING: ${r.qual}`);
                console.log(`   WITH CHECK: ${r.with_check}`);
            });
        }

    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

inspectPolicies();
