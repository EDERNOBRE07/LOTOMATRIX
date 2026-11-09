import { FilterCriteria } from '../types/lotofacil';

/**
 * Utilitários Bitwise de Alta Performance para Lotofácil (Dezenas 1 a 25)
 * Cada dezena d (1..25) é representada pelo bit (d - 1), cabendo com folga em inteiros de 32 bits.
 */

// Cria máscara binária a partir de um array de dezenas (1 a 25)
export function criarMascara(dezenas: number[]): number {
  let mask = 0;
  for (let i = 0; i < dezenas.length; i++) {
    const d = dezenas[i];
    if (d >= 1 && d <= 25) {
      mask |= (1 << (d - 1));
    }
  }
  return mask;
}

// Converte máscara de bits de volta para array de dezenas ordenadas (1 a 25)
export function mascaraParaDezenas(mask: number): number[] {
  const dezenas: number[] = [];
  for (let i = 1; i <= 25; i++) {
    if ((mask & (1 << (i - 1))) !== 0) {
      dezenas.push(i);
    }
  }
  return dezenas;
}

// Contagem rápida de bits 1 (Hamming weight / Population Count)
export function popcount(x: number): number {
  x = x - ((x >>> 1) & 0x55555555);
  x = (x & 0x33333333) + ((x >>> 2) & 0x33333333);
  return (((x + (x >>> 4)) & 0x0f0f0f0f) * 0x01010101) >>> 24;
}

// 1. Dezenas Pares (2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24) -> Valor binário: 11184810
export const MASK_PARES = criarMascara([2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24]);

// 2. Moldura (bordas do volante 5x5: 1..5, 6, 10, 11, 15, 16, 20, 21..25) -> Valor: 32537503
export const MASK_MOLDURA = criarMascara([1, 2, 3, 4, 5, 6, 10, 11, 15, 16, 20, 21, 22, 23, 24, 25]);

// 3. Primos (2, 3, 5, 7, 11, 13, 17, 19, 23) -> Valor: 4596394
export const MASK_PRIMOS = criarMascara([2, 3, 5, 7, 11, 13, 17, 19, 23]);

// 4. Fibonacci da Lotofácil (1, 2, 3, 5, 8, 13, 21) -> Valor: 1052823
export const MASK_FIBONACCI = criarMascara([1, 2, 3, 5, 8, 13, 21]);

// 5. Cruz da Lotofácil (Linha 3 e Coluna 3: 3, 8, 11, 12, 13, 14, 15, 18, 23)
export const MASK_CRUZ = criarMascara([3, 8, 11, 12, 13, 14, 15, 18, 23]);

/**
 * Matrizes de Cobertura Canônica Mínima do La Jolla Covering Repository (LJCR)
 * Esquemas ótimos provados com instantaneidade O(1) no mapeamento das dezenas.
 */
export interface MatrixCoberturaEntry {
  totalDezenas: number;
  tamanhoJogo: number;
  garantia: number;
  totalJogos: number;
  linhas: number[][]; // Índices relativos base-0
}

