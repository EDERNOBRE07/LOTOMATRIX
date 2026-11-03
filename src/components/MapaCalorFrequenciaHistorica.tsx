import React, { useState, useMemo } from 'react';
import {
  Flame,
  Award,
  BarChart3,
  Sparkles,
  Layers,
  Info,
  Calendar,
  CheckCircle2,
  TrendingUp,
  Snowflake,
  Filter,
  ArrowRight,
  ChevronDown,
} from 'lucide-react';
import { LotofacilDraw, DezenaStats } from '../types/lotofacil';
import { CONCURSO_ATUAL, RECENT_DRAWS, DEZENAS_STATS, PRIMOS, MOLDURA, FIBONACCI } from '../data/lotofacilData';
import { getHistorical100Draws } from '../services/historical100Draws';

interface MapaCalorFrequenciaHistoricaProps {
  latestDraw?: LotofacilDraw;
  statsList?: DezenaStats[];
  onApplyNumbers?: (numbers: number[]) => void;
}

type PeriodInterval = '20' | '50' | '100' | 'todos';

interface DezenaHeatmapData {
  num: number;
  frequencia: number;
  percentual: number;
  atraso: number;
  isMoldura: boolean;
  isPrimo: boolean;
  isFibonacci: boolean;
  score: number; // 0 to 1 normalized
  color: string;
  textColor: string;
  statusTermico: string;
}

/**
 * Retorna cor no gradiente suave de Azul (Fria) -> Ciano -> Verde -> Amarelo -> Laranja -> Vermelho (Quente)
 */
function getHeatmapColor(ratio: number): { bg: string; text: string; label: string; border: string; glow: string } {
  // Clamp between 0 and 1
  const r = Math.max(0, Math.min(1, ratio));

  if (r <= 0.18) {
    // Muito Fria - Azul Escuro / Real
    return {
      bg: 'linear-gradient(135deg, #1e3a8a 0%, #172554 100%)',
      text: '#93c5fd',
      label: 'Muito Fria (Gélida)',
      border: '#3b82f6',
      glow: 'rgba(59, 130, 246, 0.4)',
    };
  } else if (r <= 0.38) {
    // Fria - Ciano / Azul Claro
    return {
      bg: 'linear-gradient(135deg, #0369a1 0%, #0c4a6e 100%)',
      text: '#7dd3fc',
      label: 'Fria (Baixa Frequência)',
      border: '#0284c7',
      glow: 'rgba(2, 132, 199, 0.35)',
    };
  } else if (r <= 0.58) {
    // Neutra / Equilibrada - Verde / Esmeralda
    return {
      bg: 'linear-gradient(135deg, #047857 0%, #064e3b 100%)',
      text: '#6ee7b7',
      label: 'Equilibrada (Neutra)',
      border: '#10b981',
      glow: 'rgba(16, 185, 129, 0.35)',
    };
  } else if (r <= 0.78) {
    // Quente - Amarelo / Laranja
    return {
      bg: 'linear-gradient(135deg, #d97706 0%, #9a3412 100%)',
      text: '#fde047',
      label: 'Quente (Alta Frequência)',
      border: '#f59e0b',
      glow: 'rgba(245, 158, 11, 0.45)',
    };
  } else {
    // Muito Quente / Em Chamas - Vermelho Vivo / Carmesim
    return {
      bg: 'linear-gradient(135deg, #dc2626 0%, #7f1d1d 100%)',
      text: '#fecaca',
      label: 'Muito Quente (Em Chamas 🔥)',
      border: '#ef4444',
      glow: 'rgba(239, 68, 68, 0.55)',
    };
  }
}

