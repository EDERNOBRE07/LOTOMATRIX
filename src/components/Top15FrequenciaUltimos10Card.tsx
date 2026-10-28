import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  CartesianGrid,
} from 'recharts';
import { LotofacilDraw } from '../types/lotofacil';
import { RECENT_DRAWS } from '../data/lotofacilData';
import {
  Flame,
  TrendingUp,
  Target,
  Pin,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Info,
  CheckCircle2,
} from 'lucide-react';
import { isPrimo, isMoldura, isFibonacci } from '../services/combinatorics';
import { soundService } from '../services/soundAlert';

interface Top15FrequenciaUltimos10CardProps {
  latestDraw: LotofacilDraw;
  onApplyTop15ToFechamento?: (dezenas: number[]) => void;
  onFixTopDezenas?: (dezenas: number[]) => void;
}

export const Top15FrequenciaUltimos10Card: React.FC<Top15FrequenciaUltimos10CardProps> = ({
  latestDraw,
  onApplyTop15ToFechamento,
  onFixTopDezenas,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [copiedNotice, setCopiedNotice] = useState<string | null>(null);

  // Consolidated list of last 10 draws
  const last10Draws = useMemo(() => {
    const list: LotofacilDraw[] = [latestDraw];
    RECENT_DRAWS.forEach((d) => {
      if (!list.some((existing) => existing.concurso === d.concurso)) {
        list.push(d);
      }
    });
    return list.slice(0, 10);
  }, [latestDraw]);

  // Compute frequencies for each dezena (1-25) in the 10 draws
  const { top15Data, oldestConcurso, newestConcurso, top15Numbers, top3Numbers } = useMemo(() => {
    const countMap: Record<number, number> = {};
    for (let i = 1; i <= 25; i++) countMap[i] = 0;

    last10Draws.forEach((draw) => {
      draw.dezenas.forEach((n) => {
        if (countMap[n] !== undefined) countMap[n]++;
      });
    });

    const sortedAll = Object.entries(countMap).map(([dezStr, count]) => {
      const num = Number(dezStr);
      const isLatest = latestDraw.dezenas.includes(num);
      return {
        numero: num,
        dezenaPad: num.toString().padStart(2, '0'),
        vezes: count,
        pct: Math.round((count / last10Draws.length) * 100),
        isLatest,
        isPrimo: isPrimo(num),
        isMoldura: isMoldura(num),
        isFibonacci: isFibonacci(num),
      };
    });

    // Sort descending by times, and break ties by presence in latest draw then number
    sortedAll.sort((a, b) => {
      if (b.vezes !== a.vezes) return b.vezes - a.vezes;
      if (a.isLatest !== b.isLatest) return a.isLatest ? -1 : 1;
      return a.numero - b.numero;
    });

    const top15 = sortedAll.slice(0, 15);
    const top15Nums = top15.map((d) => d.numero);
    const top3Nums = top15.slice(0, 3).map((d) => d.numero);

    const oldest = last10Draws[last10Draws.length - 1]?.concurso ?? latestDraw.concurso - 9;
    const newest = last10Draws[0]?.concurso ?? latestDraw.concurso;

    return {
      top15Data: top15,
      oldestConcurso: oldest,
      newestConcurso: newest,
      top15Numbers: top15Nums,
      top3Numbers: top3Nums,
    };
  }, [last10Draws, latestDraw]);

  // Actions
  const handleApplyTop15 = () => {
    if (onApplyTop15ToFechamento) {
      onApplyTop15ToFechamento(top15Numbers);
    } else if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('lotosniper-apply-numbers-to-fechamento', {
          detail: { numbers: top15Numbers, strategyName: 'Top 15 Mais Frequentes (Últimos 10 Concursos)' },
        })
      );
    }
    soundService.playGoldenZoneSuccessChime();
    setCopiedNotice('✓ As 15 dezenas mais quentes foram carregadas na Matriz 5×5 do Fechamento!');
    setTimeout(() => setCopiedNotice(null), 4000);
  };

  const handleFixTop3 = () => {
    if (onFixTopDezenas) {
      onFixTopDezenas(top3Numbers);
    } else if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('lotosniper_canonical_fixed_dezenas', JSON.stringify(top3Numbers));
        window.dispatchEvent(
          new CustomEvent('lotosniper-canonical-restrictions-updated', {
            detail: { dezenas: top3Numbers, source: 'top15_card' },
          })
        );
      } catch {}
    }
    soundService.playOpportunityAlert();
    setCopiedNotice(`✓ Top 3 Dezenas [${top3Numbers.map(n => n.toString().padStart(2, '0')).join(', ')}] fixadas nas Restrições Canônicas!`);
    setTimeout(() => setCopiedNotice(null), 4000);
  };

  // Custom Bar Colors according to rank
  const getBarColor = (index: number, vezes: number) => {
    if (index < 3) return '#f59e0b'; // Amber Gold for Top 3
    if (vezes >= 7) return '#10b981'; // Emerald for Ultra Hot
    if (vezes >= 5) return '#06b6d4'; // Cyan for Hot/Consistent
    return '#64748b'; // Slate for others
  };

  return (
    <div className="bg-slate-900/90 rounded-2xl border border-amber-500/30 p-4 sm:p-5 shadow-2xl relative overflow-hidden transition-all duration-300">
      {/* Decorative Glow */}
      <div className="absolute top-0 right-1/4 w-72 h-36 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Card Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-gradient-to-tr from-amber-500/20 to-orange-500/20 border border-amber-500/40 text-amber-300 shadow-md shadow-amber-500/10">
            <Flame className="w-5 h-5 text-amber-400 fill-amber-400 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-black text-white tracking-wide flex items-center gap-1.5">
                Top 15 Dezenas Mais Sorteadas
              </h3>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                Últimos 10 Concursos (#{oldestConcurso} a #{newestConcurso})
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Tendência de saída imediata calculada com precisão para guiar fechamentos e restrições canônicas.
            </p>
          </div>
        </div>

        {/* Action Controls & Collapse Button */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            onClick={handleApplyTop15}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs shadow-md shadow-amber-500/20 transition-all cursor-pointer active:scale-95"
            title="Carregar estas 15 dezenas diretamente no Fechamento"
          >
            <Target className="w-3.5 h-3.5" />
            <span>Aplicar Top 15</span>
          </button>

          <button
            onClick={handleFixTop3}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/40 font-bold text-xs transition-all cursor-pointer active:scale-95"
            title="Fixar o Top 3 como Dezenas Fixas"
          >
            <Pin className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Fixar Top 3</span>
          </button>

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition cursor-pointer"
            title={isCollapsed ? 'Expandir gráfico' : 'Recolher gráfico'}
          >
            {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Notice Message */}
      {copiedNotice && (
        <div className="mt-3 p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{copiedNotice}</span>
        </div>
      )}

      {/* Body: Recharts Bar Chart & Metrics */}
      {!isCollapsed && (
        <div className="mt-4 space-y-4">
          {/* Top 3 Quick Pills Highlight */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {top15Data.slice(0, 3).map((item, idx) => (
              <div
                key={item.numero}
                className="bg-slate-950/70 border border-amber-500/40 rounded-xl p-2.5 flex items-center justify-between gap-2 shadow-sm"
              >
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-500 to-yellow-400 text-slate-950 font-black text-sm flex items-center justify-center shadow-md">
                    {item.dezenaPad}
                  </span>
                  <div>
                    <span className="text-[10px] text-amber-300/80 uppercase font-black tracking-wider block">
                      #{idx + 1} Mais Quente
                    </span>
                    <strong className="text-white text-xs">
                      {item.vezes} saídas ({item.pct}%)
                    </strong>
                  </div>
                </div>
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {item.isLatest ? 'Repetiu' : 'Ausente'}
                </span>
              </div>
            ))}
          </div>

          {/* Recharts Bar Chart */}
          <div className="h-48 sm:h-52 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={top15Data}
                margin={{ top: 18, right: 10, left: -20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} vertical={false} />
                <XAxis
                  dataKey="dezenaPad"
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: '#475569' }}
                />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={10}
                  domain={[0, 10]}
                  ticks={[0, 2, 4, 6, 8, 10]}
                  tickLine={false}
                  axisLine={{ stroke: '#475569' }}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(245, 158, 11, 0.08)' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-slate-950/95 border border-amber-500/50 rounded-xl p-3 shadow-2xl text-xs space-y-1.5 backdrop-blur">
                          <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-1.5">
                            <span className="font-black text-amber-300 text-sm flex items-center gap-1.5">
                              Dezena {data.dezenaPad}
                            </span>
                            <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono text-[10px] font-bold">
                              {data.pct}% de Saída
                            </span>
                          </div>

                          <div className="text-slate-300 space-y-0.5 text-[11px]">
                            <p>
                              Frequência: <strong className="text-white">{data.vezes} de {last10Draws.length} sorteios</strong>
                            </p>
                            <p>
                              No último (#{latestDraw.concurso}):{' '}
                              <strong className={data.isLatest ? 'text-emerald-400' : 'text-slate-400'}>
                                {data.isLatest ? 'Presente (Repetiu)' : 'Ausente'}
                              </strong>
                            </p>
                            <div className="flex items-center gap-1.5 pt-1 text-[10px] text-slate-400">
                              {data.isMoldura && <span className="bg-slate-800 px-1.5 py-0.2 rounded">Moldura</span>}
                              {data.isPrimo && <span className="bg-slate-800 px-1.5 py-0.2 rounded">Primo</span>}
                              {data.isFibonacci && <span className="bg-slate-800 px-1.5 py-0.2 rounded">Fibonacci</span>}
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar
                  dataKey="vezes"
                  radius={[6, 6, 0, 0]}
                  label={{
                    position: 'top',
                    fill: '#f8fafc',
                    fontSize: 10,
                    fontWeight: 'bold',
                    formatter: (val: any) => (val !== undefined && val !== null ? `${val}` : ''),
                  }}
                >
                  {top15Data.map((entry, index) => (
                    <Cell
                      key={`cell-${entry.numero}`}
                      fill={getBarColor(index, entry.vezes)}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Quick Legend & Summary */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400 pt-1 border-t border-slate-800/80">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded bg-amber-500" />
                <span className="text-slate-300 font-medium">Top 3 Pódio</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded bg-emerald-500" />
                <span className="text-slate-300 font-medium">≥ 70% Saídas</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded bg-cyan-500" />
                <span className="text-slate-300 font-medium">≥ 50% Saídas</span>
              </span>
            </div>

            <span className="text-slate-400">
              Conjunto Top 15: <strong className="text-slate-200 font-mono">{top15Numbers.map(n => n.toString().padStart(2, '0')).join(', ')}</strong>
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
