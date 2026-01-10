import React from 'react';

interface LoadingSpinnerProps {
    size?: 'sm' | 'md' | 'lg';
    message?: string;
    fullScreen?: boolean;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
    size = 'md',
    message,
    fullScreen = false
}) => {
    const sizeClasses = {
        sm: 'w-6 h-6 border-2',
        md: 'w-12 h-12 border-4',
        lg: 'w-16 h-16 border-4'
    };

    const containerClasses = fullScreen
        ? 'fixed inset-0 flex items-center justify-center bg-[var(--bg-color)] z-50'
        : 'flex items-center justify-center p-12';

    return (
        <div className={containerClasses}>
            <div className="flex flex-col items-center gap-4">
                <div
                    className={`${sizeClasses[size]} border-blue-500/20 border-t-blue-500 rounded-full animate-spin`}
                />
                {message && (
                    <p className="text-sm font-bold text-[var(--text-muted)] uppercase tracking-widest animate-pulse">
                        {message}
                    </p>
                )}
            </div>
        </div>
    );
};

export default LoadingSpinner;
