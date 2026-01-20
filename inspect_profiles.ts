import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const { Client } = pg;

async function checkColumns() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });
    await client.connect();
    const res = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'profiles'
        ORDER BY column_name
    `);
    console.log("Columns in 'profiles' table:");
    res.rows.forEach(row => {
        console.log(`- ${row.column_name} (${row.data_type})`);
    });
    await client.end();
}

checkColumns().catch(console.error);
