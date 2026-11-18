// Web Worker para processamento combinatório pesado do LotoSniper
// Executa fora da thread principal para eliminar qualquer possibilidade de congelamento (tela preta)
// Suporta tanto o Fechamento Covering clássico quanto o Fechamento Ponderado com Clusterização

import {
  generateFechamentoCovering,
  generateFechamentoInteligentePonderado,
  generateDesdobramento25Blocos,
  generateSuper14Coringas11Jogos,
  generatePadraoPivo9,
  generateCobertura25TresGrupos18,
  generateApostaEspelho,
} from '../services/combinatorics';
import { FilterCriteria, GameTicket, LotofacilDraw, DezenaStats, FechamentoMode } from '../types/lotofacil';
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

export interface FechamentoWorkerSpecialMatrixStart {
  type: 'START_SPECIAL_MATRIX';
  jobId: string;
  mode: FechamentoMode | string;
  pivotCountK?: 4 | 5 | 6;
  maxTickets?: number;
  filters: FilterCriteria;
  dynamicStats?: DezenaStats[];
  latestDraw?: LotofacilDraw;
  drawsHistory?: LotofacilDraw[];
  aiScores?: number[];
}

export type FechamentoWorkerIncomingMessage =
  | FechamentoWorkerCoveringStart
  | FechamentoWorkerPonderadoStart
  | FechamentoWorkerSpecialMatrixStart;

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
        message: 'Auto-calibrando soma (μ_U ± 20) e configurando Fixas Rotativas (K de N)...',
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
        message: 'Auditando espalhamento Hamming bitwise, Frequency Cap e poda posicional D1–D15...',
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
        message: 'Calculando IP, Fixas Rotativas (K de N) e auto-calibração de soma do universo...',
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
        message: 'Aplicando espalhamento Hamming bitwise, Frequency Cap e Anti-Cisne Negro 75/15/10...',
      });

      self.postMessage({
        type: 'DONE_PONDERADO',
        jobId,
        payload: result,
      });
    } else if (data.type === 'START_SPECIAL_MATRIX') {
      self.postMessage({
        type: 'PROGRESS',
        jobId,
        percent: 25,
        message: 'Processando matriz especial e auditoria bitwise...',
      });

      let tickets: GameTicket[] = [];
      if (data.mode === 'super_14_coringas_25') {
        tickets = generateSuper14Coringas11Jogos({
          latestDraw: data.latestDraw,
          drawsHistory: data.drawsHistory,
          dynamicStats: data.dynamicStats,
          filters: data.filters,
          aiScores: data.aiScores,
        });
      } else if (data.mode === 'pivo_9_dezenas') {
        tickets = generatePadraoPivo9({
          pivotCountK: data.pivotCountK ?? 5,
          maxTickets: data.maxTickets ?? 24,
          latestDraw: data.latestDraw,
          dynamicStats: data.dynamicStats,
          filters: data.filters,
          aiScores: data.aiScores,
        });
      } else if (data.mode === 'cobertura_25_3x18') {
        tickets = generateCobertura25TresGrupos18({
          latestDraw: data.latestDraw,
          dynamicStats: data.dynamicStats,
          filters: data.filters,
          aiScores: data.aiScores,
        });
      } else if (data.mode === 'aposta_espelho_2') {
        tickets = generateApostaEspelho({
          latestDraw: data.latestDraw,
          dynamicStats: data.dynamicStats,
          filters: data.filters,
          aiScores: data.aiScores,
        });
      } else {
        tickets = generateDesdobramento25Blocos({
          baseDraw: data.latestDraw,
          maxGames: 10,
          iterations: 200,
          aiScores: data.aiScores,
        });
      }

      self.postMessage({
        type: 'DONE_COVERING',
        jobId,
        payload: {
          tickets,
          count: tickets.length,
        },
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
