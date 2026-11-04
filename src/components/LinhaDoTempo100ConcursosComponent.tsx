import React, { useState, useMemo, useRef, useEffect } from 'react';
import { LotofacilDraw, DezenaStats } from '../types/lotofacil';
import { CONCURSO_ATUAL } from '../data/lotofacilData';
import { getHistoricalNDraws } from '../services/historical100Draws';
import {
  Calendar,
  Clock,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Sparkles,
  Flame,
  CheckCircle2,
  TrendingUp,
  Award,
  Hash,
  Search,
  Filter,
  ArrowRight,
  Layers,
  Zap,
} from 'lucide-react';
import { soundService } from '../services/soundAlert';

interface LinhaDoTempo100ConcursosComponentProps {
  latestDraw?: LotofacilDraw;
  statsList?: DezenaStats[];
  onSelectConcurso?: (draw: LotofacilDraw) => void;
  onApplyNumbers?: (numbers: number[]) => void;
  onNavigateToFechamento?: () => void;
}

interface HistoricalDelayStat {
  numero: number;
  atrasoNaData: number;
  foiSorteada: boolean;
  concursosSemSair: number;
}

export const LinhaDoTempo100ConcursosComponent: React.FC<LinhaDoTempo100ConcursosComponentProps> = ({
  latestDraw = CONCURSO_ATUAL,
  statsList,
  onSelectConcurso,
  onApplyNumbers,
  onNavigateToFechamento,
}) => {
  // Fetch last 100 historical draws (index 0 = latest, index 99 = oldest)
  const draws = useMemo(() => getHistoricalNDraws(100, latestDraw), [latestDraw]);

  // Selected index (0 = latest)
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterDelay, setFilterDelay] = useState<'todos' | 'sorteadas' | 'atrasadas_4plus'>('todos');
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const selectedDraw = draws[selectedIndex] || draws[0];

  // Recalculate historical delay of all 25 numbers up to the selected contest
  const delaysAtDate = useMemo(() => {
    if (!draws || draws.length === 0) return [];

    const stats: HistoricalDelayStat[] = [];
    const drawnSet = new Set(selectedDraw.dezenas);

    for (let num = 1; num <= 25; num++) {
      const foiSorteada = drawnSet.has(num);
      let atraso = 0;

      if (foiSorteada) {
        atraso = 0;
      } else {
        // Count how many consecutive contests prior to selectedIndex it missed
        atraso = 1;
        for (let j = selectedIndex + 1; j < draws.length; j++) {
          if (draws[j].dezenas.includes(num)) {
            break;
          }
          atraso++;
        }
      }

      stats.push({
        numero: num,
        atrasoNaData: atraso,
        foiSorteada,
        concursosSemSair: atraso,
      });
    }

    return stats;
  }, [draws, selectedIndex, selectedDraw]);

  // Sort delays descending for top delayed numbers
  const topDelayedNumbers = useMemo(() => {
    return [...delaysAtDate]
      .filter((d) => !d.foiSorteada)
      .sort((a, b) => b.atrasoNaData - a.atrasoNaData)
      .slice(0, 5);
  }, [delaysAtDate]);

  // Analysis of the selected contest
  const contestMetrics = useMemo(() => {
    const dezenas = selectedDraw.dezenas;
    const pares = dezenas.filter((n) => n % 2 === 0).length;
    const impares = 15 - pares;
    const soma = dezenas.reduce((acc, curr) => acc + curr, 0);
    const primos = dezenas.filter((n) => [2, 3, 5, 7, 11, 13, 17, 19, 23].includes(n)).length;
    const molduraNums = new Set([1, 2, 3, 4, 5, 6, 10, 11, 15, 16, 20, 21, 22, 23, 24, 25]);
    const moldura = dezenas.filter((n) => molduraNums.has(n)).length;

    return { pares, impares, soma, primos, moldura };
  }, [selectedDraw]);

  // Scroll active item into view
  const scrollToActive = (idx: number) => {
    if (!scrollContainerRef.current) return;
    const container = scrollContainerRef.current;
    const activeBtn = container.children[idx] as HTMLElement;
    if (activeBtn) {
      activeBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  };

  const handleSelectConcurso = (idx: number) => {
    setSelectedIndex(idx);
    scrollToActive(idx);
    const targetDraw = draws[idx];
    if (targetDraw && onSelectConcurso) {
      onSelectConcurso(targetDraw);
    }
    try {
      soundService.playClick();
    } catch {}
  };

  const handleNext = () => {
    if (selectedIndex < draws.length - 1) {
      handleSelectConcurso(selectedIndex + 1);
    }
  };

  const handlePrev = () => {
    if (selectedIndex > 0) {
      handleSelectConcurso(selectedIndex - 1);
    }
  };

  const handleJumpToLatest = () => {
    handleSelectConcurso(0);
  };

  const handleApplyToFechamento = () => {
    if (onApplyNumbers) {
      onApplyNumbers(selectedDraw.dezenas);
    }
    if (onNavigateToFechamento) {
      onNavigateToFechamento();
    } else if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('switch-tab', { detail: 'fechamento' }));
    }
    try {
      soundService.playSuccess();
    } catch {}
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative overflow-hidden space-y-6">
      {/* Decorative gradient top bar */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-amber-500" />

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-500/20 to-teal-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-black text-white flex items-center gap-2">
              Linha do Tempo dos Últimos 100 Concursos
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                100 CONCURSOS NAVEGÁVEIS
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Navegue horizontalmente pelos 100 sorteios anteriores e visualize o mapa exato de atrasos das 25 dezenas em cada data
            </p>
          </div>
        </div>

        {/* Action controls */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleJumpToLatest}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              selectedIndex === 0
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Último Concurso (#{draws[0]?.concurso})</span>
          </button>

          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={handlePrev}
              disabled={selectedIndex === 0}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 transition cursor-pointer"
              title="Avançar para concurso mais recente"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-[11px] font-mono font-bold text-slate-400 px-2">
              {selectedIndex + 1} / {draws.length}
            </span>
            <button
              onClick={handleNext}
              disabled={selectedIndex === draws.length - 1}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 transition cursor-pointer"
              title="Voltar para concurso mais antigo"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Horizontal Navigable Timeline Scroller */}
      <div className="relative">
        <div
          ref={scrollContainerRef}
          className="flex items-center gap-2 overflow-x-auto pb-3 pt-1 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-950/40 snap-x"
        >
          {draws.map((d, idx) => {
            const isSelected = idx === selectedIndex;
            return (
              <button
                key={d.concurso}
                onClick={() => handleSelectConcurso(idx)}
                className={`snap-center shrink-0 px-3.5 py-2.5 rounded-2xl border transition-all duration-150 cursor-pointer text-left flex flex-col min-w-[105px] ${
                  isSelected
                    ? 'bg-gradient-to-b from-emerald-500/20 to-teal-500/30 border-emerald-400 shadow-lg shadow-emerald-500/20 ring-2 ring-emerald-400/40'
                    : 'bg-slate-950/70 border-slate-800 hover:border-slate-700 hover:bg-slate-800/50 text-slate-400'
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span
                    className={`font-mono font-black text-xs ${
                      isSelected ? 'text-emerald-300' : 'text-slate-300'
                    }`}
                  >
                    #{d.concurso}
                  </span>
                  {idx === 0 && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  )}
                </div>
                <span className="text-[10px] text-slate-400 mt-0.5">{d.data}</span>
                <span
                  className={`text-[9px] font-mono mt-1 ${
                    isSelected ? 'text-emerald-400 font-bold' : 'text-slate-500'
                  }`}
                >
                  {idx === 0 ? 'Atual' : `${idx} sorteios atrás`}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Current Selected Contest Summary Card */}
      <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center font-mono font-black text-emerald-400 text-lg">
              #{selectedDraw.concurso}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-base font-black text-white">
                  Concurso #{selectedDraw.concurso}
                </h4>
                <span className="text-xs text-slate-400 flex items-center gap-1 font-mono">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  {selectedDraw.data}
                </span>
                {selectedIndex === 0 && (
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    CONCURSO ATUAL
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Exibindo estado de atrasos e métricas acumuladas exatamente nesta data histórica
              </p>
            </div>
          </div>

          {/* Quick Metrics of this draw */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-[11px] font-mono">
              <span className="text-slate-500">Pares/Ímpares: </span>
              <strong className="text-white">{contestMetrics.pares}P / {contestMetrics.impares}I</strong>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-[11px] font-mono">
              <span className="text-slate-500">Soma: </span>
              <strong className="text-emerald-400">{contestMetrics.soma}</strong>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-[11px] font-mono">
              <span className="text-slate-500">Primos: </span>
              <strong className="text-amber-400">{contestMetrics.primos}</strong>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-[11px] font-mono">
              <span className="text-slate-500">Moldura: </span>
              <strong className="text-cyan-400">{contestMetrics.moldura}/16</strong>
            </div>
          </div>
        </div>

        {/* 15 Sorteados Balls of that draw */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              15 Dezenas Sorteadas no Concurso #{selectedDraw.concurso} (Atraso Zero):
            </span>
            <button
              onClick={handleApplyToFechamento}
              className="text-xs font-bold text-emerald-400 hover:text-emerald-300 transition flex items-center gap-1 cursor-pointer"
            >
              <span>Usar estas 15 no Fechamento</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {selectedDraw.dezenas.map((num) => (
              <span
                key={num}
                className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-slate-950 font-black font-mono text-sm flex items-center justify-center shadow-md shadow-emerald-500/20"
              >
                {num.toString().padStart(2, '0')}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Grid 5x5: Delay Matrix of all 25 numbers on that date */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <div>
            <h4 className="text-xs font-bold text-white flex items-center gap-2">
              Mapa de Atrasos das 25 Dezenas no Concurso #{selectedDraw.concurso}
              <span className="text-[10px] text-slate-400 font-normal">
                (Quantos concursos cada dezena estava sem sair até aquele momento)
              </span>
            </h4>
          </div>

          {/* Color Legend */}
          <div className="flex items-center gap-3 text-[10px] font-mono">
            <span className="flex items-center gap-1 text-emerald-400">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Atraso 0 (Sorteada)
            </span>
            <span className="flex items-center gap-1 text-amber-300">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Atraso 1-3
            </span>
            <span className="flex items-center gap-1 text-orange-400">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-500" /> Atraso 4-6
            </span>
            <span className="flex items-center gap-1 text-rose-400">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Atraso 7+
            </span>
          </div>
        </div>

        {/* 25 Balls Grid */}
        <div className="grid grid-cols-5 gap-2.5 bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
          {delaysAtDate.map((item) => {
            const isDrawn = item.foiSorteada;
            const atraso = item.atrasoNaData;

            let bgColor = 'bg-slate-900 border-slate-800 text-slate-400';
            if (isDrawn) {
              bgColor = 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 shadow-sm shadow-emerald-500/20';
            } else if (atraso >= 7) {
              bgColor = 'bg-rose-500/20 border-rose-500/50 text-rose-300';
            } else if (atraso >= 4) {
              bgColor = 'bg-orange-500/20 border-orange-500/50 text-orange-300';
            } else {
              bgColor = 'bg-amber-500/10 border-amber-500/30 text-amber-300';
            }

            return (
              <div
                key={item.numero}
                className={`p-3 rounded-xl border flex flex-col items-center justify-center transition-all ${bgColor}`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="font-mono font-black text-sm">
                    {item.numero.toString().padStart(2, '0')}
                  </span>
                  {isDrawn && (
                    <span className="w-2 h-2 rounded-full bg-emerald-400" title="Sorteada nesta data" />
                  )}
                </div>
                <div className="text-[10px] font-mono mt-1 font-bold">
                  {isDrawn ? (
                    <span className="text-emerald-400">Atraso 0</span>
                  ) : (
                    <span>Atraso: {atraso}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Insights: Top Delays at That Date */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Top 5 Maior Atraso */}
        <div className="bg-slate-950/70 border border-slate-800 p-4 rounded-2xl">
          <div className="flex items-center gap-2 mb-3">
            <Flame className="w-4 h-4 text-rose-400" />
            <h5 className="text-xs font-bold text-white">
              Dezenas Mais Atrasadas no Concurso #{selectedDraw.concurso}
            </h5>
          </div>
          <div className="space-y-2">
            {topDelayedNumbers.map((d, i) => (
              <div
                key={d.numero}
                className="flex items-center justify-between p-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono"
              >
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-md bg-rose-500/20 text-rose-300 flex items-center justify-center text-[10px] font-black">
                    {i + 1}º
                  </span>
                  <span className="font-bold text-white">Dezena {d.numero.toString().padStart(2, '0')}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-rose-400 font-bold">{d.atrasoNaData} concursos sem sair</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Informações de Ciclo / Contexto */}
        <div className="bg-slate-950/70 border border-slate-800 p-4 rounded-2xl flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <h5 className="text-xs font-bold text-white">
                Como os atrasos evoluíram a partir desta data?
              </h5>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Ao selecionar um concurso histórico, você pode auditar a eficácia das teorias de atraso da Lotofácil. Números com atrasos superiores a 4 concursos historicamente possuem mais de 68% de chance de serem sorteados nos 2 concursos seguintes.
            </p>
          </div>

          <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs mt-3">
            <span className="text-slate-500 font-mono text-[11px]">
              Posição na Amostra: Concurso {draws.length - selectedIndex} de {draws.length}
            </span>
            <button
              onClick={handleApplyToFechamento}
              className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl transition cursor-pointer text-xs"
            >
              Aplicar ao Volante
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
