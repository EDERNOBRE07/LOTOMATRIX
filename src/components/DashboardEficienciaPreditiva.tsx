import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Cell,
} from 'recharts';
import {
  Target,
  TrendingUp,
  TrendingDown,
  Award,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Brain,
} from 'lucide-react';
import { LotofacilDraw, DezenaStats, AIPredictionResponse } from '../types/lotofacil';
import { CONCURSO_ATUAL, DEZENAS_STATS, PRIMOS, MOLDURA, FIBONACCI } from '../data/lotofacilData';
import { buildOptimal18Pool, countMatches } from '../services/combinatorics';
import { getHistorical100Draws } from '../services/historical100Draws';

interface DashboardEficienciaPreditivaProps {
  latestDraw?: LotofacilDraw;
  statsList?: DezenaStats[];
  aiPrediction?: AIPredictionResponse | null;
  onApplyNumbers?: (numbers: number[]) => void;
}

type EvaluationMode = 'pool18' | 'top15';

interface DrawCrossPoint {
  concurso: number;
  label: string;
  data: string;
  predicted18: number[];
  predicted15: number[];
  realDezenas: number[];
  hits18: number;
  hits15: number;
  rate18: number;
  rate15: number;
  activeHits: number;
  activeRate: number;
  movingAvgRate: number;
  deltaVsBaseline: number;
  statusLabel: 'Alta Eficiência' | 'Na Média' | 'Abaixo do Alvo';
  isPremiadoTop15: boolean;
}

function buildRollingStatsForWindow(
  windowDraws: LotofacilDraw[],
  fallbackStats: DezenaStats[]
): DezenaStats[] {
  if (!windowDraws || windowDraws.length === 0) return fallbackStats;

  const freqMap = new Map<number, number>();
  const lastSeenMap = new Map<number, number>();

  for (let n = 1; n <= 25; n++) {
    freqMap.set(n, 0);
    lastSeenMap.set(n, windowDraws.length);
  }

  windowDraws.forEach((d, idx) => {
    d.dezenas.forEach((num) => {
      freqMap.set(num, (freqMap.get(num) || 0) + 1);
      if (lastSeenMap.get(num) === windowDraws.length) {
        lastSeenMap.set(num, idx);
      }
    });
  });

  const totalDraws = windowDraws.length;

  return Array.from({ length: 25 }, (_, i) => {
    const numero = i + 1;
    const base = fallbackStats.find((s) => s.numero === numero);
    const vezes = freqMap.get(numero) || 0;
    const atrasoAtual = lastSeenMap.get(numero) || 0;
    const freqRel = Math.round((vezes / Math.max(1, totalDraws)) * 100);

    const atrasoMedio = base?.atrasoMedio || 1.6;
    const status: DezenaStats['status'] =
      atrasoAtual >= 2 ? 'atrasada' : freqRel >= 64 ? 'frequente' : 'neutra';

    return {
      numero,
      vezes: (base?.vezes || 2000) + vezes,
      atrasoAtual,
      atrasoUltimo: base?.atrasoUltimo ?? atrasoAtual,
      maiorAtraso: Math.max(base?.maiorAtraso || 5, atrasoAtual),
      atrasoMedio,
      atrasoAcimaDaMedia: atrasoAtual > atrasoMedio,
      status,
      ePrimo: base?.ePrimo ?? PRIMOS.includes(numero),
      eMoldura: base?.eMoldura ?? MOLDURA.includes(numero),
      eFibonacci: base?.eFibonacci ?? FIBONACCI.includes(numero),
      presenteUltimoConcurso: atrasoAtual === 0,
      pendenteNoCiclo: atrasoAtual > 0,
    };
  });
}

