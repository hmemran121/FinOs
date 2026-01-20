
import React from 'react';
import { useFinance } from '../store/FinanceContext';
import { GlassCard } from './ui/GlassCard';
import { Database, Cloud, CheckCircle2, AlertCircle, RefreshCw, Layers, ShieldCheck, Server, Globe, Zap, Cpu } from 'lucide-react';

const SyncDiagnostics: React.FC = () => {
    const { syncStatus, forceSyncNow } = useFinance();

    const tables = Object.entries(syncStatus.tableStatuses || {}).sort((a, b) => {
        if (a[1].status === 'syncing') return -1;
        if (b[1].status === 'syncing') return 1;
        return 0;
    });

    const staticTableNames = ['categories_global', 'channel_types', 'plan_suggestions'];
    const localTotalStatic = Object.values(syncStatus.staticVersions).reduce((a, b) => a + Number(b || 0), 0);
    // FIX: Sum all keys from server object, do not default to 0 if exists
    const serverTotalStatic = syncStatus.serverStaticVersions && Object.keys(syncStatus.serverStaticVersions).length > 0
        ? Object.values(syncStatus.serverStaticVersions).reduce((a, b) => a + Number(b || 0), 0)
        : localTotalStatic;

    return (
        <section className="mt-8 mb-4">
            <div className="flex items-center justify-between mb-4 px-2">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
                        <Database size={18} className="text-indigo-400" />
                    </div>
                    <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Sync Engine Control Panel</h2>
                </div>
                <button
                    onClick={() => forceSyncNow()}
                    disabled={syncStatus.isSyncing}
                    className="flex items-center gap-2 bg-indigo-600/10 hover:bg-indigo-600/20 border border-indigo-600/20 px-3 py-1.5 rounded-xl transition-all active:scale-95 disabled:opacity-50"
                >
                    <RefreshCw size={12} className={`text-indigo-400 ${syncStatus.isSyncing ? 'animate-spin' : ''}`} />
                    <span className="text-[9px] font-black uppercase tracking-widest text-indigo-400">Manual Pulse</span>
                </button>
            </div>

            <GlassCard className="bg-zinc-900/40 border-white/5 p-4 overflow-hidden">
                <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-zinc-800/20 p-4 rounded-3xl border border-white/5 flex flex-col gap-3">
                        <div className="flex items-center gap-2">
                            <Zap size={10} className="text-emerald-400" />
                            <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Dynamic User Token</span>
                        </div>
                        <div className="flex justify-between items-end">
                            <div><p className="text-[8px] text-zinc-600 font-bold uppercase mb-0.5">Local</p><p className="text-lg font-bold text-white tabular-nums leading-none">{syncStatus.userSyncToken}</p></div>
                            <div className="text-right"><p className="text-[8px] text-zinc-600 font-bold uppercase mb-0.5">Server</p><p className={`text-lg font-bold tabular-nums leading-none ${syncStatus.serverUserSyncToken && syncStatus.serverUserSyncToken > syncStatus.userSyncToken ? 'text-amber-400' : 'text-zinc-500'}`}>{syncStatus.serverUserSyncToken || syncStatus.userSyncToken}</p></div>
                        </div>
                    </div>
                    <div className="bg-zinc-800/20 p-4 rounded-3xl border border-white/5 flex flex-col gap-3">
                        <div className="flex items-center gap-2">
                            <Cpu size={10} className="text-indigo-400" />
                            <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Static Blueprint Sum</span>
                        </div>
                        <div className="flex justify-between items-end">
                            <div><p className="text-[8px] text-zinc-600 font-bold uppercase mb-0.5">Local</p><p className="text-lg font-bold text-white tabular-nums leading-none">{localTotalStatic}</p></div>
                            <div className="text-right"><p className="text-[8px] text-zinc-600 font-bold uppercase mb-0.5">Server</p><p className={`text-lg font-bold tabular-nums leading-none ${serverTotalStatic > localTotalStatic ? 'text-amber-400' : 'text-zinc-500'}`}>{serverTotalStatic}</p></div>
                        </div>
                    </div>
                </div>

                <div className="mb-6 pb-6 border-b border-white/5">
                    <div className="bg-black/20 rounded-2xl p-3 border border-white/[0.03]">
                        <p className="text-[8px] font-black uppercase tracking-[0.2em] text-zinc-600 mb-2 px-1">Per-Table Version Verification</p>
                        <div className="grid grid-cols-1 gap-1.5">
                            {staticTableNames.map(tableName => {
                                const localVer = syncStatus.staticVersions[tableName] || 0;
                                const serverVer = syncStatus.serverStaticVersions?.[tableName] || 0;
                                const isDiff = serverVer > localVer;
                                return (
                                    <div key={tableName} className="flex items-center justify-between bg-zinc-800/10 p-2 px-3 rounded-xl border border-white/[0.02]">
                                        <div className="flex items-center gap-2 text-[9px] font-bold text-zinc-400 uppercase tracking-wider"><Globe size={10} className={isDiff ? "text-amber-400 animate-pulse" : "text-zinc-500"} />{tableName.replace('categories_global', 'Cat Global').replace('_', ' ')}</div>
                                        <div className="flex items-center gap-4 text-right">
                                            <div><span className="text-[7px] text-zinc-700 font-bold uppercase block leading-none">Phone</span><span className="text-[10px] font-black text-zinc-200 tabular-nums leading-none">{localVer}</span></div>
                                            <div className="h-4 w-[1px] bg-white/5" />
                                            <div><span className="text-[7px] text-indigo-500/40 font-bold uppercase block leading-none">Cloud</span><span className={`text-[10px] font-black tabular-nums leading-none ${isDiff ? 'text-amber-400' : 'text-zinc-500'}`}>{serverVer}</span></div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4 mb-6 pb-6 border-b border-white/5 text-xs">
                    <div className={`p-3 rounded-2xl ${syncStatus.isOnline ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                        <Cloud size={20} className={!syncStatus.isOnline ? "line-through opacity-50" : ""} />
                    </div>
                    <div><p className="text-[9px] font-black uppercase text-zinc-500">Cloud Integrity</p><h3 className="font-bold text-white">{syncStatus.isOnline ? 'Authenticated' : 'Offline Engine'}</h3></div>
                    <div className="ml-auto text-right"><p className="text-[9px] font-black uppercase text-zinc-500">Core Engine</p><div className="flex items-center gap-2 justify-end"><span className={`w-2 h-2 rounded-full ${syncStatus.isSyncing ? 'bg-blue-500 animate-pulse' : 'bg-emerald-500'}`} /><span className="text-[10px] font-black text-white uppercase">{syncStatus.isSyncing ? 'Processing' : 'Standby'}</span></div></div>
                </div>

                <div className="space-y-3 max-h-[250px] overflow-y-auto pr-2 no-scrollbar">
                    {tables.map(([tableName, status]) => (
                        <div key={tableName} className="flex justify-between items-center bg-white/[0.02] p-3 rounded-2xl border border-white/5">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-xl border ${status.status === 'syncing' ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' : status.status === 'completed' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-zinc-800/50 border-white/5 text-zinc-600'}`}>
                                    {status.status === 'syncing' ? <RefreshCw size={14} className="animate-spin" /> : status.status === 'completed' ? <CheckCircle2 size={14} /> : <Layers size={14} />}
                                </div>
                                <div><p className="text-[9px] font-black uppercase text-zinc-500">{tableName.replace('_', ' ')}</p><p className="text-xs font-bold text-white capitalize">{status.status}</p></div>
                            </div>
                            <div className="text-right text-[10px] font-black tabular-nums text-zinc-600">{status.progress}%<p className="text-[8px] text-zinc-700 font-bold uppercase mt-0.5">{status.lastResult || '-'}</p></div>
                        </div>
                    ))}
                </div>
            </GlassCard>
        </section>
    );
};

export default SyncDiagnostics;
