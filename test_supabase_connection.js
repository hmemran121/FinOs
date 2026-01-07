
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://liwnjbvintygnvhgbguw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxpd25qYnZpbnR5Z252aGdiZ3V3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcyNzkyODMsImV4cCI6MjA4Mjg1NTI4M30.u0SqKwLgy3CW0r76nsR9XWUVQhZBDvSKYllDYci33SI';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkConnection() {
    console.log("Checking Supabase connection...");

    // Check tables via the RPC we installed earlier
    const { data, error } = await supabase.rpc('get_public_tables');

    if (error) {
        console.error("❌ RPC Error:", error);
    } else {
        console.log("✅ Tables found in Supabase:", data);
    }

    // Attempt to read from financial_plans
    const { data: plans, error: fetchError } = await supabase.from('financial_plans').select('*').limit(1);
    if (fetchError) {
        console.error("❌ Error fetching from financial_plans:", fetchError);
    } else {
        console.log("✅ Successfully reached 'financial_plans' table.");
    }
}

checkConnection();
