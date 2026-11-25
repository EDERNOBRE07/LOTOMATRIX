import React from 'react';
import { FilterCriteria, FilterRigorMode, LotofacilDraw } from '../types/lotofacil';
import {
  ShieldCheck,
  Shield,
  Zap,
  Power,
  Sliders,
  Check,
  ArrowRight,
  Layers,
  Sparkles,
} from 'lucide-react';
import { soundService } from '../services/soundAlert';

interface ControleInteligenteFiltrosDashboardProps {
  enabled: boolean;
  onToggleEnabled: (next: boolean) => void;
  rigorMode: FilterRigorMode;
  onChangeRigorMode: (mode: FilterRigorMode) => void;
  baseFilters: FilterCriteria;
  effectiveFilters: FilterCriteria;
  latestDraw: LotofacilDraw;
  onOpenFiltros?: () => void;
  justAppliedFromFiltros?: boolean;
}

interface RigorModeDefinition {
  id: FilterRigorMode;
  stepLabel: string;
  title: string;
  subtitle: string;
  description: string;
  highlights: string[];
  accentBorder: string;
  accentBg: string;
  accentText: string;
  accentBadge: string;
  icon: React.ReactNode;
}

const RIGOR_MODES: RigorModeDefinition[] = [
  {
    id: 'total',
    stepLabel: 'MODO 1',
    title: 'Total',
    subtitle: 'Todos os Filtros Ativos',
    description:
      'Ativa integralmente todos os critérios configurados: Soma, Paridade, Moldura, Primos, Fibonacci, Repetidas + Paridade das Repetidas, Cruz, Consecutivas e Linhas/Colunas.',
    highlights: [
      'Soma + Paridade',
      'Moldura + Primos',
      'Repetidas + Par/Ímp Rep.',
      'Cruz + Fibonacci',
      'Linhas/Colunas',
    ],
    accentBorder: 'border-amber-400',
    accentBg: 'bg-gradient-to-b from-amber-500/15 via-slate-900 to-slate-950',
    accentText: 'text-amber-300',
    accentBadge: 'bg-amber-400 text-slate-950',
    icon: <ShieldCheck className="w-4 h-4" />,
  },
  {
    id: 'conservador',
    stepLabel: 'MODO 2',
    title: 'Conservador',
    subtitle: 'Alto Impacto Estatístico',
    description:
      'Mantém ativos os filtros de maior peso matemático (Soma Central, Paridade, Moldura, Repetidas do Concurso e Primos), flexibilizando os filtros secundários.',
    highlights: [
      'Soma Central',
      'Paridade',
      'Moldura',
      'Repetidas Concurso',
      'Primos',
    ],
    accentBorder: 'border-emerald-400',
    accentBg: 'bg-gradient-to-b from-emerald-500/15 via-slate-900 to-slate-950',
    accentText: 'text-emerald-300',
    accentBadge: 'bg-emerald-400 text-slate-950',
    icon: <Shield className="w-4 h-4" />,
  },
  {
    id: 'agressivo',
    stepLabel: 'MODO 3',
    title: 'Agressivo',
    subtitle: 'Indispensáveis • Caça 14/15',
    description:
      'Aplica exclusivamente os filtros indispensáveis (Soma ampla 160–230, equilíbrio básico Par/Ímpar 5–10 e controle de Consecutivas ≤ 7) para máxima velocidade e amplitude.',
    highlights: [
      'Soma Ampla (160–230)',
      'Par/Ímpar (5–10)',
      'Consecutivas (≤ 7)',
    ],
    accentBorder: 'border-cyan-400',
    accentBg: 'bg-gradient-to-b from-cyan-500/15 via-slate-900 to-slate-950',
    accentText: 'text-cyan-300',
    accentBadge: 'bg-cyan-400 text-slate-950',
    icon: <Zap className="w-4 h-4" />,
  },
];

export const ControleInteligenteFiltrosDashboard: React.FC<
  ControleInteligenteFiltrosDashboardProps
