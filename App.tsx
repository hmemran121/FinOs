
import React, { useState } from 'react';
import { FinanceProvider, useFinance } from './store/FinanceContext';
import Dashboard from './components/Dashboard';
import Wallets from './components/Wallets';
import TransactionList from './components/TransactionList';
import TransactionForm from './components/TransactionForm';
import CategoryManager from './components/CategoryManager';
import CommitmentManager from './components/CommitmentManager';
import Settings from './components/Settings';
import AuthScreen from './components/AuthScreen';
import BiometricLockScreen from './components/BiometricLockScreen';
import FinancialPlans from './components/FinancialPlans';
import { SyncStatusIndicator } from './components/SyncStatusIndicator';
import {
  LayoutGrid,
  Wallet,
  History,
  Settings as SettingsIcon,
  Plus,
  Grid,
  ShieldAlert
} from 'lucide-react';

const MainApp: React.FC = () => {
  const { isLoggedIn, isLocked, activeTab, setActiveTab, settings } = useFinance();
  const [showAdd, setShowAdd] = useState(false);

  console.log("FinOS: MainApp Rendered, isLoggedIn:", isLoggedIn);

  React.useEffect(() => {
    document.body.classList.remove('light-mode', 'amoled-mode');
    if (settings.theme === 'LIGHT') {
      document.body.classList.add('light-mode');
    } else if (settings.theme === 'AMOLED') {
      document.body.classList.add('amoled-mode');
    }
  }, [settings.theme]);

  if (!isLoggedIn) {
    return <AuthScreen />;
  }

  if (isLocked) {
    return <BiometricLockScreen />;
  }

  return (
    <div className="min-h-screen pb-24 max-w-lg mx-auto bg-[var(--bg-color)] relative transition-colors duration-300">
      <header className="px-6 py-8 flex justify-between items-center sticky top-0 bg-[var(--nav-bg)] backdrop-blur-xl z-30 transition-colors duration-300">
        <div>
          <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500 mb-0.5">FinOS 3.0</h2>
          <p className="text-lg font-extrabold tracking-tight text-[var(--text-main)] transition-colors">System Console</p>
        </div>
        <div className="flex items-center gap-3">
          <SyncStatusIndicator />
          <button
            onClick={() => setActiveTab('settings')}
            className={`p-3 rounded-2xl border transition-all ${activeTab === 'settings' ? 'bg-blue-600 border-blue-500 text-white' : 'bg-[var(--input-bg)] border-[var(--border-glass)] text-[var(--text-muted)]'}`}
          >
            <SettingsIcon size={20} />
          </button>
        </div>
      </header>

      <main className="px-6">
        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'wallets' && <Wallets />}
        {activeTab === 'commitments' && <CommitmentManager />}
        {activeTab === 'timeline' && <TransactionList />}
        {activeTab === 'categories' && <CategoryManager />}
        {activeTab === 'plans' && <FinancialPlans />}
        {activeTab === 'settings' && <Settings />}
      </main>

      <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[94%] max-w-md bg-[var(--surface-overlay)]/70 backdrop-blur-[40px] rounded-[40px] p-4 shadow-[0_25px_80px_-15px_rgba(0,0,0,0.6)] z-40 flex items-center justify-between border border-white/10 ring-1 ring-white/5 transition-all duration-700 ease-in-out">
        <div className="flex-1 flex items-center justify-around relative">
          {/* Active Indicator Backdrop - Tightened & Refined */}
          <div
            className="absolute h-16 bg-gradient-to-tr from-blue-600/30 to-indigo-600/20 rounded-full border border-blue-500/40 shadow-[0_0_20px_rgba(59,130,246,0.25)] transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]"
            style={{
              width: '18%',
              left: activeTab === 'dashboard' ? '1%' : activeTab === 'wallets' ? '21%' : activeTab === 'timeline' ? '61%' : activeTab === 'settings' ? '81%' : '-100%',
              opacity: ['dashboard', 'wallets', 'timeline', 'settings'].includes(activeTab) ? 1 : 0
            }}
          />

          <NavButton
            active={activeTab === 'dashboard'}
            onClick={() => setActiveTab('dashboard')}
            icon={<LayoutGrid size={22} />}
          />
          <NavButton
            active={activeTab === 'wallets'}
            onClick={() => setActiveTab('wallets')}
            icon={<Wallet size={22} />}
          />

          {/* Invisible spacer for FAB */}
          <div className="w-16" />

          <NavButton
            active={activeTab === 'timeline'}
            onClick={() => setActiveTab('timeline')}
            icon={<History size={22} />}
          />
          <NavButton
            active={activeTab === 'settings'}
            onClick={() => setActiveTab('settings')}
            icon={<SettingsIcon size={22} />}
          />
        </div>

        {/* Floating Action Button - Center Positioned Overlay */}
        <div className="absolute left-1/2 -translate-x-1/2 -top-10">
          <button
            onClick={() => setShowAdd(true)}
            className="w-20 h-20 bg-gradient-to-tr from-blue-700 via-blue-600 to-indigo-500 rounded-full flex items-center justify-center text-white shadow-[0_15px_40px_rgba(37,99,235,0.6)] ring-8 ring-[var(--bg-color)] active:scale-75 transition-all duration-500 group relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="absolute inset-x-0 -bottom-full h-full bg-white/10 blur-xl group-active:bottom-0 transition-all duration-500" />
            <Plus size={36} strokeWidth={3} className="relative z-10 group-active:rotate-90 transition-transform duration-500" />
          </button>
        </div>
      </nav>

      {showAdd && <TransactionForm onClose={() => setShowAdd(false)} />}
    </div>
  );
};

const NavButton: React.FC<{ active: boolean, onClick: () => void, icon: React.ReactNode }> = ({ active, onClick, icon }) => (
  <button
    onClick={onClick}
    className={`relative z-10 flex flex-col items-center justify-center transition-all duration-500 py-3 min-w-[56px] group/navitem ${active ? 'text-white' : 'text-[var(--text-muted)]'}`}
  >
    <div className={`transition-all duration-500 ${active
      ? 'scale-125 -translate-y-1 drop-shadow-[0_0_15px_rgba(59,130,246,0.8)] text-white'
      : 'scale-100 opacity-40 group-hover/navitem:opacity-100 group-hover/navitem:scale-110 group-hover/navitem:drop-shadow-[0_5px_15px_rgba(0,0,0,0.8)] group-hover/navitem:text-white'}`}>
      {icon}
    </div>
  </button>
);

const App: React.FC = () => (
  <FinanceProvider>
    <MainApp />
  </FinanceProvider>
);

export default App;
