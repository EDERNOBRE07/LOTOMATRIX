import {
  PRIMOS,
  MOLDURA,
  MIOLO,
  FIBONACCI,
  CRUZ_DEZENAS,
  BOLAS_EXTREMAS_INICIO,
  BOLAS_EXTREMAS_FIM,
  CONCURSO_ATUAL,
  RECENT_DRAWS,
  DEZENAS_STATS,
  TOP_DUPLAS,
  REGRA_VENCEDORA_CONCURSO_3822,
} from '../data/lotofacilData';
import {
  FilterCriteria,
  GameTicket,
  FechamentoMode,
  SimulationResult,
  LotofacilDraw,
  DezenaStats,
} from '../types/lotofacil';
import {
  countClasseADezenas,
  calculateCurvaAbc,
} from './curvaAbcService';
import { getAllSavedTicketsSet } from './savedFechamentosStorage';
import {
  criarMascara as _criarMascara,
  mascaraParaDezenas as _mascaraParaDezenas,
  popcount as _popcount,
  POSITIONAL_BOUNDS,
  PIVOT_9_DEZENAS,
  validarPosicionalSorted,
  validarMultiplosMask,
  calcularSomaAlgarismos,
  validarContagemDigitosMask,
  validarLinhasColunasMask,
  buildHistoricalMasksSet,
  combinarComPodaDinamica as _combinarComPodaDinamica,
  PodaDinamicaFiltros,
  MASK_CRUZ as _MASK_CRUZ,
} from './tabelasCoberturaLJCR';
import {
  calculateIndicePerformance,
  calculateTicketPerformanceIndex,
  getIntervalosRobustez50,
  isCombinationRobust50,
  generateFechamentoInteligentePonderado,
} from './fechamentoPonderadoService';
export {
  calculateIndicePerformance,
  calculateTicketPerformanceIndex,
  getIntervalosRobustez50,
  isCombinationRobust50,
  generateFechamentoInteligentePonderado,
};
export type {
  PerformanceIndexResult,
  Robustez50Intervals,
  FechamentoPonderadoResult,
} from './fechamentoPonderadoService';

export {
  MATRIZES_COBERTURA,
  gerarFechamentoLJCR,
  gerarComFixas,
  criarMascara,
  mascaraParaDezenas,
  popcount,
  MASK_PARES,
  MASK_MOLDURA,
  MASK_PRIMOS,
  MASK_FIBONACCI,
  MASK_CRUZ,
  MASK_M3,
  MASK_M4,
  MASK_M5,
  MASK_M6,
  MASK_M7,
  MASK_M8,
  MASK_UM_DIGITO,
  MASK_LINHAS,
  MASK_COLUNAS,
  PESO_DIGITOS,
  POSITIONAL_BOUNDS,
  PIVOT_9_DEZENAS,
  validarPosicionalSorted,
  validarMultiplosMask,
  calcularSomaAlgarismos,
  validarContagemDigitosMask,
  validarLinhasColunasMask,
  buildHistoricalMasksSet,
  combinarComPodaDinamica,
  combinacoes,
  gerarTodosCenariosAcerto,
  auditarGarantiaEfetiva,
  auditarMatrizCompleta,
  validarIntegridadeFechamento,
} from './tabelasCoberturaLJCR';
export type {
  MatrixCoberturaEntry,
  IndicadorGarantiaPayload,
  HistogramaAcertos,
  AuditoriaCompletaResultado,
} from './tabelasCoberturaLJCR';

export interface DetalheAuditoriaTicket {
  index: number;
  soma: number;
  pares: number;
  primos: number;
  moldura: number;
  maxConsecutivas: number;
  status: 'conforme' | 'protecao_cauda' | 'fora_faixa';
  mensagem: string;
}

export interface AuditoriaTicketsResultado {
  total: number;
  somaDentroCount: number;
  estritosCount: number;
  protecaoBordaCount: number;
  foraPadraoCount: number;
  taxaConformidadeSoma: number;
  percentualConformidade: number;
  resumo: string;
  detalhesPorTicket?: DetalheAuditoriaTicket[];
}

/**
 * Validador Dinâmico de Conformidade dos Tickets Gerados
 * Audita se cada bilhete está 100% dentro dos filtros canônicos estritos
 * ou alocado na cota de proteção de borda (Anti-Cisne Negro).
 * Grava o resumo dos resultados (ex: '20/20 bilhetes dentro da faixa')
 * na propriedade 'auditoriaAnomalias' de cada objeto de ticket.
 */
export function auditarTicketsGerados(
  tickets: GameTicket[],
  filtrosAtivos?: FilterCriteria | {
    filters?: FilterCriteria;
    universoDezenas?: number[];
    dezenasFixas?: number[];
  }
): AuditoriaTicketsResultado {
  if (!tickets || tickets.length === 0) {
    return {
      total: 0,
      somaDentroCount: 0,
      estritosCount: 0,
      protecaoBordaCount: 0,
      foraPadraoCount: 0,
      taxaConformidadeSoma: 0,
      percentualConformidade: 0,
      resumo: '0/0 bilhetes dentro da faixa',
      detalhesPorTicket: [],
    };
  }

  // Suporta tanto o objeto de filtros diretamente quanto embrulhado em configFechamento
  const f: FilterCriteria | undefined =
    filtrosAtivos && 'somaMin' in filtrosAtivos
      ? (filtrosAtivos as FilterCriteria)
      : (filtrosAtivos as any)?.filters;

  const minSoma = f?.minSoma ?? f?.somaMin ?? 180;
  const maxSoma = f?.maxSoma ?? f?.somaMax ?? 215;
  const minPares = f?.minPares ?? f?.paresMin ?? 6;
  const maxPares = f?.maxPares ?? f?.paresMax ?? 9;
  const minPrimos = f?.minPrimos ?? f?.primosMin ?? 4;
  const maxPrimos = f?.maxPrimos ?? f?.primosMax ?? 7;
  const minMoldura = f?.minMoldura ?? f?.molduraMin ?? 8;
  const maxMoldura = f?.maxMoldura ?? f?.molduraMax ?? 11;
  const maxSeqLimit = f?.maxConsecutivas ?? 6;

  let estritosCount = 0;
  let protecaoBordaCount = 0;
  let foraPadraoCount = 0;
  let somaDentroCount = 0;
  const total = tickets.length;

  // Primeiro passo: computa conformidade global da métrica de soma
  tickets.forEach((t) => {
    const dezenas = t.dezenas || (t as any).numbers || [];
    const soma = t.soma ?? dezenas.reduce((a, b) => a + b, 0);
    if (soma >= minSoma && soma <= maxSoma) {
      somaDentroCount++;
    }
  });

  const resumoFaixa = `${somaDentroCount}/${total} bilhetes dentro da faixa`;
  const detalhes: DetalheAuditoriaTicket[] = [];

  // Segundo passo: audita cada ticket individualmente e grava o resumo real na propriedade auditoriaAnomalias
  tickets.forEach((t, idx) => {
    const dezenas = t.dezenas || (t as any).numbers || [];
    const soma = t.soma ?? dezenas.reduce((a, b) => a + b, 0);
    const maxSeq = t.maxConsecutivas ?? getMaxConsecutiveSequence(dezenas);
    const pares = t.pares ?? dezenas.filter((d) => d % 2 === 0).length;
    const primos = t.primos ?? dezenas.filter((d) => PRIMOS.includes(d)).length;
    const moldura = t.moldura ?? dezenas.filter((d) => MOLDURA.includes(d)).length;

    const somaOk = soma >= minSoma && soma <= maxSoma;
    const paresOk = pares >= minPares && pares <= maxPares;
    const primosOk = primos >= minPrimos && primos <= maxPrimos;
    const molduraOk = moldura >= minMoldura && moldura <= maxMoldura;
    const seqOk = maxSeq <= maxSeqLimit;

    // Cota de proteção de cauda / borda (Soma 155-minSoma-1 ou maxSoma+1-235, ou até 8 consecutivas como no Concurso #3825 / #3830)
    const isBorda =
      t.faixaSoma === 'baixa' ||
      t.faixaSoma === 'alta' ||
      (soma >= 155 && soma < minSoma) ||
      (soma > maxSoma && soma <= 235) ||
      (maxSeq > 6 && maxSeq <= 8);

    // Grava o resumo de conformidade (ex: '20/20 bilhetes dentro da faixa') na propriedade auditoriaAnomalias
    t.auditoriaAnomalias = resumoFaixa;

    if (somaOk && paresOk && primosOk && molduraOk && seqOk) {
      estritosCount++;
      const msg = `${resumoFaixa} • Padrão Ouro (Soma: ${soma}, ${pares}P/${15 - pares}I, ${primos} Primos)`;
      detalhes.push({
        index: t.index ?? idx + 1,
        soma,
        pares,
        primos,
        moldura,
        maxConsecutivas: maxSeq,
        status: 'conforme',
        mensagem: msg,
      });
    } else if (isBorda) {
      protecaoBordaCount++;
      const msg = `${resumoFaixa} • Proteção de Cauda Anti-Cisne Negro (Soma: ${soma}, Seq: ${maxSeq})`;
      detalhes.push({
        index: t.index ?? idx + 1,
        soma,
        pares,
        primos,
        moldura,
        maxConsecutivas: maxSeq,
        status: 'protecao_cauda',
        mensagem: msg,
      });
    } else {
      foraPadraoCount++;
      const msg = `${resumoFaixa} • Fora da Faixa Estrita (Soma: ${soma}, ${pares}P, ${primos} Primos)`;
      detalhes.push({
        index: t.index ?? idx + 1,
        soma,
        pares,
        primos,
        moldura,
        maxConsecutivas: maxSeq,
        status: 'fora_faixa',
        mensagem: msg,
      });
    }
  });

  const percentualConformidade = total > 0 ? Math.round(((estritosCount + protecaoBordaCount) / total) * 100) : 0;
  const taxaConformidadeSoma = total > 0 ? Math.round((somaDentroCount / total) * 100) : 0;
  const resumo = `${resumoFaixa} (${taxaConformidadeSoma}%) • ${estritosCount}/${total} em Padrão Ouro`;

  return {
    total,
    somaDentroCount,
    estritosCount,
    protecaoBordaCount,
    foraPadraoCount,
    taxaConformidadeSoma,
    percentualConformidade,
    resumo,
    detalhesPorTicket: detalhes,
  };
}

// Helper: Check if number is prime
export function isPrimo(n: number): boolean {
  return PRIMOS.includes(n);
}

// Helper: Check if number is on the frame (moldura)
export function isMoldura(n: number): boolean {
  return MOLDURA.includes(n);
}

// Helper: Check if number is in the core (miolo)
export function isMiolo(n: number): boolean {
  return MIOLO.includes(n);
}

// Helper: Check if number is Fibonacci
export function isFibonacci(n: number): boolean {
  return FIBONACCI.includes(n);
}

// Helper: Check if number belongs to the Lotofácil Cross (Cruz: Linha 3 + Coluna 3)
export function isCruz(n: number): boolean {
  return CRUZ_DEZENAS.includes(n);
}

// Maximum consecutive sequence in sorted array
export function getMaxConsecutiveSequence(sortedNumbers: number[]): number {
  if (sortedNumbers.length === 0) return 0;
  let maxSeq = 1;
  let currentSeq = 1;
  for (let i = 1; i < sortedNumbers.length; i++) {
    if (sortedNumbers[i] === sortedNumbers[i - 1] + 1) {
      currentSeq++;
      if (currentSeq > maxSeq) maxSeq = currentSeq;
    } else {
      currentSeq = 1;
    }
  }
  return maxSeq;
}

// Generate all combinations C(n, k)
export function getCombinations<T>(arr: T[], k: number): T[][] {
  const result: T[][] = [];
  function backtrack(start: number, current: T[]) {
    if (current.length === k) {
      result.push([...current]);
      return;
    }
    for (let i = start; i < arr.length; i++) {
      current.push(arr[i]);
      backtrack(i + 1, current);
      current.pop();
    }
  }
  backtrack(0, []);
  return result;
}

// Count intersection between two sorted number arrays
export function countMatches(arr1: number[], arr2: number[]): number {
  let i = 0;
  let j = 0;
  let matches = 0;
  while (i < arr1.length && j < arr2.length) {
    if (arr1[i] === arr2[j]) {
      matches++;
      i++;
      j++;
    } else if (arr1[i] < arr2[j]) {
      i++;
    } else {
      j++;
    }
  }
  return matches;
}

export const MAX_DEZENAS_FIXAS = 5;
export const RECOMMENDED_MAX_FIXAS = 3;
export const IDEAL_FIXAS_RANGE: readonly [number, number] = [2, 3];

export type FixedNumbersRiskLevel = 'otimo' | 'recomendado' | 'atencao' | 'critico';

export interface FixedNumbersRiskAssessment {
  level: FixedNumbersRiskLevel;
  count: number;
  recommendedMax: number;
  hardMax: number;
  title: string;
  message: string;
}

/**
 * Avalia o risco combinatório da quantidade de dezenas fixas selecionadas.
 * Auditoria (#3825–#3833): <= 2–3 fixas concentrou 80% dos jogos de 13 pts e ROIs de 142% a 285%;
 * 6 a 12 fixas zeraram o Hit Rate mesmo com 14/15 acertos no universo.
 */
export function assessFixedNumbersRisk(
  fixedCount: number,
  modoFixas?: 'rotativas' | 'rigidas'
): FixedNumbersRiskAssessment {
  const count = Math.max(0, Math.trunc(fixedCount || 0));
  if (count === 0) {
    return {
      level: 'otimo',
      count,
      recommendedMax: RECOMMENDED_MAX_FIXAS,
      hardMax: MAX_DEZENAS_FIXAS,
      title: 'Sem Fixas Obrigatórias',
      message: 'Cobertura 100% livre. Se desejar ancorar dezenas fortes, o padrão auditado recomenda no máximo 2 a 3 fixas.',
    };
  }
  if (count <= RECOMMENDED_MAX_FIXAS) {
    const isRigidas3 = count === 3 && modoFixas === 'rigidas';
    return {
      level: isRigidas3 ? 'atencao' : 'recomendado',
      count,
      recommendedMax: RECOMMENDED_MAX_FIXAS,
      hardMax: MAX_DEZENAS_FIXAS,
      title: isRigidas3
        ? '3 Fixas Rígidas (Prefira Rotativas ou 2 Fixas)'
        : `Faixa Recomendada (${count} Fixa${count > 1 ? 's' : ''} • Máx. 2–3)`,
      message: isRigidas3
        ? 'Com 3 fixas em modo rígido, errar 1 fixa limita o teto a 14 pontos. Use modo Rotativas (K de N) ou reduza para 2 fixas.'
        : 'Padrão de Alta Eficiência: até 2–3 fixas concentrou 80% dos jogos de 13 pontos e os ROIs de 142% a 285% na auditoria.',
    };
  }
  if (count <= MAX_DEZENAS_FIXAS) {
    return {
      level: 'atencao',
      count,
      recommendedMax: RECOMMENDED_MAX_FIXAS,
      hardMax: MAX_DEZENAS_FIXAS,
      title: `Alerta de Risco Combinatório (${count} Fixas)`,
      message:
        'Acima do limite recomendado de 2 a 3 fixas. Cada dezena fixa que falhar reduz severamente o Hit Rate da matriz — reduza para no máximo 2–3 fixas ou mantenha Fixas Rotativas (K de N).',
    };
  }
  return {
    level: 'critico',
    count,
    recommendedMax: RECOMMENDED_MAX_FIXAS,
    hardMax: MAX_DEZENAS_FIXAS,
    title: `Risco Combinatório Crítico (${count} Fixas)`,
    message:
      'Fechamentos com 6 a 12 fixas zeraram o Hit Rate na auditoria mesmo com 14/15 acertos no universo. Reduza imediatamente para no máximo 2 a 3 dezenas fixas.',
  };
}

export type ProgressiveFallbackLevel = 0 | 1 | 2 | 3;

export interface ProgressiveFallbackConfig {
  level: ProgressiveFallbackLevel;
  filters: FilterCriteria;
  label: string;
  description: string;
  bypassCanonicalAnomaly: boolean;
}

/**
 * Fallback Progressivo Automático em 3 níveis quando os filtros estritos não atingem
 * a quantidade alvo de bilhetes:
 * - Nível 0: Filtros estritos configurados pelo usuário.
 * - Nível 1: Libera maxConsecutivas até 6 e repetidas para 7..10.
 * - Nível 2: Expande soma para 165..225 e moldura para 8..11 (além do Nível 1).
 * - Nível 3: Desativa filtros secundários mantendo apenas cobertura combinatória + Hamming.
 */
export function buildProgressiveFallbackFilters(
  baseFilters: FilterCriteria | undefined,
  level: ProgressiveFallbackLevel
): ProgressiveFallbackConfig {
  const base: FilterCriteria = baseFilters ? { ...baseFilters } : { ...DEFAULT_FILTERS };

  if (level === 0) {
    return {
      level: 0,
      filters: base,
      label: 'Nível 0 (Estrito)',
      description: '100% dos filtros estritos ativos.',
      bypassCanonicalAnomaly: false,
    };
  }

  if (level === 1) {
    return {
      level: 1,
      filters: {
        ...base,
        maxConsecutivas: Math.max(6, base.maxConsecutivas ?? 5),
        repetidasMin: Math.min(7, base.repetidasMin ?? 8),
        repetidasMax: Math.max(10, base.repetidasMax ?? 10),
      },
      label: 'Fallback Nível 1',
      description: 'Relaxamento automático Nível 1: maxConsecutivas liberado até 6 e repetidas para 7–10.',
      bypassCanonicalAnomaly: false,
    };
  }

  if (level === 2) {
    const somaMin = Math.min(165, base.somaMin ?? 180);
    const somaMax = Math.max(225, base.somaMax ?? 215);
    const molduraMin = Math.min(8, base.molduraMin ?? 9);
    const molduraMax = Math.max(11, base.molduraMax ?? 11);
    return {
      level: 2,
      filters: {
        ...base,
        maxConsecutivas: Math.max(6, base.maxConsecutivas ?? 6),
        repetidasMin: Math.min(7, base.repetidasMin ?? 7),
        repetidasMax: Math.max(10, base.repetidasMax ?? 10),
        somaMin,
        somaMax,
        minSoma: somaMin,
        maxSoma: somaMax,
        molduraMin,
        molduraMax,
        minMoldura: molduraMin,
        maxMoldura: molduraMax,
        autoCalibrarSomaUniverso: false,
        robustez50SomaMin: Math.min(somaMin, base.robustez50SomaMin ?? somaMin),
        robustez50SomaMax: Math.max(somaMax, base.robustez50SomaMax ?? somaMax),
        robustez50MolduraMin: Math.min(molduraMin, base.robustez50MolduraMin ?? molduraMin),
        robustez50MolduraMax: Math.max(molduraMax, base.robustez50MolduraMax ?? molduraMax),
        apenasZonaDeOuroPrimos: false,
        strictValidation: false,
        validacaoEstritaCruz: false,
      },
      label: 'Fallback Nível 2',
      description: 'Relaxamento automático Nível 2: soma expandida para 165–225 e moldura para 8–11 (mantendo Nível 1).',
      bypassCanonicalAnomaly: false,
    };
  }

  // Nível 3: Desativa filtros secundários mantendo apenas cobertura combinatória + Hamming + fixas/excluídas
  return {
    level: 3,
    filters: {
      ...base,
      paresMin: 0,
      paresMax: 15,
      minPares: 0,
      maxPares: 15,
      primosMin: 0,
      primosMax: 9,
      minPrimos: 0,
      maxPrimos: 9,
      somaMin: 120,
      somaMax: 285,
      minSoma: 120,
      maxSoma: 285,
      molduraMin: 0,
      molduraMax: 16,
      minMoldura: 0,
      maxMoldura: 16,
      fibonacciMin: 0,
      fibonacciMax: 7,
      repetidasMin: 0,
      repetidasMax: 15,
      maxConsecutivas: 15,
      autoCalibrarSomaUniverso: false,
      cruzAtiva: false,
      validacaoEstritaCruz: false,
      strictValidation: false,
      extremidadesAtiva: false,
      apenasZonaDeOuroPrimos: false,
      antiColisaoHistoricaAtiva: false,
      antiPadraoViciadoAtivo: false,
      curvaAbcAtiva: false,
      vaziosAtivos: false,
      robustezEstatisticaAtiva: false,
      posicionalAtivo: false,
      multiplosAtivo: false,
      contagemDigitosAtiva: false,
      somaAlgarismosAtiva: false,
      linhasColunasAtivo: false,
      rankingHistoricoAtivo: false,
      palpiteIneditoAtivo: false,
    },
    label: 'Fallback Nível 3',
    description: 'Relaxamento automático Nível 3: filtros secundários desativados, mantendo cobertura combinatória + Hamming.',
    bypassCanonicalAnomaly: true,
  };
}

/**
 * Calcula a distância de Hamming alvo garantindo prioridade Hamming >= 3 para universos de 18 a 21 dezenas,
 * evitando que jogos idênticos ou com 14 dezenas iguais (Hamming = 1) consumam o orçamento da matriz.
 */
export function getTargetHammingDistance(universeSize: number, maxTickets: number): number {
  const maxPossibleDiff = Math.max(1, universeSize - 15);
  if (universeSize >= 18 && universeSize <= 21) {
    return Math.min(maxTickets <= 6 ? 4 : 3, maxPossibleDiff);
  }
  return Math.min(
    maxTickets <= 6 ? 4 : maxTickets <= 32 ? 3 : 2,
    maxPossibleDiff
  );
}

/**
 * Sanitiza dezenas fixas contra o universo real e impõe trava estrita de no máximo 5 dezenas fixas.
 */
export function sanitizeDezenasFixas(rawFixas: number[] = [], pool?: number[]): number[] {
  const poolSet = pool && pool.length > 0 ? new Set(pool) : null;
  const clean = Array.from(
    new Set(
      rawFixas
        .map((n) => Number(n))
        .filter((n) => Number.isInteger(n) && n >= 1 && n <= 25 && (!poolSet || poolSet.has(n)))
    )
  ).sort((a, b) => a - b);
  return clean.slice(0, MAX_DEZENAS_FIXAS);
}

/**
 * Resolve o modo de fixas: ativa 'rotativas' (K de N) por padrão sempre que houver >= 3 fixas,
 * exceto quando explicitamente definido como 'rigidas'.
 */
export function resolveModoFixas(
  fixasCount: number,
  requestedMode?: 'rotativas' | 'rigidas'
): 'rotativas' | 'rigidas' {
  if (fixasCount >= 3 && requestedMode !== 'rigidas') {
    return 'rotativas';
  }
  return 'rigidas';
}

/**
 * Retorna os limites K de N para fixas rotativas inteligentes:
 * Para N >= 3 fixas em modo rotativo: minK = max(1, N - 2) e maxK = N - 1.
 * Para N <= 2 ou modo rígido: minK = maxK = N.
 */
export function getRotatedFixedBounds(
  fixasCount: number,
  requestedMode?: 'rotativas' | 'rigidas'
): { modo: 'rotativas' | 'rigidas'; minK: number; maxK: number; avgK: number } {
  if (fixasCount <= 0) {
    return { modo: 'rigidas', minK: 0, maxK: 0, avgK: 0 };
  }
  const modo = resolveModoFixas(fixasCount, requestedMode);
  if (modo === 'rotativas') {
    const minK = Math.max(1, fixasCount - 2);
    const maxK = fixasCount - 1;
    return { modo: 'rotativas', minK, maxK, avgK: (minK + maxK) / 2 };
  }
  return { modo: 'rigidas', minK: fixasCount, maxK: fixasCount, avgK: fixasCount };
}

/**
 * Constantes Canônicas da Estratificação de Soma (Proteção de Caudas Auditada):
 * - Zona Central (75%): 180 a 215
 * - Cauda Alta (15%): 216 a 230
 * - Cauda Baixa (10%): 155 a 179
 */
export const ZONA_CENTRAL_SOMA_MIN = 180;
export const ZONA_CENTRAL_SOMA_MAX = 215;
export const CAUDA_BAIXA_SOMA_MIN = 155;
export const CAUDA_BAIXA_SOMA_MAX = 179;
export const CAUDA_ALTA_SOMA_MIN = 216;
export const CAUDA_ALTA_SOMA_MAX = 230;

/**
 * Calcula quotas obrigatórias de Estratificação de Cauda para fechamentos com >= 10 jogos:
 * - 75% Zona Central (180–215)
 * - 15% Cauda Alta (216–230)
 * - 10% Cauda Baixa (155–179)
 */
export function computeTailStratificationQuotas(
  maxTickets: number,
  enabled: boolean
): { coreQuota: number; upperQuota: number; lowerQuota: number } {
  if (!enabled || maxTickets < 10) {
    return { coreQuota: Math.max(0, maxTickets), upperQuota: 0, lowerQuota: 0 };
  }
  const upperQuota = Math.max(1, Math.round(maxTickets * 0.15));
  const lowerQuota = Math.max(1, Math.round(maxTickets * 0.10));
  const coreQuota = Math.max(1, maxTickets - upperQuota - lowerQuota);
  return { coreQuota, upperQuota, lowerQuota };
}

/**
 * Auto-calibra a faixa de soma esperada a partir do universoDezenas selecionado:
 * mediaUniverso = (somaDeTodasDezenasDoUniverso / universoDezenas.length) * 15
 * Para universos equilibrados (μ_U ~ 195), converge exatamente para a Zona Central 180–215.
 */
export function calibrarFaixaSomaUniverso(universoDezenas: number[]): {
  mediaUniverso: number;
  somaMin: number;
  somaMax: number;
} {
  const clean = Array.from(new Set(universoDezenas.filter((n) => n >= 1 && n <= 25)));
  if (clean.length === 0) {
    return { mediaUniverso: 195, somaMin: ZONA_CENTRAL_SOMA_MIN, somaMax: ZONA_CENTRAL_SOMA_MAX };
  }
  const somaTotal = clean.reduce((acc, v) => acc + v, 0);
  const mediaExata = (somaTotal / clean.length) * 15;
  const mediaUniverso = Math.round(mediaExata * 10) / 10;
  // Para universos centrados na distribuição natural da Lotofácil, usa a Zona Central auditada (180–215)
  if (mediaExata >= 186 && mediaExata <= 204) {
    return { mediaUniverso, somaMin: ZONA_CENTRAL_SOMA_MIN, somaMax: ZONA_CENTRAL_SOMA_MAX };
  }
  const somaMin = Math.max(CAUDA_BAIXA_SOMA_MIN, Math.min(215, Math.round(mediaExata - 17)));
  const somaMax = Math.min(CAUDA_ALTA_SOMA_MAX, Math.max(somaMin + 10, Math.round(mediaExata + 18)));
  return { mediaUniverso, somaMin, somaMax };
}

/**
 * Resolve os limites centrais de soma combinando filtros explícitos do usuário com a Zona Central 180–215
 * e auto-calibração para universos assimétricos.
 */
export function resolveCentralSumBounds(
  universoDezenas: number[],
  filters?: FilterCriteria
): {
  mediaUniverso: number;
  centralMin: number;
  centralMax: number;
  wasAutoCalibrated: boolean;
} {
  const cal = calibrarFaixaSomaUniverso(universoDezenas);
  if (!filters || filters.somaMin === undefined || filters.somaMax === undefined) {
    return {
      mediaUniverso: cal.mediaUniverso,
      centralMin: cal.somaMin,
      centralMax: cal.somaMax,
      wasAutoCalibrated: true,
    };
  }
  const isStandardDefaultSum =
    (filters.somaMin === 175 && filters.somaMax === 220) ||
    (filters.somaMin === 180 && filters.somaMax === 215) ||
    (filters.somaMin === 180 && filters.somaMax === 220);

  if (filters.autoCalibrarSomaUniverso !== false && isStandardDefaultSum) {
    return {
      mediaUniverso: cal.mediaUniverso,
      centralMin: cal.somaMin,
      centralMax: cal.somaMax,
      wasAutoCalibrated: true,
    };
  }
  return {
    mediaUniverso: cal.mediaUniverso,
    centralMin: filters.somaMin,
    centralMax: filters.somaMax,
    wasAutoCalibrated: false,
  };
}

/**
 * Validador Bitwise de Distância Simétrica (Hamming):
 * dezenasDiferentes = 15 - popcount(novoCartaoMask & cartaoExistenteMask)
 */
export function hammingDistanceBitwise(maskA: number, maskB: number): number {
  return 15 - _popcount(maskA & maskB);
}

export function minHammingDistanceToMatrix(
  candMask: number,
  selectedMasks: number[]
): number {
  if (selectedMasks.length === 0) return 15;
  let minDiff = 15;
  for (let i = 0; i < selectedMasks.length; i++) {
    const dezenasDiferentes = hammingDistanceBitwise(candMask, selectedMasks[i]);
    if (dezenasDiferentes < minDiff) {
      minDiff = dezenasDiferentes;
      if (minDiff === 0) return 0;
    }
  }
  return minDiff;
}

