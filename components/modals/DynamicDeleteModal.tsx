
import React, { useState } from 'react';
import {
    AlertTriangle,
    Trash2,
    Archive,
    X,
    Info,
    ChevronRight,
    ShieldAlert
} from 'lucide-react';

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
    const [cascade, setCascade] = useState(false);
    const [groupMode, setGroupMode] = useState<'PROMOTE' | 'PURGE' | 'UNLINK'>('PROMOTE');

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            {/* Glass Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
                onClick={onClose}
            />

            {/* Modal Content */}
            <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-[#1A1C1E]/90 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in duration-300">

                {/* Header Section */}
                <div className="relative p-6 px-8 flex items-center justify-between border-b border-white/5">
                    <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500/10 text-red-500 shadow-inner">
                            <Trash2 size={24} />
                        </div>
                        <div>
                            <h3 className="text-xl font-semibold text-white/90 tracking-tight">{title}</h3>
                            <p className="text-sm text-white/40 font-medium">Delete Confirmation</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded-full p-2 text-white/30 hover:bg-white/5 hover:text-white/80 transition-all duration-200"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body Section */}
                <div className="p-8 space-y-6">
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
                            {/* Existing Dependency UI */}
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
                </div>

                {/* Footer Actions */}
                <div className="flex items-center gap-3 bg-white/[0.02] p-6 px-8 border-t border-white/5">
                    <button
                        onClick={onClose}
                        className="flex-1 rounded-2xl border border-white/10 px-4 py-4 text-[15px] font-semibold text-white/60 transition-all duration-300 hover:bg-white/5 hover:text-white"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => {
                            if (isGroupParent && onGroupConfirm) {
                                onGroupConfirm(groupMode);
                            } else {
                                onConfirm(cascade);
                            }
                        }}
                        className={`flex-[1.5] flex items-center justify-center gap-2 rounded-2xl px-4 py-4 text-[15px] font-bold text-white shadow-lg transition-all duration-300 ${cascade || groupMode === 'PURGE'
                            ? 'bg-gradient-to-r from-red-600 to-red-500 hover:shadow-red-500/20 active:scale-[0.98]'
                            : groupMode === 'UNLINK'
                                ? 'bg-gradient-to-r from-amber-600 to-amber-500 hover:shadow-amber-500/20 active:scale-[0.98]'
                                : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:shadow-blue-500/20 active:scale-[0.98]'
                            }`}
                    >
                        <span>Confirm Action</span>
                        <ChevronRight size={18} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DynamicDeleteModal;
