
import React, { useState, useEffect, lazy, Suspense } from 'react';
import { FinanceProvider, useFinance } from './store/FinanceContext';
import ErrorBoundary from './components/ErrorBoundary';
// Eagerly loaded components (needed immediately)
import Wallets from './components/Wallets';
import TransactionList from './components/TransactionList';
import TransactionForm from './components/TransactionForm';
import Settings from './components/Settings';
import AuthScreen from './components/AuthScreen';
import BiometricLockScreen from './components/BiometricLockScreen';
import SyncLockScreen from './components/SyncLockScreen';
import AppHub from './components/AppHub';
import NotificationInbox from './components/NotificationInbox';
import { SyncStatusIndicator } from './components/SyncStatusIndicator';
import FloatingAIButton from './components/FloatingAIButton';
import AIAssistantModal from './components/AIAssistantModal';
import { ProfileDropdown } from './components/ProfileDropdown';
import { UndoOverlay } from './components/ui/UndoOverlay';

import {
  LayoutGrid,
  Wallet,
  History,
  Settings as SettingsIcon,
  Plus,
  ShieldAlert,
  Library,
  Bell
} from 'lucide-react';

// Lazy loaded components (loaded on demand)
const Dashboard = lazy(() => import('./components/Dashboard'));
const CategoryManager = lazy(() => import('./components/CategoryManager'));
const CommitmentManager = lazy(() => import('./components/CommitmentManager'));
const AdminPanel = lazy(() => import('./components/AdminPanel'));
const FinancialPlans = lazy(() => import('./components/FinancialPlans'));

// Loading fallback component
const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-[60vh]">
    <div className="flex flex-col items-center gap-4">
      <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
      <p className="text-sm font-bold text-[var(--text-muted)] uppercase tracking-widest">Loading...</p>
    </div>
  </div>
);

