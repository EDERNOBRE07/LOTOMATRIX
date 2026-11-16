import React, { useMemo, useState, useEffect } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import {
  Activity,
  Award,
  TrendingUp,
  TrendingDown,
  FileDown,
  CheckCircle2,
  Trophy,
  Layers,
} from 'lucide-react';
import { GameTicket, LotofacilDraw } from '../types/lotofacil';
import { CONCURSO_ATUAL } from '../data/lotofacilData';
import { countMatches, VALOR_APOSTA_LOTOFACIL } from '../services/combinatorics';
import { getHistorical100Draws } from '../services/historical100Draws';
import { getSavedFechamentos } from '../services/savedFechamentosStorage';
import { formatCurrencyBRL } from '../services/ticketRoiAudit';
import { AnimatedCurrencyValue, AnimatedNumberValue } from './AnimatedCurrencyValue';

interface EstatisticasPerformanceGlobalProps {
  tickets?: GameTicket[];
  latestDraw?: LotofacilDraw;
  onExportPDF?: () => void;
  pdfExportSuccess?: string | null;
}

export const EstatisticasPerformanceGlobal: React.FC<EstatisticasPerformanceGlobalProps> = ({
  tickets = [],
  latestDraw = CONCURSO_ATUAL,
  onExportPDF,
  pdfExportSuccess,
}) => {
  const shouldReduceMotion = useReducedMotion();
  const [storageVersion, setStorageVersion] = useState(0);

  useEffect(() => {
    const refresh = () => setStorageVersion((v) => v + 1);
    window.addEventListener('lotosniper-saved-fechamentos-updated', refresh);
    window.addEventListener('lotosniper-saved-tickets-updated', refresh);
    window.addEventListener('lotosniper-backup-restored', refresh);
    return () => {
      window.removeEventListener('lotosniper-saved-fechamentos-updated', refresh);
      window.removeEventListener('lotosniper-saved-tickets-updated', refresh);
      window.removeEventListener('lotosniper-backup-restored', refresh);
    };
  }, []);

  const apostaMinima = useMemo(() => {
    try {
      const saved = localStorage.getItem('lotosniper_roi_aposta_minima');
      const val = saved ? parseFloat(saved) : VALOR_APOSTA_LOTOFACIL;
      return Number.isFinite(val) && val > 0 ? val : VALOR_APOSTA_LOTOFACIL;
    } catch {
      return VALOR_APOSTA_LOTOFACIL;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageVersion]);

  // Consolida todos os jogos salvos (fechamentos arquivados + jogos ativos sem duplicação desnecessária)
  const consolidatedTickets = useMemo(() => {
    const savedClosures = getSavedFechamentos();
    const closureTickets = savedClosures.flatMap((f) =>
      Array.isArray(f.tickets) ? f.tickets : []
    );

    if (closureTickets.length === 0) {
      return Array.isArray(tickets) ? tickets : [];
    }
    if (!tickets || tickets.length === 0) {
      return closureTickets;
    }

    // Mescla sem duplicar sequências idênticas de dezenas
    const seenKeys = new Set<string>();
    const merged: GameTicket[] = [];
    [...tickets, ...closureTickets].forEach((t) => {
      const dez = Array.isArray(t.dezenas) ? [...t.dezenas].sort((a, b) => a - b) : [];
      if (dez.length === 0) return;
      const key = dez.join('-');
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        merged.push(t);
      }
    });
    return merged;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tickets, storageVersion]);

  const metrics = useMemo(() => {
    const last5Draws = getHistorical100Draws(latestDraw).slice(0, 5);
    const chronological5 = [...last5Draws].reverse();

    const custoPorRodada = consolidatedTickets.reduce((acc, t) => {
      const len = Array.isArray(t.dezenas) ? t.dezenas.length : 15;
      if (len === 16) return acc + apostaMinima * 16;
      if (len === 17) return acc + apostaMinima * 136;
      if (len === 18) return acc + apostaMinima * 816;
      return acc + apostaMinima;
    }, 0);

    // 1. Bilhetes premiados no concurso mais recente (latestDraw)
    let latestPremiadosCount = 0;
    let latestRetornoBruto = 0;
    let bestLatestHits = 0;
    const latestFaixas = { 15: 0, 14: 0, 13: 0, 12: 0, 11: 0 };

    const p15Latest = latestDraw.premiacoes?.faixa15?.valor || 1800000;
    const p14Latest = latestDraw.premiacoes?.faixa14?.valor || 1500;
    const p13Latest = latestDraw.premiacoes?.faixa13?.valor || 35;
    const p12Latest = latestDraw.premiacoes?.faixa12?.valor || 14;
    const p11Latest = latestDraw.premiacoes?.faixa11?.valor || 7;

    consolidatedTickets.forEach((t) => {
      const hits = countMatches(t.dezenas || [], latestDraw.dezenas || []);
      if (hits > bestLatestHits) bestLatestHits = hits;
      if (hits >= 11) {
        latestPremiadosCount++;
        if (hits === 15) {
          latestFaixas[15]++;
          latestRetornoBruto += p15Latest;
        } else if (hits === 14) {
          latestFaixas[14]++;
          latestRetornoBruto += p14Latest;
        } else if (hits === 13) {
          latestFaixas[13]++;
          latestRetornoBruto += p13Latest;
        } else if (hits === 12) {
          latestFaixas[12]++;
          latestRetornoBruto += p12Latest;
        } else {
          latestFaixas[11]++;
          latestRetornoBruto += p11Latest;
        }
      }
    });

    // 2. Evolução do Saldo Líquido nas últimas 5 rodadas + ROI acumulado
    let custoAcumulado = 0;
    let retornoAcumulado = 0;

    const chartSeries = chronological5.map((draw) => {
      let retornoRodada = 0;
      let premiadosRodada = 0;

      const p15 = draw.premiacoes?.faixa15?.valor || 1800000;
      const p14 = draw.premiacoes?.faixa14?.valor || 1500;
      const p13 = draw.premiacoes?.faixa13?.valor || 35;
      const p12 = draw.premiacoes?.faixa12?.valor || 14;
      const p11 = draw.premiacoes?.faixa11?.valor || 7;

      consolidatedTickets.forEach((t) => {
        const hits = countMatches(t.dezenas || [], draw.dezenas || []);
        if (hits >= 11) {
          premiadosRodada++;
          if (hits === 15) retornoRodada += p15;
          else if (hits === 14) retornoRodada += p14;
          else if (hits === 13) retornoRodada += p13;
          else if (hits === 12) retornoRodada += p12;
          else retornoRodada += p11;
        }
      });

      custoAcumulado += custoPorRodada;
      retornoAcumulado += retornoRodada;
      const saldoRodada = retornoRodada - custoPorRodada;
      const saldoLiquidoAcumulado = retornoAcumulado - custoAcumulado;

      return {
        concurso: `#${draw.concurso}`,
        data: draw.data,
        custoRodada: Math.round(custoPorRodada * 100) / 100,
        retornoRodada: Math.round(retornoRodada * 100) / 100,
        saldoRodada: Math.round(saldoRodada * 100) / 100,
        saldoLiquidoAcumulado: Math.round(saldoLiquidoAcumulado * 100) / 100,
        premiadosRodada,
      };
    });

    const saldoLiquidoTotal = retornoAcumulado - custoAcumulado;
    const roiAcumuladoPercent =
      custoAcumulado > 0 ? (saldoLiquidoTotal / custoAcumulado) * 100 : 0;

    return {
      totalJogos: consolidatedTickets.length,
      custoAcumulado,
      retornoAcumulado,
      saldoLiquidoTotal,
      roiAcumuladoPercent,
      latestPremiadosCount,
      latestRetornoBruto,
      bestLatestHits,
      latestFaixas,
      chartSeries,
    };
  }, [consolidatedTickets, latestDraw, apostaMinima]);

  const isRoiPositive = metrics.roiAcumuladoPercent >= 0;

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;
    const pt = payload[0]?.payload;
    if (!pt) return null;
    const positive = pt.saldoLiquidoAcumulado >= 0;
    return (
      <div className="bg-slate-950/95 border border-slate-700 rounded-xl p-3 shadow-2xl text-xs space-y-1.5 min-w-[210px]">
        <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
          <strong className="font-mono text-white">{pt.concurso}</strong>
          <span className="font-mono text-[10px] text-slate-400">{pt.data}</span>
        </div>
        <div className="flex items-center justify-between font-mono text-[11px] tabular-nums">
          <span className="text-slate-400">Premiados:</span>
          <strong className="text-emerald-300">{pt.premiadosRodada} bilhete(s)</strong>
        </div>
        <div className="flex items-center justify-between font-mono text-[11px] tabular-nums">
          <span className="text-slate-400">Saldo da Rodada:</span>
          <strong className={pt.saldoRodada >= 0 ? 'text-cyan-300' : 'text-rose-400'}>
            {pt.saldoRodada >= 0 ? '+' : ''}
            {formatCurrencyBRL(pt.saldoRodada)}
          </strong>
        </div>
        <div className="flex items-center justify-between font-mono text-[11px] tabular-nums pt-1 border-t border-slate-800">
          <span className="text-slate-300 font-semibold">Saldo Acumulado:</span>
          <strong className={positive ? 'text-emerald-400' : 'text-rose-400'}>
            {positive ? '+' : ''}
            {formatCurrencyBRL(pt.saldoLiquidoAcumulado)}
          </strong>
        </div>
      </div>
    );
  };

  return (
    <section
      aria-label="Estatísticas de Performance Global"
      className="bg-slate-900/90 rounded-2xl border border-slate-800 p-5 shadow-xl space-y-4"
    >
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-slate-800">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/35 flex items-center justify-center text-emerald-400 shrink-0">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base sm:text-lg font-bold text-white font-sans tracking-tight">
                Estatísticas de Performance Global
              </h3>
              <span className="text-[11px] font-mono tabular-nums px-2 py-0.5 rounded-md bg-slate-950 border border-slate-800 text-slate-300">
                {metrics.totalJogos} jogo(s) consolidado(s)
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Visão executiva do ROI acumulado, premiações do concurso #{latestDraw.concurso} e evolução do saldo líquido nas últimas 5 rodadas.
            </p>
          </div>
        </div>

        {onExportPDF && (
          <button
            type="button"
            onClick={onExportPDF}
            disabled={metrics.totalJogos === 0}
            className={`px-3.5 py-2 rounded-xl border text-xs font-bold flex items-center gap-2 whitespace-nowrap transition self-start sm:self-center ${
              metrics.totalJogos === 0
                ? 'bg-slate-950 text-slate-500 border-slate-800 cursor-not-allowed'
                : 'bg-amber-400 hover:bg-amber-300 text-slate-950 border-amber-300 cursor-pointer shadow-sm active:scale-95'
            }`}
            title="Exportar relatório completo em PDF (branding LotoSniper, grade de resultados, dezenas premiadas e métricas ROI)"
          >
            <FileDown className="w-4 h-4 shrink-0" />
            <span>Exportar Relatório PDF</span>
          </button>
        )}
      </div>

      {pdfExportSuccess && (
        <div className="bg-emerald-500/15 border border-emerald-500/40 text-emerald-200 text-xs px-4 py-2 rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{pdfExportSuccess}</span>
        </div>
      )}

      {/* Grid Principal: 3 KPIs + Gráfico de Linha Recharts (5 rodadas) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        {/* Coluna Esquerda: KPIs Consolidados */}
        <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3">
          {/* Card 1: ROI Acumulado de Todos os Jogos */}
          <motion.div
            key="global-roi"
            initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className={`rounded-xl border p-4 flex flex-col justify-between gap-2 ${
              isRoiPositive
                ? 'bg-emerald-950/25 border-emerald-500/45'
                : 'bg-rose-950/25 border-rose-500/40'
            }`}
          >
            <div className="flex items-center justify-between text-xs">
              <span className="font-sans font-semibold text-slate-300">
                ROI Acumulado (5 Rodadas)
              </span>
              <span
                className={`inline-flex items-center gap-1 font-mono font-bold text-[11px] ${
                  isRoiPositive ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {isRoiPositive ? (
                  <TrendingUp className="w-4 h-4" />
                ) : (
                  <TrendingDown className="w-4 h-4" />
                )}
                <span>{isRoiPositive ? 'Superávit' : 'Déficit'}</span>
              </span>
            </div>

            <div className="flex items-baseline justify-between gap-2 flex-wrap">
              <strong
                className={`text-2xl font-black font-mono tabular-nums tracking-tight ${
                  isRoiPositive ? 'text-emerald-300' : 'text-rose-400'
                }`}
              >
                <AnimatedNumberValue value={metrics.roiAcumuladoPercent} decimals={1} signed suffix="%" />
              </strong>
              <span className="text-xs font-mono tabular-nums text-slate-300">
                Saldo:{' '}
                <strong className={metrics.saldoLiquidoTotal >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                  <AnimatedCurrencyValue value={metrics.saldoLiquidoTotal} signed />
                </strong>
              </span>
            </div>

            <div className="text-[11px] text-slate-400 font-mono tabular-nums pt-2 border-t border-slate-800/80 flex items-center justify-between">
              <span>Custo: <AnimatedCurrencyValue value={metrics.custoAcumulado} /></span>
              <span>Retorno: <AnimatedCurrencyValue value={metrics.retornoAcumulado} /></span>
            </div>
          </motion.div>

          {/* Card 2: Total de Bilhetes Premiados no Concurso Mais Recente */}
          <motion.div
            key="global-premiados"
            initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, delay: 0.06, ease: [0.16, 1, 0.3, 1] }}
            className="bg-slate-950/90 rounded-xl border border-slate-800 p-4 flex flex-col justify-between gap-2"
          >
            <div className="flex items-center justify-between text-xs">
              <span className="font-sans font-semibold text-slate-300 flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5 text-amber-400" />
                <span>Premiados no Concurso #{latestDraw.concurso}</span>
              </span>
              <span className="font-mono tabular-nums text-[11px] text-amber-300 font-bold">
                Máx: {metrics.bestLatestHits} pts
              </span>
            </div>

            <div className="flex items-baseline justify-between gap-2 flex-wrap">
              <strong className="text-2xl font-black font-mono tabular-nums text-white">
                <AnimatedNumberValue value={metrics.latestPremiadosCount} decimals={0} />{' '}
                <span className="text-xs font-sans font-semibold text-slate-400">
                  bilhete(s) premiado(s)
                </span>
              </strong>
              <span className="text-xs font-mono tabular-nums font-bold text-emerald-400">
                <AnimatedCurrencyValue value={metrics.latestRetornoBruto} />
              </span>
            </div>

            <div className="text-[11px] text-slate-400 font-mono tabular-nums pt-2 border-t border-slate-800/80 flex flex-wrap items-center gap-2">
              {metrics.latestFaixas[15] > 0 && <span className="text-amber-300 font-bold">{metrics.latestFaixas[15]}× 15pts</span>}
              {metrics.latestFaixas[14] > 0 && <span className="text-amber-300 font-bold">{metrics.latestFaixas[14]}× 14pts</span>}
              {metrics.latestFaixas[13] > 0 && <span className="text-emerald-300">{metrics.latestFaixas[13]}× 13pts</span>}
              {metrics.latestFaixas[12] > 0 && <span className="text-slate-300">{metrics.latestFaixas[12]}× 12pts</span>}
              {metrics.latestFaixas[11] > 0 && <span className="text-slate-300">{metrics.latestFaixas[11]}× 11pts</span>}
              {metrics.latestPremiadosCount === 0 && (
                <span>Nenhuma premiação 11+ no último sorteio</span>
              )}
            </div>
          </motion.div>
        </div>

        {/* Coluna Direita: Gráfico de Linha Recharts (Saldo Líquido nas Últimas 5 Rodadas) */}
        <div className="lg:col-span-7 bg-slate-950/90 rounded-xl border border-slate-800 p-4 flex flex-col justify-between gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-white font-sans flex items-center gap-1.5">
                <Award className="w-4 h-4 text-emerald-400" />
                <span>Evolução do Saldo Líquido (Últimas 5 Rodadas)</span>
              </h4>
              <span className="text-[11px] text-slate-400 font-mono">
                Saldo acumulado em R$ · Linha tracejada = ponto de equilíbrio (R$ 0,00)
              </span>
            </div>
            <div className="flex items-center gap-3 text-[11px] font-mono">
              <span className="inline-flex items-center gap-1.5 text-emerald-300">
                <span className="w-2.5 h-0.5 bg-emerald-400 inline-block" />
                Saldo Acumulado
              </span>
              <span className="inline-flex items-center gap-1.5 text-cyan-300">
                <span className="w-2.5 h-0.5 bg-cyan-400 inline-block" />
                Saldo da Rodada
              </span>
            </div>
          </div>

          {metrics.totalJogos === 0 ? (
            <div className="h-44 flex flex-col items-center justify-center text-center text-xs text-slate-400 gap-2 border border-dashed border-slate-800 rounded-xl">
              <Layers className="w-6 h-6 text-slate-600" />
              <span>Gere ou salve jogos para visualizar a curva de saldo líquido nas últimas 5 rodadas.</span>
            </div>
          ) : (
            <div className="w-full h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={metrics.chartSeries} margin={{ top: 8, right: 16, left: 4, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis
                    dataKey="concurso"
                    stroke="#64748b"
                    tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}
                    tickLine={{ stroke: '#334155' }}
                  />
                  <YAxis
                    stroke="#64748b"
                    tick={{ fill: '#94a3b8', fontSize: 10, fontFamily: 'JetBrains Mono, monospace' }}
                    tickLine={{ stroke: '#334155' }}
                    tickFormatter={(val) =>
                      Math.abs(val) >= 1000 ? `R$${(val / 1000).toFixed(1)}k` : `R$${val}`
                    }
                  />
                  <ReferenceLine y={0} stroke="#475569" strokeDasharray="4 4" />
                  <Tooltip content={<CustomTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="saldoLiquidoAcumulado"
                    name="Saldo Acumulado"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#0f172a' }}
                    activeDot={{ r: 6, fill: '#34d399' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="saldoRodada"
                    name="Saldo da Rodada"
                    stroke="#22d3ee"
                    strokeWidth={2}
                    strokeDasharray="4 2"
                    dot={{ r: 3, fill: '#22d3ee', stroke: '#0f172a', strokeWidth: 1.5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
