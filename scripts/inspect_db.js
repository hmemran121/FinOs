import pg from 'pg';

const { Client } = pg;

const connectionString = 'postgresql://postgres.liwnjbvintygnvhgbguw:howladerFinos@aws-1-ap-south-1.pooler.supabase.com:6543/postgres';

const client = new Client({
    connectionString,
});

async function run() {
    try {
        console.log('🔌 Connecting to Database...');
        await client.connect();

        console.log('🔍 Inspecting system_config...');
        const configRes = await client.query('SELECT * FROM system_config');
        if (configRes.rows.length === 0) {
            console.log("⚠️ system_config is EMPTY! Using 'Purge' might have deleted the row, causing app to hang if it expects it.");

            console.log("🛠️ Inserting default empty keys row...");
            await client.query(`
            INSERT INTO system_config (key, value) 
            VALUES ('global_ai_keys', '[]')
            ON CONFLICT (key) DO NOTHING;
        `);
            console.log("✅ Inserted default 'global_ai_keys'.");
        } else {
            console.log("✅ system_config content:", configRes.rows);
        }

        console.log('🔍 Inspecting profiles (First 5)...');
        const profilesRes = await client.query('SELECT id, email, role, is_super_admin FROM profiles LIMIT 5');
        console.table(profilesRes.rows);

    } catch (err) {
        console.error('❌ Error checking DB:', err);
    } finally {
        await client.end();
    }
}

run();
