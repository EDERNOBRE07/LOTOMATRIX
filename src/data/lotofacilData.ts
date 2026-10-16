import { LotofacilDraw, DezenaStats, DuplaStats } from '../types/lotofacil';

// Canonical Math Sets
export const PRIMOS = [2, 3, 5, 7, 11, 13, 17, 19, 23];
export const MOLDURA = [1, 2, 3, 4, 5, 6, 10, 11, 15, 16, 20, 21, 22, 23, 24, 25];
export const MIOLO = [7, 8, 9, 12, 13, 14, 17, 18, 19];
export const FIBONACCI = [1, 2, 3, 5, 8, 13, 21];

// Official Draw 3804 & Recent Concursos History
export const CONCURSO_ATUAL: LotofacilDraw = {
  concurso: 3804,
  data: '14/10/2026',
  dezenas: [1, 2, 6, 7, 8, 12, 14, 15, 16, 17, 18, 19, 21, 24, 25],
  premiacoes: {
    faixa15: { ganhadores: 1, valor: 1750840.45 },
    faixa14: { ganhadores: 412, valor: 1395.2 },
    faixa13: { ganhadores: 24110, valor: 35.0 },
    faixa12: { ganhadores: 153200, valor: 14.0 },
    faixa11: { ganhadores: 845900, valor: 7.0 },
    acumuladoProximo: 0.0,
  },
};

export const RECENT_DRAWS: LotofacilDraw[] = [
  CONCURSO_ATUAL,
  {
    concurso: 3803,
    data: '13/10/2026',
    dezenas: [3, 6, 7, 8, 9, 11, 12, 13, 15, 16, 19, 20, 21, 22, 23],
    premiacoes: {
      faixa15: { ganhadores: 2, valor: 946676.32 },
      faixa14: { ganhadores: 387, valor: 1464.38 },
      faixa13: { ganhadores: 21890, valor: 35.0 },
      faixa12: { ganhadores: 145200, valor: 14.0 },
      faixa11: { ganhadores: 812400, valor: 7.0 },
    },
  },
  {
    concurso: 3802,
    data: '11/10/2026',
    dezenas: [2, 3, 5, 6, 9, 10, 11, 12, 14, 15, 19, 20, 21, 23, 24],
    premiacoes: {
      faixa15: { ganhadores: 2, valor: 820218.59 },
    },
  },
  {
    concurso: 3801,
    data: '09/10/2026',
    dezenas: [3, 4, 7, 8, 9, 11, 12, 13, 15, 17, 19, 20, 21, 23, 24],
    premiacoes: {
      faixa15: { ganhadores: 4, valor: 322726.1 },
    },
  },
  {
    concurso: 3800,
    data: '08/10/2026',
    dezenas: [1, 2, 3, 4, 5, 7, 8, 9, 10, 12, 13, 14, 15, 19, 21],
  },
  {
    concurso: 3799,
    data: '07/10/2026',
    dezenas: [1, 3, 4, 5, 7, 8, 10, 11, 12, 13, 16, 18, 19, 20, 24],
  },
  {
    concurso: 3798,
    data: '06/10/2026',
    dezenas: [1, 2, 3, 4, 7, 9, 10, 14, 16, 18, 20, 22, 23, 24, 25],
  },
  {
    concurso: 3797,
    data: '05/10/2026',
    dezenas: [1, 2, 4, 5, 6, 7, 8, 10, 11, 13, 15, 18, 20, 23, 25],
  },
  {
    concurso: 3796,
    data: '03/10/2026',
    dezenas: [1, 3, 5, 8, 9, 10, 12, 13, 14, 15, 17, 19, 21, 24, 25],
  },
  {
    concurso: 3795,
    data: '02/10/2026',
    dezenas: [2, 3, 4, 6, 7, 10, 11, 12, 14, 15, 18, 19, 20, 21, 23],
  },
  {
    concurso: 3794,
    data: '01/10/2026',
    dezenas: [1, 2, 3, 5, 6, 8, 9, 11, 13, 14, 16, 18, 20, 22, 25],
  },
  {
    concurso: 3793,
    data: '30/09/2026',
    dezenas: [2, 4, 5, 7, 8, 10, 11, 12, 13, 15, 17, 19, 20, 24, 25],
  },
  {
    concurso: 3792,
    data: '29/09/2026',
    dezenas: [1, 3, 4, 6, 7, 9, 10, 12, 14, 15, 18, 21, 22, 23, 25],
  },
  {
    concurso: 3791,
    data: '28/09/2026',
    dezenas: [2, 3, 5, 6, 8, 9, 10, 11, 13, 16, 17, 19, 20, 22, 24],
  },
  {
    concurso: 3790,
    data: '26/09/2026',
    dezenas: [1, 2, 4, 5, 7, 8, 11, 12, 13, 14, 18, 20, 21, 23, 25],
  },
  {
    concurso: 3789,
    data: '25/09/2026',
    dezenas: [3, 4, 6, 7, 9, 10, 12, 13, 15, 16, 17, 19, 21, 24, 25],
  },
  {
    concurso: 3788,
    data: '24/09/2026',
    dezenas: [1, 2, 3, 5, 8, 9, 11, 12, 14, 17, 18, 20, 22, 23, 25],
  },
  {
    concurso: 3787,
    data: '23/09/2026',
    dezenas: [2, 4, 5, 6, 7, 10, 11, 13, 15, 16, 18, 19, 20, 22, 24],
  },
  {
    concurso: 3786,
    data: '22/09/2026',
    dezenas: [1, 3, 4, 6, 8, 9, 10, 12, 14, 15, 17, 19, 21, 23, 25],
  },
];

