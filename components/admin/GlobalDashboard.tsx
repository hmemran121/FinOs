import React, { useState, useEffect } from 'react';
import { adminService, GlobalStats } from '../../services/adminService';
import AdminPanel from '../AdminPanel';
import {
    Activity,
    Users,
    Wallet as WalletIcon,
    TrendingUp,
    Server,
    Shield,
    Globe,
    Cpu,
    Database,
    Zap,
    Clock,
    CheckCircle2,
    RefreshCw,
    ShieldAlert,
    LayoutDashboard,
    ArrowLeft,
    DollarSign,
    ArrowUpRight,
    ArrowDownRight,
    Search,
    List,
    Filter,
    Tag,
    Calendar
} from 'lucide-react';
import { Wallet, Transaction } from '../../types';
import { GlassCard } from '../ui/GlassCard';
import { UpdateSignalModal } from './UpdateSignalModal';
import { Send } from 'lucide-react';

export const GlobalDashboard: React.FC = () => {
    const [stats, setStats] = useState<GlobalStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [view, setView] = useState<'STATS' | 'MANAGEMENT'>('STATS');
    const [activeTab, setActiveTab] = useState<'MONITOR' | 'WALLETS' | 'TRANSACTIONS'>('MONITOR');

    // Data for registries
    const [globalWallets, setGlobalWallets] = useState<(Wallet & { owner_name: string })[]>([]);
    const [globalTransactions, setGlobalTransactions] = useState<(Transaction & { owner_name: string })[]>([]);
    const [loadingRegistry, setLoadingRegistry] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Drill down state
    const [selectedWallet, setSelectedWallet] = useState<(Wallet & { owner_name: string }) | null>(null);
    const [walletTransactions, setWalletTransactions] = useState<Transaction[]>([]);
    const [loadingDetail, setLoadingDetail] = useState(false);

    // Update Signals
    const [showSignalModal, setShowSignalModal] = useState(false);

    const loadStats = async () => {
        console.log('🌍 [GlobalDashboard] Loading Stats...');
        try {
            setError(null);
            setRefreshing(true);
            const data = await adminService.getGlobalStats();
            setStats(data);

            // If on a registry tab, load that too
            if (activeTab === 'WALLETS') loadWallets();
            if (activeTab === 'TRANSACTIONS') loadTransactions();
        } catch (error: any) {
            console.error('Failed to load global stats:', error);
            setError(error.message || 'Failed to connect to Global Command Node');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const loadWallets = async () => {
        try {
            setLoadingRegistry(true);
            const data = await adminService.getGlobalWallets();
            setGlobalWallets(data);
        } catch (err) {
            console.error('Failed to load global wallets:', err);
        } finally {
            setLoadingRegistry(false);
        }
    };

    const loadTransactions = async () => {
        try {
            setLoadingRegistry(true);
            const data = await adminService.getGlobalTransactions();
            setGlobalTransactions(data);
        } catch (err) {
            console.error('Failed to load global transactions:', err);
        } finally {
            setLoadingRegistry(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'WALLETS') loadWallets();
        if (activeTab === 'TRANSACTIONS') loadTransactions();
    }, [activeTab]);


    // Toggle view handler
    const toggleView = () => {
        setView(prev => prev === 'STATS' ? 'MANAGEMENT' : 'STATS');
    };

    const handleWalletClick = async (wallet: Wallet & { owner_name: string }) => {
        try {
            setSelectedWallet(wallet);
            setLoadingDetail(true);
            const txs = await adminService.getWalletTransactions(wallet.id);
            setWalletTransactions(txs);
        } catch (err) {
            console.error("Failed to load wallet details:", err);
        } finally {
            setLoadingDetail(false);
        }
    };

    useEffect(() => {
        loadStats();
        // Auto-refresh every 30 seconds for live monitoring
        const interval = setInterval(loadStats, 30000);
        return () => clearInterval(interval);
    }, []);

    // Render Admin Panel if in MANAGEMENT mode
    if (view === 'MANAGEMENT') {
        return (
            <div className="space-y-6 animate-in fade-in duration-500">
                <div className="flex items-center gap-4">
                    <button
                        onClick={toggleView}
                        className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white transition-all group"
                    >
                        <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                    </button>
                    <div>
                        <h1 className="text-xl font-black text-white uppercase tracking-tight">Management Console</h1>
                        <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Advanced Configuration & User Control</p>
                    </div>
                </div>
                <AdminPanel />
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-20 space-y-4">
                <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
                <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs">Connecting to Global Command...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center p-20 space-y-6 text-center">
                <div className="p-4 bg-rose-500/10 rounded-full text-rose-500 border border-rose-500/20">
                    <ShieldAlert size={32} />
                </div>
                <div>
                    <h2 className="text-xl font-black text-rose-500 uppercase tracking-tight">Access Restricted / Node Failure</h2>
                    <p className="text-sm text-zinc-500 mt-2 max-w-md">{error}</p>
                </div>
                <button
                    onClick={loadStats}
                    className="px-6 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg font-bold text-xs uppercase tracking-widest transition-colors"
                >
                    Retry Connection
                </button>
            </div>
        );
    }

    if (!stats) return null;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Command Header */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-white uppercase tracking-tight flex items-center gap-3">
                        <Globe className="text-rose-500" /> Global Control Center
                    </h1>
                    <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mt-1">
                        System Authority: SUPER_ADMIN_ROOT
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">System Online</span>
                    </div>

                    <button
                        onClick={toggleView}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold text-xs uppercase tracking-widest transition-colors flex items-center gap-2 shadow-lg shadow-blue-500/20"
                    >
                        <LayoutDashboard size={14} />
                        Open Console
                    </button>

                    <button
                        onClick={loadStats}
                        disabled={refreshing}
                        className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white transition-all disabled:opacity-50"
                    >
                        <RefreshCw size={18} className={refreshing ? "animate-spin" : ""} />
                    </button>

                    <button
                        onClick={() => setShowSignalModal(true)}
                        className="p-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-lg text-emerald-500 transition-all"
                        title="Push Update Signal"
                    >
                        <Send size={18} />
                    </button>
                </div>
            </div>

            {/* Sub-Navigation Tabs */}
            <div className="flex items-center gap-1 p-1 bg-white/5 border border-white/10 rounded-xl w-fit">
                <button
                    onClick={() => setActiveTab('MONITOR')}
                    className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'MONITOR' ? 'bg-blue-600 text-white shadow-lg' : 'text-zinc-500 hover:text-white hover:bg-white/5'}`}
                >
                    Monitoring
                </button>
                <button
                    onClick={() => setActiveTab('WALLETS')}
                    className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'WALLETS' ? 'bg-blue-600 text-white shadow-lg' : 'text-zinc-500 hover:text-white hover:bg-white/5'}`}
                >
                    Global Wallets
                </button>
                <button
                    onClick={() => setActiveTab('TRANSACTIONS')}
                    className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'TRANSACTIONS' ? 'bg-blue-600 text-white shadow-lg' : 'text-zinc-500 hover:text-white hover:bg-white/5'}`}
                >
                    All Transactions
                </button>
            </div>

            {activeTab === 'MONITOR' ? (
                <>
                    {/* KPI Grid - Expanded with Liquidity */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                        {/* Global Net Liquidity */}
                        <GlassCard className="p-4 border-emerald-500/20 bg-emerald-500/5 relative overflow-hidden group col-span-1 md:col-span-2">
                            <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                <DollarSign size={48} />
                            </div>
                            <div className="relative z-10">
                                <span className="text-[10px] font-black text-emerald-500/60 uppercase tracking-widest">Global Net Liquidity</span>
                                <p className="text-2xl font-black text-emerald-500 mt-1">
                                    ${stats.total_net_balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </p>
                                <div className="mt-2 flex items-center gap-2">
                                    <div className="flex-1 h-1 bg-emerald-500/20 rounded-full overflow-hidden">
                                        <div className="h-full bg-emerald-500 w-[85%]" />
                                    </div>
                                    <span className="text-[8px] font-bold text-emerald-500">HEALTHY</span>
                                </div>
                            </div>
                        </GlassCard>

                        {/* Total Users */}
                        <GlassCard className="p-4 border-white/5 relative overflow-hidden group">
                            <div className="relative z-10 text-center md:text-left">
                                <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Identity Registry</span>
                                <p className="text-2xl font-black text-blue-500 mt-1">{stats.total_users.toLocaleString()}</p>
                                <span className="text-[9px] font-bold text-emerald-500">{stats.active_users} Active Node</span>
                            </div>
                        </GlassCard>

                        {/* Infrastructure */}
                        <GlassCard className="p-4 border-white/5 relative overflow-hidden group">
                            <div className="relative z-10 text-center md:text-left">
                                <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Assets & Plans</span>
                                <div className="flex items-center justify-center md:justify-start gap-3 mt-1">
                                    <div>
                                        <p className="text-xl font-black text-indigo-500">{stats.total_wallets}</p>
                                        <p className="text-[8px] font-bold text-zinc-600 uppercase">Wallets</p>
                                    </div>
                                    <div className="w-px h-6 bg-white/10" />
                                    <div>
                                        <p className="text-xl font-black text-indigo-500">{stats.total_plans}</p>
                                        <p className="text-[8px] font-bold text-zinc-600 uppercase">Plans</p>
                                    </div>
                                </div>
                            </div>
                        </GlassCard>

                        {/* Cash Flow - Inflow */}
                        <GlassCard className="p-4 border-white/5 relative overflow-hidden group bg-blue-500/5">
                            <div className="relative z-10">
                                <div className="flex items-center gap-2 mb-1">
                                    <ArrowUpRight size={14} className="text-blue-500" />
                                    <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Global Inflow</span>
                                </div>
                                <p className="text-xl font-black text-blue-500">${(stats.total_inflow / 1000).toFixed(1)}k</p>
                            </div>
                        </GlassCard>

                        {/* Cash Flow - Outflow */}
                        <GlassCard className="p-4 border-white/5 relative overflow-hidden group bg-rose-500/5">
                            <div className="relative z-10">
                                <div className="flex items-center gap-2 mb-1">
                                    <ArrowDownRight size={14} className="text-rose-500" />
                                    <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Global Outflow</span>
                                </div>
                                <p className="text-xl font-black text-rose-500">${(stats.total_outflow / 1000).toFixed(1)}k</p>
                            </div>
                        </GlassCard>
                    </div>

                    {/* AI & Infrastructure Detail... (Simplified for brevity) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Gross Volume */}
                        <GlassCard className="p-6 border-cyan-500/20 relative overflow-hidden group bg-gradient-to-br from-cyan-500/5 to-transparent">
                            <div className="absolute right-0 top-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                                <TrendingUp size={64} className="text-cyan-500" />
                            </div>
                            <div className="relative z-10">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="p-2 bg-cyan-500/10 text-cyan-400 rounded-lg shadow-lg shadow-cyan-500/20">
                                        <TrendingUp size={18} />
                                    </div>
                                    <span className="text-[10px] font-black text-cyan-400 uppercase tracking-widest">Total Volume processed</span>
                                </div>
                                <p className="text-3xl font-black bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent mt-2">${(stats.total_volume / 1000).toFixed(1)}k</p>
                                <span className="text-[10px] font-bold text-cyan-600 uppercase">Cumulative Throughput</span>
                            </div>
                        </GlassCard>

                        {/* AI Load */}
                        <GlassCard className="p-6 border-purple-500/20 relative overflow-hidden group col-span-1 md:col-span-3 bg-gradient-to-br from-purple-500/5 via-pink-500/5 to-transparent">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-gradient-to-br from-purple-500/20 to-pink-500/20 text-purple-400 rounded-lg shadow-lg shadow-purple-500/20">
                                        <Zap size={20} />
                                    </div>
                                    <div>
                                        <span className="text-[10px] font-black text-purple-400 uppercase tracking-widest">AI Cognitive Load</span>
                                        <p className="text-2xl font-black bg-gradient-to-r from-purple-400 via-pink-400 to-fuchsia-400 bg-clip-text text-transparent">{(stats.total_tokens / 1000).toFixed(1)}k Tokens</p>
                                    </div>
                                </div>
                                <div className="flex-1 mx-8 hidden lg:block">
                                    <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                                        <div className="h-full bg-gradient-to-r from-purple-500 via-pink-500 to-fuchsia-500 animate-pulse" style={{ width: '45%' }} />
                                    </div>
                                </div>
                                <span className="text-[10px] font-bold text-purple-400 uppercase tracking-widest px-2 py-1 bg-purple-500/10 rounded border border-purple-500/20">Optimal Capacity</span>
                            </div>
                        </GlassCard>
                    </div>

                    {/* System Monitor & Node Status */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <GlassCard className="lg:col-span-2 p-6 border-white/5">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-sm font-black bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent uppercase tracking-widest flex items-center gap-2">
                                    <Activity size={16} className="text-cyan-400" /> Live System Monitor
                                </h3>
                                <span className="px-2 py-1 bg-white/5 rounded text-[10px] font-mono text-zinc-400">
                                    Updates: Real-time (RPC)
                                </span>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5 hover:border-blue-500/30 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="p-2 bg-blue-500/10 text-blue-500 rounded-lg">
                                            <Clock size={20} />
                                        </div>
                                        <div>
                                            <p className="text-xs font-black text-white uppercase">Server Time Synchronization</p>
                                            <p className="text-[10px] font-bold text-zinc-500">Latency: 24ms | Offset: Corrected</p>
                                        </div>
                                    </div>
                                    <CheckCircle2 size={18} className="text-emerald-500" />
                                </div>

                                <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5 hover:border-purple-500/30 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="p-2 bg-purple-500/10 text-purple-500 rounded-lg">
                                            <Shield size={20} />
                                        </div>
                                        <div>
                                            <p className="text-xs font-black text-white uppercase">Security Protocol (RLS)</p>
                                            <p className="text-[10px] font-bold text-zinc-500">Mode: STRICT | Admin Bypass: ACTIVE</p>
                                        </div>
                                    </div>
                                    <CheckCircle2 size={18} className="text-emerald-500" />
                                </div>

                                <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5 hover:border-amber-500/30 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="p-2 bg-amber-500/10 text-amber-500 rounded-lg">
                                            <Database size={20} />
                                        </div>
                                        <div>
                                            <p className="text-xs font-black text-white uppercase">Database Integrity</p>
                                            <p className="text-[10px] font-bold text-zinc-500">Replica Status: HEALTHY | Connections: Opt</p>
                                        </div>
                                    </div>
                                    <CheckCircle2 size={18} className="text-emerald-500" />
                                </div>
                            </div>
                        </GlassCard>

                        <GlassCard className="p-6 border-white/5 bg-gradient-to-b from-blue-900/10 to-transparent">
                            <h3 className="text-sm font-black bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent uppercase tracking-widest mb-6 flex items-center gap-2">
                                <Server size={16} className="text-indigo-400" /> Node Status
                            </h3>

                            <div className="space-y-6 text-center">
                                <div className="relative inline-block">
                                    <div className="w-32 h-32 rounded-full border-4 border-white/5 flex items-center justify-center relative">
                                        <div className="absolute inset-0 border-4 border-b-blue-500 border-l-purple-500 rounded-full animate-spin duration-[3s]" />
                                        <div className="text-center">
                                            <p className="text-2xl font-black bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">100%</p>
                                            <p className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">Uptime</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <p className="text-xs font-bold text-zinc-400 uppercase">Current Region</p>
                                    <div className="flex items-center justify-center gap-2 px-3 py-2 bg-white/5 rounded-lg border border-white/10">
                                        <Globe size={14} className="text-blue-500" />
                                        <span className="text-[10px] font-black text-white">ap-south-1 (Mumbai)</span>
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-white/10">
                                    <p className="text-[9px] font-mono text-zinc-600">
                                        SERVER_TS: {stats.timestamp}
                                    </p>
                                </div>
                            </div>
                        </GlassCard>
                    </div>
                </>
            ) : activeTab === 'WALLETS' ? (
                <GlassCard className="border-white/5 p-0 overflow-hidden min-h-[500px]">
                    {selectedWallet ? (
                        <div className="animate-in slide-in-from-right duration-300">
                            {/* Wallet Detail Header */}
                            <div className="p-6 border-b border-white/5 bg-white/5 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <button onClick={() => setSelectedWallet(null)} className="p-2 rounded-xl hover:bg-white/10 transition-colors border border-white/10">
                                        <ArrowLeft size={18} className="text-zinc-400" />
                                    </button>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-lg font-black text-white uppercase tracking-tight">{selectedWallet.name}</h3>
                                            <div className={`w-2 h-2 rounded-full ${selectedWallet.is_deleted ? 'bg-zinc-600' : 'bg-emerald-500'} shadow-[0_0_8px_rgba(16,185,129,0.3)]`} />
                                        </div>
                                        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Master Node: {selectedWallet.id}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-black text-emerald-500/60 uppercase tracking-widest">Liquid Balance</p>
                                    <p className="text-2xl font-black text-emerald-500">
                                        ${selectedWallet.balance?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </p>
                                </div>
                            </div>

                            {/* Wallet Stats Grid */}
                            <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 border-b border-white/5 bg-white/2">
                                <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                                    <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1">Owner Identity</p>
                                    <p className="text-sm font-bold text-white flex items-center gap-2">
                                        <Users size={14} className="text-blue-500" /> {selectedWallet.owner_name}
                                    </p>
                                </div>
                                <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                                    <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1">Currency Node</p>
                                    <p className="text-sm font-bold text-white flex items-center gap-2">
                                        <Globe size={14} className="text-indigo-500" /> {selectedWallet.currency}
                                    </p>
                                </div>
                                <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                                    <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1">Activation Date</p>
                                    <p className="text-sm font-bold text-white flex items-center gap-2">
                                        <Activity size={14} className="text-emerald-500" /> {new Date(selectedWallet.created_at).toLocaleDateString()}
                                    </p>
                                </div>
                                <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                                    <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1">System Status</p>
                                    <div className="flex items-center gap-2">
                                        <div className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${selectedWallet.is_deleted ? 'bg-rose-500/20 text-rose-500' : 'bg-emerald-500/20 text-emerald-500'}`}>
                                            {selectedWallet.is_deleted ? 'Offline' : 'Online'}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Transaction History for this Wallet */}
                            <div className="p-6">
                                <div className="flex items-center justify-between mb-6">
                                    <h4 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">
                                        <TrendingUp size={14} className="text-blue-500" /> Node History
                                    </h4>
                                    <p className="text-[9px] font-bold text-zinc-500 uppercase">Showing last {walletTransactions.length} movements</p>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="border-b border-white/5 text-[9px] font-black text-zinc-500 uppercase tracking-widest">
                                                <th className="px-4 py-3">Type</th>
                                                <th className="px-4 py-3">Reference</th>
                                                <th className="px-4 py-3">Date</th>
                                                <th className="px-4 py-3 text-right">Amount</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            {loadingDetail ? (
                                                <tr>
                                                    <td colSpan={4} className="px-4 py-10 text-center">
                                                        <div className="flex items-center justify-center gap-2">
                                                            <div className="w-4 h-4 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
                                                            <span className="text-[10px] font-bold text-zinc-500 uppercase">Fetching Ledger...</span>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ) : walletTransactions.length === 0 ? (
                                                <tr>
                                                    <td colSpan={4} className="px-4 py-10 text-center">
                                                        <p className="text-[10px] font-bold text-zinc-600 uppercase">No ledger entries found for this node.</p>
                                                    </td>
                                                </tr>
                                            ) : (
                                                walletTransactions.map(tx => (
                                                    <tr key={tx.id} className="hover:bg-white/5 transition-colors group">
                                                        <td className="px-4 py-3">
                                                            <div className={`w-6 h-6 rounded flex items-center justify-center ${tx.amount > 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                                                                {tx.amount > 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <p className="text-xs font-bold text-zinc-200">{tx.description}</p>
                                                            <p className="text-[8px] font-black text-zinc-600 uppercase">{tx.category || (tx as any).category_id || 'General'}</p>
                                                        </td>
                                                        <td className="px-4 py-3 whitespace-nowrap">
                                                            <p className="text-[10px] font-mono text-zinc-500">{new Date(tx.date).toLocaleDateString()}</p>
                                                        </td>
                                                        <td className="px-4 py-3 text-right">
                                                            <p className={`text-xs font-black ${tx.amount > 0 ? 'text-emerald-500' : 'text-white'}`}>
                                                                {tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                            </p>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Registry Header */}
                            <div className="p-6 border-b border-white/5 bg-white/5 flex items-center justify-between">
                                <div>
                                    <h3 className="text-lg font-black text-white uppercase tracking-tight">Global Wallet Registry</h3>
                                    <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Full visibility across all system assets</p>
                                </div>
                                <div className="relative w-64">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={14} />
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Search wallets or owners..."
                                        className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-4 py-2 text-xs text-white placeholder:text-zinc-600 focus:border-blue-500/50 outline-none transition-all"
                                    />
                                </div>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-white/5 bg-white/2 text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                                            <th className="px-6 py-4">Status</th>
                                            <th className="px-6 py-4">Wallet Name</th>
                                            <th className="px-6 py-4">Owner Identity</th>
                                            <th className="px-6 py-4 text-right">Net Balance</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {loadingRegistry ? (
                                            <tr>
                                                <td colSpan={4} className="px-6 py-20 text-center">
                                                    <div className="flex flex-col items-center gap-3">
                                                        <div className="w-6 h-6 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
                                                        <p className="text-[10px] font-bold text-zinc-500 uppercase">Indexing global assets...</p>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : globalWallets.filter(w =>
                                            (w.name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
                                            (w.owner_name?.toLowerCase() || '').includes(searchQuery.toLowerCase())
                                        ).map(wallet => (
                                            <tr
                                                key={wallet.id}
                                                onClick={() => handleWalletClick(wallet)}
                                                className="hover:bg-blue-500/5 transition-colors cursor-pointer group"
                                            >
                                                <td className="px-6 py-4">
                                                    <div className={`w-2 h-2 rounded-full ${wallet.is_deleted ? 'bg-zinc-600' : 'bg-emerald-500'} shadow-[0_0_8px_rgba(16,185,129,0.3)]`} />
                                                </td>
                                                <td className="px-6 py-4">
                                                    <p className="text-xs font-black text-white uppercase tracking-tight group-hover:text-blue-400 transition-colors">{wallet.name}</p>
                                                    <p className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest">{wallet.currency} Node</p>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <p className="text-xs font-bold text-zinc-300 uppercase">{wallet.owner_name}</p>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <p className="text-sm font-black text-emerald-500">
                                                        ${wallet.balance?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                    </p>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}
                </GlassCard>
            ) : (
                <GlassCard className="border-white/5 p-0 overflow-hidden min-h-[500px]">
                    <div className="p-6 border-b border-white/5 bg-white/5 flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-black text-white uppercase tracking-tight">Global Transaction Audit</h3>
                            <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Real-time feed of all system financial movements</p>
                        </div>
                        <div className="relative w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={14} />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search by recipient or owner..."
                                className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-4 py-2 text-xs text-white placeholder:text-zinc-600 focus:border-blue-500/50 outline-none transition-all"
                            />
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-white/5 bg-white/2 text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                                    <th className="px-6 py-4">Type</th>
                                    <th className="px-6 py-4">Owner</th>
                                    <th className="px-6 py-4">Description</th>
                                    <th className="px-6 py-4">Date</th>
                                    <th className="px-6 py-4 text-right">Amount</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {loadingRegistry ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-20 text-center">
                                            <div className="flex flex-col items-center gap-3">
                                                <div className="w-6 h-6 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
                                                <p className="text-[10px] font-bold text-zinc-500 uppercase">Fetching global transaction ledger...</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : globalTransactions.filter(t =>
                                    (t.description?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
                                    (t.owner_name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
                                    (t.category?.toLowerCase() || '').includes(searchQuery.toLowerCase())
                                ).map(tx => (
                                    <tr key={tx.id} className="hover:bg-white/5 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${tx.amount > 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                                                {tx.amount > 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-xs font-black text-white uppercase tracking-tight">{tx.owner_name}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-xs font-bold text-zinc-300">{tx.description}</p>
                                            <p className="text-[9px] text-zinc-600 uppercase font-black">{tx.category || 'General'}</p>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <p className="text-[10px] font-mono text-zinc-500">
                                                {new Date(tx.date).toLocaleDateString()}
                                            </p>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <p className={`text-sm font-black ${tx.amount > 0 ? 'text-emerald-500' : 'text-white'}`}>
                                                {tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </p>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </GlassCard>
            )}
            <UpdateSignalModal isOpen={showSignalModal} onClose={() => setShowSignalModal(false)} />
        </div>
    );
};
