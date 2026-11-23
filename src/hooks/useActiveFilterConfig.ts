import { useState, useEffect, useCallback } from 'react';
import { FilterCriteria } from '../types/lotofacil';
import { DEFAULT_FILTERS, sanitizeDezenasFixas } from '../services/combinatorics';

const STORAGE_KEY = 'lotosniper_active_filter_config';

/**
 * Normaliza e garante a presença explícita dos 5 novos filtros matemáticos
 * (Intervalos D1–D15, Múltiplos M3–M8, Soma dos Dígitos 63–87, Geometria da Cruz
 * e Equilíbrio de Ranking Histórico), além das regras canônicas de fixas e exclusões.
 */
export function normalizeActiveFilterConfig(
  partialConfig?: Partial<FilterCriteria>,
  baseConfig: FilterCriteria = DEFAULT_FILTERS
): FilterCriteria {
  const merged = {
    ...DEFAULT_FILTERS,
    ...baseConfig,
    ...(partialConfig || {}),
  };

  const isStrictCruz =
    partialConfig?.strictValidation ??
    partialConfig?.validacaoEstritaCruz ??
    merged.strictValidation ??
    merged.validacaoEstritaCruz ??
    false;

  const fixedSanitized = sanitizeDezenasFixas(merged.dezenasFixas || []);
  const modoFixasResolved: 'rotativas' | 'rigidas' =
    fixedSanitized.length >= 3 && merged.modoFixas !== 'rigidas'
      ? 'rotativas'
      : merged.modoFixas ?? 'rotativas';

  const algMin = Math.max(15, Math.min(135, merged.somaAlgarismosMin ?? 63));
  const algMax = Math.max(algMin, Math.min(135, merged.somaAlgarismosMax ?? 87));

  return {
    ...merged,
    // 1. Intervalos Posicionais por Bola (D1 a D15)
    posicionalAtivo: merged.posicionalAtivo ?? true,
    // 2. Múltiplos M(3) a M(8) via Máscaras Bitwise
    multiplosAtivo: merged.multiplosAtivo ?? true,
    // 3. Soma dos Dígitos / Algarismos (63 a 87) + Contagem de Dígitos (22 a 27)
    somaAlgarismosAtiva: merged.somaAlgarismosAtiva ?? true,
    somaAlgarismosMin: algMin,
    somaAlgarismosMax: algMax,
    contagemDigitosAtiva: merged.contagemDigitosAtiva ?? true,
    digitosMin: merged.digitosMin ?? 22,
    digitosMax: merged.digitosMax ?? 27,
    umDigitoMin: merged.umDigitoMin ?? 3,
    umDigitoMax: merged.umDigitoMax ?? 8,
    // 4. Geometria da Cruz (9 dezenas centrais: Linha 3 + Coluna 3)
    cruzAtiva: merged.cruzAtiva ?? true,
    cruzMin: isStrictCruz ? 5 : (merged.cruzMin ?? 4),
    cruzMax: isStrictCruz ? 6 : (merged.cruzMax ?? 7),
    strictValidation: isStrictCruz,
    validacaoEstritaCruz: isStrictCruz,
    // 5. Equilíbrio de Ranking Histórico (Caps Top 5 / Top 10 / Top 15 / Top 20)
    rankingHistoricoAtivo: merged.rankingHistoricoAtivo ?? true,
    // Complementares: Bolas Extremas, Matriz 5x5, Anti-Colisão e Fixas Rotativas K de N
    extremidadesAtiva: merged.extremidadesAtiva ?? true,
    bola1Min: merged.bola1Min ?? 1,
    bola1Max: merged.bola1Max ?? 4,
    bola15Min: merged.bola15Min ?? 22,
    bola15Max: merged.bola15Max ?? 25,
    linhasColunasAtivo: merged.linhasColunasAtivo ?? true,
    maxLinhasCheias: merged.maxLinhasCheias ?? 1,
    maxColunasCheias: merged.maxColunasCheias ?? 1,
    palpiteIneditoAtivo: merged.palpiteIneditoAtivo ?? true,
    hammingDinamicoAtivo: merged.hammingDinamicoAtivo ?? false,
    hammingModo: merged.hammingModo === 'manual' ? 'manual' : 'auto',
    hammingMinimoPersonalizado: Math.max(
      1,
      Math.min(6, Math.round(merged.hammingMinimoPersonalizado ?? 3))
    ),
    antiColisaoHistoricaAtiva: merged.antiColisaoHistoricaAtiva ?? true,
    antiPadraoViciadoAtivo: merged.antiPadraoViciadoAtivo ?? true,
    autoCalibrarSomaUniverso: merged.autoCalibrarSomaUniverso ?? true,
    modoFixas: modoFixasResolved,
    dezenasFixas: fixedSanitized,
    dezenasExcluidas: Array.from(new Set(merged.dezenasExcluidas || [])).sort((a, b) => a - b),
  };
}

