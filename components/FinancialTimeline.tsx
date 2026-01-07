
import React, { useState, useMemo } from 'react';
import { useFinance } from '../store/FinanceContext';
import { GlassCard } from './ui/GlassCard';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Calendar, ChevronRight, AlertTriangle } from 'lucide-react';
import { format, parseISO } from 'date-fns';

const FinancialTimeline: React.FC = () => {
    const { projectedBalances, getCurrencySymbol, settings, totalMonthlyCommitments } = useFinance();
    const [window, setWindow] = useState<7 | 30 | 90>(30);

    const displayedProjections = useMemo(() => {
        return projectedBalances.slice(0, window);
    }, [projectedBalances, window]);

    const recentStress = useMemo(() => {
        return displayedProjections.find(p => p.stress !== 'NONE');
    }, [displayedProjections]);

    return (
        <section className="space-y-4">
            <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/10 rounded-xl border border-blue-500/20">
                        <Calendar size={18} className="text-blue-400" />
                    </div>
                    <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] transition-colors">Liquidity Horizon</h2>
                </div>
                <div className="flex bg-[var(--input-bg)] p-1 rounded-xl border border-[var(--border-glass)] transition-colors">
                    {[7, 30, 90].map((d) => (
                        <button
                            key={d}
                            onClick={() => setWindow(d as any)}
                            className={`px-3 py-1.5 text-[9px] font-black rounded-lg transition-all ${window === d ? 'bg-blue-600 text-white' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'}`}
                        >
                            {d}D
                        </button>
                    ))}
                </div>
            </div>

            <GlassCard className="h-64 p-6 border-[var(--border-glass)] bg-[var(--surface-glass)] relative overflow-hidden transition-colors">
                <div className="absolute top-4 right-6 flex flex-col items-end gap-1 z-10">
                    <p className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest transition-colors">Ending Balance</p>
                    <p className="text-lg font-black text-[var(--text-main)] tracking-tighter transition-colors">
                        {getCurrencySymbol(settings.currency)}{displayedProjections[displayedProjections.length - 1]?.balance.toLocaleString()}
                    </p>
                </div>

                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={displayedProjections}>
                        <defs>
                            <linearGradient id="colorProjection" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <XAxis dataKey="date" hide />
                        <YAxis hide domain={['auto', 'auto']} />
                        <Tooltip
                            content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                    const data = payload[0].payload;
                                    return (
                                        <div className="bg-[var(--surface-overlay)] border border-[var(--border-glass)] p-3 rounded-2xl shadow-2xl backdrop-blur-xl transition-colors">
                                            <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1 transition-colors">
                                                {format(parseISO(data.date), 'MMM dd, yyyy')}
                                            </p>
                                            <p className="text-sm font-black text-[var(--text-main)] transition-colors">
                                                {getCurrencySymbol(settings.currency)}{data.balance.toLocaleString()}
                                            </p>
                                            {data.stress !== 'NONE' && (
                                                <div className={`mt-2 flex items-center gap-1.5 text-[8px] font-black uppercase tracking-widest ${data.stress === 'HIGH' ? 'text-rose-500' : 'text-amber-500'}`}>
                                                    <AlertTriangle size={10} />
                                                    {data.stress} Stress Zone
                                                </div>
                                            )}
                                        </div>
                                    );
                                }
                                return null;
                            }}
                        />
                        <Area
                            type="monotone"
                            dataKey="balance"
                            stroke="#3B82F6"
                            strokeWidth={3}
                            fillOpacity={1}
                            fill="url(#colorProjection)"
                            animationDuration={1500}
                        />
                    </AreaChart>
                </ResponsiveContainer>

                {/* Timeline Horizontal Indicator */}
                <div className="absolute bottom-6 left-6 right-6 flex justify-between items-center bg-[var(--nav-bg)] backdrop-blur-sm border border-[var(--border-glass)] p-3 rounded-2xl transition-colors">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                        <span className="text-[9px] font-black text-[var(--text-main)] uppercase tracking-widest transition-colors">Today</span>
                    </div>
                    <div className="flex-1 mx-4 h-[1px] bg-gradient-to-r from-blue-500/50 to-transparent" />
                    <div className="flex items-center gap-2">
                        <span className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest transition-colors">{window} Days Projection</span>
                        <ChevronRight size={12} className="text-[var(--text-muted)]" />
                    </div>
                </div>
            </GlassCard>

            {recentStress && (
                <div className={`mx-2 p-4 rounded-2xl border flex items-center gap-4 animate-in slide-in-from-top-2 duration-500 ${recentStress.stress === 'HIGH' ? 'bg-rose-500/5 border-rose-500/20' : 'bg-amber-500/5 border-amber-500/20'}`}>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${recentStress.stress === 'HIGH' ? 'bg-rose-500 text-white' : 'bg-amber-500 text-white'} shadow-lg`}>
                        <AlertTriangle size={20} />
                    </div>
                    <div>
                        <p className="text-xs font-black uppercase tracking-widest text-[var(--text-main)] transition-colors">Liquidity Alert</p>
                        <p className="text-[10px] font-bold text-[var(--text-muted)] mt-0.5 transition-colors">
                            Stress detected on {format(parseISO(recentStress.date), 'MMM dd')}. Expected balance: {getCurrencySymbol(settings.currency)}{recentStress.balance.toLocaleString()}
                        </p>
                    </div>
                </div>
            )}
        </section>
    );
};

export default FinancialTimeline;
