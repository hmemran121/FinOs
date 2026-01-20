import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const { Client } = pg;

async function testFetchAsAdmin() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });
    await client.connect();

    const adminId = 'd751d50e-6146-4891-b367-6f9fc116c6c8';

    console.log(`Testing fetch as Admin ID: ${adminId}`);

    // Test logic simulating RLS bypass correctly
    const res = await client.query(`
        SELECT count(*) FROM profiles 
        WHERE (id = $1::uuid OR EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = $1::uuid 
            AND is_super_admin = 1
        ))
    `, [adminId]);

    console.log(`Count with admin check: ${res.rows[0].count}`);

    const total = await client.query(`SELECT count(*) FROM profiles`);
    console.log(`Total profiles in DB: ${total.rows[0].count}`);

    await client.end();
}

testFetchAsAdmin().catch(console.error);