// Complete Historical Statistics for all 25 Dezenas (calibrated with Concurso 3804)
export const DEZENAS_STATS: DezenaStats[] = [
  { numero: 1, vezes: 2307, atrasoAtual: 0, atrasoUltimo: 3, maiorAtraso: 7, atrasoMedio: 0.6, atrasoAcimaDaMedia: false, status: 'frequente', ePrimo: false, eMoldura: true, eFibonacci: true, presenteUltimoConcurso: true, pendenteNoCiclo: false },
  { numero: 2, vezes: 2276, atrasoAtual: 0, atrasoUltimo: 1, maiorAtraso: 8, atrasoMedio: 0.7, atrasoAcimaDaMedia: false, status: 'neutra', ePrimo: true, eMoldura: true, eFibonacci: true, presenteUltimoConcurso: true, pendenteNoCiclo: false },
  { numero: 3, vezes: 2292, atrasoAtual: 1, atrasoUltimo: 0, maiorAtraso: 8, atrasoMedio: 0.7, atrasoAcimaDaMedia: true, status: 'frequente', ePrimo: true, eMoldura: true, eFibonacci: true, presenteUltimoConcurso: false, pendenteNoCiclo: true },
  { numero: 4, vezes: 2300, atrasoAtual: 3, atrasoUltimo: 0, maiorAtraso: 7, atrasoMedio: 0.7, atrasoAcimaDaMedia: true, status: 'atrasada', ePrimo: false, eMoldura: true, eFibonacci: false, presenteUltimoConcurso: false, pendenteNoCiclo: true },
  { numero: 5, vezes: 2291, atrasoAtual: 3, atrasoUltimo: 0, maiorAtraso: 9, atrasoMedio: 0.7, atrasoAcimaDaMedia: true, status: 'atrasada', ePrimo: true, eMoldura: true, eFibonacci: true, presenteUltimoConcurso: false, pendenteNoCiclo: true },
  { numero: 6, vezes: 2236, atrasoAtual: 0, atrasoUltimo: 2, maiorAtraso: 10, atrasoMedio: 0.7, atrasoAcimaDaMedia: false, status: 'neutra', ePrimo: false, eMoldura: true, eFibonacci: false, presenteUltimoConcurso: true, pendenteNoCiclo: false },
  { numero: 7, vezes: 2245, atrasoAtual: 0, atrasoUltimo: 0, maiorAtraso: 10, atrasoMedio: 0.7, atrasoAcimaDaMedia: false, status: 'neutra', ePrimo: true, eMoldura: false, eFibonacci: false, presenteUltimoConcurso: true, pendenteNoCiclo: false },
  { numero: 8, vezes: 2205, atrasoAtual: 0, atrasoUltimo: 0, maiorAtraso: 10, atrasoMedio: 0.7, atrasoAcimaDaMedia: false, status: 'neutra', ePrimo: false, eMoldura: false, eFibonacci: true, presenteUltimoConcurso: true, pendenteNoCiclo: false },
  { numero: 9, vezes: 2269, atrasoAtual: 1, atrasoUltimo: 1, maiorAtraso: 8, atrasoMedio: 0.7, atrasoAcimaDaMedia: true, status: 'neutra', ePrimo: false, eMoldura: false, eFibonacci: false, presenteUltimoConcurso: false, pendenteNoCiclo: true },
  { numero: 10, vezes: 2359, atrasoAtual: 2, atrasoUltimo: 0, maiorAtraso: 8, atrasoMedio: 0.6, atrasoAcimaDaMedia: true, status: 'frequente', ePrimo: false, eMoldura: true, eFibonacci: false, presenteUltimoConcurso: false, pendenteNoCiclo: true },
  { numero: 11, vezes: 2338, atrasoAtual: 1, atrasoUltimo: 2, maiorAtraso: 8, atrasoMedio: 0.6, atrasoAcimaDaMedia: true, status: 'frequente', ePrimo: true, eMoldura: true, eFibonacci: false, presenteUltimoConcurso: false, pendenteNoCiclo: true },
  { numero: 12, vezes: 2287, atrasoAtual: 0, atrasoUltimo: 0, maiorAtraso: 9, atrasoMedio: 0.7, atrasoAcimaDaMedia: false, status: 'neutra', ePrimo: false, eMoldura: false, eFibonacci: false, presenteUltimoConcurso: true, pendenteNoCiclo: false },
  { numero: 13, vezes: 2313, atrasoAtual: 1, atrasoUltimo: 0, maiorAtraso: 7, atrasoMedio: 0.6, atrasoAcimaDaMedia: true, status: 'frequente', ePrimo: true, eMoldura: false, eFibonacci: true, presenteUltimoConcurso: false, pendenteNoCiclo: true },
  { numero: 14, vezes: 2300, atrasoAtual: 0, atrasoUltimo: 1, maiorAtraso: 11, atrasoMedio: 0.7, atrasoAcimaDaMedia: false, status: 'neutra', ePrimo: false, eMoldura: false, eFibonacci: false, presenteUltimoConcurso: true, pendenteNoCiclo: false },
  { numero: 15, vezes: 2273, atrasoAtual: 0, atrasoUltimo: 3, maiorAtraso: 9, atrasoMedio: 0.7, atrasoAcimaDaMedia: false, status: 'neutra', ePrimo: false, eMoldura: true, eFibonacci: false, presenteUltimoConcurso: true, pendenteNoCiclo: false },
  { numero: 16, vezes: 2174, atrasoAtual: 0, atrasoUltimo: 3, maiorAtraso: 9, atrasoMedio: 0.7, atrasoAcimaDaMedia: false, status: 'neutra', ePrimo: false, eMoldura: true, eFibonacci: false, presenteUltimoConcurso: true, pendenteNoCiclo: false },
  { numero: 17, vezes: 2230, atrasoAtual: 0, atrasoUltimo: 7, maiorAtraso: 10, atrasoMedio: 0.7, atrasoAcimaDaMedia: false, status: 'neutra', ePrimo: true, eMoldura: false, eFibonacci: false, presenteUltimoConcurso: true, pendenteNoCiclo: false },
  { numero: 18, vezes: 2260, atrasoAtual: 0, atrasoUltimo: 4, maiorAtraso: 8, atrasoMedio: 0.7, atrasoAcimaDaMedia: false, status: 'neutra', ePrimo: false, eMoldura: false, eFibonacci: false, presenteUltimoConcurso: true, pendenteNoCiclo: false },
  { numero: 19, vezes: 2265, atrasoAtual: 0, atrasoUltimo: 0, maiorAtraso: 12, atrasoMedio: 0.7, atrasoAcimaDaMedia: false, status: 'neutra', ePrimo: true, eMoldura: false, eFibonacci: false, presenteUltimoConcurso: true, pendenteNoCiclo: false },
  { numero: 20, vezes: 2368, atrasoAtual: 1, atrasoUltimo: 0, maiorAtraso: 8, atrasoMedio: 0.6, atrasoAcimaDaMedia: true, status: 'frequente', ePrimo: false, eMoldura: true, eFibonacci: false, presenteUltimoConcurso: false, pendenteNoCiclo: true },
  { numero: 21, vezes: 2260, atrasoAtual: 0, atrasoUltimo: 3, maiorAtraso: 10, atrasoMedio: 0.7, atrasoAcimaDaMedia: false, status: 'neutra', ePrimo: false, eMoldura: true, eFibonacci: true, presenteUltimoConcurso: true, pendenteNoCiclo: false },
  { numero: 22, vezes: 2266, atrasoAtual: 1, atrasoUltimo: 5, maiorAtraso: 7, atrasoMedio: 0.7, atrasoAcimaDaMedia: true, status: 'neutra', ePrimo: false, eMoldura: true, eFibonacci: false, presenteUltimoConcurso: false, pendenteNoCiclo: true },
  { numero: 23, vezes: 2230, atrasoAtual: 1, atrasoUltimo: 0, maiorAtraso: 7, atrasoMedio: 0.7, atrasoAcimaDaMedia: true, status: 'neutra', ePrimo: true, eMoldura: true, eFibonacci: false, presenteUltimoConcurso: false, pendenteNoCiclo: true },
  { numero: 24, vezes: 2310, atrasoAtual: 0, atrasoUltimo: 1, maiorAtraso: 8, atrasoMedio: 0.6, atrasoAcimaDaMedia: false, status: 'frequente', ePrimo: false, eMoldura: true, eFibonacci: false, presenteUltimoConcurso: true, pendenteNoCiclo: false },
  { numero: 25, vezes: 2361, atrasoAtual: 0, atrasoUltimo: 4, maiorAtraso: 11, atrasoMedio: 0.6, atrasoAcimaDaMedia: false, status: 'frequente', ePrimo: false, eMoldura: true, eFibonacci: false, presenteUltimoConcurso: true, pendenteNoCiclo: false },
];

