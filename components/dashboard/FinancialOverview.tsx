import React, { useEffect, useState } from 'react';
import { useFinance } from '../../store/FinanceContext';
import { ArrowUpRight, ArrowDownLeft, Wallet, TrendingUp, Activity, Sparkles, Eye, EyeOff, Zap } from 'lucide-react';

const FinancialOverview: React.FC = () => {
    const { totalBalance, transactions, settings, getCurrencySymbol } = useFinance();
    const isBN = settings.language === 'BN';

    // State
    const [displayBalance, setDisplayBalance] = useState(0);
    const [isPrivacyMode, setPrivacyMode] = useState(false);

    // Filter Logic
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

    // Helper for aggregation
    const getMonthTotal = (type: 'INCOME' | 'EXPENSE', month: number, year: number) => {
        return transactions
            .filter(t => t.type === type && new Date(t.date).getMonth() === month && new Date(t.date).getFullYear() === year)
            .reduce((acc, t) => acc + t.amount, 0);
    };

    const monthlyIncome = getMonthTotal('INCOME', currentMonth, currentYear);
    const monthlyExpense = getMonthTotal('EXPENSE', currentMonth, currentYear);
    const lastMonthIncome = getMonthTotal('INCOME', lastMonth, lastMonthYear);
    const lastMonthExpense = getMonthTotal('EXPENSE', lastMonth, lastMonthYear);

    // Trend Calculations
    const calculateTrend = (current: number, previous: number) => {
        if (previous === 0) return current > 0 ? 100 : 0;
        return Math.round(((current - previous) / previous) * 100);
    };

    const incomeTrend = calculateTrend(monthlyIncome, lastMonthIncome);
    const expenseTrend = calculateTrend(monthlyExpense, lastMonthExpense);
    const netFlow = monthlyIncome - monthlyExpense;
    const savingsRate = monthlyIncome > 0 ? Math.round((netFlow / monthlyIncome) * 100) : 0;

    // Number Counting Animation
    useEffect(() => {
        const duration = 1500;
        const steps = 60;
        const increment = totalBalance / steps;
        let current = 0;
        const timer = setInterval(() => {
            current += increment;
            if (current >= totalBalance) {
                setDisplayBalance(totalBalance);
                clearInterval(timer);
            } else {
                setDisplayBalance(current);
            }
        }, duration / steps);
        return () => clearInterval(timer);
    }, [totalBalance]);

    const currency = getCurrencySymbol(settings.currency);

    return (
        <div className="relative overflow-hidden rounded-[32px] p-6 bg-gradient-to-br from-[var(--surface-deep)]/80 via-[var(--surface-deep)]/40 to-[var(--surface-glass)]/10 backdrop-blur-2xl border border-white/5 shadow-2xl group transition-all duration-500 hover:shadow-[0_20px_50px_-12px_rgba(0,0,0,0.5)]">

            {/* Glossy Overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000 pointer-events-none" />

            {/* Background Decor */}
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-[var(--accent-primary)]/20 rounded-full blur-[80px]" />
            <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-purple-500/20 rounded-full blur-[60px]" />

            <div className="relative z-10 flex flex-col gap-6">

                {/* Header Row */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        {/* Live Indicator */}
                        <div className="relative flex items-center justify-center w-4 h-4 mr-1">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </div>

                        <div className="p-1.5 bg-white/5 rounded-full backdrop-blur-md border border-white/5">
                            <Wallet size={14} className="text-[var(--accent-primary)]" />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)]">
                            {isBN ? 'মোট ব্যালেন্স' : 'Total Balance'}
                        </span>
                    </div>

                    {/* Controls: Net Flow + Privacy Toggle */}
                    <div className="flex items-center gap-2">
                        {monthlyIncome > 0 && (
                            <div className={`hidden sm:flex px-3 py-1 rounded-full border backdrop-blur-md items-center gap-1.5 ${netFlow >= 0 ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'}`}>
                                <Activity size={10} strokeWidth={3} />
                                <span className="text-[9px] font-black uppercase tracking-wider">
                                    {netFlow >= 0 ? `+${savingsRate}% Saved` : 'Burn Alert'}
                                </span>
                            </div>
                        )}
                        <button
                            onClick={() => setPrivacyMode(!isPrivacyMode)}
                            className="p-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 text-[var(--text-muted)] transition-colors active:scale-95"
                        >
                            {isPrivacyMode ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                    </div>
                </div>

                {/* Main Balance */}
                <div className="flex items-baseline gap-1 mt-[-8px]">
                    <span className="text-3xl font-bold text-[var(--text-muted)] opacity-50 relative -top-4">{currency}</span>
                    <h1 className={`text-6xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-[var(--text-main)] to-[var(--text-dim)] drop-shadow-sm transition-all duration-300 ${isPrivacyMode ? 'blur-md select-none' : 'blur-0'}`}>
                        {Math.floor(displayBalance).toLocaleString()}
                    </h1>
                </div>

                {/* Income & Expense Modern Cards */}
                <div className="grid grid-cols-2 gap-3 mt-2">
                    {/* Income */}
                    <div className="relative overflow-hidden p-4 rounded-[24px] bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/10 hover:border-emerald-500/20 transition-all duration-300 group/income">
                        <div className="absolute right-0 top-0 w-20 h-20 bg-emerald-500/20 blur-[40px] -translate-y-1/2 translate-x-1/2 group-hover/income:opacity-100 transition-opacity" />

                        <div className="relative z-10 flex flex-col h-full justify-between gap-1">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="p-1.5 rounded-full bg-emerald-500/20 text-emerald-400 rotate-45 group-hover/income:rotate-90 transition-transform duration-500 shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                                        <ArrowUpRight size={14} strokeWidth={3} />
                                    </div>
                                    <span className="text-[9px] font-black uppercase tracking-wider text-emerald-100/60">{isBN ? 'আয়' : 'Income'}</span>
                                </div>
                                {!isPrivacyMode && (
                                    <span className={`text-[9px] font-bold ${incomeTrend >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                        {incomeTrend > 0 ? '+' : ''}{incomeTrend}%
                                    </span>
                                )}
                            </div>
                            <span className={`text-xl font-black text-emerald-400 tracking-tight transition-all duration-300 ${isPrivacyMode ? 'blur-sm select-none' : 'blur-0'}`}>
                                +{monthlyIncome.toLocaleString()}
                            </span>
                        </div>
                    </div>

                    {/* Expense */}
                    <div className="relative overflow-hidden p-4 rounded-[24px] bg-gradient-to-br from-rose-500/10 to-rose-500/5 border border-rose-500/10 hover:border-rose-500/20 transition-all duration-300 group/expense">
                        <div className="absolute right-0 top-0 w-20 h-20 bg-rose-500/20 blur-[40px] -translate-y-1/2 translate-x-1/2 group-hover/expense:opacity-100 transition-opacity" />

                        <div className="relative z-10 flex flex-col h-full justify-between gap-1">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="p-1.5 rounded-full bg-rose-500/20 text-rose-400 rotate-45 group-hover/expense:rotate-0 transition-transform duration-500 shadow-[0_0_10px_rgba(244,63,94,0.2)]">
                                        <ArrowDownLeft size={14} strokeWidth={3} />
                                    </div>
                                    <span className="text-[9px] font-black uppercase tracking-wider text-rose-100/60">{isBN ? 'ব্যয়' : 'Expense'}</span>
                                </div>
                                {!isPrivacyMode && (
                                    <span className={`text-[9px] font-bold ${expenseTrend <= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                        {expenseTrend > 0 ? '+' : ''}{expenseTrend}%
                                    </span>
                                )}
                            </div>
                            <span className={`text-xl font-black text-rose-400 tracking-tight transition-all duration-300 ${isPrivacyMode ? 'blur-sm select-none' : 'blur-0'}`}>
                                -{monthlyExpense.toLocaleString()}
                            </span>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default FinancialOverview;
