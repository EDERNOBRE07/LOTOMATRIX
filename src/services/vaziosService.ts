import { LotofacilDraw } from '../types/lotofacil';
import { RECENT_DRAWS, CONCURSO_ATUAL } from '../data/lotofacilData';

export interface VoidPairInfo {
  pair: [number, number];
  coOccurrences: number; // 0 to 10
  rate: number; // 0.0 to 1.0
  status: 'absoluto' | 'raro' | 'moderado' | 'equilibrado' | 'ouro';
  contestsTogether: number[]; // contest numbers where both occurred
  lastTogetherContest?: number;
}

export interface VoidTrioInfo {
  trio: [number, number, number];
  coOccurrences: number;
  contestsTogether: number[];
}

export interface VoidHeatmapAnalysis {
  matrix: number[][]; // 25x25 (1-indexed, size 26x26)
  individualFreq: number[]; // 1-indexed, size 26
  vaziosAbsolutos: VoidPairInfo[]; // 0 occurrences
  vaziosRaros: VoidPairInfo[]; // 1 occurrence
  paresEquilibrados: VoidPairInfo[];
  paresOuro: VoidPairInfo[];
  triosVazio: VoidTrioInfo[];
  totalDrawsTested: number;
  concursoInicio: number;
  concursoFim: number;
  isolamentoPorDezena: { dezena: number; qtdVaziosAbsolutos: number; qtdVaziosRaros: number }[];
}

export interface VoidExclusionConfig {
  ativo: boolean;
  paresExcluidos: [number, number][];
  bloquearVaziosAbsolutos: boolean;
  bloquearVaziosRaros: boolean;
  dataAtualizacao: string;
}

const STORAGE_KEY = 'lotosniper_void_exclusion_config';

/**
 * Computes the 25x25 co-occurrence matrix and identifies void sets (combinations of void)
 * across the specified draws (defaults to RECENT_DRAWS, 10 contests).
 */
