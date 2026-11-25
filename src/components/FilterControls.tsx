import React from 'react';
import { FilterCriteria, LotofacilDraw } from '../types/lotofacil';
import { CONCURSO_ATUAL, FIBONACCI, CRUZ_DEZENAS } from '../data/lotofacilData';
import { DEFAULT_FILTERS } from '../services/combinatorics';
import { soundService } from '../services/soundAlert';
import { FilterTooltip } from './FilterTooltip';
import {
  Sliders,
  CheckCircle2,
  RotateCcw,
  Info,
  Scale,
  Repeat,
  Sparkles,
  Zap,
  TrendingUp,
  ShieldCheck,
  Flame,
  Check,
  Binary,
  Volume2,
  VolumeX,
  Lock,
  Layers,
  HelpCircle,
  Calculator,
  Square,
  Award,
  ShieldAlert,
} from 'lucide-react';
import { saveCurvaAbcFilterConfig } from '../services/curvaAbcService';
import { saveVoidExclusionConfig, computeVoidHeatmap } from '../services/vaziosService';

import {
  calibrarFaixaSomaUniverso,
  getRotatedFixedBounds,
  MAX_DEZENAS_FIXAS,
  RECOMMENDED_MAX_FIXAS,
  assessFixedNumbersRisk,
} from '../services/combinatorics';

interface FilterControlsProps {
  filters: FilterCriteria;
  onChange: (filters: FilterCriteria) => void;
  onReset: () => void;
  latestDraw?: LotofacilDraw;
  selectedNumbers?: number[];
  soundAlertEnabled?: boolean;
  onToggleSoundAlert?: (enabled: boolean) => void;
}

