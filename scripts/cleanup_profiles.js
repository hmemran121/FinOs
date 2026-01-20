/**
 * Cleanup Script: Fix Profile Version Mismatch & Duplicate Profiles
 * 
 * Problem:
 * - Multiple profiles in local database (2 rows)
 * - Version mismatch causing infinite loop
 * - DB Version (558) < Local Version (1333)
 * 
 * Solution:
 * - Delete all profiles from local DB
 * - Clear localStorage profile cache
 * - Force fresh profile creation on next login
 */

import { createClient } from '@supabase/supabase-js';
import Database from '@tauri-apps/plugin-sql';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key';

const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanupProfiles() {
    console.log('🧹 [Cleanup] Starting profile cleanup...');

    try {
        // Step 1: Connect to local SQLite database
        const db = await Database.load('sqlite:finos.db');
        console.log('✅ [Cleanup] Connected to local database');

        // Step 2: Check current profiles
        const profiles = await db.select('SELECT * FROM profiles');
        console.log(`📊 [Cleanup] Found ${profiles.length} profiles in local DB:`);
        profiles.forEach((p, i) => {
            console.log(`   ${i + 1}. ID: ${p.id}, Email: ${p.email}, Version: ${p.version}`);
        });

        // Step 3: Get current authenticated user
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
            console.warn('⚠️ [Cleanup] No active session. Please login first.');
            console.log('💡 [Cleanup] Deleting ALL profiles to force fresh start...');

            // Delete all profiles
            await db.execute('DELETE FROM profiles');
            console.log('✅ [Cleanup] All profiles deleted');

            // Clear sync queue
            await db.execute(`DELETE FROM sync_queue WHERE entity = 'profiles'`);
            console.log('✅ [Cleanup] Sync queue cleaned');

            return;
        }

        const currentUserId = session.user.id;
        console.log(`👤 [Cleanup] Current user: ${currentUserId}`);

        // Step 4: Delete profiles that don't match current user
        const deleteResult = await db.execute(
            'DELETE FROM profiles WHERE id != ?',
            [currentUserId]
        );
        console.log(`✅ [Cleanup] Deleted ${deleteResult.rowsAffected || 0} old profiles`);

        // Step 5: Check if current user's profile exists
        const currentProfile = await db.select(
            'SELECT * FROM profiles WHERE id = ?',
            [currentUserId]
        );

        if (currentProfile.length === 0) {
            console.log('📝 [Cleanup] Current user profile not found. Will be created on next app load.');
        } else {
            console.log(`✅ [Cleanup] Current user profile exists (Version: ${currentProfile[0].version})`);

            // Step 6: Reset version to match Supabase
            console.log('🔄 [Cleanup] Fetching latest profile from Supabase...');
            const { data: supabaseProfile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', currentUserId)
                .single();

            if (supabaseProfile) {
                console.log(`📥 [Cleanup] Supabase profile version: ${supabaseProfile.version}`);

                // Update local profile to match Supabase
                await db.execute(
                    'UPDATE profiles SET version = ?, updated_at = ? WHERE id = ?',
                    [supabaseProfile.version, Date.now(), currentUserId]
                );
                console.log('✅ [Cleanup] Local profile version synced with Supabase');
            }
        }

        // Step 7: Clean orphaned sync queue entries
        await db.execute(`DELETE FROM sync_queue WHERE entity = 'profiles'`);
        console.log('✅ [Cleanup] Sync queue cleaned');

        // Step 8: Clear localStorage cache
        console.log('🧹 [Cleanup] Clearing localStorage cache...');
        // Note: This needs to be run in browser console
        console.log('💡 [Cleanup] Run this in browser console:');
        console.log('   localStorage.removeItem("finos_profile_cache");');
        console.log('   window.location.reload();');

        console.log('\n✅ [Cleanup] Profile cleanup completed successfully!');
        console.log('📝 [Cleanup] Next steps:');
        console.log('   1. Refresh the app');
        console.log('   2. The version mismatch warning should be gone');
        console.log('   3. App should load normally');

    } catch (error) {
        console.error('❌ [Cleanup] Error:', error);
        throw error;
    }
}

// Run cleanup
cleanupProfiles()
    .then(() => {
        console.log('\n🎉 [Cleanup] Done!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n💥 [Cleanup] Failed:', error);
        process.exit(1);
    });
