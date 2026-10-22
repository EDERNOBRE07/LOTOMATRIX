// Cliente com suporte prioritário a Web Worker e fallback assíncrono para o Gerador Turbo 14 Pontos

import { TurboProgress, TurboResult, executeTurbo14Cover } from './turboBruteForce';

export class TurboGeneratorClient {
  private worker: Worker | null = null;
  private isRunning = false;

  public runTurbo(
    selectedNumbers: number[],
    fixedNumbers: number[] = [],
    excludedNumbers: number[] = [],
    maxTicketsLimit: number = 28,
    onProgress?: (progress: TurboProgress) => void
  ): Promise<TurboResult> {
    return new Promise((resolve, reject) => {
      this.cancel();
      this.isRunning = true;

      // 1. Tenta inicializar Web Worker nativo do Vite
      try {
        if (typeof Worker !== 'undefined') {
          this.worker = new Worker(
            new URL('../workers/turboGeneratorWorker.ts', import.meta.url),
            { type: 'module' }
          );

          this.worker.onmessage = (e: MessageEvent) => {
            const data = e.data;
            if (!data) return;

            if (data.type === 'PROGRESS' && onProgress) {
              onProgress(data.payload);
            } else if (data.type === 'DONE') {
              this.cleanup();
              resolve(data.payload);
            } else if (data.type === 'ERROR') {
              this.cleanup();
              reject(new Error(data.error));
            }
          };

          this.worker.onerror = (err) => {
            console.warn('Web Worker falhou, recorrendo ao processamento local assíncrono:', err);
            this.cleanup();
            this.runFallbackAsync(
              selectedNumbers,
              fixedNumbers,
              excludedNumbers,
              maxTicketsLimit,
              onProgress
            )
              .then(resolve)
              .catch(reject);
          };

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
        console.warn('Não foi possível instanciar Web Worker direto, utilizando fallback:', workerInitErr);
      }

      // 2. Fallback assíncrono com setTimeout
      this.runFallbackAsync(
        selectedNumbers,
        fixedNumbers,
        excludedNumbers,
        maxTicketsLimit,
        onProgress
      )
        .then(resolve)
        .catch(reject);
    });
  }

  private runFallbackAsync(
    selectedNumbers: number[],
    fixedNumbers: number[],
    excludedNumbers: number[],
    maxTicketsLimit: number,
    onProgress?: (progress: TurboProgress) => void
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
          resolve(res);
        } catch (err) {
          reject(err);
        } finally {
          this.cleanup();
        }
      }, 50);
    });
  }

  public cancel(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.isRunning = false;
  }

  private cleanup(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.isRunning = false;
  }

  public get active(): boolean {
    return this.isRunning;
  }
}

export const turboClient = new TurboGeneratorClient();
