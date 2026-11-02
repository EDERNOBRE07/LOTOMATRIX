import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PRIMOS,
  MOLDURA,
  FIBONACCI,
  DEZENAS_STATS,
  CONCURSO_ATUAL,
} from '../data/lotofacilData';
import { LotofacilDraw, DezenaStats } from '../types/lotofacil';
import { buildOptimal18Pool, buildOptimalPool } from '../services/combinatorics';
import { calculateCurvaAbc } from '../services/curvaAbcService';
import { Sparkles, Check, Pin, Ban, Layers, Eye, RefreshCw, Zap, Award, Play, X } from 'lucide-react';
import { RollingNumbersSorteio } from './RollingNumbersSorteio';
import { soundService } from '../services/soundAlert';

interface VolanteSelectorProps {
  selectedNumbers: number[];
  fixedNumbers: number[];
  excludedNumbers: number[];
  aiScores?: number[];
  statsList?: DezenaStats[];
  cyclePendingNumbers?: number[];
  latestDraw?: LotofacilDraw;
  onToggleNumber: (n: number) => void;
  onSetFixed: (n: number) => void;
  onSetExcluded: (n: number) => void;
  onSelectSet: (numbers: number[]) => void;
  onClear: () => void;
  targetCount?: number;
  onStrategySelect?: (strategyName: string) => void;
  activeStrategy?: string;
}

