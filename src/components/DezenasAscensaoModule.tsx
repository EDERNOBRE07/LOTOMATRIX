import React, { useMemo } from 'react';
import { LotofacilDraw, DezenaStats } from '../types/lotofacil';
import { RECENT_DRAWS, CONCURSO_ATUAL, DEZENAS_STATS } from '../data/lotofacilData';
import { TrendingUp, ArrowUpRight, Sparkles, Zap, Flame, Check } from 'lucide-react';

interface DezenasAscensaoModuleProps {
  latestDraw?: LotofacilDraw;
  onApplyNumbers?: (numbers: number[]) => void;
}

export const DezenasAscensaoModule: React.FC<DezenasAscensaoModuleProps> = ({
  latestDraw = CONCURSO_ATUAL,
  onApplyNumbers,
}) => {
  const allDraws = useMemo(() => {
    return [latestDraw, ...RECENT_DRAWS.filter((d) => d.concurso !== latestDraw.concurso)].slice(0, 10);
  }, [latestDraw]);

  // Compute momentum: occurrences in last 5 vs previous 5
  const ascensaoStats = useMemo(() => {
    const last5 = allDraws.slice(0, 5);
    const prev5 = allDraws.slice(5, 10);

    const countsLast5: Record<number, number> = {};
    const countsPrev5: Record<number, number> = {};

    for (let i = 1; i <= 25; i++) {
      countsLast5[i] = 0;
      countsPrev5[i] = 0;
    }

    last5.forEach((d) => {
      d.dezenas.forEach((n) => {
        countsLast5[n] = (countsLast5[n] || 0) + 1;
      });
    });

    prev5.forEach((d) => {
      d.dezenas.forEach((n) => {
        countsPrev5[n] = (countsPrev5[n] || 0) + 1;
      });
    });

    const result = Array.from({ length: 25 }, (_, i) => {
      const num = i + 1;
      const recent = countsLast5[num] || 0;
      const older = countsPrev5[num] || 0;
      const diff = recent - older;
      const total10 = recent + older;
      const freqPct = Math.round((total10 / 10) * 100);
      const isRising = recent >= 3 && diff >= 1;
      const acceleration = diff > 0 ? `+${diff * 20}%` : `${diff * 20}%`;

      return {
        numero: num,
        recent,
        older,
        diff,
        total10,
        freqPct,
        isRising,
        acceleration,
      };
    });

    // Sort by momentum and recent frequency
    return result.sort((a, b) => b.diff - a.diff || b.recent - a.recent);
  }, [allDraws]);

  const topRising = ascensaoStats.filter((s) => s.isRising).slice(0, 8);
  const [copiedNotice, setCopiedNotice] = React.useState(false);

  const handleApply = () => {
    if (onApplyNumbers && topRising.length > 0) {
      onApplyNumbers(topRising.map((r) => r.numero));
      setCopiedNotice(true);
      setTimeout(() => setCopiedNotice(false), 3000);
    }
  };

  return (
    <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-5 sm:p-6 shadow-xl space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-slate-800 gap-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 text-emerald-400">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
              <span>Dezenas em Ascensão (Aceleração Estatística)</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30 uppercase">
                Últimos 10 Concursos
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Identifica números que aumentaram consistentemente sua frequência de saída recente em comparação com sorteios anteriores.
            </p>
          </div>
        </div>

        {topRising.length > 0 && onApplyNumbers && (
          <button
            type="button"
            onClick={handleApply}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition shadow-sm shadow-emerald-500/20 cursor-pointer shrink-0"
          >
            {copiedNotice ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Aplicadas no Fechamento!</span>
              </>
            ) : (
              <>
                <Zap className="w-3.5 h-3.5 fill-current" />
                <span>Aplicar Top {topRising.length} no Fechamento</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Top Rising Grid Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
        {topRising.map((item) => (
          <div
            key={item.numero}
            className="bg-slate-950/80 p-3 rounded-xl border border-emerald-500/30 hover:border-emerald-500/60 transition text-center space-y-1.5 group"
          >
            <div className="flex items-center justify-between text-[10px] text-slate-400">
              <span className="font-mono text-emerald-400 font-bold">{item.acceleration}</span>
              <ArrowUpRight className="w-3 h-3 text-emerald-400" />
            </div>

            <div className="w-10 h-10 mx-auto rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 font-black font-mono text-base flex items-center justify-center shadow-md shadow-emerald-500/20 group-hover:scale-110 transition-transform">
              {item.numero.toString().padStart(2, '0')}
            </div>

            <div className="space-y-0.5">
              <span className="text-[10px] text-slate-400 block font-mono">
                {item.recent}/5 recentes
              </span>
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 font-bold font-mono">
                {item.freqPct}% nos 10
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Secondary list of moderate momentum */}
      <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
        <span className="text-slate-400 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Outras com tendência positiva nos últimos 10:</span>
          <span className="font-mono text-slate-200 font-semibold ml-1">
            {ascensaoStats
              .filter((s) => s.diff > 0 && !topRising.some((t) => t.numero === s.numero))
              .map((s) => s.numero.toString().padStart(2, '0'))
              .join(', ') || 'Nenhuma'}
          </span>
        </span>
        <span className="text-[11px] text-slate-500">
          Critério: aumento de frequência em blocos móveis de 5 concursos
        </span>
      </div>
    </div>
  );
};
