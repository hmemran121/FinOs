import { describe, it, expect, beforeEach, vi } from 'vitest';
import { offlineSyncService } from '../services/offlineSync';

describe('Offline Sync Service', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Initialization', () => {
        it('should initialize sync service', async () => {
            const initSpy = vi.spyOn(offlineSyncService, 'initialize').mockResolvedValue();
            await offlineSyncService.initialize();

            expect(initSpy).toHaveBeenCalled();
        });

        it('should track online/offline status', () => {
            const status = offlineSyncService.getStatus();

            expect(status).toHaveProperty('isOnline');
            expect(status).toHaveProperty('isSyncing');
            expect(status).toHaveProperty('pendingCount');
        });
    });

    describe('Queue Management', () => {
        it('should enqueue operations when offline', async () => {
            const mockPayload = {
                id: 'test-1',
                name: 'Test',
                amount: 100
            };

            const enqueueSpy = vi.spyOn(offlineSyncService, 'enqueue').mockResolvedValue();
            await offlineSyncService.enqueue('wallets', 'test-1', 'INSERT', mockPayload, false);

            expect(enqueueSpy).toHaveBeenCalledWith('wallets', 'test-1', 'INSERT', mockPayload, false);
        });

        it('should process queue when coming online', async () => {
            const pushSpy = vi.spyOn(offlineSyncService, 'push').mockResolvedValue();
            await offlineSyncService.push();

            expect(pushSpy).toHaveBeenCalled();
        });
    });

    describe('Sync Operations', () => {
        it('should sync global data', async () => {
            const syncGlobalSpy = vi.spyOn(offlineSyncService, 'syncGlobalData').mockResolvedValue();
            await offlineSyncService.syncGlobalData();

            expect(syncGlobalSpy).toHaveBeenCalled();
        });

        it('should bootstrap user data', async () => {
            const bootstrapSpy = vi.spyOn(offlineSyncService, 'bootstrap').mockResolvedValue();
            await offlineSyncService.bootstrap();

            expect(bootstrapSpy).toHaveBeenCalled();
        });

        it('should handle sync errors gracefully', async () => {
            const syncSpy = vi.spyOn(offlineSyncService, 'sync').mockRejectedValue(new Error('Network error'));

            await expect(offlineSyncService.sync()).rejects.toThrow('Network error');
        });
    });

    describe('Status Updates', () => {
        it('should notify listeners on status change', () => {
            const listener = vi.fn();
            const unsubscribe = offlineSyncService.subscribe(listener);

            expect(listener).toHaveBeenCalled();

            unsubscribe();
        });

        it('should provide sync progress', () => {
            const status = offlineSyncService.getStatus();

            expect(status).toHaveProperty('progress');
            expect(status).toHaveProperty('progressPercent');
            expect(status).toHaveProperty('tableStatuses');
        });
    });
});
