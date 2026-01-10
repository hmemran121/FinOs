import React, { useState, useEffect } from 'react';
import { useFinance } from '../store/FinanceContext';
import { GlassCard } from './ui/GlassCard';
import { ICON_MAP } from '../constants';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { getFinancialInsights, FinancialInsight } from '../services/gemini';
import { ArrowUpRight, ArrowDownLeft, BrainCircuit, TrendingDown, RefreshCcw, ShieldCheck, Wallet, ArrowRightCircle, Grid, List, ShieldAlert, Layout, Target, ChevronRight, Zap } from 'lucide-react';
import HealthScoreCard from './HealthScoreCard';
import FinancialTimeline from './FinancialTimeline';
import SyncDiagnostics from './SyncDiagnostics';

const Dashboard: React.FC = () => {
  const { totalBalance, availableAfterCommitments, walletsWithBalances, transactions, isCloudLoading, getCurrencySymbol, settings, setActiveTab } = useFinance();
  const [insights, setInsights] = useState<FinancialInsight[]>([]);
  const [displayBalance, setDisplayBalance] = useState(0);
  const [toolViewMode, setToolViewMode] = useState<'grid' | 'list'>('grid');

  const isBN = settings.language === 'BN';
  const isCompact = settings.compactMode;

  const formatValue = (val: number, symbol?: string) => {
    if (settings.privacyMode) return '••••••';
    return (symbol || getCurrencySymbol(settings.currency)) + val.toLocaleString();
  };

  useEffect(() => {
    const duration = 1000;
    const steps = 60;
    const increment = (totalBalance - displayBalance) / steps;
    let current = displayBalance;
    const timer = setInterval(() => {
      current += increment;
      if ((increment > 0 && current >= totalBalance) || (increment < 0 && current <= totalBalance)) {
        setDisplayBalance(totalBalance);
        clearInterval(timer);
      } else {
        setDisplayBalance(Math.floor(current));
      }
    }, duration / steps);
    return () => clearInterval(timer);
  }, [totalBalance]);

  useEffect(() => {
    if (transactions.length > 0) {
      getFinancialInsights(transactions, walletsWithBalances).then(setInsights);
    }
  }, [transactions, walletsWithBalances]);

  const chartData = transactions.slice(0, 7).reverse().map((t, i) => ({
    name: i.toString(),
    amount: t.amount
  }));

  const allTimeExpenses = transactions
    .filter(t => t.type === 'EXPENSE')
    .reduce((acc, t) => acc + t.amount, 0);

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const incomeThisMonth = transactions
    .filter(t => {
      const d = new Date(t.date);
      return t.type === 'INCOME' && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    })
    .reduce((acc, t) => acc + t.amount, 0);

  const expenseThisMonth = transactions
    .filter(t => {
      const d = new Date(t.date);
      return t.type === 'EXPENSE' && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    })
    .reduce((acc, t) => acc + t.amount, 0);

  return (
    <div className={`flex flex-col ${isCompact ? 'gap-2 pt-2' : 'gap-4 pt-4'} animate-in fade-in slide-in-from-bottom-4 duration-700`}>
      {/* Total Balance & Summary Card */}
      <GlassCard
        className={`relative overflow-hidden border-[var(--accent-primary)]/30 flex flex-col justify-between ${isCompact ? 'min-h-[160px] p-4' : 'min-h-[220px] p-6'}`}
        style={{ background: `linear-gradient(135deg, ${settings.accentColor}33, ${settings.accentColor}11)` }}
      >
        <div className="absolute top-0 right-0 w-32 h-32 blur-[60px] rounded-full -translate-y-1/2 translate-x-1/2" style={{ backgroundColor: settings.accentColor + '22' }} />

        <div className="flex justify-between items-start relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: settings.accentColor }} />
              <p className="text-[var(--text-muted)] text-xs font-black uppercase tracking-widest transition-colors">
                {isBN ? 'মোট ব্যালেন্স' : 'Global Net Worth'}
              </p>
              {isCloudLoading && <RefreshCcw size={12} className="animate-spin" style={{ color: settings.accentColor }} />}
            </div>
            <h1 className={`${settings.privacyMode ? 'blur-md' : ''} text-5xl font-black tracking-tighter text-gradient py-2`}>
              {formatValue(displayBalance)}
            </h1>
            <div className="flex items-center gap-2 mt-1 px-1">
              <span className={`${settings.privacyMode ? 'blur-sm' : ''} text-[9px] font-black uppercase tracking-widest ${availableAfterCommitments > 0 ? 'text-[var(--accent-primary)]' : 'text-rose-500'}`}>
                {formatValue(availableAfterCommitments)} {isBN ? 'প্রতিশ্রুতি পরবর্তী অবশিষ্ট' : 'Available After Commitments'}
              </span>
            </div>
          </div>
          <div className="bg-[var(--surface-deep)] p-3 rounded-2xl backdrop-blur-3xl border border-[var(--border-glass)] shadow-2xl transition-all">
            <ShieldCheck style={{ color: settings.accentColor }} size={20} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 relative z-10">
          <div className="flex flex-col gap-2 bg-emerald-500/5 hover:bg-emerald-500/10 border border-emerald-500/10 p-4 rounded-[24px] group transition-all">
            <div className="flex items-center gap-2 text-emerald-400">
              <ArrowUpRight size={14} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              <span className="text-[10px] font-black uppercase tracking-widest opacity-60">{isBN ? 'আয়' : 'Revenue Flow'}</span>
            </div>
            <span className={`${settings.privacyMode ? 'blur-sm' : ''} text-lg font-black text-emerald-500`}>+{formatValue(incomeThisMonth)}</span>
          </div>

          <div className="flex flex-col gap-2 bg-rose-500/5 hover:bg-rose-500/10 border border-rose-500/10 p-4 rounded-[24px] group transition-all">
            <div className="flex items-center gap-2 text-rose-400">
              <ArrowDownLeft size={14} className="group-hover:-translate-x-0.5 group-hover:translate-y-0.5 transition-transform" />
              <span className="text-[10px] font-black uppercase tracking-widest opacity-60">{isBN ? 'ব্যয়' : 'Burn Rate'}</span>
            </div>
            <span className={`${settings.privacyMode ? 'blur-sm' : ''} text-lg font-black text-rose-500`}>-{formatValue(expenseThisMonth)}</span>
          </div>
        </div>

        <div className="mt-6 pt-5 border-t border-[var(--border-glass)] flex justify-between items-center relative z-10 transition-colors">
          <div className="flex items-center gap-2 text-[var(--text-muted)]">
            <TrendingDown size={14} />
            <span className="text-[9px] font-black uppercase tracking-widest">{isBN ? 'সর্বমোট ব্যয়' : 'Total Outflow'}</span>
          </div>
          <span className={`${settings.privacyMode ? 'blur-sm' : ''} text-xs font-black text-rose-500/80 tracking-wider`}>
            {formatValue(allTimeExpenses)}
          </span>
        </div>
      </GlassCard>

      {/* AI Insights Section */}
      <section>
        <div className="flex items-center gap-3 mb-4 px-2">
          <div className="p-2 bg-purple-500/10 rounded-xl border border-purple-500/20">
            <BrainCircuit size={18} className="text-purple-400" />
          </div>
          <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] transition-colors">Cognitive Insights</h2>
        </div>
        <div className="flex overflow-x-auto gap-4 pb-4 no-scrollbar -mx-4 px-4">
          {insights.length > 0 ? insights.map((insight, idx) => (
            <GlassCard key={idx} className="min-w-[280px] bg-gradient-to-b from-[var(--surface-glass)] to-transparent border-purple-500/10 hover:border-purple-500/30 transition-colors">
              <div className="flex flex-col gap-4">
                <p className="text-sm text-[var(--text-main)] leading-relaxed font-medium transition-colors">"{insight.insight}"</p>
                <div className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full w-fit ${insight.urgency === 'HIGH' ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20' :
                  insight.urgency === 'MEDIUM' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' :
                    'bg-blue-500/10 text-blue-500 border border-blue-500/20'
                  }`}>
                  {insight.urgency} Priority Protocol
                </div>
              </div>
            </GlassCard>
          )) : (
            <div className="w-full">
              <GlassCard className="w-full py-12 text-center border-dashed border-[var(--border-glass)] bg-transparent">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-12 h-12 bg-[var(--surface-deep)] rounded-full flex items-center justify-center animate-pulse border border-[var(--border-glass)]">
                    <BrainCircuit size={24} className="text-[var(--text-muted)]" />
                  </div>
                  <p className="text-xs text-[var(--text-muted)] font-bold uppercase tracking-widest transition-colors">Awaiting Transactional Input...</p>
                </div>
              </GlassCard>
            </div>
          )}
        </div>
      </section>

      {/* Quick Actions / System Tools */}
      <section>
        <div className="flex justify-between items-center mb-4 px-2">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-xl border border-blue-500/20">
              <Zap size={18} className="text-blue-400" />
            </div>
            <h1 className="text-2xl font-black text-[var(--text-main)] italic tracking-tight transition-colors">
              {settings.customAppName || 'FinOS Dashboard'}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveTab('hub')}
              className="flex items-center gap-1.5 px-3 py-1 bg-blue-500/10 hover:bg-blue-500/20 rounded-full border border-blue-500/20 transition-all group"
            >
              <span className="text-[9px] font-black uppercase tracking-widest text-blue-400">See All</span>
              <ChevronRight size={12} className="text-blue-400 group-hover:translate-x-0.5 transition-transform" />
            </button>
            <div className="flex bg-[var(--surface-deep)] p-1 rounded-xl border border-[var(--border-glass)] transition-colors">
              <button
                onClick={() => setToolViewMode('grid')}
                className={`p-1.5 rounded-lg transition-all ${toolViewMode === 'grid' ? 'bg-blue-600 text-white shadow-lg' : 'text-[var(--text-muted)] hover:text-blue-400'}`}
              >
                <Grid size={14} />
              </button>
              <button
                onClick={() => setToolViewMode('list')}
                className={`p-1.5 rounded-lg transition-all ${toolViewMode === 'list' ? 'bg-blue-600 text-white shadow-lg' : 'text-[var(--text-muted)] hover:text-blue-400'}`}
              >
                <List size={14} />
              </button>
            </div>
          </div>
        </div>

        <div className={toolViewMode === 'grid' ? "grid grid-cols-2 gap-2.5" : "flex flex-col gap-1.5"}>
          {/* Ledger Tool */}
          <GlassCard
            onClick={() => setActiveTab('commitments')}
            className={`cursor-pointer group hover:border-blue-500/30 transition-all active:scale-[0.98] ${toolViewMode === 'grid' ? 'p-4 flex flex-col items-center text-center gap-3' : 'p-3 flex items-center justify-between'}`}
          >
            <div className={`flex items-center gap-4 ${toolViewMode === 'grid' ? 'flex-col' : ''}`}>
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600/20 to-purple-600/10 border border-blue-500/20 flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform">
                <ShieldAlert size={24} />
              </div>
              <div className={toolViewMode === 'grid' ? '' : 'text-left'}>
                <h3 className="font-bold text-sm text-[var(--text-main)] transition-colors">Managed Ledger</h3>
                <p className="text-[10px] text-[var(--text-muted)] font-medium uppercase tracking-wider transition-colors">Fiscal Safety Protocols</p>
              </div>
            </div>
            {toolViewMode === 'list' && <ArrowRightCircle size={18} className="text-[var(--text-dim)] group-hover:text-blue-500 transition-colors" />}
          </GlassCard>

          {/* Taxonomy Tool */}
          <GlassCard
            onClick={() => setActiveTab('categories')}
            className={`cursor-pointer group hover:border-purple-500/30 transition-all active:scale-[0.98] ${toolViewMode === 'grid' ? 'p-4 flex flex-col items-center text-center gap-3' : 'p-3 flex items-center justify-between'}`}
          >
            <div className={`flex items-center gap-4 ${toolViewMode === 'grid' ? 'flex-col' : ''}`}>
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-600/20 to-blue-600/10 border border-purple-500/20 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform">
                <Grid size={24} />
              </div>
              <div className={toolViewMode === 'grid' ? '' : 'text-left'}>
                <h3 className="font-bold text-sm text-[var(--text-main)] transition-colors">System Taxonomy</h3>
                <p className="text-[10px] text-[var(--text-muted)] font-medium uppercase tracking-wider transition-colors">Category Node Logic</p>
              </div>
            </div>
            {toolViewMode === 'list' && <ArrowRightCircle size={18} className="text-[var(--text-dim)] group-hover:text-purple-500 transition-colors" />}
          </GlassCard>

          {/* Strategic Planning Tool */}
          <GlassCard
            onClick={() => setActiveTab('plans')}
            className={`cursor-pointer group hover:border-emerald-500/30 transition-all active:scale-[0.98] ${toolViewMode === 'grid' ? 'p-4 flex flex-col items-center text-center gap-3' : 'p-3 flex items-center justify-between'}`}
          >
            <div className={`flex items-center gap-4 ${toolViewMode === 'grid' ? 'flex-col' : ''}`}>
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-600/20 to-teal-600/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                <Target size={24} />
              </div>
              <div className={toolViewMode === 'grid' ? '' : 'text-left'}>
                <h3 className="font-bold text-sm text-[var(--text-main)] transition-colors">Strategic Planning</h3>
                <p className="text-[10px] text-[var(--text-muted)] font-medium uppercase tracking-wider transition-colors">Intent-Based Spending Engine</p>
              </div>
            </div>
            {toolViewMode === 'list' && <ArrowRightCircle size={18} className="text-[var(--text-dim)] group-hover:text-emerald-500 transition-colors" />}
          </GlassCard>
        </div>
      </section >

      {/* Financial Health Intelligence */}
      {settings.showHealthScore && <HealthScoreCard />}

      {/* Liquidity Projection Hub */}
      < FinancialTimeline />

      {/* Quick Trend Chart */}
      < section >
        <div className="flex items-center gap-3 mb-4 px-2">
          <div className="p-2 bg-blue-500/10 rounded-xl border border-blue-500/20">
            <TrendingDown size={18} className="text-blue-400" />
          </div>
          <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] transition-colors">Liquidity Trajectory</h2>
        </div>
        <GlassCard className="h-56 p-6 border-[var(--border-glass)] bg-[var(--surface-glass)]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorAmt" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="name" hide />
              <YAxis hide domain={['auto', 'auto']} />
              <Tooltip
                contentStyle={{ backgroundColor: 'var(--surface-overlay)', border: '1px solid var(--border-glass)', borderRadius: '16px', fontSize: '12px', fontWeight: 'bold', color: 'var(--text-main)' }}
                itemStyle={{ color: '#3B82F6' }}
              />
              <Area type="monotone" dataKey="amount" stroke="#3B82F6" fillOpacity={1} fill="url(#colorAmt)" strokeWidth={4} />
            </AreaChart>
          </ResponsiveContainer>
        </GlassCard>
      </section >

      {/* Real-time Sync Trace (Debug Mode) */}
      < SyncDiagnostics />

      {/* Wallets Overview */}
      < section className="mb-24" >
        <div className="flex justify-between items-center mb-3 px-1">
          <h2 className="text-sm font-bold uppercase tracking-widest text-[var(--text-muted)] transition-colors">My Wallets</h2>
          <button className="text-blue-500 text-xs font-bold">See All</button>
        </div>
        <div className="flex flex-col gap-1.5">
          {walletsWithBalances.map(w => (
            <GlassCard key={w.id} className="flex justify-between items-center py-3 border-l-4 border-l-[var(--card-border)] bg-[var(--surface-deep)] group" style={{ borderLeftColor: w.color }}>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-[var(--bg-color)] text-[var(--text-muted)] border border-[var(--border-glass)]">
                  {ICON_MAP[w.icon] || ICON_MAP.Wallet}
                </div>
                <div>
                  <p className="font-bold text-sm text-[var(--text-main)] transition-colors">{w.name}</p>
                  <p className="text-xs text-[var(--text-muted)] capitalize transition-colors">{w.channels.length} {isBN ? 'চ্যানেল' : 'Channels'}</p>
                </div>
              </div>
              <div className="text-right">
                <p className={`${settings.privacyMode ? 'blur-sm' : ''} font-bold text-sm text-[var(--text-main)] transition-colors`}>
                  {formatValue(w.currentBalance, getCurrencySymbol(w.currency))}
                </p>
                <p className="text-[10px] text-[var(--text-muted)] transition-colors">{w.currency}</p>
              </div>
            </GlassCard>
          ))}
        </div>
      </section >
    </div >
  );
};

export default Dashboard;
