import React, { useEffect, useMemo, useState } from 'react';
import { FilterCriteria, LotofacilDraw } from '../types/lotofacil';
import {
  SavedFechamentoPrognostico,
  getSavedFechamentos,
} from '../services/savedFechamentosStorage';
import {
  DEFAULT_FILTERS,
  calculateGaussianScoreIA,
  hammingDistanceBitwise,
  VALOR_APOSTA_LOTOFACIL,
} from '../services/combinatorics';
import { getHistorical100Draws } from '../services/historical100Draws';
import { CONCURSO_ATUAL } from '../data/lotofacilData';
import {
  History,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  SlidersHorizontal,
  Check,
  ArrowRight,
  AlertTriangle,
} from 'lucide-react';

const CRUZ_NUMBERS = new Set([3, 8, 11, 12, 13, 14, 15, 18, 23]);

// Premiação média de referência Caixa por faixa de acerto (Lotofácil 15 dezenas — aposta R$ 3,50)
const PRIZE_TABLE_ESTIMATE: Record<number, number> = {
  11: 7,
  12: 14,
  13: 35,
  14: 1500,
  15: 1500000,
};

function numbersToBitmask(dezenas: number[]): number {
  let mask = 0;
  for (let i = 0; i < dezenas.length; i++) {
    const n = dezenas[i];
    if (n >= 1 && n <= 25) {
      mask |= 1 << (n - 1);
    }
  }
  return mask;
}

function popcount32(x: number): number {
  let v = x | 0;
  v = v - ((v >>> 1) & 0x55555555);
  v = (v & 0x33333333) + ((v >>> 2) & 0x33333333);
  return (((v + (v >>> 4)) & 0x0f0f0f0f) * 0x01010101) >>> 24;
}

interface HistoricoFechamentosRecentesProps {
  latestDraw?: LotofacilDraw;
  onApplyFilters?: (filters: FilterCriteria) => void;
  onGoToFechamento?: () => void;
  onNotice?: (message: string) => void;
  maxItems?: number;
}

interface FechamentoPerformanceSummary {
  avgScoreIA: number;
  pctCentral: number;
  pctAlta: number;
  pctBaixa: number;
  minHamming: number | null;
  efficiencyLabel: string;
  efficiencyTone: 'emerald' | 'sky' | 'amber' | 'slate';
  hasFixasRisk: boolean;
  // Estimativa de performance baseada nos resultados históricos (últimos 100 concursos)
  historicalDrawsCount: number;
  historicalHitRate11Plus: number;
  historicalDrawsWith12Plus: number;
  historicalDrawsWith13Plus: number;
  historicalBestHit: number;
  historicalEstimatedRoiPct: number;
}

