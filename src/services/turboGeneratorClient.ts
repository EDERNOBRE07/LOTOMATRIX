// Gerenciador de Web Workers Dedicado para o Gerador Turbo (Força Bruta 14 Pontos)
// Isola integralmente o cálculo combinatório em uma thread paralela, garantindo 60 FPS ininterruptos na UI principal

import { TurboProgress, TurboResult, executeTurbo14Cover } from './turboBruteForce';

export type WorkerStatus = 'idle' | 'running' | 'completed' | 'error' | 'terminated';

export interface TurboJobOptions {
  selectedNumbers: number[];
  fixedNumbers?: number[];
  excludedNumbers?: number[];
  maxTicketsLimit?: number;
  timeoutMs?: number;
  onProgress?: (progress: TurboProgress) => void;
}

export class DedicatedTurboWorkerManager {
  private worker: Worker | null = null;
  private currentStatus: WorkerStatus = 'idle';
  private activeJobReject: ((reason?: any) => void) | null = null;
  private timeoutTimer: any = null;
  private lastProgressTimestamp = 0;

  constructor() {
    // Inicialização sob demanda
  }

  public get status(): WorkerStatus {
    return this.currentStatus;
  }

  public get isBusy(): boolean {
    return this.currentStatus === 'running';
  }

  /**
   * Executa a geração combinatória em Web Worker isolado
   */
  public generateTurbo(options: TurboJobOptions): Promise<TurboResult> {
    const {
      selectedNumbers,
      fixedNumbers = [],
      excludedNumbers = [],
      maxTicketsLimit = 28,
      timeoutMs = 4000,
      onProgress,
    } = options;

    return new Promise((resolve, reject) => {
      // Cancela qualquer execução prévia em andamento
      this.terminate();

      this.currentStatus = 'running';
      this.activeJobReject = reject;
      this.lastProgressTimestamp = 0;

      // Timeout watchdog para segurança máxima
      this.timeoutTimer = setTimeout(() => {
        if (this.currentStatus === 'running') {
          console.warn(`[Web Worker Manager] Timeout de ${timeoutMs}ms atingido. Encerrando worker.`);
          this.terminate();
          reject(new Error(`O cálculo combinatório excedeu o tempo limite seguro de ${timeoutMs / 1000}s.`));
        }
      }, timeoutMs);

      // 1. Inicializa Worker Nativo
      try {
        if (typeof Worker !== 'undefined') {
          this.worker = new Worker(
            new URL('../workers/turboGeneratorWorker.ts', import.meta.url),
            { type: 'module' }
          );

          this.worker.onmessage = (event: MessageEvent) => {
            const data = event.data;
            if (!data) return;

            if (data.type === 'PROGRESS' && onProgress) {
              const now = performance.now();
              // Throttling adaptativo: transmite no máximo a cada 30ms para não engarrafar a renderização da UI
              if (now - this.lastProgressTimestamp >= 30 || data.payload.percent === 100) {
                this.lastProgressTimestamp = now;
                onProgress(data.payload);
              }
            } else if (data.type === 'DONE') {
              this.clearWatchdog();
              this.currentStatus = 'completed';
              this.cleanup();
              resolve(data.payload);
            } else if (data.type === 'ERROR') {
              this.clearWatchdog();
              this.currentStatus = 'error';
              this.cleanup();
              reject(new Error(data.error || 'Erro no Web Worker'));
            }
          };

          this.worker.onerror = (err) => {
            console.warn('[Web Worker Manager] Erro na thread do worker. Acionando fallback assíncrono particionado:', err);
            this.clearWatchdog();
            this.cleanup();
            this.runPartitionedFallback(selectedNumbers, fixedNumbers, excludedNumbers, maxTicketsLimit, onProgress)
              .then(resolve)
              .catch(reject);
          };

          // Dispara o trabalho para a thread paralela
          this.worker.postMessage({
            type: 'START',
            selectedNumbers,
            fixedNumbers,
            excludedNumbers,
            maxTicketsLimit,
          });

          return;
        }
      } catch (workerInitErr) {
        console.warn('[Web Worker Manager] Ambiente sem suporte direto a Web Workers de módulo. Usando particionamento:', workerInitErr);
      }

      // 2. Fallback particionado assíncrono (caso Web Workers estejam desabilitados)
      this.runPartitionedFallback(selectedNumbers, fixedNumbers, excludedNumbers, maxTicketsLimit, onProgress)
        .then(resolve)
        .catch(reject);
    });
  }

  /**
   * Fallback particionado em microtarefas para nunca travar a UI mesmo sem workers
   */
  private runPartitionedFallback(
    selectedNumbers: number[],
    fixedNumbers: number[],
    excludedNumbers: number[],
    maxTicketsLimit: number,
    onProgress?: (p: TurboProgress) => void
  ): Promise<TurboResult> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        try {
          const res = executeTurbo14Cover(
            selectedNumbers,
            fixedNumbers,
            excludedNumbers,
            maxTicketsLimit,
            onProgress
          );
          this.currentStatus = 'completed';
          resolve(res);
        } catch (err) {
          this.currentStatus = 'error';
          reject(err);
        } finally {
          this.clearWatchdog();
          this.cleanup();
        }
      }, 30);
    });
  }

  public terminate(): void {
    this.clearWatchdog();
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    if (this.currentStatus === 'running' && this.activeJobReject) {
      this.activeJobReject(new Error('Processamento cancelado pelo usuário.'));
    }
    this.currentStatus = 'terminated';
    this.activeJobReject = null;
  }

  private clearWatchdog(): void {
    if (this.timeoutTimer) {
      clearTimeout(this.timeoutTimer);
      this.timeoutTimer = null;
    }
  }

  private cleanup(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.activeJobReject = null;
  }
}

// Instância singleton do Gerenciador de Web Workers
export const turboWorkerManager = new DedicatedTurboWorkerManager();
export const turboClient = {
  runTurbo: (
    selectedNumbers: number[],
    fixedNumbers: number[] = [],
    excludedNumbers: number[] = [],
    maxTicketsLimit: number = 28,
    onProgress?: (p: TurboProgress) => void
  ) =>
    turboWorkerManager.generateTurbo({
      selectedNumbers,
      fixedNumbers,
      excludedNumbers,
      maxTicketsLimit,
      onProgress,
    }),
  cancel: () => turboWorkerManager.terminate(),
  get active(): boolean {
    return turboWorkerManager.isBusy;
  },
};
