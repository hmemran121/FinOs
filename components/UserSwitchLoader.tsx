import React from 'react';
import { Loader2, Shield, Database, Cloud, CheckCircle } from 'lucide-react';

interface UserSwitchLoaderProps {
    currentStep: 'checking' | 'saving' | 'cleaning' | 'loading' | 'complete';
    oldUserEmail?: string;
    newUserEmail?: string;
}

/**
 * UserSwitchLoader - Professional loading screen during user switch
 * 
 * International Standard: Clear user feedback during security operations
 * Used by: Banking apps, Secure messaging apps
 * 
 * Shows:
 * - Current operation step
 * - Progress indicator
 * - Security reassurance messages
 */
const UserSwitchLoader: React.FC<UserSwitchLoaderProps> = ({
    currentStep,
    oldUserEmail,
    newUserEmail
}) => {
    const steps = [
        {
            key: 'checking',
            icon: Shield,
            label: 'Verifying Security',
            description: 'Checking user credentials'
        },
        {
            key: 'saving',
            icon: Cloud,
            label: 'Saving Your Work',
            description: 'Uploading pending changes'
        },
        {
            key: 'cleaning',
            icon: Database,
            label: 'Securing Data',
            description: 'Clearing local storage'
        },
        {
            key: 'loading',
            icon: Loader2,
            label: 'Loading Profile',
            description: 'Downloading your data'
        },
        {
            key: 'complete',
            icon: CheckCircle,
            label: 'Complete',
            description: 'Welcome back!'
        }
    ];

    const currentStepIndex = steps.findIndex(s => s.key === currentStep);
    const CurrentIcon = steps[currentStepIndex]?.icon || Loader2;

    return (
        <div className="fixed inset-0 z-[200] bg-zinc-950 flex items-center justify-center">
            <div className="text-center space-y-6 max-w-md px-6">
                {/* Animated Icon */}
                <div className="relative mx-auto w-24 h-24">
                    {/* Glow effect */}
                    <div className="absolute inset-0 bg-indigo-500/20 rounded-full blur-2xl animate-pulse" />

                    {/* Icon container */}
                    <div className="relative w-24 h-24 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-full flex items-center justify-center shadow-2xl shadow-indigo-500/50">
                        <CurrentIcon
                            className={`w-12 h-12 text-white ${currentStep === 'loading' || currentStep === 'checking' ? 'animate-spin' : ''}`}
                        />
                    </div>
                </div>

                {/* Title */}
                <div>
                    <h3 className="text-2xl font-black text-white mb-2">
                        Switching Users
                    </h3>
                    <p className="text-sm text-zinc-400">
                        {oldUserEmail && newUserEmail && (
                            <>
                                <span className="text-zinc-500">{oldUserEmail}</span>
                                {' → '}
                                <span className="text-indigo-400">{newUserEmail}</span>
                            </>
                        )}
                    </p>
                </div>

                {/* Progress Steps */}
                <div className="space-y-3">
                    {steps.slice(0, -1).map((step, index) => {
                        const StepIcon = step.icon;
                        const isActive = index === currentStepIndex;
                        const isComplete = index < currentStepIndex;

                        return (
                            <div
                                key={step.key}
                                className={`flex items-center gap-4 p-4 rounded-xl transition-all duration-300 ${isActive
                                        ? 'bg-indigo-500/10 border border-indigo-500/30'
                                        : isComplete
                                            ? 'bg-emerald-500/10 border border-emerald-500/30'
                                            : 'bg-zinc-900/50 border border-zinc-800'
                                    }`}
                            >
                                {/* Icon */}
                                <div
                                    className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${isActive
                                            ? 'bg-indigo-600 text-white'
                                            : isComplete
                                                ? 'bg-emerald-600 text-white'
                                                : 'bg-zinc-800 text-zinc-600'
                                        }`}
                                >
                                    {isComplete ? (
                                        <CheckCircle size={20} />
                                    ) : (
                                        <StepIcon size={20} className={isActive ? 'animate-pulse' : ''} />
                                    )}
                                </div>

                                {/* Text */}
                                <div className="flex-1 text-left">
                                    <p
                                        className={`text-sm font-bold ${isActive
                                                ? 'text-indigo-400'
                                                : isComplete
                                                    ? 'text-emerald-400'
                                                    : 'text-zinc-600'
                                            }`}
                                    >
                                        {step.label}
                                    </p>
                                    <p className="text-xs text-zinc-500">{step.description}</p>
                                </div>

                                {/* Status indicator */}
                                {isActive && (
                                    <div className="flex gap-1">
                                        <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-pulse" />
                                        <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-pulse delay-75" />
                                        <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-pulse delay-150" />
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Security Message */}
                <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl">
                    <div className="flex items-start gap-3">
                        <Shield size={16} className="text-emerald-400 flex-shrink-0 mt-0.5" />
                        <div className="text-left">
                            <p className="text-xs font-bold text-emerald-400 mb-1">
                                Your Data is Secure
                            </p>
                            <p className="text-[10px] text-zinc-500 leading-relaxed">
                                We're ensuring complete privacy by clearing the previous user's data from this device.
                                All changes have been safely saved to the cloud.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Estimated time */}
                <p className="text-[10px] text-zinc-600 uppercase tracking-wider">
                    This usually takes 2-3 seconds
                </p>
            </div>
        </div>
    );
};

export default UserSwitchLoader;
