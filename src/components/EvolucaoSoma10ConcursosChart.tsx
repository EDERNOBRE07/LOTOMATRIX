import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  ReferenceArea,
} from 'recharts';
import { TrendingUp } from 'lucide-react';
import { LotofacilDraw } from '../types/lotofacil';
import { RECENT_DRAWS } from '../data/lotofacilData';
import {
  calcularParametrosConcurso,
  FAIXAS_STATUS_LOTOFACIL,
  ParametroStatus,
} from '../utils/concursoParametros';

interface EvolucaoSoma10ConcursosChartProps {
  latestDraw: LotofacilDraw;
  draws?: LotofacilDraw[];
}

interface SomaTrendPoint {
  concurso: number;
  label: string;
  data: string;
  somaTotal: number;
  status: ParametroStatus;
  statusLabel: string;
  pares: number;
  impares: number;
  primos: number;
  isLatest: boolean;
}

const DOT_COLOR_BY_STATUS: Record<ParametroStatus, string> = {
  ideal: '#10b981',
  alerta: '#f59e0b',
  critico: '#f43f5e',
  neutro: '#94a3b8',
};

/**
 * Gráfico de linha em Recharts exibindo a evolução da Soma Total nos últimos 10 concursos,
 * destacando a faixa histórica ideal (180 a 215) e o semáforo de status em cada ponto.
 */
