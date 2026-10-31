import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  Cell,
  AreaChart,
  Area,
} from 'recharts';
import { LotofacilDraw, DezenaStats } from '../types/lotofacil';
import { CONCURSO_ATUAL, DEZENAS_STATS, PRIMOS, MOLDURA, FIBONACCI } from '../data/lotofacilData';
import { getHistorical100Draws } from '../services/historical100Draws';
import {
  Clock,
  TrendingUp,
  AlertTriangle,
  Flame,
  Sparkles,
  Layers,
  ArrowRight,
  Filter,
  CheckCircle2,
  Info,
  Zap,
  Target,
  BarChart3,
} from 'lucide-react';
import { soundService } from '../services/soundAlert';

interface HistoricoAtrasosRechartsCardProps {
  latestDraw?: LotofacilDraw;
  statsList?: DezenaStats[];
  cyclePendingNumbers?: number[];
  onFixNumbersInFechamento?: (numbers: number[]) => void;
}

interface DezenaDelayItem {
  numero: number;
  label: string;
  atrasoAtual: number;
  atrasoUltimo: number;
  atrasoMedio: number;
  maiorAtraso: number;
  vezes: number;
  status: 'critica' | 'atrasada' | 'neutra' | 'recente';
  pendenteNoCiclo: boolean;
  presenteUltimoConcurso: boolean;
  razaoPressao: number; // atrasoAtual / atrasoMedio
  ePrimo: boolean;
  eMoldura: boolean;
  eFibonacci: boolean;
}

