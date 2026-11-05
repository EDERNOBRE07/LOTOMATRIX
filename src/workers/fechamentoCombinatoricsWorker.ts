// Web Worker para processamento combinatório pesado do LotoSniper
// Executa fora da thread principal para eliminar qualquer possibilidade de congelamento (tela preta)
// Suporta tanto o Fechamento Covering clássico quanto o Fechamento Ponderado com Clusterização

import {
  generateFechamentoCovering,
  generateFechamentoInteligentePonderado,
} from '../services/combinatorics';
import { FilterCriteria, GameTicket, LotofacilDraw, DezenaStats } from '../types/lotofacil';
import { FechamentoPonderadoResult } from '../services/fechamentoPonderadoService';

export interface FechamentoWorkerCoveringStart {
  type: 'START_COVERING';
  jobId: string;
  selectedNumbers: number[];
  targetHits: number;
  maxTickets: number;
  filters: FilterCriteria;
  drawDezenas?: number[];
  aiScores?: number[];
}

export interface FechamentoWorkerPonderadoStart {
  type: 'START_PONDERADO';
  jobId: string;
  selectedNumbers: number[];
  targetHits: number;
  maxTickets: number;
  filters: FilterCriteria;
  dynamicStats?: DezenaStats[];
  latestDraw?: LotofacilDraw;
  aiScores?: number[];
}

export type FechamentoWorkerIncomingMessage =
  | FechamentoWorkerCoveringStart
  | FechamentoWorkerPonderadoStart;

self.onmessage = (e: MessageEvent<FechamentoWorkerIncomingMessage>) => {
  const data = e.data;
  if (!data || !data.type) return;

  const jobId = data.jobId;

  try {
    if (data.type === 'START_COVERING') {
      self.postMessage({
        type: 'PROGRESS',
        jobId,
        percent: 15,
        message: 'Filtrando universo e aplicando restrições canônicas...',
      });

      const tickets: GameTicket[] = generateFechamentoCovering(
        data.selectedNumbers,
        data.targetHits,
        data.maxTickets,
        data.filters,
        data.drawDezenas,
        data.aiScores
      );

      self.postMessage({
        type: 'PROGRESS',
        jobId,
        percent: 90,
        message: 'Validando cobertura combinatória e integridade...',
      });

      self.postMessage({
        type: 'DONE_COVERING',
        jobId,
        payload: {
          tickets,
          count: tickets.length,
        },
      });
    } else if (data.type === 'START_PONDERADO') {
      self.postMessage({
        type: 'PROGRESS',
        jobId,
        percent: 20,
        message: 'Calculando Índices de Performance (IP) e clusterização por densidade...',
      });

      const result: FechamentoPonderadoResult = generateFechamentoInteligentePonderado({
        selectedNumbers: data.selectedNumbers,
        targetHits: data.targetHits,
        maxTickets: data.maxTickets,
        filters: data.filters,
        dynamicStats: data.dynamicStats,
        latestDraw: data.latestDraw,
        aiScores: data.aiScores,
      });

      self.postMessage({
        type: 'PROGRESS',
        jobId,
        percent: 90,
        message: 'Auditando robustez estatística 50 e sazonalidade MM100...',
      });

      self.postMessage({
        type: 'DONE_PONDERADO',
        jobId,
        payload: result,
      });
    }
  } catch (err: any) {
    self.postMessage({
      type: 'ERROR',
      jobId,
      error: err?.message || 'Erro inesperado na thread do Web Worker combinatório.',
      stack: err?.stack,
    });
  }
};
