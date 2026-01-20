
import { databaseKernel } from './database';
import { offlineSyncService } from './offlineSync';

export interface AIMemory {
    id: string;
    user_id: string;
    memory_key: string;
    memory_value: string;
    memory_type: 'ALIAS' | 'PATTERN' | 'PREFERENCE';
    confidence: number;
    last_used_at: number;
    created_at: number;
}

class MemoryService {

    /**
     * Stores a new memory or updates an existing one if the key matches.
     * @param userId The ID of the user.
     * @param key Unique key for the memory (e.g., 'alias_grocery_shwapno').
     * @param value The value to remember (e.g., 'Shwapno').
     * @param type The category of memory.
     * @param confidence Confidence score (0.0 - 1.0).
     */
    async remember(userId: string, key: string, value: string, type: 'ALIAS' | 'PATTERN' | 'PREFERENCE', confidence: number = 1.0) {
        if (!userId || !key) return;

        try {
            await databaseKernel.initialize();
            const db = await databaseKernel.getDb();
            const now = Date.now();

            // Check if exists
            const existing = await db.query('SELECT id, confidence FROM ai_memories WHERE user_id = ? AND memory_key = ?', [userId, key]);

            let id = await databaseKernel.generateId();
            let isUpdate = false;

            if (existing.values && existing.values.length > 0) {
                id = existing.values[0].id;
                isUpdate = true;
                // Reinforcement learning: Increase confidence if it matches, unless explicit overwrite
                // For now, we just update with the new confidence provided.
            }

            const memoryData = {
                id,
                user_id: userId,
                memory_key: key,
                memory_value: value,
                memory_type: type,
                confidence: confidence,
                last_used_at: now,
                updated_at: now,
                server_updated_at: 0,
                version: 1,
                device_id: databaseKernel.getDeviceId(),
                is_deleted: 0,
                created_at: isUpdate ? undefined : now // Keep original created_at if update
            };

            await databaseKernel.insert('ai_memories', memoryData, true); // true = OR REPLACE (but simplified logic above handles ID)

            // Trigger Sync
            await offlineSyncService.enqueue('ai_memories', id, isUpdate ? 'UPDATE' : 'INSERT', memoryData);

            console.log(`🧠 [Memory] Remembered: ${key} -> ${value} (${confidence})`);
        } catch (error) {
            console.error("🧠 [Memory] Failed to remember:", error);
        }
    }

    /**
     * Retrieves all memories for a user, primarily for building context.
     * Optionally filters by type or specific keys (future optimization).
     */
    async recall(userId: string): Promise<AIMemory[]> {
        if (!userId) return [];
        try {
            await databaseKernel.initialize();
            const db = await databaseKernel.getDb();
            const res = await db.query('SELECT * FROM ai_memories WHERE user_id = ? AND is_deleted = 0 ORDER BY confidence DESC', [userId]);
            return (res.values as AIMemory[]) || [];
        } catch (error) {
            console.error("🧠 [Memory] Failed to recall:", error);
            return [];
        }
    }

    /**
     * Forgets a specific memory by ID.
     */
    async forget(id: string) {
        if (!id) return;
        try {
            await databaseKernel.initialize();
            await databaseKernel.delete('ai_memories', id);
            await offlineSyncService.enqueue('ai_memories', id, 'DELETE', { id });
            console.log(`🧠 [Memory] Forgotten: ${id}`);
        } catch (error) {
            console.error("🧠 [Memory] Failed to forget:", error);
        }
    }
}

export const memoryService = new MemoryService();
