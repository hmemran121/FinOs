
import React, { useState, useEffect } from 'react';
import { useFinance } from '../store/FinanceContext';
import { GlassCard } from './ui/GlassCard';
import { ICON_MAP } from '../constants';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { getFinancialInsights, FinancialInsight } from '../services/gemini';
import { ArrowUpRight, ArrowDownLeft, BrainCircuit, TrendingDown, RefreshCcw, ShieldCheck, Wallet, ArrowRightCircle, Grid, List, ShieldAlert, Layout, Target } from 'lucide-react';
import HealthScoreCard from './HealthScoreCard';
import FinancialTimeline from './FinancialTimeline';

const Dashboard: React.FC = () => {
  const { totalBalance, availableAfterCommitments, walletsWithBalances, transactions, isCloudLoading, getCurrencySymbol, settings, setActiveTab } = useFinance();
  const [insights, setInsights] = useState<FinancialInsight[]>([]);
  const [displayBalance, setDisplayBalance] = useState(0);
  const [toolViewMode, setToolViewMode] = useState<'grid' | 'list'>('grid');

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

  const incomeThisMonth = transactions
    .filter(t => t.type === 'INCOME' && new Date(t.date).getMonth() === new Date().getMonth())
    .reduce((acc, t) => acc + t.amount, 0);

  const expenseThisMonth = transactions
    .filter(t => t.type === 'EXPENSE' && new Date(t.date).getMonth() === new Date().getMonth())
    .reduce((acc, t) => acc + t.amount, 0);

  return (
    <div className="flex flex-col gap-10 animate-in fade-in slide-in-from-bottom-6 duration-1000">
      {/* Liquid Net Worth Card */}
      <div className="liquid-card relative p-10 rounded-[48px] overflow-hidden group">
        {/* Internal Blobs for Localized Depth */}
        <div className="absolute top-[-20%] right-[-10%] w-64 h-64 rounded-full bg-blue-500/10 blur-[80px] animate-blob" />
        <div className="absolute bottom-[-20%] left-[-10%] w-48 h-48 rounded-full bg-purple-500/10 blur-[60px] animate-blob" style={{ animationDelay: '-8s' }} />

        <div className="relative z-10 flex flex-col justify-between h-full space-y-12">
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.8)] animate-pulse" />
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">Network Status: Optimized</p>
                {isCloudLoading && <RefreshCcw size={12} className="text-blue-500 animate-spin" />}
              </div>
              <h1 className="text-6xl font-black tracking-tighter text-white drop-shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
                {getCurrencySymbol(settings.currency)}<span className="text-gradient">{displayBalance.toLocaleString()}</span>
              </h1>
              <p className="text-[11px] font-bold text-blue-400/80 uppercase tracking-widest px-1">
                {getCurrencySymbol(settings.currency)}{availableAfterCommitments.toLocaleString()} Liquid Liquidity
              </p>
            </div>
            <div className="w-14 h-14 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center backdrop-blur-3xl shadow-2xl group-hover:scale-110 transition-transform duration-500">
              <ShieldCheck className="text-blue-500" size={28} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="flex flex-col gap-3 bg-blue-500/5 hover:bg-blue-500/10 border border-white/5 p-5 rounded-[32px] transition-all duration-500 group/stat">
              <div className="flex items-center gap-2 text-blue-400/60">
                <ArrowUpRight size={16} className="group-hover/stat:translate-x-1 group-hover/stat:-translate-y-1 transition-transform" />
                <span className="text-[10px] font-black uppercase tracking-widest">Inflow Stream</span>
              </div>
              <span className="text-2xl font-black text-white">{getCurrencySymbol(settings.currency)}{incomeThisMonth.toLocaleString()}</span>
            </div>

            <div className="flex flex-col gap-3 bg-rose-500/5 hover:bg-rose-500/10 border border-white/5 p-5 rounded-[32px] transition-all duration-500 group/stat">
              <div className="flex items-center gap-2 text-rose-400/60">
                <ArrowDownLeft size={16} className="group-hover/stat:-translate-x-1 group-hover/stat:translate-y-1 transition-transform" />
                <span className="text-[10px] font-black uppercase tracking-widest">Global Outflow</span>
              </div>
              <span className="text-2xl font-black text-rose-500">{getCurrencySymbol(settings.currency)}{expenseThisMonth.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* AI Intelligence Stream */}
      <section className="space-y-6">
        <div className="flex items-center gap-4 px-4 font-black">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-500/20 to-blue-500/10 flex items-center justify-center border border-purple-500/20 shadow-lg">
            <BrainCircuit size={20} className="text-purple-400" />
          </div>
          <h2 className="text-[11px] uppercase tracking-[0.3em] text-white/50">Flux Intelligence</h2>
        </div>

        <div className="flex overflow-x-auto gap-6 pb-6 no-scrollbar -mx-6 px-6">
          {insights.length > 0 ? insights.map((insight, idx) => (
            <div key={idx} className="liquid-card min-w-[300px] p-8 rounded-[40px] space-y-6 border-white/5">
              <p className="text-[15px] text-white/80 leading-relaxed font-bold">"{insight.insight}"</p>
              <div className={`text-[9px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full w-fit ${insight.urgency === 'HIGH' ? 'bg-rose-500/20 text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.2)]' :
                insight.urgency === 'MEDIUM' ? 'bg-amber-500/20 text-amber-400' :
                  'bg-blue-500/20 text-blue-400'
                }`}>
                {insight.urgency} Priority Protocol
              </div>
            </div>
          )) : (
            <div className="w-full px-4">
              <div className="liquid-card w-full py-16 text-center border-dashed opacity-50 rounded-[40px]">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-white/30">Syncing Intelligence Stream...</p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Operational Nexus */}
      <section className="space-y-6">
        <div className="flex justify-between items-center px-4">
          <div className="flex items-center gap-4 font-black">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20 shadow-lg">
              <Layout size={20} className="text-blue-400" />
            </div>
            <h2 className="text-[11px] uppercase tracking-[0.3em] text-white/50">Operational Nexus</h2>
          </div>
          <div className="flex bg-white/5 p-1.5 rounded-[18px] border border-white/5 backdrop-blur-xl">
            <button onClick={() => setToolViewMode('grid')} className={`p-2 rounded-xl transition-all ${toolViewMode === 'grid' ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(59,130,246,0.3)]' : 'text-white/30 hover:text-white'}`}><Grid size={16} /></button>
            <button onClick={() => setToolViewMode('list')} className={`p-2 rounded-xl transition-all ${toolViewMode === 'list' ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(59,130,246,0.3)]' : 'text-white/30 hover:text-white'}`}><List size={16} /></button>
          </div>
        </div>

        <div className={toolViewMode === 'grid' ? "grid grid-cols-2 gap-6" : "flex flex-col gap-4"}>
          {[
            { id: 'commitments', label: 'Safety Ledger', sub: 'Fiscal Protocols', icon: <ShieldAlert size={28} />, color: 'blue' },
            { id: 'categories', label: 'Taxonomy', sub: 'Node Logic', icon: <Grid size={28} />, color: 'purple' },
            { id: 'plans', label: 'Strategic Plan', sub: 'Spending Engine', icon: <Target size={28} />, color: 'emerald' },
          ].map(tool => (
            <div
              key={tool.id}
              onClick={() => setActiveTab(tool.id as any)}
              className={`liquid-card cursor-pointer group active:scale-95 border-white/5 hover:border-${tool.color}-500/30 ${toolViewMode === 'grid' ? 'p-8 flex flex-col items-center text-center space-y-4 rounded-[40px]' : 'p-6 flex items-center justify-between rounded-[32px]'}`}
            >
              <div className={`flex items-center gap-6 ${toolViewMode === 'grid' ? 'flex-col' : ''}`}>
                <div className={`w-16 h-16 rounded-[22px] bg-${tool.color}-500/10 flex items-center justify-center text-${tool.color}-400 group-hover:scale-110 transition-all duration-500 shadow-lg`}>
                  {tool.icon}
                </div>
                <div className={toolViewMode === 'grid' ? '' : 'text-left'}>
                  <h3 className="font-black text-[15px] text-white">{tool.label}</h3>
                  <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest">{tool.sub}</p>
                </div>
              </div>
              {toolViewMode === 'list' && <ArrowRightCircle size={22} className="text-white/10 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />}
            </div>
          ))}
        </div>
      </section>

      {/* Trajectory Analytics */}
      <section className="space-y-6">
        <div className="flex items-center gap-4 px-4 font-black">
          <div className="w-10 h-10 rounded-2xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20 shadow-lg">
            <TrendingDown size={20} className="text-blue-400" />
          </div>
          <h2 className="text-[11px] uppercase tracking-[0.3em] text-white/50">Flux Trajectory</h2>
        </div>
        <div className="liquid-card p-10 h-72 rounded-[48px] border-white/5">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorAmt" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.6} />
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="name" hide />
              <YAxis hide domain={['auto', 'auto']} />
              <Tooltip
                contentStyle={{ backgroundColor: 'rgba(5, 5, 8, 0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '24px', padding: '15px', color: '#fff', backdropFilter: 'blur(10px)' }}
                itemStyle={{ color: '#3B82F6', fontWeight: 'bold' }}
              />
              <Area type="monotone" dataKey="amount" stroke="#3B82F6" fillOpacity={1} fill="url(#colorAmt)" strokeWidth={5} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Digital Vaults Overview */}
      <section className="mb-12 space-y-6">
        <div className="flex justify-between items-center px-4">
          <div className="flex items-center gap-4 font-black">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20 shadow-lg">
              <Wallet size={20} className="text-amber-400" />
            </div>
            <h2 className="text-[11px] uppercase tracking-[0.3em] text-white/50">Digital Vaults</h2>
          </div>
          <button onClick={() => setActiveTab('wallets')} className="text-blue-500 text-[11px] font-black uppercase tracking-widest hover:tracking-[0.2em] transition-all">Expand Matrix</button>
        </div>
        <div className="flex flex-col gap-4">
          {walletsWithBalances.map(w => (
            <div
              key={w.id}
              onClick={() => setActiveTab('wallets')}
              className="liquid-card flex justify-between items-center p-6 rounded-[32px] border-white/5 group cursor-pointer active:scale-95 transition-all"
            >
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-white/5 text-white/30 border border-white/5 group-hover:border-white/20 transition-all duration-500" style={{ boxShadow: `0 10px 30px ${w.color}15` }}>
                  {ICON_MAP[w.icon] || ICON_MAP.Wallet}
                </div>
                <div>
                  <p className="font-black text-lg text-white group-hover:text-blue-400 transition-colors">{w.name}</p>
                  <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">{w.channels.length} Operational Nodes</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-black text-xl text-white">
                  {getCurrencySymbol(w.currency)}{w.currentBalance.toLocaleString()}
                </p>
                <div className="flex items-center justify-end gap-1.5 mt-1">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: w.color }} />
                  <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest">{w.currency}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
      );
};

      export default Dashboard;