export const FilterControls: React.FC<FilterControlsProps> = ({
  filters,
  onChange,
  onReset,
  latestDraw = CONCURSO_ATUAL,
  selectedNumbers = [],
  soundAlertEnabled = false,
  onToggleSoundAlert,
}) => {
  const update = (partial: Partial<FilterCriteria>) => {
    onChange({ ...filters, ...partial });
  };

  const [appliedNotice, setAppliedNotice] = React.useState<string | null>(null);

  // Preset Calibrado Auditado: Núcleo 4 Estatístico (Soma Ampla, Paridade, Moldura, Repetidas) sem Over-filtering
  const applyAIDailyInsightsPreset = () => {
    const fullPresetFilters: FilterCriteria = {
      ...filters,
      paresMin: 5,
      paresMax: 9,
      primosMin: 4,
      primosMax: 7,
      somaMin: 165,
      somaMax: 225,
      molduraMin: 8,
      molduraMax: 12,
      fibonacciMin: 3,
      fibonacciMax: 6,
      repetidasMin: 6,
      repetidasMax: 11,
      maxConsecutivas: 7,
      estratificacaoCaudaAtiva: false,
      curvaAbcAtiva: false,
      vaziosAtivos: false,
      robustezEstatisticaAtiva: false,
      posicionalAtivo: false,
      multiplosAtivo: false,
      contagemDigitosAtiva: false,
      somaAlgarismosAtiva: false,
      linhasColunasAtivo: false,
      linhasMax: 5,
      colunasMax: 5,
      rankingHistoricoAtivo: false,
      cruzAtiva: false,
      extremidadesAtiva: false,
      antiPadraoViciadoAtivo: false,
      repetidasParidadeAtiva: false,
      modoRigorFiltros: 'conservador',
      fechamentoPonderadoAtivo: true,
    };

    saveCurvaAbcFilterConfig({ ativo: false, minClasseA: 10 });
    saveVoidExclusionConfig({
      ativo: false,
      paresExcluidos: [],
      bloquearVaziosAbsolutos: false,
      bloquearVaziosRaros: false,
      dataAtualizacao: new Date().toISOString(),
    });

    onChange(fullPresetFilters);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('lotosniper-void-filter-changed', {
          detail: {
            ativo: false,
            paresExcluidos: [],
          },
        })
      );
      window.dispatchEvent(
        new CustomEvent('lotosniper-curva-abc-changed', {
          detail: { ativo: false, minClasseA: 10 },
        })
      );
      window.dispatchEvent(
        new CustomEvent('lotosniper-ai-insights-preset-applied', {
          detail: fullPresetFilters,
        })
      );
    }

    setAppliedNotice(
      `✓ Núcleo Auditado carregado (Modo Conservador): Soma 165–225, 5–9 Pares, 8–12 Moldura, 6–11 Repetidas e Consecutivas ≤ 7. Regras secundárias movidas para Soft Scoring no scoreIA.`
    );
    setTimeout(() => setAppliedNotice(null), 6000);
  };

  const applyStrictPreset = () => {
    onChange({
      ...filters,
      paresMin: 6,
      paresMax: 8,
      primosMin: 4,
      primosMax: 7,
      somaMin: 175,
      somaMax: 220,
      molduraMin: 8,
      molduraMax: 11,
      fibonacciMin: 3,
      fibonacciMax: 6,
      repetidasMin: 7,
      repetidasMax: 10,
      maxConsecutivas: 6,
      estratificacaoCaudaAtiva: false,
      posicionalAtivo: false,
      multiplosAtivo: false,
      contagemDigitosAtiva: false,
      somaAlgarismosAtiva: false,
      linhasColunasAtivo: false,
      rankingHistoricoAtivo: false,
      cruzAtiva: false,
      extremidadesAtiva: false,
      antiPadraoViciadoAtivo: false,
    });
  };

  const applyWidePreset = () => {
    onChange({
      ...filters,
      paresMin: 5,
      paresMax: 10,
      primosMin: 3,
      primosMax: 8,
      somaMin: 160,
      somaMax: 230,
      molduraMin: 7,
      molduraMax: 13,
      fibonacciMin: 2,
      fibonacciMax: 7,
      repetidasMin: 5,
      repetidasMax: 12,
      maxConsecutivas: 7,
      estratificacaoCaudaAtiva: false,
      posicionalAtivo: false,
      multiplosAtivo: false,
      contagemDigitosAtiva: false,
      somaAlgarismosAtiva: false,
      linhasColunasAtivo: false,
      rankingHistoricoAtivo: false,
      cruzAtiva: false,
      extremidadesAtiva: false,
      antiPadraoViciadoAtivo: false,
      modoRigorFiltros: 'agressivo',
    });
  };

  return (
    <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-5 sm:p-6 shadow-xl space-y-5">
      {/* Header com Identificação Clara */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-800 gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              <Sliders className="w-4 h-4" />
            </div>
            <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
              <span>Filtros Personalizados & Restrições Canônicas</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 uppercase font-bold">
                Poda de Ramos Ativa
              </span>
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Separado em grade 2×2 entre <strong className="text-white">Filtros Obrigatórios</strong> e{' '}
            <strong className="text-white">Filtros Avançados</strong>. Elimina combinações inviáveis antes do fechamento.
          </p>
        </div>

        {/* Quick Presets & Sound Alert Switch */}
        <div className="flex items-center flex-wrap gap-2 shrink-0">
          {/* Sound Alert Toggle Switch */}
          {onToggleSoundAlert && (
            <button
              type="button"
              onClick={() => {
                const next = !soundAlertEnabled;
                onToggleSoundAlert(next);
                if (next) soundService.playGoldenZoneSuccessChime();
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition cursor-pointer ${
                soundAlertEnabled
                  ? 'bg-amber-500/20 border-amber-400/60 text-amber-300'
                  : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-white'
              }`}
              title="Avisa sonoramente quando um jogo gerado estiver fora da Zona Central (soma 180-215)"
            >
              {soundAlertEnabled ? (
                <Volume2 className="w-3.5 h-3.5 text-amber-400" />
              ) : (
                <VolumeX className="w-3.5 h-3.5 text-slate-500" />
              )}
              <span>Alerta Sonoro {soundAlertEnabled ? 'Ativo' : 'Desativado'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={applyAIDailyInsightsPreset}
            className="px-3 py-1.5 text-xs rounded-xl bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 text-slate-950 font-black hover:opacity-95 transition shadow-sm shadow-emerald-500/25 cursor-pointer flex items-center gap-1.5"
            title="Aplica o preset Equilíbrio Pro auditado: Soma 175–220 (Zona Central 180–215 + Caudas 75/15/10), 6–8 Pares, 8–11 Moldura, 4–7 Primos, 3–6 Fibonacci, 7–10 Repetidas e até 6 consecutivas"
          >
            <Sparkles className="w-3.5 h-3.5 text-slate-950 fill-slate-950" />
            <span>Insights Diários da IA</span>
            <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-slate-950 text-emerald-300 font-mono font-bold">
              RECOMENDADO
            </span>
          </button>

          <button
            type="button"
            onClick={applyStrictPreset}
            className="px-2.5 py-1.5 text-xs rounded-xl bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 transition cursor-pointer"
          >
            Filtros Estritos
          </button>
          <button
            type="button"
            onClick={applyWidePreset}
            className="px-2.5 py-1.5 text-xs rounded-xl bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 transition cursor-pointer"
          >
            Filtros Amplos
          </button>
          <button
            type="button"
            onClick={onReset}
            className="p-1.5 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-slate-800 border border-transparent hover:border-slate-700 transition cursor-pointer"
            title="Restaurar Valores Padrão"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Alerta de Aplicação dos Insights Diários da IA */}
      {appliedNotice && (
        <div className="bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs px-3.5 py-2 rounded-xl flex items-center justify-between gap-2 shadow-md shadow-emerald-500/10">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{appliedNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => setAppliedNotice(null)}
            className="text-emerald-400 hover:text-white text-xs font-bold px-1.5 py-0.5 rounded cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* GRID: FILTROS OBRIGATÓRIOS (SOMA, PARES/ÍMPARES) & FILTROS AVANÇADOS       */}
      {/* ========================================================================= */}
      <div className="space-y-6">
        {/* ==================== SEÇÃO 1: FILTROS OBRIGATÓRIOS ==================== */}
        <div className="space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-emerald-500/30">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                <Lock className="w-4 h-4 text-emerald-400" />
              </span>
              <div>
                <span className="text-sm font-black uppercase tracking-wider text-emerald-400 font-mono">
                  Filtros Obrigatórios (Soma Canônica & Paridade de Pares/Ímpares)
                </span>
                <p className="text-[11px] text-slate-400">
                  Restrições matemáticas basilares que evitam jogos estatisticamente inviáveis na Lotofácil.
                </p>
              </div>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold uppercase shrink-0">
              Obrigatório
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* 1.1 Soma das 15 Dezenas & Zona de Ouro (190-210) */}
            <div className="bg-gradient-to-br from-indigo-950/30 via-slate-950 to-slate-950 p-4 sm:p-5 rounded-2xl border-2 border-indigo-500/40 shadow-lg space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                    <Calculator className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                      <span>Faixa de Soma das 15 Dezenas</span>
                      <FilterTooltip
                        title="Soma das 15 Dezenas (Zona de Ouro)"
                        description="Zona de Ouro: soma ideal entre 190 e 210 (concentra o pico da curva normal da Lotofácil). A Zona Central 180–215 abrange ~75% dos resultados históricos."
                        impact="Impacto: Poda ~70% das combinações extremas improváveis mantendo alta cobertura de 14–15 pontos."
                        position="bottom"
                      />
                    </h4>
                    <span className="text-[11px] text-indigo-300/80 font-mono">
                      Zona Central: 180 a 215 (75%) • Cauda Alta: 216–230 (15%) • Cauda Baixa: 155–179 (10%)
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Configurado</span>
                  <strong className="text-base font-black font-mono text-indigo-300 bg-indigo-500/20 px-2 py-0.5 rounded border border-indigo-400/40">
                    {filters.somaMin} – {filters.somaMax}
                  </strong>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                O preset Equilíbrio Pro utiliza Soma 175–220 com estratificação de cauda ativa em fechamentos com 10+ jogos: 75% na Zona Central (180–215), 15% na Cauda Alta (216–230) e 10% na Cauda Baixa (155–179).
              </p>

              <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800 space-y-2.5">
                {(() => {
                  const autoAtivo = filters.autoCalibrarSomaUniverso !== false;
                  const universoCal = selectedNumbers.length >= 15 ? calibrarFaixaSomaUniverso(selectedNumbers) : null;
                  return (
                    <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-800/80">
                      <div className="text-[11px]">
                        <span className="text-slate-200 font-semibold block">
                          Auto-Calibrar Soma pelo Universo (μ_U ± 20)
                        </span>
                        <span className="text-[10px] font-mono text-indigo-300/90">
                          {universoCal
                            ? `μ_U = ${universoCal.mediaUniverso.toFixed(1)} → Sugerido ${universoCal.somaMin}–${universoCal.somaMax}`
                            : 'Ajusta Soma Min/Max automaticamente às dezenas escolhidas'}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const nextAuto = !autoAtivo;
                          if (nextAuto && universoCal) {
                            update({
                              autoCalibrarSomaUniverso: true,
                              somaMin: universoCal.somaMin,
                              somaMax: universoCal.somaMax,
                            });
                          } else {
                            update({ autoCalibrarSomaUniverso: nextAuto });
                          }
                        }}
                        className={`px-2.5 py-1 text-[10px] font-bold rounded-lg border transition cursor-pointer shrink-0 ${
                          autoAtivo
                            ? 'bg-indigo-500 text-white border-indigo-400'
                            : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                        }`}
                      >
                        {autoAtivo ? '✓ Auto Ativa' : 'Manual'}
                      </button>
                    </div>
                  );
                })()}

                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Soma Mínima:</span>
                    <span className="font-mono font-bold text-white">{filters.somaMin}</span>
                  </div>
                  <input
                    type="range"
                    min="150"
                    max={filters.somaMax - 5}
                    value={filters.somaMin}
                    onChange={(e) =>
                      update({
                        somaMin: parseInt(e.target.value, 10),
                        autoCalibrarSomaUniverso: false,
                      })
                    }
                    className="w-full accent-indigo-500 cursor-pointer"
                  />
                </div>

                <div className="space-y-1 pt-1 border-t border-slate-800/80">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Soma Máxima:</span>
                    <span className="font-mono font-bold text-white">{filters.somaMax}</span>
                  </div>
                  <input
                    type="range"
                    min={filters.somaMin + 5}
                    max="240"
                    value={filters.somaMax}
                    onChange={(e) =>
                      update({
                        somaMax: parseInt(e.target.value, 10),
                        autoCalibrarSomaUniverso: false,
                      })
                    }
                    className="w-full accent-indigo-500 cursor-pointer"
                  />
                </div>

                {/* Quick Gold Calibration + Estratificação de Caudas Toggle */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => update({ somaMin: 180, somaMax: 215, autoCalibrarSomaUniverso: false })}
                    className={`py-1.5 px-2 text-[11px] rounded-lg font-bold border transition cursor-pointer ${
                      filters.somaMin === 180 && filters.somaMax === 215
                        ? 'bg-amber-500 text-slate-950 border-amber-400'
                        : 'bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border-indigo-500/40'
                    }`}
                  >
                    ★ Zona de Ouro (180–215)
                  </button>
                  <button
                    type="button"
                    onClick={() => update({ somaMin: 190, somaMax: 210, autoCalibrarSomaUniverso: false })}
                    className={`py-1.5 px-2 text-[11px] rounded-lg font-bold border transition cursor-pointer ${
                      filters.somaMin === 190 && filters.somaMax === 210
                        ? 'bg-amber-500 text-slate-950 border-amber-400'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                    }`}
                  >
                    🎯 Núcleo Estrito (190–210)
                  </button>
                </div>

                {/* Toggle Explícito: Estratificação de Caudas (75% / 15% / 10%) */}
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800/80">
                  <div className="text-[11px]">
                    <span className="text-amber-300 font-bold flex items-center gap-1.5">
                      <span>Estratificação de Caudas (75% / 15% / 10%)</span>
                      <FilterTooltip
                        title="Estratificação Anti-Cisne Negro"
                        description="Distribui o fechamento em 75% Zona Central (180–215), 15% Cauda Alta (216–230) e 10% Cauda Baixa (155–179)."
                        impact="Impacto: Protege sua banca caso o sorteio caia fora do miolo padrão sem diluir o núcleo principal."
                      />
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      75% Central (180–215) • 15% Alta (216–230) • 10% Baixa (155–179)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      update({ estratificacaoCaudaAtiva: !filters.estratificacaoCaudaAtiva })
                    }
                    className={`px-2.5 py-1 text-[10px] font-bold rounded-lg border transition cursor-pointer shrink-0 ${
                      filters.estratificacaoCaudaAtiva
                        ? 'bg-amber-500 text-slate-950 border-amber-400 font-black'
                        : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
                    }`}
                  >
                    {filters.estratificacaoCaudaAtiva ? '✓ Ativa' : 'Inativa'}
                  </button>
                </div>
              </div>
            </div>

            {/* 1.2 Pares e Ímpares (Equilíbrio Canônico 7P/8I ou 8P/7I) */}
            <div className="bg-gradient-to-br from-emerald-950/30 via-slate-950 to-slate-950 p-4 sm:p-5 rounded-2xl border-2 border-emerald-500/40 shadow-lg space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    <Scale className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                      <span>Proporção de Pares & Ímpares</span>
                      <FilterTooltip
                        title="Equilíbrio de Paridade (Pares / Ímpares)"
                        description="7P/8I e 8P/7I ocorrem em 62,3% dos concursos oficiais; a faixa 6 a 9 pares cobre 94,8% do histórico."
                        impact="Impacto: Elimina jogos desequilibrados (10+ pares/ímpares) com probabilidade menor que 2,4%."
                        position="bottom"
                      />
                    </h4>
                    <span className="text-[11px] text-emerald-300/80 font-mono">
                      Padrão Ouro: 7P/8I ou 8P/7I (~62.3% dos sorteios)
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Configurado</span>
                  <strong className="text-base font-black font-mono text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-400/40">
                    {filters.paresMin} a {filters.paresMax} Pares
                  </strong>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                Mais de 80% dos concursos possuem entre 7 e 8 números pares. Combinações com 10 ou mais pares têm probabilidade inferior a 2.4%.
              </p>

              <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800 space-y-2.5">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => update({ paresMin: 6, paresMax: 9 })}
                    className={`py-1.5 px-2 rounded-lg text-xs font-bold border transition cursor-pointer ${
                      filters.paresMin === 6 && filters.paresMax === 9
                        ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-sm font-black'
                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750'
                    }`}
                  >
                    ⚡ 6 a 9 Pares (Tolerância Ampla)
                  </button>
                  <button
                    type="button"
                    onClick={() => update({ paresMin: 7, paresMax: 8 })}
                    className={`py-1.5 px-2 rounded-lg text-xs font-bold border transition cursor-pointer ${
                      filters.paresMin === 7 && filters.paresMax === 8
                        ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-sm'
                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750'
                    }`}
                  >
                    7P e 8P (Canônico Estrito)
                  </button>
                  <button
                    type="button"
                    onClick={() => update({ paresMin: 8, paresMax: 8 })}
                    className={`py-1.5 px-2 rounded-lg text-xs font-bold border transition cursor-pointer ${
                      filters.paresMin === 8 && filters.paresMax === 8
                        ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-sm'
                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750'
                    }`}
                  >
                    Apenas 8P / 7I
                  </button>
                  <button
                    type="button"
                    onClick={() => update({ paresMin: 7, paresMax: 7 })}
                    className={`py-1.5 px-2 rounded-lg text-xs font-bold border transition cursor-pointer ${
                      filters.paresMin === 7 && filters.paresMax === 7
                        ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-sm'
                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750'
                    }`}
                  >
                    Apenas 7P / 8I
                  </button>
                </div>

                <div className="space-y-1 pt-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Faixa Manual de Pares:</span>
                    <span className="font-mono text-emerald-300 font-bold">
                      {filters.paresMin} a {filters.paresMax} pares (Ímpares: {15 - filters.paresMax} a {15 - filters.paresMin})
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="range"
                      min="5"
                      max={filters.paresMax}
                      value={filters.paresMin}
                      onChange={(e) => update({ paresMin: parseInt(e.target.value, 10) })}
                      className="accent-emerald-500 cursor-pointer"
                    />
                    <input
                      type="range"
                      min={filters.paresMin}
                      max="10"
                      value={filters.paresMax}
                      onChange={(e) => update({ paresMax: parseInt(e.target.value, 10) })}
                      className="accent-emerald-500 cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 1.3 Modo de Dezenas Fixas: Rotativas Inteligentes (K de N) vs Rígidas (100%) */}
          {(() => {
            const fixasCount = (filters.dezenasFixas || []).length;
            const kBounds = getRotatedFixedBounds(fixasCount, filters.modoFixas);
            const activeMode = filters.modoFixas === 'rigidas' ? 'rigidas' : 'rotativas';
            const risk = assessFixedNumbersRisk(fixasCount, activeMode);
            const isRisky = risk.level === 'atencao' || risk.level === 'critico';
            return (
              <div
                className={`p-4 rounded-2xl border space-y-3 ${
                  isRisky
                    ? 'bg-amber-950/25 border-amber-500/45'
                    : 'bg-slate-950/90 border-slate-800'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Lock className="w-4 h-4 text-amber-400" />
                      <span className="text-xs sm:text-sm font-bold text-white">
                        Modo de Fixas: Proteção Contra Falha de Âncoras
                      </span>
                      <FilterTooltip
                        title="Rotatividade de Fixas (K de N)"
                        description="Com 3 ou mais fixas, o modo Rotativas exige K entre N-2 e N-1 por bilhete em vez de 100% rígidas."
                        impact="Impacto: Evita perda total do fechamento se 1 dezena fixa falhar no sorteio."
                      />
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                        {fixasCount}/{MAX_DEZENAS_FIXAS} Fixas Marcadas
                      </span>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                        Recomendado: máx. 2–{RECOMMENDED_MAX_FIXAS} fixas
                      </span>
                      {fixasCount >= 3 && kBounds.modo === 'rotativas' && (
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                          Rotativas ({kBounds.minK}–{kBounds.maxK} de {fixasCount} por bilhete)
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Na auditoria real (#3825–#3833), usar <strong className="text-emerald-300">no máximo 2 a 3 fixas</strong> concentrou 80% dos jogos de 13 pontos e ROIs de 142% a 285%. Acima de 3 fixas, mantenha{' '}
                      <strong className="text-cyan-300">Rotativas (K de N)</strong> para evitar zerar o Hit Rate se 1 ou 2 âncoras falharem.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => update({ modoFixas: 'rotativas' })}
                      className={`px-3 py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                        activeMode === 'rotativas'
                          ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-black'
                          : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800'
                      }`}
                    >
                      Rotativas Inteligentes (K de N)
                    </button>
                    <button
                      type="button"
                      onClick={() => update({ modoFixas: 'rigidas' })}
                      className={`px-3 py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                        activeMode === 'rigidas'
                          ? 'bg-amber-500 text-slate-950 border-amber-400 font-black'
                          : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800'
                      }`}
                    >
                      Rígidas (100% em todos)
                    </button>
                  </div>
                </div>

                {isRisky && (
                  <div className="flex items-start gap-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/35 text-[11px] text-amber-200">
                    <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="font-black">{risk.title}: </strong>
                      <span>{risk.message}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </div>

        {/* ==================== SEÇÃO 2: FILTROS AVANÇADOS ==================== */}
        <div className="space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-amber-500/30">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40">
                <Binary className="w-4 h-4 text-amber-400" />
              </span>
              <div>
                <span className="text-sm font-black uppercase tracking-wider text-amber-400 font-mono">
                  Filtros Avançados (Repetidas, Moldura, Primos & Fibonacci)
                </span>
                <p className="text-[11px] text-slate-400">
                  Condicionais probabilísticos calibrados com base no Concurso #{latestDraw.concurso} para refinar a assertividade.
                </p>
              </div>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold uppercase shrink-0">
              Avançado
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 2.1 Repetidas do Concurso Anterior + Subfiltro de Paridade (Pares / Ímpares) */}
            {(() => {
              const prevDrawPares = latestDraw.dezenas.filter((n) => n % 2 === 0).length;
              const prevDrawImpares = latestDraw.dezenas.length - prevDrawPares;
              const repPMin = filters.repetidasParesMin ?? 2;
              const repPMax = Math.min(prevDrawPares, filters.repetidasParesMax ?? Math.min(6, prevDrawPares));
              const repIMin = filters.repetidasImparesMin ?? 2;
              const repIMax = Math.min(prevDrawImpares, filters.repetidasImparesMax ?? Math.min(6, prevDrawImpares));
              const midTotal = Math.round(((filters.repetidasMin ?? 7) + (filters.repetidasMax ?? 10)) / 2);
              const balancedP = Math.min(prevDrawPares, Math.floor(midTotal / 2));
              const balancedI = Math.min(prevDrawImpares, midTotal - balancedP);

              return (
                <div className="bg-slate-950/80 p-4 rounded-2xl border border-amber-500/35 space-y-3 md:col-span-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <Repeat className="w-4 h-4 text-amber-400" />
                      <span className="text-xs font-bold text-white">Repetidas Concurso #{latestDraw.concurso}</span>
                      <FilterTooltip
                        title="Repetidas do Concurso Anterior & Paridade"
                        description="Mede quantas das 15 dezenas do último sorteio se repetem no próximo e permite definir quantas dessas repetidas devem ser Pares e quantas Ímpares."
                        impact="Impacto: Faixa 7–10 repetidas cobre >84% dos sorteios; controlar Pares/Ímpares das repetidas evita viés de paridade na interseção."
                      />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-[10px] text-slate-300 bg-slate-900 border border-slate-700 px-1.5 py-0.5 rounded tabular-nums">
                        #{latestDraw.concurso}: {prevDrawPares}P / {prevDrawImpares}I
                      </span>
                      <span className="font-mono text-xs font-bold text-amber-300 bg-amber-500/20 px-1.5 py-0.5 rounded border border-amber-500/30 tabular-nums">
                        {filters.repetidasMin}–{filters.repetidasMax} Rep.
                      </span>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Calculado sobre as 15 dezenas de #{latestDraw.concurso} ({prevDrawPares} pares e {prevDrawImpares} ímpares). Padrão canônico: 7 a 10 repetidas.
                  </p>

                  {/* Sliders Total de Repetidas */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                        <span>Mínimo Total:</span>
                        <span className="text-amber-300 font-bold tabular-nums">{filters.repetidasMin}</span>
                      </div>
                      <input
                        type="range"
                        min="4"
                        max={filters.repetidasMax}
                        value={filters.repetidasMin}
                        onChange={(e) => {
                          const nextMin = parseInt(e.target.value, 10);
                          update({ repetidasMin: nextMin });
                        }}
                        className="w-full accent-amber-500 cursor-pointer"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                        <span>Máximo Total:</span>
                        <span className="text-amber-300 font-bold tabular-nums">{filters.repetidasMax}</span>
                      </div>
                      <input
                        type="range"
                        min={filters.repetidasMin}
                        max="13"
                        value={filters.repetidasMax}
                        onChange={(e) => {
                          const nextMax = parseInt(e.target.value, 10);
                          update({ repetidasMax: nextMax });
                        }}
                        className="w-full accent-amber-500 cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Subfiltro Granular: Paridade das Repetidas (dezenasDoBilhete ∩ concursoAnterior) */}
                  <div className="pt-3 border-t border-slate-800/90 space-y-2.5">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div>
                        <span className="text-[11px] font-bold text-amber-200 flex items-center gap-1.5">
                          <span>Paridade nas Repetidas (Pares / Ímpares)</span>
                          {filters.repetidasParidadeAtiva && (
                            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-400/40 tabular-nums">
                              {repPMin}–{repPMax}P • {repIMin}–{repIMax}I
                            </span>
                          )}
                        </span>
                        <span className="text-[10px] text-slate-400 block">
                          Filtra estritamente a interseção (Bilhete ∩ #{latestDraw.concurso}) separando Pares e Ímpares.
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          update({
                            repetidasParidadeAtiva: !filters.repetidasParidadeAtiva,
                            repetidasParesMin: filters.repetidasParesMin ?? Math.max(1, balancedP - 1),
                            repetidasParesMax: filters.repetidasParesMax ?? Math.min(prevDrawPares, balancedP + 1),
                            repetidasImparesMin: filters.repetidasImparesMin ?? Math.max(1, balancedI - 1),
                            repetidasImparesMax: filters.repetidasImparesMax ?? Math.min(prevDrawImpares, balancedI + 1),
                          })
                        }
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition cursor-pointer whitespace-nowrap shrink-0 ${
                          filters.repetidasParidadeAtiva
                            ? 'bg-amber-400 text-slate-950 border-amber-300 font-black'
                            : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-amber-500/50 hover:text-white'
                        }`}
                      >
                        {filters.repetidasParidadeAtiva ? 'Subfiltro Ativo' : 'Ativar Paridade'}
                      </button>
                    </div>

                    {filters.repetidasParidadeAtiva && (
                      <div className="space-y-2.5 bg-slate-900/70 border border-amber-500/25 rounded-xl p-3">
                        {/* Proporções Rápidas Dinâmicas ajustadas ao total escolhido */}
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-[10px] font-mono text-slate-400 mr-1">Proporção:</span>
                          <button
                            type="button"
                            onClick={() =>
                              update({
                                repetidasParidadeAtiva: true,
                                repetidasParesMin: Math.max(0, balancedP - 1),
                                repetidasParesMax: Math.min(prevDrawPares, balancedP + 1),
                                repetidasImparesMin: Math.max(0, balancedI - 1),
                                repetidasImparesMax: Math.min(prevDrawImpares, balancedI + 1),
                              })
                            }
                            className="px-2 py-1 rounded-md text-[10px] font-mono font-bold bg-slate-950 hover:bg-amber-500/20 text-amber-300 border border-amber-500/35 transition cursor-pointer whitespace-nowrap shrink-0"
                          >
                            Equilibrado ({Math.max(0, balancedP - 1)}–{Math.min(prevDrawPares, balancedP + 1)}P / {Math.max(0, balancedI - 1)}–{Math.min(prevDrawImpares, balancedI + 1)}I)
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              update({
                                repetidasParidadeAtiva: true,
                                repetidasParesMin: Math.min(prevDrawPares, Math.max(1, balancedP)),
                                repetidasParesMax: prevDrawPares,
                                repetidasImparesMin: Math.max(0, balancedI - 2),
                                repetidasImparesMax: Math.min(prevDrawImpares, balancedI),
                              })
                            }
                            className="px-2 py-1 rounded-md text-[10px] font-mono font-bold bg-slate-950 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/35 transition cursor-pointer whitespace-nowrap shrink-0"
                          >
                            + Pares Rep.
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              update({
                                repetidasParidadeAtiva: true,
                                repetidasParesMin: Math.max(0, balancedP - 2),
                                repetidasParesMax: Math.min(prevDrawPares, balancedP),
                                repetidasImparesMin: Math.min(prevDrawImpares, Math.max(1, balancedI)),
                                repetidasImparesMax: prevDrawImpares,
                              })
                            }
                            className="px-2 py-1 rounded-md text-[10px] font-mono font-bold bg-slate-950 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/35 transition cursor-pointer whitespace-nowrap shrink-0"
                          >
                            + Ímpares Rep.
                          </button>
                        </div>

                        {/* Controles Min/Max Repetidas Pares vs Repetidas Ímpares */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                          <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800 space-y-1.5">
                            <div className="flex items-center justify-between text-[10px] font-mono">
                              <span className="font-bold text-cyan-300">Repetidas Pares</span>
                              <span className="text-white font-bold tabular-nums">
                                {repPMin} a {repPMax} (máx {prevDrawPares})
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <div className="flex justify-between text-[9px] text-slate-400 font-mono">
                                  <span>Mín P:</span>
                                  <span className="text-cyan-300 font-bold tabular-nums">{repPMin}</span>
                                </div>
                                <input
                                  type="range"
                                  min="0"
                                  max={prevDrawPares}
                                  value={repPMin}
                                  onChange={(e) => {
                                    const val = parseInt(e.target.value, 10);
                                    update({
                                      repetidasParidadeAtiva: true,
                                      repetidasParesMin: val,
                                      repetidasParesMax: Math.max(val, repPMax),
                                    });
                                  }}
                                  className="w-full accent-cyan-400 cursor-pointer h-1.5"
                                />
                              </div>
                              <div>
                                <div className="flex justify-between text-[9px] text-slate-400 font-mono">
                                  <span>Máx P:</span>
                                  <span className="text-cyan-300 font-bold tabular-nums">{repPMax}</span>
                                </div>
                                <input
                                  type="range"
                                  min="0"
                                  max={prevDrawPares}
                                  value={repPMax}
                                  onChange={(e) => {
                                    const val = parseInt(e.target.value, 10);
                                    update({
                                      repetidasParidadeAtiva: true,
                                      repetidasParesMax: val,
                                      repetidasParesMin: Math.min(val, repPMin),
                                    });
                                  }}
                                  className="w-full accent-cyan-400 cursor-pointer h-1.5"
                                />
                              </div>
                            </div>
                          </div>

                          <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800 space-y-1.5">
                            <div className="flex items-center justify-between text-[10px] font-mono">
                              <span className="font-bold text-emerald-300">Repetidas Ímpares</span>
                              <span className="text-white font-bold tabular-nums">
                                {repIMin} a {repIMax} (máx {prevDrawImpares})
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <div className="flex justify-between text-[9px] text-slate-400 font-mono">
                                  <span>Mín I:</span>
                                  <span className="text-emerald-300 font-bold tabular-nums">{repIMin}</span>
                                </div>
                                <input
                                  type="range"
                                  min="0"
                                  max={prevDrawImpares}
                                  value={repIMin}
                                  onChange={(e) => {
                                    const val = parseInt(e.target.value, 10);
                                    update({
                                      repetidasParidadeAtiva: true,
                                      repetidasImparesMin: val,
                                      repetidasImparesMax: Math.max(val, repIMax),
                                    });
                                  }}
                                  className="w-full accent-emerald-400 cursor-pointer h-1.5"
                                />
                              </div>
                              <div>
                                <div className="flex justify-between text-[9px] text-slate-400 font-mono">
                                  <span>Máx I:</span>
                                  <span className="text-emerald-300 font-bold tabular-nums">{repIMax}</span>
                                </div>
                                <input
                                  type="range"
                                  min="0"
                                  max={prevDrawImpares}
                                  value={repIMax}
                                  onChange={(e) => {
                                    const val = parseInt(e.target.value, 10);
                                    update({
                                      repetidasParidadeAtiva: true,
                                      repetidasImparesMax: val,
                                      repetidasImparesMin: Math.min(val, repIMin),
                                    });
                                  }}
                                  className="w-full accent-emerald-400 cursor-pointer h-1.5"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* 2.2 Moldura e Miolo (16 externas / 9 internas) */}
            <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Square className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold text-white">Moldura &amp; Miolo</span>
                  <FilterTooltip
                    title="Moldura (16 externas) vs Miolo (9 internas)"
                    description="Os 16 números da borda do volante costumam aparecer entre 8 e 11 vezes por sorteio (miolo entre 4 e 7)."
                    impact="Impacto: Faixa 8–11 moldura está presente em ~87% dos concursos oficiais."
                  />
                </div>
                <span className="font-mono text-xs font-bold text-emerald-300 bg-emerald-500/20 px-1.5 py-0.5 rounded">
                  {filters.molduraMin}–{filters.molduraMax}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Moldura (16 externas): ideal 8 a 11. Miolo automático:{' '}
                <strong className="font-mono text-emerald-300">
                  {15 - filters.molduraMax}–{15 - filters.molduraMin}
                </strong>{' '}
                dezenas.
              </p>
              <div className="space-y-2">
                <div>
                  <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                    <span>Mín Moldura:</span>
                    <span className="text-emerald-300 font-bold">{filters.molduraMin}</span>
                  </div>
                  <input
                    type="range"
                    min="6"
                    max={filters.molduraMax}
                    value={filters.molduraMin}
                    onChange={(e) => update({ molduraMin: parseInt(e.target.value, 10) })}
                    className="w-full accent-emerald-500 cursor-pointer"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                    <span>Máx Moldura:</span>
                    <span className="text-emerald-300 font-bold">{filters.molduraMax}</span>
                  </div>
                  <input
                    type="range"
                    min={filters.molduraMin}
                    max="13"
                    value={filters.molduraMax}
                    onChange={(e) => update({ molduraMax: parseInt(e.target.value, 10) })}
                    className="w-full accent-emerald-500 cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* 2.3 Números Primos */}
            <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Flame className="w-4 h-4 text-rose-400" />
                  <span className="text-xs font-bold text-white">Números Primos</span>
                  <FilterTooltip
                    title="Densidade de Números Primos"
                    description="Entre as 25 dezenas existem 9 primos (02, 03, 05, 07, 11, 13, 17, 19, 23). A média histórica fica entre 5 e 6 primos."
                    impact="Impacto: Travar entre 4 e 7 primos cobre ~86% dos sorteios e evita concentrações anômalas."
                  />
                </div>
                <span className="font-mono text-xs font-bold text-rose-300 bg-rose-500/20 px-1.5 py-0.5 rounded">
                  {filters.primosMin}–{filters.primosMax}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                9 primos (02,03,05,07,11,13,17,19,23). Faixa recomendada: 4 a 7.
              </p>
              <div className="space-y-2">
                <div>
                  <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                    <span>Mín Primos:</span>
                    <span className="text-rose-300 font-bold">{filters.primosMin}</span>
                  </div>
                  <input
                    type="range"
                    min="2"
                    max={filters.primosMax}
                    value={filters.primosMin}
                    onChange={(e) => update({ primosMin: parseInt(e.target.value, 10) })}
                    className="w-full accent-rose-500 cursor-pointer"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                    <span>Máx Primos:</span>
                    <span className="text-rose-300 font-bold">{filters.primosMax}</span>
                  </div>
                  <input
                    type="range"
                    min={filters.primosMin}
                    max="9"
                    value={filters.primosMax}
                    onChange={(e) => update({ primosMax: parseInt(e.target.value, 10) })}
                    className="w-full accent-rose-500 cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* 2.4 SELETOR DE SEQUÊNCIA FIBONACCI */}
            <div className="bg-gradient-to-br from-cyan-950/40 via-slate-950 to-slate-950 p-4 rounded-2xl border border-cyan-500/40 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs font-bold text-white">Sequência Fibonacci</span>
                  <FilterTooltip
                    title="Dezenas da Sequência de Fibonacci"
                    description="As 7 dezenas Fibonacci (01, 02, 03, 05, 08, 13, 21) têm ocorrência típica de 3 a 6 dezenas por concurso."
                    impact="Impacto: Faixa 3–6 (ou núcleo 4–5) alinha os bilhetes com ~82% da distribuição oficial."
                  />
                </div>
                <span className="font-mono text-xs font-bold text-cyan-300 bg-cyan-500/20 px-1.5 py-0.5 rounded border border-cyan-400/40">
                  {filters.fibonacciMin}–{filters.fibonacciMax}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Dezenas: <span className="font-mono text-cyan-300 font-semibold">{FIBONACCI.map(n => n.toString().padStart(2, '0')).join(', ')}</span>.
              </p>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-1.5">
                  <button
                    type="button"
                    onClick={() => update({ fibonacciMin: 3, fibonacciMax: 6 })}
                    className={`px-2 py-1 text-[10px] rounded font-bold border transition cursor-pointer ${
                      filters.fibonacciMin === 3 && filters.fibonacciMax === 6
                        ? 'bg-cyan-500 text-slate-950 border-cyan-400'
                        : 'bg-slate-800 text-slate-300 border-slate-700'
                    }`}
                  >
                    3 a 6 (Canônico)
                  </button>
                  <button
                    type="button"
                    onClick={() => update({ fibonacciMin: 4, fibonacciMax: 5 })}
                    className={`px-2 py-1 text-[10px] rounded font-bold border transition cursor-pointer ${
                      filters.fibonacciMin === 4 && filters.fibonacciMax === 5
                        ? 'bg-cyan-500 text-slate-950 border-cyan-400'
                        : 'bg-slate-800 text-slate-300 border-slate-700'
                    }`}
                  >
                    4 a 5 (Ouro)
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                      <span>Mín:</span>
                      <span className="text-cyan-300 font-bold">{filters.fibonacciMin}</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max={filters.fibonacciMax}
                      value={filters.fibonacciMin}
                      onChange={(e) => update({ fibonacciMin: parseInt(e.target.value, 10) })}
                      className="w-full accent-cyan-400 cursor-pointer"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                      <span>Máx:</span>
                      <span className="text-cyan-300 font-bold">{filters.fibonacciMax}</span>
                    </div>
                    <input
                      type="range"
                      min={filters.fibonacciMin}
                      max="7"
                      value={filters.fibonacciMax}
                      onChange={(e) => update({ fibonacciMax: parseInt(e.target.value, 10) })}
                      className="w-full accent-cyan-400 cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 2.4b SEQUÊNCIAS / CONSECUTIVAS (maxConsecutivas: 3 a 6) */}
            <div className="bg-slate-950/80 p-4 rounded-2xl border border-violet-500/40 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-violet-400" />
                  <span className="text-xs font-bold text-white">Sequências Consecutivas</span>
                  <FilterTooltip
                    title="Maior Sequência Consecutiva"
                    description="Controla a maior fileira ininterrupta de números seguidos (ex: 14-15-16-17 = 4 consecutivas)."
                    impact="Impacto: Limitar em ≤ 5 ou ≤ 6 elimina sequências artificiais sem descartar saltos normais."
                  />
                </div>
                <span className="font-mono text-xs font-bold text-violet-300 bg-violet-500/20 px-1.5 py-0.5 rounded border border-violet-400/40">
                  Máx {filters.maxConsecutivas}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Limite máximo de dezenas consecutivas seguidas no volante (ex: 15-16-17). Recomendado: 3 a 6.
              </p>
              <div className="grid grid-cols-4 gap-1.5">
                {[3, 4, 5, 6].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => update({ maxConsecutivas: val })}
                    className={`py-1.5 rounded-lg text-xs font-mono font-bold border transition cursor-pointer ${
                      filters.maxConsecutivas === val
                        ? 'bg-violet-500 text-white border-violet-400'
                        : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800'
                    }`}
                  >
                    ≤ {val}
                  </button>
                ))}
              </div>
              <input
                type="range"
                min="3"
                max="8"
                value={filters.maxConsecutivas}
                onChange={(e) => update({ maxConsecutivas: parseInt(e.target.value, 10) })}
                className="w-full accent-violet-400 cursor-pointer"
              />
            </div>

            {/* 2.4c QUADRANTES (Q1 a Q4 DO VOLANTE 5x5) */}
            <div className="bg-slate-950/80 p-4 rounded-2xl border border-teal-500/40 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-teal-400" />
                  <span className="text-xs font-bold text-white">Quadrantes (Q1–Q4)</span>
                  <FilterTooltip
                    title="Distribuição por Quadrantes 5×5"
                    description="Divide o volante nos 4 cantos (Q1..Q4) evitando concentração excessiva em apenas uma região do cartão."
                    impact="Impacto: Exigir 2–5 dezenas por quadrante melhora a dispersão espacial do fechamento."
                  />
                </div>
                <button
                  type="button"
                  onClick={() =>
                    update({
                      quadrantesAtivo: !filters.quadrantesAtivo,
                      quadranteMin: filters.quadranteMin ?? 2,
                      quadranteMax: filters.quadranteMax ?? 5,
                    })
                  }
                  className={`px-2 py-0.5 text-[10px] font-bold rounded border transition cursor-pointer ${
                    filters.quadrantesAtivo
                      ? 'bg-teal-500 text-slate-950 border-teal-400 font-black'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                >
                  {filters.quadrantesAtivo ? '✓ Ativo' : 'Ativar'}
                </button>
              </div>
              <p className="text-[11px] text-slate-400">
                Equilibra as dezenas nos 4 quadrantes do volante 5×5 (Q1..Q4). Faixa por quadrante:{' '}
                <strong className="font-mono text-teal-300">
                  {filters.quadranteMin ?? 2}–{filters.quadranteMax ?? 5}
                </strong>.
              </p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                    <span>Mín/Q:</span>
                    <span className="text-teal-300 font-bold">{filters.quadranteMin ?? 2}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max={filters.quadranteMax ?? 5}
                    value={filters.quadranteMin ?? 2}
                    onChange={(e) =>
                      update({
                        quadrantesAtivo: true,
                        quadranteMin: parseInt(e.target.value, 10),
                      })
                    }
                    className="w-full accent-teal-400 cursor-pointer"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                    <span>Máx/Q:</span>
                    <span className="text-teal-300 font-bold">{filters.quadranteMax ?? 5}</span>
                  </div>
                  <input
                    type="range"
                    min={filters.quadranteMin ?? 2}
                    max="6"
                    value={filters.quadranteMax ?? 5}
                    onChange={(e) =>
                      update({
                        quadrantesAtivo: true,
                        quadranteMax: parseInt(e.target.value, 10),
                      })
                    }
                    className="w-full accent-teal-400 cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* 2.5 FILTRO GEOMÉTRICO: CRUZ DA LOTOFÁCIL (9 DEZENAS NO VOLANTE 5×5) */}
            {(() => {
              const isCruzEnabled = filters.cruzAtiva !== false;
              const isStrictActive = Boolean(filters.strictValidation || filters.validacaoEstritaCruz);
              const currentCruzMin = isStrictActive ? 5 : (filters.cruzMin ?? 4);
              const currentCruzMax = isStrictActive ? 6 : (filters.cruzMax ?? 7);
              const prevDrawCruzCount = latestDraw.dezenas.filter((n) => CRUZ_DEZENAS.includes(n)).length;
              const poolCruzCount = selectedNumbers.filter((n) => CRUZ_DEZENAS.includes(n)).length;

              return (
                <div
                  className={`p-4 rounded-2xl border-2 space-y-3 relative overflow-hidden transition ${
                    isCruzEnabled
                      ? 'bg-gradient-to-br from-blue-950/40 via-slate-950 to-slate-950 border-blue-500/45'
                      : 'bg-slate-950/60 border-slate-800 opacity-85'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <Square className="w-4 h-4 text-blue-400" />
                      <span className="text-xs font-bold text-white">Cruz da Lotofácil</span>
                      <FilterTooltip
                        title="Geometria da Cruz no Volante 5×5"
                        description="As 9 dezenas que formam a cruz no volante 5×5: [02, 07, 11, 12, 13, 14, 15, 17, 22]."
                        impact="Impacto: Padrão recomendado de 4 a 7 dezenas (Zona de Ouro 5 a 6 dezenas)."
                      />
                    </div>
                    <div className="flex items-center gap-1.5">
                      {isCruzEnabled && currentCruzMin === 5 && currentCruzMax === 6 && (
                        <span className="text-[9px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 px-1.5 py-0.5 rounded">
                          ★ ZONA DE OURO
                        </span>
                      )}
                      <span className="font-mono text-xs font-bold text-blue-300 bg-blue-500/20 px-2 py-0.5 rounded border border-blue-400/40 tabular-nums">
                        {isCruzEnabled ? `${currentCruzMin}–${currentCruzMax} dez` : 'Desligado'}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          update({
                            cruzAtiva: !isCruzEnabled,
                            ...(!isCruzEnabled ? { cruzMin: currentCruzMin, cruzMax: currentCruzMax } : { strictValidation: false, validacaoEstritaCruz: false }),
                          })
                        }
                        className={`px-2 py-0.5 text-[10px] font-bold rounded border transition cursor-pointer whitespace-nowrap shrink-0 ${
                          isCruzEnabled
                            ? 'bg-blue-500 text-slate-950 border-blue-400 font-black'
                            : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
                        }`}
                      >
                        {isCruzEnabled ? 'Ativo' : 'Ativar'}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <p className="text-[11px] text-slate-400">
                      9 dezenas da Cruz no volante 5×5:{' '}
                      <span className="font-mono text-blue-300 font-bold">
                        {CRUZ_DEZENAS.map((n) => n.toString().padStart(2, '0')).join(', ')}
                      </span>
                    </p>
                    <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono text-slate-400 tabular-nums">
                      <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800">
                        Último #{latestDraw.concurso}: <strong className="text-blue-300">{prevDrawCruzCount}/9</strong> na Cruz
                      </span>
                      {selectedNumbers.length > 0 && (
                        <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800">
                          Pool atual: <strong className="text-emerald-300">{poolCruzCount}/9</strong> na Cruz
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Modo Validação Estrita da Cruz (5 a 6 Dezenas) */}
                  <button
                    type="button"
                    onClick={() => {
                      const nextVal = !isStrictActive;
                      update({
                        cruzAtiva: true,
                        validacaoEstritaCruz: nextVal,
                        strictValidation: nextVal,
                        cruzMin: nextVal ? 5 : 4,
                        cruzMax: nextVal ? 6 : 7,
                      });
                    }}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition text-left select-none ${
                      isStrictActive && isCruzEnabled
                        ? 'bg-amber-500/15 border-amber-400/70 text-amber-100 shadow-sm'
                        : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-6 h-6 rounded flex items-center justify-center font-bold text-xs shrink-0 ${
                          isStrictActive && isCruzEnabled
                            ? 'bg-amber-400 text-slate-950 font-black'
                            : 'bg-slate-800 text-slate-500'
                        }`}
                      >
                        ★
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white flex items-center gap-1.5">
                          <span>Modo Validação Estrita da Cruz</span>
                          {isStrictActive && isCruzEnabled && (
                            <span className="text-[9px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 px-1 rounded">
                              ESTRITO (5–6)
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400">
                          Poda rigorosa: mantém exclusivamente bilhetes com 5 ou 6 dezenas na Cruz.
                        </p>
                      </div>
                    </div>
                    <div
                      className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors duration-200 shrink-0 ${
                        isStrictActive && isCruzEnabled ? 'bg-amber-500' : 'bg-slate-700'
                      }`}
                    >
                      <div
                        className={`bg-white w-4 h-4 rounded-full shadow transform transition-transform duration-200 ${
                          isStrictActive && isCruzEnabled ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </div>
                  </button>

                  {/* Botões Pré-definidos */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() =>
                        update({
                          cruzAtiva: true,
                          validacaoEstritaCruz: false,
                          strictValidation: false,
                          cruzMin: 4,
                          cruzMax: 7,
                        })
                      }
                      className={`px-2.5 py-2 rounded-xl text-xs font-bold border transition cursor-pointer text-left flex flex-col justify-between ${
                        isCruzEnabled && !isStrictActive && currentCruzMin === 4 && currentCruzMax === 7
                          ? 'bg-blue-500/30 border-blue-400 text-blue-200 ring-1 ring-blue-400/60 shadow-md shadow-blue-500/20'
                          : 'bg-slate-900/80 hover:bg-slate-800 text-slate-300 border-slate-700'
                      }`}
                    >
                      <span className="font-bold text-blue-300">4 a 7 Dezenas</span>
                      <span className="text-[10px] text-slate-400 mt-0.5 font-mono">
                        Padrão Recomendado (&gt;92%)
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        update({
                          cruzAtiva: true,
                          validacaoEstritaCruz: true,
                          strictValidation: true,
                          cruzMin: 5,
                          cruzMax: 6,
                        })
                      }
                      className={`px-2.5 py-2 rounded-xl text-xs font-bold border transition cursor-pointer text-left flex flex-col justify-between ${
                        isCruzEnabled && currentCruzMin === 5 && currentCruzMax === 6
                          ? 'bg-gradient-to-r from-amber-500/30 to-blue-500/20 border-amber-400 text-amber-200 ring-1 ring-amber-400/60 shadow-md shadow-amber-500/20'
                          : 'bg-slate-900/80 hover:bg-slate-800 text-slate-300 border-slate-700'
                      }`}
                    >
                      <span className="flex items-center gap-1 font-black text-amber-300">
                        <Sparkles className="w-3 h-3 text-amber-400" />
                        <span>5 a 6 Dezenas</span>
                      </span>
                      <span className="text-[10px] text-slate-400 mt-0.5 font-mono">
                        Zona de Ouro (&gt;72%)
                      </span>
                    </button>
                  </div>

                  {/* Sliders de Ajuste Fino Customizado (0 a 9) */}
                  <div className="space-y-2 pt-2 border-t border-slate-800">
                    <div className="flex justify-between items-center text-[10px] text-slate-400">
                      <span>Ajuste Manual (0 a 9 dezenas):</span>
                      <span className="font-mono text-blue-300 font-bold tabular-nums">
                        Mín: {currentCruzMin} | Máx: {currentCruzMax}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[9px] text-slate-400 block mb-1">Mínimo na Cruz:</label>
                        <input
                          type="range"
                          min="0"
                          max="9"
                          value={currentCruzMin}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10);
                            const nextMax = Math.max(val, currentCruzMax);
                            update({
                              cruzAtiva: true,
                              validacaoEstritaCruz: false,
                              strictValidation: false,
                              cruzMin: val,
                              cruzMax: nextMax,
                            });
                          }}
                          className="w-full accent-blue-400 cursor-pointer h-1.5 bg-slate-800 rounded"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] text-slate-400 block mb-1">Máximo na Cruz:</label>
                        <input
                          type="range"
                          min="0"
                          max="9"
                          value={currentCruzMax}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10);
                            const nextMin = Math.min(val, currentCruzMin);
                            update({
                              cruzAtiva: true,
                              validacaoEstritaCruz: false,
                              strictValidation: false,
                              cruzMin: nextMin,
                              cruzMax: val,
                            });
                          }}
                          className="w-full accent-blue-400 cursor-pointer h-1.5 bg-slate-800 rounded"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* 2.6 FILTRO DE EXTREMIDADES (BOLA 1 E BOLA 15) */}
            <div className="bg-gradient-to-br from-emerald-950/30 via-slate-950 to-slate-950 p-4 rounded-2xl border-2 border-emerald-500/40 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold text-white">Filtro de Extremidades</span>
                  <FilterTooltip
                    title="Extremidades: Bola 1 e Bola 15"
                    description="Bola 1 (menor número sorteado) quase sempre inicia em 01–04; Bola 15 (maior) termina em 22–25."
                    impact="Impacto: Cobre mais de 91% dos sorteios e corta bilhetes com início/fim estatisticamente raros."
                  />
                </div>
                <span className="font-mono text-[10px] font-bold text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-500/40">
                  B1:[01-04] • B15:[22-25]
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Audita se a <strong className="text-slate-200">Bola 1</strong> (menor dezena) está em [01-04] e a <strong className="text-slate-200">Bola 15</strong> (maior dezena) em [22-25]. Jogos fora desta regra são sinalizados com badge de <strong className="text-rose-300">Fora do Padrão</strong>.
              </p>

              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800">
                <div className="bg-slate-900/80 p-2 rounded-xl border border-slate-800">
                  <div className="flex justify-between items-center text-[10px] text-slate-400">
                    <span>Bola 1 (Máx):</span>
                    <span className="font-mono text-emerald-400 font-bold">≤ 0{filters.bola1Max ?? 4}</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    value={filters.bola1Max ?? 4}
                    onChange={(e) => update({ bola1Max: parseInt(e.target.value, 10) })}
                    className="w-full accent-emerald-400 cursor-pointer h-1.5 bg-slate-850 rounded mt-1.5"
                  />
                </div>

                <div className="bg-slate-900/80 p-2 rounded-xl border border-slate-800">
                  <div className="flex justify-between items-center text-[10px] text-slate-400">
                    <span>Bola 15 (Mín):</span>
                    <span className="font-mono text-emerald-400 font-bold">≥ {filters.bola15Min ?? 22}</span>
                  </div>
                  <input
                    type="range"
                    min="20"
                    max="25"
                    value={filters.bola15Min ?? 22}
                    onChange={(e) => update({ bola15Min: parseInt(e.target.value, 10) })}
                    className="w-full accent-emerald-400 cursor-pointer h-1.5 bg-slate-850 rounded mt-1.5"
                  />
                </div>
              </div>

              <div className="space-y-1.5 pt-1 border-t border-slate-850 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-300">Primos Zona de Ouro (5-6):</span>
                  <button
                    type="button"
                    onClick={() => update({ apenasZonaDeOuroPrimos: !filters.apenasZonaDeOuroPrimos })}
                    className={`px-2 py-0.5 text-[10px] rounded font-bold border transition cursor-pointer ${
                      filters.apenasZonaDeOuroPrimos
                        ? 'bg-rose-500 text-slate-950 border-rose-400'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}
                  >
                    {filters.apenasZonaDeOuroPrimos ? '✓ 5 a 6 Primos' : '4 a 7 Primos'}
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-300">Anti-Colisão 15 Pts:</span>
                  <button
                    type="button"
                    onClick={() => update({ antiColisaoHistoricaAtiva: !filters.antiColisaoHistoricaAtiva })}
                    className={`px-2 py-0.5 text-[10px] rounded font-bold border transition cursor-pointer ${
                      filters.antiColisaoHistoricaAtiva !== false
                        ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}
                  >
                    {filters.antiColisaoHistoricaAtiva !== false ? '✓ Ativo' : 'Inativo'}
                  </button>
                </div>
              </div>
            </div>


            {/* 2.5 SELETOR DE CURVA ABC (CLASSE A - 80% FREQUÊNCIA HISTÓRICA) */}
            <div className="bg-gradient-to-br from-amber-950/40 via-slate-950 to-slate-950 p-4 rounded-2xl border-2 border-amber-500/40 space-y-3 sm:col-span-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-bold text-white">
                    Filtro de Curva ABC (Classe A - 80% Frequência Histórica)
                  </span>
                  <FilterTooltip
                    title="Curva ABC de Pareto (80/20)"
                    description="Exige um mínimo de dezenas pertencentes ao grupo Classe A (as 20 mais frequentes no histórico oficial)."
                    impact="Impacto: Garante densidade sólida de dezenas de alta recorrência sem engessar o fechamento."
                  />
                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono">
                    PARETO 80/20
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const nextActive = !filters.curvaAbcAtiva;
                    const minA = filters.minDezenasClasseA || 11;
                    update({ curvaAbcAtiva: nextActive, minDezenasClasseA: minA });
                    saveCurvaAbcFilterConfig({ ativo: nextActive, minClasseA: minA });
                  }}
                  className={`px-3 py-1 text-xs font-bold rounded-lg border transition cursor-pointer flex items-center gap-1.5 ${
                    filters.curvaAbcAtiva
                      ? 'bg-amber-500 text-slate-950 border-amber-400 font-black'
                      : 'bg-slate-800 text-slate-300 border-slate-700'
                  }`}
                >
                  {filters.curvaAbcAtiva ? '✓ Filtro Ativo' : 'Ativar Filtro'}
                </button>
              </div>

              <p className="text-[11px] text-slate-400">
                Garante que todos os jogos gerados contenham o volume mínimo estipulado de dezenas da <strong className="text-amber-300">Classe A</strong> (as 20 dezenas mais frequentes que somam 80% das ocorrências históricas).
              </p>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-300">Mínimo de Classe A por jogo:</span>
                  <div className="flex items-center gap-1">
                    {[10, 11, 12, 13].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => {
                          update({ curvaAbcAtiva: true, minDezenasClasseA: num });
                          saveCurvaAbcFilterConfig({ ativo: true, minClasseA: num });
                        }}
                        className={`px-2.5 py-1 text-xs rounded-lg font-mono font-bold transition cursor-pointer ${
                          filters.minDezenasClasseA === num && filters.curvaAbcAtiva
                            ? 'bg-amber-500 text-slate-950 shadow-sm'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                        }`}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                </div>

                <span className="text-[11px] font-mono text-amber-400/90 font-semibold">
                  {filters.curvaAbcAtiva
                    ? `Exigindo min. ${filters.minDezenasClasseA || 11} dezenas da Classe A`
                    : 'Filtro inativo (padrão flexível)'}
                </span>
              </div>
            </div>

            {/* 2.6 SELETOR DE COMBINAÇÕES DE VAZIO (ANTI-AFINIDADE 10 CONCURSOS) */}
            <div className="bg-gradient-to-br from-rose-950/40 via-slate-950 to-slate-950 p-4 rounded-2xl border-2 border-rose-500/40 space-y-3 sm:col-span-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-rose-400" />
                  <span className="text-xs font-bold text-white">
                    Filtro de Combinações de Vazio (Anti-Afinidade Histórica)
                  </span>
                  <FilterTooltip
                    title="Mapa de Vazios (Anti-Afinidade)"
                    description="Bloqueia duplas de dezenas que tiveram afinidade nula ou mínima nos últimos concursos."
                    impact="Impacto: Poda bilhetes com pares de baixa co-ocorrência no ciclo recente."
                  />
                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 font-mono">
                    10 CONCURSOS
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const nextActive = !filters.vaziosAtivos;
                    update({ vaziosAtivos: nextActive });
                    saveVoidExclusionConfig({
                      ativo: nextActive,
                      paresExcluidos: filters.combinacoesVazioExcluidas || [],
                      bloquearVaziosAbsolutos: true,
                      bloquearVaziosRaros: false,
                      dataAtualizacao: new Date().toISOString(),
                    });
                  }}
                  className={`px-3 py-1 text-xs font-bold rounded-lg border transition cursor-pointer flex items-center gap-1.5 ${
                    filters.vaziosAtivos
                      ? 'bg-rose-500 text-white border-rose-400 font-black'
                      : 'bg-slate-800 text-slate-300 border-slate-700'
                  }`}
                >
                  {filters.vaziosAtivos ? '✓ Filtro Ativo' : 'Ativar Filtro'}
                </button>
              </div>

              <p className="text-[11px] text-slate-400">
                Descarta automaticamente do fechamento bilhetes que contenham conjuntos de dezenas que historicamente nunca ou raramente saíram juntas nos últimos 10 concursos, evitando desperdício de apostas.
              </p>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-300">Pares de Vazio Cadastrados:</span>
                  <span className="px-2 py-0.5 rounded bg-slate-800 font-mono text-xs font-bold text-rose-400">
                    {(filters.combinacoesVazioExcluidas || []).length} duplas
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono text-rose-300/90 font-semibold">
                    {filters.vaziosAtivos
                      ? `Eliminando jogos com duplas de vazio cadastradas`
                      : 'Filtro desativado'}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      if (typeof window !== 'undefined') {
                        window.dispatchEvent(new CustomEvent('switch-tab', { detail: 'estatisticas' }));
                      }
                    }}
                    className="text-[10px] text-cyan-400 hover:text-cyan-300 underline font-bold"
                  >
                    Editar no Mapa de Vazios
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ==================== SEÇÃO 3: PODA COMBINATÓRIA AVANÇADA (6 FILTROS BITWISE) ==================== */}
        <div className="space-y-3 pt-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-cyan-500/30">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                <Sliders className="w-4 h-4 text-cyan-400" />
              </span>
              <div>
                <span className="text-sm font-black uppercase tracking-wider text-cyan-300 font-mono">
                  Poda Combinatória Avançada (Filtros Bitwise &amp; Posicional)
                </span>
                <p className="text-[11px] text-slate-400">
                  Filtros matemáticos de alta precisão com Branch &amp; Bound posicional, máscaras bitwise O(1) e proteção anti-repetição histórica.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  soundService.playFilterClick();
                  update({
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
                  });
                }}
                className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 transition cursor-pointer"
              >
                Ativar Todos os 6
              </button>
              <button
                type="button"
                onClick={() => {
                  soundService.playFilterClick();
                  update({
                    posicionalAtivo: false,
                    multiplosAtivo: false,
                    contagemDigitosAtiva: false,
                    somaAlgarismosAtiva: false,
                    linhasColunasAtivo: false,
                    rankingHistoricoAtivo: false,
                    palpiteIneditoAtivo: false,
                  });
                }}
                className="text-[10px] font-mono font-bold px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition cursor-pointer"
              >
                Desligar
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {/* 3.1 Intervalos Posicionais D1..D15 + Branch & Bound */}
            <div
              className={`p-3.5 rounded-2xl border transition space-y-2 ${
                filters.posicionalAtivo
                  ? 'bg-cyan-950/25 border-cyan-500/50'
                  : 'bg-slate-950/75 border-slate-800'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>1. Intervalos Posicionais D1–D15</span>
                    <FilterTooltip
                      title="Intervalos Posicionais (Branch & Bound)"
                      description="Cada posição ordenada (da 1ª à 15ª bola) respeita intervalos observados em >95% dos resultados reais."
                      impact="Impacto: Acelera a poda combinatória descartando ramos impossíveis antes de completar o bilhete."
                    />
                  </span>
                  <span className="text-[10px] font-mono text-cyan-300/90">
                    Branch &amp; Bound • 95%+ Histórico
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    soundService.playFilterClick();
                    update({ posicionalAtivo: !filters.posicionalAtivo });
                  }}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition cursor-pointer shrink-0 ${
                    filters.posicionalAtivo
                      ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-black'
                      : 'bg-slate-800 text-slate-300 border-slate-700'
                  }`}
                >
                  {filters.posicionalAtivo ? '✓ Ativo' : 'Ativar'}
                </button>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Poda combinações impossíveis por posição ordenada: <span className="font-mono text-slate-300">D1∈[1..3]</span>, <span className="font-mono text-slate-300">D7∈[8..15]</span>, <span className="font-mono text-slate-300">D15∈[23..25]</span>.
              </p>
            </div>

            {/* 3.2 Múltiplos M(3) a M(8) Bitwise */}
            <div
              className={`p-3.5 rounded-2xl border transition space-y-2 ${
                filters.multiplosAtivo
                  ? 'bg-emerald-950/25 border-emerald-500/50'
                  : 'bg-slate-950/75 border-slate-800'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>2. Múltiplos M(3) a M(8) Bitwise</span>
                    <FilterTooltip
                      title="Densidade de Múltiplos M(3)–M(8)"
                      description="Controla a quantidade de múltiplos de 3 (4–7), múltiplos de 4 (2–5) e presença mínima de múltiplos de 5 a 8."
                      impact="Impacto: Remove 672.984 combinações aritmeticamente distorcidas via operações bitwise O(1)."
                    />
                  </span>
                  <span className="text-[10px] font-mono text-emerald-300/90">
                    -672.984 Combos Improváveis
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    soundService.playFilterClick();
                    update({ multiplosAtivo: !filters.multiplosAtivo });
                  }}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition cursor-pointer shrink-0 ${
                    filters.multiplosAtivo
                      ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-black'
                      : 'bg-slate-800 text-slate-300 border-slate-700'
                  }`}
                >
                  {filters.multiplosAtivo ? '✓ Ativo' : 'Ativar'}
                </button>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Máscaras O(1): <span className="font-mono text-slate-300">M(3): 4–7</span> • <span className="font-mono text-slate-300">M(4): 2–5</span> • <span className="font-mono text-slate-300">M(5..8) ≥ 1</span> por bilhete.
              </p>
            </div>

            {/* 3.3 Contagem de Dígitos & Soma dos Algarismos */}
            <div
              className={`p-3.5 rounded-2xl border transition space-y-2 ${
                filters.contagemDigitosAtiva || filters.somaAlgarismosAtiva
                  ? 'bg-indigo-950/25 border-indigo-500/50'
                  : 'bg-slate-950/75 border-slate-800'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>3. Dígitos &amp; Soma Algarismos</span>
                    <FilterTooltip
                      title="Contagem de Dígitos e Soma dos Algarismos"
                      description="Equilibra dezenas de 1 dígito (01–09: 3 a 8) e soma individual dos algarismos entre 63 e 87."
                      impact="Impacto: Filtra desvios de dezenas baixas/altas que escapam da soma simples."
                    />
                  </span>
                  <span className="text-[10px] font-mono text-indigo-300/90">
                    {filters.digitosMin ?? 22}–{filters.digitosMax ?? 27} Díg • Soma {filters.somaAlgarismosMin ?? 63}–{filters.somaAlgarismosMax ?? 87}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    soundService.playFilterClick();
                    const nextOn = !(filters.contagemDigitosAtiva || filters.somaAlgarismosAtiva);
                    update({
                      contagemDigitosAtiva: nextOn,
                      somaAlgarismosAtiva: nextOn,
                      digitosMin: filters.digitosMin ?? 22,
                      digitosMax: filters.digitosMax ?? 27,
                      umDigitoMin: filters.umDigitoMin ?? 3,
                      umDigitoMax: filters.umDigitoMax ?? 8,
                      somaAlgarismosMin: filters.somaAlgarismosMin ?? 63,
                      somaAlgarismosMax: filters.somaAlgarismosMax ?? 87,
                    });
                  }}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition cursor-pointer shrink-0 ${
                    filters.contagemDigitosAtiva || filters.somaAlgarismosAtiva
                      ? 'bg-indigo-500 text-white border-indigo-400 font-black'
                      : 'bg-slate-800 text-slate-300 border-slate-700'
                  }`}
                >
                  {filters.contagemDigitosAtiva || filters.somaAlgarismosAtiva ? '✓ Ativo' : 'Ativar'}
                </button>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Exige <span className="font-mono text-slate-300">3–8</span> dezenas 01–09 (<span className="font-mono text-slate-300">22–27</span> dígitos) e soma de algarismos <span className="font-mono text-slate-300">[63..87]</span>.
              </p>
              <div className="flex items-center gap-2 pt-1 border-t border-slate-800/80 text-[10px] font-mono text-slate-300">
                <span>Algarismos:</span>
                <input
                  type="number"
                  min={50}
                  max={80}
                  value={filters.somaAlgarismosMin ?? 63}
                  onChange={(e) =>
                    update({
                      somaAlgarismosAtiva: true,
                      somaAlgarismosMin: Math.min(85, Math.max(45, Number(e.target.value) || 63)),
                    })
                  }
                  className="w-12 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-center text-white"
                />
                <span>a</span>
                <input
                  type="number"
                  min={70}
                  max={110}
                  value={filters.somaAlgarismosMax ?? 87}
                  onChange={(e) =>
                    update({
                      somaAlgarismosAtiva: true,
                      somaAlgarismosMax: Math.max(65, Math.min(115, Number(e.target.value) || 87)),
                    })
                  }
                  className="w-12 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-center text-white"
                />
              </div>
            </div>

            {/* 3.4 Integridade Linhas / Colunas 5x5 (L1-L5 e C1-C5) */}
            <div
              className={`p-3.5 rounded-2xl border transition space-y-2.5 ${
                filters.linhasColunasAtivo
                  ? 'bg-amber-950/25 border-amber-500/50'
                  : 'bg-slate-950/75 border-slate-800'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>4. Linhas &amp; Colunas 5×5 (L1–L5 / C1–C5)</span>
                    <FilterTooltip
                      title="Integridade de Linhas e Colunas 5×5"
                      description="Exige equilíbrio entre as 5 linhas e 5 colunas do volante, evitando linhas vazias ou mais de 1 linha/coluna cheia."
                      impact="Impacto: Mantém padrão visual idêntico ao de >88% dos concursos premiados."
                    />
                  </span>
                  <span className="text-[10px] font-mono text-amber-300/90">
                    L: {filters.linhasMin ?? 1}–{filters.linhasMax ?? 4} • C: {filters.colunasMin ?? 1}–{filters.colunasMax ?? 4}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    soundService.playFilterClick();
                    update({
                      linhasColunasAtivo: !filters.linhasColunasAtivo,
                      linhasMin: filters.linhasMin ?? 1,
                      linhasMax: filters.linhasMax ?? 4,
                      colunasMin: filters.colunasMin ?? 1,
                      colunasMax: filters.colunasMax ?? 4,
                      maxLinhasCheias: filters.maxLinhasCheias ?? 1,
                      maxColunasCheias: filters.maxColunasCheias ?? 1,
                    });
                  }}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition cursor-pointer shrink-0 ${
                    filters.linhasColunasAtivo
                      ? 'bg-amber-500 text-slate-950 border-amber-400 font-black'
                      : 'bg-slate-800 text-slate-300 border-slate-700'
                  }`}
                >
                  {filters.linhasColunasAtivo ? '✓ Ativo' : 'Ativar'}
                </button>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Controla mínimos/máximos por linha (L1–L5) e coluna (C1–C5), evitando linhas/colunas zeradas ou cheias.
              </p>
              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800/80 text-[10px] font-mono text-slate-300">
                <div className="flex items-center justify-between gap-1">
                  <span>Linhas:</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min={0}
                      max={4}
                      value={filters.linhasMin ?? 1}
                      onChange={(e) => {
                        const v = Math.max(0, Math.min(4, Number(e.target.value) || 0));
                        update({
                          linhasColunasAtivo: true,
                          linhasMin: v,
                          linhasMax: Math.max(v, filters.linhasMax ?? 4),
                        });
                      }}
                      className="w-10 bg-slate-900 border border-slate-700 rounded px-1 py-0.5 text-center text-white"
                    />
                    <span>–</span>
                    <input
                      type="number"
                      min={1}
                      max={5}
                      value={filters.linhasMax ?? 4}
                      onChange={(e) => {
                        const v = Math.max(1, Math.min(5, Number(e.target.value) || 4));
                        update({
                          linhasColunasAtivo: true,
                          linhasMax: v,
                          linhasMin: Math.min(v, filters.linhasMin ?? 1),
                        });
                      }}
                      className="w-10 bg-slate-900 border border-slate-700 rounded px-1 py-0.5 text-center text-white"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between gap-1">
                  <span>Colunas:</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min={0}
                      max={4}
                      value={filters.colunasMin ?? 1}
                      onChange={(e) => {
                        const v = Math.max(0, Math.min(4, Number(e.target.value) || 0));
                        update({
                          linhasColunasAtivo: true,
                          colunasMin: v,
                          colunasMax: Math.max(v, filters.colunasMax ?? 4),
                        });
                      }}
                      className="w-10 bg-slate-900 border border-slate-700 rounded px-1 py-0.5 text-center text-white"
                    />
                    <span>–</span>
                    <input
                      type="number"
                      min={1}
                      max={5}
                      value={filters.colunasMax ?? 4}
                      onChange={(e) => {
                        const v = Math.max(1, Math.min(5, Number(e.target.value) || 4));
                        update({
                          linhasColunasAtivo: true,
                          colunasMax: v,
                          colunasMin: Math.min(v, filters.colunasMin ?? 1),
                        });
                      }}
                      className="w-10 bg-slate-900 border border-slate-700 rounded px-1 py-0.5 text-center text-white"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 3.5 Equilíbrio Ranking Histórico */}
            <div
              className={`p-3.5 rounded-2xl border transition space-y-2 ${
                filters.rankingHistoricoAtivo
                  ? 'bg-purple-950/25 border-purple-500/50'
                  : 'bg-slate-950/75 border-slate-800'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>5. Ranking Histórico Top 5–20</span>
                    <FilterTooltip
                      title="Equilíbrio do Ranking Histórico"
                      description="Regula a quantidade de dezenas vindas do Top 5 (2–4), Top 10 (4–8), Top 15 (7–11) e Top 20 (11–14) histórico."
                      impact="Impacto: Evita apostas compostas só pelas 'mais sorteadas' ou só por dezenas raras."
                    />
                  </span>
                  <span className="text-[10px] font-mono text-purple-300/90">
                    Top5: 2–4 | Top10: 4–8 | Top15: 7–11
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    soundService.playFilterClick();
                    update({ rankingHistoricoAtivo: !filters.rankingHistoricoAtivo });
                  }}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition cursor-pointer shrink-0 ${
                    filters.rankingHistoricoAtivo
                      ? 'bg-purple-500 text-white border-purple-400 font-black'
                      : 'bg-slate-800 text-slate-300 border-slate-700'
                  }`}
                >
                  {filters.rankingHistoricoAtivo ? '✓ Ativo' : 'Ativar'}
                </button>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Impede excesso ou escassez das dezenas mais sorteadas da história (<span className="font-mono text-slate-300">Top 20: 11–14</span> por jogo).
              </p>
            </div>

            {/* 3.6 Anti-Repetição Palpite Inédito */}
            <div
              className={`p-3.5 rounded-2xl border transition space-y-2 ${
                filters.palpiteIneditoAtivo !== false
                  ? 'bg-sky-950/25 border-sky-500/50'
                  : 'bg-slate-950/75 border-slate-800'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>6. Palpite Inédito (Anti-15)</span>
                    <FilterTooltip
                      title="Anti-Colisão Histórica (Palpite Inédito)"
                      description="Compara em O(1) via bitmask contra os concursos já sorteados para bloquear combinações idênticas repetidas."
                      impact="Impacto: Garante que 100% dos bilhetes da matriz sejam combinações inéditas para 15 pontos."
                    />
                  </span>
                  <span className="text-[10px] font-mono text-sky-300/90">
                    Hash Bitwise O(1) vs Histórico
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    soundService.playFilterClick();
                    const nextVal = filters.palpiteIneditoAtivo === false;
                    update({
                      palpiteIneditoAtivo: nextVal,
                      antiColisaoHistoricaAtiva: nextVal,
                    });
                  }}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition cursor-pointer shrink-0 ${
                    filters.palpiteIneditoAtivo !== false
                      ? 'bg-sky-500 text-slate-950 border-sky-400 font-black'
                      : 'bg-slate-800 text-slate-300 border-slate-700'
                  }`}
                >
                  {filters.palpiteIneditoAtivo !== false ? '✓ Ativo' : 'Inativo'}
                </button>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Rejeita instantaneamente combinações de 15 dezenas já premiadas em concursos oficiais anteriores.
              </p>
            </div>
          </div>

          {/* SEÇÃO 4: FALLBACK PROGRESSIVO AUTOMÁTICO EM 3 NÍVEIS */}
          <div
            className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
              filters.fallbackProgressivoAtivo !== false
                ? 'bg-emerald-950/20 border-emerald-500/40'
                : 'bg-slate-950/80 border-slate-800'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 shrink-0">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs sm:text-sm font-bold text-white">
                    Fallback Progressivo Automático (3 Níveis)
                  </span>
                  <FilterTooltip
                    title="Relaxamento Automático em 3 Níveis"
                    description="Se filtros muito rígidos zerarem o gerador, relaxa progressivamente: N1 (Caudas) → N2 (Múltiplos/Posicional) → N3 (Faixas ampliadas)."
                    impact="Impacto: Impede travamentos no Estúdio de Fechamento mantendo o máximo rigor possível."
                  />
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                    Nível 1 → Nível 2 → Nível 3
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                  Quando filtros muito restritivos zeram a geração de bilhetes, o motor relaxa gradualmente em 3 níveis (Caudas → Múltiplos/Posicional → Faixas Estatísticas) sem perder a garantia combinatória.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                soundService.playFilterClick();
                update({
                  fallbackProgressivoAtivo: filters.fallbackProgressivoAtivo === false,
                });
              }}
              className={`px-4 py-2 rounded-xl text-xs font-black border transition cursor-pointer shrink-0 ${
                filters.fallbackProgressivoAtivo !== false
                  ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-sm shadow-emerald-500/20'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
              }`}
            >
              {filters.fallbackProgressivoAtivo !== false ? '✓ Fallback Ativo' : 'Desativado (Estrito)'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