function formatCurrencyBRL(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

function formatShortDate(item: SavedFechamentoPrognostico): string {
  if (typeof item.timestamp === 'number' && item.timestamp > 0) {
    try {
      return new Date(item.timestamp).toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return item.dataCriacao || '—';
    }
  }
  return item.dataCriacao || '—';
}

function computePerformance(
  item: SavedFechamentoPrognostico,
  historicalDrawMasks: number[]
): FechamentoPerformanceSummary {
  const tickets = item.tickets || [];
  const total = tickets.length;
  const drawsCount = historicalDrawMasks.length;

  if (total === 0) {
    return {
      avgScoreIA: 0,
      pctCentral: 0,
      pctAlta: 0,
      pctBaixa: 0,
      minHamming: null,
      efficiencyLabel: 'Sem bilhetes',
      efficiencyTone: 'slate',
      hasFixasRisk: false,
      historicalDrawsCount: drawsCount,
      historicalHitRate11Plus: 0,
      historicalDrawsWith12Plus: 0,
      historicalDrawsWith13Plus: 0,
      historicalBestHit: 0,
      historicalEstimatedRoiPct: 0,
    };
  }

  let scoreSum = 0;
  let centralCount = 0;
  let altaCount = 0;
  let baixaCount = 0;
  const ticketMasks: number[] = new Array(total);

  for (let i = 0; i < total; i++) {
    const t = tickets[i];
    const sorted = t.dezenas.length > 0 ? t.dezenas : [1, 25];
    ticketMasks[i] = numbersToBitmask(sorted);

    const cruzCount = sorted.filter((n) => CRUZ_NUMBERS.has(n)).length;
    const score =
      typeof t.scoreIA === 'number' && t.scoreIA > 0
        ? t.scoreIA
        : calculateGaussianScoreIA({
            soma: t.soma,
            pares: t.pares,
            moldura: t.moldura,
            primos: t.primos,
            fibonacci: t.fibonacci,
            repetidas: t.repetidas,
            maxConsecutivas: t.maxConsecutivas,
            cruz: cruzCount,
            bola1: sorted[0] ?? 1,
            bola15: sorted[sorted.length - 1] ?? 25,
          }).scoreIA;
    scoreSum += score;

    if (t.soma >= 180 && t.soma <= 215) {
      centralCount++;
    } else if (t.soma > 215) {
      altaCount++;
    } else {
      baixaCount++;
    }
  }

  // Real minimum pairwise Hamming distance (capped sample for very large pools)
  let minHamming: number | null = null;
  if (total >= 2) {
    const sampleLen = Math.min(total, 80);
    let minDist = Infinity;
    for (let i = 0; i < sampleLen; i++) {
      for (let j = i + 1; j < sampleLen; j++) {
        const d = hammingDistanceBitwise(ticketMasks[i], ticketMasks[j]);
        if (d < minDist) minDist = d;
        if (minDist === 0) break;
      }
      if (minDist === 0) break;
    }
    minHamming = Number.isFinite(minDist) ? minDist : null;
  }

  // Fast bitwise backtest against historical draws (e.g. last 100 contests)
  let drawsWith11Plus = 0;
  let drawsWith12Plus = 0;
  let drawsWith13Plus = 0;
  let bestHitOverall = 0;
  let totalPrizeSimulated = 0;

  for (let d = 0; d < drawsCount; d++) {
    const drawMask = historicalDrawMasks[d];
    let bestInDraw = 0;
    for (let i = 0; i < total; i++) {
      const hits = popcount32(ticketMasks[i] & drawMask);
      if (hits > bestInDraw) bestInDraw = hits;
      if (hits >= 11) {
        totalPrizeSimulated += PRIZE_TABLE_ESTIMATE[hits] ?? 0;
      }
    }
    if (bestInDraw >= 11) drawsWith11Plus++;
    if (bestInDraw >= 12) drawsWith12Plus++;
    if (bestInDraw >= 13) drawsWith13Plus++;
    if (bestInDraw > bestHitOverall) bestHitOverall = bestInDraw;
  }

  const singleContestCost =
    item.custoTotal > 0 ? item.custoTotal : total * VALOR_APOSTA_LOTOFACIL;
  const totalSimulatedCost = singleContestCost * Math.max(1, drawsCount);
  const historicalEstimatedRoiPct =
    totalSimulatedCost > 0
      ? Math.round((totalPrizeSimulated / totalSimulatedCost) * 100)
      : 0;
  const historicalHitRate11Plus =
    drawsCount > 0 ? Math.round((drawsWith11Plus / drawsCount) * 100) : 0;

  const universoLen = item.universoDezenas?.length || 15;
  const fixasLen = item.dezenasFixas?.length || 0;
  const hasFixasRisk = fixasLen > 3;

  let efficiencyLabel = `Universo ${universoLen} dez.`;
  let efficiencyTone: 'emerald' | 'sky' | 'amber' | 'slate' = 'slate';

  if (hasFixasRisk) {
    efficiencyLabel = `Risco combinatório (${fixasLen} fixas)`;
    efficiencyTone = 'amber';
  } else if (universoLen >= 16 && universoLen <= 18) {
    efficiencyLabel = `Alta Eficiência (${universoLen} dez.)`;
    efficiencyTone = 'emerald';
  } else if (universoLen === 25) {
    efficiencyLabel = 'Core + Satélites (25 dez.)';
    efficiencyTone = 'sky';
  } else if (universoLen >= 19 && universoLen <= 21) {
    efficiencyLabel =
      minHamming !== null && minHamming >= 3
        ? `Cobertura otimizada · Hamming ≥ 3`
        : `Universo ${universoLen} dez.`;
    efficiencyTone = minHamming !== null && minHamming >= 3 ? 'emerald' : 'sky';
  }

  return {
    avgScoreIA: Number((scoreSum / total).toFixed(1)),
    pctCentral: Math.round((centralCount / total) * 100),
    pctAlta: Math.round((altaCount / total) * 100),
    pctBaixa: Math.round((baixaCount / total) * 100),
    minHamming,
    efficiencyLabel,
    efficiencyTone,
    hasFixasRisk,
    historicalDrawsCount: drawsCount,
    historicalHitRate11Plus,
    historicalDrawsWith12Plus: drawsWith12Plus,
    historicalDrawsWith13Plus: drawsWith13Plus,
    historicalBestHit: bestHitOverall,
    historicalEstimatedRoiPct,
  };
}

export const HistoricoFechamentosRecentes: React.FC<HistoricoFechamentosRecentesProps> = ({
  latestDraw = CONCURSO_ATUAL,
  onApplyFilters,
  onGoToFechamento,
  onNotice,
  maxItems = 5,
}) => {
  const [items, setItems] = useState<SavedFechamentoPrognostico[]>(() =>
    getSavedFechamentos().slice(0, maxItems)
  );
  const [expandedId, setExpandedId] = useState<string | null>(() => {
    const initial = getSavedFechamentos();
    return initial[0]?.id ?? null;
  });
  const [appliedId, setAppliedId] = useState<string | null>(null);

  const reloadHistory = () => {
    const latest = getSavedFechamentos().slice(0, maxItems);
    setItems(latest);
    setExpandedId((prev) => {
      if (prev && latest.some((f) => f.id === prev)) return prev;
      return latest[0]?.id ?? null;
    });
  };

  useEffect(() => {
    const handleUpdate = () => reloadHistory();
    window.addEventListener('lotosniper-saved-fechamentos-updated', handleUpdate);
    window.addEventListener('lotosniper-saved-tickets-updated', handleUpdate);
    window.addEventListener('lotosniper-backup-restored', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('lotosniper-saved-fechamentos-updated', handleUpdate);
      window.removeEventListener('lotosniper-saved-tickets-updated', handleUpdate);
      window.removeEventListener('lotosniper-backup-restored', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, [maxItems]);

  const historicalDrawMasks = useMemo(() => {
    const draws = getHistorical100Draws(latestDraw);
    return draws.map((d) => numbersToBitmask(d.dezenas));
  }, [latestDraw.concurso]);

  const enrichedItems = useMemo(
    () =>
      items.map((item) => ({
        item,
        perf: computePerformance(item, historicalDrawMasks),
      })),
    [items, historicalDrawMasks]
  );

  const handleReapplyFilters = (item: SavedFechamentoPrognostico) => {
    if (!onApplyFilters) return;
    const restored: FilterCriteria = {
      ...DEFAULT_FILTERS,
      somaMin: item.faixaSoma.min,
      somaMax: item.faixaSoma.max,
      paresMin: item.paridade.minPares,
      paresMax: item.paridade.maxPares,
      molduraMin: item.moldura.min,
      molduraMax: item.moldura.max,
      primosMin: item.primos.min,
      primosMax: item.primos.max,
      fibonacciMin: item.fibonacci.min,
      fibonacciMax: item.fibonacci.max,
      repetidasMin: item.repetidas.min,
      repetidasMax: item.repetidas.max,
      maxConsecutivas: item.maxConsecutivas,
      dezenasFixas: item.dezenasFixas || [],
      dezenasExcluidas: item.dezenasExcluidas || [],
      autoCalibrarSomaUniverso: false,
      presetEstatistico: undefined,
    };
    onApplyFilters(restored);
    setAppliedId(item.id);
    onNotice?.(
      `Filtros do fechamento "${item.modalidadeMatriz}" (Concurso #${item.concursoAlvo}) carregados no motor.`
    );
    window.setTimeout(() => {
      setAppliedId((curr) => (curr === item.id ? null : curr));
    }, 2800);
  };

  const toneTextClass = (tone: FechamentoPerformanceSummary['efficiencyTone']) => {
    if (tone === 'emerald') return 'text-emerald-400';
    if (tone === 'sky') return 'text-sky-400';
    if (tone === 'amber') return 'text-amber-400';
    return 'text-slate-400';
  };

  return (
    <section className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-5 sm:px-6 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-slate-100">
            <History className="w-4 h-4 text-emerald-400 shrink-0" />
            <h3 className="text-base font-semibold tracking-tight">
              Histórico de Fechamentos Recentes
            </h3>
          </div>
          <p className="mt-1 text-sm text-slate-400">
            Últimos {maxItems} fechamentos gerados com resumo dos filtros utilizados e performance estimada nos últimos {historicalDrawMasks.length} resultados históricos.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-slate-500 font-mono tabular-nums">
            {items.length}/{maxItems} exibidos
          </span>
          <button
            type="button"
            onClick={reloadHistory}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800/70 hover:bg-slate-800 text-xs font-medium text-slate-200 transition cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
            Atualizar
          </button>
        </div>
      </div>

      {/* Empty State */}
      {enrichedItems.length === 0 ? (
        <div className="px-6 py-12 text-center">
          <p className="text-sm font-medium text-slate-200">
            Nenhum fechamento registrado ainda
          </p>
          <p className="mt-1.5 text-xs text-slate-400 max-w-md mx-auto">
            Assim que você gerar e salvar fechamentos no motor combinatório, os últimos {maxItems} aparecerão aqui com suas faixas de filtros e simulação contra os últimos {historicalDrawMasks.length} concursos.
          </p>
          {onGoToFechamento && (
            <button
              type="button"
              onClick={onGoToFechamento}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-xs font-semibold text-slate-950 transition cursor-pointer"
            >
              Gerar Primeiro Fechamento
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      ) : (
        <div className="divide-y divide-slate-800">
          {enrichedItems.map(({ item, perf }, idx) => {
            const isExpanded = expandedId === item.id;
            const isApplied = appliedId === item.id;

            return (
              <div key={item.id} className="transition-colors hover:bg-slate-800/20">
                {/* Summary Row */}
                <div className="px-5 py-4 sm:px-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                      <span className="text-xs font-mono tabular-nums text-slate-500">
                        #{idx + 1}
                      </span>
                      <h4 className="text-sm font-semibold text-slate-100 truncate">
                        {item.modalidadeMatriz || item.tipoFechamento}
                      </h4>
                      <span className="text-xs font-mono tabular-nums text-slate-400">
                        Concurso Alvo #{item.concursoAlvo}
                      </span>
                      <span className="text-xs text-slate-500 font-mono tabular-nums">
                        · {formatShortDate(item)}
                      </span>
                    </div>

                    {/* Compact Inline Filter Config Summary */}
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-slate-400 font-mono tabular-nums">
                      <span>Soma {item.faixaSoma.min}–{item.faixaSoma.max}</span>
                      <span className="text-slate-600">·</span>
                      <span>Pares {item.paridade.minPares}–{item.paridade.maxPares}</span>
                      <span className="text-slate-600">·</span>
                      <span>Moldura {item.moldura.min}–{item.moldura.max}</span>
                      <span className="text-slate-600">·</span>
                      <span>Primos {item.primos.min}–{item.primos.max}</span>
                      <span className="text-slate-600">·</span>
                      <span>Fib {item.fibonacci.min}–{item.fibonacci.max}</span>
                      <span className="text-slate-600">·</span>
                      <span>Rep {item.repetidas.min}–{item.repetidas.max}</span>
                      <span className="text-slate-600">·</span>
                      <span>Consec ≤ {item.maxConsecutivas}</span>
                    </div>

                    {/* Historical Backtest + Engine Metrics Line */}
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-400 font-mono tabular-nums">
                      <span>
                        Histórico ({perf.historicalDrawsCount} conc.):{' '}
                        <strong className="text-emerald-400 font-semibold">
                          {perf.historicalHitRate11Plus}% premiado (11+)
                        </strong>
                      </span>
                      <span className="text-slate-600">·</span>
                      <span>
                        Máx.{' '}
                        <strong className="text-slate-100 font-semibold">
                          {perf.historicalBestHit} pts
                        </strong>{' '}
                        ({perf.historicalDrawsWith12Plus}× 12+ / {perf.historicalDrawsWith13Plus}× 13+)
                      </span>
                      <span className="text-slate-600">·</span>
                      <span>
                        Retorno est.{' '}
                        <strong
                          className={
                            perf.historicalEstimatedRoiPct >= 100
                              ? 'text-emerald-400 font-semibold'
                              : 'text-slate-200 font-semibold'
                          }
                        >
                          {perf.historicalEstimatedRoiPct}%
                        </strong>
                      </span>
                      <span className="text-slate-600">·</span>
                      <span>
                        Score IA{' '}
                        <strong className="text-slate-100 font-semibold">
                          {perf.avgScoreIA.toFixed(1)}
                        </strong>
                      </span>
                      <span className="text-slate-600">·</span>
                      <span
                        className={`inline-flex items-center gap-1 font-sans font-medium ${toneTextClass(
                          perf.efficiencyTone
                        )}`}
                      >
                        {perf.hasFixasRisk && <AlertTriangle className="w-3 h-3 shrink-0" />}
                        {perf.efficiencyLabel}
                      </span>
                    </div>
                  </div>

                  {/* Right Metrics + Actions */}
                  <div className="flex flex-wrap items-center gap-4 shrink-0">
                    <div className="text-left lg:text-right font-mono tabular-nums">
                      <div className="text-sm font-semibold text-slate-100">
                        {formatCurrencyBRL(item.custoTotal)}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {item.universoDezenas.length} dez. · {item.totalJogos}{' '}
                        {item.totalJogos === 1 ? 'jogo' : 'jogos'}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {onApplyFilters && (
                        <button
                          type="button"
                          onClick={() => handleReapplyFilters(item)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition cursor-pointer ${
                            isApplied
                              ? 'border-emerald-500/60 bg-emerald-500/15 text-emerald-300'
                              : 'border-slate-700 bg-slate-800/70 hover:bg-slate-800 text-slate-200'
                          }`}
                        >
                          {isApplied ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              Aplicado
                            </>
                          ) : (
                            <>
                              <SlidersHorizontal className="w-3.5 h-3.5 text-sky-400" />
                              Reaplicar filtros
                            </>
                          )}
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => setExpandedId(isExpanded ? null : item.id)}
                        aria-expanded={isExpanded}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-800 bg-slate-950/60 hover:border-slate-700 text-xs font-medium text-slate-300 transition cursor-pointer"
                      >
                        Filtros
                        {isExpanded ? (
                          <ChevronUp className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Expanded Filter Configuration & Performance Breakdown */}
                {isExpanded && (
                  <div className="px-5 pb-5 sm:px-6 pt-1 border-t border-slate-800/60 bg-slate-950/40">
                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-x-4 gap-y-3 py-3">
                      <div>
                        <div className="text-[11px] text-slate-500">Soma</div>
                        <div className="mt-0.5 text-xs font-mono tabular-nums font-semibold text-slate-200">
                          {item.faixaSoma.min}–{item.faixaSoma.max}
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] text-slate-500">Pares</div>
                        <div className="mt-0.5 text-xs font-mono tabular-nums font-semibold text-slate-200">
                          {item.paridade.minPares}–{item.paridade.maxPares}
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] text-slate-500">Moldura</div>
                        <div className="mt-0.5 text-xs font-mono tabular-nums font-semibold text-slate-200">
                          {item.moldura.min}–{item.moldura.max}
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] text-slate-500">Primos</div>
                        <div className="mt-0.5 text-xs font-mono tabular-nums font-semibold text-slate-200">
                          {item.primos.min}–{item.primos.max}
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] text-slate-500">Fibonacci</div>
                        <div className="mt-0.5 text-xs font-mono tabular-nums font-semibold text-slate-200">
                          {item.fibonacci.min}–{item.fibonacci.max}
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] text-slate-500">Repetidas</div>
                        <div className="mt-0.5 text-xs font-mono tabular-nums font-semibold text-slate-200">
                          {item.repetidas.min}–{item.repetidas.max}
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] text-slate-500">Máx. Consec.</div>
                        <div className="mt-0.5 text-xs font-mono tabular-nums font-semibold text-slate-200">
                          até {item.maxConsecutivas}
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-800/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-slate-400">
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono tabular-nums">
                        <span>
                          Fixas ({item.dezenasFixas.length}):{' '}
                          <span className="text-slate-200">
                            {item.dezenasFixas.length > 0
                              ? item.dezenasFixas.map((n) => String(n).padStart(2, '0')).join(', ')
                              : 'Nenhuma'}
                          </span>
                        </span>
                        <span>
                          Excluídas ({item.dezenasExcluidas.length}):{' '}
                          <span className="text-slate-200">
                            {item.dezenasExcluidas.length > 0
                              ? item.dezenasExcluidas
                                  .map((n) => String(n).padStart(2, '0'))
                                  .join(', ')
                              : 'Nenhuma'}
                          </span>
                        </span>
                        <span>
                          Caudas {perf.pctCentral}% Central / {perf.pctAlta}% Alta / {perf.pctBaixa}% Baixa
                        </span>
                        {perf.minHamming !== null && <span>Hamming mín. {perf.minHamming}</span>}
                      </div>

                      <span className="text-[11px] text-slate-500">
                        {item.auditoriaAnomalias}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
