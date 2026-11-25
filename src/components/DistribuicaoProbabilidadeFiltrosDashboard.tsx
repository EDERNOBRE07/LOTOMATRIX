import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceArea,
} from 'recharts';
import { FilterCriteria, LotofacilDraw } from '../types/lotofacil';
import { CONCURSO_ATUAL } from '../data/lotofacilData';
import { getHistorical100Draws } from '../services/historical100Draws';
import { analyzeTicket, validateFilters } from '../services/combinatorics';
import { BarChart3, ShieldCheck, Sparkles, TrendingUp } from 'lucide-react';

interface DistribuicaoProbabilidadeFiltrosDashboardProps {
  filters: FilterCriteria;
  latestDraw?: LotofacilDraw;
}

interface SumBucket {
  id: string;
  label: string;
  min: number;
  max: number;
  isGolden: boolean;
}

const SUM_BUCKETS: SumBucket[] = [
  { id: 'b1', label: '≤ 159', min: 0, max: 159, isGolden: false },
  { id: 'b2', label: '160–174', min: 160, max: 174, isGolden: false },
  { id: 'b3', label: '175–189', min: 175, max: 189, isGolden: false },
  { id: 'b4', label: '190–210 (Ouro)', min: 190, max: 210, isGolden: true },
  { id: 'b5', label: '211–225', min: 211, max: 225, isGolden: false },
  { id: 'b6', label: '≥ 226', min: 226, max: 400, isGolden: false },
];

// Amostra determinística de 1.200 combinações de C(25,15) para curva de densidade filtrada instantânea
function buildDeterministicUniverseSample(size: number): number[][] {
  let seed = 3836100;
  const nextRand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const out: number[][] = [];
  for (let i = 0; i < size; i++) {
    const nums = Array.from({ length: 25 }, (_, idx) => idx + 1);
    for (let j = 24; j > 0; j--) {
      const k = Math.floor(nextRand() * (j + 1));
      const tmp = nums[j];
      nums[j] = nums[k];
      nums[k] = tmp;
    }
    out.push(nums.slice(0, 15).sort((a, b) => a - b));
  }
  return out;
}

const SAMPLE_UNIVERSE = buildDeterministicUniverseSample(1200);

export const DistribuicaoProbabilidadeFiltrosDashboard: React.FC<
  DistribuicaoProbabilidadeFiltrosDashboardProps
