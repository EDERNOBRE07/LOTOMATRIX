import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  Cell,
} from 'recharts';
import { LotofacilDraw, DezenaStats } from '../types/lotofacil';
import { CONCURSO_ATUAL, DEZENAS_STATS, MOLDURA, MIOLO } from '../data/lotofacilData';
import { getHistoricalNDraws } from '../services/historical100Draws';
import { soundService } from '../services/soundAlert';
import {
  BarChart3,
  Flame,
  Snowflake,
  TrendingUp,
  Award,
  Zap,
  Sparkles,
  ArrowRight,
  Sliders,
  CheckCircle2,
} from 'lucide-react';

interface DashboardFrequencia50ConcursosRechartsProps {
  latestDraw?: LotofacilDraw;
  statsList?: DezenaStats[];
  cyclePendingNumbers?: number[];
  onApplyNumbers?: (numbers: number[]) => void;
}

type SortOrder = 'natural' | 'quentes_primeiro' | 'frias_primeiro';
type FilterGroup = 'todas' | 'quentes' | 'frias' | 'moldura' | 'miolo';

interface Dezena50Data {
  numero: number;
  label: string;
  frequencia: number;
  percentual: number;
  desvioMedia: number;
  atrasoAtual: number;
  isMoldura: boolean;
  isMiolo: boolean;
  status: 'quente' | 'media' | 'fria';
}

export const DashboardFrequencia50ConcursosRecharts: React.FC<
  DashboardFrequencia50ConcursosRechartsProps
