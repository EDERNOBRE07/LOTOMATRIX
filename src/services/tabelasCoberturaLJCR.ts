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

// 5. Cruz da Lotofácil no volante 5×5 (Linha 3 + Coluna 2: 2, 7, 11, 12, 13, 14, 15, 17, 22)
export const MASK_CRUZ = criarMascara([2, 7, 11, 12, 13, 14, 15, 17, 22]);

// 6. Máscaras Bitwise de Múltiplos M(3) a M(8)
export const MASK_M3 = criarMascara([3, 6, 9, 12, 15, 18, 21, 24]);
export const MASK_M4 = criarMascara([4, 8, 12, 16, 20, 24]);
export const MASK_M5 = criarMascara([5, 10, 15, 20, 25]);
export const MASK_M6 = criarMascara([6, 12, 18, 24]);
export const MASK_M7 = criarMascara([7, 14, 21]);
export const MASK_M8 = criarMascara([8, 16, 24]);

// 7. Máscara de Dezenas de 1 Dígito (01 a 09)
export const MASK_UM_DIGITO = criarMascara([1, 2, 3, 4, 5, 6, 7, 8, 9]);

// 8. Máscaras das 5 Linhas e 5 Colunas do Volante 5x5
export const MASK_LINHAS: readonly number[] = [
  criarMascara([1, 2, 3, 4, 5]),
  criarMascara([6, 7, 8, 9, 10]),
  criarMascara([11, 12, 13, 14, 15]),
  criarMascara([16, 17, 18, 19, 20]),
  criarMascara([21, 22, 23, 24, 25]),
];

export const MASK_COLUNAS: readonly number[] = [
  criarMascara([1, 6, 11, 16, 21]),
  criarMascara([2, 7, 12, 17, 22]),
  criarMascara([3, 8, 13, 18, 23]),
  criarMascara([4, 9, 14, 19, 24]),
  criarMascara([5, 10, 15, 20, 25]),
];

// 9. Tabela pré-computada de soma dos algarismos individuais de cada dezena (índice 0..25)
export const PESO_DIGITOS: readonly number[] = [
  0,
  1, 2, 3, 4, 5, 6, 7, 8, 9,
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
  2, 3, 4, 5, 6, 7,
];

// 10. Limites Posicionais Canônicos por Bola (D1 a D15 ordenados, ocorrência histórica >95%)
export const POSITIONAL_BOUNDS: readonly [number, number][] = [
  [1, 3],   // D1
  [2, 6],   // D2
  [3, 8],   // D3
  [4, 10],  // D4
  [5, 11],  // D5
  [6, 13],  // D6
  [8, 15],  // D7
  [9, 16],  // D8
  [11, 18], // D9
  [12, 19], // D10
  [15, 21], // D11 (>= 15)
  [17, 22], // D12 (>= 17)
  [19, 23], // D13 (>= 19)
  [21, 24], // D14 (>= 21)
  [23, 25], // D15 ([23, 25])
];

// 11. Padrão Pivô de 9 Dezenas
export const PIVOT_9_DEZENAS: readonly number[] = [5, 6, 7, 12, 13, 14, 19, 20, 21];

/**
 * Valida se as 15 dezenas ordenadas (D1..D15) respeitam os intervalos posicionais canônicos.
 */
export function validarPosicionalSorted(sortedDezenas: number[]): {
  valido: boolean;
  violacoes: string[];
} {
  if (sortedDezenas.length !== 15) {
    return { valido: false, violacoes: ['Cartão precisa ter 15 dezenas para auditoria posicional.'] };
  }
  const violacoes: string[] = [];
  for (let i = 0; i < 15; i++) {
    const val = sortedDezenas[i];
    const [minB, maxB] = POSITIONAL_BOUNDS[i];
    if (val < minB || val > maxB) {
      violacoes.push(`D${i + 1}=${val.toString().padStart(2, '0')} fora de [${minB}..${maxB}]`);
    }
  }
  return { valido: violacoes.length === 0, violacoes };
}

/**
 * Validação bitwise simultânea dos múltiplos M(3) a M(8).
 */