> = ({ filters, latestDraw = CONCURSO_ATUAL }) => {
  const { chartData, summary } = useMemo(() => {
    const draws100 = getHistorical100Draws(latestDraw);

    // Filtros estruturais sem bloqueio pessoal de fixas/excluídas para comparar aderência histórica
    const structuralFilters: FilterCriteria = {
      ...filters,
      dezenasFixas: [],
      dezenasExcluidas: [],
      antiColisaoHistoricaAtiva: false,
      palpiteIneditoAtivo: false,
    };

    const histCounts: Record<string, number> = {};
    const histApprovedCounts: Record<string, number> = {};
    const filteredSimCounts: Record<string, number> = {};

    SUM_BUCKETS.forEach((b) => {
      histCounts[b.id] = 0;
      histApprovedCounts[b.id] = 0;
      filteredSimCounts[b.id] = 0;
    });

    let totalHistApproved = 0;
    let totalHistGolden = 0;

    for (let i = 0; i < draws100.length; i++) {
      const d = draws100[i];
      const prevDezenas = draws100[i + 1]?.dezenas ?? latestDraw.dezenas;
      const soma = d.dezenas.reduce((acc, n) => acc + n, 0);
      const bucket = SUM_BUCKETS.find((b) => soma >= b.min && soma <= b.max) || SUM_BUCKETS[3];
      histCounts[bucket.id]++;
      if (soma >= 190 && soma <= 210) totalHistGolden++;

      if (validateFilters(d.dezenas, structuralFilters, prevDezenas).isValid) {
        histApprovedCounts[bucket.id]++;
        totalHistApproved++;
      }
    }

    let totalFilteredSim = 0;
    let totalSimGolden = 0;

    for (const sample of SAMPLE_UNIVERSE) {
      if (validateFilters(sample, filters, latestDraw.dezenas).isValid) {
        const analysis = analyzeTicket(sample, latestDraw.dezenas);
        const bucket =
          SUM_BUCKETS.find((b) => analysis.soma >= b.min && analysis.soma <= b.max) || SUM_BUCKETS[3];
        filteredSimCounts[bucket.id]++;
        totalFilteredSim++;
        if (analysis.soma >= 190 && analysis.soma <= 210) totalSimGolden++;
      }
    }

    const totalHist = Math.max(1, draws100.length);
    const totalSim = Math.max(1, totalFilteredSim);

    const rows = SUM_BUCKETS.map((b) => {
      const historico100Pct = Number(((histCounts[b.id] / totalHist) * 100).toFixed(1));
      const filtrosPct =
        totalFilteredSim > 0
          ? Number(((filteredSimCounts[b.id] / totalSim) * 100).toFixed(1))
          : 0;
      const aprovadosHist100Pct = Number(
        ((histApprovedCounts[b.id] / totalHist) * 100).toFixed(1)
      );
      const dentroDaFaixa = !(b.max < filters.somaMin || b.min > filters.somaMax);

      return {
        faixa: b.label,
        historico100Pct,
        filtrosPct,
        aprovadosHist100Pct,
        histQtd: histCounts[b.id],
        simQtd: filteredSimCounts[b.id],
        dentroDaFaixa,
        isGolden: b.isGolden,
      };
    });

    return {
      chartData: rows,
      summary: {
        totalDraws: draws100.length,
        totalHistApproved,
        histApprovalPct: Math.round((totalHistApproved / totalHist) * 100),
        histGoldenPct: Math.round((totalHistGolden / totalHist) * 100),
        simGoldenPct:
          totalFilteredSim > 0 ? Math.round((totalSimGolden / totalFilteredSim) * 100) : 0,
        simEligibleCount: totalFilteredSim,
      },
    };
  }, [filters, latestDraw]);

  return (
    <section
      aria-label="Dashboard de Distribuição de Probabilidade"
      className="bg-slate-900/95 rounded-2xl border border-slate-800 p-5 sm:p-6 shadow-xl space-y-5"
    >
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="p-2 rounded-xl bg-amber-500/15 border border-amber-500/35 text-amber-400">
              <BarChart3 className="w-4 h-4" />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-white">
              Distribuição de Probabilidade: Filtros Ativos vs Últimos 100 Concursos
            </h3>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
              Soma {filters.somaMin}–{filters.somaMax}
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Compara a densidade probabilística das combinações aprovadas pelos seus{' '}
            <strong className="text-slate-200">Filtros Inteligentes</strong> contra a distribuição real dos últimos{' '}
            <strong className="text-slate-200">{summary.totalDraws} concursos</strong> oficiais da Lotofácil.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
          <div className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-slate-400">Aderência 100 Conc.:</span>
            <strong className="text-emerald-400 tabular-nums">{summary.histApprovalPct}%</strong>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-slate-950 border border-amber-500/35 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-slate-400">Foco Zona de Ouro:</span>
            <strong className="text-amber-300 tabular-nums">{summary.simGoldenPct}%</strong>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="h-72 sm:h-80 w-full bg-slate-950/70 border border-slate-800/80 rounded-xl p-3">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 12, right: 16, left: -12, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis
              dataKey="faixa"
              stroke="#94a3b8"
              tick={{ fill: '#cbd5e1', fontSize: 11 }}
              tickLine={false}
            />
            <YAxis
              stroke="#94a3b8"
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              tickFormatter={(v) => `${v}%`}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(2, 6, 23, 0.96)',
                borderColor: 'rgba(245, 158, 11, 0.45)',
                borderRadius: '12px',
                fontSize: '12px',
                color: '#f8fafc',
              }}
              formatter={(value: any, name?: string | number) => [`${value ?? 0}%`, String(name ?? '')]}
            />
            <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
            <ReferenceArea
              x1="190–210 (Ouro)"
              x2="190–210 (Ouro)"
              fill="#f59e0b"
              fillOpacity={0.12}
            />
            <Bar
              dataKey="historico100Pct"
              name="Histórico 100 Concursos (%)"
              fill="#38bdf8"
              radius={[6, 6, 0, 0]}
              barSize={26}
            />
            <Area
              type="monotone"
              dataKey="filtrosPct"
              name="Distribuição dos Filtros Ativos (%)"
              fill="#f59e0b"
              fillOpacity={0.22}
              stroke="#fbbf24"
              strokeWidth={2.5}
            />
            <Line
              type="monotone"
              dataKey="aprovadosHist100Pct"
              name="Concursos Aprovados pelos Filtros (%)"
              stroke="#10b981"
              strokeWidth={2}
              dot={{ r: 3.5, fill: '#10b981' }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Footer Insights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 flex items-center justify-between">
          <div>
            <span className="text-slate-400 block text-[11px]">Histórico na Zona de Ouro (190–210)</span>
            <strong className="text-sky-300 font-mono text-sm tabular-nums">
              {summary.histGoldenPct}% dos últimos 100 sorteios
            </strong>
          </div>
          <TrendingUp className="w-4 h-4 text-sky-400 shrink-0" />
        </div>

        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 flex items-center justify-between">
          <div>
            <span className="text-slate-400 block text-[11px]">Aprovações Estruturais (100 Conc.)</span>
            <strong className="text-emerald-400 font-mono text-sm tabular-nums">
              {summary.totalHistApproved} de {summary.totalDraws} concursos ({summary.histApprovalPct}%)
            </strong>
          </div>
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
        </div>

        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 flex items-center justify-between">
          <div>
            <span className="text-slate-400 block text-[11px]">Concentração Filtrada na Zona de Ouro</span>
            <strong className="text-amber-300 font-mono text-sm tabular-nums">
              {summary.simGoldenPct}% ({summary.simEligibleCount}/1.200 amostras)
            </strong>
          </div>
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
        </div>
      </div>
    </section>
  );
};