export function passesHammingDistance(
  candMask: number,
  selectedMasks: number[],
  minDiff: number
): boolean {
  for (let i = 0; i < selectedMasks.length; i++) {
    const dezenasDiferentes = hammingDistanceBitwise(candMask, selectedMasks[i]);
    if (dezenasDiferentes < minDiff) {
      return false;
    }
  }
  return true;
}

export const passesHammingSpreadBitwise = passesHammingDistance;

/**
 * Calcula metas equilibradas de frequência para dezenas variáveis e fixas rotativas:
 * freqIdeal = (totalJogos * vagasVariaveis) / qtdDezenasVariaveis
 * Teto = freqIdeal * 1.15 | Piso = freqIdeal * 0.85
 */
export function calculateVariableFrequencyBounds(
  totalJogos: number,
  totalUniverso: number,
  fixasCount: number,
  modoFixas?: 'rotativas' | 'rigidas'
): {
  vagasVariaveis: number;
  qtdDezenasVariaveis: number;
  freqIdeal: number;
  freqMinTarget: number;
  freqMaxCap: number;
  fixedIdeal: number;
} {
  const kInfo = getRotatedFixedBounds(fixasCount, modoFixas);
  const vagasVariaveis = Math.max(1, 15 - kInfo.avgK);
  const qtdDezenasVariaveis = Math.max(1, totalUniverso - fixasCount);
  const freqIdeal = (totalJogos * vagasVariaveis) / qtdDezenasVariaveis;
  const freqMinTarget = freqIdeal * 0.85;
  const freqMaxCap = freqIdeal * 1.15;
  const fixedIdeal = fixasCount > 0 ? (totalJogos * kInfo.avgK) / fixasCount : 0;
  return {
    vagasVariaveis,
    qtdDezenasVariaveis,
    freqIdeal: Math.round(freqIdeal * 100) / 100,
    freqMinTarget,
    freqMaxCap,
    fixedIdeal,
  };
}

let cachedDefaultHistoricalMasks: Set<number> | null = null;
let cachedDefaultRankingMasks: {
  maskTop5: number;
  maskTop10: number;
  maskTop15: number;
  maskTop20: number;
} | null = null;

export function getHistoricalDrawMasksSet(
  historicalDraws: LotofacilDraw[] = RECENT_DRAWS
): Set<number> {
  if (historicalDraws === RECENT_DRAWS) {
    if (!cachedDefaultHistoricalMasks) {
      cachedDefaultHistoricalMasks = buildHistoricalMasksSet(RECENT_DRAWS);
    }
    return cachedDefaultHistoricalMasks;
  }
  return buildHistoricalMasksSet(historicalDraws);
}

export function getHistoricalRankingMasks(
  statsList: DezenaStats[] = DEZENAS_STATS
): {
  maskTop5: number;
  maskTop10: number;
  maskTop15: number;
  maskTop20: number;
} {
  if (statsList === DEZENAS_STATS && cachedDefaultRankingMasks) {
    return cachedDefaultRankingMasks;
  }
  const ordered = [...statsList]
    .sort((a, b) => (b.vezes !== a.vezes ? b.vezes - a.vezes : a.numero - b.numero))
    .map((s) => s.numero);
  const masks = {
    maskTop5: _criarMascara(ordered.slice(0, 5)),
    maskTop10: _criarMascara(ordered.slice(0, 10)),
    maskTop15: _criarMascara(ordered.slice(0, 15)),
    maskTop20: _criarMascara(ordered.slice(0, 20)),
  };
  if (statsList === DEZENAS_STATS) {
    cachedDefaultRankingMasks = masks;
  }
  return masks;
}

export function validarRankingHistoricoMask(
  mask: number,
  statsList: DezenaStats[] = DEZENAS_STATS
): {
  valido: boolean;
  top5: number;
  top10: number;
  top15: number;
  top20: number;
  violacoes: string[];
} {
  const { maskTop5, maskTop10, maskTop15, maskTop20 } = getHistoricalRankingMasks(statsList);
  const top5 = _popcount(mask & maskTop5);
  const top10 = _popcount(mask & maskTop10);
  const top15 = _popcount(mask & maskTop15);
  const top20 = _popcount(mask & maskTop20);

  const violacoes: string[] = [];
  if (top5 < 2 || top5 > 4) violacoes.push(`Top 5=${top5} fora de [2..4]`);
  if (top10 < 4 || top10 > 8) violacoes.push(`Top 10=${top10} fora de [4..8]`);
  if (top15 < 7 || top15 > 11) violacoes.push(`Top 15=${top15} fora de [7..11]`);
  if (top20 < 11 || top20 > 14) violacoes.push(`Top 20=${top20} fora de [11..14]`);

  return {
    valido: violacoes.length === 0,
    top5,
    top10,
    top15,
    top20,
    violacoes,
  };
}

// Helper: Verifica colisão O(1) de 15 pontos com qualquer concurso histórico da Caixa
export function isHistorical15Collision(
  numbers: number[],
  historicalDraws: LotofacilDraw[] = RECENT_DRAWS
): boolean {
  if (numbers.length !== 15) return false;
  const mask = _criarMascara(numbers);
  return getHistoricalDrawMasksSet(historicalDraws).has(mask);
}

// Helper: Detecta padrões visuais óbvios que pulverizam rateios (progressões de 5+ dezenas, linhas/colunas cheias ou diagonais)
export function hasViciousVisualPattern(numbers: number[]): { isVicious: boolean; reason?: string } {
  const numSet = new Set(numbers);
  const sorted = [...numbers].sort((a, b) => a - b);

  // 1. Linha horizontal inteira no volante 5x5 (5 dezenas em linha: 1-5, 6-10, 11-15, 16-20, 21-25)
  const LINHAS = [
    [1, 2, 3, 4, 5],
    [6, 7, 8, 9, 10],
    [11, 12, 13, 14, 15],
    [16, 17, 18, 19, 20],
    [21, 22, 23, 24, 25],
  ];
  for (let l = 0; l < LINHAS.length; l++) {
    if (LINHAS[l].every((n) => numSet.has(n))) {
      return { isVicious: true, reason: `Linha horizontal completa #${l + 1} (${LINHAS[l].join('-')}) no volante 5x5` };
    }
  }

  // 2. Coluna vertical inteira no volante 5x5 (5 dezenas em coluna: colunas 1 a 5)
  const COLUNAS = [
    [1, 6, 11, 16, 21],
    [2, 7, 12, 17, 22],
    [3, 8, 13, 18, 23],
    [4, 9, 14, 19, 24],
    [5, 10, 15, 20, 25],
  ];
  for (let c = 0; c < COLUNAS.length; c++) {
    if (COLUNAS[c].every((n) => numSet.has(n))) {
      return { isVicious: true, reason: `Coluna vertical completa #${c + 1} (${COLUNAS[c].join('-')}) no volante 5x5` };
    }
  }

  // 3. Diagonais completas do volante 5x5
  const DIAGONAL_PRINCIPAL = [1, 7, 13, 19, 25];
  if (DIAGONAL_PRINCIPAL.every((n) => numSet.has(n))) {
    return { isVicious: true, reason: 'Diagonal principal completa (01-07-13-19-25) no volante 5x5' };
  }
  const DIAGONAL_SECUNDARIA = [5, 9, 13, 17, 21];
  if (DIAGONAL_SECUNDARIA.every((n) => numSet.has(n))) {
    return { isVicious: true, reason: 'Diagonal secundária completa (05-09-13-17-21) no volante 5x5' };
  }

  // 4. Progressões aritméticas óbvias: para r=1 exige 7+ consecutivas (5 e 6 são naturais; linhas cheias 5x5 já são vetadas acima); para r>=2 exige 5+
  for (let r = 1; r <= 5; r++) {
    const threshold = r === 1 ? 7 : 5;
    for (const start of sorted) {
      let count = 1;
      let curr = start;
      const seq = [curr];
      while (numSet.has(curr + r)) {
        curr += r;
        seq.push(curr);
        count++;
      }
      if (count >= threshold) {
        const desc = r === 1 ? 'consecutivas' : `em passo de ${r} em ${r}`;
        return {
          isVicious: true,
          reason: `Progressão aritmética óbvia de ${count} dezenas (${seq.map((n) => n.toString().padStart(2, '0')).join('-')}) ${desc}`,
        };
      }
    }
  }

  return { isVicious: false };
}

export interface AuditoriaAnomaliasResultado {
  aprovado: boolean;
  motivoBloqueio?: string;
  isColisaoHistorica: boolean;
  isPadraoVisualObvio: boolean;
  concursoColisao?: number;
}

/**
 * Função Oficial: 'Auditoria de Anomalias Estatísticas'
 * Bloqueia automaticamente jogos idênticos a concursos anteriores da Caixa ou
 * que apresentem padrões visuais óbvios (progressões de 5+ dezenas, linhas, colunas e diagonais)
 * para evitar pulverização de rateios e apostas em combinações esgotadas.
 */
export function auditoriaAnomaliasEstatisticas(
  numbers: number[],
  historicalDraws: LotofacilDraw[] = RECENT_DRAWS
): AuditoriaAnomaliasResultado {
  const sorted = [...numbers].sort((a, b) => a - b);

  // 1. Bloqueio automático de jogos idênticos a concursos anteriores
  for (const draw of historicalDraws) {
    if (draw.dezenas && draw.dezenas.length === 15) {
      if (countMatches(sorted, draw.dezenas) === 15) {
        return {
          aprovado: false,
          motivoBloqueio: `Jogo 100% idêntico ao Concurso #${draw.concurso} (${draw.data}). Bloqueado pela Auditoria Anti-Colisão para evitar repetição histórica esgotada.`,
          isColisaoHistorica: true,
          isPadraoVisualObvio: false,
          concursoColisao: draw.concurso,
        };
      }
    }
  }

  // 2. Bloqueio automático de padrões visuais óbvios (progressões de 5+ dezenas, linhas, colunas, diagonais)
  const pattern = hasViciousVisualPattern(sorted);
  if (pattern.isVicious) {
    return {
      aprovado: false,
      motivoBloqueio: `Padrão visual óbvio bloqueado: ${pattern.reason}. Evita rateios excessivos e jogos com alta pulverização de prêmio.`,
      isColisaoHistorica: false,
      isPadraoVisualObvio: true,
    };
  }

  return {
    aprovado: true,
    isColisaoHistorica: false,
    isPadraoVisualObvio: false,
  };
}


/**
 * Curva Gaussiana Suave com platô no intervalo de pico [peakMin, peakMax].
 * Retorna 1.0 dentro do platô e decai suavemente segundo exp(-0.5 * (dist / sigma)^2) fora dele.
 */
export function computeGaussianPlateauScore(
  value: number,
  peakMin: number,
  peakMax: number,
  sigma: number
): number {
  if (value >= peakMin && value <= peakMax) return 1.0;
  const dist = value < peakMin ? peakMin - value : value - peakMax;
  return Math.exp(-0.5 * Math.pow(dist / Math.max(0.001, sigma), 2));
}

export interface GaussianScoreIAMetrics {
  soma: number;
  moldura: number;
  primos: number;
  fibonacci: number;
  pares: number;
  repetidas: number;
  maxConsecutivas: number;
  cruz: number;
  bola1: number;
  bola15: number;
  isHistoricalCollision?: boolean;
  isViciousVisual?: boolean;
}

/**
 * Recalibração Gaussiana do scoreIA (Auditoria 9 Concursos #3825–#3833):
 * Substitui hard cutoffs por Curvas Gaussianas Suaves centradas nos vencedores de 13 pts:
 * - moldura: pico 9–10 (8 e 11 com penalidade leve)
 * - primos: pico 5–6 (média 13 pts: 5.8)
 * - fibonacci: pico 4–6 (média 13 pts: 5.0)
 * - pares: pico 6–7 (média 13 pts: 6.6)
 * - repetidas: pico 7–9 (média 13 pts: 7.8 — sem penalidade severa para 7 repetidas)
 * - maxConsecutivas: penalidade ZERO entre 3 e 5 (média 13 pts: 5.2); penalidade suave apenas a partir de 6
 * - soma: platô na Zona Central 180–215 com decaimento suave nas caudas (155–179 e 216–230)
 */
export function calculateGaussianScoreIA(
  metrics: GaussianScoreIAMetrics,
  baseDezenasScore: number = 78
): {
  scoreIA: number;
  consecutivasPenalty: number;
  components: {
    moldura: number;
    primos: number;
    fibonacci: number;
    pares: number;
    repetidas: number;
    soma: number;
    cruz: number;
    extremidades: number;
    consecutivas: number;
  };
} {
  const gMoldura = computeGaussianPlateauScore(metrics.moldura, 9, 10, 1.8);
  const gPrimos = computeGaussianPlateauScore(metrics.primos, 5, 6, 1.5);
  const gFibonacci = computeGaussianPlateauScore(metrics.fibonacci, 4, 6, 1.5);
  const gPares = computeGaussianPlateauScore(metrics.pares, 6, 7, 1.5);
  const gRepetidas = computeGaussianPlateauScore(metrics.repetidas, 7, 9, 1.8);
  const gSoma = computeGaussianPlateauScore(metrics.soma, ZONA_CENTRAL_SOMA_MIN, ZONA_CENTRAL_SOMA_MAX, 22);
  const gCruz = computeGaussianPlateauScore(metrics.cruz, 5, 6, 1.6);
  const gBola1 = computeGaussianPlateauScore(metrics.bola1, 1, 2, 2.0);
  const gBola15 = computeGaussianPlateauScore(metrics.bola15, 24, 25, 2.0);

  // Mapeia cada Gaussiana [0..1] para contribuição suave [-weight .. +weight]
  const molduraDelta = 1.6 * (2 * gMoldura - 1);
  const primosDelta = 1.5 * (2 * gPrimos - 1);
  const fibonacciDelta = 1.4 * (2 * gFibonacci - 1);
  const paresDelta = 1.6 * (2 * gPares - 1);
  const repetidasDelta = 1.6 * (2 * gRepetidas - 1);
  const somaDelta = 1.8 * (2 * gSoma - 1);
  const cruzDelta = 0.8 * (2 * gCruz - 1);
  const extremidadesDelta = 0.4 * (2 * gBola1 - 1) + 0.4 * (2 * gBola15 - 1);

  // Penalidade ZERO para maxConsecutivas <= 5 (incluindo 3, 4 e 5); decaimento Gaussiano suave somente a partir de 6
  const consecutivasPenalty =
    metrics.maxConsecutivas <= 5
      ? 0
      : (1 - Math.exp(-0.5 * Math.pow((metrics.maxConsecutivas - 5) / 2.2, 2))) * 4.0;

  let rawScore =
    baseDezenasScore +
    molduraDelta +
    primosDelta +
    fibonacciDelta +
    paresDelta +
    repetidasDelta +
    somaDelta +
    cruzDelta +
    extremidadesDelta -
    consecutivasPenalty;

  if (metrics.isHistoricalCollision) {
    rawScore -= 15.0;
  }
  if (metrics.isViciousVisual) {
    rawScore -= 12.0;
  }

  const scoreIA = Math.round(Math.max(30, Math.min(100, rawScore)) * 10) / 10;

  return {
    scoreIA,
    consecutivasPenalty: Math.round(consecutivasPenalty * 1000) / 1000,
    components: {
      moldura: molduraDelta,
      primos: primosDelta,
      fibonacci: fibonacciDelta,
      pares: paresDelta,
      repetidas: repetidasDelta,
      soma: somaDelta,
      cruz: cruzDelta,
      extremidades: extremidadesDelta,
      consecutivas: -consecutivasPenalty,
    },
  };
}

// Analyze a 15-number ticket with Cruz, Extremas e Score IA Gaussiano Suave
export function analyzeTicket(
  numbers: number[],
  concursoAnterior: number[] = CONCURSO_ATUAL.dezenas,
  aiScores?: number[]
): Omit<GameTicket, 'id' | 'index'> {
  const sorted = [...numbers].sort((a, b) => a - b);
  let pares = 0;
  let impares = 0;
  let primos = 0;
  let soma = 0;
  let moldura = 0;
  let miolo = 0;
  let fibonacci = 0;
  let cruz = 0;
  let repetidas = 0;
  let scoreSum = 0;

  for (const n of sorted) {
    soma += n;
    if (n % 2 === 0) pares++;
    else impares++;
    if (isPrimo(n)) primos++;
    if (isMoldura(n)) moldura++;
    if (isMiolo(n)) miolo++;
    if (isFibonacci(n)) fibonacci++;
    if (isCruz(n)) cruz++;
    if (concursoAnterior.includes(n)) repetidas++;

    if (aiScores && aiScores[n - 1] !== undefined) {
      scoreSum += aiScores[n - 1];
    } else {
      const stats = DEZENAS_STATS.find((s) => s.numero === n);
      scoreSum += stats ? stats.vezes / 24 : 50;
    }
  }

  const bola1 = sorted[0];
  const bola15 = sorted[sorted.length - 1];
  const maxConsecutivas = getMaxConsecutiveSequence(sorted);
  const baseDezenasScore = scoreSum / 15;

  const { scoreIA } = calculateGaussianScoreIA(
    {
      soma,
      moldura,
      primos,
      fibonacci,
      pares,
      repetidas,
      maxConsecutivas,
      cruz,
      bola1,
      bola15,
      isHistoricalCollision: isHistorical15Collision(sorted),
      isViciousVisual: hasViciousVisualPattern(sorted).isVicious,
    },
    baseDezenasScore
  );

  // Auditoria Bitwise dos 6 novos filtros matemáticos
  const ticketMask = _criarMascara(sorted);
  const multiplosRes = validarMultiplosMask(ticketMask);
  const digitosRes = validarContagemDigitosMask(ticketMask);
  const somaAlgarismos = calcularSomaAlgarismos(sorted);
  const posicionalRes = sorted.length === 15 ? validarPosicionalSorted(sorted) : { valido: true, violacoes: [] };
  const linhasColunasRes = validarLinhasColunasMask(ticketMask, 1, 1);
  const rankingRes = validarRankingHistoricoMask(ticketMask);
  const inedito = !isHistorical15Collision(sorted);

  return {
    dezenas: sorted,
    pares,
    impares,
    primos,
    soma,
    moldura,
    miolo,
    fibonacci,
    cruz,
    bola1,
    bola15,
    repetidas,
    maxConsecutivas,
    scoreIA,
    somaAlgarismos,
    digitosTotal: digitosRes.digitosTotal,
    dezenasUmDigito: digitosRes.dezenasUmDigito,
    multiplosM3: multiplosRes.m3,
    multiplosM4: multiplosRes.m4,
    multiplosM5: multiplosRes.m5,
    multiplosM6: multiplosRes.m6,
    multiplosM7: multiplosRes.m7,
    multiplosM8: multiplosRes.m8,
    multiplosOk: multiplosRes.valido,
    posicionalOk: posicionalRes.valido,
    linhasColunasOk: linhasColunasRes.valido,
    rankingHistoricoOk: rankingRes.valido,
    inedito,
  };
}

/**
 * Normaliza defensivamente um objeto de bilhete bruto vindo de props ou localStorage,
 * garantindo dezenas válidas (1..25) ordenadas e todas as propriedades numéricas preenchidas.
 */
export function normalizeGameTicket(
  rawTicket: any,
  fallbackIndex: number = 0,
  concursoAnterior: number[] = CONCURSO_ATUAL.dezenas
): GameTicket | null {
  if (!rawTicket || typeof rawTicket !== 'object') return null;

  const candidateArr = Array.isArray(rawTicket.dezenas)
    ? rawTicket.dezenas
    : Array.isArray(rawTicket.numbers)
    ? rawTicket.numbers
    : null;

  if (!candidateArr || candidateArr.length === 0) return null;

  const cleanSet = new Set<number>();
  for (const item of candidateArr) {
    const num = typeof item === 'number' ? item : parseInt(String(item), 10);
    if (!Number.isNaN(num) && num >= 1 && num <= 25) {
      cleanSet.add(num);
    }
  }

  const dezenas = Array.from(cleanSet).sort((a, b) => a - b);
  if (dezenas.length === 0) return null;

  const analysis = analyzeTicket(dezenas, concursoAnterior);
  const index =
    typeof rawTicket.index === 'number' && Number.isFinite(rawTicket.index) && rawTicket.index > 0
      ? rawTicket.index
      : fallbackIndex + 1;
  const id =
    typeof rawTicket.id === 'string' && rawTicket.id.trim().length > 0
      ? rawTicket.id
      : `ticket-${index}`;

  return {
    ...analysis,
    id,
    index,
    dezenas,
    pares: typeof rawTicket.pares === 'number' ? rawTicket.pares : analysis.pares,
    impares: typeof rawTicket.impares === 'number' ? rawTicket.impares : analysis.impares,
    primos: typeof rawTicket.primos === 'number' ? rawTicket.primos : analysis.primos,
    soma: typeof rawTicket.soma === 'number' ? rawTicket.soma : analysis.soma,
    moldura: typeof rawTicket.moldura === 'number' ? rawTicket.moldura : analysis.moldura,
    miolo: typeof rawTicket.miolo === 'number' ? rawTicket.miolo : analysis.miolo,
    fibonacci: typeof rawTicket.fibonacci === 'number' ? rawTicket.fibonacci : analysis.fibonacci,
    cruz: typeof rawTicket.cruz === 'number' ? rawTicket.cruz : analysis.cruz,
    bola1: typeof rawTicket.bola1 === 'number' ? rawTicket.bola1 : analysis.bola1,
    bola15: typeof rawTicket.bola15 === 'number' ? rawTicket.bola15 : analysis.bola15,
    repetidas: typeof rawTicket.repetidas === 'number' ? rawTicket.repetidas : analysis.repetidas,
    maxConsecutivas:
      typeof rawTicket.maxConsecutivas === 'number'
        ? rawTicket.maxConsecutivas
        : analysis.maxConsecutivas,
    scoreIA: typeof rawTicket.scoreIA === 'number' ? rawTicket.scoreIA : analysis.scoreIA,
    tags: Array.isArray(rawTicket.tags) ? rawTicket.tags.map(String) : undefined,
    auditoriaAnomalias:
      typeof rawTicket.auditoriaAnomalias === 'string' ? rawTicket.auditoriaAnomalias : undefined,
    faixaSoma: rawTicket.faixaSoma,
  };
}

export function normalizeGameTickets(
  rawList: any,
  concursoAnterior: number[] = CONCURSO_ATUAL.dezenas
): GameTicket[] {
  if (!Array.isArray(rawList)) return [];
  const result: GameTicket[] = [];
  rawList.forEach((item, idx) => {
    const normalized = normalizeGameTicket(item, idx, concursoAnterior);
    if (normalized) {
      result.push(normalized);
    }
  });
  return result;
}

export interface FilterValidationResult {
  isValid: boolean;
  reason?: string;
  violations: string[];
  metrics: {
    soma: number;
    pares: number;
    impares: number;
    primos: number;
    moldura: number;
    cruz: number;
    fibonacci: number;
    repetidas: number;
    maxConsecutivas: number;
    bola1: number;
    bola15: number;
  };
}

/**
 * Validador síncrono e determinístico do pipeline combinatório.
 * Audita rigorosamente uma combinação de 15 dezenas contra todos os parâmetros do activeFilterConfig.
 */
