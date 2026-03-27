import React, { useState, useEffect } from 'react';
import { useFinance } from '../store/FinanceContext';
import { GlassCard } from './ui/GlassCard';
import { ICON_MAP } from '../constants';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { getFinancialInsights, FinancialInsight } from '../services/gemini';
import { ArrowUpRight, ArrowDownLeft, BrainCircuit, TrendingDown, TrendingUp, RefreshCcw, ShieldCheck, Wallet, ArrowRightCircle, Grid, List, ShieldAlert, Layout, Target, ChevronRight, Zap } from 'lucide-react';
import HealthScoreCard from './HealthScoreCard';
import FinancialTimeline from './FinancialTimeline';
import SyncDiagnostics from './SyncDiagnostics';
import { GlobalDashboard } from './admin/GlobalDashboard';
import { supabase } from "../services/supabase";
import { X, Bell } from 'lucide-react';
import SmartHeader from './dashboard/SmartHeader';
import HealthRing from './dashboard/HealthRing';
import ActionDeck from './dashboard/ActionDeck';
import PulseCarousel from './dashboard/PulseCarousel';
import FinancialOverview from './dashboard/FinancialOverview';
import DynamicCognitiveSection from './dashboard/DynamicCognitiveSection';

const Dashboard: React.FC = () => {
  const { totalBalance, availableAfterCommitments, walletsWithBalances, transactions, isCloudLoading, getCurrencySymbol, settings, setActiveTab, isSuperAdmin } = useFinance();
  const [insights, setInsights] = useState<FinancialInsight[]>([]);
  const [displayBalance, setDisplayBalance] = useState(0);
  const [toolViewMode, setToolViewMode] = useState<'grid' | 'list'>('grid');

  // Update Signal State
  const [activeSignal, setActiveSignal] = useState<{ id: string; message: string; type: string } | null>(null);

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
    // Priority 1: Global Insights from Super Admin (via settings)
    if (settings.globalAiInsights && settings.globalAiInsights.length > 0) {
      setInsights(settings.globalAiInsights);
      return;
    }

    // Auto-generation disabled - only Super Admin can generate insights
    setInsights([]);
  }, [settings.globalAiInsights]);

  useEffect(() => {
    // Listen for manual regeneration requests from Admin Panel
    const handleManualRefresh = () => {
      console.log("⚡ [Dashboard] Manual Insight Refresh Triggered");
      getFinancialInsights(transactions, walletsWithBalances, true).then(setInsights);
    };

    window.addEventListener('FINOS_REFRESH_INSIGHTS', handleManualRefresh);
    return () => window.removeEventListener('FINOS_REFRESH_INSIGHTS', handleManualRefresh);
  }, [transactions, walletsWithBalances]);

  useEffect(() => {
    // Poll for active update signals (Lightweight: Once on mount)
    const checkSignals = async () => {
      const { data } = await supabase
        .from('system_update_signals')
        .select('id, message, update_type')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data) {
        const dismissedId = localStorage.getItem('finos_dismissed_signal');
        if (dismissedId !== data.id) {
          setActiveSignal({
            id: data.id,
            message: data.message,
            type: data.update_type
          });
        }
      }
    };
    checkSignals();
  }, []);

  const dismissSignal = () => {
    if (activeSignal) {
      localStorage.setItem('finos_dismissed_signal', activeSignal.id);
      setActiveSignal(null);
    }
  };

  const chartData = transactions
    .filter(t => t.type === 'EXPENSE')
    .slice(0, 7)
    .reverse()
    .map((t, _, arr) => {
      const d = new Date(t.date);
      // Logic: If multiple transactions on same day, show time to differentiate
      // Check count of this date in the dataset
      const sameDayCount = arr.filter(item => new Date(item.date).toDateString() === d.toDateString()).length;

      let name;
      if (sameDayCount > 1) {
        // If dense data for this day, use Time
        name = d.toLocaleTimeString(settings.language === 'BN' ? 'bn-BD' : 'en-US', { hour: 'numeric', minute: '2-digit' });
      } else {
        // Sparse data, use Date
        const isToday = d.toDateString() === new Date().toDateString();
        name = isToday
          ? 'Today'
          : d.toLocaleDateString(settings.language === 'BN' ? 'bn-BD' : 'en-US', { weekday: 'short', day: 'numeric' });
      }

      return {
        name,
        amount: t.amount,
        fullDate: d.toLocaleString()
      };
    });

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

  if (isSuperAdmin) {
    return <GlobalDashboard />;
  }

  return (
    <div className={`flex flex-col ${isCompact ? 'gap-2 pt-2' : 'gap-4 pt-4'} animate-in fade-in slide-in-from-bottom-4 duration-700`}>
      {/* Update Signal Banner */}
      {activeSignal && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 flex items-start gap-3 relative animate-in slide-in-from-top-2">
          <div className="p-2 bg-emerald-500/20 rounded-full text-emerald-500 shrink-0">
            <Bell size={16} />
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-bold text-white uppercase tracking-tight flex items-center gap-2">
              System Update Available
              <span className="text-[9px] px-2 py-0.5 bg-emerald-500 text-black rounded font-black">{activeSignal.type}</span>
            </h4>
            <p className="text-xs text-zinc-400 mt-1">{activeSignal.message}</p>
          </div>
          <button
            onClick={dismissSignal}
            className="p-1.5 hover:bg-white/10 rounded-full text-zinc-500 hover:text-white transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Smart Dynamic Header */}
      <SmartHeader />

      {/* Main Financial Overview (Balance & Expenses) */}
      <FinancialOverview />

      {/* Gamified Health & Actions */}
      <div className="grid grid-cols-1 gap-4">
        <HealthRing />
        <ActionDeck />
      </div>

      {/* Rotating Stats Ticker */}
      <PulseCarousel />

      {/* Old Chart Section - Keeping for now but modernized */}
      <div className="p-4 bg-[var(--surface-deep)] rounded-[32px] border border-[var(--border-glass)] relative overflow-hidden group">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-xl">
              <TrendingUp size={16} className="text-blue-500" />
            </div>
            <div>
              <h3 className="text-sm font-black text-[var(--text-main)]">Expense Trajectory</h3>
              <p className="text-[8px] font-black uppercase tracking-widest text-[var(--text-muted)]">Last 7 Transactions</p>
            </div>
          </div>
        </div>

        <div className="h-[120px] w-full mt-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={settings.accentColor} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={settings.accentColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="name"
                tick={{ fontSize: 9, fill: 'var(--text-muted)', fontWeight: 'bold' }}
                tickLine={false}
                axisLine={false}
                dy={10}
                interval={0}
              />
              <YAxis hide />
              <Tooltip
                contentStyle={{ borderRadius: '12px', border: 'none', background: 'rgba(0,0,0,0.8)', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}
                itemStyle={{ color: '#fff', fontSize: '10px', fontWeight: 'bold' }}
              />
              <Area
                type="monotone"
                dataKey="amount"
                stroke={settings.accentColor}
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#colorValue)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Dynamic AI & Stability Analysis */}
      <DynamicCognitiveSection />

      {/* Quick Actions / System Tools */}
      <section>
        <div className="flex justify-between items-center mb-2 px-2 bg-[var(--surface-deep)]/50 p-2 rounded-2xl border border-[var(--border-glass)]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[var(--surface-deep)] flex items-center justify-center border border-[var(--border-glass)]">
              <Zap size={16} className="text-blue-500" />
            </div>
            <div>
              <h1 className="text-sm font-black text-[var(--text-main)] italic tracking-tight transition-colors">
                {settings.customAppName || 'FinOS Dashboard'}
              </h1>
              <p className="text-[8px] text-[var(--text-muted)] font-black uppercase tracking-[0.2em] transition-colors">System Tools</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('hub')}
              className="flex items-center gap-1.5 px-3 py-1 bg-blue-500/10 hover:bg-blue-500/20 rounded-lg border border-blue-500/20 transition-all group"
            >
              <span className="text-[9px] font-black uppercase tracking-widest text-blue-400">See All</span>
              <ChevronRight size={10} className="text-blue-400 group-hover:translate-x-0.5 transition-transform" />
            </button>
            <div className="flex bg-[var(--surface-deep)] p-0.5 rounded-lg border border-[var(--border-glass)] transition-colors">
              <button
                onClick={() => setToolViewMode('grid')}
                className={`p-1 rounded-md transition-all ${toolViewMode === 'grid' ? 'bg-blue-600 text-white shadow-sm' : 'text-[var(--text-muted)] hover:text-blue-400'}`}
              >
                <Grid size={12} />
              </button>
              <button
                onClick={() => setToolViewMode('list')}
                className={`p-1 rounded-md transition-all ${toolViewMode === 'list' ? 'bg-blue-600 text-white shadow-sm' : 'text-[var(--text-muted)] hover:text-blue-400'}`}
              >
                <List size={12} />
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
