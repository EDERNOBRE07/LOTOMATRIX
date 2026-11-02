import React, { useState, useMemo } from 'react';
import { LotofacilDraw, DezenaStats } from '../types/lotofacil';
import { CONCURSO_ATUAL, DEZENAS_STATS, PRIMOS, MOLDURA } from '../data/lotofacilData';
import { HISTORICO_10_CICLOS } from './LinhaDoTempoCiclosComponent';
import { getHistoricalNDraws } from '../services/historical100Draws';
import { soundService } from '../services/soundAlert';
import {
  Sparkles,
  RotateCcw,
  CheckCircle2,
  Zap,
  Copy,
  Check,
  Target,
  BarChart2,
  ShieldCheck,
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
} from 'recharts';

interface EspelhoConcursoAtualModuleProps {
  latestDraw?: LotofacilDraw;
  statsList?: DezenaStats[];
  cyclePendingNumbers?: number[];
  onApplyNumbers?: (numbers: number[]) => void;
  onNavigateToFechamento?: () => void;
}

export interface DezenaEspelho5CiclosMetric {
  numero: number;
  atrasoAtual: number;
  ocorrencias5Ciclos: number;
  taxaRetornoImediato: number; // % de vezes que retornou logo após ficar ausente
  vezesFechouCiclo: number; // Vezes que fechou algum dos últimos 5 ciclos
  scorePreditivoIA: number; // 0 a 100
  classificacao: 'Alta Urgência' | 'Retorno Provável' | 'Estável';
  ePendenteCiclo: boolean;
  ePrimo: boolean;
  eMoldura: boolean;
  ePar: boolean;
  justificativa: string;
}

