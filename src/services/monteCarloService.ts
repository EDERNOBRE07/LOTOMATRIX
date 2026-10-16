import { LotofacilDraw, DezenaStats } from '../types/lotofacil';
import { PRIMOS, MOLDURA } from '../data/lotofacilData';

export interface MonteCarloDezenaProjection {
  numero: number;
  probabilidadesPorConcurso: number[]; // Index 0..4 (Concursos +1 a +5)
  probabilidadeAoMenosUmaVez: number; // % chance de sair pelo menos 1 vez nos 5 concursos
  ocorrenciasEsperadas: number; // Média de vezes sorteadas nos 5 concursos (ex: 3.1)
  probabilidadeProximoConcurso: number; // % chance no concurso +1
  scorePressao: number; // Score de pressão combinada
  isCyclePending: boolean;
  atrasoAtual: number;
  classificacao: 'Alta Probabilidade' | 'Boa Chance' | 'Moderada' | 'Neutro';
  tendencia: 'Alta' | 'Estável' | 'Baixa';
}

export interface MonteCarloSimulationResult {
  iteracoes: number;
  concursoInicial: number;
  proximosConcursos: number[];
  projections: MonteCarloDezenaProjection[];
  top15ProximoConcurso: number[];
  top18Desdobramento: number[];
  tempoExecucaoMs: number;
  mediaAcertosSimulados: number;
}

export interface MonteCarloConfig {
  iterations: number;
  includeCycleBias: boolean;
  includeDelayPressure: boolean;
  includeRepeatBias: boolean;
}

export const DEFAULT_MONTE_CARLO_CONFIG: MonteCarloConfig = {
  iterations: 10000,
  includeCycleBias: true,
  includeDelayPressure: true,
  includeRepeatBias: true,
};

/**
 * Weighted sampling of k distinct elements from array 1..25
 */
function sampleWeighted15(weights: number[]): number[] {
  const selected: number[] = [];
  const available = Array.from({ length: 25 }, (_, i) => i + 1);
  const currentWeights = [...weights];

  while (selected.length < 15 && available.length > 0) {
    let sumWeight = 0;
    for (let i = 0; i < available.length; i++) {
      const numIdx = available[i] - 1;
      sumWeight += currentWeights[numIdx];
    }

    if (sumWeight <= 0) {
      // Fallback uniform selection if weights are zero
      const randIdx = Math.floor(Math.random() * available.length);
      selected.push(available[randIdx]);
      available.splice(randIdx, 1);
      continue;
    }

    let r = Math.random() * sumWeight;
    let chosenIdx = -1;

    for (let i = 0; i < available.length; i++) {
      const numIdx = available[i] - 1;
      r -= currentWeights[numIdx];
      if (r <= 0) {
        chosenIdx = i;
        break;
      }
    }

    if (chosenIdx === -1) {
      chosenIdx = available.length - 1;
    }

    selected.push(available[chosenIdx]);
    available.splice(chosenIdx, 1);
  }

  return selected.sort((a, b) => a - b);
}

/**
 * Executes Monte Carlo simulation for next 5 Lotofácil draws
 */
