import React, { useState } from 'react';
import { TOP_DUPLAS, CONCURSO_ATUAL } from '../data/lotofacilData';
import { DuplaStats, LotofacilDraw } from '../types/lotofacil';
import { Award, Zap, Check, Sparkles, Filter, Link2 } from 'lucide-react';

interface ParesDeOuroModuleProps {
  latestDraw?: LotofacilDraw;
  onApplyPairAsFilter?: (pair: [number, number]) => void;
}

export const ParesDeOuroModule: React.FC<ParesDeOuroModuleProps> = ({
  latestDraw = CONCURSO_ATUAL,
  onApplyPairAsFilter,
}) => {
  const [appliedPair, setAppliedPair] = useState<string | null>(null);

  const handleApply = (pair: [number, number]) => {
    if (onApplyPairAsFilter) {
      onApplyPairAsFilter(pair);
      setAppliedPair(`${pair[0]}-${pair[1]}`);
      setTimeout(() => setAppliedPair(null), 3000);
    }
  };

  return (
    <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-5 sm:p-6 shadow-xl space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-slate-800 gap-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
              <span>Pares de Ouro (Duplas com Maior Afinidade no Sorteio)</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40 uppercase">
                Afinidade Canônica
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Dezenas que apresentam frequência de co-ocorrência historicamente superior à média nos concursos oficiais da Lotofácil.
            </p>
          </div>
        </div>
      </div>

      {/* Grid of Gold Pairs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {TOP_DUPLAS.slice(0, 8).map((item, idx) => {
          const isApplied = appliedPair === `${item.dupla[0]}-${item.dupla[1]}`;
          const isDrawnInLatest =
            latestDraw.dezenas.includes(item.dupla[0]) &&
            latestDraw.dezenas.includes(item.dupla[1]);

          return (
            <div
              key={idx}
              className={`p-3.5 rounded-xl border transition-all space-y-2.5 ${
                isDrawnInLatest
                  ? 'bg-gradient-to-br from-amber-950/30 via-slate-950 to-slate-950 border-amber-500/40'
                  : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono font-bold text-slate-400">
                  Par #{idx + 1}
                </span>
                {isDrawnInLatest && (
                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono">
                    Sorteado #{latestDraw.concurso}
                  </span>
                )}
              </div>

              {/* Pair Balls */}
              <div className="flex items-center justify-center gap-3 py-1">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-400 to-amber-600 text-slate-950 font-black font-mono text-sm flex items-center justify-center shadow-md">
                  {item.dupla[0].toString().padStart(2, '0')}
                </div>
                <Link2 className="w-4 h-4 text-slate-500" />
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-400 to-amber-600 text-slate-950 font-black font-mono text-sm flex items-center justify-center shadow-md">
                  {item.dupla[1].toString().padStart(2, '0')}
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-400 font-mono pt-1 border-t border-slate-850">
                <span>{item.vezes} saídas</span>
                <span className="text-slate-500">Atraso: {item.atrasoAtual}</span>
              </div>

              {onApplyPairAsFilter && (
                <button
                  type="button"
                  onClick={() => handleApply(item.dupla)}
                  className={`w-full py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    isApplied
                      ? 'bg-emerald-500 text-slate-950'
                      : 'bg-slate-850 hover:bg-slate-800 text-slate-200 border border-slate-700'
                  }`}
                >
                  {isApplied ? (
                    <>
                      <Check className="w-3 h-3 text-slate-950" />
                      <span>Filtro Aplicado!</span>
                    </>
                  ) : (
                    <>
                      <Filter className="w-3 h-3 text-amber-400" />
                      <span>Fixar Par no Fechamento</span>
                    </>
                  )}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
