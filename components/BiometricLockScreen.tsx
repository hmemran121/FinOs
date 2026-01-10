import React, { useEffect, useState } from 'react';
import { Fingerprint, Lock, ShieldCheck, ScanFace } from 'lucide-react';
import { useFinance } from '../store/FinanceContext';

const BiometricLockScreen: React.FC = () => {
    const { unlockApp, settings } = useFinance();
    const [isAuthenticating, setIsAuthenticating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleUnlock = async () => {
        setIsAuthenticating(true);
        setError(null);
        try {
            const success = await unlockApp();
            if (!success) {
                setError("Biometric verification failed. Please try again.");
            }
        } catch (e: any) {
            console.error("Auth Exception:", e);
            let msg = "Secure protocol error.";
            if (typeof e === 'string') msg = e;
            else if (e?.message) msg = e.message;
            else if (e && typeof e === 'object') msg = JSON.stringify(e);
            setError(msg);
        } finally {
            setIsAuthenticating(false);
        }
    };

    useEffect(() => {
        // Auto-trigger on mount
        const timer = setTimeout(() => {
            handleUnlock();
        }, 500);
        return () => clearTimeout(timer);
    }, []);

    return (
        <div className="fixed inset-0 z-[9999] bg-[var(--bg-color)] flex flex-col items-center justify-center p-6 animate-in fade-in duration-500">
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-1/4 left-1/4 w-[50vh] h-[50vh] bg-blue-600/10 blur-[100px] rounded-full animate-pulse" />
            </div>

            <div className="flex flex-col items-center gap-8 relative z-10 max-w-sm w-full">
                <div className="relative">
                    <div className="absolute inset-0 bg-blue-500 blur-2xl opacity-20 animate-pulse rounded-full" />
                    <div className="w-24 h-24 rounded-[30px] bg-[var(--surface-glass)] border border-[var(--border-glass)] flex items-center justify-center shadow-2xl backdrop-blur-xl">
                        {settings.customLogoUrl ? (
                            <img
                                src={settings.customLogoUrl}
                                alt="Logo"
                                className="w-12 h-12 object-contain"
                                onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                    (e.target as HTMLImageElement).parentElement!.innerHTML = '<svg class="w-12 h-12 text-blue-500 animate-pulse" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4"></path></svg>';
                                }}
                            />
                        ) : (
                            <Fingerprint size={48} className="text-blue-500 animate-pulse" />
                        )}
                    </div>
                    <div className="absolute -bottom-2 -right-2 bg-[var(--bg-color)] p-2 rounded-full border border-[var(--border-glass)]">
                        <ShieldCheck size={16} className="text-green-500" />
                    </div>
                </div>

                <div className="text-center space-y-2">
                    <h1 className="text-2xl font-black tracking-tight text-[var(--text-main)]">{settings.customAppName || 'FinOS'} Locked</h1>
                    <p className="text-[var(--text-muted)] text-[10px] font-bold uppercase tracking-[0.2em]">
                        System Secured • Biometric Required
                    </p>
                </div>

                {error && (
                    <div className="px-4 py-2 bg-rose-500/10 border border-rose-500/20 rounded-xl">
                        <p className="text-rose-500 text-xs font-bold">{error}</p>
                    </div>
                )}

                <button
                    onClick={handleUnlock}
                    disabled={isAuthenticating}
                    className="w-full py-4 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white rounded-2xl font-bold uppercase tracking-widest text-xs shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2"
                >
                    {isAuthenticating ? (
                        <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    ) : (
                        <>
                            <ScanFace size={18} />
                            <span>Unlock System</span>
                        </>
                    )}
                </button>
            </div>
        </div>
    );
};

export default BiometricLockScreen;
