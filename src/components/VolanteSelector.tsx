import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
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
import { Sparkles, Check, Pin, Ban, Layers, Eye, RefreshCw, Zap, Award, Play, X, CheckCircle2 } from 'lucide-react';
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
  const shouldReduceMotion = useReducedMotion();

  const recommended18 = React.useMemo(() => {
    const pool = buildOptimal18Pool(latestDraw, statsList, cyclePendingNumbers);
    return [...pool.dezenas].slice(0, 18).sort((a, b) => a - b);
  }, [latestDraw, statsList, cyclePendingNumbers]);
  const recommended18Key = recommended18.join(',');

  const [introRollBalls, setIntroRollBalls] = useState<
    { slot: number; currentDisplay: number; target: number; isLocked: boolean }[]
  >(() =>
    recommended18.map((num, idx) => ({
      slot: idx,
      currentDisplay: num,
      target: num,
      isLocked: Boolean(shouldReduceMotion),
    }))
  );
  const [isIntroRolling, setIsIntroRolling] = useState<boolean>(false);
  const [introRollNonce, setIntroRollNonce] = useState<number>(0);

  const startIntroRollingSequence = useCallback(
    (targets: number[]) => {
      if (shouldReduceMotion || targets.length === 0) {
        setIsIntroRolling(false);
        setIntroRollBalls(
          targets.map((num, idx) => ({
            slot: idx,
            currentDisplay: num,
            target: num,
            isLocked: true,
          }))
        );
        return () => {};
      }

      setIsIntroRolling(true);
      setIntroRollBalls(
        targets.map((num, idx) => ({
          slot: idx,
          currentDisplay: ((num + idx * 3) % 25) + 1,
          target: num,
          isLocked: false,
        }))
      );

      const intervalId = window.setInterval(() => {
        setIntroRollBalls((prev) =>
          prev.map((ball) =>
            ball.isLocked
              ? ball
              : { ...ball, currentDisplay: Math.floor(Math.random() * 25) + 1 }
          )
        );
      }, 65);

      const timeoutIds: number[] = [];
      targets.forEach((targetNum, idx) => {
        const lockDelay = 160 + Math.round((idx / targets.length) * 840);
        const tid = window.setTimeout(() => {
          setIntroRollBalls((prev) =>
            prev.map((ball, bIdx) =>
              bIdx === idx
                ? { ...ball, currentDisplay: targetNum, target: targetNum, isLocked: true }
                : ball
            )
          );
          if (idx === targets.length - 1) {
            window.clearInterval(intervalId);
            setIsIntroRolling(false);
          }
        }, lockDelay);
        timeoutIds.push(tid);
      });

      return () => {
        window.clearInterval(intervalId);
        timeoutIds.forEach((id) => window.clearTimeout(id));
      };
    },
    [shouldReduceMotion]
  );

  useEffect(() => {
    const targets = recommended18Key
      .split(',')
      .map(Number)
      .filter((n) => Number.isFinite(n) && n >= 1 && n <= 25);
    return startIntroRollingSequence(targets);
  }, [recommended18Key, introRollNonce, startIntroRollingSequence]);

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

  const [lastClickedNum, setLastClickedNum] = useState<number | null>(null);
  const [lastActionType, setLastActionType] = useState<'selected' | 'unselected' | 'fixed' | 'unfixed' | 'excluded' | 'unexcluded' | null>(null);

  // Real-time metrics computed for the selected numbers
  const volanteStats = React.useMemo(() => {
    const count = selectedNumbers.length;
    const remaining = targetCount - count;
    const percent = Math.min(100, Math.round((count / targetCount) * 100));
    const pares = selectedNumbers.filter((n) => n % 2 === 0).length;
    const impares = count - pares;
    const molduraCount = selectedNumbers.filter((n) => MOLDURA.includes(n)).length;
    const mioloCount = count - molduraCount;
    const primosCount = selectedNumbers.filter((n) => PRIMOS.includes(n)).length;
    const fibCount = selectedNumbers.filter((n) => FIBONACCI.includes(n)).length;
    const soma = selectedNumbers.reduce((acc, curr) => acc + curr, 0);

    return {
      count,
      remaining,
      percent,
      pares,
      impares,
      molduraCount,
      mioloCount,
      primosCount,
      fibCount,
      soma,
      isExact: count === targetCount,
      isOver: count > targetCount,
      isUnder: count < targetCount,
    };
  }, [selectedNumbers, targetCount]);

  const handleNumberClick = (n: number) => {
    setLastClickedNum(n);
    soundService.playTick();

    if (clickMode === 'fix') {
      const willUnfix = fixedNumbers.includes(n);
      setLastActionType(willUnfix ? 'unfixed' : 'fixed');
      onSetFixed(n);
    } else if (clickMode === 'exclude') {
      const willUnexclude = excludedNumbers.includes(n);
      setLastActionType(willUnexclude ? 'unexcluded' : 'excluded');
      onSetExcluded(n);
    } else {
      const willUnselect = selectedNumbers.includes(n);
      setLastActionType(willUnselect ? 'unselected' : 'selected');
      onToggleNumber(n);
    }

    setTimeout(() => {
      setLastClickedNum((current) => (current === n ? null : current));
    }, 450);
  };

  const [isRollingVolante, setIsRollingVolante] = useState<boolean>(false);
  const [isStabilizing, setIsStabilizing] = useState<boolean>(false);
  const [stabilizedNumbers, setStabilizedNumbers] = useState<number[]>([]);
  const [rollingDrumBalls, setRollingDrumBalls] = useState<
    { slot: number; currentDisplay: number; target: number; isLocked: boolean }[]
  >([]);
  const [rollingGridDisplays, setRollingGridDisplays] = useState<{ [num: number]: number }>({});
  const [rollProgress, setRollProgress] = useState<number>(0);

  const runRollingAnimation = (targetNumbers: number[], strategyLabel: string) => {
    setIsRollingVolante(true);
    setIsStabilizing(false);
    setStabilizedNumbers([]);
    setRollProgress(0);

    const total = targetNumbers.length;
    // Initial ball drum slots for rolling display
    const initialBalls = targetNumbers.map((target, idx) => ({
      slot: idx,
      currentDisplay: Math.floor(Math.random() * 25) + 1,
      target,
      isLocked: false,
    }));
    setRollingDrumBalls(initialBalls);
    soundService.playTick();

    // Fast interval for rotating random numbers during draw simulation
    const tumbleInterval = setInterval(() => {
      setRollingDrumBalls((prev) =>
        prev.map((b) =>
          b.isLocked
            ? b
            : { ...b, currentDisplay: Math.floor(Math.random() * 25) + 1 }
        )
      );

      const gridMap: { [n: number]: number } = {};
      for (let n = 1; n <= 25; n++) {
        gridMap[n] = Math.floor(Math.random() * 25) + 1;
      }
      setRollingGridDisplays(gridMap);
      soundService.playTick();
    }, 60);

    // Staggered settling sequence: each ball locks into place with acoustic feedback
    targetNumbers.forEach((targetNum, index) => {
      const lockDelay = 220 + Math.round((index / total) * 780);

      setTimeout(() => {
        setRollingDrumBalls((prev) =>
          prev.map((b, idx) => (idx === index ? { ...b, currentDisplay: targetNum, isLocked: true } : b))
        );
        soundService.playTickCountdown();
        setRollProgress(Math.round(((index + 1) / total) * 100));

        // When the final ball locks:
        if (index === total - 1) {
          clearInterval(tumbleInterval);
          setRollingGridDisplays({});
          setIsRollingVolante(false);
          onSelectSet(targetNumbers);
          onStrategySelect?.(strategyLabel);
          soundService.playSuccess();

          // Transição de 'estabilização' visual: as dezenas sorteadas brilham intensamente por 500ms usando Framer Motion
          setStabilizedNumbers(targetNumbers);
          setIsStabilizing(true);
          setTimeout(() => {
            setIsStabilizing(false);
            setStabilizedNumbers([]);
          }, 500);
        }
      }, lockDelay);
    });
  };

  // 1. Auto-completar: preserva dezenas atuais e preenche até targetCount com rolling numbers
  const handleAutoCompletar = () => {
    let current = [...selectedNumbers];
    if (fixedNumbers.length > 0) {
      current = Array.from(new Set([...fixedNumbers, ...current]));
    }
    current = current.filter((n) => !excludedNumbers.includes(n));

    if (current.length >= targetCount) {
      runRollingAnimation(current.slice(0, targetCount).sort((a, b) => a - b), 'Auto Completar');
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
    runRollingAnimation(fullSet, 'Auto Completar');
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
            <span>Auto Completar</span>
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

      {/* Real-Time Interactive Counter HUD & Visual Feedback Bar */}
      <div className="my-3 p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 shadow-inner">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {/* Animated Target Gauge */}
            <div className="relative flex items-center justify-center shrink-0">
              <motion.div
                key={volanteStats.count}
                initial={{ scale: 0.88, opacity: 0.8 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                className={`px-3 py-1.5 rounded-xl font-mono text-sm sm:text-base font-black flex items-baseline gap-1 shadow-inner ${
                  volanteStats.isExact
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-emerald-500/20 ring-1 ring-emerald-400/40'
                    : volanteStats.isOver
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-amber-500/20 ring-1 ring-amber-400/30'
                    : 'bg-slate-800 text-slate-200 border border-slate-700'
                }`}
              >
                <span className="text-xl sm:text-2xl tabular-nums leading-none">
                  {volanteStats.count.toString().padStart(2, '0')}
                </span>
                <span className="text-xs text-slate-400 font-semibold">/ {targetCount}</span>
              </motion.div>
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-white">Status da Seleção:</span>
                {volanteStats.isExact && (
                  <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    Matriz Completa ({targetCount} dezenas)
                  </span>
                )}
                {volanteStats.isUnder && (
                  <span className="text-[11px] font-medium text-amber-300 flex items-center gap-1 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                    Faltam {volanteStats.remaining} {volanteStats.remaining === 1 ? 'dezena' : 'dezenas'}
                  </span>
                )}
                {volanteStats.isOver && (
                  <span className="text-[11px] font-medium text-rose-300 flex items-center gap-1 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
                    {volanteStats.count - targetCount} acima do limite ({targetCount})
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {volanteStats.isExact
                  ? 'Matriz matemática pronta para alimentar o motor de fechamento.'
                  : `Selecione exatamente ${targetCount} dezenas para balanceamento estatístico ideal.`}
              </p>
            </div>
          </div>

          {/* Quick Real-Time Metrics Chips */}
          <div className="flex items-center gap-1.5 flex-wrap text-[11px] font-mono">
            <span className="px-2 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300" title="Paridade (Pares / Ímpares)">
              <span className="text-slate-500">P/I:</span> <strong className="text-white">{volanteStats.pares}P</strong> / <strong className="text-white">{volanteStats.impares}I</strong>
            </span>
            <span className="px-2 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300" title="Distribuição Moldura e Miolo">
              <span className="text-slate-500">M/C:</span> <strong className="text-amber-300">{volanteStats.molduraCount}M</strong> / <strong className="text-cyan-300">{volanteStats.mioloCount}C</strong>
            </span>
            <span className="px-2 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300" title="Soma das dezenas selecionadas (Faixa ideal: 185 a 215)">
              <span className="text-slate-500">Soma:</span>{' '}
              <strong className={volanteStats.soma >= 185 && volanteStats.soma <= 215 ? 'text-emerald-400 font-bold' : 'text-amber-300'}>
                {volanteStats.soma}
              </strong>
            </span>
            {fixedNumbers.length > 0 && (
              <span className="px-2 py-1 rounded-lg bg-blue-950/60 border border-blue-800 text-blue-300 font-semibold">
                Fixas: {fixedNumbers.length}
              </span>
            )}
            {excludedNumbers.length > 0 && (
              <span className="px-2 py-1 rounded-lg bg-rose-950/60 border border-rose-800 text-rose-300 font-semibold">
                Excl: {excludedNumbers.length}
              </span>
            )}
          </div>
        </div>

        {/* Progress Bar with Fluid Animation */}
        <div className="w-full bg-slate-800/80 rounded-full h-1.5 mt-2.5 overflow-hidden">
          <motion.div
            className={`h-full ${
              volanteStats.isExact
                ? 'bg-gradient-to-r from-emerald-400 to-teal-400 shadow-[0_0_8px_rgba(16,185,129,0.6)]'
                : volanteStats.isOver
                ? 'bg-gradient-to-r from-amber-400 to-rose-400'
                : 'bg-gradient-to-r from-emerald-500/70 to-amber-400'
            }`}
            initial={{ width: 0 }}
            animate={{ width: `${volanteStats.percent}%` }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          />
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

      {/* Globo Sorteador com Rolling Numbers Animado em Tempo Real (Framer Motion) */}
      <AnimatePresence>
        {isRollingVolante && (
          <motion.div
            initial={{ opacity: 0, height: 0, scale: 0.95 }}
            animate={{ opacity: 1, height: 'auto', scale: 1 }}
            exit={{ opacity: 0, height: 0, scale: 0.95 }}
            transition={{ duration: 0.25 }}
            className="my-3.5 p-3.5 rounded-2xl bg-gradient-to-r from-amber-950/70 via-slate-950 to-emerald-950/70 border-2 border-amber-400/80 shadow-[0_0_30px_rgba(245,158,11,0.3)] overflow-hidden relative"
          >
            <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-amber-500/30 text-xs">
              <span className="font-black text-amber-300 flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                <Sparkles className="w-3.5 h-3.5 animate-spin text-amber-400" />
                <span>Sorteio Mecânico · Rolling Numbers ({rollProgress}%)</span>
              </span>
              <span className="text-[10px] font-mono font-black px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 shadow-md animate-pulse">
                SORTEANDO AO VIVO
              </span>
            </div>

            {/* Rolling drum balls */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none justify-center flex-wrap">
              {rollingDrumBalls.map((ball) => (
                <motion.div
                  key={`drum-ball-${ball.slot}`}
                  animate={
                    ball.isLocked
                      ? {
                          scale: [1.25, 1],
                          backgroundColor: '#f59e0b',
                          color: '#020617',
                        }
                      : {
                          scale: [0.95, 1.1, 0.95],
                          backgroundColor: '#020617',
                          color: '#fbbf24',
                        }
                  }
                  transition={{ duration: 0.15 }}
                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center font-mono font-black text-xs sm:text-sm border transition-all ${
                    ball.isLocked
                      ? 'border-amber-300 shadow-md shadow-amber-500/50 ring-1 ring-amber-300'
                      : 'border-amber-500/50 text-amber-300 shadow-sm'
                  }`}
                >
                  <AnimatePresence mode="popLayout">
                    <motion.span
                      key={`roll-ball-${ball.slot}-${ball.currentDisplay}`}
                      initial={{ y: ball.isLocked ? -10 : -16, opacity: 0.3 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: 16, opacity: 0.3 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                    >
                      {ball.currentDisplay.toString().padStart(2, '0')}
                    </motion.span>
                  </AnimatePresence>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sorteio Rolling Numbers Manual (Framer Motion) */}
      {showRollingModal && (
        <div className="my-4">
          <RollingNumbersSorteio
            finalNumbers={numbersToSpin}
            title="Sorteio das Dezenas do Volante"
            subtitle={`Girando ${numbersToSpin.length} dezenas selecionadas/recomendadas com animação mecânica`}
            cycleKeyNumbers={cyclePendingNumbers}
            scoresMap={scoresMap}
            autoStart={true}
            onClose={() => setShowRollingModal(false)}
            onApplyNumbers={(nums) => {
              onSelectSet(nums);
              setShowRollingModal(false);
              onStrategySelect?.(`Sorteio Rolling Numbers (${nums.length} Dezenas)`);
              setStabilizedNumbers(nums);
              setIsStabilizing(true);
              soundService.playSuccess();
              setTimeout(() => {
                setIsStabilizing(false);
                setStabilizedNumbers([]);
              }, 500);
            }}
          />
        </div>
      )}

      {/* Banner de Transição de Estabilização Visual (500ms Glow) */}
      <AnimatePresence>
        {isStabilizing && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="my-3 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500/25 via-emerald-500/20 to-amber-500/25 border border-amber-400 text-amber-200 text-xs font-bold flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(245,158,11,0.45)]"
          >
            <Sparkles className="w-4 h-4 text-amber-300 animate-spin" />
            <span>Resultado do Sorteio Estabilizado • Dezenas Consolidadas!</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tambor Mecânico Automático (18 Dezenas Recomendadas IA • Rolling Numbers ao Carregar) */}
      <div className="mt-3 p-3 rounded-xl bg-slate-950/75 border border-slate-800/90">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-300 uppercase tracking-wider">
              <Sparkles className={`w-3.5 h-3.5 text-amber-400 ${isIntroRolling ? 'animate-spin' : ''}`} />
              18 Recomendadas IA • Rolling Numbers
            </span>
            <span
              className={`text-[10px] font-mono px-2 py-0.5 rounded-md border ${
                isIntroRolling
                  ? 'bg-amber-500/15 text-amber-300 border-amber-500/30 animate-pulse'
                  : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
              }`}
            >
              {isIntroRolling ? 'GIRANDO TAMBOR...' : '18 TRAVADAS'}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setIntroRollNonce((prev) => prev + 1)}
              disabled={isIntroRolling}
              className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-amber-300 border border-slate-700 text-[11px] font-semibold transition cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-50"
              title="Reexecutar animação mecânica Rolling Numbers das 18 dezenas recomendadas"
            >
              Rever Rolling
            </button>
            <button
              type="button"
              onClick={() => {
                onSelectSet(recommended18.slice(0, targetCount));
                onStrategySelect?.('Rolling Numbers · 18 Recomendadas IA');
                setStabilizedNumbers(recommended18.slice(0, targetCount));
                setIsStabilizing(true);
                soundService.playSuccess();
                window.setTimeout(() => {
                  setIsStabilizing(false);
                  setStabilizedNumbers([]);
                }, 500);
              }}
              className="px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold transition cursor-pointer whitespace-nowrap shrink-0"
              title="Aplicar as 18 dezenas recomendadas diretamente no volante 5×5"
            >
              Aplicar 18 no Volante
            </button>
          </div>
        </div>

        <div className="grid grid-cols-6 sm:grid-cols-9 gap-1.5">
          {introRollBalls.map((ball) => {
            const isCycleKey = cyclePendingNumbers.includes(ball.target);
            return (
              <motion.div
                key={`intro-roll-${ball.slot}`}
                animate={
                  ball.isLocked
                    ? { scale: shouldReduceMotion ? 1 : [1.14, 1] }
                    : { scale: [0.94, 1.06, 0.94] }
                }
                transition={{ duration: 0.18 }}
                className={`h-7 rounded-lg flex items-center justify-center font-mono tabular-nums text-xs font-black border overflow-hidden ${
                  ball.isLocked
                    ? isCycleKey
                      ? 'bg-amber-500/20 text-amber-300 border-amber-400/60'
                      : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
                    : 'bg-slate-900 text-amber-300 border-amber-500/40'
                }`}
                title={
                  ball.isLocked
                    ? `Dezena ${ball.target.toString().padStart(2, '0')} recomendada pela IA`
                    : 'Sorteando no tambor...'
                }
              >
                <AnimatePresence mode="popLayout">
                  <motion.span
                    key={`intro-val-${ball.slot}-${ball.currentDisplay}`}
                    initial={shouldReduceMotion ? false : { y: -12, opacity: 0.35 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={shouldReduceMotion ? undefined : { y: 12, opacity: 0.35 }}
                    transition={{ type: 'spring', stiffness: 520, damping: 24 }}
                  >
                    {ball.currentDisplay.toString().padStart(2, '0')}
                  </motion.span>
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </div>

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

            const isRollingCell = isRollingVolante && rollingGridDisplays[num] !== undefined;
            const isStabilizingThis = isStabilizing && stabilizedNumbers.includes(num);

            return (
              <motion.button
                key={num}
                type="button"
                whileHover={{ scale: 1.06 }}
                whileTap={{ scale: 0.88 }}
                animate={
                  isRollingCell
                    ? {
                        scale: [1, 1.08, 0.94, 1],
                        borderColor: ['#334155', '#f59e0b', '#10b981', '#334155'],
                      }
                    : isStabilizingThis
                    ? {
                        scale: [1, 1.28, 1.05],
                        boxShadow: [
                          '0 0 0px rgba(251, 191, 36, 0)',
                          '0 0 35px rgba(251, 191, 36, 1), 0 0 60px rgba(16, 185, 129, 0.9), inset 0 0 15px rgba(255, 255, 255, 0.95)',
                          '0 0 15px rgba(16, 185, 129, 0.5)',
                        ],
                        filter: ['brightness(1)', 'brightness(2.2)', 'brightness(1.15)'],
                        borderColor: ['#10b981', '#fde047', '#34d399'],
                      }
                    : { scale: 1, rotate: 0 }
                }
                transition={
                  isStabilizingThis
                    ? { duration: 0.5, ease: 'easeOut', times: [0, 0.5, 1] }
                    : isRollingCell
                    ? { duration: 0.22, repeat: Infinity, ease: 'easeInOut' }
                    : { type: 'spring', stiffness: 500, damping: 25 }
                }
                onClick={() => handleNumberClick(num)}
                className={`relative flex flex-col items-center justify-center p-2.5 rounded-xl border transition-colors duration-200 ease-out cursor-pointer select-none overflow-visible ${bgStyle} ${borderStyle} min-h-[58px] sm:min-h-[64px] ${
                  isStabilizingThis ? 'z-30 ring-2 ring-amber-300' : ''
                }`}
              >
                {/* Tactile expanding wave feedback on click */}
                {lastClickedNum === num && (
                  <motion.span
                    initial={{ scale: 0.75, opacity: 0.9 }}
                    animate={{ scale: 1.5, opacity: 0 }}
                    transition={{ duration: 0.45, ease: 'easeOut' }}
                    className={`absolute inset-0 rounded-xl pointer-events-none ring-2 ${
                      clickMode === 'fix'
                        ? 'ring-blue-400 bg-blue-400/25'
                        : clickMode === 'exclude'
                        ? 'ring-rose-400 bg-rose-400/25'
                        : isSelected
                        ? 'ring-emerald-400 bg-emerald-400/30'
                        : 'ring-slate-300 bg-slate-300/15'
                    }`}
                  />
                )}

                {/* Micro-badge icon for state */}
                {isSelected && !isFixed && !isExcluded && (
                  <span className="absolute top-1 left-1 w-3 h-3 rounded-full bg-slate-950/40 flex items-center justify-center pointer-events-none">
                    <Check className="w-2 h-2 text-slate-950 stroke-[3]" />
                  </span>
                )}
                {isFixed && (
                  <span className="absolute top-1 left-1 w-3 h-3 rounded-full bg-white/20 flex items-center justify-center pointer-events-none">
                    <Pin className="w-2 h-2 text-white fill-current" />
                  </span>
                )}
                {isExcluded && (
                  <span className="absolute top-1 left-1 w-3 h-3 rounded-full bg-rose-500/20 flex items-center justify-center pointer-events-none">
                    <Ban className="w-2 h-2 text-rose-300" />
                  </span>
                )}

                {/* Intense stabilization flash aura */}
                {isStabilizingThis && (
                  <motion.span
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: [0, 1, 0], scale: [0.9, 1.45, 1.7] }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                    className="absolute inset-0 rounded-xl bg-gradient-to-r from-amber-300/80 via-yellow-200/90 to-emerald-300/80 blur-xs pointer-events-none z-20"
                  />
                )}
                {/* Rolling Number with Framer Motion */}
                <div className="h-6 sm:h-7 w-full flex items-center justify-center overflow-hidden relative">
                  <AnimatePresence mode="popLayout">
                    {isRollingCell ? (
                      <motion.span
                        key={`rolling-${num}-${rollingGridDisplays[num]}`}
                        initial={{ y: -16, opacity: 0.3 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 16, opacity: 0.3 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                        className="font-mono text-base sm:text-lg tracking-tight leading-none font-black text-amber-300"
                      >
                        {rollingGridDisplays[num].toString().padStart(2, '0')}
                      </motion.span>
                    ) : (
                      <motion.span
                        key={`static-${num}`}
                        initial={isStabilizingThis ? { scale: 0.85 } : false}
                        animate={isStabilizingThis ? { scale: [1, 1.3, 1] } : { scale: 1 }}
                        transition={{ duration: 0.5, ease: 'easeOut' }}
                        className="font-mono text-base sm:text-lg tracking-tight leading-none font-bold"
                      >
                        {num.toString().padStart(2, '0')}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </div>

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
