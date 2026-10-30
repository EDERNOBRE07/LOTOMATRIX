import React, { useState, useMemo } from 'react';
import { LotofacilDraw, DezenaStats } from '../types/lotofacil';
import { CONCURSO_ATUAL, DEZENAS_STATS } from '../data/lotofacilData';
import { soundService } from '../services/soundAlert';
import {
  RotateCw,
  Flame,
  Clock,
  Sparkles,
  Zap,
  Target,
  Layers,
  CheckCircle2,
  Sliders,
  Check,
  ShieldCheck,
  ArrowRight,
  Info,
} from 'lucide-react';

export type CycleTendencyMode = 'pendentes' | 'frequentes' | 'hibrido' | 'off';
export type CycleIntensity = 'leve' | 'moderado' | 'agressivo';

export interface CycleTendencyConfig {
  enabled: boolean;
  mode: CycleTendencyMode;
  intensity: CycleIntensity;
  fixedPending: boolean;
}

interface PainelTendenciaCicloProps {
  latestDraw?: LotofacilDraw;
  dynamicStats?: DezenaStats[];
  cyclePendingNumbers?: number[];
  concursosNoCiclo?: number;
  config: CycleTendencyConfig;
  onChangeConfig: (newConfig: CycleTendencyConfig) => void;
  onApplyToVolante: (selectedNums: number[], fixedNums?: number[]) => void;
  targetCount: number;
}

