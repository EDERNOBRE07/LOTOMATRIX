import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ReferenceLine,
} from 'recharts';
import {
  DezenaStats,
  FechamentoMode,
  FilterCriteria,
  GameTicket,
  LotofacilDraw,
} from '../types/lotofacil';
import {
  VALOR_APOSTA_LOTOFACIL,
  criarMascara,
  generateFechamentoCovering,
  getCombinations,
} from '../services/combinatorics';
import {
  Layers,
  Play,
  Check,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  RotateCcw,
  ArrowUpDown,
  Award,
} from 'lucide-react';

export interface SetCoverCurvePoint {
  ticketCount: number;
  cobertura14Pct: number;
  cobertura13Pct: number;
  marginalGain14Pct: number;
}

export interface BatchMatrixVariationResult {
  poolSize: number;
  mode: FechamentoMode;
  subsetPool: number[];
  tickets: GameTicket[];
  targetHits: number;
  custoTotal: number;
  cobertura14Pct: number;
  cobertura13Pct: number;
  setCoverEfficiencyPct: number;
  overlapRedundancyPct: number;
  uniqueContributionTickets: number;
  eficiencia14Por10Reais: number;
  eficienciaPorJogo: number;
  minHamming: number;
  avgScoreIA: number;
  scenariosAudited: number;
  isExactAudit: boolean;
  durationMs: number;
  coverageCurve: SetCoverCurvePoint[];
}

interface BatchMatrixProcessorProps {
  latestDraw: LotofacilDraw;
  selectedNumbers: number[];
  fixedNumbers: number[];
  excludedNumbers: number[];
  effectiveFilters: FilterCriteria;
  dynamicStats: DezenaStats[];
  cyclePendingNumbers: number[];
  aiScores?: number[];
  onApplyVariation: (variation: BatchMatrixVariationResult) => void;
}

const AVAILABLE_POOL_SIZES = [16, 17, 18, 19, 20, 21] as const;

const POOL_COLORS: Record<number, string> = {
  16: '#a78bfa',
  17: '#10b981',
  18: '#fbbf24',
  19: '#38bdf8',
  20: '#fb7185',
  21: '#2dd4bf',
};

type BudgetPreset = 'auto' | '12' | '16' | '24';
type PoolSourceMode = 'ia_ciclo' | 'volante_atual' | 'frequencia';
type ChartMetricMode = 'cobertura14' | 'cobertura13';
type SortColumn =
  | 'poolSize'
  | 'tickets'
  | 'custoTotal'
  | 'setCoverEfficiencyPct'
  | 'cobertura14Pct'
  | 'cobertura13Pct'
  | 'eficienciaPorJogo'
  | 'minHamming';

const PRESET_TICKETS_BY_POOL: Record<
  number,
  { mode14: FechamentoMode; mode13: FechamentoMode; autoTickets: number }
> = {
  16: { mode14: '16_14_15', mode13: '16_14_15', autoTickets: 8 },
  17: { mode14: '17_14_15', mode13: '17_14_15', autoTickets: 8 },
  18: { mode14: '18_14_15', mode13: '18_13_14', autoTickets: 24 },
  19: { mode14: '19_14_15', mode13: '19_14_15', autoTickets: 18 },
  20: { mode14: '20_14_15', mode13: '20_compacto_9', autoTickets: 24 },
  21: { mode14: '21_13_15', mode13: '21_13_15', autoTickets: 24 },
};

function popcount25(mask: number): number {
  let x = mask;
  x = x - ((x >>> 1) & 0x55555555);
  x = (x & 0x33333333) + ((x >>> 2) & 0x33333333);
  return (((x + (x >>> 4)) & 0x0f0f0f0f) * 0x01010101) >>> 24;
}

/**
 * Audita cobertura bitwise real (14+ e 13+ pontos), eficiência de Set Cover
 * (taxa sem sobreposição redundante e bilhetes com contribuição única) e a
 * curva incremental Cobertura (%) vs Número de Bilhetes (k = 1..K).
 */
