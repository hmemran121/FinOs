import React from 'react';
import { Sparkles } from 'lucide-react';

interface FloatingAIButtonProps {
    onClick: () => void;
}

const FloatingAIButton: React.FC<FloatingAIButtonProps> = ({ onClick }) => {
    return (
        <button
            onClick={onClick}
            className="fixed bottom-32 right-6 w-14 h-14 bg-gradient-to-tr from-indigo-600 to-purple-600 rounded-full flex items-center justify-center text-white shadow-[0_8px_30px_rgb(99,102,241,0.5)] z-50 hover:scale-110 active:scale-90 transition-all duration-300 group border border-white/20 backdrop-blur-md"
            aria-label="AI Assistant"
        >
            <div className="absolute inset-0 bg-white/10 rounded-full animate-pulse group-hover:animate-none" />
            <Sparkles size={24} className="relative z-10 drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]" />
        </button>
    );
};

export default FloatingAIButton;
