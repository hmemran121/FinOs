import { v4 as uuidv4 } from 'uuid';
import {
    AppNotification,
    Wallet,
    Commitment,
    FinancialPlan,
    Transaction,
    MasterCategoryType
} from '../types';
import { differenceInDays, parseISO, isSameDay, addDays } from 'date-fns';

export class NotificationEngine {
    static generateBalanceAlerts(
        prevWallets: Wallet[],
        nextWallets: Wallet[],
        threshold: number = 0.1 // 10% change
    ): AppNotification[] {
        const alerts: AppNotification[] = [];

        nextWallets.forEach(nextWallet => {
            const prevWallet = prevWallets.find(w => w.id === nextWallet.id);
            if (!prevWallet) return;

            const prevBalance = prevWallet.channels.reduce((sum, c) => sum + c.balance, 0);
            const nextBalance = nextWallet.channels.reduce((sum, c) => sum + c.balance, 0);

            if (prevBalance > 0 && nextBalance < prevBalance) {
                const drop = (prevBalance - nextBalance) / prevBalance;
                if (drop >= threshold) {
                    alerts.push({
                        id: uuidv4(),
                        type: 'BALANCE_ALERT',
                        priority: drop >= 0.25 ? 'HIGH' : 'MEDIUM',
                        title: 'Significant Outflow Detected',
                        message: `Wallet ${nextWallet.name} balance dropped by ${(drop * 100).toFixed(1)}%. Maintain fiscal surveillance.`,
                        isRead: false,
                        actionUrl: 'wallets',
                        data: { walletId: nextWallet.id, dropPercentage: drop },
                        created_at: Date.now(),
                        updated_at: Date.now(),
                        version: 1,
                        device_id: 'system',
                        user_id: nextWallet.user_id || 'system',
                        is_deleted: 0
                    });
                }
            }
        });

        return alerts;
    }

    static generateCommitmentAlerts(
        commitments: Commitment[],
        transactions: Transaction[]
    ): AppNotification[] {
        const alerts: AppNotification[] = [];
        const today = new Date();
        const tomorrow = addDays(today, 1);

        commitments.forEach(c => {
            if (c.is_deleted) return;
            const nextDate = parseISO(c.nextDate);

            // 1. Upcoming Commitment (Tomorrow)
            if (isSameDay(nextDate, tomorrow)) {
                alerts.push({
                    id: uuidv4(),
                    type: 'COMMITMENT_DUE',
                    priority: 'MEDIUM',
                    title: 'Upcoming Commitment',
                    message: `Protocol "${c.name}" is scheduled for execution tomorrow (${c.amount.toLocaleString()}). Ensure liquidity.`,
                    isRead: false,
                    actionUrl: 'commitments',
                    data: { commitmentId: c.id },
                    created_at: Date.now(),
                    updated_at: Date.now(),
                    version: 1,
                    device_id: 'system',
                    user_id: c.user_id || 'system',
                    is_deleted: 0
                });
            }

            // 2. Due Today
            if (isSameDay(nextDate, today)) {
                alerts.push({
                    id: uuidv4(),
                    type: 'COMMITMENT_DUE',
                    priority: 'HIGH',
                    title: 'Commitment Due Today',
                    message: `The "${c.name}" commitment protocol is active for today. Verification required.`,
                    isRead: false,
                    actionUrl: 'commitments',
                    data: { commitmentId: c.id },
                    created_at: Date.now(),
                    updated_at: Date.now(),
                    version: 1,
                    device_id: 'system',
                    user_id: c.user_id || 'system',
                    is_deleted: 0
                });
            }
        });

        return alerts;
    }

    static generatePlanAlerts(plans: FinancialPlan[]): AppNotification[] {
        const alerts: AppNotification[] = [];
        const today = new Date();

        plans.forEach(p => {
            if (p.is_deleted || p.status !== 'FINALIZED' || !p.planned_date) return;
            const plannedDate = parseISO(p.planned_date);
            const daysDiff = differenceInDays(plannedDate, today);

            if (daysDiff >= 0 && daysDiff <= 3) {
                alerts.push({
                    id: uuidv4(),
                    type: 'PLAN_MILESTONE',
                    priority: daysDiff === 0 ? 'HIGH' : 'MEDIUM',
                    title: 'Plan Milestone Imminent',
                    message: `Strategic Plan "${p.title}" is scheduled for execution in ${daysDiff} days. Prepare deployment.`,
                    isRead: false,
                    actionUrl: 'plans',
                    data: { planId: p.id },
                    created_at: Date.now(),
                    updated_at: Date.now(),
                    version: 1,
                    device_id: 'system',
                    user_id: p.user_id || 'system',
                    is_deleted: 0
                });
            }
        });

        return alerts;
    }
}
