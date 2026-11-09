import { PRIMOS, MOLDURA, MIOLO, CRUZ_DEZENAS } from '../data/lotofacilData';
import { getMaxConsecutiveSequence } from './combinatorics';

export interface StatisticalAnomaly {
  type: 'soma' | 'paridade' | 'primos' | 'moldura' | 'sequencia' | 'extremidades' | 'cruz';
  severity: 'critical' | 'warning';
  title: string;
  description: string;
  value: number | string;
  idealRange: string;
  historicalFrequency: string;
}

export interface GameMonitoringResult {
  gameId: string;
  index: number;
  dezenas: number[];
  soma: number;
  pares: number;
  impares: number;
  primos: number;
  moldura: number;
  miolo: number;
  cruz: number;
  bola1: number;
  bola15: number;
  maxSequencia: number;
  isImprobable: boolean;
  hasCriticalAnomaly: boolean;
  hasExtremidadesAnomaly: boolean;
  isZonaDeOuroCruz: boolean;
  anomalies: StatisticalAnomaly[];
}

export interface MonitoringSummary {
  totalAnalyzed: number;
  improbableCount: number;
  balancedCount: number;
  improbablePercentage: number;
  somaAnomaliesCount: number;
  paridadeAnomaliesCount: number;
  primosAnomaliesCount: number;
  molduraAnomaliesCount: number;
  sequenciaAnomaliesCount: number;
  extremidadesAnomaliesCount: number;
  cruzAnomaliesCount: number;
  cruzZonaOuroCount: number;
  gamesWithAnomalies: GameMonitoringResult[];
  allResults: GameMonitoringResult[];
}

/**
 * Evaluates a single 15-number Lotofácil game for statistical probability / anomalies
 * Canonical reference based on 3,800+ official Caixa draws:
 * - Sum range: 175 to 220 (82.4% frequency)
 * - Parity: 7P/8I or 8P/7I (~62.3% frequency); <= 4 or >= 10 is < 2.5%
 * - Primes: 4 to 7 (88.3% frequency); <= 2 or >= 9 is < 1.5%
 * - Frame (Moldura): 8 to 11 (85.7% frequency); <= 6 or >= 13 is < 1.8%
 * - Consecutive sequence: max <= 5 (sequences >= 7 is < 0.5%)
 */
