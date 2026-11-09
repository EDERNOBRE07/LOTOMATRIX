import React from 'react';
import { IndicadorGarantiaPayload } from '../services/tabelasCoberturaLJCR';
import { AlertTriangle, ShieldCheck, TrendingDown, DollarSign } from 'lucide-react';

interface IndicadorGarantiaLJCRProps {
  indicador: IndicadorGarantiaPayload | null;
  onRelaxFilters?: () => void;
  className?: string;
}

export const IndicadorGarantiaLJCR: React.FC<IndicadorGarantiaLJCRProps> = ({
  indicador,
  onRelaxFilters,
  className = '',
}) => {
  if (!indicador) return null;

  const {
    matrizOriginalQtd,
    matrizFiltradaQtd,
    garantiaTeorica = 100.0,
    garantiaEfetiva,
    custoOriginal,
    custoOtimizado,
    economia,
    economiaPercentual,
    garantiaAlvo = '14 se 15',
  } = indicador;

  const p = Math.min(100, Math.max(0, garantiaEfetiva));
  const isHigh = p >= 95.0;
  const isModerate = p >= 80.0 && p < 95.0;
  const isOverRestricted = p < 75.0;

  // Cores dinâmicas segundo a taxa efetiva de cobertura auditada
  const colorClass = isHigh
    ? 'text-emerald-400'
    : isModerate
    ? 'text-amber-400'
    : 'text-rose-400';

  const barColorClass = isHigh
    ? 'bg-emerald-500'
    : isModerate
    ? 'bg-amber-400'
    : 'bg-rose-500';

  const dotColorClass = isHigh
    ? 'bg-emerald-400'
    : isModerate
    ? 'bg-amber-400'
    : 'bg-rose-500';

  return (
    <div
      className={`bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg w-full transition-all duration-300 ${className}`}
    >
      {/* Top Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span
            className={`inline-block w-2.5 h-2.5 rounded-full animate-pulse ${dotColorClass}`}
          ></span>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
            <span>Garantia Efetiva do Fechamento</span>
          </h3>
        </div>
        <span className="text-xs font-mono font-medium px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
          {garantiaAlvo}
        </span>
      </div>

      {/* Main KPI Row */}
      <div className="flex items-baseline justify-between mb-2">
        <div className="flex items-baseline gap-1.5">
          <span
            className={`text-3xl font-black tracking-tight font-mono transition-colors duration-300 ${colorClass}`}
          >
            {p.toFixed(1)}%
          </span>
          <span className="text-xs text-slate-400 font-medium">
            de probabilidade auditada
          </span>
        </div>
        <div className="text-right text-xs">
          <span className="text-slate-200 font-bold font-mono">
            {matrizFiltradaQtd}
          </span>
          <span className="text-slate-500 font-mono">
            {' '}
            / {matrizOriginalQtd} jogos
          </span>
        </div>
      </div>

      {/* Barra de Progresso com Transição Suave */}
      <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden p-0.5">
        <div
          className={`h-1.5 rounded-full transition-all duration-500 ease-out ${barColorClass}`}
          style={{ width: `${p}%` }}
        ></div>
      </div>

      {/* Métricas Rápidas de Impacto */}
      <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-800/80 text-xs">
        <div>
          <span className="text-slate-500 block text-[11px] flex items-center gap-1">
            <DollarSign className="w-3 h-3 text-slate-500" />
            Investimento:
          </span>
          <span className="text-slate-200 font-semibold font-mono">
            R$ {custoOtimizado.toFixed(2).replace('.', ',')}
          </span>
        </div>
        <div className="text-right">
          <span className="text-slate-500 block text-[11px] flex items-center justify-end gap-1">
            <TrendingDown className="w-3 h-3 text-emerald-500" />
            Economia gerada:
          </span>
          <span className="text-emerald-400 font-semibold font-mono">
            R$ {economia.toFixed(2).replace('.', ',')} (
            {economiaPercentual.toFixed(0)}%)
          </span>
        </div>
      </div>

      {/* Notificação Reativa de Sobre-Restrição (< 75% de cobertura) */}
      {isOverRestricted && (
        <div className="mt-3.5 pt-3 border-t border-rose-900/40 bg-rose-950/30 -mx-5 -mb-5 p-4 rounded-b-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="text-[11px] text-rose-200 leading-snug">
              <strong className="text-rose-300 font-bold block">
                Alerta de Sobre-Restrição ({p.toFixed(1)}% &lt; 75%)
              </strong>
              Filtros rigorosos podaram cartões canônicos essenciais, reduzindo a
              cobertura matemática da matriz.
            </div>
          </div>
          {onRelaxFilters && (
            <button
              onClick={onRelaxFilters}
              className="text-xs bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 px-2.5 py-1 rounded transition cursor-pointer shrink-0 font-medium"
            >
              Flexibilizar Filtros
            </button>
          )}
        </div>
      )}
    </div>
  );
};
