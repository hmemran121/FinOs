import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const { Client } = pg;

async function checkFunction() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });
    await client.connect();
    const res = await client.query(`
        SELECT pg_get_functiondef(p.oid) as def
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' AND p.proname = 'is_super_admin';
    `);
    if (res.rows.length > 0) {
        console.log("Function 'is_super_admin' definition:");
        console.log(res.rows[0].def);
    } else {
        console.log("Function 'is_super_admin' NOT found.");
    }
    await client.end();
}

checkFunction().catch(console.error);
