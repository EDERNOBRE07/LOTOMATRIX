import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { RotateCw, Zap, ShieldCheck, ArrowUpDown, X, Disc3 } from 'lucide-react';
import { soundService } from '../services/soundAlert';

interface RollingNumbersSorteioProps {
  finalNumbers: number[];
  title?: string;
  subtitle?: string;
  cycleKeyNumbers?: number[];
  scoresMap?: { [num: number]: number };
  onComplete?: () => void;
  onApplyNumbers?: (numbers: number[]) => void;
  onClose?: () => void;
  autoStart?: boolean;
}

interface BallState {
  target: number;
  currentDisplay: number;
  isLocked: boolean;
  score: number;
  isCycle: boolean;
}

export const RollingNumbersSorteio: React.FC<RollingNumbersSorteioProps> = ({
  finalNumbers,
  title = 'Sorteio das Dezenas do Volante',
  subtitle = 'Animação mecânica de alta precisão para conferência e fixação das dezenas selecionadas',
  cycleKeyNumbers = [17, 22],
  scoresMap = {},
  onComplete,
  onApplyNumbers,
  onClose,
  autoStart = false,
}) => {
  const prefersReducedMotion = useReducedMotion();
  const [isRolling, setIsRolling] = useState<boolean>(false);
  const [sortAscending, setSortAscending] = useState<boolean>(false);
  const [balls, setBalls] = useState<BallState[]>(() =>
    finalNumbers.map((n) => ({
      target: n,
      currentDisplay: n,
      isLocked: true,
      score: scoresMap[n] || 85,
      isCycle: cycleKeyNumbers.includes(n),
    }))
  );
  const [isFinished, setIsFinished] = useState<boolean>(true);
  const [rollProgress, setRollProgress] = useState<number>(100);
  const timersRef = useRef<{ interval?: ReturnType<typeof setInterval>; timeouts: ReturnType<typeof setTimeout>[] }>({
    timeouts: [],
  });

  const clearAllTimers = () => {
    if (timersRef.current.interval) {
      clearInterval(timersRef.current.interval);
      timersRef.current.interval = undefined;
    }
    timersRef.current.timeouts.forEach((t) => clearTimeout(t));
    timersRef.current.timeouts = [];
  };

  useEffect(() => {
    return () => clearAllTimers();
  }, []);

  // Sync if target numbers change
  useEffect(() => {
    clearAllTimers();
    setIsRolling(false);
    setIsFinished(true);
    setRollProgress(100);
    setBalls(
      finalNumbers.map((n) => ({
        target: n,
        currentDisplay: n,
        isLocked: true,
        score: scoresMap[n] || 85,
        isCycle: cycleKeyNumbers.includes(n),
      }))
    );
  }, [finalNumbers, scoresMap, cycleKeyNumbers]);

  const startRolling = () => {
    if (isRolling || finalNumbers.length === 0) return;
    clearAllTimers();

    if (prefersReducedMotion) {
      setBalls(
        finalNumbers.map((n) => ({
          target: n,
          currentDisplay: n,
          isLocked: true,
          score: scoresMap[n] || 85,
          isCycle: cycleKeyNumbers.includes(n),
        }))
      );
      setIsRolling(false);
      setIsFinished(true);
      setRollProgress(100);
      soundService.playGoldenZoneSuccessChime();
      onComplete?.();
      return;
    }

    setIsRolling(true);
    setIsFinished(false);
    setRollProgress(0);

    setBalls(
      finalNumbers.map((n) => ({
        target: n,
        currentDisplay: Math.floor(Math.random() * 25) + 1,
        isLocked: false,
        score: scoresMap[n] || 85,
        isCycle: cycleKeyNumbers.includes(n),
      }))
    );

    const tumbleInterval = setInterval(() => {
      setBalls((prev) =>
        prev.map((b) => {
          if (b.isLocked) return b;
          const nextNum = ((b.currentDisplay + Math.floor(Math.random() * 7) + 1) % 25) + 1;
          return {
            ...b,
            currentDisplay: nextNum,
          };
        })
      );
    }, 65);
    timersRef.current.interval = tumbleInterval;

    const totalBalls = finalNumbers.length;
    finalNumbers.forEach((targetNum, index) => {
      const lockDelay = 360 + index * 105;

      const t = setTimeout(() => {
        setBalls((prev) =>
          prev.map((b, idx) => {
            if (idx === index) {
              return {
                ...b,
                currentDisplay: targetNum,
                isLocked: true,
              };
            }
            return b;
          })
        );

        soundService.playTickCountdown();
        setRollProgress(Math.round(((index + 1) / totalBalls) * 100));

        if (index === totalBalls - 1) {
          clearAllTimers();
          setIsRolling(false);
          setIsFinished(true);
          soundService.playGoldenZoneSuccessChime();
          onComplete?.();
        }
      }, lockDelay);

      timersRef.current.timeouts.push(t);
    });
  };

  useEffect(() => {
    if (autoStart) {
      startRolling();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart]);

  const displayedBalls = useMemo(() => {
    const indexed = balls.map((ball, idx) => ({ ...ball, originalIndex: idx }));
    if (sortAscending && isFinished) {
      return [...indexed].sort((a, b) => a.target - b.target);
    }
    return indexed;
  }, [balls, sortAscending, isFinished]);

  const summaryStats = useMemo(() => {
    const lockedCount = balls.filter((b) => b.isLocked).length;
    const cycleCount = balls.filter((b) => b.isCycle).length;
    const avgScore =
      balls.length > 0
        ? Math.round(balls.reduce((acc, b) => acc + b.score, 0) / balls.length)
        : 0;
    const sortedTargets = [...finalNumbers].sort((a, b) => a - b);
    return { lockedCount, cycleCount, avgScore, sortedTargets };
  }, [balls, finalNumbers]);

  // Balanced grid columns for 15–21 balls (18 balls -> 3 crisp rows of 6 on desktop)
  const gridColsClass =
    finalNumbers.length <= 15
      ? 'grid-cols-3 sm:grid-cols-5'
      : finalNumbers.length === 16 || finalNumbers.length === 20
      ? 'grid-cols-4 sm:grid-cols-5 lg:grid-cols-5'
      : 'grid-cols-3 sm:grid-cols-6';

  return (
    <section className="bg-slate-900/95 rounded-2xl border border-slate-800 p-5 sm:p-6 shadow-2xl space-y-5">
      {/* Header Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-start gap-3.5 min-w-0">
          <div className="w-11 h-11 rounded-xl bg-amber-500/15 border border-amber-500/35 flex items-center justify-center text-amber-400 shrink-0">
            <Disc3 className={`w-5 h-5 ${isRolling ? 'animate-spin' : ''}`} />
          </div>
          <div className="min-w-0">
            <h3 className="text-base sm:text-lg font-bold text-white tracking-tight text-balance">
              {title}
            </h3>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-400 mt-0.5">
              <span>{subtitle}</span>
              <span aria-hidden="true" className="text-slate-600">·</span>
              <span className="font-mono tabular-nums text-amber-300 font-semibold">
                {finalNumbers.length} dezenas
              </span>
              {isRolling && (
                <>
                  <span aria-hidden="true" className="text-slate-600">·</span>
                  <span className="font-mono tabular-nums text-emerald-400 font-semibold">
                    {rollProgress}% travado
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Single-line Action Controls */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setSortAscending((prev) => !prev)}
            disabled={isRolling}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-40 ${
              sortAscending
                ? 'bg-slate-800 text-amber-300 border-amber-500/40'
                : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700 hover:text-white'
            }`}
            title="Alternar entre ordem de sorteio e ordem numérica crescente"
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
            <span>{sortAscending ? 'Ordem Crescente' : 'Ordem de Sorteio'}</span>
          </button>

          <button
            type="button"
            onClick={startRolling}
            disabled={isRolling || finalNumbers.length === 0}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs transition cursor-pointer whitespace-nowrap shrink-0 ${
              isRolling
                ? 'bg-slate-800 text-slate-400 border border-slate-700 cursor-not-allowed'
                : 'bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-md shadow-amber-500/20 active:scale-95'
            }`}
          >
            <RotateCw className={`w-3.5 h-3.5 ${isRolling ? 'animate-spin' : ''}`} />
            <span>{isRolling ? 'Sorteando...' : 'Sortear Rolling Numbers'}</span>
          </button>

          {onApplyNumbers && isFinished && (
            <button
              type="button"
              onClick={() => onApplyNumbers(finalNumbers)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md shadow-emerald-500/20 active:scale-95 transition cursor-pointer whitespace-nowrap shrink-0"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Aplicar no Fechamento</span>
            </button>
          )}

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition cursor-pointer shrink-0"
              title="Fechar painel de sorteio"
              aria-label="Fechar painel de sorteio"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Mechanical Progress Track */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px] font-mono tabular-nums text-slate-400">
          <span>
            {isRolling
              ? 'Tambor mecânico em rotação sequencial'
              : 'Todas as dezenas estabilizadas'}
          </span>
          <span className="text-slate-300 font-semibold">
            {summaryStats.lockedCount}/{finalNumbers.length} travadas ({rollProgress}%)
          </span>
        </div>
        <div className="w-full h-1.5 rounded-full bg-slate-950 border border-slate-800 overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-amber-400 to-emerald-400 origin-left"
            initial={false}
            animate={{ scaleX: rollProgress / 100 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Precision Mechanical Reel Grid */}
      <div className={`grid ${gridColsClass} gap-3`}>
        {displayedBalls.map((ball) => {
          const isCycleKey = ball.isCycle;
          const isLocked = ball.isLocked;
          const formattedNum = ball.currentDisplay.toString().padStart(2, '0');
          const slotLabel = `#${(ball.originalIndex + 1).toString().padStart(2, '0')}`;

          return (
            <motion.div
              key={`reel-slot-${ball.originalIndex}`}
              layout
              initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.92 }}
              animate={{
                opacity: 1,
                scale: isLocked ? 1 : 1.03,
              }}
              transition={{
                type: 'spring',
                stiffness: 340,
                damping: 24,
              }}
              className={`relative flex flex-col justify-between rounded-xl border p-3 min-h-[88px] select-none transition-colors duration-150 ${
                !isLocked
                  ? 'bg-slate-950 border-amber-400 shadow-lg shadow-amber-500/15'
                  : isCycleKey
                  ? 'bg-amber-400 border-amber-300 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'bg-slate-950 border-slate-800 hover:border-slate-700 text-white'
              }`}
            >
              {/* Top Slot Metadata */}
              <div className="flex items-center justify-between text-[10px] font-mono tabular-nums">
                <span className={isCycleKey && isLocked ? 'text-slate-900 font-bold' : 'text-slate-500'}>
                  {slotLabel}
                </span>
                <span
                  className={
                    !isLocked
                      ? 'text-amber-400 font-semibold'
                      : isCycleKey
                      ? 'text-slate-950 font-black'
                      : 'text-emerald-400 font-semibold'
                  }
                >
                  {isLocked ? (isCycleKey ? 'Ciclo' : 'OK') : 'Girando'}
                </span>
              </div>

              {/* Recessed Drum Digit Window */}
              <div className="h-10 flex items-center justify-center overflow-hidden my-1">
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.span
                    key={`${ball.originalIndex}-${formattedNum}`}
                    initial={prefersReducedMotion ? false : { y: isLocked ? -12 : -18, opacity: 0.35 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={prefersReducedMotion ? undefined : { y: 18, opacity: 0 }}
                    transition={{
                      duration: isLocked ? 0.22 : 0.08,
                      ease: [0.16, 1, 0.3, 1],
                    }}
                    className={`font-mono tabular-nums text-2xl sm:text-[26px] font-black tracking-tight leading-none ${
                      !isLocked
                        ? 'text-amber-300'
                        : isCycleKey
                        ? 'text-slate-950'
                        : 'text-white'
                    }`}
                  >
                    {formattedNum}
                  </motion.span>
                </AnimatePresence>
              </div>

              {/* Bottom Score Telemetry */}
              <div
                className={`flex items-center justify-between pt-1.5 border-t text-[10px] font-mono tabular-nums ${
                  isCycleKey && isLocked ? 'border-amber-500/60 text-slate-900 font-bold' : 'border-slate-800/80 text-slate-400'
                }`}
              >
                <span>Score IA</span>
                <span className={isLocked ? (isCycleKey ? 'text-slate-950 font-black' : 'text-emerald-400 font-bold') : 'text-slate-500'}>
                  {isLocked ? `${ball.score}%` : '--'}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Consolidated Sequence & Telemetry Footer */}
      <div className="pt-4 border-t border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        <div className="flex items-start sm:items-center gap-2 text-slate-300 min-w-0">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5 sm:mt-0" />
          <div className="min-w-0">
            <span className="text-slate-400 mr-1.5">Sequência ordenada:</span>
            <span className="font-mono tabular-nums font-bold text-white tracking-wide break-words">
              {summaryStats.sortedTargets.map((n) => n.toString().padStart(2, '0')).join(' · ')}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 text-[11px] font-mono tabular-nums text-slate-400 shrink-0">
          <span>
            Ciclo: <strong className="text-amber-300">{summaryStats.cycleCount}</strong>
          </span>
          <span aria-hidden="true" className="text-slate-700">/</span>
          <span>
            Score médio: <strong className="text-emerald-400">{summaryStats.avgScore}%</strong>
          </span>
          <span aria-hidden="true" className="text-slate-700">/</span>
          <span>
            Total: <strong className="text-white">{finalNumbers.length} dez.</strong>
          </span>
        </div>
      </div>
    </section>
  );
};
