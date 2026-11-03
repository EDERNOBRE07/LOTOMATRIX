import React, { useState, useEffect } from 'react';
import {
  Trophy,
  Award,
  Sparkles,
  Layers,
  Calendar,
  CheckCircle2,
  DollarSign,
  Filter,
  Trash2,
  ExternalLink,
  ChevronRight,
  Flame,
  Zap,
} from 'lucide-react';
import {
  AuditedWinningGame,
  getAuditedWinningGames,
  clearAuditedWinningGames,
} from '../services/savedGamesAuditorService';
import { LotofacilDraw } from '../types/lotofacil';

interface AuditedWinningGamesListProps {
  latestDraw?: LotofacilDraw;
  onGoToConferencia?: () => void;
}

export const AuditedWinningGamesList: React.FC<AuditedWinningGamesListProps> = ({
  latestDraw,
  onGoToConferencia,
}) => {
  const [winningGames, setWinningGames] = useState<AuditedWinningGame[]>(() =>
    getAuditedWinningGames()
  );
  const [tierFilter, setTierFilter] = useState<'all' | '14_15' | '13' | '11_12'>('all');

  useEffect(() => {
    const handleUpdate = () => {
      setWinningGames(getAuditedWinningGames());
    };
    window.addEventListener('lotosniper-winning-games-updated', handleUpdate);
    window.addEventListener('lotosniper-winning-games-cleared', handleUpdate);
    window.addEventListener('lotosniper-saved-games-audited', handleUpdate);
    return () => {
      window.removeEventListener('lotosniper-winning-games-updated', handleUpdate);
      window.removeEventListener('lotosniper-winning-games-cleared', handleUpdate);
      window.removeEventListener('lotosniper-saved-games-audited', handleUpdate);
    };
  }, []);

  const filteredGames = winningGames.filter((game) => {
    if (tierFilter === '14_15') return game.acertos >= 14;
    if (tierFilter === '13') return game.acertos === 13;
    if (tierFilter === '11_12') return game.acertos === 11 || game.acertos === 12;
    return true;
  });

  const totalPrize = winningGames.reduce((acc, g) => acc + (g.premioEstimado || 0), 0);

  const count15 = winningGames.filter((g) => g.acertos === 15).length;
  const count14 = winningGames.filter((g) => g.acertos === 14).length;
  const count13 = winningGames.filter((g) => g.acertos === 13).length;
  const count11_12 = winningGames.filter((g) => g.acertos <= 12).length;

  if (winningGames.length === 0) {
    return (
      <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-6 text-center space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 mx-auto flex items-center justify-center">
          <Trophy className="w-6 h-6" />
        </div>
        <h4 className="text-sm font-bold text-white">Nenhum Jogo Premiado Auditado Ainda</h4>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          Assim que a Caixa Econômica Federal publicar novos sorteios, o Service Worker auditará automaticamente seus bilhetes e criará a lista dos jogos vencedores identificando qual fechamento foi utilizado.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-slate-900 via-slate-900/95 to-slate-950 rounded-2xl border border-amber-500/40 p-5 sm:p-6 shadow-2xl space-y-5 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute -top-24 -right-24 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 via-yellow-500 to-amber-600 flex items-center justify-center text-slate-950 shadow-lg shadow-amber-500/25 shrink-0">
            <Trophy className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base sm:text-lg font-black text-white tracking-wide">
                Jogos Vencedores Auditados pelo Service Worker
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 uppercase font-mono tracking-wider">
                {winningGames.length} Bilhetes Premiados
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Lista consolidada de bilhetes premiados auditados em segundo plano, com a identificação do modelo de fechamento utilizado.
            </p>
          </div>
        </div>

        {/* Prize Summary Badge */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="bg-slate-950/80 px-3.5 py-2 rounded-xl border border-amber-500/30 text-right">
            <span className="text-[10px] text-slate-400 block font-medium">Prêmio Total Estimado:</span>
            <strong className="text-sm font-mono font-black text-emerald-400">
              {totalPrize.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </strong>
          </div>

          <button
            type="button"
            onClick={clearAuditedWinningGames}
            className="p-2 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-rose-400 border border-slate-800 text-xs transition cursor-pointer"
            title="Limpar lista de jogos vencedores"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tier Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs relative z-10">
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800">
          <button
            type="button"
            onClick={() => setTierFilter('all')}
            className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
              tierFilter === 'all'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Todos ({winningGames.length})
          </button>

          <button
            type="button"
            onClick={() => setTierFilter('14_15')}
            className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer flex items-center gap-1.5 ${
              tierFilter === '14_15'
                ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 shadow-sm font-black'
                : 'text-amber-400 hover:text-white'
            }`}
          >
            <Trophy className="w-3.5 h-3.5" />
            <span>14 e 15 Pontos ({count15 + count14})</span>
          </button>

          <button
            type="button"
            onClick={() => setTierFilter('13')}
            className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer flex items-center gap-1.5 ${
              tierFilter === '13'
                ? 'bg-cyan-500 text-slate-950 shadow-sm'
                : 'text-cyan-400 hover:text-white'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            <span>13 Pontos ({count13})</span>
          </button>

          <button
            type="button"
            onClick={() => setTierFilter('11_12')}
            className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
              tierFilter === '11_12'
                ? 'bg-blue-500 text-white shadow-sm'
                : 'text-blue-400 hover:text-white'
            }`}
          >
            11 e 12 Pontos ({count11_12})
          </button>
        </div>

        {onGoToConferencia && (
          <button
            type="button"
            onClick={onGoToConferencia}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold transition cursor-pointer"
          >
            <span>Abrir Conferidor Completo</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Cards of Winning Games */}
      <div className="space-y-3 relative z-10 max-h-[520px] overflow-y-auto pr-1">
        {filteredGames.map((game, idx) => {
          const isJackpot = game.acertos === 15;
          const is14 = game.acertos === 14;
          const is13 = game.acertos === 13;

          return (
            <div
              key={game.id || idx}
              className={`p-4 rounded-xl border transition-all ${
                isJackpot
                  ? 'bg-gradient-to-r from-amber-500/20 via-yellow-500/15 to-slate-950 border-amber-400 shadow-lg shadow-amber-500/15 ring-1 ring-amber-400/40'
                  : is14
                  ? 'bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-slate-950 border-emerald-400/80 shadow-md shadow-emerald-500/10'
                  : is13
                  ? 'bg-slate-950/80 border-cyan-500/40 hover:border-cyan-400'
                  : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
              }`}
            >
              {/* Top row: Fechamento Name & Hits Badge */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2.5 mb-2.5 border-b border-slate-800/80 gap-2">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Número do Fechamento Salvo */}
                    <span className="px-2 py-0.5 rounded-lg bg-gradient-to-r from-amber-500/25 to-yellow-500/20 text-amber-300 border border-amber-500/40 font-mono text-[11px] font-black flex items-center gap-1 shadow-sm">
                      <span>{game.fechamentoNumero || `#${(idx + 1).toString().padStart(2, '0')}`}</span>
                    </span>
                    <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">
                      Origem do Fechamento:
                    </span>
                    <strong className="text-xs sm:text-sm font-black text-amber-300 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>{game.fechamentoOrigem}</span>
                    </strong>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                    <span>Concurso #{game.concurso} ({game.dataConcurso})</span>
                    <span>•</span>
                    <span>Bilhete #{game.ticketIndex}</span>
                    <span>•</span>
                    <span>Auditado em: {game.dataAuditoria}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {/* Hits Badge */}
                  <div
                    className={`px-3 py-1 rounded-xl font-mono font-black text-xs flex items-center gap-1.5 border shadow-sm ${
                      isJackpot
                        ? 'bg-amber-400 text-slate-950 border-amber-300 ring-2 ring-amber-300/60'
                        : is14
                        ? 'bg-emerald-500 text-slate-950 border-emerald-400 ring-1 ring-emerald-300'
                        : is13
                        ? 'bg-cyan-500 text-slate-950 border-cyan-400'
                        : 'bg-blue-600 text-white border-blue-400'
                    }`}
                  >
                    <Trophy className="w-3.5 h-3.5 fill-current" />
                    <span>{game.acertos} ACERTOS</span>
                  </div>

                  {/* Estimated Prize Badge */}
                  {game.premioEstimado > 0 && (
                    <div className="px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-700 font-mono font-bold text-xs text-emerald-300">
                      {game.premioEstimado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </div>
                  )}
                </div>
              </div>

              {/* Dezenas Row with matched hits highlighted */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-mono text-slate-400 flex items-center justify-between">
                  <span>Dezenas Apostadas ({game.dezenas.length} números):</span>
                  <span className="text-emerald-400 font-bold">
                    ✓ {game.dezenasAcertadas.length} acertos sorteados no concurso
                  </span>
                </span>

                <div className="flex flex-wrap items-center gap-1.5">
                  {game.dezenas.map((num) => {
                    const isHit = game.dezenasAcertadas.includes(num);
                    return (
                      <span
                        key={num}
                        className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center font-mono text-xs sm:text-sm font-bold border transition-all ${
                          isHit
                            ? isJackpot
                              ? 'bg-amber-400 text-slate-950 border-amber-300 font-black shadow-md shadow-amber-400/40 ring-1 ring-amber-200'
                              : 'bg-emerald-500 text-slate-950 border-emerald-300 font-black shadow-sm ring-1 ring-emerald-300'
                            : 'bg-slate-900/90 text-slate-400 border-slate-800'
                        }`}
                      >
                        {num.toString().padStart(2, '0')}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
