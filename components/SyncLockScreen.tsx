
import React from 'react';
import { useFinance } from '../store/FinanceContext';
import { Loader2, ShieldCheck, Zap, Globe } from 'lucide-react';

const SyncLockScreen: React.FC = () => {
    const { syncStatus, settings } = useFinance();
    const progress = syncStatus.progressPercent || 0;
    const message = syncStatus.progress || 'Preparing your financial cockpit...';

    return (
        <div className="fixed inset-0 z-[100] bg-[var(--bg-color)] flex flex-col items-center justify-center px-8 overflow-hidden">
            {/* Background Ambient Glow */}
            <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-600/20 blur-[120px] rounded-full animate-pulse" />
            <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-indigo-600/20 blur-[120px] rounded-full animate-pulse delay-700" />

            <div className="relative w-full max-w-sm flex flex-col items-center">
                {/* Logo/Icon Container */}
                <div className="relative mb-12">
                    <div className="absolute inset-0 bg-blue-500/20 blur-3xl rounded-full scale-150 animate-pulse" />
                    <div className="w-24 h-24 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-[32px] flex items-center justify-center shadow-[0_20px_50px_rgba(37,99,235,0.4)] relative z-10 border border-white/20">
                        {settings.customLogoUrl ? (
                            <img
                                src={settings.customLogoUrl}
                                alt="Logo"
                                className="w-16 h-16 object-contain"
                                onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                    (e.target as HTMLImageElement).parentElement!.innerHTML = '<svg class="w-12 h-12 text-white fill-white/20 animate-bounce-subtle" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"></path></svg>';
                                }}
                            />
                        ) : (
                            <Zap size={48} className="text-white fill-white/20 animate-bounce-subtle" />
                        )}
                    </div>

                    {/* Orbital Orbs */}
                    <div className="absolute -top-4 -right-4 w-8 h-8 bg-[var(--surface-card)] border border-[var(--border-glass)] rounded-xl flex items-center justify-center shadow-lg animate-float">
                        <ShieldCheck size={16} className="text-emerald-400" />
                    </div>
                    <div className="absolute -bottom-2 -left-6 w-10 h-10 bg-[var(--surface-card)] border border-[var(--border-glass)] rounded-xl flex items-center justify-center shadow-lg animate-float delay-500">
                        <Globe size={18} className="text-blue-400" />
                    </div>
                </div>

                {/* Textual Info */}
                <div className="text-center mb-10 space-y-2">
                    <h1 className="text-2xl font-black tracking-tight text-[var(--text-main)]">
                        Initializing {settings.customAppName || 'FinOS'}
                    </h1>
                    <p className="text-[var(--text-muted)] text-sm font-medium max-w-[240px] mx-auto leading-relaxed">
                        {message}
                    </p>
                </div>

                {/* Progress System */}
                <div className="w-full space-y-4">
                    <div className="flex justify-between items-end px-1">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500">System Authority</span>
                        <span className="text-xl font-black tabular-nums text-[var(--text-main)]">{progress}%</span>
                    </div>

                    <div className="w-full h-3 bg-[var(--input-bg)] border border-[var(--border-glass)] rounded-full overflow-hidden p-0.5 shadow-inner">
                        <div
                            className="h-full bg-gradient-to-r from-blue-600 via-indigo-500 to-blue-400 rounded-full transition-all duration-700 ease-out relative shadow-[0_0_15px_rgba(37,99,235,0.5)]"
                            style={{ width: `${progress}%` }}
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 animate-shimmer" />
                        </div>
                    </div>
                </div>

                {/* Footer Hardware Info */}
                <div className="mt-16 flex items-center gap-4 text-white/20">
                    <div className="h-[1px] w-8 bg-current" />
                    <Loader2 size={14} className="animate-spin" />
                    <span className="text-[9px] font-black uppercase tracking-[0.3em] font-mono">Neural Sync Active...</span>
                    <div className="h-[1px] w-8 bg-current" />
                </div>
            </div>
        </div>
    );
};

export default SyncLockScreen;