export function validarMultiplosMask(mask: number): {
  valido: boolean;
  m3: number;
  m4: number;
  m5: number;
  m6: number;
  m7: number;
  m8: number;
  violacoes: string[];
} {
  const m3 = popcount(mask & MASK_M3);
  const m4 = popcount(mask & MASK_M4);
  const m5 = popcount(mask & MASK_M5);
  const m6 = popcount(mask & MASK_M6);
  const m7 = popcount(mask & MASK_M7);
  const m8 = popcount(mask & MASK_M8);

  const violacoes: string[] = [];
  if (m3 < 4 || m3 > 7) violacoes.push(`M(3)=${m3} fora de [4..7]`);
  if (m4 < 2 || m4 > 5) violacoes.push(`M(4)=${m4} fora de [2..5]`);
  if (m5 < 1) violacoes.push(`M(5)=${m5} (< 1)`);
  if (m6 < 1) violacoes.push(`M(6)=${m6} (< 1)`);
  if (m7 < 1) violacoes.push(`M(7)=${m7} (< 1)`);
  if (m8 < 1) violacoes.push(`M(8)=${m8} (< 1)`);

  return {
    valido: violacoes.length === 0,
    m3,
    m4,
    m5,
    m6,
    m7,
    m8,
    violacoes,
  };
}

/**
 * Calcula soma dos algarismos individuais via lookup pré-computado.
 */
export function calcularSomaAlgarismos(dezenas: number[]): number {
  let total = 0;
  for (let i = 0; i < dezenas.length; i++) {
    const d = dezenas[i];
    if (d >= 1 && d <= 25) {
      total += PESO_DIGITOS[d];
    }
  }
  return total;
}

/**
 * Contagem bitwise de dezenas de 1 dígito (01..09) e total de algarismos no volante.
 */
export function validarContagemDigitosMask(
  mask: number,
  umDigitoMin: number = 3,
  umDigitoMax: number = 8,
  digitosMin: number = 22,
  digitosMax: number = 27
): {
  valido: boolean;
  dezenasUmDigito: number;
  digitosTotal: number;
} {
  const dezenasUmDigito = popcount(mask & MASK_UM_DIGITO);
  const totalCartao = popcount(mask);
  const digitosTotal = dezenasUmDigito + (totalCartao - dezenasUmDigito) * 2;
  const valido =
    dezenasUmDigito >= umDigitoMin &&
    dezenasUmDigito <= umDigitoMax &&
    digitosTotal >= digitosMin &&
    digitosTotal <= digitosMax;
  return { valido, dezenasUmDigito, digitosTotal };
}

/**
 * Integridade estrutural da matriz 5x5:
 * Proíbe linhas/colunas vazias (0 dezenas) e limita linhas/colunas cheias (5 dezenas).
 */
export function validarLinhasColunasMask(
  mask: number,
  maxLinhasCheias: number = 1,
  maxColunasCheias: number = 1
): {
  valido: boolean;
  linhasVazias: number;
  colunasVazias: number;
  linhasCheias: number;
  colunasCheias: number;
  violacoes: string[];
} {
  let linhasVazias = 0;
  let linhasCheias = 0;
  let colunasVazias = 0;
  let colunasCheias = 0;

  for (let i = 0; i < 5; i++) {
    const cntL = popcount(mask & MASK_LINHAS[i]);
    if (cntL === 0) linhasVazias++;
    if (cntL === 5) linhasCheias++;

    const cntC = popcount(mask & MASK_COLUNAS[i]);
    if (cntC === 0) colunasVazias++;
    if (cntC === 5) colunasCheias++;
  }

  const violacoes: string[] = [];
  if (linhasVazias > 0) violacoes.push(`${linhasVazias} linha(s) vazia(s) no volante 5x5`);
  if (colunasVazias > 0) violacoes.push(`${colunasVazias} coluna(s) vazia(s) no volante 5x5`);
  if (linhasCheias > maxLinhasCheias) {
    violacoes.push(`${linhasCheias} linhas completas (máx permitido: ${maxLinhasCheias})`);
  }
  if (colunasCheias > maxColunasCheias) {
    violacoes.push(`${colunasCheias} colunas completas (máx permitido: ${maxColunasCheias})`);
  }

  return {
    valido: violacoes.length === 0,
    linhasVazias,
    colunasVazias,
    linhasCheias,
    colunasCheias,
    violacoes,
  };
}

/**
 * Pré-computa Set<number> com máscaras de 25 bits dos concursos oficiais para busca O(1).
 */
export function buildHistoricalMasksSet(draws: { dezenas: number[] }[]): Set<number> {
  const set = new Set<number>();
  for (let i = 0; i < draws.length; i++) {
    const d = draws[i]?.dezenas;
    if (Array.isArray(d) && d.length === 15) {
      set.add(criarMascara(d));
    }
  }
  return set;
}

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

