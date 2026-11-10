import { useState, useEffect, useCallback } from 'react';
import { FilterCriteria } from '../types/lotofacil';
import { DEFAULT_FILTERS } from '../services/combinatorics';

const STORAGE_KEY = 'lotosniper_active_filter_config';

/**
 * Hook personalizado para gerenciar e persistir deterministicamente o estado do 'activeFilterConfig'.
 * Captura todos os parâmetros (pares/ímpares, primos, moldura, repetidas, soma, linhas/colunas,
 * sequências consecutivas, Cruz da Lotofácil e Bolas Extremas) e sincroniza com a esteira geradora.
 */
export function useActiveFilterConfig(initialFilters?: Partial<FilterCriteria>) {
  const [activeFilterConfig, setActiveFilterConfigState] = useState<FilterCriteria>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          ...DEFAULT_FILTERS,
          ...parsed,
          ...(initialFilters || {}),
        };
      }
    } catch (e) {
      console.warn('Erro ao carregar activeFilterConfig do localStorage:', e);
    }
    return {
      ...DEFAULT_FILTERS,
      ...(initialFilters || {}),
    };
  });

  // Salva no localStorage e dispara evento para atualização síncrona
  const setActiveFilterConfig = useCallback(
    (
      newConfigOrFn:
        | FilterCriteria
        | ((prev: FilterCriteria) => FilterCriteria)
    ) => {
      setActiveFilterConfigState((prev) => {
        const next =
          typeof newConfigOrFn === 'function' ? newConfigOrFn(prev) : newConfigOrFn;
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
          window.dispatchEvent(
            new CustomEvent('lotosniper-active-filter-updated', { detail: next })
          );
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
   * garantindo que nenhuma propriedade fique indefinida ou com hardcoded obsoleto.
   */
  const applyStrategicFilters = useCallback(
    (strategicParams: Partial<FilterCriteria>) => {
      setActiveFilterConfig((prev) => {
        const normalized: FilterCriteria = {
          ...prev,
          ...strategicParams,
          // Garante integridade das regras canônicas de suporte
          cruzAtiva: strategicParams.cruzAtiva ?? prev.cruzAtiva ?? true,
          cruzMin: strategicParams.cruzMin ?? prev.cruzMin ?? 4,
          cruzMax: strategicParams.cruzMax ?? prev.cruzMax ?? 7,
          extremidadesAtiva: strategicParams.extremidadesAtiva ?? prev.extremidadesAtiva ?? true,
          bola1Min: strategicParams.bola1Min ?? prev.bola1Min ?? 1,
          bola1Max: strategicParams.bola1Max ?? prev.bola1Max ?? 4,
          bola15Min: strategicParams.bola15Min ?? prev.bola15Min ?? 22,
          bola15Max: strategicParams.bola15Max ?? prev.bola15Max ?? 25,
          antiColisaoHistoricaAtiva:
            strategicParams.antiColisaoHistoricaAtiva ?? prev.antiColisaoHistoricaAtiva ?? true,
          antiPadraoViciadoAtivo:
            strategicParams.antiPadraoViciadoAtivo ?? prev.antiPadraoViciadoAtivo ?? true,
          strictValidation:
            strategicParams.strictValidation ??
            strategicParams.validacaoEstritaCruz ??
            prev.strictValidation ??
            prev.validacaoEstritaCruz ??
            false,
          validacaoEstritaCruz:
            strategicParams.strictValidation ??
            strategicParams.validacaoEstritaCruz ??
            prev.strictValidation ??
            prev.validacaoEstritaCruz ??
            false,
          dezenasFixas: strategicParams.dezenasFixas ?? prev.dezenasFixas ?? [],
          dezenasExcluidas: strategicParams.dezenasExcluidas ?? prev.dezenasExcluidas ?? [],
        };
        return normalized;
      });
    },
    [setActiveFilterConfig]
  );

  /**
   * Trava booleana de Validação Estrita da Cruz da Lotofácil (5 a 6 dezenas).
   * Se ativado, o motor descarta automaticamente qualquer combinação fora da Zona de Ouro (5 a 6).
   */
  const setStrictValidation = useCallback(
    (enabled: boolean) => {
      setActiveFilterConfig((prev) => ({
        ...prev,
        strictValidation: enabled,
        validacaoEstritaCruz: enabled,
        ...(enabled ? { cruzMin: 5, cruzMax: 6 } : {}),
      }));
    },
    [setActiveFilterConfig]
  );

  const toggleStrictValidation = useCallback(() => {
    setActiveFilterConfig((prev) => {
      const nextVal = !(prev.strictValidation ?? prev.validacaoEstritaCruz ?? false);
      return {
        ...prev,
        strictValidation: nextVal,
        validacaoEstritaCruz: nextVal,
        ...(nextVal ? { cruzMin: 5, cruzMax: 6 } : {}),
      };
    });
  }, [setActiveFilterConfig]);

  /**
   * Restaura os filtros para a calibração canônica oficial padrão do LotoSniper
   */
  const resetToCanonicalFilters = useCallback(() => {
    setActiveFilterConfig({ ...DEFAULT_FILTERS });
  }, [setActiveFilterConfig]);

  // Listener para sincronização multi-abas ou disparo global
  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY && event.newValue) {
        try {
          const parsed = JSON.parse(event.newValue);
          setActiveFilterConfigState(parsed);
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
