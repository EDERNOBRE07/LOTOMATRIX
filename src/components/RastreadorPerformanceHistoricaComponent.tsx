import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  Legend,
  Cell,
  Line,
  ComposedChart,
} from 'recharts';
import { GameTicket, LotofacilDraw, DezenaStats } from '../types/lotofacil';
import { CONCURSO_ATUAL, RECENT_DRAWS, DEZENAS_STATS } from '../data/lotofacilData';
import { countMatches, buildOptimal18Pool, generateFibonacciOptimizedGames } from '../services/combinatorics';
import { calculateCurvaAbc } from '../services/curvaAbcService';
import {
  TrendingUp,
  Award,
  Sparkles,
  BarChart2,
  DollarSign,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Filter,
  Layers,
  Zap,
  Info,
  Calendar,
} from 'lucide-react';

interface RastreadorPerformanceHistoricaComponentProps {
  latestDraw?: LotofacilDraw;
  savedTickets?: GameTicket[];
  statsList?: DezenaStats[];
  onApplyNumbers?: (numbers: number[]) => void;
}

interface StrategyPerformance {
  id: string;
  nome: string;
  badge: string;
  cor: string;
  dezenasPool: number[];
  jogos: number[][];
  custoPorConcurso: number;
  custoTotal10: number;
  totalPremios: number;
  saldoLiquido: number;
  roi: number;
  mediaAcertosGeral: number;
  totalBilhetesPremiados: number;
  totalBilhetesAvaliados: number;
  taxaPremiacaoPct: number;
  acertos15: number;
  acertos14: number;
  acertos13: number;
  acertos12: number;
  acertos11: number;
  picoMaxAcertos: number;
  concursoPico: number;
  performancePorConcurso: {
    concurso: number;
    data: string;
    mediaAcertos: number;
    acertos15: number;
    acertos14: number;
    acertos13: number;
    acertos12: number;
    acertos11: number;
    totalPremiados: number;
    premioR$: number;
    saldoR$: number;
    roiConcurso: number;
  }[];
}

// Fixed official prices
const PRECO_APOSTA = 3.5;
const PREMIO_11 = 6.0;
const PREMIO_12 = 12.0;
const PREMIO_13 = 30.0;
const PREMIO_14_ESTIMADO = 1420.0;
const PREMIO_15_ESTIMADO = 1200000.0;

// Canonical 24 games of Top 18
const CANONICAL_TOP18_GAMES: number[][] = [
  [1, 2, 3, 5, 6, 8, 9, 10, 11, 13, 14, 17, 18, 20, 22],
  [1, 2, 4, 5, 7, 8, 9, 10, 12, 13, 15, 17, 19, 21, 24],
  [1, 3, 4, 6, 7, 8, 10, 11, 12, 14, 15, 18, 20, 22, 25],
  [2, 3, 4, 5, 6, 7, 9, 11, 13, 14, 15, 17, 19, 23, 24],
  [1, 2, 4, 6, 7, 9, 10, 11, 12, 13, 17, 18, 20, 21, 25],
  [1, 3, 5, 6, 8, 9, 10, 12, 14, 15, 17, 19, 22, 23, 24],
  [2, 4, 5, 7, 8, 10, 11, 13, 14, 15, 18, 20, 21, 22, 25],
  [1, 2, 3, 4, 6, 8, 9, 11, 12, 13, 15, 17, 19, 20, 24],
  [2, 3, 5, 6, 7, 8, 10, 12, 13, 14, 17, 18, 21, 22, 23],
  [1, 4, 5, 6, 7, 9, 10, 11, 14, 15, 18, 19, 20, 23, 25],
  [1, 2, 3, 7, 8, 9, 11, 12, 14, 15, 17, 19, 21, 24, 25],
  [2, 3, 4, 5, 8, 9, 10, 12, 13, 15, 18, 20, 22, 23, 24],
  [1, 2, 5, 6, 7, 8, 10, 11, 13, 14, 15, 19, 20, 21, 24],
  [3, 4, 5, 6, 8, 9, 10, 11, 12, 13, 17, 18, 21, 23, 25],
  [1, 2, 3, 4, 5, 7, 9, 10, 12, 14, 18, 19, 20, 22, 25],
  [1, 3, 4, 5, 6, 7, 8, 11, 13, 15, 17, 20, 22, 24, 25],
  [2, 4, 6, 7, 8, 9, 10, 11, 12, 15, 18, 19, 21, 23, 24],
  [1, 2, 3, 6, 7, 8, 9, 12, 13, 14, 17, 20, 21, 23, 25],
  [1, 3, 5, 7, 8, 9, 10, 11, 13, 15, 18, 19, 20, 22, 24],
  [2, 3, 4, 6, 8, 10, 11, 12, 13, 14, 15, 17, 19, 22, 25],
  [1, 2, 4, 5, 6, 8, 9, 11, 14, 15, 17, 18, 21, 22, 23],
  [1, 2, 3, 5, 7, 8, 10, 12, 13, 14, 15, 18, 20, 23, 24],
  [3, 4, 5, 6, 7, 9, 10, 11, 13, 14, 17, 19, 21, 24, 25],
  [1, 2, 4, 6, 7, 8, 9, 10, 11, 12, 15, 17, 20, 23, 25],
];

