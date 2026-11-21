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
    descricao: 'Cobre ~95% dos concursos históricos. Redução branda de custo com preservação máxima da garantia matemática e proteção de caudas.',
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
      fibonacciMin: 3,
      fibonacciMax: 6,
      repetidasMin: 7,
      repetidasMax: 11,
      maxConsecutivas: 6,
      estratificacaoCaudaAtiva: true,
      cruzAtiva: true,
      cruzMin: 4,
      cruzMax: 7,
      validacaoEstritaCruz: false,
      posicionalAtivo: true,
      multiplosAtivo: false,
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
      rankingHistoricoAtivo: false,
      palpiteIneditoAtivo: true,
      antiColisaoHistoricaAtiva: true,
      presetEstatistico: 'conservador',
    },
  },
  balanceado: {
    id: 'balanceado',
    nome: 'Equilíbrio Pro (Recomendado)',
    badge: 'Auditado • 75/15/10',
    desvio: '±1.5σ',
    coberturaConcursos: '~88% dos sorteios',
    corteMedio: '~26%',
    descricao: 'Preset padrão validado por auditoria (Soma 175–220 com estratificação 75% Central 180–215 / 15% Alta / 10% Baixa, 6–8 Pares, 8–11 Moldura, 4–7 Primos, 3–6 Fibonacci, 7–10 Repetidas e até 6 consecutivas).',
    badgeColor: 'sky',
    filtros: {
      somaMin: 175,
      somaMax: 220,
      paresMin: 6,
      paresMax: 8,
      molduraMin: 8,
      molduraMax: 11,
      primosMin: 4,
      primosMax: 7,
      fibonacciMin: 3,
      fibonacciMax: 6,
      repetidasMin: 7,
      repetidasMax: 10,
      maxConsecutivas: 6,
      estratificacaoCaudaAtiva: true,
      autoCalibrarSomaUniverso: true,
      cruzAtiva: true,
      cruzMin: 4,
      cruzMax: 7,
      validacaoEstritaCruz: false,
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
      antiColisaoHistoricaAtiva: true,
      presetEstatistico: 'balanceado',
    },
  },
  agressivo: {
    id: 'agressivo',
    nome: 'Agressivo (Sniper)',
    badge: '±1σ (180–215)',
    desvio: '±1σ',
    coberturaConcursos: '~72% dos sorteios',
    corteMedio: '~48%',
    descricao: 'Focado na Zona Central auditada (180–215) com poda posicional D1–D15, Múltiplos M3–M8, Ranking Histórico e Cruz Estrita.',
    badgeColor: 'amber',
    filtros: {
      somaMin: 180,
      somaMax: 215,
      paresMin: 6,
      paresMax: 8,
      molduraMin: 9,
      molduraMax: 11,
      primosMin: 5,
      primosMax: 6,
      fibonacciMin: 4,
      fibonacciMax: 6,
      repetidasMin: 7,
      repetidasMax: 9,
      maxConsecutivas: 5,
      estratificacaoCaudaAtiva: true,
      cruzAtiva: true,
      cruzMin: 5,
      cruzMax: 6,
      validacaoEstritaCruz: true, // Ativa a Validação Estrita (5 a 6 dezenas na Cruz)
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
      antiColisaoHistoricaAtiva: true,
      presetEstatistico: 'agressivo',
    },
  },
};

export const EQUILIBRIO_PRO_PRESET = PRESETS_LOTOFACIL.balanceado;

/**
 * Retorna os parâmetros de filtro correspondentes a um preset selecionado
 */
export function getPresetFilters(
  presetKey: 'conservador' | 'balanceado' | 'agressivo'
): Partial<FilterCriteria> {
  return PRESETS_LOTOFACIL[presetKey]?.filtros || PRESETS_LOTOFACIL.balanceado.filtros;
}