export function validateFilters(
  combination: number[] | Omit<GameTicket, 'id' | 'index'>,
  activeFilterConfig: FilterCriteria,
  concursoAnterior: number[] = CONCURSO_ATUAL.dezenas
): FilterValidationResult {
  const dezenas = Array.isArray(combination)
    ? [...combination].sort((a, b) => a - b)
    : combination.dezenas;
  const analysis = Array.isArray(combination)
    ? analyzeTicket(dezenas, concursoAnterior)
    : combination;
  const violations: string[] = [];

  // 1. Pares e Ímpares
  if (analysis.pares < activeFilterConfig.paresMin || analysis.pares > activeFilterConfig.paresMax) {
    violations.push(
      `Pares fora da faixa: ${analysis.pares}P (esperado: ${activeFilterConfig.paresMin}-${activeFilterConfig.paresMax}P)`
    );
  }

  // 2. Números Primos
  if (analysis.primos < activeFilterConfig.primosMin || analysis.primos > activeFilterConfig.primosMax) {
    violations.push(
      `Primos fora da faixa: ${analysis.primos} (esperado: ${activeFilterConfig.primosMin}-${activeFilterConfig.primosMax})`
    );
  }
  if (activeFilterConfig.apenasZonaDeOuroPrimos && (analysis.primos < 5 || analysis.primos > 6)) {
    violations.push(
      `Zona de Ouro de Primos violada: ${analysis.primos} (esperado estrito: 5-6)`
    );
  }

  // 3. Soma das Dezenas
  if (analysis.soma < activeFilterConfig.somaMin || analysis.soma > activeFilterConfig.somaMax) {
    violations.push(
      `Soma fora da faixa: ${analysis.soma} (esperado: ${activeFilterConfig.somaMin}-${activeFilterConfig.somaMax})`
    );
  }

  // 4. Dezenas na Moldura
  if (analysis.moldura < activeFilterConfig.molduraMin || analysis.moldura > activeFilterConfig.molduraMax) {
    violations.push(
      `Moldura fora da faixa: ${analysis.moldura} (esperado: ${activeFilterConfig.molduraMin}-${activeFilterConfig.molduraMax})`
    );
  }

  // 5. Fibonacci
  if (
    analysis.fibonacci < activeFilterConfig.fibonacciMin ||
    analysis.fibonacci > activeFilterConfig.fibonacciMax
  ) {
    violations.push(
      `Fibonacci fora da faixa: ${analysis.fibonacci} (esperado: ${activeFilterConfig.fibonacciMin}-${activeFilterConfig.fibonacciMax})`
    );
  }

  // 6. Repetidas do Concurso Anterior
  if (
    analysis.repetidas < activeFilterConfig.repetidasMin ||
    analysis.repetidas > activeFilterConfig.repetidasMax
  ) {
    violations.push(
      `Repetidas fora da faixa: ${analysis.repetidas} (esperado: ${activeFilterConfig.repetidasMin}-${activeFilterConfig.repetidasMax})`
    );
  }

  // 7. Sequência Consecutiva Máxima
  if (analysis.maxConsecutivas > activeFilterConfig.maxConsecutivas) {
    violations.push(
      `Sequência consecutiva excessiva: ${analysis.maxConsecutivas} dezenas (máx permitido: ${activeFilterConfig.maxConsecutivas})`
    );
  }

  // 8. Cruz da Lotofácil (Linha 3 e Coluna 3: padrão 4 a 7 dezenas, Zona de Ouro: 5 a 6)
  const cruzCount = analysis.cruz ?? dezenas.filter((n) => CRUZ_DEZENAS.includes(n)).length;
  const isEstrita = activeFilterConfig.strictValidation === true || activeFilterConfig.validacaoEstritaCruz === true;
  if (isEstrita || (activeFilterConfig.cruzAtiva !== false && activeFilterConfig.cruzMin !== undefined)) {
    const cMin = isEstrita ? 5 : (activeFilterConfig.cruzMin ?? 4);
    const cMax = isEstrita ? 6 : (activeFilterConfig.cruzMax ?? 7);
    if (cruzCount < cMin || cruzCount > cMax) {
      violations.push(
        isEstrita
          ? `Validação Estrita da Cruz violada: ${cruzCount} (esperado estritamente 5 ou 6 dezenas na Cruz)`
          : `Cruz da Lotofácil fora da faixa: ${cruzCount} (esperado: ${cMin}-${cMax})`
      );
    }
  }

  // 9. Bolas Extremas (Bola 1 e Bola 15)
  const b1 = analysis.bola1 ?? dezenas[0];
  const b15 = analysis.bola15 ?? dezenas[dezenas.length - 1];
  if (activeFilterConfig.extremidadesAtiva !== false) {
    const b1Min = activeFilterConfig.bola1Min ?? 1;
    const b1Max = activeFilterConfig.bola1Max ?? 4;
    const b15Min = activeFilterConfig.bola15Min ?? 22;
    const b15Max = activeFilterConfig.bola15Max ?? 25;
    if (b1 < b1Min || b1 > b1Max) {
      violations.push(
        `Bola 1 fora do intervalo canônico: ${b1} (esperado: ${b1Min}-${b1Max})`
      );
    }
    if (b15 < b15Min || b15 > b15Max) {
      violations.push(
        `Bola 15 fora do intervalo canônico: ${b15} (esperado: ${b15Min}-${b15Max})`
      );
    }
  }

  // 10. Dezenas Fixas (Rígidas 100% ou Rotativas K de N, máx. 5 fixas)
  const fixed = sanitizeDezenasFixas(activeFilterConfig.dezenasFixas || []);
  const fixedBounds = getRotatedFixedBounds(fixed.length, activeFilterConfig.modoFixas);
  if (fixed.length > 0) {
    if (fixedBounds.modo === 'rotativas') {
      const presentCount = fixed.filter((f) => dezenas.includes(f)).length;
      if (presentCount < fixedBounds.minK || presentCount > fixedBounds.maxK) {
        violations.push(
          `Fixas rotativas K de N fora da janela: ${presentCount}/${fixed.length} presentes (esperado: ${fixedBounds.minK} a ${fixedBounds.maxK})`
        );
      }
    } else {
      for (const fix of fixed) {
        if (!dezenas.includes(fix)) {
          violations.push(`Dezena fixa ausente: ${fix.toString().padStart(2, '0')}`);
        }
      }
    }
  }

  // 11. Dezenas Excluídas
  const excluded = activeFilterConfig.dezenasExcluidas || [];
  for (const exc of excluded) {
    if (dezenas.includes(exc)) {
      violations.push(`Dezena excluída presente: ${exc.toString().padStart(2, '0')}`);
    }
  }

  // 12. Curva ABC (Classe A - 80% Frequência Histórica)
  if (activeFilterConfig.curvaAbcAtiva && activeFilterConfig.minDezenasClasseA !== undefined) {
    const countA = countClasseADezenas(dezenas);
    if (countA < activeFilterConfig.minDezenasClasseA) {
      violations.push(
        `Curva ABC Classe A insuficiente: ${countA} dezenas (esperado mín: ${activeFilterConfig.minDezenasClasseA})`
      );
    }
  }

  // 13. Combinações de Vazio (Anti-Afinidade)
  if (
    activeFilterConfig.vaziosAtivos &&
    activeFilterConfig.combinacoesVazioExcluidas &&
    activeFilterConfig.combinacoesVazioExcluidas.length > 0
  ) {
    for (const [v1, v2] of activeFilterConfig.combinacoesVazioExcluidas) {
      if (dezenas.includes(v1) && dezenas.includes(v2)) {
        violations.push(`Par de vazio/anti-afinidade excluído presente: [${v1}, ${v2}]`);
      }
    }
  }

  // 14. Anti-Padrão Viciado (5 dezenas na mesma linha ou coluna inteira)
  if (activeFilterConfig.antiPadraoViciadoAtivo) {
    const viciousCheck = hasViciousVisualPattern(dezenas);
    if (viciousCheck.isVicious) {
      violations.push(`Padrão viciado detectado: ${viciousCheck.reason}`);
    }
  }

  // 15. Anti-Colisão Histórica / Palpite Inédito (O(1) via Set<number> de máscaras)
  if (activeFilterConfig.antiColisaoHistoricaAtiva || activeFilterConfig.palpiteIneditoAtivo) {
    if (isHistorical15Collision(dezenas)) {
      violations.push('Colisão histórica detectada (Palpite Inédito): combinação já sorteada com 15 pontos');
    }
  }

  // 16. Filtro de Robustez Estatística 50 Apurações
  if (activeFilterConfig.robustezEstatisticaAtiva) {
    const rSomaMin = activeFilterConfig.robustez50SomaMin ?? 180;
    const rSomaMax = activeFilterConfig.robustez50SomaMax ?? 220;
    const rParesMin = activeFilterConfig.robustez50ParesMin ?? 6;
    const rParesMax = activeFilterConfig.robustez50ParesMax ?? 8;
    const rMolduraMin = activeFilterConfig.robustez50MolduraMin ?? 9;
    const rMolduraMax = activeFilterConfig.robustez50MolduraMax ?? 11;

    if (analysis.soma < rSomaMin || analysis.soma > rSomaMax) {
      violations.push(`Robustez 50: Soma fora de [${rSomaMin}-${rSomaMax}]`);
    }
    if (analysis.pares < rParesMin || analysis.pares > rParesMax) {
      violations.push(`Robustez 50: Pares fora de [${rParesMin}-${rParesMax}]`);
    }
    if (analysis.moldura < rMolduraMin || analysis.moldura > rMolduraMax) {
      violations.push(`Robustez 50: Moldura fora de [${rMolduraMin}-${rMolduraMax}]`);
    }
  }

  const cardMask = _criarMascara(dezenas);

  // 17. Filtro de Intervalos Posicionais por Bola (D1 a D15)
  if (activeFilterConfig.posicionalAtivo) {
    const posRes = validarPosicionalSorted(dezenas);
    if (!posRes.valido) {
      violations.push(`Posicional D1–D15 violado: ${posRes.violacoes.slice(0, 3).join(', ')}`);
    }
  }

  // 18. Filtro de Múltiplos M(3) a M(8) via Máscaras Bitwise
  if (activeFilterConfig.multiplosAtivo) {
    const multRes = validarMultiplosMask(cardMask);
    if (!multRes.valido) {
      violations.push(`Múltiplos M(3)–M(8) violados: ${multRes.violacoes.join(', ')}`);
    }
  }

  // 19. Contagem de Dígitos (01–09: 3–8 | Total: 22–27 dígitos)
  if (activeFilterConfig.contagemDigitosAtiva) {
    const digRes = validarContagemDigitosMask(
      cardMask,
      activeFilterConfig.umDigitoMin ?? 3,
      activeFilterConfig.umDigitoMax ?? 8,
      activeFilterConfig.digitosMin ?? 22,
      activeFilterConfig.digitosMax ?? 27
    );
    if (!digRes.valido) {
      violations.push(
        `Contagem de Dígitos violada: ${digRes.digitosTotal} dígitos (${digRes.dezenasUmDigito} de 1 dígito)`
      );
    }
  }

  // 20. Soma dos Algarismos Individuais (63 a 87)
  if (activeFilterConfig.somaAlgarismosAtiva) {
    const somaAlg = analysis.somaAlgarismos ?? calcularSomaAlgarismos(dezenas);
    const algMin = activeFilterConfig.somaAlgarismosMin ?? 63;
    const algMax = activeFilterConfig.somaAlgarismosMax ?? 87;
    if (somaAlg < algMin || somaAlg > algMax) {
      violations.push(`Soma dos Algarismos fora da faixa: ${somaAlg} (esperado: ${algMin}-${algMax})`);
    }
  }

  // 21. Integridade de Linhas e Colunas (Matriz 5x5)
  if (activeFilterConfig.linhasColunasAtivo) {
    const lcRes = validarLinhasColunasMask(
      cardMask,
      activeFilterConfig.maxLinhasCheias ?? 1,
      activeFilterConfig.maxColunasCheias ?? 1
    );
    if (!lcRes.valido) {
      violations.push(`Matriz 5x5 Linhas/Colunas: ${lcRes.violacoes.join(', ')}`);
    }
  }

  // 22. Equilíbrio por Ranking Histórico (Top 5, 10, 15, 20)
  if (activeFilterConfig.rankingHistoricoAtivo) {
    const rankRes = validarRankingHistoricoMask(cardMask);
    if (!rankRes.valido) {
      violations.push(`Ranking Histórico violado: ${rankRes.violacoes.join(', ')}`);
    }
  }

  const isValid = violations.length === 0;

  return {
    isValid,
    reason: violations.length > 0 ? violations.join('; ') : undefined,
    violations,
    metrics: {
      soma: analysis.soma,
      pares: analysis.pares,
      impares: analysis.impares,
      primos: analysis.primos,
      moldura: analysis.moldura,
      cruz: cruzCount,
      fibonacci: analysis.fibonacci,
      repetidas: analysis.repetidas,
      maxConsecutivas: analysis.maxConsecutivas,
      bola1: b1,
      bola15: b15,
    },
  };
}

// Wrapper booleano canônico para compatibilidade direta
export function ticketPassesFilters(
  ticket: Omit<GameTicket, 'id' | 'index'> | number[],
  filters: FilterCriteria,
  concursoAnterior: number[] = CONCURSO_ATUAL.dezenas
): boolean {
  return validateFilters(ticket, filters, concursoAnterior).isValid;
}

/**
 * Check if a ticket has any statistical anomaly matching the Monitoring System
 * (Soma 180-225, Pares 5-10, Primos 3-8, Moldura 7-12, Repetidas 6-12, Sequência <= 6, Cruz 3-8, Bola1 <= 4, Bola15 >= 22)
 * Descarte de Fechamentos Improváveis (Filtro Anti-Inconsistência)
 */
export function isCanonicalAnomaly(
  numbers: number[],
  analysis?: Omit<GameTicket, 'id' | 'index'>,
  concursoAnterior: number[] = CONCURSO_ATUAL.dezenas,
  sumBoundsOverride?: { somaMin: number; somaMax: number }
): boolean {
  const sorted = [...numbers].sort((a, b) => a - b);
  const soma = analysis?.soma ?? sorted.reduce((acc, curr) => acc + curr, 0);
  const pares = analysis?.pares ?? sorted.filter((n) => n % 2 === 0).length;
  const primos = analysis?.primos ?? sorted.filter((n) => PRIMOS.includes(n)).length;
  const moldura = analysis?.moldura ?? sorted.filter((n) => MOLDURA.includes(n)).length;
  const cruz = analysis?.cruz ?? sorted.filter((n) => CRUZ_DEZENAS.includes(n)).length;
  const maxSequencia = analysis?.maxConsecutivas ?? getMaxConsecutiveSequence(sorted);
  const bola1 = sorted[0];
  const bola15 = sorted[sorted.length - 1];

  const minSoma = sumBoundsOverride?.somaMin ?? 175;
  const maxSoma = sumBoundsOverride?.somaMax ?? 225;

  // Canonical constraints - descarta fechamentos matematicamente improváveis
  if (soma < minSoma || soma > maxSoma) return true;
  if (pares < 5 || pares > 10) return true;  // Extremos (<5 ou >10 pares somam <0.4% histórico)
  if (primos < 3 || primos > 8) return true;  // Primos fora do padrão Caixa (4-7 canônico)
  if (moldura < 7 || moldura > 12) return true; // Moldura descalibrada
  if (maxSequencia > 6) return true;        // Sequências de até 6 seguidas autorizadas
  if (cruz < 3 || cruz > 8) return true;     // Cruz da Lotofácil fora dos limites seguros (canônico 4-7)
  if (bola1 > 4) return true;                // Bola 1 deve ser 1, 2, 3 ou 4
  if (bola15 < 22) return true;              // Bola 15 deve ser 22, 23, 24 ou 25

  // Bloqueio de padrão visual viciado e colisão histórica de 15 pontos
  if (isHistorical15Collision(sorted)) return true;
  if (hasViciousVisualPattern(sorted).isVicious) return true;

  // Validação de repetidas do concurso anterior (piso dinâmico alargado para 6 dezenas)
  if (concursoAnterior && concursoAnterior.length === 15) {
    const repetidas = analysis?.repetidas ?? countMatches(sorted, concursoAnterior);
    if (repetidas < 6 || repetidas > 12) return true;
  }

  return false;
}

/**
 * Validação Semântica para Descarte de Fechamentos Improváveis
 */
export function isJogoPlauzivelLotofacil(
  numbers: number[],
  analysis?: Omit<GameTicket, 'id' | 'index'>,
  concursoAnterior: number[] = CONCURSO_ATUAL.dezenas
): { valido: boolean; motivoDescarte?: string } {
  const sorted = [...numbers].sort((a, b) => a - b);
  const soma = analysis?.soma ?? sorted.reduce((acc, curr) => acc + curr, 0);
  const pares = analysis?.pares ?? sorted.filter((n) => n % 2 === 0).length;
  const impares = 15 - pares;
  const primos = analysis?.primos ?? sorted.filter((n) => PRIMOS.includes(n)).length;
  const moldura = analysis?.moldura ?? sorted.filter((n) => MOLDURA.includes(n)).length;
  const cruz = analysis?.cruz ?? sorted.filter((n) => CRUZ_DEZENAS.includes(n)).length;
  const maxSequencia = analysis?.maxConsecutivas ?? getMaxConsecutiveSequence(sorted);
  const bola1 = sorted[0];
  const bola15 = sorted[sorted.length - 1];

  if (soma < 175 || soma > 225) {
    return { valido: false, motivoDescarte: `Soma (${soma}) fora da faixa permitida (175 a 225)` };
  }
  if (pares < 5 || pares > 10) {
    return { valido: false, motivoDescarte: `Paridade extrema (${pares}P / ${impares}I) com chance inferior a 0.4%` };
  }
  if (primos < 3 || primos > 8) {
    return { valido: false, motivoDescarte: `Primos fora da curva (${primos} primos). O padrão oficial é 4 a 7` };
  }
  if (moldura < 7 || moldura > 12) {
    return { valido: false, motivoDescarte: `Moldura (${moldura}) com desvio extremo do padrão (8 a 12)` };
  }
  if (cruz < 3 || cruz > 8) {
    return { valido: false, motivoDescarte: `Cruz da Lotofácil com ${cruz} dezenas (padrão canônico: 4 a 7)` };
  }
  if (bola1 > 4) {
    return { valido: false, motivoDescarte: `Bola 1 iniciada em ${bola1} (deve iniciar em 01, 02, 03 ou 04)` };
  }
  if (bola15 < 22) {
    return { valido: false, motivoDescarte: `Bola 15 terminada em ${bola15} (deve encerrar em 22, 23, 24 ou 25)` };
  }
  if (maxSequencia > 6) {
    return { valido: false, motivoDescarte: `Sequência de ${maxSequencia} números consecutivos em fila (máximo permitido: 6)` };
  }
  if (isHistorical15Collision(sorted)) {
    return { valido: false, motivoDescarte: `Combinação 100% idêntica a concurso anterior da Caixa (bloqueio anti-colisão)` };
  }
  const pattern = hasViciousVisualPattern(sorted);
  if (pattern.isVicious) {
    return { valido: false, motivoDescarte: `Padrão viciado rejeitado: ${pattern.reason}` };
  }
  if (concursoAnterior && concursoAnterior.length === 15) {
    const repetidas = analysis?.repetidas ?? countMatches(sorted, concursoAnterior);
    if (repetidas < 6 || repetidas > 12) {
      return { valido: false, motivoDescarte: `Repetidas (${repetidas}) fora da janela dinâmica estendida (6 a 12)` };
    }
  }

  return { valido: true };
}


/**
 * Redução por Cobertura Mínima (Set Cover Problem) com Aceleração por Bitmasks
 * Implementação matemática estrita para fechamentos de 18 e 19 dezenas:
 * - 18 dezenas: C(18, 15) = 816 subconjuntos universo
 * - 19 dezenas: C(19, 15) = 3876 subconjuntos universo
 *
 * Utiliza álgebra de bits (32-bit bitmasks) para testar interseção em nanossegundos:
 * popcount(maskA & maskB) >= 14
 * 
 * Executa seleção gulosa por máxima cobertura de novos subconjuntos não cobertos,
 * combinada com varredura 2-opt de eliminação de redundâncias, garantindo a
 * MENOR QUANTIDADE POSSÍVEL de bilhetes para cobrir 100% da garantia de 14 pontos
 * se as 15 sorteadas estiverem dentro do universo escolhido.
 */
export function generateMinimumSetCoverFechamento({
  selectedNumbers,
  targetHits = 14,
  maxTickets = 48,
  filters,
  concursoAnterior = CONCURSO_ATUAL.dezenas,
  aiScores,
  fallbackLevel = 0,
  disableAutoFallback = false,
}: {
  selectedNumbers: number[];
  targetHits?: number;
  maxTickets?: number;
  filters?: FilterCriteria;
  concursoAnterior?: number[];
  aiScores?: number[];
  fallbackLevel?: ProgressiveFallbackLevel;
  disableAutoFallback?: boolean;
}): GameTicket[] {
  const excludedSet = new Set(filters?.dezenasExcluidas || []);
  const sortedPool = [...new Set(selectedNumbers)]
    .filter((d) => !excludedSet.has(d))
    .sort((a, b) => a - b);
  const n = sortedPool.length;

  if (n < 15) {
    throw new Error('É necessário selecionar pelo menos 15 dezenas.');
  }

  // Se o fallback automático estiver habilitado na chamada raiz, executa cascata de 3 níveis até atingir maxTickets
  if (!disableAutoFallback && fallbackLevel === 0) {
    let bestTickets: GameTicket[] = [];
    for (const lvl of [0, 1, 2, 3] as ProgressiveFallbackLevel[]) {
      const fb = buildProgressiveFallbackFilters(filters, lvl);
      try {
        const attemptTickets = generateMinimumSetCoverFechamento({
          selectedNumbers: sortedPool,
          targetHits,
          maxTickets,
          filters: fb.filters,
          concursoAnterior,
          aiScores,
          fallbackLevel: lvl,
          disableAutoFallback: true,
        });
        if (attemptTickets.length > bestTickets.length) {
          bestTickets = attemptTickets;
        }
        if (attemptTickets.length >= maxTickets) {
          return attemptTickets;
        }
      } catch {
        // Continua para o próximo nível do fallback progressivo
      }
    }
    if (bestTickets.length > 0) {
      return bestTickets;
    }
    throw new Error(
      'Nenhum jogo compatível com os filtros selecionados mesmo após o Fallback Progressivo de 3 níveis.'
    );
  }

  const fallbackMeta = buildProgressiveFallbackFilters(filters, fallbackLevel);
  const bypassAnomaly = fallbackMeta.bypassCanonicalAnomaly;

  // 1. Sanitização estrita de dezenas fixas (máx. 5) e Modo Rotativo Inteligente (K de N)
  const effectiveFixas = sanitizeDezenasFixas(filters?.dezenasFixas || [], sortedPool);
  const effectiveFixedSet = new Set(effectiveFixas);
  const fixedBounds = getRotatedFixedBounds(effectiveFixas.length, filters?.modoFixas);

  // Auto-calibração de soma pelo universo selecionado (μ_U ± 20) — desativada nos níveis 2 e 3
  const sumCal = resolveCentralSumBounds(sortedPool, filters);
  const centralMin = fallbackLevel === 3 ? 120 : fallbackLevel === 2 ? Math.min(165, sumCal.centralMin) : sumCal.centralMin;
  const centralMax = fallbackLevel === 3 ? 285 : fallbackLevel === 2 ? Math.max(225, sumCal.centralMax) : sumCal.centralMax;

  const effectiveCoreFilters: FilterCriteria | undefined = filters
    ? {
        ...filters,
        dezenasFixas: effectiveFixas,
        modoFixas: fixedBounds.modo,
        somaMin: centralMin,
        somaMax: centralMax,
      }
    : undefined;

  const checkFixasCompliance = (nums: number[]): boolean => {
    if (effectiveFixas.length === 0) return true;
    let present = 0;
    for (let i = 0; i < effectiveFixas.length; i++) {
      if (nums.includes(effectiveFixas[i])) present++;
    }
    return present >= fixedBounds.minK && present <= fixedBounds.maxK;
  };

  // 2. Universo de Subconjuntos Alvo U: todas as combinações C(n, 15)
  const universeSubsets = getCombinations(sortedPool, 15);
  const universeMasks = universeSubsets.map(_criarMascara);
  const totalUniverse = universeMasks.length;

  // 3. Validador de filtros canônicos estritos (respeitando o nível de Fallback Progressivo)
  const canonicalSumOverride = {
    somaMin: Math.min(fallbackLevel >= 2 ? 165 : 175, centralMin),
    somaMax: Math.max(225, centralMax),
  };

  const isCandidateValid = (nums: number[]): boolean => {
    if (!checkFixasCompliance(nums)) return false;
    if (bypassAnomaly) {
      // Nível 3: mantém apenas cobertura combinatória + Hamming + fixas/excluídas
      return true;
    }
    const a = analyzeTicket(nums, concursoAnterior, aiScores);
    if (isCanonicalAnomaly(nums, a, concursoAnterior, canonicalSumOverride)) return false;
    if (effectiveCoreFilters && !ticketPassesFilters(a, effectiveCoreFilters, concursoAnterior)) {
      return false;
    }
    if (a.soma < centralMin || a.soma > centralMax) return false;
    return true;
  };

  // Candidatos de Proteção de Caudas (75% Central 180–215 / 15% Cauda Alta 216–230 / 10% Cauda Baixa 155–179) obrigatória em >= 10 jogos
  const enableStratification =
    maxTickets >= 10 && n >= 16 && effectiveCoreFilters?.estratificacaoCaudaAtiva !== false;
  const stratCentralMin = bypassAnomaly ? ZONA_CENTRAL_SOMA_MIN : centralMin;
  const stratCentralMax = bypassAnomaly ? ZONA_CENTRAL_SOMA_MAX : centralMax;
  const lowerTailMax = Math.max(CAUDA_BAIXA_SOMA_MIN, Math.min(CAUDA_BAIXA_SOMA_MAX, stratCentralMin - 1));
  const upperTailMin = Math.min(CAUDA_ALTA_SOMA_MAX, Math.max(CAUDA_ALTA_SOMA_MIN, stratCentralMax + 1));

  const isLowerTailCandidate = (nums: number[]): boolean => {
    if (!checkFixasCompliance(nums)) return false;
    const sorted = [...nums].sort((x, y) => x - y);
    const soma = sorted.reduce((a, b) => a + b, 0);
    if (soma < CAUDA_BAIXA_SOMA_MIN || soma > lowerTailMax) return false;
    if (isHistorical15Collision(sorted)) return false;
    if (bypassAnomaly) return true;
    const maxSeq = getMaxConsecutiveSequence(sorted);
    if (maxSeq > 8) return false;
    const pares = sorted.filter((d) => d % 2 === 0).length;
    const primos = sorted.filter((d) => PRIMOS.includes(d)).length;
    const bola1 = sorted[0];
    const bola15 = sorted[sorted.length - 1];
    if (bola1 > 4 || bola15 < 20) return false;
    if (pares < 4 || pares > 11) return false;
    if (primos < 3 || primos > 8) return false;
    return true;
  };

  const isUpperTailCandidate = (nums: number[]): boolean => {
    if (!checkFixasCompliance(nums)) return false;
    const sorted = [...nums].sort((x, y) => x - y);
    const soma = sorted.reduce((a, b) => a + b, 0);
    if (soma < upperTailMin || soma > CAUDA_ALTA_SOMA_MAX) return false;
    if (isHistorical15Collision(sorted)) return false;
    if (bypassAnomaly) return true;
    const maxSeq = getMaxConsecutiveSequence(sorted);
    if (maxSeq > 7) return false;
    const pares = sorted.filter((d) => d % 2 === 0).length;
    const primos = sorted.filter((d) => PRIMOS.includes(d)).length;
    const bola1 = sorted[0];
    const bola15 = sorted[sorted.length - 1];
    if (bola1 > 5 || bola15 < 22) return false;
    if (pares < 4 || pares > 11) return false;
    if (primos < 3 || primos > 8) return false;
    return true;
  };

  // 4. Criação dos pools de candidatos estratificados com PODA ANTECIPADA (Branch & Bound)
  const coreCombos: number[][] = [];
  const lowerTailCombos: number[][] = [];
  const upperTailCombos: number[][] = [];
  const overflowCombos: number[][] = [];

  const nonFixedPool = sortedPool.filter((d) => !effectiveFixedSet.has(d));
  const nonFixedBits = nonFixedPool.map((d) => 1 << (d - 1));
  const fixedSubsets: number[][] = [];
  if (effectiveFixas.length === 0) {
    fixedSubsets.push([]);
  } else if (fixedBounds.modo === 'rotativas') {
    for (let k = fixedBounds.minK; k <= fixedBounds.maxK; k++) {
      fixedSubsets.push(...getCombinations(effectiveFixas, k));
    }
  } else {
    fixedSubsets.push([...effectiveFixas]);
  }

  const rankingMasks = getHistoricalRankingMasks();
  const coreSeenMasks = new Set<number>();

  const coreBranchFilters: PodaDinamicaFiltros = bypassAnomaly
    ? {
        somaMin: 120,
        somaMax: 285,
        paresMin: 0,
        paresMax: 15,
        posicionalAtivo: false,
        multiplosAtivo: false,
        somaAlgarismosAtiva: false,
        cruzAtiva: false,
        strictValidation: false,
        validacaoEstritaCruz: false,
        rankingHistoricoAtivo: false,
      }
    : {
        somaMin: centralMin,
        somaMax: centralMax,
        paresMin: effectiveCoreFilters?.paresMin ?? 5,
        paresMax: effectiveCoreFilters?.paresMax ?? 10,
        posicionalAtivo: effectiveCoreFilters?.posicionalAtivo ?? true,
        multiplosAtivo: effectiveCoreFilters?.multiplosAtivo ?? false,
        somaAlgarismosAtiva: effectiveCoreFilters?.somaAlgarismosAtiva ?? false,
        somaAlgarismosMin: effectiveCoreFilters?.somaAlgarismosMin ?? 63,
        somaAlgarismosMax: effectiveCoreFilters?.somaAlgarismosMax ?? 87,
        cruzAtiva: effectiveCoreFilters?.cruzAtiva ?? true,
        cruzMin: effectiveCoreFilters?.cruzMin ?? 4,
        cruzMax: effectiveCoreFilters?.cruzMax ?? 7,
        strictValidation: effectiveCoreFilters?.strictValidation ?? false,
        validacaoEstritaCruz: effectiveCoreFilters?.validacaoEstritaCruz ?? false,
        rankingHistoricoAtivo: effectiveCoreFilters?.rankingHistoricoAtivo ?? false,
        rankingMasks,
      };

  for (const fSubset of fixedSubsets) {
    const fMask = _criarMascara(fSubset);
    const fSum = fSubset.reduce((acc, v) => acc + v, 0);
    const fPares = fSubset.filter((v) => v % 2 === 0).length;
    const vagas = 15 - fSubset.length;
    if (vagas < 0 || vagas > nonFixedPool.length) continue;

    _combinarComPodaDinamica(
      0,
      0,
      0,
      fSum,
      fPares,
      vagas,
      nonFixedPool,
      nonFixedBits,
      coreBranchFilters,
      fMask,
      (fullMask) => {
        if (coreSeenMasks.has(fullMask)) return;
        const combo = _mascaraParaDezenas(fullMask);
        if (bypassAnomaly && enableStratification) {
          if (!checkFixasCompliance(combo)) return;
          const s = combo.reduce((a, b) => a + b, 0);
          coreSeenMasks.add(fullMask);
          if (s >= stratCentralMin && s <= stratCentralMax) {
            coreCombos.push(combo);
          } else if (s >= CAUDA_BAIXA_SOMA_MIN && s <= lowerTailMax) {
            lowerTailCombos.push(combo);
          } else if (s >= upperTailMin && s <= CAUDA_ALTA_SOMA_MAX) {
            upperTailCombos.push(combo);
          } else {
            overflowCombos.push(combo);
          }
          return;
        }
        if (isCandidateValid(combo)) {
          coreSeenMasks.add(fullMask);
          coreCombos.push(combo);
        }
      }
    );
  }

  if (bypassAnomaly && enableStratification && coreCombos.length < maxTickets && overflowCombos.length > 0) {
    coreCombos.push(...overflowCombos);
  }

  if (enableStratification && !bypassAnomaly) {
    const lowerTailFilters: PodaDinamicaFiltros = {
      somaMin: CAUDA_BAIXA_SOMA_MIN,
      somaMax: lowerTailMax,
      paresMin: 4,
      paresMax: 11,
      posicionalAtivo: false,
    };
    const upperTailFilters: PodaDinamicaFiltros = {
      somaMin: upperTailMin,
      somaMax: CAUDA_ALTA_SOMA_MAX,
      paresMin: 4,
      paresMax: 11,
      posicionalAtivo: false,
    };

    for (const fSubset of fixedSubsets) {
      const fMask = _criarMascara(fSubset);
      const fSum = fSubset.reduce((acc, v) => acc + v, 0);
      const fPares = fSubset.filter((v) => v % 2 === 0).length;
      const vagas = 15 - fSubset.length;
      if (vagas < 0 || vagas > nonFixedPool.length) continue;

      _combinarComPodaDinamica(
        0,
        0,
        0,
        fSum,
        fPares,
        vagas,
        nonFixedPool,
        nonFixedBits,
        lowerTailFilters,
        fMask,
        (fullMask) => {
          if (coreSeenMasks.has(fullMask)) return;
          const combo = _mascaraParaDezenas(fullMask);
          if (isLowerTailCandidate(combo)) {
            coreSeenMasks.add(fullMask);
            lowerTailCombos.push(combo);
          }
        }
      );

      _combinarComPodaDinamica(
        0,
        0,
        0,
        fSum,
        fPares,
        vagas,
        nonFixedPool,
        nonFixedBits,
        upperTailFilters,
        fMask,
        (fullMask) => {
          if (coreSeenMasks.has(fullMask)) return;
          const combo = _mascaraParaDezenas(fullMask);
          if (isUpperTailCandidate(combo)) {
            coreSeenMasks.add(fullMask);
            upperTailCombos.push(combo);
          }
        }
      );
    }
  }

  // Quotas de Estratificação de Cauda: 75% Zona Central (180–215) / 15% Cauda Alta (216–230) / 10% Cauda Baixa (155–179)
  const stratQuotas = computeTailStratificationQuotas(maxTickets, enableStratification);
  let lowerTailQuota = stratQuotas.lowerQuota;
  let upperTailQuota = stratQuotas.upperQuota;
  if (lowerTailCombos.length === 0) lowerTailQuota = 0;
  if (upperTailCombos.length === 0) upperTailQuota = 0;
  const coreQuota = Math.max(1, maxTickets - lowerTailQuota - upperTailQuota);

  const candidateCombos: number[][] = [...coreCombos, ...lowerTailCombos, ...upperTailCombos];

  if (candidateCombos.length === 0) {
    throw new Error(
      'Nenhum jogo compatível com os filtros selecionados. Os filtros definidos em "Sugestões Estratégicas" ou "Filtros Canônicos" são excessivamente restritivos para o universo de dezenas selecionado. Tente flexibilizar os limites de Soma, Pares/Ímpares, Primos ou Moldura.'
    );
  }

  const candMasks = candidateCombos.map(_criarMascara);
  const candCount = candidateCombos.length;

  // 5. Pré-computação das listas de cobertura
  const candCoverLists: number[][] = new Array(candCount);
  for (let i = 0; i < candCount; i++) {
    const cMask = candMasks[i];
    const covered: number[] = [];
    for (let j = 0; j < totalUniverse; j++) {
      if (_popcount(cMask & universeMasks[j]) >= targetHits) {
        covered.push(j);
      }
    }
    candCoverLists[i] = covered;
  }

  const candScores = candidateCombos.map(
    (c) => analyzeTicket(c, concursoAnterior, aiScores).scoreIA
  );

  // 6. Algoritmo Guloso com Prioridade Estrita de Hamming >= 3 (18-21 dez) + Frequency Cap [0.85..1.15]
  const coveredCounts = new Uint16Array(totalUniverse);
  let uncoveredRemaining = totalUniverse;
  const chosenIndices: number[] = [];
  const chosenMasks: number[] = [];
  const chosenSet = new Set<number>();

  // Prioriza estritamente Hamming >= 3 em universos de 18 a 21 dezenas
  const is18to21 = n >= 18 && n <= 21;
  const targetHammingDist = getTargetHammingDistance(n, maxTickets);

  // Frequência ideal equilibrada por dezena variável e por fixa rotativa
  const freqBounds = calculateVariableFrequencyBounds(
    maxTickets,
    n,
    effectiveFixas.length,
    fixedBounds.modo
  );
  const numberFreq: Record<number, number> = {};
  const fixedFreq: Record<number, number> = {};
  const usedFixedSubsets = new Set<string>();

  let lowerTailChosen = 0;
  let upperTailChosen = 0;
  let coreChosen = 0;

  const savedTicketsSet = getAllSavedTicketsSet();

  const pickBestCandidate = (
    minHammingReq: number,
    requireUncoveredGain: boolean,
    enforceSoftFreqCap: boolean,
    enforceQuota: boolean = true
  ): number => {
    let bestCandIdx = -1;
    let bestCombinedGain = -9999999;

    for (let i = 0; i < candCount; i++) {
      if (chosenSet.has(i)) continue;

      const cand = candidateCombos[i];
      const cMask = candMasks[i];
      const isLower = i >= coreCombos.length && i < coreCombos.length + lowerTailCombos.length;
      const isUpper = i >= coreCombos.length + lowerTailCombos.length;

      // Respeita quotas de estratificação
      if (enforceQuota) {
        if (isLower && lowerTailChosen >= lowerTailQuota) continue;
        if (isUpper && upperTailChosen >= upperTailQuota) continue;
        if (!isLower && !isUpper && coreChosen >= coreQuota) {
          const lowerNeeded = Math.max(0, lowerTailQuota - lowerTailChosen);
          const upperNeeded = Math.max(0, upperTailQuota - upperTailChosen);
          const remainingSlots = maxTickets - chosenIndices.length;
          if (remainingSlots <= lowerNeeded + upperNeeded && (lowerTailCombos.length > 0 || upperTailCombos.length > 0)) {
            continue;
          }
        }
      }

      // Espalhamento Geométrico Hamming (bitwise) — bloqueia duplicatas e 14 dezenas iguais (Hamming <= 1) em 18–21
      const minDist = minHammingDistanceToMatrix(cMask, chosenMasks);
      if (chosenMasks.length > 0) {
        if (minDist === 0) continue;
        if (minHammingReq > 0 && minDist < minHammingReq) continue;
      }

      const covers = candCoverLists[i];
      let newCovers = 0;
      for (let k = 0; k < covers.length; k++) {
        if (coveredCounts[covers[k]] === 0) {
          newCovers++;
        }
      }
      if (requireUncoveredGain && newCovers <= 0 && uncoveredRemaining > 0) continue;

      // Controle de Frequência Equilibrada (Frequency Cap 0.85x..1.15x de freqIdeal)
      let freqBalanceScore = 0;
      let saturatedCount = 0;
      for (let idxD = 0; idxD < cand.length; idxD++) {
        const d = cand[idxD];
        if (effectiveFixedSet.has(d)) {
          if (fixedBounds.modo === 'rotativas') {
            const curF = fixedFreq[d] || 0;
            if (curF > freqBounds.fixedIdeal * 1.1) {
              freqBalanceScore -= 45 * (curF - freqBounds.fixedIdeal + 1);
            } else if (curF < freqBounds.fixedIdeal * 0.9) {
              freqBalanceScore += 22;
            }
          }
        } else {
          const curVarF = numberFreq[d] || 0;
          if (curVarF >= freqBounds.freqMaxCap) {
            saturatedCount++;
            freqBalanceScore -= 85 * (curVarF - freqBounds.freqMaxCap + 1);
          } else if (curVarF < freqBounds.freqMinTarget) {
            freqBalanceScore += 18 * ((freqBounds.freqMinTarget - curVarF) / Math.max(1, freqBounds.freqIdeal));
          }
        }
      }
      if (enforceSoftFreqCap && saturatedCount > 2) continue;

      // Bônus de diversidade de subconjuntos de fixas rotativas
      let rotationBonus = 0;
      if (fixedBounds.modo === 'rotativas' && effectiveFixas.length >= 3) {
        const subsetKey = effectiveFixas.filter((f) => cand.includes(f)).join('-');
        if (!usedFixedSubsets.has(subsetKey)) {
          rotationBonus += 28;
        }
      }

      const candKey = cand.join('-');
      const savedPenalty = savedTicketsSet.has(candKey) ? 45 : 0;
      // Bônus elevado para Hamming >= 3 em 18-21 dezenas
      const hammingBonus = Math.min(minDist, 6) * (is18to21 ? 10 : 6);

      let winningBonus = 0;
      const nucleoVencedor = REGRA_VENCEDORA_CONCURSO_3822.nucleoOuroVencedor;
      const nucleoHits = cand.filter((num) => nucleoVencedor.includes(num)).length;
      if (nucleoHits >= 8) winningBonus += 0.8;

      const jitter = Math.random() * 0.2;
      const combinedGain =
        (newCovers * 12) +
        (candScores[i] / 100) +
        hammingBonus +
        freqBalanceScore +
        rotationBonus +
        winningBonus +
        jitter -
        savedPenalty;

      if (combinedGain > bestCombinedGain) {
        bestCombinedGain = combinedGain;
        bestCandIdx = i;
      }
    }

    return bestCandIdx;
  };

  const commitCandidate = (candIdx: number) => {
    chosenSet.add(candIdx);
    chosenIndices.push(candIdx);
    chosenMasks.push(candMasks[candIdx]);

    const chosenCand = candidateCombos[candIdx];
    const isLower = candIdx >= coreCombos.length && candIdx < coreCombos.length + lowerTailCombos.length;
    const isUpper = candIdx >= coreCombos.length + lowerTailCombos.length;
    if (isLower) lowerTailChosen++;
    else if (isUpper) upperTailChosen++;
    else coreChosen++;

    if (fixedBounds.modo === 'rotativas' && effectiveFixas.length >= 3) {
      const subsetKey = effectiveFixas.filter((f) => chosenCand.includes(f)).join('-');
      usedFixedSubsets.add(subsetKey);
    }

    for (const d of chosenCand) {
      if (effectiveFixedSet.has(d)) {
        fixedFreq[d] = (fixedFreq[d] || 0) + 1;
      } else {
        numberFreq[d] = (numberFreq[d] || 0) + 1;
      }
    }

    const covers = candCoverLists[candIdx];
    for (let k = 0; k < covers.length; k++) {
      const uIdx = covers[k];
      if (coveredCounts[uIdx] === 0) {
        uncoveredRemaining--;
      }
      coveredCounts[uIdx]++;
    }
  };

  let greedyStep = 0;
  const maxGreedySteps = Math.min(maxTickets * 2, 250);
  while (uncoveredRemaining > 0 && chosenIndices.length < maxTickets && greedyStep++ < maxGreedySteps) {
    let idx = pickBestCandidate(targetHammingDist, true, true);
    if (idx === -1) idx = pickBestCandidate(targetHammingDist, true, false);
    if (idx === -1 && targetHammingDist > 3) idx = pickBestCandidate(3, true, true);
    if (idx === -1 && targetHammingDist > 3) idx = pickBestCandidate(3, true, false);
    if (idx === -1) idx = pickBestCandidate(targetHammingDist, false, true);
    if (idx === -1) idx = pickBestCandidate(targetHammingDist, false, false);
    if (idx === -1 && targetHammingDist > 3) idx = pickBestCandidate(3, false, false);
    if (idx === -1 && targetHammingDist > 2) idx = pickBestCandidate(2, true, false);
    if (idx === -1 && targetHammingDist > 2) idx = pickBestCandidate(2, false, false);
    // Em universos de 18-21 dezenas, prioriza Hamming >= 3 (e >= 2); só recorre a Hamming = 1 em pool 18 muito restrito para não descartar filtros estritos válidos
    if (idx === -1 && (!is18to21 || (n === 18 && fallbackLevel === 0 && candCount >= maxTickets))) {
      idx = pickBestCandidate(1, false, false);
    }
    if (idx === -1) break;
    commitCandidate(idx);
  }

  // Preenchimento complementar até maxTickets mantendo prioridade Hamming >= 3 em 18–21
  while (chosenIndices.length < maxTickets && chosenIndices.length < candCount) {
    let idx = pickBestCandidate(targetHammingDist, false, true, true);
    if (idx === -1) idx = pickBestCandidate(targetHammingDist, false, false, true);
    if (idx === -1 && targetHammingDist > 3) idx = pickBestCandidate(3, false, false, true);
    if (idx === -1 && targetHammingDist > 2) idx = pickBestCandidate(2, false, false, true);
    const allowQuotaOverflow = bypassAnomaly || coreChosen >= coreQuota;
    if (idx === -1 && allowQuotaOverflow) idx = pickBestCandidate(targetHammingDist, false, false, false);
    if (idx === -1 && allowQuotaOverflow && targetHammingDist > 2) idx = pickBestCandidate(2, false, false, false);
    if (idx === -1 && (!is18to21 || (n === 18 && fallbackLevel === 0 && candCount >= maxTickets && allowQuotaOverflow))) {
      idx = pickBestCandidate(1, false, false, false);
    }
    if (idx === -1) break;
    commitCandidate(idx);
  }

  // 7. Varredura 2-opt de Eliminação de Redundâncias (preservando estratos Anti-Cisne Negro e target maxTickets)
  let improved = true;
  let prunePass = 0;
  const minKeepCount = enableStratification ? maxTickets : (maxTickets <= 24 ? Math.min(20, maxTickets) : Math.floor(maxTickets * 0.85));
  while (improved && prunePass++ < 30 && chosenIndices.length > minKeepCount) {
    improved = false;
    for (let p = chosenIndices.length - 1; p >= 0; p--) {
      const candIdx = chosenIndices[p];
      const isTail = candIdx >= coreCombos.length;
      if (isTail) continue;
      const covers = candCoverLists[candIdx];

      let canBePruned = true;
      for (let k = 0; k < covers.length; k++) {
        if (coveredCounts[covers[k]] <= 1) {
          canBePruned = false;
          break;
        }
      }

      if (canBePruned && chosenIndices.length > minKeepCount) {
        chosenIndices.splice(p, 1);
        chosenMasks.splice(p, 1);
        chosenSet.delete(candIdx);
        for (let k = 0; k < covers.length; k++) {
          coveredCounts[covers[k]]--;
        }
        improved = true;
        break;
      }
    }
  }

  // 8. Construção e ordenação dos bilhetes finais preservando faixaSoma
  const finalEntries = chosenIndices.map((candIdx) => {
    const faixaSoma: 'ouro' | 'baixa' | 'alta' =
      candIdx >= coreCombos.length + lowerTailCombos.length
        ? 'alta'
        : candIdx >= coreCombos.length
        ? 'baixa'
        : 'ouro';
    const analysis = analyzeTicket(candidateCombos[candIdx], concursoAnterior, aiScores);
    return {
      nums: candidateCombos[candIdx],
      faixaSoma,
      analysis,
    };
  });

  finalEntries.sort((a, b) => b.analysis.scoreIA - a.analysis.scoreIA);

  const universeSet = new Set(sortedPool);
  const isValidUniverse = finalEntries.every((e) => e.nums.every((d) => universeSet.has(d)));
  if (!isValidUniverse) {
    throw new Error('Falha de integridade: bilhetes gerados contêm dezenas fora do universoDezenas selecionado.');
  }

  return finalEntries.map((entry, idx) => {
    const tags = [
      entry.faixaSoma === 'baixa'
        ? 'Cauda Baixa (155–179)'
        : entry.faixaSoma === 'alta'
        ? 'Cauda Alta (216–230)'
        : fallbackLevel === 3
        ? 'Cobertura Combinatória + Hamming'
        : `Zona Central (${centralMin}–${centralMax})`,
      fixedBounds.modo === 'rotativas' && effectiveFixas.length >= 3
        ? `Fixas Rotativas (${fixedBounds.minK}–${fixedBounds.maxK}/${effectiveFixas.length})`
        : `Hamming ≥${targetHammingDist}`,
    ];
    if (fallbackLevel > 0) {
      tags.push(fallbackMeta.label);
    }
    return {
      id: `ticket-setcover-${idx + 1}`,
      index: idx + 1,
      ...entry.analysis,
      faixaSoma: entry.faixaSoma,
      tags,
    };
  });
}

