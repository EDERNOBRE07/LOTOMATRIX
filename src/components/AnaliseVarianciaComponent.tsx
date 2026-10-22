import React, { useState, useMemo } from 'react';
import { LotofacilDraw } from '../types/lotofacil';
import { RECENT_DRAWS, CONCURSO_ATUAL } from '../data/lotofacilData';
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
import {
  TrendingUp,
  TrendingDown,
  Scale,
  Activity,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  Sliders,
  Sparkles,
  ArrowRight,
  RotateCcw,
} from 'lucide-react';

interface AnaliseVarianciaComponentProps {
  latestDraw?: LotofacilDraw;
  onApplyBiasRecommendation?: (suggestedNumbers: number[]) => void;
}

interface ContestVarianceData {
  concurso: number;
  data: string;
  dezenas: number[];
  soma: number;
  media: number;
  desvio: number; // media - 13.0
  variancia: number;
  desvioPadrao: number;
  status: 'inflado' | 'deflado' | 'equilibrado';
  statusLabel: string;
}

export const AnaliseVarianciaComponent: React.FC<AnaliseVarianciaComponentProps> = ({
  latestDraw = CONCURSO_ATUAL,
  onApplyBiasRecommendation,
}) => {
  const [sampleLimit, setSampleLimit] = useState<number>(20);
  const [selectedConcurso, setSelectedConcurso] = useState<number | null>(null);

  // Compile list of draws starting with latestDraw and history
  const drawsList = useMemo(() => {
    const list: LotofacilDraw[] = [latestDraw];
    RECENT_DRAWS.forEach((d) => {
      if (!list.some((existing) => existing.concurso === d.concurso)) {
        list.push(d);
      }
    });
    return list.slice(0, Math.max(sampleLimit, 20));
  }, [latestDraw, sampleLimit]);

  // Compute variance and deviation from 13.0 for each contest
  const varianceList: ContestVarianceData[] = useMemo(() => {
    return drawsList.map((draw) => {
      const dezenas = [...draw.dezenas].sort((a, b) => a - b);
      const soma = dezenas.reduce((acc, curr) => acc + curr, 0);
      const media = Number((soma / 15).toFixed(2));
      const desvio = Number((media - 13.0).toFixed(2));

      // Amostral variance & standard deviation
      const sumSquaredDiffs = dezenas.reduce((acc, n) => acc + Math.pow(n - media, 2), 0);
      const variancia = Number((sumSquaredDiffs / 14).toFixed(2));
      const desvioPadrao = Number(Math.sqrt(variancia).toFixed(2));

      let status: 'inflado' | 'deflado' | 'equilibrado' = 'equilibrado';
      let statusLabel = 'Equilibrado (Neutro)';

      if (desvio > 0.25) {
        status = 'inflado';
        statusLabel = 'Inflado (Dezenas Altas)';
      } else if (desvio < -0.25) {
        status = 'deflado';
        statusLabel = 'Deflado (Dezenas Baixas)';
      }

      return {
        concurso: draw.concurso,
        data: draw.data,
        dezenas,
        soma,
        media,
        desvio,
        variancia,
        desvioPadrao,
        status,
        statusLabel,
      };
    });
  }, [drawsList]);

  // Chronological order for Recharts (oldest to newest)
  const chartData = useMemo(() => {
    return [...varianceList].reverse().map((item) => ({
      concursoLabel: `#${item.concurso}`,
      concurso: item.concurso,
      data: item.data,
      media: item.media,
      desvio: item.desvio,
      soma: item.soma,
      status: item.status,
      statusLabel: item.statusLabel,
    }));
  }, [varianceList]);

  // Statistics summaries
  const statsSummary = useMemo(() => {
    const total = varianceList.length;
    if (total === 0) {
      return {
        mediaGeral: 13.0,
        desvioMedioGeral: 0,
        infladosCount: 0,
        defladosCount: 0,
        equilibradosCount: 0,
        infladosPercent: 0,
        defladosPercent: 0,
        equilibradosPercent: 0,
        reversionInsight: '',
      };
    }

    const somaMedias = varianceList.reduce((acc, item) => acc + item.media, 0);
    const mediaGeral = Number((somaMedias / total).toFixed(2));
    const desvioMedioGeral = Number((mediaGeral - 13.0).toFixed(2));

    const infladosCount = varianceList.filter((item) => item.status === 'inflado').length;
    const defladosCount = varianceList.filter((item) => item.status === 'deflado').length;
    const equilibradosCount = varianceList.filter((item) => item.status === 'equilibrado').length;

    // Check last 3 contests streak to calculate mean reversion pressure
    const recent3 = varianceList.slice(0, 3);
    const recentInflatedCount = recent3.filter((c) => c.status === 'inflado').length;
    const recentDeflatedCount = recent3.filter((c) => c.status === 'deflado').length;

    let reversionInsight = '';
    if (recentInflatedCount >= 2) {
      reversionInsight =
        'Pressão de Regressão Deflacionária: Os últimos concursos concentraram números altos (média > 13.0). A lei da média estocástica favorece uma retração corretiva para as dezenas baixas (01 a 12) no próximo sorteio.';
    } else if (recentDeflatedCount >= 2) {
      reversionInsight =
        'Pressão de Regressão Inflacionária: Os últimos concursos concentraram números baixos (média < 13.0). A lei da média estocástica favorece uma expansão para as dezenas mais altas (14 a 25) no próximo sorteio.';
    } else {
      reversionInsight =
        'Equilíbrio Dinâmico: A distribuição oscila suavemente ao redor do centro 13,00 (soma ~195), ideal para apostas estruturadas na Regra de Ouro (soma 190 a 210).';
    }

    return {
      mediaGeral,
      desvioMedioGeral,
      infladosCount,
      defladosCount,
      equilibradosCount,
      infladosPercent: Math.round((infladosCount / total) * 100),
      defladosPercent: Math.round((defladosCount / total) * 100),
      equilibradosPercent: Math.round((equilibradosCount / total) * 100),
      reversionInsight,
    };
  }, [varianceList]);

  // Latest contest telemetry
  const latestContestData = varianceList[0] || null;

  return (
    <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-5 sm:p-6 shadow-xl space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between pb-4 border-b border-slate-800 gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-gradient-to-tr from-cyan-500/20 via-blue-500/20 to-indigo-500/20 border border-cyan-500/40 text-cyan-300">
            <Scale className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2 flex-wrap">
              <span>Análise de Variância & Desvio da Média Aritmética (13,0)</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 uppercase font-bold">
                Estatística Matemática
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Mede a dispersão de cada concurso em relação ao centro teórico da Lotofácil (μ = 13,00), identificando viés de concursos 'inflados' ou 'deflados'.
            </p>
          </div>
        </div>

        {/* Scope Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-semibold">Amostragem:</span>
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            {[10, 15, 20].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setSampleLimit(n)}
                className={`px-2.5 py-1 rounded-lg font-mono font-bold transition cursor-pointer ${
                  sampleLimit === n
                    ? 'bg-cyan-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {n} Concursos
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Cards de Resumo & Telemetria do Último Concurso */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Card 1: Último Concurso */}
        <div
          className={`p-4 rounded-xl border transition ${
            latestContestData?.status === 'inflado'
              ? 'bg-amber-950/20 border-amber-500/40'
              : latestContestData?.status === 'deflado'
              ? 'bg-cyan-950/20 border-cyan-500/40'
              : 'bg-emerald-950/20 border-emerald-500/40'
          }`}
        >
          <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block mb-1">
            Concurso Mais Recente #{latestContestData?.concurso}
          </span>
          <div className="flex items-baseline gap-2">
            <strong className="text-2xl font-mono font-black text-white">
              {latestContestData?.media.toFixed(2)}
            </strong>
            <span
              className={`text-xs font-mono font-black ${
                (latestContestData?.desvio ?? 0) >= 0 ? 'text-amber-400' : 'text-cyan-400'
              }`}
            >
              {(latestContestData?.desvio ?? 0) >= 0 ? '+' : ''}
              {latestContestData?.desvio.toFixed(2)}
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Classificação:</span>
            <span
              className={`font-mono font-black px-2 py-0.5 rounded text-[10px] uppercase ${
                latestContestData?.status === 'inflado'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : latestContestData?.status === 'deflado'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              }`}
            >
              {latestContestData?.status === 'inflado' ? '▲ Inflado' : latestContestData?.status === 'deflado' ? '▼ Deflado' : '● Equilibrado'}
            </span>
          </div>
        </div>

        {/* Card 2: Proporção Inflados */}
        <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block mb-1">
              Concursos Inflados (&gt; 13,25)
            </span>
            <div className="flex items-baseline gap-2">
              <strong className="text-2xl font-mono font-black text-amber-400">
                {statsSummary.infladosPercent}%
              </strong>
              <span className="text-xs text-slate-400">
                ({statsSummary.infladosCount} de {varianceList.length})
              </span>
            </div>
          </div>
          <span className="text-[10px] text-slate-500 mt-2">
            Dominância de dezenas altas (14 a 25)
          </span>
        </div>

        {/* Card 3: Proporção Deflados */}
        <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block mb-1">
              Concursos Deflados (&lt; 12,75)
            </span>
            <div className="flex items-baseline gap-2">
              <strong className="text-2xl font-mono font-black text-cyan-400">
                {statsSummary.defladosPercent}%
              </strong>
              <span className="text-xs text-slate-400">
                ({statsSummary.defladosCount} de {varianceList.length})
              </span>
            </div>
          </div>
          <span className="text-[10px] text-slate-500 mt-2">
            Dominância de dezenas baixas (01 a 12)
          </span>
        </div>

        {/* Card 4: Centro Equilibrado */}
        <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block mb-1">
              Concursos Equilibrados (12,75 a 13,25)
            </span>
            <div className="flex items-baseline gap-2">
              <strong className="text-2xl font-mono font-black text-emerald-400">
                {statsSummary.equilibradosPercent}%
              </strong>
              <span className="text-xs text-slate-400">
                ({statsSummary.equilibradosCount} de {varianceList.length})
              </span>
            </div>
          </div>
          <span className="text-[10px] text-emerald-400/80 mt-2">
            Média histórica geral: {statsSummary.mediaGeral.toFixed(2)} (alvo: 13,00)
          </span>
        </div>
      </div>

      {/* Regressão à Média Insight Banner */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-indigo-950/40 via-slate-900 to-cyan-950/40 border border-indigo-500/30 flex items-start gap-3">
        <Sparkles className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <strong className="text-xs font-bold text-white uppercase font-mono tracking-wider flex items-center gap-1.5">
            <span>Diagnóstico Preditivo: Regressão Estatística à Média</span>
          </strong>
          <p className="text-xs text-slate-300 leading-relaxed">
            {statsSummary.reversionInsight}
          </p>
        </div>
      </div>

      {/* Gráfico de Desvio da Média Aritmética 13.0 */}
      <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-slate-800 gap-2">
          <div>
            <span className="font-mono font-bold text-white text-xs uppercase tracking-wider block">
              Desvio em Relação ao Centro Teórico 13,0 (Últimos {sampleLimit} Concursos)
            </span>
            <span className="text-[11px] text-slate-400">
              Barras para cima (&gt; 0) = Concurso Inflado (dezenas altas) • Barras para baixo (&lt; 0) = Concurso Deflado (dezenas baixas)
            </span>
          </div>

          <div className="flex items-center gap-3 text-[11px] font-mono">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-amber-400"></span>
              <span className="text-slate-300">Inflado (&gt; +0.25)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-emerald-400"></span>
              <span className="text-slate-300">Equilibrado</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-cyan-400"></span>
              <span className="text-slate-300">Deflado (&lt; -0.25)</span>
            </div>
          </div>
        </div>

        <div className="h-64 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis
                dataKey="concursoLabel"
                stroke="#64748b"
                tick={{ fill: '#94a3b8', fontSize: 10, fontFamily: 'monospace' }}
                interval={0}
                angle={-45}
                textAnchor="end"
              />
              <YAxis
                stroke="#64748b"
                tick={{ fill: '#94a3b8', fontSize: 10, fontFamily: 'monospace' }}
                domain={[-2.5, 2.5]}
                tickFormatter={(v) => (v >= 0 ? `+${v.toFixed(1)}` : `${v.toFixed(1)}`)}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload;
                    return (
                      <div className="bg-slate-900/95 border border-slate-700 p-3 rounded-xl shadow-xl text-xs space-y-1.5 font-sans z-50">
                        <div className="font-mono font-bold text-white border-b border-slate-800 pb-1 flex justify-between gap-3">
                          <span>Concurso #{d.concurso}</span>
                          <span className="text-slate-400 font-normal">{d.data}</span>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-slate-400">Média Aritmética:</span>
                          <strong className="font-mono text-white text-sm">{d.media.toFixed(2)}</strong>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-slate-400">Desvio de 13,0:</span>
                          <strong className={`font-mono ${d.desvio >= 0 ? 'text-amber-400' : 'text-cyan-400'}`}>
                            {d.desvio >= 0 ? `+${d.desvio.toFixed(2)}` : d.desvio.toFixed(2)}
                          </strong>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-slate-400">Soma Total:</span>
                          <strong className="font-mono text-emerald-400">{d.soma}</strong>
                        </div>
                        <div className="flex items-center justify-between gap-4 pt-1 border-t border-slate-800">
                          <span className="text-slate-400">Classificação:</span>
                          <span
                            className={`px-1.5 py-0.2 rounded font-mono text-[10px] uppercase font-bold ${
                              d.status === 'inflado'
                                ? 'bg-amber-500/20 text-amber-300'
                                : d.status === 'deflado'
                                ? 'bg-cyan-500/20 text-cyan-300'
                                : 'bg-emerald-500/20 text-emerald-300'
                            }`}
                          >
                            {d.statusLabel}
                          </span>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <ReferenceLine y={0} stroke="#475569" strokeWidth={2} strokeDasharray="4 4" label={{ value: 'Média Teórica 13,00', fill: '#94a3b8', fontSize: 10, position: 'right' }} />
              <Bar dataKey="desvio" radius={[4, 4, 4, 4]}>
                {chartData.map((entry, index) => {
                  let fillColor = '#10b981'; // equilibrado
                  if (entry.status === 'inflado') fillColor = '#f59e0b'; // inflado
                  else if (entry.status === 'deflado') fillColor = '#06b6d4'; // deflado
                  return <Cell key={`cell-${index}`} fill={fillColor} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tabela de Auditoria Concurso por Concurso */}
      <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-mono font-bold text-white uppercase tracking-wider text-[11px]">
            Tabela de Auditoria dos Concursos Recentes ({varianceList.length} Registros)
          </span>
          <span className="text-slate-500 text-[10px] font-mono">
            Média Teórica: 13,00 • Soma Teórica: 195
          </span>
        </div>

        <div className="overflow-x-auto max-h-64 overflow-y-auto pr-1">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-900 text-slate-400 font-mono uppercase text-[10px] sticky top-0 z-10 border-b border-slate-800">
              <tr>
                <th className="py-2 px-3">Concurso</th>
                <th className="py-2 px-3">Data</th>
                <th className="py-2 px-3 text-center">Soma Total</th>
                <th className="py-2 px-3 text-center">Média das 15</th>
                <th className="py-2 px-3 text-center">Desvio (vs 13,0)</th>
                <th className="py-2 px-3 text-center">Variância (s²)</th>
                <th className="py-2 px-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300">
              {varianceList.map((item) => {
                const isSelected = selectedConcurso === item.concurso;
                return (
                  <tr
                    key={item.concurso}
                    onClick={() => setSelectedConcurso(isSelected ? null : item.concurso)}
                    className={`hover:bg-slate-850 cursor-pointer transition ${
                      isSelected ? 'bg-cyan-950/30 ring-1 ring-cyan-500/40' : ''
                    }`}
                  >
                    <td className="py-2 px-3 font-bold text-white">#{item.concurso}</td>
                    <td className="py-2 px-3 text-slate-400 text-[11px]">{item.data}</td>
                    <td className="py-2 px-3 text-center font-bold text-emerald-400">{item.soma}</td>
                    <td className="py-2 px-3 text-center font-bold">{item.media.toFixed(2)}</td>
                    <td
                      className={`py-2 px-3 text-center font-bold ${
                        item.desvio > 0 ? 'text-amber-400' : item.desvio < 0 ? 'text-cyan-400' : 'text-slate-400'
                      }`}
                    >
                      {item.desvio >= 0 ? `+${item.desvio.toFixed(2)}` : item.desvio.toFixed(2)}
                    </td>
                    <td className="py-2 px-3 text-center text-slate-400">{item.variancia.toFixed(1)}</td>
                    <td className="py-2 px-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold inline-block ${
                          item.status === 'inflado'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : item.status === 'deflado'
                            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        }`}
                      >
                        {item.status}
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
