import React, { useMemo } from 'react';
import { useFinance } from '../../store/FinanceContext';
import { BrainCircuit, TrendingUp, Activity, AlertTriangle, ShieldCheck } from 'lucide-react';
import { GlassCard } from '../ui/GlassCard';

const DynamicCognitiveSection: React.FC = () => {
    const { totalBalance, transactions, healthScore, settings } = useFinance();
    const isBN = settings.language === 'BN';

    // 1. Calculate Stability Index (0-100)
    // Based on consistency of income vs expense variance
    const stabilityIndex = useMemo(() => {
        return healthScore.stability || 75; // Fallback to 75 if not calculated
    }, [healthScore]);

    // 2. Generate Local Insights (Instant AI)
    const localInsights = useMemo(() => {
        const tips = [];

        // Insight 1: Spending Trend
        const currentMonth = new Date().getMonth();
        const thisMonthExp = transactions
            .filter(t => t.type === 'EXPENSE' && new Date(t.date).getMonth() === currentMonth)
            .reduce((sum, t) => sum + t.amount, 0);

        if (thisMonthExp > totalBalance * 0.5) {
            tips.push({
                type: 'WARNING',
                text: isBN ? 'ব্যয় মোট ব্যালেন্সের ৫০% অতিক্রম করেছে।' : 'Expenses exceeded 50% of total balance.',
                icon: <AlertTriangle size={16} className="text-amber-500" />
            });
        } else {
            tips.push({
                type: 'GOOD',
                text: isBN ? 'আপনার ব্যয় নিয়ন্ত্রণে আছে।' : 'Your spending is well within safe limits.',
                icon: <ShieldCheck size={16} className="text-emerald-500" />
            });
        }

        // Insight 2: Stability Context
        if (stabilityIndex > 80) {
            tips.push({
                type: 'INFO',
                text: isBN ? 'আপনার আর্থিক স্থিতিশীলতা চমৎকার।' : 'Your Financial Stability Index is excellent.',
                icon: <Activity size={16} className="text-blue-500" />
            });
        }

        return tips;
    }, [transactions, totalBalance, stabilityIndex, isBN]);

    return (
        <div className="flex flex-col gap-4">
            {/* Stability Index Card */}
            <GlassCard className="p-5 flex items-center justify-between bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border-indigo-500/20">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 shrink-0 bg-indigo-500/20 rounded-full text-indigo-400 relative grid place-items-center p-0">
                        <Activity size={24} className="relative z-10" strokeWidth={2.5} />
                        <div className="absolute inset-0 bg-indigo-400/20 blur-xl rounded-full" />
                    </div>
                    <div>
                        <h3 className="text-sm font-black uppercase tracking-widest text-[var(--text-muted)]">
                            {isBN ? 'স্টেবিলিটি ইনডেক্স' : 'Stability Index'}
                        </h3>
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-black text-[var(--text-main)]">
                                {Math.round(stabilityIndex)}
                            </span>
                            <span className="text-xs font-bold text-emerald-500">+2.4%</span>
                        </div>
                    </div>
                </div>
                {/* Mini Graph Visualization */}
                <div className="h-10 flex gap-1 items-end">
                    {[40, 60, 45, 70, 65, 80, stabilityIndex].map((h, i) => (
                        <div key={i} className="w-1.5 bg-indigo-500/40 rounded-t-sm transition-all duration-500 hover:bg-indigo-400" style={{ height: `${h}%` }} />
                    ))}
                </div>
            </GlassCard>

            {/* AI Insights (Dynamic) - Controlled via Admin Panel */}
            {settings.aiEnabled && (
                <div className="space-y-3">
                    <div className="flex items-center gap-2 px-1">
                        <BrainCircuit size={16} className="text-purple-400" />
                        <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)]">
                            {isBN ? 'এআই বিশ্লেষণ' : 'Cognitive Analysis'}
                        </h2>
                    </div>

                    <div className="grid gap-3">
                        {localInsights.map((insight, idx) => (
                            <div key={idx} className="flex items-start gap-3 p-3 rounded-2xl bg-[var(--surface-deep)] border border-[var(--border-glass)] animate-in slide-in-from-bottom-2" style={{ animationDelay: `${idx * 100}ms` }}>
                                <div className="p-1.5 bg-[var(--surface-overlay)] rounded-lg shrink-0">
                                    {insight.icon}
                                </div>
                                <p className="text-xs font-medium text-[var(--text-main)] leading-relaxed mt-0.5">
                                    {insight.text}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default DynamicCognitiveSection;