// Curva ABC (Classe A) 24 games
const CURVA_ABC_GAMES: number[][] = [
  [1, 2, 3, 4, 5, 7, 9, 10, 11, 12, 13, 14, 15, 18, 19],
  [1, 2, 3, 4, 5, 7, 10, 11, 12, 14, 18, 20, 21, 22, 25],
  [2, 3, 4, 5, 7, 9, 11, 13, 14, 15, 19, 20, 21, 24, 25],
  [1, 3, 5, 7, 9, 10, 11, 12, 13, 15, 18, 20, 22, 24, 25],
  [1, 2, 4, 5, 9, 10, 11, 12, 14, 15, 18, 19, 21, 22, 24],
  [2, 3, 5, 7, 9, 10, 12, 13, 14, 15, 18, 19, 20, 24, 25],
  [1, 2, 3, 4, 7, 10, 11, 13, 14, 15, 19, 20, 21, 22, 24],
  [1, 3, 4, 5, 9, 10, 11, 12, 13, 14, 18, 20, 21, 24, 25],
  [2, 4, 5, 7, 9, 10, 11, 12, 15, 18, 19, 20, 21, 22, 25],
  [1, 2, 3, 5, 7, 9, 10, 13, 14, 15, 18, 19, 21, 22, 25],
  [1, 4, 5, 7, 9, 11, 12, 13, 14, 15, 18, 19, 20, 22, 24],
  [2, 3, 4, 5, 10, 11, 12, 13, 14, 15, 19, 20, 21, 22, 24],
  [1, 2, 3, 7, 9, 10, 11, 12, 14, 15, 18, 20, 21, 22, 25],
  [3, 4, 5, 7, 9, 10, 11, 12, 13, 14, 15, 18, 19, 22, 25],
  [1, 2, 4, 5, 7, 10, 11, 12, 13, 15, 18, 19, 20, 21, 24],
  [1, 3, 4, 7, 9, 10, 11, 13, 14, 18, 19, 20, 21, 22, 25],
  [2, 3, 5, 9, 10, 11, 12, 13, 14, 15, 18, 20, 22, 24, 25],
  [1, 2, 5, 7, 9, 10, 11, 12, 13, 14, 19, 20, 21, 22, 24],
  [2, 4, 5, 7, 9, 10, 12, 13, 15, 18, 19, 20, 21, 24, 25],
  [1, 3, 4, 5, 7, 9, 10, 11, 14, 15, 18, 20, 21, 22, 25],
  [1, 2, 3, 4, 5, 9, 11, 12, 13, 15, 18, 19, 20, 22, 24],
  [2, 3, 4, 7, 9, 10, 11, 12, 13, 14, 15, 18, 21, 22, 25],
  [1, 2, 3, 5, 7, 10, 11, 12, 13, 14, 18, 19, 20, 24, 25],
  [1, 4, 5, 7, 9, 10, 11, 12, 13, 15, 19, 20, 21, 22, 24],
];

