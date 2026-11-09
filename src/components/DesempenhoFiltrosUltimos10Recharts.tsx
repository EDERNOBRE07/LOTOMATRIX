import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ReferenceArea,
} from 'recharts';
import { LotofacilDraw, FilterCriteria } from '../types/lotofacil';
import { CONCURSO_ATUAL, CRUZ_DEZENAS } from '../data/lotofacilData';
import { getHistoricalNDraws } from '../services/historical100Draws';
import {
  ShieldCheck,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Activity,
  Layers,
  Info,
  Calendar,
} from 'lucide-react';

interface DesempenhoFiltrosUltimos10RechartsProps {
  latestDraw?: LotofacilDraw;
  filters?: FilterCriteria;
}

export const DesempenhoFiltrosUltimos10Recharts: React.FC<DesempenhoFiltrosUltimos10RechartsProps> = ({
  latestDraw = CONCURSO_ATUAL,
  filters,
}) => {
  // Configuração dos filtros ativos no validador
  const cruzMin = filters?.cruzMin ?? 4;
  const cruzMax = filters?.cruzMax ?? 7;
  const isCruzAtiva = filters?.cruzAtiva !== false;

  const b1Min = filters?.bola1Min ?? 1;
  const b1Max = filters?.bola1Max ?? 4;
  const b15Min = filters?.bola15Min ?? 22;
  const b15Max = filters?.bola15Max ?? 25;
  const isExtremidadesAtiva = filters?.extremidadesAtiva !== false;

  // Toggle de visibilidade das séries no gráfico
  const [visibleSeries, setVisibleSeries] = useState<{
    cruz: boolean;
    bola1: boolean;
    bola15: boolean;
  }>({
    cruz: true,
    bola1: true,
    bola15: true,
  });

  // Carrega os 10 últimos concursos cronológicos (do mais antigo para o mais recente)
  const chartData = useMemo(() => {
    const drawsDesc = getHistoricalNDraws(10, latestDraw);
    const drawsAsc = [...drawsDesc].reverse();

    return drawsAsc.map((d) => {
      const sorted = [...d.dezenas].sort((a, b) => a - b);
      const b1 = sorted[0];
      const b15 = sorted[sorted.length - 1];
      const cruzCount = sorted.filter((num) => CRUZ_DEZENAS.includes(num)).length;

      const isCruzValido = cruzCount >= cruzMin && cruzCount <= cruzMax;
      const isCruzOuro = cruzCount >= 5 && cruzCount <= 6;
      const isB1Valido = b1 >= b1Min && b1 <= b1Max;
      const isB15Valido = b15 >= b15Min && b15 <= b15Max;
      const isAuditado = (!isCruzAtiva || isCruzValido) && (!isExtremidadesAtiva || (isB1Valido && isB15Valido));

      return {
        concurso: `#${d.concurso}`,
        concursoNum: d.concurso,
        data: d.data,
        cruzCount,
        bola1: b1,
        bola15: b15,
        isCruzValido,
        isCruzOuro,
        isB1Valido,
        isB15Valido,
        isAuditado,
        dezenas: sorted,
      };
    });
  }, [latestDraw, cruzMin, cruzMax, isCruzAtiva, b1Min, b1Max, b15Min, b15Max, isExtremidadesAtiva]);

  // Estatísticas agregadas dos últimos 10 concursos
  const summaryStats = useMemo(() => {
    const total = chartData.length;
    if (total === 0) return { cruzPercent: 0, cruzOuroPercent: 0, extremidadesPercent: 0, auditadoPercent: 0 };

    const cruzValidos = chartData.filter((d) => d.isCruzValido).length;
    const cruzOuro = chartData.filter((d) => d.isCruzOuro).length;
    const extremidadesValidos = chartData.filter((d) => d.isB1Valido && d.isB15Valido).length;
    const auditados = chartData.filter((d) => d.isAuditado).length;

    return {
      cruzPercent: Math.round((cruzValidos / total) * 100),
      cruzOuroPercent: Math.round((cruzOuro / total) * 100),
      extremidadesPercent: Math.round((extremidadesValidos / total) * 100),
      auditadoPercent: Math.round((auditados / total) * 100),
      cruzCountAvg: (chartData.reduce((acc, d) => acc + d.cruzCount, 0) / total).toFixed(1),
    };
  }, [chartData]);

  // Custom Tooltip Recharts com tema escuro e badges
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const dataPoint = payload[0].payload;
      return (
        <div className="bg-slate-900/95 border border-slate-700 p-3.5 rounded-xl shadow-2xl space-y-2 text-xs font-mono max-w-xs backdrop-blur-md">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="font-bold text-white text-sm">Concurso {dataPoint.concurso}</span>
            <span className="text-[11px] text-slate-400">{dataPoint.data}</span>
          </div>

          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between">
              <span className="text-sky-400 flex items-center gap-1">
                <span>✝ Cruz ({cruzMin}-{cruzMax}):</span>
              </span>
              <span className="font-bold text-white">
                {dataPoint.cruzCount} dezenas {dataPoint.isCruzOuro ? '★ Ouro' : dataPoint.isCruzValido ? '✓' : '⚠️'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-emerald-400">⚡ Bola 1 (01-04):</span>
              <span className="font-bold text-white">
                {dataPoint.bola1.toString().padStart(2, '0')} {dataPoint.isB1Valido ? '✓' : '⚠️ Fora'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-amber-400">🎯 Bola 15 (22-25):</span>
              <span className="font-bold text-white">
                {dataPoint.bola15.toString().padStart(2, '0')} {dataPoint.isB15Valido ? '✓' : '⚠️ Fora'}
              </span>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
            <span className="text-[10px] text-slate-400">Status Validador:</span>
            {dataPoint.isAuditado ? (
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                Auditado 100% OK
              </span>
            ) : (
              <span className="text-[10px] font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/30">
                Fora do Padrão
              </span>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-6 shadow-xl">
      {/* Header com título e selo */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-sky-500/20 to-blue-600/20 border border-sky-500/40 text-sky-400 shadow-sm">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span>Desempenho dos Últimos 10 Concursos: Cruz & Extremidades</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Recharts Live
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Auditoria visual da estabilidade estatística das regras de Cruz da Lotofácil (Linha 3 / Coluna 3) e Bolas Extremas (Bola 1 e 15).
            </p>
          </div>
        </div>

        {/* Badge de Regularidade Canônica */}
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs font-mono font-bold px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 shadow-sm">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Conformidade: {summaryStats.auditadoPercent}%</span>
          </span>
        </div>
      </div>

      {/* KPI Cards de Resumo */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Cruz da Lotofácil */}
        <div className="bg-slate-950/70 border border-sky-500/30 rounded-xl p-3.5 space-y-1">
          <span className="text-[11px] text-sky-300 flex items-center gap-1 font-semibold">
            <span>✝ Cruz (4 a 7 dezenas)</span>
          </span>
          <div className="text-xl font-bold font-mono text-white flex items-baseline gap-1.5">
            <span>{summaryStats.cruzPercent}%</span>
            <span className="text-[10px] text-slate-400 font-normal">dos concursos</span>
          </div>
          <span className="text-[10px] text-sky-400/90 font-mono block">
            Média: {summaryStats.cruzCountAvg} dezenas/concurso
          </span>
        </div>

        {/* Zona de Ouro da Cruz */}
        <div className="bg-slate-950/70 border border-blue-500/30 rounded-xl p-3.5 space-y-1">
          <span className="text-[11px] text-blue-300 flex items-center gap-1 font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            <span>Zona de Ouro (5-6)</span>
          </span>
          <div className="text-xl font-bold font-mono text-white flex items-baseline gap-1.5">
            <span>{summaryStats.cruzOuroPercent}%</span>
            <span className="text-[10px] text-slate-400 font-normal">alta densidade</span>
          </div>
          <span className="text-[10px] text-blue-400/90 font-mono block">
            Meta canônica prioritária
          </span>
        </div>

        {/* Bolas Extremas */}
        <div className="bg-slate-950/70 border border-emerald-500/30 rounded-xl p-3.5 space-y-1">
          <span className="text-[11px] text-emerald-300 flex items-center gap-1 font-semibold">
            <span>⚡ Bolas Extremas</span>
          </span>
          <div className="text-xl font-bold font-mono text-white flex items-baseline gap-1.5">
            <span>{summaryStats.extremidadesPercent}%</span>
            <span className="text-[10px] text-slate-400 font-normal">em conformidade</span>
          </div>
          <span className="text-[10px] text-emerald-400/90 font-mono block">
            B1 [01-04] • B15 [22-25]
          </span>
        </div>

        {/* Selo Validador */}
        <div className="bg-slate-950/70 border border-amber-500/30 rounded-xl p-3.5 space-y-1">
          <span className="text-[11px] text-amber-300 flex items-center gap-1 font-semibold">
            <span>🛡️ Validação Conjunta</span>
          </span>
          <div className="text-xl font-bold font-mono text-white flex items-baseline gap-1.5">
            <span>{summaryStats.auditadoPercent}%</span>
            <span className="text-[10px] text-slate-400 font-normal">Auditados</span>
          </div>
          <span className="text-[10px] text-amber-400/90 font-mono block">
            Estabilidade Estatística Alta
          </span>
        </div>
      </div>

      {/* Controles de Visibilidade das Linhas */}
      <div className="flex items-center justify-between gap-3 flex-wrap text-xs">
        <span className="text-slate-400 font-mono text-[11px]">Séries Exibidas:</span>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setVisibleSeries((prev) => ({ ...prev, cruz: !prev.cruz }))}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition cursor-pointer ${
              visibleSeries.cruz
                ? 'bg-sky-500/20 text-sky-200 border-sky-500/50 shadow-sm'
                : 'bg-slate-950 text-slate-500 border-slate-800'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-sky-400"></span>
            <span>Cruz da Lotofácil (4-7)</span>
          </button>

          <button
            type="button"
            onClick={() => setVisibleSeries((prev) => ({ ...prev, bola1: !prev.bola1 }))}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition cursor-pointer ${
              visibleSeries.bola1
                ? 'bg-emerald-500/20 text-emerald-200 border-emerald-500/50 shadow-sm'
                : 'bg-slate-950 text-slate-500 border-slate-800'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
            <span>Bola 1 (01-04)</span>
          </button>

          <button
            type="button"
            onClick={() => setVisibleSeries((prev) => ({ ...prev, bola15: !prev.bola15 }))}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition cursor-pointer ${
              visibleSeries.bola15
                ? 'bg-amber-500/20 text-amber-200 border-amber-500/50 shadow-sm'
                : 'bg-slate-950 text-slate-500 border-slate-800'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
            <span>Bola 15 (22-25)</span>
          </button>
        </div>
      </div>

      {/* Gráfico de Linha Interativo com Recharts */}
      <div className="w-full h-72 sm:h-80 bg-slate-950/60 rounded-xl p-2 sm:p-4 border border-slate-800/80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 15, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="concurso" stroke="#64748b" tick={{ fontSize: 11, fill: '#94a3b8' }} />
            <YAxis
              domain={[0, 25]}
              ticks={[0, 4, 8, 12, 16, 20, 25]}
              stroke="#64748b"
              tick={{ fontSize: 11, fill: '#94a3b8' }}
            />
            <Tooltip content={<CustomTooltip />} />

            {/* Linhas de Referência dos Limites Canônicos */}
            {/* Faixa Ouro da Cruz: 5 a 6 dezenas */}
            <ReferenceArea y1={5} y2={6} fill="#0284c7" fillOpacity={0.12} stroke="#38bdf8" strokeDasharray="2 2" />
            {/* Limite Bola 1 (Máximo 4) */}
            <ReferenceLine y={4} stroke="#10b981" strokeDasharray="3 3" strokeOpacity={0.5} label={{ value: 'Teto Bola 1 (04)', fill: '#10b981', fontSize: 10, position: 'insideTopRight' }} />
            {/* Limite Bola 15 (Mínimo 22) */}
            <ReferenceLine y={22} stroke="#f59e0b" strokeDasharray="3 3" strokeOpacity={0.5} label={{ value: 'Piso Bola 15 (22)', fill: '#f59e0b', fontSize: 10, position: 'insideBottomRight' }} />

            {/* Linha 1: Dezenas na Cruz */}
            {visibleSeries.cruz && (
              <Line
                type="monotone"
                dataKey="cruzCount"
                name="Cruz da Lotofácil"
                stroke="#38bdf8"
                strokeWidth={3}
                dot={{ r: 5, fill: '#38bdf8', stroke: '#0f172a', strokeWidth: 2 }}
                activeDot={{ r: 7, fill: '#60a5fa' }}
              />
            )}

            {/* Linha 2: Bola 1 */}
            {visibleSeries.bola1 && (
              <Line
                type="monotone"
                dataKey="bola1"
                name="Bola 1 (Início)"
                stroke="#10b981"
                strokeWidth={2.5}
                dot={{ r: 4, fill: '#10b981', stroke: '#0f172a', strokeWidth: 1.5 }}
                activeDot={{ r: 6, fill: '#34d399' }}
              />
            )}

            {/* Linha 3: Bola 15 */}
            {visibleSeries.bola15 && (
              <Line
                type="monotone"
                dataKey="bola15"
                name="Bola 15 (Final)"
                stroke="#f59e0b"
                strokeWidth={2.5}
                dot={{ r: 4, fill: '#f59e0b', stroke: '#0f172a', strokeWidth: 1.5 }}
                activeDot={{ r: 6, fill: '#fbbf24' }}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Relação dos Últimos 10 Concursos com Selos Auditados */}
      <div className="space-y-2 pt-2">
        <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          <span>Tabela Cronológica dos 10 Últimos Concursos Auditados:</span>
        </h4>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 text-[11px]">
                <th className="py-2 px-2.5">Concurso</th>
                <th className="py-2 px-2.5">Data</th>
                <th className="py-2 px-2.5">Dezenas na Cruz</th>
                <th className="py-2 px-2.5">Bolas Extremas</th>
                <th className="py-2 px-2.5">Selo Validador</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850">
              {chartData.map((d) => (
                <tr key={d.concursoNum} className="hover:bg-slate-800/40 transition">
                  <td className="py-2 px-2.5 font-bold text-white">{d.concurso}</td>
                  <td className="py-2 px-2.5 text-slate-400 text-[11px]">{d.data}</td>
                  <td className="py-2 px-2.5">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold ${
                        d.isCruzOuro
                          ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                          : d.isCruzValido
                          ? 'bg-sky-500/10 text-sky-300 border border-sky-500/20'
                          : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      }`}
                    >
                      {d.cruzCount} dezenas {d.isCruzOuro && '★ Zona Ouro'}
                    </span>
                  </td>
                  <td className="py-2 px-2.5">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] ${
                        d.isB1Valido && d.isB15Valido
                          ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                          : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      }`}
                    >
                      B1: {d.bola1.toString().padStart(2, '0')} | B15: {d.bola15.toString().padStart(2, '0')}
                    </span>
                  </td>
                  <td className="py-2 px-2.5">
                    {d.isAuditado ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        <span>Auditado</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/30">
                        <AlertTriangle className="w-3 h-3 text-rose-400" />
                        <span>Fora do Padrão</span>
                      </span>
                    )}
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
