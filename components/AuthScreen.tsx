
import React, { useState } from 'react';
import { GlassCard } from './ui/GlassCard';
import { supabase } from '../services/supabase';
import { Mail, Lock, Fingerprint, ArrowRight, Smartphone, ShieldCheck, KeyRound, User, ChevronLeft, AlertCircle } from 'lucide-react';

type AuthMode = 'LOGIN' | 'SIGNUP' | 'FORGOT' | 'PHONE_REQUEST' | 'PHONE_VERIFY';

const AuthScreen: React.FC = () => {
  const [mode, setMode] = useState<AuthMode>('LOGIN');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAuthAction = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (mode === 'LOGIN') {
        console.log("AuthScreen: Attempting login for:", email);
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          console.error("AuthScreen: Login Error:", error.message);
          throw error;
        }
        console.log("AuthScreen: Login successful, user session received.");
      } else if (mode === 'SIGNUP') {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { name } }
        });
        if (error) throw error;

        // Create entry in profiles table
        if (data.user) {
          await supabase.from('profiles').insert([{ id: data.user.id, name }]);
        }

        alert('Verification email sent! Please check your inbox.');
      } else if (mode === 'FORGOT') {
        const { error } = await supabase.auth.resetPasswordForEmail(email);
        if (error) throw error;
        alert('Password recovery link sent to your email.');
      } else if (mode === 'PHONE_REQUEST') {
        const { error } = await supabase.auth.signInWithOtp({ phone });
        if (error) throw error;
        setMode('PHONE_VERIFY');
      } else if (mode === 'PHONE_VERIFY') {
        const token = otp.join('');
        const { error } = await supabase.auth.verifyOtp({ phone, token, type: 'sms' });
        if (error) throw error;
      }
    } catch (err: any) {
      setError(err.message || 'Authentication Protocol Failed');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  return (
    <div className="fixed inset-0 bg-[var(--bg-color)] flex flex-col items-center justify-center p-8 z-[100] animate-in fade-in duration-500 overflow-y-auto transition-colors">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-blue-600/10 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-purple-600/10 blur-[120px] rounded-full animate-pulse" />
      </div>

      <div className="w-full max-w-sm space-y-8 relative">
        <div className="text-center space-y-3">
          <div className="inline-flex p-5 rounded-[35px] bg-[var(--surface-deep)] border border-[var(--border-glass)] shadow-2xl mb-2 transition-colors">
            <Fingerprint size={48} className="text-blue-500" />
          </div>
          <h1 className="text-4xl font-black tracking-tighter text-[var(--text-main)] transition-colors">FinOS</h1>
          <p className="text-[var(--text-muted)] text-xs font-black uppercase tracking-[0.2em] transition-colors">
            {mode === 'LOGIN' && 'System Authorization'}
            {mode === 'SIGNUP' && 'Create Core Identity'}
            {mode === 'FORGOT' && 'Recovery Protocol'}
            {(mode === 'PHONE_REQUEST' || mode === 'PHONE_VERIFY') && 'Cellular Verification'}
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-500 text-xs font-bold animate-in zoom-in-95 duration-200">
            <AlertCircle size={14} />
            <span>{error}</span>
          </div>
        )}

        <GlassCard className="p-8 border-[var(--border-glass)] bg-[var(--surface-glass)] backdrop-blur-3xl shadow-3xl transition-colors">
          <form onSubmit={handleAuthAction} className="space-y-6">
            {mode === 'SIGNUP' && (
              <div className="relative group">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-blue-500 transition-colors" size={18} />
                <input
                  type="text"
                  placeholder="Legal Name"
                  className="w-full bg-[var(--input-bg)] border border-[var(--border-glass)] rounded-2xl py-4 pl-12 pr-4 text-sm font-bold outline-none focus:border-blue-500 transition-all placeholder:text-[var(--text-muted)] text-[var(--text-main)]"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
            )}

            {(mode === 'LOGIN' || mode === 'SIGNUP' || mode === 'FORGOT') && (
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-blue-500 transition-colors" size={18} />
                <input
                  type="email"
                  placeholder="Intelligence ID (Email)"
                  className="w-full bg-[var(--input-bg)] border border-[var(--border-glass)] rounded-2xl py-4 pl-12 pr-4 text-sm font-bold outline-none focus:border-blue-500 transition-all placeholder:text-[var(--text-muted)] text-[var(--text-main)]"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            )}

            {(mode === 'LOGIN' || mode === 'SIGNUP') && (
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-blue-500 transition-colors" size={18} />
                <input
                  type="password"
                  placeholder="Security Key (Password)"
                  className="w-full bg-[var(--input-bg)] border border-[var(--border-glass)] rounded-2xl py-4 pl-12 pr-4 text-sm font-bold outline-none focus:border-blue-500 transition-all placeholder:text-[var(--text-muted)] text-[var(--text-main)]"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            )}

            {mode === 'PHONE_REQUEST' && (
              <div className="relative group">
                <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-blue-500 transition-colors" size={18} />
                <input
                  type="tel"
                  placeholder="+880 1XXX XXXXXX"
                  className="w-full bg-[var(--input-bg)] border border-[var(--border-glass)] rounded-2xl py-4 pl-12 pr-4 text-sm font-bold outline-none focus:border-blue-500 transition-all placeholder:text-[var(--text-muted)] text-[var(--text-main)]"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
              </div>
            )}

            {mode === 'PHONE_VERIFY' && (
              <div className="space-y-4">
                <p className="text-center text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] transition-colors">Enter 6-Digit Code</p>
                <div className="flex justify-between gap-1.5">
                  {otp.map((digit, i) => (
                    <input
                      key={i}
                      id={`otp-${i}`}
                      type="number"
                      value={digit}
                      onChange={(e) => handleOtpChange(i, e.target.value)}
                      className="w-full h-12 bg-[var(--input-bg)] border border-[var(--border-glass)] rounded-xl text-center text-lg font-black focus:border-blue-500 focus:outline-none transition-all text-[var(--text-main)]"
                    />
                  ))}
                </div>
              </div>
            )}

            {mode === 'LOGIN' && (
              <div className="flex justify-between items-center px-1">
                <button
                  type="button"
                  onClick={() => setMode('PHONE_REQUEST')}
                  className="text-[10px] font-black uppercase tracking-widest text-blue-500 hover:text-blue-400 flex items-center gap-1.5"
                >
                  <Smartphone size={12} /> Phone OTP
                </button>
                <button
                  type="button"
                  onClick={() => setMode('FORGOT')}
                  className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] hover:text-blue-400 transition-colors"
                >
                  Forgot Key?
                </button>
              </div>
            )}

            {(mode === 'PHONE_REQUEST' || mode === 'PHONE_VERIFY' || mode === 'FORGOT') && (
              <button
                type="button"
                onClick={() => setMode('LOGIN')}
                className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] hover:text-blue-400 flex items-center gap-1.5 mx-auto transition-colors"
              >
                <ChevronLeft size={12} /> Back to Login
              </button>
            )}

            <button
              disabled={loading}
              className={`w-full py-5 rounded-[24px] font-black uppercase tracking-[0.2em] text-xs flex items-center justify-center gap-3 transition-all ${loading ? 'bg-[var(--surface-deep)] text-[var(--text-muted)]' : 'bg-blue-600 text-white shadow-3xl shadow-blue-600/30 hover:bg-blue-500 active:scale-95'}`}
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>
                    {mode === 'LOGIN' && 'Authorize Session'}
                    {mode === 'SIGNUP' && 'Initialize System'}
                    {mode === 'FORGOT' && 'Reset Sequence'}
                    {mode === 'PHONE_REQUEST' && 'Send Code'}
                    {mode === 'PHONE_VERIFY' && 'Verify Identity'}
                  </span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>
        </GlassCard>

        <div className="text-center space-y-6">
          <div className="flex items-center gap-2 justify-center">
            <span className="text-[10px] text-[var(--text-muted)] font-black uppercase tracking-tighter transition-colors">
              {mode === 'LOGIN' || mode === 'PHONE_REQUEST' ? "New Intelligence Unit?" : "Already Authorized?"}
            </span>
            <button
              onClick={() => setMode(mode === 'LOGIN' ? 'SIGNUP' : 'LOGIN')}
              className="text-[10px] font-black uppercase tracking-widest text-blue-500 hover:text-blue-400 underline underline-offset-4 decoration-2"
            >
              {mode === 'LOGIN' || mode === 'PHONE_REQUEST' ? 'Register Now' : 'Return to Core'}
            </button>
          </div>

          <div className="pt-6 flex justify-center gap-8 border-t border-[var(--border-glass)] grayscale opacity-40 transition-colors">
            <div className="flex flex-col items-center gap-2">
              <ShieldCheck size={20} />
              <span className="text-[8px] font-black uppercase tracking-[0.2em]">Bio-Sync</span>
            </div>
            <div className="flex flex-col items-center gap-2 text-blue-500 opacity-100 grayscale-0">
              <KeyRound size={20} />
              <span className="text-[8px] font-black uppercase tracking-[0.2em]">RSA-4096</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <Smartphone size={20} />
              <span className="text-[8px] font-black uppercase tracking-[0.2em]">Device Bind</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthScreen;
