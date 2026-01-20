import React, { useState, useEffect } from 'react';
import { adminService, UserDeepDive } from '../../services/adminService';
import {
    ArrowLeft,
    Shield,
    Wallet,
    TrendingUp,
    TrendingDown,
    PieChart,
    Calendar,
    Activity,
    Database,
    Clock,
    User as UserIcon,
    Mail,
    Phone,
    Globe,
    ToggleLeft,
    ToggleRight,
    Circle,
    CheckCircle2,
    XCircle,
    AlertCircle
} from 'lucide-react';
import { GlassCard } from '../ui/GlassCard';

interface UserDetailViewProps {
    userId: string;
    onBack: () => void;
}

export const UserDetailView: React.FC<UserDetailViewProps> = ({ userId, onBack }) => {
    const [data, setData] = useState<UserDeepDive | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeSection, setActiveSection] = useState<'OVERVIEW' | 'FINANCE' | 'AI' | 'ACTIVITY'>('OVERVIEW');
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

    useEffect(() => {
        loadUserDetails();
    }, [userId]);

    const loadUserDetails = async () => {
        try {
            setLoading(true);
            const detail = await adminService.getUserDetails(userId);
            setData(detail);
        } catch (error) {
            console.error('Failed to load user details:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleStatusToggle = async () => {
        if (!data || isUpdatingStatus) return;

        const newStatus = data.profile.status === 'ACTIVE' || !data.profile.status ? 'INACTIVE' : 'ACTIVE';

        try {
            setIsUpdatingStatus(true);
            await adminService.updateUserStatus(userId, newStatus);
            setData({
                ...data,
                profile: { ...data.profile, status: newStatus }
            });
        } catch (error) {
            console.error('Failed to update status:', error);
        } finally {
            setIsUpdatingStatus(false);
        }
    };

    if (loading || !data) {
        return (
            <div className="flex flex-col items-center justify-center p-20 space-y-4">
                <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
                <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs">Accessing User Vault...</p>
            </div>
        );
    }

    const { profile, wallets, transactions, plans, commitments, tokenLogs } = data;

    // Financial calculations
    const totalIn = transactions.filter(t => t.type === 'INCOME').reduce((sum, t) => sum + (t.amount || 0), 0);
    const totalOut = transactions.filter(t => t.type === 'EXPENSE').reduce((sum, t) => sum + (t.amount || 0), 0);
    const netBalance = wallets.reduce((sum, w) => sum + (w.initialBalance || 0), 0); // This should ideally be current balance

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <button
                    onClick={onBack}
                    className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors group"
                >
                    <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Back to Registry</span>
                </button>

                <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${profile.status === 'INACTIVE' ? 'bg-zinc-800 text-zinc-500' : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'}`}>
                        {profile.status === 'INACTIVE' ? <ToggleLeft size={14} /> : <ToggleRight size={14} />}
                        {profile.status || 'ACTIVE'}
                    </span>
                    <button
                        onClick={handleStatusToggle}
                        disabled={isUpdatingStatus}
                        className="p-2 rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all disabled:opacity-50"
                    >
                        {profile.status === 'INACTIVE' ? 'Activate Account' : 'Deactivate Account'}
                    </button>
                </div>
            </div>

            {/* Quick Profile Summary */}
            <GlassCard className="p-6 border-white/5 overflow-hidden relative">
                <div className="absolute top-0 right-0 p-8 opacity-5">
                    <Shield size={120} />
                </div>
                <div className="flex flex-col md:flex-row items-center gap-6 relative z-10">
                    <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-blue-600 to-indigo-900 border-2 border-white/10 shadow-2xl flex items-center justify-center overflow-hidden">
                        {profile.avatar ? (
                            <img src={profile.avatar} className="w-full h-full object-cover" alt="" />
                        ) : (
                            <span className="text-4xl font-black text-white">{profile.name.charAt(0).toUpperCase()}</span>
                        )}
                    </div>
                    <div className="text-center md:text-left">
                        <h1 className="text-2xl font-black text-white mb-1">{profile.name}</h1>
                        <p className="text-zinc-500 font-bold flex items-center justify-center md:justify-start gap-2">
                            <Mail size={14} /> {profile.email || 'No Email'}
                        </p>
                        <div className="mt-4 flex flex-wrap justify-center md:justify-start gap-3">
                            <span className="px-3 py-1 bg-white/5 rounded-lg border border-white/10 text-[xs] font-black text-zinc-400 uppercase tracking-widest">
                                Role: {profile.isSuperAdmin ? 'SUPER ADMIN' : profile.role}
                            </span>
                            <span className="px-3 py-1 bg-white/5 rounded-lg border border-white/10 text-[xs] font-black text-zinc-400 uppercase tracking-widest">
                                ID: {profile.id?.substring(0, 8)}...
                            </span>
                        </div>
                    </div>
                </div>
            </GlassCard>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-2 border-b border-white/5 pb-0">
                {(['OVERVIEW', 'FINANCE', 'AI', 'ACTIVITY'] as const).map((section) => (
                    <button
                        key={section}
                        onClick={() => setActiveSection(section)}
                        className={`px-6 py-3 text-[10px] font-black uppercase tracking-widest transition-all relative ${activeSection === section ? 'text-blue-500' : 'text-zinc-500 hover:text-white'
                            }`}
                    >
                        {section}
                        {activeSection === section && (
                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
                        )}
                    </button>
                ))}
            </div>

            {/* Content Area */}
            <div className="min-h-[400px]">
                {activeSection === 'OVERVIEW' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <GlassCard className="p-4 border-white/5 bg-emerald-500/5">
                            <div className="p-2 w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 mb-3 flex items-center justify-center">
                                <TrendingUp size={18} />
                            </div>
                            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Total Inflow</p>
                            <p className="text-xl font-black text-white">{totalIn.toLocaleString()}</p>
                        </GlassCard>
                        <GlassCard className="p-4 border-white/5 bg-rose-500/5">
                            <div className="p-2 w-8 h-8 rounded-lg bg-rose-500/10 text-rose-500 mb-3 flex items-center justify-center">
                                <TrendingDown size={18} />
                            </div>
                            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Total Outflow</p>
                            <p className="text-xl font-black text-white">{totalOut.toLocaleString()}</p>
                        </GlassCard>
                        <GlassCard className="p-4 border-white/5">
                            <div className="p-2 w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 mb-3 flex items-center justify-center">
                                <Wallet size={18} />
                            </div>
                            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Wallets</p>
                            <p className="text-xl font-black text-white">{wallets.length}</p>
                        </GlassCard>
                        <GlassCard className="p-4 border-white/5">
                            <div className="p-2 w-8 h-8 rounded-lg bg-purple-500/10 text-purple-500 mb-3 flex items-center justify-center">
                                <Database size={18} />
                            </div>
                            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Token Load</p>
                            <p className="text-xl font-black text-white">{tokenLogs.reduce((s, l) => s + (l.total_tokens || 0), 0).toLocaleString()}</p>
                        </GlassCard>

                        {/* Additional Info */}
                        <div className="md:col-span-2 space-y-4">
                            <GlassCard className="p-6 border-white/5">
                                <h3 className="text-xs font-black text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <Clock size={16} className="text-blue-500" /> System Events
                                </h3>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-black text-zinc-500 uppercase">Created Date</span>
                                        <span className="text-xs font-bold text-white">{profile.created_at ? new Date(profile.created_at).toLocaleString() : 'N/A'}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-black text-zinc-500 uppercase">Last Synchronization</span>
                                        <span className="text-xs font-bold text-white">{profile.updated_at ? new Date(profile.updated_at).toLocaleString() : 'N/A'}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-black text-zinc-500 uppercase">Organization Unit</span>
                                        <span className="text-xs font-bold text-zinc-400">{profile.organizationId || 'Personal Instance'}</span>
                                    </div>
                                </div>
                            </GlassCard>
                        </div>

                        <div className="md:col-span-2">
                            <GlassCard className="p-6 border-white/5 h-full">
                                <h3 className="text-xs font-black text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <Shield size={16} className="text-rose-500" /> Security Status
                                </h3>
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg ${profile.status === 'SUSPENDED' ? 'bg-rose-500/10 text-rose-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                                            <AlertCircle size={18} />
                                        </div>
                                        <div>
                                            <p className="text-xs font-black text-white uppercase">{profile.status || 'ACTIVE'}</p>
                                            <p className="text-[9px] font-bold text-zinc-500 uppercase">Account Access Vector</p>
                                        </div>
                                    </div>
                                    <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                                        <p className="text-[10px] font-bold text-zinc-400">Permissions are managed globally. Super Admin has full overwrite authority for this user profile.</p>
                                    </div>
                                </div>
                            </GlassCard>
                        </div>
                    </div>
                )}

                {activeSection === 'FINANCE' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Wallets */}
                            <div className="space-y-4">
                                <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-1">Infrastructure: Wallets</h3>
                                {wallets.map(wallet => (
                                    <GlassCard key={wallet.id} className="p-4 border-white/5 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white" style={{ backgroundColor: wallet.color + '20', color: wallet.color }}>
                                                <Circle size={24} fill={wallet.color} fillOpacity={0.2} />
                                            </div>
                                            <div>
                                                <p className="text-sm font-black text-white">{wallet.name}</p>
                                                <p className="text-[10px] font-bold text-zinc-500 uppercase">{wallet.currency}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-black text-white">{wallet.initialBalance?.toLocaleString()}</p>
                                            <p className="text-[8px] font-bold text-zinc-600 uppercase">Baseline</p>
                                        </div>
                                    </GlassCard>
                                ))}
                            </div>

                            {/* Plans */}
                            <div className="space-y-4">
                                <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-1">Strategic: Financial Plans</h3>
                                {plans.length === 0 ? (
                                    <p className="text-xs text-zinc-600 italic px-1">No active strategies found.</p>
                                ) : (
                                    plans.map(plan => (
                                        <GlassCard key={plan.id} className="p-4 border-white/5 flex items-center justify-between">
                                            <div>
                                                <p className="text-sm font-black text-white">{plan.title}</p>
                                                <p className="text-[10px] font-bold text-zinc-500 uppercase">{plan.plan_type}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-black text-blue-500">{plan.total_amount?.toLocaleString()}</p>
                                                <span className={`text-[8px] font-black px-1.5 py-0.5 rounded ${plan.status === 'FINALIZED' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>
                                                    {plan.status}
                                                </span>
                                            </div>
                                        </GlassCard>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Recent Transactions */}
                        <div className="space-y-4">
                            <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-1">Flow History: Recent Transactions</h3>
                            <GlassCard className="overflow-hidden border-white/5">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="bg-white/5 border-b border-white/10">
                                            <th className="p-3 text-[9px] font-black text-zinc-500 uppercase">Event</th>
                                            <th className="p-3 text-[9px] font-black text-zinc-500 uppercase">Timeline</th>
                                            <th className="p-3 text-[9px] font-black text-zinc-500 uppercase text-right">Magnitude</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {transactions.map(t => (
                                            <tr key={t.id} className="text-xs">
                                                <td className="p-3">
                                                    <p className="font-bold text-white">{t.note || 'Internal Transfer'}</p>
                                                    <p className="text-[8px] text-zinc-500 uppercase font-black">{t.type}</p>
                                                </td>
                                                <td className="p-3 text-zinc-400 capitalize">{new Date(t.date).toLocaleDateString()}</td>
                                                <td className={`p-3 text-right font-black ${t.type === 'INCOME' ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                    {t.type === 'INCOME' ? '+' : '-'}{t.amount.toLocaleString()}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </GlassCard>
                        </div>
                    </div>
                )}

                {activeSection === 'AI' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <GlassCard className="p-6 border-white/5">
                                <h3 className="text-xs font-black text-white uppercase tracking-widest mb-6">Cognitive Load Distribution</h3>
                                <div className="space-y-6">
                                    {/* Simplified usage by activity type */}
                                    {['Text Transaction Command', 'Multimodal Transaction (Image)', 'Generate Insights', 'Suggest Category'].map(activity => {
                                        const count = tokenLogs.filter(l => l.activity_type === activity).length;
                                        const tokens = tokenLogs.filter(l => l.activity_type === activity).reduce((s, l) => s + (l.total_tokens || 0), 0);
                                        const percent = tokens > 0 ? (tokens / tokenLogs.reduce((s, l) => s + (l.total_tokens || 0), 0) * 100) : 0;

                                        return (
                                            <div key={activity} className="space-y-2">
                                                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-zinc-400">
                                                    <span>{activity}</span>
                                                    <span className="text-white">{tokens.toLocaleString()} ({count} calls)</span>
                                                </div>
                                                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                                    <div className="h-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.3)] transition-all duration-1000" style={{ width: `${percent}%` }} />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </GlassCard>

                            <GlassCard className="p-6 border-white/5">
                                <h3 className="text-xs font-black text-white uppercase tracking-widest mb-4">Model Performance Index</h3>
                                <div className="space-y-4">
                                    {Array.from(new Set(tokenLogs.map(l => l.model))).map(model => (
                                        <div key={model} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-purple-500/10 text-purple-500 rounded-lg">
                                                    <Activity size={16} />
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-black text-white uppercase">{model}</p>
                                                    <p className="text-[8px] font-bold text-zinc-600 uppercase">Operational Model</p>
                                                </div>
                                            </div>
                                            <span className="text-xs font-black text-zinc-300">
                                                {tokenLogs.filter(l => l.model === model).length} Sessions
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </GlassCard>
                        </div>

                        {/* Usage Logs */}
                        <div className="space-y-4">
                            <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-1">Raw Intelligence Streams: Execution Logs</h3>
                            <GlassCard className="overflow-hidden border-white/5">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="bg-white/5 border-b border-white/10">
                                            <th className="p-3 text-[9px] font-black text-zinc-500 uppercase">Module</th>
                                            <th className="p-3 text-[9px] font-black text-zinc-500 uppercase">Input</th>
                                            <th className="p-3 text-[9px] font-black text-zinc-500 uppercase">Output</th>
                                            <th className="p-3 text-[9px] font-black text-zinc-500 uppercase text-right">Executed</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {tokenLogs.map(log => (
                                            <tr key={log.id} className="text-[10px]">
                                                <td className="p-3">
                                                    <p className="font-bold text-white uppercase">{log.activity_type}</p>
                                                    <p className="text-[8px] text-zinc-600 font-bold uppercase">{log.model}</p>
                                                </td>
                                                <td className="p-3 text-zinc-400 font-mono">{log.input_tokens}</td>
                                                <td className="p-3 text-zinc-400 font-mono">{log.output_tokens}</td>
                                                <td className="p-3 text-right text-zinc-500 capitalize">{new Date(log.timestamp).toLocaleTimeString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </GlassCard>
                        </div>
                    </div>
                )}

                {activeSection === 'ACTIVITY' && (
                    <div className="max-w-xl mx-auto py-10 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="relative space-y-8">
                            {/* Central Line */}
                            <div className="absolute left-[19px] top-4 bottom-0 w-px bg-white/10" />

                            {[...transactions, ...plans, ...commitments]
                                .sort((a, b) => new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime())
                                .slice(0, 20)
                                .map((event, idx) => (
                                    <div key={idx} className="flex gap-6 relative">
                                        <div className="w-10 h-10 rounded-full bg-zinc-900 border border-white/10 flex items-center justify-center z-10 shrink-0">
                                            {'title' in event ? <PieChart size={18} className="text-blue-500" /> :
                                                'amount' in event && 'note' in event ? <TrendingUp size={18} className="text-emerald-500" /> :
                                                    <Activity size={18} className="text-purple-500" />}
                                        </div>
                                        <div className="pt-1">
                                            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">
                                                {new Date(event.updated_at || 0).toLocaleString()}
                                            </p>
                                            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 w-full">
                                                <p className="text-sm font-black text-white">
                                                    {'title' in event ? `Plan Created: ${event.title}` :
                                                        'amount' in event && 'note' in event ? `Transaction Logged: ${event.note}` :
                                                            `System Update: ${event.id}`}
                                                </p>
                                                <p className="text-[10px] font-bold text-zinc-500 mt-1 uppercase">
                                                    {'total_amount' in event ? `Magnitude: ${event.total_amount}` :
                                                        'amount' in event ? `Magnitude: ${event.amount}` : ''}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            }
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
