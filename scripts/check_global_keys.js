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

        console.log('🔍 Checking system_config for global_ai_keys...');
        const res = await client.query("SELECT key, value FROM system_config WHERE key = 'global_ai_keys'");

        if (res.rows.length === 0) {
            console.log("⚠️ global_ai_keys NOT FOUND in system_config!");
            console.log("🛠️ This is why regular users can't use AI chat.");
            console.log("📝 Solution: Super Admin needs to add at least one API key via Admin Panel.");
        } else {
            const value = res.rows[0].value;
            console.log("✅ global_ai_keys found:", value);

            try {
                const keys = JSON.parse(value);
                console.log(`📊 Number of keys: ${keys.length}`);
                if (keys.length === 0) {
                    console.log("⚠️ Keys array is EMPTY! Super Admin needs to add keys.");
                } else {
                    console.log("✅ Keys are available for all users.");
                }
            } catch (e) {
                console.log("❌ Failed to parse keys JSON:", e);
            }
        }

        console.log('\n🔍 Checking RLS policies on system_config...');
        const policies = await client.query(`
        SELECT polname, polcmd, qual, with_check 
        FROM pg_policy 
        WHERE polrelid = 'system_config'::regclass
    `);

        console.log("📋 Active Policies:");
        console.table(policies.rows);

    } catch (err) {
        console.error('❌ Error:', err);
    } finally {
        await client.end();
    }
}

run();
