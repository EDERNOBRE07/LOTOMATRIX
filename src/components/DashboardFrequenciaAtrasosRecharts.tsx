import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ReferenceLine,
  Cell,
} from 'recharts';
import { LotofacilDraw, DezenaStats } from '../types/lotofacil';
import { CONCURSO_ATUAL, DEZENAS_STATS } from '../data/lotofacilData';
import { getHistorical100Draws } from '../services/historical100Draws';
import { soundService } from '../services/soundAlert';
import {
  BarChart3,
  TrendingUp,
  Clock,
  Flame,
  Award,
  Zap,
  Sparkles,
  Layers,
  ArrowRight,
  Check,
  RotateCcw,
  AlertCircle,
  HelpCircle,
  Sliders,
} from 'lucide-react';

interface DashboardFrequenciaAtrasosRechartsProps {
  latestDraw?: LotofacilDraw;
  statsList?: DezenaStats[];
  cyclePendingNumbers?: number[];
  onApplyNumbers?: (numbers: number[]) => void;
  onNavigateToFechamento?: () => void;
}

type IntervaloConcursos = 10 | 25 | 50 | 75 | 100;
type FiltroExibicao = 'todas' | 'quentes' | 'atrasadas' | 'ciclo';

interface DezenaChartData {
  numero: number;
  label: string;
  frequencia: number;
  percentual: number;
  mediaEsperada: number;
  desvioMedia: number;
  atrasoAtual: number;
  atrasoMedio: number;
  tendenciaRetorno: number;
  isCycle: boolean;
  status: 'quente' | 'estavel' | 'fria' | 'critica';
}

export const DashboardFrequenciaAtrasosRecharts: React.FC<
  DashboardFrequenciaAtrasosRechartsProps
