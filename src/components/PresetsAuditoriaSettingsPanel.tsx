import React, { useMemo, useState } from 'react';
import { FilterCriteria } from '../types/lotofacil';
import {
  PRESETS_LOTOFACIL,
  PresetLotoFacilItem,
  detectActivePreset,
} from '../services/presetsFiltros';
import { DEFAULT_FILTERS } from '../services/combinatorics';
import {
  Sliders,
  Check,
  ArrowRight,
  RotateCcw,
  Shield,
  Target,
  Crosshair,
} from 'lucide-react';

interface PresetsAuditoriaSettingsPanelProps {
  filters: FilterCriteria;
  onApplyFilters: (nextFilters: FilterCriteria) => void;
  onGoToFechamento?: () => void;
  onNotice?: (message: string) => void;
}

const ORDERED_PRESET_KEYS: Array<'balanceado' | 'agressivo' | 'conservador'> = [
  'balanceado',
  'agressivo',
  'conservador',
];

const PRESET_SHORT_TITLE: Record<'balanceado' | 'agressivo' | 'conservador', string> = {
  balanceado: 'Equilíbrio Pro',
  agressivo: 'Ousado',
  conservador: 'Conservador',
};

const PRESET_ROLE: Record<'balanceado' | 'agressivo' | 'conservador', string> = {
  balanceado: 'Padrão auditado · Recomendado',
  agressivo: 'Alta seletividade · Zona central',
  conservador: 'Cobertura máxima · Corte brando',
};

interface ComparisonRow {
  label: string;
  helper?: string;
  getValue: (item: PresetLotoFacilItem) => string;
  getCurrentValue: (f: FilterCriteria) => string;
}

const COMPARISON_ROWS: ComparisonRow[] = [
  {
    label: 'Soma das 15 dezenas',
    helper: 'Estratificação 75/15/10 ativa em ≥10 jogos',
    getValue: (item) => `${item.filtros.somaMin}–${item.filtros.somaMax}`,
    getCurrentValue: (f) => `${f.somaMin}–${f.somaMax}`,
  },
  {
    label: 'Pares',
    helper: 'Pico Gaussiano em 6–7',
    getValue: (item) => `${item.filtros.paresMin}–${item.filtros.paresMax}`,
    getCurrentValue: (f) => `${f.paresMin}–${f.paresMax}`,
  },
  {
    label: 'Moldura',
    helper: 'Pico Gaussiano em 9–10',
    getValue: (item) => `${item.filtros.molduraMin}–${item.filtros.molduraMax}`,
    getCurrentValue: (f) => `${f.molduraMin}–${f.molduraMax}`,
  },
  {
    label: 'Primos',
    helper: 'Pico Gaussiano em 5–6',
    getValue: (item) => `${item.filtros.primosMin}–${item.filtros.primosMax}`,
    getCurrentValue: (f) => `${f.primosMin}–${f.primosMax}`,
  },
  {
    label: 'Fibonacci',
    helper: 'Pico Gaussiano em 4–6',
    getValue: (item) => `${item.filtros.fibonacciMin}–${item.filtros.fibonacciMax}`,
    getCurrentValue: (f) => `${f.fibonacciMin}–${f.fibonacciMax}`,
  },
  {
    label: 'Repetidas do anterior',
    helper: 'Sem penalidade severa para 7–9',
    getValue: (item) => `${item.filtros.repetidasMin}–${item.filtros.repetidasMax}`,
    getCurrentValue: (f) => `${f.repetidasMin}–${f.repetidasMax}`,
  },
  {
    label: 'Máx. Consecutivas',
    helper: 'Penalidade suave apenas a partir de 6',
    getValue: (item) => `até ${item.filtros.maxConsecutivas}`,
    getCurrentValue: (f) => `até ${f.maxConsecutivas}`,
  },
  {
    label: 'Cruz Estrita (5–6 dez.)',
    getValue: (item) => (item.filtros.validacaoEstritaCruz ? 'Ativada' : 'Flexível (4–7)'),
    getCurrentValue: (f) =>
      f.validacaoEstritaCruz
        ? 'Ativada'
        : f.cruzAtiva
        ? `Flexível (${f.cruzMin ?? 4}–${f.cruzMax ?? 7})`
        : 'Desativada',
  },
  {
    label: 'Cobertura histórica',
    getValue: (item) => item.coberturaConcursos,
    getCurrentValue: () => '—',
  },
  {
    label: 'Corte médio combinatório',
    getValue: (item) => item.corteMedio,
    getCurrentValue: () => '—',
  },
];

