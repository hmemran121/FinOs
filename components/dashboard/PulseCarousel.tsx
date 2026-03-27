import React, { useState, useEffect } from 'react';
import { useFinance } from '../../store/FinanceContext';
import { TrendingUp, TrendingDown, Target, Wallet, ArrowUpRight } from 'lucide-react';

const PulseCarousel: React.FC = () => {
    const { totalBalance, transactions, financialPlans, settings, getCurrencySymbol } = useFinance();
    const isBN = settings.language === 'BN';

    const [currentIndex, setCurrentIndex] = useState(0);

    // 1. Calculate Burn Rate (Expenses / Days passed in month)
    const now = new Date();
    const dayOfMonth = now.getDate();
    const currentMonthExpenses = transactions
        .filter(t => {
            const d = new Date(t.date);
            return t.type === 'EXPENSE' && d.getMonth() === now.getMonth();
        })
        .reduce((sum, t) => sum + t.amount, 0);

    const burnRate = Math.round(currentMonthExpenses / (dayOfMonth || 1));

    // 2. Get Top Plan
    const activePlan = financialPlans.filter(p => p.status === 'DRAFT' || p.status === 'FINALIZED')[0];
    const planProgress = activePlan ? Math.round((activePlan.settlements.reduce((sum, s) => sum + s.amount, 0) / activePlan.target_amount) * 100) : 0;

    // Carousel Items
    const slides = [
        {
            label: isBN ? 'মোট সম্পদ' : 'Net Worth',
            value: `${getCurrencySymbol(settings.currency)}${totalBalance.toLocaleString()}`,
            icon: <Wallet size={16} className="text-emerald-400" />,
            sub: isBN ? 'সর্বমোট স্থিতি' : 'Total Asset Value',
            color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
        },
        {
            label: isBN ? 'দৈনিক খরচ' : 'Daily Burn',
            value: `${getCurrencySymbol(settings.currency)}${burnRate}/day`,
            icon: <TrendingDown size={16} className="text-rose-400" />,
            sub: isBN ? 'গড় ব্যয়' : 'Avg. Daily Spend',
            color: 'bg-rose-500/10 text-rose-500 border-rose-500/20'
        }
    ];

    if (activePlan) {
        slides.push({
            label: activePlan.title,
            value: `${planProgress}%`,
            icon: <Target size={16} className="text-blue-400" />,
            sub: isBN ? 'লক্ষ্য পূরণ' : 'Plan Completed',
            color: 'bg-blue-500/10 text-blue-500 border-blue-500/20'
        });
    }

    // Auto-Rotate
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % slides.length);
        }, 5000); // 5 seconds per slide
        return () => clearInterval(timer);
    }, [slides.length]);

    const currentSlide = slides[currentIndex];

    return (
        <div className="relative h-[84px] overflow-hidden rounded-2xl border border-[var(--border-glass)] bg-[var(--surface-glass)] backdrop-blur-md">
            {/* Progress Bar (Time Remaining for Slide) */}
            <div className="absolute top-0 left-0 h-0.5 bg-[var(--accent-primary)] transition-all duration-[5000ms] ease-linear w-full opacity-50"
                key={currentIndex} // Remount to restart animation
                style={{ width: '100%', animation: 'shrink 5s linear forwards' }}
            />

            <div className="flex h-full items-center justify-between px-5 animate-in fade-in slide-in-from-right-8 duration-500 key={currentIndex}">
                <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${currentSlide.color}`}>
                        {currentSlide.icon}
                    </div>
                    <div>
                        <p className="text-[10px] uppercase font-black tracking-widest text-[var(--text-muted)]">
                            {currentSlide.label}
                        </p>
                        <h2 className="text-2xl font-black text-[var(--text-main)] tracking-tight">
                            {currentSlide.value}
                        </h2>
                    </div>
                </div>

                <div className="text-right hidden sm:block">
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] opacity-60">
                        {currentSlide.sub}
                    </p>
                    <div className="flex gap-1 justify-end mt-2">
                        {slides.map((_, idx) => (
                            <div
                                key={idx}
                                className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${idx === currentIndex ? 'bg-[var(--text-main)] scale-125' : 'bg-[var(--surface-deep)]'}`}
                            />
                        ))}
                    </div>
                </div>
            </div>

            <style>
                {`
                @keyframes shrink {
                    from { width: 0%; }
                    to { width: 100%; }
                }
                `}
            </style>
        </div>
    );
};

export default PulseCarousel;
