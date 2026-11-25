import { FilterCriteria } from '../types/lotofacil';

export type PresetId = 'conservador' | 'balanceado' | 'agressivo' | 'estratificado';

export interface PresetLotoFacilItem {
  id: PresetId;
  nome: string;
  badge: string;
  desvio: string;
  coberturaConcursos: string;
  corteMedio: string;
  descricao: string;
  badgeColor: 'emerald' | 'sky' | 'amber' | 'violet';
  filtros: Partial<FilterCriteria>;
}

/**
 * Presets Estatísticos Canônicos da Lotofácil
 * Calibrados pela distribuição normal histórica de sorteios da Caixa.
 */
export const PRESETS_LOTOFACIL: Record<PresetId, PresetLotoFacilItem> = {
  conservador: {
    id: 'conservador',
    nome: 'Alta Performance (Padrão Auditado)',
    badge: 'Core 4 • >85% Sobrevivência',
    desvio: '±2σ',
    coberturaConcursos: '~88% dos concursos',
    corteMedio: '~18%',
    descricao: 'Aplica apenas os 4 filtros de comprovação estatística (Soma ampla 165–225, Paridade 5–9, Moldura 8–12 e Repetidas 6–11), eliminando o over-filtering de apostilas que podava jogos de 13–15 pontos.',
    badgeColor: 'emerald',
    filtros: {
      somaMin: 165,
      somaMax: 225,
      paresMin: 5,
      paresMax: 9,
      molduraMin: 8,
      molduraMax: 12,
      primosMin: 3,
      primosMax: 8,
      fibonacciMin: 2,
      fibonacciMax: 6,
      repetidasMin: 6,
      repetidasMax: 11,
      maxConsecutivas: 7,
      estratificacaoCaudaAtiva: false,
      autoCalibrarSomaUniverso: true,
      cruzAtiva: false,
      cruzMin: 3,
      cruzMax: 8,
      validacaoEstritaCruz: false,
      strictValidation: false,
      extremidadesAtiva: false,
      antiPadraoViciadoAtivo: false,
      posicionalAtivo: false,
      multiplosAtivo: false,
      contagemDigitosAtiva: false,
      digitosMin: 22,
      digitosMax: 27,
      umDigitoMin: 3,
      umDigitoMax: 8,
      somaAlgarismosAtiva: false,
      somaAlgarismosMin: 63,
      somaAlgarismosMax: 87,
      linhasColunasAtivo: false,
      linhasMin: 1,
      linhasMax: 5,
      colunasMin: 1,
      colunasMax: 5,
      maxLinhasCheias: 1,
      maxColunasCheias: 1,
      quadrantesAtivo: false,
      rankingHistoricoAtivo: false,
      curvaAbcAtiva: false,
      vaziosAtivos: false,
      robustezEstatisticaAtiva: false,
      palpiteIneditoAtivo: true,
      antiColisaoHistoricaAtiva: true,
      fallbackProgressivoAtivo: true,
      modoRigorFiltros: 'conservador',
      presetEstatistico: 'conservador',
    },
  },
  balanceado: {
    id: 'balanceado',
    nome: 'Equilíbrio Pro (Core Calibrado)',
    badge: 'Auditado • Core 4 + Primos',
    desvio: '±1.5σ',
    coberturaConcursos: '~78% dos sorteios',
    corteMedio: '~30%',
    descricao: 'Foco na faixa central estatística (Soma 170–222, 6–9 Pares, 8–11 Moldura, 6–11 Repetidas, 4–7 Primos e Consecutivas ≤ 6). Filtros secundários de apostila permanecem apenas no Soft Scoring do scoreIA.',
    badgeColor: 'sky',
    filtros: {
      somaMin: 170,
      somaMax: 222,
      paresMin: 6,
      paresMax: 9,
      molduraMin: 8,
      molduraMax: 11,
      primosMin: 4,
      primosMax: 7,
      fibonacciMin: 2,
      fibonacciMax: 6,
      repetidasMin: 6,
      repetidasMax: 11,
      maxConsecutivas: 6,
      estratificacaoCaudaAtiva: false,
      autoCalibrarSomaUniverso: true,
      cruzAtiva: false,
      cruzMin: 4,
      cruzMax: 7,
      validacaoEstritaCruz: false,
      strictValidation: false,
      extremidadesAtiva: false,
      antiPadraoViciadoAtivo: false,
      posicionalAtivo: false,
      multiplosAtivo: false,
      contagemDigitosAtiva: false,
      digitosMin: 22,
      digitosMax: 27,
      umDigitoMin: 3,
      umDigitoMax: 8,
      somaAlgarismosAtiva: false,
      somaAlgarismosMin: 63,
      somaAlgarismosMax: 87,
      linhasColunasAtivo: false,
      linhasMin: 1,
      linhasMax: 5,
      colunasMin: 1,
      colunasMax: 5,
      maxLinhasCheias: 1,
      maxColunasCheias: 1,
      quadrantesAtivo: false,
      rankingHistoricoAtivo: false,
      curvaAbcAtiva: false,
      vaziosAtivos: false,
      robustezEstatisticaAtiva: false,
      palpiteIneditoAtivo: true,
      antiColisaoHistoricaAtiva: true,
      fallbackProgressivoAtivo: true,
      modoRigorFiltros: 'conservador',
      presetEstatistico: 'balanceado',
    },
  },
  agressivo: {
    id: 'agressivo',
    nome: 'Ousado (Restritivo • Custo Mínimo)',
    badge: '±1σ • Alta Poda',
    desvio: '±1σ',
    coberturaConcursos: '~52% dos sorteios',
    corteMedio: '~55%',
    descricao: 'Corte mais severo na faixa central (Soma 178–216, 6–8 Pares, 8–11 Moldura, 7–10 Repetidas). Use apenas para reduzir volume extremo em universos maiores — risco elevado de podar zebras.',
    badgeColor: 'amber',
    filtros: {
      somaMin: 178,
      somaMax: 216,
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
      estratificacaoCaudaAtiva: false,
      cruzAtiva: false,
      cruzMin: 4,
      cruzMax: 7,
      validacaoEstritaCruz: false,
      strictValidation: false,
      extremidadesAtiva: false,
      antiPadraoViciadoAtivo: false,
      posicionalAtivo: false,
      multiplosAtivo: false,
      contagemDigitosAtiva: false,
      digitosMin: 22,
      digitosMax: 27,
      umDigitoMin: 3,
      umDigitoMax: 8,
      somaAlgarismosAtiva: false,
      somaAlgarismosMin: 63,
      somaAlgarismosMax: 87,
      linhasColunasAtivo: false,
      linhasMin: 1,
      linhasMax: 5,
      colunasMin: 1,
      colunasMax: 5,
      maxLinhasCheias: 1,
      maxColunasCheias: 1,
      quadrantesAtivo: false,
      rankingHistoricoAtivo: false,
      palpiteIneditoAtivo: true,
      antiColisaoHistoricaAtiva: true,
      fallbackProgressivoAtivo: true,
      presetEstatistico: 'agressivo',
    },
  },
  estratificado: {
    id: 'estratificado',
    nome: 'Estratificado (Proteção de Caudas)',
    badge: '75/15/10 Caudas',
    desvio: 'Anti-Cisne',
    coberturaConcursos: '~92% dos sorteios',
    corteMedio: '~15%',
    descricao: 'Indicado apenas para matrizes grandes (≥ 32 jogos): distribui 75% na Zona Central (180–215), 15% Cauda Alta (216–230) e 10% Cauda Baixa (155–179), sem travas tóxicas de apostila.',
    badgeColor: 'violet',
    filtros: {
      somaMin: 165,
      somaMax: 225,
      paresMin: 5,
      paresMax: 9,
      molduraMin: 8,
      molduraMax: 12,
      primosMin: 3,
      primosMax: 8,
      fibonacciMin: 2,
      fibonacciMax: 6,
      repetidasMin: 6,
      repetidasMax: 11,
      maxConsecutivas: 7,
      estratificacaoCaudaAtiva: true,
      autoCalibrarSomaUniverso: true,
      cruzAtiva: false,
      cruzMin: 4,
      cruzMax: 7,
      validacaoEstritaCruz: false,
      strictValidation: false,
      extremidadesAtiva: false,
      antiPadraoViciadoAtivo: false,
      posicionalAtivo: false,
      multiplosAtivo: false,
      contagemDigitosAtiva: false,
      digitosMin: 22,
      digitosMax: 27,
      umDigitoMin: 3,
      umDigitoMax: 8,
      somaAlgarismosAtiva: false,
      somaAlgarismosMin: 63,
      somaAlgarismosMax: 87,
      linhasColunasAtivo: false,
      linhasMin: 1,
      linhasMax: 5,
      colunasMin: 1,
      colunasMax: 5,
      maxLinhasCheias: 1,
      maxColunasCheias: 1,
      quadrantesAtivo: false,
      rankingHistoricoAtivo: false,
      palpiteIneditoAtivo: true,
      antiColisaoHistoricaAtiva: true,
      fallbackProgressivoAtivo: true,
      modoRigorFiltros: 'conservador',
      presetEstatistico: 'estratificado',
    },
  },
};

