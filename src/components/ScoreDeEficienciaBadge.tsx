import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { GameTicket, LotofacilDraw } from '../types/lotofacil';
import { countMatches, VALOR_APOSTA_LOTOFACIL } from '../services/combinatorics';
import { formatCurrencyBRL, getTicketCostBRL } from '../services/ticketRoiAudit';

export interface ConferenceEfficiencyResult {
  custoBRL: number;
  premioBRL: number;
  saldoBRL: number;
  roiPercent: number;
  isPositiveROI: boolean;
  scoreEficiencia: number;
  hits: number;
}

export function getDrawPrizeForHits(
  hits: number,
  premiacoes?: LotofacilDraw['premiacoes']
): number {
  if (hits === 15) return premiacoes?.faixa15?.valor || 1800000;
  if (hits === 14) return premiacoes?.faixa14?.valor || 1500;
  if (hits === 13) return premiacoes?.faixa13?.valor || 35;
  if (hits === 12) return premiacoes?.faixa12?.valor || 14;
  if (hits === 11) return premiacoes?.faixa11?.valor || 7;
  return 0;
}

export function evaluateTicketConferenceEfficiency(
  ticket: GameTicket,
  conferirDezenas: number[],
  premiacoes?: LotofacilDraw['premiacoes'],
  baseCost: number = VALOR_APOSTA_LOTOFACIL
): ConferenceEfficiencyResult {
  const dezenas = Array.isArray(ticket?.dezenas) ? ticket.dezenas : [];
  const conferirSet = new Set(conferirDezenas);
  const hits =
    conferirDezenas.length === 15 && dezenas.length === 15
      ? countMatches(dezenas, conferirDezenas)
      : dezenas.filter((n) => conferirSet.has(n)).length;

  const custoBRL = getTicketCostBRL(ticket, baseCost);
  const premioBRL = getDrawPrizeForHits(hits, premiacoes);
  const saldoBRL = premioBRL - custoBRL;
  const roiPercent = custoBRL > 0 ? (saldoBRL / custoBRL) * 100 : 0;
  const isPositiveROI = roiPercent >= 0;

  // Score de Eficiência (0 a 100) ponderando retorno da última conferência + acertos + qualidade estatística
  const baseQuality = Math.min(25, Math.max(8, ((ticket.scoreIA ?? 85) / 100) * 25));
  const hitRatioScore = Math.min(25, Math.max(0, (hits / 15) * 25));
  const roiComponent = isPositiveROI
    ? Math.min(50, 32 + Math.log10(Math.max(1, roiPercent / 20 + 1)) * 18)
    : Math.max(0, Math.min(28, (premioBRL / Math.max(0.01, custoBRL)) * 28));

  const scoreEficiencia = Math.max(
    5,
    Math.min(100, Math.round(baseQuality + hitRatioScore + roiComponent))
  );

  return {
    custoBRL,
    premioBRL,
    saldoBRL,
    roiPercent,
    isPositiveROI,
    scoreEficiencia,
    hits,
  };
}