export const DashboardEficienciaPreditiva: React.FC<DashboardEficienciaPreditivaProps> = ({
  latestDraw = CONCURSO_ATUAL,
  statsList = DEZENAS_STATS,
  aiPrediction,
  onApplyNumbers,
}) => {
  const [mode, setMode] = useState<EvaluationMode>('pool18');
  const [isTableExpanded, setIsTableExpanded] = useState<boolean>(true);

  const baselinePercent = mode === 'pool18' ? 72.0 : 60.0; // Esperado aleatório: 18/25 = 72%, 15/25 = 60%
  const targetHits = mode === 'pool18' ? 12 : 11;

  // Walk-forward backtest sobre os últimos 10 concursos reais:
  // Para cada concurso k (dos últimos 10), gera a recomendação da IA usando exclusivamente
  // os dados anteriores a k (k-1 e janela histórica anterior) e cruza com o resultado real de k.
  const crossData = useMemo<DrawCrossPoint[]>(() => {
    const allDraws = getHistorical100Draws(latestDraw);
    const recent10 = allDraws.slice(0, 10);

    const chronological = [...recent10].reverse(); // mais antigo -> mais recente

    const rawPoints: Omit<DrawCrossPoint, 'movingAvgRate' | 'activeHits' | 'activeRate' | 'deltaVsBaseline' | 'statusLabel'>[] =
      chronological.map((draw) => {
        const drawIdxInAll = allDraws.findIndex((d) => d.concurso === draw.concurso);
        const priorDraws = allDraws.slice(drawIdxInAll + 1, drawIdxInAll + 26);
        const prevDraw = priorDraws[0] || draw;

        const rollingStats = buildRollingStatsForWindow(priorDraws, statsList);

        // Calcula dezenas pendentes no ciclo antes do concurso atual
        const seenInCycle = new Set<number>();
        for (const pd of priorDraws.slice(0, 6)) {
          pd.dezenas.forEach((n) => seenInCycle.add(n));
        }
        const pendingCycle = Array.from({ length: 25 }, (_, i) => i + 1).filter(
          (n) => !seenInCycle.has(n)
        );

        const optimal = buildOptimal18Pool(prevDraw, rollingStats, pendingCycle, 9, 9);
        const predicted18 = optimal.dezenas18;
        const predicted15 = [...predicted18].slice(0, 15).sort((a, b) => a - b);

        const hits18 = countMatches(predicted18, draw.dezenas);
        const hits15 = countMatches(predicted15, draw.dezenas);
        const rate18 = Number(((hits18 / 15) * 100).toFixed(1));
        const rate15 = Number(((hits15 / 15) * 100).toFixed(1));

        return {
          concurso: draw.concurso,
          label: `#${draw.concurso}`,
          data: draw.data,
          predicted18,
          predicted15,
          realDezenas: draw.dezenas,
          hits18,
          hits15,
          rate18,
          rate15,
          isPremiadoTop15: hits15 >= 11,
        };
      });

    const withActive = rawPoints.map((pt) => {
      const activeHits = mode === 'pool18' ? pt.hits18 : pt.hits15;
      const activeRate = mode === 'pool18' ? pt.rate18 : pt.rate15;
      const deltaVsBaseline = Number((activeRate - baselinePercent).toFixed(1));

      let statusLabel: 'Alta Eficiência' | 'Na Média' | 'Abaixo do Alvo' = 'Abaixo do Alvo';
      if (activeHits >= targetHits) {
        statusLabel = 'Alta Eficiência';
      } else if (activeHits >= targetHits - 1) {
        statusLabel = 'Na Média';
      }

      return {
        ...pt,
        activeHits,
        activeRate,
        deltaVsBaseline,
        statusLabel,
        movingAvgRate: activeRate,
      };
    });

    // Média móvel de 3 concursos para linha de tendência
    for (let i = 0; i < withActive.length; i++) {
      const start = Math.max(0, i - 2);
      const slice = withActive.slice(start, i + 1);
      const avg = slice.reduce((acc, cur) => acc + cur.activeRate, 0) / slice.length;
      withActive[i].movingAvgRate = Number(avg.toFixed(1));
    }

    return withActive;
  }, [latestDraw, statsList, mode, baselinePercent, targetHits]);

  // Recomendação atual da IA para o próximo concurso
  const currentOptimal18 = useMemo(() => {
    if (aiPrediction?.dezenasRecomendadas18 && aiPrediction.dezenasRecomendadas18.length === 18) {
      return [...aiPrediction.dezenasRecomendadas18].sort((a, b) => a - b);
    }
    return buildOptimal18Pool(latestDraw, statsList, [], 9, 9).dezenas18;
  }, [aiPrediction, latestDraw, statsList]);

  const summary = useMemo(() => {
    if (crossData.length === 0) {
      return {
        avgRate: 0,
        avgHits: 0,
        highEfficiencyCount: 0,
        awarded15Count: 0,
        bestPoint: null as DrawCrossPoint | null,
        deltaAvg: 0,
      };
    }

    const sumRate = crossData.reduce((acc, c) => acc + c.activeRate, 0);
    const sumHits = crossData.reduce((acc, c) => acc + c.activeHits, 0);
    const avgRate = Number((sumRate / crossData.length).toFixed(1));
    const avgHits = Number((sumHits / crossData.length).toFixed(2));
    const highEfficiencyCount = crossData.filter((c) => c.activeHits >= targetHits).length;
    const awarded15Count = crossData.filter((c) => c.isPremiadoTop15).length;
    const bestPoint = [...crossData].sort(
      (a, b) => b.activeHits - a.activeHits || b.concurso - a.concurso
    )[0];
    const deltaAvg = Number((avgRate - baselinePercent).toFixed(1));

    return {
      avgRate,
      avgHits,
      highEfficiencyCount,
      awarded15Count,
      bestPoint,
      deltaAvg,
    };
  }, [crossData, targetHits, baselinePercent]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || payload.length === 0) return null;
    const pt: DrawCrossPoint = payload[0].payload;
    return (
      <div className="bg-slate-950/95 border border-slate-700 rounded-xl p-3 shadow-2xl text-xs space-y-1.5 min-w-[220px]">
        <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-1.5">
          <span className="font-mono font-bold text-white">Concurso {pt.label}</span>
          <span className="font-mono text-[11px] text-slate-400">{pt.data}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-400">Acertos IA ({mode === 'pool18' ? 'Top 18' : 'Top 15'}):</span>
          <strong className="font-mono tabular-nums text-emerald-400">{pt.activeHits} / 15</strong>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-400">Taxa de Sucesso:</span>
          <strong className="font-mono tabular-nums text-white">{pt.activeRate.toFixed(1)}%</strong>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-400">Média Móvel (3 conc.):</span>
          <strong className="font-mono tabular-nums text-sky-400">{pt.movingAvgRate.toFixed(1)}%</strong>
        </div>
        <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
          <span className="text-slate-400">Vs. Aleatório ({baselinePercent.toFixed(0)}%):</span>
          <strong
            className={`font-mono tabular-nums ${
              pt.deltaVsBaseline >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {pt.deltaVsBaseline >= 0 ? `+${pt.deltaVsBaseline.toFixed(1)}` : pt.deltaVsBaseline.toFixed(1)} p.p.
          </strong>
        </div>
      </div>
    );
  };

  return (
    <section
      aria-label="Dashboard de Eficiência Preditiva"
      className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-5"
    >
      {/* Cabeçalho */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
            <Brain className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Auditoria Walk-Forward</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">
              Últimos 10 Concursos (#{crossData[0]?.concurso ?? '—'} a #{crossData[crossData.length - 1]?.concurso ?? '—'})
            </span>
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
            Dashboard de Eficiência Preditiva (IA vs. Resultados Reais)
          </h2>
          <p className="text-xs text-slate-400 max-w-3xl leading-relaxed">
            Cruza as recomendações geradas pelo motor preditivo da IA (antes de cada sorteio) com as 15 dezenas oficiais sorteadas nos últimos 10 concursos.
          </p>
        </div>

        {/* Controles */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <div className="inline-flex items-center p-1 bg-slate-950 border border-slate-800 rounded-xl">
            <button
              type="button"
              onClick={() => setMode('pool18')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer whitespace-nowrap shrink-0 ${
                mode === 'pool18'
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Pool 18 IA
            </button>
            <button
              type="button"
              onClick={() => setMode('top15')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer whitespace-nowrap shrink-0 ${
                mode === 'top15'
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Top 15 Ouro IA
            </button>
          </div>

          {onApplyNumbers && (
            <button
              type="button"
              onClick={() => onApplyNumbers(currentOptimal18)}
              className="px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
              title="Enviar as 18 dezenas recomendadas pela IA para o Estúdio de Fechamento"
            >
              <span>Aplicar Top 18 Atual</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Faixa de KPIs Consolidados (4 colunas) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <div className="bg-slate-950/75 border border-slate-800 rounded-xl p-4 space-y-1">
          <span className="text-xs font-medium text-slate-400 block">
            Taxa Média de Sucesso (10 Conc.)
          </span>
          <div className="flex items-baseline justify-between gap-2">
            <strong className="text-2xl font-mono font-bold tabular-nums text-white">
              {summary.avgRate.toFixed(1)}%
            </strong>
            <span
              className={`inline-flex items-center gap-1 text-xs font-mono font-semibold tabular-nums ${
                summary.deltaAvg >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {summary.deltaAvg >= 0 ? (
                <TrendingUp className="w-3.5 h-3.5" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5" />
              )}
              <span>
                {summary.deltaAvg >= 0 ? `+${summary.deltaAvg.toFixed(1)}` : summary.deltaAvg.toFixed(1)} p.p.
              </span>
            </span>
          </div>
          <span className="text-[11px] text-slate-500 block font-mono tabular-nums">
            Base aleatória ({mode === 'pool18' ? '18/25' : '15/25'}): {baselinePercent.toFixed(1)}%
          </span>
        </div>

        <div className="bg-slate-950/75 border border-slate-800 rounded-xl p-4 space-y-1">
          <span className="text-xs font-medium text-slate-400 block">
            Média de Acertos por Concurso
          </span>
          <div className="flex items-baseline justify-between gap-2">
            <strong className="text-2xl font-mono font-bold tabular-nums text-emerald-400">
              {summary.avgHits.toFixed(2)}
            </strong>
            <span className="text-xs font-mono text-slate-400 tabular-nums">de 15 pts</span>
          </div>
          <span className="text-[11px] text-slate-500 block">
            {mode === 'pool18'
              ? 'Cobertura dentro das 18 dezenas sugeridas'
              : 'Cravadas diretas no volante de 15 dezenas'}
          </span>
        </div>

        <div className="bg-slate-950/75 border border-slate-800 rounded-xl p-4 space-y-1">
          <span className="text-xs font-medium text-slate-400 block">
            Concursos no Alvo ({targetHits}+ pts)
          </span>
          <div className="flex items-baseline justify-between gap-2">
            <strong className="text-2xl font-mono font-bold tabular-nums text-white">
              {summary.highEfficiencyCount} / {crossData.length}
            </strong>
            <span className="text-xs font-mono font-semibold text-amber-300 tabular-nums">
              {crossData.length > 0
                ? `${Math.round((summary.highEfficiencyCount / crossData.length) * 100)}%`
                : '0%'}
            </span>
          </div>
          <span className="text-[11px] text-slate-500 block font-mono tabular-nums">
            Volante 15 Ouro premiado (11+): {summary.awarded15Count}/10 conc.
          </span>
        </div>

        <div className="bg-slate-950/75 border border-slate-800 rounded-xl p-4 space-y-1">
          <span className="text-xs font-medium text-slate-400 block">
            Pico Máximo nos Últimos 10
          </span>
          <div className="flex items-baseline justify-between gap-2">
            <strong className="text-2xl font-mono font-bold tabular-nums text-amber-300">
              {summary.bestPoint ? `${summary.bestPoint.activeHits} pts` : '—'}
            </strong>
            <span className="inline-flex items-center gap-1 text-xs font-mono text-slate-300 tabular-nums">
              <Award className="w-3.5 h-3.5 text-amber-400" />
              <span>{summary.bestPoint ? `#${summary.bestPoint.concurso}` : '—'}</span>
            </span>
          </div>
          <span className="text-[11px] text-slate-500 block font-mono tabular-nums">
            {summary.bestPoint
              ? `${summary.bestPoint.activeRate.toFixed(1)}% de assertividade em ${summary.bestPoint.data}`
              : 'Sem histórico'}
          </span>
        </div>
      </div>

      {/* Gráfico Comparativo Recharts (Últimos 10 Concursos) */}
      <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 font-semibold text-slate-200">
            <Target className="w-4 h-4 text-emerald-400" />
            <span>Taxa de Sucesso por Concurso vs. Média Móvel (3 Conc.)</span>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-400">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" />
              <span>No Alvo ({targetHits}+ pts)</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-amber-400 inline-block" />
              <span>Na Média ({targetHits - 1} pts)</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-sky-400 inline-block" />
              <span>Tendência IA</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-0.5 border-t border-dashed border-rose-400 inline-block" />
              <span>Base Aleatória ({baselinePercent.toFixed(0)}%)</span>
            </span>
          </div>
        </div>

        <div className="w-full h-64">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={crossData} margin={{ top: 10, right: 16, left: -12, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis
                dataKey="label"
                stroke="#64748b"
                tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}
              />
              <YAxis
                domain={[40, 100]}
                stroke="#64748b"
                tickFormatter={(v) => `${v}%`}
                tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine
                y={baselinePercent}
                stroke="#f43f5e"
                strokeDasharray="4 4"
                strokeWidth={1.5}
              />
              <Bar dataKey="activeRate" name="Taxa Real" radius={[6, 6, 0, 0]} maxBarSize={38}>
                {crossData.map((entry) => (
                  <Cell
                    key={`cell-${entry.concurso}`}
                    fill={
                      entry.activeHits >= targetHits
                        ? '#10b981'
                        : entry.activeHits >= targetHits - 1
                        ? '#f59e0b'
                        : '#64748b'
                    }
                  />
                ))}
              </Bar>
              <Line
                type="monotone"
                dataKey="movingAvgRate"
                name="Média Móvel"
                stroke="#38bdf8"
                strokeWidth={2.5}
                dot={{ r: 3.5, fill: '#38bdf8', strokeWidth: 0 }}
                activeDot={{ r: 5 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tabela Analítica Detalhada dos 10 Concursos */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            Detalhamento Concurso a Concurso (Últimos 10)
          </h3>
          <button
            type="button"
            onClick={() => setIsTableExpanded((v) => !v)}
            className="text-xs font-semibold text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
          >
            <span>{isTableExpanded ? 'Recolher Tabela' : 'Expandir Tabela'}</span>
            {isTableExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        {isTableExpanded && (
          <div className="overflow-x-auto border border-slate-800 rounded-xl">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-950/90 border-b border-slate-800 text-slate-400 font-semibold">
                  <th className="py-2.5 px-3 whitespace-nowrap">Concurso</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Data</th>
                  <th className="py-2.5 px-3 text-right whitespace-nowrap">Acertos (Pool 18)</th>
                  <th className="py-2.5 px-3 text-right whitespace-nowrap">Acertos (Top 15)</th>
                  <th className="py-2.5 px-3 text-right whitespace-nowrap">Taxa Sucesso</th>
                  <th className="py-2.5 px-3 text-right whitespace-nowrap">Vs. Aleatório</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Status Preditivo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70 bg-slate-900/40">
                {[...crossData].reverse().map((row) => (
                  <tr key={row.concurso} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-2 px-3 font-mono font-bold text-white tabular-nums whitespace-nowrap">
                      #{row.concurso}
                    </td>
                    <td className="py-2 px-3 font-mono text-slate-400 tabular-nums whitespace-nowrap">
                      {row.data}
                    </td>
                    <td className="py-2 px-3 text-right font-mono tabular-nums">
                      <span className={row.hits18 >= 12 ? 'text-emerald-400 font-bold' : 'text-slate-300'}>
                        {row.hits18}/15
                      </span>
                    </td>
                    <td className="py-2 px-3 text-right font-mono tabular-nums">
                      <span className={row.hits15 >= 11 ? 'text-amber-300 font-bold' : 'text-slate-300'}>
                        {row.hits15}/15
                      </span>
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-semibold text-white tabular-nums">
                      {row.activeRate.toFixed(1)}%
                    </td>
                    <td
                      className={`py-2 px-3 text-right font-mono font-semibold tabular-nums ${
                        row.deltaVsBaseline >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {row.deltaVsBaseline >= 0 ? `+${row.deltaVsBaseline.toFixed(1)}` : row.deltaVsBaseline.toFixed(1)} p.p.
                    </td>
                    <td className="py-2 px-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 text-[11px] font-semibold ${
                          row.statusLabel === 'Alta Eficiência'
                            ? 'text-emerald-400'
                            : row.statusLabel === 'Na Média'
                            ? 'text-amber-300'
                            : 'text-slate-400'
                        }`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        <span>{row.statusLabel}</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
};
