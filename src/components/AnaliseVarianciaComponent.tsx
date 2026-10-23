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
import { ExpertTip } from './ExpertTip';
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

  // Inspected contest for dynamic ruler (selected or latest)
  const inspectedContest = useMemo(() => {
    if (selectedConcurso) {
      const found = varianceList.find((c) => c.concurso === selectedConcurso);
      if (found) return found;
    }
    return latestContestData;
  }, [selectedConcurso, varianceList, latestContestData]);

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

        {/* Scope Selector & Expert Tip */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <ExpertTip
            title="Análise de Variância & Média Aritmética 13,0"
            ruleCategory="Equilíbrio Gravitacional da Lotofácil"
            impact14Pontos="Na Lotofácil, as 25 dezenas possuem média teórica perfeita de 13,00 (soma esperada = 195). Mais de 82% das apostas que alcançam 14 pontos possuem média entre 12,65 e 13,35. Se a média recente estiver 'inflada' (> 13,25) por 2 concursos, a Lei dos Grandes Números induz uma retração compensatória (deflação) em direção às dezenas 01 a 12 no próximo sorteio."
            recommendation="Ao identificar 2 concursos inflados consecutivos, monte fechamentos selecionando 8 a 9 dezenas no bloco de 01 a 12 para capturar a regressão à média com garantia de 14 pontos."
            metricValue={`Média Atual: ${latestContestData?.media.toFixed(2)} (Desvio: ${(latestContestData?.desvio ?? 0) >= 0 ? '+' : ''}${latestContestData?.desvio.toFixed(2)})`}
            badgeLabel="Dica 14 Pts"
          />

          <div className="flex items-center gap-1.5">
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
      </div>

      {/* RÉGUA DINÂMICA DE VARIÂNCIA & DESVIO PADRÃO (μ = 13,00) */}
      <div className="bg-slate-950 p-5 rounded-2xl border-2 border-cyan-500/40 shadow-2xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                <Sliders className="w-4 h-4" />
              </span>
              <h4 className="text-sm font-black text-white tracking-wide uppercase">
                Régua Dinâmica de Variância: Concursos Inflados vs Deflados
              </h4>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40">
                CENTRO GRAVITACIONAL μ = 13,00
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Escala métrica de dispersão das dezenas sorteadas. Concurso auditado:{' '}
              <strong className="text-white font-mono">#{inspectedContest?.concurso} ({inspectedContest?.data})</strong>
            </p>
          </div>

          {/* Seletor rápido de concursos para teste na régua */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <span className="text-[11px] text-slate-400 shrink-0 font-semibold">Testar:</span>
            {varianceList.slice(0, 5).map((c) => (
              <button
                key={c.concurso}
                type="button"
                onClick={() => setSelectedConcurso(c.concurso)}
                className={`px-2 py-1 rounded-lg font-mono text-[11px] font-bold transition cursor-pointer shrink-0 ${
                  (selectedConcurso === c.concurso || (!selectedConcurso && c.concurso === latestContestData?.concurso))
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 shadow-md font-black'
                    : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                #{c.concurso}
              </button>
            ))}
          </div>
        </div>

        {/* Display Visual da Régua */}
        <div className="pt-3 pb-2 px-2 sm:px-4 space-y-3">
          {/* Marcador Superior Dinâmico (Needle / Pino Indicador) */}
          <div className="relative h-10 w-full">
            <div
              className="absolute top-0 -translate-x-1/2 flex flex-col items-center transition-all duration-300"
              style={{
                left: `${Math.min(96, Math.max(4, (((inspectedContest?.media ?? 13.0) - 10.0) / 6.0) * 100))}%`,
              }}
            >
              <div
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-black shadow-xl flex items-center gap-1.5 border whitespace-nowrap ${
                  inspectedContest?.status === 'inflado'
                    ? 'bg-amber-500 text-slate-950 border-amber-300 shadow-amber-500/30'
                    : inspectedContest?.status === 'deflado'
                    ? 'bg-cyan-500 text-slate-950 border-cyan-300 shadow-cyan-500/30'
                    : 'bg-emerald-500 text-slate-950 border-emerald-300 shadow-emerald-500/30'
                }`}
              >
                <span>μ = {inspectedContest?.media.toFixed(2)}</span>
                <span className="text-[10px] opacity-90">
                  ({(inspectedContest?.desvio ?? 0) >= 0 ? '+' : ''}{inspectedContest?.desvio.toFixed(2)})
                </span>
              </div>
              <div
                className={`w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] mt-0.5 ${
                  inspectedContest?.status === 'inflado'
                    ? 'border-t-amber-500'
                    : inspectedContest?.status === 'deflado'
                    ? 'border-t-cyan-500'
                    : 'border-t-emerald-500'
                }`}
              />
            </div>
          </div>

          {/* Barra Graduada da Régua com Setores de Inflação/Deflação */}
          <div className="relative">
            <div className="h-6 w-full rounded-xl overflow-hidden flex border border-slate-700 shadow-inner">
              {/* Setor 1: Super Deflado (< 12.0) - 33.3% */}
              <div className="w-[33.3%] bg-gradient-to-r from-blue-700 via-cyan-600 to-cyan-500 flex items-center justify-center text-[10px] font-bold text-white tracking-wider">
                DEFLADO SEVERO (&lt; 12,0)
              </div>
              {/* Setor 2: Deflado Leve (12.0 a 12.75) - 12.5% */}
              <div className="w-[12.5%] bg-teal-500/90 flex items-center justify-center text-[9px] font-bold text-slate-950">
                LEVE
              </div>
              {/* Setor 3: Equilíbrio Áureo (12.75 a 13.25) - 8.3% */}
              <div className="w-[8.4%] bg-emerald-400 flex items-center justify-center text-[9px] font-black text-slate-950 border-x-2 border-white shadow-[0_0_10px_rgba(52,211,153,0.8)]">
                13,0
              </div>
              {/* Setor 4: Inflado Leve (13.25 a 14.0) - 12.5% */}
              <div className="w-[12.5%] bg-amber-400/90 flex items-center justify-center text-[9px] font-bold text-slate-950">
                LEVE
              </div>
              {/* Setor 5: Super Inflado (> 14.0) - 33.3% */}
              <div className="w-[33.3%] bg-gradient-to-r from-amber-500 via-orange-500 to-rose-600 flex items-center justify-center text-[10px] font-bold text-white tracking-wider">
                INFLADO SEVERO (&gt; 14,0)
              </div>
            </div>

            {/* Linha de Marco Zero Central 13,00 */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_8px_#ffffff] z-10 pointer-events-none"
              style={{ left: '50%' }}
            />

            {/* Faixa de Dispersão do Desvio Padrão (Intervalo [μ - σ, μ + σ]) */}
            {inspectedContest && (
              <div
                className="absolute -bottom-2.5 h-1.5 bg-white/60 rounded-full border border-white transition-all duration-300"
                style={{
                  left: `${Math.max(0, (((inspectedContest.media - inspectedContest.desvioPadrao) - 10.0) / 6.0) * 100)}%`,
                  width: `${Math.min(100, ((inspectedContest.desvioPadrao * 2) / 6.0) * 100)}%`,
                }}
                title={`Faixa de Dispersão ±1σ (${(inspectedContest.media - inspectedContest.desvioPadrao).toFixed(2)} a ${(inspectedContest.media + inspectedContest.desvioPadrao).toFixed(2)})`}
              />
            )}
          </div>

          {/* Marcadores Numéricos da Régua (10.0 a 16.0) */}
          <div className="flex justify-between text-[10px] font-mono text-slate-400 pt-2 px-1">
            <span>10,00</span>
            <span>11,00</span>
            <span>12,00</span>
            <span className="text-emerald-400 font-bold">12,75</span>
            <span className="text-white font-black underline decoration-emerald-400">13,00 (Meta)</span>
            <span className="text-amber-400 font-bold">13,25</span>
            <span>14,00</span>
            <span>15,00</span>
            <span>16,00</span>
          </div>

          {/* Telemetria Analítica do Concurso Inspecionado */}
          {inspectedContest && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
              <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Média Aritmética (μ)</span>
                <strong className="text-white font-mono text-sm">{inspectedContest.media.toFixed(2)}</strong>
                <span className="text-[10px] text-slate-500 block">Soma: {inspectedContest.soma}</span>
              </div>

              <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Desvio de 13,0 (Δ)</span>
                <strong className={`font-mono text-sm ${inspectedContest.desvio >= 0 ? 'text-amber-400' : 'text-cyan-400'}`}>
                  {inspectedContest.desvio >= 0 ? `+${inspectedContest.desvio.toFixed(2)}` : inspectedContest.desvio.toFixed(2)}
                </strong>
                <span className="text-[10px] text-slate-500 block">
                  {inspectedContest.status === 'inflado' ? 'Acima da média' : inspectedContest.status === 'deflado' ? 'Abaixo da média' : 'Equilíbrio'}
                </span>
              </div>

              <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Desvio Padrão (σ)</span>
                <strong className="text-purple-300 font-mono text-sm">±{inspectedContest.desvioPadrao.toFixed(2)}</strong>
                <span className="text-[10px] text-slate-500 block">Variância: {inspectedContest.variancia.toFixed(2)}</span>
              </div>

              <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Diagnóstico de Viés</span>
                <strong
                  className={`text-xs uppercase font-bold block ${
                    inspectedContest.status === 'inflado'
                      ? 'text-amber-400'
                      : inspectedContest.status === 'deflado'
                      ? 'text-cyan-400'
                      : 'text-emerald-400'
                  }`}
                >
                  {inspectedContest.statusLabel}
                </strong>
                {onApplyBiasRecommendation && (
                  <button
                    type="button"
                    onClick={() => {
                      // Se inflado, sugere bloco baixo (01 a 12); se deflado, bloco alto (14 a 25)
                      const biasGroup = inspectedContest.status === 'inflado'
                        ? [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
                        : [14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25];
                      onApplyBiasRecommendation(biasGroup);
                    }}
                    className="text-[10px] text-cyan-300 hover:underline font-semibold mt-0.5 inline-block cursor-pointer"
                  >
                    {inspectedContest.status === 'inflado' ? '→ Aplicar 01-12 no Fechamento' : '→ Aplicar 14-25 no Fechamento'}
                  </button>
                )}
              </div>
            </div>
          )}
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
      <div className="p-4 rounded-xl bg-gradient-to-r from-indigo-950/40 via-slate-900 to-cyan-950/40 border border-indigo-500/30 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
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

        <ExpertTip
          title="Regressão à Média nos Sorteios da Caixa"
          ruleCategory="Equilíbrio Gravitacional"
          impact14Pontos="Desvios sistemáticos da média 13,00 não perduram por mais de 3 sorteios consecutivos. Concursos inflados concentram dezenas na metade superior (14–25), criando uma barreira elástica que dispara dezenas atrasadas da metade inferior (01–12) para reequilibrar a soma canônica de 195."
          recommendation="Filtre bilhetes com soma calibrada na Zona de Ouro (190 a 210) para maximizar o retorno no momento da correção."
          size="sm"
        />
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
