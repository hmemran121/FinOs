
import React from 'react';

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const GlassCard: React.FC<GlassCardProps> = ({ children, className = '', onClick, style, ...props }) => {
  return (
    <div
      onClick={onClick}
      style={style}
      {...props}
      className={`glass rounded-[32px] p-6 shadow-2xl transition-all duration-300 hover:shadow-blue-500/5 active:scale-[0.98] group ${className}`}
    >
      {children}
    </div>
  );
};

export const NeumorphButton: React.FC<{ children: React.ReactNode; onClick?: () => void; className?: string }> = ({ children, onClick, className = '' }) => {
  return (
    <button
      onClick={onClick}
      className={`bg-[#141416] shadow-[4px_4px_8px_#000,-2px_-2px_6px_rgba(255,255,255,0.02)] rounded-2xl p-4 active:shadow-inner transition-all flex items-center justify-center gap-2 ${className}`}
    >
      {children}
    </button>
  );
};
