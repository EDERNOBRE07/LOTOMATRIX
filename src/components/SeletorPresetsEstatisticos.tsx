import React, { useState, useEffect } from 'react';
import { PRESETS_LOTOFACIL, PresetLotoFacilItem } from '../services/presetsFiltros';
import { FilterCriteria } from '../types/lotofacil';
import { Sliders, Shield, Zap, Target, Layers, Save, Trash2, BookmarkCheck, Sparkles } from 'lucide-react';

export type StatisticalPresetOption = PresetLotoFacilItem;

interface SavedCustomPreset {
  id: string;
  nome: string;
  criadoEm: string;
  filtros: FilterCriteria;
}

const CUSTOM_PRESETS_STORAGE_KEY = 'lotosniper_custom_filter_presets_v1';

interface SeletorPresetsEstatisticosProps {
  activePresetId?: 'conservador' | 'balanceado' | 'agressivo' | 'estratificado' | 'personalizado' | 'custom' | string;
  onSelectPreset: (preset: PresetLotoFacilItem) => void;
  currentFilters?: FilterCriteria;
  onApplyCustomFilters?: (filters: FilterCriteria) => void;
  className?: string;
}

export const SeletorPresetsEstatisticos: React.FC<SeletorPresetsEstatisticosProps> = ({
  activePresetId = 'balanceado',
  onSelectPreset,
  currentFilters,
  onApplyCustomFilters,
  className = '',
}) => {
  const presetsList: PresetLotoFacilItem[] = [
    PRESETS_LOTOFACIL.balanceado,
    PRESETS_LOTOFACIL.conservador,
    PRESETS_LOTOFACIL.agressivo,
    PRESETS_LOTOFACIL.estratificado,
  ];

  const [savedPresets, setSavedPresets] = useState<SavedCustomPreset[]>(() => {
    try {
      const raw = localStorage.getItem(CUSTOM_PRESETS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });
  const [presetNameInput, setPresetNameInput] = useState('');
  const [showSaveRow, setShowSaveRow] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(CUSTOM_PRESETS_STORAGE_KEY, JSON.stringify(savedPresets));
    } catch {}
  }, [savedPresets]);

  const handleSaveCustomPreset = () => {
    if (!currentFilters) return;
    const trimmed = presetNameInput.trim() || `Meu Perfil #${savedPresets.length + 1}`;
    const entry: SavedCustomPreset = {
      id: `custom-${Date.now()}`,
      nome: trimmed,
      criadoEm: new Date().toLocaleDateString('pt-BR'),
      filtros: { ...currentFilters, presetEstatistico: 'custom' },
    };
    setSavedPresets((prev) => [entry, ...prev].slice(0, 8));
    setPresetNameInput('');
    setShowSaveRow(false);
    setSaveFeedback(`Perfil "${trimmed}" salvo com sucesso.`);
    setTimeout(() => setSaveFeedback(null), 3500);
  };

  const handleDeleteCustomPreset = (id: string) => {
    setSavedPresets((prev) => prev.filter((p) => p.id !== id));
  };

  const isCustomActive = activePresetId === 'personalizado' || activePresetId === 'custom';

  return (
    <div
      className={`bg-slate-900/95 border border-slate-800 rounded-2xl p-5 w-full shadow-xl space-y-4 ${className}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <Sliders className="w-4 h-4 text-amber-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-100">
              Presets Inteligentes &amp; Calibração Estatística
            </h3>
            {isCustomActive && (
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/40">
                Personalizado Ativo
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Selecione um perfil calibrado pela curva histórica da Caixa ou salve sua própria calibração customizada.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {currentFilters && onApplyCustomFilters && (
            <button
              type="button"
              onClick={() => setShowSaveRow((v) => !v)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40 text-xs font-bold transition cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Salvar Personalizado</span>
            </button>
          )}
          <span className="text-[10px] font-mono bg-slate-800 text-slate-400 px-2 py-1 rounded-lg border border-slate-700">
            Gaussian / σ
          </span>
        </div>
      </div>

      {/* Inline Save Custom Preset Row */}
      {showSaveRow && currentFilters && (
        <div className="p-3 rounded-xl bg-slate-950 border border-amber-500/30 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <input
            type="text"
            value={presetNameInput}
            onChange={(e) => setPresetNameInput(e.target.value)}
            placeholder="Nome do perfil (ex: Acumulado 5M Sniper)"
            maxLength={48}
            className="flex-1 bg-slate-900 border border-slate-700 focus:border-amber-400 rounded-lg px-3 py-1.5 text-xs text-white outline-none"
          />
          <button
            type="button"
            onClick={handleSaveCustomPreset}
            className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black transition cursor-pointer"
          >
            Gravar Perfil
          </button>
        </div>
      )}

      {saveFeedback && (
        <div className="text-xs text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-3 py-1.5 flex items-center gap-1.5">
          <BookmarkCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>{saveFeedback}</span>
        </div>
      )}

      {/* 4 Canonical Presets + Personalizado Status Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3" role="radiogroup">
        {presetsList.map((preset) => {
          const isSelected = activePresetId === preset.id;

          let borderClass = 'border-slate-800 bg-slate-950/60 hover:border-slate-700';
          let titleColor = 'text-slate-200';
          let badgeBorder = 'border-slate-700 text-slate-400 bg-slate-800';
          let activeDot = 'text-sky-400';

          if (preset.id === 'conservador') {
            badgeBorder = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
            activeDot = 'text-emerald-400';
            if (isSelected) {
              borderClass = 'border-2 border-emerald-500 bg-slate-900/90 shadow-md shadow-emerald-500/10';
              titleColor = 'text-emerald-400';
            }
          } else if (preset.id === 'balanceado') {
            badgeBorder = 'bg-sky-500/10 text-sky-400 border-sky-500/30';
            activeDot = 'text-sky-400';
            if (isSelected) {
              borderClass = 'border-2 border-sky-500 bg-slate-900/90 shadow-md shadow-sky-500/10';
              titleColor = 'text-sky-400';
            }
          } else if (preset.id === 'agressivo') {
            badgeBorder = 'bg-amber-500/10 text-amber-400 border-amber-500/30';
            activeDot = 'text-amber-400';
            if (isSelected) {
              borderClass = 'border-2 border-amber-500 bg-slate-900/90 shadow-md shadow-amber-500/10';
              titleColor = 'text-amber-400';
            }
          } else if (preset.id === 'estratificado') {
            badgeBorder = 'bg-violet-500/10 text-violet-300 border-violet-500/30';
            activeDot = 'text-violet-400';
            if (isSelected) {
              borderClass = 'border-2 border-violet-500 bg-slate-900/90 shadow-md shadow-violet-500/10';
              titleColor = 'text-violet-300';
            }
          }

          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => onSelectPreset(preset)}
              className={`text-left p-3.5 rounded-xl border transition-all cursor-pointer relative flex flex-col justify-between ${borderClass}`}
            >
              <div>
                <div className="flex items-center justify-between gap-1 mb-1.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    {preset.id === 'conservador' && <Shield className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                    {preset.id === 'balanceado' && <Target className="w-3.5 h-3.5 text-sky-400 shrink-0" />}
                    {preset.id === 'agressivo' && <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                    {preset.id === 'estratificado' && <Layers className="w-3.5 h-3.5 text-violet-400 shrink-0" />}
                    <span className={`text-xs font-bold truncate ${titleColor}`}>{preset.nome.replace(' (Recomendado)', '')}</span>
                  </div>
                  <span className={`text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded border shrink-0 ${badgeBorder}`}>
                    {preset.badge}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-snug mb-2 line-clamp-3">{preset.descricao}</p>
              </div>
              <div>
                <div className="flex flex-wrap gap-1 mb-2">
                  {preset.filtros.estratificacaoCaudaAtiva && (
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-800/90 text-amber-300 border border-slate-700">
                      Caudas 75/15/10
                    </span>
                  )}
                  {preset.filtros.posicionalAtivo && (
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-800/90 text-cyan-300 border border-slate-700">
                      D1–D15
                    </span>
                  )}
                  {preset.filtros.multiplosAtivo && (
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-800/90 text-emerald-300 border border-slate-700">
                      M3–M8
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between text-[10px] font-mono border-t border-slate-800/80 pt-2 text-slate-500">
                  <span>Corte: {preset.corteMedio}</span>
                  {isSelected && <span className={`${activeDot} font-bold`}>● Ativo</span>}
                </div>
              </div>
            </button>
          );
        })}

        {/* 5th Profile: Personalizado */}
        <div
          className={`text-left p-3.5 rounded-xl border transition-all flex flex-col justify-between ${
            isCustomActive
              ? 'border-2 border-amber-400 bg-amber-950/20 shadow-md shadow-amber-500/10'
              : 'border-slate-800 bg-slate-950/60'
          }`}
        >
          <div>
            <div className="flex items-center justify-between gap-1 mb-1.5">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className={`text-xs font-bold ${isCustomActive ? 'text-amber-300' : 'text-slate-200'}`}>
                  Personalizado
                </span>
              </div>
              <span className="text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded border bg-slate-800 text-amber-300 border-amber-500/30">
                Sob Medida
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-snug mb-2">
              Ativado automaticamente ao ajustar qualquer controle abaixo. Salve seus perfis favoritos localmente.
            </p>
          </div>
          <div className="flex items-center justify-between text-[10px] font-mono border-t border-slate-800/80 pt-2 text-slate-500">
            <span>{savedPresets.length} salvo(s)</span>
            {isCustomActive ? (
              <span className="text-amber-400 font-bold">● Ativo</span>
            ) : (
              <span className="text-slate-500">Ajuste livre</span>
            )}
          </div>
        </div>
      </div>

      {/* Saved Custom Presets Strip */}
      {savedPresets.length > 0 && onApplyCustomFilters && (
        <div className="pt-3 border-t border-slate-800/90 space-y-2">
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">
            Perfis Personalizados Salvos:
          </span>
          <div className="flex flex-wrap gap-2">
            {savedPresets.map((item) => (
              <div
                key={item.id}
                className="inline-flex items-center gap-1.5 bg-slate-950 border border-slate-700 hover:border-amber-500/50 rounded-lg px-2.5 py-1.5 text-xs"
              >
                <button
                  type="button"
                  onClick={() => onApplyCustomFilters(item.filtros)}
                  className="text-left flex items-center gap-2 cursor-pointer"
                  title={`Soma ${item.filtros.somaMin}–${item.filtros.somaMax} | Pares ${item.filtros.paresMin}–${item.filtros.paresMax}`}
                >
                  <span className="font-bold text-amber-300">{item.nome}</span>
                  <span className="text-[10px] font-mono text-slate-400">
                    Σ{item.filtros.somaMin}-{item.filtros.somaMax}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteCustomPreset(item.id)}
                  className="p-0.5 text-slate-500 hover:text-rose-400 transition cursor-pointer"
                  title="Excluir perfil salvo"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
