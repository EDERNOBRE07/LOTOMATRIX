import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Calendar,
  RefreshCw,
  ArrowUpRight,
  BarChart3,
  LineChart as LineChartIcon,
  CheckCircle2,
} from 'lucide-react';
import {
  LotofacilDraw,
  DezenaStats,
  GameTicket,
  FechamentoMode,
  FilterCriteria,
} from '../types/lotofacil';
import { CONCURSO_ATUAL, DEZENAS_STATS } from '../data/lotofacilData';
import { getHistoricalNDraws } from '../services/historical100Draws';
import {
  VALOR_APOSTA_LOTOFACIL,
  countMatches,
  generateFechamentoCovering,
  DEFAULT_FILTERS,
} from '../services/combinatorics';

interface DashboardRoiHistoricoEstimadoProps {
  latestDraw?: LotofacilDraw;
  statsList?: DezenaStats[];
  savedTickets?: GameTicket[];
  filters?: FilterCriteria;
  onApplyNumbers?: (numbers: number[]) => void;
}

type StrategyId =
  | 'saved'
  | '16_14_15'
  | '17_14_15'
  | '18_ultra_economico_6'
  | '18_13_14'
  | '18_14_15'
  | '20_compacto_9';

type UniverseSelectorMode = 'frequencia' | 'equilibrado' | 'atraso_ciclo';
type ChartViewMode = 'curva_saldo' | 'mensal_barras';

interface StrategyOption {
  id: Exclude<StrategyId, 'saved'>;
  label: string;
  shortLabel: string;
  universeSize: number;
  ticketsCount: number;
  targetHits: number;
  mode: FechamentoMode;
}

const STRATEGY_OPTIONS: StrategyOption[] = [
  {
    id: '16_14_15',
    label: '16 Dezenas · 8 Jogos (Alta Eficiência)',
    shortLabel: '16 Dez / 8 Jogos',
    universeSize: 16,
    ticketsCount: 8,
    targetHits: 14,
    mode: '16_14_15',
  },
  {
    id: '17_14_15',
    label: '17 Dezenas · 12 Jogos (Garantia 14 pts)',
    shortLabel: '17 Dez / 12 Jogos',
    universeSize: 17,
    ticketsCount: 12,
    targetHits: 14,
    mode: '17_14_15',
  },
  {
    id: '18_ultra_economico_6',
    label: '18 Dezenas · 6 Jogos (Ultra Econômico)',
    shortLabel: '18 Dez / 6 Jogos',
    universeSize: 18,
    ticketsCount: 6,
    targetHits: 13,
    mode: '18_ultra_economico_6',
  },
  {
    id: '18_13_14',
    label: '18 Dezenas · 12 Jogos (Garantia 13 pts)',
    shortLabel: '18 Dez / 12 Jogos',
    universeSize: 18,
    ticketsCount: 12,
    targetHits: 13,
    mode: '18_13_14',
  },
  {
    id: '18_14_15',
    label: '18 Dezenas · 24 Jogos (Padrão Ouro 14 pts)',
    shortLabel: '18 Dez / 24 Jogos',
    universeSize: 18,
    ticketsCount: 24,
    targetHits: 14,
    mode: '18_14_15',
  },
  {
    id: '20_compacto_9',
    label: '20 Dezenas · 9 Jogos (Cobertura Ampla)',
    shortLabel: '20 Dez / 9 Jogos',
    universeSize: 20,
    ticketsCount: 9,
    targetHits: 13,
    mode: '20_compacto_9',
  },
];

const MONTH_LABELS = [
  'Jan',
  'Fev',
  'Mar',
  'Abr',
  'Mai',
  'Jun',
  'Jul',
  'Ago',
  'Set',
  'Out',
  'Nov',
  'Dez',
];

const PREMIO_PADRAO_CAIXA = {
  11: 7.0,
  12: 14.0,
  13: 35.0,
  14: 1505.65,
  15: 1805183.78,
};

function parsePtBrDateParts(dateStr: string): { day: number; month: number; year: number } | null {
  if (!dateStr) return null;
  const parts = dateStr.trim().split('/');
  if (parts.length !== 3) return null;
  const day = Number(parts[0]);
  const month = Number(parts[1]);
  const year = Number(parts[2]);
  if (!Number.isFinite(day) || !Number.isFinite(month) || !Number.isFinite(year)) return null;
  return { day, month, year };
}

