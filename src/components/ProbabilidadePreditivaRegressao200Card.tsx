import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  Cell,
} from 'recharts';
import { LotofacilDraw, DezenaStats } from '../types/lotofacil';
import { CONCURSO_ATUAL, DEZENAS_STATS } from '../data/lotofacilData';
import { getHistorical500Draws } from '../services/fechamentoPonderadoService';
import { soundService } from '../services/soundAlert';
import {
  TrendingUp,
  Brain,
  Sparkles,
  Target,
  ArrowRight,
  Flame,
  Award,
  Layers,
  Activity,
  CheckCircle2,
  Sliders,
} from 'lucide-react';

interface ProbabilidadePreditivaRegressao200CardProps {
  latestDraw?: LotofacilDraw;
  statsList?: DezenaStats[];
  cyclePendingNumbers?: number[];
  onApplyNumbers?: (numbers: number[]) => void;
}

export interface DezenaRegressaoResult {
  numero: number;
  dezenaPad: string;
  probabilidadePreditiva: number; // e.g. 78.4%
  coeficienteAngular: number; // slope (beta)
  intercepto: number; // alpha
  rQuadrado: number; // R²
  tendencia: 'Forte Alta' | 'Alta Moderada' | 'Estável' | 'Em Retração';
  frequencia200: number; // de 200 apurações
  frequenciaPercentual: number; // % de 200
  atrasoAtual: number;
  potencialRetorno: 'Ouro Máximo 🔥' | 'Alto Retorno ⚡' | 'Firme & Seguro ✓';
  fatorCiclo: boolean;
}

