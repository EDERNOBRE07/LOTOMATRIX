import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FilterCriteria, LotofacilDraw } from '../types/lotofacil';
import { CONCURSO_ATUAL } from '../data/lotofacilData';
import { analyzeTicket, validateFilters } from '../services/combinatorics';
import { getHistoricalNDraws } from '../services/historical100Draws';
import {
  CheckCircle2,
  XCircle,
  Activity,
  ArrowRight,
  Layers,
  ShieldCheck,
  BarChart3,
  Cpu,
} from 'lucide-react';

interface RealTimeFilterSimulationProps {
  filters: FilterCriteria;
  selectedNumbers: number[];
  latestDraw?: LotofacilDraw;
  aiScores?: number[];
  onApplyToFechamento?: () => void;
}

const TOTAL_LOTOFACIL_COMBOS = 3268760;
const WORKER_SAMPLE_SIZE = 100000;

interface WorkerImpactStats {
  estimatedPassingCombos: number;
  reductionPercent: number;
  survivalPct: number;
  evaluatedSamples: number;
  durationMs: number;
  approved10: number;
  total10: number;
  rate10: number;
  approved50: number;
  total50: number;
  rate50: number;
}

function runFastSyncBaseline(filters: FilterCriteria, latestDraw: LotofacilDraw): WorkerImpactStats {
  const startedAt = Date.now();
  let seed = 38362026;
  const nextRand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const quickCount = 600;
  let passed = 0;
  const baseNums = Array.from({ length: 25 }, (_, i) => i + 1);
  for (let i = 0; i < quickCount; i++) {
    const arr = baseNums.slice();
    for (let j = 24; j >= 10; j--) {
      const k = Math.floor(nextRand() * (j + 1));
      const tmp = arr[j];
      arr[j] = arr[k];
      arr[k] = tmp;
    }
    const cand = arr.slice(10, 25).sort((a, b) => a - b);
    if (validateFilters(cand, filters, latestDraw.dezenas).isValid) passed++;
  }
  const survivalRatio = passed / quickCount;
  const draws50 = getHistoricalNDraws(50, latestDraw);
  const historicalFilters: FilterCriteria = {
    ...filters,
    dezenasFixas: [],
    dezenasExcluidas: [],
    antiColisaoHistoricaAtiva: false,
    palpiteIneditoAtivo: false,
  };
  let approved10 = 0;
  let approved50 = 0;
  for (let i = 0; i < draws50.length; i++) {
    const current = draws50[i];
    const prevDezenas = draws50[i + 1]?.dezenas ?? latestDraw.dezenas;
    if (validateFilters(current.dezenas, historicalFilters, prevDezenas).isValid) {
      approved50++;
      if (i < 10) approved10++;
    }
  }
  return {
    estimatedPassingCombos: Math.round(TOTAL_LOTOFACIL_COMBOS * survivalRatio),
    reductionPercent: Number(((1 - survivalRatio) * 100).toFixed(1)),
    survivalPct: Number((survivalRatio * 100).toFixed(2)),
    evaluatedSamples: quickCount,
    durationMs: Math.max(1, Date.now() - startedAt),
    approved10,
    total10: Math.min(10, draws50.length),
    rate10: draws50.length > 0 ? Math.round((approved10 / Math.min(10, draws50.length)) * 100) : 0,
    approved50,
    total50: draws50.length,
    rate50: draws50.length > 0 ? Math.round((approved50 / draws50.length) * 100) : 0,
  };
}