function auditVariationSetCoverBitwise(
  subsetPool: number[],
  tickets: GameTicket[],
  targetHits: 14 | 13
): {
  cobertura14Pct: number;
  cobertura13Pct: number;
  setCoverEfficiencyPct: number;
  overlapRedundancyPct: number;
  uniqueContributionTickets: number;
  minHamming: number;
  scenariosAudited: number;
  isExactAudit: boolean;
  coverageCurve: SetCoverCurvePoint[];
} {
  if (tickets.length === 0 || subsetPool.length < 15) {
    return {
      cobertura14Pct: 0,
      cobertura13Pct: 0,
      setCoverEfficiencyPct: 0,
      overlapRedundancyPct: 0,
      uniqueContributionTickets: 0,
      minHamming: 0,
      scenariosAudited: 0,
      isExactAudit: true,
      coverageCurve: [],
    };
  }

  const ticketMasks = tickets.map((t) => criarMascara(t.dezenas));

  // Hamming mínimo bitwise entre todos os pares de bilhetes
  let minHamming = 15;
  for (let i = 0; i < ticketMasks.length; i++) {
    for (let j = i + 1; j < ticketMasks.length; j++) {
      const common = popcount25(ticketMasks[i] & ticketMasks[j]);
      const diff = 15 - common;
      if (diff < minHamming) minHamming = diff;
    }
  }
  if (ticketMasks.length === 1) minHamming = 15;

  const sortedPool = [...subsetPool].sort((a, b) => a - b);
  const n = sortedPool.length;
  let scenarioMasks: number[] = [];
  let isExactAudit = false;

  if (n <= 18) {
    // Exato: C(16,15)=16, C(17,15)=136, C(18,15)=816
    const allCombos = getCombinations(sortedPool, 15);
    scenarioMasks = allCombos.map((c) => criarMascara(c));
    isExactAudit = true;
  } else {
    // Amostra determinística de 600 cenários de 15 dezenas dentro do subsetPool
    const targetSamples = 600;
    const seen = new Set<number>();
    let seed = (n * 7919 + sortedPool.reduce((acc, v) => acc + v * 31, 0)) % 2147483647;
    const nextRand = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };

    const indices = Array.from({ length: n }, (_, i) => i);
    let attempts = 0;
    while (scenarioMasks.length < targetSamples && attempts < targetSamples * 6) {
      attempts++;
      const copy = [...indices];
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(nextRand() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      let mask = 0;
      for (let k = 0; k < 15; k++) {
        mask |= 1 << (sortedPool[copy[k]] - 1);
      }
      if (!seen.has(mask)) {
        seen.add(mask);
        scenarioMasks.push(mask);
      }
    }
  }

  const total = scenarioMasks.length || 1;
  const kCount = ticketMasks.length;

  // Rastreia primeiro bilhete que cobre cada cenário (para curva incremental O(S * K))
  const firstCover14At = new Int32Array(kCount);
  const firstCover13At = new Int32Array(kCount);

  let covered14 = 0;
  let covered13 = 0;
  let targetCoveredDistinct = 0;
  let sumTicketTargetHits = 0;
  const uniqueHitsByTicket = new Array<number>(kCount).fill(0);

  for (let s = 0; s < scenarioMasks.length; s++) {
    const sMask = scenarioMasks[s];
    let bestHits = 0;
    let first14 = -1;
    let first13 = -1;
    let targetCoveringCount = 0;
    let soleCoveringTicketIdx = -1;

    for (let t = 0; t < kCount; t++) {
      const hits = popcount25(sMask & ticketMasks[t]);
      if (hits > bestHits) bestHits = hits;
      if (hits >= 14 && first14 === -1) first14 = t;
      if (hits >= 13 && first13 === -1) first13 = t;
      if (hits >= targetHits) {
        targetCoveringCount++;
        soleCoveringTicketIdx = t;
      }
    }

    if (first14 !== -1) firstCover14At[first14]++;
    if (first13 !== -1) firstCover13At[first13]++;

    if (bestHits >= 14) {
      covered14++;
      covered13++;
    } else if (bestHits >= 13) {
      covered13++;
    }

    if (targetCoveringCount > 0) {
      targetCoveredDistinct++;
      sumTicketTargetHits += targetCoveringCount;
      if (targetCoveringCount === 1 && soleCoveringTicketIdx >= 0) {
        uniqueHitsByTicket[soleCoveringTicketIdx]++;
      }
    }
  }

  // Constrói curva cumulativa Cobertura (%) vs Número de Bilhetes (1..kCount)
  const coverageCurve: SetCoverCurvePoint[] = [];
  let acc14 = 0;
  let acc13 = 0;
  let prev14Pct = 0;

  for (let t = 0; t < kCount; t++) {
    acc14 += firstCover14At[t];
    acc13 += firstCover13At[t];
    const pct14 = Number(((acc14 / total) * 100).toFixed(1));
    const pct13 = Number(((acc13 / total) * 100).toFixed(1));
    coverageCurve.push({
      ticketCount: t + 1,
      cobertura14Pct: pct14,
      cobertura13Pct: pct13,
      marginalGain14Pct: Number((pct14 - prev14Pct).toFixed(1)),
    });
    prev14Pct = pct14;
  }

  const uniqueContributionTickets = uniqueHitsByTicket.filter((c) => c > 0).length;
  const rawSetCoverEfficiency =
    sumTicketTargetHits > 0 ? (targetCoveredDistinct / sumTicketTargetHits) * 100 : 0;
  const setCoverEfficiencyPct = Number(
    Math.min(100, Math.max(0, rawSetCoverEfficiency)).toFixed(1)
  );
  const overlapRedundancyPct = Number(
    Math.max(0, 100 - setCoverEfficiencyPct).toFixed(1)
  );

  return {
    cobertura14Pct: Number(((covered14 / total) * 100).toFixed(1)),
    cobertura13Pct: Number(((covered13 / total) * 100).toFixed(1)),
    setCoverEfficiencyPct,
    overlapRedundancyPct,
    uniqueContributionTickets,
    minHamming,
    scenariosAudited: scenarioMasks.length,
    isExactAudit,
    coverageCurve,
  };
}

