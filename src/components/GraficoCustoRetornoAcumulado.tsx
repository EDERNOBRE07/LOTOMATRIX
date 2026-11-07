import React, { useState, useMemo, useEffect } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ReferenceLine,
} from 'recharts';
import { LotofacilDraw, GameTicket } from '../types/lotofacil';
import { CONCURSO_ATUAL, RECENT_DRAWS } from '../data/lotofacilData';
import { SavedFechamentoPrognostico, getSavedFechamentos } from '../services/savedFechamentosStorage';
import { countMatches } from '../services/combinatorics';
import { getHistoricalNDraws } from '../services/historical100Draws';
import {
  FiltroIntervaloTempoEstatisticas,
  TimeRangeInterval,
  TIME_RANGE_OPTIONS,
} from './FiltroIntervaloTempoEstatisticas';
import {
  TrendingUp,
  DollarSign,
  Award,
  Calendar,
  Layers,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Scale,
  Target,
  RefreshCw,
  Info,
} from 'lucide-react';

interface GraficoCustoRetornoAcumuladoProps {
  latestDraw?: LotofacilDraw;
  initialTimeRange?: TimeRangeInterval;
  onTimeRangeChange?: (range: TimeRangeInterval) => void;
  savedTickets?: GameTicket[];
  fechamentoNome?: string;
}

interface CumulativePoint {
  concurso: number;
  concursoLabel: string;
  data: string;
  custoConcurso: number;
  retornoConcurso: number;
  saldoConcurso: number;
  custoAcumulado: number;
  retornoAcumulado: number;
  saldoLiquidoAcumulado: number;
  roiAcumuladoPercent: number;
  hits11: number;
  hits12: number;
  hits13: number;
  hits14: number;
  hits15: number;
  totalPremiadosConcurso: number;
}