export const EvolucaoSoma10ConcursosChart: React.FC<EvolucaoSoma10ConcursosChartProps> = ({
  latestDraw,
  draws = RECENT_DRAWS,
}) => {
  const { points, avgSoma, minSoma, maxSoma, idealCount } = useMemo(() => {
    const merged: LotofacilDraw[] = [latestDraw];
    const seen = new Set<number>([latestDraw.concurso]);
    for (const d of draws) {
      if (!seen.has(d.concurso)) {
        merged.push(d);
        seen.add(d.concurso);
      }
    }

    const last10Chrono = merged
      .sort((a, b) => b.concurso - a.concurso)
      .slice(0, 10)
      .reverse();

    const mapped: SomaTrendPoint[] = last10Chrono.map((d) => {
      const p = calcularParametrosConcurso(d.dezenas || []);
      return {
        concurso: d.concurso,
        label: `#${d.concurso}`,
        data: d.data,
        somaTotal: p.somaTotal,
        status: p.metricas.somaTotal.status,
        statusLabel: p.metricas.somaTotal.statusLabel,
        pares: p.pares,
        impares: p.impares,
        primos: p.primos,
        isLatest: d.concurso === latestDraw.concurso,
      };
    });

    const sums = mapped.map((m) => m.somaTotal);
    const avg =
      sums.length > 0
        ? Number((sums.reduce((acc, v) => acc + v, 0) / sums.length).toFixed(1))
        : 0;
    const min = sums.length > 0 ? Math.min(...sums) : 0;
    const max = sums.length > 0 ? Math.max(...sums) : 0;
    const ideal = mapped.filter((m) => m.status === 'ideal').length;

    return {
      points: mapped,
      avgSoma: avg,
      minSoma: min,
      maxSoma: max,
      idealCount: ideal,
    };
  }, [latestDraw, draws]);

  const { idealMin, idealMax } = FAIXAS_STATUS_LOTOFACIL.somaTotal;

  const yDomain = useMemo<[number, number]>(() => {
    if (points.length === 0) return [150, 240];
    const low = Math.min(minSoma, idealMin) - 12;
    const high = Math.max(maxSoma, idealMax) + 12;
    return [Math.floor(low / 5) * 5, Math.ceil(high / 5) * 5];
  }, [points.length, minSoma, maxSoma, idealMin, idealMax]);

  return (
    <section
      aria-label="Evolução da Soma Total nos últimos 10 concursos"
      className="bg-slate-900 border border-slate-800 rounded-xl p-5 sm:p-6 space-y-4"
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3.5 border-b border-slate-800">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 font-mono tabular-nums">
            <TrendingUp className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-sans text-emerald-400 font-medium">Tendência Histórica</span>
            <span aria-hidden="true">·</span>
            <span>Últimos {points.length} concursos</span>
            <span aria-hidden="true">·</span>
            <span>Faixa ideal: {idealMin}–{idealMax}</span>
          </div>
          <h3 className="text-base sm:text-lg font-semibold text-white tracking-tight">
            Evolução da Soma Total — Últimos 10 Concursos
          </h3>
          <p className="text-xs text-slate-400">
            Acompanhe oscilações da soma aritmética das 15 dezenas sorteadas em relação à zona de equilíbrio ({idealMin} a {idealMax}).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs font-mono tabular-nums text-slate-300 shrink-0">
          <div>
            <span className="font-sans text-slate-500">Média: </span>
            <strong className="text-amber-300">{avgSoma}</strong>
          </div>
          <div>
            <span className="font-sans text-slate-500">Mín / Máx: </span>
            <strong className="text-white">
              {minSoma} / {maxSoma}
            </strong>
          </div>
          <div>
            <span className="font-sans text-slate-500">Na faixa ideal: </span>
            <strong className="text-emerald-400">
              {idealCount}/{points.length}
            </strong>
          </div>
        </div>
      </div>

      <div className="h-60 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points} margin={{ top: 12, right: 18, left: -10, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <ReferenceArea
              y1={idealMin}
              y2={idealMax}
              fill="#10b981"
              fillOpacity={0.08}
              ifOverflow="extendDomain"
            />
            <XAxis
              dataKey="label"
              stroke="#64748b"
              tick={{ fill: '#cbd5e1', fontSize: 11, fontFamily: 'monospace' }}
              tickLine={false}
            />
            <YAxis
              stroke="#64748b"
              tick={{ fill: '#94a3b8', fontSize: 10, fontFamily: 'monospace' }}
              tickLine={false}
              domain={yDomain}
            />
            <ReferenceLine
              y={idealMax}
              stroke="#10b981"
              strokeOpacity={0.45}
              strokeDasharray="4 4"
              label={{
                value: `Teto Ideal (${idealMax})`,
                position: 'insideTopRight',
                fill: '#34d399',
                fontSize: 10,
              }}
            />
            <ReferenceLine
              y={idealMin}
              stroke="#10b981"
              strokeOpacity={0.45}
              strokeDasharray="4 4"
              label={{
                value: `Piso Ideal (${idealMin})`,
                position: 'insideBottomRight',
                fill: '#34d399',
                fontSize: 10,
              }}
            />
            <ReferenceLine
              y={avgSoma}
              stroke="#fbbf24"
              strokeOpacity={0.6}
              strokeDasharray="3 3"
              label={{
                value: `Média ${avgSoma}`,
                position: 'insideTopLeft',
                fill: '#fbbf24',
                fontSize: 10,
              }}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload || !payload.length) return null;
                const pt = payload[0].payload as SomaTrendPoint;
                const statusColor =
                  pt.status === 'ideal'
                    ? 'text-emerald-400'
                    : pt.status === 'alerta'
                    ? 'text-amber-300'
                    : 'text-rose-400';
                return (
                  <div className="bg-slate-950 border border-slate-700 rounded-lg p-3 text-xs font-mono tabular-nums space-y-1 shadow-xl">
                    <div className="font-sans font-semibold text-white border-b border-slate-800 pb-1">
                      Concurso {pt.label}{' '}
                      <span className="text-slate-400 font-normal">({pt.data})</span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="font-sans text-slate-400">Soma Total:</span>
                      <span className="text-white font-semibold">{pt.somaTotal}</span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="font-sans text-slate-400">Semáforo:</span>
                      <span className={`font-sans font-semibold ${statusColor}`}>
                        {pt.statusLabel} (ideal {idealMin}–{idealMax})
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-4 text-[11px] text-slate-400 pt-0.5">
                      <span>
                        {pt.pares}P / {pt.impares}I
                      </span>
                      <span>{pt.primos} Primos</span>
                    </div>
                  </div>
                );
              }}
            />
            <Line
              type="monotone"
              dataKey="somaTotal"
              name="Soma Total"
              stroke="#fbbf24"
              strokeWidth={2.4}
              dot={(dotProps) => {
                const { cx, cy, payload } = dotProps as {
                  cx?: number;
                  cy?: number;
                  payload?: SomaTrendPoint;
                };
                if (typeof cx !== 'number' || typeof cy !== 'number' || !payload) {
                  return <g key={`empty-${cx}-${cy}`} />;
                }
                const fill = DOT_COLOR_BY_STATUS[payload.status] || '#fbbf24';
                return (
                  <circle
                    key={`soma-dot-${payload.concurso}`}
                    cx={cx}
                    cy={cy}
                    r={payload.isLatest ? 5 : 3.8}
                    fill={fill}
                    stroke="#020617"
                    strokeWidth={1.5}
                  />
                );
              }}
              activeDot={{ r: 6, stroke: '#020617', strokeWidth: 2, fill: '#fbbf24' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Legenda de cores do semáforo */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400 pt-1">
        <div className="flex flex-wrap items-center gap-4">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" aria-hidden="true" />
            <span>Ideal ({idealMin}–{idealMax})</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500" aria-hidden="true" />
            <span>Alerta (165–179 ou 216–230)</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-500" aria-hidden="true" />
            <span>Crítico (&lt;165 ou &gt;230)</span>
          </span>
        </div>
        <span className="font-mono tabular-nums text-slate-500">
          Concurso atual: #{latestDraw.concurso}
        </span>
      </div>
    </section>
  );
};
