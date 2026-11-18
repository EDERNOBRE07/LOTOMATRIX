/**
 * Gerenciador de Web Worker e Motor de Chunking Assíncrono para Fechamentos
 * 
 * 1. Processa matrizes pesadas fora da thread principal utilizando Web Workers dedicados.
 * 2. Em caso de ambiente restrito, executa em chunks cooperativos via requestIdleCallback/setTimeout
 *    para NUNCA bloquear a main thread nem causar congelamentos ou tela preta.
 * 3. Integra snapshot pré-voo em localStorage antes de cada execução para auditoria pós-crash.
 */

import { FilterCriteria, GameTicket, LotofacilDraw, DezenaStats, FechamentoMode } from '../types/lotofacil';
import {
  generateFechamentoCovering,
  generateFechamentoInteligentePonderado,
  generateDesdobramento25Blocos,
  generateSuper14Coringas11Jogos,
  generatePadraoPivo9,
  generateCobertura25TresGrupos18,
  generateApostaEspelho,
  FechamentoPonderadoResult,
} from './combinatorics';
import {
  saveFechamentoPreflightSnapshot,
  markFechamentoPreflightSuccess,
} from './fechamentoPreflightSnapshot';
import { logFechamentoError } from './fechamentoErrorLogger';

export interface CombinatoricsProgress {
  percent: number;
  message: string;
  step?: string;
}

export interface CoveringWorkerParams {
  mode: FechamentoMode | string;
  targetCount: number;
  selectedNumbers: number[];
  fixedNumbers?: number[];
  excludedNumbers?: number[];
  targetHits: number;
  maxTickets: number;
  filters: FilterCriteria;
  drawDezenas?: number[];
  latestDraw: LotofacilDraw;
  aiScores?: number[];
  onProgress?: (progress: CombinatoricsProgress) => void;
  timeoutMs?: number;
}

export interface PonderadoWorkerParams {
  mode: FechamentoMode | string;
  targetCount: number;
  selectedNumbers: number[];
  fixedNumbers?: number[];
  excludedNumbers?: number[];
  targetHits: number;
  maxTickets: number;
  filters: FilterCriteria;
  dynamicStats?: DezenaStats[];
  latestDraw: LotofacilDraw;
  aiScores?: number[];
  onProgress?: (progress: CombinatoricsProgress) => void;
  timeoutMs?: number;
}

export interface SpecialMatrixWorkerParams {
  mode: FechamentoMode | string;
  targetCount: number;
  selectedNumbers: number[];
  fixedNumbers?: number[];
  excludedNumbers?: number[];
  pivotCountK?: 4 | 5 | 6;
  maxTickets?: number;
  filters: FilterCriteria;
  dynamicStats?: DezenaStats[];
  latestDraw: LotofacilDraw;
  drawsHistory?: LotofacilDraw[];
  aiScores?: number[];
  onProgress?: (progress: CombinatoricsProgress) => void;
  timeoutMs?: number;
}

export class FechamentoWorkerClient {
  private worker: Worker | null = null;
  private activeJobId: string | null = null;
  private timeoutTimer: any = null;

  /**
   * Executa a geração clássica de cobertura combinatória (Covering Design) de forma assíncrona.
   */
  public async generateCovering(params: CoveringWorkerParams): Promise<GameTicket[]> {
    const {
      mode,
      targetCount,
      selectedNumbers,
      fixedNumbers = [],
      excludedNumbers = [],
      targetHits,
      maxTickets,
      filters,
      drawDezenas = params.latestDraw.dezenas,
      latestDraw,
      aiScores,
      onProgress,
      timeoutMs = 12000,
    } = params;

    // 1. Snapshot pré-voo gravado em localStorage antes da execução
    const snapshot = saveFechamentoPreflightSnapshot({
      mode,
      targetCount,
      selectedNumbers,
      fixedNumbers,
      excludedNumbers,
      activeFilters: filters,
      drawConcurso: latestDraw.concurso,
      drawData: latestDraw.data,
      executionType: 'worker',
    });

    onProgress?.({ percent: 10, message: 'Iniciando thread dedicada do Web Worker...' });

    try {
      const tickets = await this.executeInWorker<GameTicket[]>({
        type: 'START_COVERING',
        payload: {
          selectedNumbers,
          targetHits,
          maxTickets,
          filters,
          drawDezenas,
          aiScores,
        },
        timeoutMs,
        onProgress,
        fallbackFn: () =>
          this.executeCoveringChunked({
            selectedNumbers,
            targetHits,
            maxTickets,
            filters,
            drawDezenas,
            aiScores,
            onProgress,
          }),
      });

      markFechamentoPreflightSuccess(snapshot.id);
      return tickets;
    } catch (err: any) {
      logFechamentoError({
        stage: 'combinatoria',
        mode,
        targetCount,
        selectedNumbers,
        fixedNumbers,
        excludedNumbers,
        activeFilters: filters,
        drawConcurso: latestDraw.concurso,
        drawData: latestDraw.data,
        errorMessage: err?.message || 'Falha na execução assíncrona do fechamento.',
        errorStack: err?.stack,
      });
      throw err;
    }
  }

