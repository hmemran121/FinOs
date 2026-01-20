import { supabase } from './supabase';
import { UserProfile, Wallet, Transaction, FinancialPlan, Commitment } from '../types';

export interface UserStats extends UserProfile {
    walletCount: number;
    planCount: number;
    commitmentCount: number;
    totalTokenUsage: number;
    lastActivity?: number;
}

export interface UserDeepDive {
    profile: UserProfile;
    wallets: Wallet[];
    transactions: Transaction[];
    plans: FinancialPlan[];
    commitments: Commitment[];
    tokenLogs: any[];
}

export interface GlobalStats {
    total_users: number;
    active_users: number;
    total_wallets: number;
    total_net_balance: number;
    total_transactions: number;
    total_volume: number;
    total_inflow: number;
    total_outflow: number;
    total_plans: number;
    total_tokens: number;
    timestamp: number;
}

export const adminService = {
    /**
     * Get all users with summary stats
     * Note: In a real enterprise app, this would be highly optimized on the server.
     */
    async getUsers(): Promise<UserStats[]> {
        // 1. Fetch profiles
        const { data: profiles, error } = await supabase
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        if (!profiles) return [];

        // 2. Fetch counts for each user (Parallel)
        // Note: For a large number of users, we'd use a RPC or a View
        const userStats = await Promise.all(profiles.map(async (profile) => {
            const [wallets, plans, commitments, tokens] = await Promise.all([
                supabase.from('wallets').select('id', { count: 'exact', head: true }).eq('user_id', profile.id),
                supabase.from('financial_plans').select('id', { count: 'exact', head: true }).eq('user_id', profile.id),
                supabase.from('commitments').select('id', { count: 'exact', head: true }).eq('user_id', profile.id),
                supabase.from('ai_usage_logs').select('total_tokens').eq('user_id', profile.id)
            ]);

            const totalTokens = tokens.data?.reduce((sum, log) => sum + (log.total_tokens || 0), 0) || 0;

            return {
                ...profile,
                walletCount: wallets.count || 0,
                planCount: plans.count || 0,
                commitmentCount: commitments.count || 0,
                totalTokenUsage: totalTokens,
                // Last activity is often the max of updated_at across tables
                lastActivity: profile.updated_at
            };
        }));

        return userStats;
    },

    /**
     * Get everything for a specific user
     */
    async getUserDetails(userId: string): Promise<UserDeepDive> {
        const [
            profileRes,
            walletsRes,
            transactionsRes,
            plansRes,
            commitmentsRes,
            tokenLogsRes
        ] = await Promise.all([
            supabase.from('profiles').select('*').eq('id', userId).single(),
            supabase.from('wallets').select('*').eq('user_id', userId),
            supabase.from('transactions').select('*').eq('user_id', userId).order('date', { ascending: false }).limit(50),
            supabase.from('financial_plans').select('*').eq('user_id', userId),
            supabase.from('commitments').select('*').eq('user_id', userId),
            supabase.from('ai_usage_logs').select('*').eq('user_id', userId).order('timestamp', { ascending: false }).limit(100)
        ]);

        if (profileRes.error) throw profileRes.error;

        return {
            profile: profileRes.data,
            wallets: walletsRes.data || [],
            transactions: transactionsRes.data || [],
            plans: plansRes.data || [],
            commitments: commitmentsRes.data || [],
            tokenLogs: tokenLogsRes.data || []
        };
    },

    /**
     * Update user account status
     */
    async updateUserStatus(userId: string, status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED'): Promise<void> {
        const { error } = await supabase
            .from('profiles')
            .update({ status, updated_at: Date.now() })
            .eq('id', userId);

        if (error) throw error;
    },

    /**
     * Get Global Dashboard Stats (Super Admin)
     */
    async getGlobalStats(): Promise<GlobalStats> {
        const { data, error } = await supabase.rpc('get_global_stats');

        if (error) throw error;

        return {
            total_users: Number(data.total_users || 0),
            active_users: Number(data.active_users || 0),
            total_wallets: Number(data.total_wallets || 0),
            total_net_balance: Number(data.total_net_balance || 0),
            total_transactions: Number(data.total_transactions || 0),
            total_volume: Number(data.total_volume || 0),
            total_inflow: Number(data.total_inflow || 0),
            total_outflow: Number(data.total_outflow || 0),
            total_plans: Number(data.total_plans || 0),
            total_tokens: Number(data.total_tokens || 0),
            timestamp: Number(data.timestamp || Date.now())
        };
    },

    /**
     * Get all wallets system-wide (Super Admin)
     */
    async getGlobalWallets(): Promise<(Wallet & { owner_name: string })[]> {
        const { data, error } = await supabase
            .from('wallets')
            .select('*, profiles:user_id(name), channels(balance)')
            .eq('is_deleted', false);

        if (error) throw error;

        return (data || []).map(w => ({
            ...w,
            owner_name: (w.profiles as any)?.name || 'Unknown',
            balance: (w.channels as any[])?.reduce((sum, c) => sum + (c.balance || 0), 0) || 0
        }));
    },

    /**
     * Get all transactions system-wide (Super Admin)
     */
    async getGlobalTransactions(): Promise<(Transaction & { owner_name: string })[]> {
        const { data, error } = await supabase
            .from('transactions')
            .select('*, profiles:user_id(name)')
            .eq('is_deleted', false)
            .order('date', { ascending: false })
            .limit(500);

        if (error) throw error;

        return (data || []).map(t => ({
            ...t,
            owner_name: (t.profiles as any)?.name || 'Unknown'
        }));
    },

    /**
     * Get all transactions for a specific wallet (Super Admin)
     */
    async getWalletTransactions(walletId: string): Promise<Transaction[]> {
        const { data, error } = await supabase
            .from('transactions')
            .select('*')
            .eq('wallet_id', walletId)
            .eq('is_deleted', false)
            .order('date', { ascending: false });

        if (error) throw error;
        return data || [];
    }
};
