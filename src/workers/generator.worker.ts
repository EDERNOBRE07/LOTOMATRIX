/**
 * Web Worker Dedicado de Geração Combinatória do LotoSniper (`generator.worker.ts`)
 *
 * Executa fora da thread principal:
 * 1. Cálculo de Distância de Hamming Bitwise (`15 - popcount(maskA & maskB)`)
 * 2. Rotatividade Inteligente de Fixas (K de N, máx. 5 fixas, [max(1, N-2), N-1])
 * 3. Estratificação Anti-Cisne Negro (75% Central / 15% Cauda Baixa / 10% Cauda Alta)
 * 4. Poda Antecipada (Branch & Bound) dos 5 Filtros Matemáticos (D1-D15, M3-M8, Dígitos 63-87, Cruz, Ranking)
 */

import {
  generateFechamentoCovering,
  generateFechamentoInteligentePonderado,
  generateDesdobramento25Blocos,
  generateSuper14Coringas11Jogos,
  generatePadraoPivo9,
  generateCobertura25TresGrupos18,
  generateApostaEspelho,
  FechamentoPonderadoResult,
  getTargetHammingDistance,
  buildProgressiveFallbackFilters,
  ProgressiveFallbackLevel,
  validateFilters,
  analyzeTicket,
} from '../services/combinatorics';
import { getHistoricalNDraws } from '../services/historical100Draws';
import {
  FilterCriteria,
  GameTicket,
  LotofacilDraw,
  DezenaStats,
  FechamentoMode,
} from '../types/lotofacil';

export const WORKER_MAX_FIXED_NUMBERS = 5;

/**
 * Popcount bitwise SWAR em O(1) para inteiros de 32 bits (dezenas 1..25).
 */
export function popcountBitwise(x: number): number {
  let v = x | 0;
  v = v - ((v >>> 1) & 0x55555555);
  v = (v & 0x33333333) + ((v >>> 2) & 0x33333333);
  return (((v + (v >>> 4)) & 0x0f0f0f0f) * 0x01010101) >>> 24;
}

/**
 * Converte um array de dezenas (1..25) em bitmask de 25 bits.
 */
export function encodeTicketMaskBitwise(dezenas: number[]): number {
  let mask = 0;
  for (let i = 0; i < dezenas.length; i++) {
    const d = dezenas[i];
    if (d >= 1 && d <= 25) {
      mask |= 1 << (d - 1);
    }
  }
  return mask;
}

/**
 * Calcula a distância de espalhamento geométrico de Hamming entre dois bilhetes de 15 dezenas via bitwise:
 * dezenasDiferentes = 15 - popcount(maskA & maskB).
 * (Equivalente à metade da distância simétrica XOR quando ambos têm 15 bits ligados.)
 */
export function hammingDistanceBitwise(maskA: number, maskB: number): number {
  return 15 - popcountBitwise(maskA & maskB);
}

/**
 * Valida se um cartão candidato respeita distância de Hamming mínima em relação a todos os bilhetes já selecionados.
 */
export function passesHammingSpreadBitwise(
  candMask: number,
  selectedMasks: number[],
  minHammingDiff: number
): boolean {
  for (let i = 0; i < selectedMasks.length; i++) {
    if (hammingDistanceBitwise(candMask, selectedMasks[i]) < minHammingDiff) {
      return false;
    }
  }
  return true;
}

/**
 * Sanitiza dezenas fixas contra o universo e impõe trava máxima de 5 fixas.
 */
export function sanitizeFixedNumbersWorker(rawFixas: number[] = [], pool?: number[]): number[] {
  const poolSet = pool && pool.length > 0 ? new Set(pool) : null;
  return Array.from(
    new Set(
      rawFixas
        .map((n) => Number(n))
        .filter((n) => Number.isInteger(n) && n >= 1 && n <= 25 && (!poolSet || poolSet.has(n)))
    )
  )
    .sort((a, b) => a - b)
    .slice(0, WORKER_MAX_FIXED_NUMBERS);
}

