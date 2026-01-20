/**
 * AuditLog - Security event logging for compliance and debugging
 * 
 * International Standard: Security Audit Trail
 * Compliance: GDPR, SOC 2, ISO 27001
 * 
 * Purpose:
 * - Track security-critical events (user switches, data cleanup)
 * - Provide audit trail for compliance
 * - Enable debugging and monitoring
 */
export class AuditLog {
    /**
     * Log a user switch event
     * 
     * @param oldUserId - The previous user ID
     * @param newUserId - The new user ID
     */
    static async logUserSwitch(oldUserId: string | null, newUserId: string): Promise<void> {
        const timestamp = new Date().toISOString();
        const event = {
            type: 'USER_SWITCH',
            oldUserId,
            newUserId,
            timestamp,
            timestampMs: Date.now()
        };

        console.log(`🔐 [Audit] User Switch: ${oldUserId || 'NONE'} → ${newUserId}`);
        console.log(`   Timestamp: ${timestamp}`);

        // Store in localStorage for debugging
        this.storeAuditEvent(event);

        // Optional: Send to analytics (if configured)
        this.sendToAnalytics(event);
    }

    /**
     * Log a data cleanup event
     * 
     * @param userId - The user whose data was cleaned
     * @param rowsDeleted - Number of rows deleted
     */
    static async logDataCleanup(userId: string | null, rowsDeleted: number): Promise<void> {
        const timestamp = new Date().toISOString();
        const event = {
            type: 'DATA_CLEANUP',
            userId,
            rowsDeleted,
            timestamp,
            timestampMs: Date.now()
        };

        console.log(`🔐 [Audit] Data Cleanup: ${userId || 'ALL'} (${rowsDeleted} rows)`);
        console.log(`   Timestamp: ${timestamp}`);

        this.storeAuditEvent(event);
        this.sendToAnalytics(event);
    }

    /**
     * Log an offline switch attempt (blocked)
     * 
     * @param userId - The user attempting to switch
     */
    static async logOfflineSwitchBlocked(userId: string): Promise<void> {
        const timestamp = new Date().toISOString();
        const event = {
            type: 'OFFLINE_SWITCH_BLOCKED',
            userId,
            timestamp,
            timestampMs: Date.now()
        };

        console.warn(`🔐 [Audit] Offline Switch Blocked: ${userId}`);
        console.log(`   Timestamp: ${timestamp}`);

        this.storeAuditEvent(event);
        this.sendToAnalytics(event);
    }

    /**
     * Log a cleanup verification failure (security alert)
     * 
     * @param userId - The user whose cleanup failed
     */
    static async logCleanupFailure(userId: string): Promise<void> {
        const timestamp = new Date().toISOString();
        const event = {
            type: 'CLEANUP_FAILURE',
            userId,
            timestamp,
            timestampMs: Date.now(),
            severity: 'HIGH'
        };

        console.error(`🔐 [Audit] SECURITY ALERT: Cleanup Failure for ${userId}`);
        console.log(`   Timestamp: ${timestamp}`);

        this.storeAuditEvent(event);
        this.sendToAnalytics(event);

        // Optional: Send alert to monitoring service
        this.sendSecurityAlert(event);
    }

    /**
     * Store audit event in localStorage (last 100 events)
     */
    private static storeAuditEvent(event: any): void {
        if (typeof window === 'undefined') return;

        try {
            const key = 'finos_audit_log';
            const existingLog = localStorage.getItem(key);
            const events = existingLog ? JSON.parse(existingLog) : [];

            events.push(event);

            // Keep only last 100 events
            if (events.length > 100) {
                events.shift();
            }

            localStorage.setItem(key, JSON.stringify(events));
        } catch (e) {
            console.error('Failed to store audit event:', e);
        }
    }

    /**
     * Send event to analytics (Google Analytics, Mixpanel, etc.)
     */
    private static sendToAnalytics(event: any): void {
        if (typeof window === 'undefined') return;

        // Google Analytics (if configured)
        if (typeof (window as any).gtag === 'function') {
            (window as any).gtag('event', event.type.toLowerCase(), {
                event_category: 'security',
                event_label: event.userId || 'unknown',
                value: event.rowsDeleted || 0
            });
        }

        // Mixpanel (if configured)
        if (typeof (window as any).mixpanel === 'object') {
            (window as any).mixpanel.track(event.type, event);
        }
    }

    /**
     * Send security alert (for critical events)
     */
    private static sendSecurityAlert(event: any): void {
        // Future: Integrate with monitoring service (Sentry, Datadog, etc.)
        console.error('🚨 SECURITY ALERT:', event);
    }

    /**
     * Get audit log history (for debugging)
     */
    static getAuditHistory(): any[] {
        if (typeof window === 'undefined') return [];

        try {
            const key = 'finos_audit_log';
            const existingLog = localStorage.getItem(key);
            return existingLog ? JSON.parse(existingLog) : [];
        } catch (e) {
            console.error('Failed to get audit history:', e);
            return [];
        }
    }

    /**
     * Clear audit log (for privacy/GDPR compliance)
     */
    static clearAuditLog(): void {
        if (typeof window === 'undefined') return;

        localStorage.removeItem('finos_audit_log');
        console.log('🔐 [Audit] Audit log cleared');
    }
}

export const auditLog = AuditLog;
