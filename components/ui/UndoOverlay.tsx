import React, { useState, useEffect } from 'react';
import { Undo2, X } from 'lucide-react';
import { useFinance } from '../../store/FinanceContext';

interface UndoOverlayProps {
    onUndo: () => void;
    onClose: () => void;
    itemName: string;
}

export const UndoOverlay: React.FC<UndoOverlayProps> = ({ onUndo, onClose, itemName }) => {
    const [timeLeft, setTimeLeft] = useState(100);
    const [isRestoring, setIsRestoring] = useState(false);

    useEffect(() => {
        if (isRestoring) return;
        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 0) {
                    clearInterval(timer);
                    onClose();
                    return 0;
                }
                return prev - 1;
            });
        }, 50);
        return () => clearInterval(timer);
    }, [onClose, isRestoring]);

    const handleUndo = async () => {
        setIsRestoring(true);
        try {
            await onUndo();
        } catch (e) {
            setIsRestoring(false);
        }
    };

    return (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[1000] w-[90%] max-w-sm animate-in slide-in-from-bottom-10 duration-500">
            <div className={`relative group overflow-hidden rounded-[32px] border border-white/10 bg-[#1A1C1E]/80 shadow-[0_30px_60px_rgba(0,0,0,0.5)] backdrop-blur-2xl p-4 pr-6 flex items-center justify-between gap-6 transition-all ${isRestoring ? 'opacity-50 pointer-events-none scale-95' : 'hover:scale-[1.02] hover:bg-[#1A1C1E]/90'}`}>
                {/* Glowing Background Shine */}
                <div className={`absolute inset-0 bg-gradient-to-r from-blue-500/10 via-indigo-500/5 to-transparent transition-opacity ${isRestoring ? 'opacity-0' : 'group-hover:opacity-100'}`} />

                <div className="flex items-center gap-4 relative z-10">
                    <div className={`relative flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-500 shadow-inner transition-all ${isRestoring ? 'animate-pulse scale-110' : ''}`}>
                        {/* Circular Progress Ring */}
                        {!isRestoring && (
                            <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 36 36">
                                <path
                                    className="stroke-blue-500/10"
                                    strokeWidth="3"
                                    fill="none"
                                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                />
                                <path
                                    className="stroke-blue-500 transition-all duration-75"
                                    strokeDasharray={`${timeLeft}, 100`}
                                    strokeWidth="3"
                                    strokeLinecap="round"
                                    fill="none"
                                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                />
                            </svg>
                        )}
                        <Undo2 size={20} className={`relative z-10 ${isRestoring ? 'animate-spin' : ''}`} />
                    </div>
                    <div>
                        <h4 className="text-sm font-bold text-white tracking-tight">
                            {isRestoring ? 'Restoring...' : 'Record Removed'}
                        </h4>
                        <p className="text-[10px] text-white/40 font-black uppercase tracking-widest truncate max-w-[140px]">
                            {itemName}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-1 relative z-10">
                    {!isRestoring && (
                        <>
                            <button
                                onClick={handleUndo}
                                className="px-5 py-2.5 rounded-2xl bg-white text-black text-xs font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all hover:bg-blue-50 whitespace-nowrap"
                            >
                                Undo
                            </button>
                            <button
                                onClick={onClose}
                                className="p-2 text-white/20 hover:text-white/60 transition-colors"
                            >
                                <X size={16} />
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};