export const MapaCalorFrequenciaHistorica: React.FC<MapaCalorFrequenciaHistoricaProps> = ({
  latestDraw = CONCURSO_ATUAL,
  statsList = DEZENAS_STATS,
  onApplyNumbers,
}) => {
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodInterval>('100');
  const [selectedDezena, setSelectedDezena] = useState<number | null>(null);

  // Computa a frequência histórica exata com base no período selecionado
  const { heatmapData, minFreq, maxFreq, totalSorteiosAnalisados } = useMemo(() => {
    const historical100 = getHistorical100Draws(latestDraw);

    let targetDraws: LotofacilDraw[] = [];
    if (selectedPeriod === '20') {
      targetDraws = historical100.slice(0, 20);
    } else if (selectedPeriod === '50') {
      targetDraws = historical100.slice(0, 50);
    } else if (selectedPeriod === '100') {
      targetDraws = historical100.slice(0, 100);
    } else {
      // 'todos' (histórico completo disponível)
      targetDraws = historical100;
    }

    const totalDraws = targetDraws.length > 0 ? targetDraws.length : 100;
    const countMap: Record<number, number> = {};
    for (let i = 1; i <= 25; i++) countMap[i] = 0;

    targetDraws.forEach((d) => {
      d.dezenas.forEach((num) => {
        if (num >= 1 && num <= 25) {
          countMap[num] = (countMap[num] || 0) + 1;
        }
      });
    });

    let min = Infinity;
    let max = -Infinity;
    for (let i = 1; i <= 25; i++) {
      if (countMap[i] < min) min = countMap[i];
      if (countMap[i] > max) max = countMap[i];
    }

    const range = max - min || 1;

    const list: DezenaHeatmapData[] = [];
    for (let i = 1; i <= 25; i++) {
      const freq = countMap[i] || 0;
      const stat = statsList.find((s) => s.numero === i);
      const atraso = stat?.atrasoAtual ?? 0;
      const score = (freq - min) / range;
      const thermal = getHeatmapColor(score);

      list.push({
        num: i,
        frequencia: freq,
        percentual: Math.round((freq / totalDraws) * 100),
        atraso,
        isMoldura: MOLDURA.includes(i),
        isPrimo: PRIMOS.includes(i),
        isFibonacci: FIBONACCI.includes(i),
        score,
        color: thermal.bg,
        textColor: thermal.text,
        statusTermico: thermal.label,
      });
    }

    return {
      heatmapData: list,
      minFreq: min,
      maxFreq: max,
      totalSorteiosAnalisados: totalDraws,
    };
  }, [selectedPeriod, latestDraw, statsList]);

  // Top 5 Quentes e Top 5 Frias
  const topQuentes = useMemo(() => {
    return [...heatmapData].sort((a, b) => b.frequencia - a.frequencia).slice(0, 5);
  }, [heatmapData]);

  const topFrias = useMemo(() => {
    return [...heatmapData].sort((a, b) => a.frequencia - b.frequencia).slice(0, 5);
  }, [heatmapData]);

  const activeDezenaData = useMemo(() => {
    if (!selectedDezena) return heatmapData[0];
    return heatmapData.find((d) => d.num === selectedDezena) || heatmapData[0];
  }, [selectedDezena, heatmapData]);

  const handleApplyQuentes = () => {
    const quentes15 = [...heatmapData]
      .sort((a, b) => b.frequencia - a.frequencia)
      .slice(0, 15)
      .map((d) => d.num)
      .sort((a, b) => a - b);
    onApplyNumbers?.(quentes15);
  };

  return (
    <div className="bg-gradient-to-br from-slate-900 via-slate-900/95 to-slate-950 rounded-2xl border border-slate-800 p-5 sm:p-6 shadow-2xl space-y-6 relative overflow-hidden">
      {/* Background Accent Glows */}
      <div className="absolute -top-24 -left-24 w-72 h-72 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-rose-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header and Interval Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 via-purple-600 to-rose-600 flex items-center justify-center text-white shadow-lg shadow-rose-500/20 shrink-0">
            <Flame className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base sm:text-lg font-black text-white tracking-wide">
                Mapa de Calor (Heatmap) • Frequência Histórica das 25 Dezenas
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 uppercase font-mono tracking-wider">
                Azul (Fria) ao Vermelho (Quente)
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Visualize a temperatura estatística de cada dezena no volante 5×5 com gradiente contínuo ponderado por frequência de sorteios.
            </p>
          </div>
        </div>

        {/* Interval Selector Pills */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800 text-xs shrink-0">
          <span className="text-[11px] font-bold text-slate-400 px-2 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-cyan-400" />
            Intervalo:
          </span>
          {[
            { id: '20', label: '20 Jogos' },
            { id: '50', label: '50 Jogos' },
            { id: '100', label: '100 Jogos' },
            { id: 'todos', label: 'Todos' },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setSelectedPeriod(item.id as PeriodInterval)}
              className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                selectedPeriod === item.id
                  ? 'bg-gradient-to-r from-blue-500 to-rose-500 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid: 5x5 Volante Heatmap & Detail Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 relative z-10">
        {/* Left Column: 5x5 Volante Grid Heatmap (2 Columns on large screens) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold text-white flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Volante 5×5 com Gradiente Térmico:</span>
            </span>
            <span className="font-mono text-[11px]">
              Base: {totalSorteiosAnalisados} concursos analisados (Concurso #{latestDraw.concurso})
            </span>
          </div>

          <div className="grid grid-cols-5 gap-2.5 sm:gap-3 p-4 bg-slate-950/80 rounded-2xl border border-slate-800 shadow-inner">
            {heatmapData.map((d) => {
              const isSelected = selectedDezena === d.num;
              const thermal = getHeatmapColor(d.score);

              return (
                <button
                  key={d.num}
                  type="button"
                  onClick={() => setSelectedDezena(d.num)}
                  style={{
                    background: thermal.bg,
                    boxShadow: isSelected
                      ? `0 0 20px ${thermal.border}, inset 0 0 10px rgba(255,255,255,0.4)`
                      : `0 2px 10px ${thermal.glow}`,
                    borderColor: isSelected ? '#ffffff' : thermal.border,
                  }}
                  className={`relative flex flex-col items-center justify-center p-2.5 sm:p-3 rounded-2xl border transition-all duration-200 cursor-pointer select-none active:scale-95 min-h-[64px] sm:min-h-[72px] ${
                    isSelected ? 'ring-2 ring-white scale-105 z-20' : 'hover:scale-102 hover:z-10'
                  }`}
                >
                  {/* Thermal indicator badge */}
                  <span className="absolute top-1 right-1.5 text-[9px]">
                    {d.score >= 0.7 ? (
                      <Flame className="w-3 h-3 text-yellow-300 fill-current animate-pulse" />
                    ) : d.score <= 0.25 ? (
                      <Snowflake className="w-3 h-3 text-cyan-200" />
                    ) : null}
                  </span>

                  {/* Number */}
                  <span
                    style={{ color: '#ffffff' }}
                    className="font-mono text-lg sm:text-2xl font-black tracking-tight leading-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]"
                  >
                    {d.num.toString().padStart(2, '0')}
                  </span>

                  {/* Frequency badge */}
                  <div className="flex items-center gap-1 mt-1 text-[9px] font-mono font-bold leading-none bg-black/40 px-1.5 py-0.5 rounded-full text-white/90 backdrop-blur-xs">
                    <span>{d.frequencia}x</span>
                    <span className="opacity-75">({d.percentual}%)</span>
                  </div>

                  {/* Delay tag */}
                  <span className="text-[8px] font-mono mt-0.5 text-white/80">
                    {d.atraso === 0 ? 'saiu' : `${d.atraso} atr`}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Color Scale Gradient Bar Legend */}
          <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-bold">
              <span className="text-blue-400 flex items-center gap-1">
                <Snowflake className="w-3.5 h-3.5 text-blue-400" />
                <span>Dezenas Frias (Azul: min {minFreq} saídas)</span>
              </span>
              <span className="text-emerald-400 font-mono">Equilibradas (Verde)</span>
              <span className="text-rose-400 flex items-center gap-1">
                <span>Dezenas Quentes (Vermelho: máx {maxFreq} saídas)</span>
                <Flame className="w-3.5 h-3.5 text-rose-400 fill-current" />
              </span>
            </div>

            {/* Continuous Gradient Bar */}
            <div className="w-full h-3 rounded-full bg-gradient-to-r from-blue-700 via-cyan-500 via-emerald-500 via-amber-500 to-rose-600 shadow-inner border border-slate-700/60" />

            <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
              <span>0% Menos frequente</span>
              <span>25% Moderada</span>
              <span>50% Frequência Média</span>
              <span>75% Quente</span>
              <span>100% Mais frequente</span>
            </div>
          </div>
        </div>

        {/* Right Column: Selected Dezena Diagnostic & Quick Filters */}
        <div className="space-y-4">
          {/* Diagnostic Card for Selected Dezena */}
          <div className="bg-slate-950/90 rounded-2xl border border-slate-800 p-4 space-y-3.5 shadow-xl">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div
                  style={{ background: getHeatmapColor(activeDezenaData.score).bg }}
                  className="w-10 h-10 rounded-xl flex items-center justify-center font-mono text-lg font-black text-white shadow-md"
                >
                  {activeDezenaData.num.toString().padStart(2, '0')}
                </div>
                <div>
                  <h4 className="text-xs font-black text-white">Dezena {activeDezenaData.num.toString().padStart(2, '0')}</h4>
                  <span
                    style={{ color: activeDezenaData.textColor }}
                    className="text-[10px] font-bold font-mono block"
                  >
                    {activeDezenaData.statusTermico}
                  </span>
                </div>
              </div>

              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-900 border border-slate-700 text-slate-300">
                Score: {Math.round(activeDezenaData.score * 100)}%
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Sorteios no Período:</span>
                <strong className="text-sm font-mono font-bold text-white">
                  {activeDezenaData.frequencia} vezes
                </strong>
              </div>

              <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Taxa de Presença:</span>
                <strong className="text-sm font-mono font-bold text-emerald-400">
                  {activeDezenaData.percentual}%
                </strong>
              </div>

              <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Atraso Atual:</span>
                <strong
                  className={`text-sm font-mono font-bold ${
                    activeDezenaData.atraso >= 3 ? 'text-rose-400' : 'text-slate-200'
                  }`}
                >
                  {activeDezenaData.atraso === 0 ? 'Sorteada no último' : `${activeDezenaData.atraso} sorteio(s)`}
                </strong>
              </div>

              <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Padrão Geométrico:</span>
                <strong className="text-[11px] font-mono font-bold text-amber-300">
                  {activeDezenaData.isMoldura ? 'Moldura' : 'Miolo'}
                  {activeDezenaData.isPrimo ? ' • Primo' : ''}
                  {activeDezenaData.isFibonacci ? ' • Fibonacci' : ''}
                </strong>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 leading-tight">
              Clique em qualquer número no volante 5×5 para inspecionar métricas detalhadas de calor.
            </p>
          </div>

          {/* Top 5 Quentes (Vermelho) */}
          <div className="bg-slate-950/70 rounded-2xl border border-rose-500/30 p-3.5 space-y-2">
            <div className="flex items-center justify-between text-xs pb-1.5 border-b border-slate-800">
              <strong className="text-rose-400 font-bold flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 fill-current" />
                <span>Top 5 Dezenas Mais Quentes (Vermelho)</span>
              </strong>
              <span className="text-[10px] font-mono text-slate-400">Freq. Máx</span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {topQuentes.map((q) => (
                <button
                  key={q.num}
                  type="button"
                  onClick={() => setSelectedDezena(q.num)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-950/50 hover:bg-rose-900/60 border border-rose-500/40 text-rose-200 font-mono text-xs font-bold transition cursor-pointer"
                >
                  <span>{q.num.toString().padStart(2, '0')}</span>
                  <span className="text-[10px] text-rose-400 font-normal">({q.frequencia}x)</span>
                </button>
              ))}
            </div>
          </div>

          {/* Top 5 Frias (Azul) */}
          <div className="bg-slate-950/70 rounded-2xl border border-blue-500/30 p-3.5 space-y-2">
            <div className="flex items-center justify-between text-xs pb-1.5 border-b border-slate-800">
              <strong className="text-blue-400 font-bold flex items-center gap-1.5">
                <Snowflake className="w-3.5 h-3.5" />
                <span>Top 5 Dezenas Mais Frias (Azul)</span>
              </strong>
              <span className="text-[10px] font-mono text-slate-400">Freq. Mín</span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {topFrias.map((f) => (
                <button
                  key={f.num}
                  type="button"
                  onClick={() => setSelectedDezena(f.num)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-950/50 hover:bg-blue-900/60 border border-blue-500/40 text-blue-200 font-mono text-xs font-bold transition cursor-pointer"
                >
                  <span>{f.num.toString().padStart(2, '0')}</span>
                  <span className="text-[10px] text-blue-400 font-normal">({f.frequencia}x)</span>
                </button>
              ))}
            </div>
          </div>

          {/* Quick Apply Action */}
          {onApplyNumbers && (
            <button
              type="button"
              onClick={handleApplyQuentes}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-400 hover:to-amber-400 text-slate-950 font-black text-xs transition cursor-pointer shadow-md shadow-rose-500/20 active:scale-95 flex items-center justify-center gap-2"
            >
              <Flame className="w-4 h-4 fill-current" />
              <span>Aplicar 15 Dezenas Mais Quentes no Fechamento</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
