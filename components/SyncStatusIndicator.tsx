import React, { useEffect, useState } from 'react';
import { useFinance } from '../store/FinanceContext';
import { Wifi, WifiOff, Cloud, CloudOff, RefreshCw, AlertCircle, Check, Zap, Activity } from 'lucide-react';


export const SyncStatusIndicator: React.FC = () => {
    const { syncStatus, forceSyncNow } = useFinance();
    const { isOnline, pendingCount, lastSyncAt, error, isSyncing } = syncStatus;
    const [pulse, setPulse] = useState(false);

    // Pulse animation when syncing
    useEffect(() => {
        if (isSyncing) {
            const interval = setInterval(() => setPulse(p => !p), 1000);
            return () => clearInterval(interval);
        }
        setPulse(false);
    }, [isSyncing]);

    const getStatusColor = () => {
        if (!isOnline) return 'text-rose-500';
        if (error) return 'text-amber-500';
        if (pendingCount > 0) return 'text-blue-500';
        return 'text-emerald-500';
    };

    const getBgColor = () => {
        if (!isOnline) return 'bg-rose-500/10 border-rose-500/20';
        if (error) return 'bg-amber-500/10 border-amber-500/20';
        if (pendingCount > 0) return 'bg-blue-500/10 border-blue-500/20';
        return 'bg-emerald-500/10 border-emerald-500/20';
    };

    const getStatusIcon = () => {
        if (!isOnline) return <WifiOff size={14} />;
        if (isSyncing) return <RefreshCw size={14} className="animate-spin" />;
        if (error) return <AlertCircle size={14} />;
        if (pendingCount > 0) return <Cloud size={14} />;
        return <Check size={14} />;
    };

    const getStatusText = () => {
        if (!isOnline) return 'Offline';
        if (isSyncing) return 'Syncing...';
        if (error) return 'Error';
        if (pendingCount > 0) return `${pendingCount}`;
        return 'Synced';
    };

    const getLastSyncText = () => {
        if (!lastSyncAt) return null;
        const now = Date.now();
        const diff = now - lastSyncAt;
        const minutes = Math.floor(diff / 60000);

        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h`;
        return '1d+';
    };

    return (
        <div className="flex items-center gap-2">
            {/* Compact Status Badge */}
            <button
                onClick={() => {
                    if (isOnline && !isSyncing) {
                        forceSyncNow();
                    }
                }}
                disabled={!isOnline || isSyncing}
                className={`
                    relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border transition-all
                    ${isOnline && !isSyncing
                        ? 'hover:bg-[var(--surface-glass)] active:scale-95 cursor-pointer'
                        : 'cursor-not-allowed opacity-60'
                    }
                    ${getBgColor()}
                    ${pulse ? 'scale-105' : 'scale-100'}
                `}
            >
                {/* Animated background pulse */}
                {isSyncing && (
                    <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-blue-500/20 to-purple-500/20 animate-pulse" />
                )}

                <span className={`relative z-10 ${getStatusColor()}`}>{getStatusIcon()}</span>
                <span className={`relative z-10 text-[9px] font-black uppercase tracking-widest ${getStatusColor()}`}>
                    {getStatusText()}
                </span>

            </button>


            {/* Last Sync Time */}
            {lastSyncAt && isOnline && !isSyncing && (
                <span className="text-[8px] text-[var(--text-muted)] font-medium transition-colors">
                    {getLastSyncText()}
                </span>
            )}
        </div>
    );
};

// Detailed Sync Status Panel (for Settings)
export const SyncStatusPanel: React.FC = () => {
    const { syncStatus, forceSyncNow } = useFinance();
    const { isOnline, pendingCount, lastSyncAt, error, isSyncing } = syncStatus;
    const [showDetails, setShowDetails] = useState(false);

    return (
        <div className="space-y-4">
            {/* Main Status Card */}
            <div className="relative overflow-hidden bg-gradient-to-br from-[var(--surface-glass)] to-[var(--surface-glass)]/50 border border-[var(--border-glass)] rounded-2xl p-5 transition-all hover:border-blue-500/30">
                {/* Animated gradient background when syncing */}
                {isSyncing && (
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-blue-500/5 animate-pulse" />
                )}

                <div className="relative z-10 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className={`
                            w-12 h-12 rounded-2xl flex items-center justify-center border transition-all
                            ${!isOnline
                                ? 'bg-rose-500/10 border-rose-500/20 text-rose-500'
                                : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
                            }
                            ${isSyncing ? 'animate-pulse' : ''}
                        `}>
                            {isOnline ? <Wifi size={24} /> : <WifiOff size={24} />}
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-[var(--text-main)] transition-colors flex items-center gap-2">
                                {isOnline ? 'Connected' : 'Offline Mode'}
                            </h3>
                            <p className="text-[10px] text-[var(--text-muted)] font-medium transition-colors">
                                {isOnline ? 'Cloud sync active' : 'Changes saved locally'}
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={forceSyncNow}
                        disabled={!isOnline || isSyncing}
                        className={`
                            px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2
                            ${isOnline && !isSyncing
                                ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-500 hover:to-purple-500 active:scale-95 shadow-lg shadow-blue-500/20'
                                : 'bg-[var(--input-bg)] text-[var(--text-muted)] cursor-not-allowed'
                            }
                        `}
                    >
                        <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
                        {isSyncing ? 'Syncing...' : 'Sync Now'}
                    </button>
                </div>
            </div>

            {/* Pending Operations */}
            {pendingCount > 0 && (
                <div className="relative overflow-hidden bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-2xl p-4 transition-all hover:border-blue-500/40">
                    <div className="flex items-start justify-between">
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                                <Cloud size={16} className="text-blue-500" />
                                <span className="text-xs font-bold text-blue-500">Pending Changes</span>
                                <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-500 text-[9px] font-black">
                                    {pendingCount}
                                </span>
                            </div>
                            <p className="text-[10px] text-[var(--text-muted)] transition-colors">
                                {pendingCount} operation{pendingCount > 1 ? 's' : ''} waiting to sync to cloud
                            </p>
                        </div>
                        <button
                            onClick={() => setShowDetails(!showDetails)}
                            className="text-[9px] text-blue-500 hover:text-blue-400 font-bold uppercase tracking-wider"
                        >
                            {showDetails ? 'Hide' : 'Details'}
                        </button>
                    </div>

                    {/* Operation Details */}
                    {showDetails && (
                        <div className="mt-4 pt-4 border-t border-blue-500/20 space-y-3">
                            {syncStatus.pendingOperations?.map((op) => {
                                const payload = JSON.parse(op.payload);
                                return (
                                    <div key={op.id} className="flex items-center justify-between bg-[var(--surface-glass)] p-2 rounded-xl border border-blue-500/10">
                                        <div className="flex flex-col gap-0.5 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className={`text-[8px] font-black px-1.5 py-0.5 rounded ${op.action === 'CREATE' ? 'bg-emerald-500/20 text-emerald-500' : op.action === 'UPDATE' ? 'bg-blue-500/20 text-blue-500' : 'bg-rose-500/20 text-rose-500'}`}>
                                                    {op.action}
                                                </span>
                                                <span className="text-[9px] font-bold text-[var(--text-main)] transition-colors truncate">
                                                    {op.entity.replace('_', ' ').toUpperCase()}
                                                </span>
                                            </div>
                                            <p className="text-[8px] text-[var(--text-muted)] truncate max-w-[180px] transition-colors">
                                                {payload.name || payload.note || payload.id || 'No details'}
                                            </p>
                                        </div>
                                        <div className="text-[7px] text-[var(--text-muted)] font-bold transition-colors">
                                            {new Date(op.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* Sync Error */}
            {error && (
                <div className="relative overflow-hidden bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-2xl p-4 transition-all hover:border-amber-500/40">
                    <div className="flex items-center gap-2 mb-2">
                        <AlertCircle size={16} className="text-amber-500" />
                        <span className="text-xs font-bold text-amber-500">Sync Issue</span>
                    </div>
                    <p className="text-[10px] text-[var(--text-muted)] transition-colors">{error}</p>
                    <p className="text-[9px] text-amber-500 mt-2 flex items-center gap-1">
                        <Activity size={10} />
                        Auto-retry in progress...
                    </p>
                </div>
            )}

            {/* Last Sync */}
            {lastSyncAt && (
                <div className="flex items-center justify-between px-1">
                    <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest transition-colors">
                        Last Synced
                    </span>
                    <span className="text-[10px] font-medium text-[var(--text-main)] transition-colors">
                        {new Date(lastSyncAt).toLocaleString()}
                    </span>
                </div>
            )}

            {/* Info Card */}
            <div className="relative overflow-hidden bg-gradient-to-br from-[var(--surface-glass)] to-[var(--surface-glass)]/30 border border-[var(--border-glass)] rounded-2xl p-4 transition-all">
                <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                        <CloudOff size={16} className="text-blue-500" />
                    </div>
                    <div className="flex-1">
                        <h4 className="text-[10px] font-bold text-[var(--text-main)] mb-1">Offline Mode</h4>
                        <p className="text-[9px] text-[var(--text-muted)] leading-relaxed transition-colors">
                            All changes are saved locally and will automatically sync when you're back online.
                            You can continue using the app without interruption.
                        </p>
                    </div>
                </div>
            </div>

            {/* Sync Stats */}
            <div className="grid grid-cols-3 gap-3">
                <div className="bg-[var(--surface-glass)] border border-[var(--border-glass)] rounded-xl p-3 text-center transition-all hover:border-emerald-500/30">
                    <div className="text-lg font-black text-emerald-500">
                        {isOnline ? '✓' : '○'}
                    </div>
                    <div className="text-[8px] text-[var(--text-muted)] font-bold uppercase tracking-wider mt-1">
                        Status
                    </div>
                </div>
                <div className="bg-[var(--surface-glass)] border border-[var(--border-glass)] rounded-xl p-3 text-center transition-all hover:border-blue-500/30">
                    <div className="text-lg font-black text-blue-500">
                        {pendingCount}
                    </div>
                    <div className="text-[8px] text-[var(--text-muted)] font-bold uppercase tracking-wider mt-1">
                        Pending
                    </div>
                </div>
                <div className="bg-[var(--surface-glass)] border border-[var(--border-glass)] rounded-xl p-3 text-center transition-all hover:border-purple-500/30">
                    <div className="text-lg font-black text-purple-500">
                        {isSyncing ? '⟳' : '✓'}
                    </div>
                    <div className="text-[8px] text-[var(--text-muted)] font-bold uppercase tracking-wider mt-1">
                        Sync
                    </div>
                </div>
            </div>
        </div>
    );
};
