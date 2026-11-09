import React from 'react';
import { PRESETS_LOTOFACIL, PresetLotoFacilItem } from '../services/presetsFiltros';
import { Sliders, Sparkles, Shield, Zap, Target } from 'lucide-react';

export type StatisticalPresetOption = PresetLotoFacilItem;

interface SeletorPresetsEstatisticosProps {
  activePresetId?: 'conservador' | 'balanceado' | 'agressivo' | 'custom' | string;
  onSelectPreset: (preset: PresetLotoFacilItem) => void;
  className?: string;
}

export const SeletorPresetsEstatisticos: React.FC<SeletorPresetsEstatisticosProps> = ({
  activePresetId = 'balanceado',
  onSelectPreset,
  className = '',
}) => {
  const presetsList: PresetLotoFacilItem[] = [
    PRESETS_LOTOFACIL.conservador,
    PRESETS_LOTOFACIL.balanceado,
    PRESETS_LOTOFACIL.agressivo,
  ];

  return (
    <div
      className={`bg-slate-900 border border-slate-800 rounded-xl p-5 w-full shadow-lg ${className}`}
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-sky-400" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-200">
              Presets Estatísticos de Filtros
            </h3>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Calibrados pela distribuição normal histórica de apurações da Lotofácil
          </p>
        </div>
        <span className="text-[10px] font-mono bg-slate-800 text-slate-400 px-2 py-0.5 rounded border border-slate-700">
          Gaussian / σ
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3" role="radiogroup">
        {presetsList.map((preset) => {
          const isSelected = activePresetId === preset.id;

          let borderClass = 'border-slate-800 bg-slate-950/60 hover:border-slate-700';
          let titleColor = 'text-slate-200';
          let badgeBorder = 'border-slate-700 text-slate-400 bg-slate-800';

          if (preset.id === 'conservador') {
            badgeBorder = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
            if (isSelected) {
              borderClass = 'border-2 border-emerald-500 bg-slate-900/90 shadow-md shadow-emerald-500/10';
              titleColor = 'text-emerald-400';
            }
          } else if (preset.id === 'balanceado') {
            badgeBorder = 'bg-sky-500/10 text-sky-400 border-sky-500/30';
            if (isSelected) {
              borderClass = 'border-2 border-sky-500 bg-slate-900/90 shadow-md shadow-sky-500/10';
              titleColor = 'text-sky-400';
            }
          } else if (preset.id === 'agressivo') {
            badgeBorder = 'bg-amber-500/10 text-amber-400 border-amber-500/30';
            if (isSelected) {
              borderClass = 'border-2 border-amber-500 bg-slate-900/90 shadow-md shadow-amber-500/10';
              titleColor = 'text-amber-400';
            }
          }

          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => onSelectPreset(preset)}
              className={`text-left p-3.5 rounded-lg border transition-all cursor-pointer relative ${borderClass}`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  {preset.id === 'conservador' && <Shield className="w-3.5 h-3.5 text-emerald-400" />}
                  {preset.id === 'balanceado' && <Target className="w-3.5 h-3.5 text-sky-400" />}
                  {preset.id === 'agressivo' && <Zap className="w-3.5 h-3.5 text-amber-400" />}
                  <span className={`text-xs font-bold ${titleColor}`}>{preset.nome}</span>
                </div>
                <span className={`text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded border ${badgeBorder}`}>
                  {preset.badge}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-snug mb-2">{preset.descricao}</p>
              <div className="flex items-center justify-between text-[10px] font-mono border-t border-slate-800/80 pt-2 text-slate-500">
                <span>Corte médio: {preset.corteMedio}</span>
                {isSelected && <span className="text-sky-400 font-bold">● Ativo</span>}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