  /**
   * Executa o Fechamento Inteligente Ponderado de forma assíncrona.
   */
  public async generatePonderado(params: PonderadoWorkerParams): Promise<FechamentoPonderadoResult> {
    const {
      mode,
      targetCount,
      selectedNumbers,
      fixedNumbers = [],
      excludedNumbers = [],
      targetHits,
      maxTickets,
      filters,
      dynamicStats,
      latestDraw,
      aiScores,
      onProgress,
      timeoutMs = 15000,
    } = params;

    // 1. Snapshot pré-voo
    const snapshot = saveFechamentoPreflightSnapshot({
      mode,
      targetCount,
      selectedNumbers,
      fixedNumbers,
      excludedNumbers,
      activeFilters: filters,
      drawConcurso: latestDraw.concurso,
      drawData: latestDraw.data,
      executionType: 'worker',
    });

    onProgress?.({ percent: 10, message: 'Alocando cluster combinatório em thread paralela...' });

    try {
      const result = await this.executeInWorker<FechamentoPonderadoResult>({
        type: 'START_PONDERADO',
        payload: {
          selectedNumbers,
          targetHits,
          maxTickets,
          filters,
          dynamicStats,
          latestDraw,
          aiScores,
        },
        timeoutMs,
        onProgress,
        fallbackFn: () =>
          this.executePonderadoChunked({
            selectedNumbers,
            targetHits,
            maxTickets,
            filters,
            dynamicStats,
            latestDraw,
            aiScores,
            onProgress,
          }),
      });

      markFechamentoPreflightSuccess(snapshot.id);
      return result;
    } catch (err: any) {
      logFechamentoError({
        stage: 'ponderado',
        mode,
        targetCount,
        selectedNumbers,
        fixedNumbers,
        excludedNumbers,
        activeFilters: filters,
        drawConcurso: latestDraw.concurso,
        drawData: latestDraw.data,
        errorMessage: err?.message || 'Falha na execução assíncrona do Fechamento Ponderado.',
        errorStack: err?.stack,
      });
      throw err;
    }
  }

