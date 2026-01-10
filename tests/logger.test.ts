import { describe, it, expect } from 'vitest';
import { logger } from '../utils/logger';

describe('Logger Utility', () => {
    it('should have all logging methods', () => {
        expect(logger).toHaveProperty('log');
        expect(logger).toHaveProperty('warn');
        expect(logger).toHaveProperty('error');
        expect(logger).toHaveProperty('info');
        expect(logger).toHaveProperty('debug');
    });

    it('should not throw errors when calling methods', () => {
        expect(() => logger.log('test')).not.toThrow();
        expect(() => logger.warn('test')).not.toThrow();
        expect(() => logger.error('test')).not.toThrow();
        expect(() => logger.info('test')).not.toThrow();
        expect(() => logger.debug('test')).not.toThrow();
    });

    it('should handle multiple arguments', () => {
        expect(() => logger.log('test', 123, { key: 'value' })).not.toThrow();
    });
});