> = ({
  enabled,
  onToggleEnabled,
  rigorMode,
  onChangeRigorMode,
  baseFilters,
  effectiveFilters,
  latestDraw,
  onOpenFiltros,
  justAppliedFromFiltros = false,
}) => {
  const handleSelectMode = (mode: FilterRigorMode) => {
    if (!enabled) {
      onToggleEnabled(true);
    }
    onChangeRigorMode(mode);
    soundService.playFilterClick();
  };

  const handleMasterToggle = () => {
    const next = !enabled;
    onToggleEnabled(next);
    soundService.playFilterClick();
  };

  const activeModeMeta = RIGOR_MODES.find((m) => m.id === rigorMode) || RIGOR_MODES[0];

  // Badges descritivas dos filtros efetivamente ativos neste momento
  const filterBadges = [
    {
      label: `Soma ${effectiveFilters.somaMin}–${effectiveFilters.somaMax}`,
      active: enabled,
    },
    {
      label: `Pares ${effectiveFilters.paresMin}–${effectiveFilters.paresMax}`,
      active: enabled,
    },
    {
      label: `Moldura ${effectiveFilters.molduraMin}–${effectiveFilters.molduraMax}`,
      active: enabled && rigorMode !== 'agressivo',
    },
    {
      label: `Primos ${effectiveFilters.primosMin}–${effectiveFilters.primosMax}`,
      active: enabled && rigorMode !== 'agressivo',
    },
    {
      label: `Rep. #${latestDraw.concurso}: ${effectiveFilters.repetidasMin}–${effectiveFilters.repetidasMax}`,
      active: enabled && rigorMode !== 'agressivo',
    },
    {
      label: `Paridade Rep. (${effectiveFilters.repetidasParesMin ?? 2}–${effectiveFilters.repetidasParesMax ?? 6}P / ${effectiveFilters.repetidasImparesMin ?? 2}–${effectiveFilters.repetidasImparesMax ?? 6}I)`,
      active:
        enabled &&
        rigorMode === 'total' &&
        effectiveFilters.repetidasParidadeAtiva === true,
    },
    {
      label: `Cruz ${effectiveFilters.validacaoEstritaCruz ? '5–6 ★' : `${effectiveFilters.cruzMin ?? 4}–${effectiveFilters.cruzMax ?? 7}`}`,
      active: enabled && rigorMode === 'total' && effectiveFilters.cruzAtiva !== false,
    },
    {
      label: `Fibonacci ${effectiveFilters.fibonacciMin}–${effectiveFilters.fibonacciMax}`,
      active: enabled && rigorMode === 'total',
    },
    {
      label: `Consecutivas ≤ ${effectiveFilters.maxConsecutivas}`,
      active: enabled,
    },
    {
      label: `Lin/Col ${effectiveFilters.linhasMin ?? 1}–${effectiveFilters.linhasMax ?? 5}`,
      active:
        enabled &&
        rigorMode === 'total' &&
        effectiveFilters.linhasColunasAtivo !== false,
    },
    {
      label: `Extremidades B1/B15`,
      active:
        enabled &&
        rigorMode === 'total' &&
        effectiveFilters.extremidadesAtiva !== false,
    },
  ];

  const activeCount = filterBadges.filter((b) => b.active).length;
  const totalConfiguredCustomRules =
    (baseFilters.repetidasParidadeAtiva ? 1 : 0) +
    (baseFilters.cruzAtiva !== false ? 1 : 0) +
    (baseFilters.extremidadesAtiva !== false ? 1 : 0) +
    (baseFilters.hammingDinamicoAtivo ? 1 : 0);

  return (
    <section
      aria-label="Controle Inteligente de Filtros"
      className={`rounded-2xl border p-4 sm:p-5 shadow-2xl transition-colors duration-200 ${
        enabled
          ? 'bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/20 border-amber-500/35'
          : 'bg-slate-900/90 border-slate-800'
      }`}
    >
      {/* Header Row: Step 3 Title + Master Switch + Quick Link */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-amber-400 text-slate-950 font-mono font-black text-xs shrink-0">
              3
            </span>
            <h3 className="text-sm sm:text-base font-black text-white tracking-tight">
              Controle Inteligente de Filtros no Fechamento
            </h3>
            <span
              className={`inline-flex items-center gap-1 text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-lg border whitespace-nowrap shrink-0 ${
                enabled
                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/35'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
            >
              {enabled ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span>
                    Ativo · Modo {activeModeMeta.title} ({activeCount} filtros)
                  </span>
                </>
              ) : (
                <span>Desligado · Geração Livre</span>
              )}
            </span>
            {justAppliedFromFiltros && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-lg bg-amber-400/20 text-amber-300 border border-amber-400/50 whitespace-nowrap shrink-0">
                <Sparkles className="w-3 h-3 text-amber-300" />
                Sincronizado de Filtros Inteligentes
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Ligue ou desligue a filtragem estatística instantaneamente e escolha o nível de rigor aplicado aos motores de fechamento abaixo.
          </p>
        </div>

        {/* Right Controls: Master Power Toggle + Edit in Filtros Inteligentes */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {onOpenFiltros && (
            <button
              type="button"
              onClick={onOpenFiltros}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-700 hover:border-amber-400/50 text-xs font-bold text-amber-300 transition cursor-pointer whitespace-nowrap shrink-0"
              title="Abrir a aba Filtros Inteligentes para ajustar faixas detalhadas"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Editar Detalhes</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Chave Geral (Toggle Master) */}
          <button
            type="button"
            role="switch"
            aria-checked={enabled}
            onClick={handleMasterToggle}
            className={`inline-flex items-center gap-3 px-3.5 py-2 rounded-xl border font-bold text-xs transition cursor-pointer whitespace-nowrap shrink-0 ${
              enabled
                ? 'bg-emerald-500/15 border-emerald-400/60 text-emerald-200 hover:bg-emerald-500/20 shadow-md shadow-emerald-500/10'
                : 'bg-slate-950 border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-200'
            }`}
          >
            <Power
              className={`w-4 h-4 ${enabled ? 'text-emerald-400' : 'text-slate-500'}`}
            />
            <span className="font-black uppercase tracking-wide">
              {enabled ? 'Filtros Ligados' : 'Filtros Desligados'}
            </span>
            <span
              className={`w-10 h-5 rounded-full p-0.5 flex items-center transition-colors ${
                enabled ? 'bg-emerald-500 justify-end' : 'bg-slate-700 justify-start'
              }`}
            >
              <span className="w-4 h-4 rounded-full bg-white shadow-sm block" />
            </span>
          </button>
        </div>
      </div>

      {/* 3 Rigor Mode Interactive Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
        {RIGOR_MODES.map((item) => {
          const isSelected = enabled && rigorMode === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleSelectMode(item.id)}
              aria-pressed={isSelected}
              className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                isSelected
                  ? `${item.accentBg} ${item.accentBorder} ring-1 ring-inset ring-white/10 shadow-lg`
                  : enabled
                  ? 'bg-slate-950/75 border-slate-800 hover:border-slate-600 text-slate-300'
                  : 'bg-slate-950/40 border-slate-800/70 opacity-60 hover:opacity-95 hover:border-slate-600 text-slate-400'
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`p-1.5 rounded-lg border shrink-0 ${
                        isSelected
                          ? `${item.accentBadge} border-transparent`
                          : 'bg-slate-900 border-slate-700 text-slate-400'
                      }`}
                    >
                      {item.icon}
                    </span>
                    <div className="min-w-0">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 block">
                        {item.stepLabel}
                      </span>
                      <span className="text-sm font-black text-white block truncate">
                        Modo {item.title}
                      </span>
                    </div>
                  </div>
                  <span
                    className={`text-[10px] font-mono font-black px-2 py-0.5 rounded-md whitespace-nowrap shrink-0 ${
                      isSelected
                        ? item.accentBadge
                        : 'bg-slate-900 text-slate-400 border border-slate-800'
                    }`}
                  >
                    {isSelected ? '✓ ATIVO' : 'SELECIONAR'}
                  </span>
                </div>

                <p className={`text-[11px] font-semibold ${isSelected ? item.accentText : 'text-slate-300'}`}>
                  {item.subtitle}
                </p>

                <p className="text-[11px] text-slate-400 leading-relaxed">
                  {item.description}
                </p>
              </div>

              <div className="flex flex-wrap gap-1 pt-2 border-t border-slate-800/80">
                {item.highlights.map((hl) => (
                  <span
                    key={hl}
                    className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                      isSelected
                        ? 'bg-slate-950/70 border-slate-700 text-slate-200 font-semibold'
                        : 'bg-slate-900/80 border-slate-800 text-slate-500'
                    }`}
                  >
                    {hl}
                  </span>
                ))}
              </div>
            </button>
          );
        })}
      </div>

      {/* Live Active Filters Telemetry Strip */}
      <div className="mt-4 pt-3.5 border-t border-slate-800/80 flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
          <span className="font-bold text-slate-300 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-amber-400" />
            <span>
              {enabled
                ? `Filtros aplicados neste modo (${activeCount} ativos):`
                : 'Todos os filtros estatísticos estão desativados — apenas dezenas Fixas e Excluídas do volante serão respeitadas.'}
            </span>
          </span>
          {totalConfiguredCustomRules > 0 && enabled && rigorMode !== 'total' && (
            <span className="text-[10px] font-mono text-amber-300/90">
              Dica: selecione Modo Total para aplicar regras avançadas (Cruz / Paridade Repetidas / Extremidades)
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {filterBadges.map((badge) => (
            <span
              key={badge.label}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono tabular-nums border transition-colors ${
                badge.active
                  ? 'bg-emerald-500/12 text-emerald-200 border-emerald-500/35 font-semibold'
                  : 'bg-slate-950/60 text-slate-500 border-slate-800/90 line-through'
              }`}
            >
              {badge.active ? (
                <Check className="w-2.5 h-2.5 text-emerald-400 shrink-0" />
              ) : null}
              <span>{badge.label}</span>
            </span>
          ))}
        </div>
      </div>
    </section>
  );
};
