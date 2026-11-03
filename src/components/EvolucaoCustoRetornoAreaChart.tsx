import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import {
  TrendingUp,
  DollarSign,
  Calendar,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Info,
} from 'lucide-react';
import { GameTicket, LotofacilDraw } from '../types/lotofacil';
import { CONCURSO_ATUAL } from '../data/lotofacilData';
import { countMatches } from '../services/combinatorics';
import { getHistorical100Draws } from '../services/historical100Draws';
import { getSavedFechamentos } from '../services/savedFechamentosStorage';

interface EvolucaoCustoRetornoAreaChartProps {
  tickets?: GameTicket[];
  latestDraw?: LotofacilDraw;
  apostaMinima?: number;
}

export type ViewScope = 'ultimos_10' | 'total_historico';

export const EvolucaoCustoRetornoAreaChart: React.FC<EvolucaoCustoRetornoAreaChartProps> = ({
  tickets = [],
  latestDraw = CONCURSO_ATUAL,
  apostaMinima = 3.5,
}) => {
  const [viewScope, setViewScope] = useState<ViewScope>('ultimos_10');

  // Coleta todos os bilhetes salvos
  const allTickets = useMemo(() => {
    if (tickets && tickets.length > 0) return tickets;
    const saved = getSavedFechamentos();
    const flat = saved.flatMap((f) => f.tickets);
    return flat.length > 0 ? flat : [];
  }, [tickets]);

  // Custo por concurso
  const custoPorConcurso = useMemo(() => {
    if (allTickets.length === 0) return 0;
    return allTickets.reduce((acc, t) => {
      const len = t.dezenas.length;
      if (len === 16) return acc + apostaMinima * 16;
      if (len === 17) return acc + apostaMinima * 136;
      return acc + apostaMinima;
    }, 0);
  }, [allTickets, apostaMinima]);

  // Monta a série temporal dos concursos (em ordem cronológica)
  const chartData = useMemo(() => {
    const historical = getHistorical100Draws(latestDraw);
    const limit = viewScope === 'ultimos_10' ? 10 : historical.length;
    const selectedDraws = historical.slice(0, limit);

    // Reverte para ordem cronológica (concurso mais antigo -> concurso mais recente)
    const chronologicalDraws = [...selectedDraws].reverse();

    let acumuladoCusto = 0;
    let acumuladoRetorno = 0;

    return chronologicalDraws.map((draw) => {
      let concursoRetorno = 0;
      let bilhetesPremiados = 0;

      const p15 = draw.premiacoes?.faixa15?.valor || 1800000;
      const p14 = draw.premiacoes?.faixa14?.valor || 1500;
      const p13 = draw.premiacoes?.faixa13?.valor || 35.0;
      const p12 = draw.premiacoes?.faixa12?.valor || 14.0;
      const p11 = draw.premiacoes?.faixa11?.valor || 7.0;

      allTickets.forEach((t) => {
        const hits = countMatches(t.dezenas, draw.dezenas);
        if (hits === 15) {
          concursoRetorno += p15;
          bilhetesPremiados++;
        } else if (hits === 14) {
          concursoRetorno += p14;
          bilhetesPremiados++;
        } else if (hits === 13) {
          concursoRetorno += p13;
          bilhetesPremiados++;
        } else if (hits === 12) {
          concursoRetorno += p12;
          bilhetesPremiados++;
        } else if (hits === 11) {
          concursoRetorno += p11;
          bilhetesPremiados++;
        }
      });

      acumuladoCusto += custoPorConcurso;
      acumuladoRetorno += concursoRetorno;
      const saldoLiquido = acumuladoRetorno - acumuladoCusto;
      const roiPercent =
        acumuladoCusto > 0 ? ((acumuladoRetorno - acumuladoCusto) / acumuladoCusto) * 100 : 0;

      return {
        concurso: `#${draw.concurso}`,
        concursoNum: draw.concurso,
        data: draw.data,
        custoConcurso: custoPorConcurso,
        custoAcumulado: Math.round(acumuladoCusto * 100) / 100,
        retornoConcurso: concursoRetorno,
        retornoAcumulado: Math.round(acumuladoRetorno * 100) / 100,
        saldoLiquidoAcumulado: Math.round(saldoLiquido * 100) / 100,
        roiPercent: Math.round(roiPercent * 10) / 10,
        bilhetesPremiados,
      };
    });
  }, [latestDraw, viewScope, allTickets, custoPorConcurso]);

  const lastPoint = chartData[chartData.length - 1] || {
    custoAcumulado: 0,
    retornoAcumulado: 0,
    saldoLiquidoAcumulado: 0,
    roiPercent: 0,
  };

  const formatBRL = (val: number) =>
    val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  // Custom Tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;
    const data = payload[0]?.payload;
    if (!data) return null;

    const isPositive = data.saldoLiquidoAcumulado >= 0;

    return (
      <div className="bg-slate-950/95 border border-slate-700 p-3.5 rounded-2xl shadow-2xl text-xs space-y-2 min-w-[240px]">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <strong className="text-white font-bold">{data.concurso}</strong>
          <span className="text-[10px] text-slate-400 font-mono">{data.data}</span>
        </div>

        <div className="space-y-1.5 font-mono text-[11px]">
          <div className="flex items-center justify-between text-amber-400">
            <span>Custo Acumulado:</span>
            <strong>{formatBRL(data.custoAcumulado)}</strong>
          </div>
          <div className="flex items-center justify-between text-emerald-400">
            <span>Retorno Acumulado:</span>
            <strong>{formatBRL(data.retornoAcumulado)}</strong>
          </div>
          <div
            className={`flex items-center justify-between pt-1 border-t border-slate-800 font-bold ${
              isPositive ? 'text-emerald-300' : 'text-rose-400'
            }`}
          >
            <span>Saldo Líquido Acumulado:</span>
            <span>
              {isPositive ? '+' : ''}
              {formatBRL(data.saldoLiquidoAcumulado)}
            </span>
          </div>
          <div className="flex items-center justify-between text-[10px] text-slate-400">
            <span>ROI Acumulado:</span>
            <span className={isPositive ? 'text-emerald-400' : 'text-rose-400'}>
              {isPositive ? '+' : ''}
              {data.roiPercent}%
            </span>
          </div>
        </div>

        <div className="pt-1.5 border-t border-slate-800/80 text-[10px] text-slate-400 flex items-center justify-between">
          <span>Prêmios neste sorteio:</span>
          <span className="font-bold text-white">{formatBRL(data.retornoConcurso)}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-gradient-to-br from-slate-900/95 via-slate-900 to-indigo-950/20 rounded-3xl border-2 border-emerald-500/40 p-5 sm:p-6 shadow-2xl space-y-5 relative overflow-hidden">
      {/* Decorative Glow */}
      <div className="absolute top-0 right-1/4 w-72 h-72 bg-emerald-500/10 blur-3xl pointer-events-none rounded-full" />

      {/* Header and Scope Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800 relative z-10">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-emerald-500/20 shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base sm:text-lg font-black text-white tracking-wide">
                Evolução Histórica: Custo Acumulado vs Retorno Financeiro (ROI)
              </h3>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                RECHARTS • ÁREA DINÂMICA
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
              Curva financeira que demonstra a amortização do investimento e a rentabilidade acumulada dos seus jogos salvos ao longo dos sorteios da Lotofácil.
            </p>
          </div>
        </div>

        {/* Toggle: Últimos 10 concursos vs Total histórico */}
        <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs shrink-0 self-start md:self-center">
          <button
            type="button"
            onClick={() => setViewScope('ultimos_10')}
            className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
              viewScope === 'ultimos_10'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 shadow-sm font-black'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Últimos 10 Concursos
          </button>
          <button
            type="button"
            onClick={() => setViewScope('total_historico')}
            className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
              viewScope === 'total_historico'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 shadow-sm font-black'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Total Histórico (100 Concursos)
          </button>
        </div>
      </div>

      {/* Mini KPIs do Período */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800">
          <span className="text-[10px] text-slate-400 uppercase font-mono block">
            Custo Total no Período
          </span>
          <strong className="text-sm font-black text-amber-400 font-mono">
            {formatBRL(lastPoint.custoAcumulado)}
          </strong>
        </div>

        <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800">
          <span className="text-[10px] text-slate-400 uppercase font-mono block">
            Retorno Bruto Acumulado
          </span>
          <strong className="text-sm font-black text-emerald-400 font-mono">
            {formatBRL(lastPoint.retornoAcumulado)}
          </strong>
        </div>

        <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800">
          <span className="text-[10px] text-slate-400 uppercase font-mono block">
            Saldo Líquido Acumulado
          </span>
          <strong
            className={`text-sm font-black font-mono ${
              lastPoint.saldoLiquidoAcumulado >= 0 ? 'text-emerald-300' : 'text-rose-400'
            }`}
          >
            {lastPoint.saldoLiquidoAcumulado >= 0 ? '+' : ''}
            {formatBRL(lastPoint.saldoLiquidoAcumulado)}
          </strong>
        </div>

        <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800">
          <span className="text-[10px] text-slate-400 uppercase font-mono block">
            ROI Acumulado
          </span>
          <strong
            className={`text-sm font-black font-mono flex items-center gap-1 ${
              lastPoint.roiPercent >= 0 ? 'text-emerald-300' : 'text-rose-400'
            }`}
          >
            {lastPoint.roiPercent >= 0 ? (
              <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400 inline" />
            ) : (
              <ArrowDownRight className="w-3.5 h-3.5 text-rose-400 inline" />
            )}
            {lastPoint.roiPercent >= 0 ? '+' : ''}
            {lastPoint.roiPercent}%
          </strong>
        </div>
      </div>

      {/* Gráfico de Área Recharts */}
      <div className="w-full h-72 sm:h-80 bg-slate-950/80 p-3 rounded-2xl border border-slate-800">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 15, left: 10, bottom: 0 }}>
            <defs>
              {/* Gradiente para Retorno Financeiro Acumulado (Verde / Emerald) */}
              <linearGradient id="colorRetorno" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.6} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
              </linearGradient>

              {/* Gradiente para Custo Acumulado (Âmbar / Laranja) */}
              <linearGradient id="colorCusto" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.5} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
              </linearGradient>

              {/* Gradiente para Saldo Líquido */}
              <linearGradient id="colorSaldo" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />

            <XAxis
              dataKey="concurso"
              stroke="#64748b"
              tick={{ fill: '#94a3b8', fontSize: 10 }}
              tickLine={{ stroke: '#334155' }}
            />

            <YAxis
              stroke="#64748b"
              tick={{ fill: '#94a3b8', fontSize: 10 }}
              tickLine={{ stroke: '#334155' }}
              tickFormatter={(v) => `R$ ${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
            />

            <Tooltip content={<CustomTooltip />} />

            <Legend
              wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
              formatter={(value) => {
                if (value === 'retornoAcumulado') return 'Retorno Financeiro Acumulado (R$)';
                if (value === 'custoAcumulado') return 'Custo Total Acumulado (R$)';
                if (value === 'saldoLiquidoAcumulado') return 'Saldo Líquido Acumulado (R$)';
                return value;
              }}
            />

            {/* Área de Custo Acumulado */}
            <Area
              type="monotone"
              dataKey="custoAcumulado"
              name="custoAcumulado"
              stroke="#f59e0b"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorCusto)"
            />

            {/* Área de Retorno Financeiro Acumulado */}
            <Area
              type="monotone"
              dataKey="retornoAcumulado"
              name="retornoAcumulado"
              stroke="#10b981"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#colorRetorno)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
        <span>
          Amostra: <strong>{chartData.length} concursos analisados</strong>
        </span>
        <span className="text-emerald-400 font-bold">
          {viewScope === 'ultimos_10' ? 'Visualização Curto Prazo' : 'Série Histórica Integral'}
        </span>
      </div>
    </div>
  );
};