> = ({
  latestDraw = CONCURSO_ATUAL,
  statsList = DEZENAS_STATS,
  cyclePendingNumbers = [17, 22],
  onApplyNumbers,
  onNavigateToFechamento,
}) => {
  const [intervalo, setIntervalo] = useState<IntervaloConcursos>(100);
  const [filtroExibicao, setFiltroExibicao] = useState<FiltroExibicao>('todas');
  const [selectedDezena, setSelectedDezena] = useState<number | null>(null);
  const [copiedFeedback, setCopiedFeedback] = useState<string | null>(null);

  // 1. Obter os concursos do histórico correspondentes ao intervalo selecionado
  const { chartData, topFrequentes, maisAtrasadas, mediaEsperadaPeriodo, totalSorteios } =
    useMemo(() => {
      const all100 = getHistorical100Draws(latestDraw);
      const drawsSlice = all100.slice(0, intervalo);
      const totalSorteiosCount = drawsSlice.length;

      // Média teórica da Lotofácil (15 sorteadas de 25 = 60%)
      const mediaEsperada = Number((totalSorteiosCount * 0.6).toFixed(1));

      // Contagem de frequência e cálculo de atraso real no slice
      const freqMap: { [num: number]: number } = {};
      const lastSeenIndex: { [num: number]: number } = {};

      for (let i = 1; i <= 25; i++) {
        freqMap[i] = 0;
        lastSeenIndex[i] = -1; // -1 significa ainda não vista
      }

      drawsSlice.forEach((draw, drawIndex) => {
        draw.dezenas.forEach((num) => {
          freqMap[num] = (freqMap[num] || 0) + 1;
          if (lastSeenIndex[num] === -1) {
            lastSeenIndex[num] = drawIndex;
          }
        });
      });

      const list: DezenaChartData[] = [];

      for (let num = 1; num <= 25; num++) {
        const freq = freqMap[num] || 0;
        const percentual = Number(((freq / totalSorteiosCount) * 100).toFixed(1));
        const desvio = Number((freq - mediaEsperada).toFixed(1));

        // Atraso: index do primeiro sorteio em que a dezena apareceu (0 = saiu no último)
        // Se nunca apareceu no slice, atraso é totalSorteiosCount
        const atraso = lastSeenIndex[num] === -1 ? totalSorteiosCount : lastSeenIndex[num];

        // Atraso médio no período
        const atrasoMedio =
          freq > 0 ? Number((totalSorteiosCount / freq).toFixed(1)) : totalSorteiosCount;

        // Tendência de retorno à média (reversão à média bayesiana)
        // Quanto mais atrasada e abaixo da média, maior a pressão estatística de retorno
        const pressaoAtraso = atraso * 1.5;
        const pressaoDeficit = Math.max(0, mediaEsperada - freq);
        const tendencia = Number((mediaEsperada * 0.4 + pressaoAtraso + pressaoDeficit * 0.8).toFixed(1));

        let status: 'quente' | 'estavel' | 'fria' | 'critica' = 'estavel';
        if (atraso >= 3) status = 'critica';
        else if (freq >= mediaEsperada + 2) status = 'quente';
        else if (freq <= mediaEsperada - 3) status = 'fria';

        list.push({
          numero: num,
          label: num.toString().padStart(2, '0'),
          frequencia: freq,
          percentual,
          mediaEsperada,
          desvioMedia: desvio,
          atrasoAtual: atraso,
          atrasoMedio,
          tendenciaRetorno: tendencia,
          isCycle: cyclePendingNumbers.includes(num),
          status,
        });
      }

      const topFreq = [...list].sort((a, b) => b.frequencia - a.frequencia);
      const topAtr = [...list].sort((a, b) => b.atrasoAtual - a.atrasoAtual);

      return {
        chartData: list,
        topFrequentes: topFreq,
        maisAtrasadas: topAtr,
        mediaEsperadaPeriodo: mediaEsperada,
        totalSorteios: totalSorteiosCount,
      };
    }, [latestDraw, intervalo, cyclePendingNumbers]);

  // 2. Filtragem dos dados exibidos no gráfico conforme seleção
  const filteredData = useMemo(() => {
    if (filtroExibicao === 'quentes') {
      return [...chartData].sort((a, b) => b.frequencia - a.frequencia).slice(0, 12);
    }
    if (filtroExibicao === 'atrasadas') {
      return [...chartData].sort((a, b) => b.atrasoAtual - a.atrasoAtual).slice(0, 12);
    }
    if (filtroExibicao === 'ciclo') {
      return chartData.filter((d) => d.isCycle || d.atrasoAtual >= 2);
    }
    return chartData;
  }, [chartData, filtroExibicao]);

  const dezenaMaisFrequente = topFrequentes[0];
  const dezenaMaisAtrasada = maisAtrasadas[0];

  const handleApplyTopNumbers = () => {
    const top15 = topFrequentes.slice(0, 15).map((d) => d.numero);
    if (onApplyNumbers) {
      onApplyNumbers(top15);
    }
    soundService.playGoldenZoneSuccessChime();
    setCopiedFeedback(
      `✓ Top 15 Dezenas mais frequentes do período (${intervalo} concursos) carregadas no Fechamento!`
    );
    setTimeout(() => setCopiedFeedback(null), 4500);

    if (onNavigateToFechamento) {
      onNavigateToFechamento();
    }
  };

  const handleApplyCycleUrgent = () => {
    const cycleAndDelayed = Array.from(
      new Set([
        ...cyclePendingNumbers,
        ...maisAtrasadas.slice(0, 5).map((d) => d.numero),
        ...topFrequentes.slice(0, 10).map((d) => d.numero),
      ])
    ).slice(0, 15);

    if (onApplyNumbers) {
      onApplyNumbers(cycleAndDelayed);
    }
    soundService.playGoldenZoneSuccessChime();
    setCopiedFeedback(
      `✓ Dezenas do Ciclo e Atrasos Críticos aplicadas no Fechamento com sucesso!`
    );
    setTimeout(() => setCopiedFeedback(null), 4500);

    if (onNavigateToFechamento) {
      onNavigateToFechamento();
    }
  };

  return (
    <div className="bg-slate-900/90 rounded-2xl border-2 border-slate-800 p-5 sm:p-6 shadow-2xl space-y-6 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header com Título e Seletor de Intervalo */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="p-2 rounded-xl bg-gradient-to-br from-amber-400 to-yellow-600 text-slate-950 shadow-md shadow-amber-500/20">
              <BarChart3 className="w-5 h-5 fill-current" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <span>Dashboard de Frequência & Curva de Atraso</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold uppercase">
                  Recharts • Interativo
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Variância da frequência das 25 dezenas contra a média histórica (60%) e curva de atraso atual nos últimos concursos.
              </p>
            </div>
          </div>
        </div>

        {/* Seletor Dinâmico de Intervalo de Concursos */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2.5 bg-slate-950 p-1.5 rounded-2xl border border-slate-800 self-start lg:self-auto">
          <span className="text-[11px] font-mono font-bold text-slate-400 px-2 flex items-center gap-1">
            <Sliders className="w-3.5 h-3.5 text-amber-400" />
            <span>Intervalo:</span>
          </span>
          <div className="flex items-center gap-1 flex-wrap">
            {([10, 25, 50, 75, 100] as IntervaloConcursos[]).map((val) => {
              const isSelected = intervalo === val;
              return (
                <button
                  key={val}
                  type="button"
                  onClick={() => {
                    setIntervalo(val);
                    soundService.playTickCountdown();
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-mono font-black transition cursor-pointer ${
                    isSelected
                      ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 shadow-md shadow-amber-500/20 scale-105'
                      : 'text-slate-400 hover:text-white hover:bg-slate-900'
                  }`}
                  title={`Analisar os últimos ${val} concursos da Caixa`}
                >
                  {val} Sorteios
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* KPI Cards em Tempo Real */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* KPI 1: Dezena Líder */}
        <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Dezena Mais Frequente</span>
            <Flame className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black font-mono text-amber-400">
                {dezenaMaisFrequente?.label}
              </span>
              <span className="text-xs font-mono text-slate-300 font-bold">
                {dezenaMaisFrequente?.frequencia} saídas ({dezenaMaisFrequente?.percentual}%)
              </span>
            </div>
            <span className="text-[10px] text-emerald-400 font-medium">
              +{dezenaMaisFrequente?.desvioMedia} acima da média esperada
            </span>
          </div>
        </div>

        {/* KPI 2: Maior Atraso Vigente */}
        <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Maior Atraso Vigente</span>
            <Clock className="w-4 h-4 text-rose-400" />
          </div>
          <div className="mt-2">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black font-mono text-rose-400">
                {dezenaMaisAtrasada?.label}
              </span>
              <span className="text-xs font-mono text-slate-300 font-bold">
                {dezenaMaisAtrasada?.atrasoAtual} concurso(s)
              </span>
            </div>
            <span className="text-[10px] text-amber-400 font-medium">
              {dezenaMaisAtrasada?.isCycle ? '⚠️ Dezena-chave do Ciclo' : 'Pressão de saída elevada'}
            </span>
          </div>
        </div>

        {/* KPI 3: Média Teórica Esperada */}
        <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Média Teórica Esperada</span>
            <Award className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black font-mono text-emerald-400">
                {mediaEsperadaPeriodo}
              </span>
              <span className="text-xs font-mono text-slate-400">
                sorteios (60,0%)
              </span>
            </div>
            <span className="text-[10px] text-slate-400 font-medium">
              Base: 15 dezenas sorteadas de 25
            </span>
          </div>
        </div>

        {/* KPI 4: Concurso Base Analisado */}
        <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Concurso Base Caixa</span>
            <Zap className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="mt-2">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black font-mono text-white">
                #{latestDraw.concurso}
              </span>
              <span className="text-xs font-mono text-cyan-300">
                ({latestDraw.data})
              </span>
            </div>
            <span className="text-[10px] text-slate-400 font-medium">
              Analisando {totalSorteios} sorteios retroativos
            </span>
          </div>
        </div>
      </div>

      {/* Controles de Filtro de Exibição das Dezenas */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80 text-xs">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-slate-400 font-semibold mr-1">Exibição:</span>
          <button
            type="button"
            onClick={() => setFiltroExibicao('todas')}
            className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
              filtroExibicao === 'todas'
                ? 'bg-slate-700 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Todas as 25 Dezenas
          </button>
          <button
            type="button"
            onClick={() => setFiltroExibicao('quentes')}
            className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer flex items-center gap-1 ${
              filtroExibicao === 'quentes'
                ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                : 'text-amber-400 hover:text-white'
            }`}
          >
            <Flame className="w-3.5 h-3.5 fill-current" />
            <span>Top 12 Mais Frequentes</span>
          </button>
          <button
            type="button"
            onClick={() => setFiltroExibicao('atrasadas')}
            className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer flex items-center gap-1 ${
              filtroExibicao === 'atrasadas'
                ? 'bg-rose-500 text-white font-black shadow-sm'
                : 'text-rose-400 hover:text-white'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Top 12 Mais Atrasadas</span>
          </button>
          <button
            type="button"
            onClick={() => setFiltroExibicao('ciclo')}
            className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer flex items-center gap-1 ${
              filtroExibicao === 'ciclo'
                ? 'bg-cyan-500 text-slate-950 font-black shadow-sm'
                : 'text-cyan-400 hover:text-white'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Dezenas do Ciclo & Atraso Crítico</span>
          </button>
        </div>

        {/* Botão de Ação Rápida: Aplicar no Fechamento */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleApplyTopNumbers}
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-xs transition cursor-pointer flex items-center gap-1.5 shadow-md shadow-emerald-500/20 active:scale-95"
            title="Carregar as 15 dezenas mais frequentes do período na matriz de fechamento"
          >
            <Award className="w-3.5 h-3.5 text-slate-950" />
            <span>Carregar Top 15 no Fechamento</span>
          </button>
          <button
            type="button"
            onClick={handleApplyCycleUrgent}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/40 text-xs font-bold transition cursor-pointer flex items-center gap-1 active:scale-95"
            title="Carregar as dezenas pendentes de ciclo e com atraso relevante"
          >
            <Zap className="w-3.5 h-3.5 text-amber-400 fill-current" />
            <span>Estratégia Ciclo</span>
          </button>
        </div>
      </div>

      {/* Alerta de Feedback de Aplicação */}
      {copiedFeedback && (
        <div className="bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs px-4 py-2 rounded-xl flex items-center gap-2 shadow-sm animate-in fade-in">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{copiedFeedback}</span>
        </div>
      )}

      {/* GRÁFICO PRINCIPAL COMPOSTO RECHARTS (Barra de Frequência + Linha de Curva de Atraso) */}
      <div className="bg-slate-950/70 p-4 sm:p-5 rounded-2xl border border-slate-800">
        <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-800 text-xs">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
              <span className="w-3 h-3 rounded bg-emerald-500 inline-block" />
              <span>Frequência no Período (Eixo Esquerdo)</span>
            </span>
            <span className="flex items-center gap-1.5 text-amber-400 font-bold">
              <span className="w-3 h-1 bg-amber-400 inline-block rounded-full" />
              <span>Curva de Atraso Atual (Eixo Direito)</span>
            </span>
            <span className="flex items-center gap-1.5 text-cyan-400 font-bold">
              <span className="w-3 h-0.5 bg-cyan-400 inline-block border-t border-dashed border-cyan-400" />
              <span>Tendência de Retorno à Média</span>
            </span>
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            Período: Últimos {intervalo} Concursos
          </span>
        </div>

        <div className="w-full h-[320px] sm:h-[360px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={filteredData}
              margin={{ top: 20, right: 25, left: -10, bottom: 10 }}
              onClick={(e) => {
                if (e && e.activePayload && e.activePayload.length > 0) {
                  const num = e.activePayload[0].payload.numero;
                  setSelectedDezena(num);
                }
              }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />

              <XAxis
                dataKey="label"
                stroke="#64748b"
                tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'monospace' }}
                tickLine={{ stroke: '#334155' }}
              />

              {/* Eixo Esquerdo: Frequência */}
              <YAxis
                yAxisId="left"
                stroke="#10b981"
                tick={{ fill: '#10b981', fontSize: 11, fontFamily: 'monospace' }}
                tickLine={{ stroke: '#10b981' }}
                domain={[0, (dataMax: number) => Math.ceil(dataMax * 1.15)]}
                label={{
                  value: 'Frequência',
                  angle: -90,
                  position: 'insideLeft',
                  fill: '#10b981',
                  fontSize: 10,
                  offset: 15,
                }}
              />

              {/* Eixo Direito: Atraso Atual */}
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="#f59e0b"
                tick={{ fill: '#f59e0b', fontSize: 11, fontFamily: 'monospace' }}
                tickLine={{ stroke: '#f59e0b' }}
                domain={[0, (dataMax: number) => Math.max(6, dataMax + 2)]}
                label={{
                  value: 'Atraso Atual',
                  angle: 90,
                  position: 'insideRight',
                  fill: '#f59e0b',
                  fontSize: 10,
                  offset: 15,
                }}
              />

              {/* Linha de Referência da Média Histórica Esperada (60%) */}
              <ReferenceLine
                yAxisId="left"
                y={mediaEsperadaPeriodo}
                stroke="#34d399"
                strokeDasharray="4 4"
                strokeWidth={1.5}
                label={{
                  value: `Média Esperada (${mediaEsperadaPeriodo})`,
                  fill: '#34d399',
                  fontSize: 10,
                  position: 'top',
                }}
              />

              {/* Linha de Referência de Atraso Crítico (3 Concursos) */}
              <ReferenceLine
                yAxisId="right"
                y={3}
                stroke="#f43f5e"
                strokeDasharray="3 3"
                strokeWidth={1.5}
                label={{
                  value: 'Atraso Crítico (3+)',
                  fill: '#f43f5e',
                  fontSize: 9,
                  position: 'insideBottomRight',
                }}
              />

              {/* Tooltip Detalhada */}
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const d: DezenaChartData = payload[0].payload;
                    return (
                      <div className="bg-slate-900/95 border-2 border-amber-500/50 p-3.5 rounded-xl shadow-2xl text-xs space-y-2 backdrop-blur-md min-w-[220px]">
                        <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
                          <span className="font-mono font-black text-amber-400 text-sm flex items-center gap-1.5">
                            <span className="w-5 h-5 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center text-xs">
                              {d.label}
                            </span>
                            <span>Dezena {d.label}</span>
                          </span>
                          {d.isCycle && (
                            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-black">
                              CICLO
                            </span>
                          )}
                        </div>

                        <div className="space-y-1 font-mono text-[11px]">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">Aparições no Período:</span>
                            <span className="text-white font-bold">
                              {d.frequencia} / {intervalo} ({d.percentual}%)
                            </span>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">Desvio da Média:</span>
                            <span
                              className={`font-bold ${
                                d.desvioMedia >= 0 ? 'text-emerald-400' : 'text-rose-400'
                              }`}
                            >
                              {d.desvioMedia >= 0 ? `+${d.desvioMedia}` : d.desvioMedia}
                            </span>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">Atraso Vigente:</span>
                            <span
                              className={`font-bold ${
                                d.atrasoAtual >= 3 ? 'text-rose-400' : 'text-amber-400'
                              }`}
                            >
                              {d.atrasoAtual === 0 ? 'Saiu no último' : `${d.atrasoAtual} concurso(s)`}
                            </span>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">Atraso Médio:</span>
                            <span className="text-slate-300">A cada {d.atrasoMedio} sorteios</span>
                          </div>

                          <div className="flex items-center justify-between border-t border-slate-800 pt-1 mt-1">
                            <span className="text-slate-400">Pressão de Retorno:</span>
                            <span className="text-cyan-400 font-bold">{d.tendenciaRetorno} pts</span>
                          </div>
                        </div>

                        <div className="pt-1 text-[10px] text-slate-500 italic">
                          Clique na barra para fixar ou simular
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />

              {/* Barra: Frequência */}
              <Bar yAxisId="left" dataKey="frequencia" radius={[4, 4, 0, 0]} maxBarSize={28}>
                {filteredData.map((entry) => {
                  let fillColor = '#10b981'; // Padrão verde esmeralda
                  if (entry.isCycle) fillColor = '#f59e0b'; // Ambar se for do ciclo
                  else if (entry.frequencia >= mediaEsperadaPeriodo + 2) fillColor = '#eab308'; // Amarelo ouro para as mais quentes
                  else if (entry.atrasoAtual >= 3) fillColor = '#f43f5e'; // Vermelho se estiver muito atrasada

                  return (
                    <Cell
                      key={`cell-${entry.numero}`}
                      fill={fillColor}
                      fillOpacity={selectedDezena === entry.numero ? 1 : 0.85}
                      stroke={selectedDezena === entry.numero ? '#ffffff' : 'transparent'}
                      strokeWidth={2}
                    />
                  );
                })}
              </Bar>

              {/* Linha 1: Curva de Atraso Atual */}
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="atrasoAtual"
                stroke="#f59e0b"
                strokeWidth={2.5}
                dot={{ r: 3.5, fill: '#f59e0b', stroke: '#0f172a', strokeWidth: 1.5 }}
                activeDot={{ r: 6, fill: '#fcd34d' }}
              />

              {/* Linha 2: Tendência de Retorno à Média */}
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="tendenciaRetorno"
                stroke="#06b6d4"
                strokeWidth={1.8}
                strokeDasharray="3 3"
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Rodapé Explicativo da Interpretação Estatística */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-4 border-t border-slate-800 text-xs text-slate-400">
          <div className="flex items-start gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shrink-0 mt-1" />
            <div>
              <strong className="text-white block font-mono text-[11px]">Barras Verdes / Amarelas</strong>
              <span>
                Frequência de aparições da dezena. Barras que ultrapassam a linha pontilhada verde estão operando acima da média teórica de 60%.
              </span>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shrink-0 mt-1" />
            <div>
              <strong className="text-white block font-mono text-[11px]">Linha Âmbar Contínua (Atraso)</strong>
              <span>
                Curva de atraso atual. Picos acima de 3 concursos representam anomalias estatísticas sob forte pressão de correção e retorno à média.
              </span>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shrink-0 mt-1" />
            <div>
              <strong className="text-white block font-mono text-[11px]">Linha Ciano Tracejada (Tendência)</strong>
              <span>
                Índice de reversão à média bayesiana. Indica a atratividade probabilística combinada da dezena para os próximos concursos.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