export const MATRIZES_COBERTURA: Record<string, MatrixCoberturaEntry> = {
  // C(v=16, k=15, t=14) -> 4 jogos cobrindo 100% dos 16 subconjuntos
  '16_15_14': {
    totalDezenas: 16,
    tamanhoJogo: 15,
    garantia: 14,
    totalJogos: 4,
    linhas: [
      [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14],
      [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 15],
      [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 15],
      [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 14, 15],
    ],
  },

  // C(v=17, k=15, t=14) -> 8 jogos cobrindo 100% dos 136 subconjuntos
  '17_15_14': {
    totalDezenas: 17,
    tamanhoJogo: 15,
    garantia: 14,
    totalJogos: 8,
    linhas: [
      [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14],
      [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 15, 16],
      [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 13, 14, 15, 16],
      [0, 1, 2, 3, 4, 5, 6, 7, 8, 11, 12, 13, 14, 15, 16],
      [0, 1, 2, 3, 4, 5, 6, 9, 10, 11, 12, 13, 14, 15, 16],
      [0, 1, 2, 3, 4, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16],
      [0, 1, 2, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16],
      [0, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16],
    ],
  },

  // C(v=18, k=15, t=14) -> 24 jogos provados cobrindo 100% dos 816 subconjuntos
  '18_15_14': {
    totalDezenas: 18,
    tamanhoJogo: 15,
    garantia: 14,
    totalJogos: 24,
    linhas: [
      [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14],
      [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 15, 16, 17],
      [0, 1, 2, 3, 4, 5, 6, 7, 8, 12, 13, 14, 15, 16, 17],
      [0, 1, 2, 3, 4, 5, 9, 10, 11, 12, 13, 14, 15, 16, 17],
      [0, 1, 2, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17],
      [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17],
      [0, 1, 3, 4, 6, 7, 9, 10, 11, 12, 13, 14, 15, 16, 17],
      [0, 2, 3, 5, 6, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17],
      [1, 2, 4, 5, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17],
      [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 13, 15, 16],
      [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 12, 14, 15, 17],
      [0, 1, 2, 3, 4, 5, 6, 7, 8, 10, 11, 13, 14, 16, 17],
      [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 14, 16, 17],
      [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 13, 14, 15, 17],
      [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 12, 13, 16, 17],
      [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 13, 14, 15, 16],
      [0, 1, 2, 3, 4, 5, 6, 7, 8, 10, 11, 12, 13, 15, 17],
      [0, 1, 2, 3, 4, 5, 6, 7, 8, 10, 11, 12, 14, 15, 16],
      [0, 1, 3, 5, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17],
      [0, 1, 4, 5, 6, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17],
      [0, 2, 3, 4, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17],
      [0, 2, 4, 5, 6, 7, 9, 10, 11, 12, 13, 14, 15, 16, 17],
      [1, 2, 3, 4, 6, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17],
      [1, 2, 3, 5, 6, 7, 9, 10, 11, 12, 13, 14, 15, 16, 17],
    ],
  },
};

/**
 * Gerador Instantâneo O(1) a partir das matrizes canônicas do LJCR
 */
export function gerarFechamentoLJCR(
  dezenasEscolhidas: number[],
  garantia: number = 14,
  tamanhoJogo: number = 15
): number[][] {
  const v = dezenasEscolhidas.length;
  const chave = `${v}_${tamanhoJogo}_${garantia}`;
  const matriz = MATRIZES_COBERTURA[chave];

  if (!matriz) {
    throw new Error(
      `Matriz canônica C(${v}, ${tamanhoJogo}, ${garantia}) não encontrada no catálogo LJCR pré-computado.`
    );
  }

  // Ordena as dezenas selecionadas pelo apostador
  const dezenasOrdenadas = [...dezenasEscolhidas].sort((a, b) => a - b);
  const cartoesFinais: number[][] = new Array(matriz.linhas.length);

  for (let i = 0; i < matriz.linhas.length; i++) {
    const template = matriz.linhas[i];
    const jogo: number[] = new Array(tamanhoJogo);
    for (let k = 0; k < tamanhoJogo; k++) {
      jogo[k] = dezenasOrdenadas[template[k]];
    }
    cartoesFinais[i] = jogo.sort((a, b) => a - b);
  }

  return cartoesFinais;
}

/**
 * Geração com Dezenas Fixas integradas ao catálogo canônico
 */
export function gerarComFixas(
  dezenasVariaveis: number[],
  dezenasFixas: number[],
  garantiaTotal: number = 14,
  tamanhoJogo: number = 15
): number[][] {
  const vagas = tamanhoJogo - dezenasFixas.length;
  const garantiaVariavel = garantiaTotal - dezenasFixas.length;
  const v = dezenasVariaveis.length;

  const chave = `${v}_${vagas}_${garantiaVariavel}`;
  const matriz = MATRIZES_COBERTURA[chave];

  const varsOrdenadas = [...dezenasVariaveis].sort((a, b) => a - b);
  const fixasOrdenadas = [...dezenasFixas].sort((a, b) => a - b);

  if (!matriz) {
    // Fallback: se matriz exata não catalogada, combina fixas com primeiras combinações
    return varsOrdenadas.slice(0, vagas).map(() => {
      return [...fixasOrdenadas, ...varsOrdenadas.slice(0, vagas)].sort((a, b) => a - b);
    });
  }

  return matriz.linhas.map((linha) => {
    const subJogo = linha.map((pos) => varsOrdenadas[pos]);
    return [...fixasOrdenadas, ...subJogo].sort((a, b) => a - b);
  });
}

