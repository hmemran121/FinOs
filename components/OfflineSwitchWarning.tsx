import React from 'react';
import { AlertTriangle, WifiOff, X } from 'lucide-react';

interface OfflineSwitchWarningProps {
    onClose: () => void;
    onForceLogout: () => void;
}

/**
 * OfflineSwitchWarning - Warning modal when user tries to switch offline
 * 
 * International Standard: Prevent data loss in offline scenarios
 * Security: Ensures pending changes are saved before switch
 * 
 * Shows:
 * - Clear warning message
 * - Explanation of why switch is blocked
 * - Options: Wait for connection or Force logout
 */
const OfflineSwitchWarning: React.FC<OfflineSwitchWarningProps> = ({
    onClose,
    onForceLogout
}) => {
    return (
        <div className="fixed inset-0 z-[200] bg-zinc-950/90 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="bg-zinc-900 border border-amber-500/20 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl shadow-amber-500/10 animate-in slide-in-from-bottom-4 duration-300">
                {/* Header */}
                <div className="p-6 border-b border-amber-500/10 bg-gradient-to-b from-amber-500/5 to-transparent">
                    <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4">
                            {/* Icon */}
                            <div className="w-12 h-12 bg-amber-500/10 rounded-xl flex items-center justify-center flex-shrink-0 border border-amber-500/20">
                                <WifiOff size={24} className="text-amber-500" />
                            </div>

                            {/* Title */}
                            <div>
                                <h3 className="text-lg font-black text-white mb-1">
                                    Cannot Switch Users Offline
                                </h3>
                                <p className="text-xs text-amber-400/80 font-medium">
                                    Internet connection required
                                </p>
                            </div>
                        </div>

                        {/* Close button */}
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-white/5 rounded-lg text-zinc-400 transition-colors"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-4">
                    {/* Warning message */}
                    <div className="p-4 bg-amber-500/5 border border-amber-500/10 rounded-xl">
                        <div className="flex items-start gap-3">
                            <AlertTriangle size={18} className="text-amber-500 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm text-white font-medium mb-2">
                                    Your data needs to be saved first
                                </p>
                                <p className="text-xs text-zinc-400 leading-relaxed">
                                    To ensure your pending changes are safely saved to the cloud,
                                    we need an active internet connection before switching users.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Explanation */}
                    <div className="space-y-3">
                        <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                            Why is this required?
                        </p>

                        <div className="space-y-2">
                            <div className="flex items-start gap-3">
                                <div className="w-6 h-6 bg-indigo-500/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                    <span className="text-xs font-bold text-indigo-400">1</span>
                                </div>
                                <p className="text-xs text-zinc-400 leading-relaxed">
                                    <span className="text-white font-medium">Save your work:</span> Any unsaved transactions,
                                    wallets, or plans need to be uploaded to the cloud.
                                </p>
                            </div>

                            <div className="flex items-start gap-3">
                                <div className="w-6 h-6 bg-purple-500/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                    <span className="text-xs font-bold text-purple-400">2</span>
                                </div>
                                <p className="text-xs text-zinc-400 leading-relaxed">
                                    <span className="text-white font-medium">Data security:</span> We clear the previous
                                    user's data from this device to protect their privacy.
                                </p>
                            </div>

                            <div className="flex items-start gap-3">
                                <div className="w-6 h-6 bg-emerald-500/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                    <span className="text-xs font-bold text-emerald-400">3</span>
                                </div>
                                <p className="text-xs text-zinc-400 leading-relaxed">
                                    <span className="text-white font-medium">Load new profile:</span> The new user's
                                    data needs to be downloaded from the cloud.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="p-6 border-t border-zinc-800 bg-zinc-900/50 space-y-3">
                    {/* Primary action */}
                    <button
                        onClick={onClose}
                        className="w-full px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl font-bold text-sm uppercase tracking-wider transition-all shadow-lg shadow-indigo-500/20"
                    >
                        Wait for Connection
                    </button>

                    {/* Secondary action */}
                    <button
                        onClick={onForceLogout}
                        className="w-full px-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl font-bold text-sm uppercase tracking-wider transition-all border border-zinc-700"
                    >
                        Force Logout (Unsaved Changes Lost)
                    </button>

                    {/* Help text */}
                    <p className="text-[10px] text-zinc-600 text-center uppercase tracking-wider">
                        Connect to WiFi or Mobile Data to continue
                    </p>
                </div>
            </div>
        </div>
    );
};

export default OfflineSwitchWarning;