export function analyzeGameStatistics(
  dezenas: number[],
  gameLabel: string = 'Jogo',
  index: number = 0
): GameMonitoringResult {
  const sorted = [...dezenas].sort((a, b) => a - b);
  const soma = sorted.reduce((acc, curr) => acc + curr, 0);
  const pares = sorted.filter((n) => n % 2 === 0).length;
  const impares = sorted.length - pares;
  const primos = sorted.filter((n) => PRIMOS.includes(n)).length;
  const moldura = sorted.filter((n) => MOLDURA.includes(n)).length;
  const miolo = sorted.filter((n) => MIOLO.includes(n)).length;
  const cruz = sorted.filter((n) => CRUZ_DEZENAS.includes(n)).length;
  const bola1 = sorted[0];
  const bola15 = sorted[sorted.length - 1];
  const maxSequencia = getMaxConsecutiveSequence(sorted);

  const anomalies: StatisticalAnomaly[] = [];

  // 1. Soma fora do intervalo canônico (175 a 220)
  if (soma < 175) {
    const isCritical = soma < 162;
    anomalies.push({
      type: 'soma',
      severity: isCritical ? 'critical' : 'warning',
      title: `Soma Baixa Anômala (${soma})`,
      description: `A soma (${soma}) está abaixo do intervalo canônico de 175 a 220. Menos de 8.8% dos sorteios da Lotofácil ocorrem com soma inferior a 175, pois indica concentração excessiva em números baixos (01 a 12).`,
      value: soma,
      idealRange: '175 a 220',
      historicalFrequency: '8.8% dos sorteios',
    });
  } else if (soma > 220) {
    const isCritical = soma > 232;
    anomalies.push({
      type: 'soma',
      severity: isCritical ? 'critical' : 'warning',
      title: `Soma Alta Anômala (${soma})`,
      description: `A soma (${soma}) ultrapassa o teto recomendado de 220. Menos de 8.8% dos concursos na história da Lotofácil registraram somas acima de 220 (concentração em dezenas finais 14 a 25).`,
      value: soma,
      idealRange: '175 a 220',
      historicalFrequency: '8.8% dos sorteios',
    });
  }

  // 2. Número excessivo de pares ou ímpares
  if (pares >= 10) {
    const isCritical = pares >= 11;
    anomalies.push({
      type: 'paridade',
      severity: isCritical ? 'critical' : 'warning',
      title: `Excesso de Pares (${pares}P / ${impares}I)`,
      description: `O bilhete possui ${pares} números pares e apenas ${impares} ímpares. Configurações com 10 ou mais pares ocorreram em menos de 2.4% dos sorteios oficiais Caixa. O padrão dominante é 7P/8I ou 8P/7I (~62.3%).`,
      value: `${pares}P / ${impares}I`,
      idealRange: '7P/8I ou 8P/7I (ou 6P/9I)',
      historicalFrequency: '< 2.4% histórico',
    });
  } else if (impares >= 10) {
    const isCritical = impares >= 11;
    anomalies.push({
      type: 'paridade',
      severity: isCritical ? 'critical' : 'warning',
      title: `Excesso de Ímpares (${impares}I / ${pares}P)`,
      description: `O bilhete possui ${impares} números ímpares e apenas ${pares} pares. Configurações com 10 ou mais ímpares ocorreram em menos de 2.9% dos concursos da Lotofácil.`,
      value: `${impares}I / ${pares}P`,
      idealRange: '7P/8I ou 8P/7I (ou 9P/6I)',
      historicalFrequency: '< 2.9% histórico',
    });
  }

  // 3. Distribuição de números primos (2, 3, 5, 7, 11, 13, 17, 19, 23)
  if (primos <= 2) {
    anomalies.push({
      type: 'primos',
      severity: 'warning',
      title: `Poucos Primos (${primos})`,
      description: `Apenas ${primos} números primos presentes. A faixa canônica de equilíbrio na Lotofácil é de 4 a 7 primos (presente em 88.3% de todos os concursos).`,
      value: `${primos} primos`,
      idealRange: '4 a 7 primos',
      historicalFrequency: '1.4% dos sorteios',
    });
  } else if (primos >= 9) {
    anomalies.push({
      type: 'primos',
      severity: 'critical',
      title: `Excesso de Primos (${primos})`,
      description: `O jogo selecionou todos ou quase todos os 9 primos da Lotofácil. Apenas 0.3% dos concursos possuem 9 primos sorteados.`,
      value: `${primos} primos`,
      idealRange: '4 a 7 primos',
      historicalFrequency: '< 0.3% dos sorteios',
    });
  }

  // 4. Distribuição da Moldura (16 dezenas externas)
  if (moldura <= 6) {
    anomalies.push({
      type: 'moldura',
      severity: 'warning',
      title: `Pouca Moldura (${moldura})`,
      description: `Apenas ${moldura} dezenas na moldura. O padrão histórico dominante é de 8 a 11 na moldura (ocorre em 85.7% dos concursos).`,
      value: `${moldura} na moldura`,
      idealRange: '8 a 11 na moldura',
      historicalFrequency: '1.8% histórico',
    });
  } else if (moldura >= 13) {
    anomalies.push({
      type: 'moldura',
      severity: 'warning',
      title: `Excesso de Moldura (${moldura})`,
      description: `${moldura} dezenas na moldura externa. Mais de 12 dezenas na moldura ocorre em menos de 1.2% dos sorteios.`,
      value: `${moldura} na moldura`,
      idealRange: '8 a 11 na moldura',
      historicalFrequency: '1.2% histórico',
    });
  }

  // 5. Sequências consecutivas extremas
  if (maxSequencia >= 7) {
    anomalies.push({
      type: 'sequencia',
      severity: 'critical',
      title: `Sequência Consecutiva Longa (${maxSequencia} números)`,
      description: `Foram detectados ${maxSequencia} números seguidos consecutivos. Sequências contíguas de 7 ou mais dezenas ocorrem em menos de 0.5% dos resultados oficiais.`,
      value: `${maxSequencia} seguidos`,
      idealRange: 'Máx. 3 a 5 seguidos',
      historicalFrequency: '< 0.5% histórico',
    });
  }

  // 6. Filtro de Extremidades: Bola 1 [1-4] e Bola 15 [22-25]
  const hasExtremidadesAnomaly = bola1 < 1 || bola1 > 4 || bola15 < 22 || bola15 > 25;
  if (bola1 > 4) {
    anomalies.push({
      type: 'extremidades',
      severity: 'warning',
      title: `Bola 1 Fora do Padrão (${bola1.toString().padStart(2, '0')})`,
      description: `A primeira dezena do bilhete é ${bola1.toString().padStart(2, '0')}. O padrão canônico da Lotofácil (mais de 98.5% dos concursos) tem a Bola 1 no range [01 a 04]. Jogos iniciados em 05 ou mais possuem chance atípica inferior a 1.5%.`,
      value: `Bola 1: ${bola1.toString().padStart(2, '0')}`,
      idealRange: '01 a 04',
      historicalFrequency: '< 1.5% histórico',
    });
  }
  if (bola15 < 22) {
    anomalies.push({
      type: 'extremidades',
      severity: 'warning',
      title: `Bola 15 Fora do Padrão (${bola15.toString().padStart(2, '0')})`,
      description: `A última dezena do bilhete é ${bola15.toString().padStart(2, '0')}. O padrão canônico da Lotofácil (mais de 98.7% dos concursos) tem a Bola 15 no range [22 a 25]. Jogos encerrados em 21 ou menos ocorrem em menos de 1.3% dos sorteios.`,
      value: `Bola 15: ${bola15.toString().padStart(2, '0')}`,
      idealRange: '22 a 25',
      historicalFrequency: '< 1.3% histórico',
    });
  }

  // 7. Filtro Avançado: Cruz da Lotofácil (9 dezenas centrais: 3, 8, 11, 12, 13, 14, 15, 18, 23)
  const isZonaDeOuroCruz = cruz >= 5 && cruz <= 6;
  if (cruz < 4) {
    anomalies.push({
      type: 'cruz',
      severity: 'warning',
      title: `Pouca Cruz (${cruz} dezenas)`,
      description: `Apenas ${cruz} dezenas na Cruz da Lotofácil. A faixa canônica de equilíbrio é de 4 a 7 dezenas, com destaque para a Zona de Ouro (5 a 6 dezenas presentes em >72% dos concursos).`,
      value: `${cruz} na Cruz`,
      idealRange: '4 a 7 dezenas (Zona de Ouro: 5 a 6)',
      historicalFrequency: '< 6.5% histórico',
    });
  } else if (cruz > 7) {
    anomalies.push({
      type: 'cruz',
      severity: 'warning',
      title: `Excesso na Cruz (${cruz} dezenas)`,
      description: `Foram marcadas ${cruz} dezenas na Cruz da Lotofácil. Mais de 7 dezenas na Cruz representa concentração excessiva que ocorre em menos de 3.2% dos sorteios.`,
      value: `${cruz} na Cruz`,
      idealRange: '4 a 7 dezenas (Zona de Ouro: 5 a 6)',
      historicalFrequency: '< 3.2% histórico',
    });
  }

  const isImprobable = anomalies.length > 0;
  const hasCriticalAnomaly = anomalies.some((a) => a.severity === 'critical');

  return {
    gameId: gameLabel,
    index,
    dezenas: sorted,
    soma,
    pares,
    impares,
    primos,
    moldura,
    miolo,
    cruz,
    bola1,
    bola15,
    maxSequencia,
    isImprobable,
    hasCriticalAnomaly,
    hasExtremidadesAnomaly,
    isZonaDeOuroCruz,
    anomalies,
  };
}

