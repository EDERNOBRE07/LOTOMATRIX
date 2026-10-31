import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
  ReferenceLine,
  LabelList,
} from 'recharts';
import { LotofacilDraw, DezenaStats } from '../types/lotofacil';
import { CONCURSO_ATUAL, DEZENAS_STATS } from '../data/lotofacilData';
import { getHistorical100Draws } from '../services/historical100Draws';
import {
  TrendingUp,
  Flame,
  Award,
  Sparkles,
  Check,
  Copy,
  ArrowRight,
  Zap,
  Info,
  Layers,
} from 'lucide-react';
import { soundService } from '../services/soundAlert';

interface WidgetTendenciasTop5RechartsProps {
  latestDraw?: LotofacilDraw;
  statsList?: DezenaStats[];
  onFixNumbers?: (numbers: number[]) => void;
  onNavigateToFechamento?: () => void;
}

export interface TopDezenaItem {
  numero: number;
  label: string;
  frequencia: number;
  percentual: number;
  badge: string;
  atrasoAtual: number;
  status: 'super_quente' | 'alta' | 'firme';
  noCiclo: boolean;
}

export const WidgetTendenciasTop5Recharts: React.FC<WidgetTendenciasTop5RechartsProps> = ({
  latestDraw = CONCURSO_ATUAL,
  statsList = DEZENAS_STATS,
  onFixNumbers,
  onNavigateToFechamento,
}) => {
  const [copied, setCopied] = useState<boolean>(false);
  const [appliedFeedback, setAppliedFeedback] = useState<string | null>(null);

  // Compute Top 5 numbers in the last 20 contests dynamically
  const { top5List, contestRange, mediaPresenca, totalDrawsAnalyzed } = useMemo(() => {
    const historical = getHistorical100Draws(latestDraw);
    const last20Draws = historical.slice(0, 20);

    const counts: { [num: number]: number } = {};
    for (let i = 1; i <= 25; i++) {
      counts[i] = 0;
    }

    last20Draws.forEach((d) => {
      d.dezenas.forEach((n) => {
        if (counts[n] !== undefined) {
          counts[n]++;
        }
      });
    });

    // Map to list
    const mapped = Object.keys(counts).map((key) => {
      const num = parseInt(key, 10);
      const freq = counts[num];
      const perc = Math.round((freq / Math.max(1, last20Draws.length)) * 100);
      const stats = statsList.find((s) => s.numero === num);

      let status: 'super_quente' | 'alta' | 'firme' = 'firme';
      if (freq >= 16) status = 'super_quente';
      else if (freq >= 14) status = 'alta';

      return {
        numero: num,
        label: `Dezena ${num.toString().padStart(2, '0')}`,
        shortLabel: num.toString().padStart(2, '0'),
        frequencia: freq,
        percentual: perc,
        badge: `${freq}x (${perc}%)`,
        atrasoAtual: stats?.atrasoAtual ?? 0,
        status,
        noCiclo: stats?.pendenteNoCiclo ?? false,
      };
    });

    // Sort descending by frequency, then ascending by number
    mapped.sort((a, b) => {
      if (b.frequencia !== a.frequencia) {
        return b.frequencia - a.frequencia;
      }
      return a.numero - b.numero;
    });

    const top5 = mapped.slice(0, 5);
    const minConcurso = last20Draws[last20Draws.length - 1]?.concurso ?? latestDraw.concurso - 19;
    const maxConcurso = last20Draws[0]?.concurso ?? latestDraw.concurso;

    return {
      top5List: top5,
      contestRange: `#${minConcurso} ao #${maxConcurso}`,
      mediaPresenca: 12, // 15 dezenas / 25 totais = 60% = 12 em 20 sorteios
      totalDrawsAnalyzed: last20Draws.length,
    };
  }, [latestDraw, statsList]);

  const top5Numbers = useMemo(() => top5List.map((t) => t.numero), [top5List]);

  const handleCopyTop5 = () => {
    const formatted = top5Numbers.map((n) => n.toString().padStart(2, '0')).join(', ');
    navigator.clipboard.writeText(formatted);
    setCopied(true);
    soundService.playTickCountdown();
    setTimeout(() => setCopied(false), 2500);
  };

  const handleFixAllTop5 = () => {
    if (onFixNumbers) {
      onFixNumbers(top5Numbers);
    }
    soundService.playGoldenZoneSuccessChime();
    setAppliedFeedback(`Top 5 (${top5Numbers.map((n) => n.toString().padStart(2, '0')).join(', ')}) fixadas com sucesso!`);
    setTimeout(() => setAppliedFeedback(null), 3500);

    // Also trigger navigation if requested
    if (onNavigateToFechamento) {
      onNavigateToFechamento();
    } else if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('switch-tab', { detail: { tab: 'fechamento' } }));
    }
  };

  const handleFixSingle = (num: number) => {
    if (onFixNumbers) {
      onFixNumbers([num]);
    }
    soundService.playTickCountdown();
    setAppliedFeedback(`Dezena ${num.toString().padStart(2, '0')} adicionada às dezenas fixas!`);
    setTimeout(() => setAppliedFeedback(null), 2500);
  };

  // Recharts color styling per bar
  const getBarColor = (index: number) => {
    switch (index) {
      case 0:
        return '#f59e0b'; // Top 1: Pure Gold
      case 1:
        return '#fbbf24'; // Top 2: Amber
      case 2:
        return '#eab308'; // Top 3: Yellow
      case 3:
        return '#10b981'; // Top 4: Emerald
      case 4:
      default:
        return '#06b6d4'; // Top 5: Cyan
    }
  };

  return (
    <div className="bg-gradient-to-br from-slate-900 via-slate-900/95 to-slate-950 rounded-2xl border border-amber-500/30 p-5 sm:p-6 shadow-2xl relative overflow-hidden">
      {/* Background Accent Glow */}
      <div className="absolute -top-24 -right-24 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-60 h-60 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header Section */}
      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-400 via-yellow-500 to-amber-600 flex items-center justify-center text-slate-950 shadow-lg shadow-amber-500/25 shrink-0">
            <TrendingUp className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base sm:text-lg font-black text-white tracking-wide">
                Widget de Tendências · Top 5 Dezenas
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 uppercase tracking-wider font-mono">
                Últimos 20 Concursos
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Dezenas com maior frequência e consistência matemática entre os concursos{' '}
              <strong className="text-amber-300 font-mono">{contestRange}</strong> ({totalDrawsAnalyzed} apurações).
            </p>
          </div>
        </div>

        {/* Action Buttons Header */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleCopyTop5}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 text-slate-200 text-xs font-semibold transition cursor-pointer"
            title="Copiar lista das 5 dezenas"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-amber-400" />
                <span>Copiar Top 5</span>
              </>
            )}
          </button>

          <button
            onClick={handleFixAllTop5}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-slate-950 text-xs font-black shadow-md shadow-amber-500/20 transition cursor-pointer"
          >
            <Zap className="w-3.5 h-3.5 fill-current" />
            <span>Fixar Top 5 no Fechamento</span>
          </button>
        </div>
      </div>

      {/* Applied Feedback Notice */}
      {appliedFeedback && (
        <div className="mt-3 bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 p-3 rounded-xl text-xs flex items-center gap-2 animate-fadeIn">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="font-medium">{appliedFeedback}</span>
        </div>
      )}

      {/* Top 5 Visual Badges Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 my-5 relative z-10">
        {top5List.map((item, index) => {
          const rankColors = [
            'from-amber-400 to-yellow-600 border-amber-500/50 text-amber-400',
            'from-amber-300 to-yellow-500 border-amber-400/40 text-amber-300',
            'from-yellow-400 to-amber-500 border-yellow-500/40 text-yellow-300',
            'from-emerald-400 to-teal-600 border-emerald-500/40 text-emerald-400',
            'from-cyan-400 to-blue-600 border-cyan-500/40 text-cyan-400',
          ];

          return (
            <div
              key={item.numero}
              className="bg-slate-950/70 border border-slate-800/80 hover:border-amber-500/40 rounded-xl p-3 flex flex-col items-center justify-between text-center transition-all duration-200 group relative hover:shadow-lg hover:shadow-amber-500/5"
            >
              {/* Position rank pill */}
              <div className="absolute top-2 left-2 flex items-center gap-1">
                <span className="text-[10px] font-black font-mono text-slate-400 px-1.5 py-0.2 rounded bg-slate-800/80 border border-slate-700/50">
                  #{index + 1}
                </span>
              </div>

              {/* Ball */}
              <div className="mt-2 mb-2 w-12 h-12 rounded-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 border-2 border-amber-400/80 shadow-md shadow-amber-500/20 flex items-center justify-center font-black text-lg text-amber-300 group-hover:scale-105 transition-transform">
                {item.numero.toString().padStart(2, '0')}
              </div>

              {/* Stats */}
              <div className="space-y-0.5 w-full">
                <div className="text-xs font-bold text-white flex items-center justify-center gap-1">
                  <Flame className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                  <span>{item.frequencia} / 20</span>
                </div>
                <div className="text-[11px] font-semibold text-emerald-400">
                  {item.percentual}% dos jogos
                </div>
                <div className="text-[10px] text-slate-400 flex items-center justify-center gap-1">
                  <span>Atraso:</span>
                  <strong className={item.atrasoAtual === 0 ? 'text-emerald-400' : 'text-amber-300'}>
                    {item.atrasoAtual === 0 ? 'Saiu no Últ.' : `${item.atrasoAtual} conc.`}
                  </strong>
                </div>
              </div>

              {/* Quick Action Button */}
              <button
                onClick={() => handleFixSingle(item.numero)}
                className="mt-2.5 w-full py-1 text-[10px] font-bold text-slate-300 hover:text-white bg-slate-900 hover:bg-amber-500/20 border border-slate-800 hover:border-amber-500/40 rounded-lg transition cursor-pointer flex items-center justify-center gap-1"
                title={`Fixar dezena ${item.numero} no fechamento`}
              >
                <span>Fixar</span>
                <ArrowRight className="w-2.5 h-2.5" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Main Recharts Bar Chart */}
      <div className="bg-slate-950/60 rounded-xl border border-slate-800/80 p-4 relative z-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-400" />
              <span>Gráfico de Frequência das 5 Mais Sorteadas</span>
            </h4>
            <p className="text-[11px] text-slate-400">
              Número de aparições nos últimos 20 concursos em relação à média esperada de 12 sorteios (60%).
            </p>
          </div>
          <div className="flex items-center gap-3 text-[11px] font-mono text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-amber-400 inline-block" /> Top 5
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-amber-500 inline-block border-t border-dashed border-amber-400" /> Média (12x)
            </span>
          </div>
        </div>

        {/* Responsive Recharts Container */}
        <div className="w-full h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={top5List}
              margin={{ top: 20, right: 15, left: -15, bottom: 5 }}
            >
              <defs>
                <linearGradient id="goldTopGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.95} />
                  <stop offset="100%" stopColor="#b45309" stopOpacity={0.7} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.35} vertical={false} />

              <XAxis
                dataKey="label"
                stroke="#64748b"
                tick={{ fill: '#cbd5e1', fontSize: 11, fontWeight: 600 }}
                tickLine={{ stroke: '#475569' }}
              />

              <YAxis
                domain={[0, 20]}
                ticks={[0, 5, 10, 15, 20]}
                stroke="#64748b"
                tick={{ fill: '#94a3b8', fontSize: 10 }}
                tickLine={{ stroke: '#475569' }}
                tickFormatter={(val) => `${val}x`}
              />

              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload as TopDezenaItem;
                    return (
                      <div className="bg-slate-900/95 border border-amber-500/40 rounded-xl p-3 shadow-2xl text-xs space-y-1.5 font-sans min-w-[200px]">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                          <strong className="text-white font-bold flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-amber-400" />
                            {data.label}
                          </strong>
                          <span className="text-[10px] font-mono text-amber-300 font-bold px-1.5 py-0.2 rounded bg-amber-500/20">
                            {data.percentual}%
                          </span>
                        </div>
                        <div className="text-slate-300 flex justify-between">
                          <span>Aparições:</span>
                          <strong className="text-white font-mono">{data.frequencia} de 20 sorteios</strong>
                        </div>
                        <div className="text-slate-300 flex justify-between">
                          <span>Atraso Atual:</span>
                          <span className={data.atrasoAtual === 0 ? 'text-emerald-400 font-semibold' : 'text-amber-300 font-mono'}>
                            {data.atrasoAtual === 0 ? 'Saiu no último sorteio' : `${data.atrasoAtual} concurso(s)`}
                          </span>
                        </div>
                        <div className="text-slate-300 flex justify-between">
                          <span>Média Esperada:</span>
                          <span className="text-slate-400 font-mono">12x (60%)</span>
                        </div>
                        <div className="pt-1 border-t border-slate-800 text-[10px] text-emerald-400 font-medium">
                          +{(data.frequencia - 12) * 5}% acima da média geral da Lotofácil
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />

              {/* Reference Line for Expected 60% Average (12 appearances in 20 draws) */}
              <ReferenceLine
                y={mediaPresenca}
                stroke="#f59e0b"
                strokeDasharray="4 4"
                strokeWidth={1.5}
                label={{
                  value: 'Média Esperada (12x / 60%)',
                  fill: '#f59e0b',
                  fontSize: 10,
                  fontWeight: 600,
                  position: 'insideTopRight',
                  offset: 4,
                }}
              />

              <Bar
                dataKey="frequencia"
                radius={[6, 6, 0, 0]}
                animationDuration={900}
              >
                {top5List.map((entry, index) => (
                  <Cell
                    key={`cell-${entry.numero}`}
                    fill={getBarColor(index)}
                    className="hover:opacity-80 transition cursor-pointer"
                  />
                ))}
                <LabelList
                  dataKey="badge"
                  position="top"
                  fill="#f1f5f9"
                  fontSize={10}
                  fontWeight={700}
                  offset={6}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Strategic Recommendation Footer */}
      <div className="mt-4 pt-3 border-t border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-slate-400 relative z-10">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>
            <strong className="text-slate-200">Recomendação Sniper:</strong> Incluir de 3 a 4 destas 5 dezenas quentes como âncoras na geração do fechamento eleva a aderência histórica aos 14 e 15 pontos.
          </span>
        </div>
        <button
          onClick={handleFixAllTop5}
          className="text-amber-400 hover:text-amber-300 font-bold inline-flex items-center gap-1 transition cursor-pointer shrink-0"
        >
          <span>Ir para Fechamento com o Top 5</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
