import React, { useEffect, useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import { TrendingUp, TrendingDown, ScatterChart as ScatterIcon, ArrowRight } from 'lucide-react';
import { GameTicket, LotofacilDraw } from '../types/lotofacil';
import { CONCURSO_ATUAL } from '../data/lotofacilData';
import { countMatches, VALOR_APOSTA_LOTOFACIL } from '../services/combinatorics';
import { getHistorical100Draws } from '../services/historical100Draws';
import { getSavedFechamentos } from '../services/savedFechamentosStorage';
import { formatCurrencyBRL, getTicketCostBRL } from '../services/ticketRoiAudit';

interface CorrelacaoCustoRetornoScatterRechartsProps {
  latestDraw?: LotofacilDraw;
  savedTickets?: GameTicket[];
  onGoToFechamento?: () => void;
}

export type ScatterPeriodDays = 7 | 15 | 30;

interface ScatterPoint {
  concurso: number;
  label: string;
  data: string;
  custoRodada: number;
  retornoRodada: number;
  custoAcumulado: number;
  retornoAcumulado: number;
  saldoAcumulado: number;
  roiAcumulado: number;
  melhorAcerto: number;
  premiadosRodada: number;
  bubbleSize: number;
}

function parseBrDate(dateStr?: string): Date | null {
  if (!dateStr) return null;
  const parts = String(dateStr).trim().split('/');
  if (parts.length !== 3) return null;
  const [dd, mm, yyyy] = parts.map((p) => parseInt(p, 10));
  if (!dd || !mm || !yyyy) return null;
  return new Date(yyyy, mm - 1, dd);
}

function computePearsonCorrelation(xs: number[], ys: number[]): number | null {
  const n = xs.length;
  if (n < 2) return null;
  const meanX = xs.reduce((a, b) => a + b, 0) / n;
  const meanY = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let denX = 0;
  let denY = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - meanX;
    const dy = ys[i] - meanY;
    num += dx * dy;
    denX += dx * dx;
    denY += dy * dy;
  }
  const denom = Math.sqrt(denX * denY);
  if (denom === 0) return 0;
  return num / denom;
}

export const CorrelacaoCustoRetornoScatterRecharts: React.FC<
  CorrelacaoCustoRetornoScatterRechartsProps