/**
 * Analyzes an entire list of games and produces a summary with counts and anomaly breakdowns
 */
export function analyzeGamesList(
  games: { dezenas: number[]; label?: string; index?: number }[]
): MonitoringSummary {
  const allResults = games.map((g, idx) =>
    analyzeGameStatistics(g.dezenas, g.label || `Jogo ${(idx + 1).toString().padStart(2, '0')}`, g.index ?? idx + 1)
  );

  const gamesWithAnomalies = allResults.filter((r) => r.isImprobable);
  const totalAnalyzed = allResults.length;
  const improbableCount = gamesWithAnomalies.length;
  const balancedCount = totalAnalyzed - improbableCount;
  const improbablePercentage = totalAnalyzed > 0 ? (improbableCount / totalAnalyzed) * 100 : 0;

  let somaAnomaliesCount = 0;
  let paridadeAnomaliesCount = 0;
  let primosAnomaliesCount = 0;
  let molduraAnomaliesCount = 0;
  let sequenciaAnomaliesCount = 0;
  let extremidadesAnomaliesCount = 0;
  let cruzAnomaliesCount = 0;
  let cruzZonaOuroCount = 0;

  allResults.forEach((game) => {
    if (game.isZonaDeOuroCruz) cruzZonaOuroCount++;
  });

  gamesWithAnomalies.forEach((game) => {
    game.anomalies.forEach((anom) => {
      if (anom.type === 'soma') somaAnomaliesCount++;
      if (anom.type === 'paridade') paridadeAnomaliesCount++;
      if (anom.type === 'primos') primosAnomaliesCount++;
      if (anom.type === 'moldura') molduraAnomaliesCount++;
      if (anom.type === 'sequencia') sequenciaAnomaliesCount++;
      if (anom.type === 'extremidades') extremidadesAnomaliesCount++;
      if (anom.type === 'cruz') cruzAnomaliesCount++;
    });
  });

  return {
    totalAnalyzed,
    improbableCount,
    balancedCount,
    improbablePercentage,
    somaAnomaliesCount,
    paridadeAnomaliesCount,
    primosAnomaliesCount,
    molduraAnomaliesCount,
    sequenciaAnomaliesCount,
    extremidadesAnomaliesCount,
    cruzAnomaliesCount,
    cruzZonaOuroCount,
    gamesWithAnomalies,
    allResults,
  };
}