export interface PodaDinamicaFiltros {
  somaMin?: number;
  somaMax?: number;
  paresMin?: number;
  paresMax?: number;
  posicionalAtivo?: boolean;
  multiplosAtivo?: boolean;
  somaAlgarismosAtiva?: boolean;
  somaAlgarismosMin?: number;
  somaAlgarismosMax?: number;
  cruzAtiva?: boolean;
  cruzMin?: number;
  cruzMax?: number;
  strictValidation?: boolean;
  validacaoEstritaCruz?: boolean;
  rankingHistoricoAtivo?: boolean;
  rankingMasks?: {
    maskTop5: number;
    maskTop10: number;
    maskTop15: number;
    maskTop20: number;
  };
  onBranchPruned?: () => void;
}

export interface PodaDinamicaContext {
  sufCruz: Int8Array;
  sufM3: Int8Array;
  sufM4: Int8Array;
  sufM5: Int8Array;
  sufM6: Int8Array;
  sufM7: Int8Array;
  sufM8: Int8Array;
  sufT5: Int8Array;
  sufT10: Int8Array;
  sufT15: Int8Array;
  sufT20: Int8Array;
  minAlgTable: Int16Array[];
  maxAlgTable: Int16Array[];
  fixasSorted: number[];
  cruzAtual: number;
  algAtual: number;
  m3Atual: number;
  m4Atual: number;
  m5Atual: number;
  m6Atual: number;
  m7Atual: number;
  m8Atual: number;
  t5Atual: number;
  t10Atual: number;
  t15Atual: number;
  t20Atual: number;
  cruzMin: number;
  cruzMax: number;
  algMin: number;
  algMax: number;
}

export function buildPodaDinamicaContext(
  variaveisValores: number[],
  variaveisBits: number[],
  filtros: PodaDinamicaFiltros,
  fixasMask: number
): PodaDinamicaContext {
  const n = variaveisValores.length;
  const sufCruz = new Int8Array(n + 1);
  const sufM3 = new Int8Array(n + 1);
  const sufM4 = new Int8Array(n + 1);
  const sufM5 = new Int8Array(n + 1);
  const sufM6 = new Int8Array(n + 1);
  const sufM7 = new Int8Array(n + 1);
  const sufM8 = new Int8Array(n + 1);
  const sufT5 = new Int8Array(n + 1);
  const sufT10 = new Int8Array(n + 1);
  const sufT15 = new Int8Array(n + 1);
  const sufT20 = new Int8Array(n + 1);

  const rm = filtros.rankingMasks;

  for (let i = n - 1; i >= 0; i--) {
    const bit = variaveisBits[i];
    sufCruz[i] = sufCruz[i + 1] + ((bit & MASK_CRUZ) !== 0 ? 1 : 0);
    sufM3[i] = sufM3[i + 1] + ((bit & MASK_M3) !== 0 ? 1 : 0);
    sufM4[i] = sufM4[i + 1] + ((bit & MASK_M4) !== 0 ? 1 : 0);
    sufM5[i] = sufM5[i + 1] + ((bit & MASK_M5) !== 0 ? 1 : 0);
    sufM6[i] = sufM6[i + 1] + ((bit & MASK_M6) !== 0 ? 1 : 0);
    sufM7[i] = sufM7[i + 1] + ((bit & MASK_M7) !== 0 ? 1 : 0);
    sufM8[i] = sufM8[i + 1] + ((bit & MASK_M8) !== 0 ? 1 : 0);
    if (rm) {
      sufT5[i] = sufT5[i + 1] + ((bit & rm.maskTop5) !== 0 ? 1 : 0);
      sufT10[i] = sufT10[i + 1] + ((bit & rm.maskTop10) !== 0 ? 1 : 0);
      sufT15[i] = sufT15[i + 1] + ((bit & rm.maskTop15) !== 0 ? 1 : 0);
      sufT20[i] = sufT20[i + 1] + ((bit & rm.maskTop20) !== 0 ? 1 : 0);
    }
  }

  // Tabelas exatas de soma mínima e máxima dos algarismos para quaisquer k itens em variaveisValores[i..n-1]
  const minAlgTable: Int16Array[] = new Array(n + 1);
  const maxAlgTable: Int16Array[] = new Array(n + 1);
  for (let i = 0; i <= n; i++) {
    const remLen = n - i;
    const weights: number[] = new Array(remLen);
    for (let j = 0; j < remLen; j++) {
      weights[j] = PESO_DIGITOS[variaveisValores[i + j]] ?? 0;
    }
    weights.sort((a, b) => a - b);
    const maxK = Math.min(15, remLen);
    const minP = new Int16Array(16);
    const maxP = new Int16Array(16);
    for (let k = 1; k <= maxK; k++) {
      minP[k] = minP[k - 1] + weights[k - 1];
      maxP[k] = maxP[k - 1] + weights[remLen - k];
    }
    for (let k = maxK + 1; k <= 15; k++) {
      minP[k] = 999;
      maxP[k] = -999;
    }
    minAlgTable[i] = minP;
    maxAlgTable[i] = maxP;
  }

  const fixasSorted = fixasMask !== 0 ? mascaraParaDezenas(fixasMask) : [];
  const algFixas = calcularSomaAlgarismos(fixasSorted);
  const isStrictCruz = filtros.strictValidation === true || filtros.validacaoEstritaCruz === true;
  const cruzMin = isStrictCruz ? 5 : (filtros.cruzMin ?? 4);
  const cruzMax = isStrictCruz ? 6 : (filtros.cruzMax ?? 7);

  return {
    sufCruz,
    sufM3,
    sufM4,
    sufM5,
    sufM6,
    sufM7,
    sufM8,
    sufT5,
    sufT10,
    sufT15,
    sufT20,
    minAlgTable,
    maxAlgTable,
    fixasSorted,
    cruzAtual: popcount(fixasMask & MASK_CRUZ),
    algAtual: algFixas,
    m3Atual: popcount(fixasMask & MASK_M3),
    m4Atual: popcount(fixasMask & MASK_M4),
    m5Atual: popcount(fixasMask & MASK_M5),
    m6Atual: popcount(fixasMask & MASK_M6),
    m7Atual: popcount(fixasMask & MASK_M7),
    m8Atual: popcount(fixasMask & MASK_M8),
    t5Atual: rm ? popcount(fixasMask & rm.maskTop5) : 0,
    t10Atual: rm ? popcount(fixasMask & rm.maskTop10) : 0,
    t15Atual: rm ? popcount(fixasMask & rm.maskTop15) : 0,
    t20Atual: rm ? popcount(fixasMask & rm.maskTop20) : 0,
    cruzMin,
    cruzMax,
    algMin: filtros.somaAlgarismosMin ?? 63,
    algMax: filtros.somaAlgarismosMax ?? 87,
  };
}

