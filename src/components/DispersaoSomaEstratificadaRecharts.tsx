import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceArea,
  ReferenceLine,
  Cell,
} from 'recharts';
import { GameTicket } from '../types/lotofacil';
import { getSavedFechamentos } from '../services/savedFechamentosStorage';
import { Shield, Sparkles, Filter, Target } from 'lucide-react';

interface DispersaoSomaEstratificadaProps {
  tickets?: GameTicket[];
  title?: string;
}

interface ScatterPoint {
  id: string;
  index: number;
  soma: number;
  pares: number;
  impares: number;
  primos: number;
  moldura: number;
  dezenas: number[];
  categoria: 'gold' | 'cauda_baixa' | 'cauda_alta' | 'fora';
}

export const DispersaoSomaEstratificadaRecharts: React.FC<DispersaoSomaEstratificadaProps> = ({
  tickets: propTickets,
  title = 'Dispersão de Somas da Matriz Estratificada (Anti-Cisne Negro)',
}) => {
  // Resolve tickets: propTickets se houver, ou dos tickets ativos/salvos no localStorage
  const ticketsToUse = useMemo(() => {
    if (propTickets && propTickets.length > 0) return propTickets;
    try {
      const activeRaw = localStorage.getItem('lotosniper_saved_tickets');
      if (activeRaw) {
        const parsed = JSON.parse(activeRaw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {}
    const saved = getSavedFechamentos();
    if (saved && saved.length > 0 && saved[0].tickets?.length > 0) {
      return saved[0].tickets;
    }
    // Fallback: se nenhum jogo gerado ainda, gera amostra representativa de 20 bilhetes
    const sample: GameTicket[] = [];
    const basePares = [182, 195, 203, 188, 209, 191, 184, 212, 199, 190, 205, 187, 201, 194, 208]; // 75% Gold
    const baseBaixa = [161, 168, 174]; // 15% Cauda Baixa
    const baseAlta = [218, 224]; // 10% Cauda Alta
    [...basePares, ...baseBaixa, ...baseAlta].forEach((soma, i) => {
      sample.push({
        id: `sample-${i + 1}`,
        index: i + 1,
        dezenas: [1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 22, 23, 24, 25],
        soma,
        pares: 7,
        impares: 8,
        primos: 6,
        moldura: 10,
        miolo: 5,
        fibonacci: 4,
        repetidas: 9,
        maxConsecutivas: 4,
        scoreIA: 94,
        faixaSoma: soma >= 180 && soma <= 215 ? 'ouro' : soma < 180 ? 'baixa' : 'alta',
      });
    });
    return sample;
  }, [propTickets]);

  const { points, stats } = useMemo(() => {
    let goldCount = 0;
    let baixaCount = 0;
    let altaCount = 0;
    let foraCount = 0;

    const pts: ScatterPoint[] = ticketsToUse.map((t, idx) => {
      const dezenas: number[] = t.dezenas || (t as any).numbers || [];
      const soma = t.soma ?? dezenas.reduce((a: number, b: number) => a + b, 0);
      let cat: 'gold' | 'cauda_baixa' | 'cauda_alta' | 'fora' = 'fora';

      if (soma >= 180 && soma <= 215) {
        cat = 'gold';
        goldCount++;
      } else if (soma >= 155 && soma < 180) {
        cat = 'cauda_baixa';
        baixaCount++;
      } else if (soma > 215 && soma <= 230) {
        cat = 'cauda_alta';
        altaCount++;
      } else {
        foraCount++;
      }

      return {
        id: t.id || `t-${idx + 1}`,
        index: idx + 1,
        soma,
        pares: t.pares ?? dezenas.filter((d: number) => d % 2 === 0).length,
        impares: t.impares ?? dezenas.filter((d: number) => d % 2 !== 0).length,
        primos: t.primos ?? 6,
        moldura: t.moldura ?? 10,
        dezenas,
        categoria: cat,
      };
    });

    const total = pts.length || 1;
    return {
      points: pts,
      stats: {
        total: pts.length,
        goldCount,
        goldPct: Math.round((goldCount / total) * 100),
        baixaCount,
        baixaPct: Math.round((baixaCount / total) * 100),
        altaCount,
        altaPct: Math.round((altaCount / total) * 100),
        foraCount,
      },
    };
  }, [ticketsToUse]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <Shield className="w-4 h-4" />
            </span>
            <h3 className="text-sm font-bold text-white tracking-wide">{title}</h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
              75% / 15% / 10%
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Distribuição de bilhetes entre a Zona de Ouro (180–215), Proteção de Cauda Baixa (155–179) e Cauda Alta (216–230).
          </p>
        </div>

        {/* Badges de Estratificação */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="px-2.5 py-1 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-center">
            <span className="text-[9px] text-emerald-400 block font-semibold">Núcleo Central (75%)</span>
            <span className="text-xs font-mono font-bold text-emerald-300">
              {stats.goldCount} jogos ({stats.goldPct}%)
            </span>
          </div>
          <div className="px-2.5 py-1 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-center">
            <span className="text-[9px] text-cyan-400 block font-semibold">Cauda Baixa (15%)</span>
            <span className="text-xs font-mono font-bold text-cyan-300">
              {stats.baixaCount} jogos ({stats.baixaPct}%)
            </span>
          </div>
          <div className="px-2.5 py-1 rounded-xl bg-amber-500/15 border border-amber-500/30 text-center">
            <span className="text-[9px] text-amber-400 block font-semibold">Cauda Alta (10%)</span>
            <span className="text-xs font-mono font-bold text-amber-300">
              {stats.altaCount} jogos ({stats.altaPct}%)
            </span>
          </div>
        </div>
      </div>

      {/* Gráfico Recharts Scatter */}
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.35} />

            {/* Zonas de Referência Coloridas */}
            <ReferenceArea
              y1={155}
              y2={179}
              fill="#06b6d4"
              fillOpacity={0.12}
              stroke="#0891b2"
              strokeDasharray="3 3"
              label={{
                value: 'Proteção Cauda Baixa (155–179)',
                position: 'insideTopLeft',
                fill: '#22d3ee',
                fontSize: 10,
                fontWeight: 600,
              }}
            />
            <ReferenceArea
              y1={180}
              y2={215}
              fill="#10b981"
              fillOpacity={0.15}
              stroke="#059669"
              label={{
                value: 'Zona de Ouro (180–215) • Núcleo Central',
                position: 'insideTopLeft',
                fill: '#34d399',
                fontSize: 10,
                fontWeight: 700,
              }}
            />
            <ReferenceArea
              y1={216}
              y2={230}
              fill="#f59e0b"
              fillOpacity={0.12}
              stroke="#d97706"
              strokeDasharray="3 3"
              label={{
                value: 'Proteção Cauda Alta (216–230)',
                position: 'insideTopLeft',
                fill: '#fbbf24',
                fontSize: 10,
                fontWeight: 600,
              }}
            />

            {/* Linha de referência da média histórica (195) */}
            <ReferenceLine
              y={195}
              stroke="#f59e0b"
              strokeDasharray="4 4"
              strokeWidth={1.5}
              label={{
                value: 'Soma Média Histórica (195)',
                position: 'right',
                fill: '#f59e0b',
                fontSize: 10,
              }}
            />

            <XAxis
              type="number"
              dataKey="index"
              name="Jogo Nº"
              domain={[1, Math.max(points.length + 1, 10)]}
              stroke="#94a3b8"
              fontSize={11}
              tickLine={false}
              unit="º"
            />
            <YAxis
              type="number"
              dataKey="soma"
              name="Soma"
              domain={[140, 240]}
              ticks={[140, 155, 170, 180, 195, 210, 215, 230, 240]}
              stroke="#94a3b8"
              fontSize={11}
              tickLine={false}
            />

            <Tooltip
              cursor={{ strokeDasharray: '3 3', stroke: '#cbd5e1' }}
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const pt = payload[0].payload as ScatterPoint;
                  return (
                    <div className="bg-slate-950 border border-slate-700 rounded-xl p-3 shadow-2xl text-xs space-y-1.5 min-w-[200px]">
                      <div className="flex items-center justify-between font-bold text-white border-b border-slate-800 pb-1">
                        <span>Bilhete #{pt.index}</span>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                            pt.categoria === 'gold'
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : pt.categoria === 'cauda_baixa'
                              ? 'bg-cyan-500/20 text-cyan-300'
                              : pt.categoria === 'cauda_alta'
                              ? 'bg-amber-500/20 text-amber-300'
                              : 'bg-rose-500/20 text-rose-300'
                          }`}
                        >
                          {pt.categoria === 'gold'
                            ? 'NÚCLEO (75%)'
                            : pt.categoria === 'cauda_baixa'
                            ? 'CAUDA BAIXA (15%)'
                            : pt.categoria === 'cauda_alta'
                            ? 'CAUDA ALTA (10%)'
                            : 'FORA'}
                        </span>
                      </div>
                      <div className="text-slate-300">
                        Soma Total: <strong className="text-amber-400 font-mono">{pt.soma}</strong>
                      </div>
                      <div className="text-slate-300">
                        Paridade: <span className="font-mono">{pt.pares}P / {pt.impares}I</span>
                      </div>
                      {pt.dezenas && pt.dezenas.length > 0 && (
                        <div className="pt-1 text-[10px] text-slate-400">
                          Dezenas: {pt.dezenas.map((d) => d.toString().padStart(2, '0')).join(' ')}
                        </div>
                      )}
                    </div>
                  );
                }
                return null;
              }}
            />

            <Scatter name="Bilhetes" data={points}>
              {points.map((pt, i) => {
                const fill =
                  pt.categoria === 'gold'
                    ? '#10b981'
                    : pt.categoria === 'cauda_baixa'
                    ? '#06b6d4'
                    : pt.categoria === 'cauda_alta'
                    ? '#f59e0b'
                    : '#f43f5e';
                return <Cell key={`cell-${i}`} fill={fill} stroke="#0f172a" strokeWidth={1.5} />;
              })}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      {/* Explicação da Estrutura Anti-Cisne Negro */}
      <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl text-xs text-slate-300 flex items-start gap-2.5">
        <Target className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
        <div>
          <strong className="text-white">Blindagem contra o Concurso #3825:</strong>
          <span className="text-slate-400 ml-1">
            Quando o concurso concentra dezenas baixas (ex: 8 consecutivas de 03 a 10 e soma 161), os 15% de cartões na Cauda Baixa capturam a premiação sem inflar artificialmente todo o fechamento.
          </span>
        </div>
      </div>
    </div>
  );
};
