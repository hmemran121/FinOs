import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const { Client } = pg;

async function listProfiles() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });
    await client.connect();
    const res = await client.query(`
        SELECT id, email, is_super_admin, name 
        FROM profiles
    `);
    console.log("Profiles in database:");
    console.table(res.rows);
    await client.end();
}

listProfiles().catch(console.error);