export const HistoricoAtrasosRechartsCard: React.FC<HistoricoAtrasosRechartsCardProps> = ({
  latestDraw = CONCURSO_ATUAL,
  statsList = DEZENAS_STATS,
  cyclePendingNumbers = [17, 22],
  onFixNumbersInFechamento,
}) => {
  const [viewMode, setViewMode] = useState<'comparativo' | 'evolucao_temporal'>('comparativo');
  const [selectedDezena, setSelectedDezena] = useState<number>(() => {
    // Default to the number with highest current delay
    const sorted = [...statsList].sort((a, b) => b.atrasoAtual - a.atrasoAtual);
    return sorted.length > 0 ? sorted[0].numero : 17;
  });
  const [sortBy, setSortBy] = useState<'numero' | 'atraso_desc' | 'pressao_desc'>('atraso_desc');
  const [statusFilter, setStatusFilter] = useState<'all' | 'criticas' | 'pendentes_ciclo'>('all');

  // Historical 100 draws for time-series delay analysis
  const historical100 = useMemo(() => {
    return getHistorical100Draws(latestDraw);
  }, [latestDraw]);

  // Comparative data for all 25 numbers
  const chartData: DezenaDelayItem[] = useMemo(() => {
    const list = statsList.map((stat) => {
      const isPendenteCiclo = cyclePendingNumbers.includes(stat.numero);
      const isPresenteUltimo = latestDraw.dezenas.includes(stat.numero);
      const razao = Number((stat.atrasoAtual / Math.max(1, stat.atrasoMedio)).toFixed(2));

      let status: DezenaDelayItem['status'] = 'neutra';
      if (isPresenteUltimo) {
        status = 'recente';
      } else if (stat.atrasoAtual >= 3 || isPendenteCiclo) {
        status = 'critica';
      } else if (stat.atrasoAtual > stat.atrasoMedio) {
        status = 'atrasada';
      }

      return {
        numero: stat.numero,
        label: stat.numero.toString().padStart(2, '0'),
        atrasoAtual: stat.atrasoAtual,
        atrasoUltimo: stat.atrasoUltimo,
        atrasoMedio: stat.atrasoMedio,
        maiorAtraso: stat.maiorAtraso,
        vezes: stat.vezes,
        status,
        pendenteNoCiclo: isPendenteCiclo,
        presenteUltimoConcurso: isPresenteUltimo,
        razaoPressao: razao,
        ePrimo: PRIMOS.includes(stat.numero),
        eMoldura: MOLDURA.includes(stat.numero),
        eFibonacci: FIBONACCI.includes(stat.numero),
      };
    });

    // Apply filter
    let filtered = list;
    if (statusFilter === 'criticas') {
      filtered = list.filter((item) => item.atrasoAtual >= 3 || item.pendenteNoCiclo);
    } else if (statusFilter === 'pendentes_ciclo') {
      filtered = list.filter((item) => item.pendenteNoCiclo);
    }

    // Apply sorting
    if (sortBy === 'atraso_desc') {
      filtered = [...filtered].sort((a, b) => b.atrasoAtual - a.atrasoAtual || a.numero - b.numero);
    } else if (sortBy === 'pressao_desc') {
      filtered = [...filtered].sort((a, b) => b.razaoPressao - a.razaoPressao || b.atrasoAtual - a.atrasoAtual);
    } else {
      filtered = [...filtered].sort((a, b) => a.numero - b.numero);
    }

    return filtered;
  }, [statsList, cyclePendingNumbers, latestDraw.dezenas, sortBy, statusFilter]);

  // Compute contest-by-contest delay evolution for the selected dezena over the last 50 draws
  const timelineData = useMemo(() => {
    // Reverse historical draws to chronological order (oldest to newest)
    const chronological = [...historical100].slice(0, 50).reverse();
    let currentGap = 0;

    return chronological.map((draw) => {
      const drawn = draw.dezenas.includes(selectedDezena);
      if (drawn) {
        currentGap = 0;
      } else {
        currentGap += 1;
      }

      return {
        concurso: draw.concurso,
        data: draw.data,
        atraso: currentGap,
        saiu: drawn ? 1 : 0,
        mediaHistorica: 1.67,
      };
    });
  }, [historical100, selectedDezena]);

  // Critical delayed numbers list for quick action
  const criticalNumbers = useMemo(() => {
    return statsList
      .filter((s) => s.atrasoAtual >= 3 || cyclePendingNumbers.includes(s.numero))
      .map((s) => s.numero)
      .sort((a, b) => a - b);
  }, [statsList, cyclePendingNumbers]);

  const handleFixCritical = () => {
    try {
      soundService.playFilterClick();
    } catch {}
    if (onFixNumbersInFechamento) {
      onFixNumbersInFechamento(criticalNumbers);
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('switch-tab', {
          detail: { tab: 'fechamento' },
        })
      );
    }
  };

  // Custom Tooltip for Comparative Chart
  const CustomComparativeTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;
    const data: DezenaDelayItem = payload[0].payload;

    return (
      <div className="bg-slate-900/95 border border-amber-500/50 rounded-xl p-3.5 shadow-2xl backdrop-blur-md text-xs min-w-[240px] space-y-2.5 z-50">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-400 to-yellow-600 text-slate-950 font-black font-mono flex items-center justify-center text-sm shadow-md">
              {data.label}
            </span>
            <div>
              <span className="font-bold text-white text-sm">Dezena {data.label}</span>
              <span className="block text-[10px] text-slate-400">Total histórico: {data.vezes} saídas</span>
            </div>
          </div>
          <span
            className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
              data.status === 'critica'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                : data.status === 'atrasada'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : data.status === 'recente'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'bg-slate-800 text-slate-300'
            }`}
          >
            {data.pendenteNoCiclo
              ? 'Pendente no Ciclo'
              : data.atrasoAtual >= 3
              ? 'Atraso Crítico'
              : data.presenteUltimoConcurso
              ? 'Saiu no Último'
              : 'Hiato Normal'}
          </span>
        </div>

        <div className="space-y-1.5 font-mono text-[11px]">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Atraso Atual:</span>
            <strong className={`text-sm ${data.atrasoAtual >= 3 ? 'text-amber-400' : 'text-white'}`}>
              {data.atrasoAtual} concurso{data.atrasoAtual === 1 ? '' : 's'}
            </strong>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Atraso Anterior (Último):</span>
            <span className="text-cyan-300">{data.atrasoUltimo} concursos</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Atraso Médio Histórico:</span>
            <span className="text-slate-200">{data.atrasoMedio} concursos</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Maior Atraso Histórico:</span>
            <span className="text-slate-400">{data.maiorAtraso} concursos</span>
          </div>
          <div className="flex items-center justify-between pt-1 border-t border-slate-800">
            <span className="text-slate-400">Razão de Pressão:</span>
            <span
              className={`font-black ${
                data.razaoPressao >= 1.5 ? 'text-amber-300' : 'text-emerald-400'
              }`}
            >
              {data.razaoPressao}x a média
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 pt-1.5 border-t border-slate-800 text-[10px]">
          {data.ePrimo && (
            <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
              Primo
            </span>
          )}
          {data.eMoldura && (
            <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
              Moldura
            </span>
          )}
          {data.eFibonacci && (
            <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
              Fibonacci
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-5 shadow-2xl space-y-6">
      {/* Header with Title and Mode Toggles */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="p-2 rounded-xl bg-gradient-to-br from-amber-400 to-yellow-600 text-slate-950 shadow-md shadow-amber-500/20">
              <Clock className="w-5 h-5 font-black" />
            </span>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white tracking-wide flex items-center gap-2">
                <span>Histórico & Tendências de Atrasos das Dezenas</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase">
                  Recharts • 25 Dezenas
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Monitoramento avançado de hiatos temporais: compare o atraso atual com o atraso médio de longo prazo e o último atraso registrado para antecipar retornos iminentes.
              </p>
            </div>
          </div>
        </div>

        {/* View Mode Switcher */}
        <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto">
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setViewMode('comparativo')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                viewMode === 'comparativo'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Visão Comparativa (25 Dezenas)</span>
            </button>
            <button
              onClick={() => setViewMode('evolucao_temporal')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                viewMode === 'evolucao_temporal'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Evolução Temporal ({selectedDezena.toString().padStart(2, '0')})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Cards Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800/80">
          <span className="text-[10px] text-slate-400 block uppercase font-bold">Média Teórica da Lotofácil</span>
          <strong className="text-lg font-mono font-black text-white">1,67 conc.</strong>
          <span className="text-[10px] text-slate-400 block mt-0.5">15 saídas a cada 25 números</span>
        </div>

        <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800/80">
          <span className="text-[10px] text-slate-400 block uppercase font-bold">Maior Atraso Atual</span>
          <div className="flex items-center gap-2 mt-0.5">
            <strong className="text-lg font-mono font-black text-amber-300">
              {Math.max(...statsList.map((s) => s.atrasoAtual))} conc.
            </strong>
            <span className="text-[11px] font-mono text-slate-400">
              (Dezena{' '}
              {statsList
                .filter((s) => s.atrasoAtual === Math.max(...statsList.map((x) => x.atrasoAtual)))
                .map((s) => s.numero.toString().padStart(2, '0'))
                .join(', ')}
              )
            </span>
          </div>
        </div>

        <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800/80">
          <span className="text-[10px] text-slate-400 block uppercase font-bold">Em Atraso Crítico (&ge;3)</span>
          <strong className="text-lg font-mono font-black text-rose-400">
            {statsList.filter((s) => s.atrasoAtual >= 3).length} dezenas
          </strong>
          <span className="text-[10px] text-rose-300/80 block mt-0.5">Alta probabilidade de retorno</span>
        </div>

        <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800/80 flex flex-col justify-between">
          <div>
            <span className="text-[10px] text-slate-400 block uppercase font-bold">Pendentes no Ciclo</span>
            <strong className="text-lg font-mono font-black text-amber-400">
              {cyclePendingNumbers.length > 0 ? cyclePendingNumbers.length : 0} dezenas
            </strong>
          </div>
          {criticalNumbers.length > 0 && (
            <button
              onClick={handleFixCritical}
              className="text-[10px] font-bold text-amber-300 hover:text-amber-200 flex items-center gap-1 transition cursor-pointer mt-1"
            >
              <span>Fixar no Fechamento</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* VIEW MODE 1: COMPARATIVE (ALL 25 DEZENAS) */}
      {viewMode === 'comparativo' && (
        <div className="space-y-4">
          {/* Sub-toolbar: Sorting & Status Filter */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-slate-400 font-medium text-[11px] flex items-center gap-1">
                <Filter className="w-3 h-3 text-amber-400" />
                Filtrar:
              </span>
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                  statusFilter === 'all'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Todas (25)
              </button>
              <button
                onClick={() => setStatusFilter('criticas')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                  statusFilter === 'criticas'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Atraso Crítico (&ge;3 ou Ciclo)
              </button>
              <button
                onClick={() => setStatusFilter('pendentes_ciclo')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                  statusFilter === 'pendentes_ciclo'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Pendentes do Ciclo ({cyclePendingNumbers.length})
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-medium text-[11px]">Ordenar por:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-slate-200 text-[11px] font-bold focus:outline-none focus:border-amber-400"
              >
                <option value="atraso_desc">Maior Atraso Atual</option>
                <option value="pressao_desc">Maior Pressão (Atraso/Média)</option>
                <option value="numero">Número (01 a 25)</option>
              </select>
            </div>
          </div>

          {/* Recharts Composed Chart Viewport */}
          <div className="bg-slate-950/90 rounded-2xl border border-slate-800 p-4 shadow-inner">
            <div className="flex items-center justify-between mb-3 text-xs">
              <div className="flex items-center gap-4 flex-wrap">
                <span className="flex items-center gap-1.5 text-amber-400 font-bold">
                  <span className="w-3 h-3 rounded bg-amber-500"></span>
                  <span>Atraso Atual (Concursos)</span>
                </span>
                <span className="flex items-center gap-1.5 text-cyan-400 font-bold">
                  <span className="w-3 h-1 bg-cyan-400 rounded"></span>
                  <span>Atraso Anterior (Último)</span>
                </span>
                <span className="flex items-center gap-1.5 text-slate-300 font-bold">
                  <span className="w-3 h-1 bg-emerald-400 rounded"></span>
                  <span>Atraso Médio Histórico</span>
                </span>
              </div>

              <span className="text-slate-500 text-[11px] font-mono hidden md:inline">
                Clique em qualquer barra para abrir a linha do tempo detalhada
              </span>
            </div>

            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={chartData}
                  margin={{ top: 20, right: 20, bottom: 20, left: -10 }}
                  onClick={(e: any) => {
                    if (e && e.activePayload && e.activePayload.length) {
                      const num = e.activePayload[0].payload.numero;
                      setSelectedDezena(num);
                      setViewMode('evolucao_temporal');
                    }
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                  <XAxis
                    dataKey="label"
                    stroke="#64748b"
                    tick={{ fill: '#cbd5e1', fontSize: 11, fontWeight: 'bold' }}
                  />
                  <YAxis
                    stroke="#64748b"
                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                    domain={[0, (dataMax: number) => Math.max(6, dataMax + 1)]}
                  />
                  <Tooltip content={<CustomComparativeTooltip />} />

                  {/* Reference Line for General Lotofacil Average */}
                  <ReferenceLine
                    y={1.67}
                    stroke="#10b981"
                    strokeDasharray="4 4"
                    strokeWidth={1.5}
                    label={{
                      value: 'Média (1.67)',
                      position: 'insideTopLeft',
                      fill: '#34d399',
                      fontSize: 10,
                      fontWeight: 'bold',
                    }}
                  />

                  {/* Reference Line for Critical Delay */}
                  <ReferenceLine
                    y={3}
                    stroke="#f43f5e"
                    strokeDasharray="3 3"
                    strokeWidth={1.5}
                    label={{
                      value: 'Atraso Crítico (&ge;3)',
                      position: 'insideBottomRight',
                      fill: '#fb7185',
                      fontSize: 10,
                    }}
                  />

                  {/* Bars: Current Delay */}
                  <Bar
                    dataKey="atrasoAtual"
                    name="Atraso Atual"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={32}
                  >
                    {chartData.map((entry) => {
                      let fillColor = '#3b82f6';
                      if (entry.pendenteNoCiclo) {
                        fillColor = '#f59e0b'; // Amber Gold
                      } else if (entry.atrasoAtual >= 3) {
                        fillColor = '#f43f5e'; // Rose Critical
                      } else if (entry.atrasoAtual > entry.atrasoMedio) {
                        fillColor = '#eab308'; // Yellow Warning
                      } else if (entry.presenteUltimoConcurso) {
                        fillColor = '#10b981'; // Emerald
                      }
                      return <Cell key={`cell-${entry.numero}`} fill={fillColor} />;
                    })}
                  </Bar>

                  {/* Line: Previous Delay */}
                  <Line
                    type="monotone"
                    dataKey="atrasoUltimo"
                    name="Atraso Anterior"
                    stroke="#06b6d4"
                    strokeWidth={2}
                    dot={{ fill: '#06b6d4', r: 3 }}
                  />

                  {/* Line: Historical Average Delay */}
                  <Line
                    type="stepAfter"
                    dataKey="atrasoMedio"
                    name="Atraso Médio"
                    stroke="#10b981"
                    strokeWidth={2}
                    strokeDasharray="3 3"
                    dot={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* VIEW MODE 2: TIME-SERIES EVOLUTION BY DEZENA */}
      {viewMode === 'evolucao_temporal' && (
        <div className="space-y-4">
          {/* Dezena Selector Strip */}
          <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-bold text-xs">Selecione a Dezena:</span>
              <div className="flex items-center gap-1 flex-wrap">
                {Array.from({ length: 25 }, (_, i) => i + 1).map((num) => {
                  const isSelected = num === selectedDezena;
                  const isPendente = cyclePendingNumbers.includes(num);
                  const isCritica = (statsList.find((s) => s.numero === num)?.atrasoAtual || 0) >= 3;

                  return (
                    <button
                      key={num}
                      onClick={() => setSelectedDezena(num)}
                      className={`w-7 h-7 rounded-lg font-mono font-bold text-xs transition cursor-pointer flex items-center justify-center relative ${
                        isSelected
                          ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/30 scale-110 z-10'
                          : isPendente
                          ? 'bg-amber-950/60 text-amber-300 border border-amber-500/60'
                          : isCritica
                          ? 'bg-rose-950/60 text-rose-300 border border-rose-500/50'
                          : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
                      }`}
                    >
                      {num.toString().padStart(2, '0')}
                      {isPendente && (
                        <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              onClick={() => setViewMode('comparativo')}
              className="text-xs text-amber-300 hover:text-white font-bold flex items-center gap-1 cursor-pointer"
            >
              <span>Voltar para Visão Comparativa</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Time Series Area Chart */}
          <div className="bg-slate-950/90 rounded-2xl border border-slate-800 p-4 shadow-inner">
            <div className="flex items-center justify-between mb-3 text-xs">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-yellow-600 text-slate-950 font-black font-mono flex items-center justify-center text-sm shadow">
                  {selectedDezena.toString().padStart(2, '0')}
                </span>
                <div>
                  <h4 className="font-bold text-white text-sm">
                    Evolução do Atraso da Dezena {selectedDezena.toString().padStart(2, '0')} (Últimos 50 Concursos)
                  </h4>
                  <span className="text-[11px] text-slate-400">
                    Picos indicam hiatos prolongados; quedas a zero indicam o concurso onde o número foi sorteado.
                  </span>
                </div>
              </div>

              <span className="text-amber-400 font-mono text-xs font-bold">
                Atraso Atual: {statsList.find((s) => s.numero === selectedDezena)?.atrasoAtual ?? 0} concurso(s)
              </span>
            </div>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timelineData} margin={{ top: 20, right: 20, bottom: 20, left: -10 }}>
                  <defs>
                    <linearGradient id="colorAtraso" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                  <XAxis
                    dataKey="concurso"
                    stroke="#64748b"
                    tick={{ fill: '#94a3b8', fontSize: 10 }}
                    tickFormatter={(val) => `#${val}`}
                  />
                  <YAxis stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 10 }} domain={[0, 'auto']} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload || !payload.length) return null;
                      const item = payload[0].payload;
                      return (
                        <div className="bg-slate-900 border border-slate-700 rounded-xl p-3 shadow-xl text-xs space-y-1">
                          <span className="font-bold text-white block">
                            Concurso #{item.concurso} ({item.data})
                          </span>
                          <span className="text-slate-300 block">
                            Status:{' '}
                            <strong className={item.saiu ? 'text-emerald-400' : 'text-slate-400'}>
                              {item.saiu ? '✓ SORTEADA' : 'Ausente'}
                            </strong>
                          </span>
                          <span className="text-amber-300 font-mono block">
                            Hiato acumulado: {item.atraso} sorteio(s)
                          </span>
                        </div>
                      );
                    }}
                  />
                  <ReferenceLine
                    y={1.67}
                    stroke="#10b981"
                    strokeDasharray="3 3"
                    label={{ value: 'Média Teórica (1.67)', fill: '#34d399', fontSize: 10 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="atraso"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorAtraso)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
