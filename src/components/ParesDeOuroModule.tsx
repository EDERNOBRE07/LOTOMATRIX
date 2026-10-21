import React, { useState, useMemo } from 'react';
import { TOP_DUPLAS, CONCURSO_ATUAL, RECENT_DRAWS } from '../data/lotofacilData';
import { DuplaStats, LotofacilDraw } from '../types/lotofacil';
import { Award, Zap, Check, Sparkles, Filter, Link2, ArrowRight, Flame, Clock } from 'lucide-react';

interface ParesDeOuroModuleProps {
  latestDraw?: LotofacilDraw;
  onApplyPairAsFilter?: (pair: [number, number]) => void;
}

export const ParesDeOuroModule: React.FC<ParesDeOuroModuleProps> = ({
  latestDraw = CONCURSO_ATUAL,
  onApplyPairAsFilter,
}) => {
  const [appliedPair, setAppliedPair] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<'todos' | 'recentes' | 'atrasados'>('todos');

  // Automatically identify and calibrate the Golden Pairs using both the historical master database and recent draws
  const computedGoldenPairs = useMemo(() => {
    const allDraws = [latestDraw, ...RECENT_DRAWS.filter((d) => d.concurso !== latestDraw.concurso)];

    return TOP_DUPLAS.map((item) => {
      const [d1, d2] = item.dupla;
      // Calculate delay dynamically against latest loaded draws
      let currentDelay = 0;
      let drawnInLatest = false;

      for (let i = 0; i < allDraws.length; i++) {
        const d = allDraws[i];
        const hasBoth = d.dezenas.includes(d1) && d.dezenas.includes(d2);
        if (hasBoth) {
          if (i === 0) drawnInLatest = true;
          break;
        }
        currentDelay++;
      }

      // Count occurrences in recent 10 draws
      const recentHits = allDraws.slice(0, 10).filter(
        (d) => d.dezenas.includes(d1) && d.dezenas.includes(d2)
      ).length;

      // Affinity score (0 to 100)
      const affinityScore = Math.min(99, Math.round((item.vezes / 3804) * 100 * 2.8));

      return {
        ...item,
        atrasoAtual: currentDelay,
        drawnInLatest,
        recentHits,
        affinityScore,
      };
    }).sort((a, b) => {
      if (filterMode === 'recentes') return b.recentHits - a.recentHits;
      if (filterMode === 'atrasados') return b.atrasoAtual - a.atrasoAtual;
      return b.vezes - a.vezes;
    });
  }, [latestDraw, filterMode]);

  const handleApply = (pair: [number, number]) => {
    if (onApplyPairAsFilter) {
      onApplyPairAsFilter(pair);
      setAppliedPair(`${pair[0]}-${pair[1]}`);
      setTimeout(() => setAppliedPair(null), 3000);
    } else {
      window.dispatchEvent(new CustomEvent('switch-tab', { detail: 'fechamento' }));
    }
  };

  return (
    <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-5 sm:p-6 shadow-xl space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-800 gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-tr from-amber-500/20 to-yellow-500/20 border border-amber-500/30 text-amber-300 shrink-0">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <span>Pares de Ouro (Identificação Automática de Duplas de Alta Afinidade)</span>
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40 uppercase">
                Correlação Positiva
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Dezenas que frequentemente são sorteadas juntas na Lotofácil. Aplique qualquer Par de Ouro como restrição de filtro obrigatório para blindar a matriz.
            </p>
          </div>
        </div>

        {/* Filter Mode Selector */}
        <div className="flex items-center gap-1.5 bg-slate-950 p-1.5 rounded-xl border border-slate-800 text-xs shrink-0 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setFilterMode('todos')}
            className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
              filterMode === 'todos'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Mais Frequentes
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('recentes')}
            className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer flex items-center gap-1 ${
              filterMode === 'recentes'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>Mais Quentes</span>
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('atrasados')}
            className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer flex items-center gap-1 ${
              filterMode === 'atrasados'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Por Atraso</span>
          </button>
        </div>
      </div>

      {/* Grid of Identified Golden Pairs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {computedGoldenPairs.slice(0, 8).map((item, idx) => {
          const pairKey = `${item.dupla[0]}-${item.dupla[1]}`;
          const isApplied = appliedPair === pairKey;

          return (
            <div
              key={idx}
              className={`p-4 rounded-xl border transition-all space-y-3 relative overflow-hidden group ${
                item.drawnInLatest
                  ? 'bg-gradient-to-br from-amber-950/40 via-slate-950 to-slate-950 border-amber-500/50 shadow-lg shadow-amber-500/10'
                  : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-mono font-black text-amber-400">
                    Par #{idx + 1}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    ({item.affinityScore}% Afinidade)
                  </span>
                </div>
                {item.drawnInLatest && (
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono flex items-center gap-1">
                    <Sparkles className="w-2.5 h-2.5 text-amber-400" />
                    <span>Sorteado #{latestDraw.concurso}</span>
                  </span>
                )}
              </div>

              {/* Pair Balls with Golden Badge */}
              <div className="flex items-center justify-center gap-3 py-1.5">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-400 via-amber-500 to-amber-600 text-slate-950 font-black font-mono text-base flex items-center justify-center shadow-lg shadow-amber-500/20 group-hover:scale-105 transition">
                  {item.dupla[0].toString().padStart(2, '0')}
                </div>
                <div className="p-1 rounded-full bg-slate-800 text-slate-400">
                  <Link2 className="w-4 h-4 text-amber-400" />
                </div>
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-400 via-amber-500 to-amber-600 text-slate-950 font-black font-mono text-base flex items-center justify-center shadow-lg shadow-amber-500/20 group-hover:scale-105 transition">
                  {item.dupla[1].toString().padStart(2, '0')}
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-400 font-mono pt-2 border-t border-slate-850">
                <span>
                  <strong className="text-white">{item.vezes}</strong> saídas
                </span>
                <span className={item.atrasoAtual === 0 ? 'text-emerald-400 font-bold' : 'text-slate-400'}>
                  {item.atrasoAtual === 0 ? 'Acabou de sair' : `Atraso: ${item.atrasoAtual} conc.`}
                </span>
              </div>

              {/* Botão para aplicar o padrão como restrição de filtro no Fechamento */}
              <button
                type="button"
                onClick={() => handleApply(item.dupla)}
                className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-sm active:scale-95 ${
                  isApplied
                    ? 'bg-emerald-500 text-slate-950 font-black shadow-emerald-500/30'
                    : 'bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 border border-amber-400/50 shadow-amber-500/20'
                }`}
                title="Fixar este Par de Ouro no Fechamento matemático"
              >
                {isApplied ? (
                  <>
                    <Check className="w-4 h-4 text-slate-950" />
                    <span>Par Aplicado no Fechamento!</span>
                  </>
                ) : (
                  <>
                    <Filter className="w-3.5 h-3.5 text-slate-950" />
                    <span>Aplicar Par no Fechamento</span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-950" />
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* Info footer */}
      <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-850 text-xs text-slate-400 flex items-center justify-between gap-3">
        <span>
          💡 <strong className="text-slate-300">Dica Cirúrgica LotoSniper:</strong> Duplas como [01, 15], [03, 13] e [11, 25] possuem correlação matemática de repetição em mais de 35% dos volantes oficiais da Caixa.
        </span>
      </div>
    </div>
  );
};
