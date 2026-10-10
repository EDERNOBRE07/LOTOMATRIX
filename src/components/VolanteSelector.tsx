import React, { useState } from 'react';
import {
  PRIMOS,
  MOLDURA,
  FIBONACCI,
  DEZENAS_STATS,
  CONCURSO_ATUAL,
} from '../data/lotofacilData';
import { Sparkles, Check, Pin, Ban, Layers, Eye, RefreshCw } from 'lucide-react';

interface VolanteSelectorProps {
  selectedNumbers: number[];
  fixedNumbers: number[];
  excludedNumbers: number[];
  aiScores?: number[];
  onToggleNumber: (n: number) => void;
  onSetFixed: (n: number) => void;
  onSetExcluded: (n: number) => void;
  onSelectSet: (numbers: number[]) => void;
  onClear: () => void;
  targetCount?: number;
}

export const VolanteSelector: React.FC<VolanteSelectorProps> = ({
  selectedNumbers,
  fixedNumbers,
  excludedNumbers,
  aiScores,
  onToggleNumber,
  onSetFixed,
  onSetExcluded,
  onSelectSet,
  onClear,
  targetCount = 18,
}) => {
  const [visualMode, setVisualMode] = useState<
    'normal' | 'moldura' | 'primos' | 'fibonacci' | 'atrasadas' | 'calor_ia'
  >('normal');
  const [clickMode, setClickMode] = useState<'select' | 'fix' | 'exclude'>('select');

  // Fast preset selections
  const handleSelectTop18AI = () => {
    // Top 18 sorted by AI score or delay urgency
    const sorted = [...DEZENAS_STATS]
      .sort((a, b) => {
        const scoreA = aiScores ? aiScores[a.numero - 1] : a.vezes / 24 + a.atrasoAtual * 5;
        const scoreB = aiScores ? aiScores[b.numero - 1] : b.vezes / 24 + b.atrasoAtual * 5;
        return scoreB - scoreA;
      })
      .slice(0, 18)
      .map((s) => s.numero)
      .sort((a, b) => a - b);
    onSelectSet(sorted);
  };

  const handleSelectCycleClosure = () => {
    // Numbers 17 and 22 are missing to close cycle 804, plus top recurring numbers
    const cycleFocus = [17, 22, 1, 2, 3, 4, 5, 7, 10, 11, 12, 13, 14, 19, 20, 21, 24, 25];
    onSelectSet(cycleFocus.slice(0, targetCount));
  };

  const handleSelectEquilibrio = () => {
    // 10 moldura + 5 miolo + 5 primos + 4 fibonacci
    const eq = [1, 2, 3, 5, 7, 8, 10, 11, 13, 14, 17, 19, 20, 21, 22, 23, 24, 25];
    onSelectSet(eq.slice(0, targetCount));
  };

  const handleSelectRepetidas3800 = () => {
    // 9 repetidas do 3800 + 17 e 22 + outras
    const base = [1, 3, 4, 5, 7, 10, 12, 13, 19, 17, 22, 11, 20, 25, 2, 14, 24, 21];
    onSelectSet(base.slice(0, targetCount));
  };

  const handleNumberClick = (n: number) => {
    if (clickMode === 'fix') {
      onSetFixed(n);
    } else if (clickMode === 'exclude') {
      onSetExcluded(n);
    } else {
      onToggleNumber(n);
    }
  };

  return (
    <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-5 shadow-xl">
      {/* Top Bar: Selector Title and Counters */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-800/80 gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-400" />
              <span>Volante Oficial Interativo 5×5</span>
            </h3>
            <span
              className={`text-xs px-2.5 py-0.5 rounded-full font-mono font-semibold ${
                selectedNumbers.length === targetCount
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : selectedNumbers.length > targetCount
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : 'bg-slate-800 text-slate-300 border border-slate-700'
              }`}
            >
              {selectedNumbers.length} / {targetCount} dezenas
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Clique nas dezenas para selecionar, fixar ou excluir do fechamento matemático.
          </p>
        </div>

        {/* Click Mode Toggle */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 self-start sm:self-auto text-xs">
          <button
            onClick={() => setClickMode('select')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-medium transition cursor-pointer ${
              clickMode === 'select'
                ? 'bg-emerald-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Check className="w-3.5 h-3.5" />
            <span>Selecionar</span>
          </button>
          <button
            onClick={() => setClickMode('fix')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-medium transition cursor-pointer ${
              clickMode === 'fix'
                ? 'bg-blue-500 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Dezenas fixas entram em 100% dos jogos gerados"
          >
            <Pin className="w-3.5 h-3.5" />
            <span>Fixar ({fixedNumbers.length})</span>
          </button>
          <button
            onClick={() => setClickMode('exclude')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-medium transition cursor-pointer ${
              clickMode === 'exclude'
                ? 'bg-rose-500 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Dezenas excluídas nunca entram em nenhum jogo"
          >
            <Ban className="w-3.5 h-3.5" />
            <span>Excluir ({excludedNumbers.length})</span>
          </button>
        </div>
      </div>

      {/* Visual Filter Overlays */}
      <div className="flex flex-wrap items-center justify-between gap-2 py-3 border-b border-slate-800/60 text-xs">
        <span className="text-slate-400 flex items-center gap-1">
          <Eye className="w-3.5 h-3.5 text-slate-500" />
          Filtros Visuais:
        </span>
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setVisualMode('normal')}
            className={`px-2.5 py-1 rounded-lg transition text-[11px] cursor-pointer ${
              visualMode === 'normal'
                ? 'bg-slate-700 text-white font-semibold'
                : 'bg-slate-800/60 text-slate-400 hover:text-slate-200'
            }`}
          >
            Padrão
          </button>
          <button
            onClick={() => setVisualMode('moldura')}
            className={`px-2.5 py-1 rounded-lg transition text-[11px] cursor-pointer ${
              visualMode === 'moldura'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold'
                : 'bg-slate-800/60 text-slate-400 hover:text-slate-200'
            }`}
          >
            Moldura (16)
          </button>
          <button
            onClick={() => setVisualMode('primos')}
            className={`px-2.5 py-1 rounded-lg transition text-[11px] cursor-pointer ${
              visualMode === 'primos'
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 font-semibold'
                : 'bg-slate-800/60 text-slate-400 hover:text-slate-200'
            }`}
          >
            Primos (9)
          </button>
          <button
            onClick={() => setVisualMode('fibonacci')}
            className={`px-2.5 py-1 rounded-lg transition text-[11px] cursor-pointer ${
              visualMode === 'fibonacci'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-semibold'
                : 'bg-slate-800/60 text-slate-400 hover:text-slate-200'
            }`}
          >
            Fibonacci (7)
          </button>
          <button
            onClick={() => setVisualMode('atrasadas')}
            className={`px-2.5 py-1 rounded-lg transition text-[11px] cursor-pointer ${
              visualMode === 'atrasadas'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 font-semibold'
                : 'bg-slate-800/60 text-slate-400 hover:text-slate-200'
            }`}
          >
            Atrasadas (+Atraso)
          </button>
          <button
            onClick={() => setVisualMode('calor_ia')}
            className={`px-2.5 py-1 rounded-lg transition text-[11px] cursor-pointer flex items-center gap-1 ${
              visualMode === 'calor_ia'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-semibold'
                : 'bg-slate-800/60 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3 h-3 text-emerald-400" />
            Calor IA
          </button>
        </div>
      </div>

      {/* Volante Grid 5x5 */}
      <div className="py-4 flex justify-center">
        <div className="grid grid-cols-5 gap-2 sm:gap-3 max-w-md w-full">
          {Array.from({ length: 25 }, (_, i) => {
            const num = i + 1;
            const isSelected = selectedNumbers.includes(num);
            const isFixed = fixedNumbers.includes(num);
            const isExcluded = excludedNumbers.includes(num);
            const stat = DEZENAS_STATS.find((s) => s.numero === num);
            const atraso = stat?.atrasoAtual ?? 0;
            const vezes = stat?.vezes ?? 0;
            const scoreIA = aiScores ? aiScores[num - 1] ?? 50 : 50;

            // Visual overlay highlights
            const isMolduraNumber = MOLDURA.includes(num);
            const isPrimoNumber = PRIMOS.includes(num);
            const isFibonacciNumber = FIBONACCI.includes(num);
            const isCriticalDelay = num === 17 || num === 22 || atraso >= 3;

            let borderStyle = 'border-slate-800';
            let bgStyle = 'bg-slate-950/70 hover:bg-slate-800/80 text-slate-200';

            if (visualMode === 'moldura' && isMolduraNumber) {
              borderStyle = 'border-amber-500/70 shadow-sm shadow-amber-500/10';
            } else if (visualMode === 'primos' && isPrimoNumber) {
              borderStyle = 'border-purple-500/70 shadow-sm shadow-purple-500/10';
            } else if (visualMode === 'fibonacci' && isFibonacciNumber) {
              borderStyle = 'border-cyan-500/70 shadow-sm shadow-cyan-500/10';
            } else if (visualMode === 'atrasadas' && isCriticalDelay) {
              borderStyle = 'border-rose-500/70 shadow-sm shadow-rose-500/10';
            } else if (visualMode === 'calor_ia') {
              if (scoreIA >= 80) bgStyle = 'bg-emerald-950/50 border-emerald-500/40 text-emerald-200';
              else if (scoreIA >= 60) bgStyle = 'bg-teal-950/40 border-teal-500/30 text-teal-200';
              else bgStyle = 'bg-slate-950/50 border-slate-800 text-slate-400';
            }

            // Selection overrides
            if (isFixed) {
              bgStyle = 'bg-blue-600 text-white font-bold shadow-lg shadow-blue-600/30 ring-2 ring-blue-400';
              borderStyle = 'border-blue-400';
            } else if (isExcluded) {
              bgStyle = 'bg-rose-950/40 text-rose-400 opacity-60 line-through border-rose-900 ring-1 ring-rose-500/40';
              borderStyle = 'border-rose-500/40';
            } else if (isSelected) {
              bgStyle = 'bg-gradient-to-br from-emerald-500 to-teal-600 text-slate-950 font-bold shadow-lg shadow-emerald-500/30 ring-2 ring-emerald-300';
              borderStyle = 'border-emerald-300';
            }

            return (
              <button
                key={num}
                type="button"
                onClick={() => handleNumberClick(num)}
                className={`relative flex flex-col items-center justify-center p-2.5 rounded-xl border transition-all transform active:scale-95 cursor-pointer ${bgStyle} ${borderStyle} min-h-[58px] sm:min-h-[64px]`}
              >
                {/* Number */}
                <span className="font-mono text-base sm:text-lg tracking-tight leading-none font-bold">
                  {num.toString().padStart(2, '0')}
                </span>

                {/* Sub-label indicators */}
                <div className="flex items-center gap-1 mt-1 text-[9px] font-mono leading-none">
                  {isFixed && (
                    <span className="flex items-center text-blue-200 bg-blue-800/80 px-1 py-0.5 rounded">
                      FIXA
                    </span>
                  )}
                  {isExcluded && (
                    <span className="flex items-center text-rose-300 bg-rose-900/80 px-1 py-0.5 rounded">
                      EXC
                    </span>
                  )}
                  {!isFixed && !isExcluded && (
                    <span
                      className={`${
                        isSelected
                          ? 'text-slate-900 font-semibold'
                          : atraso >= 3
                          ? 'text-rose-400 font-bold'
                          : 'text-slate-400'
                      }`}
                    >
                      {atraso === 0 ? 'saiu' : `${atraso} atr`}
                    </span>
                  )}
                </div>

                {/* Badges for cycle priority or AI score */}
                {(num === 17 || num === 22) && (
                  <span
                    className="absolute -top-1.5 -right-1.5 bg-amber-500 text-slate-950 font-black text-[9px] px-1 rounded-full shadow"
                    title="Pendente para fechar o Ciclo 804!"
                  >
                    CICLO
                  </span>
                )}
                {visualMode === 'calor_ia' && (
                  <span className="absolute bottom-0.5 right-1 text-[8px] text-emerald-400 font-mono">
                    {Math.round(scoreIA)}%
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Preset Action Buttons */}
      <div className="pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleSelectTop18AI}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-medium transition cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>Top {targetCount} IA (Garantia 14)</span>
          </button>
          <button
            onClick={handleSelectCycleClosure}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-xs font-medium transition cursor-pointer"
          >
            <span>Fechar Ciclo (17 & 22)</span>
          </button>
          <button
            onClick={handleSelectEquilibrio}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium transition cursor-pointer"
          >
            <span>Equilíbrio Canônico</span>
          </button>
          <button
            onClick={handleSelectRepetidas3800}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium transition cursor-pointer"
          >
            <span>9 Repetidas do Concurso 3800</span>
          </button>
        </div>

        <button
          onClick={onClear}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-rose-400 border border-slate-800 text-xs transition cursor-pointer"
        >
          <RefreshCw className="w-3 h-3" />
          <span>Limpar</span>
        </button>
      </div>
    </div>
  );
};
