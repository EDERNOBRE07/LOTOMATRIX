import React, { useMemo, useState } from 'react';
import {
  LotofacilDraw,
  GameTicket,
  FechamentoMode,
  DezenaStats,
} from '../types/lotofacil';
import {
  CONCURSO_ATUAL,
  RECENT_DRAWS,
  DEZENAS_STATS,
} from '../data/lotofacilData';
import {
  FECHAMENTO_PRESETS,
  VALOR_APOSTA_LOTOFACIL,
  buildOptimalPool,
  generateFechamentoCovering,
  countMatches,
} from '../services/combinatorics';
import { getHistorical100Draws } from '../services/historical100Draws';
import { soundService } from '../services/soundAlert';
import { useMetricGlow } from '../hooks/useMetricGlow';
import {
  History,
  TrendingUp,
  Award,
  DollarSign,
  ShieldCheck,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Sliders,
  CheckCircle2,
  Calendar,
  Layers,
  Flame,
  ArrowRight,
  Filter,
} from 'lucide-react';

interface BacktestingEstrategias100CardProps {
  latestDraw: LotofacilDraw;
  savedTickets?: GameTicket[];
  dynamicStats?: DezenaStats[];
  onApplyStrategyToFechamento?: (dezenas: number[], mode: FechamentoMode) => void;
  onNavigateToFechamento?: () => void;
}

export type StrategyOption =
  | '18_14_15'
  | '16_14_15'
  | '17_14_15'
  | '19_14_15'
  | '20_14_15'
  | '21_13_15'
  | 'doc_9x9'
  | 'top18_ia'
  | 'meus_jogos';

interface ContestBacktestResult {
  concurso: number;
  data: string;
  dezenasSorteadas: number[];
  maxAcertos: number;
  tickets15: number;
  tickets14: number;
  tickets13: number;
  tickets12: number;
  tickets11: number;
  premioTotalConcurso: number;
  melhorBilhete: number[];
}