export const EspelhoConcursoAtualModule: React.FC<EspelhoConcursoAtualModuleProps> = ({
  latestDraw = CONCURSO_ATUAL,
  statsList = DEZENAS_STATS,
  cyclePendingNumbers = [17, 22],
  onApplyNumbers,
  onNavigateToFechamento,
}) => {
  const [copiedAll, setCopiedAll] = useState(false);
  const [selectedNumbersFilter, setSelectedNumbersFilter] = useState<'all' | 'alta' | 'pendentes'>('all');
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  // 1. As 10 Dezenas Não Sorteadas (O Espelho do Concurso Atual)
  const dezenasEspelho = useMemo<number[]>(() => {
    const drawnSet = new Set(latestDraw.dezenas);
    return Array.from({ length: 25 }, (_, i) => i + 1)
      .filter((n) => !drawnSet.has(n))
      .sort((a, b) => a - b);
  }, [latestDraw.dezenas]);

  // 2. Análise Preditiva dos Últimos 5 Ciclos (Ciclos Fechados + Ciclo Atual)
  const ultimos5Ciclos = useMemo(() => {
    return HISTORICO_10_CICLOS.slice(0, 5);
  }, []);

  // Extrai os concursos dos últimos 5 ciclos para computar o comportamento pós-ausência
  const analiseEspelho5Ciclos = useMemo<DezenaEspelho5CiclosMetric[]>(() => {
    const historicalDraws = getHistoricalNDraws(100, latestDraw);

    // Identifica dezenas que fecharam algum dos 5 últimos ciclos
    const dezenasQueFecharam = new Map<number, number>();
    ultimos5Ciclos.forEach((c) => {
      c.dezenasFechamento.forEach((d) => {
        dezenasQueFecharam.set(d, (dezenasQueFecharam.get(d) || 0) + 1);
      });
    });

    return dezenasEspelho.map((num) => {
      const st = statsList.find((s) => s.numero === num);
      const atraso = st ? st.atrasoAtual : 1;
      const isPending = cyclePendingNumbers.includes(num);

      // Calcula frequência da dezena nos sorteios correspondentes aos últimos 5 ciclos (aprox. últimos 25 a 30 concursos)
      const subsetDraws = historicalDraws.slice(0, 26);
      const vezesNoPeriodo = subsetDraws.filter((d) => d.dezenas.includes(num)).length;

      // Calcula a taxa em que a dezena retornou imediatamente no concurso seguinte à ausência
      let ausencias = 0;
      let retornosImediatos = 0;
      for (let i = 0; i < subsetDraws.length - 1; i++) {
        const dAtual = subsetDraws[i];
        const dAnterior = subsetDraws[i + 1];
        if (!dAnterior.dezenas.includes(num)) {
          ausencias++;
          if (dAtual.dezenas.includes(num)) {
            retornosImediatos++;
          }
        }
      }

      const taxaRetorno = ausencias > 0
        ? Math.round((retornosImediatos / ausencias) * 100)
        : 60;

      const vezesFechou = dezenasQueFecharam.get(num) || 0;

      // Score Preditivo IA dos últimos 5 ciclos (base 50% + bônus de atraso, retorno e ciclo)
      let score = 52.0;

      // Bônus de Atraso Ideal da Lotofácil (Atrasos de 1 e 2 concursos têm maior taxa de retorno)
      if (atraso === 1) score += 20;
      else if (atraso === 2) score += 18;
      else if (atraso === 3) score += 14;
      else if (atraso >= 4) score += 10;

      // Bônus de taxa de retorno pós-ausência nos 5 ciclos
      score += (taxaRetorno - 50) * 0.35;

      // Bônus crítico: Dezena pendente para fechar o Ciclo Atual
      if (isPending) {
        score += 26;
      }

      // Bônus de dezena chave de fechamento de ciclos anteriores
      if (vezesFechou > 0) {
        score += vezesFechou * 5;
      }

      // Bônus de Dezenas de Alta Frequência Estrutural
      if (num === 10 || num === 11 || num === 13 || num === 20 || num === 25) {
        score += 4;
      }

      score = Math.min(96, Math.max(45, Math.round(score)));

      let classificacao: 'Alta Urgência' | 'Retorno Provável' | 'Estável' = 'Retorno Provável';
      if (score >= 75 || isPending) {
        classificacao = 'Alta Urgência';
      } else if (score < 60) {
        classificacao = 'Estável';
      }

      let justificativa = '';
      if (isPending) {
        justificativa = `Pendente no Ciclo Atual (${cyclePendingNumbers.join(', ')}). Pressão de retorno iminente para fechar o ciclo.`;
      } else if (atraso === 1 && taxaRetorno >= 60) {
        justificativa = `Atraso padrão 1 com ${taxaRetorno}% de retorno imediato nos últimos 5 ciclos. Zona de ouro.`;
      } else if (vezesFechou > 0) {
        justificativa = `Fechou ${vezesFechou} dos últimos 5 ciclos. Comportamento cíclico confirmado.`;
      } else {
        justificativa = `Taxa de retorno de ${taxaRetorno}% nos últimos 5 ciclos com atraso atual de ${atraso} sorteio(s).`;
      }

      return {
        numero: num,
        atrasoAtual: atraso,
        ocorrencias5Ciclos: vezesNoPeriodo,
        taxaRetornoImediato: taxaRetorno,
        vezesFechouCiclo: vezesFechou,
        scorePreditivoIA: score,
        classificacao,
        ePendenteCiclo: isPending,
        ePrimo: PRIMOS.includes(num),
        eMoldura: MOLDURA.includes(num),
        ePar: num % 2 === 0,
        justificativa,
      };
    }).sort((a, b) => b.scorePreditivoIA - a.scorePreditivoIA);
  }, [dezenasEspelho, statsList, cyclePendingNumbers, ultimos5Ciclos, latestDraw]);

  // Estatísticas agregadas do Espelho
  const metricasEspelho = useMemo(() => {
    const pares = dezenasEspelho.filter((n) => n % 2 === 0).length;
    const impares = 10 - pares;
    const primos = dezenasEspelho.filter((n) => PRIMOS.includes(n)).length;
    const moldura = dezenasEspelho.filter((n) => MOLDURA.includes(n)).length;
    const soma = dezenasEspelho.reduce((acc, curr) => acc + curr, 0);
    const pendentesCount = dezenasEspelho.filter((n) => cyclePendingNumbers.includes(n)).length;
    const top5Urgentes = analiseEspelho5Ciclos.slice(0, 5).map((d) => d.numero);

    return {
      pares,
      impares,
      primos,
      moldura,
      soma,
      pendentesCount,
      top5Urgentes,
    };
  }, [dezenasEspelho, cyclePendingNumbers, analiseEspelho5Ciclos]);

  // Dados para o gráfico Recharts
  const chartData = useMemo(() => {
    return analiseEspelho5Ciclos.map((item) => ({
      numeroStr: item.numero.toString().padStart(2, '0'),
      numero: item.numero,
      score: item.scorePreditivoIA,
      retorno: item.taxaRetornoImediato,
      atraso: item.atrasoAtual,
      isPending: item.ePendenteCiclo,
    }));
  }, [analiseEspelho5Ciclos]);

  // Ações de Usuário
  const handleCopyEspelho = () => {
    const text = dezenasEspelho.map((n) => n.toString().padStart(2, '0')).join(' - ');
    navigator.clipboard.writeText(text);
    setCopiedAll(true);
    soundService.playGoldenZoneSuccessChime();
    setActionFeedback('10 dezenas do Espelho copiadas para a área de transferência!');
    setTimeout(() => {
      setCopiedAll(false);
      setActionFeedback(null);
    }, 3000);
  };

  const handleApplyTop5ToFechamento = () => {
    const top5 = metricasEspelho.top5Urgentes;
    if (onApplyNumbers) {
      onApplyNumbers(top5);
    }
    soundService.playGoldenZoneSuccessChime();
    setActionFeedback(`Top 5 Dezenas do Espelho [${top5.map((n) => n.toString().padStart(2, '0')).join(', ')}] enviadas para o Fechamento!`);
    if (onNavigateToFechamento) {
      setTimeout(() => onNavigateToFechamento(), 800);
    }
  };

  const handleApplyAll10ToFechamento = () => {
    if (onApplyNumbers) {
      onApplyNumbers(dezenasEspelho);
    }
    soundService.playGoldenZoneSuccessChime();
    setActionFeedback(`Todas as 10 dezenas do Espelho enviadas como base para o Fechamento!`);
    if (onNavigateToFechamento) {
      setTimeout(() => onNavigateToFechamento(), 800);
    }
  };

  // Filtragem na tabela
  const displayedMetrics = useMemo(() => {
    if (selectedNumbersFilter === 'alta') {
      return analiseEspelho5Ciclos.filter((d) => d.classificacao === 'Alta Urgência');
    }
    if (selectedNumbersFilter === 'pendentes') {
      return analiseEspelho5Ciclos.filter((d) => d.ePendenteCiclo);
    }
    return analiseEspelho5Ciclos;
  }, [analiseEspelho5Ciclos, selectedNumbersFilter]);

  return (
    <div className="bg-slate-900/95 border-2 border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl relative overflow-hidden space-y-6">
      {/* Background Glow */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-amber-500/10 via-emerald-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />

      {/* Header do Módulo */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10 border-b border-slate-800/80 pb-5">
        <div className="flex items-start gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 via-orange-500 to-amber-600 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-amber-500/25 shrink-0">
            <RotateCcw className="w-6 h-6 text-slate-950" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-lg sm:text-xl font-black text-white tracking-tight">
                Espelho do Concurso Atual #{latestDraw.concurso}
              </h3>
              <span className="text-[10px] font-mono font-bold uppercase px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-400" />
                10 Dezenas Não Sorteadas
              </span>
              <span className="text-[10px] font-mono font-bold uppercase px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                Alvo: Concurso #{latestDraw.concurso + 1}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-3xl leading-relaxed">
              O <strong>Espelho</strong> reúne as 10 dezenas ausentes do concurso anterior. Historicamente, entre{' '}
              <strong className="text-emerald-400">5 e 6 dessas 10 dezenas (50% a 60%)</strong> retornam no próximo sorteio.
              Abaixo está a análise de tendência estocástica e índice de retorno baseado no comportamento dos{' '}
              <strong className="text-amber-400 font-mono">últimos 5 ciclos oficiais da Lotofácil</strong>.
            </p>
          </div>
        </div>

        {/* Botões de Ação Rápida */}
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <button
            type="button"
            onClick={handleCopyEspelho}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95"
            title="Copiar as 10 dezenas do espelho formatadas"
          >
            {copiedAll ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-amber-400" />}
            <span>{copiedAll ? 'Copiado!' : 'Copiar 10 Espelho'}</span>
          </button>

          <button
            type="button"
            onClick={handleApplyTop5ToFechamento}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs shadow-md shadow-amber-500/25 transition cursor-pointer flex items-center gap-1.5 active:scale-95"
            title="Enviar as 5 dezenas com maior urgência preditiva para o Fechamento"
          >
            <Zap className="w-3.5 h-3.5 fill-current" />
            <span>Fixar Top 5 Espelho</span>
          </button>

          <button
            type="button"
            onClick={handleApplyAll10ToFechamento}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95"
            title="Enviar todas as 10 dezenas não sorteadas para o Fechamento"
          >
            <Target className="w-3.5 h-3.5 text-emerald-400" />
            <span>Usar Espelho no Fechamento</span>
          </button>
        </div>
      </div>

      {/* Feedback Toast */}
      {actionFeedback && (
        <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs flex items-center justify-between gap-3 shadow-md">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-semibold">{actionFeedback}</span>
          </div>
          <button
            onClick={() => setActionFeedback(null)}
            className="text-emerald-400/80 hover:text-emerald-200 text-xs font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Grid de Métricas do Espelho */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800/80">
          <span className="text-[11px] text-slate-400 block font-medium">Dezenas no Espelho</span>
          <strong className="text-xl font-black text-white font-mono mt-0.5 block">10 / 25</strong>
          <span className="text-[10px] text-amber-400 font-semibold mt-1 block">40% do Volante</span>
        </div>

        <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800/80">
          <span className="text-[11px] text-slate-400 block font-medium">Retorno Médio Projetado</span>
          <strong className="text-xl font-black text-emerald-400 font-mono mt-0.5 block">5 a 6 Dezenas</strong>
          <span className="text-[10px] text-slate-400 mt-1 block">Taxa de 50% - 60%</span>
        </div>

        <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800/80">
          <span className="text-[11px] text-slate-400 block font-medium">Pendentes no Ciclo</span>
          <strong className="text-xl font-black text-amber-400 font-mono mt-0.5 block">
            {metricasEspelho.pendentesCount} Dezena(s)
          </strong>
          <span className="text-[10px] text-amber-300 font-semibold mt-1 block">
            {cyclePendingNumbers.map((n) => n.toString().padStart(2, '0')).join(', ')}
          </span>
        </div>

        <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800/80">
          <span className="text-[11px] text-slate-400 block font-medium">Paridade do Espelho</span>
          <strong className="text-xl font-black text-cyan-400 font-mono mt-0.5 block">
            {metricasEspelho.pares}P / {metricasEspelho.impares}I
          </strong>
          <span className="text-[10px] text-slate-400 mt-1 block">Equilíbrio Par/Ímpar</span>
        </div>

        <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800/80">
          <span className="text-[11px] text-slate-400 block font-medium">Moldura vs Centro</span>
          <strong className="text-xl font-black text-indigo-400 font-mono mt-0.5 block">
            {metricasEspelho.moldura} Moldura
          </strong>
          <span className="text-[10px] text-slate-400 mt-1 block">{10 - metricasEspelho.moldura} no Miolo</span>
        </div>

        <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800/80">
          <span className="text-[11px] text-slate-400 block font-medium">Soma do Espelho</span>
          <strong className="text-xl font-black text-yellow-400 font-mono mt-0.5 block">
            {metricasEspelho.soma}
          </strong>
          <span className="text-[10px] text-slate-400 mt-1 block">{metricasEspelho.primos} Primos</span>
        </div>
      </div>

      {/* Display Visual das 10 Dezenas Não Sorteadas */}
      <div className="bg-slate-950/90 rounded-2xl border border-slate-800 p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <span>Dezenas do Espelho (Não Sorteadas no Concurso #{latestDraw.concurso})</span>
          </span>
          <span className="text-[11px] text-slate-400 font-mono">
            Classificadas por Índice Preditivo dos Últimos 5 Ciclos
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-2.5">
          {analiseEspelho5Ciclos.map((item) => {
            const isTop = item.scorePreditivoIA >= 75;
            const isPending = item.ePendenteCiclo;

            return (
              <div
                key={item.numero}
                className={`p-3 rounded-2xl border text-center transition-all relative overflow-hidden flex flex-col justify-between ${
                  isPending
                    ? 'bg-gradient-to-b from-amber-500/25 via-amber-950/40 to-slate-950 border-amber-400 shadow-lg shadow-amber-500/20 ring-1 ring-amber-400'
                    : isTop
                    ? 'bg-gradient-to-b from-emerald-500/20 to-slate-950 border-emerald-500/50 shadow-md shadow-emerald-500/10'
                    : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
                }`}
              >
                {isPending && (
                  <span className="absolute top-1 right-1 text-[8px] font-black uppercase px-1 py-0.2 rounded bg-amber-400 text-slate-950 font-mono">
                    CICLO
                  </span>
                )}

                <div>
                  <div
                    className={`w-11 h-11 mx-auto rounded-full flex items-center justify-center font-black text-lg font-mono shadow-md ${
                      isPending
                        ? 'bg-amber-400 text-slate-950 shadow-amber-400/40 animate-pulse'
                        : isTop
                        ? 'bg-emerald-500 text-slate-950 shadow-emerald-500/30'
                        : 'bg-slate-800 text-white'
                    }`}
                  >
                    {item.numero.toString().padStart(2, '0')}
                  </div>
                  <div className="mt-2">
                    <span className="text-[10px] text-slate-400 block font-mono">
                      Atraso: <strong className="text-white">{item.atrasoAtual}</strong>
                    </span>
                    <span
                      className={`text-[11px] font-black font-mono mt-0.5 block ${
                        isTop ? 'text-emerald-400' : 'text-slate-300'
                      }`}
                    >
                      {item.scorePreditivoIA}% IA
                    </span>
                  </div>
                </div>

                <div className="mt-2 pt-2 border-t border-slate-800/80">
                  <span
                    className={`text-[9px] font-bold uppercase block truncate ${
                      item.classificacao === 'Alta Urgência'
                        ? 'text-amber-300'
                        : item.classificacao === 'Retorno Provável'
                        ? 'text-emerald-300'
                        : 'text-slate-400'
                    }`}
                  >
                    {item.classificacao}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Gráfico Recharts: Desempenho e Retorno das 10 Dezenas Espelho nos Últimos 5 Ciclos */}
      <div className="bg-slate-950/80 rounded-2xl border border-slate-800 p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h4 className="text-xs sm:text-sm font-black text-white flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-emerald-400" />
              <span>Taxa de Retorno Pós-Ausência e Score Preditivo nos Últimos 5 Ciclos (%)</span>
            </h4>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Comparação da taxa histórica de retorno imediato nos últimos 5 ciclos vs Score de Urgência da IA
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs font-mono">
            <span className="flex items-center gap-1.5 text-slate-300">
              <span className="w-2.5 h-2.5 rounded bg-emerald-400 inline-block" />
              <span>Score Preditivo IA (%)</span>
            </span>
            <span className="flex items-center gap-1.5 text-slate-300">
              <span className="w-2.5 h-2.5 rounded bg-amber-400 inline-block" />
              <span>Taxa Retorno 5 Ciclos (%)</span>
            </span>
          </div>
        </div>

        <div className="h-64 sm:h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
              <XAxis dataKey="numeroStr" stroke="#94a3b8" fontSize={12} tickLine={false} />
              <YAxis stroke="#94a3b8" fontSize={11} domain={[0, 100]} tickLine={false} />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-slate-900 border border-slate-700 p-3 rounded-xl shadow-xl text-xs space-y-1">
                        <div className="font-bold text-white flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-400" />
                          <span>Dezena {label}</span>
                          {data.isPending && (
                            <span className="text-[9px] font-black uppercase px-1 rounded bg-amber-400 text-slate-950 font-mono">
                              Pendente Ciclo
                            </span>
                          )}
                        </div>
                        <div className="text-emerald-400 font-mono">
                          Score Preditivo IA: <strong>{data.score}%</strong>
                        </div>
                        <div className="text-amber-400 font-mono">
                          Taxa de Retorno nos 5 Ciclos: <strong>{data.retorno}%</strong>
                        </div>
                        <div className="text-slate-400 font-mono">
                          Atraso Atual: <strong>{data.atraso} sorteio(s)</strong>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <ReferenceLine y={56} stroke="#eab308" strokeDasharray="4 4" label={{ value: 'Média de Retorno (56%)', fill: '#eab308', fontSize: 10, position: 'right' }} />
              <Bar dataKey="score" fill="#10b981" radius={[4, 4, 0, 0]} name="Score IA" />
              <Bar dataKey="retorno" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Retorno 5 Ciclos" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tabela de Diagnóstico Detalhado por Dezena com Filtros */}
      <div className="bg-slate-950/80 rounded-2xl border border-slate-800 p-4 sm:p-5 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h4 className="text-xs sm:text-sm font-black text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              <span>Diagnóstico Técnico das 10 Dezenas do Espelho (Últimos 5 Ciclos)</span>
            </h4>
            <p className="text-[11px] text-slate-400">
              Análise de tendência individual com justificativa estocástica para o próximo concurso.
            </p>
          </div>

          <div className="flex items-center gap-1.5 self-start sm:self-auto">
            <button
              onClick={() => setSelectedNumbersFilter('all')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                selectedNumbersFilter === 'all'
                  ? 'bg-emerald-500 text-slate-950 shadow-sm'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              Todas (10)
            </button>
            <button
              onClick={() => setSelectedNumbersFilter('alta')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                selectedNumbersFilter === 'alta'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              Alta Urgência ({analiseEspelho5Ciclos.filter((d) => d.classificacao === 'Alta Urgência').length})
            </button>
            <button
              onClick={() => setSelectedNumbersFilter('pendentes')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                selectedNumbersFilter === 'pendentes'
                  ? 'bg-amber-400 text-slate-950 shadow-sm'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              Pendentes Ciclo ({metricasEspelho.pendentesCount})
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="text-[11px] uppercase bg-slate-900/90 text-slate-400 font-mono border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-3">Dezena</th>
                <th className="py-2.5 px-3">Atraso</th>
                <th className="py-2.5 px-3">Retorno 5 Ciclos</th>
                <th className="py-2.5 px-3">Fechamentos</th>
                <th className="py-2.5 px-3">Score IA</th>
                <th className="py-2.5 px-3">Classificação</th>
                <th className="py-2.5 px-3">Diagnóstico Estocástico</th>
                <th className="py-2.5 px-3 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {displayedMetrics.map((item) => (
                <tr
                  key={item.numero}
                  className={`hover:bg-slate-900/60 transition ${
                    item.ePendenteCiclo ? 'bg-amber-500/5' : ''
                  }`}
                >
                  <td className="py-2.5 px-3 font-mono font-bold">
                    <span
                      className={`inline-flex items-center justify-center w-7 h-7 rounded-lg font-black text-xs ${
                        item.ePendenteCiclo
                          ? 'bg-amber-400 text-slate-950 shadow-sm'
                          : item.scorePreditivoIA >= 75
                          ? 'bg-emerald-500 text-slate-950'
                          : 'bg-slate-800 text-slate-200'
                      }`}
                    >
                      {item.numero.toString().padStart(2, '0')}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-mono text-slate-300 font-semibold">
                    {item.atrasoAtual} concurso(s)
                  </td>
                  <td className="py-2.5 px-3 font-mono text-amber-400 font-bold">
                    {item.taxaRetornoImediato}%
                  </td>
                  <td className="py-2.5 px-3 font-mono text-slate-400">
                    {item.vezesFechouCiclo > 0 ? (
                      <span className="text-amber-300 font-bold font-mono">
                        {item.vezesFechouCiclo} ciclo(s)
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="py-2.5 px-3 font-mono font-black text-emerald-400">
                    {item.scorePreditivoIA}%
                  </td>
                  <td className="py-2.5 px-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono uppercase inline-flex items-center gap-1 ${
                        item.classificacao === 'Alta Urgência'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : item.classificacao === 'Retorno Provável'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {item.classificacao}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-[11px] text-slate-300 max-w-xs">
                    {item.justificativa}
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <button
                      type="button"
                      onClick={() => {
                        if (onApplyNumbers) onApplyNumbers([item.numero]);
                        soundService.playGoldenZoneSuccessChime();
                        setActionFeedback(`Dezena ${item.numero.toString().padStart(2, '0')} enviada ao Fechamento!`);
                        if (onNavigateToFechamento) {
                          setTimeout(() => onNavigateToFechamento(), 800);
                        }
                      }}
                      className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 text-[10px] font-bold transition cursor-pointer"
                    >
                      Fixar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
