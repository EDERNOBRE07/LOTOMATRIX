import React, { useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sliders, Sparkles, Activity, CheckCircle2, Info } from 'lucide-react';
import { filterLayoutTransition } from '../utils/staggerAnimation';
import { FilterCriteria, GameTicket, LotofacilDraw } from '../types/lotofacil';
import { CONCURSO_ATUAL } from '../data/lotofacilData';
import { getHistoricalNDraws } from '../services/historical100Draws';
import {
  calculateDynamicHammingSuggestion,
  criarMascara,
  popcount,
} from '../services/combinatorics';
import { soundService } from '../services/soundAlert';

interface FiltroHammingDinamicoCardProps {
  filters: FilterCriteria;
  onChange: (nextFilters: FilterCriteria) => void;
  latestDraw?: LotofacilDraw;
  universeSize: number;
  maxTickets: number;
  generatedTickets?: GameTicket[];
}

const TOLERANCE_DESCRIPTIONS: Record<number, { label: string; overlap: string }> = {
  1: { label: 'Máxima proximidade', overlap: 'até 14 dezenas iguais' },
  2: { label: 'Alta concentração', overlap: 'até 13 dezenas iguais' },
  3: { label: 'Equilíbrio ideal', overlap: 'até 12 dezenas iguais' },
  4: { label: 'Alta dispersão', overlap: 'até 11 dezenas iguais' },
  5: { label: 'Cobertura ampla', overlap: 'até 10 dezenas iguais' },
  6: { label: 'Dispersão máxima', overlap: 'até 9 dezenas iguais' },
};