export const BacktestingEstrategias100Card: React.FC<BacktestingEstrategias100CardProps> = ({
  latestDraw = CONCURSO_ATUAL,
  savedTickets = [],
  dynamicStats = DEZENAS_STATS,
  onApplyStrategyToFechamento,
  onNavigateToFechamento,
}) => {
  const [selectedStrategy, setSelectedStrategy] = useState<StrategyOption>('18_14_15');
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [selectedHitFilter, setSelectedHitFilter] = useState<'all' | '14_15' | '13_plus'>('all');
  const [inspectConcurso, setInspectConcurso] = useState<ContestBacktestResult | null>(null);

  const isGlowing = useMetricGlow(latestDraw.concurso);

  // 100 historical real / anchored draws
  const historical100 = useMemo(() => {
    return getHistorical100Draws(latestDraw);
  }, [latestDraw]);

  // Generate or retrieve tickets for the selected strategy
  const { strategyTickets, strategyName, strategyPool, jogosCount } = useMemo(() => {
    if (selectedStrategy === 'meus_jogos' && savedTickets.length > 0) {
      const union = Array.from(new Set(savedTickets.flatMap((t) => t.dezenas))).sort((a, b) => a - b);
      return {
        strategyTickets: savedTickets,
        strategyName: `Meus Jogos Ativos (${savedTickets.length} Bilhetes)`,
        strategyPool: union,
        jogosCount: savedTickets.length,
      };
    }

    if (selectedStrategy === 'top18_ia') {
      const top18 = [...dynamicStats]
        .sort((a, b) => b.vezes - a.vezes)
        .slice(0, 18)
        .map((s) => s.numero)
        .sort((a, b) => a - b);
      const tickets = generateFechamentoCovering(top18, 14, 24);
      return {
        strategyTickets: tickets,
        strategyName: 'Top 18 IA (24 Jogos • 14 se 15)',
        strategyPool: top18,
        jogosCount: tickets.length,
      };
    }

    if (selectedStrategy === 'doc_9x9') {
      const pool9x9 = buildOptimalPool(18, latestDraw, dynamicStats, [], 9, 9).dezenas18;
      const tickets = generateFechamentoCovering(pool9x9, 14, 24);
      return {
        strategyTickets: tickets,
        strategyName: 'Estratégia Documento 9x9 (24 Jogos • 9 Repetidas + 9 Ausentes)',
        strategyPool: pool9x9,
        jogosCount: tickets.length,
      };
    }

    // Standard preset modes (16 to 21)
    const modeKey = selectedStrategy as FechamentoMode;
    const preset = FECHAMENTO_PRESETS[modeKey] || FECHAMENTO_PRESETS['18_14_15'];
    const pool = buildOptimalPool(preset.dezenasNecessarias, latestDraw, dynamicStats).dezenas18;
    const targetHits = modeKey.includes('13') ? 13 : 14;
    const tickets = generateFechamentoCovering(pool, targetHits, preset.jogosMaximos);

    return {
      strategyTickets: tickets,
      strategyName: `${preset.nome} (${preset.jogosMaximos} Jogos)`,
      strategyPool: pool,
      jogosCount: tickets.length,
    };
  }, [selectedStrategy, savedTickets, dynamicStats, latestDraw]);

  // Execute Backtest across all 100 historical draws
  const backtestSummary = useMemo(() => {
    let count15 = 0;
    let count14 = 0;
    let count13 = 0;
    let count12 = 0;
    let count11 = 0;
    let totalPremios = 0;

    const contestResults: ContestBacktestResult[] = historical100.map((draw) => {
      let drawMaxHits = 0;
      let t15 = 0;
      let t14 = 0;
      let t13 = 0;
      let t12 = 0;
      let t11 = 0;
      let drawPremio = 0;
      let bestTicket: number[] = strategyTickets[0]?.dezenas || [];

      strategyTickets.forEach((ticket) => {
        const hits = countMatches(ticket.dezenas, draw.dezenas);
        if (hits > drawMaxHits) {
          drawMaxHits = hits;
          bestTicket = ticket.dezenas;
        }

        if (hits === 15) {
          t15++;
          drawPremio += draw.premiacoes?.faixa15?.valor || 1800000;
        } else if (hits === 14) {
          t14++;
          drawPremio += draw.premiacoes?.faixa14?.valor || 1480;
        } else if (hits === 13) {
          t13++;
          drawPremio += 35.0;
        } else if (hits === 12) {
          t12++;
          drawPremio += 14.0;
        } else if (hits === 11) {
          t11++;
          drawPremio += 7.0;
        }
      });

      count15 += t15;
      count14 += t14;
      count13 += t13;
      count12 += t12;
      count11 += t11;
      totalPremios += drawPremio;

      return {
        concurso: draw.concurso,
        data: draw.data,
        dezenasSorteadas: draw.dezenas,
        maxAcertos: drawMaxHits,
        tickets15: t15,
        tickets14: t14,
        tickets13: t13,
        tickets12: t12,
        tickets11: t11,
        premioTotalConcurso: drawPremio,
        melhorBilhete: bestTicket,
      };
    });

    const totalCustoApostas = jogosCount * 100 * VALOR_APOSTA_LOTOFACIL;
    const saldoLiquido = totalPremios - totalCustoApostas;
    const roiPercent =
      totalCustoApostas > 0 ? Number(((saldoLiquido / totalCustoApostas) * 100).toFixed(1)) : 0;

    const concursosCom14ou15 = contestResults.filter((c) => c.maxAcertos >= 14).length;
    const concursosCom13ouMais = contestResults.filter((c) => c.maxAcertos >= 13).length;

    return {
      contestResults,
      count15,
      count14,
      count13,
      count12,
      count11,
      totalPremios,
      totalCustoApostas,
      saldoLiquido,
      roiPercent,
      concursosCom14ou15,
      concursosCom13ouMais,
    };
  }, [historical100, strategyTickets, jogosCount]);

  const filteredContestResults = useMemo(() => {
    if (selectedHitFilter === '14_15') {
      return backtestSummary.contestResults.filter((c) => c.maxAcertos >= 14);
    }
    if (selectedHitFilter === '13_plus') {
      return backtestSummary.contestResults.filter((c) => c.maxAcertos >= 13);
    }
    return backtestSummary.contestResults;
  }, [backtestSummary.contestResults, selectedHitFilter]);

  const handleSelectStrategyPreset = (strat: StrategyOption) => {
    setSelectedStrategy(strat);
    soundService.playGoldenZoneSuccessChime();
    setInspectConcurso(null);
  };

  return (
    <div
      className={`card-pro overflow-hidden border border-amber-500/30 bg-slate-900/95 shadow-2xl backdrop-blur-md transition-all duration-500 hover:border-amber-400/50 mb-6 ${
        isGlowing ? 'animate-golden-glow ring-2 ring-amber-400/90' : ''
      }`}
    >
      {/* HEADER DO CARD */}
      <div className="p-4 sm:p-5 border-b border-amber-500/20 bg-gradient-to-r from-amber-950/50 via-slate-900/80 to-slate-900/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-yellow-600 flex items-center justify-center text-slate-950 shadow-lg shadow-amber-500/20 shrink-0">
            <History className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base sm:text-lg font-bold text-amber-300 tracking-wide flex items-center gap-2">
                Backtesting de Estratégias nos Últimos 100 Concursos
                <span
                  className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border transition-all ${
                    isGlowing
                      ? 'bg-amber-400 text-slate-950 border-amber-300 font-bold shadow-[0_0_15px_rgba(251,191,36,0.6)]'
                      : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  }`}
                >
                  100 Apurações Reais
                </span>
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Simule a performance de qualquer fechamento contra o histórico real de 100 sorteios da Lotofácil,
              auditando acertos de 13, 14 e 15 pontos.
            </p>
          </div>
        </div>

        {/* CONTROLES DE ESTRATÉGIA & RECOLHER */}
        <div className="flex items-center gap-2 self-end md:self-auto flex-wrap">
          <select
            value={selectedStrategy}
            onChange={(e) => handleSelectStrategyPreset(e.target.value as StrategyOption)}
            className="bg-slate-950 border border-amber-500/40 text-amber-300 text-xs rounded-xl px-3 py-2 font-bold focus:outline-none focus:ring-2 focus:ring-amber-400 transition cursor-pointer"
          >
            <option value="18_14_15">18 Dezenas (Matriz Pro • 24 Jogos)</option>
            <option value="16_14_15">16 Dezenas (4 Jogos)</option>
            <option value="17_14_15">17 Dezenas (10 Jogos)</option>
            <option value="19_14_15">19 Dezenas (48 Jogos)</option>
            <option value="20_14_15">20 Dezenas (64 Jogos)</option>
            <option value="21_13_15">21 Dezenas (32 Jogos)</option>
            <option value="doc_9x9">Estratégia Documento 9x9 (24 Jogos)</option>
            <option value="top18_ia">Top 18 IA (24 Jogos)</option>
            {savedTickets.length > 0 && (
              <option value="meus_jogos">Meus Jogos Salvos ({savedTickets.length} Jogos)</option>
            )}
          </select>

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
            title={isCollapsed ? 'Expandir' : 'Recolher'}
          >
            {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* CORPO DO CARD */}
      {!isCollapsed && (
        <div className="p-4 sm:p-5 space-y-5">
          {/* BANNER COM OS PRINCIPAIS ACERTOS: 15, 14 E 13 PONTOS */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {/* 15 Pontos (Jackpot) */}
            <div className="p-3.5 rounded-xl bg-gradient-to-br from-yellow-500/20 via-amber-950/40 to-slate-950 border-2 border-yellow-400/60 shadow-lg shadow-yellow-500/10 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-yellow-300 uppercase">15 Pontos</span>
                <Sparkles className="w-4 h-4 text-yellow-400" />
              </div>
              <div className="mt-2">
                <span className="text-2xl sm:text-3xl font-black text-yellow-300">
                  {backtestSummary.count15}
                </span>
                <span className="text-[10px] text-yellow-400/90 block font-semibold mt-0.5">
                  {backtestSummary.count15 > 0 ? 'Premiação Máxima!' : 'Nenhum 15 nos 100'}
                </span>
              </div>
            </div>

            {/* 14 Pontos (Premiação Alta) */}
            <div className="p-3.5 rounded-xl bg-gradient-to-br from-amber-500/20 via-slate-950 to-slate-950 border-2 border-amber-500/50 shadow-md flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-amber-300 uppercase">14 Pontos</span>
                <Award className="w-4 h-4 text-amber-400" />
              </div>
              <div className="mt-2">
                <span className="text-2xl sm:text-3xl font-black text-amber-300">
                  {backtestSummary.count14}x
                </span>
                <span className="text-[10px] text-slate-400 block font-medium mt-0.5">
                  em {backtestSummary.concursosCom14ou15} concursos
                </span>
              </div>
            </div>

            {/* 13 Pontos (Premiação Intermediária) */}
            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-cyan-500/30 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-cyan-300 uppercase">13 Pontos</span>
                <ShieldCheck className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="mt-2">
                <span className="text-2xl sm:text-3xl font-black text-cyan-300">
                  {backtestSummary.count13}x
                </span>
                <span className="text-[10px] text-slate-400 block font-medium mt-0.5">
                  em {backtestSummary.concursosCom13ouMais} concursos
                </span>
              </div>
            </div>

            {/* 11 e 12 Pontos */}
            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-300 uppercase">11 & 12 Pontos</span>
                <Layers className="w-4 h-4 text-slate-400" />
              </div>
              <div className="mt-2">
                <span className="text-xl sm:text-2xl font-black text-white">
                  {backtestSummary.count12 + backtestSummary.count11}x
                </span>
                <span className="text-[10px] text-slate-400 block font-medium mt-0.5">
                  {backtestSummary.count12} de 12 • {backtestSummary.count11} de 11
                </span>
              </div>
            </div>

            {/* Retorno Financeiro & Saldo Líquido */}
            <div
              className={`p-3.5 rounded-xl border flex flex-col justify-between col-span-2 sm:col-span-1 ${
                backtestSummary.saldoLiquido >= 0
                  ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
                  : 'bg-slate-950/80 border-slate-800 text-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase">Saldo Teórico</span>
                <DollarSign className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="mt-2">
                <span
                  className={`text-xl font-black ${
                    backtestSummary.saldoLiquido >= 0 ? 'text-emerald-400' : 'text-slate-300'
                  }`}
                >
                  R${' '}
                  {Math.abs(backtestSummary.saldoLiquido).toLocaleString('pt-BR', {
                    maximumFractionDigits: 0,
                  })}
                </span>
                <span className="text-[10px] block mt-0.5 font-semibold text-slate-400">
                  ROI: {backtestSummary.roiPercent > 0 ? `+${backtestSummary.roiPercent}%` : `${backtestSummary.roiPercent}%`}
                </span>
              </div>
            </div>
          </div>

          {/* VISUALIZAÇÃO DOS 100 CONCURSOS (GRADE DE HEATMAP HISTÓRICA) */}
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-amber-400" />
                <h4 className="text-xs sm:text-sm font-bold text-slate-200">
                  Distribuição de Acertos Concurso a Concurso (100 Apurações)
                </h4>
              </div>

              {/* Filtros Rápidos */}
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-400 font-medium text-[11px]">Filtrar:</span>
                <button
                  onClick={() => setSelectedHitFilter('all')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    selectedHitFilter === 'all'
                      ? 'bg-amber-500 text-slate-950 font-black'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  Todos (100)
                </button>
                <button
                  onClick={() => setSelectedHitFilter('14_15')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    selectedHitFilter === '14_15'
                      ? 'bg-yellow-400 text-slate-950 font-black'
                      : 'bg-slate-800 text-yellow-400/80 hover:text-yellow-300'
                  }`}
                >
                  14 ou 15 Pts ({backtestSummary.concursosCom14ou15})
                </button>
                <button
                  onClick={() => setSelectedHitFilter('13_plus')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    selectedHitFilter === '13_plus'
                      ? 'bg-cyan-500 text-slate-950 font-black'
                      : 'bg-slate-800 text-cyan-400/80 hover:text-cyan-300'
                  }`}
                >
                  ≥ 13 Pts ({backtestSummary.concursosCom13ouMais})
                </button>
              </div>
            </div>

            {/* GRADE DOS CONCURSOS */}
            <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5 pt-2 max-h-72 overflow-y-auto pr-1">
              {filteredContestResults.map((item) => {
                const is15 = item.maxAcertos === 15;
                const is14 = item.maxAcertos === 14;
                const is13 = item.maxAcertos === 13;
                const is11or12 = item.maxAcertos >= 11;
                const isInspected = inspectConcurso?.concurso === item.concurso;

                let badgeColor = 'bg-slate-900 border-slate-800 text-slate-500';
                if (is15) {
                  badgeColor =
                    'bg-gradient-to-br from-yellow-400 to-amber-500 text-slate-950 font-black border-yellow-300 shadow-md shadow-yellow-500/30 animate-pulse';
                } else if (is14) {
                  badgeColor =
                    'bg-gradient-to-br from-amber-500 to-yellow-600 text-slate-950 font-black border-amber-300 shadow-sm shadow-amber-500/20';
                } else if (is13) {
                  badgeColor =
                    'bg-gradient-to-br from-cyan-600 to-blue-700 text-white font-bold border-cyan-400/60';
                } else if (is11or12) {
                  badgeColor = 'bg-slate-850 text-slate-300 border-slate-700/80';
                }

                return (
                  <button
                    key={item.concurso}
                    onClick={() =>
                      setInspectConcurso(
                        inspectConcurso?.concurso === item.concurso ? null : item
                      )
                    }
                    className={`p-1.5 rounded-lg border text-center transition-all cursor-pointer flex flex-col items-center justify-center ${badgeColor} ${
                      isInspected ? 'ring-2 ring-white scale-105 z-10' : 'hover:scale-[1.03]'
                    }`}
                    title={`Concurso #${item.concurso} (${item.data}): Max ${item.maxAcertos} Pontos`}
                  >
                    <span className="text-[10px] opacity-75 font-mono">#{item.concurso}</span>
                    <span className="text-xs font-black">{item.maxAcertos} pts</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* DETALHAMENTO DO CONCURSO INSPECIONADO */}
          {inspectConcurso && (
            <div className="p-4 rounded-xl bg-slate-950/90 border border-amber-500/40 space-y-3 animate-fadeIn">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <h4 className="text-sm font-bold text-amber-300">
                    Inspeção do Concurso #{inspectConcurso.concurso} ({inspectConcurso.data})
                  </h4>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-bold text-white">
                    Pontuação Máxima:{' '}
                    <strong className="text-amber-400 text-sm">
                      {inspectConcurso.maxAcertos} Pontos
                    </strong>
                  </span>
                  {inspectConcurso.premioTotalConcurso > 0 && (
                    <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">
                      Prêmio: R${' '}
                      {inspectConcurso.premioTotalConcurso.toLocaleString('pt-BR', {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                  )}
                </div>
              </div>

              {/* Dezenas Sorteadas vs Melhor Bilhete */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-xs font-bold text-slate-300 block mb-2">
                    Dezenas Sorteadas no Concurso #{inspectConcurso.concurso}:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {inspectConcurso.dezenasSorteadas.map((dez) => {
                      const isHit = inspectConcurso.melhorBilhete.includes(dez);
                      return (
                        <span
                          key={dez}
                          className={`w-7 h-7 rounded-md font-black text-xs flex items-center justify-center shadow-sm ${
                            isHit
                              ? 'bg-amber-400 text-slate-950 ring-1 ring-amber-300'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {dez.toString().padStart(2, '0')}
                        </span>
                      );
                    })}
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-xs font-bold text-amber-300 block mb-2">
                    Melhor Bilhete da Estratégia ({inspectConcurso.maxAcertos} Acertos):
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {inspectConcurso.melhorBilhete.map((dez) => {
                      const isHit = inspectConcurso.dezenasSorteadas.includes(dez);
                      return (
                        <span
                          key={dez}
                          className={`w-7 h-7 rounded-md font-black text-xs flex items-center justify-center shadow-sm ${
                            isHit
                              ? 'bg-emerald-500 text-slate-950 font-black'
                              : 'bg-slate-800 text-slate-500'
                          }`}
                        >
                          {dez.toString().padStart(2, '0')}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* DICA ESTRATÉGICA E CARREGAMENTO NO FECHAMENTO */}
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-slate-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-200">
                  Validação da Estratégia: {strategyName}
                </p>
                <p className="text-slate-400 text-[11px] mt-0.5">
                  Nos 100 concursos reais testados, esta estratégia atingiu{' '}
                  <strong className="text-amber-300">{backtestSummary.count14} vezes 14 pontos</strong> e{' '}
                  <strong className="text-cyan-300">{backtestSummary.count13} vezes 13 pontos</strong>,
                  totalizando{' '}
                  <strong className="text-emerald-400">
                    R${' '}
                    {backtestSummary.totalPremios.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </strong>{' '}
                  em prêmios teóricos.
                </p>
              </div>
            </div>

            {onNavigateToFechamento && (
              <button
                onClick={onNavigateToFechamento}
                className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 text-slate-950 text-xs font-bold hover:bg-amber-400 transition cursor-pointer"
              >
                <span>Usar no Fechamento</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
