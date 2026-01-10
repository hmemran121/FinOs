import React, { useState } from 'react';
import { useFinance } from '../store/FinanceContext';
import { GlassCard } from './ui/GlassCard';
import {
    Bell,
    X,
    CheckCheck,
    AlertTriangle,
    Info,
    BellRing,
    Calendar,
    Wallet,
    ArrowRight,
    TrendingDown,
    Trash2
} from 'lucide-react';
import { format } from 'date-fns';
import { AppNotification } from '../types';

interface NotificationInboxProps {
    onClose: () => void;
}

const NotificationInbox: React.FC<NotificationInboxProps> = ({ onClose }) => {
    const { notifications, markNotificationAsRead, deleteNotification, setActiveTab } = useFinance();
    const [filter, setFilter] = useState<'ALL' | 'UNREAD'>('ALL');

    const filteredNotifications = notifications
        .filter(n => filter === 'ALL' || !n.isRead)
        .sort((a, b) => b.created_at - a.created_at);

    const unreadCount = notifications.filter(n => !n.isRead).length;

    const getIcon = (type: AppNotification['type']) => {
        switch (type) {
            case 'BALANCE_ALERT': return <TrendingDown className="text-rose-400" size={20} />;
            case 'COMMITMENT_DUE': return <Calendar className="text-amber-400" size={20} />;
            case 'PLAN_MILESTONE': return <Wallet className="text-blue-400" size={20} />;
            default: return <Info className="text-blue-400" size={20} />;
        }
    };

    const getPriorityColor = (priority: AppNotification['priority']) => {
        switch (priority) {
            case 'HIGH': return 'bg-rose-500/20 text-rose-500 border-rose-500/30';
            case 'MEDIUM': return 'bg-amber-500/20 text-amber-500 border-amber-500/30';
            default: return 'bg-blue-500/20 text-blue-500 border-blue-500/30';
        }
    };

    const handleAction = (n: AppNotification) => {
        if (n.actionUrl) {
            // Assuming actionUrl is a tab name for now
            setActiveTab(n.actionUrl as any);
        }
        markNotificationAsRead(n.id);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex justify-end">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Sidebar Panel */}
            <div className="relative w-full max-w-md h-full bg-[var(--bg-color)] shadow-2xl border-l border-[var(--border-glass)] flex flex-col animate-in slide-in-from-right duration-500">
                <header className="px-6 py-8 border-b border-[var(--border-glass)] flex items-center justify-between bg-[var(--nav-bg)] backdrop-blur-xl">
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <div className="p-2.5 bg-blue-500/10 rounded-2xl border border-blue-500/20">
                                <BellRing size={22} className="text-blue-500" />
                            </div>
                            {unreadCount > 0 && (
                                <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-[var(--bg-color)]">
                                    {unreadCount}
                                </span>
                            )}
                        </div>
                        <div>
                            <h2 className="text-xl font-black tracking-tight text-[var(--text-main)] transition-colors">FinOS Guard</h2>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] transition-colors">Intelligence Matrix</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2.5 bg-[var(--surface-deep)] rounded-xl border border-[var(--border-glass)] text-[var(--text-muted)] hover:text-rose-500 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </header>

                {/* Filters */}
                <div className="px-6 py-4 flex gap-2">
                    <button
                        onClick={() => setFilter('ALL')}
                        className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border ${filter === 'ALL'
                                ? 'bg-blue-600 border-blue-500 text-white shadow-lg'
                                : 'bg-[var(--surface-deep)] border-[var(--border-glass)] text-[var(--text-muted)]'
                            }`}
                    >
                        All Broadcasts
                    </button>
                    <button
                        onClick={() => setFilter('UNREAD')}
                        className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border ${filter === 'UNREAD'
                                ? 'bg-blue-600 border-blue-500 text-white shadow-lg'
                                : 'bg-[var(--surface-deep)] border-[var(--border-glass)] text-[var(--text-muted)]'
                            }`}
                    >
                        Active Alerts
                    </button>
                </div>

                {/* Notification List */}
                <div className="flex-1 overflow-y-auto px-6 pb-24 no-scrollbar">
                    {filteredNotifications.length > 0 ? (
                        <div className="space-y-4 pt-2">
                            {filteredNotifications.map((n) => (
                                <GlassCard
                                    key={n.id}
                                    className={`group relative overflow-hidden transition-all border-l-4 ${n.isRead ? 'opacity-60 grayscale-[0.5]' : ''
                                        }`}
                                    style={{ borderLeftColor: n.priority === 'HIGH' ? '#f43f5e' : n.priority === 'MEDIUM' ? '#f59e0b' : '#3b82f6' }}
                                >
                                    <div className="flex flex-col gap-3">
                                        <div className="flex justify-between items-start">
                                            <div className="flex items-center gap-2">
                                                {getIcon(n.type)}
                                                <span className={`text-[8px] font-black px-2 py-0.5 rounded border uppercase tracking-widest ${getPriorityColor(n.priority)}`}>
                                                    {n.priority} Priority
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                {!n.isRead && (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); markNotificationAsRead(n.id); }}
                                                        className="p-1.5 hover:bg-blue-500/10 rounded-lg text-blue-400 transition-colors"
                                                        title="Mark as read"
                                                    >
                                                        <CheckCheck size={14} />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); deleteNotification(n.id); }}
                                                    className="p-1.5 hover:bg-rose-500/10 rounded-lg text-[var(--text-muted)] hover:text-rose-500 transition-colors"
                                                    title="Delete"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>

                                        <div>
                                            <h3 className="font-black text-sm text-[var(--text-main)] mb-1">{n.title}</h3>
                                            <p className="text-xs text-[var(--text-muted)] leading-relaxed font-medium transition-colors">{n.message}</p>
                                        </div>

                                        <div className="flex items-center justify-between pt-2 border-t border-[var(--border-glass)]">
                                            <span className="text-[9px] font-bold text-[var(--text-dim)] uppercase tracking-tighter">
                                                {format(n.created_at, 'MMM d, HH:mm')}
                                            </span>
                                            {n.actionUrl && (
                                                <button
                                                    onClick={() => handleAction(n)}
                                                    className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-blue-500 group-hover:gap-1.5 transition-all"
                                                >
                                                    Access Node <ArrowRight size={10} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </GlassCard>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-24 text-center">
                            <div className="w-20 h-20 bg-[var(--surface-deep)] rounded-full flex items-center justify-center mb-6 border border-[var(--border-glass)] shadow-inner">
                                <Bell size={32} className="text-[var(--text-dim)]" />
                            </div>
                            <h3 className="font-black text-lg text-[var(--text-main)] mb-2">No Active Alerts</h3>
                            <p className="text-xs text-[var(--text-muted)] max-w-[200px] font-medium leading-relaxed">System monitoring is quiet. No protocols require your immediate attention.</p>
                        </div>
                    )}
                </div>

                {/* Bottom Actions */}
                <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-[var(--bg-color)] to-transparent pointer-events-none">
                    <div className="pointer-events-auto">
                        <GlassCard className="py-3 px-6 flex items-center justify-between border-blue-500/20 bg-blue-500/5">
                            <p className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">Matrix Surveillance Active</p>
                            <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                                <span className="text-[9px] font-black text-emerald-500 uppercase">Live</span>
                            </div>
                        </GlassCard>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NotificationInbox;
