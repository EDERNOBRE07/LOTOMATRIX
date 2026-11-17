import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { TrendingUp, Layers, Target } from 'lucide-react';
import { GameTicket, LotofacilDraw, DezenaStats } from '../types/lotofacil';
import { CONCURSO_ATUAL, DEZENAS_STATS, MOLDURA } from '../data/lotofacilData';
import { buildOptimal18Pool, countMatches } from '../services/combinatorics';
import { getHistoricalNDraws } from '../services/historical100Draws';

interface HistoricoAcertosAcumuladosChartProps {
  latestDraw?: LotofacilDraw;
  savedTickets?: GameTicket[];
  statsList?: DezenaStats[];
}

type AcertosViewMode = 'todas' | 'moldura';

interface AcertosPoint30 {
  concurso: number;
  label: string;
  data: string;
  acertosNoConcurso: number;
  acertosMolduraNoConcurso: number;
  acumuladoTodas: number;
  acumuladoMoldura: number;
  esperadoTodasAcumulado: number;
  esperadoMolduraAcumulado: number;
  molduraSorteadas: number;
}

export const HistoricoAcertosAcumuladosChart: React.FC<HistoricoAcertosAcumuladosChartProps> = ({
  latestDraw = CONCURSO_ATUAL,
  savedTickets = [],
  statsList = DEZENAS_STATS,
}) => {
  const [viewMode, setViewMode] = useState<AcertosViewMode>('todas');

  // Bilhetes avaliados: usa bilhetes salvos do usuário; se vazio, usa o volante referência IA 15 Ouro
  const targetTickets = useMemo<GameTicket[]>(() => {
    if (savedTickets && savedTickets.length > 0) {
      return savedTickets;
    }
    const optimal15 = buildOptimal18Pool(latestDraw, statsList, [], 9, 9)
      .dezenas18.slice(0, 15)
      .sort((a, b) => a - b);
    return [
      {
        id: 'ref-ia-15',
        index: 1,
        dezenas: optimal15,
        pares: optimal15.filter((n) => n % 2 === 0).length,
        impares: 15 - optimal15.filter((n) => n % 2 === 0).length,
        primos: 5,
        soma: optimal15.reduce((a, b) => a + b, 0),
        moldura: optimal15.filter((n) => MOLDURA.includes(n)).length,
        miolo: 15 - optimal15.filter((n) => MOLDURA.includes(n)).length,
        fibonacci: 4,
        repetidas: 9,
        maxConsecutivas: 4,
        scoreIA: 92,
      },
    ];
  }, [savedTickets, latestDraw, statsList]);

  const isUsingSavedTickets = savedTickets && savedTickets.length > 0;

  // Calcula acertos acumulados ao longo dos últimos 30 concursos (cronológico)
  const chartData = useMemo<AcertosPoint30[]>(() => {
    const draws30 = getHistoricalNDraws(30, latestDraw).slice().reverse();
    let runningTodas = 0;
    let runningMoldura = 0;

    return draws30.map((draw, idx) => {
      const drawnMoldura = draw.dezenas.filter((n) => MOLDURA.includes(n));

      // Para múltiplos bilhetes, toma o melhor acerto do concurso (desempenho de cobertura do jogo)
      let bestTodas = 0;
      let bestMoldura = 0;

      for (const ticket of targetTickets) {
        const hitsT = countMatches(ticket.dezenas, draw.dezenas);
        if (hitsT > bestTodas) bestTodas = hitsT;

        const ticketMoldura = ticket.dezenas.filter((n) => MOLDURA.includes(n));
        const hitsM = countMatches(ticketMoldura, drawnMoldura);
        if (hitsM > bestMoldura) bestMoldura = hitsM;
      }

      runningTodas += bestTodas;
      runningMoldura += bestMoldura;

      return {
        concurso: draw.concurso,
        label: `#${draw.concurso}`,
        data: draw.data,
        acertosNoConcurso: bestTodas,
        acertosMolduraNoConcurso: bestMoldura,
        acumuladoTodas: runningTodas,
        acumuladoMoldura: runningMoldura,
        esperadoTodasAcumulado: Math.round(9.0 * (idx + 1)), // Média aleatória 15*15/25 = 9.0
        esperadoMolduraAcumulado: Math.round(5.76 * (idx + 1)), // Média aleatória moldura = 9.6 * (15/25) = 5.76
        molduraSorteadas: drawnMoldura.length,
      };
    });
  }, [latestDraw, targetTickets]);

  const summary = useMemo(() => {
    const last = chartData[chartData.length - 1];
    if (!last) {
      return {
        totalAcumulado: 0,
        mediaPorConcurso: 0,
        melhorConcursoHits: 0,
        melhorConcursoNum: latestDraw.concurso,
        esperadoTotal: 0,
      };
    }

    const totalAcumulado =
      viewMode === 'todas' ? last.acumuladoTodas : last.acumuladoMoldura;
    const esperadoTotal =
      viewMode === 'todas' ? last.esperadoTodasAcumulado : last.esperadoMolduraAcumulado;
    const mediaPorConcurso = Number((totalAcumulado / Math.max(1, chartData.length)).toFixed(2));

    const sortedBest = [...chartData].sort((a, b) => {
      const ha = viewMode === 'todas' ? a.acertosNoConcurso : a.acertosMolduraNoConcurso;
      const hb = viewMode === 'todas' ? b.acertosNoConcurso : b.acertosMolduraNoConcurso;
      return hb - ha || b.concurso - a.concurso;
    });

    const best = sortedBest[0];
    return {
      totalAcumulado,
      mediaPorConcurso,
      melhorConcursoHits:
        viewMode === 'todas' ? best.acertosNoConcurso : best.acertosMolduraNoConcurso,
      melhorConcursoNum: best.concurso,
      esperadoTotal,
    };
  }, [chartData, viewMode, latestDraw.concurso]);

  const activeDataKey = viewMode === 'todas' ? 'acumuladoTodas' : 'acumuladoMoldura';
  const expectedDataKey =
    viewMode === 'todas' ? 'esperadoTodasAcumulado' : 'esperadoMolduraAcumulado';

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || payload.length === 0) return null;
    const pt: AcertosPoint30 = payload[0].payload;
    const hitsNow =
      viewMode === 'todas' ? pt.acertosNoConcurso : pt.acertosMolduraNoConcurso;
    const acumNow = viewMode === 'todas' ? pt.acumuladoTodas : pt.acumuladoMoldura;
    const expNow =
      viewMode === 'todas' ? pt.esperadoTodasAcumulado : pt.esperadoMolduraAcumulado;

    return (
      <div className="bg-slate-950/95 border border-slate-700 rounded-xl p-3 shadow-2xl text-xs space-y-1.5 min-w-[225px]">
        <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-1">
          <span className="font-mono font-bold text-white">Concurso {pt.label}</span>
          <span className="font-mono text-[11px] text-slate-400">{pt.data}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-400">
            {viewMode === 'todas' ? 'Acertos no Concurso:' : 'Acertos na Moldura:'}
          </span>
          <strong className="font-mono tabular-nums text-emerald-400">
            {hitsNow} {viewMode === 'todas' ? '/ 15' : `/ ${pt.molduraSorteadas}`}
          </strong>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-400">Acertos Acumulados:</span>
          <strong className="font-mono tabular-nums text-white">{acumNow} pts</strong>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-400">Referência Aleatória:</span>
          <strong className="font-mono tabular-nums text-amber-300">{expNow} pts</strong>
        </div>
      </div>
    );
  };

  return (
    <section
      aria-label="Histórico de Acertos Acumulados nos Últimos 30 Concursos"
      className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-5"
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
            <TrendingUp className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Curva de Acertos Acumulados</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">Últimos 30 Concursos</span>
            <span aria-hidden="true">·</span>
            <span>
              {isUsingSavedTickets
                ? `${targetTickets.length} bilhete(s) salvo(s)`
                : 'Volante Referência IA (15 dez.)'}
            </span>
          </div>
          <h3 className="text-base sm:text-lg font-bold text-white">
            Histórico de Acertos Acumulados (30 Concursos)
          </h3>
          <p className="text-xs text-slate-400 max-w-2xl">
            Evolução acumulada de acertos ao longo dos últimos 30 sorteios, comparando a performance real frente à expectativa matemática aleatória.
          </p>
        </div>

        {/* Seletor: Todas as Dezenas vs Dezenas da Moldura */}
        <div className="inline-flex items-center p-1 bg-slate-950 border border-slate-800 rounded-xl shrink-0 self-start lg:self-center">
          <button
            type="button"
            onClick={() => setViewMode('todas')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition cursor-pointer whitespace-nowrap shrink-0 ${
              viewMode === 'todas'
                ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Target className="w-3.5 h-3.5" />
            <span>Todas as Dezenas</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('moldura')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition cursor-pointer whitespace-nowrap shrink-0 ${
              viewMode === 'moldura'
                ? 'bg-amber-400 text-slate-950 font-bold shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Dezenas da Moldura</span>
          </button>
        </div>
      </div>

      {/* KPIs do Período */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-slate-950/75 border border-slate-800 rounded-xl p-3.5 space-y-1">
          <span className="text-xs text-slate-400 block">
            Acertos Acumulados ({viewMode === 'todas' ? 'Todas' : 'Moldura'})
          </span>
          <div className="flex items-baseline justify-between">
            <strong className="text-2xl font-mono font-bold tabular-nums text-emerald-400">
              {summary.totalAcumulado}
            </strong>
            <span className="text-xs font-mono text-slate-400 tabular-nums">
              Meta aleatória: {summary.esperadoTotal}
            </span>
          </div>
        </div>

        <div className="bg-slate-950/75 border border-slate-800 rounded-xl p-3.5 space-y-1">
          <span className="text-xs text-slate-400 block">Média de Acertos / Concurso</span>
          <div className="flex items-baseline justify-between">
            <strong className="text-2xl font-mono font-bold tabular-nums text-white">
              {summary.mediaPorConcurso.toFixed(2)}
            </strong>
            <span className="text-xs font-mono text-slate-400 tabular-nums">
              {viewMode === 'todas' ? 'de 15 pts' : 'na moldura'}
            </span>
          </div>
        </div>

        <div className="bg-slate-950/75 border border-slate-800 rounded-xl p-3.5 space-y-1">
          <span className="text-xs text-slate-400 block">Melhor Marca nos 30 Concursos</span>
          <div className="flex items-baseline justify-between">
            <strong className="text-2xl font-mono font-bold tabular-nums text-amber-300">
              {summary.melhorConcursoHits} pts
            </strong>
            <span className="text-xs font-mono text-slate-400 tabular-nums">
              Concurso #{summary.melhorConcursoNum}
            </span>
          </div>
        </div>
      </div>

      {/* Recharts LineChart */}
      <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="font-semibold text-slate-200">
            {viewMode === 'todas'
              ? 'Curva Acumulada • Todas as 15 Dezenas Sorteadas'
              : 'Curva Acumulada • Apenas Dezenas da Moldura (16 externas)'}
          </span>
          <div className="flex items-center gap-4 text-[11px] text-slate-400">
            <span className="inline-flex items-center gap-1.5">
              <span
                className={`w-3 h-0.5 inline-block ${
                  viewMode === 'todas' ? 'bg-emerald-400' : 'bg-amber-400'
                }`}
              />
              <span>Acertos Acumulados</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-0.5 border-t border-dashed border-slate-400 inline-block" />
              <span>Referência Aleatória</span>
            </span>
          </div>
        </div>

        <div className="w-full h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 16, left: -6, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis
                dataKey="label"
                stroke="#64748b"
                interval={3}
                tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}
              />
              <YAxis
                stroke="#64748b"
                tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey={expectedDataKey}
                name="Referência Aleatória"
                stroke="#64748b"
                strokeDasharray="4 4"
                strokeWidth={1.75}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey={activeDataKey}
                name="Acertos Acumulados"
                stroke={viewMode === 'todas' ? '#10b981' : '#f59e0b'}
                strokeWidth={3}
                dot={{
                  r: 2.5,
                  fill: viewMode === 'todas' ? '#10b981' : '#f59e0b',
                  strokeWidth: 0,
                }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
};
