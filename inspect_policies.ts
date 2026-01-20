import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const { Client } = pg;

async function checkPolicies() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });
    await client.connect();
    const res = await client.query(`
        SELECT schemaname, tablename, policyname, roles, cmd, qual, with_check 
        FROM pg_policies 
        WHERE tablename = 'profiles'
    `);
    console.log("RLS Policies for 'profiles' table:");
    res.rows.forEach(row => {
        console.log(`- Policy: ${row.policyname}`);
        console.log(`  Command: ${row.cmd}`);
        console.log(`  Roles: ${row.roles}`);
        console.log(`  Qual: ${row.qual}`);
        console.log(`  With Check: ${row.with_check}`);
        console.log('---');
    });
    await client.end();
}

checkPolicies().catch(console.error);