// Top Duplas Amigas (Tabela 4)
export const TOP_DUPLAS: DuplaStats[] = [
  { dupla: [11, 20], vezes: 1447, atrasoAtual: 2, atrasoUltimo: 1, maiorAtraso: 16, atrasoMedio: 1.6 },
  { dupla: [10, 25], vezes: 1440, atrasoAtual: 1, atrasoUltimo: 5, maiorAtraso: 15, atrasoMedio: 1.6 },
  { dupla: [10, 20], vezes: 1433, atrasoAtual: 1, atrasoUltimo: 0, maiorAtraso: 20, atrasoMedio: 1.7 },
  { dupla: [13, 20], vezes: 1430, atrasoAtual: 1, atrasoUltimo: 1, maiorAtraso: 13, atrasoMedio: 1.7 },
  { dupla: [20, 25], vezes: 1426, atrasoAtual: 1, atrasoUltimo: 5, maiorAtraso: 15, atrasoMedio: 1.7 },
  { dupla: [14, 20], vezes: 1419, atrasoAtual: 2, atrasoUltimo: 0, maiorAtraso: 14, atrasoMedio: 1.7 },
  { dupla: [10, 11], vezes: 1413, atrasoAtual: 2, atrasoUltimo: 1, maiorAtraso: 15, atrasoMedio: 1.7 },
  { dupla: [24, 25], vezes: 1406, atrasoAtual: 1, atrasoUltimo: 5, maiorAtraso: 19, atrasoMedio: 1.7 },
  { dupla: [12, 25], vezes: 1406, atrasoAtual: 1, atrasoUltimo: 6, maiorAtraso: 14, atrasoMedio: 1.7 },
  { dupla: [1, 10], vezes: 1405, atrasoAtual: 0, atrasoUltimo: 0, maiorAtraso: 12, atrasoMedio: 1.7 },
  { dupla: [9, 10], vezes: 1404, atrasoAtual: 0, atrasoUltimo: 1, maiorAtraso: 17, atrasoMedio: 1.7 },
  { dupla: [11, 25], vezes: 1403, atrasoAtual: 7, atrasoUltimo: 0, maiorAtraso: 15, atrasoMedio: 1.7 },
  { dupla: [10, 14], vezes: 1401, atrasoAtual: 0, atrasoUltimo: 1, maiorAtraso: 19, atrasoMedio: 1.7 },
  { dupla: [10, 24], vezes: 1400, atrasoAtual: 1, atrasoUltimo: 2, maiorAtraso: 16, atrasoMedio: 1.7 },
  { dupla: [4, 11], vezes: 1397, atrasoAtual: 2, atrasoUltimo: 1, maiorAtraso: 24, atrasoMedio: 1.7 },
  { dupla: [5, 20], vezes: 1397, atrasoAtual: 1, atrasoUltimo: 0, maiorAtraso: 14, atrasoMedio: 1.7 },
];

