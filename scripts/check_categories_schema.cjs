const pg = require('pg');
const { Client } = pg;

const CONNECTION_STRING = 'postgresql://postgres:howladerFinos@db.liwnjbvintygnvhgbguw.supabase.co:5432/postgres';

async function checkSchema() {
    const client = new Client({
        connectionString: CONNECTION_STRING,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        const res = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'categories'
        `);
        console.log('Columns:', res.rows.map(r => r.column_name));
    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

checkSchema();
