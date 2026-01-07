
import React from 'react';
import { useFinance } from '../store/FinanceContext';
import { GlassCard } from './ui/GlassCard';
import { ShieldCheck, Activity, TrendingUp, Zap, Info } from 'lucide-react';

const HealthScoreCard: React.FC = () => {
    const { healthScore } = useFinance();
    const { score, liquidity, stability, burnControl, commitmentCoverage } = healthScore;

    const getScoreColor = (val: number) => {
        if (val < 40) return 'text-rose-500';
        if (val < 70) return 'text-amber-500';
        return 'text-emerald-500';
    };

    const getScoreBg = (val: number) => {
        if (val < 40) return 'bg-rose-500/10 border-rose-500/20';
        if (val < 70) return 'bg-amber-500/10 border-amber-500/20';
        return 'bg-emerald-500/10 border-emerald-500/20';
    };

    return (
        <GlassCard className="relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-[50px] rounded-full -translate-y-1/2 translate-x-1/2" />

            <div className="flex justify-between items-start mb-6">
                <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] mb-1 transition-colors">Stability Index</p>
                    <h2 className="text-xl font-black tracking-tighter text-[var(--text-main)] transition-colors">Financial Health</h2>
                </div>
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${getScoreBg(score)} transition-all duration-700`}>
                    <ShieldCheck className={getScoreColor(score)} size={24} />
                </div>
            </div>

            <div className="flex items-end gap-4 mb-8">
                <span className={`text-6xl font-black tracking-tighter transition-all duration-1000 ${getScoreColor(score)}`}>
                    {score}
                </span>
                <div className="pb-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Points</p>
                    <p className="text-xs font-bold text-[var(--text-dim)]">Optimal Alpha</p>
                </div>
            </div>

            {/* Metric Bars */}
            <div className="space-y-4">
                <MetricBar label="Liquidity" value={liquidity} icon={<Zap size={12} />} color="bg-blue-500" />
                <MetricBar label="Stability" value={stability} icon={<Activity size={12} />} color="bg-purple-500" />
                <MetricBar label="Burn Control" value={burnControl} icon={<TrendingUp size={12} />} color="bg-emerald-500" />
                <MetricBar label="Liability Coverage" value={commitmentCoverage} icon={<ShieldCheck size={12} />} color="bg-amber-500" />
            </div>

            <div className="mt-6 pt-6 border-t border-[var(--border-glass)] flex items-center gap-2 text-[var(--text-muted)] transition-colors">
                <Info size={14} />
                <p className="text-[9px] font-bold uppercase tracking-wider transition-colors">Metrics recalculated in real-time based on ledger activity</p>
            </div>
        </GlassCard>
    );
};

const MetricBar: React.FC<{ label: string, value: number, icon: React.ReactNode, color: string }> = ({ label, value, icon, color }) => (
    <div className="space-y-1.5">
        <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] px-1 transition-colors">
            <div className="flex items-center gap-2">
                {icon}
                <span>{label}</span>
            </div>
            <span>{Math.round(value)}%</span>
        </div>
        <div className="h-1.5 w-full bg-[var(--surface-deep)] rounded-full overflow-hidden border border-[var(--border-glass)] transition-colors">
            <div
                className={`h-full ${color} transition-all duration-1000 ease-out`}
                style={{ width: `${value}%` }}
            />
        </div>
    </div>
);

export default HealthScoreCard;