const MainApp: React.FC = () => {
  const { isLoggedIn, isLocked, syncStatus, isBooting, activeTab, setActiveTab, settings, notifications, profile, isSuperAdmin, undoStack, undoDeletion, deleteProgress, setState } = useFinance();
  const [showAdd, setShowAdd] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showAIAssistant, setShowAIAssistant] = useState(false);

  const unreadCount = notifications ? notifications.filter(n => !n.isRead).length : 0;

  // Update favicon when logo changes
  useEffect(() => {
    if (settings.customLogoUrl) {
      const favicon = document.querySelector<HTMLLinkElement>("link[rel='icon']");
      if (favicon) {
        favicon.href = settings.customLogoUrl;
      } else {
        const newFavicon = document.createElement('link');
        newFavicon.rel = 'icon';
        newFavicon.href = settings.customLogoUrl;
        document.head.appendChild(newFavicon);
      }
    }
  }, [settings.customLogoUrl]);

  // Update document title with custom app name
  useEffect(() => {
    if (settings.customAppName) {
      document.title = `${settings.customAppName} | Premium Finance`;
    } else {
      document.title = 'FinOS | Premium Finance';
    }
  }, [settings.customAppName]);

  // Apply theme and styling
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--accent-primary', settings.accentColor);
    root.style.setProperty('--glass-blur', `${settings.glassIntensity}px`);
    const animSpeeds = { FAST: '0.2s', NORMAL: '0.5s', RELAXED: '1s' };
    root.style.setProperty('--anim-speed', animSpeeds[settings.animationSpeed] || '0.5s');

    root.style.setProperty('--glass-blur', settings.glassEffectsEnabled ? `${settings.glassIntensity}px` : '0px');

    document.body.classList.remove('dark-mode', 'amoled-mode', 'no-glass');
    if (settings.theme === 'DARK') {
      document.body.classList.add('dark-mode');
    } else if (settings.theme === 'AMOLED') {
      document.body.classList.add('amoled-mode');
    }
    if (!settings.glassEffectsEnabled) document.body.classList.add('no-glass');
  }, [settings.theme, settings.accentColor, settings.glassIntensity, settings.animationSpeed, settings.glassEffectsEnabled]);

  // Protection: Redirect Non-Admins away from Admin Tab
  useEffect(() => {
    if (activeTab === 'admin' && !isSuperAdmin) {
      console.warn("🔐 [Security] Unauthorized access to Admin Tab. Redirecting...");
      setActiveTab('dashboard');
    }
  }, [activeTab, isSuperAdmin, setActiveTab]);

  // TEMP: Migration Trigger
  useEffect(() => {
    // Check if migration ran
    const hasRan = localStorage.getItem('MIGRATION_001_DONE');
    if (!hasRan) {
      import('./services/migration_001').then(m => {
        m.runShadowMigration().then(() => {
          localStorage.setItem('MIGRATION_001_DONE', 'true');
        });
      });
    }
  }, []);


  if (isBooting) return <SyncLockScreen />;
  if (!isLoggedIn) return <AuthScreen />;

  if (isLocked) return <BiometricLockScreen />;
  if (!syncStatus.isGlobalInitialized || !syncStatus.isInitialized || (profile && syncStatus.userId !== profile.id)) {
    return <SyncLockScreen />;
  }

  if (settings.maintenanceMode && !isSuperAdmin) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-center p-12 text-center flex-col justify-center items-center gap-6">
        <div className="w-24 h-24 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center animate-pulse">
          <ShieldAlert size={48} className="text-amber-500" />
        </div>
        <h1 className="text-3xl font-black text-white italic tracking-tighter uppercase">Maintenance In Progress</h1>
        <p className="text-zinc-500 font-bold max-w-xs leading-relaxed">System core is temporarily locked for maintenance. Please check back later.</p>
        <button onClick={() => window.location.reload()} className="px-8 py-3 bg-zinc-900 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white active:scale-95 transition-all">Refetch Node Status</button>
      </div>
    );
  }

  return (
    <div className={`min-h-screen pb-24 max-w-lg mx-auto bg-[var(--bg-color)] relative transition-colors duration-300 ${settings.isReadOnly ? 'border-t-2 border-rose-500/30' : ''}`}>
      <header className="px-5 py-3 flex justify-between items-center sticky top-0 bg-[var(--nav-bg)]/80 backdrop-blur-2xl z-50 transition-colors duration-300 border-b border-[var(--border-glass)]">
        <div>
          <h2 className="text-[9px] font-black uppercase tracking-[0.25em] text-blue-500 mb-0.5 opacity-80">{settings.customAppName || 'FinOS 3.0'}</h2>
          <p className="text-sm font-black tracking-tight text-[var(--text-main)] transition-colors uppercase">
            {activeTab}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <SyncStatusIndicator />
          <button
            onClick={() => setShowNotifications(true)}
            className="w-8 h-8 flex items-center justify-center rounded-xl bg-[var(--surface-overlay)] border border-[var(--border-glass)] text-[var(--text-muted)] relative hover:bg-[var(--surface-glass)] hover:text-[var(--text-main)] transition-all active:scale-95"
          >
            <Bell size={16} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white text-[8px] font-black rounded-full flex items-center justify-center border-2 border-[var(--nav-bg)] bounce-in">
                {unreadCount}
              </span>
            )}
          </button>

          <div className="scale-90 origin-right">
            <ProfileDropdown />
          </div>

          {isSuperAdmin && (
            <button
              onClick={() => setActiveTab('admin')}
              className={`w-8 h-8 flex items-center justify-center rounded-xl border transition-all active:scale-95 ${activeTab === 'admin' ? 'bg-rose-600 border-rose-500 text-white shadow-lg shadow-rose-500/20' : 'bg-[var(--surface-overlay)] border-[var(--border-glass)] text-rose-500 hover:bg-rose-500/10'}`}
            >
              <ShieldAlert size={16} />
            </button>
          )}

        </div>
      </header>

      <main className="px-6">
        <Suspense fallback={<LoadingFallback />}>
          {activeTab === 'dashboard' && <Dashboard />}
          {activeTab === 'wallets' && <Wallets />}
          {activeTab === 'timeline' && <TransactionList />}
          {activeTab === 'hub' && <AppHub />}
          {activeTab === 'settings' && <Settings />}
          {activeTab === 'admin' && <AdminPanel />}
          {activeTab === 'commitments' && <CommitmentManager />}
          {activeTab === 'categories' && <CategoryManager />}
          {activeTab === 'plans' && <FinancialPlans />}
        </Suspense>
      </main>

      <nav className="fixed bottom-5 left-1/2 -translate-x-1/2 w-[90%] max-w-sm bg-[var(--surface-overlay)]/80 backdrop-blur-[40px] rounded-full px-6 py-2.5 shadow-[0_20px_60px_-10px_rgba(0,0,0,0.5)] z-[60] flex items-center justify-between border border-white/10 ring-1 ring-white/5 transition-all duration-700">
        <div className="flex-1 flex items-center justify-around relative">
          <div
            className="absolute h-9 bg-gradient-to-tr from-blue-600/30 to-indigo-600/20 rounded-full border border-blue-500/40 shadow-[0_0_15px_rgba(59,130,246,0.2)] transition-all duration-700 top-1/2 -translate-y-1/2"
            style={{
              width: '18%',
              left: activeTab === 'dashboard' ? '1%' : activeTab === 'wallets' ? '21%' : activeTab === 'timeline' ? '61%' : activeTab === 'hub' ? '81%' : '-100%',
              opacity: ['dashboard', 'wallets', 'timeline', 'hub'].includes(activeTab) ? 1 : 0
            }}
          />

          <NavButton active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<LayoutGrid size={18} />} />
          <NavButton active={activeTab === 'wallets'} onClick={() => setActiveTab('wallets')} icon={<Wallet size={18} />} />
          <div className="w-12" />
          <NavButton active={activeTab === 'timeline'} onClick={() => setActiveTab('timeline')} icon={<History size={18} />} />
          <NavButton active={activeTab === 'hub'} icon={<Library size={18} />} onClick={() => setActiveTab('hub')} />
        </div>

        <div className="absolute left-1/2 -translate-x-1/2 -top-6">
          <button
            onClick={() => setShowAdd(true)}
            className="w-14 h-14 bg-gradient-to-tr from-blue-700 via-blue-600 to-indigo-500 rounded-full flex items-center justify-center text-white shadow-[0_10px_30px_rgba(37,99,235,0.5)] ring-[6px] ring-[var(--bg-color)] active:scale-75 transition-all duration-500 group relative overflow-hidden"
          >
            <Plus size={24} strokeWidth={3} className="relative z-10" />
          </button>
        </div>
      </nav>

      {showAdd && <TransactionForm onClose={() => setShowAdd(false)} />}
      {showNotifications && <NotificationInbox onClose={() => setShowNotifications(false)} />}

      <FloatingAIButton onClick={() => setShowAIAssistant(true)} />
      {showAIAssistant && <AIAssistantModal onClose={() => setShowAIAssistant(false)} />}

      {/* Premium Undo Component - Only shows AFTER deletion is fully complete */}
      {undoStack.length > 0 && !deleteProgress.isDeleting && (
        <UndoOverlay
          itemName={undoStack[undoStack.length - 1].data.name || 'Record'}
          onUndo={undoDeletion}
          onClose={() => setState(prev => ({ ...prev, undoStack: [] }))}
        />
      )}
    </div>
  );
};

const NavButton: React.FC<{ active: boolean, onClick: () => void, icon: React.ReactNode }> = ({ active, onClick, icon }) => (
  <button
    onClick={onClick}
    className={`relative z-10 flex flex-col items-center justify-center transition-all duration-500 py-2 min-w-[56px] ${active ? 'text-white' : 'text-[var(--text-muted)]'}`}
  >
    <div className={`transition-all duration-500 ${active ? 'scale-125 drop-shadow-[0_0_15px_rgba(59,130,246,0.8)]' : 'scale-100 opacity-40 hover:opacity-100 hover:scale-110'}`}>
      {icon}
    </div>
  </button>
);

import { FeedbackProvider } from './store/FeedbackContext';

const App: React.FC = () => (
  <ErrorBoundary>
    <FeedbackProvider>
      <FinanceProvider>
        <MainApp />
      </FinanceProvider>
    </FeedbackProvider>
  </ErrorBoundary>
);

export default App;
