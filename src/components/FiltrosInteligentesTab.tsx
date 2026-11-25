import React, { useMemo, useState } from 'react';
import { FilterCriteria, LotofacilDraw, AIPredictionResponse } from '../types/lotofacil';
import { CONCURSO_ATUAL } from '../data/lotofacilData';
import { detectActivePreset, PresetLotoFacilItem } from '../services/presetsFiltros';
import {
  MAX_DEZENAS_FIXAS,
  RECOMMENDED_MAX_FIXAS,
  assessFixedNumbersRisk,
  sanitizeDezenasFixas,
} from '../services/combinatorics';
import { SeletorPresetsEstatisticos } from './SeletorPresetsEstatisticos';
import { EquilibrioEstruturalSelector } from './EquilibrioEstruturalSelector';
import { FilterControls } from './FilterControls';
import { RealTimeFilterSimulation } from './RealTimeFilterSimulation';
import { DesempenhoFiltrosUltimos10Recharts } from './DesempenhoFiltrosUltimos10Recharts';
import { DispersaoSomaEstratificadaRecharts } from './DispersaoSomaEstratificadaRecharts';
import { DistribuicaoProbabilidadeFiltrosDashboard } from './DistribuicaoProbabilidadeFiltrosDashboard';
import { FilterTooltip } from './FilterTooltip';
import {
  SlidersHorizontal,
  ArrowRight,
  RotateCcw,
  Lock,
  Ban,
  ShieldAlert,
  CheckCircle2,
  Sparkles,
  Trash2,
  Download,
} from 'lucide-react';

interface FiltrosInteligentesTabProps {
  filters: FilterCriteria;
  onChangeFilters: (filters: FilterCriteria) => void;
  onResetFilters: () => void;
  latestDraw?: LotofacilDraw;
  aiPrediction?: AIPredictionResponse | null;
  onApplyToFechamento: () => void;
}

