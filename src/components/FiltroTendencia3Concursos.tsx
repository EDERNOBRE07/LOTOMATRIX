import React, { useMemo } from 'react';
import { Flame, Snowflake, RotateCcw, Pin, Ban, PlusCircle, CheckCircle2 } from 'lucide-react';
import { RECENT_DRAWS } from '../data/lotofacilData';
import { LotofacilDraw } from '../types/lotofacil';

interface FiltroTendencia3ConcursosProps {
  recentDraws?: LotofacilDraw[];
  selectedNumbers: number[];
  fixedNumbers: number[];
  excludedNumbers: number[];
  onToggleNumber: (n: number) => void;
  onSetFixedNumbers: (numbers: number[]) => void;
  onSetExcludedNumbers: (numbers: number[]) => void;
  onAddNumbersToSelected: (numbers: number[]) => void;
}

export const FiltroTendencia3Concursos: React.FC<FiltroTendencia3ConcursosProps> = ({
  recentDraws = RECENT_DRAWS,
  selectedNumbers,
  fixedNumbers,
  excludedNumbers,
  onToggleNumber,
  onSetFixedNumbers,
  onSetExcludedNumbers,
  onAddNumbersToSelected,
}) => {
  // Pega os últimos 3 sorteios
  const last3 = useMemo(() => recentDraws.slice(0, 3), [recentDraws]);

  // Contagem de ocorrências nos 3 concursos
  const stats3 = useMemo(() => {
    const counts: Record<number, number> = {};
    for (let i = 1; i <= 25; i++) {
      counts[i] = 0;
    }
    last3.forEach((draw) => {
      draw.dezenas.forEach((n) => {
        counts[n] = (counts[n] || 0) + 1;
      });
    });

    const superQuentes: number[] = []; // 3/3
    const emAlta: number[] = [];      // 2/3
    const transicao: number[] = [];   // 1/3
    const frias: number[] = [];       // 0/3

    for (let i = 1; i <= 25; i++) {
      const c = counts[i];
      if (c === 3) superQuentes.push(i);
      else if (c === 2) emAlta.push(i);
      else if (c === 1) transicao.push(i);
      else frias.push(i);
    }

    return { counts, superQuentes, emAlta, transicao, frias };
  }, [last3]);

  const handleFixSuperQuentes = () => {
    const newFixed = Array.from(new Set([...fixedNumbers, ...stats3.superQuentes])).sort((a, b) => a - b);
    onSetFixedNumbers(newFixed);
    onAddNumbersToSelected(stats3.superQuentes);
  };

  const handleExcludeFrias = () => {
    const newExcluded = Array.from(new Set([...excludedNumbers, ...stats3.frias])).sort((a, b) => a - b);
    onSetExcludedNumbers(newExcluded);
  };

  const handleIncludeFrias = () => {
    onAddNumbersToSelected(stats3.frias);
    // Remove das excluídas se estivessem lá
    const remainingExcluded = excludedNumbers.filter((n) => !stats3.frias.includes(n));
    onSetExcludedNumbers(remainingExcluded);
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-xl backdrop-blur-md">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400">
            <Flame className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
              Tendência Dinâmica dos Últimos 3 Concursos
              <span className="text-[11px] font-normal text-slate-400">
                (#{last3[0]?.concurso}, #{last3[1]?.concurso}, #{last3[2]?.concurso})
              </span>
            </h4>
            <p className="text-xs text-slate-400">
              Filtro rápido de frequência para incorporação direta na matriz e controle de ciclo
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-3">
        {/* Super Quentes (3/3) */}
        <div className="bg-slate-800/60 border border-amber-500/30 rounded-lg p-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                Super Quentes (3/3)
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">
                {stats3.superQuentes.length} dezenas
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5 mb-3">
              {stats3.superQuentes.map((n) => {
                const isSelected = selectedNumbers.includes(n);
                const isFixed = fixedNumbers.includes(n);
                return (
                  <button
                    key={n}
                    type="button"
                    onClick={() => onToggleNumber(n)}
                    className={`w-7 h-7 text-xs font-bold rounded flex items-center justify-center transition-all ${
                      isFixed
                        ? 'bg-amber-500 text-slate-950 ring-2 ring-amber-300'
                        : isSelected
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-700 text-amber-200 hover:bg-slate-600'
                    }`}
                    title={isFixed ? `Dezena ${n} Fixada` : isSelected ? `Dezena ${n} Selecionada` : `Clique para selecionar ${n}`}
                  >
                    {n.toString().padStart(2, '0')}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex gap-1.5 pt-2 border-t border-slate-700/60">
            <button
              type="button"
              onClick={handleFixSuperQuentes}
              className="flex-1 py-1 px-2 text-[11px] font-semibold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded flex items-center justify-center gap-1 transition-colors"
            >
              <Pin className="w-3 h-3" />
              Fixar na Matriz
            </button>
          </div>
        </div>

        {/* Em Alta (2/3) */}
        <div className="bg-slate-800/60 border border-slate-700 rounded-lg p-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                <TrendingUpIcon className="w-3.5 h-3.5 text-emerald-400" />
                Em Alta (2/3)
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                {stats3.emAlta.length} dezenas
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5 mb-3">
              {stats3.emAlta.map((n) => {
                const isSelected = selectedNumbers.includes(n);
                return (
                  <button
                    key={n}
                    type="button"
                    onClick={() => onToggleNumber(n)}
                    className={`w-7 h-7 text-xs font-bold rounded flex items-center justify-center transition-all ${
                      isSelected
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-700 text-slate-200 hover:bg-slate-600'
                    }`}
                  >
                    {n.toString().padStart(2, '0')}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex gap-1.5 pt-2 border-t border-slate-700/60">
            <button
              type="button"
              onClick={() => onAddNumbersToSelected(stats3.emAlta)}
              className="flex-1 py-1 px-2 text-[11px] font-semibold bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded flex items-center justify-center gap-1 transition-colors"
            >
              <PlusCircle className="w-3 h-3" />
              Selecionar Todas
            </button>
          </div>
        </div>

        {/* Em Transição (1/3) */}
        <div className="bg-slate-800/60 border border-slate-700 rounded-lg p-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-sky-400 flex items-center gap-1.5">
                <RotateCcw className="w-3.5 h-3.5 text-sky-400" />
                Transição (1/3)
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300">
                {stats3.transicao.length} dezenas
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5 mb-3">
              {stats3.transicao.map((n) => {
                const isSelected = selectedNumbers.includes(n);
                return (
                  <button
                    key={n}
                    type="button"
                    onClick={() => onToggleNumber(n)}
                    className={`w-7 h-7 text-xs font-bold rounded flex items-center justify-center transition-all ${
                      isSelected
                        ? 'bg-sky-600 text-white'
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    {n.toString().padStart(2, '0')}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-700/60 flex items-center justify-between">
            <span>Aparência pontual</span>
            <span className="text-slate-300 font-medium">33% dos sorteios</span>
          </div>
        </div>

        {/* Frias / Não Sorteadas (0/3) */}
        <div className="bg-slate-800/60 border border-blue-500/30 rounded-lg p-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-blue-400 flex items-center gap-1.5">
                <Snowflake className="w-3.5 h-3.5 text-blue-400" />
                Frias (0/3 Ausentes)
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300">
                {stats3.frias.length} dezenas
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5 mb-3">
              {stats3.frias.map((n) => {
                const isExcluded = excludedNumbers.includes(n);
                const isSelected = selectedNumbers.includes(n);
                return (
                  <button
                    key={n}
                    type="button"
                    onClick={() => onToggleNumber(n)}
                    className={`w-7 h-7 text-xs font-bold rounded flex items-center justify-center transition-all ${
                      isExcluded
                        ? 'bg-red-500/30 text-red-300 border border-red-500/50'
                        : isSelected
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                    }`}
                    title={isExcluded ? `Dezena ${n} Excluída` : `Dezena ${n} Ausente`}
                  >
                    {n.toString().padStart(2, '0')}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex gap-1.5 pt-2 border-t border-slate-700/60">
            <button
              type="button"
              onClick={handleExcludeFrias}
              className="flex-1 py-1 px-2 text-[10px] font-semibold bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40 rounded flex items-center justify-center gap-1 transition-colors"
            >
              <Ban className="w-3 h-3" />
              Excluir (0/3)
            </button>
            <button
              type="button"
              onClick={handleIncludeFrias}
              className="flex-1 py-1 px-2 text-[10px] font-semibold bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/40 rounded flex items-center justify-center gap-1 transition-colors"
            >
              <CheckCircle2 className="w-3 h-3" />
              Ciclo Retorno
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Simple internal icon helper
function TrendingUpIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      viewBox="0 0 24 24"
    >
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  );
}
