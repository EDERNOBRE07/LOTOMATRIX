import React, { useState, useRef, useEffect } from 'react';
import { HelpCircle } from 'lucide-react';

interface FilterTooltipProps {
  title: string;
  description: string;
  impact?: string;
  position?: 'top' | 'bottom';
}

export const FilterTooltip: React.FC<FilterTooltipProps> = ({
  title,
  description,
  impact,
  position = 'top',
}) => {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [open]);

  return (
    <div
      ref={wrapperRef}
      className="relative inline-flex items-center"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((prev) => !prev);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        aria-label={`Informação estatística: ${title}`}
        aria-expanded={open}
        className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-800/90 hover:bg-amber-500/20 text-slate-400 hover:text-amber-300 border border-slate-700 hover:border-amber-400/60 transition cursor-help focus:outline-none focus:ring-2 focus:ring-amber-400/60"
      >
        <HelpCircle className="w-3 h-3" />
      </button>

      {open && (
        <div
          role="tooltip"
          className={`absolute left-1/2 -translate-x-1/2 z-50 w-64 sm:w-72 p-3 rounded-xl bg-slate-950/95 border border-amber-500/50 shadow-2xl shadow-black/70 text-left backdrop-blur-md pointer-events-none ${
            position === 'bottom' ? 'top-full mt-2' : 'bottom-full mb-2'
          }`}
        >
          <div className="text-[11px] font-black text-amber-300 mb-1 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
            <span>{title}</span>
          </div>
          <p className="text-[11px] text-slate-200 leading-relaxed">{description}</p>
          {impact && (
            <div className="mt-1.5 pt-1.5 border-t border-slate-800 text-[10px] font-mono text-emerald-300 leading-snug">
              {impact}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