> = ({ latestDraw = CONCURSO_ATUAL, savedTickets = [], onGoToFechamento }) => {
  const [periodDays, setPeriodDays] = useState<ScatterPeriodDays>(30);
  const [refreshNonce, setRefreshNonce] = useState<number>(0);

  useEffect(() => {
    const refresh = () => setRefreshNonce((n) => n + 1);
    window.addEventListener('lotosniper-saved-fechamentos-updated', refresh);
    window.addEventListener('lotosniper-saved-tickets-updated', refresh);
    window.addEventListener('lotosniper-backup-restored', refresh);
    return () => {
      window.removeEventListener('lotosniper-saved-fechamentos-updated', refresh);
      window.removeEventListener('lotosniper-saved-tickets-updated', refresh);
      window.removeEventListener('lotosniper-backup-restored', refresh);
    };
  }, []);

  const consolidatedTickets = useMemo<GameTicket[]>(() => {
    void refreshNonce;
    const map = new Map<string, GameTicket>();
    const fechamentos = getSavedFechamentos();

    fechamentos.forEach((f) => {
      (f.tickets || []).forEach((t) => {
        if (!Array.isArray(t.dezenas) || t.dezenas.length < 15) return;
        const sig = [...t.dezenas].sort((a, b) => a - b).join('-');
        if (!map.has(sig)) map.set(sig, t);
      });
    });

    (savedTickets || []).forEach((t) => {
      if (!Array.isArray(t.dezenas) || t.dezenas.length < 15) return;
      const sig = [...t.dezenas].sort((a, b) => a - b).join('-');
      if (!map.has(sig)) map.set(sig, t);
    });

    return Array.from(map.values());
  }, [savedTickets, refreshNonce]);

  const scatterPoints = useMemo<ScatterPoint[]>(() => {
    if (consolidatedTickets.length === 0) return [];

    const all100 = getHistorical100Draws(latestDraw);
    const anchorDate = parseBrDate(latestDraw.data) || new Date();
    const cutoff = new Date(anchorDate);
    cutoff.setDate(cutoff.getDate() - periodDays);

    let filteredDraws = all100.filter((d) => {
      const dt = parseBrDate(d.data);
      return dt ? dt >= cutoff && dt <= anchorDate : false;
    });

    const minFallbackCount = periodDays === 7 ? 6 : periodDays === 15 ? 12 : 24;
    if (filteredDraws.length < minFallbackCount) {
      filteredDraws = all100.slice(0, minFallbackCount);
    }

    const chronological = [...filteredDraws].reverse();
    const custoBaseBatch = consolidatedTickets.reduce(
      (acc, t) => acc + getTicketCostBRL(t, VALOR_APOSTA_LOTOFACIL),
      0
    );

    let runningCost = 0;
    let runningReturn = 0;

    return chronological.map((draw) => {
      let retornoRodada = 0;
      let melhorAcerto = 0;
      let premiadosRodada = 0;

      for (const ticket of consolidatedTickets) {
        const hits = countMatches(ticket.dezenas, draw.dezenas);
        if (hits > melhorAcerto) melhorAcerto = hits;
        if (hits >= 11) {
          premiadosRodada++;
          if (hits === 15) retornoRodada += draw.premiacoes?.faixa15?.valor || 1800000;
          else if (hits === 14) retornoRodada += draw.premiacoes?.faixa14?.valor || 1500;
          else if (hits === 13) retornoRodada += draw.premiacoes?.faixa13?.valor || 35;
          else if (hits === 12) retornoRodada += draw.premiacoes?.faixa12?.valor || 14;
          else retornoRodada += draw.premiacoes?.faixa11?.valor || 7;
        }
      }

      runningCost += custoBaseBatch;
      runningReturn += retornoRodada;

      const saldoAcumulado = runningReturn - runningCost;
      const roiAcumulado =
        runningCost > 0 ? ((runningReturn - runningCost) / runningCost) * 100 : 0;

      return {
        concurso: draw.concurso,
        label: `#${draw.concurso}`,
        data: draw.data,
        custoRodada: Number(custoBaseBatch.toFixed(2)),
        retornoRodada: Number(retornoRodada.toFixed(2)),
        custoAcumulado: Number(runningCost.toFixed(2)),
        retornoAcumulado: Number(runningReturn.toFixed(2)),
        saldoAcumulado: Number(saldoAcumulado.toFixed(2)),
        roiAcumulado: Number(roiAcumulado.toFixed(1)),
        melhorAcerto,
        premiadosRodada,
        bubbleSize: Math.max(60, Math.min(220, 60 + premiadosRodada * 24 + (melhorAcerto >= 13 ? 50 : 0))),
      };
    });
  }, [consolidatedTickets, latestDraw, periodDays]);

  const positivePoints = useMemo(
    () => scatterPoints.filter((p) => p.retornoAcumulado >= p.custoAcumulado),
    [scatterPoints]
  );

  const negativePoints = useMemo(
    () => scatterPoints.filter((p) => p.retornoAcumulado < p.custoAcumulado),
    [scatterPoints]
  );

  const metrics = useMemo(() => {
    if (scatterPoints.length === 0) {
      return {
        custoTotal: 0,
        retornoTotal: 0,
        roiFinal: 0,
        pearson: null as number | null,
        avgCost: 0,
        concursosCount: 0,
      };
    }
    const last = scatterPoints[scatterPoints.length - 1];
    const pearson = computePearsonCorrelation(
      scatterPoints.map((p) => p.custoAcumulado),
      scatterPoints.map((p) => p.retornoAcumulado)
    );
    return {
      custoTotal: last.custoAcumulado,
      retornoTotal: last.retornoAcumulado,
      roiFinal: last.roiAcumulado,
      pearson,
      avgCost: last.custoAcumulado / 2,
      concursosCount: scatterPoints.length,
    };
  }, [scatterPoints]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || payload.length === 0) return null;
    const pt: ScatterPoint = payload[0].payload;
    return (
      <div className="bg-slate-950/95 border border-slate-700 rounded-xl p-3 shadow-2xl text-xs space-y-1.5 min-w-[235px]">
        <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-1.5">
          <span className="font-mono font-bold text-white">Concurso {pt.label}</span>
          <span className="font-mono text-[11px] text-slate-400">{pt.data}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-slate-400">Custo Acumulado:</span>
          <strong className="font-mono tabular-nums text-slate-200">
            {formatCurrencyBRL(pt.custoAcumulado)}
          </strong>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-slate-400">Retorno Real Acum.:</span>
          <strong className="font-mono tabular-nums text-emerald-400">
            {formatCurrencyBRL(pt.retornoAcumulado)}
          </strong>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-slate-400">Retorno da Rodada:</span>
          <strong className="font-mono tabular-nums text-amber-300">
            {formatCurrencyBRL(pt.retornoRodada)} ({pt.melhorAcerto} pts)
          </strong>
        </div>
        <div className="flex items-center justify-between gap-4 pt-1 border-t border-slate-800/80">
          <span className="text-slate-400">ROI Acumulado:</span>
          <strong
            className={`font-mono tabular-nums ${
              pt.roiAcumulado >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {pt.roiAcumulado >= 0 ? `+${pt.roiAcumulado.toFixed(1)}%` : `${pt.roiAcumulado.toFixed(1)}%`}
          </strong>
        </div>
      </div>
    );
  };

  return (
    <section
      aria-label="Correlação Custo Acumulado vs Retorno Financeiro Real"
      className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-5"
    >
      {/* Cabeçalho */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
            <ScatterIcon className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Dispersão Financeira (Recharts)</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">Janela de {periodDays} Dias</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">
              {consolidatedTickets.length} jogo(s) auditado(s)
            </span>
          </div>
          <h3 className="text-base sm:text-lg font-bold text-white">
            Correlação: Custo Acumulado vs. Retorno Financeiro Real
          </h3>
          <p className="text-xs text-slate-400 max-w-2xl">
            Avalia se a progressão de investimento acumulado dos bilhetes salvos acompanha ou supera o retorno financeiro real obtido nos sorteios do período selecionado.
          </p>
        </div>

        {/* Filtro de período: 7, 15 e 30 dias */}
        <div
          role="group"
          aria-label="Filtrar período da dispersão"
          className="inline-flex items-center p-1 bg-slate-950 border border-slate-800 rounded-xl shrink-0 self-start lg:self-center"
        >
          {([7, 15, 30] as ScatterPeriodDays[]).map((days) => (
            <button
              key={days}
              type="button"
              onClick={() => setPeriodDays(days)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-semibold transition cursor-pointer whitespace-nowrap shrink-0 ${
                periodDays === days
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {days} Dias
            </button>
          ))}
        </div>
      </div>

      {/* KPIs do Período */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <div className="bg-slate-950/75 border border-slate-800 rounded-xl p-3.5 space-y-1">
          <span className="text-xs text-slate-400 block">
            Custo Acumulado ({periodDays} dias)
          </span>
          <strong className="text-xl font-mono font-bold tabular-nums text-white block">
            {formatCurrencyBRL(metrics.custoTotal)}
          </strong>
        </div>

        <div className="bg-slate-950/75 border border-slate-800 rounded-xl p-3.5 space-y-1">
          <span className="text-xs text-slate-400 block">
            Retorno Financeiro Real
          </span>
          <strong className="text-xl font-mono font-bold tabular-nums text-emerald-400 block">
            {formatCurrencyBRL(metrics.retornoTotal)}
          </strong>
        </div>

        <div className="bg-slate-950/75 border border-slate-800 rounded-xl p-3.5 space-y-1">
          <span className="text-xs text-slate-400 block">
            Correlação de Pearson (r)
          </span>
          <strong className="text-xl font-mono font-bold tabular-nums text-sky-400 block">
            {metrics.pearson !== null ? metrics.pearson.toFixed(3) : '—'}
          </strong>
        </div>

        <div className="bg-slate-950/75 border border-slate-800 rounded-xl p-3.5 space-y-1">
          <span className="text-xs text-slate-400 block">ROI do Período</span>
          <div className="flex items-center gap-1.5">
            {metrics.roiFinal >= 0 ? (
              <TrendingUp className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <TrendingDown className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <strong
              className={`text-xl font-mono font-bold tabular-nums ${
                metrics.roiFinal >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {metrics.roiFinal > 0 ? '+' : ''}
              {metrics.roiFinal.toFixed(1)}%
            </strong>
          </div>
        </div>
      </div>

      {/* Área do Gráfico Scatter Plot */}
      {consolidatedTickets.length === 0 ? (
        <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-6 text-center space-y-3">
          <p className="text-sm font-bold text-white">
            Nenhum jogo salvo encontrado para plotar a correlação
          </p>
          <p className="text-xs text-slate-400 max-w-lg mx-auto">
            Gere e salve um fechamento na aba Estúdio de Fechamento para calcular o custo acumulado real e cruzar com as premiações dos últimos {periodDays} dias.
          </p>
          <button
            type="button"
            onClick={() => {
              if (onGoToFechamento) {
                onGoToFechamento();
              } else if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('switch-tab', { detail: { tab: 'fechamento' } }));
              }
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition cursor-pointer whitespace-nowrap shrink-0"
          >
            <span>Criar Primeiro Fechamento</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
            <span className="font-mono tabular-nums">
              {metrics.concursosCount} concurso(s) plotado(s) · Tamanho do ponto proporcional a bilhetes premiados
            </span>
            <div className="flex flex-wrap items-center gap-4">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                <span>Retorno ≥ Custo (Lucro)</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
                <span>Abaixo do Break-even</span>
              </span>
            </div>
          </div>

          <div className="w-full h-72">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 12, right: 18, bottom: 12, left: 6 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis
                  type="number"
                  dataKey="custoAcumulado"
                  name="Custo Acumulado"
                  stroke="#64748b"
                  tickFormatter={(v) => `R$${Math.round(v)}`}
                  tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}
                />
                <YAxis
                  type="number"
                  dataKey="retornoAcumulado"
                  name="Retorno Real"
                  stroke="#64748b"
                  tickFormatter={(v) => `R$${Math.round(v)}`}
                  tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}
                />
                <ZAxis type="number" dataKey="bubbleSize" range={[60, 220]} />
                <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3', stroke: '#475569' }} />
                {metrics.custoTotal > 0 && (
                  <ReferenceLine
                    segment={[
                      { x: 0, y: 0 },
                      { x: metrics.custoTotal, y: metrics.custoTotal },
                    ]}
                    stroke="#f59e0b"
                    strokeDasharray="4 4"
                    strokeWidth={1.5}
                    ifOverflow="extendDomain"
                  />
                )}
                <Scatter
                  name="Lucro (Retorno ≥ Custo)"
                  data={positivePoints}
                  fill="#10b981"
                  fillOpacity={0.85}
                />
                <Scatter
                  name="Abaixo do Break-even"
                  data={negativePoints}
                  fill="#f43f5e"
                  fillOpacity={0.85}
                />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </section>
  );
};