export function computeVoidHeatmap(
  draws: LotofacilDraw[] = RECENT_DRAWS
): VoidHeatmapAnalysis {
  const windowDraws = draws && draws.length > 0 ? draws.slice(0, 10) : RECENT_DRAWS;
  const totalDraws = windowDraws.length;
  const sortedDraws = [...windowDraws].sort((a, b) => a.concurso - b.concurso);
  const concursoInicio = sortedDraws[0]?.concurso || 3802;
  const concursoFim = sortedDraws[sortedDraws.length - 1]?.concurso || 3811;

  // Initialize matrix 26x26
  const matrix: number[][] = Array.from({ length: 26 }, () => Array(26).fill(0));
  const individualFreq: number[] = Array(26).fill(0);
  const togetherMap: Map<string, number[]> = new Map();

  for (const draw of sortedDraws) {
    const dezenasSet = new Set(draw.dezenas);

    for (let i = 1; i <= 25; i++) {
      if (dezenasSet.has(i)) {
        individualFreq[i]++;
        matrix[i][i]++;
      }
    }

    for (let i = 1; i <= 25; i++) {
      if (!dezenasSet.has(i)) continue;
      for (let j = i + 1; j <= 25; j++) {
        if (dezenasSet.has(j)) {
          matrix[i][j]++;
          matrix[j][i]++;
          const key = `${i}-${j}`;
          if (!togetherMap.has(key)) {
            togetherMap.set(key, []);
          }
          togetherMap.get(key)!.push(draw.concurso);
        }
      }
    }
  }

  const vaziosAbsolutos: VoidPairInfo[] = [];
  const vaziosRaros: VoidPairInfo[] = [];
  const paresEquilibrados: VoidPairInfo[] = [];
  const paresOuro: VoidPairInfo[] = [];

  for (let i = 1; i <= 25; i++) {
    for (let j = i + 1; j <= 25; j++) {
      const coOccurrences = matrix[i][j];
      const rate = totalDraws > 0 ? coOccurrences / totalDraws : 0;
      const key = `${i}-${j}`;
      const contestsTogether = togetherMap.get(key) || [];
      const lastTogetherContest =
        contestsTogether.length > 0
          ? contestsTogether[contestsTogether.length - 1]
          : undefined;

      let status: VoidPairInfo['status'] = 'moderado';
      if (coOccurrences === 0) status = 'absoluto';
      else if (coOccurrences === 1) status = 'raro';
      else if (coOccurrences >= 7) status = 'ouro';
      else if (coOccurrences >= 5) status = 'equilibrado';

      const info: VoidPairInfo = {
        pair: [i, j],
        coOccurrences,
        rate,
        status,
        contestsTogether,
        lastTogetherContest,
      };

      if (coOccurrences === 0) vaziosAbsolutos.push(info);
      else if (coOccurrences === 1) vaziosRaros.push(info);
      else if (coOccurrences >= 7) paresOuro.push(info);
      else if (coOccurrences >= 5) paresEquilibrados.push(info);
    }
  }

  // Trios de Vazio: find trios where (i, j, k) all 3 NEVER appeared together in any of the 10 draws
  // We limit search to pairs that already have low co-occurrence (<= 2) to keep algorithm fast & relevant
  const triosVazio: VoidTrioInfo[] = [];
  const lowCooccurrencePairs = [...vaziosAbsolutos, ...vaziosRaros].slice(0, 40);

  const checkedTrios = new Set<string>();
  for (const pairInfo of lowCooccurrencePairs) {
    const [d1, d2] = pairInfo.pair;
    for (let k = 1; k <= 25; k++) {
      if (k === d1 || k === d2) continue;
      const trioArr = [d1, d2, k].sort((a, b) => a - b) as [number, number, number];
      const trioKey = trioArr.join('-');
      if (checkedTrios.has(trioKey)) continue;
      checkedTrios.add(trioKey);

      let trioMatches = 0;
      const contestsTrioTogether: number[] = [];
      for (const draw of sortedDraws) {
        if (
          draw.dezenas.includes(trioArr[0]) &&
          draw.dezenas.includes(trioArr[1]) &&
          draw.dezenas.includes(trioArr[2])
        ) {
          trioMatches++;
          contestsTrioTogether.push(draw.concurso);
        }
      }

      if (trioMatches === 0) {
        triosVazio.push({
          trio: trioArr,
          coOccurrences: 0,
          contestsTogether: contestsTrioTogether,
        });
      }
      if (triosVazio.length >= 30) break;
    }
    if (triosVazio.length >= 30) break;
  }

  // Calculate isolation / void density per number
  const isolamentoPorDezena = Array.from({ length: 25 }, (_, idx) => {
    const num = idx + 1;
    let absCount = 0;
    let raroCount = 0;
    for (let other = 1; other <= 25; other++) {
      if (other === num) continue;
      const count = matrix[num][other];
      if (count === 0) absCount++;
      else if (count === 1) raroCount++;
    }
    return {
      dezena: num,
      qtdVaziosAbsolutos: absCount,
      qtdVaziosRaros: raroCount,
    };
  }).sort((a, b) => (b.qtdVaziosAbsolutos * 2 + b.qtdVaziosRaros) - (a.qtdVaziosAbsolutos * 2 + a.qtdVaziosRaros));

  return {
    matrix,
    individualFreq,
    vaziosAbsolutos,
    vaziosRaros,
    paresEquilibrados,
    paresOuro,
    triosVazio,
    totalDrawsTested: totalDraws,
    concursoInicio,
    concursoFim,
    isolamentoPorDezena,
  };
}

/**
 * Checks if a ticket contains both numbers of any forbidden void pair
 */
export function hasVoidPairViolation(
  ticketDezenas: number[],
  forbiddenPairs: [number, number][]
): boolean {
  if (!forbiddenPairs || forbiddenPairs.length === 0) return false;
  const numSet = new Set(ticketDezenas);
  for (const [a, b] of forbiddenPairs) {
    if (numSet.has(a) && numSet.has(b)) {
      return true;
    }
  }
  return false;
}

/**
 * Storage helpers for user-defined void exclusion rules
 */
export function getVoidExclusionConfig(): VoidExclusionConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {
        ativo: false,
        paresExcluidos: [],
        bloquearVaziosAbsolutos: true,
        bloquearVaziosRaros: false,
        dataAtualizacao: new Date().toISOString(),
      };
    }
    return JSON.parse(raw);
  } catch {
    return {
      ativo: false,
      paresExcluidos: [],
      bloquearVaziosAbsolutos: true,
      bloquearVaziosRaros: false,
      dataAtualizacao: new Date().toISOString(),
    };
  }
}

export function saveVoidExclusionConfig(config: VoidExclusionConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    // Dispatch custom event to notify FechamentoTab & FilterControls
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('lotosniper-void-filter-changed', { detail: config })
      );
    }
  } catch (e) {
    console.error('Falha ao salvar configuração de vazios:', e);
  }
}
