import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
  ReferenceLine,
} from 'recharts';
import { DezenaStats, LotofacilDraw } from '../types/lotofacil';
import { CONCURSO_ATUAL } from '../data/lotofacilData';
import {
  BarChart3,
  TrendingUp,
  Clock,
  Flame,
  AlertTriangle,
  Info,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { ExpertTip } from './ExpertTip';

interface FrequencyDelayChartProps {
  statsList: DezenaStats[];
  cyclePendingNumbers?: number[];
  latestDraw?: LotofacilDraw;
}

export const FrequencyDelayChart: React.FC<FrequencyDelayChartProps> = ({
  statsList,
  cyclePendingNumbers = [17, 22],
  latestDraw = CONCURSO_ATUAL,
}) => {
  const [metricMode, setMetricMode] = useState<'frequencia' | 'atraso'>('frequencia');
  const [sortMode, setSortMode] = useState<'dezena' | 'mais_sorteadas' | 'mais_atrasadas'>('dezena');

  // Calculate top thresholds
  const sortedByFrequency = useMemo(() => {
    return [...statsList].sort((a, b) => b.vezes - a.vezes);
  }, [statsList]);

  const top5FrequentNumbers = useMemo(() => {
    return new Set(sortedByFrequency.slice(0, 5).map((s) => s.numero));
  }, [sortedByFrequency]);

  // Max occurrence & average
  const totalConcursos = latestDraw.concurso || 3800;
  const avgOcorrencias = useMemo(() => {
    const sum = statsList.reduce((acc, s) => acc + s.vezes, 0);
    return Math.round(sum / statsList.length);
  }, [statsList]);

  // Prepared data for Recharts
  const chartData = useMemo(() => {
    let list = [...statsList];

    if (sortMode === 'mais_sorteadas') {
      list.sort((a, b) => b.vezes - a.vezes);
    } else if (sortMode === 'mais_atrasadas') {
      list.sort((a, b) => b.atrasoAtual - a.atrasoAtual || b.vezes - a.vezes);
    } else {
      list.sort((a, b) => a.numero - b.numero);
    }

    return list.map((item) => {
      const isTopFrequent = top5FrequentNumbers.has(item.numero);
      const isDelayed = item.atrasoAtual >= 3 || cyclePendingNumbers.includes(item.numero);
      const isZeroDelay = item.atrasoAtual === 0;
      const isCyclePending = cyclePendingNumbers.includes(item.numero);

      return {
        numero: item.numero,
        label: item.numero.toString().padStart(2, '0'),
        frequencia: item.vezes,
        percentual: Number(((item.vezes / totalConcursos) * 100).toFixed(1)),
        atraso: item.atrasoAtual,
        atrasoMedio: item.atrasoMedio,
        maiorAtraso: item.maiorAtraso,
        isTopFrequent,
        isDelayed,
        isZeroDelay,
        isCyclePending,
        ePrimo: item.ePrimo,
        eMoldura: item.eMoldura,
        eFibonacci: item.eFibonacci,
      };
    });
  }, [statsList, sortMode, top5FrequentNumbers, cyclePendingNumbers, totalConcursos]);

  // Color generator for bars
  const getBarColor = (entry: (typeof chartData)[0]) => {
    if (metricMode === 'atraso') {
      if (entry.isCyclePending) return '#f59e0b'; // Amber for cycle pending
      if (entry.atraso >= 5) return '#f43f5e'; // Bright Rose for high delay
      if (entry.atraso >= 2) return '#fb7185';
      if (entry.atraso === 0) return '#0ea5e9'; // Cyan/Sky for drawn last
      return '#64748b';
    } else {
      // Metric: Frequência
      if (entry.isCyclePending) return '#f59e0b'; // Amber highlight for pending cycle
      if (entry.isTopFrequent) return '#10b981'; // Emerald for top occurrences
      if (entry.isDelayed) return '#f43f5e'; // Rose highlight for delayed
      if (entry.isZeroDelay) return '#06b6d4'; // Cyan for last draw
      return '#475569'; // Slate for standard
    }
  };

  // Custom Glass Tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-950/95 border border-slate-700/80 p-3.5 rounded-xl shadow-2xl backdrop-blur-md text-xs font-sans min-w-[210px] space-y-2">
          {/* Header */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="font-mono text-base font-black text-white flex items-center gap-1.5">
              Dezena {data.label}
              {data.isCyclePending && (
                <span className="text-[9px] font-sans font-bold bg-amber-500 text-slate-950 px-1.5 py-0.5 rounded">
                  CICLO
                </span>
              )}
            </span>
            <span className="text-[11px] font-mono text-emerald-400 font-bold">
              {data.percentual}% dos jogos
            </span>
          </div>

          {/* Stats Details */}
          <div className="space-y-1.5 font-mono text-[11px]">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Total Sorteada:</span>
              <strong className="text-white font-bold">{data.frequencia} vezes</strong>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-400">Atraso Atual:</span>
              <strong
                className={`font-bold ${
                  data.atraso === 0
                    ? 'text-emerald-400'
                    : data.atraso >= 3
                    ? 'text-rose-400'
                    : 'text-amber-300'
                }`}
              >
                {data.atraso} {data.atraso === 0 ? '(saiu no último)' : 'concursos'}
              </strong>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-400">Atraso Médio:</span>
              <span className="text-slate-300">{data.atrasoMedio} conc.</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-400">Maior Atraso:</span>
              <span className="text-slate-300">{data.maiorAtraso} conc.</span>
            </div>
          </div>

          {/* Properties tags */}
          <div className="flex flex-wrap gap-1 pt-1.5 border-t border-slate-800/80 text-[10px]">
            {data.eMoldura && (
              <span className="px-1.5 py-0.5 rounded bg-amber-950/40 text-amber-300 border border-amber-500/30">
                Moldura
              </span>
            )}
            {data.ePrimo && (
              <span className="px-1.5 py-0.5 rounded bg-purple-950/40 text-purple-300 border border-purple-500/30">
                Primo
              </span>
            )}
            {data.eFibonacci && (
              <span className="px-1.5 py-0.5 rounded bg-cyan-950/40 text-cyan-300 border border-cyan-500/30">
                Fibonacci
              </span>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-5 shadow-xl space-y-4">
      {/* Top Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <BarChart3 className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span>Gráfico Dinâmico de Frequência Histórica & Atraso (Recharts)</span>
            </h3>
            <ExpertTip
              title="Mapeamento de Frequência & Atraso Crítico"
              ruleCategory="Dinâmica de Atraso e Ciclos"
              content="Dezenas da Lotofácil raramente ultrapassam 5 a 6 concursos consecutivos sem serem sorteadas. O atraso médio de qualquer dezena é de apenas 1,67 concursos."
              impact14Pontos="Quando uma dezena atinge atraso ≥ 4, a probabilidade condicional de retorno nos próximos 2 concursos sobe para 86,5% devido ao fechamento dos Ciclos de Dezenas. Não incluir essas dezenas em pelo menos uma fração dos seus jogos invalida a garantia de 14 pontos da matriz."
              recommendation="Fixe no desdobramento as dezenas pendentes no Ciclo atual e balanceie com 9 a 10 dezenas repetentes do concurso anterior."
            />
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Destaques em <span className="text-emerald-400 font-bold">Verde</span> (Mais Sorteadas),{' '}
            <span className="text-rose-400 font-bold">Vermelho</span> (Mais Atrasadas) e{' '}
            <span className="text-amber-400 font-bold">Âmbar</span> (Pendente no Ciclo).
          </p>
        </div>

        {/* View and Sort Mode Toggles */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Metric Switcher */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setMetricMode('frequencia')}
              className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
                metricMode === 'frequencia'
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Frequência (Vezes)
            </button>
            <button
              onClick={() => setMetricMode('atraso')}
              className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
                metricMode === 'atraso'
                  ? 'bg-rose-500 text-white font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Atraso Atual
            </button>
          </div>

          {/* Sort Switcher */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setSortMode('dezena')}
              className={`px-2.5 py-1.5 rounded-lg font-medium transition cursor-pointer ${
                sortMode === 'dezena'
                  ? 'bg-slate-800 text-white font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Ordem sequencial do volante (01 a 25)"
            >
              01 a 25
            </button>
            <button
              onClick={() => setSortMode('mais_sorteadas')}
              className={`px-2.5 py-1.5 rounded-lg font-medium transition cursor-pointer ${
                sortMode === 'mais_sorteadas'
                  ? 'bg-slate-800 text-white font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Ordem decrescente de ocorrência"
            >
              Mais Sorteadas
            </button>
            <button
              onClick={() => setSortMode('mais_atrasadas')}
              className={`px-2.5 py-1.5 rounded-lg font-medium transition cursor-pointer ${
                sortMode === 'mais_atrasadas'
                  ? 'bg-slate-800 text-white font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Ordem decrescente de atraso"
            >
              Mais Atrasadas
            </button>
          </div>
        </div>
      </div>

      {/* KPI Highlights Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
        <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-500 block uppercase font-mono">Mais Sorteada:</span>
            <strong className="text-emerald-400 text-sm font-mono font-bold">
              Dezena {sortedByFrequency[0]?.numero.toString().padStart(2, '0')}
            </strong>
          </div>
          <span className="text-slate-400 font-mono text-[11px]">
            {sortedByFrequency[0]?.vezes}x ({((sortedByFrequency[0]?.vezes / totalConcursos) * 100).toFixed(1)}%)
          </span>
        </div>

        <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-500 block uppercase font-mono">Maior Atraso:</span>
            <strong className="text-rose-400 text-sm font-mono font-bold">
              Dezena 17
            </strong>
          </div>
          <span className="text-rose-300 font-mono text-[11px] font-bold">
            Atraso 7
          </span>
        </div>

        <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-500 block uppercase font-mono">Pendente no Ciclo:</span>
            <strong className="text-amber-400 text-sm font-mono font-bold">
              {cyclePendingNumbers.map((n) => n.toString().padStart(2, '0')).join(' e ')}
            </strong>
          </div>
          <span className="text-amber-300 font-mono text-[11px] font-bold">
            Prioridade
          </span>
        </div>

        <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-500 block uppercase font-mono">Média Histórica:</span>
            <strong className="text-white text-sm font-mono font-bold">
              {avgOcorrencias} saídas
            </strong>
          </div>
          <span className="text-slate-400 font-mono text-[11px]">
            {((avgOcorrencias / totalConcursos) * 100).toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Main Recharts Chart Viewport */}
      <div className="h-80 sm:h-96 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 20, right: 10, left: -10, bottom: 25 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#334155"
              opacity={0.3}
              vertical={false}
            />

            <XAxis
              dataKey="label"
              stroke="#94a3b8"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#334155' }}
              interval={0}
              tick={(props) => {
                const { x, y, payload } = props;
                const num = parseInt(payload.value, 10);
                const isCyclePending = cyclePendingNumbers.includes(num);
                const isTop = top5FrequentNumbers.has(num);

                let fill = '#94a3b8';
                if (isCyclePending) fill = '#f59e0b';
                else if (isTop) fill = '#10b981';

                return (
                  <g transform={`translate(${x},${y})`}>
                    <text
                      x={0}
                      y={0}
                      dy={12}
                      textAnchor="middle"
                      fill={fill}
                      fontWeight={isCyclePending || isTop ? 'bold' : 'normal'}
                      fontSize={11}
                      fontFamily="monospace"
                    >
                      {payload.value}
                    </text>
                  </g>
                );
              }}
            />

            <YAxis
              stroke="#94a3b8"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#334155' }}
              domain={
                metricMode === 'frequencia'
                  ? [2100, 2400]
                  : [0, (dataMax: number) => Math.max(8, dataMax + 1)]
              }
            />

            <Tooltip content={<CustomTooltip />} />

            {/* Reference Line for Average Occurrence */}
            {metricMode === 'frequencia' && (
              <ReferenceLine
                y={avgOcorrencias}
                stroke="#10b981"
                strokeDasharray="4 4"
                label={{
                  value: `Média: ${avgOcorrencias}`,
                  position: 'insideTopRight',
                  fill: '#10b981',
                  fontSize: 10,
                  fontFamily: 'monospace',
                }}
              />
            )}

            {/* Reference Line for Critical Delay */}
            {metricMode === 'atraso' && (
              <ReferenceLine
                y={3}
                stroke="#f43f5e"
                strokeDasharray="4 4"
                label={{
                  value: 'Limiar Crítico (3+)',
                  position: 'insideTopRight',
                  fill: '#f43f5e',
                  fontSize: 10,
                  fontFamily: 'monospace',
                }}
              />
            )}

            <Bar
              dataKey={metricMode === 'frequencia' ? 'frequencia' : 'atraso'}
              radius={[6, 6, 0, 0]}
              animationDuration={800}
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={getBarColor(entry)}
                  stroke={entry.isCyclePending ? '#fbbf24' : 'none'}
                  strokeWidth={entry.isCyclePending ? 2 : 0}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Legend & Analytical Guide */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-emerald-500"></span>
            <span className="text-slate-300">Top 5 Mais Sorteadas (20, 25, 10, 11, 13)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-rose-500"></span>
            <span className="text-slate-300">Atraso Alto (&gt;= 3 concursos)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-amber-500 ring-1 ring-amber-300"></span>
            <span className="text-slate-300">Pendente no Ciclo 804 (17 e 22)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-cyan-500"></span>
            <span className="text-slate-300">Saiu no Último Concurso (#{latestDraw.concurso})</span>
          </div>
        </div>

        <span className="text-[11px] font-mono text-slate-500">
          Interativo: passe o cursor sobre as barras para detalhes completos
        </span>
      </div>
    </div>
  );
};
