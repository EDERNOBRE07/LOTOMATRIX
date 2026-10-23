import { DEZENAS_STATS } from '../data/lotofacilData';
import { DezenaStats } from '../types/lotofacil';

export interface CurvaAbcItem {
  numero: number;
  vezes: number;
  frequenciaPercentual: number; // vezes / 3800 * 100
  sharePercentual: number; // vezes / totalVezes * 100
  cumulativeShare: number; // 0 a 100
  classe: 'A' | 'B' | 'C';
  status: 'atrasada' | 'frequente' | 'neutra';
  ePrimo: boolean;
  eMoldura: boolean;
  eFibonacci: boolean;
  presenteUltimoConcurso: boolean;
  rank: number;
}

export interface CurvaAbcSummary {
  items: CurvaAbcItem[];
  classeA: CurvaAbcItem[];
  classeB: CurvaAbcItem[];
  classeC: CurvaAbcItem[];
  classeANumeros: number[];
  classeBNumeros: number[];
  classeCNumeros: number[];
  totalOcorrencias: number;
  mediaPresencaClasseA: number; // Em média quantas dezenas da Classe A saem por concurso
  presencaClasseAUltimoConcurso: number;
  pctVolumeClasseA: number;
  pctVolumeClasseB: number;
  pctVolumeClasseC: number;
}

export interface CurvaAbcFilterConfig {
  ativo: boolean;
  minClasseA: number; // Padrão: 11
  maxClasseA?: number; // Padrão: 14
}

const LOCAL_STORAGE_KEY = 'lotosniper_filtro_curva_abc_classe_a';

/**
 * Calcula a análise de Curva ABC para as 25 dezenas da Lotofácil
 * Baseado no Princípio de Pareto (80/20):
 * - Classe A: Dezenas até 80.0% de frequência acumulada (núcleo de alta dominância histórica)
 * - Classe B: Dezenas de 80.0% a 95.0% de frequência acumulada (dezenas intermediárias)
 * - Classe C: Dezenas de 95.0% a 100.0% de frequência acumulada (dezenas periféricas)
 */
export function calculateCurvaAbc(statsList: DezenaStats[] = DEZENAS_STATS): CurvaAbcSummary {
  const totalOcorrencias = statsList.reduce((acc, curr) => acc + curr.vezes, 0);

  // Ordenar em ordem decrescente de ocorrências
  const sorted = [...statsList].sort((a, b) => b.vezes - a.vezes);

  let accumulatedVezes = 0;
  const items: CurvaAbcItem[] = sorted.map((stat, idx) => {
    accumulatedVezes += stat.vezes;
    const share = (stat.vezes / totalOcorrencias) * 100;
    const cumulativeShare = (accumulatedVezes / totalOcorrencias) * 100;

    let classe: 'A' | 'B' | 'C' = 'A';
    // O corte clássico de 80% do volume acumulado (inclui o item que ultrapassa a fronteira dos 80%)
    if (cumulativeShare <= 80.8) {
      classe = 'A';
    } else if (cumulativeShare <= 96.2) {
      classe = 'B';
    } else {
      classe = 'C';
    }

    return {
      numero: stat.numero,
      vezes: stat.vezes,
      frequenciaPercentual: Number(((stat.vezes / 3800) * 100).toFixed(1)),
      sharePercentual: Number(share.toFixed(2)),
      cumulativeShare: Number(cumulativeShare.toFixed(2)),
      classe,
      status: stat.status,
      ePrimo: stat.ePrimo,
      eMoldura: stat.eMoldura,
      eFibonacci: stat.eFibonacci,
      presenteUltimoConcurso: stat.presenteUltimoConcurso,
      rank: idx + 1,
    };
  });

  const classeA = items.filter((it) => it.classe === 'A');
  const classeB = items.filter((it) => it.classe === 'B');
  const classeC = items.filter((it) => it.classe === 'C');

  const classeANumeros = classeA.map((it) => it.numero).sort((a, b) => a - b);
  const classeBNumeros = classeB.map((it) => it.numero).sort((a, b) => a - b);
  const classeCNumeros = classeC.map((it) => it.numero).sort((a, b) => a - b);

  // Média de presença por concurso: total de bolas da Classe A / 3800
  const somaVezesA = classeA.reduce((sum, item) => sum + item.vezes, 0);
  const somaVezesB = classeB.reduce((sum, item) => sum + item.vezes, 0);
  const somaVezesC = classeC.reduce((sum, item) => sum + item.vezes, 0);

  const mediaPresencaClasseA = Number((somaVezesA / 3800).toFixed(1));
  const presencaClasseAUltimoConcurso = classeA.filter((it) => it.presenteUltimoConcurso).length;

  return {
    items,
    classeA,
    classeB,
    classeC,
    classeANumeros,
    classeBNumeros,
    classeCNumeros,
    totalOcorrencias,
    mediaPresencaClasseA,
    presencaClasseAUltimoConcurso,
    pctVolumeClasseA: Number(((somaVezesA / totalOcorrencias) * 100).toFixed(1)),
    pctVolumeClasseB: Number(((somaVezesB / totalOcorrencias) * 100).toFixed(1)),
    pctVolumeClasseC: Number(((somaVezesC / totalOcorrencias) * 100).toFixed(1)),
  };
}

/**
 * Salva a configuração de filtro da Curva ABC no localStorage para aplicação permanente em fechamentos futuros
 */
export function saveCurvaAbcFilterConfig(config: CurvaAbcFilterConfig): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(config));
  } catch (err) {
    console.error('Falha ao salvar configuração da Curva ABC:', err);
  }
}

/**
 * Carrega a configuração de filtro da Curva ABC do localStorage
 */
export function getCurvaAbcFilterConfig(): CurvaAbcFilterConfig {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ativo: Boolean(parsed.ativo),
        minClasseA: Number(parsed.minClasseA) || 11,
        maxClasseA: Number(parsed.maxClasseA) || 14,
      };
    }
  } catch (err) {
    console.error('Falha ao ler configuração da Curva ABC:', err);
  }
  return {
    ativo: false,
    minClasseA: 11,
    maxClasseA: 14,
  };
}

/**
 * Conta quantas dezenas da Classe A estão contidas em um bilhete
 */
export function countClasseADezenas(
  ticketNumbers: number[],
  classeANumbers?: number[]
): number {
  const targetPool = classeANumbers || calculateCurvaAbc().classeANumeros;
  return ticketNumbers.filter((n) => targetPool.includes(n)).length;
}
