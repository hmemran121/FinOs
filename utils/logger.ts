/**
 * Production-safe logger utility
 * Automatically removes logs in production builds
 */

const isDev = import.meta.env.MODE === 'development';
const isProd = import.meta.env.PROD === true;

export const logger = {
    /**
     * General logging - only in development
     */
    log: (...args: any[]) => {
        if (isDev) console.log(...args);
    },

    /**
     * Warning messages - only in development
     */
    warn: (...args: any[]) => {
        if (isDev) console.warn(...args);
    },

    /**
     * Error messages - always logged (important for debugging production issues)
     */
    error: (...args: any[]) => {
        console.error(...args);
        // In production, you could send to error tracking service (Sentry, etc.)
        if (isProd) {
            // TODO: Send to error tracking service
            // Example: Sentry.captureException(args[0]);
        }
    },

    /**
     * Info messages - only in development
     */
    info: (...args: any[]) => {
        if (isDev) console.info(...args);
    },

    /**
     * Debug messages - only in development
     */
    debug: (...args: any[]) => {
        if (isDev) console.debug(...args);
    },

    /**
     * Performance timing - only in development
     */
    time: (label: string) => {
        if (isDev) console.time(label);
    },

    timeEnd: (label: string) => {
        if (isDev) console.timeEnd(label);
    },

    /**
     * Group logging - only in development
     */
    group: (label: string) => {
        if (isDev) console.group(label);
    },

    groupEnd: () => {
        if (isDev) console.groupEnd();
    }
};

// Export as default for easier imports
export default logger;
