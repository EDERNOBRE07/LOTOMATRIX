import React, { useState, useEffect, useRef } from 'react';
import { GameTicket, LotofacilDraw } from '../types/lotofacil';
import { countMatches, VALOR_APOSTA_LOTOFACIL } from '../services/combinatorics';
import { soundService } from '../services/soundAlert';
import { RECENT_DRAWS } from '../data/lotofacilData';
import {
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Award,
  CheckCircle2,
  Trophy,
  Flame,
  Volume2,
  VolumeX,
  Gauge,
  Layers,
  Radio,
  Dices,
} from 'lucide-react';

interface AnimatedDrawCheckerProps {
  tickets: GameTicket[];
  targetDraw: LotofacilDraw;
}

export const AnimatedDrawChecker: React.FC<AnimatedDrawCheckerProps> = ({
  tickets,
  targetDraw: initialTargetDraw,
}) => {
  // Contest Selection
  const [selectedConcursoId, setSelectedConcursoId] = useState<string>('current');
  const [activeDraw, setActiveDraw] = useState<LotofacilDraw>(initialTargetDraw);

  // Sound & Speed controls
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [speedMs, setSpeedMs] = useState<number>(750); // 400 (turbo), 750 (normal), 1300 (solene)

  // Animation lifecycle
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [revealedCount, setRevealedCount] = useState<number>(0);
  const [currentRollingNum, setCurrentRollingNum] = useState<number | null>(null);
  const [selectedTicketIndex, setSelectedTicketIndex] = useState<number>(0);
  const [celebrationMessage, setCelebrationMessage] = useState<string | null>(null);

  const rollingIntervalRef = useRef<any>(null);
  const stepTimeoutRef = useRef<any>(null);

  // Update active draw when selector changes
  useEffect(() => {
    if (selectedConcursoId === 'current') {
      setActiveDraw(initialTargetDraw);
    } else if (selectedConcursoId.startsWith('recent_')) {
      const concNum = parseInt(selectedConcursoId.replace('recent_', ''), 10);
      const found = RECENT_DRAWS.find((d) => d.concurso === concNum);
      if (found) setActiveDraw(found);
    } else if (selectedConcursoId === 'random') {
      // Generate synthetic random draw
      const pool = Array.from({ length: 25 }, (_, i) => i + 1);
      const shuffled = [...pool].sort(() => Math.random() - 0.5);
      const drawn = shuffled.slice(0, 15).sort((a, b) => a - b);
      setActiveDraw({
        concurso: 9999,
        data: 'Sorteio Virtual Instantâneo',
        dezenas: drawn,
      });
    }
    // Reset animation on draw switch
    handleReset();
  }, [selectedConcursoId, initialTargetDraw]);

  const drawnNumbers = activeDraw.dezenas;
  const currentRevealedBalls = drawnNumbers.slice(0, revealedCount);
  const activeTicket = tickets[selectedTicketIndex] || tickets[0];
  const currentMatches = activeTicket
    ? activeTicket.dezenas.filter((n) => currentRevealedBalls.includes(n)).length
    : 0;

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (rollingIntervalRef.current) clearInterval(rollingIntervalRef.current);
      if (stepTimeoutRef.current) clearTimeout(stepTimeoutRef.current);
    };
  }, []);

  // Main step-by-step drawing machine
  useEffect(() => {
    if (!isPlaying || isPaused || countdown !== null) return;

    if (revealedCount >= 15) {
      // Completed 15 balls! Trigger celebration fanfare
      setIsPlaying(false);
      setCurrentRollingNum(null);

      // Check max hits across all user tickets
      let maxHits = 0;
      let topTicketIdx = 1;
      tickets.forEach((t, i) => {
        const h = countMatches(t.dezenas, drawnNumbers);
        if (h > maxHits) {
          maxHits = h;
          topTicketIdx = t.index || i + 1;
        }
      });

      if (soundEnabled) {
        if (maxHits >= 15) {
          soundService.play15PontosJackpotSound();
        } else if (maxHits >= 14) {
          soundService.play14PontosCelebrationSound();
        } else if (maxHits >= 11) {
          soundService.playGoldenZoneSuccessChime();
        }
      }

      if (maxHits >= 14) {
        setCelebrationMessage(`🎉 PARABÉNS! Jogo #${topTicketIdx} atingiu ${maxHits} PONTOS no sorteio!`);
      } else if (maxHits >= 11) {
        setCelebrationMessage(`🏆 Sorteio concluído! Melhor bilhete (#{topTicketIdx}) pontuou ${maxHits} acertos com premiação.`);
      } else {
        setCelebrationMessage(`Sorteio de 15 dezenas finalizado. Máximo alcançado: ${maxHits} acertos.`);
      }
      return;
    }

    // Step to next ball: run rapid rolling simulation for 35% of step time, then lock ball
    const targetBall = drawnNumbers[revealedCount];
    const rollDuration = Math.min(320, Math.floor(speedMs * 0.45));

    // Rapid ball roll
    rollingIntervalRef.current = setInterval(() => {
      setCurrentRollingNum(Math.floor(Math.random() * 25) + 1);
    }, 45);

    stepTimeoutRef.current = setTimeout(() => {
      clearInterval(rollingIntervalRef.current);
      setCurrentRollingNum(targetBall);

      const isMatch = activeTicket ? activeTicket.dezenas.includes(targetBall) : false;
      if (soundEnabled) {
        soundService.playBallPop(isMatch, revealedCount + 1);
      }

      setRevealedCount((prev) => prev + 1);
    }, rollDuration);

    return () => {
      if (rollingIntervalRef.current) clearInterval(rollingIntervalRef.current);
      if (stepTimeoutRef.current) clearTimeout(stepTimeoutRef.current);
    };
  }, [isPlaying, isPaused, countdown, revealedCount, speedMs, drawnNumbers, soundEnabled, activeTicket]);

  // Start with 3, 2, 1 Countdown
  const handleStartAnimation = () => {
    setRevealedCount(0);
    setCelebrationMessage(null);
    setCurrentRollingNum(null);
    setIsPaused(false);

    // Start 3-second countdown
    let count = 3;
    setCountdown(count);
    if (soundEnabled) soundService.playTickCountdown();

    const countInterval = setInterval(() => {
      count -= 1;
      if (count > 0) {
        setCountdown(count);
        if (soundEnabled) soundService.playTickCountdown();
      } else if (count === 0) {
        setCountdown(0);
        if (soundEnabled) soundService.playOpportunityAlert();
      } else {
        clearInterval(countInterval);
        setCountdown(null);
        setIsPlaying(true);
      }
    }, 700);
  };

  const handleReset = () => {
    setIsPlaying(false);
    setIsPaused(false);
    setCountdown(null);
    setRevealedCount(15);
    setCurrentRollingNum(null);
    setCelebrationMessage(null);
    if (rollingIntervalRef.current) clearInterval(rollingIntervalRef.current);
    if (stepTimeoutRef.current) clearTimeout(stepTimeoutRef.current);
  };

  const handleTogglePause = () => {
    setIsPaused((prev) => !prev);
  };

  // Best ticket hits so far
  const bestHitsSoFar = tickets.reduce((max, t) => {
    const hits = countMatches(t.dezenas, currentRevealedBalls);
    return Math.max(max, hits);
  }, 0);

  return (
    <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-5 sm:p-6 shadow-xl space-y-6">
      {/* Top Header Card */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between pb-4 border-b border-slate-800 gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-gradient-to-tr from-amber-500/20 via-orange-500/20 to-yellow-500/20 border border-amber-500/40 text-amber-300">
            <Sparkles className="w-6 h-6 animate-spin" style={{ animationDuration: '6s' }} />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2 flex-wrap">
              <span>Sorteio Virtual Oficial & Revelação Bola a Bola</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 uppercase font-bold">
                Efeito Imersivo com Som Web Audio
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Concurso #{activeDraw.concurso} ({activeDraw.data}) • Simule a emoção do sorteio com contagem regressiva e conferência sincronizada.
            </p>
          </div>
        </div>

        {/* Action Controls & Sound Toggle */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Sound Toggle */}
          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2 rounded-xl border transition cursor-pointer ${
              soundEnabled
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                : 'bg-slate-800 border-slate-750 text-slate-500'
            }`}
            title={soundEnabled ? 'Som Ativado' : 'Som Mudo'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Speed Selector */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-[11px] font-mono">
            <button
              type="button"
              onClick={() => setSpeedMs(1200)}
              className={`px-2 py-1 rounded-lg transition cursor-pointer ${
                speedMs === 1200 ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
              }`}
              title="Velocidade Solene: 1.2s por bola"
            >
              1.2s
            </button>
            <button
              type="button"
              onClick={() => setSpeedMs(750)}
              className={`px-2 py-1 rounded-lg transition cursor-pointer ${
                speedMs === 750 ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
              }`}
              title="Velocidade Padrão: 0.75s por bola"
            >
              0.7s
            </button>
            <button
              type="button"
              onClick={() => setSpeedMs(380)}
              className={`px-2 py-1 rounded-lg transition cursor-pointer ${
                speedMs === 380 ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
              }`}
              title="Velocidade Turbo: 0.38s por bola"
            >
              Turbo
            </button>
          </div>

          {/* Sorteio State Actions */}
          {!isPlaying && countdown === null ? (
            <button
              type="button"
              onClick={handleStartAnimation}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 via-orange-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-slate-950 font-black text-xs transition shadow-lg shadow-amber-500/25 active:scale-95 cursor-pointer"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Iniciar Sorteio Virtual</span>
            </button>
          ) : countdown !== null ? (
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono font-black text-xs animate-pulse">
              <span>{countdown === 0 ? 'SORTEANDO!' : `INICIANDO EM ${countdown}...`}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleTogglePause}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition cursor-pointer"
              >
                {isPaused ? <Play className="w-3.5 h-3.5 fill-current" /> : <Pause className="w-3.5 h-3.5" />}
                <span>{isPaused ? 'Continuar' : 'Pausar'}</span>
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-semibold transition cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Pular / Concluir</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Celebration Notice */}
      {celebrationMessage && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/20 via-emerald-500/20 to-teal-500/20 border border-amber-500/40 text-amber-200 text-sm font-bold flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-3">
            <Trophy className="w-6 h-6 text-amber-400 shrink-0 animate-bounce" />
            <span>{celebrationMessage}</span>
          </div>
          <button
            type="button"
            onClick={handleStartAnimation}
            className="text-xs px-3 py-1.5 rounded-lg bg-amber-400 text-slate-950 font-black hover:bg-amber-300 transition cursor-pointer whitespace-nowrap"
          >
            Sortear Novamente
          </button>
        </div>
      )}

      {/* Central Globo Virtual Cage & Countdown Display */}
      <div className="relative bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 p-6 rounded-3xl border border-slate-800 overflow-hidden shadow-2xl">
        {/* Ambient Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>

        {/* Countdown Overlay when active */}
        {countdown !== null && (
          <div className="absolute inset-0 z-20 bg-slate-950/85 backdrop-blur-sm flex flex-col items-center justify-center space-y-3">
            <span className="text-xs uppercase font-mono tracking-widest text-amber-400 font-bold">
              Preparando Globo de Extração
            </span>
            <div className="text-7xl font-mono font-black text-transparent bg-clip-text bg-gradient-to-tr from-amber-400 via-orange-400 to-yellow-200 animate-pulse">
              {countdown === 0 ? 'GO!' : countdown}
            </div>
            <p className="text-xs text-slate-400">Auditoria estatística em andamento...</p>
          </div>
        )}

        <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
          {/* Globo Mechanical Display with active rolling sphere */}
          <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-slate-950/80 border border-slate-800/90 w-full md:w-64 text-center">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-2">
              Globo Caixa Oficial #L-25
            </span>

            {/* Big Rolling Sphere */}
            <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-gradient-to-tr from-amber-600 via-yellow-500 to-amber-300 p-1 shadow-2xl shadow-amber-500/40 flex items-center justify-center">
              <div className="w-full h-full rounded-full bg-gradient-to-br from-amber-400 via-amber-500 to-orange-600 flex items-center justify-center shadow-inner relative overflow-hidden">
                {/* Shine highlight */}
                <div className="absolute top-1 left-2 w-8 h-4 rounded-full bg-white/40 blur-[1px] transform -rotate-45"></div>

                <span className="font-mono font-black text-3xl sm:text-4xl text-slate-950 tracking-tight">
                  {isPlaying && currentRollingNum !== null
                    ? currentRollingNum.toString().padStart(2, '0')
                    : revealedCount > 0
                    ? drawnNumbers[revealedCount - 1].toString().padStart(2, '0')
                    : '--'}
                </span>
              </div>
            </div>

            <span className="text-xs font-mono font-bold text-amber-300 mt-3">
              {isPlaying
                ? `Extraindo Bola ${revealedCount + 1}/15...`
                : revealedCount === 15
                ? '✓ Extração Finalizada'
                : 'Aguardando Início'}
            </span>
          </div>

          {/* Drawn Balls Track (15 Balls Grid) */}
          <div className="flex-1 space-y-3 w-full">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-semibold font-mono text-[11px] uppercase tracking-wider">
                Dezenas Sorteadas ({revealedCount} de 15)
              </span>
              <div className="flex items-center gap-2">
                <span className="text-slate-400 text-[11px]">Concurso:</span>
                <select
                  value={selectedConcursoId}
                  onChange={(e) => setSelectedConcursoId(e.target.value)}
                  className="bg-slate-900 border border-slate-700 text-amber-300 text-[11px] font-mono rounded-lg px-2 py-1 cursor-pointer"
                >
                  <option value="current">Atual: #{initialTargetDraw.concurso}</option>
                  {RECENT_DRAWS.slice(0, 5).map((d) => (
                    <option key={d.concurso} value={`recent_${d.concurso}`}>
                      #{d.concurso} ({d.data})
                    </option>
                  ))}
                  <option value="random">🎲 Sorteio Inédito (Monte Carlo)</option>
                </select>
              </div>
            </div>

            {/* 15 Balls Display Rack */}
            <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-5 lg:grid-cols-8 gap-2 p-3 bg-slate-950/60 rounded-2xl border border-slate-850">
              {drawnNumbers.map((num, idx) => {
                const isRevealed = idx < revealedCount;
                const isLatest = idx === revealedCount - 1 && isPlaying;
                const matchesActiveTicket = isRevealed && activeTicket?.dezenas.includes(num);

                return (
                  <div
                    key={num}
                    className={`transition-all duration-300 transform flex flex-col items-center justify-center p-1 rounded-xl ${
                      isRevealed
                        ? 'opacity-100 scale-100'
                        : 'opacity-30 scale-90 border border-dashed border-slate-800'
                    }`}
                  >
                    <div
                      className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center font-mono font-black text-sm shadow-md transition-all ${
                        isLatest
                          ? 'bg-gradient-to-tr from-yellow-300 to-amber-500 text-slate-950 scale-125 ring-4 ring-amber-400 animate-bounce'
                          : matchesActiveTicket
                          ? 'bg-gradient-to-tr from-emerald-400 to-teal-300 text-slate-950 ring-2 ring-emerald-400 shadow-emerald-500/40'
                          : isRevealed
                          ? 'bg-gradient-to-tr from-slate-200 to-slate-400 text-slate-950'
                          : 'bg-slate-900 text-slate-600'
                      }`}
                    >
                      {isRevealed ? num.toString().padStart(2, '0') : idx + 1}
                    </div>
                    <span className="text-[9px] font-mono text-slate-500 mt-1">
                      {idx + 1}ª bola
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Live Bilhete Inspector & Multi-ticket Real-time Ranking */}
      {activeTicket && (
        <div className="space-y-4">
          <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-5 rounded-2xl border border-slate-800 space-y-4 shadow-xl">
            {/* Header of Active Ticket */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <span className="font-mono font-bold text-white text-xs">
                  Bilhete em Foco na Animação:
                </span>
                <select
                  value={selectedTicketIndex}
                  onChange={(e) => setSelectedTicketIndex(parseInt(e.target.value, 10))}
                  className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs font-mono font-bold text-emerald-400 cursor-pointer shadow-sm"
                >
                  {tickets.map((t, idx) => (
                    <option key={t.id || idx} value={idx}>
                      Bilhete #{t.index.toString().padStart(2, '0')} (IA Score: {t.scoreIA || 90}%)
                    </option>
                  ))}
                </select>
              </div>

              {/* Real-time Hit Badge */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Acertos neste bilhete:</span>
                <span
                  className={`font-mono font-black text-sm px-3 py-1 rounded-xl transition-all shadow-md ${
                    currentMatches >= 14
                      ? 'bg-gradient-to-r from-amber-400 to-yellow-300 text-slate-950 ring-2 ring-amber-400 scale-105'
                      : currentMatches >= 11
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 ring-2 ring-emerald-400'
                      : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {currentMatches} de 15 {currentMatches >= 11 ? '★ PREMIADO' : ''}
                </span>
              </div>
            </div>

            {/* 15 Numbers of the Active Ticket */}
            <div className="space-y-2">
              <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block">
                Dezenas do Jogo #{activeTicket.index.toString().padStart(2, '0')} (Bolas acertadas acendem em verde/dourado):
              </span>
              <div className="grid grid-cols-5 sm:grid-cols-15 gap-2 justify-center">
                {activeTicket.dezenas.map((n) => {
                  const isMatch = currentRevealedBalls.includes(n);
                  return (
                    <div
                      key={n}
                      className={`p-2 rounded-xl flex flex-col items-center justify-center font-mono font-black text-sm transition-all duration-300 ${
                        isMatch
                          ? 'bg-gradient-to-tr from-emerald-400 to-teal-300 text-slate-950 shadow-lg shadow-emerald-500/30 scale-105 ring-2 ring-emerald-300'
                          : 'bg-slate-900 text-slate-400 border border-slate-800'
                      }`}
                    >
                      <span>{n.toString().padStart(2, '0')}</span>
                      <span className="text-[8px] opacity-75 font-normal">
                        {isMatch ? '✓ SAIU' : 'espera'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Quick Real-Time Overview of All Tickets */}
          {tickets.length > 1 && (
            <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono font-bold text-slate-300 uppercase tracking-wider text-[11px] flex items-center gap-2">
                  <Layers className="w-4 h-4 text-emerald-400" />
                  Evolução em Tempo Real de Todos os {tickets.length} Bilhetes
                </span>
                <span className="text-[11px] text-amber-300 font-mono">
                  Melhor Pontuação Atual: <strong>{bestHitsSoFar} Acertos</strong>
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 max-h-48 overflow-y-auto pr-1">
                {tickets.map((t, idx) => {
                  const hits = countMatches(t.dezenas, currentRevealedBalls);
                  const isSelected = idx === selectedTicketIndex;

                  return (
                    <button
                      key={t.id || idx}
                      type="button"
                      onClick={() => setSelectedTicketIndex(idx)}
                      className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-500/20 border-emerald-500/50 ring-1 ring-emerald-400'
                          : hits >= 14
                          ? 'bg-amber-500/10 border-amber-500/40 text-amber-300'
                          : hits >= 11
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-850'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-mono font-bold text-white">
                          #{t.index.toString().padStart(2, '0')}
                        </span>
                        <span
                          className={`font-mono text-xs font-black px-1.5 py-0.2 rounded ${
                            hits >= 14
                              ? 'bg-amber-400 text-slate-950'
                              : hits >= 11
                              ? 'bg-emerald-500 text-slate-950'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {hits} pts
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