> = ({
  latestDraw = CONCURSO_ATUAL,
  statsList = DEZENAS_STATS,
  cyclePendingNumbers = [17, 22],
  onApplyNumbers,
}) => {
  const [sortOrder, setSortOrder] = useState<SortOrder>('natural');
  const [filterGroup, setFilterGroup] = useState<FilterGroup>('todas');
  const [hoveredDezena, setHoveredDezena] = useState<Dezena50Data | null>(null);

  // Recupera os últimos 50 concursos reais/históricos
  const draws50 = useMemo(() => {
    return getHistoricalNDraws(50, latestDraw);
  }, [latestDraw]);

  // Calcula a frequência exata de cada dezena nos 50 concursos
  const allDezenasData = useMemo<Dezena50Data[]>(() => {
    const counts: Record<number, number> = {};
    for (let i = 1; i <= 25; i++) {
      counts[i] = 0;
    }

    draws50.forEach((d) => {
      d.dezenas.forEach((num) => {
        if (counts[num] !== undefined) {
          counts[num]++;
        }
      });
    });

    const result: Dezena50Data[] = [];

    for (let i = 1; i <= 25; i++) {
      const freq = counts[i] || 0;
      const pct = Math.round((freq / 50) * 100);
      const desvio = freq - 30; // Média teórica: 50 * (15/25) = 30
      const stat = statsList.find((s) => s.numero === i);
      const atraso = stat ? stat.atrasoAtual : 0;

      let status: 'quente' | 'media' | 'fria' = 'media';
      if (freq >= 32) status = 'quente';
      else if (freq <= 27) status = 'fria';

      result.push({
        numero: i,
        label: i.toString().padStart(2, '0'),
        frequencia: freq,
        percentual: pct,
        desvioMedia: desvio,
        atrasoAtual: atraso,
        isMoldura: MOLDURA.includes(i),
        isMiolo: MIOLO.includes(i),
        status,
      });
    }

    return result;
  }, [draws50, statsList]);

  // Ordenação e Filtragem
  const chartData = useMemo(() => {
    let list = [...allDezenasData];

    if (filterGroup === 'quentes') {
      list = list.filter((d) => d.status === 'quente');
    } else if (filterGroup === 'frias') {
      list = list.filter((d) => d.status === 'fria');
    } else if (filterGroup === 'moldura') {
      list = list.filter((d) => d.isMoldura);
    } else if (filterGroup === 'miolo') {
      list = list.filter((d) => d.isMiolo);
    }

    if (sortOrder === 'quentes_primeiro') {
      list.sort((a, b) => b.frequencia - a.frequencia || a.numero - b.numero);
    } else if (sortOrder === 'frias_primeiro') {
      list.sort((a, b) => a.frequencia - b.frequencia || a.numero - b.numero);
    } else {
      list.sort((a, b) => a.numero - b.numero);
    }

    return list;
  }, [allDezenasData, sortOrder, filterGroup]);

  // Estatísticas agregadas
  const statsSummary = useMemo(() => {
    const sortedByFreq = [...allDezenasData].sort((a, b) => b.frequencia - a.frequencia);
    const quentes = sortedByFreq.slice(0, 5);
    const frias = sortedByFreq.slice(-5).reverse();
    const maxFreq = sortedByFreq[0]?.frequencia || 0;
    const minFreq = sortedByFreq[sortedByFreq.length - 1]?.frequencia || 0;

    return {
      topQuente: sortedByFreq[0],
      topFria: sortedByFreq[sortedByFreq.length - 1],
      quentes,
      frias,
      amplitude: maxFreq - minFreq,
      top15Quentes: sortedByFreq.slice(0, 15).map((d) => d.numero).sort((a, b) => a - b),
      mix10Q5F: [
        ...sortedByFreq.slice(0, 10).map((d) => d.numero),
        ...sortedByFreq.slice(-5).map((d) => d.numero),
      ].sort((a, b) => a - b),
    };
  }, [allDezenasData]);

  const handleApplyTop15 = () => {
    if (!onApplyNumbers) return;
    onApplyNumbers(statsSummary.top15Quentes);
    soundService.playSuccess();
  };

  const handleApplyMix = () => {
    if (!onApplyNumbers) return;
    onApplyNumbers(statsSummary.mix10Q5F);
    soundService.playSuccess();
  };

  const getBarColor = (item: Dezena50Data) => {
    if (item.status === 'quente') return '#f59e0b'; // Amber Gold
    if (item.status === 'fria') return '#f43f5e'; // Rose
    return '#06b6d4'; // Cyan
  };

  return (
    <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-5 sm:p-6 shadow-2xl space-y-6">
      {/* Cabeçalho do Dashboard */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="p-2 rounded-xl bg-gradient-to-br from-amber-400 to-yellow-600 text-slate-950 shadow-md shadow-amber-500/20">
              <BarChart3 className="w-5 h-5 text-slate-950" />
            </span>
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-400">
              Janela Estatística · 50 Concursos
            </span>
            <span className="text-xs text-slate-400 font-mono">
              (Concursos #{draws50[draws50.length - 1]?.concurso} até #{latestDraw.concurso})
            </span>
          </div>
          <h3 className="text-lg sm:text-xl font-black text-white mt-1">
            Dashboard de Frequência das Dezenas (50 Concursos)
          </h3>
          <p className="text-xs sm:text-sm text-slate-300 mt-0.5">
            Mapeamento analítico com Recharts identificando as dezenas de maior tração (quentes) e as que estão abaixo da média teórica de 30 saídas (frias).
          </p>
        </div>

        {/* Ações Rápidas de Aplicação no Fechamento */}
        {onApplyNumbers && (
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <button
              type="button"
              onClick={handleApplyTop15}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs transition cursor-pointer shadow-md shadow-amber-500/25 active:scale-95"
              title="Carregar as 15 dezenas com maior número de saídas na matriz"
            >
              <Flame className="w-4 h-4 fill-current text-slate-950" />
              <span>Usar Top 15 Quentes</span>
            </button>
            <button
              type="button"
              onClick={handleApplyMix}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition cursor-pointer active:scale-95"
              title="Mix equilibrado: 10 dezenas quentes + 5 dezenas em recuperação/frias"
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>Mix (10Q + 5F)</span>
            </button>
          </div>
        )}
      </div>

      {/* KPI Cards de Resumo */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800/80">
          <span className="text-[11px] text-slate-400 block">Média Esperada:</span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <strong className="text-xl font-mono font-black text-white">30.0</strong>
            <span className="text-xs text-slate-400 font-mono">saídas (60%)</span>
          </div>
          <span className="text-[10px] text-emerald-400 mt-1 block">50 apurações × 15 ÷ 25</span>
        </div>

        <div className="bg-slate-950/80 p-3.5 rounded-xl border border-amber-500/30">
          <span className="text-[11px] text-amber-300 flex items-center gap-1">
            <Flame className="w-3 h-3 fill-current text-amber-400" />
            Mais Quente (50 Conc.):
          </span>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <strong className="text-xl font-mono font-black text-amber-400">
              Dezena {statsSummary.topQuente?.label}
            </strong>
            <span className="text-xs text-amber-300/80 font-mono">
              {statsSummary.topQuente?.frequencia}x ({statsSummary.topQuente?.percentual}%)
            </span>
          </div>
          <span className="text-[10px] text-amber-300/70 mt-1 block">
            +{statsSummary.topQuente?.desvioMedia} saídas acima da média
          </span>
        </div>

        <div className="bg-slate-950/80 p-3.5 rounded-xl border border-rose-500/30">
          <span className="text-[11px] text-rose-300 flex items-center gap-1">
            <Snowflake className="w-3 h-3 text-rose-400" />
            Mais Fria (50 Conc.):
          </span>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <strong className="text-xl font-mono font-black text-rose-400">
              Dezena {statsSummary.topFria?.label}
            </strong>
            <span className="text-xs text-rose-300/80 font-mono">
              {statsSummary.topFria?.frequencia}x ({statsSummary.topFria?.percentual}%)
            </span>
          </div>
          <span className="text-[10px] text-rose-300/70 mt-1 block">
            {statsSummary.topFria?.desvioMedia} saídas abaixo da média
          </span>
        </div>

        <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800/80">
          <span className="text-[11px] text-slate-400 block">Amplitude Térmica:</span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <strong className="text-xl font-mono font-black text-cyan-400">
              {statsSummary.amplitude}
            </strong>
            <span className="text-xs text-slate-400 font-mono">saídas de delta</span>
          </div>
          <span className="text-[10px] text-cyan-300/70 mt-1 block">
            Diferença máx. ({statsSummary.topQuente?.frequencia}) vs mín. ({statsSummary.topFria?.frequencia})
          </span>
        </div>
      </div>

      {/* Controles de Ordenação e Filtragem */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs bg-slate-950/60 p-3 rounded-xl border border-slate-800">
        {/* Grupos de Filtragem */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-slate-400 mr-1 flex items-center gap-1 font-semibold">
            <Sliders className="w-3.5 h-3.5 text-slate-500" />
            Exibir:
          </span>
          <button
            type="button"
            onClick={() => setFilterGroup('todas')}
            className={`px-2.5 py-1 rounded-lg transition cursor-pointer font-medium ${
              filterGroup === 'todas'
                ? 'bg-slate-700 text-white font-bold'
                : 'bg-slate-800/80 text-slate-300 hover:text-white'
            }`}
          >
            Todas (25)
          </button>
          <button
            type="button"
            onClick={() => setFilterGroup('quentes')}
            className={`px-2.5 py-1 rounded-lg transition cursor-pointer font-medium flex items-center gap-1 ${
              filterGroup === 'quentes'
                ? 'bg-amber-500/25 text-amber-300 border border-amber-500/50 font-bold'
                : 'bg-slate-800/80 text-slate-300 hover:text-amber-300'
            }`}
          >
            <Flame className="w-3 h-3 text-amber-400" />
            Quentes (≥32x)
          </button>
          <button
            type="button"
            onClick={() => setFilterGroup('frias')}
            className={`px-2.5 py-1 rounded-lg transition cursor-pointer font-medium flex items-center gap-1 ${
              filterGroup === 'frias'
                ? 'bg-rose-500/25 text-rose-300 border border-rose-500/50 font-bold'
                : 'bg-slate-800/80 text-slate-300 hover:text-rose-300'
            }`}
          >
            <Snowflake className="w-3 h-3 text-rose-400" />
            Frias (≤27x)
          </button>
          <button
            type="button"
            onClick={() => setFilterGroup('moldura')}
            className={`px-2.5 py-1 rounded-lg transition cursor-pointer font-medium ${
              filterGroup === 'moldura'
                ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-500/50 font-bold'
                : 'bg-slate-800/80 text-slate-300 hover:text-cyan-300'
            }`}
          >
            Moldura (16)
          </button>
          <button
            type="button"
            onClick={() => setFilterGroup('miolo')}
            className={`px-2.5 py-1 rounded-lg transition cursor-pointer font-medium ${
              filterGroup === 'miolo'
                ? 'bg-purple-500/25 text-purple-300 border border-purple-500/50 font-bold'
                : 'bg-slate-800/80 text-slate-300 hover:text-purple-300'
            }`}
          >
            Miolo (9)
          </button>
        </div>

        {/* Ordem de Exibição */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-slate-400 mr-1 font-semibold">Ordenar:</span>
          <button
            type="button"
            onClick={() => setSortOrder('natural')}
            className={`px-2.5 py-1 rounded-lg transition cursor-pointer font-medium ${
              sortOrder === 'natural'
                ? 'bg-slate-700 text-white font-bold'
                : 'bg-slate-800/80 text-slate-300 hover:text-white'
            }`}
          >
            01 a 25
          </button>
          <button
            type="button"
            onClick={() => setSortOrder('quentes_primeiro')}
            className={`px-2.5 py-1 rounded-lg transition cursor-pointer font-medium flex items-center gap-1 ${
              sortOrder === 'quentes_primeiro'
                ? 'bg-amber-500 text-slate-950 font-black'
                : 'bg-slate-800/80 text-slate-300 hover:text-white'
            }`}
          >
            <Flame className="w-3 h-3" />
            Mais Quentes
          </button>
          <button
            type="button"
            onClick={() => setSortOrder('frias_primeiro')}
            className={`px-2.5 py-1 rounded-lg transition cursor-pointer font-medium flex items-center gap-1 ${
              sortOrder === 'frias_primeiro'
                ? 'bg-rose-500 text-white font-black'
                : 'bg-slate-800/80 text-slate-300 hover:text-white'
            }`}
          >
            <Snowflake className="w-3 h-3" />
            Mais Frias
          </button>
        </div>
      </div>

      {/* Gráfico Recharts de Barras com as 25 Dezenas */}
      <div className="h-80 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 20, right: 10, left: -20, bottom: 25 }}
            onMouseMove={(state: any) => {
              if (state && state.activePayload && state.activePayload[0]) {
                setHoveredDezena(state.activePayload[0].payload);
              }
            }}
            onMouseLeave={() => setHoveredDezena(null)}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis
              dataKey="label"
              stroke="#64748b"
              tick={{ fill: '#cbd5e1', fontSize: 11, fontFamily: 'monospace' }}
              tickLine={false}
              interval={0}
            />
            <YAxis
              stroke="#64748b"
              tick={{ fill: '#94a3b8', fontSize: 10, fontFamily: 'monospace' }}
              tickLine={false}
              domain={[0, 40]}
              ticks={[0, 10, 20, 30, 40]}
            />
            <ReferenceLine
              y={30}
              stroke="#10b981"
              strokeDasharray="4 4"
              strokeWidth={1.5}
              label={{
                value: 'Média Esperada (30)',
                fill: '#10b981',
                fontSize: 10,
                position: 'top',
              }}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload || !payload.length) return null;
                const d = payload[0].payload as Dezena50Data;

                return (
                  <div className="bg-slate-900/95 border border-slate-700/80 p-3 rounded-xl shadow-2xl backdrop-blur-md text-xs space-y-1.5 min-w-[200px]">
                    <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
                      <span className="font-mono text-sm font-black text-white flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-md bg-slate-800 flex items-center justify-center text-amber-400">
                          {d.label}
                        </span>
                        <span>Dezena {d.numero}</span>
                      </span>
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                          d.status === 'quente'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : d.status === 'fria'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                            : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                        }`}
                      >
                        {d.status === 'quente' ? '🔥 Quente' : d.status === 'fria' ? '❄️ Fria' : '⚖️ Média'}
                      </span>
                    </div>

                    <div className="space-y-1 font-mono text-[11px]">
                      <div className="flex justify-between text-slate-300">
                        <span>Frequência:</span>
                        <strong className="text-white font-bold">
                          {d.frequencia} saídas ({d.percentual}%)
                        </strong>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Desvio vs Média (30):</span>
                        <strong
                          className={d.desvioMedia >= 0 ? 'text-emerald-400' : 'text-rose-400'}
                        >
                          {d.desvioMedia >= 0 ? `+${d.desvioMedia}` : d.desvioMedia} saídas
                        </strong>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Atraso Atual:</span>
                        <span className="text-slate-200">{d.atrasoAtual} concursos</span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Localização:</span>
                        <span className="text-slate-200">
                          {d.isMoldura ? 'Moldura (Externa)' : 'Miolo (Central)'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              }}
            />
            <Bar dataKey="frequencia" radius={[4, 4, 0, 0]}>
              {chartData.map((entry) => (
                <Cell
                  key={`cell-50-${entry.numero}`}
                  fill={getBarColor(entry)}
                  fillOpacity={hoveredDezena && hoveredDezena.numero !== entry.numero ? 0.45 : 0.9}
                  stroke={hoveredDezena?.numero === entry.numero ? '#ffffff' : 'none'}
                  strokeWidth={hoveredDezena?.numero === entry.numero ? 2 : 0}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Legenda de Cores e Guia de Leitura */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800 text-xs">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-amber-500 shadow-sm" />
            <span className="text-slate-300">
              Super Quentes: <strong className="text-amber-300">≥ 32 saídas (≥64%)</strong>
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-cyan-500 shadow-sm" />
            <span className="text-slate-300">
              Equilibradas: <strong className="text-cyan-300">28 a 31 saídas (56%–62%)</strong>
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-rose-500 shadow-sm" />
            <span className="text-slate-300">
              Frias: <strong className="text-rose-300">≤ 27 saídas (≤54%)</strong>
            </span>
          </div>
        </div>

        <div className="text-slate-400 text-[11px] font-mono">
          Total de Amostras: 50 Concursos Oficiais Caixa
        </div>
      </div>
    </div>
  );
};
