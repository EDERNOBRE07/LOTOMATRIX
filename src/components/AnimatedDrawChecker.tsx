import React, { useState, useEffect } from 'react';
import { GameTicket, LotofacilDraw } from '../types/lotofacil';
import { countMatches } from '../services/combinatorics';
import {
  Play,
  RotateCcw,
  Sparkles,
  Award,
  CheckCircle2,
  Trophy,
  Flame,
} from 'lucide-react';

interface AnimatedDrawCheckerProps {
  tickets: GameTicket[];
  targetDraw: LotofacilDraw;
}

export const AnimatedDrawChecker: React.FC<AnimatedDrawCheckerProps> = ({
  tickets,
  targetDraw,
}) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [revealedCount, setRevealedCount] = useState<number>(0);
  const [selectedTicketIndex, setSelectedTicketIndex] = useState<number>(0);

  const drawnNumbers = targetDraw.dezenas;

  // Animate drawing ball by ball (1 to 15)
  useEffect(() => {
    let interval: any = null;
    if (isPlaying) {
      interval = setInterval(() => {
        setRevealedCount((prev) => {
          if (prev >= 15) {
            setIsPlaying(false);
            return 15;
          }
          return prev + 1;
        });
      }, 280);
    }
    return () => clearInterval(interval);
  }, [isPlaying]);

  const handleStartAnimation = () => {
    setRevealedCount(0);
    setIsPlaying(true);
  };

  const handleReset = () => {
    setIsPlaying(false);
    setRevealedCount(15);
  };

  const currentRevealedBalls = drawnNumbers.slice(0, revealedCount);
  const activeTicket = tickets[selectedTicketIndex] || tickets[0];
  const currentMatches = activeTicket
    ? activeTicket.dezenas.filter((n) => currentRevealedBalls.includes(n)).length
    : 0;

  return (
    <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-5 sm:p-6 shadow-xl space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-slate-800 gap-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 text-amber-300">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
              <span>Simulação Animada do Sorteio & Conferência Bola a Bola</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 uppercase font-bold">
                Transição Suave
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Concurso #{targetDraw.concurso} ({targetDraw.data}) • Acompanhe o sorteio das 15 dezenas com revelação animada.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {!isPlaying && revealedCount < 15 ? (
            <button
              type="button"
              onClick={handleStartAnimation}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition shadow-md shadow-emerald-500/20 cursor-pointer"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Iniciar Animação do Sorteio</span>
            </button>
          ) : isPlaying ? (
            <button
              type="button"
              disabled
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold text-xs animate-pulse"
            >
              <Sparkles className="w-4 h-4 animate-spin" />
              <span>Sorteando Bola {revealedCount}/15...</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleStartAnimation}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Repetir Animação</span>
            </button>
          )}
        </div>
      </div>

      {/* Sorteio Oficial Balls Animation Track */}
      <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-400 font-semibold uppercase tracking-wider font-mono text-[11px]">
            Globo Caixa: Dezenas Sorteadas ({revealedCount} de 15)
          </span>
          <span className="text-amber-300 font-mono font-bold">
            {revealedCount === 15 ? '✓ Sorteio Concluído' : 'Sorteando...'}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 justify-center py-2 min-h-[64px]">
          {drawnNumbers.map((num, idx) => {
            const isRevealed = idx < revealedCount;
            const isLatestRevealed = idx === revealedCount - 1 && isPlaying;

            return (
              <div
                key={num}
                className={`transition-all duration-500 transform ${
                  isRevealed
                    ? 'opacity-100 scale-100'
                    : 'opacity-25 scale-75 border-dashed border-slate-800'
                }`}
              >
                <div
                  className={`w-9 h-9 sm:w-11 sm:h-11 rounded-full flex items-center justify-center font-mono font-black text-sm shadow-lg transition-all ${
                    isLatestRevealed
                      ? 'bg-gradient-to-tr from-amber-400 to-yellow-200 text-slate-950 scale-125 ring-4 ring-amber-400/50 animate-bounce'
                      : isRevealed
                      ? 'bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 ring-2 ring-emerald-400/40'
                      : 'bg-slate-900 text-slate-600 border border-slate-800'
                  }`}
                >
                  {isRevealed ? num.toString().padStart(2, '0') : '?'}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Active Ticket Match Reveal */}
      {activeTicket && (
        <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-white text-xs">
                Bilhete em Conferência:
              </span>
              <select
                value={selectedTicketIndex}
                onChange={(e) => setSelectedTicketIndex(parseInt(e.target.value, 10))}
                className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs font-mono font-bold text-emerald-400 cursor-pointer"
              >
                {tickets.map((t, idx) => (
                  <option key={t.id} value={idx}>
                    Bilhete #{t.index.toString().padStart(2, '0')} (IA Score: {t.scoreIA}%)
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Acertos Registrados:</span>
              <span
                className={`font-mono font-black text-sm px-2.5 py-0.5 rounded-full transition-all ${
                  currentMatches >= 14
                    ? 'bg-amber-400 text-slate-950 shadow-lg shadow-amber-500/30'
                    : currentMatches >= 11
                    ? 'bg-emerald-500 text-slate-950'
                    : 'bg-slate-800 text-slate-300'
                }`}
              >
                {currentMatches} de 15 {currentMatches >= 11 ? '★ PREMIADO' : ''}
              </span>
            </div>
          </div>

          {/* Ticket Balls */}
          <div className="flex flex-wrap items-center gap-1.5 justify-center py-2">
            {activeTicket.dezenas.map((n) => {
              const isMatch = currentRevealedBalls.includes(n);
              return (
                <div
                  key={n}
                  className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center font-mono font-bold text-xs transition-all duration-300 ${
                    isMatch
                      ? 'bg-gradient-to-tr from-emerald-400 to-teal-300 text-slate-950 font-black shadow-md shadow-emerald-500/30 scale-105 ring-2 ring-emerald-400'
                      : 'bg-slate-900 text-slate-500 border border-slate-800'
                  }`}
                >
                  {n.toString().padStart(2, '0')}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
