import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ReferenceLine,
  Cell,
} from 'recharts';
import { LotofacilDraw, DezenaStats } from '../types/lotofacil';
import { CONCURSO_ATUAL, DEZENAS_STATS } from '../data/lotofacilData';
import { getHistoricalNDraws } from '../services/historical100Draws';
import { soundService } from '../services/soundAlert';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Flame,
  Snowflake,
  Sliders,
  CheckCircle2,
  Sparkles,
  Info,
  Layers,
  Zap,
} from 'lucide-react';

interface ComparadorFrequenciaPeriodosRechartsProps {
  latestDraw?: LotofacilDraw;
  statsList?: DezenaStats[];
  onApplyNumbers?: (numbers: number[]) => void;
  onNavigateToFechamento?: () => void;
}

type PeriodoRecente = 50 | 100;
type PeriodoHistorico = 200 | 300 | 500;

interface ComparacaoDezenaItem {
  numero: number;
  label: string;
  // Ocorrências absolutas
  countA: number;
  countB: number;
  // Percentuais de saída (0 a 100%)
  pctA: number;
  pctB: number;
  // Variação percentual (A - B)
  deltaPct: number;
  // Stacked chart helpers: base comum + delta positivo
  baseComum: number;
  deltaPositivo: number;
  deltaNegativo: number;
  tendencia: 'aceleracao' | 'estavel' | 'resfriamento';
}

export const ComparadorFrequenciaPeriodosRecharts: React.FC<
  ComparadorFrequenciaPeriodosRechartsProps
