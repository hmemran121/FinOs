import React, { useRef, useState } from 'react';

interface HolographicCardProps {
    children: React.ReactNode;
    className?: string;
    style?: React.CSSProperties;
    onClick?: () => void;
}

export const HolographicCard: React.FC<HolographicCardProps> = ({ children, className, style, onClick }) => {
    const ref = useRef<HTMLDivElement>(null);
    const [transform, setTransform] = useState('');
    const [glare, setGlare] = useState('opacity-0');
    const [glarePosition, setGlarePosition] = useState({ x: 0, y: 0 });

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!ref.current) return;
        const rect = ref.current.getBoundingClientRect();

        const width = rect.width;
        const height = rect.height;

        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const xPct = mouseX / width - 0.5;
        const yPct = mouseY / height - 0.5;

        // Calculate rotation (max 15deg)
        const rotateY = xPct * 30; // 15 * 2
        const rotateX = -yPct * 30; // Invert Y axis

        setTransform(`perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`);

        // Glare logic
        setGlarePosition({ x: mouseX, y: mouseY });
        setGlare('opacity-100');
    };

    const handleMouseLeave = () => {
        setTransform('perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)');
        setGlare('opacity-0');
    };

    return (
        <div
            ref={ref}
            onClick={onClick}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            style={{
                transform,
                transition: 'transform 0.1s ease-out', // Smooth movement
                ...style
            }}
            className={`relative transform-gpu will-change-transform ${className}`}
        >
            {/* Base Content */}
            <div className="relative z-10 h-full w-full">
                {children}
            </div>

            {/* Glare Overlay */}
            <div
                className={`absolute inset-0 z-20 pointer-events-none transition-opacity duration-300 ${glare} mix-blend-overlay rounded-[inherit]`}
                style={{
                    background: `radial-gradient(circle at ${glarePosition.x}px ${glarePosition.y}px, rgba(255,255,255,0.4) 0%, transparent 60%)`
                }}
            />

            {/* Border Shine */}
            <div className="absolute inset-0 rounded-[inherit] ring-1 ring-white/10 group-hover:ring-white/30 transition-all pointer-events-none z-30" />
        </div>
    );
};
