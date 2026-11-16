import { GameTicket, LotofacilDraw } from '../types/lotofacil';
import { countMatches, VALOR_APOSTA_LOTOFACIL } from './combinatorics';
import { getHistorical100Draws } from './historical100Draws';

export type TicketMarginStatus = 'aprovado' | 'alerta' | 'falha_sistematica';

export interface TicketRoiAuditItem {
  ticketKey: string;
  ticketIndex: number;
  custoAposta: number;
  custoTotalPeriodo: number;
  retornoTotalPeriodo: number;
  retornoMedioConcurso: number;
  lucroMedioConcurso: number;
  roiPercent: number;
  taxaPremiacaoPercent: number;
  premiacoesNoPeriodo: number;
  melhorPontuacao: number;
  atingeMargemSugerida: boolean;
  statusMargem: TicketMarginStatus;
  gapMargemPercent: number;
}

export interface BatchRoiAuditSummary {
  windowSize: number;
  suggestedMarginPercent: number;
  totalJogos: number;
  jogosAprovados: number;
  jogosAbaixoMargem: number;
  jogosFalhaSistematica: number;
  custoMedioPorJogo: number;
  retornoMedioPorJogo: number;
  roiMedioGeralPercent: number;
  itemsByKey: Map<string, TicketRoiAuditItem>;
  items: TicketRoiAuditItem[];
}

export function getTicketCostBRL(ticket: GameTicket, baseCost = VALOR_APOSTA_LOTOFACIL): number {
  const count = Array.isArray(ticket?.dezenas) ? ticket.dezenas.length : 15;
  if (count === 16) return baseCost * 16;
  if (count === 17) return baseCost * 136;
  if (count === 18) return baseCost * 816;
  return baseCost;
}

export function auditBatchTicketsROI(
  tickets: GameTicket[],
  latestDraw: LotofacilDraw,
  options?: {
    windowSize?: number;
    suggestedMarginPercent?: number;
    baseBetCost?: number;
  }
): BatchRoiAuditSummary {
  const windowSize = Math.max(5, Math.min(50, options?.windowSize ?? 20));
  const suggestedMarginPercent = options?.suggestedMarginPercent ?? 0;
  const baseBetCost = options?.baseBetCost ?? VALOR_APOSTA_LOTOFACIL;

  const historical = getHistorical100Draws(latestDraw).slice(0, windowSize);
  const drawCount = Math.max(1, historical.length);

  const itemsByKey = new Map<string, TicketRoiAuditItem>();
  const items: TicketRoiAuditItem[] = [];

  let jogosAprovados = 0;
  let jogosAbaixoMargem = 0;
  let jogosFalhaSistematica = 0;
  let totalCostPeriodoAll = 0;
  let totalReturnPeriodoAll = 0;

  tickets.forEach((ticket, idx) => {
    const dez = Array.isArray(ticket?.dezenas) ? ticket.dezenas : [];
    const ticketIndex = typeof ticket?.index === 'number' ? ticket.index : idx + 1;
    const ticketKey = `${ticket?.id || 't'}-${idx}`;
    const custoAposta = getTicketCostBRL(ticket, baseBetCost);
    const custoTotalPeriodo = custoAposta * drawCount;

    let retornoTotalPeriodo = 0;
    let premiacoesNoPeriodo = 0;
    let melhorPontuacao = 0;

    for (const draw of historical) {
      const hits = countMatches(dez, draw.dezenas);
      if (hits > melhorPontuacao) melhorPontuacao = hits;
      if (hits >= 11) {
        premiacoesNoPeriodo++;
        if (hits === 15) retornoTotalPeriodo += draw.premiacoes?.faixa15?.valor || 1800000;
        else if (hits === 14) retornoTotalPeriodo += draw.premiacoes?.faixa14?.valor || 1500;
        else if (hits === 13) retornoTotalPeriodo += draw.premiacoes?.faixa13?.valor || 35;
        else if (hits === 12) retornoTotalPeriodo += draw.premiacoes?.faixa12?.valor || 14;
        else retornoTotalPeriodo += draw.premiacoes?.faixa11?.valor || 7;
      }
    }

    const retornoMedioConcurso = retornoTotalPeriodo / drawCount;
    const lucroMedioConcurso = retornoMedioConcurso - custoAposta;
    const roiPercent =
      custoTotalPeriodo > 0
        ? ((retornoTotalPeriodo - custoTotalPeriodo) / custoTotalPeriodo) * 100
        : 0;
    const taxaPremiacaoPercent = (premiacoesNoPeriodo / drawCount) * 100;
    const atingeMargemSugerida = roiPercent >= suggestedMarginPercent - 0.01;
    const gapMargemPercent = roiPercent - suggestedMarginPercent;

    let statusMargem: TicketMarginStatus = 'aprovado';
    if (!atingeMargemSugerida) {
      // Falha sistemática quando o retorno histórico fica mais de 25 p.p. abaixo da margem sugerida
      // ou quando o bilhete não obteve nenhuma premiação relevante na janela histórica.
      if (gapMargemPercent < -25 || premiacoesNoPeriodo === 0) {
        statusMargem = 'falha_sistematica';
        jogosFalhaSistematica++;
      } else {
        statusMargem = 'alerta';
      }
      jogosAbaixoMargem++;
    } else {
      jogosAprovados++;
    }

    totalCostPeriodoAll += custoTotalPeriodo;
    totalReturnPeriodoAll += retornoTotalPeriodo;

    const item: TicketRoiAuditItem = {
      ticketKey,
      ticketIndex,
      custoAposta,
      custoTotalPeriodo,
      retornoTotalPeriodo,
      retornoMedioConcurso,
      lucroMedioConcurso,
      roiPercent,
      taxaPremiacaoPercent,
      premiacoesNoPeriodo,
      melhorPontuacao,
      atingeMargemSugerida,
      statusMargem,
      gapMargemPercent,
    };

    itemsByKey.set(ticketKey, item);
    items.push(item);
  });

  const totalJogos = tickets.length;
  const custoMedioPorJogo =
    totalJogos > 0 ? totalCostPeriodoAll / (totalJogos * drawCount) : baseBetCost;
  const retornoMedioPorJogo =
    totalJogos > 0 ? totalReturnPeriodoAll / (totalJogos * drawCount) : 0;
  const roiMedioGeralPercent =
    totalCostPeriodoAll > 0
      ? ((totalReturnPeriodoAll - totalCostPeriodoAll) / totalCostPeriodoAll) * 100
      : 0;

  return {
    windowSize: drawCount,
    suggestedMarginPercent,
    totalJogos,
    jogosAprovados,
    jogosAbaixoMargem,
    jogosFalhaSistematica,
    custoMedioPorJogo,
    retornoMedioPorJogo,
    roiMedioGeralPercent,
    itemsByKey,
    items,
  };
}

export function formatCurrencyBRL(value: number): string {
  const safe = Number.isFinite(value) ? value : 0;
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(safe);
}