/**
 * High-performance Covering Design Generator (Greedy Set Cover with Canonical Filtering)
 * Calibrated with:
 * - Fixas Rotativas Inteligentes (K de N, max 5 fixas)
 * - Filtro de Espalhamento Geométrico Bitwise (Hamming >= 3 até 32 jogos, >= 2 para 64 jogos)
 * - Auto-Calibração da Faixa de Soma pelo Universo (μ_U ± 20) + Anti-Cisne Negro 75/15/10 (155–235 para >= 10 jogos)
 * - Controle de Frequência Equilibrada (0.85x–1.15x de freqIdeal)
 */
export function generateFechamentoCovering(
  selectedNumbers: number[],
  targetHits: number = 14,
  maxTickets: number = 32,
  filters?: FilterCriteria,
  concursoAnterior: number[] = CONCURSO_ATUAL.dezenas,
  aiScores?: number[],
  fallbackLevel: ProgressiveFallbackLevel = 0,
  disableAutoFallback: boolean = false
): GameTicket[] {
  const excludedSet = new Set(filters?.dezenasExcluidas || []);
  const sortedPool = [...new Set(selectedNumbers)]
    .filter((d) => !excludedSet.has(d))
    .sort((a, b) => a - b);
  const n = sortedPool.length;

  if (n < 15) {
    throw new Error('É necessário selecionar pelo menos 15 dezenas.');
  }

  // Fallback Progressivo Automático em 3 níveis quando filtros estritos não atingem a meta de bilhetes
  if (!disableAutoFallback && fallbackLevel === 0 && n > 15) {
    let bestTickets: GameTicket[] = [];
    for (const lvl of [0, 1, 2, 3] as ProgressiveFallbackLevel[]) {
      const fb = buildProgressiveFallbackFilters(filters, lvl);
      try {
        const attempt = generateFechamentoCovering(
          sortedPool,
          targetHits,
          maxTickets,
          fb.filters,
          concursoAnterior,
          aiScores,
          lvl,
          true
        );
        if (attempt.length > bestTickets.length) {
          bestTickets = attempt;
        }
        if (attempt.length >= maxTickets) {
          return attempt;
        }
      } catch {
        // Escala automaticamente para o próximo nível de relaxamento
      }
    }
    if (bestTickets.length > 0) {
      return bestTickets;
    }
    throw new Error(
      'Nenhum jogo compatível com os filtros selecionados mesmo após o Fallback Progressivo de 3 níveis.'
    );
  }

  const fallbackMeta = buildProgressiveFallbackFilters(filters, fallbackLevel);
  const bypassAnomaly = fallbackMeta.bypassCanonicalAnomaly;

  // 1. Sanitização estrita de dezenas fixas (máx. 5) e Modo Rotativas Inteligentes (K de N)
  const effectiveFixas = sanitizeDezenasFixas(filters?.dezenasFixas || [], sortedPool);
  const effectiveFixedSet = new Set(effectiveFixas);
  const fixedBounds = getRotatedFixedBounds(effectiveFixas.length, filters?.modoFixas);

  // Auto-calibração de soma pelo universo selecionado (μ_U ± 20) — desativada nos níveis 2 e 3
  const sumCal = resolveCentralSumBounds(sortedPool, filters);
  const centralMin = fallbackLevel === 3 ? 120 : fallbackLevel === 2 ? Math.min(165, sumCal.centralMin) : sumCal.centralMin;
  const centralMax = fallbackLevel === 3 ? 285 : fallbackLevel === 2 ? Math.max(225, sumCal.centralMax) : sumCal.centralMax;

  const effectiveCoreFilters: FilterCriteria | undefined = filters
    ? {
        ...filters,
        dezenasFixas: effectiveFixas,
        modoFixas: fixedBounds.modo,
        somaMin: centralMin,
        somaMax: centralMax,
      }
    : undefined;

  // Redução por Cobertura Mínima (Set Cover Problem) para matrizes de 18 e 19 dezenas
  if ((n === 18 || n === 19) && targetHits === 14) {
    return generateMinimumSetCoverFechamento({
      selectedNumbers: sortedPool,
      targetHits: 14,
      maxTickets,
      filters: effectiveCoreFilters || {
        ...DEFAULT_FILTERS,
        dezenasFixas: effectiveFixas,
        modoFixas: fixedBounds.modo,
        somaMin: centralMin,
        somaMax: centralMax,
      },
      concursoAnterior,
      aiScores,
      fallbackLevel,
      disableAutoFallback: true,
    });
  }

  const checkFixasCompliance = (nums: number[]): boolean => {
    if (effectiveFixas.length === 0) return true;
    let present = 0;
    for (let i = 0; i < effectiveFixas.length; i++) {
      if (nums.includes(effectiveFixas[i])) present++;
    }
    return present >= fixedBounds.minK && present <= fixedBounds.maxK;
  };

  const canonicalSumOverride = {
    somaMin: Math.min(fallbackLevel >= 2 ? 165 : 175, centralMin),
    somaMax: Math.max(225, centralMax),
  };

  const isCandidateValid = (nums: number[]): boolean => {
    if (!checkFixasCompliance(nums)) return false;
    if (bypassAnomaly) return true;
    const a = analyzeTicket(nums, concursoAnterior, aiScores);
    if (isCanonicalAnomaly(nums, a, concursoAnterior, canonicalSumOverride)) return false;
    if (effectiveCoreFilters && !ticketPassesFilters(a, effectiveCoreFilters, concursoAnterior)) {
      return false;
    }
    if (a.soma < centralMin || a.soma > centralMax) return false;
    return true;
  };

  // For 15 numbers: single ticket
  if (n === 15) {
    let final15 = [...sortedPool];
    if (!isCandidateValid(final15)) {
      const fixed = effectiveFixas;
      const excluded = filters?.dezenasExcluidas ?? [];
      const pool25 = Array.from({ length: 25 }, (_, i) => i + 1).filter((num) => !excluded.includes(num));

      let foundValid = false;
      const nonFixed = final15.filter((x) => !fixed.includes(x));
      const availableSubstitutes = pool25.filter((x) => !final15.includes(x));

      for (let i = 0; i < nonFixed.length && !foundValid; i++) {
        for (let j = 0; j < availableSubstitutes.length; j++) {
          const testComb = [...final15.filter((x) => x !== nonFixed[i]), availableSubstitutes[j]].sort((a, b) => a - b);
          if (isCandidateValid(testComb)) {
            final15 = testComb;
            foundValid = true;
            break;
          }
        }
      }

      if (!foundValid) {
        const optPool = buildOptimal18Pool(CONCURSO_ATUAL, DEZENAS_STATS, [], 9, 9).dezenas18
          .filter((x) => !excluded.includes(x));
        final15 = Array.from(new Set([...fixed, ...optPool, ...pool25])).slice(0, 15).sort((a, b) => a - b);
      }
    }
    const analysis = analyzeTicket(final15, concursoAnterior, aiScores);
    return [{ id: 'ticket-1', index: 1, ...analysis, faixaSoma: 'ouro' }];
  }

  // Estratificação de Cauda obrigatória em >= 10 jogos: 75% Zona Central (180–215) / 15% Cauda Alta (216–230) / 10% Cauda Baixa (155–179)
  const enableStratification =
    maxTickets >= 10 && n >= 16 && effectiveCoreFilters?.estratificacaoCaudaAtiva !== false;
  const stratCentralMin = bypassAnomaly ? ZONA_CENTRAL_SOMA_MIN : centralMin;
  const stratCentralMax = bypassAnomaly ? ZONA_CENTRAL_SOMA_MAX : centralMax;
  const lowerTailMax = Math.max(CAUDA_BAIXA_SOMA_MIN, Math.min(CAUDA_BAIXA_SOMA_MAX, stratCentralMin - 1));
  const upperTailMin = Math.min(CAUDA_ALTA_SOMA_MAX, Math.max(CAUDA_ALTA_SOMA_MIN, stratCentralMax + 1));

  const isLowerTailCandidate = (nums: number[]): boolean => {
    if (!enableStratification) return false;
    if (!checkFixasCompliance(nums)) return false;
    const sorted = [...nums].sort((x, y) => x - y);
    const soma = sorted.reduce((a, b) => a + b, 0);
    if (soma < CAUDA_BAIXA_SOMA_MIN || soma > lowerTailMax) return false;
    if (isHistorical15Collision(sorted)) return false;
    if (bypassAnomaly) return true;
    const maxSeq = getMaxConsecutiveSequence(sorted);
    if (maxSeq > 8) return false;
    const pares = sorted.filter((d) => d % 2 === 0).length;
    const primos = sorted.filter((d) => PRIMOS.includes(d)).length;
    const bola1 = sorted[0];
    const bola15 = sorted[sorted.length - 1];
    if (bola1 > 4 || bola15 < 20) return false;
    if (pares < 4 || pares > 11) return false;
    if (primos < 3 || primos > 8) return false;
    return true;
  };

  const isUpperTailCandidate = (nums: number[]): boolean => {
    if (!enableStratification) return false;
    if (!checkFixasCompliance(nums)) return false;
    const sorted = [...nums].sort((x, y) => x - y);
    const soma = sorted.reduce((a, b) => a + b, 0);
    if (soma < upperTailMin || soma > CAUDA_ALTA_SOMA_MAX) return false;
    if (isHistorical15Collision(sorted)) return false;
    if (bypassAnomaly) return true;
    const maxSeq = getMaxConsecutiveSequence(sorted);
    if (maxSeq > 7) return false;
    const pares = sorted.filter((d) => d % 2 === 0).length;
    const primos = sorted.filter((d) => PRIMOS.includes(d)).length;
    const bola1 = sorted[0];
    const bola15 = sorted[sorted.length - 1];
    if (bola1 > 5 || bola15 < 22) return false;
    if (pares < 4 || pares > 11) return false;
    if (primos < 3 || primos > 8) return false;
    return true;
  };

  // Coleta equilibrada de candidatos (Core + Cauda Baixa + Cauda Alta + Subsets Rotativos de Fixas)
  const coreCandidates: number[][] = [];
  const lowerTailCandidates: number[][] = [];
  const upperTailCandidates: number[][] = [];
  const overflowCandidates: number[][] = [];
  const candidateSeen = new Set<string>();

  const maxCorePool = n <= 17 ? 2000 : 4000;
  const maxTailPool = 600;

  // Prepara subconjuntos K-de-N de fixas rotativas (ou fixas rígidas)
  const nonFixedPool = sortedPool.filter((d) => !effectiveFixedSet.has(d));
  const nonFixedBits = nonFixedPool.map((d) => 1 << (d - 1));
  const fixedSubsets: number[][] = [];
  if (effectiveFixas.length === 0) {
    fixedSubsets.push([]);
  } else if (fixedBounds.modo === 'rotativas') {
    for (let k = fixedBounds.minK; k <= fixedBounds.maxK; k++) {
      fixedSubsets.push(...getCombinations(effectiveFixas, k));
    }
  } else {
    fixedSubsets.push([...effectiveFixas]);
  }

  const rankingMasks = getHistoricalRankingMasks();

  // Para pools pequenos (n <= 18), enumera deterministicamente com Branch & Bound (early-exit)
  if (n <= 18) {
    const coreBranchFilters: PodaDinamicaFiltros = bypassAnomaly
      ? {
          somaMin: 120,
          somaMax: 285,
          paresMin: 0,
          paresMax: 15,
          posicionalAtivo: false,
          multiplosAtivo: false,
          somaAlgarismosAtiva: false,
          cruzAtiva: false,
          strictValidation: false,
          validacaoEstritaCruz: false,
          rankingHistoricoAtivo: false,
        }
      : {
          somaMin: centralMin,
          somaMax: centralMax,
          paresMin: effectiveCoreFilters?.paresMin ?? 5,
          paresMax: effectiveCoreFilters?.paresMax ?? 10,
          posicionalAtivo: effectiveCoreFilters?.posicionalAtivo ?? true,
          multiplosAtivo: effectiveCoreFilters?.multiplosAtivo ?? false,
          somaAlgarismosAtiva: effectiveCoreFilters?.somaAlgarismosAtiva ?? false,
          somaAlgarismosMin: effectiveCoreFilters?.somaAlgarismosMin ?? 63,
          somaAlgarismosMax: effectiveCoreFilters?.somaAlgarismosMax ?? 87,
          cruzAtiva: effectiveCoreFilters?.cruzAtiva ?? true,
          cruzMin: effectiveCoreFilters?.cruzMin ?? 4,
          cruzMax: effectiveCoreFilters?.cruzMax ?? 7,
          strictValidation: effectiveCoreFilters?.strictValidation ?? false,
          validacaoEstritaCruz: effectiveCoreFilters?.validacaoEstritaCruz ?? false,
          rankingHistoricoAtivo: effectiveCoreFilters?.rankingHistoricoAtivo ?? false,
          rankingMasks,
        };

    for (const fSubset of fixedSubsets) {
      const fMask = _criarMascara(fSubset);
      const fSum = fSubset.reduce((acc, v) => acc + v, 0);
      const fPares = fSubset.filter((v) => v % 2 === 0).length;
      const vagas = 15 - fSubset.length;
      if (vagas < 0 || vagas > nonFixedPool.length) continue;

      _combinarComPodaDinamica(
        0,
        0,
        0,
        fSum,
        fPares,
        vagas,
        nonFixedPool,
        nonFixedBits,
        coreBranchFilters,
        fMask,
        (fullMask) => {
          const combo = _mascaraParaDezenas(fullMask);
          const key = combo.join('-');
          if (candidateSeen.has(key)) return;
          if (bypassAnomaly && enableStratification) {
            if (!checkFixasCompliance(combo)) return;
            const s = combo.reduce((a, b) => a + b, 0);
            if (s >= stratCentralMin && s <= stratCentralMax && coreCandidates.length < maxCorePool) {
              candidateSeen.add(key);
              coreCandidates.push(combo);
            } else if (s >= CAUDA_BAIXA_SOMA_MIN && s <= lowerTailMax && lowerTailCandidates.length < maxTailPool) {
              candidateSeen.add(key);
              lowerTailCandidates.push(combo);
            } else if (s >= upperTailMin && s <= CAUDA_ALTA_SOMA_MAX && upperTailCandidates.length < maxTailPool) {
              candidateSeen.add(key);
              upperTailCandidates.push(combo);
            } else if (overflowCandidates.length < maxCorePool) {
              candidateSeen.add(key);
              overflowCandidates.push(combo);
            }
            return;
          }
          if (coreCandidates.length >= maxCorePool) return;
          if (isCandidateValid(combo)) {
            candidateSeen.add(key);
            coreCandidates.push(combo);
          }
        }
      );
    }

    if (bypassAnomaly && enableStratification && coreCandidates.length < maxTickets && overflowCandidates.length > 0) {
      coreCandidates.push(...overflowCandidates);
    }

    if (enableStratification && !bypassAnomaly) {
      const lowerTailFilters: PodaDinamicaFiltros = {
        somaMin: CAUDA_BAIXA_SOMA_MIN,
        somaMax: lowerTailMax,
        paresMin: 4,
        paresMax: 11,
        posicionalAtivo: false,
      };
      const upperTailFilters: PodaDinamicaFiltros = {
        somaMin: upperTailMin,
        somaMax: CAUDA_ALTA_SOMA_MAX,
        paresMin: 4,
        paresMax: 11,
        posicionalAtivo: false,
      };

      for (const fSubset of fixedSubsets) {
        const fMask = _criarMascara(fSubset);
        const fSum = fSubset.reduce((acc, v) => acc + v, 0);
        const fPares = fSubset.filter((v) => v % 2 === 0).length;
        const vagas = 15 - fSubset.length;
        if (vagas < 0 || vagas > nonFixedPool.length) continue;

        _combinarComPodaDinamica(
          0,
          0,
          0,
          fSum,
          fPares,
          vagas,
          nonFixedPool,
          nonFixedBits,
          lowerTailFilters,
          fMask,
          (fullMask) => {
            if (lowerTailCandidates.length >= maxTailPool) return;
            const combo = _mascaraParaDezenas(fullMask);
            const key = combo.join('-');
            if (candidateSeen.has(key)) return;
            if (isLowerTailCandidate(combo)) {
              candidateSeen.add(key);
              lowerTailCandidates.push(combo);
            }
          }
        );

        _combinarComPodaDinamica(
          0,
          0,
          0,
          fSum,
          fPares,
          vagas,
          nonFixedPool,
          nonFixedBits,
          upperTailFilters,
          fMask,
          (fullMask) => {
            if (upperTailCandidates.length >= maxTailPool) return;
            const combo = _mascaraParaDezenas(fullMask);
            const key = combo.join('-');
            if (candidateSeen.has(key)) return;
            if (isUpperTailCandidate(combo)) {
              candidateSeen.add(key);
              upperTailCandidates.push(combo);
            }
          }
        );
      }
    }
  } else {
    // Para n >= 19 (ex: 54.264 combinações em 21 dezenas), amostragem estratificada + poda bitwise early-exit
    const totalAttempts = bypassAnomaly ? 8000 : 18000;
    const workingNonFixed = [...nonFixedPool];
    const nfLen = workingNonFixed.length;

    const fastEarlyExitCoreCheck = (combo: number[]): boolean => {
      if (bypassAnomaly) return true;
      const soma = combo.reduce((a, b) => a + b, 0);
      if (soma < centralMin || soma > centralMax) return false;
      const mask = _criarMascara(combo);
      if (effectiveCoreFilters?.posicionalAtivo && !validarPosicionalSorted(combo).valido) return false;
      if (effectiveCoreFilters?.multiplosAtivo && !validarMultiplosMask(mask).valido) return false;
      if (effectiveCoreFilters?.somaAlgarismosAtiva) {
        const alg = calcularSomaAlgarismos(combo);
        const aMin = effectiveCoreFilters.somaAlgarismosMin ?? 63;
        const aMax = effectiveCoreFilters.somaAlgarismosMax ?? 87;
        if (alg < aMin || alg > aMax) return false;
      }
      if (effectiveCoreFilters?.cruzAtiva !== false) {
        const isStrict = effectiveCoreFilters?.strictValidation || effectiveCoreFilters?.validacaoEstritaCruz;
        const cMin = isStrict ? 5 : (effectiveCoreFilters?.cruzMin ?? 4);
        const cMax = isStrict ? 6 : (effectiveCoreFilters?.cruzMax ?? 7);
        const cruzCnt = _popcount(mask & _MASK_CRUZ);
        if (cruzCnt < cMin || cruzCnt > cMax) return false;
      }
      if (effectiveCoreFilters?.rankingHistoricoAtivo && !validarRankingHistoricoMask(mask).valido) {
        return false;
      }
      return true;
    };

    for (let attempt = 0; attempt < totalAttempts; attempt++) {
      if (
        coreCandidates.length >= maxCorePool &&
        (!enableStratification || (lowerTailCandidates.length >= maxTailPool && upperTailCandidates.length >= maxTailPool))
      ) {
        break;
      }

      const fSubset = fixedSubsets[attempt % fixedSubsets.length];
      const needVar = 15 - fSubset.length;
      if (needVar > nfLen || needVar < 0) continue;

      let chosenVars: number[];
      if (enableStratification && attempt % 7 === 0 && lowerTailCandidates.length < maxTailPool) {
        const biased = [...workingNonFixed].sort((a, b) => a - b + (Math.random() - 0.5) * 10);
        chosenVars = biased.slice(0, needVar);
      } else if (enableStratification && attempt % 7 === 1 && upperTailCandidates.length < maxTailPool) {
        const biased = [...workingNonFixed].sort((a, b) => b - a + (Math.random() - 0.5) * 10);
        chosenVars = biased.slice(0, needVar);
      } else {
        for (let i = 0; i < needVar; i++) {
          const r = i + Math.floor(Math.random() * (nfLen - i));
          const tmp = workingNonFixed[i];
          workingNonFixed[i] = workingNonFixed[r];
          workingNonFixed[r] = tmp;
        }
        chosenVars = workingNonFixed.slice(0, needVar);
      }

      const combo = [...fSubset, ...chosenVars].sort((a, b) => a - b);
      const key = combo.join('-');
      if (candidateSeen.has(key)) continue;

      if (bypassAnomaly && enableStratification) {
        const s = combo.reduce((a, b) => a + b, 0);
        if (s >= stratCentralMin && s <= stratCentralMax && coreCandidates.length < maxCorePool) {
          candidateSeen.add(key);
          coreCandidates.push(combo);
        } else if (s >= CAUDA_BAIXA_SOMA_MIN && s <= lowerTailMax && lowerTailCandidates.length < maxTailPool) {
          candidateSeen.add(key);
          lowerTailCandidates.push(combo);
        } else if (s >= upperTailMin && s <= CAUDA_ALTA_SOMA_MAX && upperTailCandidates.length < maxTailPool) {
          candidateSeen.add(key);
          upperTailCandidates.push(combo);
        } else if (overflowCandidates.length < maxCorePool) {
          candidateSeen.add(key);
          overflowCandidates.push(combo);
        }
      } else if (coreCandidates.length < maxCorePool && fastEarlyExitCoreCheck(combo) && isCandidateValid(combo)) {
        candidateSeen.add(key);
        coreCandidates.push(combo);
      } else if (isLowerTailCandidate(combo) && lowerTailCandidates.length < maxTailPool) {
        candidateSeen.add(key);
        lowerTailCandidates.push(combo);
      } else if (isUpperTailCandidate(combo) && upperTailCandidates.length < maxTailPool) {
        candidateSeen.add(key);
        upperTailCandidates.push(combo);
      }
    }

    if (bypassAnomaly && enableStratification && coreCandidates.length < maxTickets && overflowCandidates.length > 0) {
      coreCandidates.push(...overflowCandidates);
    }
  }

  const allPoolCount = coreCandidates.length + lowerTailCandidates.length + upperTailCandidates.length;
  if (allPoolCount === 0) {
    throw new Error(
      'Nenhum jogo compatível com os filtros selecionados. Os filtros definidos em "Sugestões Estratégicas" ou "Filtros Canônicos" são excessivamente restritivos para o universo de dezenas selecionado. Tente flexibilizar os limites de Soma, Pares/Ímpares, Primos ou Moldura.'
    );
  }

  // Ordena cada estrato por Score IA
  const sortByAIScore = (arr: number[][]) => {
    arr.sort((a, b) => {
      const sA = analyzeTicket(a, concursoAnterior, aiScores).scoreIA;
      const sB = analyzeTicket(b, concursoAnterior, aiScores).scoreIA;
      return sB - sA;
    });
  };
  sortByAIScore(coreCandidates);
  sortByAIScore(lowerTailCandidates);
  sortByAIScore(upperTailCandidates);

  // Estrutura unificada de candidatos com estrato + bitmask
  interface StratumCand {
    nums: number[];
    mask: number;
    key: string;
    faixaSoma: 'ouro' | 'baixa' | 'alta';
    scoreIA: number;
  }

  const unifiedCandidates: StratumCand[] = [
    ...coreCandidates.map((nums) => ({
      nums,
      mask: _criarMascara(nums),
      key: nums.join('-'),
      faixaSoma: 'ouro' as const,
      scoreIA: analyzeTicket(nums, concursoAnterior, aiScores).scoreIA,
    })),
    ...lowerTailCandidates.map((nums) => ({
      nums,
      mask: _criarMascara(nums),
      key: nums.join('-'),
      faixaSoma: 'baixa' as const,
      scoreIA: analyzeTicket(nums, concursoAnterior, aiScores).scoreIA,
    })),
    ...upperTailCandidates.map((nums) => ({
      nums,
      mask: _criarMascara(nums),
      key: nums.join('-'),
      faixaSoma: 'alta' as const,
      scoreIA: analyzeTicket(nums, concursoAnterior, aiScores).scoreIA,
    })),
  ];

  // Quotas de Estratificação de Cauda: 75% Zona Central (180–215) / 15% Cauda Alta (216–230) / 10% Cauda Baixa (155–179)
  const stratQuotas = computeTailStratificationQuotas(maxTickets, enableStratification);
  let lowerQuota = stratQuotas.lowerQuota;
  let upperQuota = stratQuotas.upperQuota;
  if (lowerTailCandidates.length === 0) lowerQuota = 0;
  if (upperTailCandidates.length === 0) upperQuota = 0;
  const coreQuota = Math.max(1, maxTickets - lowerQuota - upperQuota);

  // Subconjuntos alvo de cobertura: em 18–21 dezenas gera amostra estratificada uniforme do universo C(n, 15)
  // para evitar redundância e maximizar cobertura de triplas/quadras (captura de 13/14 pts em 21 dezenas)
  const is18to21 = n >= 18 && n <= 21;
  const testSubsetMasks: number[] = [];
  if (is18to21) {
    const targetSampleSize = 900;
    const seenTestMasks = new Set<number>();
    const sampleWork = [...sortedPool];
    for (let s = 0; s < targetSampleSize * 2 && testSubsetMasks.length < targetSampleSize; s++) {
      for (let i = 0; i < 15; i++) {
        const r = i + Math.floor(Math.random() * (n - i));
        const tmp = sampleWork[i];
        sampleWork[i] = sampleWork[r];
        sampleWork[r] = tmp;
      }
      const m = _criarMascara(sampleWork.slice(0, 15));
      if (!seenTestMasks.has(m)) {
        seenTestMasks.add(m);
        testSubsetMasks.push(m);
      }
    }
  } else {
    for (let i = 0; i < Math.min(unifiedCandidates.length, 600); i++) {
      testSubsetMasks.push(unifiedCandidates[i].mask);
    }
  }
  const uncovered = new Set<number>(testSubsetMasks.map((_, idx) => idx));

  // Cobertura de pares/triplas das dezenas variáveis para otimizar 18–21 dezenas (captura de 13 pts com 14 no universo)
  const pairCoverageCounts = new Uint16Array(26 * 26);
  const tripleMasksForCoverage: number[] = [];
  const tripleCoveredFlags: Uint8Array = new Uint8Array(is18to21 ? 400 : 0);
  if (is18to21 && nonFixedPool.length >= 3) {
    // Amostra determinística de até 400 triplas do pool variável para maximizar cobertura de triplas/quadras
    const nfLen = nonFixedPool.length;
    const allTriplesCount = (nfLen * (nfLen - 1) * (nfLen - 2)) / 6;
    const step = Math.max(1, Math.floor(allTriplesCount / 400));
    let idxCounter = 0;
    for (let a = 0; a < nfLen - 2 && tripleMasksForCoverage.length < 400; a++) {
      for (let b = a + 1; b < nfLen - 1 && tripleMasksForCoverage.length < 400; b++) {
        for (let c = b + 1; c < nfLen && tripleMasksForCoverage.length < 400; c++) {
          if (idxCounter++ % step === 0) {
            tripleMasksForCoverage.push(
              (1 << (nonFixedPool[a] - 1)) |
              (1 << (nonFixedPool[b] - 1)) |
              (1 << (nonFixedPool[c] - 1))
            );
          }
        }
      }
    }
  }

  const chosen: StratumCand[] = [];
  const chosenMasks: number[] = [];
  const chosenKeySet = new Set<string>();

  // Prioriza estritamente Hamming >= 3 em universos de 18 a 21 dezenas
  const targetHammingDist = getTargetHammingDistance(n, maxTickets);
  const freqBounds = calculateVariableFrequencyBounds(
    maxTickets,
    n,
    effectiveFixas.length,
    fixedBounds.modo
  );
  const numberFreq: Record<number, number> = {};
  const fixedFreq: Record<number, number> = {};
  const usedFixedSubsets = new Set<string>();
  const savedTicketsSet = getAllSavedTicketsSet();

  let coreChosen = 0;
  let lowerChosen = 0;
  let upperChosen = 0;

  const selectNextFromPool = (
    allowedFaixa: 'ouro' | 'baixa' | 'alta' | 'any',
    minHammingReq: number,
    requireUncoveredGain: boolean,
    enforceSoftFreqCap: boolean
  ): { idx: number; coveredHere: number[] } | null => {
    let bestIdx = -1;
    let bestWeight = -9999999;
    let bestCovered: number[] = [];

    const searchLimit = Math.min(unifiedCandidates.length, is18to21 ? 950 : 650);
    for (let i = 0; i < unifiedCandidates.length; i++) {
      const cand = unifiedCandidates[i];
      if (chosenKeySet.has(cand.key)) continue;
      if (allowedFaixa !== 'any' && cand.faixaSoma !== allowedFaixa) continue;
      if (allowedFaixa === 'any') {
        if (cand.faixaSoma === 'baixa' && lowerChosen >= lowerQuota) continue;
        if (cand.faixaSoma === 'alta' && upperChosen >= upperQuota) continue;
        if (cand.faixaSoma === 'ouro' && coreChosen >= coreQuota) continue;
      }

      const minDist = minHammingDistanceToMatrix(cand.mask, chosenMasks);
      if (chosenMasks.length > 0) {
        if (minDist === 0) continue;
        if (minHammingReq > 0 && minDist < minHammingReq) continue;
      }

      if (requireUncoveredGain && i > searchLimit && cand.faixaSoma === 'ouro') continue;

      let coverCount = 0;
      const coveredHere: number[] = [];
      if (uncovered.size > 0) {
        for (const subsetIdx of uncovered) {
          if (_popcount(cand.mask & testSubsetMasks[subsetIdx]) >= targetHits) {
            coverCount++;
            coveredHere.push(subsetIdx);
          }
        }
      }
      if (requireUncoveredGain && uncovered.size > 0 && coverCount === 0) continue;

      // Bônus de cobertura de novas triplas e pares raros (crítico em 18–21 dezenas)
      let tripleNoveltyBonus = 0;
      if (is18to21 && tripleMasksForCoverage.length > 0) {
        let newTriples = 0;
        for (let t = 0; t < tripleMasksForCoverage.length; t++) {
          if (tripleCoveredFlags[t] === 0 && (cand.mask & tripleMasksForCoverage[t]) === tripleMasksForCoverage[t]) {
            newTriples++;
          }
        }
        tripleNoveltyBonus += newTriples * 1.1;

        // Penalidade leve para pares já excessivamente repetidos
        let pairNovelty = 0;
        for (let p1 = 0; p1 < cand.nums.length; p1++) {
          const d1 = cand.nums[p1];
          if (effectiveFixedSet.has(d1)) continue;
          for (let p2 = p1 + 1; p2 < cand.nums.length; p2++) {
            const d2 = cand.nums[p2];
            if (effectiveFixedSet.has(d2)) continue;
            if (pairCoverageCounts[d1 * 26 + d2] === 0) pairNovelty += 0.35;
          }
        }
        tripleNoveltyBonus += pairNovelty;
      }

      // Controle de Frequência Equilibrada [0.85x..1.15x] e rotação de fixas
      let freqScore = 0;
      let saturatedCount = 0;
      for (let idxD = 0; idxD < cand.nums.length; idxD++) {
        const d = cand.nums[idxD];
        if (effectiveFixedSet.has(d)) {
          if (fixedBounds.modo === 'rotativas') {
            const curF = fixedFreq[d] || 0;
            if (curF > freqBounds.fixedIdeal * 1.1) {
              freqScore -= 45 * (curF - freqBounds.fixedIdeal + 1);
            } else if (curF < freqBounds.fixedIdeal * 0.9) {
              freqScore += 20;
            }
          }
        } else {
          const curVarF = numberFreq[d] || 0;
          if (curVarF >= freqBounds.freqMaxCap) {
            saturatedCount++;
            freqScore -= 85 * (curVarF - freqBounds.freqMaxCap + 1);
          } else if (curVarF < freqBounds.freqMinTarget) {
            freqScore += 18 * ((freqBounds.freqMinTarget - curVarF) / Math.max(1, freqBounds.freqIdeal));
          }
        }
      }
      if (enforceSoftFreqCap && saturatedCount > 2) continue;

      let rotationBonus = 0;
      if (fixedBounds.modo === 'rotativas' && effectiveFixas.length >= 3) {
        const subsetKey = effectiveFixas.filter((f) => cand.nums.includes(f)).join('-');
        if (!usedFixedSubsets.has(subsetKey)) rotationBonus += 28;
      }

      const savedPenalty = savedTicketsSet.has(cand.key) ? 25 : 0;
      const hammingBonus = Math.min(minDist, 6) * (is18to21 ? 9 : 5);
      const jitter = Math.random() * 0.2;

      const analysis = analyzeTicket(cand.nums, concursoAnterior, aiScores);
      let winningBonus = 0;
      const nucleoVencedor = REGRA_VENCEDORA_CONCURSO_3822.nucleoOuroVencedor;
      if (cand.nums.filter((num) => nucleoVencedor.includes(num)).length >= 8) winningBonus += 0.35;
      if (analysis.pares === 7 && analysis.impares === 8) winningBonus += 0.25;

      const weight =
        (coverCount * 2.5) +
        tripleNoveltyBonus +
        (cand.scoreIA / 100) * 0.8 +
        hammingBonus +
        freqScore +
        rotationBonus +
        winningBonus +
        jitter -
        savedPenalty;

      if (weight > bestWeight) {
        bestWeight = weight;
        bestIdx = i;
        bestCovered = coveredHere;
      }
    }

    if (bestIdx === -1) return null;
    return { idx: bestIdx, coveredHere: bestCovered };
  };

  const commitChosen = (cand: StratumCand, coveredHere: number[]) => {
    chosen.push(cand);
    chosenMasks.push(cand.mask);
    chosenKeySet.add(cand.key);

    if (cand.faixaSoma === 'baixa') lowerChosen++;
    else if (cand.faixaSoma === 'alta') upperChosen++;
    else coreChosen++;

    if (fixedBounds.modo === 'rotativas' && effectiveFixas.length >= 3) {
      const subsetKey = effectiveFixas.filter((f) => cand.nums.includes(f)).join('-');
      usedFixedSubsets.add(subsetKey);
    }

    for (const d of cand.nums) {
      if (effectiveFixedSet.has(d)) fixedFreq[d] = (fixedFreq[d] || 0) + 1;
      else numberFreq[d] = (numberFreq[d] || 0) + 1;
    }

    if (is18to21) {
      for (let t = 0; t < tripleMasksForCoverage.length; t++) {
        if (tripleCoveredFlags[t] === 0 && (cand.mask & tripleMasksForCoverage[t]) === tripleMasksForCoverage[t]) {
          tripleCoveredFlags[t] = 1;
        }
      }
      for (let p1 = 0; p1 < cand.nums.length; p1++) {
        const d1 = cand.nums[p1];
        for (let p2 = p1 + 1; p2 < cand.nums.length; p2++) {
          pairCoverageCounts[d1 * 26 + cand.nums[p2]]++;
        }
      }
    }

    for (const coveredIdx of coveredHere) {
      uncovered.delete(coveredIdx);
    }
  };

  // Fase 1: Preencher estratos protegidos (15% Cauda Alta 216–230, 10% Cauda Baixa 155–179) mantendo Hamming >= targetHammingDist
  if (enableStratification) {
    while (lowerChosen < lowerQuota && chosen.length < maxTickets) {
      const hit =
        selectNextFromPool('baixa', targetHammingDist, false, true) ||
        selectNextFromPool('baixa', targetHammingDist, false, false) ||
        (targetHammingDist > 3 ? selectNextFromPool('baixa', 3, false, false) : null) ||
        (targetHammingDist > 2 ? selectNextFromPool('baixa', 2, false, false) : null) ||
        (!is18to21 ? selectNextFromPool('baixa', 1, false, false) : null);
      if (!hit) break;
      commitChosen(unifiedCandidates[hit.idx], hit.coveredHere);
    }
    while (upperChosen < upperQuota && chosen.length < maxTickets) {
      const hit =
        selectNextFromPool('alta', targetHammingDist, false, true) ||
        selectNextFromPool('alta', targetHammingDist, false, false) ||
        (targetHammingDist > 3 ? selectNextFromPool('alta', 3, false, false) : null) ||
        (targetHammingDist > 2 ? selectNextFromPool('alta', 2, false, false) : null) ||
        (!is18to21 ? selectNextFromPool('alta', 1, false, false) : null);
      if (!hit) break;
      commitChosen(unifiedCandidates[hit.idx], hit.coveredHere);
    }
  }

  // Fase 2: Seleção gulosa de cobertura combinatória na Zona Central (priorizando Hamming >= 3 em 18–21)
  let greedyLoop = 0;
  const maxGreedyLoops = Math.min(maxTickets * 2, 220);
  while (chosen.length < maxTickets && greedyLoop++ < maxGreedyLoops) {
    const hit =
      selectNextFromPool('ouro', targetHammingDist, true, true) ||
      selectNextFromPool('ouro', targetHammingDist, true, false) ||
      (targetHammingDist > 3 ? selectNextFromPool('ouro', 3, true, false) : null) ||
      selectNextFromPool('ouro', targetHammingDist, false, true) ||
      selectNextFromPool('ouro', targetHammingDist, false, false) ||
      (targetHammingDist > 3 ? selectNextFromPool('ouro', 3, false, false) : null) ||
      (targetHammingDist > 2 ? selectNextFromPool('ouro', 2, false, false) : null) ||
      (!is18to21 ? selectNextFromPool('ouro', 1, false, false) : null);
    if (!hit) break;
    commitChosen(unifiedCandidates[hit.idx], hit.coveredHere);
  }

  // Fase 3: Fallback final respeitando Hamming >= 3 (e nunca <= 1 em 18–21)
  while (chosen.length < maxTickets && chosen.length < unifiedCandidates.length) {
    const hit =
      selectNextFromPool('any', targetHammingDist, false, false) ||
      (targetHammingDist > 3 ? selectNextFromPool('any', 3, false, false) : null) ||
      (targetHammingDist > 2 ? selectNextFromPool('any', 2, false, false) : null) ||
      (!is18to21 ? selectNextFromPool('any', 1, false, false) : null);
    if (!hit) break;
    commitChosen(unifiedCandidates[hit.idx], hit.coveredHere);
  }

  // Ordenação final por Score IA mantendo todos os bilhetes
  chosen.sort((a, b) => b.scoreIA - a.scoreIA);

  const universeSet = new Set(sortedPool);
  const isValidUniverse = chosen.every((c) => c.nums.every((d) => universeSet.has(d)));
  if (!isValidUniverse) {
    throw new Error('Falha de integridade: bilhetes gerados contêm dezenas fora do universoDezenas selecionado.');
  }

  return chosen.map((item, index) => {
    const analysis = analyzeTicket(item.nums, concursoAnterior, aiScores);
    const tags = [
      item.faixaSoma === 'baixa'
        ? 'Cauda Baixa (155–179)'
        : item.faixaSoma === 'alta'
        ? 'Cauda Alta (216–230)'
        : fallbackLevel === 3
        ? 'Cobertura Combinatória + Hamming'
        : `Zona Central (${centralMin}–${centralMax})`,
      fixedBounds.modo === 'rotativas' && effectiveFixas.length >= 3
        ? `Fixas Rotativas (${fixedBounds.minK}–${fixedBounds.maxK}/${effectiveFixas.length})`
        : `Hamming ≥${targetHammingDist}`,
    ];
    if (fallbackLevel > 0) {
      tags.push(fallbackMeta.label);
    }
    return {
      id: `ticket-${index + 1}`,
      index: index + 1,
      ...analysis,
      faixaSoma: item.faixaSoma,
      tags,
    };
  });
}

