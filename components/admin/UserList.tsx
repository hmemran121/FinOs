import React, { useState, useEffect } from 'react';
import { adminService, UserStats } from '../../services/adminService';
import {
    Search,
    Filter,
    User,
    Mail,
    Wallet,
    Database,
    Calendar,
    Activity,
    ChevronRight,
    ArrowUpDown,
    MoreVertical,
    CheckCircle2,
    XCircle,
    AlertCircle
} from 'lucide-react';
import { GlassCard } from '../ui/GlassCard';

interface UserListProps {
    onSelectUser: (userId: string) => void;
}

export const UserList: React.FC<UserListProps> = ({ onSelectUser }) => {
    const [users, setUsers] = useState<UserStats[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState<'ALL' | 'ACTIVE' | 'INACTIVE' | 'SUSPENDED'>('ALL');

    useEffect(() => {
        loadUsers();
    }, []);

    const loadUsers = async () => {
        try {
            setLoading(true);
            const data = await adminService.getUsers();
            setUsers(data);
        } catch (error) {
            console.error('Failed to load users:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredUsers = users.filter(user => {
        const matchesSearch =
            user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.id?.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesFilter = filterStatus === 'ALL' || user.status === filterStatus;

        return matchesSearch && matchesFilter;
    });

    const getStatusIcon = (status?: string) => {
        switch (status) {
            case 'ACTIVE': return <CheckCircle2 className="text-emerald-500" size={16} />;
            case 'INACTIVE': return <XCircle className="text-zinc-500" size={16} />;
            case 'SUSPENDED': return <AlertCircle className="text-rose-500" size={16} />;
            default: return <CheckCircle2 className="text-emerald-500" size={16} />; // Default active
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-20 space-y-4">
                <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
                <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs">Fetching Registry...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header / Stats Quick View */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <GlassCard className="p-4 border-white/5">
                    <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Total Registry</p>
                    <p className="text-2xl font-black text-white">{users.length}</p>
                </GlassCard>
                <GlassCard className="p-4 border-white/5">
                    <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Active Now</p>
                    <p className="text-2xl font-black text-emerald-500">{users.filter(u => u.status !== 'SUSPENDED').length}</p>
                </GlassCard>
                <GlassCard className="p-4 border-white/5">
                    <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Total Infrastructure</p>
                    <p className="text-2xl font-black text-blue-500">{users.reduce((acc, u) => acc + u.walletCount, 0)} Wallets</p>
                </GlassCard>
                <GlassCard className="p-4 border-white/5">
                    <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Global Intelligence</p>
                    <p className="text-2xl font-black text-purple-500">{(users.reduce((acc, u) => acc + u.totalTokenUsage, 0) / 1000).toFixed(1)}k Tokens</p>
                </GlassCard>
            </div>

            {/* toolbar */}
            <div className="flex flex-col md:row items-center justify-between gap-4">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                    <input
                        type="text"
                        placeholder="Search Identity, Email or ID..."
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-white placeholder:text-zinc-600 focus:outline-none focus:border-blue-500/50 transition-all font-bold text-sm"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0">
                    {['ALL', 'ACTIVE', 'INACTIVE', 'SUSPENDED'].map((status) => (
                        <button
                            key={status}
                            onClick={() => setFilterStatus(status as any)}
                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${filterStatus === status
                                    ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/20'
                                    : 'bg-white/5 border-white/10 text-zinc-500 hover:bg-white/10'
                                }`}
                        >
                            {status}
                        </button>
                    ))}
                </div>
            </div>

            {/* Users Table */}
            <GlassCard className="overflow-hidden border-white/5">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-white/5 border-b border-white/10">
                                <th className="p-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest">User Identity</th>
                                <th className="p-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Status</th>
                                <th className="p-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest text-center">Infrastructure</th>
                                <th className="p-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest text-center">AI Usage</th>
                                <th className="p-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest text-right">Activity</th>
                                <th className="p-4 w-10"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {filteredUsers.map((user) => (
                                <tr
                                    key={user.id}
                                    onClick={() => user.id && onSelectUser(user.id)}
                                    className="hover:bg-white/5 transition-colors cursor-pointer group"
                                >
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-zinc-800 to-black border border-white/10 flex items-center justify-center overflow-hidden">
                                                {user.avatar ? (
                                                    <img src={user.avatar} className="w-full h-full object-cover" alt="" />
                                                ) : (
                                                    <User className="text-zinc-500" size={20} />
                                                )}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-black text-white truncate">{user.name}</p>
                                                <p className="text-[10px] font-bold text-zinc-500 truncate">{user.email || user.phone || 'No Contact'}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-2">
                                            {getStatusIcon(user.status)}
                                            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-300">
                                                {user.status || 'ACTIVE'}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="p-4 text-center">
                                        <div className="flex items-center justify-center gap-4">
                                            <div className="flex flex-col items-center">
                                                <span className="text-xs font-black text-white">{user.walletCount}</span>
                                                <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-tighter">Wallets</span>
                                            </div>
                                            <div className="w-px h-6 bg-white/10" />
                                            <div className="flex flex-col items-center">
                                                <span className="text-xs font-black text-white">{user.planCount}</span>
                                                <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-tighter">Plans</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4 text-center">
                                        <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400">
                                            <Database size={10} />
                                            <span className="text-[10px] font-black">{user.totalTokenUsage.toLocaleString()}</span>
                                        </div>
                                    </td>
                                    <td className="p-4 text-right">
                                        <p className="text-[10px] font-black text-zinc-300 uppercase">
                                            {user.lastActivity ? new Date(user.lastActivity).toLocaleDateString() : 'Never'}
                                        </p>
                                        <p className="text-[8px] font-bold text-zinc-600 uppercase">System Trace</p>
                                    </td>
                                    <td className="p-4 text-right text-zinc-700 group-hover:text-blue-500 transition-colors">
                                        <ChevronRight size={20} />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {filteredUsers.length === 0 && (
                    <div className="p-20 text-center">
                        <User className="mx-auto text-zinc-800 mb-4" size={48} />
                        <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs">No matching identity discovered.</p>
                    </div>
                )}
            </GlassCard>
        </div>
    );
};
