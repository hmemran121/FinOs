
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAdminStatus() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        console.log('No user logged in.');
        return;
    }
    console.log('User ID:', user.id);

    const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

    if (error) {
        console.error('Error fetching profile:', error);
    } else {
        console.log('Profile is_super_admin value:', profile.is_super_admin);
        console.log('Profile is_super_admin type:', typeof profile.is_super_admin);
    }

    // Check RPC too
    const { data: isSuper, error: rpcErr } = await supabase.rpc('is_super_admin');
    if (rpcErr) {
        console.error('RPC Error:', rpcErr);
    } else {
        console.log('RPC is_super_admin returns:', isSuper);
    }
}

checkAdminStatus();
