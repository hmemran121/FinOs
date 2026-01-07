
import React, { useState, useMemo } from 'react';
import { CurrencyPickerOverlay } from './ui/CurrencyPickerOverlay';
import { useFinance } from '../store/FinanceContext';
import { biometricService } from '../services/biometric';
import { GlassCard } from './ui/GlassCard';
import { SyncStatusPanel } from './SyncStatusIndicator';
import {
  X,
  User,
  Shield,
  Database,
  Cpu,
  LogOut,
  ChevronRight,
  Globe,
  Download,
  Trash2,
  Check,
  Edit2,
  Lock,
  Smartphone,
  Power,
  Moon,
  Sun,
  Zap,
  Cloud,
  Search
} from 'lucide-react';

const Settings: React.FC = () => {
  const { profile, settings, updateProfile, updateSettings, clearAllData, logout, transactions, categories, wallets, currencies } = useFinance();
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(profile.name);
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);

  const handleSaveName = () => {
    updateProfile({ name: tempName });
    setIsEditingName(false);
  };

  const exportData = () => {
    const data = transactions.map(t => {
      const cat = categories.find(c => c.id === t.categoryId);
      const wal = wallets.find(w => w.id === t.walletId);
      return {
        date: t.date,
        type: t.type,
        amount: t.amount,
        note: t.note,
        category: cat?.name || 'Unknown',
        wallet: wal?.name || 'Unknown'
      };
    });

    const csvRows = [
      ['Date', 'Type', 'Amount', 'Note', 'Category', 'Wallet'],
      ...data.map(row => [row.date, row.type, row.amount, `"${row.note}"`, row.category, row.wallet])
    ];

    const csvContent = "data:text/csv;charset=utf-8," + csvRows.map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `FinOS_Export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };



  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-32">
      <div className="px-1">
        <h1 className="text-2xl font-extrabold tracking-tight">Preferences</h1>
        <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mt-1">System Core Configuration</p>
      </div>

      {/* User Identity */}
      <section>
        <div className="flex items-center gap-2 mb-4 px-1">
          <User size={16} className="text-blue-500" />
          <h2 className="text-sm font-bold uppercase tracking-widest text-[var(--text-muted)] transition-colors">Identity</h2>
        </div>
        <GlassCard className="p-6">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 rounded-[30px] bg-gradient-to-tr from-blue-600 to-purple-600 flex items-center justify-center text-3xl font-black shadow-2xl shadow-blue-600/20">
              {profile.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              {isEditingName ? (
                <div className="flex items-center gap-2">
                  <input
                    autoFocus
                    className="bg-[var(--input-bg)] border border-[var(--border-glass)] rounded-xl px-3 py-2 text-sm font-bold w-full outline-none focus:border-blue-500 text-[var(--text-main)] transition-colors"
                    value={tempName}
                    onChange={(e) => setTempName(e.target.value)}
                    onBlur={handleSaveName}
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                  />
                  <button onClick={handleSaveName} className="p-2 text-emerald-500"><Check size={18} /></button>
                </div>
              ) : (
                <div className="flex items-center gap-2 group cursor-pointer" onClick={() => setIsEditingName(true)}>
                  <h3 className="text-xl font-bold truncate text-[var(--text-main)] transition-colors">{profile.name}</h3>
                  <Edit2 size={14} className="text-[var(--text-muted)] group-hover:text-blue-500 transition-colors" />
                </div>
              )}
              <p className="text-[10px] text-[var(--text-muted)] font-black uppercase tracking-widest mt-1 truncate transition-colors">{profile.email || 'Cloud Linked Identity'}</p>
            </div>
          </div>
        </GlassCard>
      </section>

      {/* Session Management */}
      <section>
        <div className="flex items-center gap-2 mb-4 px-1">
          <Power size={16} className="text-rose-500" />
          <h2 className="text-sm font-bold uppercase tracking-widest text-[var(--text-muted)] transition-colors">Session</h2>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center justify-between p-5 bg-rose-500/10 border border-rose-500/20 rounded-[28px] text-rose-500 group active:scale-95 transition-all"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-rose-500/20 rounded-xl">
              <LogOut size={20} />
            </div>
            <div className="text-left">
              <p className="text-sm font-black uppercase tracking-widest">Terminate Session</p>
              <p className="text-[10px] font-bold opacity-60">Sign out from this device</p>
            </div>
          </div>
          <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
        </button>
      </section>

      {/* Theme & Aesthetics */}
      <section>
        <div className="flex items-center gap-2 mb-4 px-1">
          <Moon size={16} className="text-purple-500" />
          <h2 className="text-sm font-bold uppercase tracking-widest text-[var(--text-muted)] transition-colors">Aesthetics</h2>
        </div>
        <div className="flex bg-[var(--input-bg)] p-1.5 rounded-3xl border border-[var(--border-glass)]">
          {[
            { id: 'DARK', label: 'Dark', icon: <Moon size={14} /> },
            { id: 'LIGHT', label: 'Day', icon: <Sun size={14} /> },
            { id: 'AMOLED', label: 'OLED', icon: <Zap size={14} /> }
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => updateSettings({ theme: t.id as any })}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${settings.theme === t.id ? 'bg-blue-600 text-white shadow-lg' : 'text-[var(--text-muted)] hover:bg-white/5'}`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>
      </section>

      {/* Cloud Sync */}
      <section>
        <div className="flex items-center gap-2 mb-4 px-1">
          <Cloud size={16} className="text-blue-500" />
          <h2 className="text-sm font-bold uppercase tracking-widest text-[var(--text-muted)] transition-colors">Cloud Sync</h2>
        </div>
        <SyncStatusPanel />
      </section>

      {/* General Settings */}
      <section>
        <div className="flex items-center gap-2 mb-4 px-1">
          <Globe size={16} className="text-blue-500" />
          <h2 className="text-sm font-bold uppercase tracking-widest text-[var(--text-muted)] transition-colors">Global Config</h2>
        </div>
        <div className="space-y-3">
          <SettingsRow
            icon={<Globe size={18} />}
            label="System Currency"
            value={`${settings.currency} (${currencies.find(c => c.code === settings.currency)?.symbol || '$'})`}
            onClick={() => setShowCurrencyPicker(true)}
          />
          <SettingsRow
            icon={<Cpu size={18} />}
            label="AI Predictive Engine"
            value={settings.aiEnabled ? 'Active' : 'Standby'}
            toggle={settings.aiEnabled}
            onClick={() => updateSettings({ aiEnabled: !settings.aiEnabled })}
          />
        </div>
      </section>

      {/* Security */}
      <section>
        <div className="flex items-center gap-2 mb-4 px-1">
          <Shield size={16} className="text-blue-500" />
          <h2 className="text-sm font-bold uppercase tracking-widest text-[var(--text-muted)] transition-colors">Security Protocols</h2>
        </div>
        <div className="space-y-3">
          <SettingsRow
            icon={<Smartphone size={18} />}
            label="Biometric Authorization"
            value={settings.biometricEnabled ? 'Encrypted' : 'Disabled'}
            toggle={settings.biometricEnabled}
            onClick={async () => {
              const available = await biometricService.checkAvailability();
              if (!available.isAvailable) {
                alert("Biometric hardware not available on this device.");
                return;
              }

              const verified = await biometricService.verifyIdentity();
              if (verified) {
                updateSettings({ biometricEnabled: !settings.biometricEnabled });
              } else {
                alert("Verification failed. Setting unchanged.");
              }
            }}
          />
          <SettingsRow
            icon={<Lock size={18} />}
            label="Reset System PIN"
            value="****"
            onClick={() => alert('PIN reset sequence initiated. (Simulation)')}
          />
        </div>
      </section>

      {/* Data Management */}
      <section>
        <div className="flex items-center gap-2 mb-4 px-1">
          <Database size={16} className="text-blue-500" />
          <h2 className="text-sm font-bold uppercase tracking-widest text-[var(--text-muted)] transition-colors">Data & Portability</h2>
        </div>
        <div className="space-y-3">
          <SettingsRow
            icon={<Download size={18} />}
            label="Export Ledger (CSV)"
            onClick={exportData}
          />
          <SettingsRow
            icon={<Trash2 size={18} />}
            label="Factory Reset"
            className="text-rose-500"
            onClick={clearAllData}
          />
        </div>
      </section>

      <div className="pt-12 text-center space-y-2 opacity-30">
        <p className="text-[10px] font-black tracking-widest uppercase">FinOS Premium Build v3.5.0</p>
        <p className="text-[8px] font-bold">Secure Cloud Identity | Real-time Synchronization Enabled</p>
      </div>

      {/* REUSABLE CURRENCY PICKER OVERLAY */}
      <CurrencyPickerOverlay
        isOpen={showCurrencyPicker}
        onClose={() => setShowCurrencyPicker(false)}
        selectedCurrency={settings.currency}
        onSelect={(code) => updateSettings({ currency: code })}
      />
    </div>
  );
};

