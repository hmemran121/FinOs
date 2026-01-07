import { createClient } from '@supabase/supabase-js';

// Supabase configuration - Replace these with your project's credentials if necessary
const SUPABASE_URL = 'https://liwnjbvintygnvhgbguw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxpd25qYnZpbnR5Z252aGdiZ3V3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcyNzkyODMsImV4cCI6MjA4Mjg1NTI4M30.u0SqKwLgy3CW0r76nsR9XWUVQhZBDvSKYllDYci33SI';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);