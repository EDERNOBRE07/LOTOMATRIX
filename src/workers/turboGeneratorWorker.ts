// Web Worker dedicado para execução em segundo plano do Gerador Turbo (Força Bruta 14 Pontos)
// Mantém a interface do usuário totalmente destravada a 60 FPS durante o cálculo combinatório.

import { executeTurbo14Cover, TurboProgress, TurboResult } from '../services/turboBruteForce';

export interface TurboWorkerStartMessage {
  type: 'START';
  selectedNumbers: number[];
  fixedNumbers?: number[];
  excludedNumbers?: number[];
  maxTicketsLimit?: number;
}

export type TurboWorkerMessage = TurboWorkerStartMessage;

self.onmessage = (e: MessageEvent<TurboWorkerMessage>) => {
  const data = e.data;
  if (!data || data.type !== 'START') return;

  try {
    const result = executeTurbo14Cover(
      data.selectedNumbers,
      data.fixedNumbers || [],
      data.excludedNumbers || [],
      data.maxTicketsLimit || 28,
      (progress: TurboProgress) => {
        self.postMessage({
          type: 'PROGRESS',
          payload: progress,
        });
      }
    );

    self.postMessage({
      type: 'DONE',
      payload: result,
    });
  } catch (err: any) {
    self.postMessage({
      type: 'ERROR',
      error: err?.message || 'Falha no processamento combinatório do Web Worker.',
    });
  }
};
