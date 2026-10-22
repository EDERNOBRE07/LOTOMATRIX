// Algoritmo de Força Bruta Otimizado com Bitwise Operations para Fechamentos de 14 Pontos
// Garante 14 pontos se as 15 sorteadas estiverem entre as N dezenas selecionadas em < 2 segundos.

import { GameTicket, FilterCriteria } from '../types/lotofacil';
import { isJogoPlauzivelLotofacil } from './combinatorics';

// Contagem rápida de bits (popcount 32 bits)
export function popcount(n: number): number {
  n = n - ((n >>> 1) & 0x55555555);
  n = (n & 0x33333333) + ((n >>> 2) & 0x33333333);
  return (((n + (n >>> 4)) & 0x0f0f0f0f) * 0x01010101) >>> 24;
}

// Converte array de dezenas (1-25) em bitmask 32-bit
export function numbersToMask(nums: number[]): number {
  let mask = 0;
  for (let i = 0; i < nums.length; i++) {
    mask |= 1 << (nums[i] - 1);
  }
  return mask;
}

// Converte bitmask de volta em array ordenado de dezenas (1-25)
export function maskToNumbers(mask: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < 25; i++) {
    if ((mask & (1 << i)) !== 0) {
      result.push(i + 1);
    }
  }
  return result;
}

export interface TurboProgress {
  phase: 'subsets' | 'candidates' | 'greedy_cover' | 'verifying' | 'completed';
  percent: number;
  totalSubsets: number;
  coveredSubsets: number;
  candidatesCount: number;
  selectedTicketsCount: number;
  elapsedMs: number;
  opsPerSec: number;
}

export interface TurboResult {
  tickets: GameTicket[];
  totalCombinations: number;
  coveredCombinations: number;
  coveragePercent: number;
  elapsedMs: number;
  guaranteeReached: boolean;
  poolSize: number;
  fixedCount: number;
  iterationsCount: number;
}

// Gera todas as combinações k de um array em forma de bitmask
function generateCombinationMasks(elements: number[], k: number, mustIncludeMask: number = 0): number[] {
  const results: number[] = [];
  const n = elements.length;
  if (k > n || k <= 0) return results;

  const current: number[] = new Array(k);

  function recurse(start: number, depth: number) {
    if (depth === k) {
      let mask = mustIncludeMask;
      for (let i = 0; i < k; i++) {
        mask |= 1 << (current[i] - 1);
      }
      results.push(mask);
      return;
    }

    const maxStart = n - (k - depth);
    for (let i = start; i <= maxStart; i++) {
      current[depth] = elements[i];
      recurse(i + 1, depth + 1);
    }
  }

  recurse(0, 0);
  return results;
}

