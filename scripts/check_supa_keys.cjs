require('dotenv').config({ path: '.env.local' });

console.log('Checking for Supabase keys...');
console.log('SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ FOUND' : '❌ MISSING');
console.log('ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ FOUND' : '❌ MISSING');
console.log('SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ FOUND' : '❌ MISSING');
console.log('DATABASE_URL:', process.env.DATABASE_URL ? '✅ FOUND' : '❌ MISSING');