export const VolanteSelector: React.FC<VolanteSelectorProps> = ({
  selectedNumbers,
  fixedNumbers,
  excludedNumbers,
  aiScores,
  statsList = DEZENAS_STATS,
  cyclePendingNumbers = [17, 22],
  latestDraw = CONCURSO_ATUAL,
  onToggleNumber,
  onSetFixed,
  onSetExcluded,
  onSelectSet,
  onClear,
  targetCount = 18,
  onStrategySelect,
  activeStrategy,
}) => {
  const [visualMode, setVisualMode] = useState<
    'normal' | 'moldura' | 'primos' | 'fibonacci' | 'atrasadas' | 'calor_ia' | 'curva_abc'
  >('normal');
  const [clickMode, setClickMode] = useState<'select' | 'fix' | 'exclude'>('select');
  const [showRollingModal, setShowRollingModal] = useState<boolean>(false);

  // Compute scores map
  const scoresMap = React.useMemo(() => {
    const map: { [num: number]: number } = {};
    for (let i = 1; i <= 25; i++) {
      if (aiScores && aiScores[i - 1] !== undefined) {
        map[i] = Math.round(aiScores[i - 1]);
      } else {
        const s = statsList.find((st) => st.numero === i);
        map[i] = s ? Math.min(99, Math.round(60 + s.vezes / 20 + s.atrasoAtual * 3)) : 80;
      }
    }
    return map;
  }, [aiScores, statsList]);

  // Numbers to spin: either selectedNumbers if targetCount is reached, or optimal pool
  const numbersToSpin = React.useMemo(() => {
    if (selectedNumbers.length >= 15) {
      return [...selectedNumbers].slice(0, targetCount).sort((a, b) => a - b);
    }
    const pool = buildOptimalPool(targetCount, latestDraw, statsList, cyclePendingNumbers);
    return pool.dezenas.slice(0, targetCount).sort((a, b) => a - b);
  }, [selectedNumbers, targetCount, latestDraw, statsList, cyclePendingNumbers]);

  // Curva ABC data
  const curvaAbcSummary = React.useMemo(() => calculateCurvaAbc(statsList), [statsList]);

  // Fast preset selections
  const handleSelectClasseA = () => {
    onSelectSet(curvaAbcSummary.classeANumeros.slice(0, targetCount));
    onStrategySelect?.(`Classe A Curva ABC (${curvaAbcSummary.classeANumeros.slice(0, targetCount).length} Dezenas)`);
  };

  const handleSelectTop18AI = () => {
    // Top sorted by AI score or delay urgency
    const sorted = [...statsList]
      .sort((a, b) => {
        const scoreA = aiScores ? aiScores[a.numero - 1] : a.vezes / 24 + a.atrasoAtual * 5;
        const scoreB = aiScores ? aiScores[b.numero - 1] : b.vezes / 24 + b.atrasoAtual * 5;
        return scoreB - scoreA;
      })
      .slice(0, targetCount)
      .map((s) => s.numero)
      .sort((a, b) => a - b);
    onSelectSet(sorted);
    const name = targetCount === 18 ? 'Top 18 IA' : `Top 18 IA (Top ${targetCount} Dezenas)`;
    onStrategySelect?.(name);
  };

  const handleSelectDocumentStrategy = () => {
    const optimal = buildOptimalPool(targetCount, latestDraw, statsList, cyclePendingNumbers);
    onSelectSet(optimal.dezenas.slice(0, targetCount));
    onStrategySelect?.('⚡ Fechamento Clássico (9 Repetidas + 9 Ausentes)');
  };

  const handleSelectCycleClosure = () => {
    // Urgent pending cycle numbers (2, 7, 10, etc.) + top recurring
    const cycleFocus = Array.from(
      new Set([
        2, 7, 10,
        ...cyclePendingNumbers,
        ...statsList.filter((s) => s.atrasoAcimaDaMedia).map((s) => s.numero),
        11, 20, 25, 13, 24, 1, 4, 3, 5, 9, 12, 14, 15, 19, 21, 22, 23,
      ])
    );
    onSelectSet(cycleFocus.slice(0, targetCount).sort((a, b) => a - b));
    onStrategySelect?.('Fechar Ciclo (2, 7, 10)');
  };

  const handleSelectEquilibrio = () => {
    // Balanced distribution: moldura + miolo + primos + fibonacci
    const eq = [1, 2, 3, 5, 7, 8, 10, 11, 13, 14, 15, 19, 20, 21, 22, 23, 24, 25];
    onSelectSet(eq.slice(0, targetCount).sort((a, b) => a - b));
    onStrategySelect?.('Equilíbrio Canônico');
  };

  const handleNumberClick = (n: number) => {
    if (clickMode === 'fix') {
      onSetFixed(n);
    } else if (clickMode === 'exclude') {
      onSetExcluded(n);
    } else {
      onToggleNumber(n);
    }
  };

  const [isRollingVolante, setIsRollingVolante] = useState<boolean>(false);
  const [flashingDezenas, setFlashingDezenas] = useState<number[]>([]);

  const runRollingAnimation = (targetNumbers: number[], strategyLabel: string) => {
    setIsRollingVolante(true);
    setShowRollingModal(true);
    soundService.playTick();

    let step = 0;
    const interval = setInterval(() => {
      const randomSubset: number[] = [];
      while (randomSubset.length < targetCount) {
        const rand = Math.floor(Math.random() * 25) + 1;
        if (!randomSubset.includes(rand)) randomSubset.push(rand);
      }
      setFlashingDezenas(randomSubset);
      soundService.playTick();
      step++;

      if (step >= 8) {
        clearInterval(interval);
        setFlashingDezenas([]);
        setIsRollingVolante(false);
        onSelectSet(targetNumbers);
        onStrategySelect?.(strategyLabel);
        soundService.playSuccess();
      }
    }, 130);
  };

  // 1. Auto-completar: preserva dezenas atuais e preenche até targetCount com rolling numbers
  const handleAutoCompletar = () => {
    let current = [...selectedNumbers];
    if (fixedNumbers.length > 0) {
      current = Array.from(new Set([...fixedNumbers, ...current]));
    }
    current = current.filter((n) => !excludedNumbers.includes(n));

    if (current.length >= targetCount) {
      runRollingAnimation(current.slice(0, targetCount).sort((a, b) => a - b), 'Auto-completar Volante');
      return;
    }

    const needed = targetCount - current.length;
    const candidates = [...statsList]
      .filter((s) => !current.includes(s.numero) && !excludedNumbers.includes(s.numero))
      .sort((a, b) => {
        const scoreA = aiScores ? aiScores[a.numero - 1] : a.vezes / 24 + a.atrasoAtual * 5;
        const scoreB = aiScores ? aiScores[b.numero - 1] : b.vezes / 24 + b.atrasoAtual * 5;
        return scoreB - scoreA;
      })
      .slice(0, needed)
      .map((s) => s.numero);

    const fullSet = [...current, ...candidates].sort((a, b) => a - b);
    runRollingAnimation(fullSet, `Auto-completar (${fullSet.length} Dezenas)`);
  };

  // 2. Gerar: calcula um pool ideal com animação rolling numbers
  const handleGerar = () => {
    const optimal = buildOptimalPool(targetCount, latestDraw, statsList, cyclePendingNumbers);
    let pool = [...optimal.dezenas];

    if (fixedNumbers.length > 0) {
      pool = Array.from(new Set([...fixedNumbers, ...pool])).slice(0, targetCount);
    }
    if (excludedNumbers.length > 0) {
      pool = pool.filter((n) => !excludedNumbers.includes(n));
      const candidates = Array.from({ length: 25 }, (_, i) => i + 1)
        .filter((n) => !excludedNumbers.includes(n) && !pool.includes(n));
      while (pool.length < targetCount && candidates.length > 0) {
        pool.push(candidates.shift()!);
      }
    }
    pool.sort((a, b) => a - b);
    runRollingAnimation(pool, `Gerador Inteligente (${pool.length} Dezenas)`);
  };

  return (
    <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-5 shadow-xl">
      {/* Top Bar: Selector Title and Counters */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-800/80 gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-400" />
              <span>Volante Oficial Interativo 5×5</span>
            </h3>
            <span
              className={`text-xs px-2.5 py-0.5 rounded-full font-mono font-semibold ${
                selectedNumbers.length === targetCount
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : selectedNumbers.length > targetCount
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : 'bg-slate-800 text-slate-300 border border-slate-700'
              }`}
            >
              {selectedNumbers.length} / {targetCount} dezenas
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Clique nas dezenas para selecionar, fixar ou excluir do fechamento matemático.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Botão Gerar com Rolling Numbers */}
          <button
            type="button"
            onClick={handleGerar}
            disabled={isRollingVolante}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-xs transition cursor-pointer shadow-md shadow-emerald-500/25 active:scale-95 disabled:opacity-50"
            title="Gerar novo conjunto ideal com animação mecânica de rolling numbers antes de estabilizar"
          >
            <Play className={`w-3.5 h-3.5 fill-current text-slate-950 ${isRollingVolante ? 'animate-spin' : ''}`} />
            <span>Gerar</span>
          </button>

          {/* Botão Auto-completar com Rolling Numbers */}
          <button
            type="button"
            onClick={handleAutoCompletar}
            disabled={isRollingVolante}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-yellow-300 text-slate-950 font-black text-xs transition cursor-pointer shadow-md shadow-amber-500/25 active:scale-95 disabled:opacity-50"
            title="Auto-completar as dezenas restantes com animação mecânica de rolling numbers antes de estabilizar"
          >
            <Sparkles className="w-3.5 h-3.5 fill-current text-slate-950" />
            <span>Auto-completar</span>
          </button>

          {/* Click Mode Toggle */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 self-start sm:self-auto text-xs">
            <button
              onClick={() => setClickMode('select')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-medium transition cursor-pointer ${
                clickMode === 'select'
                  ? 'bg-emerald-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Check className="w-3.5 h-3.5" />
              <span>Selecionar</span>
            </button>
          <button
            onClick={() => setClickMode('fix')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-medium transition cursor-pointer ${
              clickMode === 'fix'
                ? 'bg-blue-500 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Dezenas fixas entram em 100% dos jogos gerados"
          >
            <Pin className="w-3.5 h-3.5" />
            <span>Fixar ({fixedNumbers.length})</span>
          </button>
          <button
            onClick={() => setClickMode('exclude')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-medium transition cursor-pointer ${
              clickMode === 'exclude'
                ? 'bg-rose-500 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Dezenas excluídas nunca entram em nenhum jogo"
          >
            <Ban className="w-3.5 h-3.5" />
            <span>Excluir ({excludedNumbers.length})</span>
          </button>
        </div>
      </div>
    </div>

      {/* Visual Filter Overlays */}
      <div className="flex flex-wrap items-center justify-between gap-2 py-3 border-b border-slate-800/60 text-xs">
        <span className="text-slate-400 flex items-center gap-1">
          <Eye className="w-3.5 h-3.5 text-slate-500" />
          Filtros Visuais:
        </span>
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setVisualMode('normal')}
            className={`px-2.5 py-1 rounded-lg transition text-[11px] cursor-pointer ${
              visualMode === 'normal'
                ? 'bg-slate-700 text-white font-semibold'
                : 'bg-slate-800/60 text-slate-400 hover:text-slate-200'
            }`}
          >
            Padrão
          </button>
          <button
            onClick={() => setVisualMode('moldura')}
            className={`px-2.5 py-1 rounded-lg transition text-[11px] cursor-pointer ${
              visualMode === 'moldura'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold'
                : 'bg-slate-800/60 text-slate-400 hover:text-slate-200'
            }`}
          >
            Moldura (16)
          </button>
          <button
            onClick={() => setVisualMode('primos')}
            className={`px-2.5 py-1 rounded-lg transition text-[11px] cursor-pointer ${
              visualMode === 'primos'
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 font-semibold'
                : 'bg-slate-800/60 text-slate-400 hover:text-slate-200'
            }`}
          >
            Primos (9)
          </button>
          <button
            onClick={() => setVisualMode('fibonacci')}
            className={`px-2.5 py-1 rounded-lg transition text-[11px] cursor-pointer ${
              visualMode === 'fibonacci'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-semibold'
                : 'bg-slate-800/60 text-slate-400 hover:text-slate-200'
            }`}
          >
            Fibonacci (7)
          </button>
          <button
            onClick={() => setVisualMode('atrasadas')}
            className={`px-2.5 py-1 rounded-lg transition text-[11px] cursor-pointer ${
              visualMode === 'atrasadas'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 font-semibold'
                : 'bg-slate-800/60 text-slate-400 hover:text-slate-200'
            }`}
          >
            Atrasadas (+Atraso)
          </button>
          <button
            onClick={() => setVisualMode('calor_ia')}
            className={`px-2.5 py-1 rounded-lg transition text-[11px] cursor-pointer flex items-center gap-1 ${
              visualMode === 'calor_ia'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-semibold'
                : 'bg-slate-800/60 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3 h-3 text-emerald-400" />
            Calor IA
          </button>
          <button
            onClick={() => setVisualMode('curva_abc')}
            className={`px-2.5 py-1 rounded-lg transition text-[11px] cursor-pointer flex items-center gap-1 ${
              visualMode === 'curva_abc'
                ? 'bg-amber-500/25 text-amber-300 border border-amber-400 font-semibold'
                : 'bg-slate-800/60 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Award className="w-3 h-3 text-amber-400" />
            Curva ABC
          </button>
        </div>
      </div>

      {/* Sorteio Rolling Numbers Animado (Framer Motion) */}
      {showRollingModal && (
        <div className="my-4 p-4 rounded-2xl bg-slate-950/90 border border-amber-500/40 relative shadow-2xl">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
            <span className="text-xs font-black text-amber-400 flex items-center gap-1.5 uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              Sorteio Rolling Numbers no Volante (Framer Motion)
            </span>
            <button
              type="button"
              onClick={() => setShowRollingModal(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              title="Fechar Sorteio Animado"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <RollingNumbersSorteio
            finalNumbers={numbersToSpin}
            title="Sorteio das Dezenas do Volante"
            subtitle={`Girando ${numbersToSpin.length} dezenas selecionadas/recomendadas com animação mecânica Framer Motion`}
            cycleKeyNumbers={cyclePendingNumbers}
            scoresMap={scoresMap}
            autoStart={true}
            onApplyNumbers={(nums) => {
              onSelectSet(nums);
              setShowRollingModal(false);
              onStrategySelect?.(`Sorteio Rolling Numbers (${nums.length} Dezenas)`);
            }}
          />
        </div>
      )}

      {/* Volante Grid 5x5 */}
      <div className="py-4 flex justify-center">
        <div className="grid grid-cols-5 gap-2 sm:gap-3 max-w-md w-full">
          {Array.from({ length: 25 }, (_, i) => {
            const num = i + 1;
            const isSelected = selectedNumbers.includes(num);
            const isFixed = fixedNumbers.includes(num);
            const isExcluded = excludedNumbers.includes(num);
            const stat = statsList.find((s) => s.numero === num);
            const atraso = stat?.atrasoAtual ?? 0;
            const vezes = stat?.vezes ?? 0;
            const scoreIA = aiScores ? aiScores[num - 1] ?? 50 : 50;

            // Visual overlay highlights
            const isMolduraNumber = MOLDURA.includes(num);
            const isPrimoNumber = PRIMOS.includes(num);
            const isFibonacciNumber = FIBONACCI.includes(num);
            const isCriticalDelay = cyclePendingNumbers.includes(num) || atraso >= 3;

            let borderStyle = 'border-slate-800';
            let bgStyle = 'bg-slate-950/70 hover:bg-slate-800/80 text-slate-200';

            if (visualMode === 'moldura' && isMolduraNumber) {
              borderStyle = 'border-amber-500/70 shadow-sm shadow-amber-500/10';
            } else if (visualMode === 'primos' && isPrimoNumber) {
              borderStyle = 'border-purple-500/70 shadow-sm shadow-purple-500/10';
            } else if (visualMode === 'fibonacci' && isFibonacciNumber) {
              borderStyle = 'border-cyan-500/70 shadow-sm shadow-cyan-500/10';
            } else if (visualMode === 'atrasadas' && isCriticalDelay) {
              borderStyle = 'border-rose-500/70 shadow-sm shadow-rose-500/10';
            } else if (visualMode === 'calor_ia') {
              if (scoreIA >= 80) bgStyle = 'bg-emerald-950/50 border-emerald-500/40 text-emerald-200';
              else if (scoreIA >= 60) bgStyle = 'bg-teal-950/40 border-teal-500/30 text-teal-200';
              else bgStyle = 'bg-slate-950/50 border-slate-800 text-slate-400';
            } else if (visualMode === 'curva_abc') {
              if (curvaAbcSummary.classeANumeros.includes(num)) {
                borderStyle = 'border-amber-400 shadow-sm shadow-amber-500/20';
                if (!isSelected) bgStyle = 'bg-amber-950/30 text-amber-200 border-amber-500/50';
              } else if (curvaAbcSummary.classeBNumeros.includes(num)) {
                borderStyle = 'border-cyan-500/50';
                if (!isSelected) bgStyle = 'bg-cyan-950/20 text-cyan-200 border-cyan-500/40';
              } else {
                borderStyle = 'border-purple-500/50';
                if (!isSelected) bgStyle = 'bg-purple-950/20 text-purple-200 border-purple-500/40';
              }
            }

            // Selection overrides
            if (isFixed) {
              bgStyle = 'bg-blue-600 text-white font-bold shadow-lg shadow-blue-600/30 ring-2 ring-blue-400';
              borderStyle = 'border-blue-400';
            } else if (isExcluded) {
              bgStyle = 'bg-rose-950/40 text-rose-400 opacity-60 line-through border-rose-900 ring-1 ring-rose-500/40';
              borderStyle = 'border-rose-500/40';
            } else if (isSelected) {
              bgStyle = 'bg-gradient-to-br from-emerald-500 to-teal-600 text-slate-950 font-bold shadow-lg shadow-emerald-500/30 ring-2 ring-emerald-300';
              borderStyle = 'border-emerald-300';
            }

            const isFlashing = isRollingVolante && flashingDezenas.includes(num);

            return (
              <motion.button
                key={num}
                type="button"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                animate={
                  isFlashing
                    ? {
                        scale: [1, 1.15, 0.92, 1],
                        rotate: [0, 4, -4, 0],
                        backgroundColor: '#f59e0b',
                        color: '#020617',
                      }
                    : isRollingVolante
                    ? { scale: [1, 1.06, 0.96, 1] }
                    : { scale: 1, rotate: 0 }
                }
                transition={
                  isRollingVolante
                    ? { duration: 0.22, repeat: Infinity, ease: 'easeInOut' }
                    : { duration: 0.15 }
                }
                onClick={() => handleNumberClick(num)}
                className={`relative flex flex-col items-center justify-center p-2.5 rounded-xl border transition-all cursor-pointer ${bgStyle} ${borderStyle} min-h-[58px] sm:min-h-[64px]`}
              >
                {/* Number */}
                <span className="font-mono text-base sm:text-lg tracking-tight leading-none font-bold">
                  {num.toString().padStart(2, '0')}
                </span>

                {/* Sub-label indicators */}
                <div className="flex items-center gap-1 mt-1 text-[9px] font-mono leading-none">
                  {isFixed && (
                    <span className="flex items-center text-blue-200 bg-blue-800/80 px-1 py-0.5 rounded">
                      FIXA
                    </span>
                  )}
                  {isExcluded && (
                    <span className="flex items-center text-rose-300 bg-rose-900/80 px-1 py-0.5 rounded">
                      EXC
                    </span>
                  )}
                  {!isFixed && !isExcluded && (
                    <span
                      className={`${
                        isSelected
                          ? 'text-slate-900 font-semibold'
                          : atraso >= 3
                          ? 'text-rose-400 font-bold'
                          : 'text-slate-400'
                      }`}
                    >
                      {atraso === 0 ? 'saiu' : `${atraso} atr`}
                    </span>
                  )}
                </div>

                {/* Badges for cycle priority or AI score */}
                {cyclePendingNumbers.includes(num) && (
                  <span
                    className="absolute -top-1.5 -right-1.5 bg-amber-500 text-slate-950 font-black text-[9px] px-1 rounded-full shadow"
                    title="Pendente para fechar o Ciclo!"
                  >
                    CICLO
                  </span>
                )}
                {visualMode === 'calor_ia' && (
                  <span className="absolute bottom-0.5 right-1 text-[8px] text-emerald-400 font-mono">
                    {Math.round(scoreIA)}%
                  </span>
                )}
                {visualMode === 'curva_abc' && (
                  <span
                    className={`absolute -top-1.5 -right-1.5 font-black text-[9px] px-1 rounded-full shadow ${
                      curvaAbcSummary.classeANumeros.includes(num)
                        ? 'bg-amber-400 text-slate-950 font-black'
                        : curvaAbcSummary.classeBNumeros.includes(num)
                        ? 'bg-cyan-500 text-slate-950 font-bold'
                        : 'bg-purple-500 text-white font-bold'
                    }`}
                  >
                    {curvaAbcSummary.classeANumeros.includes(num)
                      ? 'A'
                      : curvaAbcSummary.classeBNumeros.includes(num)
                      ? 'B'
                      : 'C'}
                  </span>
                )}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Preset Action Buttons */}
      <div className="pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleSelectClasseA}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-sm cursor-pointer ${
              activeStrategy?.includes('Classe A')
                ? 'bg-amber-500 text-slate-950 border border-amber-400 ring-2 ring-amber-400/50 shadow-amber-500/30 font-black'
                : 'bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300'
            }`}
          >
            <Award className="w-3.5 h-3.5 text-amber-400" />
            <span>Classe A (Curva ABC 80%)</span>
          </button>
          <button
            type="button"
            onClick={handleSelectDocumentStrategy}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-sm cursor-pointer ${
              activeStrategy?.includes('Clássico') || activeStrategy?.includes('Documento')
                ? 'bg-emerald-500 text-slate-950 border border-emerald-400 ring-2 ring-emerald-400/50 shadow-emerald-500/30'
                : 'bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/60 text-emerald-300'
            }`}
          >
            <Zap className="w-3.5 h-3.5 fill-current" />
            <span>⚡ Fechamento Clássico (9 Repetidas + 9 Ausentes)</span>
          </button>
          <button
            type="button"
            onClick={handleSelectTop18AI}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
              activeStrategy?.includes('Top')
                ? 'bg-emerald-500 text-slate-950 font-bold border border-emerald-400 ring-2 ring-emerald-400/50 shadow-emerald-500/30'
                : 'bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>Top 18 IA</span>
          </button>
          <button
            type="button"
            onClick={handleSelectCycleClosure}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
              activeStrategy?.includes('Fechar Ciclo')
                ? 'bg-amber-400 text-slate-950 font-bold border border-amber-300 ring-2 ring-amber-300/50 shadow-amber-400/30'
                : 'bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300'
            }`}
          >
            <span>Fechar Ciclo (2, 7, 10)</span>
          </button>
          <button
            type="button"
            onClick={handleSelectEquilibrio}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
              activeStrategy?.includes('Equilíbrio Canônico')
                ? 'bg-emerald-500 text-slate-950 font-bold border border-emerald-400 ring-2 ring-emerald-400/50 shadow-emerald-500/30'
                : 'bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200'
            }`}
          >
            <span>Equilíbrio Canônico</span>
          </button>
          <button
            type="button"
            onClick={() => setShowRollingModal((prev) => !prev)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-sm cursor-pointer ${
              showRollingModal
                ? 'bg-amber-400 text-slate-950 font-black border border-amber-300 ring-2 ring-amber-300/50 shadow-amber-400/40'
                : 'bg-gradient-to-r from-amber-500/20 via-yellow-500/20 to-amber-500/10 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300'
            }`}
          >
            <Play className="w-3.5 h-3.5 fill-current text-amber-400" />
            <span>🎲 Sorteio Rolling Numbers</span>
          </button>
        </div>

        <button
          onClick={onClear}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-rose-400 border border-slate-800 text-xs transition cursor-pointer"
        >
          <RefreshCw className="w-3 h-3" />
          <span>Limpar</span>
        </button>
      </div>
    </div>
  );
};
