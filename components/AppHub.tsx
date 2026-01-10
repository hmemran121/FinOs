import React from 'react';
import { useFinance } from '../store/FinanceContext';
import { GlassCard } from './ui/GlassCard';
import {
    ShieldAlert,
    Grid,
    Target,
    Settings as SettingsIcon,
    Activity,
    ChevronRight,
    Sparkles,
    Layout,
    Command,
    Zap
} from 'lucide-react';

const AppHub: React.FC = () => {
    const { setActiveTab, settings } = useFinance();

    const features = [
        {
            id: 'commitments',
            name: 'Managed Ledger',
            description: 'Fiscal Safety Protocols & Commitments',
            icon: <ShieldAlert size={28} />,
            color: 'blue',
            tab: 'commitments',
            gradient: 'from-blue-600/20 to-indigo-600/10'
        },
        {
            id: 'categories',
            name: 'Taxonomy',
            description: 'Category Node Logic & Classification',
            icon: <Grid size={28} />,
            color: 'purple',
            tab: 'categories',
            gradient: 'from-purple-600/20 to-blue-600/10'
        },
        {
            id: 'plans',
            name: 'Financial Plans',
            description: 'Intent-Based Spending Engine',
            icon: <Target size={28} />,
            color: 'emerald',
            tab: 'plans',
            gradient: 'from-emerald-600/20 to-teal-600/10'
        },
        {
            id: 'settings',
            name: 'Preferences',
            description: 'Core Configuration & Authority',
            icon: <SettingsIcon size={28} />,
            color: 'amber',
            tab: 'settings',
            gradient: 'from-amber-600/20 to-orange-600/10'
        }
    ];

    return (
        <div className="space-y-8 pt-4 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-32">
            <div className="px-1 space-y-2">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-blue-500/10 rounded-2xl border border-blue-500/20">
                        <Command size={20} className="text-blue-400" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black tracking-tight text-[var(--text-main)] transition-colors">{settings.customAppName || 'Feature Hub'}</h1>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] transition-colors">Unified System Command</p>
                    </div>
                </div>
            </div>

            {/* Primary Feature Grid */}
            <div className="grid grid-cols-1 gap-4">
                {features.map((f) => (
                    <GlassCard
                        key={f.id}
                        onClick={() => setActiveTab(f.tab)}
                        className="group relative overflow-hidden p-6 border-[var(--border-glass)] hover:border-blue-500/30 transition-all active:scale-[0.98] cursor-pointer"
                    >
                        {/* Background Decorative Mesh */}
                        <div className={`absolute top-0 right-0 w-32 h-32 bg-${f.color}-500/5 blur-[40px] rounded-full -translate-y-1/2 translate-x-1/2 group-hover:bg-${f.color}-500/10 transition-all`} />

                        <div className="flex items-center gap-6 relative z-10">
                            <div className={`w-16 h-16 rounded-[24px] bg-gradient-to-br ${f.gradient} border border-${f.color}-500/20 flex items-center justify-center text-${f.color}-400 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500 shadow-xl`}>
                                {f.icon}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <h3 className="font-black text-lg text-[var(--text-main)] tracking-tight transition-colors">{f.name}</h3>
                                    <div className="bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20">
                                        <Zap size={8} className="text-blue-500" />
                                    </div>
                                </div>
                                <p className="text-xs text-[var(--text-muted)] font-medium transition-colors">{f.description}</p>
                            </div>
                            <div className="w-10 h-10 rounded-xl bg-[var(--surface-deep)] flex items-center justify-center text-[var(--text-muted)] group-hover:bg-blue-600 group-hover:text-white transition-all shadow-inner">
                                <ChevronRight size={20} />
                            </div>
                        </div>
                    </GlassCard>
                ))}
            </div>

            {/* Secondary Tools section */}
            <section className="space-y-4">
                <div className="flex items-center gap-3 px-2">
                    <Activity size={16} className="text-[var(--text-muted)]" />
                    <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] transition-colors">Core Infrastructure</h2>
                </div>

                <GlassCard className="p-5 flex items-center justify-between border-dashed border-[var(--border-glass)] bg-transparent hover:bg-blue-500/5 transition-all cursor-pointer group">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-[var(--surface-deep)] flex items-center justify-center text-[var(--text-muted)] group-hover:text-blue-400 transition-colors">
                            <Sparkles size={20} />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-[var(--text-main)] transition-colors">Intelligence Status</p>
                            <p className="text-[10px] text-[var(--text-muted)] font-medium uppercase tracking-tight transition-colors">Gemini Node: Online</p>
                        </div>
                    </div>
                    <div className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                        <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest">Active</span>
                    </div>
                </GlassCard>

                <GlassCard
                    onClick={() => setActiveTab('dashboard')} // Diagnostics are in dashboard for now
                    className="p-5 flex items-center justify-between border-dashed border-[var(--border-glass)] bg-transparent hover:bg-blue-500/5 transition-all cursor-pointer group"
                >
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-[var(--surface-deep)] flex items-center justify-center text-[var(--text-muted)] group-hover:text-amber-400 transition-colors">
                            <Activity size={20} />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-[var(--text-main)] transition-colors">Terminal Diagnostics</p>
                            <p className="text-[10px] text-[var(--text-muted)] font-medium uppercase tracking-tight transition-colors">Review DB & Sync Matrix</p>
                        </div>
                    </div>
                    <ChevronRight size={18} className="text-[var(--text-dim)]" />
                </GlassCard>
            </section>

            {/* Version Info */}
            <div className="text-center pt-8 opacity-20 group">
                <div className="flex items-center justify-center gap-2 mb-2">
                    <Layout size={12} className="text-[var(--text-muted)]" />
                    <span className="text-[8px] font-black uppercase tracking-[0.4em] text-[var(--text-muted)] transition-colors font-mono">FinOS Enterprise Edition</span>
                </div>
                <p className="text-[8px] font-bold text-[var(--text-muted)] font-mono">BUILD-2026-BETA-03 // QUANTUM_SYNC_ENABLED</p>
            </div>
        </div>
    );
};

export default AppHub;
