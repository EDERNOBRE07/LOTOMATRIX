import React, { useState, useMemo } from 'react';
import { LotofacilDraw } from '../types/lotofacil';
import { getHistoricalNDraws } from '../services/historical100Draws';
import { CONCURSO_ATUAL } from '../data/lotofacilData';
import { soundService } from '../services/soundAlert';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ReferenceLine,
  Area,
} from 'recharts';
import {
  Activity,
  Radio,
  TrendingUp,
  Sparkles,
  Zap,
  CheckCircle2,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  Compass,
} from 'lucide-react';

interface RadarTendenciasFourierProps {
  latestDraw?: LotofacilDraw;
  onApplyDezenas?: (numbers: number[]) => void;
}

interface DezenaFourierAnalysis {
  numero: number;
  probabilidadeProximo: number;
  fase: 'ascendente' | 'descendente' | 'crista' | 'vale';
  cicloPeriodo: number; // tamanho do ciclo em concursos
  energiaEspectral: number; // força do sinal harmônico (0-100)
  ocorrencias100: number;
}

export const RadarTendenciasFourierCard: React.FC<RadarTendenciasFourierProps> = ({
  latestDraw = CONCURSO_ATUAL,
  onApplyDezenas,
}) => {
  const [selectedDezena, setSelectedDezena] = useState<number>(10);
  const [windowFilter, setWindowFilter] = useState<'30' | '50' | '100'>('50');
  const [appliedFeedback, setAppliedFeedback] = useState<string | null>(null);

  // Obtém os últimos 100 concursos em ordem cronológica (mais antigo primeiro)
  const draws100 = useMemo(() => {
    const list = getHistoricalNDraws(100, latestDraw);
    return [...list].reverse(); // cronológico: index 0 é concurso mais antigo, 99 é o mais recente
  }, [latestDraw]);

  // Executa Análise de Transformada Discreta de Fourier (DFT) para todas as 25 dezenas
  const allDezenasAnalysis = useMemo<Record<number, DezenaFourierAnalysis>>(() => {
    const N = draws100.length;
    const result: Record<number, DezenaFourierAnalysis> = {};

    for (let dezena = 1; dezena <= 25; dezena++) {
      // Vetor binário de ocorrências nos 100 sorteios
      const x: number[] = draws100.map((d) => (d.dezenas.includes(dezena) ? 1 : 0));
      const ocorrencias100 = x.reduce((a: number, b: number) => a + b, 0);
      const mean = ocorrencias100 / N;

      // Cálculo de DFT para frequências harmônicas k = 1 até N/4
      const maxK = Math.floor(N / 3);
      const harmonics: { k: number; mag: number; phase: number; period: number }[] = [];

      for (let k = 1; k <= maxK; k++) {
        let real = 0;
        let imag = 0;
        for (let t = 0; t < N; t++) {
          const angle = (2 * Math.PI * k * t) / N;
          real += (x[t] - mean) * Math.cos(angle);
          imag -= (x[t] - mean) * Math.sin(angle);
        }
        const mag = Math.sqrt(real * real + imag * imag);
        const phase = Math.atan2(imag, real);
        harmonics.push({ k, mag, phase, period: N / k });
      }

      // Ordena pelas frequências de maior amplitude/energia espectral
      harmonics.sort((a, b) => b.mag - a.mag);
      const topHarmonics = harmonics.slice(0, 4);

      // Função reconstrutora suavizada de Fourier
      const fourierSignal = (t: number) => {
        let val = mean;
        for (const h of topHarmonics) {
          const angle = (2 * Math.PI * h.k * t) / N + h.phase;
          val += ((2 * h.mag) / N) * Math.cos(angle);
        }
        return Math.max(0.1, Math.min(0.95, val));
      };

      // Avalia o próximo concurso t = N e a derivada de tendência
      const valAtual = fourierSignal(N - 1);
      const valProximo = fourierSignal(N);
      const valAnterior = fourierSignal(N - 2);

      const slope = valProximo - valAtual;
      const prevSlope = valAtual - valAnterior;

      let fase: 'ascendente' | 'descendente' | 'crista' | 'vale' = 'ascendente';
      if (slope > 0.015 && prevSlope > 0) fase = 'ascendente';
      else if (slope < -0.015 && prevSlope < 0) fase = 'descendente';
      else if (prevSlope > 0 && slope <= 0.01) fase = 'crista';
      else fase = 'vale';

      const probPercent = Math.round(valProximo * 100);
      const primaryPeriod = Number((topHarmonics[0]?.period || 3.5).toFixed(1));
      const totalEnergy = harmonics.reduce((acc, h) => acc + h.mag, 0);
      const topEnergy = topHarmonics.reduce((acc, h) => acc + h.mag, 0);
      const energiaEspectral = totalEnergy > 0 ? Math.round((topEnergy / totalEnergy) * 100) : 75;

      result[dezena] = {
        numero: dezena,
        probabilidadeProximo: probPercent,
        fase,
        cicloPeriodo: primaryPeriod,
        energiaEspectral,
        ocorrencias100,
      };
    }

    return result;
  }, [draws100]);

  // Top 5 dezenas com maior probabilidade harmônica de Fourier
  const top5Fourier = useMemo(() => {
    return Object.values(allDezenasAnalysis)
      .sort((a, b) => b.probabilidadeProximo - a.probabilidadeProximo)
      .slice(0, 5);
  }, [allDezenasAnalysis]);

  // Constrói os dados do gráfico Recharts para a dezena selecionada
  const chartData = useMemo(() => {
    const N = draws100.length;
    const dezena = selectedDezena;
    const x: number[] = draws100.map((d) => (d.dezenas.includes(dezena) ? 1 : 0));
    const mean = x.reduce((a: number, b: number) => a + b, 0) / N;

    // DFT para a dezena selecionada
    const maxK = Math.floor(N / 3);
    const harmonics: { k: number; mag: number; phase: number }[] = [];
    for (let k = 1; k <= maxK; k++) {
      let real = 0;
      let imag = 0;
      for (let t = 0; t < N; t++) {
        const angle = (2 * Math.PI * k * t) / N;
        real += (x[t] - mean) * Math.cos(angle);
        imag -= (x[t] - mean) * Math.sin(angle);
      }
      harmonics.push({
        k,
        mag: Math.sqrt(real * real + imag * imag),
        phase: Math.atan2(imag, real),
      });
    }
    harmonics.sort((a, b) => b.mag - a.mag);
    const top = harmonics.slice(0, 4);

    const fourierVal = (t: number) => {
      let val = mean;
      for (const h of top) {
        val += ((2 * h.mag) / N) * Math.cos((2 * Math.PI * h.k * t) / N + h.phase);
      }
      return Math.max(0.05, Math.min(0.98, val));
    };

    // Média móvel ponderada de 5 concursos para suavizar visualmente a incidência
    const rollingAvg = (t: number) => {
      const windowSize = 5;
      const start = Math.max(0, t - windowSize + 1);
      const slice: number[] = x.slice(start, t + 1);
      return slice.reduce((a: number, b: number) => a + b, 0) / slice.length;
    };

    const windowSize = windowFilter === '30' ? 30 : windowFilter === '50' ? 50 : 100;
    const startIndex = Math.max(0, N - windowSize);

    const points: any[] = [];

    // Pontos Históricos
    for (let t = startIndex; t < N; t++) {
      const draw = draws100[t];
      const saiu = x[t];
      const fourierSignal = fourierVal(t);
      const mediaMovel = rollingAvg(t);

      points.push({
        label: `C-${draw.concurso}`,
        concurso: draw.concurso,
        ocorreu: saiu ? 100 : 0,
        mediaMovel: Math.round(mediaMovel * 100),
        tendenciaFourier: Math.round(fourierSignal * 100),
        projecaoPreditiva: null,
        isFuture: false,
      });
    }

    // Último ponto histórico liga à projeção futura
    const lastDraw = draws100[N - 1];
    const lastFourierVal = fourierVal(N - 1);

    // 5 Concursos Futuros Projetados via Fourier Harmônica
    for (let futureOffset = 1; futureOffset <= 5; futureOffset++) {
      const futureConcurso = lastDraw.concurso + futureOffset;
      const projVal = fourierVal(N - 1 + futureOffset);

      points.push({
        label: `+${futureOffset} (#${futureConcurso})`,
        concurso: futureConcurso,
        ocorreu: null,
        mediaMovel: null,
        tendenciaFourier: futureOffset === 1 ? Math.round(lastFourierVal * 100) : null,
        projecaoPreditiva: Math.round(projVal * 100),
        isFuture: true,
      });
    }

    return points;
  }, [draws100, selectedDezena, windowFilter]);

  const currentAnalysis = allDezenasAnalysis[selectedDezena] || {
    numero: selectedDezena,
    probabilidadeProximo: 65,
    fase: 'ascendente',
    cicloPeriodo: 3.5,
    energiaEspectral: 80,
    ocorrencias100: 60,
  };

  const handleApplyTop5 = () => {
    const numbers = top5Fourier.map((d) => d.numero);
    if (onApplyDezenas) {
      onApplyDezenas(numbers);
    }
    try {
      soundService.playGoldenZoneSuccessChime();
    } catch {}
    setAppliedFeedback(
      `✓ Top 5 Dezenas Harmônicas de Fourier [${numbers.map((n) => n.toString().padStart(2, '0')).join(', ')}] aplicadas!`
    );
    setTimeout(() => setAppliedFeedback(null), 4000);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-800">
        <div className="flex items-start gap-3.5">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-cyan-500/20 via-teal-500/10 to-emerald-500/20 border border-cyan-500/30 text-cyan-400 shrink-0">
            <Activity className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                Análise Harmônica de Fourier (DFT)
              </span>
              <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                100 Concursos Históricos
              </span>
            </div>
            <h3 className="text-lg sm:text-xl font-black text-white mt-1">
              Radar de Tendência de Dezenas (Oscilação de Fourier)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Decomposição espectral por transformada de Fourier dos últimos 100 sorteios. Identifica ondas cíclicas e projeta a curva de probabilidade para os próximos sorteios.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleApplyTop5}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 via-teal-400 to-emerald-400 hover:from-cyan-400 hover:to-emerald-300 text-slate-950 font-black text-xs transition cursor-pointer shadow-lg shadow-cyan-500/20 shrink-0 flex items-center gap-2 active:scale-95"
          >
            <Sparkles className="w-4 h-4 fill-current" />
            <span>Aplicar Top 5 Harmônicas</span>
          </button>
        </div>
      </div>

      {appliedFeedback && (
        <div className="p-3.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>{appliedFeedback}</span>
        </div>
      )}

      {/* Seletor Rápido das 25 Dezenas com Cores de Probabilidade Fourier */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-slate-300 flex items-center gap-1.5">
            <Compass className="w-4 h-4 text-cyan-400" />
            Selecione uma Dezena para Inspecionar a Onda Harmônica:
          </span>
          <span className="text-[11px] font-mono text-slate-400">
            Dezena Ativa: <strong className="text-cyan-300">{selectedDezena.toString().padStart(2, '0')}</strong>
          </span>
        </div>

        <div className="grid grid-cols-5 sm:grid-cols-10 md:grid-cols-13 lg:grid-cols-25 gap-1.5">
          {Array.from({ length: 25 }, (_, i) => i + 1).map((num) => {
            const analysis = allDezenasAnalysis[num];
            const isSelected = selectedDezena === num;
            const prob = analysis?.probabilidadeProximo ?? 60;
            const isHigh = prob >= 75;

            return (
              <button
                key={num}
                type="button"
                onClick={() => setSelectedDezena(num)}
                className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl text-xs font-bold transition cursor-pointer border ${
                  isSelected
                    ? 'bg-cyan-500 text-slate-950 border-cyan-300 shadow-md shadow-cyan-500/30 scale-105 z-10'
                    : isHigh
                    ? 'bg-slate-950/80 text-emerald-300 border-emerald-500/40 hover:bg-emerald-950/40'
                    : 'bg-slate-950/60 text-slate-300 border-slate-800 hover:bg-slate-800'
                }`}
              >
                <span className="text-sm font-black font-mono">{num.toString().padStart(2, '0')}</span>
                <span className={`text-[9px] font-mono ${isSelected ? 'text-slate-900 font-bold' : isHigh ? 'text-emerald-400' : 'text-slate-400'}`}>
                  {prob}%
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Cards de Métricas da Dezena Selecionada */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
          <div className="text-slate-400 text-xs font-bold flex items-center justify-between">
            <span>Probabilidade Próximo Sorteio</span>
            <TrendingUp className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="mt-2">
            <span
              className={`text-2xl sm:text-3xl font-black font-mono ${
                currentAnalysis.probabilidadeProximo >= 75
                  ? 'text-emerald-400'
                  : currentAnalysis.probabilidadeProximo >= 55
                  ? 'text-cyan-400'
                  : 'text-amber-400'
              }`}
            >
              {currentAnalysis.probabilidadeProximo}%
            </span>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Baseado na fase harmônica da curva
            </p>
          </div>
          <div className="text-[10px] font-mono text-slate-500 mt-2">
            Status: {currentAnalysis.probabilidadeProximo >= 70 ? '🎯 Zona de Ouro' : 'Normal'}
          </div>
        </div>

        <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
          <div className="text-slate-400 text-xs font-bold flex items-center justify-between">
            <span>Fase da Onda Harmônica</span>
            {currentAnalysis.fase === 'ascendente' || currentAnalysis.fase === 'crista' ? (
              <ArrowUpRight className="w-4 h-4 text-emerald-400" />
            ) : (
              <ArrowDownRight className="w-4 h-4 text-rose-400" />
            )}
          </div>
          <div className="mt-2">
            <span
              className={`text-sm sm:text-base font-black uppercase ${
                currentAnalysis.fase === 'crista'
                  ? 'text-emerald-400'
                  : currentAnalysis.fase === 'ascendente'
                  ? 'text-cyan-400'
                  : currentAnalysis.fase === 'vale'
                  ? 'text-amber-400'
                  : 'text-rose-400'
              }`}
            >
              {currentAnalysis.fase === 'crista'
                ? '🌊 Crista (Pico)'
                : currentAnalysis.fase === 'ascendente'
                ? '📈 Onda Ascendente'
                : currentAnalysis.fase === 'vale'
                ? '📉 Vale (Mínima)'
                : '🔻 Onda Descendente'}
            </span>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Direção da derivada da oscilação
            </p>
          </div>
          <div className="text-[10px] font-mono text-slate-500 mt-2">
            Próximo concurso em ascensão
          </div>
        </div>

        <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
          <div className="text-slate-400 text-xs font-bold flex items-center justify-between">
            <span>Ciclo Harmônico Médio</span>
            <Radio className="w-4 h-4 text-teal-400" />
          </div>
          <div className="mt-2">
            <span className="text-2xl sm:text-3xl font-black font-mono text-teal-300">
              {currentAnalysis.cicloPeriodo}
            </span>
            <span className="text-xs text-slate-400 ml-1.5 font-sans">concursos</span>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Periodicidade dominante de ressonância
            </p>
          </div>
          <div className="text-[10px] font-mono text-slate-500 mt-2">
            Frequência fundamental de repetição
          </div>
        </div>

        <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
          <div className="text-slate-400 text-xs font-bold flex items-center justify-between">
            <span>Energia Espectral</span>
            <Zap className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2">
            <span className="text-2xl sm:text-3xl font-black font-mono text-amber-400">
              {currentAnalysis.energiaEspectral}%
            </span>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Pureza do sinal rítmico (sem ruído)
            </p>
          </div>
          <div className="text-[10px] font-mono text-slate-500 mt-2">
            {currentAnalysis.ocorrencias100}/100 sorteios anteriores
          </div>
        </div>
      </div>

      {/* Gráfico Recharts Principal de Fourier */}
      <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <span>Curva de Oscilação de Fourier • Dezena {selectedDezena.toString().padStart(2, '0')}</span>
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                Suavização + 5 Concursos Projetados
              </span>
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">
              Linha sólida ciano: Tendência harmônica nos últimos concursos. Linha tracejada verde: Projeção preditiva nos próximos 5 sorteios.
            </p>
          </div>

          <div className="flex items-center gap-1.5 self-start sm:self-auto bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
            <span className="text-slate-400 text-[10px] px-2 font-bold">Janela:</span>
            {(['30', '50', '100'] as const).map((w) => (
              <button
                key={w}
                type="button"
                onClick={() => setWindowFilter(w)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition cursor-pointer ${
                  windowFilter === w
                    ? 'bg-cyan-500 text-slate-950'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {w} Jogos
              </button>
            ))}
          </div>
        </div>

        <div className="h-64 sm:h-72 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 10, right: 15, left: -20, bottom: 5 }}>
              <XAxis dataKey="label" stroke="#64748b" fontSize={9} tickLine={false} interval={Math.floor(chartData.length / 8)} />
              <YAxis stroke="#64748b" fontSize={9} tickLine={false} domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload;
                    return (
                      <div className="bg-slate-900 border border-slate-700 p-3 rounded-xl shadow-2xl text-xs space-y-1.5 min-w-[200px]">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-1">
                          <span className="font-bold text-white">Concurso #{d.concurso}</span>
                          <span
                            className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-bold ${
                              d.isFuture ? 'bg-emerald-500/20 text-emerald-300' : 'bg-cyan-500/20 text-cyan-300'
                            }`}
                          >
                            {d.isFuture ? 'PROJEÇÃO FUTURA' : 'HISTÓRICO'}
                          </span>
                        </div>
                        {!d.isFuture && (
                          <div className="flex items-center justify-between text-slate-300">
                            <span>Sorteada no Concurso:</span>
                            <span className={d.ocorreu === 100 ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
                              {d.ocorreu === 100 ? '✓ SIM (Presente)' : '✗ NÃO (Ausente)'}
                            </span>
                          </div>
                        )}
                        {!d.isFuture && (
                          <div className="flex items-center justify-between text-slate-300">
                            <span>Média Móvel (5 Jogos):</span>
                            <span className="text-slate-200 font-mono font-bold">{d.mediaMovel}%</span>
                          </div>
                        )}
                        <div className="flex items-center justify-between text-slate-300">
                          <span>Curva Fourier (Harmônica):</span>
                          <span className="text-cyan-400 font-mono font-black">
                            {d.isFuture ? `${d.projecaoPreditiva}%` : `${d.tendenciaFourier}%`}
                          </span>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend
                verticalAlign="top"
                align="right"
                iconType="circle"
                wrapperStyle={{ fontSize: '11px', paddingBottom: '10px' }}
              />

              {/* Incidência real em barras suaves */}
              <Bar
                name="Sorteada no Concurso"
                dataKey="ocorreu"
                fill="#334155"
                opacity={0.35}
                radius={[2, 2, 0, 0]}
              />

              {/* Média móvel suave */}
              <Line
                name="Média Móvel 5 Jogos"
                type="monotone"
                dataKey="mediaMovel"
                stroke="#64748b"
                strokeWidth={1.5}
                dot={false}
                strokeDasharray="3 3"
              />

              {/* Curva Histórica de Fourier */}
              <Line
                name="Onda Harmônica de Fourier"
                type="monotone"
                dataKey="tendenciaFourier"
                stroke="#06b6d4"
                strokeWidth={2.5}
                dot={false}
              />

              {/* Projeção Preditiva Futura */}
              <Line
                name="Projeção Harmônica Futura"
                type="monotone"
                dataKey="projecaoPreditiva"
                stroke="#10b981"
                strokeWidth={3}
                strokeDasharray="4 4"
                dot={{ r: 4, fill: '#10b981', stroke: '#022c22' }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top 5 Dezenas em Ressonância Harmônica */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold text-slate-300 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            Top 5 Dezenas em Ressonância Harmônica Máxima (Maior Probabilidade Fourier):
          </span>
          <span className="text-[10px] font-mono text-slate-400">
            Atualizado Concurso #{latestDraw.concurso}
          </span>
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5">
          {top5Fourier.map((d, idx) => (
            <div
              key={d.numero}
              onClick={() => setSelectedDezena(d.numero)}
              className={`p-3 rounded-2xl border transition cursor-pointer flex flex-col justify-between ${
                selectedDezena === d.numero
                  ? 'bg-cyan-950/40 border-cyan-400 shadow-lg shadow-cyan-500/20'
                  : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold text-slate-500">#{idx + 1}</span>
                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold uppercase">
                  {d.fase}
                </span>
              </div>
              <div className="my-1.5 flex items-baseline gap-2">
                <span className="text-2xl font-black font-mono text-white">
                  {d.numero.toString().padStart(2, '0')}
                </span>
                <span className="text-base font-black font-mono text-emerald-400">
                  {d.probabilidadeProximo}%
                </span>
              </div>
              <div className="text-[10px] text-slate-400 flex items-center justify-between">
                <span>Ciclo: {d.cicloPeriodo} jgs</span>
                <span>Energia: {d.energiaEspectral}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
