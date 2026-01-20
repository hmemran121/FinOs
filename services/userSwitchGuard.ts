import { databaseKernel } from './database';

/**
 * UserSwitchGuard - Detects and manages user switches
 * 
 * International Standard: Single Active User Model
 * Used by: WhatsApp, Banking Apps, Secure Messaging Apps
 * 
 * Purpose:
 * - Detect when a different user logs in on the same device
 * - Track current active user ID
 * - Prevent data mixing between users
 */
export class UserSwitchGuard {
    private static instance: UserSwitchGuard;

    private constructor() { }

    static getInstance(): UserSwitchGuard {
        if (!UserSwitchGuard.instance) {
            UserSwitchGuard.instance = new UserSwitchGuard();
        }
        return UserSwitchGuard.instance;
    }

    /**
     * Detect if a user switch is occurring
     * 
     * @param newUserId - The ID of the user attempting to login
     * @returns true if this is a different user, false if same user or first login
     */
    async detectSwitch(newUserId: string): Promise<boolean> {
        const currentUserId = await this.getCurrentUserId();

        // First login (no previous user)
        if (currentUserId === null) {
            console.log('🔐 [UserSwitch] First login detected');
            return false;
        }

        // Same user re-login
        if (currentUserId === newUserId) {
            console.log('🔐 [UserSwitch] Same user re-login');
            return false;
        }

        // Different user - SWITCH DETECTED
        console.warn(`🔄 [UserSwitch] DETECTED: ${currentUserId} → ${newUserId}`);
        return true;
    }

    /**
     * Get the currently active user ID from local database
     * 
     * @returns User ID or null if no user is logged in
     */
    async getCurrentUserId(): Promise<string | null> {
        try {
            const result = await databaseKernel.query('meta_sync', '1=1');

            if (result.values && result.values.length > 0) {
                const meta = result.values[0];
                return meta.last_user_id || null;
            }

            return null;
        } catch (e) {
            console.error('❌ [UserSwitch] Failed to get current user ID:', e);
            return null;
        }
    }

    /**
     * Update the current active user ID in local database
     * 
     * @param userId - The new active user ID
     */
    async updateCurrentUserId(userId: string): Promise<void> {
        try {
            console.log(`🔐 [UserSwitch] Updating current user: ${userId}`);

            // Update meta_sync table
            await databaseKernel.run(
                'UPDATE meta_sync SET last_user_id = ? WHERE id = 1',
                [userId],
                false
            );

            // Also store in localStorage for quick access
            if (typeof window !== 'undefined') {
                localStorage.setItem('finos_current_user_id', userId);
            }

            console.log('✅ [UserSwitch] Current user updated successfully');
        } catch (e) {
            console.error('❌ [UserSwitch] Failed to update current user:', e);
            throw e;
        }
    }

    /**
     * Clear the current user ID (on logout)
     */
    async clearCurrentUserId(): Promise<void> {
        try {
            console.log('🔐 [UserSwitch] Clearing current user');

            await databaseKernel.run(
                'UPDATE meta_sync SET last_user_id = NULL WHERE id = 1',
                [],
                false
            );

            if (typeof window !== 'undefined') {
                localStorage.removeItem('finos_current_user_id');
            }

            console.log('✅ [UserSwitch] Current user cleared');
        } catch (e) {
            console.error('❌ [UserSwitch] Failed to clear current user:', e);
        }
    }

    /**
     * Get user switch history (for audit/debugging)
     */
    async getUserSwitchHistory(): Promise<Array<{ from: string; to: string; timestamp: number }>> {
        // Future enhancement: Track switch history in a separate table
        return [];
    }
}

// Export singleton instance
export const userSwitchGuard = UserSwitchGuard.getInstance();
