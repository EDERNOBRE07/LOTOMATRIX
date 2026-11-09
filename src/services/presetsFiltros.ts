import { FilterCriteria } from '../types/lotofacil';

export interface PresetLotoFacilItem {
  id: 'conservador' | 'balanceado' | 'agressivo';
  nome: string;
  badge: string;
  desvio: string;
  coberturaConcursos: string;
  corteMedio: string;
  descricao: string;
  badgeColor: 'emerald' | 'sky' | 'amber';
  filtros: Partial<FilterCriteria>;
}

/**
 * Presets Estatísticos Canônicos da Lotofácil
 * Calibrados pela distribuição normal histórica de sorteios da Caixa.
 */
export const PRESETS_LOTOFACIL: Record<'conservador' | 'balanceado' | 'agressivo', PresetLotoFacilItem> = {
  conservador: {
    id: 'conservador',
    nome: 'Conservador',
    badge: '±2σ (95%)',
    desvio: '±2σ',
    coberturaConcursos: '~95% dos concursos',
    corteMedio: '~8%',
    descricao: 'Cobre ~95% dos concursos históricos. Redução branda de custo com preservação máxima da garantia matemática.',
    badgeColor: 'emerald',
    filtros: {
      somaMin: 165,
      somaMax: 225,
      paresMin: 5,
      paresMax: 9,
      molduraMin: 8,
      molduraMax: 12,
      primosMin: 3,
      primosMax: 7,
      repetidasMin: 7,
      repetidasMax: 11,
      cruzAtiva: true,
      cruzMin: 4,
      cruzMax: 7,
      validacaoEstritaCruz: false,
      presetEstatistico: 'conservador',
    },
  },
  balanceado: {
    id: 'balanceado',
    nome: 'Balanceado',
    badge: '±1.5σ (86%)',
    desvio: '±1.5σ',
    coberturaConcursos: '~86% dos sorteios',
    corteMedio: '~28%',
    descricao: 'Ponto ideal entre economia e cobertura (~86% dos sorteios). Elimina cartões atípicos sem esvaziar a cobertura.',
    badgeColor: 'sky',
    filtros: {
      somaMin: 175,
      somaMax: 217,
      paresMin: 6,
      paresMax: 9,
      molduraMin: 8,
      molduraMax: 11,
      primosMin: 4,
      primosMax: 7,
      repetidasMin: 8,
      repetidasMax: 10,
      cruzAtiva: true,
      cruzMin: 4,
      cruzMax: 7,
      validacaoEstritaCruz: false,
      presetEstatistico: 'balanceado',
    },
  },
  agressivo: {
    id: 'agressivo',
    nome: 'Agressivo (Sniper)',
    badge: '±1σ (68%)',
    desvio: '±1σ',
    coberturaConcursos: '~68% dos sorteios',
    corteMedio: '~52%',
    descricao: 'Focado no miolo estatístico rigoroso (~68% dos sorteios). Maior corte no valor total do fechamento com Validação Estrita.',
    badgeColor: 'amber',
    filtros: {
      somaMin: 180,
      somaMax: 210,
      paresMin: 6,
      paresMax: 8,
      molduraMin: 9,
      molduraMax: 11,
      primosMin: 5,
      primosMax: 6,
      repetidasMin: 8,
      repetidasMax: 9,
      cruzAtiva: true,
      cruzMin: 5,
      cruzMax: 6,
      validacaoEstritaCruz: true, // Ativa a Validação Estrita (5 a 6 dezenas na Cruz)
      presetEstatistico: 'agressivo',
    },
  },
};

/**
 * Retorna os parâmetros de filtro correspondentes a um preset selecionado
 */
export function getPresetFilters(
  presetKey: 'conservador' | 'balanceado' | 'agressivo'
): Partial<FilterCriteria> {
  return PRESETS_LOTOFACIL[presetKey]?.filtros || PRESETS_LOTOFACIL.balanceado.filtros;
}