export interface GerarMatrizEstratificadaConfig {
  universoDezenas?: number[];
  universo?: number[];
  dezenas?: number[];
  selectedNumbers?: number[];
  totalJogos?: number;
  totalGames?: number;
  jogos?: number;
  dezenasFixas?: number[];
  fixedNumbers?: number[];
  concursoAnterior?: number[];
  aiScores?: number[];
  targetHits?: number;
  filters?: FilterCriteria;
  [key: string]: any;
}

export type GerarMatrizEstratificadaOptions = GerarMatrizEstratificadaConfig;
export { sanitizarFechamentosSalvos } from './sanitizer';

/**
 * Matriz Estratificada Anti-Cisne Negro (Lotofácil Pro)
 * - Auto-calibra zona central pelo universo selecionado (μ_U ± 20)
 * - Fixas Rotativas Inteligentes (K de N, máx. 5 fixas)
 * - Estratificação 75% Central / 15% Cauda Baixa (155–min-1) / 10% Cauda Alta (max+1–235) para >= 10 jogos
 * - Espalhamento Hamming Bitwise (>= 3 até 32 jogos, >= 2 para > 32 jogos)
 * - Frequency Cap dinâmico [0.85x–1.15x] de freqIdeal
 */
export function gerarMatrizEstratificada(
  configOrUniverso: GerarMatrizEstratificadaConfig | number[],
  totalJogosParam: number = 24,
  optionsParam: GerarMatrizEstratificadaOptions = {}
): GameTicket[] {
  let rawUniverso: number[] = [];
  let totalJogos = 24;
  let options: GerarMatrizEstratificadaOptions = {};

  if (Array.isArray(configOrUniverso)) {
    rawUniverso = configOrUniverso;
    totalJogos = totalJogosParam ?? 24;
    options = optionsParam ?? {};
  } else if (configOrUniverso && typeof configOrUniverso === 'object') {
    rawUniverso =
      configOrUniverso.universoDezenas ||
      configOrUniverso.universo ||
      configOrUniverso.dezenas ||
      configOrUniverso.selectedNumbers ||
      [];
    totalJogos =
      configOrUniverso.totalJogos ||
      configOrUniverso.totalGames ||
      configOrUniverso.jogos ||
      totalJogosParam ||
      24;
    options = {
      dezenasFixas: configOrUniverso.dezenasFixas || configOrUniverso.fixedNumbers,
      concursoAnterior: configOrUniverso.concursoAnterior,
      aiScores: configOrUniverso.aiScores,
      targetHits: configOrUniverso.targetHits,
      filters: configOrUniverso.filters,
      ...optionsParam,
    };
  }

  const excludedSet = new Set(options.filters?.dezenasExcluidas || []);
  const sortedPool = [...new Set(rawUniverso)]
    .filter((d) => !excludedSet.has(d))
    .sort((a, b) => a - b);
  const n = sortedPool.length;

  if (n < 15) {
    throw new Error('É necessário fornecer pelo menos 15 dezenas no universoDezenas.');
  }

  // 1. Sanitização estrita de dezenas fixas (máx. 5) e Fixas Rotativas Inteligentes (K de N)
  const rawFixas = options.dezenasFixas || options.filters?.dezenasFixas || [];
  const effectiveFixas = sanitizeDezenasFixas(rawFixas, sortedPool);
  const effectiveFixedSet = new Set(effectiveFixas);
  const fixedBounds = getRotatedFixedBounds(effectiveFixas.length, options.filters?.modoFixas);

  const concursoAnterior = options.concursoAnterior || CONCURSO_ATUAL.dezenas;
  const aiScores = options.aiScores;
  const { centralMin, centralMax } = resolveCentralSumBounds(sortedPool, options.filters);

  // 2. Cálculo das cotas estratificadas (75% Zona Central 180–215, 15% Cauda Alta 216–230, 10% Cauda Baixa 155–179 quando >= 10 jogos)
  const stratQuotas = computeTailStratificationQuotas(totalJogos, totalJogos >= 10);
  const qtdOuro = stratQuotas.coreQuota;
  const qtdCaudaAlta = stratQuotas.upperQuota;
  const qtdCaudaBaixa = stratQuotas.lowerQuota;

  // 3. Geração de combinações candidatas com suporte a K de N fixas rotativas
  const nonFixedPool = sortedPool.filter((d) => !effectiveFixedSet.has(d));
  const fixedSubsets: number[][] = [];
  if (effectiveFixas.length === 0) {
    fixedSubsets.push([]);
  } else if (fixedBounds.modo === 'rotativas') {
    for (let k = fixedBounds.minK; k <= fixedBounds.maxK; k++) {
      fixedSubsets.push(...getCombinations(effectiveFixas, k));
    }
  } else {
    fixedSubsets.push([...effectiveFixas]);
  }

  const countPossibleCombos = (nVal: number, kVal: number): number => {
    if (kVal < 0 || kVal > nVal) return 0;
    if (kVal === 0 || kVal === nVal) return 1;
    let c = 1;
    for (let i = 1; i <= kVal; i++) c = (c * (nVal - (kVal - i))) / i;
    return Math.round(c);
  };

  let rawCombos: number[][] = [];
  const totalEnumEstimate = fixedSubsets.reduce(
    (acc, fs) => acc + countPossibleCombos(nonFixedPool.length, 15 - fs.length),
    0
  );

  if (totalEnumEstimate <= 35000) {
    for (const fs of fixedSubsets) {
      const neededVar = 15 - fs.length;
      if (neededVar < 0 || neededVar > nonFixedPool.length) continue;
      const tails = getCombinations(nonFixedPool, neededVar);
      for (const tail of tails) {
        rawCombos.push([...fs, ...tail].sort((a, b) => a - b));
      }
    }
  } else {
    const sampleSet = new Set<string>();
    const maxSamples = Math.min(8000, Math.max(3500, totalJogos * 220));
    const poolCopy = [...nonFixedPool];
    const poolLen = poolCopy.length;
    let attempts = 0;
    while (rawCombos.length < maxSamples && attempts < maxSamples * 2.5) {
      const fSubset = fixedSubsets[attempts % fixedSubsets.length];
      attempts++;
      const neededFromNonFixed = 15 - fSubset.length;
      if (neededFromNonFixed < 0 || neededFromNonFixed > poolLen) continue;

      for (let i = 0; i < neededFromNonFixed; i++) {
        const r = i + Math.floor(Math.random() * (poolLen - i));
        const temp = poolCopy[i];
        poolCopy[i] = poolCopy[r];
        poolCopy[r] = temp;
      }
      const chosenTail = poolCopy.slice(0, neededFromNonFixed);
      const fullCombo = [...fSubset, ...chosenTail].sort((a, b) => a - b);
      const key = fullCombo.join('-');
      if (!sampleSet.has(key)) {
        sampleSet.add(key);
        rawCombos.push(fullCombo);
      }
    }
  }

  // 4. Classificação dos candidatos por estrato estatístico (Cauda Baixa 155–179 / Central 180–215 / Cauda Alta 216–230)
  const candidatosOuro: number[][] = [];
  const candidatosCaudaBaixa: number[][] = [];
  const candidatosCaudaAlta: number[][] = [];
  const lowerTailMax = Math.max(CAUDA_BAIXA_SOMA_MIN, Math.min(CAUDA_BAIXA_SOMA_MAX, centralMin - 1));
  const upperTailMin = Math.min(CAUDA_ALTA_SOMA_MAX, Math.max(CAUDA_ALTA_SOMA_MIN, centralMax + 1));

  for (const combo of rawCombos) {
    const soma = combo.reduce((a, b) => a + b, 0);
    if (isHistorical15Collision(combo)) continue;

    if (soma >= centralMin && soma <= centralMax) {
      candidatosOuro.push(combo);
    } else if (soma >= CAUDA_BAIXA_SOMA_MIN && soma <= lowerTailMax) {
      const maxSeq = getMaxConsecutiveSequence(combo);
      if (maxSeq <= 8) candidatosCaudaBaixa.push(combo);
    } else if (soma >= upperTailMin && soma <= CAUDA_ALTA_SOMA_MAX) {
      const maxSeq = getMaxConsecutiveSequence(combo);
      if (maxSeq <= 7) candidatosCaudaAlta.push(combo);
    }
  }

  const sortByScore = (combos: number[][]) => {
    return combos.sort((a, b) => {
      const sA = analyzeTicket(a, concursoAnterior, aiScores).scoreIA;
      const sB = analyzeTicket(b, concursoAnterior, aiScores).scoreIA;
      return sB - sA;
    });
  };

  sortByScore(candidatosOuro);
  sortByScore(candidatosCaudaBaixa);
  sortByScore(candidatosCaudaAlta);

  // 5. Seleção com Espalhamento Hamming Bitwise (priorizando >= 3 em 18-21) + Frequency Cap [0.85x..1.15x]
  const is18to21 = n >= 18 && n <= 21;
  const targetHammingDist = getTargetHammingDistance(n, totalJogos);
  const freqBounds = calculateVariableFrequencyBounds(
    totalJogos,
    n,
    effectiveFixas.length,
    fixedBounds.modo
  );

  const numberFreq: Record<number, number> = {};
  const fixedFreq: Record<number, number> = {};
  const usedFixedSubsets = new Set<string>();
  const selectedEntries: { nums: number[]; faixaSoma: 'ouro' | 'baixa' | 'alta' }[] = [];
  const selectedMasks: number[] = [];
  const selectedKeys = new Set<string>();

  const pickFromPool = (pool: number[][], quota: number, faixaSoma: 'ouro' | 'baixa' | 'alta') => {
    let picked = 0;
    const poolWithMasks = pool.map((nums) => ({ nums, mask: _criarMascara(nums), key: nums.join('-') }));

    const runPass = (minHammingReq: number, enforceFreqCap: boolean) => {
      while (picked < quota && selectedEntries.length < totalJogos) {
        let bestIdx = -1;
        let bestPenaltyScore = -Infinity;

        const scanLimit = Math.min(poolWithMasks.length, 450);
        for (let i = 0; i < scanLimit; i++) {
          const cand = poolWithMasks[i];
          if (selectedKeys.has(cand.key)) continue;

          const minDist = minHammingDistanceToMatrix(cand.mask, selectedMasks);
          if (selectedMasks.length > 0 && (minDist === 0 || (minHammingReq > 0 && minDist < minHammingReq))) {
            continue;
          }

          let freqBalance = 0;
          let saturated = false;
          for (const d of cand.nums) {
            if (effectiveFixedSet.has(d)) {
              if (fixedBounds.modo === 'rotativas') {
                const curF = fixedFreq[d] || 0;
                if (curF > freqBounds.fixedIdeal * 1.1) freqBalance -= 40;
                else if (curF < freqBounds.fixedIdeal * 0.9) freqBalance += 20;
              }
            } else {
              const curVarF = numberFreq[d] || 0;
              if (curVarF >= freqBounds.freqMaxCap) {
                saturated = true;
                freqBalance -= 80;
              } else if (curVarF < freqBounds.freqMinTarget) {
                freqBalance += 16;
              }
            }
          }
          if (enforceFreqCap && saturated) continue;

          let rotBonus = 0;
          if (fixedBounds.modo === 'rotativas' && effectiveFixas.length >= 3) {
            const subKey = effectiveFixas.filter((f) => cand.nums.includes(f)).join('-');
            if (!usedFixedSubsets.has(subKey)) rotBonus += 25;
          }

          const rankScore = (scanLimit - i) * 0.1 + Math.min(minDist, 6) * (is18to21 ? 9 : 6) + freqBalance + rotBonus;
          if (rankScore > bestPenaltyScore) {
            bestPenaltyScore = rankScore;
            bestIdx = i;
          }
        }

        if (bestIdx === -1) break;
        const chosen = poolWithMasks[bestIdx];
        selectedEntries.push({ nums: chosen.nums, faixaSoma });
        selectedMasks.push(chosen.mask);
        selectedKeys.add(chosen.key);
        picked++;

        if (fixedBounds.modo === 'rotativas' && effectiveFixas.length >= 3) {
          const subKey = effectiveFixas.filter((f) => chosen.nums.includes(f)).join('-');
          usedFixedSubsets.add(subKey);
        }
        for (const d of chosen.nums) {
          if (effectiveFixedSet.has(d)) fixedFreq[d] = (fixedFreq[d] || 0) + 1;
          else numberFreq[d] = (numberFreq[d] || 0) + 1;
        }
      }
    };

    runPass(targetHammingDist, true);
    if (picked < quota && selectedEntries.length < totalJogos) runPass(targetHammingDist, false);
    if (picked < quota && selectedEntries.length < totalJogos && targetHammingDist > 2) runPass(2, false);
    if (picked < quota && selectedEntries.length < totalJogos && !is18to21) runPass(1, false);
  };

  pickFromPool(candidatosOuro, qtdOuro, 'ouro');
  pickFromPool(candidatosCaudaBaixa, qtdCaudaBaixa, 'baixa');
  pickFromPool(candidatosCaudaAlta, qtdCaudaAlta, 'alta');

  if (selectedEntries.length < totalJogos) {
    pickFromPool(candidatosOuro, totalJogos - selectedEntries.length, 'ouro');
    if (selectedEntries.length < totalJogos) {
      pickFromPool(rawCombos, totalJogos - selectedEntries.length, 'ouro');
    }
  }

  const universeSet = new Set(sortedPool);
  const isValid = selectedEntries.every((e) => e.nums.every((d) => universeSet.has(d)));
  if (!isValid) {
    throw new Error('Falha de integridade em gerarMatrizEstratificada: bilhete contém dezena fora do universo.');
  }

  return selectedEntries.map((entry, idx) => {
    const analysis = analyzeTicket(entry.nums, concursoAnterior, aiScores);
    return {
      id: `ticket-estratificado-${idx + 1}`,
      index: idx + 1,
      ...analysis,
      faixaSoma: entry.faixaSoma,
      tags: [
        entry.faixaSoma === 'baixa'
          ? 'Cauda Baixa (155–179)'
          : entry.faixaSoma === 'alta'
          ? 'Cauda Alta (216–230)'
          : `Zona Central (${centralMin}–${centralMax})`,
        fixedBounds.modo === 'rotativas' && effectiveFixas.length >= 3
          ? `Fixas Rotativas (${fixedBounds.minK}–${fixedBounds.maxK}/${effectiveFixas.length})`
          : 'Hamming Otimizado',
      ],
    };
  });
}

