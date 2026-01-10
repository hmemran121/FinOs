import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error?: Error;
    errorInfo?: ErrorInfo;
}

/**
 * Error Boundary Component
 * Catches React errors and displays a fallback UI instead of crashing the app
 */
class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error: Error): State {
        // Update state so the next render will show the fallback UI
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        // Log error to console (will be removed in production by Vite)
        console.error('🚨 [ErrorBoundary] Caught error:', error);
        console.error('📍 [ErrorBoundary] Component stack:', errorInfo.componentStack);

        // Store error info in state
        this.setState({ errorInfo });

        // TODO: Send to error tracking service in production
        // Example: Sentry.captureException(error, { extra: errorInfo });
    }

    handleReset = () => {
        this.setState({ hasError: false, error: undefined, errorInfo: undefined });
        window.location.reload();
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-[var(--bg-color)] flex items-center justify-center p-6">
                    <div className="max-w-md w-full">
                        <div className="bg-[var(--surface-glass)] border border-[var(--border-glass)] rounded-3xl p-8 text-center backdrop-blur-xl">
                            {/* Icon */}
                            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
                                <AlertTriangle size={40} className="text-rose-500" />
                            </div>

                            {/* Title */}
                            <h1 className="text-2xl font-black text-[var(--text-main)] mb-3 tracking-tight">
                                Something Went Wrong
                            </h1>

                            {/* Error Message */}
                            <p className="text-[var(--text-muted)] mb-6 leading-relaxed">
                                {this.state.error?.message || 'An unexpected error occurred. Please try reloading the app.'}
                            </p>

                            {/* Error Details (Development Only) */}
                            {import.meta.env.MODE === 'development' && this.state.error && (
                                <details className="mb-6 text-left">
                                    <summary className="cursor-pointer text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest mb-2">
                                        Technical Details
                                    </summary>
                                    <div className="bg-[var(--surface-deep)] border border-[var(--border-glass)] rounded-2xl p-4 overflow-auto max-h-48">
                                        <pre className="text-xs text-rose-400 font-mono whitespace-pre-wrap">
                                            {this.state.error.stack}
                                        </pre>
                                    </div>
                                </details>
                            )}

                            {/* Actions */}
                            <div className="flex flex-col gap-3">
                                <button
                                    onClick={this.handleReset}
                                    className="w-full px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-sm shadow-lg hover:shadow-xl transition-all active:scale-95"
                                >
                                    Reload App
                                </button>

                                <button
                                    onClick={() => window.history.back()}
                                    className="w-full px-6 py-3 bg-[var(--surface-deep)] border border-[var(--border-glass)] text-[var(--text-main)] rounded-2xl font-bold text-sm transition-all active:scale-95"
                                >
                                    Go Back
                                </button>
                            </div>

                            {/* Support Info */}
                            <p className="mt-6 text-xs text-[var(--text-muted)] opacity-60">
                                If this problem persists, please contact support
                            </p>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