export const GraficoCustoRetornoAcumulado: React.FC<GraficoCustoRetornoAcumuladoProps> = ({
  latestDraw = CONCURSO_ATUAL,
  initialTimeRange = '6_meses',
  onTimeRangeChange,
  savedTickets = [],
  fechamentoNome = '18 Dezenas • 24 Jogos (18-15-14-15)',
}) => {
  const [timeRange, setTimeRange] = useState<TimeRangeInterval>(initialTimeRange);
  const [selectedStrategyId, setSelectedStrategyId] = useState<string>('all');
  const [showAreaFill, setShowAreaFill] = useState<boolean>(true);
  const [savedFechamentos, setSavedFechamentos] = useState<SavedFechamentoPrognostico[]>(() =>
    getSavedFechamentos()
  );

  useEffect(() => {
    if (initialTimeRange && initialTimeRange !== timeRange) {
      setTimeRange(initialTimeRange);
    }
  }, [initialTimeRange]);

  useEffect(() => {
    const handleUpdate = () => {
      setSavedFechamentos(getSavedFechamentos());
    };
    window.addEventListener('lotosniper-saved-fechamentos-updated', handleUpdate);
    return () => window.removeEventListener('lotosniper-saved-fechamentos-updated', handleUpdate);
  }, []);

  const handleTimeRangeChange = (newRange: TimeRangeInterval) => {
    setTimeRange(newRange);
    if (onTimeRangeChange) {
      onTimeRangeChange(newRange);
    }
  };

  // Determina quantidade de concursos com base no intervalo
  const drawCount = useMemo(() => {
    const opt = TIME_RANGE_OPTIONS.find((o) => o.id === timeRange);
    return opt ? opt.drawCount : 130;
  }, [timeRange]);

  // Lista de sorteios históricos em ordem cronológica (mais antigo -> mais recente)
  const drawsChronological = useMemo(() => {
    const drawsDesc = getHistoricalNDraws(drawCount, latestDraw);
    return [...drawsDesc].reverse();
  }, [drawCount, latestDraw]);

  // Bilhetes a serem avaliados para o cálculo de custo e retorno
  const activeTickets = useMemo(() => {
    if (selectedStrategyId === 'all') {
      if (savedFechamentos.length > 0) {
        return savedFechamentos.flatMap((f) => f.tickets || []);
      }
      if (savedTickets.length > 0) {
        return savedTickets;
      }
      return [];
    }

    const found = savedFechamentos.find((f) => f.id === selectedStrategyId);
    if (found && Array.isArray(found.tickets) && found.tickets.length > 0) {
      return found.tickets;
    }
    return savedTickets;
  }, [selectedStrategyId, savedFechamentos, savedTickets]);

  // Custo por concurso das apostas ativas (R$ 3.50 por volante simples de 15 dezenas)
  const costPerDraw = useMemo(() => {
    if (activeTickets.length === 0) return 0;
    return activeTickets.length * 3.5;
  }, [activeTickets]);

  // Calcula a curva cumulativa de Custo vs Retorno ao longo dos concursos
  const cumulativeData: CumulativePoint[] = useMemo(() => {
    if (drawsChronological.length === 0 || activeTickets.length === 0) {
      return [];
    }

    let runningCusto = 0;
    let runningRetorno = 0;

    return drawsChronological.map((draw) => {
      let concursoRetorno = 0;
      let h11 = 0;
      let h12 = 0;
      let h13 = 0;
      let h14 = 0;
      let h15 = 0;

      for (const ticket of activeTickets) {
        if (!ticket.dezenas || ticket.dezenas.length === 0) continue;
        const matches = countMatches(ticket.dezenas, draw.dezenas);
        if (matches === 15) {
          h15++;
          concursoRetorno += draw.premiacoes?.faixa15?.valor || 1750000;
        } else if (matches === 14) {
          h14++;
          concursoRetorno += draw.premiacoes?.faixa14?.valor || 1400;
        } else if (matches === 13) {
          h13++;
          concursoRetorno += 35.0;
        } else if (matches === 12) {
          h12++;
          concursoRetorno += 14.0;
        } else if (matches === 11) {
          h11++;
          concursoRetorno += 7.0;
        }
      }

      runningCusto += costPerDraw;
      runningRetorno += concursoRetorno;
      const runningSaldo = runningRetorno - runningCusto;
      const runningRoi = runningCusto > 0 ? (runningSaldo / runningCusto) * 100 : 0;

      return {
        concurso: draw.concurso,
        concursoLabel: `#${draw.concurso}`,
        data: draw.data,
        custoConcurso: costPerDraw,
        retornoConcurso: concursoRetorno,
        saldoConcurso: concursoRetorno - costPerDraw,
        custoAcumulado: Math.round(runningCusto * 100) / 100,
        retornoAcumulado: Math.round(runningRetorno * 100) / 100,
        saldoLiquidoAcumulado: Math.round(runningSaldo * 100) / 100,
        roiAcumuladoPercent: Math.round(runningRoi * 10) / 10,
        hits11: h11,
        hits12: h12,
        hits13: h13,
        hits14: h14,
        hits15: h15,
        totalPremiadosConcurso: h11 + h12 + h13 + h14 + h15,
      };
    });
  }, [drawsChronological, activeTickets, costPerDraw]);

  // Métricas agregadas finais
  const finalMetrics = useMemo(() => {
    if (cumulativeData.length === 0) {
      return {
        totalInvestido: 0,
        totalRetorno: 0,
        saldoLiquido: 0,
        roiGlobal: 0,
        isLucrativo: false,
        breakevenConcurso: null as number | null,
        totalPremiadosGeral: 0,
        taxaRecuperacao: 0,
      };
    }

    const last = cumulativeData[cumulativeData.length - 1];
    const totalInvestido = last.custoAcumulado;
    const totalRetorno = last.retornoAcumulado;
    const saldoLiquido = last.saldoLiquidoAcumulado;
    const roiGlobal = last.roiAcumuladoPercent;
    const isLucrativo = saldoLiquido >= 0;

    // Identifica o primeiro concurso onde o ponto de equilíbrio (breakeven) foi atingido
    const breakevenPoint = cumulativeData.find((p) => p.saldoLiquidoAcumulado >= 0 && p.custoAcumulado > 0);
    const totalPremiadosGeral = cumulativeData.reduce((acc, p) => acc + p.totalPremiadosConcurso, 0);
    const taxaRecuperacao = totalInvestido > 0 ? (totalRetorno / totalInvestido) * 100 : 0;

    return {
      totalInvestido,
      totalRetorno,
      saldoLiquido,
      roiGlobal,
      isLucrativo,
      breakevenConcurso: breakevenPoint ? breakevenPoint.concurso : null,
      totalPremiadosGeral,
      taxaRecuperacao: Math.round(taxaRecuperacao * 10) / 10,
    };
  }, [cumulativeData]);

  const activeStrategyObj = savedFechamentos.find((f) => f.id === selectedStrategyId);

  return (
    <div className="space-y-6">
      {/* Barra de Filtro de Intervalo Temporal Compartilhado */}
      <FiltroIntervaloTempoEstatisticas
        value={timeRange}
        onChange={handleTimeRangeChange}
        latestDraw={latestDraw}
      />

      {/* Header Principal do Módulo de Rentabilidade Acumulada */}
      <div className="bg-slate-900/95 border-2 border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-emerald-400 via-teal-500 to-cyan-500 text-slate-950 font-black shadow-lg shadow-emerald-500/20 shrink-0">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-mono font-black uppercase px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  Curva Financeira Acumulada (Recharts)
                </span>
                <h2 className="text-xl font-black text-white">
                  Custo vs Retorno Financeiro Acumulado
                </h2>
              </div>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                Acompanhe a rentabilidade e o <strong>ponto de equilíbrio (breakeven)</strong> das suas estratégias geradas pelo LotoSniper ao longo dos concursos da Lotofácil, comparando o investimento total nos volantes versus os prêmios conquistados.
              </p>
            </div>
          </div>

          {/* Seletores de Estratégia e Visualização */}
          <div className="flex items-center gap-2.5 flex-wrap shrink-0">
            {/* Dropdown de Seleção de Fechamento */}
            <div className="space-y-1">
              <label className="text-[10px] font-mono font-bold text-slate-400 block uppercase">
                Fechamento Avaliado:
              </label>
              <select
                value={selectedStrategyId}
                onChange={(e) => setSelectedStrategyId(e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white font-medium focus:outline-none focus:border-emerald-400 cursor-pointer max-w-[260px] truncate"
              >
                <option value="all">
                  Todos os Fechamentos Salvos ({savedFechamentos.length > 0 ? savedFechamentos.length : 1} carteira)
                </option>
                {savedFechamentos.map((f, idx) => (
                  <option key={f.id} value={f.id}>
                    #{idx + 1} • {f.tipoFechamento} ({f.tickets?.length || 0} jogos)
                  </option>
                ))}
              </select>
            </div>

            {/* Toggle de Área Preenchida */}
            <button
              type="button"
              onClick={() => setShowAreaFill(!showAreaFill)}
              className={`mt-4 px-3 py-1.5 rounded-xl border text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                showAreaFill
                  ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                  : 'bg-slate-950 border-slate-700 text-slate-400 hover:text-white'
              }`}
              title="Alternar preenchimento sombreado da área de lucro"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{showAreaFill ? 'Área Sombreada' : 'Apenas Linhas'}</span>
            </button>
          </div>
        </div>

        {/* Cards com Métricas Financeiras Consolidadas */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-6 border-t border-slate-800/80 mt-5">
          {/* 1. Total Investido (Custo Acumulado) */}
          <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800 flex flex-col justify-between">
            <span className="text-[10px] font-mono text-slate-400 uppercase font-semibold">
              Custo Acumulado
            </span>
            <div className="mt-1">
              <span className="text-lg font-black text-amber-400 font-mono">
                R$ {finalMetrics.totalInvestido.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="block text-[10px] text-slate-500 font-mono mt-0.5">
                {activeTickets.length} apostas ({drawsChronological.length} concursos)
              </span>
            </div>
          </div>

          {/* 2. Retorno Financeiro Acumulado */}
          <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800 flex flex-col justify-between">
            <span className="text-[10px] font-mono text-slate-400 uppercase font-semibold">
              Retorno Acumulado
            </span>
            <div className="mt-1">
              <span className="text-lg font-black text-emerald-400 font-mono">
                R$ {finalMetrics.totalRetorno.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="block text-[10px] text-emerald-400/80 font-mono mt-0.5">
                {finalMetrics.totalPremiadosGeral} bilhetes premiados
              </span>
            </div>
          </div>

          {/* 3. Saldo Líquido */}
          <div
            className={`p-3.5 rounded-2xl border flex flex-col justify-between ${
              finalMetrics.isLucrativo
                ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300'
                : 'bg-rose-950/30 border-rose-500/40 text-rose-300'
            }`}
          >
            <span className="text-[10px] font-mono uppercase font-semibold flex items-center justify-between">
              <span>Saldo Líquido</span>
              {finalMetrics.isLucrativo ? (
                <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <ArrowDownRight className="w-3.5 h-3.5 text-rose-400" />
              )}
            </span>
            <div className="mt-1">
              <span className="text-lg font-black font-mono">
                {finalMetrics.saldoLiquido >= 0 ? '+' : ''}R${' '}
                {finalMetrics.saldoLiquido.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="block text-[10px] font-mono mt-0.5 opacity-80">
                {finalMetrics.isLucrativo ? 'Lucro Líquido Real' : 'Déficit no Período'}
              </span>
            </div>
          </div>

          {/* 4. ROI Global Acumulado */}
          <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800 flex flex-col justify-between">
            <span className="text-[10px] font-mono text-slate-400 uppercase font-semibold">
              ROI Acumulado
            </span>
            <div className="mt-1">
              <span
                className={`text-lg font-black font-mono ${
                  finalMetrics.roiGlobal >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {finalMetrics.roiGlobal >= 0 ? '+' : ''}
                {finalMetrics.roiGlobal.toFixed(1)}%
              </span>
              <span className="block text-[10px] text-slate-500 font-mono mt-0.5">
                Retorno s/ Investimento
              </span>
            </div>
          </div>

          {/* 5. Taxa de Recuperação */}
          <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800 flex flex-col justify-between">
            <span className="text-[10px] font-mono text-slate-400 uppercase font-semibold">
              Recuperação Capital
            </span>
            <div className="mt-1">
              <span className="text-lg font-black text-cyan-400 font-mono">
                {finalMetrics.taxaRecuperacao}%
              </span>
              <span className="block text-[10px] text-slate-500 font-mono mt-0.5">
                {finalMetrics.taxaRecuperacao >= 100 ? '100%+ Coberto' : 'Em recuperação'}
              </span>
            </div>
          </div>

          {/* 6. Ponto de Equilíbrio (Breakeven) */}
          <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800 flex flex-col justify-between">
            <span className="text-[10px] font-mono text-slate-400 uppercase font-semibold">
              Breakeven (Equilíbrio)
            </span>
            <div className="mt-1">
              {finalMetrics.breakevenConcurso ? (
                <div>
                  <span className="text-sm font-black text-emerald-400 font-mono flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    Concurso #{finalMetrics.breakevenConcurso}
                  </span>
                  <span className="block text-[10px] text-emerald-300 font-mono mt-0.5">
                    Rentabilidade Atingida!
                  </span>
                </div>
              ) : (
                <div>
                  <span className="text-xs font-bold text-amber-400 font-mono flex items-center gap-1">
                    <Scale className="w-3.5 h-3.5 text-amber-400" />
                    Em Convergência
                  </span>
                  <span className="block text-[10px] text-slate-500 font-mono mt-0.5">
                    Aguardando prêmio 14/15
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Gráfico Interativo com Recharts */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse"></div>
            <h3 className="text-sm font-bold text-white">
              Evolução Cronológica: Custo vs Retorno Acumulado (R$)
            </h3>
          </div>
          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="flex items-center gap-1.5 text-amber-400">
              <span className="w-3 h-1 bg-amber-400 rounded-full"></span>
              <span>Custo Acumulado</span>
            </div>
            <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
              <span className="w-3 h-1 bg-emerald-400 rounded-full"></span>
              <span>Retorno Acumulado</span>
            </div>
            <div className="flex items-center gap-1.5 text-cyan-400 font-bold">
              <span className="w-3 h-0.5 border-t border-dashed border-cyan-400"></span>
              <span>Saldo Líquido</span>
            </div>
          </div>
        </div>

        {cumulativeData.length > 0 ? (
          <div className="h-[380px] w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={cumulativeData}
                margin={{ top: 10, right: 20, left: 10, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.7} />
                <XAxis
                  dataKey="concursoLabel"
                  stroke="#64748b"
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  tickLine={false}
                  interval={Math.ceil(cumulativeData.length / 12)}
                />
                <YAxis
                  stroke="#64748b"
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  tickLine={false}
                  tickFormatter={(val) => `R$ ${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload as CumulativePoint;
                      return (
                        <div className="bg-slate-950/95 border-2 border-emerald-500/50 p-4 rounded-2xl shadow-2xl text-xs font-mono space-y-2 min-w-[240px]">
                          <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
                            <span className="font-black text-emerald-400 text-sm">
                              Concurso #{data.concurso}
                            </span>
                            <span className="text-slate-400 text-[11px]">{data.data}</span>
                          </div>

                          <div className="space-y-1">
                            <div className="flex justify-between">
                              <span className="text-slate-400">Custo Acumulado:</span>
                              <span className="text-amber-400 font-bold">
                                R$ {data.custoAcumulado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">Retorno Acumulado:</span>
                              <span className="text-emerald-400 font-bold">
                                R$ {data.retornoAcumulado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                            <div className="flex justify-between pt-1 border-t border-slate-800/80">
                              <span className="text-slate-300 font-semibold">Saldo Líquido Acumulado:</span>
                              <span
                                className={`font-black ${
                                  data.saldoLiquidoAcumulado >= 0 ? 'text-emerald-300' : 'text-rose-400'
                                }`}
                              >
                                {data.saldoLiquidoAcumulado >= 0 ? '+' : ''}R${' '}
                                {data.saldoLiquidoAcumulado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">ROI no Ponto:</span>
                              <span
                                className={`font-bold ${
                                  data.roiAcumuladoPercent >= 0 ? 'text-emerald-400' : 'text-rose-400'
                                }`}
                              >
                                {data.roiAcumuladoPercent >= 0 ? '+' : ''}
                                {data.roiAcumuladoPercent.toFixed(1)}%
                              </span>
                            </div>
                          </div>

                          <div className="pt-2 border-t border-slate-800 text-[10px] text-slate-400">
                            <span className="block text-slate-300 font-bold mb-1">
                              Premiações do Concurso:
                            </span>
                            <div className="grid grid-cols-3 gap-1 text-center">
                              <span className="bg-slate-900 p-1 rounded">11p: {data.hits11}</span>
                              <span className="bg-slate-900 p-1 rounded">12p: {data.hits12}</span>
                              <span className="bg-slate-900 p-1 rounded">13p: {data.hits13}</span>
                            </div>
                            {(data.hits14 > 0 || data.hits15 > 0) && (
                              <div className="mt-1 p-1 rounded bg-amber-500/20 text-amber-300 font-bold text-center">
                                {data.hits14 > 0 && `★ ${data.hits14} bilhete(s) com 14 PONTOS! `}
                                {data.hits15 > 0 && `★★★ ${data.hits15} bilhete(s) com 15 PONTOS!`}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />

                {/* Sombra de Lucro Líquido Acumulado */}
                {showAreaFill && (
                  <Area
                    type="monotone"
                    dataKey="retornoAcumulado"
                    fill="url(#profitGradient)"
                    stroke="none"
                    opacity={0.25}
                  />
                )}

                {/* Linha de Referência Zero */}
                <ReferenceLine y={0} stroke="#475569" strokeDasharray="3 3" />

                {/* Linha 1: Custo Acumulado (R$) */}
                <Line
                  type="monotone"
                  dataKey="custoAcumulado"
                  name="Custo Acumulado (R$)"
                  stroke="#f59e0b"
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 5, fill: '#f59e0b' }}
                />

                {/* Linha 2: Retorno Financeiro Acumulado (R$) */}
                <Line
                  type="monotone"
                  dataKey="retornoAcumulado"
                  name="Retorno Acumulado (R$)"
                  stroke="#10b981"
                  strokeWidth={3}
                  dot={false}
                  activeDot={{ r: 6, fill: '#10b981', stroke: '#fff', strokeWidth: 2 }}
                />

                {/* Linha 3: Saldo Líquido Acumulado (R$) */}
                <Line
                  type="monotone"
                  dataKey="saldoLiquidoAcumulado"
                  name="Saldo Líquido (R$)"
                  stroke="#06b6d4"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={false}
                  activeDot={{ r: 4, fill: '#06b6d4' }}
                />

                {/* Gradiente de Lucro */}
                <defs>
                  <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.6} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-[280px] flex flex-col items-center justify-center text-slate-500">
            <AlertTriangle className="w-8 h-8 text-amber-500 mb-2" />
            <p className="text-xs">Nenhum dado financeiro encontrado para o fechamento selecionado.</p>
          </div>
        )}
      </div>

      {/* Tabela dos 10 Últimos Concursos Avaliados */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl">
        <h4 className="text-xs font-black uppercase tracking-wider text-slate-300 pb-2 mb-3 border-b border-slate-800 flex items-center justify-between">
          <span>Últimos Concursos Analisados no Fechamento Ativo</span>
          <span className="text-[10px] font-mono text-emerald-400">
            {activeTickets.length} volantes concorrendo
          </span>
        </h4>

        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead>
              <tr className="text-slate-400 border-b border-slate-800 text-[11px]">
                <th className="pb-2">Concurso</th>
                <th className="pb-2">Data</th>
                <th className="pb-2">Custo Concurso</th>
                <th className="pb-2">Retorno</th>
                <th className="pb-2">Custo Acumulado</th>
                <th className="pb-2">Retorno Acumulado</th>
                <th className="pb-2 text-right">Saldo Acumulado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {cumulativeData.slice(-10).reverse().map((row) => (
                <tr key={row.concurso} className="hover:bg-slate-800/40 transition">
                  <td className="py-2 text-white font-bold">#{row.concurso}</td>
                  <td className="py-2 text-slate-400 text-[11px]">{row.data}</td>
                  <td className="py-2 text-amber-400">R$ {row.custoConcurso.toFixed(2)}</td>
                  <td className="py-2 text-emerald-400 font-bold">R$ {row.retornoConcurso.toFixed(2)}</td>
                  <td className="py-2 text-slate-400">R$ {row.custoAcumulado.toFixed(2)}</td>
                  <td className="py-2 text-emerald-300">R$ {row.retornoAcumulado.toFixed(2)}</td>
                  <td
                    className={`py-2 text-right font-black ${
                      row.saldoLiquidoAcumulado >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {row.saldoLiquidoAcumulado >= 0 ? '+' : ''}R${' '}
                    {row.saldoLiquidoAcumulado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