// Pares de Ouro [11, 20] 20 games
const PARES_DE_OURO_GAMES: number[][] = [
  [1, 3, 5, 7, 9, 10, 11, 12, 14, 15, 18, 19, 20, 23, 25],
  [1, 2, 4, 5, 8, 10, 11, 13, 14, 17, 18, 20, 21, 22, 24],
  [2, 3, 6, 7, 8, 9, 11, 12, 13, 15, 16, 19, 20, 21, 23],
  [1, 3, 4, 6, 8, 9, 11, 12, 14, 17, 18, 20, 22, 24, 25],
  [2, 4, 5, 6, 7, 10, 11, 13, 15, 17, 18, 19, 20, 23, 24],
  [1, 2, 5, 7, 8, 9, 10, 11, 13, 15, 18, 20, 21, 22, 25],
  [3, 4, 6, 7, 8, 10, 11, 12, 14, 16, 19, 20, 22, 23, 25],
  [1, 2, 3, 5, 6, 9, 11, 13, 14, 15, 17, 18, 20, 21, 24],
  [2, 4, 6, 7, 8, 9, 10, 11, 12, 15, 18, 20, 21, 24, 25],
  [1, 3, 4, 5, 7, 10, 11, 12, 13, 16, 17, 19, 20, 22, 23],
  [1, 2, 5, 6, 8, 9, 10, 11, 14, 15, 18, 19, 20, 22, 25],
  [3, 5, 6, 7, 8, 9, 11, 12, 13, 14, 17, 20, 21, 23, 24],
  [1, 4, 6, 7, 9, 10, 11, 13, 15, 16, 18, 19, 20, 22, 25],
  [2, 3, 4, 5, 8, 10, 11, 12, 14, 15, 17, 18, 20, 21, 23],
  [1, 2, 3, 7, 8, 9, 11, 12, 13, 16, 19, 20, 21, 24, 25],
  [2, 4, 5, 6, 9, 10, 11, 12, 14, 15, 17, 20, 22, 23, 24],
  [1, 3, 5, 6, 7, 8, 10, 11, 13, 15, 18, 20, 22, 24, 25],
  [2, 3, 4, 7, 8, 9, 11, 13, 14, 16, 18, 19, 20, 21, 23],
  [1, 2, 4, 6, 8, 10, 11, 12, 15, 17, 19, 20, 21, 23, 25],
  [3, 4, 5, 7, 9, 10, 11, 13, 14, 16, 17, 18, 20, 22, 24],
];

// Fibonacci Otimizado 5 games
const FIBONACCI_GAMES: number[][] = [
  [1, 2, 3, 5, 8, 9, 11, 12, 13, 14, 17, 18, 20, 21, 24],
  [1, 2, 3, 5, 7, 10, 12, 13, 15, 16, 18, 19, 20, 21, 25],
  [1, 3, 4, 5, 8, 9, 10, 11, 13, 14, 15, 19, 21, 22, 23],
  [2, 3, 5, 6, 8, 10, 11, 12, 13, 17, 18, 20, 21, 23, 24],
  [1, 2, 5, 7, 8, 9, 10, 13, 14, 15, 16, 18, 21, 22, 25],
];

export const RastreadorPerformanceHistoricaComponent: React.FC<
  RastreadorPerformanceHistoricaComponentProps