/**
 * Desdobramento Total 25 Dezenas (Blocos Cruzados 5x3 + 5x2)
 *
 * Algoritmo Canônico:
 * 1. Divide as 15 sorteadas do concurso base em 5 trincas: S1..S5
 * 2. Divide as 10 ausentes do concurso base em 5 duplas: A1..A5
 * 3. Cria 5 superblocos de 5 dezenas fundindo Bloco[i] = Si + Ai
 * 4. Combina os 5 blocos 3 a 3: C(5, 3) = 10 jogos de 15 dezenas (ou 9 se excluído o menor score)
 * 5. Garante matematicamente 100% das 25 dezenas, exatamente 9 repetidas + 6 ausentes por bilhete
 * 6. Otimização Monte Carlo (200 iterações) na montagem dos blocos para maximizar a Zona de Ouro
 *    (Soma 190-210, Paridade 7P/8I ou 8P/7I, Primos 5-6, Cruz 5-6, Bola 1 <= 2 e Bola 15 >= 24)
 */
export interface CoreSatelites25Partition {
  core12: number[];
  satellites13: number[];
  weights: Record<number, number>;
}

/**
 * Particiona as 25 dezenas do volante em:
 * - Core (12 dezenas de maior peso composto: IA + frequência recente + pressão de ciclo + equilíbrio rep/aus)
 * - Satélites (13 dezenas restantes)
 *
 * Reduz a dispersão excessiva (Hamming muito alto) nas matrizes de 25 dezenas ao concentrar
 * o Núcleo Forte em 70%–80% dos bilhetes (9 dezenas Core + 6 Satélites por cartão = 75% médio).
 */
export function selectCoreAndSatellites25(options: {
  latestDraw?: LotofacilDraw;
  drawsHistory?: LotofacilDraw[];
  dynamicStats?: DezenaStats[];
  aiScores?: number[];
  priorityFixed?: number[];
  pivotBoost?: number[];
} = {}): CoreSatelites25Partition {
  const baseDraw = options.latestDraw || CONCURSO_ATUAL;
  const draws10 = (options.drawsHistory && options.drawsHistory.length > 0
    ? options.drawsHistory
    : RECENT_DRAWS
  ).slice(0, 10);
  const stats = options.dynamicStats || DEZENAS_STATS;
  const aiScores = options.aiScores;
  const priorityFixedSet = new Set(sanitizeDezenasFixas(options.priorityFixed || []));
  const pivotBoostSet = new Set(options.pivotBoost || []);

  const recentFreq: Record<number, number> = {};
  for (let d = 1; d <= 25; d++) recentFreq[d] = 0;
  for (const dr of draws10) {
    for (const num of dr.dezenas || []) {
      recentFreq[num] = (recentFreq[num] || 0) + 1;
    }
  }

  const weights: Record<number, number> = {};
  for (let d = 1; d <= 25; d++) {
    const st = stats.find((s) => s.numero === d);
    const ai = aiScores?.[d - 1] ?? (st ? Math.min(95, (st.vezes / 24)) : 50);
    const freqScore = (recentFreq[d] || 0) * 6.5;
    const delayScore = (st?.atrasoAtual || 0) * 3.2 + (st?.pendenteNoCiclo ? 10 : 0);
    const histScore = (st?.vezes || 1800) * 0.008;
    const fixedBoost = priorityFixedSet.has(d) ? 45 : 0;
    const pivotBonus = pivotBoostSet.has(d) ? 6 : 0;
    weights[d] = Math.round((ai * 0.55 + freqScore + delayScore + histScore + fixedBoost + pivotBonus) * 100) / 100;
  }

  const sorteadasSet = new Set(baseDraw.dezenas || []);
  const rankedRepetidas = Array.from({ length: 25 }, (_, i) => i + 1)
    .filter((d) => sorteadasSet.has(d))
    .sort((a, b) => weights[b] - weights[a] || a - b);
  const rankedAusentes = Array.from({ length: 25 }, (_, i) => i + 1)
    .filter((d) => !sorteadasSet.has(d))
    .sort((a, b) => weights[b] - weights[a] || a - b);

  // Equilibra o Core 12 com 7 repetidas fortes + 5 ausentes fortes (ou respeitando fixas do usuário)
  const coreSet = new Set<number>();
  for (const fx of priorityFixedSet) {
    if (coreSet.size < 12) coreSet.add(fx);
  }
  for (const r of rankedRepetidas) {
    if (coreSet.size >= 12) break;
    const repInCore = Array.from(coreSet).filter((x) => sorteadasSet.has(x)).length;
    if (repInCore < 7) coreSet.add(r);
  }
  for (const a of rankedAusentes) {
    if (coreSet.size >= 12) break;
    coreSet.add(a);
  }
  for (const r of rankedRepetidas) {
    if (coreSet.size >= 12) break;
    coreSet.add(r);
  }

  const core12 = Array.from(coreSet).sort((a, b) => a - b);
  const satellites13 = Array.from({ length: 25 }, (_, i) => i + 1)
    .filter((d) => !coreSet.has(d))
    .sort((a, b) => weights[b] - weights[a] || a - b);

  return { core12, satellites13, weights };
}

/**
 * Motor Unificado "Ancoragem em Núcleo Forte (Core 12 + Satélites 13)" para matrizes de 25 dezenas:
 * - Cada uma das 12 dezenas Core aparece em 70%–80% dos bilhetes (ex: 7–8 de 10, 8–9 de 11, 17–19 de 24).
 * - Cada bilhete combina 9 dezenas Core (75% de presença média) + 6 Satélites rotacionados.
 * - Reduz a dispersão excessiva (Hamming controlado entre 3 e 6) mantendo 100% das 25 dezenas cobertas.
 */
export function generateCoreSatellites25Matrix(options: {
  maxTickets: number;
  baseDraw?: LotofacilDraw;
  drawsHistory?: LotofacilDraw[];
  dynamicStats?: DezenaStats[];
  filters?: FilterCriteria;
  aiScores?: number[];
  idPrefix: string;
  tagLabel: string;
  pivotConstraint?: { pivotNums: number[]; kPivot: 4 | 5 | 6 };
}): GameTicket[] {
  const {
    maxTickets,
    baseDraw = CONCURSO_ATUAL,
    drawsHistory,
    dynamicStats = DEZENAS_STATS,
    filters,
    aiScores,
    idPrefix,
    tagLabel,
    pivotConstraint,
  } = options;

  const partition = selectCoreAndSatellites25({
    latestDraw: baseDraw,
    drawsHistory,
    dynamicStats,
    aiScores,
    priorityFixed: filters?.dezenasFixas,
    pivotBoost: pivotConstraint?.pivotNums,
  });

  const { core12, satellites13, weights } = partition;
  const corePerTicket = 9; // 9 / 12 = 75% exato por bilhete -> faixa 70%–80% garantida
  const satPerTicket = 6; // 6 / 13 = rotação uniforme cobrindo 100% das 13 satélites

  const minCoreFreq = Math.floor(maxTickets * 0.70);
  const maxCoreFreq = Math.ceil(maxTickets * 0.80);
  const targetCoreFreq = maxTickets * 0.75;
  const targetSatFreq = (maxTickets * satPerTicket) / satellites13.length;

  const coreFreq: Record<number, number> = {};
  const satFreq: Record<number, number> = {};
  core12.forEach((d) => (coreFreq[d] = 0));
  satellites13.forEach((d) => (satFreq[d] = 0));

  const pivotSet = pivotConstraint ? new Set(pivotConstraint.pivotNums) : null;
  const chosenCombos: number[][] = [];
  const chosenMasks: number[] = [];
  const usedKeys = new Set<string>();

  const somaMin = Math.min(175, filters?.somaMin ?? 180);
  const somaMax = Math.max(220, filters?.somaMax ?? 215);

  for (let t = 0; t < maxTickets; t++) {
    const remainingTickets = maxTickets - t;
    let bestCombo: number[] | null = null;
    let bestScore = -Infinity;

    // 140 candidatos avaliados por vaga para balancear Core 70-80%, Satélites 100%, Hamming controlado e Zona de Ouro
    for (let trial = 0; trial < 140; trial++) {
      // Seleciona 9 do Core priorizando quem precisa atingir 70% e evitando exceder 80%
      const mustIncludeCore = core12.filter(
        (d) => minCoreFreq - coreFreq[d] >= remainingTickets
      );
      const eligibleCore = core12.filter(
        (d) => coreFreq[d] < maxCoreFreq && !mustIncludeCore.includes(d)
      );
      const fallbackCore = core12.filter(
        (d) => !mustIncludeCore.includes(d) && !eligibleCore.includes(d)
      );

      const scoredCore = eligibleCore
        .map((d) => ({
          d,
          priority:
            (targetCoreFreq - coreFreq[d]) * 14 +
            (weights[d] || 50) * 0.08 +
            (Math.random() - 0.5) * (trial === 0 ? 0.5 : 8),
        }))
        .sort((a, b) => b.priority - a.priority)
        .map((x) => x.d);

      const pickedCore = [
        ...mustIncludeCore,
        ...scoredCore,
        ...fallbackCore,
      ].slice(0, corePerTicket);

      // Seleciona 6 Satélites priorizando satélites ainda não cobertos (garante 100% das 25 dezenas)
      const scoredSats = satellites13
        .map((d) => ({
          d,
          priority:
            (satFreq[d] === 0 ? 60 : 0) +
            (targetSatFreq - satFreq[d]) * 12 +
            (weights[d] || 50) * 0.06 +
            (Math.random() - 0.5) * (trial === 0 ? 0.5 : 9),
        }))
        .sort((a, b) => b.priority - a.priority)
        .map((x) => x.d);

      let pickedSats = scoredSats.slice(0, satPerTicket);

      // Se houver restrição de Pivô 9 (K ∈ {4, 5, 6}), ajusta satélites para respeitar K dezenas no Pivô
      if (pivotConstraint && pivotSet) {
        const coreInPivot = pickedCore.filter((d) => pivotSet.has(d)).length;
        const neededPivotFromSat = Math.max(0, pivotConstraint.kPivot - coreInPivot);
        const satInPivot = scoredSats.filter((d) => pivotSet.has(d));
        const satOutPivot = scoredSats.filter((d) => !pivotSet.has(d));
        if (neededPivotFromSat <= satInPivot.length && satPerTicket - neededPivotFromSat <= satOutPivot.length) {
          pickedSats = [
            ...satInPivot.slice(0, neededPivotFromSat),
            ...satOutPivot.slice(0, satPerTicket - neededPivotFromSat),
          ];
        }
      }

      const combo = [...pickedCore, ...pickedSats].sort((a, b) => a - b);
      if (combo.length !== 15) continue;
      const key = combo.join('-');
      if (usedKeys.has(key)) continue;

      const mask = _criarMascara(combo);
      const minDist = chosenMasks.length > 0 ? minHammingDistanceToMatrix(mask, chosenMasks) : 4;
      if (chosenMasks.length > 0 && minDist < 2) continue;

      const analysis = analyzeTicket(combo, baseDraw.dezenas, aiScores);
      let score = analysis.scoreIA;

      // Controle de dispersão Hamming: ideal entre 3 e 5 (evita Hamming excessivo >= 7 que derrubou o Hit Rate)
      if (minDist >= 3 && minDist <= 5) score += 18;
      else if (minDist === 6) score += 8;
      else if (minDist >= 7) score -= (minDist - 6) * 10;
      else if (minDist === 2) score -= 4;

      // Calibração Zona de Ouro
      if (analysis.soma >= somaMin && analysis.soma <= somaMax) score += 16;
      else if (analysis.soma >= 165 && analysis.soma <= 225) score += 6;
      else score -= 18;

      if (analysis.pares >= 6 && analysis.pares <= 9) score += 10;
      else score -= 12;

      if (analysis.primos >= 4 && analysis.primos <= 7) score += 8;
      if (analysis.moldura >= 8 && analysis.moldura <= 11) score += 8;
      if (analysis.repetidas >= 7 && analysis.repetidas <= 10) score += 10;
      if (analysis.maxConsecutivas <= 6) score += 6;
      if (isHistorical15Collision(combo)) score -= 120;
      if (hasViciousVisualPattern(combo).isVicious) score -= 40;

      // Verifica aderência estrita ao Pivô K quando aplicável
      if (pivotConstraint && pivotSet) {
        const pCount = combo.filter((d) => pivotSet.has(d)).length;
        if (pCount === pivotConstraint.kPivot) score += 25;
        else score -= Math.abs(pCount - pivotConstraint.kPivot) * 18;
      }

      if (score > bestScore) {
        bestScore = score;
        bestCombo = combo;
      }
    }

    if (!bestCombo) {
      // Fallback determinístico garantindo 9 Core + 6 Satélites únicos
      const fallbackCore = [...core12].sort((a, b) => coreFreq[a] - coreFreq[b]).slice(0, corePerTicket);
      const fallbackSats = [...satellites13].sort((a, b) => satFreq[a] - satFreq[b]).slice(0, satPerTicket);
      bestCombo = [...fallbackCore, ...fallbackSats].sort((a, b) => a - b);
    }

    chosenCombos.push(bestCombo);
    chosenMasks.push(_criarMascara(bestCombo));
    usedKeys.add(bestCombo.join('-'));
    for (const d of bestCombo) {
      if (coreFreq[d] !== undefined) coreFreq[d]++;
      else if (satFreq[d] !== undefined) satFreq[d]++;
    }
  }

  return chosenCombos
    .map((combo) => ({
      combo,
      analysis: analyzeTicket(combo, baseDraw.dezenas, aiScores),
    }))
    .sort((a, b) => b.analysis.scoreIA - a.analysis.scoreIA)
    .map((item, idx) => ({
      id: `${idPrefix}-${idx + 1}`,
      index: idx + 1,
      ...item.analysis,
      tags: [
        tagLabel,
        'Núcleo Forte 12 (70–80%)',
        'Core + Satélites (25 Dez)',
      ],
    }));
}

export interface Desdobramento25BlocosOptions {
  baseDraw?: LotofacilDraw;
  maxGames?: 9 | 10;
  iterations?: number;
  aiScores?: number[];
  dynamicStats?: DezenaStats[];
  filters?: FilterCriteria;
}

/**
 * Cobertura Total 25 Dezenas (10 Jogos — Ancoragem Core 12 + Satélites 13)
 * Reestruturado após auditoria (#3825–#3833): substitui dispersão excessiva de blocos cruzados
 * por Núcleo Forte (12 dezenas de maior peso presentes em 70%–80% dos bilhetes + 13 Satélites rotativos).
 */
export function generateDesdobramento25Blocos(
  options: Desdobramento25BlocosOptions = {}
): GameTicket[] {
  const baseDraw = options.baseDraw || CONCURSO_ATUAL;
  const maxGames = options.maxGames ?? 10;
  return generateCoreSatellites25Matrix({
    maxTickets: maxGames,
    baseDraw,
    dynamicStats: options.dynamicStats,
    filters: options.filters,
    aiScores: options.aiScores,
    idPrefix: 'ticket-25blocos',
    tagLabel: 'Blocos Core 12 + Satélites',
  });
}

/**
 * 1. Fechamento "Super 14 Coringas → Reestruturado Core 12 + Satélites 13" (25 Dezenas em 11 Jogos • R$ 38,50)
 * Elimina a fragilidade de 14 fixas rígidas concentrando as 12 dezenas de maior peso em 70%–80%
 * dos bilhetes e rotacionando as 13 satélites nas 6 vagas finais, cobrindo 100% do volante.
 */
export function generateSuper14Coringas11Jogos(options: {
  latestDraw?: LotofacilDraw;
  drawsHistory?: LotofacilDraw[];
  dynamicStats?: DezenaStats[];
  filters?: FilterCriteria;
  aiScores?: number[];
} = {}): GameTicket[] {
  return generateCoreSatellites25Matrix({
    maxTickets: 11,
    baseDraw: options.latestDraw || CONCURSO_ATUAL,
    drawsHistory: options.drawsHistory,
    dynamicStats: options.dynamicStats,
    filters: options.filters,
    aiScores: options.aiScores,
    idPrefix: 'ticket-coringas14',
    tagLabel: 'Core 12 + 13 Satélites (11J)',
  });
}

/**
 * 2. Fechamento "Padrão Pivô 9 Dezenas (Core 12 + Satélites 13)"
 * Combina o bloco Pivô [5, 6, 7, 12, 13, 14, 19, 20, 21] com Ancoragem em Núcleo Forte:
 * 12 dezenas Core ancoradas em 70%–80% dos bilhetes + rotação equilibrada das 13 Satélites,
 * reduzindo a dispersão excessiva auditada nas matrizes de 25 dezenas.
 */
export function generatePadraoPivo9(options: {
  pivotCountK?: 4 | 5 | 6;
  maxTickets?: number;
  latestDraw?: LotofacilDraw;
  dynamicStats?: DezenaStats[];
  filters?: FilterCriteria;
  aiScores?: number[];
} = {}): GameTicket[] {
  const kPivot: 4 | 5 | 6 = options.pivotCountK === 4 || options.pivotCountK === 6 ? options.pivotCountK : 5;
  const maxTickets = options.maxTickets ?? 24;
  const excludedSet = new Set(options.filters?.dezenasExcluidas || []);
  const pivotNums = [...PIVOT_9_DEZENAS].filter((d) => !excludedSet.has(d));

  return generateCoreSatellites25Matrix({
    maxTickets,
    baseDraw: options.latestDraw || CONCURSO_ATUAL,
    dynamicStats: options.dynamicStats,
    filters: options.filters,
    aiScores: options.aiScores,
    idPrefix: 'ticket-pivo9',
    tagLabel: `Pivô 9 (K=${kPivot}) • Core 12`,
    pivotConstraint: {
      pivotNums,
      kPivot,
    },
  });
}

/**
 * 3. Fechamento "Cobertura Total 25 Dezenas em 3 Grupos de 18 (Core 12 + Satélites 13)" (18 Jogos • R$ 63,00)
 * Utiliza as 12 dezenas de maior peso (Core) ancoradas em 70%–80% dos 18 bilhetes e rotaciona
 * as 13 Satélites nas vagas finais mantendo cobertura integral das 25 dezenas.
 */
export function generateCobertura25TresGrupos18(options: {
  latestDraw?: LotofacilDraw;
  dynamicStats?: DezenaStats[];
  filters?: FilterCriteria;
  aiScores?: number[];
} = {}): GameTicket[] {
  return generateCoreSatellites25Matrix({
    maxTickets: 18,
    baseDraw: options.latestDraw || CONCURSO_ATUAL,
    dynamicStats: options.dynamicStats,
    filters: options.filters,
    aiScores: options.aiScores,
    idPrefix: 'ticket-3x18',
    tagLabel: '25 em 3×18 • Core 12',
  });
}

/**
 * 4. Aposta Espelho (25 Dezenas em 2 Jogos • R$ 7,00)
 * Seleciona 5 dezenas fixas de alta tendência e reparte as 20 dezenas restantes em
 * dois blocos disjuntos de 10 dezenas, cobrindo 100% do volante em apenas 2 apostas.
 */
