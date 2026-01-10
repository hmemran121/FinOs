import { describe, it, expect, beforeEach, vi } from 'vitest';
import { databaseKernel } from '../services/database';

describe('Database Kernel', () => {
    describe('Initialization', () => {
        it('should have initialization method', () => {
            expect(databaseKernel.initialize).toBeDefined();
            expect(typeof databaseKernel.initialize).toBe('function');
        });
        it('should generate unique IDs', async () => {
            const id1 = await databaseKernel.generateId();
            const id2 = await databaseKernel.generateId();

            expect(id1).toBeTruthy();
            expect(id2).toBeTruthy();
            expect(id1).not.toBe(id2);
            expect(id1).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
        });

        it('should have a valid device ID', () => {
            const deviceId = databaseKernel.getDeviceId();
            expect(deviceId).toBeTruthy();
            expect(typeof deviceId).toBe('string');
        });
    });

    describe('Data Operations', () => {
        it('should insert data correctly', async () => {
            const mockData = {
                id: 'test-wallet-1',
                name: 'Test Wallet',
                currency: 'USD',
                initial_balance: 1000,
                updated_at: Date.now(),
                version: 1,
                device_id: 'test-device',
                user_id: 'test-user',
                is_deleted: 0
            };

            const insertSpy = vi.spyOn(databaseKernel, 'insert').mockResolvedValue();
            await databaseKernel.insert('wallets', mockData);

            expect(insertSpy).toHaveBeenCalledWith('wallets', mockData);
        });

        it('should query data with filters', async () => {
            const mockResults = [
                { id: 'wallet-1', name: 'Wallet 1', currency: 'USD' },
                { id: 'wallet-2', name: 'Wallet 2', currency: 'BDT' }
            ];

            const querySpy = vi.spyOn(databaseKernel, 'query').mockResolvedValue(mockResults);
            const results = await databaseKernel.query('wallets', 'currency = ?', ['USD']);

            expect(querySpy).toHaveBeenCalled();
            expect(results).toEqual(mockResults);
        });

        it('should update data correctly', async () => {
            const updateData = {
                name: 'Updated Wallet',
                updated_at: Date.now()
            };

            const updateSpy = vi.spyOn(databaseKernel, 'update').mockResolvedValue();
            await databaseKernel.update('wallets', 'test-wallet-1', updateData);

            expect(updateSpy).toHaveBeenCalledWith('wallets', 'test-wallet-1', updateData);
        });

        it('should soft delete data', async () => {
            const deleteSpy = vi.spyOn(databaseKernel, 'delete').mockResolvedValue();
            await databaseKernel.delete('wallets', 'test-wallet-1');

            expect(deleteSpy).toHaveBeenCalledWith('wallets', 'test-wallet-1');
        });
    });

    describe('Plan Suggestions', () => {
        it('should search plan suggestions', async () => {
            const mockSuggestions = ['Emergency Fund', 'Vacation', 'Home Renovation'];

            const searchSpy = vi.spyOn(databaseKernel, 'searchPlanSuggestions').mockResolvedValue(mockSuggestions);
            const results = await databaseKernel.searchPlanSuggestions('emergency', 'user-1');

            expect(searchSpy).toHaveBeenCalledWith('emergency', 'user-1');
            expect(results).toEqual(mockSuggestions);
        });

        it('should return fallback suggestions when search fails', async () => {
            const searchSpy = vi.spyOn(databaseKernel, 'searchPlanSuggestions').mockResolvedValue([]);
            const results = await databaseKernel.searchPlanSuggestions('nonexistent');

            expect(results).toBeInstanceOf(Array);
        });
    });
});