export const FiltrosInteligentesTab: React.FC<FiltrosInteligentesTabProps> = ({
  filters,
  onChangeFilters,
  onResetFilters,
  latestDraw = CONCURSO_ATUAL,
  aiPrediction,
  onApplyToFechamento,
}) => {
  const [gridMode, setGridMode] = useState<'fixas' | 'excluidas'>('fixas');
  const [syncToast, setSyncToast] = useState<string | null>(null);

  const activePresetId = useMemo(() => detectActivePreset(filters), [filters]);

  const fixas = filters.dezenasFixas || [];
  const excluidas = filters.dezenasExcluidas || [];
  const fixedRisk = useMemo(
    () => assessFixedNumbersRisk(fixas.length, filters.modoFixas === 'rigidas' ? 'rigidas' : 'rotativas'),
    [fixas.length, filters.modoFixas]
  );

  // Selected universe preview for EquilibrioEstruturalSelector & RealTimeFilterSimulation
  const effectivePool = useMemo(() => {
    const base =
      aiPrediction?.dezenasRecomendadas18 && aiPrediction.dezenasRecomendadas18.length >= 15
        ? aiPrediction.dezenasRecomendadas18
        : [1, 2, 3, 5, 7, 9, 10, 11, 12, 13, 15, 16, 17, 19, 20, 21, 22, 24];
    const withoutExcluded = base.filter((n) => !excluidas.includes(n));
    const merged = Array.from(new Set([...fixas, ...withoutExcluded])).sort((a, b) => a - b);
    return merged.length >= 15 ? merged : Array.from({ length: 25 }, (_, i) => i + 1).filter((n) => !excluidas.includes(n)).slice(0, 18);
  }, [aiPrediction, fixas, excluidas]);

  const activeRulesCount = useMemo(() => {
    let count = 7; // Soma, Pares, Moldura/Miolo, Primos, Fibonacci, Repetidas, Consecutivas
    if (filters.repetidasParidadeAtiva) count++;
    if (filters.estratificacaoCaudaAtiva) count++;
    if (filters.cruzAtiva !== false) count++;
    if (filters.extremidadesAtiva !== false) count++;
    if (filters.posicionalAtivo) count++;
    if (filters.multiplosAtivo) count++;
    if (filters.contagemDigitosAtiva || filters.somaAlgarismosAtiva) count++;
    if (filters.linhasColunasAtivo) count++;
    if (filters.quadrantesAtivo) count++;
    if (filters.rankingHistoricoAtivo) count++;
    if (filters.palpiteIneditoAtivo !== false) count++;
    if (filters.curvaAbcAtiva) count++;
    if (filters.vaziosAtivos) count++;
    return count;
  }, [filters]);

  const handleApplyAndNavigate = () => {
    onChangeFilters({
      ...filters,
      filtrosDesativadosNoFechamento: false,
    });
    onApplyToFechamento();
  };

  const notifySynced = (msg: string) => {
    setSyncToast(msg);
    setTimeout(() => setSyncToast(null), 2800);
  };

  const handleExportFiltersJson = () => {
    try {
      const snapshot = {
        app: 'LotoSniper AI Pro',
        tipo: 'SnapshotConfiguracaoFiltros',
        exportadoEm: new Date().toISOString(),
        concursoReferencia: latestDraw.concurso,
        dataConcurso: latestDraw.data,
        presetAtivo: activePresetId,
        regrasAtivas: activeRulesCount,
        filtros: filters,
      };
      const jsonString = JSON.stringify(snapshot, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const dateSlug = new Date().toISOString().slice(0, 10);
      link.href = url;
      link.download = `lotosniper_filtros_c${latestDraw.concurso}_${dateSlug}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      notifySynced(
        `Configuração exportada com sucesso (${link.download}) — ${activeRulesCount} regras ativas incluídas.`
      );
    } catch (err) {
      console.error('[Exportar Configuração de Filtros] Erro:', err);
      notifySynced('Não foi possível exportar o arquivo JSON de filtros.');
    }
  };

  const handleSelectPreset = (preset: PresetLotoFacilItem) => {
    onChangeFilters({
      ...filters,
      ...preset.filtros,
      presetEstatistico: preset.id,
    });
    notifySynced(`Perfil "${preset.nome}" aplicado e sincronizado com o Estúdio de Fechamento.`);
  };

  const handleToggleDezenaGrid = (num: number) => {
    if (gridMode === 'fixas') {
      if (fixas.includes(num)) {
        onChangeFilters({
          ...filters,
          dezenasFixas: fixas.filter((n) => n !== num),
        });
      } else {
        if (fixas.length >= MAX_DEZENAS_FIXAS) {
          notifySynced(`Limite máximo de ${MAX_DEZENAS_FIXAS} dezenas fixas atingido para proteger o Hit Rate.`);
          return;
        }
        const nextFixas = sanitizeDezenasFixas([...fixas, num]);
        onChangeFilters({
          ...filters,
          dezenasFixas: nextFixas,
          dezenasExcluidas: excluidas.filter((n) => n !== num),
          modoFixas: nextFixas.length >= 3 ? 'rotativas' : filters.modoFixas,
        });
      }
    } else {
      if (excluidas.includes(num)) {
        onChangeFilters({
          ...filters,
          dezenasExcluidas: excluidas.filter((n) => n !== num),
        });
      } else {
        if (excluidas.length >= 9) {
          notifySynced('Limite máximo de 9 dezenas excluídas para preservar universo mínimo de 16 dezenas.');
          return;
        }
        onChangeFilters({
          ...filters,
          dezenasExcluidas: [...excluidas, num].sort((a, b) => a - b),
          dezenasFixas: fixas.filter((n) => n !== num),
        });
      }
    }
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Top Hero / Control Summary Bar */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/20 rounded-2xl border border-amber-500/30 p-5 sm:p-6 shadow-2xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="p-2 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-400">
                <SlidersHorizontal className="w-5 h-5" />
              </div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                Filtros Inteligentes
              </h2>
              <span className="text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-md bg-amber-500/15 text-amber-300 border border-amber-500/35 tabular-nums">
                {activeRulesCount} Regras Ativas
              </span>
              <span className="text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-md bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 tabular-nums">
                Base: #{latestDraw.concurso} ({latestDraw.data})
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 max-w-3xl leading-relaxed">
              Central completa de calibração estatística, poda estrutural 5×5 e simulação em tempo real. Todas as alterações atualizam instantaneamente o{' '}
              <strong className="text-slate-200">Estúdio de Fechamento</strong> e o{' '}
              <strong className="text-slate-200">Preditor IA</strong>.
            </p>
          </div>

          <div className="flex items-center flex-wrap gap-2.5 shrink-0">
            <button
              type="button"
              onClick={handleExportFiltersJson}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/45 text-xs font-bold transition cursor-pointer"
              title="Baixar arquivo JSON com o snapshot completo de todos os filtros ativos"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exportar Configuração de Filtros</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onResetFilters();
                notifySynced('Filtros restaurados para o padrão canônico Equilíbrio Pro.');
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restaurar Padrão</span>
            </button>

            <button
              type="button"
              onClick={handleApplyAndNavigate}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400 hover:brightness-105 text-slate-950 font-black text-xs sm:text-sm shadow-lg shadow-amber-500/20 transition cursor-pointer whitespace-nowrap shrink-0"
            >
              <span>Aplicar Filtros no Estúdio de Fechamento</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {syncToast && (
          <div className="mt-4 px-3.5 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/35 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{syncToast}</span>
          </div>
        )}
      </div>

      {/* 1. Presets Inteligentes & Calibração (5 perfis + salvar personalizado) */}
      <SeletorPresetsEstatisticos
        activePresetId={activePresetId}
        onSelectPreset={handleSelectPreset}
        currentFilters={filters}
        onApplyCustomFilters={(custom) => {
          onChangeFilters(custom);
          notifySynced('Perfil personalizado carregado e sincronizado.');
        }}
      />

      {/* 2. Painel de Impacto em Tempo Real (Topo para feedback imediato enquanto edita) */}
      <RealTimeFilterSimulation
        filters={filters}
        selectedNumbers={effectivePool}
        latestDraw={latestDraw}
        aiScores={aiPrediction?.scores}
        onApplyToFechamento={handleApplyAndNavigate}
      />

      {/* 3. Volante Interativo de Dezenas Fixas e Excluídas (Sincronizado Globalmente) */}
      <div className="bg-slate-900/95 rounded-2xl border border-slate-800 p-5 sm:p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
              {gridMode === 'fixas' ? <Lock className="w-4 h-4" /> : <Ban className="w-4 h-4 text-rose-400" />}
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2 flex-wrap">
                <span>Dezenas Fixas &amp; Excluídas (Volante 5×5)</span>
                <FilterTooltip
                  title="Âncoras Fixas e Exclusão Estratégica"
                  description="Dezenas Fixas entram obrigatoriamente (ou em rotação K-de-N com 3+ fixas). Excluídas são removidas de todos os bilhetes."
                  impact="Impacto: Recomendado manter até 3 fixas para não comprometer o Hit Rate se uma âncora falhar."
                />
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                  {fixas.length} Fixas
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/15 text-rose-300 border border-rose-500/30">
                  {excluidas.length} Excluídas
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Clique nas dezenas abaixo para fixar (âncoras) ou excluir do fechamento. Dezenas com borda dourada saíram no Concurso #{latestDraw.concurso}.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setGridMode('fixas')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                gridMode === 'fixas'
                  ? 'bg-amber-500 text-slate-950 border-amber-400 font-black'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Marcar Fixas ({fixas.length}/{MAX_DEZENAS_FIXAS})</span>
            </button>
            <button
              type="button"
              onClick={() => setGridMode('excluidas')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                gridMode === 'excluidas'
                  ? 'bg-rose-500 text-white border-rose-400 font-black'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
              }`}
            >
              <Ban className="w-3.5 h-3.5" />
              <span>Marcar Excluídas ({excluidas.length})</span>
            </button>
            {(fixas.length > 0 || excluidas.length > 0) && (
              <button
                type="button"
                onClick={() =>
                  onChangeFilters({
                    ...filters,
                    dezenasFixas: [],
                    dezenasExcluidas: [],
                  })
                }
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-rose-400 border border-slate-700 transition cursor-pointer"
                title="Limpar todas as dezenas fixas e excluídas"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Alerta de Segurança contra Excesso de Fixas (> 3) */}
        {fixas.length > RECOMMENDED_MAX_FIXAS && (
          <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-400/50 text-amber-200 text-xs flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <strong className="font-black text-amber-300">
                Alerta de Segurança ({fixas.length} Fixas — {fixedRisk.title}):
              </strong>{' '}
              <span>
                {fixedRisk.message} Recomendamos manter até {RECOMMENDED_MAX_FIXAS} fixas ou utilizar o modo{' '}
                <strong className="text-white">Rotativas Inteligentes (K de N)</strong>.
              </span>
            </div>
          </div>
        )}

        {/* Volante 5x5 Interativo */}
        <div className="grid grid-cols-5 gap-2 sm:gap-2.5 max-w-xl">
          {Array.from({ length: 25 }, (_, i) => i + 1).map((num) => {
            const isFixa = fixas.includes(num);
            const isExcluida = excluidas.includes(num);
            const isFromLatest = latestDraw.dezenas.includes(num);

            let btnStyle =
              'bg-slate-950 text-slate-200 border-slate-700/80 hover:border-amber-500/60';
            if (isFixa) {
              btnStyle =
                'bg-gradient-to-br from-amber-400 to-yellow-500 text-slate-950 border-amber-300 font-black shadow-md shadow-amber-500/25';
            } else if (isExcluida) {
              btnStyle =
                'bg-rose-950/70 text-rose-300 border-rose-500/60 line-through opacity-80';
            } else if (isFromLatest) {
              btnStyle =
                'bg-slate-900 text-amber-200 border-amber-500/40 hover:border-amber-400';
            }

            return (
              <button
                key={num}
                type="button"
                onClick={() => handleToggleDezenaGrid(num)}
                className={`h-11 rounded-xl border font-mono text-sm font-bold transition-all cursor-pointer relative flex items-center justify-center ${btnStyle}`}
                title={
                  isFixa
                    ? `Dezena ${num.toString().padStart(2, '0')} marcada como FIXA`
                    : isExcluida
                    ? `Dezena ${num.toString().padStart(2, '0')} EXCLUÍDA`
                    : isFromLatest
                    ? `Dezena ${num.toString().padStart(2, '0')} sorteada no Concurso #${latestDraw.concurso}`
                    : `Dezena ${num.toString().padStart(2, '0')} ausente no Concurso #${latestDraw.concurso}`
                }
              >
                <span>{num.toString().padStart(2, '0')}</span>
                {isFixa && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-slate-950 text-amber-400 text-[9px] flex items-center justify-center border border-amber-400">
                    F
                  </span>
                )}
                {isExcluida && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-600 text-white text-[9px] flex items-center justify-center">
                    ✕
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Equilíbrio Estrutural de Paridade (Pares / Ímpares) */}
      <EquilibrioEstruturalSelector
        filters={filters}
        onChange={onChangeFilters}
        selectedNumbers={effectivePool}
        latestDraw={latestDraw}
      />

      {/* 5. Todos os Parâmetros Estatísticos, Estruturais, Linhas/Colunas, Quadrantes, Cruz, Múltiplos, Extremidades & Fallback */}
      <FilterControls
        filters={filters}
        onChange={onChangeFilters}
        onReset={onResetFilters}
        latestDraw={latestDraw}
        selectedNumbers={effectivePool}
      />

      {/* 6. Dashboard Recharts: Distribuição de Probabilidade (Filtros Selecionados vs Últimos 100 Concursos) */}
      <DistribuicaoProbabilidadeFiltrosDashboard
        filters={filters}
        latestDraw={latestDraw}
      />

      {/* 7. Gráficos Analíticos de Validação (Últimos 10 Concursos & Dispersão Estratificada) */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <DesempenhoFiltrosUltimos10Recharts latestDraw={latestDraw} filters={filters} />
        <DispersaoSomaEstratificadaRecharts />
      </div>

      {/* Bottom Sticky-Style Action Footer */}
      <div className="bg-slate-900/95 border border-amber-500/30 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 text-xs text-slate-300">
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            Configuração sincronizada automaticamente via <strong className="text-white">Estado Global</strong>. Pronto para gerar fechamentos com todas as regras ativas.
          </span>
        </div>
        <button
          type="button"
          onClick={handleApplyAndNavigate}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400 hover:brightness-105 text-slate-950 font-black text-xs sm:text-sm shadow-lg shadow-amber-500/20 transition cursor-pointer whitespace-nowrap shrink-0"
        >
          <span>Aplicar Filtros no Estúdio de Fechamento</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
