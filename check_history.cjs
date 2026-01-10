
const { Client } = require('pg');

async function checkHistory() {
    const client = new Client({
        connectionString: "postgresql://postgres:FinOs12345!@db.shofiqpndicvswstglis.supabase.co:5432/postgres"
    });

    try {
        await client.connect();
        const res = await client.query('SELECT id, name, history FROM commitments LIMIT 5');
        console.log('--- Commitment History Check ---');
        res.rows.forEach(row => {
            console.log(`ID: ${row.id}`);
            console.log(`Name: ${row.name}`);
            console.log(`History: ${JSON.stringify(row.history)}`);
            console.log(`Type: ${typeof row.history}`);
            console.log('----------------------------');
        });
    } catch (err) {
        console.error('Error executing query', err);
    } finally {
        await client.end();
    }
}

checkHistory();
