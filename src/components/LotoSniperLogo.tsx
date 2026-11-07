import React, { useState } from 'react';

interface LotoSniperLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  className?: string;
  glow?: boolean;
}

export const LotoSniperLogo: React.FC<LotoSniperLogoProps> = ({
  size = 'md',
  showText = true,
  className = '',
  glow = true,
}) => {
  const [imgError, setImgError] = useState(false);

  const sizeMap = {
    xs: { badge: 'w-7 h-7', text: 'text-xs', iconSize: 28 },
    sm: { badge: 'w-9 h-9', text: 'text-sm', iconSize: 36 },
    md: { badge: 'w-11 h-11', text: 'text-lg', iconSize: 44 },
    lg: { badge: 'w-16 h-16', text: 'text-2xl', iconSize: 64 },
    xl: { badge: 'w-24 h-24', text: 'text-3xl', iconSize: 96 },
  };

  const current = sizeMap[size];
  const logoSrc = '/src/assets/images/lotosniper_logo_minimal_1794056150674.jpg';

  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      {/* Precision Sniper & Mathematics Logo Badge */}
      <div
        className={`relative ${current.badge} rounded-2xl bg-black p-0.5 border border-emerald-500/40 shadow-2xl flex items-center justify-center shrink-0 overflow-hidden group ${
          glow ? 'shadow-emerald-500/20' : ''
        }`}
      >
        {!imgError ? (
          <img
            src={logoSrc}
            alt="LotoSniper Logo - Precisão Matemática"
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
            className="w-full h-full object-cover rounded-xl transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          /* SVG Minimalist Vector Fallback */
          <svg
            viewBox="0 0 100 100"
            className="w-full h-full p-1"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle cx="50" cy="50" r="42" stroke="#10b981" strokeWidth="3" opacity="0.8" />
            <circle cx="50" cy="50" r="28" stroke="#f59e0b" strokeWidth="2.5" />
            <line x1="50" y1="4" x2="50" y2="96" stroke="#10b981" strokeWidth="2" strokeDasharray="6 4" />
            <line x1="4" y1="50" x2="96" y2="50" stroke="#10b981" strokeWidth="2" strokeDasharray="6 4" />
            <circle cx="50" cy="50" r="4" fill="#fbbf24" />
            <path
              d="M 50 50 A 25 25 0 0 1 75 75 A 35 35 0 0 1 20 70"
              stroke="#10b981"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          </svg>
        )}
      </div>

      {/* Brand Typography */}
      {showText && (
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span
              className={`font-black tracking-wider text-emerald-400 font-mono ${current.text} drop-shadow-[0_0_12px_rgba(52,211,153,0.3)]`}
            >
              LOTOSNIPER
            </span>
          </div>
          <span className="text-[10px] uppercase font-semibold tracking-wider text-slate-400 font-sans -mt-0.5">
            Precisão Cirúrgica para Lotofácil
          </span>
        </div>
      )}
    </div>
  );
};
