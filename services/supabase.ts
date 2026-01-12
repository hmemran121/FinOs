import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = localStorage.getItem('finos_global_supabase_url') || localStorage.getItem('finos_custom_supabase_url') || import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = localStorage.getItem('finos_global_supabase_key') || localStorage.getItem('finos_custom_supabase_key') || import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('❌ Supabase credentials missing in .env.local');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);