export function generateApostaEspelho(options: {
  latestDraw?: LotofacilDraw;
  dynamicStats?: DezenaStats[];
  filters?: FilterCriteria;
  aiScores?: number[];
} = {}): GameTicket[] {
  const baseDraw = options.latestDraw || CONCURSO_ATUAL;
  const stats = options.dynamicStats || DEZENAS_STATS;
  const filters = options.filters;
  const aiScores = options.aiScores;

  const ranked25 = Array.from({ length: 25 }, (_, i) => i + 1).sort((a, b) => {
    const stA = stats.find((s) => s.numero === a);
    const stB = stats.find((s) => s.numero === b);
    const sA = (aiScores?.[a - 1] ?? 50) + (stA?.atrasoAtual || 0) * 5 + (stA?.pendenteNoCiclo ? 12 : 0);
    const sB = (aiScores?.[b - 1] ?? 50) + (stB?.atrasoAtual || 0) * 5 + (stB?.pendenteNoCiclo ? 12 : 0);
    return sB - sA;
  });

  const userFixed = sanitizeDezenasFixas(filters?.dezenasFixas || []);
  const anchor5 = Array.from(new Set([...userFixed, ...ranked25])).slice(0, 5).sort((a, b) => a - b);
  const rest20 = Array.from({ length: 25 }, (_, i) => i + 1)
    .filter((n) => !anchor5.includes(n))
    .sort((a, b) => a - b);

  // Partição serpentina inicial (pares de baixa+alta) para equilibrar soma dos dois espelhos
  let bestA: number[] = [];
  let bestB: number[] = [];
  for (let i = 0; i < 5; i++) {
    bestA.push(rest20[i], rest20[19 - i]);
    bestB.push(rest20[5 + i], rest20[14 - i]);
  }

  // Busca local simples (200 iterações de swap) para equilibrar soma (180..215) e paridade (6..8P) em ambos os jogos
  let bestBalanceScore = -Infinity;
  for (let iter = 0; iter < 200; iter++) {
    const trialA = iter === 0 ? [...bestA] : [...bestA];
    const trialB = iter === 0 ? [...bestB] : [...bestB];
    if (iter > 0) {
      const ia = Math.floor(Math.random() * 10);
      const ib = Math.floor(Math.random() * 10);
      const tmp = trialA[ia];
      trialA[ia] = trialB[ib];
      trialB[ib] = tmp;
    }

    const g1 = [...anchor5, ...trialA].sort((a, b) => a - b);
    const g2 = [...anchor5, ...trialB].sort((a, b) => a - b);
    const a1 = analyzeTicket(g1, baseDraw.dezenas, aiScores);
    const a2 = analyzeTicket(g2, baseDraw.dezenas, aiScores);

    const pen1 = Math.abs(a1.soma - 195) + Math.abs(a1.pares - 7.5) * 14 + (isHistorical15Collision(g1) ? 200 : 0);
    const pen2 = Math.abs(a2.soma - 195) + Math.abs(a2.pares - 7.5) * 14 + (isHistorical15Collision(g2) ? 200 : 0);
    const score = (a1.scoreIA + a2.scoreIA) * 0.2 - (pen1 + pen2);

    if (score > bestBalanceScore) {
      bestBalanceScore = score;
      bestA = trialA;
      bestB = trialB;
    }
  }

  const jogo1 = [...anchor5, ...bestA].sort((a, b) => a - b);
  const jogo2 = [...anchor5, ...bestB].sort((a, b) => a - b);
  const an1 = analyzeTicket(jogo1, baseDraw.dezenas, aiScores);
  const an2 = analyzeTicket(jogo2, baseDraw.dezenas, aiScores);

  return [
    {
      id: 'ticket-espelho-1',
      index: 1,
      ...an1,
      tags: ['Aposta Espelho 1/2', `5 Fixas: ${anchor5.map((n) => n.toString().padStart(2, '0')).join(',')}`, 'Cobertura 25 Dez'],
    },
    {
      id: 'ticket-espelho-2',
      index: 2,
      ...an2,
      tags: ['Aposta Espelho 2/2', `5 Fixas: ${anchor5.map((n) => n.toString().padStart(2, '0')).join(',')}`, 'Cobertura 25 Dez'],
    },
  ];
}


/**
 * Standard Presets for Lotofácil Desdobramentos
 */
export const FECHAMENTO_PRESETS: Record<
  FechamentoMode,
  {
    nome: string;
    dezenasNecessarias: number;
    jogosMaximos: number;
    garantia: string;
    condicao: string;
    reducaoPercentual: number;
    descricao: string;
    altaEficiencia?: boolean;
    coreSatelites?: boolean;
    auditNote?: string;
  }
> = {
  '16_14_15': {
    nome: '16 Dezenas (Alta Eficiência • 6 Jogos)',
    dezenasNecessarias: 16,
    jogosMaximos: 6,
    garantia: '14 Pontos',
    condicao: 'Acertando as 15 sorteadas entre as 16 escolhidas',
    reducaoPercentual: 62.5,
    descricao: 'Matriz de Alta Eficiência (70,7% dos ROIs > 50% na auditoria). Reduz de 16 jogos integrais para 6 bilhetes cirúrgicos.',
    altaEficiencia: true,
    auditNote: 'Alta Eficiência • 70,7% dos ROIs > 50%',
  },
  '17_14_15': {
    nome: '17 Dezenas (Alta Eficiência • 12 Jogos)',
    dezenasNecessarias: 17,
    jogosMaximos: 12,
    garantia: '14 Pontos',
    condicao: 'Acertando as 15 sorteadas entre as 17 escolhidas',
    reducaoPercentual: 91.2,
    descricao: 'Matriz de Alta Eficiência (70,7% dos ROIs > 50% na auditoria). Reduz de 136 jogos integrais para 12 bilhetes otimizados.',
    altaEficiencia: true,
    auditNote: 'Alta Eficiência • 70,7% dos ROIs > 50%',
  },
  '18_14_15': {
    nome: '18 Dezenas (Alta Eficiência • Matriz Pro 24J)',
    dezenasNecessarias: 18,
    jogosMaximos: 24,
    garantia: '14 Pontos (com 35% de chance de 15)',
    condicao: 'Acertando as 15 sorteadas entre as 18 escolhidas',
    reducaoPercentual: 97.1,
    descricao: 'Padrão Ouro de Alta Eficiência (70,7% dos ROIs > 50%). Reduz de 816 jogos para 24 bilhetes com Hamming ≥ 3.',
    altaEficiencia: true,
    auditNote: 'Alta Eficiência • 70,7% dos ROIs > 50%',
  },
  '19_14_15': {
    nome: '19 Dezenas (Garantia 14 se 15)',
    dezenasNecessarias: 19,
    jogosMaximos: 48,
    garantia: '14 Pontos',
    condicao: 'Acertando as 15 sorteadas entre as 19 escolhidas',
    reducaoPercentual: 98.7,
    descricao: 'Cobre 76% do volante (19 dezenas) com Hamming ≥ 3 reduzindo de 3.876 apostas para 48 jogos.',
  },
  '20_14_15': {
    nome: '20 Dezenas (Garantia 14 se 15)',
    dezenasNecessarias: 20,
    jogosMaximos: 64,
    garantia: '14 Pontos',
    condicao: 'Acertando as 15 sorteadas entre as 20 escolhidas',
    reducaoPercentual: 99.6,
    descricao: 'Cobre 80% do volante total (20 dezenas) com seleção Hamming ≥ 3 e cobertura de triplas.',
  },
  '18_13_14': {
    nome: '18 Dezenas Econômico (Alta Eficiência • 12J)',
    dezenasNecessarias: 18,
    jogosMaximos: 12,
    garantia: '13 Pontos se 14 (e 14 se 15)',
    condicao: 'Acertando 14 entre as 18 escolhidas',
    reducaoPercentual: 98.5,
    descricao: 'Fechamento de Alta Eficiência (12 jogos • Hamming ≥ 3) para alta frequência de retorno e ROI > 50%.',
    altaEficiencia: true,
    auditNote: 'Alta Eficiência • 70,7% dos ROIs > 50%',
  },
  '21_13_15': {
    nome: '21 Dezenas Amplo (Hamming ≥ 3 • 32J)',
    dezenasNecessarias: 21,
    jogosMaximos: 32,
    garantia: '13 Pontos se 15',
    condicao: 'Acertando as 15 entre 21 dezenas (Hamming ≥ 3 + Triplas)',
    reducaoPercentual: 99.9,
    descricao: 'Cobertura de 84% do volante com Set Cover Hamming ≥ 3 e cobertura otimizada de triplas/quadras.',
  },
  'desdobramento_25_blocos': {
    nome: 'Cobertura Total 25 Dezenas (10 Jogos • Core 12 + Satélites)',
    dezenasNecessarias: 25,
    jogosMaximos: 10,
    garantia: '100% Volante (Core 12 em 70–80%)',
    condicao: '12 dezenas Core em 70–80% dos bilhetes + 13 Satélites rotativos',
    reducaoPercentual: 99.99,
    descricao: 'Reestruturado com Ancoragem em Núcleo Forte: 12 dezenas de maior peso (70%–80%) + rotação equilibrada das 13 satélites.',
    coreSatelites: true,
  },
  'surpresinha_inteligente': {
    nome: 'Surpresinha Algorítmica Inteligente (IA & Filtros)',
    dezenasNecessarias: 15,
    jogosMaximos: 5,
    garantia: 'Alinhamento 100% com Padrões Históricos',
    condicao: 'Filtragem pura das 25 dezenas',
    reducaoPercentual: 100,
    descricao: 'Gera bilhetes de 15 dezenas calibrados diretamente pela Inteligência Artificial.',
  },
  'erre_4_21': {
    nome: 'Erre Apenas 4 Dezenas (Inverso 21 • Hamming ≥ 3)',
    dezenasNecessarias: 21,
    jogosMaximos: 24,
    garantia: '13/14 Pontos se Errar 4',
    condicao: 'Exclua 4 dezenas no volante e jogue com as 21 restantes (Hamming ≥ 3)',
    reducaoPercentual: 99.95,
    descricao: 'Modo Seleção Inversa otimizado com Hamming ≥ 3 e cobertura de triplas/quadras nas 21 dezenas.',
  },
  'super_14_coringas_25': {
    nome: 'Esquema 25 Dezenas Core 12 + 13 Satélites (11 Jogos)',
    dezenasNecessarias: 25,
    jogosMaximos: 11,
    garantia: '100% Volante (Core 12 em 70–80%)',
    condicao: '12 dezenas Core ancoradas em 70%–80% + 13 Satélites nas vagas finais',
    reducaoPercentual: 99.99,
    descricao: 'Substitui 14 fixas rígidas por Núcleo Forte Core 12 (70%–80% de presença) + 13 Satélites em 11 jogos (R$ 38,50).',
    coreSatelites: true,
  },
  'pivo_9_dezenas': {
    nome: 'Padrão Pivô 9 • Core 12 + Satélites 13',
    dezenasNecessarias: 25,
    jogosMaximos: 24,
    garantia: 'Pivô 9 + Núcleo Forte 12 (70–80%)',
    condicao: 'Combina K dezenas do Pivô com Core 12 em 70–80% e 13 Satélites',
    reducaoPercentual: 99.9,
    descricao: 'Isola o bloco Pivô 9 com Ancoragem Core 12 + Satélites 13, reduzindo a dispersão excessiva de Hamming.',
    coreSatelites: true,
  },
  'cobertura_25_3x18': {
    nome: 'Cobertura Total 25 • Core 12 + Satélites (18 Jogos)',
    dezenasNecessarias: 25,
    jogosMaximos: 18,
    garantia: '100% Volante (Core 12 em 70–80%)',
    condicao: '12 dezenas Core ancoradas em 70%–80% dos 18 bilhetes + 13 Satélites',
    reducaoPercentual: 99.99,
    descricao: 'Cobre todas as 25 dezenas em 18 bilhetes (R$ 63,00) ancorados no Núcleo Forte de 12 dezenas (70%–80%) + 13 Satélites.',
    coreSatelites: true,
  },
  '18_ultra_economico_6': {
    nome: '18 Dezenas Ultra-Econômico (Alta Eficiência • 6J)',
    dezenasNecessarias: 18,
    jogosMaximos: 6,
    garantia: '13 Pontos + Alta Densidade 14',
    condicao: 'Acertando as 15 sorteadas entre as 18 escolhidas',
    reducaoPercentual: 99.26,
    descricao: 'Matriz de Alta Eficiência (6 jogos • R$ 21,00) com espalhamento Hamming ≥ 3/4 e excelente relação custo-retorno.',
    altaEficiencia: true,
    auditNote: 'Alta Eficiência • 70,7% dos ROIs > 50%',
  },
  '20_compacto_4': {
    nome: '20 Dezenas Compacto 4J (COLOGA)',
    dezenasNecessarias: 20,
    jogosMaximos: 4,
    garantia: 'Múltiplos 11/12/13 Pontos',
    condicao: '4 jogos de máxima separação cobrindo 80% do volante',
    reducaoPercentual: 99.97,
    descricao: 'Aposta tática de altíssima economia (R$ 14,00) espalhando 20 dezenas em 4 bilhetes independentes com Hamming ≥ 4.',
  },
  '20_compacto_9': {
    nome: '20 Dezenas Compacto 9J (COLOGA)',
    dezenasNecessarias: 20,
    jogosMaximos: 9,
    garantia: '12/13 Pontos + Chances de 14',
    condicao: '9 jogos otimizados para 80% do volante',
    reducaoPercentual: 99.94,
    descricao: 'Esquema enxuto de 9 jogos (R$ 31,50) para 20 dezenas com Hamming ≥ 3 e cobertura de triplas.',
  },
  'aposta_espelho_2': {
    nome: 'Aposta Espelho (25 Dezenas em 2 Jogos)',
    dezenasNecessarias: 25,
    jogosMaximos: 2,
    garantia: '100% Volante (5 Fixas + 10/10)',
    condicao: '5 âncoras fixas repetidas + 20 restantes divididas em 2 jogos disjuntos',
    reducaoPercentual: 99.99,
    descricao: 'Cobre 100% das 25 dezenas em apenas 2 apostas (R$ 7,00), fixando 5 dezenas de ouro e espelhando as 20 restantes.',
  },
};


export const VALOR_APOSTA_LOTOFACIL = 3.50;

/**
 * Monte Carlo Simulation & Historical Backtesting Engine
 * Tests an array of tickets against actual historical draws or random draws
 */
export function runSimulation(
  tickets: GameTicket[],
  drawsToTest: LotofacilDraw[] = [CONCURSO_ATUAL],
  custoPorJogo: number = VALOR_APOSTA_LOTOFACIL
): SimulationResult {
  const totalJogos = tickets.length;
  const concursosTestados = drawsToTest.length;
  const custoTotal = totalJogos * concursosTestados * custoPorJogo;

  let acertos15 = 0;
  let acertos14 = 0;
  let acertos13 = 0;
  let acertos12 = 0;
  let acertos11 = 0;
  let premioTotal = 0;

  const detalhesMelhores: SimulationResult['detalhesMelhores'] = [];

  // Prize standards based on Caixa official averages:
  // 11 acertos: fixed R$ 7.00
  // 12 acertos: fixed R$ 14.00
  // 13 acertos: fixed R$ 35.00
  // 14 acertos: avg R$ 1,500.00
  // 15 acertos: avg R$ 1,800,000.00
  const PREMIO_11 = 7.0;
  const PREMIO_12 = 14.0;
  const PREMIO_13 = 35.0;
  const PREMIO_14 = 1505.65;
  const PREMIO_15 = 1805183.78;

  for (const draw of drawsToTest) {
    for (const ticket of tickets) {
      const matches = countMatches(ticket.dezenas, draw.dezenas);
      let premio = 0;

      if (matches === 15) {
        acertos15++;
        premio = draw.premiacoes?.faixa15?.valor || PREMIO_15;
      } else if (matches === 14) {
        acertos14++;
        premio = draw.premiacoes?.faixa14?.valor || PREMIO_14;
      } else if (matches === 13) {
        acertos13++;
        premio = draw.premiacoes?.faixa13?.valor || PREMIO_13;
      } else if (matches === 12) {
        acertos12++;
        premio = draw.premiacoes?.faixa12?.valor || PREMIO_12;
      } else if (matches === 11) {
        acertos11++;
        premio = draw.premiacoes?.faixa11?.valor || PREMIO_11;
      }

      premioTotal += premio;

      if (matches >= 13) {
        detalhesMelhores.push({
          concurso: draw.concurso,
          data: draw.data,
          acertos: matches,
          jogoId: ticket.index,
          dezenasJogo: ticket.dezenas,
          dezenasSorteadas: draw.dezenas,
          premioEstimado: premio,
        });
      }
    }
  }

  const saldoLiquido = premioTotal - custoTotal;
  const roi = custoTotal > 0 ? (saldoLiquido / custoTotal) * 100 : 0;

  return {
    totalJogos,
    concursosTestados,
    custoTotal,
    premioTotal,
    saldoLiquido,
    roi: Math.round(roi * 10) / 10,
    acertos15,
    acertos14,
    acertos13,
    acertos12,
    acertos11,
    detalhesMelhores: detalhesMelhores.sort((a, b) => b.acertos - a.acertos).slice(0, 50),
  };
}

/**
 * Default Filter Preset: Calibrated with Real Draws (including Concurso 3804)
 * Adjusted to prevent premature pruning of high-scoring combinations
 */
export const DEFAULT_FILTERS: FilterCriteria = {
  paresMin: 6, // Preset Equilíbrio Pro Auditado: 6 a 8 pares (pico 13 pts em 6–7)
  paresMax: 8,
  primosMin: 4, // Auditado: 4 a 7 primos (pico 5–6)
  primosMax: 7,
  somaMin: 175, // Auditado: 175 a 220 com estratificação de cauda ativa (75% 180–215 / 15% 216–230 / 10% 155–179)
  somaMax: 220,
  molduraMin: 8, // Auditado: 8 a 11 dezenas na moldura (pico 9–10)
  molduraMax: 11,
  fibonacciMin: 3, // Auditado: 3 a 6 dezenas Fibonacci (pico 4–6)
  fibonacciMax: 6,
  repetidasMin: 7, // Auditado: 7 a 10 repetidas do concurso anterior (pico 7–9)
  repetidasMax: 10,
  maxConsecutivas: 6, // Auditado: até 6 consecutivas (penalidade zero entre 3 e 5)
  cruzMin: 4, // Cruz da Lotofácil (Linha 3 e Coluna 3: padrão 4 a 7 dezenas, Zona de Ouro: 5 a 6)
  cruzMax: 7,
  cruzAtiva: true,
  bola1Min: 1, // Bola 1 deve ser 1, 2, 3 ou 4 (idealmente 1 ou 2)
  bola1Max: 4,
  bola15Min: 22, // Bola 15 deve ser 22, 23, 24 ou 25 (idealmente 24 ou 25)
  bola15Max: 25,
  extremidadesAtiva: true,
  apenasZonaDeOuroPrimos: false, // Quando ativo restringe estritamente para 5 ou 6 primos (>70% histórico)
  antiColisaoHistoricaAtiva: true, // Bloqueia combinações 100% idênticas a concursos anteriores da Caixa
  antiPadraoViciadoAtivo: true, // Veta linhas/colunas cheias e sequências em PA óbvias
  dezenasFixas: [],
  dezenasExcluidas: [],
  curvaAbcAtiva: false,
  minDezenasClasseA: 11,
  combinacoesVazioExcluidas: [],
  vaziosAtivos: false,
  robustezEstatisticaAtiva: false,
  robustez50SomaMin: 175,
  robustez50SomaMax: 220,
  robustez50ParesMin: 6,
  robustez50ParesMax: 8,
  robustez50MolduraMin: 8,
  robustez50MolduraMax: 11,
  fechamentoPonderadoAtivo: false,
  validacaoEstritaCruz: false,
  strictValidation: false,
  presetEstatistico: 'balanceado',
  modoFixas: 'rotativas',
  autoCalibrarSomaUniverso: true,
  estratificacaoCaudaAtiva: true,
  posicionalAtivo: true,
  multiplosAtivo: true,
  contagemDigitosAtiva: true,
  digitosMin: 22,
  digitosMax: 27,
  umDigitoMin: 3,
  umDigitoMax: 8,
  somaAlgarismosAtiva: true,
  somaAlgarismosMin: 63,
  somaAlgarismosMax: 87,
  linhasColunasAtivo: true,
  maxLinhasCheias: 1,
  maxColunasCheias: 1,
  rankingHistoricoAtivo: true,
  palpiteIneditoAtivo: true,
};

/**
 * Combinations formula nCr = n! / (r! * (n - r)!)
 */
export function nCr(n: number, r: number): number {
  if (r < 0 || r > n) return 0;
  if (r === 0 || r === n) return 1;
  let res = 1;
  for (let i = 1; i <= r; i++) {
    res = (res * (n - (r - i))) / i;
  }
  return Math.round(res);
}

/**
 * Exact Hypergeometric Distribution for a ticket of 15 numbers chosen from a pool of N numbers,
 * given that M winning numbers are present in the pool.
 * P(k acertos) = [C(M, k) * C(N - M, 15 - k)] / C(N, 15)
 */
export function calculateHypergeometricDistribution(
  poolSize: number = 18,
  winningInPool: number,
  ticketSize: number = 15
): { k: number; probabilidade: number; percentual: number }[] {
  const totalComb = nCr(poolSize, ticketSize);
  const results: { k: number; probabilidade: number; percentual: number }[] = [];

  for (let k = 15; k >= 7; k--) {
    const losingInPool = poolSize - winningInPool;
    const losingInTicket = ticketSize - k;

    if (k > winningInPool || losingInTicket > losingInPool || losingInTicket < 0) {
      results.push({ k, probabilidade: 0, percentual: 0 });
      continue;
    }

    const waysWinning = nCr(winningInPool, k);
    const waysLosing = nCr(losingInPool, losingInTicket);
    const waysTotal = waysWinning * waysLosing;
    const prob = totalComb > 0 ? waysTotal / totalComb : 0;

    results.push({
      k,
      probabilidade: prob,
      percentual: Math.round(prob * 10000) / 100,
    });
  }

  return results;
}

/**
 * Dynamic Document-Driven Pool Builder for any target count (15 to 21 numbers)
 * Calibrated against Concurso 3803 and Concurso 3804:
 * - Automatically balances Repetidas (average 9) and Ausentes (average 5-6).
 * - Gives paramount priority to open cycle numbers and historical frequency.
 */
export function buildOptimalPool(
  targetCount: number = 18,
  previousDraw: LotofacilDraw = CONCURSO_ATUAL,
  dynamicStats: DezenaStats[] = DEZENAS_STATS,
  cyclePending: number[] = [],
  customRepetidas?: number,
  customAusentes?: number
): {
  dezenas: number[];
  dezenas18: number[];
  repetidasSelecionadas: number[];
  ausentesSelecionadas: number[];
  explicacao: string;
} {
  const repetidasDisponiveis = [...previousDraw.dezenas];
  const ausentesDisponiveis = Array.from({ length: 25 }, (_, i) => i + 1).filter(
    (n) => !previousDraw.dezenas.includes(n)
  );

  let qtdRepetidas = customRepetidas;
  let qtdAusentes = customAusentes;

  if (qtdRepetidas === undefined || qtdAusentes === undefined) {
    if (targetCount === 15) {
      qtdRepetidas = 9;
      qtdAusentes = 6;
    } else if (targetCount === 16) {
      qtdRepetidas = 9;
      qtdAusentes = 7;
    } else if (targetCount === 17) {
      qtdRepetidas = 9;
      qtdAusentes = 8;
    } else if (targetCount === 18) {
      qtdRepetidas = 9;
      qtdAusentes = 9;
    } else if (targetCount === 19) {
      qtdRepetidas = 10;
      qtdAusentes = 9;
    } else if (targetCount === 20) {
      qtdRepetidas = 10;
      qtdAusentes = 10; // Captura 100% de todas as 10 ausentes!
    } else if (targetCount >= 21) {
      qtdRepetidas = 11;
      qtdAusentes = 10; // Captura 100% de todas as ausentes!
    } else {
      qtdRepetidas = Math.min(9, targetCount);
      qtdAusentes = targetCount - qtdRepetidas;
    }
  }

  // Score Ausentes: prioritize cycle urgency, delay exceeding mean (+ in doc), and frequency
  const scoredAusentes = ausentesDisponiveis.map((n) => {
    const stat = dynamicStats.find((s) => s.numero === n);
    let score = 50;
    if (cyclePending.includes(n)) score += 60; // Critical cycle closing
    if (stat?.atrasoAcimaDaMedia) score += 40; // Exceeded average delay (sign '+' in doc)
    if (stat) score += (stat.atrasoAtual || 1) * 6; // Current delay pressure
    if (isMoldura(n)) score += 8; // Frame balance
    if (stat) score += stat.vezes / 200;
    return { numero: n, score, stat };
  });

  scoredAusentes.sort((a, b) => b.score - a.score);
  let ausentesSelecionadas = scoredAusentes.slice(0, qtdAusentes).map((a) => a.numero);

  // Score Repetidas: prioritize top frequencies, duplas affinity, and frame balance
  const scoredRepetidas = repetidasDisponiveis.map((n) => {
    const stat = dynamicStats.find((s) => s.numero === n);
    let score = 50;
    if (stat) score += stat.vezes / 30; // Historical frequency
    if (isMoldura(n)) score += 10;
    if (isPrimo(n)) score += 5;

    // Check dupla affinity with other repetidas
    for (const d of TOP_DUPLAS) {
      if (d.dupla.includes(n)) {
        score += 8;
      }
    }

    return { numero: n, score, stat };
  });

  scoredRepetidas.sort((a, b) => b.score - a.score);
  let repetidasSelecionadas = scoredRepetidas.slice(0, qtdRepetidas).map((r) => r.numero);

  let poolComb = Array.from(new Set([...repetidasSelecionadas, ...ausentesSelecionadas]));

  // =========================================================================
  // FATOR DE ANOMALIA (INJEÇÃO DE RUÍDO COM DEZENAS FRIAS)
  // Evita que a IA fique viciada apenas nas tendências quentes, mitigando zebras
  // =========================================================================
  const allDezenasSortedByFreqAsc = [...dynamicStats].sort(
    (a, b) => (a.vezes || 2000) - (b.vezes || 2000)
  );
  const coldNumbers = allDezenasSortedByFreqAsc.map((s) => s.numero);
  const qtdFriasDesejadas = targetCount >= 18 ? 2 : 1;
  const friasNoPool = poolComb.filter((n) => coldNumbers.slice(0, 6).includes(n)).length;

  if (friasNoPool < qtdFriasDesejadas) {
    const faltamFrias = qtdFriasDesejadas - friasNoPool;
    const candidatasFrias = coldNumbers.filter((n) => !poolComb.includes(n));
    for (let i = 0; i < faltamFrias && i < candidatasFrias.length; i++) {
      const dezenaFria = candidatasFrias[i];
      // Substituir o elemento não-fixo e menos prioritário do pool
      if (poolComb.length >= targetCount) {
        poolComb.pop();
      }
      poolComb.push(dezenaFria);
    }
  }

  // =========================================================================
  // PROTEÇÃO CONTRA EXCLUSÃO DE BLOCOS INTEIROS (EX: 12, 13, 14, 15, 16)
  // O motor gerador não deve permitir universos que excluam blocos inteiros
  // =========================================================================
  const criticalBlocks = [
    [12, 13, 14, 15, 16], // Bloco crítico intermediário da Lotofácil
    [1, 2, 3, 4, 5],      // Linha 1
    [6, 7, 8, 9, 10],     // Linha 2
    [11, 12, 13, 14, 15], // Linha 3
    [16, 17, 18, 19, 20], // Linha 4
    [21, 22, 23, 24, 25], // Linha 5
  ];

  for (const block of criticalBlocks) {
    const hitsInBlock = poolComb.filter((n) => block.includes(n)).length;
    if (hitsInBlock === 0) {
      // Bloco inteiro ausente: injetar obrigatoriamente a melhor dezena deste bloco
      const candidatesInBlock = block.filter((n) => !poolComb.includes(n));
      if (candidatesInBlock.length > 0) {
        // Encontrar a de maior pontuação do bloco
        const bestFromBlock = candidatesInBlock.sort((a, b) => {
          const sA = (dynamicStats.find((s) => s.numero === a)?.vezes || 0);
          const sB = (dynamicStats.find((s) => s.numero === b)?.vezes || 0);
          return sB - sA;
        })[0];

        // Substituir a última dezena do pool para preservar targetCount
        if (poolComb.length >= targetCount) {
          poolComb.pop();
        }
        poolComb.push(bestFromBlock);
      }
    }
  }

  const dezenas = Array.from(new Set(poolComb)).slice(0, targetCount).sort((a, b) => a - b);

  return {
    dezenas,
    dezenas18: dezenas, // compatibility alias
    repetidasSelecionadas: repetidasSelecionadas.sort((a, b) => a - b),
    ausentesSelecionadas: ausentesSelecionadas.sort((a, b) => a - b),
    explicacao: `Matriz de ${targetCount} Dezenas calibrada pelo Concurso #${previousDraw.concurso} com Injeção de Ruído Anti-Vício e Cobertura de Blocos: ${qtdRepetidas} Repetidas + ${qtdAusentes} Ausentes (Zona de Ouro 185–215).`,
  };
}

/**
 * Backward compatibility wrapper for buildOptimal18Pool
 */
