export interface QuadrantesDistribuicao {
  q1: number;
  q2: number;
  q3: number;
  q4: number;
  centro13: boolean;
}

export interface ConcursoParametrosEstatisticos {
  pares: number;
  impares: number;
  repetidasAnterior: number | null;
  somaTotal: number;
  primos: number;
  moldura: number;
  miolo: number;
  fibonacci: number;
  maiorSequencia: number;
  blocosConsecutivos: number[][];
  cruz: number;
  quadrantes: QuadrantesDistribuicao;
}

export const PRIMOS_CONJUNTO = [2, 3, 5, 7, 11, 13, 17, 19, 23] as const;
export const MOLDURA_CONJUNTO = [
  1, 2, 3, 4, 5, 6, 10, 11, 15, 16, 20, 21, 22, 23, 24, 25,
] as const;
export const MIOLO_CONJUNTO = [7, 8, 9, 12, 13, 14, 17, 18, 19] as const;
export const FIBONACCI_CONJUNTO = [1, 2, 3, 5, 8, 13, 21] as const;

// Cruz central do volante 5x5 (Linha 3 + Coluna 3)
export const CRUZ_CENTRAL_CONJUNTO = [3, 8, 11, 12, 13, 14, 15, 18, 23] as const;

// Regra de divisão de quadrantes já adotada no motor combinatório do sistema (src/services/combinatorics.ts)
export const QUADRANTES_VOLANTE = {
  Q1: [1, 2, 3, 6, 7, 8] as const,
  Q2: [4, 5, 9, 10, 14, 15] as const,
  Q3: [11, 12, 16, 17, 21, 22] as const,
  Q4: [18, 19, 20, 23, 24, 25] as const,
};

const PRIMOS_SET = new Set<number>(PRIMOS_CONJUNTO);
const MOLDURA_SET = new Set<number>(MOLDURA_CONJUNTO);
const FIBONACCI_SET = new Set<number>(FIBONACCI_CONJUNTO);
const CRUZ_SET = new Set<number>(CRUZ_CENTRAL_CONJUNTO);
const Q1_SET = new Set<number>(QUADRANTES_VOLANTE.Q1);
const Q2_SET = new Set<number>(QUADRANTES_VOLANTE.Q2);
const Q3_SET = new Set<number>(QUADRANTES_VOLANTE.Q3);
const Q4_SET = new Set<number>(QUADRANTES_VOLANTE.Q4);

/**
 * Função utilitária pura que calcula todos os parâmetros estatísticos completos
 * de um concurso da Lotofácil a partir das dezenas sorteadas atuais e,
 * opcionalmente, das dezenas do concurso imediatamente anterior.
 */
export function calcularParametrosConcurso(
  dezenasAtuais: readonly number[],
  dezenasAnteriores?: readonly number[] | null
): ConcursoParametrosEstatisticos {
  const unicasOrdenadas = Array.from(
    new Set(
      (dezenasAtuais || [])
        .map((n) => Number(n))
        .filter((n) => Number.isInteger(n) && n >= 1 && n <= 25)
    )
  ).sort((a, b) => a - b);

  let pares = 0;
  let impares = 0;
  let somaTotal = 0;
  let primos = 0;
  let moldura = 0;
  let miolo = 0;
  let fibonacci = 0;
  let cruz = 0;
  let q1 = 0;
  let q2 = 0;
  let q3 = 0;
  let q4 = 0;
  let centro13 = false;

  for (const num of unicasOrdenadas) {
    if (num % 2 === 0) pares++;
    else impares++;

    somaTotal += num;
    if (PRIMOS_SET.has(num)) primos++;
    if (MOLDURA_SET.has(num)) moldura++;
    else miolo++;
    if (FIBONACCI_SET.has(num)) fibonacci++;
    if (CRUZ_SET.has(num)) cruz++;

    if (Q1_SET.has(num)) q1++;
    else if (Q2_SET.has(num)) q2++;
    else if (Q3_SET.has(num)) q3++;
    else if (Q4_SET.has(num)) q4++;
    else if (num === 13) centro13 = true;
  }

  // Repetidas do concurso imediatamente anterior (null seguro quando indisponível)
  let repetidasAnterior: number | null = null;
  if (Array.isArray(dezenasAnteriores) && dezenasAnteriores.length > 0) {
    const prevSet = new Set<number>(
      dezenasAnteriores
        .map((n) => Number(n))
        .filter((n) => Number.isInteger(n) && n >= 1 && n <= 25)
    );
    if (prevSet.size > 0) {
      let rep = 0;
      for (const num of unicasOrdenadas) {
        if (prevSet.has(num)) rep++;
      }
      repetidasAnterior = rep;
    }
  }

  // Identificação de blocos consecutivos e da maior sequência do sorteio
  const blocosConsecutivos: number[][] = [];
  let maiorSequencia = unicasOrdenadas.length > 0 ? 1 : 0;

  if (unicasOrdenadas.length > 0) {
    let blocoAtual: number[] = [unicasOrdenadas[0]];
    for (let i = 1; i < unicasOrdenadas.length; i++) {
      if (unicasOrdenadas[i] === unicasOrdenadas[i - 1] + 1) {
        blocoAtual.push(unicasOrdenadas[i]);
      } else {
        if (blocoAtual.length >= 2) {
          blocosConsecutivos.push(blocoAtual);
        }
        if (blocoAtual.length > maiorSequencia) {
          maiorSequencia = blocoAtual.length;
        }
        blocoAtual = [unicasOrdenadas[i]];
      }
    }
    if (blocoAtual.length >= 2) {
      blocosConsecutivos.push(blocoAtual);
    }
    if (blocoAtual.length > maiorSequencia) {
      maiorSequencia = blocoAtual.length;
    }
  }

  return {
    pares,
    impares,
    repetidasAnterior,
    somaTotal,
    primos,
    moldura,
    miolo,
    fibonacci,
    maiorSequencia,
    blocosConsecutivos,
    cruz,
    quadrantes: {
      q1,
      q2,
      q3,
      q4,
      centro13,
    },
  };
}

/**
 * Localiza com segurança as dezenas do concurso imediatamente anterior (concurso - 1)
 * dentro de um histórico de sorteios carregado no estado/banco.
 */
export function resolvePreviousDrawDezenas(
  concursoAtual: number,
  drawsHistory: ReadonlyArray<{ concurso: number; dezenas: number[] }>
): number[] | null {
  if (!Number.isFinite(concursoAtual) || !Array.isArray(drawsHistory) || drawsHistory.length === 0) {
    return null;
  }
  const exactPrev = drawsHistory.find((d) => d.concurso === concursoAtual - 1);
  if (exactPrev && Array.isArray(exactPrev.dezenas) && exactPrev.dezenas.length > 0) {
    return exactPrev.dezenas;
  }
  return null;
}
