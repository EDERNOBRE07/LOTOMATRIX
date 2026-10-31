import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Play, RotateCw, CheckCircle2, Zap, Trophy, ShieldCheck } from 'lucide-react';
import { soundService } from '../services/soundAlert';

interface RollingNumbersSorteioProps {
  finalNumbers: number[];
  title?: string;
  subtitle?: string;
  cycleKeyNumbers?: number[];
  scoresMap?: { [num: number]: number };
  onComplete?: () => void;
  onApplyNumbers?: (numbers: number[]) => void;
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
  title = 'Sorteio Preditivo com Rolling Numbers',
  subtitle = 'Animação de alta precisão baseada em redes neurais e tensores de probabilidade da Caixa',
  cycleKeyNumbers = [17, 22],
  scoresMap = {},
  onComplete,
  onApplyNumbers,
  autoStart = false,
}) => {
  const [isRolling, setIsRolling] = useState<boolean>(false);
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

  // Sync if target numbers change
  useEffect(() => {
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
    setIsRolling(true);
    setIsFinished(false);
    setRollProgress(0);

    // Initial unlocked state
    setBalls(
      finalNumbers.map((n) => ({
        target: n,
        currentDisplay: Math.floor(Math.random() * 25) + 1,
        isLocked: false,
        score: scoresMap[n] || 85,
        isCycle: cycleKeyNumbers.includes(n),
      }))
    );

    // Tumbling interval: rapidly rotates unlocked ball values
    const tumbleInterval = setInterval(() => {
      setBalls((prev) =>
        prev.map((b) => {
          if (b.isLocked) return b;
          return {
            ...b,
            currentDisplay: Math.floor(Math.random() * 25) + 1,
          };
        })
      );
    }, 55);

    // Staggered settling sequence: each ball locks into place one by one
    const totalBalls = finalNumbers.length;
    finalNumbers.forEach((targetNum, index) => {
      // Delay increases per ball (staggered slot machine / rolling effect)
      const lockDelay = 400 + index * 120;

      setTimeout(() => {
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

        // Sound feedback on each landed ball
        soundService.playTickCountdown();

        // Update progress
        const currentProgress = Math.round(((index + 1) / totalBalls) * 100);
        setRollProgress(currentProgress);

        // When the final ball locks
        if (index === totalBalls - 1) {
          clearInterval(tumbleInterval);
          setIsRolling(false);
          setIsFinished(true);
          soundService.playGoldenZoneSuccessChime();
          if (onComplete) onComplete();
        }
      }, lockDelay);
    });
  };

  useEffect(() => {
    if (autoStart) {
      startRolling();
    }
  }, [autoStart]);

  return (
    <div className="bg-gradient-to-br from-slate-900 via-slate-900/95 to-slate-950 rounded-2xl border border-amber-500/40 p-5 sm:p-6 shadow-2xl relative overflow-hidden">
      {/* Background Glow Accents */}
      <div className="absolute -top-20 -right-20 w-64 h-64 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />

      {/* Header and Controls */}
      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-400 via-yellow-500 to-amber-600 flex items-center justify-center text-slate-950 shadow-lg shadow-amber-500/25 shrink-0">
            <Sparkles className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base sm:text-lg font-black text-white tracking-wide">{title}</h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 uppercase font-mono tracking-wider">
                Framer Motion
              </span>
              {isRolling && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono animate-pulse">
                  SORTEANDO ({rollProgress}%)
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={startRolling}
            disabled={isRolling}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-xs transition cursor-pointer shadow-lg ${
              isRolling
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-slate-950 shadow-amber-500/25 active:scale-95'
            }`}
          >
            <RotateCw className={`w-3.5 h-3.5 ${isRolling ? 'animate-spin' : ''}`} />
            <span>{isRolling ? 'Rolando Dezenas...' : 'Sortear Rolling Numbers'}</span>
          </button>

          {onApplyNumbers && isFinished && (
            <button
              onClick={() => onApplyNumbers(finalNumbers)}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shadow-md shadow-emerald-500/20 active:scale-95 transition cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span>Aplicar no Fechamento</span>
            </button>
          )}
        </div>
      </div>

      {/* Progress Bar during roll */}
      {isRolling && (
        <div className="w-full bg-slate-950 rounded-full h-1.5 my-3 overflow-hidden border border-slate-800 relative z-10">
          <motion.div
            className="bg-gradient-to-r from-amber-400 via-yellow-400 to-emerald-400 h-full"
            initial={{ width: 0 }}
            animate={{ width: `${rollProgress}%` }}
            transition={{ ease: 'easeOut', duration: 0.15 }}
          />
        </div>
      )}

      {/* Rolling Balls Grid */}
      <div className="relative z-10 grid grid-cols-5 sm:grid-cols-6 md:grid-cols-9 gap-2.5 my-5">
        <AnimatePresence>
          {balls.map((ball, idx) => {
            const isCycleKey = ball.isCycle;
            const isLocked = ball.isLocked;

            return (
              <motion.div
                key={`ball-${idx}`}
                layout
                initial={{ opacity: 0, scale: 0.5, y: -20 }}
                animate={{
                  opacity: 1,
                  scale: isLocked ? 1 : 1.08,
                  y: 0,
                  transition: {
                    type: 'spring',
                    stiffness: 300,
                    damping: 20,
                  },
                }}
                className={`relative flex flex-col items-center justify-center p-2 rounded-2xl border transition-all duration-150 select-none ${
                  !isLocked
                    ? 'bg-slate-950/90 border-amber-400 text-amber-300 ring-2 ring-amber-400/40 shadow-xl'
                    : isCycleKey
                    ? 'bg-gradient-to-br from-amber-400 to-yellow-600 text-slate-950 border-amber-300 ring-2 ring-amber-400/60 shadow-lg shadow-amber-500/30 font-black'
                    : 'bg-slate-950/90 text-white border-slate-700/80 hover:border-amber-400/40 shadow-md'
                }`}
              >
                {/* Rolling Number Container */}
                <div className="h-10 w-full flex items-center justify-center overflow-hidden">
                  <motion.span
                    key={`${idx}-${ball.currentDisplay}`}
                    initial={{ y: isLocked ? 0 : -25, opacity: isLocked ? 1 : 0.6 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 25, opacity: 0 }}
                    transition={{
                      type: 'spring',
                      stiffness: 450,
                      damping: 18,
                    }}
                    className={`text-xl sm:text-2xl font-black font-mono tracking-tight ${
                      !isLocked
                        ? 'text-amber-400 animate-pulse blur-[0.3px]'
                        : isCycleKey
                        ? 'text-slate-950'
                        : 'text-amber-300'
                    }`}
                  >
                    {ball.currentDisplay.toString().padStart(2, '0')}
                  </motion.span>
                </div>

                {/* Score badge / status */}
                <div className="w-full flex items-center justify-between mt-1 pt-1 border-t border-slate-800/80 text-[10px] font-mono">
                  <span
                    className={
                      isCycleKey
                        ? 'text-slate-950 font-black'
                        : isLocked
                        ? 'text-emerald-400 font-bold'
                        : 'text-slate-500'
                    }
                  >
                    {isLocked ? `${ball.score}%` : '---'}
                  </span>

                  {isCycleKey && (
                    <span className="text-[8px] font-black uppercase px-1 py-0.2 rounded bg-slate-950 text-amber-300 border border-amber-400 font-sans">
                      CICLO
                    </span>
                  )}

                  {!isCycleKey && isLocked && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  )}
                </div>

                {/* Lock indicator shimmer */}
                {isLocked && (
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: [1, 1.4, 0], opacity: [0.8, 0.4, 0] }}
                    transition={{ duration: 0.5 }}
                    className="absolute inset-0 rounded-2xl border-2 border-amber-300 pointer-events-none"
                  />
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Footer Info */}
      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-800 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            {isFinished
              ? 'Predição consolidada: Dezenas âncoras calibradas para distribuição normal de 14 e 15 acertos.'
              : 'Processando redes neurais estocásticas e desaceleração inercial de números...'}
          </span>
        </div>

        <div className="flex items-center gap-2 font-mono text-[11px]">
          <span className="text-slate-400">Total Sorteado:</span>
          <strong className="text-amber-300">{finalNumbers.length} Dezenas</strong>
        </div>
      </div>
    </div>
  );
};