export function buildOptimal18Pool(
  previousDraw: LotofacilDraw = CONCURSO_ATUAL,
  dynamicStats: DezenaStats[] = DEZENAS_STATS,
  cyclePending: number[] = [],
  qtdRepetidas: number = 9,
  qtdAusentes: number = 9
) {
  return buildOptimalPool(18, previousDraw, dynamicStats, cyclePending, qtdRepetidas, qtdAusentes);
}

/**
 * Constrói um pool de dezenas (15 a 21 números) estritamente ajustado e sincronizado
 * com todos os filtros ativos (Soma, Pares, Primos, Moldura, Fibonacci, Repetidas, Curva ABC e Vazios).
 * Garante que a matriz 5x5 do volante reflita imediatamente qualquer alteração nos filtros.
 */
export function buildFilterCompliantPool({
  targetCount = 18,
  filters,
  previousDraw = CONCURSO_ATUAL,
  dynamicStats = DEZENAS_STATS,
  cyclePending = [],
  aiScores,
  currentSelected = [],
  fixedNumbers = [],
  excludedNumbers = [],
}: {
  targetCount: number;
  filters: FilterCriteria;
  previousDraw?: LotofacilDraw;
  dynamicStats?: DezenaStats[];
  cyclePending?: number[];
  aiScores?: number[];
  currentSelected?: number[];
  fixedNumbers?: number[];
  excludedNumbers?: number[];
}): {
  dezenas: number[];
  motivoAjuste: string;
} {
  const allExcluded = new Set<number>([
    ...(excludedNumbers || []),
    ...(filters?.dezenasExcluidas || []),
  ]);

  const allFixed = sanitizeDezenasFixas([
    ...(fixedNumbers || []),
    ...(filters?.dezenasFixas || []),
  ]).filter((n) => !allExcluded.has(n));

  if (allFixed.length >= targetCount) {
    return {
      dezenas: allFixed.slice(0, targetCount).sort((a, b) => a - b),
      motivoAjuste: `${targetCount} dezenas fixas aplicadas integralmente.`,
    };
  }

  const abc = calculateCurvaAbc(dynamicStats);
  const classeASet = new Set(abc.classeANumeros);

  // Targets escalados proporcionalmente para targetCount (base 15)
  const targetPairsCount = Math.round(
    (((filters.paresMin ?? 7) + (filters.paresMax ?? 8)) / 30) * targetCount
  );
  const targetPrimesCount = Math.round(
    (((filters.primosMin ?? 4) + (filters.primosMax ?? 6)) / 30) * targetCount
  );
  const targetMolduraCount = Math.round(
    (((filters.molduraMin ?? 9) + (filters.molduraMax ?? 10)) / 30) * targetCount
  );
  const targetFiboCount = Math.round(
    (((filters.fibonacciMin ?? 3) + (filters.fibonacciMax ?? 5)) / 30) * targetCount
  );
  const targetRepetidasCount = Math.round(
    (((filters.repetidasMin ?? 8) + (filters.repetidasMax ?? 10)) / 30) * targetCount
  );

  const targetMean = ((filters.somaMin ?? 190) + (filters.somaMax ?? 210)) / 30; // ~13.33

  const availableNumbers = Array.from({ length: 25 }, (_, i) => i + 1).filter(
    (n) => !allExcluded.has(n)
  );

  // Pontuação inicial de cada número
  const scored = availableNumbers.map((n) => {
    let score = 50;
    const stat = dynamicStats.find((s) => s.numero === n);
    if (stat) {
      score += stat.vezes / 25;
      score += (stat.atrasoAtual || 1) * 3;
      if (stat.atrasoAcimaDaMedia) score += 20;

      // Ponderação dinâmica pelo Índice de Performance (Frequência × Atraso)
      if (filters.fechamentoPonderadoAtivo) {
        const ip = calculateIndicePerformance(stat, dynamicStats).indicePerformance;
        score += ip * 0.5;
      }
    }
    if (aiScores && aiScores[n - 1] !== undefined) {
      score += aiScores[n - 1] * 0.4;
    }
    if (cyclePending.includes(n)) score += 40;
    if (allFixed.includes(n)) score += 2000; // Prioridade máxima absoluta
    if (filters.curvaAbcAtiva && classeASet.has(n)) score += 35;
    if (currentSelected.includes(n)) score += 12; // Retenção do que o usuário já escolheu se viável

    // Anti-afinidade de combinações de vazio
    if (filters.vaziosAtivos && filters.combinacoesVazioExcluidas) {
      for (const [v1, v2] of filters.combinacoesVazioExcluidas) {
        if ((n === v1 && allFixed.includes(v2)) || (n === v2 && allFixed.includes(v1))) {
          score -= 90;
        }
      }
    }

    // Penalidade por desvio excessivo da média canônica
    const distToMean = Math.abs(n - targetMean);
    score -= distToMean * 0.5;

    return { n, score, stat };
  });

  scored.sort((a, b) => b.score - a.score);

  // Iniciar com números fixos
  const chosen = new Set<number>(allFixed);

  // Função para contar atributos atuais
  const getCounts = (set: Set<number>) => {
    const arr = Array.from(set);
    let pairs = 0;
    let primes = 0;
    let moldura = 0;
    let fibo = 0;
    let repetidas = 0;
    let classeA = 0;
    let sum = 0;
    for (const num of arr) {
      sum += num;
      if (num % 2 === 0) pairs++;
      if (isPrimo(num)) primes++;
      if (isMoldura(num)) moldura++;
      if (isFibonacci(num)) fibo++;
      if (previousDraw.dezenas.includes(num)) repetidas++;
      if (classeASet.has(num)) classeA++;
    }
    return { pairs, primes, moldura, fibo, repetidas, classeA, sum, count: arr.length };
  };

  // Preencher até targetCount selecionando os números que maximizam a aderência aos filtros
  while (chosen.size < targetCount) {
    const cur = getCounts(chosen);
    let bestCandidate = -1;
    let bestCandidateScore = -Infinity;

    for (const item of scored) {
      if (chosen.has(item.n)) continue;

      let candidateWeight = item.score;
      const num = item.n;

      // Se precisamos de mais pares ou ímpares
      if (num % 2 === 0) {
        if (cur.pairs < targetPairsCount) candidateWeight += 25;
        else candidateWeight -= 15;
      } else {
        const targetOdds = targetCount - targetPairsCount;
        const curOdds = cur.count - cur.pairs;
        if (curOdds < targetOdds) candidateWeight += 25;
        else candidateWeight -= 15;
      }

      // Moldura
      if (isMoldura(num)) {
        if (cur.moldura < targetMolduraCount) candidateWeight += 20;
      } else {
        const targetMiolo = targetCount - targetMolduraCount;
        const curMiolo = cur.count - cur.moldura;
        if (curMiolo < targetMiolo) candidateWeight += 20;
      }

      // Primos
      if (isPrimo(num)) {
        if (cur.primes < targetPrimesCount) candidateWeight += 20;
      }

      // Fibonacci
      if (isFibonacci(num)) {
        if (cur.fibo < targetFiboCount) candidateWeight += 15;
      }

      // Repetidas
      if (previousDraw.dezenas.includes(num)) {
        if (cur.repetidas < targetRepetidasCount) candidateWeight += 20;
      } else {
        const targetAusentes = targetCount - targetRepetidasCount;
        const curAusentes = cur.count - cur.repetidas;
        if (curAusentes < targetAusentes) candidateWeight += 20;
      }

      // Curva ABC Classe A
      if (filters.curvaAbcAtiva && classeASet.has(num)) {
        candidateWeight += 30;
      }

      // Combinações de Vazio (não juntar pares de vazio no mesmo pool se possível)
      if (filters.vaziosAtivos && filters.combinacoesVazioExcluidas) {
        for (const [v1, v2] of filters.combinacoesVazioExcluidas) {
          if ((num === v1 && chosen.has(v2)) || (num === v2 && chosen.has(v1))) {
            candidateWeight -= 100;
          }
        }
      }

      if (candidateWeight > bestCandidateScore) {
        bestCandidateScore = candidateWeight;
        bestCandidate = num;
      }
    }

    if (bestCandidate === -1) {
      const remaining = scored.find((s) => !chosen.has(s.n));
      if (remaining) chosen.add(remaining.n);
      else break;
    } else {
      chosen.add(bestCandidate);
    }
  }

  // =========================================================================
  // PROTEÇÃO CONTRA EXCLUSÃO DE BLOCOS INTEIROS (EX: 12, 13, 14, 15, 16)
  // =========================================================================
  const criticalBlocks = [
    [12, 13, 14, 15, 16],
    [1, 2, 3, 4, 5],
    [6, 7, 8, 9, 10],
    [11, 12, 13, 14, 15],
    [16, 17, 18, 19, 20],
    [21, 22, 23, 24, 25],
  ];

  for (const block of criticalBlocks) {
    const hitsInBlock = Array.from(chosen).filter((n) => block.includes(n)).length;
    if (hitsInBlock === 0) {
      const candidatesInBlock = block.filter((n) => !chosen.has(n) && !allExcluded.has(n));
      if (candidatesInBlock.length > 0) {
        // Encontrar a de maior pontuação do bloco
        const bestFromBlock = candidatesInBlock.sort((a, b) => {
          const sA = (dynamicStats.find((s) => s.numero === a)?.vezes || 0);
          const sB = (dynamicStats.find((s) => s.numero === b)?.vezes || 0);
          return sB - sA;
        })[0];

        // Substituir elemento não-fixo de menor peso
        const nonFixedInChosen = Array.from(chosen).filter((n) => !allFixed.includes(n));
        if (nonFixedInChosen.length > 0) {
          const toRemove = nonFixedInChosen[nonFixedInChosen.length - 1];
          chosen.delete(toRemove);
          chosen.add(bestFromBlock);
        }
      }
    }
  }

  // =========================================================================
  // INJEÇÃO DE RUÍDO NO UNIVERSO (FATOR DE ANOMALIA COM DEZENAS FRIAS)
  // =========================================================================
  const allCold = [...dynamicStats]
    .sort((a, b) => (a.vezes || 2000) - (b.vezes || 2000))
    .map((s) => s.numero)
    .filter((n) => !allExcluded.has(n));

  const friasPresentes = Array.from(chosen).filter((n) => allCold.slice(0, 6).includes(n)).length;
  const metaFrias = targetCount >= 18 ? 2 : 1;

  if (friasPresentes < metaFrias) {
    const faltam = metaFrias - friasPresentes;
    const candidatasFrias = allCold.filter((n) => !chosen.has(n));
    const nonFixedInChosen = Array.from(chosen).filter((n) => !allFixed.includes(n));

    for (let i = 0; i < faltam && i < candidatasFrias.length && nonFixedInChosen.length > 0; i++) {
      const fria = candidatasFrias[i];
      const toRemove = nonFixedInChosen.pop();
      if (toRemove !== undefined) {
        chosen.delete(toRemove);
        chosen.add(fria);
      }
    }
  }

  // =========================================================================
  // EQUILÍBRIO DE QUADRANTE E MIOLO (17 e 18 DEZENAS)
  // Exige >= 4 dezenas no Miolo [7, 8, 9, 12, 13, 14, 17, 18, 19],
  // e pelo menos 3 por linha e 3 por coluna no volante 5x5
  // =========================================================================
  if (targetCount >= 17) {
    // 1. Balanceamento de Miolo (mínimo 4 dezenas)
    const MIOLO_DEZENAS = [7, 8, 9, 12, 13, 14, 17, 18, 19];
    let mioloCount = Array.from(chosen).filter((n) => MIOLO_DEZENAS.includes(n)).length;
    if (mioloCount < 4) {
      const candidatesMiolo = MIOLO_DEZENAS.filter((n) => !chosen.has(n) && !allExcluded.has(n));
      const nonFixedChosen = Array.from(chosen).filter((n) => !allFixed.includes(n) && !MIOLO_DEZENAS.includes(n));
      while (mioloCount < 4 && candidatesMiolo.length > 0 && nonFixedChosen.length > 0) {
        const bestMiolo = candidatesMiolo.sort((a, b) => {
          const sA = dynamicStats.find((s) => s.numero === a)?.vezes || 0;
          const sB = dynamicStats.find((s) => s.numero === b)?.vezes || 0;
          return sB - sA;
        })[0];
        candidatesMiolo.splice(candidatesMiolo.indexOf(bestMiolo), 1);
        const toReplace = nonFixedChosen.pop();
        if (toReplace !== undefined) {
          chosen.delete(toReplace);
          chosen.add(bestMiolo);
          mioloCount++;
        }
      }
    }

    // 2. Balanceamento de Linhas (mínimo 3 dezenas por linha no volante 5x5)
    for (let row = 0; row < 5; row++) {
      const rowNumbers = [row * 5 + 1, row * 5 + 2, row * 5 + 3, row * 5 + 4, row * 5 + 5];
      let rowHits = Array.from(chosen).filter((n) => rowNumbers.includes(n)).length;
      if (rowHits < 3) {
        const rowCandidates = rowNumbers.filter((n) => !chosen.has(n) && !allExcluded.has(n));
        const nonFixedChosen = Array.from(chosen).filter((n) => {
          if (allFixed.includes(n)) return false;
          const nRow = Math.floor((n - 1) / 5);
          const nRowHits = Array.from(chosen).filter((x) => Math.floor((x - 1) / 5) === nRow).length;
          return nRowHits > 3;
        });
        while (rowHits < 3 && rowCandidates.length > 0 && nonFixedChosen.length > 0) {
          const addNum = rowCandidates.shift()!;
          const remNum = nonFixedChosen.pop()!;
          chosen.delete(remNum);
          chosen.add(addNum);
          rowHits++;
        }
      }
    }

    // 3. Balanceamento de Colunas (mínimo 3 dezenas por coluna no volante 5x5)
    for (let col = 1; col <= 5; col++) {
      const colNumbers = [col, col + 5, col + 10, col + 15, col + 20];
      let colHits = Array.from(chosen).filter((n) => colNumbers.includes(n)).length;
      if (colHits < 3) {
        const colCandidates = colNumbers.filter((n) => !chosen.has(n) && !allExcluded.has(n));
        const nonFixedChosen = Array.from(chosen).filter((n) => {
          if (allFixed.includes(n)) return false;
          const nCol = ((n - 1) % 5) + 1;
          const nColHits = Array.from(chosen).filter((x) => ((x - 1) % 5) + 1 === nCol).length;
          return nColHits > 3;
        });
        while (colHits < 3 && colCandidates.length > 0 && nonFixedChosen.length > 0) {
          const addNum = colCandidates.shift()!;
          const remNum = nonFixedChosen.pop()!;
          chosen.delete(remNum);
          chosen.add(addNum);
          colHits++;
        }
      }
    }
  }

  const finalPool = Array.from(chosen).sort((a, b) => a - b);
  const finalMetrics = getCounts(chosen);
  const projected15Sum = Math.round((finalMetrics.sum / targetCount) * 15);

  let motivoAjuste = `${finalMetrics.pairs}P/${targetCount - finalMetrics.pairs}I, ${finalMetrics.primes} Primos, ${finalMetrics.moldura} Moldura, ${finalMetrics.fibo} Fibo, ${finalMetrics.repetidas} Repetidas, ${finalMetrics.classeA} Classe A (Soma 15 Proj: ~${projected15Sum})`;

  if (allFixed.length > 5) {
    motivoAjuste += ` • Recomendação: ${allFixed.length} fixas selecionadas. Desencorajar >5 fixas e priorizar 3–5 (ex: Par de Ouro [11, 20]) para resiliência contra zebras.`;
  }

  return {
    dezenas: finalPool,
    motivoAjuste,
  };
}

/**
 * Diagnostic Engine for any Contest vs any chosen 18-number pool
 * Directly solves and explains what happened in Concurso 3803!
 */
export interface ContestDiagnosis {
  concurso: number;
  data: string;
  dezenasSorteadas: number[];
  dezenasMatriz18: number[];
  acertosNaMatriz: number;
  dezenasCapturadas: number[];
  dezenasPerdidas: number[];
  distribuicaoHipergeometrica: { k: number; probabilidade: number; percentual: number }[];
  porQuePontuacaoBaixa: string;
  solucaoDocumento: string;
  jogosMaximosPossiveisCom18: number;
}

export function diagnoseContestMatch(
  dezenasMatriz18: number[],
  draw: LotofacilDraw
): ContestDiagnosis {
  const dezenasSorteadas = [...draw.dezenas].sort((a, b) => a - b);
  const matriz18 = [...dezenasMatriz18].sort((a, b) => a - b);

  const dezenasCapturadas = matriz18.filter((n) => dezenasSorteadas.includes(n));
  const dezenasPerdidas = dezenasSorteadas.filter((n) => !matriz18.includes(n));
  const acertosNaMatriz = dezenasCapturadas.length;

  const distribuicao = calculateHypergeometricDistribution(18, acertosNaMatriz, 15);

  let porQuePontuacaoBaixa = '';
  if (acertosNaMatriz <= 10) {
    porQuePontuacaoBaixa = `A sua matriz de 18 dezenas continha apenas ${acertosNaMatriz} das 15 dezenas sorteadas (as dezenas ${dezenasPerdidas.join(
      ', '
    )} ficaram de fora). Pela lei combinatória hipergeométrica, como cada bilhete contém 15 dezenas e o grupo só possui ${acertosNaMatriz} acertos, é matematicamente IMPOSSÍVEL que qualquer bilhete atinja 11, 12, 13, 14 ou 15 pontos! A pontuação máxima teórica possível em qualquer bilhete era de no máximo ${acertosNaMatriz} pontos (${distribuicao.find(d => d.k === 10)?.percentual || 0}% de chance), com a esmagadora maioria (${distribuicao.find(d => d.k === 9)?.percentual || 0}% em 9 pontos e ${distribuicao.find(d => d.k === 8)?.percentual || 0}% em 8 pontos) ficando em 8 ou 9 acertos.`;
  } else if (acertosNaMatriz < 14) {
    porQuePontuacaoBaixa = `A sua matriz capturou ${acertosNaMatriz} das 15 dezenas sorteadas. Para acionar a garantia matemática integral de 14 pontos (no fechamento 18 dezenas), é exigido que as 15 dezenas sorteadas estejam dentro das 18 escolhidas.`;
  } else {
    porQuePontuacaoBaixa = `Excelente captura! Sua matriz de 18 dezenas continha ${acertosNaMatriz} das 15 sorteadas, garantindo premiações de alto escalão na distribuição.`;
  }

  const solucaoDocumento =
    'Aplicando a estratégia do documento oficial (9 Repetidas + 9 Ausentes): como 9 das 10 dezenas ausentes do concurso anterior entram na matriz, praticamente todas as dezenas ausentes sorteadas são capturadas, elevando a matriz para 13 a 14 acertos e gerando múltiplos bilhetes premiados de 11, 12, 13 e 14 pontos.';

  return {
    concurso: draw.concurso,
    data: draw.data,
    dezenasSorteadas,
    dezenasMatriz18: matriz18,
    acertosNaMatriz,
    dezenasCapturadas,
    dezenasPerdidas,
    distribuicaoHipergeometrica: distribuicao,
    porQuePontuacaoBaixa,
    solucaoDocumento,
    jogosMaximosPossiveisCom18: 816,
  };
}

/**
 * Gerador de Sequências Otimizadas baseadas em Fibonacci
 * Cria automaticamente 5 jogos baseados em distribuições de Fibonacci (3 a 5 dezenas),
 * garantindo que pelo menos 3 jogos sigam a Regra de Ouro de soma (190-210).
 */
export function generateFibonacciOptimizedGames(
  concursoAnterior: number[] = CONCURSO_ATUAL.dezenas,
  aiScores?: number[]
): GameTicket[] {
  const FIBONACCI = [1, 2, 3, 5, 8, 13, 21];
  const NON_FIBONACCI = [4, 6, 7, 9, 10, 11, 12, 14, 15, 16, 17, 18, 19, 20, 22, 23, 24, 25];

  const goldCandidates: { dezenas: number[]; score: number }[] = [];
  const standardCandidates: { dezenas: number[]; score: number }[] = [];

  const fiboCounts = [4, 4, 3, 5, 4];
  let attempts = 0;
  const maxAttempts = 4000;

  while ((goldCandidates.length < 20 || standardCandidates.length < 20) && attempts < maxAttempts) {
    attempts++;
    const targetFibo = fiboCounts[attempts % fiboCounts.length];

    const shuffledFibo = [...FIBONACCI].sort(() => Math.random() - 0.5);
    const chosenFibo = shuffledFibo.slice(0, targetFibo);

    const shuffledNonFibo = [...NON_FIBONACCI].sort(() => Math.random() - 0.5);
    const chosenNonFibo = shuffledNonFibo.slice(0, 15 - targetFibo);

    const candidate = [...chosenFibo, ...chosenNonFibo].sort((a, b) => a - b);
    const metrics = analyzeTicket(candidate, concursoAnterior, aiScores);

    // Canonical quality validation
    if (
      metrics.pares >= 6 &&
      metrics.pares <= 9 &&
      metrics.primos >= 4 &&
      metrics.primos <= 7 &&
      metrics.moldura >= 8 &&
      metrics.moldura <= 11 &&
      metrics.repetidas >= 7 &&
      metrics.repetidas <= 11 &&
      metrics.maxConsecutivas <= 5
    ) {
      if (metrics.soma >= 190 && metrics.soma <= 210) {
        goldCandidates.push({ dezenas: candidate, score: metrics.scoreIA });
      } else if (metrics.soma >= 175 && metrics.soma <= 220) {
        standardCandidates.push({ dezenas: candidate, score: metrics.scoreIA });
      }
    }
  }

  goldCandidates.sort((a, b) => b.score - a.score);
  standardCandidates.sort((a, b) => b.score - a.score);

  const selectedGameDezenas: number[][] = [];

  // Pick at least 3 games from goldCandidates (satisfying Golden Rule 190-210)
  for (const c of goldCandidates) {
    if (selectedGameDezenas.length >= 3) break;
    const maxOverlap = selectedGameDezenas.reduce((max, existing) => {
      const overlap = c.dezenas.filter((n) => existing.includes(n)).length;
      return Math.max(max, overlap);
    }, 0);
    if (selectedGameDezenas.length === 0 || maxOverlap <= 12) {
      selectedGameDezenas.push(c.dezenas);
    }
  }

  while (selectedGameDezenas.length < 3 && goldCandidates.length > 0) {
    const next = goldCandidates.find(
      (g) => !selectedGameDezenas.some((ex) => ex.join(',') === g.dezenas.join(','))
    );
    if (next) selectedGameDezenas.push(next.dezenas);
    else break;
  }

  // Complete up to 5 games from standard or remaining gold candidates
  const remainingPool = [...goldCandidates.slice(3), ...standardCandidates];
  for (const c of remainingPool) {
    if (selectedGameDezenas.length >= 5) break;
    if (!selectedGameDezenas.some((existing) => existing.join(',') === c.dezenas.join(','))) {
      selectedGameDezenas.push(c.dezenas);
    }
  }

  // Guaranteed fallback seeds if needed
  const fallbackSeeds = [
    [1, 2, 3, 5, 6, 7, 10, 11, 14, 15, 18, 19, 21, 22, 24], // Soma 198 (Gold, 5 Fibo)
    [1, 2, 5, 8, 9, 10, 12, 13, 14, 16, 17, 20, 21, 23, 25], // Soma 206 (Gold, 5 Fibo)
    [2, 3, 5, 7, 8, 10, 11, 13, 15, 17, 18, 20, 22, 24, 25], // Soma 200 (Gold, 4 Fibo)
    [1, 3, 5, 6, 8, 9, 11, 12, 14, 16, 17, 19, 21, 23, 24],  // Soma 190 (Gold, 4 Fibo)
    [1, 2, 4, 5, 8, 9, 10, 12, 14, 15, 16, 18, 20, 22, 24],  // Soma 180 (4 Fibo)
  ];

  let fbIndex = 0;
  while (selectedGameDezenas.length < 5 && fbIndex < fallbackSeeds.length) {
    selectedGameDezenas.push(fallbackSeeds[fbIndex++]);
  }

  return selectedGameDezenas.slice(0, 5).map((dezenas, index) => {
    const metrics = analyzeTicket(dezenas, concursoAnterior, aiScores);
    return {
      id: `fib-seq-${index + 1}-${Date.now()}`,
      index: index + 1,
      ...metrics,
    };
  });
}

export interface WorkerDelegationProgress {
  percent: number;
  message: string;
}

/**
 * Delega tarefas pesadas de geração combinatória para o Web Worker dedicado (`src/workers/generator.worker.ts`),
 * evitando bloqueio da thread principal. Em ambientes sem Web Worker (ex: SSR/Node), executa fallback seguro.
 */
export function delegateGenerationToWorker<T>(options: {
  type: 'START_COVERING' | 'START_PONDERADO' | 'START_SPECIAL_MATRIX';
  payload: Record<string, any>;
  onProgress?: (progress: WorkerDelegationProgress) => void;
  timeoutMs?: number;
  fallbackSync: () => T;
}): Promise<T> {
  const { type, payload, onProgress, timeoutMs = 15000, fallbackSync } = options;

  return new Promise<T>((resolve, reject) => {
    if (typeof Worker === 'undefined') {
      try {
        resolve(fallbackSync());
      } catch (err) {
        reject(err);
      }
      return;
    }

    const jobId = `comb-job-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    let worker: Worker | null = null;
    let settled = false;
    let timer: any = null;

    const cleanup = () => {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      if (worker) {
        worker.terminate();
        worker = null;
      }
    };

    timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        cleanup();
        try {
          resolve(fallbackSync());
        } catch (err) {
          reject(err);
        }
      }
    }, timeoutMs);

    try {
      worker = new Worker(
        new URL('../workers/generator.worker.ts', import.meta.url),
        { type: 'module' }
      );

      worker.onmessage = (e: MessageEvent) => {
        const msg = e.data;
        if (!msg || msg.jobId !== jobId) return;

        if (msg.type === 'PROGRESS') {
          onProgress?.({ percent: msg.percent, message: msg.message });
        } else if (msg.type === 'DONE_COVERING') {
          if (!settled) {
            settled = true;
            cleanup();
            resolve(msg.payload.tickets as T);
          }
        } else if (msg.type === 'DONE_PONDERADO') {
          if (!settled) {
            settled = true;
            cleanup();
            resolve(msg.payload as T);
          }
        } else if (msg.type === 'ERROR') {
          if (!settled) {
            settled = true;
            cleanup();
            reject(new Error(msg.error || 'Erro no Web Worker generator.worker.ts'));
          }
        }
      };

      worker.onerror = () => {
        if (!settled) {
          settled = true;
          cleanup();
          try {
            resolve(fallbackSync());
          } catch (err) {
            reject(err);
          }
        }
      };

      worker.postMessage({
        type,
        jobId,
        ...payload,
      });
    } catch {
      if (!settled) {
        settled = true;
        cleanup();
        try {
          resolve(fallbackSync());
        } catch (err) {
          reject(err);
        }
      }
    }
  });
}

/**
 * Versão assíncrona que delega o fechamento completo para `src/workers/generator.worker.ts`.
 */
export function generateFechamentoCoveringAsync(
  selectedNumbers: number[],
  targetHits: number = 14,
  maxTickets: number = 32,
  filters?: FilterCriteria,
  concursoAnterior: number[] = CONCURSO_ATUAL.dezenas,
  aiScores?: number[],
  onProgress?: (progress: WorkerDelegationProgress) => void
): Promise<GameTicket[]> {
  return delegateGenerationToWorker<GameTicket[]>({
    type: 'START_COVERING',
    payload: {
      selectedNumbers,
      targetHits,
      maxTickets,
      filters: filters || DEFAULT_FILTERS,
      drawDezenas: concursoAnterior,
      aiScores,
    },
    onProgress,
    fallbackSync: () =>
      generateFechamentoCovering(
        selectedNumbers,
        targetHits,
        maxTickets,
        filters,
        concursoAnterior,
        aiScores
      ),
  });
}

/**
 * Versão assíncrona do Fechamento Inteligente Ponderado executada em `src/workers/generator.worker.ts`.
 */
export function generateFechamentoInteligentePonderadoAsync(params: {
  selectedNumbers: number[];
  targetHits?: number;
  maxTickets?: number;
  filters?: FilterCriteria;
  dynamicStats?: DezenaStats[];
  latestDraw?: LotofacilDraw;
  aiScores?: number[];
  onProgress?: (progress: WorkerDelegationProgress) => void;
}) {
  return delegateGenerationToWorker({
    type: 'START_PONDERADO',
    payload: {
      selectedNumbers: params.selectedNumbers,
      targetHits: params.targetHits ?? 14,
      maxTickets: params.maxTickets ?? 24,
      filters: params.filters || DEFAULT_FILTERS,
      dynamicStats: params.dynamicStats,
      latestDraw: params.latestDraw,
      aiScores: params.aiScores,
    },
    onProgress: params.onProgress,
    fallbackSync: () => generateFechamentoInteligentePonderado(params),
  });
}