> = ({
  latestDraw = CONCURSO_ATUAL,
  savedTickets = [],
  statsList = DEZENAS_STATS,
  onApplyNumbers,
}) => {
  // 10 most recent draws in chronological order (from older #3802 to latest #3811)
  const past10Draws = useMemo(() => {
    return [...RECENT_DRAWS.slice(0, 10)].reverse();
  }, []);

  // Strategy performance calculations
  const strategiesList: StrategyPerformance[] = useMemo(() => {
    const rawStrategies: {
      id: string;
      nome: string;
      badge: string;
      cor: string;
      games: number[][];
      pool: number[];
    }[] = [
      {
        id: 'top18_ia',
        nome: 'Top 18 IA (18-15-14-15)',
        badge: 'FECHAMENTO MATRIZ 24',
        cor: '#f59e0b',
        games: CANONICAL_TOP18_GAMES,
        pool: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 17, 18, 19, 20, 21, 22, 23, 24, 25].slice(0, 18),
      },
      {
        id: 'curva_abc',
        nome: 'Curva ABC (Classe A • Pareto 80%)',
        badge: 'PARETO 80/20',
        cor: '#10b981',
        games: CURVA_ABC_GAMES,
        pool: calculateCurvaAbc(statsList).classeANumeros.slice(0, 18),
      },
      {
        id: 'pares_ouro',
        nome: 'Pares de Ouro [11, 20]',
        badge: 'CO-OCORRÊNCIA MÁXIMA',
        cor: '#38bdf8',
        games: PARES_DE_OURO_GAMES,
        pool: [1, 3, 5, 7, 8, 9, 10, 11, 12, 13, 14, 15, 17, 18, 19, 20, 22, 25],
      },
      {
        id: 'fibonacci',
        nome: 'Fibonacci Otimizado (Zona de Ouro)',
        badge: '5 BILHETES ECONÔMICOS',
        cor: '#a855f7',
        games: FIBONACCI_GAMES,
        pool: [1, 2, 3, 5, 7, 8, 9, 10, 11, 12, 13, 14, 17, 18, 20, 21, 24],
      },
    ];

    // If user has saved games generated by LotoSniper, evaluate them too
    if (savedTickets.length > 0) {
      const userDezenas = Array.from(new Set(savedTickets.flatMap((t) => t.dezenas))).sort((a, b) => a - b);
      rawStrategies.unshift({
        id: 'jogos_usuario',
        nome: `Seus Jogos Salvos (${savedTickets.length} Bilhetes)`,
        badge: 'JOGOS ATIVOS LOTOSNIPER',
        cor: '#ec4899',
        games: savedTickets.map((t) => t.dezenas),
        pool: userDezenas,
      });
    }

    return rawStrategies.map((strat) => {
      let totalPremios = 0;
      let totalAcertosSum = 0;
      let totalTicketsEvaluated = 0;
      let totalPremiadosCount = 0;
      let ac15 = 0;
      let ac14 = 0;
      let ac13 = 0;
      let ac12 = 0;
      let ac11 = 0;
      let maxHit = 0;
      let bestDraw = past10Draws[0].concurso;

      const performancePorConcurso = past10Draws.map((draw) => {
        let concAcertosSum = 0;
        let concAc15 = 0;
        let concAc14 = 0;
        let concAc13 = 0;
        let concAc12 = 0;
        let concAc11 = 0;
        let concPremio = 0;

        strat.games.forEach((game) => {
          const hits = countMatches(game, draw.dezenas);
          concAcertosSum += hits;
          totalAcertosSum += hits;
          totalTicketsEvaluated++;

          if (hits > maxHit) {
            maxHit = hits;
            bestDraw = draw.concurso;
          }

          let premioTicket = 0;
          if (hits === 15) {
            concAc15++;
            ac15++;
            premioTicket = draw.premiacoes?.faixa15?.valor || PREMIO_15_ESTIMADO;
          } else if (hits === 14) {
            concAc14++;
            ac14++;
            premioTicket = draw.premiacoes?.faixa14?.valor || PREMIO_14_ESTIMADO;
          } else if (hits === 13) {
            concAc13++;
            ac13++;
            premioTicket = PREMIO_13;
          } else if (hits === 12) {
            concAc12++;
            ac12++;
            premioTicket = PREMIO_12;
          } else if (hits === 11) {
            concAc11++;
            ac11++;
            premioTicket = PREMIO_11;
          }

          if (hits >= 11) {
            totalPremiadosCount++;
          }
          concPremio += premioTicket;
        });

        const custoConc = strat.games.length * PRECO_APOSTA;
        const saldoConc = concPremio - custoConc;
        const roiConc = custoConc > 0 ? (saldoConc / custoConc) * 100 : 0;
        const mediaAcertos = Number((concAcertosSum / strat.games.length).toFixed(2));

        totalPremios += concPremio;

        return {
          concurso: draw.concurso,
          data: draw.data,
          mediaAcertos,
          acertos15: concAc15,
          acertos14: concAc14,
          acertos13: concAc13,
          acertos12: concAc12,
          acertos11: concAc11,
          totalPremiados: concAc15 + concAc14 + concAc13 + concAc12 + concAc11,
          premioR$: Number(concPremio.toFixed(2)),
          saldoR$: Number(saldoConc.toFixed(2)),
          roiConcurso: Number(roiConc.toFixed(1)),
        };
      });

      const custoTotal10 = strat.games.length * PRECO_APOSTA * 10;
      const saldoLiquido = totalPremios - custoTotal10;
      const roi = custoTotal10 > 0 ? Number(((saldoLiquido / custoTotal10) * 100).toFixed(1)) : 0;
      const mediaAcertosGeral =
        totalTicketsEvaluated > 0
          ? Number((totalAcertosSum / totalTicketsEvaluated).toFixed(2))
          : 0;
      const taxaPremiacaoPct =
        totalTicketsEvaluated > 0
          ? Number(((totalPremiadosCount / totalTicketsEvaluated) * 100).toFixed(1))
          : 0;

      return {
        id: strat.id,
        nome: strat.nome,
        badge: strat.badge,
        cor: strat.cor,
        dezenasPool: strat.pool,
        jogos: strat.games,
        custoPorConcurso: strat.games.length * PRECO_APOSTA,
        custoTotal10,
        totalPremios: Number(totalPremios.toFixed(2)),
        saldoLiquido: Number(saldoLiquido.toFixed(2)),
        roi,
        mediaAcertosGeral,
        totalBilhetesPremiados: totalPremiadosCount,
        totalBilhetesAvaliados: totalTicketsEvaluated,
        taxaPremiacaoPct,
        acertos15: ac15,
        acertos14: ac14,
        acertos13: ac13,
        acertos12: ac12,
        acertos11: ac11,
        picoMaxAcertos: maxHit,
        concursoPico: bestDraw,
        performancePorConcurso,
      };
    });
  }, [past10Draws, savedTickets, statsList]);

  // Selected strategy for detailed inspection
  const [selectedStratId, setSelectedStratId] = useState<string>(() => {
    return strategiesList[0]?.id || 'top18_ia';
  });

  const activeStrat = useMemo(() => {
    return strategiesList.find((s) => s.id === selectedStratId) || strategiesList[0];
  }, [strategiesList, selectedStratId]);

  // Chart data: Comparing average hit rate per contest
  const chartData = useMemo(() => {
    return past10Draws.map((draw) => {
      const entry: any = {
        concursoLabel: `#${draw.concurso}`,
        concurso: draw.concurso,
        data: draw.data,
      };

      strategiesList.forEach((strat) => {
        const perf = strat.performancePorConcurso.find((p) => p.concurso === draw.concurso);
        entry[strat.id] = perf ? perf.mediaAcertos : 0;
      });

      return entry;
    });
  }, [past10Draws, strategiesList]);

  // Find strategy with highest ROI
  const bestRoiStrategy = useMemo(() => {
    return [...strategiesList].sort((a, b) => b.roi - a.roi)[0];
  }, [strategiesList]);

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 rounded-2xl border border-indigo-500/30 p-5 sm:p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="px-2.5 py-1 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 font-mono text-[11px] font-bold flex items-center gap-1.5">
                <BarChart2 className="w-3.5 h-3.5" />
                <span>BACKTESTING COMPARATIVO</span>
              </span>
              <span className="px-2 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono text-[10px] font-bold">
                ÚLTIMOS 10 CONCURSOS (#3802 A #{latestDraw.concurso})
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
              <span>Rastreador de Performance Histórica dos Jogos</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
              Auditoria de eficácia das estratégias do LotoSniper contra os últimos 10 resultados oficiais da Caixa.
              Compare a <strong className="text-indigo-400">média de acertos</strong> em cada concurso e identifique
              qual fechamento entregou o <strong className="text-emerald-400">maior ROI estatístico</strong>.
            </p>
          </div>

          {/* Quick Winner Badge */}
          {bestRoiStrategy && (
            <div className="bg-slate-950/80 border-2 border-emerald-500/60 rounded-2xl p-4 shadow-xl shrink-0 flex flex-col justify-center">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                <Award className="w-4 h-4 text-emerald-400" />
                <span>LÍDER EM RENTABILIDADE (ROI)</span>
              </div>
              <div className="text-base font-black text-white mt-1">
                {bestRoiStrategy.nome}
              </div>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-emerald-400 font-mono">
                  {bestRoiStrategy.roi > 0 ? `+${bestRoiStrategy.roi}%` : `${bestRoiStrategy.roi}%`}
                </span>
                <span className="text-xs text-slate-400">ROI nos 10 concursos</span>
              </div>
              <button
                onClick={() => {
                  if (onApplyNumbers && bestRoiStrategy.dezenasPool.length > 0) {
                    onApplyNumbers(bestRoiStrategy.dezenasPool);
                  }
                }}
                className="mt-3 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20"
              >
                <span>Aplicar Estratégia Campeã</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Selector of Strategies */}
      <div className="flex flex-wrap items-center gap-2 bg-slate-900/90 p-3 rounded-2xl border border-slate-800 shadow-xl">
        <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5 pl-1">
          <Filter className="w-3.5 h-3.5" />
          <span>Estratégia em Foco:</span>
        </span>
        {strategiesList.map((strat) => {
          const isSelected = selectedStratId === strat.id;
          return (
            <button
              key={strat.id}
              onClick={() => setSelectedStratId(strat.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
                isSelected
                  ? 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-md shadow-indigo-500/25 ring-2 ring-indigo-400/50'
                  : 'bg-slate-950/80 text-slate-300 hover:text-white border border-slate-800'
              }`}
            >
              <span
                className="w-2.5 h-2.5 rounded-full inline-block"
                style={{ backgroundColor: strat.cor }}
              />
              <span>{strat.nome}</span>
              <span
                className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-black ${
                  strat.roi >= 0 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                }`}
              >
                {strat.roi > 0 ? `+${strat.roi}%` : `${strat.roi}%`}
              </span>
            </button>
          );
        })}
      </div>

      {/* Gráfico de Barras: Comparativo da Média de Acertos nos Últimos 10 Concursos */}
      <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-800">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-indigo-400" />
              <span>Média de Acertos por Concurso (Últimos 10 Sorteios)</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Barras mostram o desempenho médio de acertos dos bilhetes gerados em cada concurso oficial.
              A linha verde em 11 acertos demarca a faixa de premiação da Caixa.
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs font-mono">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <span className="w-3 h-0.5 bg-emerald-400 border-dashed inline-block" />
              <span>Faixa de Premiação (11 acertos)</span>
            </span>
            <span className="flex items-center gap-1.5 text-rose-400">
              <span className="w-3 h-0.5 bg-rose-400 inline-block" />
              <span>Média Aleatória (9,0)</span>
            </span>
          </div>
        </div>

        <div className="h-80 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 25, left: -10, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
              <XAxis
                dataKey="concursoLabel"
                stroke="#94a3b8"
                fontSize={11}
                tickLine={false}
                label={{ value: 'Concurso Oficial Caixa', position: 'insideBottom', offset: -10, fill: '#64748b', fontSize: 11 }}
              />
              <YAxis
                stroke="#94a3b8"
                fontSize={11}
                domain={[7, 14]}
                ticks={[8, 9, 10, 11, 12, 13, 14]}
                tickLine={false}
                label={{ value: 'Média de Acertos', angle: -90, position: 'insideLeft', offset: 15, fill: '#64748b', fontSize: 11 }}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    const perf = activeStrat.performancePorConcurso.find((p) => p.concurso === data.concurso);
                    return (
                      <div className="bg-slate-950 border border-slate-700 p-3.5 rounded-xl shadow-2xl text-xs space-y-1.5 font-mono">
                        <div className="font-bold text-white text-sm flex items-center justify-between gap-2 border-b border-slate-800 pb-1.5">
                          <span>Concurso #{data.concurso}</span>
                          <span className="text-slate-400 font-sans text-xs">{data.data}</span>
                        </div>
                        <div className="text-indigo-300 font-bold flex items-center justify-between">
                          <span>Estratégia:</span>
                          <span className="text-white">{activeStrat.nome}</span>
                        </div>
                        <div className="text-slate-300 flex items-center justify-between">
                          <span>Média de Acertos:</span>
                          <strong className="text-emerald-400 text-sm">
                            {perf?.mediaAcertos || 0} pts
                          </strong>
                        </div>
                        <div className="text-slate-300 flex items-center justify-between">
                          <span>Bilhetes Premiados:</span>
                          <span className="text-amber-400 font-bold">
                            {perf?.totalPremiados || 0} de {activeStrat.jogos.length} jogos
                          </span>
                        </div>
                        {perf && (perf.acertos14 > 0 || perf.acertos13 > 0) && (
                          <div className="text-amber-300 font-bold border-t border-slate-800/80 pt-1">
                            {perf.acertos14 > 0 && `⚡ ${perf.acertos14}x 14 PONTOS! `}
                            {perf.acertos13 > 0 && `🔥 ${perf.acertos13}x 13 Pontos`}
                          </div>
                        )}
                        <div className="text-slate-400 flex items-center justify-between border-t border-slate-800 pt-1">
                          <span>Retorno Concurso:</span>
                          <span className={perf && perf.saldoR$ >= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400'}>
                            R$ {perf?.premioR$.toFixed(2).replace('.', ',')}
                          </span>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend verticalAlign="top" align="right" wrapperStyle={{ paddingBottom: 10, fontSize: 12 }} />

              {/* Linha de Corte: Premiação Caixa (11 Acertos) */}
              <ReferenceLine
                y={11}
                stroke="#10b981"
                strokeDasharray="4 4"
                strokeWidth={2}
                label={{
                  value: 'Premiação (11 pts)',
                  position: 'insideTopLeft',
                  fill: '#10b981',
                  fontSize: 10,
                  fontWeight: 'bold',
                }}
              />

              {/* Linha de Baseline: Jogo Aleatório (9 Acertos) */}
              <ReferenceLine
                y={9}
                stroke="#f43f5e"
                strokeDasharray="3 3"
                label={{
                  value: 'Média Aleatória (9,0)',
                  position: 'insideBottomLeft',
                  fill: '#f43f5e',
                  fontSize: 10,
                }}
              />

              {/* Se uma estratégia estiver selecionada, renderiza sua barra destacada */}
              <Bar
                dataKey={activeStrat.id}
                name={activeStrat.nome}
                fill={activeStrat.cor}
                radius={[5, 5, 0, 0]}
              >
                {chartData.map((entry, index) => {
                  const val = entry[activeStrat.id] || 0;
                  const isHigh = val >= 11.5;
                  return (
                    <Cell
                      key={`cell-${index}`}
                      fill={isHigh ? '#10b981' : activeStrat.cor}
                      opacity={0.9}
                    />
                  );
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Grid de Métricas da Estratégia em Foco */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5">
          <div className="text-xs text-slate-400">Média Geral de Acertos</div>
          <div className="text-xl font-black text-white mt-1 font-mono">
            {activeStrat.mediaAcertosGeral} <span className="text-xs text-slate-400 font-normal">pts/jogo</span>
          </div>
          <div className="text-[10px] text-emerald-400 mt-0.5">
            +{(activeStrat.mediaAcertosGeral - 9.0).toFixed(2)} acima da média aleatória
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5">
          <div className="text-xs text-slate-400">Taxa de Premiação</div>
          <div className="text-xl font-black text-indigo-400 mt-1 font-mono">
            {activeStrat.taxaPremiacaoPct}%
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            {activeStrat.totalBilhetesPremiados} de {activeStrat.totalBilhetesAvaliados} bilhetes premiados
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5">
          <div className="text-xs text-slate-400">ROI Estatístico (10 Conc.)</div>
          <div
            className={`text-xl font-black mt-1 font-mono ${
              activeStrat.roi >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {activeStrat.roi > 0 ? `+${activeStrat.roi}%` : `${activeStrat.roi}%`}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            Saldo: R$ {activeStrat.saldoLiquido.toFixed(2).replace('.', ',')}
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5">
          <div className="text-xs text-slate-400">Pico Máximo de Acertos</div>
          <div className="text-xl font-black text-amber-400 mt-1 font-mono">
            {activeStrat.picoMaxAcertos} Pontos
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            Alcançado no Concurso #{activeStrat.concursoPico}
          </div>
        </div>
      </div>

      {/* Tabela de Ranking Comparativo de ROI de Todas as Estratégias */}
      <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-800">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-400" />
              <span>Ranking de Eficácia & ROI Estatístico das Estratégias</span>
            </h3>
            <p className="text-xs text-slate-400">
              Classificação das matrizes do LotoSniper ordenadas pelo retorno líquido obtido nos últimos 10 concursos.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 font-mono uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-3">Posição</th>
                <th className="py-2.5 px-3">Estratégia de Fechamento</th>
                <th className="py-2.5 px-3 text-center">Jogos / Conc.</th>
                <th className="py-2.5 px-3 text-center">Média Acertos</th>
                <th className="py-2.5 px-3 text-center">Taxa Premiação</th>
                <th className="py-2.5 px-3 text-center">Prêmios 11–15</th>
                <th className="py-2.5 px-3 text-center">Total Pago</th>
                <th className="py-2.5 px-3 text-center">ROI Estatístico</th>
                <th className="py-2.5 px-3 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {[...strategiesList]
                .sort((a, b) => b.roi - a.roi)
                .map((strat, rank) => {
                  const isTop = rank === 0;
                  const isCurrentSelected = strat.id === selectedStratId;

                  return (
                    <tr
                      key={strat.id}
                      className={`hover:bg-slate-800/40 transition cursor-pointer ${
                        isCurrentSelected ? 'bg-indigo-500/10' : ''
                      }`}
                      onClick={() => setSelectedStratId(strat.id)}
                    >
                      <td className="py-2.5 px-3">
                        <span
                          className={`w-6 h-6 rounded-lg inline-flex items-center justify-center font-bold text-xs ${
                            isTop
                              ? 'bg-amber-400 text-slate-950 font-black shadow-sm'
                              : rank === 1
                              ? 'bg-slate-700 text-white font-bold'
                              : 'text-slate-400'
                          }`}
                        >
                          {rank + 1}º
                        </span>
                      </td>

                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: strat.cor }}
                          />
                          <span className="font-bold text-white font-sans text-xs">
                            {strat.nome}
                          </span>
                          {isTop && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-sans font-black border border-amber-500/30">
                              LÍDER ROI
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-2.5 px-3 text-center text-slate-300">
                        {strat.jogos.length} jogos
                      </td>

                      <td className="py-2.5 px-3 text-center font-bold text-white">
                        {strat.mediaAcertosGeral} pts
                      </td>

                      <td className="py-2.5 px-3 text-center text-indigo-300 font-bold">
                        {strat.taxaPremiacaoPct}%
                      </td>

                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1 text-[11px]">
                          {strat.acertos14 > 0 && (
                            <span className="text-amber-400 font-bold bg-amber-500/20 px-1 rounded">
                              {strat.acertos14}x 14
                            </span>
                          )}
                          <span className="text-slate-300">
                            {strat.totalBilhetesPremiados} bilhetes
                          </span>
                        </div>
                      </td>

                      <td className="py-2.5 px-3 text-center text-emerald-400 font-bold">
                        R$ {strat.totalPremios.toFixed(2).replace('.', ',')}
                      </td>

                      <td className="py-2.5 px-3 text-center font-black">
                        <span
                          className={`px-2 py-0.5 rounded text-xs ${
                            strat.roi >= 0
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'bg-rose-500/20 text-rose-300'
                          }`}
                        >
                          {strat.roi > 0 ? `+${strat.roi}%` : `${strat.roi}%`}
                        </span>
                      </td>

                      <td className="py-2.5 px-3 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onApplyNumbers && strat.dezenasPool.length > 0) {
                              onApplyNumbers(strat.dezenasPool);
                            }
                          }}
                          className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-sans font-bold transition cursor-pointer"
                        >
                          Aplicar
                        </button>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detalhamento Concurso a Concurso da Estratégia em Foco */}
      <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-400" />
              <span>Desempenho Concurso a Concurso: {activeStrat.nome}</span>
            </h4>
            <p className="text-xs text-slate-400">
              Auditoria jogo a jogo nos últimos 10 sorteios oficiais da Lotofácil.
            </p>
          </div>
          <span className="text-xs font-mono text-slate-400">
            {activeStrat.jogos.length} jogos avaliados por sorteio
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 font-mono uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-2 px-3">Concurso</th>
                <th className="py-2 px-3">Data</th>
                <th className="py-2 px-3 text-center">Média Acertos</th>
                <th className="py-2 px-3 text-center">11 Pts</th>
                <th className="py-2 px-3 text-center">12 Pts</th>
                <th className="py-2 px-3 text-center">13 Pts</th>
                <th className="py-2 px-3 text-center">14 Pts</th>
                <th className="py-2 px-3 text-center">15 Pts</th>
                <th className="py-2 px-3 text-center">Retorno (R$)</th>
                <th className="py-2 px-3 text-right">ROI Concurso</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {[...activeStrat.performancePorConcurso].reverse().map((p) => {
                const isHighlight = p.acertos14 > 0 || p.acertos13 > 0;
                return (
                  <tr
                    key={p.concurso}
                    className={`hover:bg-slate-800/40 transition ${
                      isHighlight ? 'bg-amber-500/10' : ''
                    }`}
                  >
                    <td className="py-2 px-3 font-bold text-white">#{p.concurso}</td>
                    <td className="py-2 px-3 text-slate-400 font-sans">{p.data}</td>
                    <td className="py-2 px-3 text-center">
                      <span
                        className={`font-bold ${
                          p.mediaAcertos >= 11 ? 'text-emerald-400' : 'text-slate-300'
                        }`}
                      >
                        {p.mediaAcertos} pts
                      </span>
                    </td>
                    <td className="py-2 px-3 text-center text-slate-300">{p.acertos11}</td>
                    <td className="py-2 px-3 text-center text-slate-300">{p.acertos12}</td>
                    <td className="py-2 px-3 text-center">
                      {p.acertos13 > 0 ? (
                        <span className="text-amber-300 font-bold bg-amber-500/20 px-1 rounded">
                          {p.acertos13}
                        </span>
                      ) : (
                        <span className="text-slate-500">0</span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-center">
                      {p.acertos14 > 0 ? (
                        <span className="text-amber-400 font-black bg-amber-500/30 px-1.5 py-0.5 rounded border border-amber-400/40 animate-pulse">
                          {p.acertos14}
                        </span>
                      ) : (
                        <span className="text-slate-500">0</span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-center text-slate-500">{p.acertos15}</td>
                    <td className="py-2 px-3 text-center font-bold text-emerald-400">
                      R$ {p.premioR$.toFixed(2).replace('.', ',')}
                    </td>
                    <td className="py-2 px-3 text-right font-black">
                      <span
                        className={`${
                          p.roiConcurso >= 0 ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {p.roiConcurso > 0 ? `+${p.roiConcurso}%` : `${p.roiConcurso}%`}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
