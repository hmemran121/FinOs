import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, AlertCircle, XCircle, Info, X } from 'lucide-react';

export type FeedbackType = 'success' | 'error' | 'info' | 'warning';

interface FeedbackOverlayProps {
    isVisible: boolean;
    message: string;
    type: FeedbackType;
    onClose: () => void;
    persistent?: boolean;
    position?: 'top' | 'center' | 'bottom';
}

const FeedbackOverlay: React.FC<FeedbackOverlayProps> = ({
    isVisible,
    message,
    type,
    onClose,
    persistent = false,
    position = 'top'
}) => {
    const [shouldRender, setShouldRender] = useState(false);

    useEffect(() => {
        if (isVisible) {
            setShouldRender(true);

            // Only auto-dismiss if NOT persistent
            if (!persistent) {
                const timer = setTimeout(() => {
                    onClose();
                }, 3000); // 3 seconds for regular toasts
                return () => clearTimeout(timer);
            }
        } else {
            const timer = setTimeout(() => setShouldRender(false), 500); // Wait for exit anim
            return () => clearTimeout(timer);
        }
    }, [isVisible, onClose, persistent]);

    // Global click listener to dismiss (Non-persistent only)
    useEffect(() => {
        if (!isVisible || persistent) return;

        let clickListener: ((e: MouseEvent) => void) | null = null;

        // Delay attaching the listener to avoid catching the click that OPENED the overlay
        const attachTimer = setTimeout(() => {
            clickListener = (e: MouseEvent) => {
                // Ensure the click target is NOT inside the feedback overlay itself
                const target = e.target as HTMLElement;
                if (target.closest('.feedback-overlay-content')) return;

                onClose();
            };
            window.addEventListener('click', clickListener);
        }, 100);

        return () => {
            clearTimeout(attachTimer);
            if (clickListener) window.removeEventListener('click', clickListener);
        };
    }, [isVisible, onClose, persistent]);


    if (!shouldRender) return null;

    // Premium Aesthetics Configuration
    const styles = {
        success: {
            container: 'bg-gradient-to-br from-emerald-950/95 via-[#022c22]/95 to-black/95 border-emerald-500/30 shadow-[0_10px_40px_-10px_rgba(16,185,129,0.3)]',
            iconBg: 'bg-emerald-500/20 border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.2)]',
            iconColor: 'text-emerald-400',
            titleColor: 'text-emerald-400',
            messageColor: 'text-emerald-50',
            glow: 'from-emerald-500/20',
            bar: 'bg-emerald-500'
        },
        error: {
            container: 'bg-gradient-to-br from-rose-950/95 via-[#4c0519]/95 to-black/95 border-rose-500/30 shadow-[0_10px_40px_-10px_rgba(244,63,94,0.3)]',
            iconBg: 'bg-rose-500/20 border-rose-500/30 shadow-[0_0_15px_rgba(244,63,94,0.2)]',
            iconColor: 'text-rose-400',
            titleColor: 'text-rose-400',
            messageColor: 'text-rose-50',
            glow: 'from-rose-500/20',
            bar: 'bg-rose-500'
        },
        warning: {
            container: 'bg-gradient-to-br from-amber-950/95 via-[#451a03]/95 to-black/95 border-amber-500/30 shadow-[0_10px_40px_-10px_rgba(245,158,11,0.3)]',
            iconBg: 'bg-amber-500/20 border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.2)]',
            iconColor: 'text-amber-400',
            titleColor: 'text-amber-400',
            messageColor: 'text-amber-50',
            glow: 'from-amber-500/20',
            bar: 'bg-amber-500'
        },
        info: {
            container: 'bg-gradient-to-br from-blue-950/95 via-[#172554]/95 to-black/95 border-blue-500/30 shadow-[0_10px_40px_-10px_rgba(59,130,246,0.3)]',
            iconBg: 'bg-blue-500/20 border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.2)]',
            iconColor: 'text-blue-400',
            titleColor: 'text-blue-400',
            messageColor: 'text-blue-50',
            glow: 'from-blue-500/20',
            bar: 'bg-blue-500'
        }
    };

    const currentStyle = styles[type];

    const icons = {
        success: <CheckCircle2 size={28} className={currentStyle.iconColor} strokeWidth={2.5} />,
        error: <XCircle size={28} className={currentStyle.iconColor} strokeWidth={2.5} />,
        info: <Info size={28} className={currentStyle.iconColor} strokeWidth={2.5} />,
        warning: <AlertCircle size={28} className={currentStyle.iconColor} strokeWidth={2.5} />,
    };

    // Dynamic positioning classes
    const positionClasses = {
        top: 'items-start sm:items-start pt-6',
        center: 'items-center justify-center p-6',
        bottom: 'items-end sm:items-end pb-6'
    };

    return createPortal(
        <div style={{ zIndex: 99999 }} className={`fixed inset-0 flex justify-center pointer-events-none ${positionClasses[position] || positionClasses.top}`}>
            {/* Backdrop for persistent modal feel */}
            {persistent && (
                <div
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-500 cursor-pointer pointer-events-auto"
                    onClick={onClose}
                />
            )}

            <div
                style={{ zIndex: 99999 }}
                className={`
          feedback-overlay-content
          pointer-events-auto
          relative overflow-hidden
          backdrop-blur-xl
          border
          p-5 pr-8
          rounded-[24px]
          flex items-center gap-5
          transform transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]
          ${isVisible ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-[-20px] opacity-0 scale-95'}
          min-w-[340px]
          max-w-md
          z-[99999]
          ${currentStyle.container}
        `}
            >
                {/* Decorative Side Bar */}
                <div className={`absolute left-0 top-0 bottom-0 w-1 ${currentStyle.bar}`} />

                {/* Ambient Glow */}
                <div className={`absolute -left-10 -top-10 w-40 h-40 rounded-full bg-gradient-to-br ${currentStyle.glow} to-transparent blur-[50px] opacity-60`} />

                {/* Icon Container */}
                <div className={`
          relative z-10
          w-14 h-14 rounded-2xl 
          flex items-center justify-center
          shrink-0
          ${currentStyle.iconBg}
        `}>
                    {icons[type]}
                </div>

                {/* Text Content */}
                <div className="flex flex-col relative z-10 flex-1">
                    <h4 className={`text-sm font-black uppercase tracking-widest opacity-90 ${currentStyle.titleColor} mb-0.5`}>
                        {type === 'success' ? 'Success' : type === 'error' ? 'Failed' : type === 'warning' ? 'Attention' : 'Notice'}
                    </h4>
                    <p className={`font-bold text-sm leading-snug ${currentStyle.messageColor}`}>
                        {message}
                    </p>
                </div>

                {/* Explicit Close Button (for clarity) */}
                {persistent && (
                    <button
                        onClick={(e) => { e.stopPropagation(); onClose(); }}
                        className="relative z-10 p-2 hover:bg-white/10 rounded-full transition-colors ml-auto"
                    >
                        <X size={18} className={`${currentStyle.messageColor} opacity-50 hover:opacity-100 transition-opacity`} />
                    </button>
                )}
            </div>
        </div>,
        document.body
    );
};

export default FeedbackOverlay;