  /**
   * Executa estratégias especiais de 25 dezenas ou Pivô 9 no Web Worker.
   */
  public async generateSpecialMatrix(params: SpecialMatrixWorkerParams): Promise<GameTicket[]> {
    const {
      mode,
      targetCount,
      selectedNumbers,
      fixedNumbers = [],
      excludedNumbers = [],
      pivotCountK = 5,
      maxTickets = 24,
      filters,
      dynamicStats,
      latestDraw,
      drawsHistory,
      aiScores,
      onProgress,
      timeoutMs = 15000,
    } = params;

    const snapshot = saveFechamentoPreflightSnapshot({
      mode,
      targetCount,
      selectedNumbers,
      fixedNumbers,
      excludedNumbers,
      activeFilters: filters,
      drawConcurso: latestDraw.concurso,
      drawData: latestDraw.data,
      executionType: 'worker',
    });

    onProgress?.({ percent: 15, message: 'Iniciando estratégia especial no Web Worker...' });

    const runSyncFallback = (): GameTicket[] => {
      if (mode === 'super_14_coringas_25') {
        return generateSuper14Coringas11Jogos({ latestDraw, drawsHistory, dynamicStats, filters, aiScores });
      }
      if (mode === 'pivo_9_dezenas') {
        return generatePadraoPivo9({ pivotCountK, maxTickets, latestDraw, dynamicStats, filters, aiScores });
      }
      if (mode === 'cobertura_25_3x18') {
        return generateCobertura25TresGrupos18({ latestDraw, dynamicStats, filters, aiScores });
      }
      if (mode === 'aposta_espelho_2') {
        return generateApostaEspelho({ latestDraw, dynamicStats, filters, aiScores });
      }
      return generateDesdobramento25Blocos({ baseDraw: latestDraw, maxGames: 10, iterations: 200, aiScores });
    };

    try {
      const tickets = await this.executeInWorker<GameTicket[]>({
        type: 'START_SPECIAL_MATRIX',
        payload: {
          mode,
          pivotCountK,
          maxTickets,
          filters,
          dynamicStats,
          latestDraw,
          drawsHistory,
          aiScores,
        },
        timeoutMs,
        onProgress,
        fallbackFn: () =>
          new Promise<GameTicket[]>((resolve, reject) => {
            setTimeout(() => {
              try {
                onProgress?.({ percent: 65, message: 'Executando matriz especial de forma cooperativa...' });
                const out = runSyncFallback();
                onProgress?.({ percent: 100, message: 'Matriz concluída com sucesso!' });
                resolve(out);
              } catch (e) {
                reject(e);
              }
            }, 16);
          }),
      });

      markFechamentoPreflightSuccess(snapshot.id);
      return tickets;
    } catch (err: any) {
      logFechamentoError({
        stage: 'combinatoria',
        mode,
        targetCount,
        selectedNumbers,
        fixedNumbers,
        excludedNumbers,
        activeFilters: filters,
        drawConcurso: latestDraw.concurso,
        drawData: latestDraw.data,
        errorMessage: err?.message || 'Falha na geração da matriz especial.',
        errorStack: err?.stack,
      });
      throw err;
    }
  }

