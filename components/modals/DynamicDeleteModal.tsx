import React, { useState, useEffect } from 'react';
import {
    AlertTriangle,
    Trash2,
    Archive,
    X,
    Info,
    ChevronRight,
    ShieldAlert,
    Loader2,
    Check
} from 'lucide-react';
import { useFinance } from '../../store/FinanceContext';

interface DynamicDeleteModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (cascade: boolean) => void;
    title: string;
    itemName: string;
    itemType: 'wallet' | 'transaction' | 'commitment' | 'budget' | 'category' | 'plan' | 'component' | 'settlement';
    hasDependencies: boolean;
    dependencyText?: string;
    // Group-specific extras
    isGroupParent?: boolean;
    isGroupChild?: boolean;
    groupMemberCount?: number;
    onGroupConfirm?: (mode: 'PROMOTE' | 'PURGE' | 'UNLINK') => void;
}

const DynamicDeleteModal: React.FC<DynamicDeleteModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    itemName,
    itemType,
    hasDependencies,
    dependencyText,
    isGroupParent,
    isGroupChild,
    groupMemberCount = 0,
    onGroupConfirm
}) => {
    const { deleteProgress } = useFinance();
    const [cascade, setCascade] = useState(false);
    const [groupMode, setGroupMode] = useState<'PROMOTE' | 'PURGE' | 'UNLINK'>('PROMOTE');

    // Safety fallback for deleteProgress to prevent "isDeleting" undefined error
    const safeProgress = deleteProgress || {
        total: 0,
        current: 0,
        itemName: '',
        isDeleting: false,
        status: ''
    };

    const isProcessing = safeProgress.isDeleting;
    const progressPercent = safeProgress.total > 0
        ? Math.min((safeProgress.current / safeProgress.total) * 100, 100)
        : 0;

    // Reset local state when modal opens
    useEffect(() => {
        if (isOpen) {
            setCascade(false);
            setIsStickySuccess(false);
        }
    }, [isOpen]);

    // Auto-close when deletion is finished
    const [wasProcessing, setWasProcessing] = useState(false);
    const [isStickySuccess, setIsStickySuccess] = useState(false);
    useEffect(() => {
        if (wasProcessing && !isProcessing && isOpen) {
            setIsStickySuccess(true);
            const timer = setTimeout(() => {
                onClose();
            }, 600); // reduced delay for snappiness
            return () => clearTimeout(timer);
        }
        setWasProcessing(isProcessing);
    }, [isProcessing, isOpen, onClose, wasProcessing]);

    if (!isOpen) return null;

    const showProgressUI = isProcessing || isStickySuccess;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            {/* Glass Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
                onClick={!showProgressUI ? onClose : undefined}
            />

            {/* Modal Content */}
            <div className={`relative w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-[#1A1C1E]/90 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in duration-300 
                ${isProcessing ? 'animate-haptic-shake' : ''} 
                ${isStickySuccess ? 'animate-bounce-short' : ''}
                ${!isOpen ? 'animate-particle-blast' : ''}`}>

                {/* Header Section */}
                <div className="relative p-6 px-8 flex items-center justify-between border-b border-white/5">
                    <div className="flex items-center gap-4">
                        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${showProgressUI ? 'bg-blue-500/10 text-blue-500' : 'bg-red-500/10 text-red-500'} shadow-inner transition-colors duration-500`}>
                            {showProgressUI ? <Loader2 size={24} className="animate-spin" /> : <Trash2 size={24} />}
                        </div>
                        <div>
                            <h3 className="text-xl font-semibold text-white/90 tracking-tight">
                                {showProgressUI ? (isStickySuccess ? 'Operations Complete' : 'Deleting records...') : title}
                            </h3>
                            <p className="text-sm text-white/40 font-medium">
                                {showProgressUI ? (isStickySuccess ? 'Storage synchronized' : safeProgress.status) : 'Delete Confirmation'}
                            </p>
                        </div>
                    </div>
                    {!showProgressUI && (
                        <button
                            onClick={onClose}
                            className="rounded-full p-2 text-white/30 hover:bg-white/5 hover:text-white/80 transition-all duration-200"
                        >
                            <X size={20} />
                        </button>
                    )}
                </div>

                {/* Body Section */}
                <div className="p-8 space-y-6">
                    {showProgressUI ? (
                        <div className="space-y-8 py-4 animate-in fade-in duration-500">
                            {/* Liquid Progress Bar */}
                            <div className="relative h-6 w-full overflow-hidden rounded-2xl bg-white/[0.03] border border-white/10 p-1 shadow-inner">
                                <div
                                    className="relative h-full rounded-xl bg-gradient-to-r from-blue-600 via-indigo-500 to-blue-400 transition-all duration-700 ease-out shadow-[0_0_20px_rgba(59,130,246,0.3)] overflow-hidden"
                                    style={{ width: `${isStickySuccess ? 100 : progressPercent}%` }}
                                >
                                    {/* Liquid Wave Effect */}
                                    <div className="absolute inset-0 opacity-30 animate-pulse bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-repeat-x" />
                                    <div className="absolute top-0 bottom-0 left-0 w-full bg-gradient-to-t from-white/10 to-transparent" />
                                </div>
                                {/* Refraction Shine */}
                                <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
                            </div>

                            <div className="flex flex-col items-center gap-1 text-center">
                                <div className="text-5xl font-black text-white tracking-tighter tabular-nums">
                                    {isStickySuccess ? 100 : Math.round(progressPercent)}%
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className={`h-1.5 w-1.5 rounded-full ${isStickySuccess ? 'bg-green-400' : 'bg-blue-400 animate-ping'}`} />
                                    <p className="text-[10px] text-white/40 uppercase tracking-[0.3em] font-black">
                                        Vault Synchronization {isStickySuccess ? 'Verified' : 'Active'}
                                    </p>
                                </div>
                            </div>

                            {/* Live Audit Feed (Terminal Style) */}
                            <div className="rounded-2xl bg-black/40 border border-white/5 p-4 font-mono text-[9px] h-32 overflow-hidden relative shadow-inner group">
                                <div className="absolute top-0 right-0 p-2 opacity-20 group-hover:opacity-100 transition-opacity">
                                    <div className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-sans font-black text-[7px] uppercase tracking-widest">Live Feed</div>
                                </div>
                                <div className="flex flex-col gap-1.5 animate-in slide-in-from-bottom-4 duration-300">
                                    {(safeProgress as any).auditLog?.slice(-4).map((log: string, i: number) => (
                                        <div key={i} className={`flex gap-3 items-center ${i === ((safeProgress as any).auditLog?.slice(-4).length - 1) ? 'text-white/80' : 'text-white/20'}`}>
                                            <span className="text-blue-500/50">[{new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}]</span>
                                            <span className="truncate">{log}</span>
                                        </div>
                                    ))}
                                    {!isStickySuccess && <div className="w-1 h-3 bg-blue-500/40 animate-pulse ml-16" />}
                                </div>
                                {/* Bottom vignette for depth */}
                                <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="space-y-3">
                                <p className="text-white/70 leading-relaxed text-[15px]">
                                    You are about to remove <span className="text-white font-semibold underline decoration-red-500/30 underline-offset-4">{itemName}</span> from your records. This action will be synchronized across all your devices.
                                </p>

                                {hasDependencies && itemType !== 'component' && (
                                    <div className="flex items-start gap-3 rounded-2xl bg-amber-500/5 p-4 border border-amber-500/10">
                                        <AlertTriangle className="mt-1 flex-shrink-0 text-amber-500" size={18} />
                                        <p className="text-sm text-amber-200/60 leading-relaxed italic">
                                            {dependencyText || "This item is linked to other records. How do you want to handle them?"}
                                        </p>
                                    </div>
                                )}

                                {isGroupChild && (
                                    <div className="flex items-start gap-3 rounded-2xl bg-blue-500/5 p-4 border border-blue-500/10 animate-in slide-in-from-top-2 duration-500">
                                        <Info className="mt-1 flex-shrink-0 text-blue-400" size={18} />
                                        <p className="text-sm text-blue-200/60 leading-relaxed italic">
                                            This is a **Group Reference** item. Deleting it will simply remove it from its parent group.
                                        </p>
                                    </div>
                                )}

                                {isGroupParent && (
                                    <div className="flex items-start gap-3 rounded-2xl bg-amber-500/5 p-4 border border-amber-500/10 animate-in slide-in-from-top-2 duration-500">
                                        <AlertTriangle className="mt-1 flex-shrink-0 text-amber-500" size={18} />
                                        <p className="text-sm text-amber-200/60 leading-relaxed italic">
                                            This is a **Group Parent** with {groupMemberCount} {groupMemberCount === 1 ? 'member' : 'members'}. How should we handle the group?
                                        </p>
                                    </div>
                                )}
                            </div>

                            {hasDependencies && itemType !== 'component' && (
                                <div className="space-y-3">
                                    <label
                                        className={`group relative flex cursor-pointer items-center justify-between gap-4 rounded-2xl border p-5 transition-all duration-300 ${!cascade
                                            ? 'border-blue-500/30 bg-blue-500/5 ring-1 ring-blue-500/20'
                                            : 'border-white/5 bg-white/[0.02] hover:bg-white/[0.04]'
                                            }`}
                                        onClick={() => setCascade(false)}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={`flex h-10 w-10 items-center justify-center rounded-xl transition-colors duration-300 ${!cascade ? 'bg-blue-500/20 text-blue-400' : 'bg-white/5 text-white/30'}`}>
                                                <Archive size={20} />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className={`font-semibold tracking-wide ${!cascade ? 'text-blue-100' : 'text-white/50'}`}>Just De-link</span>
                                                <span className="text-xs text-white/30 mt-0.5">Keep related records as orphans</span>
                                            </div>
                                        </div>
                                        <div className={`h-5 w-5 rounded-full border-2 transition-all duration-300 flex items-center justify-center ${!cascade ? 'border-blue-500 bg-blue-500' : 'border-white/10'}`}>
                                            {!cascade && <div className="h-2 w-2 rounded-full bg-white" />}
                                        </div>
                                    </label>

                                    <label
                                        className={`group relative flex cursor-pointer items-center justify-between gap-4 rounded-2xl border p-5 transition-all duration-300 ${cascade
                                            ? 'border-red-500/30 bg-red-500/5 ring-1 ring-red-500/20'
                                            : 'border-white/5 bg-white/[0.02] hover:bg-white/[0.04]'
                                            }`}
                                        onClick={() => setCascade(true)}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={`flex h-10 w-10 items-center justify-center rounded-xl transition-colors duration-300 ${cascade ? 'bg-red-500/20 text-red-400' : 'bg-white/5 text-white/30'}`}>
                                                <ShieldAlert size={20} />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className={`font-semibold tracking-wide ${cascade ? 'text-red-100' : 'text-white/50'}`}>Deep Sweep</span>
                                                <span className="text-xs text-white/30 mt-0.5">Delete all linked history permanently</span>
                                            </div>
                                        </div>
                                        <div className={`h-5 w-5 rounded-full border-2 transition-all duration-300 flex items-center justify-center ${cascade ? 'border-red-500 bg-red-500' : 'border-white/10'}`}>
                                            {cascade && <div className="h-2 w-2 rounded-full bg-white" />}
                                        </div>
                                    </label>
                                </div>
                            )}

                            {isGroupParent && (
                                <div className="space-y-3">
                                    <label
                                        className={`group relative flex cursor-pointer items-center justify-between gap-4 rounded-2xl border p-4 transition-all duration-300 ${groupMode === 'PROMOTE'
                                            ? 'border-blue-500/30 bg-blue-500/5 ring-1 ring-blue-500/20'
                                            : 'border-white/5 bg-white/[0.02] hover:bg-white/[0.04]'
                                            }`}
                                        onClick={() => setGroupMode('PROMOTE')}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`flex h-10 w-10 items-center justify-center rounded-xl transition-colors duration-300 ${groupMode === 'PROMOTE' ? 'bg-blue-500/20 text-blue-400' : 'bg-white/5 text-white/30'}`}>
                                                <ChevronRight size={20} />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className={`font-semibold text-xs tracking-wide ${groupMode === 'PROMOTE' ? 'text-blue-100' : 'text-white/50'}`}>Promote Sibling</span>
                                                <span className="text-[10px] text-white/30 mt-0.5">Next member becomes the parent</span>
                                            </div>
                                        </div>
                                        <div className={`h-4 w-4 rounded-full border-2 transition-all duration-300 flex items-center justify-center ${groupMode === 'PROMOTE' ? 'border-blue-500 bg-blue-500' : 'border-white/10'}`}>
                                            {groupMode === 'PROMOTE' && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                                        </div>
                                    </label>

                                    <label
                                        className={`group relative flex cursor-pointer items-center justify-between gap-4 rounded-2xl border p-4 transition-all duration-300 ${groupMode === 'PURGE'
                                            ? 'border-red-500/30 bg-red-500/5 ring-1 ring-red-500/20'
                                            : 'border-white/5 bg-white/[0.02] hover:bg-white/[0.04]'
                                            }`}
                                        onClick={() => setGroupMode('PURGE')}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`flex h-10 w-10 items-center justify-center rounded-xl transition-colors duration-300 ${groupMode === 'PURGE' ? 'bg-red-500/20 text-red-400' : 'bg-white/5 text-white/30'}`}>
                                                <AlertTriangle size={20} />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className={`font-semibold text-xs tracking-wide ${groupMode === 'PURGE' ? 'text-red-100' : 'text-white/50'}`}>Purge Entire Group</span>
                                                <span className="text-[10px] text-white/30 mt-0.5">Delete all linked members too</span>
                                            </div>
                                        </div>
                                        <div className={`h-4 w-4 rounded-full border-2 transition-all duration-300 flex items-center justify-center ${groupMode === 'PURGE' ? 'border-red-500 bg-red-500' : 'border-white/10'}`}>
                                            {groupMode === 'PURGE' && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                                        </div>
                                    </label>

                                    <label
                                        className={`group relative flex cursor-pointer items-center justify-between gap-4 rounded-2xl border p-4 transition-all duration-300 ${groupMode === 'UNLINK'
                                            ? 'border-amber-500/30 bg-amber-500/5 ring-1 ring-amber-500/20'
                                            : 'border-white/5 bg-white/[0.02] hover:bg-white/[0.04]'
                                            }`}
                                        onClick={() => setGroupMode('UNLINK')}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`flex h-10 w-10 items-center justify-center rounded-xl transition-colors duration-300 ${groupMode === 'UNLINK' ? 'bg-amber-500/20 text-amber-400' : 'bg-white/5 text-white/30'}`}>
                                                <Archive size={20} />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className={`font-semibold text-xs tracking-wide ${groupMode === 'UNLINK' ? 'text-amber-100' : 'text-white/50'}`}>Just Unlink</span>
                                                <span className="text-[10px] text-white/30 mt-0.5">Items stay as independent records</span>
                                            </div>
                                        </div>
                                        <div className={`h-4 w-4 rounded-full border-2 transition-all duration-300 flex items-center justify-center ${groupMode === 'UNLINK' ? 'border-amber-500 bg-amber-500' : 'border-white/10'}`}>
                                            {groupMode === 'UNLINK' && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                                        </div>
                                    </label>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="flex items-center gap-3 bg-white/[0.02] p-6 px-8 border-t border-white/5">
                    {!showProgressUI && (
                        <button
                            onClick={onClose}
                            className="flex-1 rounded-2xl border border-white/10 px-4 py-4 text-[15px] font-semibold text-white/60 transition-all duration-300 hover:bg-white/5 hover:text-white"
                        >
                            Cancel
                        </button>
                    )}
                    <button
                        onClick={() => {
                            if (showProgressUI) return;
                            if (isGroupParent && onGroupConfirm) {
                                onGroupConfirm(groupMode);
                            } else {
                                onConfirm(cascade);
                            }
                        }}
                        disabled={showProgressUI}
                        className={`flex-[1.5] flex items-center justify-center gap-2 rounded-2xl px-4 py-4 text-[15px] font-bold text-white shadow-lg transition-all duration-300 ${showProgressUI
                            ? 'bg-blue-600/50 cursor-not-allowed'
                            : (cascade || groupMode === 'PURGE'
                                ? 'bg-gradient-to-r from-red-600 to-red-500 hover:shadow-red-500/20 active:scale-[0.98]'
                                : groupMode === 'UNLINK'
                                    ? 'bg-gradient-to-r from-amber-600 to-amber-500 hover:shadow-amber-500/20 active:scale-[0.98]'
                                    : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:shadow-blue-500/20 active:scale-[0.98]')
                            }`}
                    >
                        <span>{showProgressUI ? (isStickySuccess ? 'Completed' : 'Deleting...') : 'Confirm Action'}</span>
                        {!showProgressUI && <ChevronRight size={18} />}
                        {showProgressUI && !isStickySuccess && <Loader2 size={18} className="animate-spin" />}
                        {isStickySuccess && <Check size={18} className="text-green-400" />}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DynamicDeleteModal;