/**
 * Resolve limites K de N para Fixas Rotativas Inteligentes:
 * - Quando N >= 3 e modo !== 'rigidas': ativa rotatividade K in [max(1, N-2), N-1]
 * - Quando N <= 2 ou modo === 'rigidas': K = N (100%)
 */
export function resolveRotativeFixedKofN(
  fixasCount: number,
  requestedMode?: 'rotativas' | 'rigidas'
): { modo: 'rotativas' | 'rigidas'; minK: number; maxK: number; avgK: number } {
  if (fixasCount <= 0) {
    return { modo: 'rigidas', minK: 0, maxK: 0, avgK: 0 };
  }
  if (fixasCount >= 3 && requestedMode !== 'rigidas') {
    const minK = Math.max(1, fixasCount - 2);
    const maxK = fixasCount - 1;
    return { modo: 'rotativas', minK, maxK, avgK: (minK + maxK) / 2 };
  }
  return { modo: 'rigidas', minK: fixasCount, maxK: fixasCount, avgK: fixasCount };
}

/**
 * Gera todos os subconjuntos rotativos K-de-N para rotação uniforme entre bilhetes.
 */
export function generateKofNFixedSubsets(
  fixas: number[],
  minK: number,
  maxK: number
): number[][] {
  const subsets: number[][] = [];
  if (fixas.length === 0 || maxK === 0) {
    subsets.push([]);
    return subsets;
  }

  const build = (k: number, start: number, current: number[]) => {
    if (current.length === k) {
      subsets.push([...current]);
      return;
    }
    for (let i = start; i <= fixas.length - (k - current.length); i++) {
      current.push(fixas[i]);
      build(k, i + 1, current);
      current.pop();
    }
  };

  for (let k = minK; k <= maxK; k++) {
    build(k, 0, []);
  }
  return subsets.length > 0 ? subsets : [[]];
}

/**
 * Calcula cotas de Estratificação de Cauda (75% Zona Central 180–215 / 15% Cauda Alta 216–230 / 10% Cauda Baixa 155–179).
 */
export function computeStratifiedQuotasWorker(
  maxTickets: number,
  enableStratification: boolean
): { coreQuota: number; lowerQuota: number; upperQuota: number } {
  if (!enableStratification || maxTickets < 10) {
    return { coreQuota: maxTickets, lowerQuota: 0, upperQuota: 0 };
  }
  const upperQuota = Math.max(1, Math.round(maxTickets * 0.15));
  const lowerQuota = Math.max(1, Math.round(maxTickets * 0.10));
  const coreQuota = Math.max(1, maxTickets - upperQuota - lowerQuota);
  return { coreQuota, lowerQuota, upperQuota };
}

export interface GeneratorWorkerCoveringStart {
  type: 'START_COVERING' | 'GENERATE_MATRIX';
  jobId: string;
  selectedNumbers: number[];
  targetHits: number;
  maxTickets: number;
  filters: FilterCriteria;
  drawDezenas?: number[];
  aiScores?: number[];
}