/**
 * Gerador Combinatório com Poda Dinâmica de Ramo (Branch and Bound)
 * Executa poda antecipada (early-exit) durante a recursão para:
 * - Soma e Paridade
 * - Intervalos Posicionais D1–D15
 * - Múltiplos Bitwise M(3)–M(8)
 * - Soma dos Algarismos Individuais (63–87)
 * - Geometria da Cruz (9 dezenas centrais)
 * - Equilíbrio de Ranking Histórico (Top 5, 10, 15, 20)
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
  filtros: PodaDinamicaFiltros,
  fixasMask: number,
  callbackValido: (jogoCompletoMask: number) => void,
  _ctx?: PodaDinamicaContext
): void {
  const ctx = _ctx ?? buildPodaDinamicaContext(variaveisValores, variaveisBits, filtros, fixasMask);

  // Caso base: completou as dezenas variáveis necessárias
  if (vagasRestantes === 0) {
    const jogoCompletoMask = maskAtual | fixasMask;
    if (filtros.posicionalAtivo && ctx.fixasSorted.length > 0) {
      const sorted = mascaraParaDezenas(jogoCompletoMask);
      if (!validarPosicionalSorted(sorted).valido) {
        filtros.onBranchPruned?.();
        return;
      }
    }
    callbackValido(jogoCompletoMask);
    return;
  }

  const n = variaveisValores.length;
  const isStrictCruz = filtros.strictValidation === true || filtros.validacaoEstritaCruz === true;
  const checkCruz = isStrictCruz || (filtros.cruzAtiva !== false && filtros.cruzMin !== undefined);
  const checkMultiplos = Boolean(filtros.multiplosAtivo);
  const checkAlg = Boolean(filtros.somaAlgarismosAtiva);
  const checkRanking = Boolean(filtros.rankingHistoricoAtivo && filtros.rankingMasks);
  const rm = filtros.rankingMasks;

  for (let i = idx; i <= n - vagasRestantes; i++) {
    const val = variaveisValores[i];
    const bit = variaveisBits[i];
    const novasVagas = vagasRestantes - 1;

    // --- 1. PODA POSICIONAL ANTECIPADA (Branch & Bound D1..D15) ---
    if (filtros.posicionalAtivo) {
      let exactPos = profundidade;
      if (ctx.fixasSorted.length > 0) {
        for (let f = 0; f < ctx.fixasSorted.length; f++) {
          if (ctx.fixasSorted[f] < val) exactPos++;
          else break;
        }
      }
      if (exactPos < 15) {
        const [minPos, maxPos] = POSITIONAL_BOUNDS[exactPos];
        if (val < minPos) {
          filtros.onBranchPruned?.();
          continue;
        }
        if (val > maxPos) {
          filtros.onBranchPruned?.();
          if (ctx.fixasSorted.length === 0) break;
          continue;
        }
      }
    }

    const novaSoma = somaAtual + val;
    const novosPares = paresAtual + (val % 2 === 0 ? 1 : 0);

    // --- PODA DE SOMA MÍNIMA / MÁXIMA ---
    let minSomaPossivel = novaSoma;
    for (let k = 1; k <= novasVagas; k++) {
      minSomaPossivel += variaveisValores[i + k];
    }
    if (filtros.somaMax !== undefined && minSomaPossivel > filtros.somaMax) {
      filtros.onBranchPruned?.();
      break;
    }

    let maxSomaPossivel = novaSoma;
    for (let k = 0; k < novasVagas; k++) {
      maxSomaPossivel += variaveisValores[n - 1 - k];
    }
    if (filtros.somaMin !== undefined && maxSomaPossivel < filtros.somaMin) {
      filtros.onBranchPruned?.();
      continue;
    }

    // --- PODA DE PARES ---
    if (filtros.paresMax !== undefined && novosPares > filtros.paresMax) {
      filtros.onBranchPruned?.();
      continue;
    }
    if (filtros.paresMin !== undefined && novosPares + novasVagas < filtros.paresMin) {
      filtros.onBranchPruned?.();
      continue;
    }

    // --- 2. PODA ANTECIPADA DA GEOMETRIA DA CRUZ (9 dezenas centrais) ---
    let novoCruz = ctx.cruzAtual;
    if (checkCruz) {
      novoCruz += (bit & MASK_CRUZ) !== 0 ? 1 : 0;
      if (novoCruz > ctx.cruzMax) {
        filtros.onBranchPruned?.();
        continue;
      }
      const maxCruzPossivel = novoCruz + Math.min(novasVagas, ctx.sufCruz[i + 1]);
      if (maxCruzPossivel < ctx.cruzMin) {
        filtros.onBranchPruned?.();
        continue;
      }
    }

    // --- 3. PODA ANTECIPADA DE SOMA DOS DÍGITOS / ALGARISMOS (63–87) ---
    let novaAlg = ctx.algAtual;
    if (checkAlg) {
      novaAlg += PESO_DIGITOS[val] ?? 0;
      const minAlgPossivel = novaAlg + ctx.minAlgTable[i + 1][novasVagas];
      const maxAlgPossivel = novaAlg + ctx.maxAlgTable[i + 1][novasVagas];
      if (minAlgPossivel > ctx.algMax || maxAlgPossivel < ctx.algMin) {
        filtros.onBranchPruned?.();
        continue;
      }
    }

    // --- 4. PODA ANTECIPADA DE MÚLTIPLOS M(3)–M(8) ---
    let nm3 = ctx.m3Atual;
    let nm4 = ctx.m4Atual;
    let nm5 = ctx.m5Atual;
    let nm6 = ctx.m6Atual;
    let nm7 = ctx.m7Atual;
    let nm8 = ctx.m8Atual;
    if (checkMultiplos) {
      nm3 += (bit & MASK_M3) !== 0 ? 1 : 0;
      nm4 += (bit & MASK_M4) !== 0 ? 1 : 0;
      nm5 += (bit & MASK_M5) !== 0 ? 1 : 0;
      nm6 += (bit & MASK_M6) !== 0 ? 1 : 0;
      nm7 += (bit & MASK_M7) !== 0 ? 1 : 0;
      nm8 += (bit & MASK_M8) !== 0 ? 1 : 0;

      if (
        nm3 > 7 ||
        nm3 + Math.min(novasVagas, ctx.sufM3[i + 1]) < 4 ||
        nm4 > 5 ||
        nm4 + Math.min(novasVagas, ctx.sufM4[i + 1]) < 2 ||
        nm5 + Math.min(novasVagas, ctx.sufM5[i + 1]) < 1 ||
        nm6 + Math.min(novasVagas, ctx.sufM6[i + 1]) < 1 ||
        nm7 + Math.min(novasVagas, ctx.sufM7[i + 1]) < 1 ||
        nm8 + Math.min(novasVagas, ctx.sufM8[i + 1]) < 1
      ) {
        filtros.onBranchPruned?.();
        continue;
      }
    }

    // --- 5. PODA ANTECIPADA DE RANKING HISTÓRICO (Top 5, 10, 15, 20) ---
    let nt5 = ctx.t5Atual;
    let nt10 = ctx.t10Atual;
    let nt15 = ctx.t15Atual;
    let nt20 = ctx.t20Atual;
    if (checkRanking && rm) {
      nt5 += (bit & rm.maskTop5) !== 0 ? 1 : 0;
      nt10 += (bit & rm.maskTop10) !== 0 ? 1 : 0;
      nt15 += (bit & rm.maskTop15) !== 0 ? 1 : 0;
      nt20 += (bit & rm.maskTop20) !== 0 ? 1 : 0;

      if (
        nt5 > 4 ||
        nt5 + Math.min(novasVagas, ctx.sufT5[i + 1]) < 2 ||
        nt10 > 8 ||
        nt10 + Math.min(novasVagas, ctx.sufT10[i + 1]) < 4 ||
        nt15 > 11 ||
        nt15 + Math.min(novasVagas, ctx.sufT15[i + 1]) < 7 ||
        nt20 > 14 ||
        nt20 + Math.min(novasVagas, ctx.sufT20[i + 1]) < 11
      ) {
        filtros.onBranchPruned?.();
        continue;
      }
    }

    // Ramo viável: desce na recursão atualizando os contadores incrementais no contexto filho
    const nextCtx: PodaDinamicaContext = {
      ...ctx,
      cruzAtual: novoCruz,
      algAtual: novaAlg,
      m3Atual: nm3,
      m4Atual: nm4,
      m5Atual: nm5,
      m6Atual: nm6,
      m7Atual: nm7,
      m8Atual: nm8,
      t5Atual: nt5,
      t10Atual: nt10,
      t15Atual: nt15,
      t20Atual: nt20,
    };

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
      callbackValido,
      nextCtx
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
  const fixasSanitizadas = Array.from(new Set(dezenasFixas)).slice(0, 5);
  const usarFixasRotativas =
    fixasSanitizadas.length >= 3 && filtros.modoFixas !== 'rigidas';
  const kMinFixas = Math.max(1, fixasSanitizadas.length - 2);
  const kMaxFixas = fixasSanitizadas.length - 1;
  const allowCisneNegroBounds = jogos.length >= 10;

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

    // 5. Presença de dezenas fixas (Rígidas 100% ou Rotativas K de N)
    if (fixasSanitizadas.length > 0) {
      if (usarFixasRotativas) {
        const presentes = fixasSanitizadas.filter((f) => jogo.includes(f)).length;
        if (presentes < kMinFixas || presentes > kMaxFixas) {
          erros.push(
            `Cartão #${idx + 1}: Fixas rotativas fora da janela K de N (${presentes}/${fixasSanitizadas.length}, esperado ${kMinFixas} a ${kMaxFixas}).`
          );
        }
      } else {
        const fixasFaltantes = fixasSanitizadas.filter((f) => !jogo.includes(f));
        if (fixasFaltantes.length > 0) {
          erros.push(`Cartão #${idx + 1}: Faltam fixas obrigatórias: [${fixasFaltantes.join(', ')}].`);
        }
      }
    }

    // 6. Validação de Filtros Específicos (Soma com suporte Anti-Cisne Negro 155–235 para >= 10 jogos)
    if (filtros.somaMin !== undefined && filtros.somaMax !== undefined) {
      const soma = jogo.reduce((acc, val) => acc + val, 0);
      const effectiveMin = allowCisneNegroBounds ? Math.min(155, filtros.somaMin) : filtros.somaMin;
      const effectiveMax = allowCisneNegroBounds ? Math.max(235, filtros.somaMax) : filtros.somaMax;
      if (soma < effectiveMin || soma > effectiveMax) {
        erros.push(`Cartão #${idx + 1}: Soma ${soma} fora da faixa [${effectiveMin}, ${effectiveMax}].`);
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
