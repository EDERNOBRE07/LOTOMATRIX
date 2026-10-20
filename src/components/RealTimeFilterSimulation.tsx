import React, { useMemo } from 'react';
import { FilterCriteria, GameTicket, LotofacilDraw } from '../types/lotofacil';
import { CONCURSO_ATUAL } from '../data/lotofacilData';
import { analyzeTicket, ticketPassesFilters } from '../services/combinatorics';
import {
  Sparkles,
  CheckCircle2,
  XCircle,
  Sliders,
  Scale,
  Repeat,
  Layers,
  Activity,
  Flame,
} from 'lucide-react';

interface RealTimeFilterSimulationProps {
  filters: FilterCriteria;
  selectedNumbers: number[];
  latestDraw?: LotofacilDraw;
  aiScores?: number[];
}

export const RealTimeFilterSimulation: React.FC<RealTimeFilterSimulationProps> = ({
  filters,
  selectedNumbers,
  latestDraw = CONCURSO_ATUAL,
  aiScores,
}) => {
  // Generate a deterministic preview set of 5 candidate games from the currently selected numbers
  // or default pool so user sees immediate live feedback when sliders change
  const previewGames = useMemo(() => {
    const pool =
      selectedNumbers.length >= 15
        ? [...selectedNumbers].sort((a, b) => a - b)
        : [1, 2, 3, 4, 5, 7, 8, 9, 10, 11, 13, 14, 15, 17, 18, 20, 21, 22, 24, 25];

    const games: { dezenas: number[]; label: string }[] = [];
    const poolLen = pool.length;

    // Pattern 1: Balanced start-end
    games.push({
      label: 'Prévia A (Equilíbrio Canônico)',
      dezenas: [...pool.slice(0, 8), ...pool.slice(poolLen - 7)].slice(0, 15).sort((a, b) => a - b),
    });

    // Pattern 2: Core + Frame bias
    games.push({
      label: 'Prévia B (Alta Afinidade IA)',
      dezenas: pool.slice(0, 15).sort((a, b) => a - b),
    });

    // Pattern 3: Interleaved odd/even
    const evens = pool.filter((n) => n % 2 === 0);
    const odds = pool.filter((n) => n % 2 !== 0);
    const mixed = [...evens.slice(0, 8), ...odds.slice(0, 7)].slice(0, 15).sort((a, b) => a - b);
    games.push({
      label: 'Prévia C (Balança 8P/7I)',
      dezenas: mixed.length === 15 ? mixed : pool.slice(1, 16).sort((a, b) => a - b),
    });

    // Pattern 4: Golden Zone sum targeting
    const shifted = [...pool.slice(2, 17)].sort((a, b) => a - b);
    games.push({
      label: 'Prévia D (Faixa Central)',
      dezenas: shifted.length === 15 ? shifted : pool.slice(0, 15).sort((a, b) => a - b),
    });

    // Pattern 5: Repetidas / Cycle blend
    const reverseBlend = [...pool.slice(poolLen - 15)].sort((a, b) => a - b);
    games.push({
      label: 'Prévia E (Repetidas & Ciclo)',
      dezenas: reverseBlend.length === 15 ? reverseBlend : pool.slice(3, 18).sort((a, b) => a - b),
    });

    return games;
  }, [selectedNumbers]);

  // Evaluate each preview game in real-time against active filters
  const evaluationResults = useMemo(() => {
    return previewGames.map((game, idx) => {
      const analysis = analyzeTicket(game.dezenas, latestDraw.dezenas, aiScores);
      const passes = ticketPassesFilters(analysis, filters);

      // Rejection reasons if fails
      const failureReasons: string[] = [];
      if (analysis.soma < filters.somaMin) failureReasons.push(`Soma ${analysis.soma} < ${filters.somaMin}`);
      if (analysis.soma > filters.somaMax) failureReasons.push(`Soma ${analysis.soma} > ${filters.somaMax}`);
      if (analysis.pares < filters.paresMin) failureReasons.push(`Pares ${analysis.pares} < ${filters.paresMin}`);
      if (analysis.pares > filters.paresMax) failureReasons.push(`Pares ${analysis.pares} > ${filters.paresMax}`);
      if (analysis.repetidas < filters.repetidasMin) failureReasons.push(`Repetidas ${analysis.repetidas} < ${filters.repetidasMin}`);
      if (analysis.repetidas > filters.repetidasMax) failureReasons.push(`Repetidas ${analysis.repetidas} > ${filters.repetidasMax}`);
      if (analysis.moldura < filters.molduraMin) failureReasons.push(`Moldura ${analysis.moldura} < ${filters.molduraMin}`);
      if (analysis.moldura > filters.molduraMax) failureReasons.push(`Moldura ${analysis.moldura} > ${filters.molduraMax}`);
      if (analysis.primos < filters.primosMin) failureReasons.push(`Primos ${analysis.primos} < ${filters.primosMin}`);
      if (analysis.primos > filters.primosMax) failureReasons.push(`Primos ${analysis.primos} > ${filters.primosMax}`);
      if (analysis.fibonacci < filters.fibonacciMin) failureReasons.push(`Fibonacci ${analysis.fibonacci} < ${filters.fibonacciMin}`);
      if (analysis.fibonacci > filters.fibonacciMax) failureReasons.push(`Fibonacci ${analysis.fibonacci} > ${filters.fibonacciMax}`);
      if (analysis.maxConsecutivas > filters.maxConsecutivas) failureReasons.push(`Seq. ${analysis.maxConsecutivas} > ${filters.maxConsecutivas}`);

      return {
        ...game,
        index: idx + 1,
        analysis,
        passes,
        failureReasons,
      };
    });
  }, [previewGames, filters, latestDraw.dezenas, aiScores]);

  const passingCount = evaluationResults.filter((r) => r.passes).length;
  const passRate = Math.round((passingCount / evaluationResults.length) * 100);

  return (
    <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-5 sm:p-6 shadow-xl space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-slate-800 gap-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span>Simulação em Tempo Real dos Filtros Personalizados</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30 uppercase">
                Prévia Instantânea
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Veja o impacto imediato das alterações nos filtros sobre a elegibilidade da matriz em 5 jogos de amostra.
            </p>
          </div>
        </div>

        {/* Live Eligibility Meter */}
        <div className="bg-slate-950 p-2.5 px-4 rounded-xl border border-slate-800 flex items-center gap-3 shrink-0">
          <div className="text-right">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">Elegibilidade da Matriz</span>
            <div className="flex items-center gap-1.5">
              <span
                className={`font-mono text-sm font-black ${
                  passRate >= 60 ? 'text-emerald-400' : passRate >= 20 ? 'text-amber-400' : 'text-rose-400'
                }`}
              >
                {passRate}% Aprovada
              </span>
              <span className="text-[11px] text-slate-400">({passingCount}/5)</span>
            </div>
          </div>
          <div className="w-12 h-2.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                passRate >= 60 ? 'bg-emerald-500' : passRate >= 20 ? 'bg-amber-500' : 'bg-rose-500'
              }`}
              style={{ width: `${passRate}%` }}
            />
          </div>
        </div>
      </div>

      {/* Grid of 5 Preview Games */}
      <div className="space-y-2.5">
        {evaluationResults.map((item) => (
          <div
            key={item.index}
            className={`p-3 rounded-xl border transition-all text-xs ${
              item.passes
                ? 'bg-emerald-950/20 border-emerald-500/30 hover:border-emerald-500/50'
                : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-white">{item.label}</span>
                {item.passes ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/40">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    <span>Elegível para Matriz</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-[10px] font-bold border border-rose-500/40">
                    <XCircle className="w-3 h-3 text-rose-400" />
                    <span>Podado pelos Filtros</span>
                  </span>
                )}
              </div>

              {/* Quick Metrics Badges */}
              <div className="flex items-center gap-1.5 flex-wrap font-mono text-[11px]">
                <span className={`px-1.5 py-0.5 rounded ${item.analysis.soma >= filters.somaMin && item.analysis.soma <= filters.somaMax ? 'bg-slate-800 text-slate-300' : 'bg-rose-950 text-rose-300 border border-rose-500/30 font-bold'}`}>
                  Soma: {item.analysis.soma}
                </span>
                <span className={`px-1.5 py-0.5 rounded ${item.analysis.pares >= filters.paresMin && item.analysis.pares <= filters.paresMax ? 'bg-slate-800 text-slate-300' : 'bg-rose-950 text-rose-300 border border-rose-500/30 font-bold'}`}>
                  {item.analysis.pares}P / {15 - item.analysis.pares}I
                </span>
                <span className={`px-1.5 py-0.5 rounded ${item.analysis.repetidas >= filters.repetidasMin && item.analysis.repetidas <= filters.repetidasMax ? 'bg-slate-800 text-slate-300' : 'bg-rose-950 text-rose-300 border border-rose-500/30 font-bold'}`}>
                  {item.analysis.repetidas} Rep.
                </span>
                <span className={`px-1.5 py-0.5 rounded ${item.analysis.moldura >= filters.molduraMin && item.analysis.moldura <= filters.molduraMax ? 'bg-slate-800 text-slate-300' : 'bg-rose-950 text-rose-300 border border-rose-500/30 font-bold'}`}>
                  {item.analysis.moldura} Mold.
                </span>
                <span className={`px-1.5 py-0.5 rounded ${item.analysis.primos >= filters.primosMin && item.analysis.primos <= filters.primosMax ? 'bg-slate-800 text-slate-300' : 'bg-rose-950 text-rose-300 border border-rose-500/30 font-bold'}`}>
                  {item.analysis.primos} Prim.
                </span>
                <span className={`px-1.5 py-0.5 rounded ${item.analysis.fibonacci >= filters.fibonacciMin && item.analysis.fibonacci <= filters.fibonacciMax ? 'bg-slate-800 text-slate-300' : 'bg-rose-950 text-rose-300 border border-rose-500/30 font-bold'}`}>
                  {item.analysis.fibonacci} Fibo
                </span>
              </div>
            </div>

            {/* Dezenas Balls */}
            <div className="flex flex-wrap items-center gap-1">
              {item.dezenas.map((num) => {
                const isRepetida = latestDraw.dezenas.includes(num);
                return (
                  <span
                    key={num}
                    className={`inline-flex items-center justify-center w-6 h-6 rounded text-[11px] font-mono font-bold ${
                      isRepetida
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'bg-slate-800 text-slate-200'
                    }`}
                  >
                    {num.toString().padStart(2, '0')}
                  </span>
                );
              })}
            </div>

            {/* Failure reason explanation if podado */}
            {!item.passes && item.failureReasons.length > 0 && (
              <div className="mt-2 text-[11px] text-rose-300 bg-rose-950/40 p-1.5 px-2.5 rounded-lg border border-rose-500/30 flex items-center gap-1.5">
                <span className="font-bold">Motivo da Poda:</span>
                <span>{item.failureReasons.join(' • ')}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