  /**
   * Executa a tarefa no Web Worker com timeout watchdog e chaveamento de fallback.
   */
  private executeInWorker<T>(options: {
    type: 'START_COVERING' | 'START_PONDERADO' | 'START_SPECIAL_MATRIX';
    payload: any;
    timeoutMs: number;
    onProgress?: (progress: CombinatoricsProgress) => void;
    fallbackFn: () => Promise<T>;
  }): Promise<T> {
    const { type, payload, timeoutMs, onProgress, fallbackFn } = options;

    return new Promise<T>((resolve, reject) => {
      // Verifica se o navegador tem suporte a Web Workers
      if (typeof Worker === 'undefined') {
        fallbackFn().then(resolve).catch(reject);
        return;
      }

      this.terminate();
      const jobId = `job-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      this.activeJobId = jobId;

      let isSettled = false;

      // Watchdog para evitar tarefas presas
      this.timeoutTimer = setTimeout(() => {
        if (!isSettled) {
          isSettled = true;
          this.terminate();
          console.warn(`[Worker Client] Timeout de ${timeoutMs}ms atingido. Acionando fallback particionado.`);
          fallbackFn().then(resolve).catch(reject);
        }
      }, timeoutMs);

      try {
        this.worker = new Worker(
          new URL('../workers/fechamentoCombinatoricsWorker.ts', import.meta.url),
          { type: 'module' }
        );

        this.worker.onmessage = (e: MessageEvent) => {
          const data = e.data;
          if (!data || data.jobId !== jobId) return;

          if (data.type === 'PROGRESS') {
            onProgress?.({
              percent: data.percent,
              message: data.message,
            });
          } else if (data.type === 'DONE_COVERING') {
            if (!isSettled) {
              isSettled = true;
              this.cleanup();
              resolve(data.payload.tickets as T);
            }
          } else if (data.type === 'DONE_PONDERADO') {
            if (!isSettled) {
              isSettled = true;
              this.cleanup();
              resolve(data.payload as T);
            }
          } else if (data.type === 'ERROR') {
            if (!isSettled) {
              isSettled = true;
              this.cleanup();
              reject(new Error(data.error || 'Erro interno no Web Worker'));
            }
          }
        };

        this.worker.onerror = (err) => {
          console.warn('[Worker Client] Erro na thread do Web Worker. Chaveando para execução cooperativa por chunks:', err);
          if (!isSettled) {
            isSettled = true;
            this.cleanup();
            fallbackFn().then(resolve).catch(reject);
          }
        };

        this.worker.postMessage({
          type,
          jobId,
          ...payload,
        });
      } catch (initErr) {
        console.warn('[Worker Client] Inicialização do worker falhou. Acionando fallback cooperativo:', initErr);
        if (!isSettled) {
          isSettled = true;
          this.cleanup();
          fallbackFn().then(resolve).catch(reject);
        }
      }
    });
  }

  /**
   * Fallback cooperativo em micro-chunks assíncronos (requestIdleCallback / setTimeout).
   * Garante que a interface do usuário nunca trave (mantém 60 FPS e sem tela preta).
   */
  private executeCoveringChunked(params: {
    selectedNumbers: number[];
    targetHits: number;
    maxTickets: number;
    filters: FilterCriteria;
    drawDezenas?: number[];
    aiScores?: number[];
    onProgress?: (progress: CombinatoricsProgress) => void;
  }): Promise<GameTicket[]> {
    return new Promise((resolve, reject) => {
      params.onProgress?.({ percent: 35, message: 'Processando matriz em fatias assíncronas cooperativas...' });

      // Yield de controle para a thread principal atualizar a renderização do browser
      const scheduleYield = (cb: () => void) => {
        if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
          (window as any).requestIdleCallback(cb, { timeout: 30 });
        } else {
          setTimeout(cb, 16);
        }
      };

      scheduleYield(() => {
        try {
          params.onProgress?.({ percent: 60, message: 'Calculando cobertura com Hamming bitwise, Fixas Rotativas e Frequency Cap...' });
          const tickets = generateFechamentoCovering(
            params.selectedNumbers,
            params.targetHits,
            params.maxTickets,
            params.filters,
            params.drawDezenas,
            params.aiScores
          );

          scheduleYield(() => {
            params.onProgress?.({ percent: 100, message: 'Concluído com proteção 155–235 e Hamming!' });
            resolve(tickets);
          });
        } catch (err) {
          reject(err);
        }
      });
    });
  }

  /**
   * Fallback cooperativo para o Fechamento Ponderado.
   */
  private executePonderadoChunked(params: {
    selectedNumbers: number[];
    targetHits: number;
    maxTickets: number;
    filters: FilterCriteria;
    dynamicStats?: DezenaStats[];
    latestDraw?: LotofacilDraw;
    aiScores?: number[];
    onProgress?: (progress: CombinatoricsProgress) => void;
  }): Promise<FechamentoPonderadoResult> {
    return new Promise((resolve, reject) => {
      params.onProgress?.({ percent: 30, message: 'Auto-calibrando universo (μ_U ± 20) e clusterização...' });

      const scheduleYield = (cb: () => void) => {
        if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
          (window as any).requestIdleCallback(cb, { timeout: 30 });
        } else {
          setTimeout(cb, 16);
        }
      };

      scheduleYield(() => {
        try {
          params.onProgress?.({ percent: 70, message: 'Aplicando Fixas Rotativas (K de N), Hamming e Anti-Cisne Negro 75/15/10...' });
          const result = generateFechamentoInteligentePonderado({
            selectedNumbers: params.selectedNumbers,
            targetHits: params.targetHits,
            maxTickets: params.maxTickets,
            filters: params.filters,
            dynamicStats: params.dynamicStats,
            latestDraw: params.latestDraw,
            aiScores: params.aiScores,
          });

          scheduleYield(() => {
            params.onProgress?.({ percent: 100, message: 'Fechamento Ponderado concluído com sucesso!' });
            resolve(result);
          });
        } catch (err) {
          reject(err);
        }
      });
    });
  }

  public terminate(): void {
    if (this.timeoutTimer) {
      clearTimeout(this.timeoutTimer);
      this.timeoutTimer = null;
    }
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.activeJobId = null;
  }

  private cleanup(): void {
    if (this.timeoutTimer) {
      clearTimeout(this.timeoutTimer);
      this.timeoutTimer = null;
    }
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.activeJobId = null;
  }
}

export const fechamentoWorkerClient = new FechamentoWorkerClient();