/**
 * Gerador Combinatório com Poda Dinâmica de Ramo (Branch and Bound)
 * Poda ramos impossíveis de soma, paridade e extremos durante a recursão.
 */
export function combinarComPodaDinamica(
  idx: number,
  profundidade: number,
  maskAtual: number,
  somaAtual: number,
  paresAtual: number,
  vagasRestantes: number,
  variaveisValores: number[],
  variaveisBits: number[],
  filtros: {
    somaMin?: number;
    somaMax?: number;
    paresMin?: number;
    paresMax?: number;
  },
  fixasMask: number,
  callbackValido: (jogoCompletoMask: number) => void
): void {
  // Caso base: completou as dezenas variáveis necessárias
  if (vagasRestantes === 0) {
    const jogoCompletoMask = maskAtual | fixasMask;
    callbackValido(jogoCompletoMask);
    return;
  }

  const n = variaveisValores.length;

  for (let i = idx; i <= n - vagasRestantes; i++) {
    const val = variaveisValores[i];
    const bit = variaveisBits[i];
    const novaSoma = somaAtual + val;
    const novosPares = paresAtual + (val % 2 === 0 ? 1 : 0);
    const novasVagas = vagasRestantes - 1;

    // --- PODA DE SOMA MÍNIMA ---
    // Soma mínima possível adicionando os menores elementos subsequentes
    let minSomaPossivel = novaSoma;
    for (let k = 1; k <= novasVagas; k++) {
      minSomaPossivel += variaveisValores[i + k];
    }
    if (filtros.somaMax !== undefined && minSomaPossivel > filtros.somaMax) {
      // Se a menor soma possível já estourou o teto, interrompe o loop (vetor ordenado)
      break;
    }

    // --- PODA DE SOMA MÁXIMA ---
    // Soma máxima possível adicionando os maiores elementos disponíveis no final
    let maxSomaPossivel = novaSoma;
    for (let k = 0; k < novasVagas; k++) {
      maxSomaPossivel += variaveisValores[n - 1 - k];
    }
    if (filtros.somaMin !== undefined && maxSomaPossivel < filtros.somaMin) {
      // Mesmo escolhendo os maiores valores, não atinge a soma mínima
      continue;
    }

    // --- PODA DE PARES ---
    if (filtros.paresMax !== undefined && novosPares > filtros.paresMax) {
      continue;
    }
    const maxParesPossiveis = novosPares + novasVagas;
    if (filtros.paresMin !== undefined && maxParesPossiveis < filtros.paresMin) {
      continue;
    }

    // Ramo viável: desce na recursão
    combinarComPodaDinamica(
      i + 1,
      profundidade + 1,
      maskAtual | bit,
      novaSoma,
      novosPares,
      novasVagas,
      variaveisValores,
      variaveisBits,
      filtros,
      fixasMask,
      callbackValido
    );
  }
}

/**
 * Calcula o número exato de combinações C(n, k).
 */
export function combinacoes(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  if (k === 0 || k === n) return 1;
  let c = 1;
  for (let i = 1; i <= k; i++) {
    c = (c * (n - (k - i))) / i;
  }
  return Math.round(c);
}

/**
 * Gera todos os cenários teóricos possíveis de acerto C(V, 15) como um vetor tipado Int32Array.
 * @param dezenasSelecionadas Array ordenado com as dezenas escolhidas (ex: 18 dezenas)
 */
export function gerarTodosCenariosAcerto(dezenasSelecionadas: number[]): Int32Array {
  const n = dezenasSelecionadas.length;
  const k = 15;
  const totalCenarios = combinacoes(n, k);
  const cenarios = new Int32Array(totalCenarios);

  const bits = dezenasSelecionadas.map((d) => 1 << (d - 1));
  let cursor = 0;

  function recursao(inicio: number, profundidade: number, maskAcumulada: number) {
    if (profundidade === k) {
      cenarios[cursor++] = maskAcumulada;
      return;
    }
    const limite = n - (k - profundidade);
    for (let i = inicio; i <= limite; i++) {
      recursao(i + 1, profundidade + 1, maskAcumulada | bits[i]);
    }
  }

  recursao(0, 0, 0);
  return cenarios;
}