export function runMonteCarloSimulation(
  latestDraw: LotofacilDraw,
  statsList: DezenaStats[],
  cyclePendingNumbers: number[] = [17, 22],
  config: MonteCarloConfig = DEFAULT_MONTE_CARLO_CONFIG
): MonteCarloSimulationResult {
  const startTime = performance.now();
  const N = Math.max(1000, Math.min(50000, config.iterations));
  const numSteps = 5;

  const startConcurso = latestDraw.concurso;
  const proximosConcursos = Array.from({ length: numSteps }, (_, i) => startConcurso + 1 + i);

  // Baseline base weights from historical appearances
  // In Lotofácil, average frequency per dezena is 15/25 = 0.60 (60%)
  const statsMap = new Map<number, DezenaStats>();
  statsList.forEach((s) => statsMap.set(s.numero, s));

  const baseWeights = Array.from({ length: 25 }, (_, i) => {
    const num = i + 1;
    const stat = statsMap.get(num);
    const vezes = stat?.vezes || 2280;
    // Normalize around 1.0
    return vezes / 2280;
  });

  // Accumulators
  // countsPerStep[step][dezenaIndex]
  const countsPerStep: number[][] = Array.from({ length: numSteps }, () =>
    new Array(25).fill(0)
  );

  // totalOccurrencesIn5[dezenaIndex]
  const totalOccurrencesIn5 = new Array(25).fill(0);
  // atLeastOnceCount[dezenaIndex]
  const atLeastOnceCount = new Array(25).fill(0);

  // Run N Monte Carlo trajectories
  for (let iter = 0; iter < N; iter++) {
    let currentLastDrawn = [...latestDraw.dezenas];
    const occurrencesThisIteration = new Array(25).fill(0);

    for (let step = 0; step < numSteps; step++) {
      // Calculate dynamic step weights
      const stepWeights = [...baseWeights];

      for (let i = 0; i < 25; i++) {
        const num = i + 1;
        const stat = statsMap.get(num);
        const atrasoAtual = stat ? stat.atrasoAtual + step : step;

        // 1. Cycle Pending Bonus (Cycle 804 urgency: pending numbers 17 & 22)
        if (config.includeCycleBias && cyclePendingNumbers.includes(num)) {
          // As steps advance without drawing, cycle pressure increases exponentially
          stepWeights[i] *= 1.35 + step * 0.08;
        }

        // 2. Delay Pressure (hazard rate increases if delay is above historical average)
        if (config.includeDelayPressure && stat) {
          if (atrasoAtual >= stat.maiorAtraso) {
            stepWeights[i] *= 1.30;
          } else if (atrasoAtual >= stat.atrasoMedio * 1.5) {
            stepWeights[i] *= 1.20;
          } else if (atrasoAtual >= 3) {
            stepWeights[i] *= 1.10;
          }
        }

        // 3. Repeat Bias from previous draw (approx 9 repeated numbers out of 15, ~60% repeat rate)
        if (config.includeRepeatBias && currentLastDrawn.includes(num)) {
          stepWeights[i] *= 1.12;
        }
      }

      // Sample 15 distinct numbers
      const drawn15 = sampleWeighted15(stepWeights);

      // Accumulate
      for (const num of drawn15) {
        countsPerStep[step][num - 1]++;
        occurrencesThisIteration[num - 1]++;
      }

      // Update state for next step
      currentLastDrawn = drawn15;
    }

    // Record at least once and totals
    for (let i = 0; i < 25; i++) {
      totalOccurrencesIn5[i] += occurrencesThisIteration[i];
      if (occurrencesThisIteration[i] > 0) {
        atLeastOnceCount[i]++;
      }
    }
  }

  // Calculate final projections
  const projections: MonteCarloDezenaProjection[] = Array.from({ length: 25 }, (_, i) => {
    const numero = i + 1;
    const stat = statsMap.get(numero);
    const isCycle = cyclePendingNumbers.includes(numero);
    const atraso = stat?.atrasoAtual || 0;

    const probabilidadesPorConcurso = countsPerStep.map((stepCounts) =>
      Number(((stepCounts[i] / N) * 100).toFixed(1))
    );

    const probAoMenosUmaVez = Number(((atLeastOnceCount[i] / N) * 100).toFixed(1));
    const ocorrenciasEsperadas = Number((totalOccurrencesIn5[i] / N).toFixed(2));
    const probProximo = probabilidadesPorConcurso[0];

    // Score de pressão combinada (0 a 100)
    let scorePressao = probProximo * 0.6 + (ocorrenciasEsperadas / 5) * 40;
    if (isCycle) scorePressao += 10;
    scorePressao = Math.min(99.5, Number(scorePressao.toFixed(1)));

    let classificacao: MonteCarloDezenaProjection['classificacao'] = 'Neutro';
    if (probProximo >= 68 || scorePressao >= 85 || isCycle) {
      classificacao = 'Alta Probabilidade';
    } else if (probProximo >= 62 || scorePressao >= 75) {
      classificacao = 'Boa Chance';
    } else if (probProximo >= 56) {
      classificacao = 'Moderada';
    }

    // Tendência ao longo dos 5 sorteios
    const firstHalfAvg = (probabilidadesPorConcurso[0] + probabilidadesPorConcurso[1]) / 2;
    const secondHalfAvg = (probabilidadesPorConcurso[3] + probabilidadesPorConcurso[4]) / 2;
    let tendencia: MonteCarloDezenaProjection['tendencia'] = 'Estável';
    if (secondHalfAvg - firstHalfAvg > 3) tendencia = 'Alta';
    else if (firstHalfAvg - secondHalfAvg > 3) tendencia = 'Baixa';

    return {
      numero,
      probabilidadesPorConcurso,
      probabilidadeAoMenosUmaVez: probAoMenosUmaVez,
      ocorrenciasEsperadas,
      probabilidadeProximoConcurso: probProximo,
      scorePressao,
      isCyclePending: isCycle,
      atrasoAtual: atraso,
      classificacao,
      tendencia,
    };
  });

  // Sort projections by probability in next draw (#3805)
  const sortedByNext = [...projections].sort(
    (a, b) => b.probabilidadeProximoConcurso - a.probabilidadeProximoConcurso
  );

  const top15ProximoConcurso = sortedByNext.slice(0, 15).map((p) => p.numero).sort((a, b) => a - b);
  const top18Desdobramento = sortedByNext.slice(0, 18).map((p) => p.numero).sort((a, b) => a - b);

  const tempoExecucaoMs = Math.round(performance.now() - startTime);

  return {
    iteracoes: N,
    concursoInicial: startConcurso,
    proximosConcursos,
    projections,
    top15ProximoConcurso,
    top18Desdobramento,
    tempoExecucaoMs,
    mediaAcertosSimulados: 15,
  };
}