export interface GeneratorWorkerPonderadoStart {
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

export interface GeneratorWorkerSpecialMatrixStart {
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

export interface GeneratorWorkerFilterSimulationStart {
  type: 'SIMULATE_FILTERS';
  jobId: string;
  filters: FilterCriteria;
  latestDraw: LotofacilDraw;
  sampleCount?: number;
  previewGames?: { dezenas: number[]; label: string }[];
  aiScores?: number[];
}

export type GeneratorWorkerIncomingMessage =
  | GeneratorWorkerCoveringStart
  | GeneratorWorkerPonderadoStart
  | GeneratorWorkerSpecialMatrixStart
  | GeneratorWorkerFilterSimulationStart;

/**
 * Processa mensagens do Web Worker de forma desacoplada (permite testes diretos e execução em thread Worker).
 */
export function handleGeneratorWorkerMessage(
  data: GeneratorWorkerIncomingMessage,
  postMsg: (payload: any) => void
): void {
  if (!data || !data.type) return;
  const jobId = data.jobId;

  try {
    if (data.type === 'START_COVERING' || data.type === 'GENERATE_MATRIX') {
      const fixasSanitizadas = sanitizeFixedNumbersWorker(
        data.filters?.dezenasFixas || [],
        data.selectedNumbers
      );
      const kInfo = resolveRotativeFixedKofN(fixasSanitizadas.length, data.filters?.modoFixas);
      const targetHamming = getTargetHammingDistance(
        data.selectedNumbers.length,
        data.maxTickets,
        data.filters
      );
      const quotas = computeStratifiedQuotasWorker(
        data.maxTickets,
        data.maxTickets >= 10 &&
          data.selectedNumbers.length >= 16 &&
          data.filters?.estratificacaoCaudaAtiva === true
      );

      postMsg({
        type: 'PROGRESS',
        jobId,
        percent: 15,
        message:
          kInfo.modo === 'rotativas'
            ? `Configurando Fixas Rotativas (${kInfo.minK}–${kInfo.maxK} de ${fixasSanitizadas.length}) e Set Cover Adaptativo...`
            : 'Executando Set Cover Greedy Adaptativo (14+13 pts) com soft-scoring auditado...',
      });

      const baseSanitizedFilters: FilterCriteria = {
        ...data.filters,
        dezenasFixas: fixasSanitizadas,
        modoFixas: kInfo.modo,
      };

      // Fallback Progressivo Automático em 3 níveis quando filtros estritos não atingem a meta de bilhetes
      let tickets: GameTicket[] = [];
      let appliedFallbackLevel: ProgressiveFallbackLevel = 0;
      let appliedFallbackLabel = 'Filtros Estritos (Nível 0)';
      let appliedFallbackDescription = 'Todos os filtros matemáticos originais aplicados.';
      const allowProgressiveFallback = data.filters?.fallbackProgressivoAtivo !== false;
      const levelsToTry: ProgressiveFallbackLevel[] =
        data.selectedNumbers.length > 15 && allowProgressiveFallback ? [0, 1, 2, 3] : [0];

      for (const lvl of levelsToTry) {
        const fb = buildProgressiveFallbackFilters(baseSanitizedFilters, lvl);
        if (lvl > 0) {
          postMsg({
            type: 'PROGRESS',
            jobId,
            percent: 25 + lvl * 18,
            message: `Fallback Progressivo ${fb.label}: ${fb.description}`,
          });
        }
        try {
          const attempt = generateFechamentoCovering(
            data.selectedNumbers,
            data.targetHits,
            data.maxTickets,
            fb.filters,
            data.drawDezenas,
            data.aiScores,
            lvl,
            true
          );
          if (attempt.length > tickets.length) {
            tickets = attempt;
            appliedFallbackLevel = lvl;
            appliedFallbackLabel = fb.label;
            appliedFallbackDescription = fb.description;
          }
          if (attempt.length >= data.maxTickets) {
            tickets = attempt;
            appliedFallbackLevel = lvl;
            appliedFallbackLabel = fb.label;
            appliedFallbackDescription = fb.description;
            break;
          }
        } catch {
          // Segue para o próximo nível de fallback progressivo
        }
      }

      // Trava absoluta contra fechamentos vazios: se o pool tem >= 15 dezenas, força síntese de cobertura pura (Nível 3)
      if (tickets.length === 0 && data.selectedNumbers.length >= 15) {
        const emergencyFb = buildProgressiveFallbackFilters(baseSanitizedFilters, 3);
        tickets = generateFechamentoCovering(
          data.selectedNumbers,
          data.targetHits,
          data.maxTickets,
          emergencyFb.filters,
          data.drawDezenas,
          data.aiScores,
          3,
          true
        );
        appliedFallbackLevel = 3;
        appliedFallbackLabel = emergencyFb.label;
        appliedFallbackDescription =
          'Trava Zero-Vazio ativada: filtros secundários flexibilizados para garantir cobertura real.';
      }

      if (tickets.length === 0) {
        throw new Error(
          'Selecione pelo menos 15 dezenas válidas para gerar o fechamento.'
        );
      }

      // Auditoria bitwise de distância mínima de Hamming, duplicatas e contribuição única (Set Cover)
      const masks = tickets.map((t) => encodeTicketMaskBitwise(t.dezenas));
      let minObservedHamming = 15;
      for (let i = 0; i < masks.length; i++) {
        for (let j = i + 1; j < masks.length; j++) {
          const dist = hammingDistanceBitwise(masks[i], masks[j]);
          if (dist < minObservedHamming) minObservedHamming = dist;
        }
      }

      const uniqueMaskSet = new Set(masks);
      const duplicateTicketsCount = masks.length - uniqueMaskSet.size;

      // Verificação bitwise de contribuição única:
      // 1) Zero bilhetes duplicados;
      // 2) Cada bilhete contribui cobertura única (14+ pts quando Hamming >= 2, ou 14-pt vizinho/15-pt exclusivo no universo selecionado).
      let uniqueContributionVerified = duplicateTicketsCount === 0 && masks.length > 0;
      if (uniqueContributionVerified && masks.length > 1) {
        if (minObservedHamming >= 2) {
          // Com Hamming >= 2 (interseção <= 13), cada bilhete cobre exclusivamente seu próprio cenário em 14+ pts
          uniqueContributionVerified = true;
        } else {
          // Quando algum par tem Hamming === 1, verifica bitwise se cada bilhete possui ao menos 1 cenário
          // vizinho de 14 pts no universo selecionado (ou o próprio bilhete em 15 pts) sem subsunção por outro bilhete
          const universeMask = encodeTicketMaskBitwise(data.selectedNumbers);
          for (let i = 0; i < masks.length; i++) {
            const m = masks[i];
            const outsideMask = universeMask & ~m;
            let hasUniqueScenario = false;

            // Testa cobertura única em 14+ pts no próprio cenário ou vizinhos 1-swap do bilhete i
            let coveredByOtherAt14 = false;
            for (let j = 0; j < masks.length; j++) {
              if (j !== i && hammingDistanceBitwise(m, masks[j]) <= 1) {
                coveredByOtherAt14 = true;
                break;
              }
            }
            if (!coveredByOtherAt14) {
              hasUniqueScenario = true;
            } else if (outsideMask !== 0) {
              // Procura cenário vizinho (troca 1 bit interno por 1 bit do universo) coberto em >= 14 apenas por i
              let inBits = m;
              while (inBits !== 0 && !hasUniqueScenario) {
                const remBit = inBits & -inBits;
                inBits ^= remBit;
                let outBits = outsideMask;
                while (outBits !== 0 && !hasUniqueScenario) {
                  const addBit = outBits & -outBits;
                  outBits ^= addBit;
                  const neighborScenario = (m ^ remBit) | addBit;
                  let exclusive14 = true;
                  for (let j = 0; j < masks.length; j++) {
                    if (j !== i && hammingDistanceBitwise(neighborScenario, masks[j]) <= 1) {
                      exclusive14 = false;
                      break;
                    }
                  }
                  if (exclusive14) hasUniqueScenario = true;
                }
              }
            }

            // Em fechamento saturado (ex: 16 dezenas / 16 jogos), cada bilhete é único em 15 pts
            if (!hasUniqueScenario && data.selectedNumbers.length <= 16) {
              hasUniqueScenario = true;
            }
            if (!hasUniqueScenario) {
              uniqueContributionVerified = false;
              break;
            }
          }
        }
      }

      postMsg({
        type: 'PROGRESS',
        jobId,
        percent: 90,
        message: `Auditoria bitwise concluída (Hamming mín.: ${
          masks.length > 1 ? minObservedHamming : 15
        }, alvo: ≥${targetHamming}, Set Cover único: ${
          uniqueContributionVerified ? 'OK' : 'Revisar'
        }${appliedFallbackLevel > 0 ? ` • Fallback Nível ${appliedFallbackLevel}` : ''})...`,
      });

      postMsg({
        type: 'DONE_COVERING',
        jobId,
        payload: {
          tickets,
          count: tickets.length,
          workerMetrics: {
            modoFixas: kInfo.modo,
            kMinFixas: kInfo.minK,
            kMaxFixas: kInfo.maxK,
            targetHamming,
            minObservedHamming: masks.length > 1 ? minObservedHamming : 15,
            uniqueContributionVerified,
            duplicateTicketsCount,
            stratifiedQuotas: quotas,
            fallbackLevel: appliedFallbackLevel,
            fallbackLabel: appliedFallbackLabel,
            fallbackDescription: appliedFallbackDescription,
          },
        },
      });
    } else if (data.type === 'START_PONDERADO') {
      const fixasSanitizadas = sanitizeFixedNumbersWorker(
        data.filters?.dezenasFixas || [],
        data.selectedNumbers
      );
      const kInfo = resolveRotativeFixedKofN(fixasSanitizadas.length, data.filters?.modoFixas);

      postMsg({
        type: 'PROGRESS',
        jobId,
        percent: 20,
        message: 'Calculando IP, Fixas Rotativas (K de N) e auto-calibração de soma do universo...',
      });

      const result: FechamentoPonderadoResult = generateFechamentoInteligentePonderado({
        selectedNumbers: data.selectedNumbers,
        targetHits: data.targetHits,
        maxTickets: data.maxTickets,
        filters: {
          ...data.filters,
          dezenasFixas: fixasSanitizadas,
          modoFixas: kInfo.modo,
        },
        dynamicStats: data.dynamicStats,
        latestDraw: data.latestDraw,
        aiScores: data.aiScores,
      });

      postMsg({
        type: 'PROGRESS',
        jobId,
        percent: 90,
        message: 'Aplicando Set Cover Adaptativo (14+13 pts), refinamento 1-swap e Hamming bitwise...',
      });

      postMsg({
        type: 'DONE_PONDERADO',
        jobId,
        payload: result,
      });
    } else if (data.type === 'START_SPECIAL_MATRIX') {
      postMsg({
        type: 'PROGRESS',
        jobId,
        percent: 25,
        message: 'Processando matriz especial com poda antecipada e auditoria bitwise...',
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
          maxGames: data.maxTickets === 9 ? 9 : 10,
          iterations: 200,
          dynamicStats: data.dynamicStats,
          filters: data.filters,
          aiScores: data.aiScores,
        });
      }

      postMsg({
        type: 'DONE_COVERING',
        jobId,
        payload: {
          tickets,
          count: tickets.length,
        },
      });
    } else if (data.type === 'SIMULATE_FILTERS') {
      const startedAt = Date.now();
      const TOTAL_LOTOFACIL_COMBOS = 3268760;
      const sampleCount = Math.max(5000, Math.min(250000, data.sampleCount ?? 100000));
      const latestDraw = data.latestDraw;
      const filters = data.filters;

      postMsg({
        type: 'PROGRESS',
        jobId,
        percent: 10,
        message: `Web Worker avaliando ${sampleCount.toLocaleString('pt-BR')} combinações de C(25,15)...`,
      });

      let seed = 38362026;
      const nextRand = () => {
        seed = (seed * 1664525 + 1013904223) >>> 0;
        return seed / 4294967296;
      };

      const baseNums = [
        1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25,
      ];
      let passedSamples = 0;
      const chunkSize = Math.max(5000, Math.floor(sampleCount / 4));

      for (let i = 0; i < sampleCount; i++) {
        // Partial Fisher-Yates for 15 numbers
        const arr = baseNums.slice();
        for (let j = 24; j >= 10; j--) {
          const k = Math.floor(nextRand() * (j + 1));
          const tmp = arr[j];
          arr[j] = arr[k];
          arr[k] = tmp;
        }
        const cand = arr.slice(10, 25).sort((a, b) => a - b);
        if (validateFilters(cand, filters, latestDraw.dezenas).isValid) {
          passedSamples++;
        }

        if ((i + 1) % chunkSize === 0 && i + 1 < sampleCount) {
          const pct = Math.min(82, 15 + Math.round(((i + 1) / sampleCount) * 65));
          postMsg({
            type: 'PROGRESS',
            jobId,
            percent: pct,
            message: `Processando ${(i + 1).toLocaleString('pt-BR')}/${sampleCount.toLocaleString('pt-BR')} combinações em Web Worker...`,
          });
        }
      }

      const survivalRatio = passedSamples / sampleCount;
      const estimatedPassingCombos = Math.round(TOTAL_LOTOFACIL_COMBOS * survivalRatio);
      const reductionPercent = Number(((1 - survivalRatio) * 100).toFixed(1));

      // Historical backtest on last 10 & 50 draws
      const draws50 = getHistoricalNDraws(50, latestDraw);
      const historicalFilters: FilterCriteria = {
        ...filters,
        dezenasFixas: [],
        dezenasExcluidas: [],
        antiColisaoHistoricaAtiva: false,
        palpiteIneditoAtivo: false,
      };

      let approved10 = 0;
      let approved50 = 0;
      for (let i = 0; i < draws50.length; i++) {
        const current = draws50[i];
        const prevDezenas = draws50[i + 1]?.dezenas ?? latestDraw.dezenas;
        if (validateFilters(current.dezenas, historicalFilters, prevDezenas).isValid) {
          approved50++;
          if (i < 10) approved10++;
        }
      }

      const rate10 =
        draws50.length > 0 ? Math.round((approved10 / Math.min(10, draws50.length)) * 100) : 0;
      const rate50 = draws50.length > 0 ? Math.round((approved50 / draws50.length) * 100) : 0;

      const previewResults = (data.previewGames || []).map((game, idx) => {
        const analysis = analyzeTicket(game.dezenas, latestDraw.dezenas, data.aiScores);
        const validation = validateFilters(game.dezenas, filters, latestDraw.dezenas);
        return {
          ...game,
          index: idx + 1,
          analysis,
          passes: validation.isValid,
          failureReasons: validation.violations,
        };
      });

      const durationMs = Math.max(1, Date.now() - startedAt);

      postMsg({
        type: 'DONE_FILTER_SIMULATION',
        jobId,
        payload: {
          estimatedPassingCombos,
          reductionPercent,
          survivalPct: Number((survivalRatio * 100).toFixed(2)),
          evaluatedSamples: sampleCount,
          passedSamples,
          durationMs,
          approved10,
          total10: Math.min(10, draws50.length),
          rate10,
          approved50,
          total50: draws50.length,
          rate50,
          previewResults,
        },
      });
    }
  } catch (err: any) {
    postMsg({
      type: 'ERROR',
      jobId,
      error: err?.message || 'Erro inesperado na thread do Web Worker combinatório.',
      stack: err?.stack,
    });
  }
}

// Registra listener somente quando executado em contexto de Web Worker / Browser
if (typeof self !== 'undefined' && typeof (self as any).postMessage === 'function') {
  self.onmessage = (e: MessageEvent<GeneratorWorkerIncomingMessage>) => {
    handleGeneratorWorkerMessage(e.data, (msg) => self.postMessage(msg));
  };
}
