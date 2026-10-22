import React, { useState, useRef, useEffect } from 'react';
import { Lightbulb, Info, Sparkles, X, ChevronRight, Award, Zap } from 'lucide-react';

export interface ExpertTipProps {
  title: string;
  impact14Pontos: string;
  content?: string;
  ruleCategory?: string;
  recommendation?: string;
  metricValue?: string;
  badgeLabel?: string;
  size?: 'sm' | 'md' | 'inline';
  children?: React.ReactNode;
}

export const ExpertTip: React.FC<ExpertTipProps> = ({
  title,
  impact14Pontos,
  content,
  ruleCategory = 'Estratégia 14 Pontos',
  recommendation,
  metricValue,
  badgeLabel = 'Dica 14 Pts',
  size = 'md',
  children,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="relative inline-block" ref={containerRef}>
      {/* Trigger */}
      {children ? (
        <div
          onClick={() => setIsOpen(!isOpen)}
          className="cursor-pointer inline-flex items-center"
          title="Clique para ver a Dica de Especialista para 14 Pontos"
        >
          {children}
        </div>
      ) : size === 'inline' ? (
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-[10px] font-mono font-bold transition cursor-pointer"
          title="Ver explicação técnica para 14 Pontos"
        >
          <Lightbulb className="w-3 h-3 text-amber-400" />
          <span>{badgeLabel}</span>
        </button>
      ) : size === 'sm' ? (
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="p-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 transition cursor-pointer"
          title="Ver Dica de Especialista"
        >
          <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-gradient-to-r from-amber-500/15 to-yellow-500/15 hover:from-amber-500/25 hover:to-yellow-500/25 border border-amber-500/35 text-amber-300 text-xs font-bold transition shadow-sm cursor-pointer"
          title="Dica de Especialista: Como este indicador influencia as chances de 14 pontos"
        >
          <Lightbulb className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
          <span className="font-mono text-[11px]">{badgeLabel}</span>
        </button>
      )}

      {/* Popover Card */}
      {isOpen && (
        <div className="absolute z-50 left-0 sm:left-auto right-auto sm:right-0 mt-2 w-72 sm:w-84 max-w-[90vw] p-4 bg-slate-950/95 border-2 border-amber-500/50 rounded-2xl shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150 text-left">
          {/* Header */}
          <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-amber-500/20">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-bold block">
                  {ruleCategory}
                </span>
                <strong className="text-xs font-bold text-white block">
                  {title}
                </strong>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Metric Value Highlight if provided */}
          {metricValue && (
            <div className="mt-2.5 p-2 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400">Parâmetro Avaliado:</span>
              <strong className="text-amber-300 font-black">{metricValue}</strong>
            </div>
          )}

          {/* General Technical Explanation if provided */}
          {content && (
            <p className="mt-2.5 text-slate-300 leading-relaxed text-xs">
              {content}
            </p>
          )}

          {/* 14 Points Impact Explanation */}
          <div className="mt-2.5 space-y-1.5 text-xs">
            <div className="flex items-center gap-1.5 text-amber-400 font-bold font-mono text-[11px]">
              <Award className="w-3.5 h-3.5" />
              <span>Como influencia os 14 Pontos:</span>
            </div>
            <p className="text-slate-300 leading-relaxed text-[11px] bg-amber-950/20 p-2.5 rounded-xl border border-amber-500/20">
              {impact14Pontos}
            </p>
          </div>

          {/* Practical Recommendation */}
          {recommendation && (
            <div className="mt-2.5 pt-2 border-t border-slate-800/80 text-[11px] text-slate-300">
              <span className="text-emerald-400 font-bold font-mono block mb-0.5">
                Recomendação Cirúrgica:
              </span>
              <span className="text-slate-400 leading-tight block">
                {recommendation}
              </span>
            </div>
          )}

          {/* Footer note */}
          <div className="mt-3 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[9px] font-mono text-slate-500">
            <span>Matemática Aplicada da Lotofácil</span>
            <span className="text-amber-400 font-bold">LotoSniper AI</span>
          </div>
        </div>
      )}
    </div>
  );
};
