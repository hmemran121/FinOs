
import pg from 'pg';
import fs from 'fs';

const { Client } = pg;

const candidates = [
    "postgresql://postgres:howladerFinos@db.liwnjbvintygnvhgbguw.supabase.co:5432/postgres",
    "postgresql://postgres.liwnjbvintygnvhgbguw:howladerFinos@aws-1-ap-south-1.pooler.supabase.com:6543/postgres",
    "postgresql://postgres.liwnjbvintygnvhgbguw:howladerFinos@aws-1-ap-south-1.pooler.supabase.com:5432/postgres"
];

async function run() {
    console.log("Testing connection strings...");

    for (const url of candidates) {
        console.log(`\n---------------------------------------------------`);
        // Mask password for log
        const masked = url.replace(/:([^:@]+)@/, ':****@');
        console.log(`Testing: ${masked}`);

        const client = new Client({
            connectionString: url,
            ssl: { rejectUnauthorized: false }
        });

        try {
            await client.connect();
            console.log("✅ SUCCESS! Connected.");
            await client.end();

            console.log(`\nWriting working URL to .env.local...`);
            fs.writeFileSync('.env.local', `DATABASE_URL=${url}\n`);
            console.log("Done.");
            process.exit(0);
        } catch (err: any) {
            console.log(`❌ Failed: ${err.message}`);
            await client.end();
        }
    }

    console.log("\nAll candidates failed.");
    process.exit(1);
}

run();
