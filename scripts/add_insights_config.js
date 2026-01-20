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

        console.log('🛠️ Adding Cognitive Insights Configuration...');

        // Add configuration keys for insights management
        const configs = [
            { key: 'insights_auto_enabled', value: 'false' },
            { key: 'insights_schedule_interval', value: '86400000' }, // 24 hours in ms
            { key: 'insights_last_generated', value: '0' },
            { key: 'insights_next_scheduled', value: '0' }
        ];

        for (const config of configs) {
            await client.query(`
        INSERT INTO system_config (key, value) 
        VALUES ($1, $2)
        ON CONFLICT (key) DO UPDATE SET value = $2
      `, [config.key, config.value]);
            console.log(`✅ Added/Updated: ${config.key} = ${config.value}`);
        }

        console.log('🎉 Insights configuration added successfully!');

    } catch (err) {
        console.error('❌ Error:', err);
    } finally {
        await client.end();
    }
}

run();