> = ({
  latestDraw = CONCURSO_ATUAL,
  statsList = DEZENAS_STATS,
  onApplyNumbers,
  onNavigateToFechamento,
}) => {
  const [periodoA, setPeriodoA] = useState<PeriodoRecente>(100);
  const [periodoB, setPeriodoB] = useState<PeriodoHistorico>(500);
  const [filtroTendencia, setFiltroTendencia] = useState<'todas' | 'aceleracao' | 'resfriamento'>('todas');
  const [selectedDezena, setSelectedDezena] = useState<number | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Load draws for period A and period B
  const comparisonData = useMemo(() => {
    const drawsB = getHistoricalNDraws(periodoB, latestDraw);
    const drawsA = drawsB.slice(0, periodoA);

    // Count appearances
    const countMapA: Record<number, number> = {};
    const countMapB: Record<number, number> = {};

    for (let i = 1; i <= 25; i++) {
      countMapA[i] = 0;
      countMapB[i] = 0;
    }

    drawsA.forEach((d) => {
      d.dezenas.forEach((num) => {
        if (countMapA[num] !== undefined) countMapA[num]++;
      });
    });

    drawsB.forEach((d) => {
      d.dezenas.forEach((num) => {
        if (countMapB[num] !== undefined) countMapB[num]++;
      });
    });

    const items: ComparacaoDezenaItem[] = [];

    for (let i = 1; i <= 25; i++) {
      const cA = countMapA[i];
      const cB = countMapB[i];
      const pctA = Math.round((cA / periodoA) * 1000) / 10; // ex: 65.0%
      const pctB = Math.round((cB / periodoB) * 1000) / 10; // ex: 59.8%
      const delta = Math.round((pctA - pctB) * 10) / 10; // ex: +5.2%

      let tendencia: 'aceleracao' | 'estavel' | 'resfriamento' = 'estavel';
      if (delta >= 2.5) {
        tendencia = 'aceleracao';
      } else if (delta <= -2.5) {
        tendencia = 'resfriamento';
      }

      // Stacked bar values
      // baseComum = min(pctA, pctB)
      // deltaPositivo = pctA > pctB ? pctA - pctB : 0
      // deltaNegativo = pctB > pctA ? pctB - pctA : 0
      const baseComum = Math.min(pctA, pctB);
      const deltaPositivo = pctA > pctB ? Math.round((pctA - pctB) * 10) / 10 : 0;
      const deltaNegativo = pctB > pctA ? Math.round((pctB - pctA) * 10) / 10 : 0;

      items.push({
        numero: i,
        label: i.toString().padStart(2, '0'),
        countA: cA,
        countB: cB,
        pctA,
        pctB,
        deltaPct: delta,
        baseComum,
        deltaPositivo,
        deltaNegativo,
        tendencia,
      });
    }

    return items;
  }, [periodoA, periodoB, latestDraw]);

  // Filtered view
  const displayData = useMemo(() => {
    if (filtroTendencia === 'aceleracao') {
      return comparisonData.filter((d) => d.tendencia === 'aceleracao');
    }
    if (filtroTendencia === 'resfriamento') {
      return comparisonData.filter((d) => d.tendencia === 'resfriamento');
    }
    return comparisonData;
  }, [comparisonData, filtroTendencia]);

  // Top Accelerating and Cooling numbers
  const topAcelerando = useMemo(() => {
    return [...comparisonData].sort((a, b) => b.deltaPct - a.deltaPct).slice(0, 5);
  }, [comparisonData]);

  const topResfriando = useMemo(() => {
    return [...comparisonData].sort((a, b) => a.deltaPct - b.deltaPct).slice(0, 5);
  }, [comparisonData]);

  const handleApplyTopAcelerando = () => {
    const nums = topAcelerando.map((d) => d.numero);
    soundService.playSuccess();
    if (onApplyNumbers) onApplyNumbers(nums);
    setActionNotice(`Top 5 Dezenas em Aceleração [${nums.map((n) => n.toString().padStart(2, '0')).join(', ')}] enviadas ao Fechamento!`);
    setTimeout(() => setActionNotice(null), 4000);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/40 text-emerald-400">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-black text-white tracking-wide">
                  Comparador de Tendências: Últimos {periodoA} vs Últimos {periodoB} Concursos
                </h3>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono">
                  BARRAS EMPILHADAS RECHARTS
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Identifica mudanças estruturais de tendência contrastando a frequência recente contra a média de longo prazo da Caixa.
              </p>
            </div>
          </div>
        </div>

        {/* Interval Selectors */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Período A */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <span className="text-[10px] font-bold text-slate-400 px-2 flex items-center gap-1">
              <Sliders className="w-3 h-3 text-emerald-400" />
              Recente:
            </span>
            {([50, 100] as const).map((p) => (
              <button
                key={p}
                onClick={() => {
                  setPeriodoA(p);
                  soundService.playTick();
                }}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
                  periodoA === p
                    ? 'bg-emerald-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {p} Conc.
              </button>
            ))}
          </div>

          <span className="text-xs font-black text-slate-600 font-mono hidden sm:inline">VS</span>

          {/* Período B */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <span className="text-[10px] font-bold text-slate-400 px-2 flex items-center gap-1">
              <Sliders className="w-3 h-3 text-amber-400" />
              Histórico:
            </span>
            {([200, 300, 500] as const).map((p) => (
              <button
                key={p}
                onClick={() => {
                  setPeriodoB(p);
                  soundService.playTick();
                }}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
                  periodoB === p
                    ? 'bg-amber-400 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {p} Conc.
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* KPI Cards: Acelerando vs Resfriando */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Top Aceleração */}
        <div className="bg-slate-950/80 border border-emerald-500/30 rounded-xl p-3.5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-emerald-400 flex items-center gap-1.5 uppercase">
              <Flame className="w-4 h-4 fill-current text-emerald-400" />
              Em Alta Aceleração (+Recente)
            </span>
            <span className="text-[10px] font-mono font-bold text-emerald-300 bg-emerald-500/20 px-1.5 py-0.5 rounded">
              {topAcelerando.filter((d) => d.deltaPct > 0).length} dezenas
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {topAcelerando.map((d) => (
              <span
                key={d.numero}
                className="px-2 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-mono font-bold flex items-center gap-1"
                title={`Dezena ${d.label}: ${d.pctA}% nos últimos ${periodoA} vs ${d.pctB}% nos últimos ${periodoB} (Variação: +${d.deltaPct}%)`}
              >
                <strong>{d.label}</strong>
                <span className="text-[10px] text-emerald-400 font-semibold">+{d.deltaPct}%</span>
              </span>
            ))}
          </div>
          <button
            onClick={handleApplyTopAcelerando}
            className="w-full mt-2 text-[10px] font-bold py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition cursor-pointer flex items-center justify-center gap-1 shadow-md shadow-emerald-500/20"
          >
            <Zap className="w-3 h-3" />
            Aplicar Top 5 Aceleradas no Fechamento
          </button>
        </div>

        {/* Top Resfriamento */}
        <div className="bg-slate-950/80 border border-rose-500/30 rounded-xl p-3.5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-rose-400 flex items-center gap-1.5 uppercase">
              <Snowflake className="w-4 h-4 text-rose-400" />
              Em Resfriamento (Perderam Força)
            </span>
            <span className="text-[10px] font-mono font-bold text-rose-300 bg-rose-500/20 px-1.5 py-0.5 rounded">
              {topResfriando.filter((d) => d.deltaPct < 0).length} dezenas
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {topResfriando.map((d) => (
              <span
                key={d.numero}
                className="px-2 py-1 rounded-lg bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs font-mono font-bold flex items-center gap-1"
                title={`Dezena ${d.label}: ${d.pctA}% nos últimos ${periodoA} vs ${d.pctB}% nos últimos ${periodoB} (Variação: ${d.deltaPct}%)`}
              >
                <strong>{d.label}</strong>
                <span className="text-[10px] text-rose-400 font-semibold">{d.deltaPct}%</span>
              </span>
            ))}
          </div>
          <p className="text-[10px] text-slate-500 mt-1 leading-tight">
            Dezenas que tiveram queda expressiva de frequência no período recente comparado à média histórica de {periodoB} sorteios.
          </p>
        </div>

        {/* Diagnóstico Matemático */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Média Esperada Teórica</span>
            <div className="text-2xl font-black text-amber-400 font-mono mt-1">60.0%</div>
            <p className="text-[11px] text-slate-400 mt-1">
              Como cada sorteio seleciona 15 de 25 dezenas (15/25), a probabilidade matemática basal de cada dezena é <strong>60.0%</strong>.
            </p>
          </div>
          <div className="text-[10px] text-slate-500 pt-2 border-t border-slate-800 font-mono">
            Concurso Base: #{latestDraw.concurso} ({latestDraw.data})
          </div>
        </div>
      </div>

      {/* Action Notification */}
      {actionNotice && (
        <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{actionNotice}</span>
          </div>
          {onNavigateToFechamento && (
            <button
              onClick={onNavigateToFechamento}
              className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg text-[10px] font-black transition cursor-pointer flex items-center gap-1"
            >
              Ir para Fechamento <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </div>
      )}

      {/* Recharts Stacked Bar Chart */}
      <div className="bg-slate-950 rounded-xl border border-slate-800/80 p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="text-xs font-bold text-slate-300 flex items-center gap-2">
            <span>Frequência Comparada por Dezena (% de Concursos Sorteados)</span>
            <span className="text-[10px] font-mono text-slate-500">(Dezena 01 a 25)</span>
          </div>

          {/* Filter pills */}
          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800 text-[11px]">
            <button
              onClick={() => setFiltroTendencia('todas')}
              className={`px-2 py-0.5 rounded font-medium transition cursor-pointer ${
                filtroTendencia === 'todas' ? 'bg-slate-800 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Todas (25)
            </button>
            <button
              onClick={() => setFiltroTendencia('aceleracao')}
              className={`px-2 py-0.5 rounded font-medium transition cursor-pointer ${
                filtroTendencia === 'aceleracao' ? 'bg-emerald-500/30 text-emerald-300 font-bold' : 'text-slate-400 hover:text-emerald-300'
              }`}
            >
              Em Alta
            </button>
            <button
              onClick={() => setFiltroTendencia('resfriamento')}
              className={`px-2 py-0.5 rounded font-medium transition cursor-pointer ${
                filtroTendencia === 'resfriamento' ? 'bg-rose-500/30 text-rose-300 font-bold' : 'text-slate-400 hover:text-rose-300'
              }`}
            >
              Em Baixa
            </button>
          </div>
        </div>

        <div className="w-full h-[320px] sm:h-[360px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={displayData}
              margin={{ top: 20, right: 25, left: -10, bottom: 10 }}
              onClick={(e: any) => {
                if (e && e.activePayload && e.activePayload.length > 0) {
                  setSelectedDezena(e.activePayload[0].payload.numero);
                  soundService.playTick();
                }
              }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis dataKey="label" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <YAxis
                stroke="#64748b"
                domain={[30, 85]}
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                tickFormatter={(val) => `${val}%`}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload as ComparacaoDezenaItem;
                    return (
                      <div className="bg-slate-900 border border-slate-700 p-3 rounded-xl shadow-xl text-xs space-y-1.5 font-mono">
                        <div className="font-bold text-white flex items-center justify-between gap-3 border-b border-slate-800 pb-1">
                          <span className="text-amber-400">Dezena {data.label}</span>
                          <span className={`px-1.5 py-0.2 rounded text-[10px] uppercase ${
                            data.tendencia === 'aceleracao'
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : data.tendencia === 'resfriamento'
                              ? 'bg-rose-500/20 text-rose-300'
                              : 'bg-slate-800 text-slate-300'
                          }`}>
                            {data.tendencia}
                          </span>
                        </div>
                        <div className="text-emerald-400 flex justify-between gap-4">
                          <span>Últimos {periodoA} Conc.:</span>
                          <strong>{data.pctA}% ({data.countA} vezes)</strong>
                        </div>
                        <div className="text-amber-400 flex justify-between gap-4">
                          <span>Últimos {periodoB} Conc.:</span>
                          <strong>{data.pctB}% ({data.countB} vezes)</strong>
                        </div>
                        <div className="text-slate-300 flex justify-between gap-4 border-t border-slate-800 pt-1">
                          <span>Variação de Tendência:</span>
                          <strong className={data.deltaPct >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                            {data.deltaPct >= 0 ? `+${data.deltaPct}%` : `${data.deltaPct}%`}
                          </strong>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend
                verticalAlign="top"
                align="right"
                wrapperStyle={{ paddingBottom: 10, fontSize: 11 }}
              />

              {/* Linha Teórica de Referência (60%) */}
              <ReferenceLine
                y={60}
                stroke="#64748b"
                strokeDasharray="4 4"
                label={{ value: 'Média 60%', fill: '#64748b', fontSize: 10, position: 'right' }}
              />

              {/* Barras Empilhadas: Base Consolidada + Variação de Aceleração Recente */}
              <Bar
                dataKey="baseComum"
                name={`Base Compartilhada (% Mínima)`}
                stackId="stack"
                fill="#334155"
                radius={[0, 0, 0, 0]}
              />
              <Bar
                dataKey="deltaPositivo"
                name={`Aceleração Recente (${periodoA} > ${periodoB})`}
                stackId="stack"
                fill="#10b981"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="deltaNegativo"
                name={`Excedente Histórico (${periodoB} > ${periodoA})`}
                stackId="stack"
                fill="#f59e0b"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Legend Explanations */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/80 text-[11px] text-slate-400">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-emerald-500 inline-block"></span>
              <span className="text-slate-300 font-medium">Verde: Ganho de Frequência no Curto Prazo (Aceleração)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-amber-500 inline-block"></span>
              <span className="text-slate-300 font-medium">Âmbar: Frequência Superior no Longo Prazo</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-slate-700 inline-block"></span>
              <span className="text-slate-400">Cinza: Base de Saída Comum</span>
            </div>
          </div>
          <span className="text-slate-500 font-mono">Clique em qualquer barra para selecionar</span>
        </div>
      </div>

      {/* Selected Dezena Quick Detail */}
      {selectedDezena && (
        <div className="p-4 rounded-xl bg-slate-950 border border-emerald-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center justify-center font-mono font-black text-lg">
              {selectedDezena.toString().padStart(2, '0')}
            </div>
            <div>
              <div className="text-xs font-bold text-white">
                Dezena {selectedDezena.toString().padStart(2, '0')} Selecionada
              </div>
              <p className="text-[11px] text-slate-400">
                {comparisonData.find((d) => d.numero === selectedDezena)?.tendencia === 'aceleracao'
                  ? 'Esta dezena está em ciclo ascendente de frequência no curto prazo.'
                  : comparisonData.find((d) => d.numero === selectedDezena)?.tendencia === 'resfriamento'
                  ? 'Esta dezena apresenta menor taxa de saída no período recente em relação ao histórico.'
                  : 'Esta dezena mantém comportamento estável e alinhado entre os dois períodos.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedDezena(null)}
              className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs hover:text-white"
            >
              Fechar
            </button>
            <button
              onClick={() => {
                if (onApplyNumbers) onApplyNumbers([selectedDezena]);
                soundService.playSuccess();
                setActionNotice(`Dezena ${selectedDezena.toString().padStart(2, '0')} enviada ao Fechamento!`);
              }}
              className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1 shadow-md shadow-emerald-500/20"
            >
              <Zap className="w-3.5 h-3.5" />
              Fixar no Fechamento
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