export const PainelTendenciaCiclo: React.FC<PainelTendenciaCicloProps> = ({
  latestDraw = CONCURSO_ATUAL,
  dynamicStats = DEZENAS_STATS,
  cyclePendingNumbers = [5, 7, 9, 14, 17, 21],
  concursosNoCiclo = 2,
  config,
  onChangeConfig,
  onApplyToVolante,
  targetCount = 18,
}) => {
  // Find high frequency numbers in the current cycle
  // A number is considered "hot in cycle" if it was drawn in the latest draw and has delay 0 with frequency in cycle
  const cycleHotNumbers = useMemo(() => {
    return dynamicStats
      .filter((s) => s.presenteUltimoConcurso && s.atrasoAtual === 0)
      .sort((a, b) => b.vezes - a.vezes)
      .map((s) => s.numero);
  }, [dynamicStats]);

  const isRetaFinalCiclo = cyclePendingNumbers.length > 0 && cyclePendingNumbers.length <= 3;

  const handleToggleMode = (mode: CycleTendencyMode) => {
    try {
      soundService.playFilterClick();
    } catch {}

    const newEnabled = mode !== 'off';
    const newConfig: CycleTendencyConfig = {
      ...config,
      enabled: newEnabled,
      mode,
    };
    onChangeConfig(newConfig);
  };

  const handleToggleIntensity = (intensity: CycleIntensity) => {
    try {
      soundService.playFilterClick();
    } catch {}

    onChangeConfig({
      ...config,
      intensity,
    });
  };

  const handleToggleFixedPending = () => {
    try {
      soundService.playFilterClick();
    } catch {}

    onChangeConfig({
      ...config,
      fixedPending: !config.fixedPending,
    });
  };

  // Helper to build the numbers array according to selected tendency mode
  const handleBuildAndApplyVolante = () => {
    try {
      soundService.playGoldenZoneSuccessChime();
    } catch {}

    let chosen: number[] = [];
    let toFix: number[] = [];

    if (config.mode === 'pendentes') {
      // Prioritize pending numbers first
      chosen = [...cyclePendingNumbers];
      if (config.fixedPending) {
        toFix = [...cyclePendingNumbers];
      }
      // Fill remaining spots from top AI/frequency numbers not already in pending
      const fillers = dynamicStats
        .map((s) => s.numero)
        .filter((n) => !chosen.includes(n))
        .sort((a, b) => {
          const statA = dynamicStats.find((s) => s.numero === a)?.vezes || 0;
          const statB = dynamicStats.find((s) => s.numero === b)?.vezes || 0;
          return statB - statA;
        });
      chosen = Array.from(new Set([...chosen, ...fillers])).slice(0, targetCount).sort((a, b) => a - b);
    } else if (config.mode === 'frequentes') {
      // Prioritize hot numbers first
      chosen = [...cycleHotNumbers];
      const fillers = dynamicStats
        .map((s) => s.numero)
        .filter((n) => !chosen.includes(n))
        .sort((a, b) => {
          const statA = dynamicStats.find((s) => s.numero === a)?.vezes || 0;
          const statB = dynamicStats.find((s) => s.numero === b)?.vezes || 0;
          return statB - statA;
        });
      chosen = Array.from(new Set([...chosen, ...fillers])).slice(0, targetCount).sort((a, b) => a - b);
    } else if (config.mode === 'hibrido') {
      // 50% pending, 50% hot numbers
      const halfTarget = Math.floor(targetCount / 2);
      const pendingSlice = cyclePendingNumbers.slice(0, halfTarget);
      const hotSlice = cycleHotNumbers.filter((n) => !pendingSlice.includes(n)).slice(0, halfTarget);
      chosen = [...pendingSlice, ...hotSlice];

      if (config.fixedPending) {
        toFix = cyclePendingNumbers.slice(0, Math.min(3, cyclePendingNumbers.length));
      }

      const fillers = dynamicStats
        .map((s) => s.numero)
        .filter((n) => !chosen.includes(n))
        .sort((a, b) => {
          const statA = dynamicStats.find((s) => s.numero === a)?.vezes || 0;
          const statB = dynamicStats.find((s) => s.numero === b)?.vezes || 0;
          return statB - statA;
        });
      chosen = Array.from(new Set([...chosen, ...fillers])).slice(0, targetCount).sort((a, b) => a - b);
    } else {
      // Standard balanced pool
      chosen = dynamicStats.slice(0, targetCount).map((s) => s.numero).sort((a, b) => a - b);
    }

    onApplyToVolante(chosen, toFix);
  };

  return (
    <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-4 sm:p-5 shadow-2xl space-y-4">
      {/* Top Header & Telemetry */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3.5 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-slate-950 shadow-lg shadow-amber-500/25 shrink-0 font-black">
            <RotateCw className="w-5 h-5" />
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm sm:text-base font-black text-white tracking-wide">
                Painel de Controle: Tendência de Ciclo das 25 Dezenas
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 uppercase font-black">
                {concursosNoCiclo}º Concurso no Ciclo
              </span>
              {isRetaFinalCiclo && (
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 animate-pulse">
                  ⚡ RETA FINAL DO CICLO
                </span>
              )}
            </div>

            <p className="text-xs text-slate-400 mt-0.5">
              Filtro dinâmico com viés estocástico: direcione a montagem dos bilhetes priorizando dezenas que ainda não saíram para fechar o ciclo ou dezenas com alta frequência consecutiva.
            </p>
          </div>
        </div>

        {/* Status Badge */}
        <div className="flex items-center gap-2 self-start lg:self-auto">
          <span
            className={`text-xs font-mono font-bold px-2.5 py-1 rounded-xl border flex items-center gap-1.5 ${
              config.enabled
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                : 'bg-slate-950 border-slate-800 text-slate-400'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                config.enabled ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'
              }`}
            />
            <span>
              {config.enabled
                ? `Viés Ativo: ${
                    config.mode === 'pendentes'
                      ? 'Dezenas Pendentes'
                      : config.mode === 'frequentes'
                      ? 'Alta Frequência'
                      : 'Híbrido 50/50'
                  }`
                : 'Viés Desativado (Neutro)'}
            </span>
          </span>
        </div>
      </div>

      {/* Cycle Telemetry Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
        {/* Dezenas Pendentes */}
        <div className="bg-slate-950/80 p-3.5 rounded-xl border border-amber-500/30 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-amber-300 font-bold flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-amber-400" />
              <span>Dezenas Pendentes para Fechar o Ciclo ({cyclePendingNumbers.length})</span>
            </span>
            <span className="text-[10px] font-mono text-slate-400">
              Média do Ciclo: 4,5 conc.
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5 font-mono font-black">
            {cyclePendingNumbers.length > 0 ? (
              cyclePendingNumbers.map((num) => (
                <span
                  key={num}
                  className="px-2 py-1 rounded-lg bg-amber-500/20 text-amber-200 border border-amber-400/50 shadow-sm"
                >
                  {num.toString().padStart(2, '0')}
                </span>
              ))
            ) : (
              <span className="text-emerald-400 font-bold">
                ✓ Todas as 25 dezenas já saíram! Ciclo 100% fechado.
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-400">
            Dezenas que acumulam atraso no ciclo atual e sofrem forte atração probabilística para serem sorteadas.
          </p>
        </div>

        {/* Dezenas Quentes no Ciclo */}
        <div className="bg-slate-950/80 p-3.5 rounded-xl border border-emerald-500/30 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-emerald-300 font-bold flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-emerald-400" />
              <span>Dezenas com Alta Frequência no Ciclo ({cycleHotNumbers.slice(0, 8).length})</span>
            </span>
            <span className="text-[10px] font-mono text-emerald-400">
              Presentes no #{latestDraw.concurso}
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5 font-mono font-black">
            {cycleHotNumbers.slice(0, 8).map((num) => (
              <span
                key={num}
                className="px-2 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm"
              >
                {num.toString().padStart(2, '0')}
              </span>
            ))}
          </div>
          <p className="text-[11px] text-slate-400">
            Dezenas que mantêm regularidade ativa nos concursos do ciclo, exibindo momentum contínuo.
          </p>
        </div>
      </div>

      {/* Selectable Tendency Strategy Cards */}
      <div className="space-y-2">
        <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
          Selecione a Estratégia de Tendência de Ciclo:
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {/* Option 1: Priorizar Dezenas Pendentes */}
          <button
            type="button"
            onClick={() => handleToggleMode('pendentes')}
            className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer relative ${
              config.mode === 'pendentes' && config.enabled
                ? 'bg-gradient-to-br from-amber-500/25 via-slate-900 to-amber-950/40 border-amber-400 shadow-lg shadow-amber-500/20 ring-1 ring-amber-400'
                : 'bg-slate-950/70 border-slate-800 hover:border-slate-700 text-slate-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  <Clock className="w-4 h-4" />
                </span>
                <strong className="text-xs sm:text-sm text-white">Priorizar Pendentes</strong>
              </div>
              {config.mode === 'pendentes' && config.enabled && (
                <Check className="w-4 h-4 text-amber-400 font-black" />
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
              Prioriza as dezenas que ainda não saíram no ciclo ({cyclePendingNumbers.length} pendentes). Ideal para reta final.
            </p>
          </button>

          {/* Option 2: Priorizar Alta Frequência */}
          <button
            type="button"
            onClick={() => handleToggleMode('frequentes')}
            className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer relative ${
              config.mode === 'frequentes' && config.enabled
                ? 'bg-gradient-to-br from-emerald-500/25 via-slate-900 to-emerald-950/40 border-emerald-400 shadow-lg shadow-emerald-500/20 ring-1 ring-emerald-400'
                : 'bg-slate-950/70 border-slate-800 hover:border-slate-700 text-slate-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  <Flame className="w-4 h-4" />
                </span>
                <strong className="text-xs sm:text-sm text-white">Alta Frequência</strong>
              </div>
              {config.mode === 'frequentes' && config.enabled && (
                <Check className="w-4 h-4 text-emerald-400 font-black" />
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
              Prioriza dezenas com histórico quente de repetições consecutivas nas apurações do ciclo aberto.
            </p>
          </button>

          {/* Option 3: Equilíbrio Híbrido 50/50 */}
          <button
            type="button"
            onClick={() => handleToggleMode('hibrido')}
            className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer relative ${
              config.mode === 'hibrido' && config.enabled
                ? 'bg-gradient-to-br from-cyan-500/25 via-slate-900 to-cyan-950/40 border-cyan-400 shadow-lg shadow-cyan-500/20 ring-1 ring-cyan-400'
                : 'bg-slate-950/70 border-slate-800 hover:border-slate-700 text-slate-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  <Zap className="w-4 h-4" />
                </span>
                <strong className="text-xs sm:text-sm text-white">Equilíbrio Híbrido</strong>
              </div>
              {config.mode === 'hibrido' && config.enabled && (
                <Check className="w-4 h-4 text-cyan-400 font-black" />
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
              Equilíbrio harmônico: 50% de dezenas pendentes de ciclo + 50% de dezenas com alta frequência.
            </p>
          </button>

          {/* Option 4: Desativado / Neutro */}
          <button
            type="button"
            onClick={() => handleToggleMode('off')}
            className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer relative ${
              !config.enabled || config.mode === 'off'
                ? 'bg-slate-800/80 border-slate-600 text-white'
                : 'bg-slate-950/70 border-slate-800 hover:border-slate-700 text-slate-400'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-slate-800 text-slate-300 border border-slate-700">
                  <Sliders className="w-4 h-4" />
                </span>
                <strong className="text-xs sm:text-sm">Sem Viés (Neutro)</strong>
              </div>
              {(!config.enabled || config.mode === 'off') && (
                <Check className="w-4 h-4 text-slate-300 font-black" />
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
              Geração puramente canônica sem aplicar filtro preferencial de ciclo na seleção das dezenas.
            </p>
          </button>
        </div>
      </div>

      {/* Advanced Settings & Action Bar */}
      {config.enabled && (
        <div className="bg-slate-950/90 rounded-xl p-3.5 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            {/* Intensity Toggle */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 font-semibold">Intensidade do Viés:</span>
              <div className="flex bg-slate-900 p-0.5 rounded-lg border border-slate-800 font-mono text-[11px]">
                <button
                  type="button"
                  onClick={() => handleToggleIntensity('leve')}
                  className={`px-2.5 py-1 rounded transition cursor-pointer ${
                    config.intensity === 'leve'
                      ? 'bg-amber-500 text-slate-950 font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Leve
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleIntensity('moderado')}
                  className={`px-2.5 py-1 rounded transition cursor-pointer ${
                    config.intensity === 'moderado'
                      ? 'bg-amber-500 text-slate-950 font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Moderado
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleIntensity('agressivo')}
                  className={`px-2.5 py-1 rounded transition cursor-pointer ${
                    config.intensity === 'agressivo'
                      ? 'bg-amber-500 text-slate-950 font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Agressivo (100%)
                </button>
              </div>
            </div>

            {/* Fixed Pending Numbers Checkbox */}
            {config.mode === 'pendentes' && cyclePendingNumbers.length > 0 && (
              <label className="flex items-center gap-2 cursor-pointer text-slate-300 font-medium select-none">
                <input
                  type="checkbox"
                  checked={config.fixedPending}
                  onChange={handleToggleFixedPending}
                  className="rounded border-slate-700 text-amber-500 focus:ring-amber-500 h-4 w-4 bg-slate-900 cursor-pointer"
                />
                <span>Fixar Dezenas Pendentes no Volante (Garantia Máxima)</span>
              </label>
            )}
          </div>

          {/* Quick Apply Button */}
          <button
            type="button"
            onClick={handleBuildAndApplyVolante}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-slate-950 font-black text-xs shadow-md shadow-amber-500/20 hover:scale-105 active:scale-95 transition cursor-pointer shrink-0"
          >
            <Sparkles className="w-4 h-4 fill-current" />
            <span>Carregar Tendência no Volante ({targetCount} Dezenas)</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
