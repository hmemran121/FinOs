import { databaseKernel } from './database';

/**
 * DataCleanupService - Securely removes user data on user switch
 * 
 * International Standard: Complete Data Isolation
 * Security Principle: Zero Data Leakage Between Users
 * 
 * Purpose:
 * - Remove all user-scoped data when switching users
 * - Prevent data mixing and privacy violations
 * - Ensure clean slate for each user
 */
export class DataCleanupService {
    private static instance: DataCleanupService;

    /**
     * Tables that contain user-specific data
     * These will be cleared on user switch
     */
    private readonly userScopedTables = [
        'profiles',
        'transactions',
        'wallets',
        'financial_plans',
        'financial_plan_components',
        'budgets',
        'commitments',
        'notifications',
        'categories',
        'currencies',
        'channel_types',
        'sync_queue',
        'ai_usage_logs'
    ];

    /**
     * Tables that are shared globally across all users
     * These will NOT be cleared on user switch
     */
    private readonly globalTables = [
        'meta_sync',
        'system_config'
    ];

    private constructor() { }

    static getInstance(): DataCleanupService {
        if (!DataCleanupService.instance) {
            DataCleanupService.instance = new DataCleanupService();
        }
        return DataCleanupService.instance;
    }

    /**
     * Clear all user-scoped data from local database
     * 
     * This is the NUCLEAR option - removes everything except global config
     * Use when switching users to ensure complete data isolation
     */
    async clearAllUserData(): Promise<void> {
        console.log('🧹 [Cleanup] Starting complete user data cleanup...');

        let totalRowsDeleted = 0;

        for (const table of this.userScopedTables) {
            try {
                const result = await databaseKernel.execute(`DELETE FROM ${table}`);
                const rowsDeleted = result.rowsAffected || 0;
                totalRowsDeleted += rowsDeleted;

                if (rowsDeleted > 0) {
                    console.log(`   ✅ Cleared ${rowsDeleted} rows from ${table}`);
                } else {
                    console.log(`   ⚪ ${table} was already empty`);
                }
            } catch (e) {
                console.error(`   ❌ Failed to clear ${table}:`, e);
                // Continue with other tables even if one fails
            }
        }

        console.log(`✅ [Cleanup] Complete! Removed ${totalRowsDeleted} total rows`);

        // Clear localStorage user-specific data
        this.clearUserLocalStorage();
    }

    /**
     * Clear data for a specific user ID
     * 
     * More surgical approach - only removes data belonging to specific user
     * Useful if we ever support multi-user caching (future enhancement)
     * 
     * @param userId - The user ID whose data should be removed
     */
    async clearUserData(userId: string): Promise<void> {
        console.log(`🧹 [Cleanup] Removing data for user: ${userId}`);

        let totalRowsDeleted = 0;

        for (const table of this.userScopedTables) {
            try {
                // Check if table has user_id column
                const hasUserIdColumn = await this.tableHasColumn(table, 'user_id');

                if (hasUserIdColumn) {
                    const result = await databaseKernel.execute(
                        `DELETE FROM ${table} WHERE user_id = ?`,
                        [userId]
                    );
                    const rowsDeleted = result.rowsAffected || 0;
                    totalRowsDeleted += rowsDeleted;

                    if (rowsDeleted > 0) {
                        console.log(`   ✅ Cleared ${rowsDeleted} rows from ${table}`);
                    }
                } else {
                    // Table doesn't have user_id, clear all (e.g., profiles table)
                    const result = await databaseKernel.execute(`DELETE FROM ${table}`);
                    const rowsDeleted = result.rowsAffected || 0;
                    totalRowsDeleted += rowsDeleted;

                    if (rowsDeleted > 0) {
                        console.log(`   ✅ Cleared ${rowsDeleted} rows from ${table} (no user_id column)`);
                    }
                }
            } catch (e) {
                console.error(`   ❌ Failed to clear ${table}:`, e);
            }
        }

        console.log(`✅ [Cleanup] Removed ${totalRowsDeleted} rows for user ${userId}`);
    }

    /**
     * Clear user-specific data from localStorage
     * 
     * Keeps global settings like AI keys, but removes user preferences
     */
    private clearUserLocalStorage(): void {
        if (typeof window === 'undefined') return;

        console.log('🧹 [Cleanup] Clearing user-specific localStorage...');

        const keysToRemove = [
            'finos_current_user_id',
            'finos_user_preferences',
            'finos_recent_transactions',
            'finos_cached_balance'
            // Add more user-specific keys as needed
        ];

        keysToRemove.forEach(key => {
            if (localStorage.getItem(key)) {
                localStorage.removeItem(key);
                console.log(`   ✅ Removed ${key}`);
            }
        });

        // Keep global keys:
        // - finos_global_ai_keys (shared across users)
        // - finos_global_ai_model (shared)
        // - finos_global_app_name (shared)
        // - finos_global_logo_url (shared)

        console.log('✅ [Cleanup] localStorage cleaned (global settings preserved)');
    }

    /**
     * Check if a table has a specific column
     * 
     * @param tableName - Name of the table
     * @param columnName - Name of the column to check
     * @returns true if column exists, false otherwise
     */
    private async tableHasColumn(tableName: string, columnName: string): Promise<boolean> {
        try {
            const result = await databaseKernel.execute(
                `PRAGMA table_info(${tableName})`
            );

            if (result.values) {
                return result.values.some((col: any) => col.name === columnName);
            }

            return false;
        } catch (e) {
            console.error(`Failed to check column ${columnName} in ${tableName}:`, e);
            return false;
        }
    }

    /**
     * Get cleanup statistics (for debugging/monitoring)
     */
    async getCleanupStats(): Promise<{
        userScopedTables: number;
        globalTables: number;
        totalTables: number;
    }> {
        return {
            userScopedTables: this.userScopedTables.length,
            globalTables: this.globalTables.length,
            totalTables: this.userScopedTables.length + this.globalTables.length
        };
    }

    /**
     * Verify cleanup was successful
     * 
     * @returns true if all user tables are empty, false otherwise
     */
    async verifyCleanup(): Promise<boolean> {
        console.log('🔍 [Cleanup] Verifying cleanup...');

        for (const table of this.userScopedTables) {
            try {
                const result = await databaseKernel.query(table, '1=1');

                if (result.values && result.values.length > 0) {
                    console.error(`❌ [Cleanup] Verification failed: ${table} still has ${result.values.length} rows`);
                    return false;
                }
            } catch (e) {
                console.error(`❌ [Cleanup] Failed to verify ${table}:`, e);
                return false;
            }
        }

        console.log('✅ [Cleanup] Verification passed: All user tables are empty');
        return true;
    }
}

// Export singleton instance
export const dataCleanupService = DataCleanupService.getInstance();