interface SettingsRowProps {
  icon: React.ReactNode;
  label: string;
  value?: string;
  onClick?: () => void;
  toggle?: boolean;
  className?: string;
}

const SettingsRow: React.FC<SettingsRowProps> = ({ icon, label, value, onClick, toggle, className = '' }) => (
  <GlassCard
    className={`p-4 border-white/5 active:bg-white/5 cursor-pointer ${className}`}
    onClick={onClick}
  >
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-[var(--input-bg)] flex items-center justify-center text-[var(--text-muted)] border border-[var(--border-glass)]">
          {icon}
        </div>
        <p className="text-sm font-bold text-[var(--text-main)] transition-colors">{label}</p>
      </div>
      <div className="flex items-center gap-3">
        {value && <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-tighter transition-colors">{value}</span>}
        {toggle !== undefined ? (
          <div className={`w-10 h-6 rounded-full p-1 transition-all ${toggle ? 'bg-blue-600' : 'bg-[var(--surface-deep)] border border-[var(--border-glass)]'}`}>
            <div className={`w-4 h-4 bg-white rounded-full transition-all ${toggle ? 'translate-x-4' : ''}`} />
          </div>
        ) : (
          <ChevronRight size={16} className="text-[var(--text-muted)]" />
        )}
      </div>
    </div>
  </GlassCard>
);

export default Settings;