export function evaluateBatchConferenceEfficiency(
  tickets: GameTicket[],
  conferirDezenas: number[],
  premiacoes?: LotofacilDraw['premiacoes'],
  baseCost: number = VALOR_APOSTA_LOTOFACIL
): ConferenceEfficiencyResult {
  if (!tickets || tickets.length === 0) {
    return {
      custoBRL: 0,
      premioBRL: 0,
      saldoBRL: 0,
      roiPercent: 0,
      isPositiveROI: false,
      scoreEficiencia: 0,
      hits: 0,
    };
  }

  let custoBRL = 0;
  let premioBRL = 0;
  let bestHits = 0;
  let premiadosCount = 0;
  let avgScoreIA = 0;

  tickets.forEach((t) => {
    const res = evaluateTicketConferenceEfficiency(t, conferirDezenas, premiacoes, baseCost);
    custoBRL += res.custoBRL;
    premioBRL += res.premioBRL;
    if (res.hits > bestHits) bestHits = res.hits;
    if (res.hits >= 11) premiadosCount++;
    avgScoreIA += t.scoreIA ?? 88;
  });

  avgScoreIA = avgScoreIA / tickets.length;
  const saldoBRL = premioBRL - custoBRL;
  const roiPercent = custoBRL > 0 ? (saldoBRL / custoBRL) * 100 : 0;
  const isPositiveROI = roiPercent >= 0;

  const baseQuality = Math.min(25, Math.max(8, (avgScoreIA / 100) * 25));
  const hitCoverage = Math.min(25, (premiadosCount / tickets.length) * 35 + (bestHits / 15) * 12);
  const roiComponent = isPositiveROI
    ? Math.min(50, 32 + Math.log10(Math.max(1, roiPercent / 20 + 1)) * 18)
    : Math.max(0, Math.min(28, (premioBRL / Math.max(0.01, custoBRL)) * 28));

  const scoreEficiencia = Math.max(
    5,
    Math.min(100, Math.round(baseQuality + hitCoverage + roiComponent))
  );

  return {
    custoBRL,
    premioBRL,
    saldoBRL,
    roiPercent,
    isPositiveROI,
    scoreEficiencia,
    hits: bestHits,
  };
}

interface ScoreDeEficienciaBadgeProps {
  efficiency: ConferenceEfficiencyResult;
  compact?: boolean;
  label?: string;
}

export const ScoreDeEficienciaBadge: React.FC<ScoreDeEficienciaBadgeProps> = ({
  efficiency,
  compact = false,
  label = 'Score de Eficiência',
}) => {
  const { isPositiveROI, roiPercent, scoreEficiencia, custoBRL, premioBRL, saldoBRL } = efficiency;

  const formattedRoi = `${roiPercent > 0.05 ? '+' : ''}${roiPercent.toFixed(1).replace('.', ',')}%`;
  const tooltipText = `${label}: ${scoreEficiencia}/100 | Última conferência — Custo: ${formatCurrencyBRL(
    custoBRL
  )} | Prêmio: ${formatCurrencyBRL(premioBRL)} | Saldo: ${
    saldoBRL >= 0 ? '+' : ''
  }${formatCurrencyBRL(saldoBRL)} (${formattedRoi})`;

  if (compact) {
    return (
      <span
        title={tooltipText}
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-mono tabular-nums font-bold whitespace-nowrap transition-colors ${
          isPositiveROI
            ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/45'
            : 'bg-rose-500/15 text-rose-300 border-rose-500/45'
        }`}
      >
        {isPositiveROI ? (
          <TrendingUp className="w-3 h-3 text-emerald-400 shrink-0" />
        ) : (
          <TrendingDown className="w-3 h-3 text-rose-400 shrink-0" />
        )}
        <span>Eficiência {scoreEficiencia}</span>
        <span className="opacity-75">·</span>
        <span>{isPositiveROI ? `ROI ${formattedRoi}` : `ROI ${formattedRoi}`}</span>
      </span>
    );
  }

  return (
    <span
      title={tooltipText}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-mono tabular-nums font-bold whitespace-nowrap transition-colors ${
        isPositiveROI
          ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/45'
          : 'bg-rose-500/15 text-rose-300 border-rose-500/45'
      }`}
    >
      {isPositiveROI ? (
        <TrendingUp className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
      ) : (
        <TrendingDown className="w-3.5 h-3.5 text-rose-400 shrink-0" />
      )}
      <span className="font-sans font-semibold">{label}:</span>
      <strong className="text-white">{scoreEficiencia}/100</strong>
      <span className="opacity-60">·</span>
      <span>{isPositiveROI ? `ROI Positivo (${formattedRoi})` : `ROI Negativo (${formattedRoi})`}</span>
    </span>
  );
};