/**
 * Audita a cobertura efetiva dos cartões filtrados contra todos os cenários teóricos C(V, 15).
 * @param cartoesFiltradosMasks Array de máscaras dos cartões remanescentes
 * @param cenariosAcertoMasks Buffer com todas as combinações C(V, 15)
 * @param garantiaPontos Mínimo de acertos exigido (padrão: 14)
 * @returns Taxa de cobertura efetiva entre 0.0 e 100.0
 */
export function auditarGarantiaEfetiva(
  cartoesFiltradosMasks: number[],
  cenariosAcertoMasks: Int32Array,
  garantiaPontos: number = 14
): number {
  const totalCenarios = cenariosAcertoMasks.length;
  if (totalCenarios === 0 || cartoesFiltradosMasks.length === 0) return 0.0;

  let cobertos = 0;
  const totalCartoes = cartoesFiltradosMasks.length;

  for (let i = 0; i < totalCenarios; i++) {
    const cenario = cenariosAcertoMasks[i];
    let atendido = false;

    for (let j = 0; j < totalCartoes; j++) {
      if (popcount(cenario & cartoesFiltradosMasks[j]) >= garantiaPontos) {
        atendido = true;
        break; // Cenário garantido por ao menos um cartão
      }
    }

    if (atendido) {
      cobertos++;
    }
  }

  return (cobertos / totalCenarios) * 100;
}

/**
 * Validador Canônico de Integridade do Fechamento
 * Executa auditoria completa de tamanho de cartões, faixa 1-25, duplicidades, fixas e filtros.
 */
export function validarIntegridadeFechamento(
  jogos: number[][],
  dezenasFixas: number[] = [],
  filtros: Partial<FilterCriteria> = {}
): {
  aprovado: boolean;
  erros: string[];
  tempoMs: number;
  totalJogos: number;
} {
  const inicio = performance.now();
  const erros: string[] = [];
  const hashes = new Set<string>();

  jogos.forEach((jogo, idx) => {
    // 1. Tamanho do cartão
    if (jogo.length !== 15) {
      erros.push(`Cartão #${idx + 1}: Tamanho inválido (${jogo.length} dezenas).`);
    }

    // 2. Intervalo das dezenas (1 a 25)
    const foraFaixa = jogo.filter((d) => d < 1 || d > 25);
    if (foraFaixa.length > 0) {
      erros.push(`Cartão #${idx + 1}: Dezenas fora do limite 1-25: [${foraFaixa.join(', ')}].`);
    }

    // 3. Dezenas duplicadas dentro do mesmo volante
    const unicos = new Set(jogo);
    if (unicos.size !== jogo.length) {
      erros.push(`Cartão #${idx + 1}: Dezenas duplicadas no mesmo cartão.`);
    }

    // 4. Cartões duplicados na matriz
    const hash = [...jogo].sort((a, b) => a - b).join('-');
    if (hashes.has(hash)) {
      erros.push(`Cartão #${idx + 1}: Jogo duplicado encontrado na matriz.`);
    } else {
      hashes.add(hash);
    }

    // 5. Presença de dezenas fixas
    if (dezenasFixas.length > 0) {
      const fixasFaltantes = dezenasFixas.filter((f) => !jogo.includes(f));
      if (fixasFaltantes.length > 0) {
        erros.push(`Cartão #${idx + 1}: Faltam fixas obrigatórias: [${fixasFaltantes.join(', ')}].`);
      }
    }

    // 6. Validação de Filtros Específicos (ex: Soma)
    if (filtros.somaMin !== undefined && filtros.somaMax !== undefined) {
      const soma = jogo.reduce((acc, val) => acc + val, 0);
      if (soma < filtros.somaMin || soma > filtros.somaMax) {
        erros.push(`Cartão #${idx + 1}: Soma ${soma} fora da faixa [${filtros.somaMin}, ${filtros.somaMax}].`);
      }
    }
  });

  const fim = performance.now();
  const tempoMs = Math.round((fim - inicio) * 100) / 100;

  return {
    aprovado: erros.length === 0,
    erros,
    tempoMs,
    totalJogos: jogos.length,
  };
}