// Historical Paridade Breakdown (Tabela 13)
export const PARIDADE_HISTORICA = [
  { configuracao: '7 Pares / 8 Ímpares', ocorrencias: 1190, percentual: 31.32, atrasoAtual: 1 },
  { configuracao: '8 Pares / 7 Ímpares', ocorrencias: 967, percentual: 25.45, atrasoAtual: 2 },
  { configuracao: '6 Pares / 9 Ímpares', ocorrencias: 782, percentual: 20.58, atrasoAtual: 0 },
  { configuracao: '9 Pares / 6 Ímpares', ocorrencias: 432, percentual: 11.37, atrasoAtual: 5 },
  { configuracao: '5 Pares / 10 Ímpares', ocorrencias: 272, percentual: 7.16, atrasoAtual: 7 },
  { configuracao: '10 Pares / 5 Ímpares', ocorrencias: 103, percentual: 2.71, atrasoAtual: 8 },
  { configuracao: '4 Pares / 11 Ímpares', ocorrencias: 39, percentual: 1.03, atrasoAtual: 104 },
  { configuracao: '11 Pares / 4 Ímpares', ocorrencias: 12, percentual: 0.32, atrasoAtual: 638 },
];

// Historical Primos Breakdown (Tabela 13)
export const PRIMOS_HISTORICA = [
  { primos: 5, ocorrencias: 1178, percentual: 31.0, atrasoAtual: 4 },
  { primos: 6, ocorrencias: 1109, percentual: 29.18, atrasoAtual: 0 },
  { primos: 4, ocorrencias: 655, percentual: 17.24, atrasoAtual: 8 },
  { primos: 7, ocorrencias: 528, percentual: 13.89, atrasoAtual: 18 },
  { primos: 3, ocorrencias: 178, percentual: 4.68, atrasoAtual: 16 },
  { primos: 8, ocorrencias: 120, percentual: 3.16, atrasoAtual: 21 },
  { primos: 2, ocorrencias: 19, percentual: 0.50, atrasoAtual: 297 },
  { primos: 9, ocorrencias: 9, percentual: 0.24, atrasoAtual: 104 },
];
