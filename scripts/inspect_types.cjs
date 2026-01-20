const { Client } = require('pg');

const connectionString = 'postgresql://postgres.liwnjbvintygnvhgbguw:howladerFinos@aws-1-ap-south-1.pooler.supabase.com:6543/postgres';

const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
});

async function run() {
    try {
        console.log('Connecting to Supabase...');
        await client.connect();

        const tables = ['profiles', 'wallets', 'transactions', 'financial_plans'];

        for (const table of tables) {
            console.log(`\n--- Inspecting contents of ${table} ---`);
            const res = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = '${table}' 
            AND column_name IN ('is_super_admin', 'is_deleted');
        `);
            res.rows.forEach(row => {
                console.log(`${table}.${row.column_name}: ${row.data_type}`);
            });
        }

    } catch (err) {
        console.error('❌ Failed:', err);
    } finally {
        try { await client.end(); } catch (e) { }
    }
}

run();
