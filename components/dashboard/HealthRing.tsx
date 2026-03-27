import React, { useEffect, useState } from 'react';
import { useFinance } from '../../store/FinanceContext';
import { ShieldCheck, Target, TrendingUp, AlertTriangle } from 'lucide-react';

const HealthRing: React.FC = () => {
    const { healthScore, settings } = useFinance();
    const isBN = settings.language === 'BN';

    // Animate rings on mount
    const [progress, setProgress] = useState({ outer: 0, middle: 0, inner: 0 });

    useEffect(() => {
        // Delay for dramatic effect
        const timer = setTimeout(() => {
            setProgress({
                outer: healthScore.burnControl || 0,     // Budget Adherence
                middle: healthScore.stability || 0,      // Savings/Stability
                inner: healthScore.commitmentCoverage || 0 // Bill Payments
            });
        }, 500);
        return () => clearTimeout(timer);
    }, [healthScore]);

    // Ring Configuration
    const center = 60;
    const strokeWidth = 8;

    const rings = [
        { radius: 50, color: 'text-emerald-500', value: progress.outer, label: isBN ? 'বাজেট' : 'Budget' },
        { radius: 38, color: 'text-blue-500', value: progress.middle, label: isBN ? 'সঞ্চয়' : 'Savings' },
        { radius: 26, color: 'text-violet-500', value: progress.inner, label: isBN ? 'বিল' : 'Bills' }
    ];

    const getCircumference = (r: number) => 2 * Math.PI * r;

    return (
        <div className="bg-[var(--surface-deep)]/50 backdrop-blur-xl border border-[var(--border-glass)] rounded-[32px] p-6 relative overflow-hidden group">
            <div className="flex items-center justify-between">

                {/* Text Content */}
                <div className="space-y-2 z-10">
                    <div>
                        <h3 className="text-sm font-black text-[var(--text-muted)] uppercase tracking-widest">{isBN ? 'ফিন্যান্সিয়াল স্কোর' : 'Health Score'}</h3>
                        <div className="flex items-baseline gap-1">
                            <span className="text-4xl font-black text-[var(--text-main)] tracking-tighter">
                                {healthScore.score}<span className="text-lg opacity-50">/100</span>
                            </span>
                        </div>
                    </div>

                    <div className="flex flex-col gap-2 pt-2">
                        {rings.map((ring, i) => (
                            <div key={i} className="flex items-center gap-2 text-xs font-bold text-[var(--text-muted)]">
                                <div className={`w-2 h-2 rounded-full ${ring.color.replace('text-', 'bg-')}`} />
                                <span className="uppercase tracking-wider text-[9px] w-12">{ring.label}</span>
                                <span className="font-black text-[var(--text-main)]">{Math.round(ring.value)}%</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* SVG Rings */}
                <div className="relative w-32 h-32 flex items-center justify-center">
                    {/* Glowing Center Icon */}
                    <div className="absolute inset-0 flex items-center justify-center z-20">
                        {healthScore.score > 80 ? (
                            <ShieldCheck size={24} className="text-emerald-500 drop-shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                        ) : healthScore.score > 50 ? (
                            <TrendingUp size={24} className="text-blue-500" />
                        ) : (
                            <AlertTriangle size={24} className="text-amber-500" />
                        )}
                    </div>

                    <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 120 120">
                        {rings.map((ring, i) => {
                            const c = getCircumference(ring.radius);
                            const offset = c - (ring.value / 100) * c;

                            return (
                                <React.Fragment key={i}>
                                    {/* Track */}
                                    <circle
                                        cx={center}
                                        cy={center}
                                        r={ring.radius}
                                        fill="transparent"
                                        stroke="currentColor"
                                        strokeWidth={strokeWidth}
                                        className="text-[var(--surface-overlay)] opacity-30"
                                    />
                                    {/* Progress */}
                                    <circle
                                        cx={center}
                                        cy={center}
                                        r={ring.radius}
                                        fill="transparent"
                                        stroke="currentColor"
                                        strokeWidth={strokeWidth}
                                        strokeDasharray={c}
                                        strokeDashoffset={offset}
                                        strokeLinecap="round"
                                        className={`${ring.color} transition-all duration-[1500ms] ease-out drop-shadow-lg`}
                                        style={{ transitionDelay: `${i * 200}ms` }}
                                    />
                                </React.Fragment>
                            );
                        })}
                    </svg>
                </div>
            </div>

            {/* Ambient Glow */}
            <div className={`absolute -right-10 -bottom-10 w-40 h-40 rounded-full blur-[80px] opacity-20 z-0 ${healthScore.score > 70 ? 'bg-emerald-500' : 'bg-blue-500'}`} />
        </div>
    );
};

export default HealthRing;