function formatBRL(value: number, showSign: boolean = false): string {
  const absFormatted = Math.abs(value).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  if (value < 0) return `-R$ ${absFormatted}`;
  if (showSign && value > 0) return `+R$ ${absFormatted}`;
  return `R$ ${absFormatted}`;
}

function formatCompactBRL(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  if (abs >= 1_000_000) return `${sign}R$ ${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}R$ ${(abs / 1_000).toFixed(1)}k`;
  return `${sign}R$ ${abs.toFixed(0)}`;
}

interface DrawTimelinePoint {
  concurso: number;
  label: string;
  data: string;
  monthIndex: number;
  custoConcurso: number;
  premioConcurso: number;
  saldoConcurso: number;
  custoAcumulado: number;
  premioAcumulado: number;
  saldoAcumulado: number;
  roiAcumulado: number;
  melhorAcerto: number;
  premiadosNoConcurso: number;
}

interface MonthlySummaryRow {
  monthIndex: number;
  monthLabel: string;
  concursos: number;
  investido: number;
  premios: number;
  saldoMes: number;
  saldoAcumulado: number;
  melhorAcerto: number;
  acertos13Plus: number;
}

export const DashboardRoiHistoricoEstimado: React.FC<DashboardRoiHistoricoEstimadoProps> = ({
  latestDraw = CONCURSO_ATUAL,
  statsList = DEZENAS_STATS,
  savedTickets = [],
  filters,
  onApplyNumbers,
}) => {
  const hasSavedTickets = savedTickets.length > 0;
  const [selectedStrategy, setSelectedStrategy] = useState<StrategyId>(
    hasSavedTickets ? 'saved' : '18_13_14'
  );
  const [universeMode, setUniverseMode] = useState<UniverseSelectorMode>('equilibrado');
  const [chartView, setChartView] = useState<ChartViewMode>('curva_saldo');
  const [rotationOffset, setRotationOffset] = useState<number>(0);
  const [appliedBanner, setAppliedBanner] = useState<boolean>(false);

  // Resolve o ano corrente com base no concurso oficial mais recente
  const currentYear = useMemo(() => {
    const parsed = parsePtBrDateParts(latestDraw.data);
    return parsed?.year || new Date().getFullYear();
  }, [latestDraw.data]);

  // Coleta todos os concursos pertencentes ao ano corrente em ordem cronológica (Jan -> Atual)
  const currentYearDraws = useMemo(() => {
    const rawHistory = getHistoricalNDraws(360, latestDraw);
    const matched = rawHistory
      .filter((draw) => {
        const parsed = parsePtBrDateParts(draw.data);
        return parsed?.year === currentYear;
      })
      .sort((a, b) => a.concurso - b.concurso);

    if (matched.length >= 12) {
      return matched;
    }

    // Fallback seguro caso o concurso externo venha de início de ano com poucos registros
    return rawHistory.slice(0, 120).sort((a, b) => a.concurso - b.concurso);
  }, [latestDraw, currentYear]);

  // Seleciona o universo de dezenas para a estratégia escolhida
  const simulatedUniverse = useMemo(() => {
    if (selectedStrategy === 'saved' && savedTickets.length > 0) {
      const unique = new Set<number>();
      savedTickets.forEach((t) => t.dezenas.forEach((d) => unique.add(d)));
      return Array.from(unique).sort((a, b) => a - b);
    }

    const opt =
      STRATEGY_OPTIONS.find((s) => s.id === selectedStrategy) || STRATEGY_OPTIONS[3];
    const baseStats =
      statsList && statsList.length === 25 ? [...statsList] : [...DEZENAS_STATS];

    const ranked = baseStats.sort((a, b) => {
      if (universeMode === 'frequencia') {
        return b.vezes - a.vezes || a.atrasoAtual - b.atrasoAtual;
      }
      if (universeMode === 'atraso_ciclo') {
        const scoreA = (a.pendenteNoCiclo ? 25 : 0) + a.atrasoAtual * 4 + a.vezes * 0.15;
        const scoreB = (b.pendenteNoCiclo ? 25 : 0) + b.atrasoAtual * 4 + b.vezes * 0.15;
        return scoreB - scoreA;
      }
      // Equilibrado: combina frequência histórica + atraso moderado + bônus ciclo
      const balA =
        a.vezes * 0.55 +
        (a.pendenteNoCiclo ? 12 : 0) +
        Math.min(a.atrasoAtual, 5) * 3.5;
      const balB =
        b.vezes * 0.55 +
        (b.pendenteNoCiclo ? 12 : 0) +
        Math.min(b.atrasoAtual, 5) * 3.5;
      return balB - balA;
    });

    const poolNumbers = ranked.map((s) => s.numero);
    if (rotationOffset === 0) {
      return poolNumbers.slice(0, opt.universeSize).sort((a, b) => a - b);
    }

    // Troca controlada na cauda do ranking para testar cenários alternativos
    const coreKeep = Math.max(10, opt.universeSize - 4);
    const core = poolNumbers.slice(0, coreKeep);
    const tail = poolNumbers.slice(coreKeep);
    const shift = rotationOffset % Math.max(1, tail.length);
    const rotatedTail = [...tail.slice(shift), ...tail.slice(0, shift)];
    return [...core, ...rotatedTail.slice(0, opt.universeSize - coreKeep)].sort(
      (a, b) => a - b
    );
  }, [selectedStrategy, savedTickets, statsList, universeMode, rotationOffset]);

  // Gera os jogos da estratégia para simulação anual
  const strategyTickets = useMemo<GameTicket[]>(() => {
    if (selectedStrategy === 'saved' && savedTickets.length > 0) {
      return savedTickets;
    }
    const opt =
      STRATEGY_OPTIONS.find((s) => s.id === selectedStrategy) || STRATEGY_OPTIONS[3];
    try {
      const simFilters: FilterCriteria = {
        ...DEFAULT_FILTERS,
        ...(filters || {}),
        dezenasFixas: [],
        dezenasExcluidas: [],
      };
      return generateFechamentoCovering(
        simulatedUniverse,
        opt.targetHits,
        opt.ticketsCount,
        simFilters,
        latestDraw.dezenas
      );
    } catch {
      return [];
    }
  }, [selectedStrategy, savedTickets, simulatedUniverse, filters, latestDraw.dezenas]);

  // Simulação financeira concurso a concurso ao longo de todo o ano corrente
  const simulation = useMemo(() => {
    const timeline: DrawTimelinePoint[] = [];
    const monthlyMap = new Map<number, MonthlySummaryRow>();

    let custoAcumulado = 0;
    let premioAcumulado = 0;
    let peakBalance = -Infinity;
    let maxDrawdown = 0;
    let runningPeak = 0;
    let concursosComRetorno = 0;
    let concursosPositivos = 0;
    let melhorAcertoAno = 0;

    const faixas = { 11: 0, 12: 0, 13: 0, 14: 0, 15: 0 };
    const custoPorConcurso = strategyTickets.length * VALOR_APOSTA_LOTOFACIL;

    for (const draw of currentYearDraws) {
      let premioConcurso = 0;
      let melhorAcertoConcurso = 0;
      let premiadosNoConcurso = 0;
      let acertos13PlusNoConcurso = 0;

      for (const ticket of strategyTickets) {
        const hits = countMatches(ticket.dezenas, draw.dezenas);
        if (hits > melhorAcertoConcurso) melhorAcertoConcurso = hits;

        if (hits >= 11) {
          premiadosNoConcurso++;
          if (hits === 11) {
            faixas[11]++;
            premioConcurso += draw.premiacoes?.faixa11?.valor || PREMIO_PADRAO_CAIXA[11];
          } else if (hits === 12) {
            faixas[12]++;
            premioConcurso += draw.premiacoes?.faixa12?.valor || PREMIO_PADRAO_CAIXA[12];
          } else if (hits === 13) {
            faixas[13]++;
            acertos13PlusNoConcurso++;
            premioConcurso += draw.premiacoes?.faixa13?.valor || PREMIO_PADRAO_CAIXA[13];
          } else if (hits === 14) {
            faixas[14]++;
            acertos13PlusNoConcurso++;
            premioConcurso += draw.premiacoes?.faixa14?.valor || PREMIO_PADRAO_CAIXA[14];
          } else if (hits === 15) {
            faixas[15]++;
            acertos13PlusNoConcurso++;
            premioConcurso += draw.premiacoes?.faixa15?.valor || PREMIO_PADRAO_CAIXA[15];
          }
        }
      }

      if (melhorAcertoConcurso > melhorAcertoAno) melhorAcertoAno = melhorAcertoConcurso;
      if (premiadosNoConcurso > 0) concursosComRetorno++;
      if (premioConcurso >= custoPorConcurso && custoPorConcurso > 0) concursosPositivos++;

      const saldoConcurso = premioConcurso - custoPorConcurso;
      custoAcumulado += custoPorConcurso;
      premioAcumulado += premioConcurso;
      const saldoAcumulado = premioAcumulado - custoAcumulado;
      const roiAcumulado = custoAcumulado > 0 ? (saldoAcumulado / custoAcumulado) * 100 : 0;

      if (saldoAcumulado > peakBalance) peakBalance = saldoAcumulado;
      if (saldoAcumulado > runningPeak) runningPeak = saldoAcumulado;
      const drawdown = runningPeak - saldoAcumulado;
      if (drawdown > maxDrawdown) maxDrawdown = drawdown;

      const parsedDate = parsePtBrDateParts(draw.data);
      const monthIndex = parsedDate ? Math.max(0, Math.min(11, parsedDate.month - 1)) : 0;

      timeline.push({
        concurso: draw.concurso,
        label: `#${draw.concurso}`,
        data: draw.data,
        monthIndex,
        custoConcurso: Math.round(custoPorConcurso * 100) / 100,
        premioConcurso: Math.round(premioConcurso * 100) / 100,
        saldoConcurso: Math.round(saldoConcurso * 100) / 100,
        custoAcumulado: Math.round(custoAcumulado * 100) / 100,
        premioAcumulado: Math.round(premioAcumulado * 100) / 100,
        saldoAcumulado: Math.round(saldoAcumulado * 100) / 100,
        roiAcumulado: Math.round(roiAcumulado * 10) / 10,
        melhorAcerto: melhorAcertoConcurso,
        premiadosNoConcurso,
      });

      const existingMonth = monthlyMap.get(monthIndex);
      if (!existingMonth) {
        monthlyMap.set(monthIndex, {
          monthIndex,
          monthLabel: MONTH_LABELS[monthIndex],
          concursos: 1,
          investido: Math.round(custoPorConcurso * 100) / 100,
          premios: Math.round(premioConcurso * 100) / 100,
          saldoMes: Math.round(saldoConcurso * 100) / 100,
          saldoAcumulado: Math.round(saldoAcumulado * 100) / 100,
          melhorAcerto: melhorAcertoConcurso,
          acertos13Plus: acertos13PlusNoConcurso,
        });
      } else {
        existingMonth.concursos += 1;
        existingMonth.investido = Math.round((existingMonth.investido + custoPorConcurso) * 100) / 100;
        existingMonth.premios = Math.round((existingMonth.premios + premioConcurso) * 100) / 100;
        existingMonth.saldoMes = Math.round((existingMonth.premios - existingMonth.investido) * 100) / 100;
        existingMonth.saldoAcumulado = Math.round(saldoAcumulado * 100) / 100;
        if (melhorAcertoConcurso > existingMonth.melhorAcerto) {
          existingMonth.melhorAcerto = melhorAcertoConcurso;
        }
        existingMonth.acertos13Plus += acertos13PlusNoConcurso;
      }
    }

    const monthlyRows = Array.from(monthlyMap.values()).sort(
      (a, b) => a.monthIndex - b.monthIndex
    );

    const saldoLiquidoFinal = premioAcumulado - custoAcumulado;
    const roiFinal = custoAcumulado > 0 ? (saldoLiquidoFinal / custoAcumulado) * 100 : 0;
    const taxaRetornoBruto = custoAcumulado > 0 ? (premioAcumulado / custoAcumulado) * 100 : 0;
    const totalBilhetesPremiados =
      faixas[11] + faixas[12] + faixas[13] + faixas[14] + faixas[15];

    return {
      timeline,
      monthlyRows,
      custoPorConcurso,
      custoAcumulado,
      premioAcumulado,
      saldoLiquidoFinal,
      roiFinal,
      taxaRetornoBruto,
      peakBalance: peakBalance === -Infinity ? 0 : peakBalance,
      maxDrawdown,
      concursosComRetorno,
      concursosPositivos,
      melhorAcertoAno,
      faixas,
      totalBilhetesPremiados,
    };
  }, [currentYearDraws, strategyTickets]);

  // Calcula o ponto de corte do gradiente vertical (verde acima de R$ 0, rosa abaixo de R$ 0)
  const zeroGradientOffset = useMemo(() => {
    if (simulation.timeline.length === 0) return 0.5;
    const values = simulation.timeline.map((p) => p.saldoAcumulado);
    const maxVal = Math.max(...values);
    const minVal = Math.min(...values);
    if (maxVal <= 0) return 0;
    if (minVal >= 0) return 1;
    return maxVal / (maxVal - minVal);
  }, [simulation.timeline]);

  const activeStrategyLabel =
    selectedStrategy === 'saved'
      ? `Meus Jogos Salvos (${savedTickets.length} bilhetes)`
      : STRATEGY_OPTIONS.find((s) => s.id === selectedStrategy)?.label || '';

  const handleApplySimulatedUniverse = () => {
    if (!onApplyNumbers || simulatedUniverse.length < 15) return;
    onApplyNumbers(simulatedUniverse);
    setAppliedBanner(true);
    setTimeout(() => setAppliedBanner(false), 3500);
  };

  const isPositiveNet = simulation.saldoLiquidoFinal >= 0;

  return (
    <section className="bg-slate-900/95 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-6">
      {/* Cabeçalho Editorial Limpo */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 pb-5 border-b border-slate-800">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-400">
            <span className="font-semibold text-amber-400">Backtesting Financeiro Anual</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">Ano {currentYear}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">
              {currentYearDraws.length} concursos ({currentYearDraws[0]?.data} a{' '}
              {currentYearDraws[currentYearDraws.length - 1]?.data})
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            ROI Histórico Estimado — Saldo Líquido Acumulado ({currentYear})
          </h2>
          <p className="text-sm text-slate-400 max-w-3xl leading-relaxed">
            Simula a aplicação contínua de uma estratégia de fechamento em todos os concursos do ano
            corrente com valores oficiais da Caixa (<span className="font-mono text-slate-300">R$ 3,50</span> por
            aposta), consolidando investimento, retornos por faixa e curva de saldo líquido acumulado.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {selectedStrategy !== 'saved' && (
            <button
              type="button"
              onClick={() => setRotationOffset((prev) => prev + 1)}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1.5"
              title="Alternar combinação de dezenas na cauda do universo mantendo o núcleo principal"
            >
              <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
              <span>Alternar Cenário</span>
            </button>
          )}
          {onApplyNumbers && simulatedUniverse.length >= 15 && (
            <button
              type="button"
              onClick={handleApplySimulatedUniverse}
              className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold transition cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1.5 shadow-sm"
            >
              {appliedBanner ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Universo Aplicado ({simulatedUniverse.length} dez.)</span>
                </>
              ) : (
                <>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  <span>Usar {simulatedUniverse.length} Dezenas no Fechamento</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Barra de Controles de Estratégia e Visão */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-end">
        <div className="lg:col-span-5 space-y-1.5">
          <label
            htmlFor="roi-hist-strategy"
            className="block text-xs font-semibold text-slate-300"
          >
            Estratégia de Fechamento Simulada
          </label>
          <select
            id="roi-hist-strategy"
            value={selectedStrategy}
            onChange={(e) => {
              setSelectedStrategy(e.target.value as StrategyId);
              setRotationOffset(0);
            }}
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white font-medium focus:outline-none focus:border-amber-400 transition cursor-pointer"
          >
            {hasSavedTickets && (
              <option value="saved">
                Meus Jogos Salvos Atuais ({savedTickets.length} bilhetes ·{' '}
                {formatBRL(savedTickets.length * VALOR_APOSTA_LOTOFACIL)}/conc.)
              </option>
            )}
            {STRATEGY_OPTIONS.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label} · {formatBRL(opt.ticketsCount * VALOR_APOSTA_LOTOFACIL)}/conc.
              </option>
            ))}
          </select>
        </div>

        <div className="lg:col-span-4 space-y-1.5">
          <span className="block text-xs font-semibold text-slate-300">
            Critério do Universo ({simulatedUniverse.length} dezenas)
          </span>
          <div className="grid grid-cols-3 gap-1 p-1 bg-slate-950 rounded-xl border border-slate-800">
            {(
              [
                { id: 'equilibrado', label: 'Equilibrado' },
                { id: 'frequencia', label: 'Frequência' },
                { id: 'atraso_ciclo', label: 'Atraso/Ciclo' },
              ] as { id: UniverseSelectorMode; label: string }[]
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                disabled={selectedStrategy === 'saved'}
                onClick={() => {
                  setUniverseMode(opt.id);
                  setRotationOffset(0);
                }}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer whitespace-nowrap truncate ${
                  selectedStrategy === 'saved'
                    ? 'text-slate-600 cursor-not-allowed'
                    : universeMode === opt.id
                    ? 'bg-amber-400 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="lg:col-span-3 space-y-1.5">
          <span className="block text-xs font-semibold text-slate-300">Visualização do Gráfico</span>
          <div className="grid grid-cols-2 gap-1 p-1 bg-slate-950 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setChartView('curva_saldo')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer whitespace-nowrap flex items-center justify-center gap-1.5 ${
                chartView === 'curva_saldo'
                  ? 'bg-slate-800 text-amber-300 border border-slate-700'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <LineChartIcon className="w-3.5 h-3.5" />
              <span>Saldo Acum.</span>
            </button>
            <button
              type="button"
              onClick={() => setChartView('mensal_barras')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer whitespace-nowrap flex items-center justify-center gap-1.5 ${
                chartView === 'mensal_barras'
                  ? 'bg-slate-800 text-amber-300 border border-slate-700'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Mensal</span>
            </button>
          </div>
        </div>
      </div>

      {/* Faixa de 4 KPIs Financeiros (Tabular Numerals, Sem Poluição Visual) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-1.5">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Saldo Líquido Acumulado</span>
            {isPositiveNet ? (
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            ) : (
              <TrendingDown className="w-4 h-4 text-rose-400" />
            )}
          </div>
          <div
            className={`text-2xl font-bold font-mono tabular-nums tracking-tight ${
              isPositiveNet ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {formatBRL(simulation.saldoLiquidoFinal, true)}
          </div>
          <div className="text-xs text-slate-400 font-mono tabular-nums">
            Pico: {formatBRL(simulation.peakBalance, true)} · Drawdown:{' '}
            {formatBRL(simulation.maxDrawdown)}
          </div>
        </div>

        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-1.5">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>ROI Histórico Estimado</span>
            <Wallet className="w-4 h-4 text-amber-400" />
          </div>
          <div
            className={`text-2xl font-bold font-mono tabular-nums tracking-tight ${
              simulation.roiFinal >= 0 ? 'text-emerald-400' : 'text-amber-300'
            }`}
          >
            {simulation.roiFinal >= 0 ? '+' : ''}
            {simulation.roiFinal.toFixed(1)}%
          </div>
          <div className="text-xs text-slate-400 font-mono tabular-nums">
            Recuperação bruta: {simulation.taxaRetornoBruto.toFixed(1)}% do investido
          </div>
        </div>

        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-1.5">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Prêmios vs Investimento</span>
            <Calendar className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-white tracking-tight">
            {formatBRL(simulation.premioAcumulado)}
          </div>
          <div className="text-xs text-slate-400 font-mono tabular-nums">
            Investido: {formatBRL(simulation.custoAcumulado)} ({formatBRL(simulation.custoPorConcurso)}/conc.)
          </div>
        </div>

        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-1.5">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Premiações no Ano ({currentYear})</span>
            <span className="font-mono tabular-nums text-amber-300 font-semibold">
              Melhor: {simulation.melhorAcertoAno} pts
            </span>
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-white tracking-tight">
            {simulation.totalBilhetesPremiados.toLocaleString('pt-BR')} bilhetes
          </div>
          <div className="text-xs text-slate-400 font-mono tabular-nums">
            15p: {simulation.faixas[15]} · 14p: {simulation.faixas[14]} · 13p:{' '}
            {simulation.faixas[13]} · 12p: {simulation.faixas[12]} · 11p: {simulation.faixas[11]}
          </div>
        </div>
      </div>

      {/* Gráfico Principal */}
      <div className="bg-slate-950/75 border border-slate-800 rounded-xl p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-white">
              {chartView === 'curva_saldo'
                ? `Evolução do Saldo Líquido Acumulado — ${activeStrategyLabel}`
                : `Comparativo Mensal: Investimento vs Retorno em Prêmios (${currentYear})`}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {chartView === 'curva_saldo'
                ? `Linha tracejada marca o ponto de equilíbrio (R$ 0,00). Concursos com lucro líquido: ${simulation.concursosPositivos}/${currentYearDraws.length}.`
                : 'Agrupamento mensal consolidado de custos de apostas versus premiações acumuladas.'}
            </p>
          </div>
          <div className="text-xs font-mono tabular-nums text-slate-400">
            Dezenas simuladas: {simulatedUniverse.map((d) => String(d).padStart(2, '0')).join(' ')}
          </div>
        </div>

        {simulation.timeline.length === 0 ? (
          <div className="h-[320px] flex items-center justify-center text-sm text-slate-400">
            Nenhum bilhete disponível para simular esta estratégia.
          </div>
        ) : chartView === 'curva_saldo' ? (
          <div className="h-[340px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={simulation.timeline}
                margin={{ top: 12, right: 16, left: 6, bottom: 8 }}
              >
                <defs>
                  <linearGradient id="roiSplitStroke" x1="0" y1="0" x2="0" y2="1">
                    <stop offset={zeroGradientOffset} stopColor="#34d399" stopOpacity={1} />
                    <stop offset={zeroGradientOffset} stopColor="#fb7185" stopOpacity={1} />
                  </linearGradient>
                  <linearGradient id="roiSplitFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset={0} stopColor="#34d399" stopOpacity={0.32} />
                    <stop offset={zeroGradientOffset} stopColor="#34d399" stopOpacity={0.04} />
                    <stop offset={zeroGradientOffset} stopColor="#fb7185" stopOpacity={0.06} />
                    <stop offset={1} stopColor="#fb7185" stopOpacity={0.28} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis
                  dataKey="label"
                  stroke="#64748b"
                  tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'monospace' }}
                  minTickGap={28}
                />
                <YAxis
                  stroke="#64748b"
                  tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'monospace' }}
                  tickFormatter={(v) => formatCompactBRL(Number(v))}
                  width={74}
                />
                <ReferenceLine
                  y={0}
                  stroke="#fbbf24"
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload || !payload.length) return null;
                    const item = payload[0].payload as DrawTimelinePoint;
                    return (
                      <div className="bg-slate-950 border border-slate-700 rounded-xl p-3.5 shadow-2xl text-xs space-y-1.5 min-w-[230px]">
                        <div className="flex items-center justify-between gap-4 border-b border-slate-800 pb-1.5">
                          <span className="font-bold text-white font-mono">
                            Concurso #{item.concurso}
                          </span>
                          <span className="text-slate-400 font-mono">{item.data}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Investido no concurso</span>
                          <span className="font-mono tabular-nums text-slate-200">
                            {formatBRL(item.custoConcurso)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Prêmio no concurso</span>
                          <span className="font-mono tabular-nums text-emerald-300 font-semibold">
                            {formatBRL(item.premioConcurso)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Melhor acerto</span>
                          <span className="font-mono tabular-nums text-amber-300 font-semibold">
                            {item.melhorAcerto} pts ({item.premiadosNoConcurso} prem.)
                          </span>
                        </div>
                        <div className="pt-1.5 border-t border-slate-800 flex items-center justify-between">
                          <span className="font-semibold text-slate-200">Saldo Acumulado</span>
                          <span
                            className={`font-mono tabular-nums font-bold ${
                              item.saldoAcumulado >= 0 ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          >
                            {formatBRL(item.saldoAcumulado, true)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">ROI Acumulado</span>
                          <span className="font-mono tabular-nums text-slate-300">
                            {item.roiAcumulado >= 0 ? '+' : ''}
                            {item.roiAcumulado.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    );
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="saldoAcumulado"
                  stroke="url(#roiSplitStroke)"
                  strokeWidth={2.5}
                  fill="url(#roiSplitFill)"
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-[340px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={simulation.monthlyRows}
                margin={{ top: 12, right: 16, left: 6, bottom: 8 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis
                  dataKey="monthLabel"
                  stroke="#64748b"
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                />
                <YAxis
                  stroke="#64748b"
                  tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'monospace' }}
                  tickFormatter={(v) => formatCompactBRL(Number(v))}
                  width={74}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload || !payload.length) return null;
                    const row = payload[0].payload as MonthlySummaryRow;
                    return (
                      <div className="bg-slate-950 border border-slate-700 rounded-xl p-3.5 shadow-2xl text-xs space-y-1.5 min-w-[220px]">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                          <span className="font-bold text-white">
                            {row.monthLabel}/{currentYear}
                          </span>
                          <span className="text-slate-400 font-mono">
                            {row.concursos} concursos
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Investido no mês</span>
                          <span className="font-mono tabular-nums text-slate-200">
                            {formatBRL(row.investido)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Prêmios no mês</span>
                          <span className="font-mono tabular-nums text-emerald-300 font-semibold">
                            {formatBRL(row.premios)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between pt-1 border-t border-slate-800">
                          <span className="text-slate-300 font-semibold">Saldo do Mês</span>
                          <span
                            className={`font-mono tabular-nums font-bold ${
                              row.saldoMes >= 0 ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          >
                            {formatBRL(row.saldoMes, true)}
                          </span>
                        </div>
                      </div>
                    );
                  }}
                />
                <Bar
                  dataKey="investido"
                  name="Investido"
                  fill="#475569"
                  radius={[4, 4, 0, 0]}
                  isAnimationActive={false}
                />
                <Bar
                  dataKey="premios"
                  name="Prêmios"
                  fill="#fbbf24"
                  radius={[4, 4, 0, 0]}
                  isAnimationActive={false}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Tabela Mensal Consolidada */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white">
            Extrato Mensal Consolidado ({currentYear})
          </h3>
          <span className="text-xs text-slate-400 font-mono tabular-nums">
            {simulation.concursosComRetorno}/{currentYearDraws.length} concursos com premiação (
            {currentYearDraws.length > 0
              ? ((simulation.concursosComRetorno / currentYearDraws.length) * 100).toFixed(1)
              : '0.0'}
            %)
          </span>
        </div>

        <div className="overflow-x-auto border border-slate-800 rounded-xl bg-slate-950/70">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                <th className="py-2.5 px-3.5">Mês</th>
                <th className="py-2.5 px-3 text-right">Concursos</th>
                <th className="py-2.5 px-3 text-right">Investido</th>
                <th className="py-2.5 px-3 text-right">Prêmios</th>
                <th className="py-2.5 px-3 text-right">Saldo Mês</th>
                <th className="py-2.5 px-3 text-right">Saldo Acumulado</th>
                <th className="py-2.5 px-3.5 text-right">Melhor Acerto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70 font-mono tabular-nums">
              {simulation.monthlyRows.map((row) => (
                <tr key={row.monthIndex} className="hover:bg-slate-900/80 transition-colors">
                  <td className="py-2.5 px-3.5 font-sans font-semibold text-slate-200">
                    {row.monthLabel}/{currentYear}
                  </td>
                  <td className="py-2.5 px-3 text-right text-slate-300">{row.concursos}</td>
                  <td className="py-2.5 px-3 text-right text-slate-300">
                    {formatBRL(row.investido)}
                  </td>
                  <td className="py-2.5 px-3 text-right text-amber-300">
                    {formatBRL(row.premios)}
                  </td>
                  <td
                    className={`py-2.5 px-3 text-right font-semibold ${
                      row.saldoMes >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {formatBRL(row.saldoMes, true)}
                  </td>
                  <td
                    className={`py-2.5 px-3 text-right font-bold ${
                      row.saldoAcumulado >= 0 ? 'text-emerald-300' : 'text-rose-300'
                    }`}
                  >
                    {formatBRL(row.saldoAcumulado, true)}
                  </td>
                  <td className="py-2.5 px-3.5 text-right text-slate-200">
                    {row.melhorAcerto} pts
                    {row.acertos13Plus > 0 && (
                      <span className="text-amber-400 ml-1.5">({row.acertos13Plus}× 13+)</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};
