import React, { useState, useMemo } from 'react';
import { LotofacilDraw, DezenaStats } from '../types/lotofacil';
import { CONCURSO_ATUAL, RECENT_DRAWS, DEZENAS_STATS } from '../data/lotofacilData';
import { ExpertTip } from './ExpertTip';
import {
  Flame,
  Zap,
  TrendingUp,
  Activity,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Award,
  Sparkles,
  Sliders,
  Layers,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  Cell,
} from 'recharts';

export interface DezenaEMAMetric {
  numero: number;
  emaScore: number; // 0.0 to 1.0
  medidorForca: number; // 1 to 100
  momentumDelta: number; // EMA rápida - EMA lenta (positivo = acelerando)
  atrasoAtual: number;
  frequenciaRecente5: number; // saídas nos últimos 5 sorteios
  probabilidadeProximos5: number; // % estimada de aparecer nos próximos 5
  classificacao: 'hiper_aquecida' | 'expansao_rapida' | 'estavel' | 'desaquecida';
}

interface RadarTendenciasQuentesProps {
  latestDraw?: LotofacilDraw;
  statsList?: DezenaStats[];
  onApplyNumbers?: (numbers: number[]) => void;
}

export const RadarTendenciasQuentesComponent: React.FC<RadarTendenciasQuentesProps> = ({
  latestDraw = CONCURSO_ATUAL,
  statsList = DEZENAS_STATS,
  onApplyNumbers,
}) => {
  const [periodoEMA, setPeriodoEMA] = useState<number>(7); // Janela da Média Móvel Exponencial
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  // Histórico de sorteios ordenado cronologicamente (do mais antigo para o mais recente)
  const drawsChronological = useMemo(() => {
    const list = [latestDraw];
    RECENT_DRAWS.forEach((d) => {
      if (!list.some((existing) => existing.concurso === d.concurso)) {
        list.push(d);
      }
    });
    return list.slice(0, 30).reverse(); // últimos 30 concursos em ordem temporal
  }, [latestDraw]);

  // Cálculo da Média Móvel Exponencial (EMA) e Força (1 a 100) para cada uma das 25 dezenas
  const rankingEMA = useMemo<DezenaEMAMetric[]>(() => {
    const alphaFast = 2 / (periodoEMA + 1); // Alpha da EMA Rápida
    const alphaSlow = 2 / (periodoEMA * 2 + 1); // Alpha da EMA Lenta (para momentum MACD)

    const result: DezenaEMAMetric[] = [];

    for (let num = 1; num <= 25; num++) {
      let emaFast = 0.6; // Baseline inicial (média histórica de 60%)
      let emaSlow = 0.6;
      let countLast5 = 0;

      // Itera nos concursos cronológicos
      drawsChronological.forEach((draw, idx) => {
        const isPresent = draw.dezenas.includes(num) ? 1 : 0;
        emaFast = alphaFast * isPresent + (1 - alphaFast) * emaFast;
        emaSlow = alphaSlow * isPresent + (1 - alphaSlow) * emaSlow;

        if (idx >= drawsChronological.length - 5 && isPresent) {
          countLast5++;
        }
      });

      const momentumDelta = Number((emaFast - emaSlow).toFixed(3));
      const st = statsList.find((s) => s.numero === num);
      const atraso = st ? st.atrasoAtual : latestDraw.dezenas.includes(num) ? 0 : 1;

      // Medidor de Força (1 a 100) ponderado:
      // - 50% pelo nível da EMA recente
      // - 30% pelo momentum de aceleração
      // - 20% pelo peso de presença nos últimos 5 sorteios e atraso
      let forcaRaw = emaFast * 65 + momentumDelta * 80 + (countLast5 / 5) * 20;

      // Penalidade de atraso longo, mas bonificação se for atraso de rebatida (atraso 1-2)
      if (atraso === 0) forcaRaw += 6;
      else if (atraso === 1) forcaRaw += 4;
      else if (atraso >= 4) forcaRaw -= atraso * 2.5;

      const medidorForca = Math.min(99, Math.max(12, Math.round(forcaRaw)));
      const probabilidadeProximos5 = Math.min(98, Math.max(30, Math.round(medidorForca * 0.92 + 6)));

      let classificacao: 'hiper_aquecida' | 'expansao_rapida' | 'estavel' | 'desaquecida' = 'estavel';
      if (medidorForca >= 85) classificacao = 'hiper_aquecida';
      else if (medidorForca >= 70) classificacao = 'expansao_rapida';
      else if (medidorForca <= 45) classificacao = 'desaquecida';

      result.push({
        numero: num,
        emaScore: Number(emaFast.toFixed(3)),
        medidorForca,
        momentumDelta,
        atrasoAtual: atraso,
        frequenciaRecente5: countLast5,
        probabilidadeProximos5,
        classificacao,
      });
    }

    // Ordena do mais forte para o mais fraco
    return result.sort((a, b) => b.medidorForca - a.medidorForca);
  }, [drawsChronological, periodoEMA, statsList, latestDraw]);

  // As 3 dezenas com maior probabilidade de saída nos próximos 5 concursos
  const top3Quentes = useMemo(() => {
    return rankingEMA.slice(0, 3);
  }, [rankingEMA]);

  // Top 18 dezenas quentes para aplicação rápida no fechamento
  const top18Dezenas = useMemo(() => {
    return rankingEMA.slice(0, 18).map((d) => d.numero).sort((a, b) => a - b);
  }, [rankingEMA]);

  const handleApply = (nums: number[], label: string) => {
    if (onApplyNumbers) {
      onApplyNumbers(nums);
      setFeedbackMsg(`✓ ${label} aplicadas com sucesso no Fechamento!`);
      setTimeout(() => setFeedbackMsg(null), 4000);
    }
  };

  return (
    <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-5 sm:p-6 shadow-xl space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-gradient-to-tr from-rose-500/20 via-amber-500/20 to-orange-500/20 border border-amber-500/40 text-amber-300">
            <Flame className="w-6 h-6 fill-current animate-pulse text-rose-400" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2 flex-wrap">
              <span>RADAR DE TENDÊNCIAS QUENTES (ALGORITMO EMA)</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 uppercase font-bold">
                MÉDIA MÓVEL EXPONENCIAL
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Identifica com precisão estocástica as 3 dezenas em maior ascensão térmica para os próximos 5 concursos, calculando medidor de força (1 a 100).
            </p>
          </div>
        </div>

        {/* Quick action: Aplicar Top 18 */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            type="button"
            onClick={() => handleApply(top18Dezenas, 'Top 18 Dezenas Quentes (Radar EMA)')}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-orange-400 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-slate-950 font-black text-xs transition cursor-pointer shadow-lg shadow-orange-500/20 flex items-center gap-2"
          >
            <Zap className="w-4 h-4 fill-current" />
            <span>APLICAR TOP 18 NO FECHAMENTO</span>
          </button>
        </div>
      </div>

      {feedbackMsg && (
        <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold text-xs flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {/* DESTAQUE PRINCIPAL: AS 3 DEZENAS COM MAIOR PROBABILIDADE NOS PRÓXIMOS 5 CONCURSOS */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-400" />
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Top 3 Dezenas em Hiper-Tendência (Próximos 5 Concursos)
            </h4>
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            Algoritmo EMA ponderado por momentum e rebatida
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {top3Quentes.map((item, index) => {
            const positionBadge = index === 0 ? '1º LUGAR' : index === 1 ? '2º LUGAR' : '3º LUGAR';
            const ringColor = index === 0 ? 'border-amber-400/80 shadow-amber-500/20' : index === 1 ? 'border-orange-400/70 shadow-orange-500/20' : 'border-rose-400/70 shadow-rose-500/20';

            return (
              <div
                key={item.numero}
                className={`bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 p-5 rounded-2xl border-2 ${ringColor} shadow-xl flex flex-col justify-between space-y-4 relative overflow-hidden`}
              >
                {/* Glow ambient background */}
                <div className="absolute -top-10 -right-10 w-28 h-28 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-mono font-black px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                      {positionBadge}
                    </span>
                    <h5 className="text-sm font-bold text-slate-300 mt-2">Dezena Favorita</h5>
                  </div>

                  <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 text-slate-950 font-mono text-3xl font-black shadow-lg">
                    {String(item.numero).padStart(2, '0')}
                  </div>
                </div>

                {/* Medidor de Força (1 a 100) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-semibold flex items-center gap-1">
                      <Zap className="w-3.5 h-3.5 text-amber-400" />
                      <span>Medidor de Força:</span>
                    </span>
                    <strong className="font-mono text-base font-black text-amber-300">
                      {item.medidorForca} <span className="text-xs text-slate-500">/ 100</span>
                    </strong>
                  </div>

                  {/* Barra do Medidor de Força */}
                  <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 transition-all duration-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]"
                      style={{ width: `${item.medidorForca}%` }}
                    />
                  </div>
                </div>

                {/* Telemetria do Algoritmo EMA */}
                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono pt-1 border-t border-slate-800">
                  <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-850">
                    <span className="text-slate-500 text-[10px] block">Prob. 5 Concursos</span>
                    <strong className="text-emerald-400 text-xs">{item.probabilidadeProximos5}%</strong>
                  </div>

                  <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-850">
                    <span className="text-slate-500 text-[10px] block">Últimos 5 Sorteios</span>
                    <strong className="text-white text-xs">{item.frequenciaRecente5}x de 5</strong>
                  </div>

                  <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-850">
                    <span className="text-slate-500 text-[10px] block">Atraso Atual</span>
                    <strong className="text-amber-400 text-xs">{item.atrasoAtual} conc.</strong>
                  </div>

                  <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-850">
                    <span className="text-slate-500 text-[10px] block">Score EMA</span>
                    <strong className="text-cyan-400 text-xs">{item.emaScore}</strong>
                  </div>
                </div>

                {/* Botão de Fixação Direta */}
                <button
                  type="button"
                  onClick={() => handleApply([item.numero], `Dezena Quente ${String(item.numero).padStart(2, '0')}`)}
                  className="w-full py-2 rounded-xl bg-slate-800 hover:bg-amber-500 text-slate-200 hover:text-slate-950 font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <span>Fixar Dezena {String(item.numero).padStart(2, '0')}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Gráfico Comparativo do Medidor de Força das 25 Dezenas (Recharts) */}
      <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-slate-800 gap-2">
          <div>
            <h4 className="font-mono font-bold text-white text-xs uppercase tracking-wider flex items-center gap-2">
              <Activity className="w-4 h-4 text-rose-400" />
              <span>Medidor de Força EMA (1 a 100) para todas as 25 Dezenas</span>
            </h4>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Identificação visual da linha de corte: dezenas acima de 70 pontos compõem o grupo ideal de fechamento.
            </p>
          </div>

          <div className="flex items-center gap-3 text-[11px] font-mono">
            <span className="flex items-center gap-1.5 text-rose-400 font-bold">
              <span className="w-2.5 h-2.5 rounded-sm bg-rose-500" />
              <span>Hiper-Aquecida (&gt;85)</span>
            </span>
            <span className="flex items-center gap-1.5 text-amber-400 font-bold">
              <span className="w-2.5 h-2.5 rounded-sm bg-amber-500" />
              <span>Expansão Rápida (70-84)</span>
            </span>
          </div>
        </div>

        <div className="h-60 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={[...rankingEMA].sort((a, b) => a.numero - b.numero)}
              margin={{ top: 10, right: 10, left: -20, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis
                dataKey="numero"
                stroke="#64748b"
                tickFormatter={(val) => String(val).padStart(2, '0')}
                tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'monospace' }}
              />
              <YAxis
                domain={[0, 100]}
                stroke="#64748b"
                tick={{ fill: '#94a3b8', fontSize: 10, fontFamily: 'monospace' }}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload as DezenaEMAMetric;
                    return (
                      <div className="bg-slate-900 border border-slate-700 p-3 rounded-xl shadow-xl text-xs space-y-1 font-sans">
                        <div className="font-bold text-white border-b border-slate-800 pb-1 flex justify-between gap-3">
                          <span className="font-mono">Dezena {String(d.numero).padStart(2, '0')}</span>
                          <span className="text-[10px] font-mono font-bold text-amber-400">
                            Força: {d.medidorForca}/100
                          </span>
                        </div>
                        <div className="text-slate-300">
                          Score EMA: <strong className="text-white font-mono">{d.emaScore}</strong>
                        </div>
                        <div className="text-slate-300">
                          Probabilidade 5 Concursos:{' '}
                          <strong className="text-emerald-400 font-mono">{d.probabilidadeProximos5}%</strong>
                        </div>
                        <div className="text-slate-300">
                          Atraso Atual: <strong className="text-amber-300 font-mono">{d.atrasoAtual} conc.</strong>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <ReferenceLine
                y={70}
                stroke="#f59e0b"
                strokeDasharray="4 4"
                label={{ value: 'Corte Quente (70 pts)', fill: '#fbbf24', fontSize: 10, position: 'right' }}
              />
              <Bar dataKey="medidorForca" radius={[4, 4, 0, 0]}>
                {[...rankingEMA].sort((a, b) => a.numero - b.numero).map((entry) => {
                  let fill = '#3b82f6';
                  if (entry.classificacao === 'hiper_aquecida') fill = '#f43f5e';
                  else if (entry.classificacao === 'expansao_rapida') fill = '#f59e0b';
                  else if (entry.classificacao === 'desaquecida') fill = '#475569';
                  else fill = '#10b981';
                  return <Cell key={`cell-${entry.numero}`} fill={fill} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Dica Especialista em EMA */}
      <ExpertTip
        title="O Algoritmo de Média Móvel Exponencial (EMA) na Lotofácil"
        ruleCategory="Modelagem Estocástica de Tendências"
        impact14Pontos="A Média Móvel Exponencial atribui pesos exponencialmente maiores aos sorteios mais recentes (#3811, #3810, #3809) em comparação a uma média móvel simples. Isso captura mudanças de regime térmico e aceleração de dezenas antes que elas atinjam saturação."
        recommendation="Monte sua base de 18 dezenas selecionando obrigatoriamente as Top 3 do medidor de força como espinha dorsal, complementando com 15 dezenas com força superior a 65 pontos."
        badgeLabel="Dica 14 Pts"
      />
    </div>
  );
};