export const ProbabilidadePreditivaRegressao200Card: React.FC<ProbabilidadePreditivaRegressao200CardProps> = ({
  latestDraw = CONCURSO_ATUAL,
  statsList = DEZENAS_STATS,
  cyclePendingNumbers = [17, 22],
  onApplyNumbers,
}) => {
  const [selectedDezenaDetail, setSelectedDezenaDetail] = useState<DezenaRegressaoResult | null>(null);
  const [appliedFeedback, setAppliedFeedback] = useState<string | null>(null);

  // Cálculo da Regressão Linear Mínimos Quadrados (OLS) sobre os últimos 200 concursos
  const regressionResults = useMemo(() => {
    const historical200 = getHistorical500Draws(latestDraw).slice(0, 200);

    // Dividir os 200 concursos em 10 janelas cronológicas de 20 concursos
    // Janela 1: mais antiga (índices 180 a 199) ... Janela 10: mais recente (índices 0 a 19)
    const windowCount = 10;
    const windowSize = 20;
    const windows: LotofacilDraw[][] = [];
    for (let w = windowCount - 1; w >= 0; w--) {
      const start = w * windowSize;
      windows.push(historical200.slice(start, start + windowSize));
    }

    const tValues = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const meanT = 5.5;
    const sumTDiffSq = tValues.reduce((acc, t) => acc + Math.pow(t - meanT, 2), 0); // 82.5

    const results: DezenaRegressaoResult[] = [];

    for (let num = 1; num <= 25; num++) {
      const stat = statsList.find((s) => s.numero === num);
      const atrasoAtual = stat?.atrasoAtual ?? 0;
      const isCyclePending = cyclePendingNumbers.includes(num) || Boolean(stat?.pendenteNoCiclo);

      // Frequências em cada uma das 10 janelas cronológicas
      const yValues: number[] = windows.map((win) => {
        return win.filter((draw) => draw.dezenas.includes(num)).length;
      });

      const totalFreq200 = yValues.reduce((a, b) => a + b, 0);
      const meanY = totalFreq200 / windowCount;

      // Cálculo do Coeficiente Angular (Beta) e Intercepto (Alpha)
      let sumNumerator = 0;
      let ssTotal = 0;
      for (let i = 0; i < windowCount; i++) {
        const tDiff = tValues[i] - meanT;
        const yDiff = yValues[i] - meanY;
        sumNumerator += tDiff * yDiff;
        ssTotal += yDiff * yDiff;
      }

      const beta = sumNumerator / sumTDiffSq;
      const alpha = meanY - beta * meanT;

      // Projeção para a próxima janela (t = 11)
      const projectedNextWindowFreq = alpha + beta * 11;

      // Cálculo do Coeficiente de Determinação R²
      let ssRes = 0;
      for (let i = 0; i < windowCount; i++) {
        const yPred = alpha + beta * tValues[i];
        ssRes += Math.pow(yValues[i] - yPred, 2);
      }
      const r2 = ssTotal > 0 ? Math.max(0, Math.min(1, 1 - ssRes / ssTotal)) : 0;

      // Calibragem da Probabilidade Preditiva para o próximo concurso:
      // Probabilidade base: (Projeção / 20) * 100
      let rawProb = (projectedNextWindowFreq / windowSize) * 100;

      // Ajuste fino por Atraso e Ciclo:
      if (isCyclePending) {
        rawProb += 8.5; // Pressão forte de fechamento de ciclo
      } else if (atrasoAtual >= 3) {
        rawProb += Math.min(6, atrasoAtual * 1.5); // Retorno provável da dezena atrasada
      } else if (atrasoAtual === 0) {
        rawProb += 4.0; // Inércia canônica de repetição
      }

      // Confinar a probabilidade num intervalo realista de 40% a 88%
      const finalProb = Number(Math.min(88.5, Math.max(38.0, rawProb)).toFixed(1));

      let tendencia: DezenaRegressaoResult['tendencia'] = 'Estável';
      if (beta >= 0.25) tendencia = 'Forte Alta';
      else if (beta >= 0.08) tendencia = 'Alta Moderada';
      else if (beta <= -0.15) tendencia = 'Em Retração';

      let potencialRetorno: DezenaRegressaoResult['potencialRetorno'] = 'Firme & Seguro ✓';
      if (finalProb >= 74.0 || isCyclePending) {
        potencialRetorno = 'Ouro Máximo 🔥';
      } else if (finalProb >= 67.0) {
        potencialRetorno = 'Alto Retorno ⚡';
      }

      results.push({
        numero: num,
        dezenaPad: num.toString().padStart(2, '0'),
        probabilidadePreditiva: finalProb,
        coeficienteAngular: Number(beta.toFixed(3)),
        intercepto: Number(alpha.toFixed(2)),
        rQuadrado: Number(r2.toFixed(3)),
        tendencia,
        frequencia200: totalFreq200,
        frequenciaPercentual: Number(((totalFreq200 / 200) * 100).toFixed(1)),
        atrasoAtual,
        potencialRetorno,
        fatorCiclo: isCyclePending,
      });
    }

    // Ordenar decrescente pela Probabilidade Preditiva
    results.sort((a, b) => b.probabilidadePreditiva - a.probabilidadePreditiva);
    return results;
  }, [latestDraw, statsList, cyclePendingNumbers]);

  // Top 10 Dezenas com Maior Potencial de Retorno
  const top10 = useMemo(() => regressionResults.slice(0, 10), [regressionResults]);

  const handleApplyTop10 = () => {
    if (onApplyNumbers) {
      const nums = top10.map((d) => d.numero);
      onApplyNumbers(nums);
      soundService.playGoldenZoneSuccessChime();
      setAppliedFeedback('Top 10 Dezenas Preditivas aplicadas no volante com sucesso!');
      setTimeout(() => setAppliedFeedback(null), 4000);
    }
  };

  const chartData = useMemo(() => {
    return top10.map((d) => ({
      name: d.dezenaPad,
      dezena: d.numero,
      probabilidade: d.probabilidadePreditiva,
      freq200: d.frequenciaPercentual,
      slope: Number((d.coeficienteAngular * 10).toFixed(1)),
      potencial: d.potencialRetorno,
      atraso: d.atrasoAtual,
      isCycle: d.fatorCiclo,
    }));
  }, [top10]);

  return (
    <div className="bg-slate-900/95 border-2 border-amber-500/30 rounded-3xl p-5 sm:p-7 shadow-2xl space-y-6 relative overflow-hidden backdrop-blur-md">
      {/* Background Decorative Glow */}
      <div className="absolute -top-24 -right-24 w-80 h-80 bg-gradient-to-br from-amber-500/10 via-emerald-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800 relative z-10">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-amber-400 via-amber-500 to-yellow-600 text-slate-950 font-black shadow-lg shadow-amber-500/25 shrink-0">
            <Brain className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-lg sm:text-xl font-black text-white tracking-tight flex items-center gap-2">
                <span>Probabilidade Preditiva de Saída</span>
                <span className="text-amber-400 font-mono text-sm font-black">• Regressão OLS 200 Concursos</span>
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold">
                Concurso #{latestDraw.concurso + 1}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Top 10 Dezenas com maior potencial de retorno no próximo concurso calculadas por <strong>Regressão Linear dos Mínimos Quadrados (OLS)</strong> sobre 10 janelas temporais de 20 concursos.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleApplyTop10}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs transition cursor-pointer shadow-lg shadow-amber-500/25 active:scale-95"
          >
            <Sparkles className="w-4 h-4 text-slate-950" />
            <span>Aplicar Top 10 no Volante</span>
          </button>
        </div>
      </div>

      {appliedFeedback && (
        <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2 font-bold animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{appliedFeedback}</span>
        </div>
      )}

      {/* KPI Highlights das 3 Primeiras Dezenas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {top10.slice(0, 3).map((item, idx) => (
          <div
            key={item.numero}
            onClick={() => setSelectedDezenaDetail(item)}
            className={`p-3.5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${
              idx === 0
                ? 'bg-gradient-to-br from-amber-500/20 via-slate-900 to-amber-950/30 border-amber-500/50 shadow-lg shadow-amber-500/10'
                : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-wider">
                {idx === 0 ? '🥇 1º Maior Potencial' : idx === 1 ? '🥈 2º Maior Potencial' : '🥉 3º Maior Potencial'}
              </span>
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800">
                Atraso: {item.atrasoAtual}
              </span>
            </div>

            <div className="flex items-baseline justify-between mt-2">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-amber-400 text-slate-950 font-black text-sm shadow-md shadow-amber-500/30">
                  {item.dezenaPad}
                </span>
                <div>
                  <span className="text-xl font-black text-white font-mono">
                    {item.probabilidadePreditiva}%
                  </span>
                  <span className="text-[10px] text-slate-400 block font-sans">
                    Probabilidade Preditiva
                  </span>
                </div>
              </div>

              <div className="text-right font-mono text-[11px]">
                <span className={`font-bold ${item.coeficienteAngular >= 0 ? 'text-emerald-400' : 'text-slate-400'}`}>
                  β = {item.coeficienteAngular >= 0 ? '+' : ''}{item.coeficienteAngular}
                </span>
                <span className="text-[10px] text-slate-500 block">
                  R² = {item.rQuadrado}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recharts Composed Chart: Top 10 Dezenas */}
      <div className="bg-slate-950/80 p-4 sm:p-5 rounded-2xl border border-slate-800 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <span className="font-bold text-white">Curva de Probabilidade Preditiva das Top 10 Dezenas</span>
          </div>
          <div className="flex items-center gap-4 text-[11px] text-slate-400 font-mono">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-gradient-to-r from-amber-400 to-yellow-500" />
              <span>Probabilidade Preditiva (%)</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-emerald-400" />
              <span>Média Teórica Caixa (60%)</span>
            </span>
          </div>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 15, right: 15, left: -15, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
              <XAxis
                dataKey="name"
                stroke="#94a3b8"
                fontSize={12}
                tickLine={false}
                tick={{ fill: '#cbd5e1', fontWeight: 'bold' }}
              />
              <YAxis
                domain={[40, 95]}
                stroke="#94a3b8"
                fontSize={11}
                tickFormatter={(val) => `${val}%`}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-slate-900/95 border-2 border-amber-500/40 p-3 rounded-xl shadow-2xl text-xs space-y-1.5 font-mono z-50">
                        <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-1">
                          <span className="font-black text-amber-400 text-sm">
                            Dezena {data.name}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold">
                            {data.potencial}
                          </span>
                        </div>
                        <div className="flex justify-between gap-4 text-slate-300">
                          <span>Probabilidade Preditiva:</span>
                          <strong className="text-white text-sm">{data.probabilidade}%</strong>
                        </div>
                        <div className="flex justify-between gap-4 text-slate-400">
                          <span>Freq. Real (200 conc.):</span>
                          <span className="text-slate-200">{data.freq200}%</span>
                        </div>
                        <div className="flex justify-between gap-4 text-slate-400">
                          <span>Atraso Atual:</span>
                          <span className="text-amber-300">{data.atraso} sorteio(s)</span>
                        </div>
                        {data.isCycle && (
                          <div className="text-[10px] text-emerald-300 font-bold pt-1 border-t border-slate-800">
                            ★ Pendente de fechar o ciclo da Lotofácil
                          </div>
                        )}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <ReferenceLine
                y={60}
                stroke="#10b981"
                strokeDasharray="4 4"
                label={{
                  value: 'Referência Caixa 60%',
                  fill: '#10b981',
                  fontSize: 10,
                  position: 'insideBottomRight',
                }}
              />
              <Bar dataKey="probabilidade" radius={[6, 6, 0, 0]} maxBarSize={38}>
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={index < 3 ? '#f59e0b' : index < 7 ? '#d97706' : '#b45309'}
                  />
                ))}
              </Bar>
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tabela Comparativa Detalhada das 10 Dezenas */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-300 font-mono">
          <thead>
            <tr className="border-b border-slate-800 text-[11px] text-slate-400 uppercase tracking-wider">
              <th className="py-2.5 px-3">Posição</th>
              <th className="py-2.5 px-3">Dezena</th>
              <th className="py-2.5 px-3">Probabilidade</th>
              <th className="py-2.5 px-3">Tendência (Slope β)</th>
              <th className="py-2.5 px-3">Aderência R²</th>
              <th className="py-2.5 px-3">Freq. 200</th>
              <th className="py-2.5 px-3">Atraso</th>
              <th className="py-2.5 px-3 text-right">Potencial de Retorno</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {top10.map((item, idx) => (
              <tr
                key={item.numero}
                className="hover:bg-slate-800/30 transition cursor-pointer"
                onClick={() => setSelectedDezenaDetail(item)}
              >
                <td className="py-2 px-3 text-slate-500 font-bold">
                  #{(idx + 1).toString().padStart(2, '0')}
                </td>
                <td className="py-2 px-3">
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-amber-400 text-slate-950 font-black text-xs">
                    {item.dezenaPad}
                  </span>
                </td>
                <td className="py-2 px-3 font-bold text-white text-sm">
                  {item.probabilidadePreditiva}%
                </td>
                <td className="py-2 px-3">
                  <span
                    className={`font-semibold ${
                      item.coeficienteAngular > 0 ? 'text-emerald-400' : 'text-slate-400'
                    }`}
                  >
                    {item.coeficienteAngular > 0 ? '+' : ''}
                    {item.coeficienteAngular} ({item.tendencia})
                  </span>
                </td>
                <td className="py-2 px-3 text-slate-400">
                  {item.rQuadrado}
                </td>
                <td className="py-2 px-3 text-slate-300">
                  {item.frequencia200}/200 ({item.frequenciaPercentual}%)
                </td>
                <td className="py-2 px-3">
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      item.atrasoAtual >= 3
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        : item.atrasoAtual === 0
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {item.atrasoAtual === 0 ? 'Saiu no Último' : `${item.atrasoAtual} atraso`}
                  </span>
                </td>
                <td className="py-2 px-3 text-right">
                  <span
                    className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      item.potencialRetorno.includes('Ouro')
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : item.potencialRetorno.includes('Alto')
                        ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                        : 'bg-slate-800 text-slate-300 border border-slate-700'
                    }`}
                  >
                    {item.potencialRetorno}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Nota Metodológica Explicativa */}
      <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 text-[11px] text-slate-400 space-y-1">
        <span className="font-bold text-slate-300 flex items-center gap-1.5">
          <Activity className="w-3.5 h-3.5 text-amber-400" />
          Metodologia Matemática (Regressão Linear dos Mínimos Quadrados - OLS):
        </span>
        <p className="leading-relaxed">
          A regressão linear modela a taxa de aceleração da frequência temporal de cada dezena através de 10 blocos de 20 concursos consecutivos. O coeficiente angular (&beta;) afere se a dezena está em fase de aquecimento ou desaceleração, enquanto o coeficiente de determinação (R²) mensura a confiabilidade preditiva do ajuste aos dados reais da Caixa.
        </p>
      </div>
    </div>
  );
};