export const EQUILIBRIO_PRO_PRESET = PRESETS_LOTOFACIL.balanceado;

/**
 * Retorna os parâmetros de filtro correspondentes a um preset selecionado
 */
export function getPresetFilters(presetKey: PresetId): Partial<FilterCriteria> {
  return PRESETS_LOTOFACIL[presetKey]?.filtros || PRESETS_LOTOFACIL.balanceado.filtros;
}

/**
 * Identifica qual preset auditado corresponde exatamente às faixas principais do FilterCriteria ativo
 */
export function detectActivePreset(
  filters?: FilterCriteria
): 'balanceado' | 'agressivo' | 'conservador' | 'estratificado' | 'personalizado' {
  if (!filters) return 'balanceado';
  const keys: PresetId[] = [
    'estratificado',
    'balanceado',
    'agressivo',
    'conservador',
  ];

  for (const key of keys) {
    const p = PRESETS_LOTOFACIL[key].filtros;
    const matchesCore =
      filters.somaMin === p.somaMin &&
      filters.somaMax === p.somaMax &&
      filters.paresMin === p.paresMin &&
      filters.paresMax === p.paresMax &&
      filters.molduraMin === p.molduraMin &&
      filters.molduraMax === p.molduraMax &&
      filters.primosMin === p.primosMin &&
      filters.primosMax === p.primosMax &&
      filters.fibonacciMin === p.fibonacciMin &&
      filters.fibonacciMax === p.fibonacciMax &&
      filters.repetidasMin === p.repetidasMin &&
      filters.repetidasMax === p.repetidasMax &&
      filters.maxConsecutivas === p.maxConsecutivas &&
      (key !== 'estratificado' || filters.estratificacaoCaudaAtiva === true);

    if (matchesCore) return key;
  }

  return 'personalizado';
}