export const RealTimeFilterSimulation: React.FC<RealTimeFilterSimulationProps> = ({
  filters,
  selectedNumbers,
  latestDraw = CONCURSO_ATUAL,
  aiScores,
  onApplyToFechamento,
}) => {
  const [workerStats, setWorkerStats] = useState<WorkerImpactStats>(() =>
    runFastSyncBaseline(filters, latestDraw)
  );
  const [isWorkerRunning, setIsWorkerRunning] = useState<boolean>(false);
  const [workerProgressPct, setWorkerProgressPct] = useState<number>(100);
  const workerRef = useRef<Worker | null>(null);
  const activeJobIdRef = useRef<string>('');

  // Deterministic preview set of 5 candidate games from the active pool
  const previewGames = useMemo(() => {
    const pool =
      selectedNumbers.length >= 15
        ? [...selectedNumbers].sort((a, b) => a - b)
        : [1, 2, 3, 4, 5, 7, 8, 9, 10, 11, 13, 14, 15, 17, 18, 20, 21, 22, 24, 25];

    const games: { dezenas: number[]; label: string }[] = [];
    const poolLen = pool.length;

    games.push({
      label: 'Prévia A (Equilíbrio Canônico)',
      dezenas: [...pool.slice(0, 8), ...pool.slice(poolLen - 7)].slice(0, 15).sort((a, b) => a - b),
    });

    games.push({
      label: 'Prévia B (Alta Afinidade IA)',
      dezenas: pool.slice(0, 15).sort((a, b) => a - b),
    });

    const evens = pool.filter((n) => n % 2 === 0);
    const odds = pool.filter((n) => n % 2 !== 0);
    const mixed = [...evens.slice(0, 8), ...odds.slice(0, 7)].slice(0, 15).sort((a, b) => a - b);
    games.push({
      label: 'Prévia C (Balança 8P/7I)',
      dezenas: mixed.length === 15 ? mixed : pool.slice(1, 16).sort((a, b) => a - b),
    });

    const shifted = [...pool.slice(2, 17)].sort((a, b) => a - b);
    games.push({
      label: 'Prévia D (Faixa Central)',
      dezenas: shifted.length === 15 ? shifted : pool.slice(0, 15).sort((a, b) => a - b),
    });

    const reverseBlend = [...pool.slice(poolLen - 15)].sort((a, b) => a - b);
    games.push({
      label: 'Prévia E (Repetidas & Ciclo)',
      dezenas: reverseBlend.length === 15 ? reverseBlend : pool.slice(3, 18).sort((a, b) => a - b),
    });

    return games;
  }, [selectedNumbers]);

  // Evaluate each preview game in real-time using the exact combinatorics validator
  const evaluationResults = useMemo(() => {
    return previewGames.map((game, idx) => {
      const analysis = analyzeTicket(game.dezenas, latestDraw.dezenas, aiScores);
      const validation = validateFilters(game.dezenas, filters, latestDraw.dezenas);

      return {
        ...game,
        index: idx + 1,
        analysis,
        passes: validation.isValid,
        failureReasons: validation.violations,
      };
    });
  }, [previewGames, filters, latestDraw.dezenas, aiScores]);

  // Offload 100.000-combination universe evaluation to dedicated Web Worker without blocking UI thread
  useEffect(() => {
    if (typeof Worker === 'undefined') {
      setWorkerStats(runFastSyncBaseline(filters, latestDraw));
      setIsWorkerRunning(false);
      return;
    }

    if (!workerRef.current) {
      try {
        workerRef.current = new Worker(
          new URL('../workers/generator.worker.ts', import.meta.url),
          { type: 'module' }
        );
      } catch {
        setWorkerStats(runFastSyncBaseline(filters, latestDraw));
        return;
      }
    }

    const worker = workerRef.current;
    const jobId = `sim-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    activeJobIdRef.current = jobId;

    const handleMessage = (event: MessageEvent<any>) => {
      const msg = event.data;
      if (!msg || msg.jobId !== activeJobIdRef.current) return;
      if (msg.type === 'PROGRESS') {
        setWorkerProgressPct(Number(msg.percent) || 25);
      } else if (msg.type === 'DONE_FILTER_SIMULATION' && msg.payload) {
        setWorkerStats({
          estimatedPassingCombos: msg.payload.estimatedPassingCombos,
          reductionPercent: msg.payload.reductionPercent,
          survivalPct: msg.payload.survivalPct,
          evaluatedSamples: msg.payload.evaluatedSamples,
          durationMs: msg.payload.durationMs,
          approved10: msg.payload.approved10,
          total10: msg.payload.total10,
          rate10: msg.payload.rate10,
          approved50: msg.payload.approved50,
          total50: msg.payload.total50,
          rate50: msg.payload.rate50,
        });
        setWorkerProgressPct(100);
        setIsWorkerRunning(false);
      } else if (msg.type === 'ERROR') {
        setWorkerStats(runFastSyncBaseline(filters, latestDraw));
        setIsWorkerRunning(false);
      }
    };

    worker.onmessage = handleMessage;
    setIsWorkerRunning(true);
    setWorkerProgressPct(10);

    const debounceTimer = setTimeout(() => {
      if (activeJobIdRef.current !== jobId) return;
      worker.postMessage({
        type: 'SIMULATE_FILTERS',
        jobId,
        filters,
        latestDraw,
        sampleCount: WORKER_SAMPLE_SIZE,
      });
    }, 120);

    return () => {
      clearTimeout(debounceTimer);
    };
  }, [filters, latestDraw]);

  useEffect(() => {
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, []);

  const impactStats = workerStats;
  const passingCount = evaluationResults.filter((r) => r.passes).length;
  const passRate = Math.round((passingCount / evaluationResults.length) * 100);

  return (
    <div className="bg-slate-900/95 rounded-2xl border border-slate-800 p-5 sm:p-6 shadow-xl space-y-5">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between pb-4 border-b border-slate-800 gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2 flex-wrap">
              <span>Painel de Impacto &amp; Simulação em Tempo Real</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30 uppercase">
                Concurso #{latestDraw.concurso}
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-bold">
                <Cpu className={`w-3 h-3 ${isWorkerRunning ? 'animate-spin text-amber-300' : 'text-emerald-400'}`} />
                {isWorkerRunning
                  ? `Web Worker (${workerProgressPct}%)...`
                  : `Web Worker • ${impactStats.evaluatedSamples.toLocaleString('pt-BR')} comb. (${impactStats.durationMs}ms)`}
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Avalia em thread paralela (Web Worker) a poda no universo de 3.268.760 combinações e a taxa de aprovação histórica sem travar a interface.
            </p>
          </div>
        </div>

        {onApplyToFechamento && (
          <button
            type="button"
            onClick={onApplyToFechamento}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400 hover:brightness-105 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 transition cursor-pointer shrink-0"
          >
            <span>Aplicar Filtros no Estúdio de Fechamento</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* 4 KPI Impact Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-3.5 space-y-1">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span className="font-semibold">Combinações Elegíveis</span>
            <Layers className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-lg font-black font-mono tabular-nums text-amber-300">
            {impactStats.estimatedPassingCombos.toLocaleString('pt-BR')}
          </div>
          <span className="text-[10px] font-mono text-slate-400 block">
            {impactStats.survivalPct}% de C(25,15) • Poda de {impactStats.reductionPercent}%
          </span>
        </div>

        <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-3.5 space-y-1">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span className="font-semibold">Aprovação Últimos 10</span>
            <BarChart3 className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-lg font-black font-mono tabular-nums text-emerald-400">
            {impactStats.rate10}%
            <span className="text-xs text-slate-400 font-normal ml-1.5">
              ({impactStats.approved10}/{impactStats.total10})
            </span>
          </div>
          <span className="text-[10px] font-mono text-slate-400 block">
            Concursos oficiais recentes aprovados
          </span>
        </div>

        <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-3.5 space-y-1">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span className="font-semibold">Aprovação Últimos 50</span>
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="text-lg font-black font-mono tabular-nums text-cyan-300">
            {impactStats.rate50}%
            <span className="text-xs text-slate-400 font-normal ml-1.5">
              ({impactStats.approved50}/{impactStats.total50})
            </span>
          </div>
          <span className="text-[10px] font-mono text-slate-400 block">
            Robustez histórica estrutural
          </span>
        </div>

        <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-3.5 space-y-1.5">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span className="font-semibold">Amostra da Matriz (5)</span>
            <span className="font-mono text-[10px] text-slate-400">{passingCount}/5</span>
          </div>
          <div
            className={`text-lg font-black font-mono tabular-nums ${
              passRate >= 60 ? 'text-emerald-400' : passRate >= 20 ? 'text-amber-400' : 'text-rose-400'
            }`}
          >
            {passRate}% Aprovada
          </div>
          <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
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
              <div className="flex items-center gap-1.5 flex-wrap font-mono text-[11px] tabular-nums">
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
                <span className={`px-1.5 py-0.5 rounded ${item.analysis.maxConsecutivas <= filters.maxConsecutivas ? 'bg-slate-800 text-slate-300' : 'bg-rose-950 text-rose-300 border border-rose-500/30 font-bold'}`}>
                  Seq ≤{item.analysis.maxConsecutivas}
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
              <div className="mt-2 text-[11px] text-rose-300 bg-rose-950/40 p-1.5 px-2.5 rounded-lg border border-rose-500/30 flex items-start gap-1.5">
                <span className="font-bold shrink-0">Motivo da Poda:</span>
                <span>{item.failureReasons.slice(0, 4).join(' • ')}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