export const PresetsAuditoriaSettingsPanel: React.FC<PresetsAuditoriaSettingsPanelProps> = ({
  filters,
  onApplyFilters,
  onGoToFechamento,
  onNotice,
}) => {
  const [recentlyApplied, setRecentlyApplied] = useState<string | null>(null);

  const activePresetKey = useMemo(() => detectActivePreset(filters), [filters]);

  const handleSelectPreset = (key: 'balanceado' | 'agressivo' | 'conservador') => {
    const presetItem = PRESETS_LOTOFACIL[key];
    const nextFilters: FilterCriteria = {
      ...DEFAULT_FILTERS,
      ...filters,
      ...presetItem.filtros,
      presetEstatistico: presetItem.id,
      autoCalibrarSomaUniverso: false,
    };
    onApplyFilters(nextFilters);
    setRecentlyApplied(key);
    onNotice?.(
      `Preset "${PRESET_SHORT_TITLE[key]}" aplicado às faixas do Motor de Fechamento (Soma ${presetItem.filtros.somaMin}–${presetItem.filtros.somaMax}).`
    );
    window.setTimeout(() => {
      setRecentlyApplied((curr) => (curr === key ? null : curr));
    }, 2800);
  };

  const renderPresetIcon = (key: 'balanceado' | 'agressivo' | 'conservador', active: boolean) => {
    const cls = `w-4 h-4 ${
      active
        ? key === 'balanceado'
          ? 'text-sky-400'
          : key === 'agressivo'
          ? 'text-amber-400'
          : 'text-emerald-400'
        : 'text-slate-400'
    }`;
    if (key === 'balanceado') return <Target className={cls} />;
    if (key === 'agressivo') return <Crosshair className={cls} />;
    return <Shield className={cls} />;
  };

  return (
    <section className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-5 sm:px-6 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-slate-100">
            <Sliders className="w-4 h-4 text-sky-400 shrink-0" />
            <h3 className="text-base font-semibold tracking-tight">
              Presets de Filtros Auditados
            </h3>
          </div>
          <p className="mt-1 text-sm text-slate-400">
            Faixas calibradas sobre 9 concursos consecutivos (#3825–#3833 · 7.478 bilhetes) com proteção de caudas 75/15/10 e scoreIA Gaussiano.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {activePresetKey === 'personalizado' && (
            <button
              type="button"
              onClick={() => handleSelectPreset('balanceado')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800/80 hover:bg-slate-800 text-xs font-medium text-slate-200 transition cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-sky-400" />
              Restaurar Equilíbrio Pro
            </button>
          )}
          {onGoToFechamento && (
            <button
              type="button"
              onClick={onGoToFechamento}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-xs font-semibold text-slate-950 transition cursor-pointer"
            >
              Abrir Gerador
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Interactive 3-Preset Selector */}
      <div className="p-5 sm:p-6 border-b border-slate-800">
        <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
          <span className="text-xs font-medium text-slate-400">
            Perfil ativo no motor:{' '}
            <strong className="text-slate-100 font-semibold">
              {activePresetKey === 'personalizado'
                ? 'Personalizado'
                : PRESET_SHORT_TITLE[activePresetKey]}
            </strong>
          </span>
          <span className="text-xs text-slate-400 font-mono tabular-nums">
            Soma {filters.somaMin}–{filters.somaMax} · Pares {filters.paresMin}–{filters.paresMax} · Moldura {filters.molduraMin}–{filters.molduraMax} · Consec. ≤ {filters.maxConsecutivas}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3" role="radiogroup" aria-label="Selecionar preset de filtros">
          {ORDERED_PRESET_KEYS.map((key) => {
            const item = PRESETS_LOTOFACIL[key];
            const isActive = activePresetKey === key;
            const isJustApplied = recentlyApplied === key;

            const activeBorderClass =
              key === 'balanceado'
                ? 'border-sky-500/70 bg-sky-500/[0.06]'
                : key === 'agressivo'
                ? 'border-amber-500/70 bg-amber-500/[0.06]'
                : 'border-emerald-500/70 bg-emerald-500/[0.06]';

            const activeTextClass =
              key === 'balanceado'
                ? 'text-sky-400'
                : key === 'agressivo'
                ? 'text-amber-400'
                : 'text-emerald-400';

            return (
              <button
                key={key}
                type="button"
                role="radio"
                aria-checked={isActive}
                onClick={() => handleSelectPreset(key)}
                className={`text-left p-4 rounded-xl border transition cursor-pointer flex flex-col justify-between gap-3 ${
                  isActive
                    ? activeBorderClass
                    : 'border-slate-800 bg-slate-950/60 hover:border-slate-700 hover:bg-slate-950'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {renderPresetIcon(key, isActive)}
                      <span className="text-sm font-semibold text-slate-100">
                        {PRESET_SHORT_TITLE[key]}
                      </span>
                    </div>
                    {isActive && (
                      <span className={`inline-flex items-center gap-1 text-xs font-medium ${activeTextClass}`}>
                        <Check className="w-3.5 h-3.5" />
                        {isJustApplied ? 'Aplicado' : 'Ativo'}
                      </span>
                    )}
                  </div>

                  <p className="mt-1 text-xs text-slate-400">
                    {PRESET_ROLE[key]} · {item.desvio}
                  </p>

                  <p className="mt-2.5 text-xs leading-relaxed text-slate-300">
                    {item.descricao}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400 font-mono tabular-nums">
                  <span>Soma {item.filtros.somaMin}–{item.filtros.somaMax}</span>
                  <span>
                    {item.coberturaConcursos.replace(' dos sorteios', '').replace(' dos concursos', '')} · Corte {item.corteMedio}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* High-Density Comparison Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-800 text-xs font-medium text-slate-400">
              <th className="py-3 px-5 sm:px-6">Parâmetro auditado</th>
              {ORDERED_PRESET_KEYS.map((key) => {
                const isActive = activePresetKey === key;
                return (
                  <th
                    key={key}
                    className={`py-3 px-4 text-right whitespace-nowrap ${
                      isActive ? 'text-slate-100 bg-slate-800/40' : ''
                    }`}
                  >
                    {PRESET_SHORT_TITLE[key]}
                    {isActive ? ' (Ativo)' : ''}
                  </th>
                );
              })}
              {activePresetKey === 'personalizado' && (
                <th className="py-3 px-4 text-right whitespace-nowrap text-sky-300 bg-sky-500/10">
                  Atual (Custom)
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/80 text-xs">
            {COMPARISON_ROWS.map((row) => (
              <tr key={row.label} className="hover:bg-slate-800/20 transition-colors">
                <td className="py-2.5 px-5 sm:px-6">
                  <div className="font-medium text-slate-200">{row.label}</div>
                  {row.helper && (
                    <div className="text-[11px] text-slate-500 mt-0.5">{row.helper}</div>
                  )}
                </td>
                {ORDERED_PRESET_KEYS.map((key) => {
                  const isActive = activePresetKey === key;
                  return (
                    <td
                      key={key}
                      className={`py-2.5 px-4 text-right font-mono tabular-nums whitespace-nowrap ${
                        isActive
                          ? 'text-slate-100 font-semibold bg-slate-800/40'
                          : 'text-slate-400'
                      }`}
                    >
                      {row.getValue(PRESETS_LOTOFACIL[key])}
                    </td>
                  );
                })}
                {activePresetKey === 'personalizado' && (
                  <td className="py-2.5 px-4 text-right font-mono tabular-nums whitespace-nowrap text-sky-300 font-semibold bg-sky-500/10">
                    {row.getCurrentValue(filters)}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer Note */}
      <div className="px-5 py-3.5 sm:px-6 border-t border-slate-800 bg-slate-950/40 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-slate-400">
        <span>
          Estratificação automática de cauda (≥10 jogos): 75% Zona Central (180–215) · 15% Cauda Alta (216–230) · 10% Cauda Baixa (155–179).
        </span>
        <span className="font-mono tabular-nums text-slate-500 shrink-0">
          Fixas recomendadas: 0 a 3
        </span>
      </div>
    </section>
  );
};
