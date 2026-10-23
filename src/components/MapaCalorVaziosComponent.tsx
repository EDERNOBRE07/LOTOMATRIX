import React, { useState, useMemo } from 'react';
import { LotofacilDraw, DezenaStats } from '../types/lotofacil';
import { RECENT_DRAWS, CONCURSO_ATUAL } from '../data/lotofacilData';
import {
  computeVoidHeatmap,
  VoidPairInfo,
  VoidTrioInfo,
  getVoidExclusionConfig,
  saveVoidExclusionConfig,
  VoidExclusionConfig,
} from '../services/vaziosService';
import {
  Flame,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Filter,
  Layers,
  ArrowRight,
  Sparkles,
  Info,
  Trash2,
  Check,
  Grid,
  ListFilter,
  Eye,
  Sliders,
  X,
  RefreshCw,
} from 'lucide-react';

interface MapaCalorVaziosComponentProps {
  latestDraw?: LotofacilDraw;
  statsList?: DezenaStats[];
  onApplyExclusionsToFechamento?: (pairs: [number, number][]) => void;
  onGoToFechamento?: () => void;
}

export const MapaCalorVaziosComponent: React.FC<MapaCalorVaziosComponentProps> = ({
  latestDraw = CONCURSO_ATUAL,
  statsList,
  onApplyExclusionsToFechamento,
  onGoToFechamento,
}) => {
  const analysis = useMemo(() => {
    return computeVoidHeatmap(RECENT_DRAWS);
  }, []);

  const [activeView, setActiveView] = useState<'matriz' | 'vazios_absolutos' | 'vazios_raros' | 'trios'>('matriz');
  const [selectedCellPair, setSelectedCellPair] = useState<VoidPairInfo | null>(null);
  const [selectedNumberFocus, setSelectedNumberFocus] = useState<number | null>(null);

  // Active void exclusion configuration
  const [config, setConfig] = useState<VoidExclusionConfig>(() => getVoidExclusionConfig());
  const [selectedVoidPairs, setSelectedVoidPairs] = useState<[number, number][]>(() => {
    const saved = getVoidExclusionConfig();
    return saved.paresExcluidos || [];
  });

  const [appliedFeedback, setAppliedFeedback] = useState<string | null>(null);

  // Check if a pair is currently marked for exclusion
  const isPairExcluded = (pair: [number, number]): boolean => {
    const [a, b] = pair;
    return selectedVoidPairs.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
  };

  // Toggle exclusion of a single pair
  const togglePairExclusion = (pair: [number, number]) => {
    const [a, b] = pair.sort((x, y) => x - y);
    setSelectedVoidPairs((prev) => {
      const exists = prev.some(([x, y]) => x === a && y === b);
      if (exists) {
        return prev.filter(([x, y]) => !(x === a && y === b));
      } else {
        return [...prev, [a, b]];
      }
    });
  };

  // Quick Action: Select all absolute voids (0 co-occurrences in 10 draws)
  const selectAllAbsoluteVoids = () => {
    const allAbs = analysis.vaziosAbsolutos.map((v) => v.pair);
    setSelectedVoidPairs((prev) => {
      const combined = [...prev];
      for (const pair of allAbs) {
        const [a, b] = pair.sort((x, y) => x - y);
        if (!combined.some(([x, y]) => x === a && y === b)) {
          combined.push([a, b]);
        }
      }
      return combined;
    });
  };

  // Quick Action: Select all voids (0 and 1 co-occurrences)
  const selectAllCriticalAndRareVoids = () => {
    const combinedPairs = [
      ...analysis.vaziosAbsolutos.map((v) => v.pair),
      ...analysis.vaziosRaros.map((v) => v.pair),
    ];
    const unique: [number, number][] = [];
    for (const pair of combinedPairs) {
      const [a, b] = pair.sort((x, y) => x - y);
      if (!unique.some(([x, y]) => x === a && y === b)) {
        unique.push([a, b]);
      }
    }
    setSelectedVoidPairs(unique);
  };

  // Quick Action: Clear all
  const clearSelection = () => {
    setSelectedVoidPairs([]);
  };

  // Apply void exclusion filter to Fechamento
  const handleApplyFilter = () => {
    const newConfig: VoidExclusionConfig = {
      ativo: selectedVoidPairs.length > 0,
      paresExcluidos: selectedVoidPairs,
      bloquearVaziosAbsolutos: true,
      bloquearVaziosRaros: false,
      dataAtualizacao: new Date().toISOString(),
    };
    setConfig(newConfig);
    saveVoidExclusionConfig(newConfig);

    if (onApplyExclusionsToFechamento) {
      onApplyExclusionsToFechamento(selectedVoidPairs);
    }

    setAppliedFeedback(
      `✓ ${selectedVoidPairs.length} Combinações de Vazio aplicadas com sucesso como Filtro de Exclusão no Fechamento!`
    );
    setTimeout(() => setAppliedFeedback(null), 5000);

    // Trigger tab switch event if handler available
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('switch-tab', { detail: 'fechamento' }));
    }
  };

  // Color helper for 25x25 cell
  const getCellColorClass = (d1: number, d2: number) => {
    if (d1 === d2) {
      return 'bg-slate-700/80 text-white font-bold border-slate-600'; // Diagonal (self)
    }
    const val = analysis.matrix[d1][d2];
    const pair: [number, number] = [Math.min(d1, d2), Math.max(d1, d2)];
    const excluded = isPairExcluded(pair);

    if (excluded) {
      return 'bg-rose-600 text-white ring-2 ring-rose-400 font-black';
    }

    if (val === 0) {
      return 'bg-rose-950/90 text-rose-300 hover:bg-rose-800 hover:text-white border border-rose-500/50';
    }
    if (val === 1) {
      return 'bg-amber-950/80 text-amber-300 hover:bg-amber-700 hover:text-white border border-amber-600/40';
    }
    if (val <= 3) {
      return 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700';
    }
    if (val <= 6) {
      return 'bg-emerald-950/80 text-emerald-300 hover:bg-emerald-700 hover:text-white border border-emerald-500/40';
    }
    // val >= 7 (Pares de Ouro)
    return 'bg-yellow-500/30 text-yellow-300 font-bold hover:bg-yellow-500 hover:text-slate-950 border border-yellow-500/50';
  };

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-rose-950/70 via-slate-900 to-amber-950/60 rounded-3xl border-2 border-rose-500/40 p-5 sm:p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-48 h-48 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-1 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/40 font-mono text-[11px] font-black tracking-wide flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5" />
                ANTI-AFINIDADE ESTATÍSTICA
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 font-mono text-[11px] font-bold">
                Intervalo: #{analysis.concursoInicio} a #{analysis.concursoFim} (10 Concursos Oficiais)
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
              <span>Mapa de Calor de Vazios & Combinações Anti-Afinidade</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed">
              Identifique conjuntos de dezenas que <strong className="text-rose-400">raramente ou NUNCA saíram juntas</strong> nos últimos 10 concursos. Excluir essas duplas e trios incompatíveis elimina jogos matematicamente mortos antes do fechamento, aumentando a densidade de acertos úteis.
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-3 shrink-0 flex-wrap">
            <div className="bg-slate-900/90 border border-rose-500/40 rounded-2xl px-4 py-2.5 text-center shadow-lg">
              <span className="text-[10px] text-slate-400 uppercase font-black block">Vazios Absolutos</span>
              <span className="text-xl font-black text-rose-400 font-mono">
                {analysis.vaziosAbsolutos.length}
              </span>
              <span className="text-[9px] text-rose-300/80 block font-sans">0 saídas em 10 sorteios</span>
            </div>

            <div className="bg-slate-900/90 border border-amber-500/40 rounded-2xl px-4 py-2.5 text-center shadow-lg">
              <span className="text-[10px] text-slate-400 uppercase font-black block">Vazios Raros</span>
              <span className="text-xl font-black text-amber-400 font-mono">
                {analysis.vaziosRaros.length}
              </span>
              <span className="text-[9px] text-amber-300/80 block font-sans">Apenas 1 saída conjunta</span>
            </div>

            <div className="bg-slate-900/90 border border-emerald-500/40 rounded-2xl px-4 py-2.5 text-center shadow-lg">
              <span className="text-[10px] text-slate-400 uppercase font-black block">Regras Selecionadas</span>
              <span className="text-xl font-black text-emerald-400 font-mono">
                {selectedVoidPairs.length}
              </span>
              <span className="text-[9px] text-emerald-300/80 block font-sans">Pares para exclusão</span>
            </div>
          </div>
        </div>

        {/* Applied banner */}
        {appliedFeedback && (
          <div className="mt-4 bg-emerald-950/80 border border-emerald-500/50 rounded-xl p-3 flex items-center justify-between gap-3 text-xs text-emerald-300 font-bold animate-fadeIn">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{appliedFeedback}</span>
            </div>
            <button
              onClick={() => setAppliedFeedback(null)}
              className="text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Control Bar: Views & Exclusion Filter Actions */}
      <div className="bg-slate-900/95 border border-slate-800 rounded-2xl p-4 flex flex-col lg:flex-row items-center justify-between gap-4 shadow-xl">
        {/* View toggles */}
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          <button
            onClick={() => setActiveView('matriz')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeView === 'matriz'
                ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Grid className="w-3.5 h-3.5" />
            <span>Matriz 25×25 Completa</span>
          </button>

          <button
            onClick={() => setActiveView('vazios_absolutos')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeView === 'vazios_absolutos'
                ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
            <span>Vazios Absolutos ({analysis.vaziosAbsolutos.length})</span>
            <span className="text-[9px] px-1 rounded bg-rose-950 text-rose-300">0/10</span>
          </button>

          <button
            onClick={() => setActiveView('vazios_raros')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeView === 'vazios_raros'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            <span>Vazios Raros ({analysis.vaziosRaros.length})</span>
            <span className="text-[9px] px-1 rounded bg-amber-950 text-amber-300">1/10</span>
          </button>

          <button
            onClick={() => setActiveView('trios')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeView === 'trios'
                ? 'bg-purple-500 text-white shadow-md shadow-purple-500/20'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-purple-400" />
            <span>Top Trios de Vazio ({analysis.triosVazio.length})</span>
          </button>
        </div>

        {/* Exclusion Rules CTA & Batch Selectors */}
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-end">
          <button
            onClick={selectAllAbsoluteVoids}
            className="px-3 py-1.5 rounded-xl bg-rose-950/80 hover:bg-rose-900/80 border border-rose-500/40 text-rose-300 text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
            title="Seleciona todos os pares com 0 saídas nos 10 concursos"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Selecionar Vazios Absolutos</span>
          </button>

          <button
            onClick={selectAllCriticalAndRareVoids}
            className="px-3 py-1.5 rounded-xl bg-amber-950/80 hover:bg-amber-900/80 border border-amber-500/40 text-amber-300 text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
            title="Seleciona todos os pares com 0 ou 1 saída"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Selecionar 0 e 1 Saída</span>
          </button>

          {selectedVoidPairs.length > 0 && (
            <button
              onClick={clearSelection}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
              title="Limpar seleção"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            onClick={handleApplyFilter}
            disabled={selectedVoidPairs.length === 0}
            className={`px-4 py-2 rounded-xl font-black text-xs transition cursor-pointer flex items-center gap-2 shadow-lg ${
              selectedVoidPairs.length > 0
                ? 'bg-gradient-to-r from-rose-500 via-orange-500 to-amber-500 hover:from-rose-400 hover:to-amber-400 text-slate-950 shadow-rose-500/25 active:scale-95'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Aplicar Exclusão de Vazios ({selectedVoidPairs.length})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Legend & Interpretative Guide */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3 sm:px-4 flex flex-wrap items-center justify-between gap-3 text-xs">
        <span className="font-bold text-slate-300 flex items-center gap-1.5">
          <Info className="w-4 h-4 text-rose-400" />
          <span>Legenda de Co-Ocorrência (10 Concursos):</span>
        </span>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-4 h-4 rounded bg-rose-950 border border-rose-500/60 inline-block" />
            <span className="text-slate-300 text-[11px]">0 Saídas (Vazio Absoluto)</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="w-4 h-4 rounded bg-amber-950 border border-amber-600/50 inline-block" />
            <span className="text-slate-300 text-[11px]">1 Saída (Vazio Raro)</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="w-4 h-4 rounded bg-slate-800 border border-slate-700 inline-block" />
            <span className="text-slate-300 text-[11px]">2–3 Saídas (Moderado)</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="w-4 h-4 rounded bg-emerald-950 border border-emerald-500/50 inline-block" />
            <span className="text-slate-300 text-[11px]">4–6 Saídas (Equilibrado)</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="w-4 h-4 rounded bg-yellow-500/30 border border-yellow-400 inline-block" />
            <span className="text-slate-300 text-[11px]">7+ Saídas (Pares de Ouro)</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="w-4 h-4 rounded bg-rose-600 ring-2 ring-rose-400 inline-block" />
            <span className="text-slate-300 text-[11px] font-bold">Marcado para Exclusão</span>
          </div>
        </div>
      </div>

      {/* VIEW 1: MATRIZ 25x25 COMPLETA */}
      {activeView === 'matriz' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <Grid className="w-4 h-4 text-rose-400" />
                <span>Matriz de Co-Ocorrência 25×25 (Pares Conectados vs Zonas de Vazio)</span>
              </h3>
              <p className="text-xs text-slate-400">
                Toque em qualquer célula para auditar os concursos conjuntos e alternar a regra de exclusão.
              </p>
            </div>

            {selectedNumberFocus !== null && (
              <button
                onClick={() => setSelectedNumberFocus(null)}
                className="px-2.5 py-1 rounded-lg bg-slate-800 text-xs text-slate-300 hover:text-white flex items-center gap-1 self-start"
              >
                <span>Foco: Dezena {selectedNumberFocus.toString().padStart(2, '0')}</span>
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Matrix Grid Responsive Wrapper */}
          <div className="overflow-x-auto pb-2">
            <table className="w-full text-center border-collapse select-none">
              <thead>
                <tr>
                  <th className="p-1 text-[10px] font-mono text-slate-500 w-7">D</th>
                  {Array.from({ length: 25 }, (_, i) => i + 1).map((col) => (
                    <th
                      key={col}
                      onClick={() => setSelectedNumberFocus(selectedNumberFocus === col ? null : col)}
                      className={`p-1 text-[10px] font-mono cursor-pointer transition ${
                        selectedNumberFocus === col
                          ? 'bg-rose-500 text-slate-950 font-black rounded-t'
                          : 'text-slate-400 hover:text-white'
                      }`}
                      title={`Filtrar dezena ${col}`}
                    >
                      {col.toString().padStart(2, '0')}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 25 }, (_, i) => i + 1).map((row) => (
                  <tr key={row}>
                    <td
                      onClick={() => setSelectedNumberFocus(selectedNumberFocus === row ? null : row)}
                      className={`p-1 text-[10px] font-mono cursor-pointer transition font-bold ${
                        selectedNumberFocus === row
                          ? 'bg-rose-500 text-slate-950 font-black rounded-l'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {row.toString().padStart(2, '0')}
                    </td>
                    {Array.from({ length: 25 }, (_, j) => j + 1).map((col) => {
                      const count = analysis.matrix[row][col];
                      const isDiag = row === col;
                      const pair: [number, number] = [Math.min(row, col), Math.max(row, col)];
                      const isFocused =
                        selectedNumberFocus !== null &&
                        (selectedNumberFocus === row || selectedNumberFocus === col);
                      const isSelected = isPairExcluded(pair);

                      return (
                        <td
                          key={col}
                          onClick={() => {
                            if (!isDiag) {
                              const pairInfo =
                                analysis.vaziosAbsolutos.find(
                                  (v) => v.pair[0] === pair[0] && v.pair[1] === pair[1]
                                ) ||
                                analysis.vaziosRaros.find(
                                  (v) => v.pair[0] === pair[0] && v.pair[1] === pair[1]
                                ) ||
                                analysis.paresOuro.find(
                                  (v) => v.pair[0] === pair[0] && v.pair[1] === pair[1]
                                ) ||
                                analysis.paresEquilibrados.find(
                                  (v) => v.pair[0] === pair[0] && v.pair[1] === pair[1]
                                ) || {
                                  pair,
                                  coOccurrences: count,
                                  rate: count / 10,
                                  status: count === 0 ? 'absoluto' : count === 1 ? 'raro' : count >= 7 ? 'ouro' : 'moderado',
                                  contestsTogether: [],
                                };
                              setSelectedCellPair(pairInfo as VoidPairInfo);
                            }
                          }}
                          className={`p-1 text-[10px] font-mono transition cursor-pointer border border-slate-900/50 ${getCellColorClass(
                            row,
                            col
                          )} ${
                            isFocused
                              ? 'ring-1 ring-cyan-400 font-bold scale-105 z-10'
                              : ''
                          }`}
                          title={
                            isDiag
                              ? `Dezena ${row}: presente em ${count}/10 concursos`
                              : `Dupla [${pair[0].toString().padStart(2, '0')}, ${pair[1]
                                  .toString()
                                  .padStart(2, '0')}]: ${count} saídas conjuntas (${(
                                  (count / 10) *
                                  100
                                ).toFixed(0)}%)`
                          }
                        >
                          {isDiag ? `${count}` : count}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Cell Inspection Detail Box */}
          {selectedCellPair && (
            <div className="bg-slate-950/90 border-2 border-rose-500/50 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 animate-fadeIn">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/40">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-white font-mono font-black text-sm">
                      Dupla [{selectedCellPair.pair[0].toString().padStart(2, '0')},{' '}
                      {selectedCellPair.pair[1].toString().padStart(2, '0')}]
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                        selectedCellPair.coOccurrences === 0
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                          : selectedCellPair.coOccurrences === 1
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : 'bg-emerald-500/20 text-emerald-300'
                      }`}
                    >
                      {selectedCellPair.coOccurrences === 0
                        ? 'Vazio Absoluto (0/10)'
                        : selectedCellPair.coOccurrences === 1
                        ? 'Vazio Raro (1/10)'
                        : `${selectedCellPair.coOccurrences}/10 Saídas`}
                    </span>
                    {isPairExcluded(selectedCellPair.pair) && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-600 text-white">
                        ✓ Na Lista de Exclusão
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    {selectedCellPair.coOccurrences === 0
                      ? 'Estas duas dezenas NUNCA saíram juntas nos últimos 10 concursos oficiais da Caixa!'
                      : `Saíram juntas em ${selectedCellPair.coOccurrences} dos 10 concursos analisados (${(
                          selectedCellPair.rate * 100
                        ).toFixed(0)}%).`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => togglePairExclusion(selectedCellPair.pair)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                    isPairExcluded(selectedCellPair.pair)
                      ? 'bg-rose-600 text-white hover:bg-rose-700'
                      : 'bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700'
                  }`}
                >
                  {isPairExcluded(selectedCellPair.pair) ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Exclusão Ativada</span>
                    </>
                  ) : (
                    <>
                      <Filter className="w-3.5 h-3.5 text-rose-400" />
                      <span>Adicionar à Exclusão</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => setSelectedCellPair(null)}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: VAZIOS ABSOLUTOS (0 SAÍDAS CONJUNTAS) */}
      {activeView === 'vazios_absolutos' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-400" />
                <span>Pares com Vazio Absoluto ({analysis.vaziosAbsolutos.length} Duplas com 0 Saídas)</span>
              </h3>
              <p className="text-xs text-slate-400">
                Pares que não foram sorteados juntos em nenhum dos últimos 10 concursos (#3802 a #3811). Altíssimo risco apostar em bilhetes contendo ambos.
              </p>
            </div>

            <button
              onClick={selectAllAbsoluteVoids}
              className="px-3.5 py-1.5 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-bold text-xs transition cursor-pointer flex items-center gap-1.5 self-start"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Marcar Todos para Exclusão</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {analysis.vaziosAbsolutos.map((vazio) => {
              const [d1, d2] = vazio.pair;
              const excluded = isPairExcluded(vazio.pair);

              return (
                <div
                  key={`${d1}-${d2}`}
                  onClick={() => togglePairExclusion(vazio.pair)}
                  className={`p-3.5 rounded-2xl border transition cursor-pointer flex items-center justify-between gap-3 ${
                    excluded
                      ? 'bg-rose-950/80 border-rose-500 text-white ring-2 ring-rose-500/50 shadow-lg'
                      : 'bg-slate-950/70 border-slate-800 hover:border-rose-500/40 text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="flex items-center gap-1 font-mono font-black text-sm">
                      <span className="w-8 h-8 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center justify-center">
                        {d1.toString().padStart(2, '0')}
                      </span>
                      <span className="text-slate-500 font-bold">+</span>
                      <span className="w-8 h-8 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center justify-center">
                        {d2.toString().padStart(2, '0')}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] font-black text-rose-400 uppercase block">
                        Vazio Absoluto
                      </span>
                      <span className="text-[11px] text-slate-400">0/10 sorteios</span>
                    </div>
                  </div>

                  <div className="shrink-0">
                    <span
                      className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold ${
                        excluded ? 'bg-rose-500 text-white' : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {excluded ? '✓' : '+'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW 3: VAZIOS RAROS (1 SAÍDA CONJUNTA) */}
      {activeView === 'vazios_raros' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span>Pares com Vazio Raro ({analysis.vaziosRaros.length} Duplas com 1 Saída)</span>
              </h3>
              <p className="text-xs text-slate-400">
                Pares que saíram juntos em apenas 1 dos últimos 10 concursos (frequência de apenas 10%).
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {analysis.vaziosRaros.map((vazio) => {
              const [d1, d2] = vazio.pair;
              const excluded = isPairExcluded(vazio.pair);

              return (
                <div
                  key={`${d1}-${d2}`}
                  onClick={() => togglePairExclusion(vazio.pair)}
                  className={`p-3.5 rounded-2xl border transition cursor-pointer flex items-center justify-between gap-3 ${
                    excluded
                      ? 'bg-amber-950/80 border-amber-500 text-white ring-2 ring-amber-500/50 shadow-lg'
                      : 'bg-slate-950/70 border-slate-800 hover:border-amber-500/40 text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="flex items-center gap-1 font-mono font-black text-sm">
                      <span className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center justify-center">
                        {d1.toString().padStart(2, '0')}
                      </span>
                      <span className="text-slate-500 font-bold">+</span>
                      <span className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center justify-center">
                        {d2.toString().padStart(2, '0')}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] font-black text-amber-400 uppercase block">
                        Vazio Raro
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {vazio.contestsTogether.length > 0
                          ? `Conc. #${vazio.contestsTogether[0]}`
                          : '1/10 sorteios'}
                      </span>
                    </div>
                  </div>

                  <div className="shrink-0">
                    <span
                      className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold ${
                        excluded ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {excluded ? '✓' : '+'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW 4: TOP TRIOS DE VAZIO */}
      {activeView === 'trios' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
          <div className="pb-3 border-b border-slate-800">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-purple-400" />
              <span>Top Trios de Vazio (3 Dezenas com 0 Saídas Conjuntas em 10 Concursos)</span>
            </h3>
            <p className="text-xs text-slate-400">
              Conjuntos de 3 dezenas que historicamente nunca ocorreram simultaneamente nos últimos 10 sorteios. Se um bilhete contém as 3 juntas, sua chance de 14/15 acertos é estatisticamente nula neste ciclo.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {analysis.triosVazio.slice(0, 18).map((trioItem, idx) => {
              const [d1, d2, d3] = trioItem.trio;
              const pair1: [number, number] = [d1, d2];
              const pair2: [number, number] = [d2, d3];
              const pair3: [number, number] = [d1, d3];

              return (
                <div
                  key={`${d1}-${d2}-${d3}`}
                  className="bg-slate-950/80 border border-purple-500/30 rounded-2xl p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold text-purple-400 uppercase bg-purple-500/10 px-2 py-0.5 rounded">
                      Trio Vazio #{idx + 1}
                    </span>
                    <span className="text-[10px] font-bold text-rose-400">0/10 Concursos</span>
                  </div>

                  <div className="flex items-center justify-center gap-1.5 font-mono font-black text-sm">
                    <span className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/40 flex items-center justify-center">
                      {d1.toString().padStart(2, '0')}
                    </span>
                    <span className="text-slate-500 font-bold">+</span>
                    <span className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/40 flex items-center justify-center">
                      {d2.toString().padStart(2, '0')}
                    </span>
                    <span className="text-slate-500 font-bold">+</span>
                    <span className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/40 flex items-center justify-center">
                      {d3.toString().padStart(2, '0')}
                    </span>
                  </div>

                  <button
                    onClick={() => {
                      togglePairExclusion(pair1);
                      togglePairExclusion(pair2);
                    }}
                    className="w-full py-1.5 rounded-xl bg-slate-800 hover:bg-purple-600/30 text-purple-300 text-xs font-bold transition flex items-center justify-center gap-1.5"
                  >
                    <Filter className="w-3.5 h-3.5" />
                    <span>Bloquear Pares Deste Trio</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Ranking de Isolamento por Dezena */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Info className="w-4 h-4 text-cyan-400" />
          <span>Índice de Isolamento por Dezena (Mais Vazia nos 10 Concursos)</span>
        </h3>
        <p className="text-xs text-slate-400">
          Dezenas que acumulam o maior número de pares vazios (sem conexões recentes com outras dezenas):
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5 pt-1">
          {analysis.isolamentoPorDezena.slice(0, 10).map((item, idx) => (
            <div
              key={item.dezena}
              className="bg-slate-950/80 border border-slate-800 rounded-xl p-2.5 flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-slate-800 text-white font-mono font-black text-xs flex items-center justify-center">
                  {item.dezena.toString().padStart(2, '0')}
                </span>
                <div>
                  <span className="text-[10px] text-slate-400 block">Vazios Abs.</span>
                  <span className="text-xs font-mono font-bold text-rose-400">
                    {item.qtdVaziosAbsolutos} duplas
                  </span>
                </div>
              </div>
              <span className="text-[10px] font-mono text-slate-500 font-bold">
                #{idx + 1}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
