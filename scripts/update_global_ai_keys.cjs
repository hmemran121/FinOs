const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

// Your API keys
const apiKeys = [
    {
        "id": "1768245969699",
        "key": "AIzaSyA2lKzeLqnolGDCpL7GbqCoJSMHupLQzMM",
        "label": "Main-FinOs-1",
        "status": "ACTIVE"
    },
    {
        "id": "1768246070435",
        "key": "AIzaSyDJSJZm2xu6DPkLseucwlMKBohYZYuNqu4",
        "label": "can-FinOS--8",
        "status": "ACTIVE"
    },
    {
        "id": "1768246096531",
        "key": "AIzaSyBE4Z-IZEQVv8FSKgOjpisTPmddsb3079Y",
        "label": "can-FinOS--7",
        "status": "ACTIVE"
    },
    {
        "id": "1768246118561",
        "key": "AIzaSyCp6UqzoGVelsWydyyxXnD35sdnMOVSPvM",
        "label": "Can-FinOS--6",
        "status": "ACTIVE"
    },
    {
        "id": "1768246139928",
        "key": "AIzaSyBOOnloDlbQPD-3NQ3KBSiL6HsYKaOhYaU",
        "label": "can-FinOS--5",
        "status": "ACTIVE"
    },
    {
        "id": "1768246169081",
        "key": "AIzaSyDK9glueWM06rQ6hdgXiA6jVGX6NIDIQpI",
        "label": "can-FinOS--4",
        "status": "ACTIVE"
    },
    {
        "id": "1768246188505",
        "key": "AIzaSyA_-wlwLENtEBRy-0SCjuQ2MhdiQ8e1NqY",
        "label": "can-FinOS--3",
        "status": "ACTIVE"
    },
    {
        "id": "1768246205713",
        "key": "AIzaSyAC_vyj88_BjaoDu0OIcfe1IuIl5YWZZAs",
        "label": "can-FinOs--2",
        "status": "ACTIVE"
    },
    {
        "id": "1768246224994",
        "key": "AIzaSyDc43t8AcONtLU4s4TJAioKvacZD7c2VJ8",
        "label": "can-os7",
        "status": "ACTIVE"
    },
    {
        "id": "1768246258787",
        "key": "AIzaSyCXjPCjMUbAyIfs9QcwicD4Y1Gkp56SrdQ",
        "label": "finos-6",
        "status": "ACTIVE"
    },
    {
        "id": "1768246283561",
        "key": "AIzaSyBvdQKg5eIubu10kmag31mTPMfqHFsroUU",
        "label": "can-FinOs-5",
        "status": "ACTIVE"
    },
    {
        "id": "1768246310416",
        "key": "AIzaSyDKrHseSoaMozrhHp1orhBG6xjcicgjpPI",
        "label": "can-FinOs-4",
        "status": "ACTIVE"
    },
    {
        "id": "1768246337568",
        "key": "AIzaSyAeYHBfcmEW-OoT9AlWW13amlNruWUOsno",
        "label": "can-finos-3",
        "status": "ACTIVE"
    },
    {
        "id": "1768246358594",
        "key": "AIzaSyBnr0wOZMNJv8ymth_Fsi-BB07ZPkYfB5I",
        "label": "can-Finos-2",
        "status": "ACTIVE"
    },
    {
        "id": "1768246384144",
        "key": "AIzaSyCA9hf29cHTvASE5yQgY7ZmN0EYlWpT6GI",
        "label": "can-finos-1",
        "status": "ACTIVE"
    },
    {
        "id": "1768246404418",
        "key": "AIzaSyDh3ZTmtGOqbIKJ4mqRAAf7czek1vVe42s",
        "label": "can-os-9",
        "status": "ACTIVE"
    },
    {
        "id": "1768246426810",
        "key": "AIzaSyDLI5GGizlL1BH6Yx9bBZgD46Z2aBxHIFc",
        "label": "can-FinOs-8",
        "status": "ACTIVE"
    },
    {
        "id": "1768246448232",
        "key": "AIzaSyAdhJOIXJtUoMtMy6xCu14yCCDs6rp7csw",
        "label": "can-dueTracVoice",
        "status": "ACTIVE"
    },
    {
        "id": "1768246463911",
        "key": "AIzaSyBV-Q1aZpGukZE_e5aJyrI_nkfDrpoBIgY",
        "label": "FinOS-10",
        "status": "ACTIVE"
    },
    {
        "id": "1768246481783",
        "key": "AIzaSyAK6H5Yf_iW6SoLDxgepQSjnWkEPI7Y38w",
        "label": "can-travel planner",
        "status": "ACTIVE"
    }
];

async function updateGlobalAIKeys() {
    console.log('🔑 Updating Global AI Keys in Supabase...\n');

    try {
        // Step 1: Check current data
        const { data: currentConfig, error: fetchError } = await supabase
            .from('system_config')
            .select('*')
            .eq('key', 'global_ai_keys')
            .maybeSingle();

        if (fetchError) {
            console.error('❌ Error fetching current config:', fetchError);
            return;
        }

        console.log('📊 Current config:', currentConfig);
        console.log(`🔑 Total keys to save: ${apiKeys.length}\n`);

        // Step 2: Prepare the value with version tracking
        // FIX: Using integer version 5 as requested (replacing timestamp)
        const targetVersion = 5;

        // NOTE: Application expects the raw array or wrapped {keys: []}
        // Applying the format expected by FinanceContext
        const valueToSave = apiKeys;

        // Step 3: Update or Insert
        const { data, error } = await supabase
            .from('system_config')
            .upsert({
                key: 'global_ai_keys',
                value: valueToSave
            }, {
                onConflict: 'key'
            })
            .select();

        if (error) {
            console.error('❌ Error updating config:', error);
            return;
        }

        console.log('✅ Successfully updated global_ai_keys!');
        console.log(`✅ Version: ${targetVersion}`);
        console.log(`✅ Keys saved: ${apiKeys.length}`);
        console.log('\n📋 Keys Summary:');
        apiKeys.forEach((k, i) => {
            console.log(`   ${i + 1}. ${k.label} (${k.status})`);
        });

        console.log('\n🔄 Triggering sync version update...');

        // Step 4: Update static_data_versions to trigger sync
        const { data: versionsData, error: versionsError } = await supabase
            .from('system_config')
            .select('value')
            .eq('key', 'static_data_versions')
            .maybeSingle();

        if (!versionsError && versionsData) {
            const versions = typeof versionsData.value === 'string' ? JSON.parse(versionsData.value) : versionsData.value;
            versions.global_ai_keys = targetVersion;
            versions.global_ai_key = targetVersion; // Keep singular for backward compatibility

            await supabase
                .from('system_config')
                .update({ value: JSON.stringify(versions) })
                .eq('key', 'static_data_versions');

            console.log('✅ Sync version updated!');
        }

        console.log('\n� Local sync will automatically detect this change!');
        console.log('� Refresh your app or wait for auto-sync to pull the latest keys.');

    } catch (err) {
        console.error('❌ Unexpected error:', err);
    }
}

updateGlobalAIKeys();
