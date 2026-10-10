import React from 'react';

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
  const sizeMap = {
    xs: { badge: 'w-7 h-7', text: 'text-xs', iconSize: 28 },
    sm: { badge: 'w-9 h-9', text: 'text-sm', iconSize: 36 },
    md: { badge: 'w-11 h-11', text: 'text-lg', iconSize: 44 },
    lg: { badge: 'w-16 h-16', text: 'text-2xl', iconSize: 64 },
    xl: { badge: 'w-24 h-24', text: 'text-3xl', iconSize: 96 },
  };

  const current = sizeMap[size];

  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      {/* Target Badge Icon */}
      <div
        className={`relative ${current.badge} rounded-2xl bg-gradient-to-b from-slate-900 via-slate-950 to-black p-1 border border-slate-700/80 shadow-2xl flex items-center justify-center shrink-0 overflow-hidden ${
          glow ? 'shadow-emerald-500/10' : ''
        }`}
      >
        {/* Ambient Subtle Glow */}
        <div className="absolute inset-0 bg-radial from-emerald-500/10 via-transparent to-transparent pointer-events-none" />

        {/* Vector Sniper Emblem SVG matching user attachment */}
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Ball Gradient */}
            <radialGradient id="ballGradient" cx="35%" cy="30%" r="65%">
              <stop offset="0%" stopColor="#c084fc" />
              <stop offset="35%" stopColor="#9333ea" />
              <stop offset="85%" stopColor="#581c87" />
              <stop offset="100%" stopColor="#3b0764" />
            </radialGradient>

            {/* Reticle Red Gradient */}
            <linearGradient id="reticleRed" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f87171" />
              <stop offset="50%" stopColor="#dc2626" />
              <stop offset="100%" stopColor="#991b1b" />
            </linearGradient>

            {/* Reticle Green Gradient */}
            <linearGradient id="reticleGreen" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#34d399" />
              <stop offset="100%" stopColor="#047857" />
            </linearGradient>

            {/* Laser Dot Glow */}
            <radialGradient id="laserGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="25%" stopColor="#ff0000" />
              <stop offset="60%" stopColor="#dc2626" />
              <stop offset="100%" stopColor="transparent" />
            </radialGradient>
          </defs>

          {/* Outer Reticle Ring (Reddish Crimson) */}
          <circle
            cx="50"
            cy="50"
            r="40"
            stroke="url(#reticleRed)"
            strokeWidth="3.5"
            strokeDasharray="40 10 40 10"
            opacity="0.9"
          />

          {/* Inner Reticle Ring (Emerald Green) */}
          <circle
            cx="50"
            cy="50"
            r="32"
            stroke="url(#reticleGreen)"
            strokeWidth="3"
            opacity="0.85"
          />

          {/* Crosshairs Lines */}
          <line x1="50" y1="2" x2="50" y2="28" stroke="url(#reticleRed)" strokeWidth="3" strokeLinecap="round" />
          <line x1="50" y1="72" x2="50" y2="98" stroke="url(#reticleRed)" strokeWidth="3" strokeLinecap="round" />
          <line x1="2" y1="50" x2="28" y2="50" stroke="url(#reticleRed)" strokeWidth="3" strokeLinecap="round" />
          <line x1="72" y1="50" x2="98" y2="50" stroke="url(#reticleRed)" strokeWidth="3" strokeLinecap="round" />

          {/* Central Glossy Purple Lottery Ball */}
          <circle cx="50" cy="50" r="23" fill="url(#ballGradient)" />

          {/* Ball Specular Highlight Arc */}
          <path
            d="M 33 40 A 20 20 0 0 1 67 40"
            stroke="#ffffff"
            strokeWidth="1.8"
            strokeLinecap="round"
            opacity="0.35"
          />

          {/* Lucky Four-Leaf Clover on upper left of ball */}
          <g transform="translate(33, 31) scale(0.65)">
            {/* Top Leaf */}
            <circle cx="0" cy="-4" r="3.2" fill="#22c55e" />
            {/* Bottom Leaf */}
            <circle cx="0" cy="4" r="3.2" fill="#16a34a" />
            {/* Left Leaf */}
            <circle cx="-4" cy="0" r="3.2" fill="#22c55e" />
            {/* Right Leaf */}
            <circle cx="4" cy="0" r="3.2" fill="#16a34a" />
            {/* Clover Stem */}
            <path d="M 0 3 Q -2 8 -4 10" stroke="#15803d" strokeWidth="1.2" strokeLinecap="round" fill="none" />
          </g>

          {/* Target Number "15" in Bold Typography */}
          <text
            x="50"
            y="57"
            textAnchor="middle"
            fill="#ffffff"
            fontSize="21"
            fontWeight="900"
            fontFamily="monospace, system-ui, sans-serif"
            letterSpacing="-1"
            filter="drop-shadow(0 2px 4px rgba(0,0,0,0.8))"
          >
            15
          </text>

          {/* Center Sniper Laser Red Dot */}
          <circle cx="50" cy="50" r="3.8" fill="url(#laserGlow)" />
          <circle cx="50" cy="50" r="1.6" fill="#ffffff" />
        </svg>
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