/**
 * Hook personalizado para gerenciar e persistir deterministicamente o estado do 'activeFilterConfig'.
 * Captura todos os parâmetros (pares/ímpares, primos, moldura, repetidas, soma, linhas/colunas,
 * sequências consecutivas, Cruz da Lotofácil, Bolas Extremas, Posicional D1–D15, Múltiplos M3–M8,
 * Soma dos Dígitos 63–87 e Equilíbrio de Ranking Histórico) e sincroniza com a esteira geradora.
 */
export function useActiveFilterConfig(initialFilters?: Partial<FilterCriteria>) {
  const [activeFilterConfig, setActiveFilterConfigState] = useState<FilterCriteria>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return normalizeActiveFilterConfig(initialFilters, normalizeActiveFilterConfig(parsed));
      }
    } catch (e) {
      console.warn('Erro ao carregar activeFilterConfig do localStorage:', e);
    }
    return normalizeActiveFilterConfig(initialFilters);
  });

  // Salva no localStorage e dispara evento para atualização síncrona
  const setActiveFilterConfig = useCallback(
    (
      newConfigOrFn:
        | FilterCriteria
        | ((prev: FilterCriteria) => FilterCriteria)
    ) => {
      setActiveFilterConfigState((prev) => {
        const rawNext =
          typeof newConfigOrFn === 'function' ? newConfigOrFn(prev) : newConfigOrFn;
        const next = normalizeActiveFilterConfig(rawNext, prev);
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
          if (typeof window !== 'undefined') {
            window.dispatchEvent(
              new CustomEvent('lotosniper-active-filter-updated', { detail: next })
            );
          }
        } catch (e) {
          console.warn('Erro ao salvar activeFilterConfig no localStorage:', e);
        }
        return next;
      });
    },
    []
  );

  /**
   * Captura e normaliza todos os parâmetros das Sugestões Estratégicas em um objeto unificado
   * garantindo que nenhum dos 5 novos filtros ou regras canônicas fique indefinido.
   */
  const applyStrategicFilters = useCallback(
    (strategicParams: Partial<FilterCriteria>) => {
      setActiveFilterConfig((prev) => normalizeActiveFilterConfig(strategicParams, prev));
    },
    [setActiveFilterConfig]
  );

  /**
   * Trava booleana de Validação Estrita da Cruz da Lotofácil (5 a 6 dezenas).
   * Se ativado, o motor descarta automaticamente qualquer combinação fora da Zona de Ouro (5 a 6).
   */
  const setStrictValidation = useCallback(
    (enabled: boolean) => {
      setActiveFilterConfig((prev) =>
        normalizeActiveFilterConfig(
          {
            strictValidation: enabled,
            validacaoEstritaCruz: enabled,
            cruzAtiva: true,
            ...(enabled ? { cruzMin: 5, cruzMax: 6 } : { cruzMin: 4, cruzMax: 7 }),
          },
          prev
        )
      );
    },
    [setActiveFilterConfig]
  );

  const toggleStrictValidation = useCallback(() => {
    setActiveFilterConfig((prev) => {
      const nextVal = !(prev.strictValidation ?? prev.validacaoEstritaCruz ?? false);
      return normalizeActiveFilterConfig(
        {
          strictValidation: nextVal,
          validacaoEstritaCruz: nextVal,
          cruzAtiva: true,
          ...(nextVal ? { cruzMin: 5, cruzMax: 6 } : { cruzMin: 4, cruzMax: 7 }),
        },
        prev
      );
    });
  }, [setActiveFilterConfig]);

  /**
   * Restaura os filtros para a calibração canônica oficial padrão do LotoSniper
   */
  const resetToCanonicalFilters = useCallback(() => {
    setActiveFilterConfig(normalizeActiveFilterConfig(DEFAULT_FILTERS));
  }, [setActiveFilterConfig]);

  // Listener para sincronização multi-abas ou disparo global
  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY && event.newValue) {
        try {
          const parsed = JSON.parse(event.newValue);
          setActiveFilterConfigState(normalizeActiveFilterConfig(parsed));
        } catch {}
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  return {
    activeFilterConfig,
    setActiveFilterConfig,
    applyStrategicFilters,
    resetToCanonicalFilters,
    setStrictValidation,
    toggleStrictValidation,
  };
}