export const FiltroHammingDinamicoCard: React.FC<FiltroHammingDinamicoCardProps> = ({
  filters,
  onChange,
  latestDraw = CONCURSO_ATUAL,
  universeSize,
  maxTickets,
  generatedTickets = [],
}) => {
  const effectiveUniverse = Math.max(15, Math.min(25, universeSize || 18));

  // Últimos 5 resultados oficiais e cálculo automático do limiar ideal de Hamming
  const recommendation = useMemo(() => {
    const last5Draws = getHistoricalNDraws(5, latestDraw);
    return calculateDynamicHammingSuggestion(last5Draws, effectiveUniverse, maxTickets);
  }, [latestDraw, effectiveUniverse, maxTickets]);

  const isEnabled = Boolean(filters.hammingDinamicoAtivo);
  const hammingMode: 'auto' | 'manual' = filters.hammingModo === 'manual' ? 'manual' : 'auto';
  const configuredThreshold = Math.max(
    1,
    Math.min(
      6,
      Math.round(
        hammingMode === 'auto'
          ? recommendation.suggestedMinHamming
          : filters.hammingMinimoPersonalizado ?? recommendation.suggestedMinHamming
      )
    )
  );
  const effectiveAppliedThreshold = Math.min(
    configuredThreshold,
    recommendation.maxPossibleHamming
  );

  // Mantém o limiar sincronizado no modo automático ao mudar universo ou concurso mais recente
  const latestFiltersRef = React.useRef(filters);
  const latestOnChangeRef = React.useRef(onChange);
  latestFiltersRef.current = filters;
  latestOnChangeRef.current = onChange;

  useEffect(() => {
    if (
      isEnabled &&
      hammingMode === 'auto' &&
      latestFiltersRef.current.hammingMinimoPersonalizado !== recommendation.suggestedMinHamming
    ) {
      latestOnChangeRef.current({
        ...latestFiltersRef.current,
        hammingMinimoPersonalizado: recommendation.suggestedMinHamming,
      });
    }
  }, [isEnabled, hammingMode, recommendation.suggestedMinHamming]);

  // Auditoria real da distância de Hamming entre os bilhetes atualmente gerados na mesa
  const liveMatrixStats = useMemo(() => {
    if (!generatedTickets || generatedTickets.length < 2) return null;
    const masks = generatedTickets.map((t) => criarMascara(t.dezenas));
    let minDist = 15;
    let sumDist = 0;
    let pairs = 0;
    for (let i = 0; i < masks.length; i++) {
      for (let j = i + 1; j < masks.length; j++) {
        const d = 15 - popcount(masks[i] & masks[j]);
        if (d < minDist) minDist = d;
        sumDist += d;
        pairs++;
      }
    }
    return {
      minDist,
      avgDist: pairs > 0 ? sumDist / pairs : 0,
      meetsThreshold: minDist >= effectiveAppliedThreshold,
    };
  }, [generatedTickets, effectiveAppliedThreshold]);

  const handleToggleActive = () => {
    soundService.playFilterClick();
    const nextActive = !isEnabled;
    onChange({
      ...filters,
      hammingDinamicoAtivo: nextActive,
      hammingModo: nextActive ? filters.hammingModo || 'auto' : filters.hammingModo || 'auto',
      hammingMinimoPersonalizado: nextActive
        ? hammingMode === 'auto'
          ? recommendation.suggestedMinHamming
          : configuredThreshold
        : filters.hammingMinimoPersonalizado ?? recommendation.suggestedMinHamming,
    });
  };

  const handleSetAutoMode = () => {
    soundService.playFilterClick();
    onChange({
      ...filters,
      hammingDinamicoAtivo: true,
      hammingModo: 'auto',
      hammingMinimoPersonalizado: recommendation.suggestedMinHamming,
    });
  };

  const handleSetManualThreshold = (value: number) => {
    const clamped = Math.max(1, Math.min(6, Math.round(value)));
    onChange({
      ...filters,
      hammingDinamicoAtivo: true,
      hammingModo: 'manual',
      hammingMinimoPersonalizado: clamped,
    });
  };

  const volatilityLabel =
    recommendation.volatilityLevel === 'baixa'
      ? 'Baixa Volatilidade (Alta Retenção)'
      : recommendation.volatilityLevel === 'alta'
      ? 'Alta Volatilidade (Renovação Forte)'
      : 'Volatilidade Moderada (Equilibrada)';

  const toleranceInfo =
    TOLERANCE_DESCRIPTIONS[configuredThreshold] || TOLERANCE_DESCRIPTIONS[3];

  return (
    <motion.div
      layout
      transition={filterLayoutTransition}
      className={`rounded-xl border p-4 space-y-4 transition-colors ${
        isEnabled
          ? 'bg-slate-950/95 border-amber-400/70 shadow-lg shadow-amber-500/10 ring-1 ring-amber-400/25'
          : 'bg-slate-950/65 border-slate-800'
      }`}
    >
      {/* Cabeçalho e Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-400">
            <span className="font-semibold text-amber-400">Filtro Avançado de Dispersão</span>
            <span aria-hidden="true">·</span>
            <span>Baseado nos últimos 5 resultados</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">
              Sugestão: Hamming ≥ {recommendation.suggestedMinHamming}
            </span>
          </div>
          <h4 className="text-sm font-bold text-white flex items-center gap-2 flex-wrap">
            <Sliders className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Distância de Hamming Dinâmica</span>
            {isEnabled && (
              <span className="text-[10px] font-mono font-black px-2 py-0.5 rounded bg-amber-400/20 text-amber-300 border border-amber-400/50">
                PRIORIZADO • dH ≥ {effectiveAppliedThreshold}
              </span>
            )}
          </h4>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleSetAutoMode}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
              isEnabled && hammingMode === 'auto'
                ? 'bg-amber-500/20 text-amber-300 border-amber-400/60'
                : 'bg-slate-900 text-slate-300 border-slate-700 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Auto (≥ {recommendation.suggestedMinHamming})</span>
          </button>

          <button
            type="button"
            onClick={handleToggleActive}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold border transition cursor-pointer whitespace-nowrap shrink-0 ${
              isEnabled
                ? 'bg-amber-400 text-slate-950 border-amber-300'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
            }`}
          >
            {isEnabled ? 'Filtro Ativo' : 'Ativar Filtro'}
          </button>
        </div>
      </div>

      {/* Diagnóstico dos Últimos 5 Resultados */}
      <motion.div layout transition={filterLayoutTransition} className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 pt-3 border-t border-slate-800/80">
        <div className="lg:col-span-6 space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-200 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-sky-400" />
              <span>Leitura dos Últimos 5 Concursos</span>
            </span>
            <span
              className={`font-semibold text-xs ${
                recommendation.volatilityLevel === 'alta'
                  ? 'text-amber-300'
                  : recommendation.volatilityLevel === 'baixa'
                  ? 'text-sky-300'
                  : 'text-emerald-300'
              }`}
            >
              {volatilityLabel}
            </span>
          </div>

          <div className="grid grid-cols-5 gap-1.5">
            {recommendation.analyzedDraws.map((item) => (
              <div
                key={item.concurso}
                className="rounded-lg bg-slate-900/90 border border-slate-800 px-2 py-2 text-center space-y-0.5"
              >
                <div className="text-[11px] font-mono tabular-nums font-bold text-slate-200">
                  #{item.concurso}
                </div>
                <div className="text-xs font-mono tabular-nums font-bold text-amber-300">
                  {item.distanceToPrev !== null ? `dH ${item.distanceToPrev}` : 'Base'}
                </div>
                <div className="text-[10px] font-mono tabular-nums text-slate-400">
                  {item.repeatedFromPrev !== null ? `${item.repeatedFromPrev} rep.` : item.data.slice(0, 5)}
                </div>
              </div>
            ))}
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">{recommendation.rationale}</p>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-mono tabular-nums text-slate-400">
            <span>Troca média: {recommendation.avgConsecutiveDistance.toFixed(1)} dez./conc.</span>
            <span aria-hidden="true">·</span>
            <span>Repetidas médias: {recommendation.avgRepeated.toFixed(1)}</span>
            <span aria-hidden="true">·</span>
            <span>Dist. par-a-par: {recommendation.avgPairwiseDistance.toFixed(1)}</span>
          </div>
        </div>

        {/* Ajuste de Tolerância de Proximidade entre Jogos Gerados */}
        <div className="lg:col-span-6 space-y-3 lg:border-l lg:border-slate-800/80 lg:pl-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <span className="text-xs font-semibold text-slate-200 block">
                Tolerância de Proximidade entre Jogos
              </span>
              <span className="text-[11px] text-slate-400">
                Mínimo de dezenas diferentes entre qualquer par de cartões gerados
              </span>
            </div>
            <div className="text-right shrink-0">
              <div className="text-base font-bold font-mono tabular-nums text-amber-300">
                dH ≥ {configuredThreshold}
              </div>
              <div className="text-[11px] text-slate-400">{toleranceInfo.overlap}</div>
            </div>
          </div>

          {/* Slider Contínuo + Botões Discretos 1..6 */}
          <div className="space-y-2">
            <input
              type="range"
              min={1}
              max={6}
              step={1}
              value={configuredThreshold}
              onChange={(e) => handleSetManualThreshold(Number(e.target.value))}
              aria-label="Limiar mínimo de distância de Hamming"
              className="w-full accent-amber-400 cursor-pointer h-2 bg-slate-800 rounded-lg"
            />
            <div className="grid grid-cols-6 gap-1.5">
              {[1, 2, 3, 4, 5, 6].map((val) => {
                const exceedsUniverse = val > recommendation.maxPossibleHamming;
                const isSuggested = val === recommendation.suggestedMinHamming;
                const isSelected = configuredThreshold === val;
                return (
                  <button
                    key={val}
                    type="button"
                    onClick={() => {
                      soundService.playFilterClick();
                      handleSetManualThreshold(val);
                    }}
                    className={`py-1.5 rounded-lg text-xs font-mono tabular-nums font-bold border transition cursor-pointer ${
                      isSelected
                        ? 'bg-amber-400 text-slate-950 border-amber-300'
                        : exceedsUniverse
                        ? 'bg-slate-900/50 text-slate-500 border-slate-800 hover:border-slate-700'
                        : isSuggested
                        ? 'bg-slate-900 text-amber-300 border-amber-500/40 hover:border-amber-400'
                        : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-600'
                    }`}
                    title={
                      exceedsUniverse
                        ? `Com ${effectiveUniverse} dezenas no universo, a distância física máxima é ${recommendation.maxPossibleHamming}`
                        : `Mínimo de ${val} dezena(s) diferente(s) (${TOLERANCE_DESCRIPTIONS[val].overlap})`
                    }
                  >
                    {val}
                    {isSuggested && !isSelected ? '*' : ''}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
            <span>
              Perfil selecionado:{' '}
              <strong className="text-slate-200">{toleranceInfo.label}</strong> (
              {hammingMode === 'auto' ? 'Automático' : 'Ajuste manual'})
            </span>
            {configuredThreshold > recommendation.maxPossibleHamming && (
              <span className="text-amber-300 flex items-center gap-1">
                <Info className="w-3.5 h-3.5 shrink-0" />
                <span>
                  Limitado a dH ≥ {effectiveAppliedThreshold} no universo de {effectiveUniverse} dez.
                </span>
              </span>
            )}
          </div>

          {/* Auditoria da Matriz Gerada Atual */}
          {liveMatrixStats && (
            <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="text-slate-400 flex items-center gap-1.5">
                <CheckCircle2
                  className={`w-3.5 h-3.5 ${
                    liveMatrixStats.meetsThreshold ? 'text-emerald-400' : 'text-amber-400'
                  }`}
                />
                <span>Cartões atuais na mesa:</span>
              </span>
              <span className="font-mono tabular-nums text-slate-200">
                Mín: <strong>dH {liveMatrixStats.minDist}</strong> · Média:{' '}
                <strong>{liveMatrixStats.avgDist.toFixed(2)}</strong>
              </span>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};