export const BatchMatrixProcessor: React.FC<BatchMatrixProcessorProps> = ({
  latestDraw,
  selectedNumbers,
  fixedNumbers,
  excludedNumbers,
  effectiveFilters,
  dynamicStats,
  cyclePendingNumbers,
  aiScores,
  onApplyVariation,
}) => {
  const [selectedPoolSizes, setSelectedPoolSizes] = useState<number[]>([17, 18, 19]);
  const [budgetPreset, setBudgetPreset] = useState<BudgetPreset>('16');
  const [targetHits, setTargetHits] = useState<14 | 13>(14);
  const [poolSource, setPoolSource] = useState<PoolSourceMode>('ia_ciclo');
  const [chartMetric, setChartMetric] = useState<ChartMetricMode>('cobertura14');
  const [sortColumn, setSortColumn] = useState<SortColumn>('poolSize');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progressLabel, setProgressLabel] = useState<string>('');
  const [results, setResults] = useState<BatchMatrixVariationResult[]>([]);
  const [expandedPoolSize, setExpandedPoolSize] = useState<number | null>(null);
  const [appliedPoolSize, setAppliedPoolSize] = useState<number | null>(null);
  const initialAutoRunDoneRef = useRef<boolean>(false);

  // Ordenação determinística das 25 dezenas para construir os subconjuntos de cada variação
  const rankedUniverse = useMemo(() => {
    const excludedSet = new Set(excludedNumbers);
    const fixedSet = new Set(fixedNumbers);
    const selectedSet = new Set(selectedNumbers);
    const cycleSet = new Set(cyclePendingNumbers);
    const latestSet = new Set(latestDraw.dezenas);

    const items = Array.from({ length: 25 }, (_, i) => {
      const num = i + 1;
      const stat = dynamicStats.find((s) => s.numero === num);
      const aiScore = aiScores && aiScores.length === 25 ? aiScores[i] : 60;
      const freq = stat?.vezes ?? 1800;
      const atraso = stat?.atrasoAtual ?? 0;

      let rankScore = 0;
      if (poolSource === 'volante_atual') {
        rankScore = (selectedSet.has(num) ? 1000 : 0) + aiScore * 2 + (cycleSet.has(num) ? 25 : 0);
      } else if (poolSource === 'frequencia') {
        rankScore = freq + (atraso >= 2 ? 40 : 0) + (cycleSet.has(num) ? 60 : 0);
      } else {
        rankScore =
          aiScore * 1.45 +
          (cycleSet.has(num) ? 24 : 0) +
          (latestSet.has(num) ? 8 : 0) +
          (selectedSet.has(num) ? 10 : 0);
      }

      return {
        num,
        isFixed: fixedSet.has(num),
        isExcluded: excludedSet.has(num),
        rankScore,
      };
    });

    items.sort((a, b) => {
      if (a.isExcluded !== b.isExcluded) return a.isExcluded ? 1 : -1;
      if (a.isFixed !== b.isFixed) return a.isFixed ? -1 : 1;
      if (b.rankScore !== a.rankScore) return b.rankScore - a.rankScore;
      return a.num - b.num;
    });

    return items.map((item) => item.num);
  }, [
    excludedNumbers,
    fixedNumbers,
    selectedNumbers,
    cyclePendingNumbers,
    latestDraw.dezenas,
    dynamicStats,
    aiScores,
    poolSource,
  ]);

  const togglePoolSize = (size: number) => {
    setSelectedPoolSizes((prev) => {
      if (prev.includes(size)) {
        if (prev.length === 1) return prev;
        return prev.filter((s) => s !== size);
      }
      return [...prev, size].sort((a, b) => a - b);
    });
  };

  const handleRunBatch = useCallback(async () => {
    if (selectedPoolSizes.length === 0) return;
    setIsProcessing(true);
    setAppliedPoolSize(null);
    const sortedSizes = [...selectedPoolSizes].sort((a, b) => a - b);
    setProgressLabel(
      `Calculando curvas Set Cover simultâneas para pools de ${sortedSizes.join(', ')} dezenas...`
    );

    await new Promise<void>((resolve) => window.setTimeout(resolve, 20));

    const batchOutput = await Promise.all(
      sortedSizes.map(
        (poolSize) =>
          new Promise<BatchMatrixVariationResult>((resolve) => {
            window.setTimeout(() => {
              const t0 = performance.now();
              const subsetPool = rankedUniverse.slice(0, poolSize).sort((a, b) => a - b);
              const presetMeta = PRESET_TICKETS_BY_POOL[poolSize] || PRESET_TICKETS_BY_POOL[18];
              const mode: FechamentoMode =
                targetHits === 14 ? presetMeta.mode14 : presetMeta.mode13;
              const maxTickets =
                budgetPreset === 'auto' ? presetMeta.autoTickets : Number(budgetPreset);

              const subsetSet = new Set(subsetPool);
              const scopedFilters: FilterCriteria = {
                ...effectiveFilters,
                dezenasFixas: fixedNumbers.filter((n) => subsetSet.has(n)),
                dezenasExcluidas: excludedNumbers.filter((n) => !subsetSet.has(n)),
              };

              const tickets = generateFechamentoCovering(
                subsetPool,
                targetHits,
                maxTickets,
                scopedFilters,
                latestDraw.dezenas,
                aiScores
              );

              const audit = auditVariationSetCoverBitwise(subsetPool, tickets, targetHits);
              const custoTotal = Number((tickets.length * VALOR_APOSTA_LOTOFACIL).toFixed(2));
              const eficiencia14Por10Reais =
                custoTotal > 0 ? Number((audit.cobertura14Pct / (custoTotal / 10)).toFixed(2)) : 0;
              const eficienciaPorJogo =
                tickets.length > 0 ? Number((audit.cobertura14Pct / tickets.length).toFixed(2)) : 0;
              const avgScoreIA =
                tickets.length > 0
                  ? Number(
                      (
                        tickets.reduce((acc, t) => acc + (t.scoreIA ?? 75), 0) / tickets.length
                      ).toFixed(1)
                    )
                  : 0;

              resolve({
                poolSize,
                mode,
                subsetPool,
                tickets,
                targetHits,
                custoTotal,
                cobertura14Pct: audit.cobertura14Pct,
                cobertura13Pct: audit.cobertura13Pct,
                setCoverEfficiencyPct: audit.setCoverEfficiencyPct,
                overlapRedundancyPct: audit.overlapRedundancyPct,
                uniqueContributionTickets: audit.uniqueContributionTickets,
                eficiencia14Por10Reais,
                eficienciaPorJogo,
                minHamming: audit.minHamming,
                avgScoreIA,
                scenariosAudited: audit.scenariosAudited,
                isExactAudit: audit.isExactAudit,
                durationMs: Math.max(1, Math.round(performance.now() - t0)),
                coverageCurve: audit.coverageCurve,
              });
            }, 0);
          })
      )
    );

    setResults(batchOutput.sort((a, b) => a.poolSize - b.poolSize));
    setProgressLabel('');
    setIsProcessing(false);
  }, [
    selectedPoolSizes,
    rankedUniverse,
    targetHits,
    budgetPreset,
    effectiveFilters,
    fixedNumbers,
    excludedNumbers,
    latestDraw.dezenas,
    aiScores,
  ]);

  // Carrega automaticamente a comparação inicial 17 · 18 · 19 dezenas ao abrir a aba
  useEffect(() => {
    if (initialAutoRunDoneRef.current) return;
    initialAutoRunDoneRef.current = true;
    const timer = window.setTimeout(() => {
      handleRunBatch();
    }, 60);
    return () => window.clearTimeout(timer);
  }, [handleRunBatch]);

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(column);
      setSortDir(column === 'poolSize' || column === 'custoTotal' ? 'asc' : 'desc');
    }
  };

  const sortedResults = useMemo(() => {
    const list = [...results];
    const factor = sortDir === 'asc' ? 1 : -1;
    list.sort((a, b) => {
      const valA = sortColumn === 'tickets' ? a.tickets.length : a[sortColumn];
      const valB = sortColumn === 'tickets' ? b.tickets.length : b[sortColumn];
      return (valA - valB) * factor || a.poolSize - b.poolSize;
    });
    return list;
  }, [results, sortColumn, sortDir]);

  const summary = useMemo(() => {
    if (results.length === 0) return null;
    const bestEfficiency = [...results].sort(
      (a, b) =>
        b.eficiencia14Por10Reais - a.eficiencia14Por10Reais ||
        b.setCoverEfficiencyPct - a.setCoverEfficiencyPct
    )[0];
    const bestSetCover = [...results].sort(
      (a, b) =>
        b.setCoverEfficiencyPct - a.setCoverEfficiencyPct || b.cobertura14Pct - a.cobertura14Pct
    )[0];
    const bestCoverage14 = [...results].sort(
      (a, b) => b.cobertura14Pct - a.cobertura14Pct || a.custoTotal - b.custoTotal
    )[0];
    const totalTickets = results.reduce((acc, r) => acc + r.tickets.length, 0);
    const totalMs = results.reduce((acc, r) => acc + r.durationMs, 0);
    return { bestEfficiency, bestSetCover, bestCoverage14, totalTickets, totalMs };
  }, [results]);

  // Série Recharts: Cobertura Set Cover (%) vs Número de Bilhetes (k = 1..maxTickets) por tamanho de pool
  const curveChartData = useMemo(() => {
    if (results.length === 0) return [];
    const maxK = Math.max(...results.map((r) => r.coverageCurve.length), 0);
    const rows: Array<Record<string, number | string>> = [];

    for (let k = 1; k <= maxK; k++) {
      const row: Record<string, number | string> = {
        bilhetes: k,
        label: `${k}J`,
      };
      for (const res of results) {
        const pt = res.coverageCurve[k - 1];
        if (pt) {
          row[`pool_${res.poolSize}`] =
            chartMetric === 'cobertura14' ? pt.cobertura14Pct : pt.cobertura13Pct;
          row[`gain_${res.poolSize}`] = pt.marginalGain14Pct;
        }
      }
      rows.push(row);
    }
    return rows;
  }, [results, chartMetric]);

  const handleApply = (variation: BatchMatrixVariationResult) => {
    onApplyVariation(variation);
    setAppliedPoolSize(variation.poolSize);
    window.setTimeout(() => setAppliedPoolSize(null), 3500);
  };

  const isPreset171819 =
    selectedPoolSizes.length === 3 &&
    selectedPoolSizes[0] === 17 &&
    selectedPoolSizes[1] === 18 &&
    selectedPoolSizes[2] === 19;

  const renderSortButton = (col: SortColumn, label: string, alignRight = true) => {
    const active = sortColumn === col;
    return (
      <button
        type="button"
        onClick={() => handleSort(col)}
        className={`inline-flex items-center gap-1 font-medium transition cursor-pointer ${
          alignRight ? 'justify-end ml-auto' : 'justify-start'
        } ${active ? 'text-emerald-400' : 'text-slate-400 hover:text-slate-200'}`}
      >
        <span>{label}</span>
        <ArrowUpDown className={`w-3 h-3 ${active ? 'text-emerald-400' : 'text-slate-600'}`} />
      </button>
    );
  };

  return (
    <section
      id="batch-matrix-processor"
      aria-label="Batch Processor de Fechamentos Simultâneos"
      className="bg-slate-900 border border-slate-800 rounded-xl p-5 sm:p-6 space-y-5"
    >
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
            <Layers className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="text-emerald-400 font-medium">Batch Processor</span>
            <span aria-hidden="true">·</span>
            <span>Curva Set Cover (Cobertura × Bilhetes)</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">Concurso #{latestDraw.concurso}</span>
          </div>
          <h3 className="text-base sm:text-lg font-semibold text-white tracking-tight">
            Comparativo Dinâmico de Pools (17 · 18 · 19 Dezenas) &amp; Eficiência Set Cover
          </h3>
          <p className="text-xs text-slate-400 max-w-2xl">
            Gere fechamentos simultâneos e acompanhe no gráfico Recharts como a cobertura real evolui bilhete a bilhete em cada tamanho de universo, com tabela comparativa ordenável lado a lado.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {results.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setResults([]);
                setExpandedPoolSize(null);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition cursor-pointer whitespace-nowrap shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Limpar</span>
            </button>
          )}
          <button
            type="button"
            disabled={isProcessing || selectedPoolSizes.length === 0}
            onClick={handleRunBatch}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition whitespace-nowrap shrink-0 ${
              isProcessing
                ? 'bg-slate-800 text-slate-400 cursor-wait'
                : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 cursor-pointer'
            }`}
          >
            <Play className="w-3.5 h-3.5" />
            <span>
              {isProcessing
                ? 'Processando Lote...'
                : `Recalcular (${selectedPoolSizes.join(' · ')} Dez.)`}
            </span>
          </button>
        </div>
      </div>

      {/* Controls Strip */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 pb-4 border-b border-slate-800/80">
        {/* Subset Pool Sizes */}
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="font-medium text-slate-300">Tamanhos de Pool</span>
            {!isPreset171819 && (
              <button
                type="button"
                onClick={() => setSelectedPoolSizes([17, 18, 19])}
                className="text-[11px] font-mono text-emerald-400 hover:text-emerald-300 transition cursor-pointer"
              >
                Padrão 17·18·19
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {AVAILABLE_POOL_SIZES.map((size) => {
              const active = selectedPoolSizes.includes(size);
              return (
                <button
                  key={size}
                  type="button"
                  aria-pressed={active}
                  onClick={() => togglePoolSize(size)}
                  className={`px-2.5 py-1.5 rounded-md font-mono tabular-nums text-xs font-semibold border transition cursor-pointer whitespace-nowrap shrink-0 ${
                    active
                      ? 'bg-emerald-500/20 border-emerald-500/60 text-emerald-300'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                  }`}
                >
                  {size}
                </button>
              );
            })}
          </div>
        </div>

        {/* Budget / Ticket Count */}
        <div className="space-y-2">
          <div className="text-xs font-medium text-slate-300">Teto de Bilhetes / Pool</div>
          <div className="flex flex-wrap gap-1 p-0.5 rounded-lg bg-slate-950 border border-slate-800">
            {(
              [
                { id: '12', label: '12 J' },
                { id: '16', label: '16 J' },
                { id: '24', label: '24 J' },
                { id: 'auto', label: 'Preset' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setBudgetPreset(opt.id)}
                className={`flex-1 px-2 py-1 rounded-md text-xs font-medium transition cursor-pointer whitespace-nowrap ${
                  budgetPreset === opt.id
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Target Guarantee */}
        <div className="space-y-2">
          <div className="text-xs font-medium text-slate-300">Alvo Set Cover</div>
          <div className="flex gap-1 p-0.5 rounded-lg bg-slate-950 border border-slate-800">
            {([14, 13] as const).map((hits) => (
              <button
                key={hits}
                type="button"
                onClick={() => setTargetHits(hits)}
                className={`flex-1 px-2.5 py-1 rounded-md text-xs font-mono tabular-nums font-medium transition cursor-pointer whitespace-nowrap ${
                  targetHits === hits
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {hits} Pontos
              </button>
            ))}
          </div>
        </div>

        {/* Pool Ranking Source */}
        <div className="space-y-2">
          <div className="text-xs font-medium text-slate-300">Origem das Dezenas</div>
          <div className="flex gap-1 p-0.5 rounded-lg bg-slate-950 border border-slate-800">
            {(
              [
                { id: 'ia_ciclo', label: 'IA + Ciclo' },
                { id: 'volante_atual', label: 'Volante' },
                { id: 'frequencia', label: 'Freq.' },
              ] as const
            ).map((src) => (
              <button
                key={src.id}
                type="button"
                onClick={() => setPoolSource(src.id)}
                className={`flex-1 px-2 py-1 rounded-md text-xs font-medium transition cursor-pointer whitespace-nowrap ${
                  poolSource === src.id
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {src.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Live Progress */}
      {isProcessing && (
        <div className="py-6 text-center space-y-2">
          <div className="text-xs font-mono text-emerald-400">{progressLabel}</div>
          <div className="max-w-md mx-auto h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full w-2/3 bg-emerald-500 animate-pulse rounded-full" />
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isProcessing && results.length === 0 && (
        <div className="py-5 px-4 rounded-lg bg-slate-950/60 border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p className="text-xs sm:text-sm text-slate-300">
            Pools selecionados:{' '}
            <strong className="font-mono text-emerald-400">
              {selectedPoolSizes.map((s) => `${s} Dez.`).join(' · ')}
            </strong>{' '}
            — clique em calcular para gerar a curva Cobertura × Bilhetes e a tabela comparativa.
          </p>
          <button
            type="button"
            onClick={handleRunBatch}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-emerald-500/50 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 text-xs font-semibold transition cursor-pointer shrink-0 self-start sm:self-auto"
          >
            <Play className="w-3.5 h-3.5" />
            <span>Comparar Pools</span>
          </button>
        </div>
      )}

      {/* Results View */}
      {!isProcessing && results.length > 0 && summary && (
        <div className="space-y-5">
          {/* KPI Summary Row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pb-4 border-b border-slate-800/80 font-mono tabular-nums">
            <div>
              <div className="text-[11px] font-sans text-slate-400">Melhor Eficiência Set Cover</div>
              <div className="mt-1 text-lg font-semibold text-emerald-400">
                {summary.bestSetCover.poolSize} Dez. · {summary.bestSetCover.setCoverEfficiencyPct.toFixed(1)}%
              </div>
              <div className="text-[11px] font-sans text-slate-500">
                Redundância {summary.bestSetCover.overlapRedundancyPct.toFixed(1)}% ·{' '}
                {summary.bestSetCover.uniqueContributionTickets}/{summary.bestSetCover.tickets.length} únicos
              </div>
            </div>

            <div>
              <div className="text-[11px] font-sans text-slate-400">Maior Cobertura 14+ pts</div>
              <div className="mt-1 text-lg font-semibold text-white">
                {summary.bestCoverage14.poolSize} Dez. · {summary.bestCoverage14.cobertura14Pct.toFixed(1)}%
              </div>
              <div className="text-[11px] font-sans text-slate-500">
                13+ pts: {summary.bestCoverage14.cobertura13Pct.toFixed(1)}% · R${' '}
                {summary.bestCoverage14.custoTotal.toFixed(2).replace('.', ',')}
              </div>
            </div>

            <div>
              <div className="text-[11px] font-sans text-slate-400">Melhor Retorno / R$ 10</div>
              <div className="mt-1 text-lg font-semibold text-amber-300">
                {summary.bestEfficiency.poolSize} Dez. · {summary.bestEfficiency.eficiencia14Por10Reais.toFixed(1)}%
              </div>
              <div className="text-[11px] font-sans text-slate-500">
                {summary.bestEfficiency.eficienciaPorJogo.toFixed(2)}% de cobertura/bilhete
              </div>
            </div>

            <div>
              <div className="text-[11px] font-sans text-slate-400">Auditoria Simultânea</div>
              <div className="mt-1 text-lg font-semibold text-sky-400">
                {results.length} pools · {summary.totalTickets} jogos
              </div>
              <div className="text-[11px] font-sans text-slate-500">
                Processado em {summary.totalMs} ms
              </div>
            </div>
          </div>

          {/* Recharts: Curva de Eficiência Set Cover — Cobertura (%) vs Número de Bilhetes */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4 className="text-xs sm:text-sm font-semibold text-slate-100">
                  Curva de Eficiência Set Cover — Cobertura Acumulada vs Número de Bilhetes
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Evolução real da cobertura conforme novos bilhetes são adicionados pelo algoritmo greedy em cada tamanho de pool.
                </p>
              </div>
              <div className="flex items-center gap-1 p-0.5 rounded-lg bg-slate-900 border border-slate-800 text-xs self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setChartMetric('cobertura14')}
                  className={`px-2.5 py-1 rounded-md font-medium transition cursor-pointer whitespace-nowrap ${
                    chartMetric === 'cobertura14'
                      ? 'bg-slate-800 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Garantia 14+ pts
                </button>
                <button
                  type="button"
                  onClick={() => setChartMetric('cobertura13')}
                  className={`px-2.5 py-1 rounded-md font-medium transition cursor-pointer whitespace-nowrap ${
                    chartMetric === 'cobertura13'
                      ? 'bg-slate-800 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Garantia 13+ pts
                </button>
              </div>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={curveChartData} margin={{ top: 10, right: 18, left: -12, bottom: 6 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis
                    dataKey="bilhetes"
                    stroke="#64748b"
                    tick={{ fill: '#cbd5e1', fontSize: 11, fontFamily: 'monospace' }}
                    tickLine={false}
                    tickFormatter={(v) => `${v}J`}
                    label={{
                      value: 'Número de Bilhetes',
                      position: 'insideBottom',
                      offset: -2,
                      fill: '#64748b',
                      fontSize: 10,
                    }}
                  />
                  <YAxis
                    stroke="#64748b"
                    tick={{ fill: '#94a3b8', fontSize: 10, fontFamily: 'monospace' }}
                    tickLine={false}
                    domain={[0, 100]}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <ReferenceLine
                    y={80}
                    stroke="#334155"
                    strokeDasharray="4 4"
                    label={{
                      value: 'Meta 80%',
                      position: 'insideTopRight',
                      fill: '#64748b',
                      fontSize: 10,
                    }}
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload || !payload.length) return null;
                      return (
                        <div className="bg-slate-950 border border-slate-700 rounded-lg p-3 text-xs font-mono tabular-nums space-y-1.5 shadow-xl">
                          <div className="font-semibold text-white border-b border-slate-800 pb-1">
                            Com {label} {Number(label) === 1 ? 'Bilhete' : 'Bilhetes'} (R${' '}
                            {(Number(label) * VALOR_APOSTA_LOTOFACIL).toFixed(2).replace('.', ',')})
                          </div>
                          {payload.map((entry) => {
                            const poolNum = String(entry.dataKey).replace('pool_', '');
                            const gainVal = entry.payload?.[`gain_${poolNum}`];
                            return (
                              <div
                                key={String(entry.dataKey)}
                                className="flex items-center justify-between gap-5"
                              >
                                <span style={{ color: entry.color }}>{entry.name}:</span>
                                <span className="text-slate-100 font-semibold">
                                  {entry.value}%
                                  {chartMetric === 'cobertura14' && typeof gainVal === 'number' && (
                                    <span className="text-slate-500 font-normal ml-1.5">
                                      (+{gainVal}%)
                                    </span>
                                  )}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      );
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', color: '#cbd5e1', paddingTop: '6px' }} />
                  {results.map((res) => {
                    const strokeColor = POOL_COLORS[res.poolSize] || '#38bdf8';
                    return (
                      <Line
                        key={`line-${res.poolSize}`}
                        type="monotone"
                        dataKey={`pool_${res.poolSize}`}
                        name={`Pool ${res.poolSize} Dez. (${res.tickets.length}J)`}
                        stroke={strokeColor}
                        strokeWidth={2.4}
                        dot={{ r: 3, fill: strokeColor, strokeWidth: 0 }}
                        activeDot={{ r: 5, stroke: '#020617', strokeWidth: 1.5 }}
                        connectNulls={false}
                      />
                    );
                  })}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Tabela Comparativa Dinâmica (Ordenável por Qualquer Métrica) */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="font-semibold text-slate-200">
                Tabela Comparativa Dinâmica — Pools {results.map((r) => r.poolSize).join(' · ')} Dezenas
              </span>
              <span className="text-[11px] text-slate-500">
                Clique nos cabeçalhos para ordenar · clique em Bilhetes para inspecionar as dezenas
              </span>
            </div>

            <div className="overflow-x-auto border border-slate-800 rounded-lg">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-950/90 border-b border-slate-800 text-slate-400">
                    <th className="py-2.5 px-3">{renderSortButton('poolSize', 'Pool', false)}</th>
                    <th className="py-2.5 px-3 text-right">{renderSortButton('tickets', 'Bilhetes')}</th>
                    <th className="py-2.5 px-3 text-right">{renderSortButton('custoTotal', 'Custo')}</th>
                    <th className="py-2.5 px-3 text-right">
                      {renderSortButton('setCoverEfficiencyPct', 'Set Cover')}
                    </th>
                    <th className="py-2.5 px-3 text-right">
                      {renderSortButton('cobertura14Pct', 'Cob. 14+')}
                    </th>
                    <th className="py-2.5 px-3 text-right">
                      {renderSortButton('cobertura13Pct', 'Cob. 13+')}
                    </th>
                    <th className="py-2.5 px-3 text-right">
                      {renderSortButton('eficienciaPorJogo', 'Cob./Bilhete')}
                    </th>
                    <th className="py-2.5 px-3 text-right">
                      {renderSortButton('minHamming', 'Hamming')}
                    </th>
                    <th className="py-2.5 px-3 text-right font-medium text-slate-400">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 font-mono tabular-nums">
                  {sortedResults.map((item) => {
                    const isWinner = item.poolSize === summary.bestSetCover.poolSize;
                    const isExpanded = expandedPoolSize === item.poolSize;
                    const isApplied = appliedPoolSize === item.poolSize;
                    const poolAccent = POOL_COLORS[item.poolSize] || '#38bdf8';

                    return (
                      <React.Fragment key={item.poolSize}>
                        <tr
                          className={`transition-colors ${
                            isWinner
                              ? 'bg-emerald-950/20 hover:bg-emerald-950/30'
                              : 'hover:bg-slate-800/30'
                          }`}
                        >
                          <td className="py-3 px-3 font-sans">
                            <div className="flex items-center gap-2">
                              <span
                                className="w-2 h-2 rounded-full shrink-0"
                                style={{ backgroundColor: poolAccent }}
                                aria-hidden="true"
                              />
                              <span className="font-mono font-semibold text-white">
                                {item.poolSize} Dezenas
                              </span>
                              {isWinner && (
                                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400">
                                  <Award className="w-3 h-3" />
                                  Líder
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] font-mono text-slate-500 mt-0.5 pl-4">
                              {item.uniqueContributionTickets}/{item.tickets.length} únicos ·{' '}
                              {item.isExactAudit
                                ? `Exato (${item.scenariosAudited})`
                                : `Amostra (${item.scenariosAudited})`}
                            </div>
                          </td>
                          <td className="py-3 px-3 text-right text-slate-200 font-semibold">
                            {item.tickets.length}
                          </td>
                          <td className="py-3 px-3 text-right text-slate-300">
                            R$ {item.custoTotal.toFixed(2).replace('.', ',')}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <div className="font-semibold text-emerald-400">
                              {item.setCoverEfficiencyPct.toFixed(1)}%
                            </div>
                            <div className="w-16 ml-auto h-1 bg-slate-800 rounded-full overflow-hidden mt-1">
                              <div
                                className="h-full bg-emerald-400 rounded-full"
                                style={{ width: `${Math.min(100, item.setCoverEfficiencyPct)}%` }}
                              />
                            </div>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <div className="font-semibold text-amber-300">
                              {item.cobertura14Pct.toFixed(1)}%
                            </div>
                            <div className="w-16 ml-auto h-1 bg-slate-800 rounded-full overflow-hidden mt-1">
                              <div
                                className="h-full bg-amber-400 rounded-full"
                                style={{ width: `${Math.min(100, item.cobertura14Pct)}%` }}
                              />
                            </div>
                          </td>
                          <td className="py-3 px-3 text-right text-sky-400 font-semibold">
                            {item.cobertura13Pct.toFixed(1)}%
                          </td>
                          <td className="py-3 px-3 text-right text-slate-200">
                            {item.eficienciaPorJogo.toFixed(2)}%
                          </td>
                          <td className="py-3 px-3 text-right text-slate-300">
                            ≥{item.minHamming}
                          </td>
                          <td className="py-3 px-3 text-right font-sans">
                            <div className="inline-flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() =>
                                  setExpandedPoolSize(isExpanded ? null : item.poolSize)
                                }
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium transition cursor-pointer whitespace-nowrap"
                              >
                                {isExpanded ? (
                                  <ChevronUp className="w-3 h-3" />
                                ) : (
                                  <ChevronDown className="w-3 h-3" />
                                )}
                                <span>Bilhetes</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleApply(item)}
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold transition cursor-pointer whitespace-nowrap ${
                                  isApplied
                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50'
                                    : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                                }`}
                              >
                                {isApplied ? (
                                  <>
                                    <Check className="w-3 h-3" />
                                    <span>Aplicado</span>
                                  </>
                                ) : (
                                  <>
                                    <span>Aplicar</span>
                                    <ArrowRight className="w-3 h-3" />
                                  </>
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>

                        {isExpanded && (
                          <tr className="bg-slate-950/75">
                            <td colSpan={9} className="p-3.5 space-y-2.5 font-sans">
                              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                                <span className="text-slate-400">
                                  Subset Pool ({item.poolSize} dezenas):{' '}
                                  <strong className="font-mono text-slate-200">
                                    {item.subsetPool
                                      .map((n) => String(n).padStart(2, '0'))
                                      .join(' · ')}
                                  </strong>
                                </span>
                                <span className="font-mono text-[11px] text-slate-500">
                                  Redundância: {item.overlapRedundancyPct.toFixed(1)}% · Efic. / R$10:{' '}
                                  {item.eficiencia14Por10Reais.toFixed(1)}% · Score IA médio:{' '}
                                  {item.avgScoreIA.toFixed(1)}
                                </span>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
                                {item.tickets.map((t) => (
                                  <div
                                    key={`${item.poolSize}-${t.id}`}
                                    className="px-2.5 py-1.5 rounded border border-slate-800 bg-slate-900/90 flex items-center justify-between gap-2 text-[11px] font-mono tabular-nums"
                                  >
                                    <span className="text-slate-500">
                                      J{String(t.index).padStart(2, '0')}
                                    </span>
                                    <span className="text-slate-200 truncate">
                                      {t.dezenas.map((d) => String(d).padStart(2, '0')).join(' ')}
                                    </span>
                                    <span className="text-slate-400 shrink-0">S:{t.soma}</span>
                                  </div>
                                ))}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