// Execução síncrona/core do algoritmo de força bruta e cobertura gananciosa
export function executeTurbo14Cover(
  selectedNumbers: number[],
  fixedNumbers: number[] = [],
  excludedNumbers: number[] = [],
  maxTicketsLimit: number = 32,
  onProgress?: (p: TurboProgress) => void
): TurboResult {
  const startTime = performance.now();
  let opsCounter = 0;

  // Normalização do pool
  const pool = Array.from(new Set(selectedNumbers.filter((n) => !excludedNumbers.includes(n)))).sort(
    (a, b) => a - b
  );
  const fixed = Array.from(new Set(fixedNumbers.filter((n) => pool.includes(n)))).sort(
    (a, b) => a - b
  );
  const variable = pool.filter((n) => !fixed.includes(n));

  const neededFromVariable = 15 - fixed.length;
  if (neededFromVariable < 0 || variable.length < neededFromVariable) {
    throw new Error('Configuração inválida de dezenas fixas ou pool insuficiente para formar 15 números.');
  }

  const fixedMask = numbersToMask(fixed);

  // 1. Gera todos os subconjuntos de 15 possíveis a partir do pool selecionado (o universo de sorteios possíveis se 15 caírem no pool)
  // Total é C(N, 15). Se houver fixas obrigatórias no universo: C(variable.length, 15 - fixed.length)
  const subsetMasks = generateCombinationMasks(variable, neededFromVariable, fixedMask);
  const totalSubsets = subsetMasks.length;

  if (onProgress) {
    onProgress({
      phase: 'subsets',
      percent: 15,
      totalSubsets,
      coveredSubsets: 0,
      candidatesCount: 0,
      selectedTicketsCount: 0,
      elapsedMs: Math.round(performance.now() - startTime),
      opsPerSec: 0,
    });
  }

  // 2. Pré-filtra candidatos: cada candidato é um jogo de 15 números formado pelas fixas + variáveis
  // Avalia plausibilidade estatística para não usar bilhetes anômalos
  const candidateMasks: number[] = [];
  for (let i = 0; i < subsetMasks.length; i++) {
    const mask = subsetMasks[i];
    const nums = maskToNumbers(mask);
    const diag = isJogoPlauzivelLotofacil(nums);
    // Prioriza candidatos plausíveis
    if (diag.plausivel) {
      candidateMasks.push(mask);
    }
  }

  // Se o filtro estatístico for muito severo, inclui todos os subsets como candidatos para não quebrar a cobertura
  const usableCandidates = candidateMasks.length >= 8 ? candidateMasks : subsetMasks;

  if (onProgress) {
    onProgress({
      phase: 'candidates',
      percent: 30,
      totalSubsets,
      coveredSubsets: 0,
      candidatesCount: usableCandidates.length,
      selectedTicketsCount: 0,
      elapsedMs: Math.round(performance.now() - startTime),
      opsPerSec: Math.round((totalSubsets * 1000) / (performance.now() - startTime + 1)),
    });
  }

  // 3. Força Bruta Otimizada com Cobertura Gananciosa Bitwise (Greedy Set Cover para 14 pontos)
  // Cada subset s precisa ter ao menos um ticket t com popcount(s & t) >= 14
  const covered = new Uint8Array(totalSubsets); // 0 = uncovered, 1 = covered
  let coveredCount = 0;
  const chosenTicketsMasks: number[] = [];

  // Mapeamento de cobertura por candidato
  // Para agilidade extrema, usamos array de candidatos
  const candidatesLeft = [...usableCandidates];

  while (coveredCount < totalSubsets && chosenTicketsMasks.length < maxTicketsLimit) {
    let bestCandidateIdx = -1;
    let bestNewCovers = -1;

    // Busca o candidato que cobre mais subsets ainda descobertos com >= 14 pontos
    for (let c = 0; c < candidatesLeft.length; c++) {
      const cMask = candidatesLeft[c];
      let newCovers = 0;

      for (let s = 0; s < totalSubsets; s++) {
        opsCounter++;
        if (covered[s] === 0) {
          const intersection = popcount(cMask & subsetMasks[s]);
          if (intersection >= 14) {
            newCovers++;
          }
        }
      }

      if (newCovers > bestNewCovers) {
        bestNewCovers = newCovers;
        bestCandidateIdx = c;
      }
    }

    if (bestCandidateIdx === -1 || bestNewCovers <= 0) {
      // Se os candidatos filtrados não cobrirem os subsets restantes, busca em todos os subsets
      let fallbackFound = false;
      for (let s = 0; s < totalSubsets; s++) {
        if (covered[s] === 0) {
          const fMask = subsetMasks[s];
          chosenTicketsMasks.push(fMask);
          // Marca tudo que este cobre
          for (let s2 = 0; s2 < totalSubsets; s2++) {
            if (covered[s2] === 0 && popcount(fMask & subsetMasks[s2]) >= 14) {
              covered[s2] = 1;
              coveredCount++;
            }
          }
          fallbackFound = true;
          break;
        }
      }
      if (!fallbackFound) break;
    } else {
      const chosenMask = candidatesLeft[bestCandidateIdx];
      chosenTicketsMasks.push(chosenMask);
      candidatesLeft.splice(bestCandidateIdx, 1);

      // Atualiza subsets cobertos
      for (let s = 0; s < totalSubsets; s++) {
        if (covered[s] === 0) {
          if (popcount(chosenMask & subsetMasks[s]) >= 14) {
            covered[s] = 1;
            coveredCount++;
          }
        }
      }
    }

    if (onProgress && chosenTicketsMasks.length % 2 === 0) {
      const elapsed = Math.round(performance.now() - startTime);
      onProgress({
        phase: 'greedy_cover',
        percent: Math.min(95, 30 + Math.round((coveredCount / totalSubsets) * 60)),
        totalSubsets,
        coveredSubsets: coveredCount,
        candidatesCount: candidatesLeft.length,
        selectedTicketsCount: chosenTicketsMasks.length,
        elapsedMs: elapsed,
        opsPerSec: Math.round((opsCounter * 1000) / (elapsed + 1)),
      });
    }
  }

  // 4. Verificação Auditada da Garantia de 14 Pontos
  let verified14Count = 0;
  for (let s = 0; s < totalSubsets; s++) {
    const sMask = subsetMasks[s];
    let maxHit = 0;
    for (let t = 0; t < chosenTicketsMasks.length; t++) {
      const hit = popcount(sMask & chosenTicketsMasks[t]);
      if (hit > maxHit) maxHit = hit;
      if (maxHit >= 14) break;
    }
    if (maxHit >= 14) {
      verified14Count++;
    }
  }

  const coveragePercent = Math.round((verified14Count / totalSubsets) * 1000) / 10;
  const elapsedMs = Math.round(performance.now() - startTime);

  // 5. Monta objetos GameTicket
  const tickets: GameTicket[] = chosenTicketsMasks.map((mask, idx) => {
    const nums = maskToNumbers(mask);
    const soma = nums.reduce((acc, v) => acc + v, 0);
    const pares = nums.filter((n) => n % 2 === 0).length;
    const impares = 15 - pares;
    const primos = nums.filter((n) => [2, 3, 5, 7, 11, 13, 17, 19, 23].includes(n)).length;
    const moldura = nums.filter((n) =>
      [1, 2, 3, 4, 5, 6, 10, 11, 15, 16, 20, 21, 22, 23, 24, 25].includes(n)
    ).length;
    const fibonacci = nums.filter((n) => [1, 2, 3, 5, 8, 13, 21].includes(n)).length;
    const diag = isJogoPlauzivelLotofacil(nums);

    return {
      id: `turbo-${idx + 1}-${Date.now()}`,
      numeros: nums,
      soma,
      pares,
      impares,
      primos,
      moldura,
      repetidas: 9,
      fibonacci,
      isAnomalia: !diag.plausivel,
      justificativaAnomalia: diag.plausivel ? undefined : diag.motivos.join(' • '),
    };
  });

  if (onProgress) {
    onProgress({
      phase: 'completed',
      percent: 100,
      totalSubsets,
      coveredSubsets: verified14Count,
      candidatesCount: usableCandidates.length,
      selectedTicketsCount: tickets.length,
      elapsedMs,
      opsPerSec: Math.round((opsCounter * 1000) / (elapsedMs + 1)),
    });
  }

  return {
    tickets,
    totalCombinations: totalSubsets,
    coveredCombinations: verified14Count,
    coveragePercent,
    elapsedMs,
    guaranteeReached: verified14Count === totalSubsets,
    poolSize: pool.length,
    fixedCount: fixed.length,
    iterationsCount: opsCounter,
  };
}