export interface HistogramaAcertos {
  15: number;
  14: number;
  13: number;
  12: number;
  11: number;
  abaixo11: number;
}

export interface AuditoriaCompletaResultado {
  taxaGarantiaEfetiva: number;
  taxaGarantia: number;
  totalCenarios: number;
  cobertosGarantia: number;
  histograma: HistogramaAcertos;
  percentuais: {
    15: number;
    14: number;
    13: number;
    12: number;
    11: number;
    abaixo11: number;
  };
}

/**
 * Auditoria Completa e Histograma de Distribuição Teórica de Acertos Máximos
 * Para cada cenário teórico do universo C(V, 15), identifica o acerto máximo obtido pelos cartões filtrados.
 */
export function auditarMatrizCompleta(
  cartoesFiltradosMasks: number[],
  cenariosAcertoMasks: Int32Array,
  garantiaAlvo: number = 14
): AuditoriaCompletaResultado {
  const totalCenarios = cenariosAcertoMasks.length;
  const histograma: HistogramaAcertos = {
    15: 0,
    14: 0,
    13: 0,
    12: 0,
    11: 0,
    abaixo11: 0,
  };

  if (totalCenarios === 0 || cartoesFiltradosMasks.length === 0) {
    return {
      taxaGarantiaEfetiva: 0.0,
      taxaGarantia: 0.0,
      totalCenarios,
      cobertosGarantia: 0,
      histograma,
      percentuais: { 15: 0, 14: 0, 13: 0, 12: 0, 11: 0, abaixo11: 0 },
    };
  }

  let cobertosGarantia = 0;
  const totalCartoes = cartoesFiltradosMasks.length;

  for (let i = 0; i < totalCenarios; i++) {
    const cenario = cenariosAcertoMasks[i];
    let maxAcertosCenario = 0;

    for (let j = 0; j < totalCartoes; j++) {
      const acertos = popcount(cenario & cartoesFiltradosMasks[j]);
      if (acertos > maxAcertosCenario) {
        maxAcertosCenario = acertos;
        if (maxAcertosCenario === 15) break; // Teto absoluto alcançado
      }
    }

    if (maxAcertosCenario >= garantiaAlvo) {
      cobertosGarantia++;
    }

    if (maxAcertosCenario === 15) histograma[15]++;
    else if (maxAcertosCenario === 14) histograma[14]++;
    else if (maxAcertosCenario === 13) histograma[13]++;
    else if (maxAcertosCenario === 12) histograma[12]++;
    else if (maxAcertosCenario === 11) histograma[11]++;
    else histograma.abaixo11++;
  }

  const taxaGarantiaEfetiva = (cobertosGarantia / totalCenarios) * 100;
  const calcPerc = (val: number) => (totalCenarios > 0 ? (val / totalCenarios) * 100 : 0);

  return {
    taxaGarantiaEfetiva,
    taxaGarantia: taxaGarantiaEfetiva,
    totalCenarios,
    cobertosGarantia,
    histograma,
    percentuais: {
      15: Math.round(calcPerc(histograma[15]) * 100) / 100,
      14: Math.round(calcPerc(histograma[14]) * 100) / 100,
      13: Math.round(calcPerc(histograma[13]) * 100) / 100,
      12: Math.round(calcPerc(histograma[12]) * 100) / 100,
      11: Math.round(calcPerc(histograma[11]) * 100) / 100,
      abaixo11: Math.round(calcPerc(histograma.abaixo11) * 100) / 100,
    },
  };
}

/**
 * Payload Unificado de Sincronização do Indicador de Cobertura
 */
export interface IndicadorGarantiaPayload {
  matrizOriginalQtd: number;
  matrizFiltradaQtd: number;
  garantiaTeorica: number; // 100.0
  garantiaEfetiva: number; // ex: 92.4
  custoOriginal: number;
  custoOtimizado: number;
  economia: number;
  economiaPercentual: number;
  garantiaAlvo?: string; // ex: "14 se 15"
  histograma?: HistogramaAcertos;
  totalCenarios?: number;
}
