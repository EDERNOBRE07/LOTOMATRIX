import React, { useMemo, useState } from 'react';
import { Flame, Snowflake, Sparkles, Info, ArrowRight } from 'lucide-react';
import { DezenaStats, LotofacilDraw } from '../types/lotofacil';
import { CONCURSO_ATUAL, FIBONACCI, MOLDURA, PRIMOS } from '../data/lotofacilData';
import { getHistoricalNDraws } from '../services/historical100Draws';

interface MapaCalorDezenas100CardProps {
  latestDraw?: LotofacilDraw;
  statsList?: DezenaStats[];
  onApplyNumbers?: (numbers: number[]) => void;
}

interface HeatCellData {
  numero: number;
  vezes100: number;
  totalDraws: number;
  percentual: number;
  atrasoAtual: number;
  desvioMedia: number;
  intensity: number; // 0.0 (mais fria) a 1.0 (mais quente)
  ePrimo: boolean;
  eMoldura: boolean;
  eFibonacci: boolean;
}

/**
 * Interpola continuamente entre azul-ardósia suave (fria) -> âmbar térmico -> vermelho-carmesim intenso (quente)
 */
function getContinuousHeatColors(intensity: number): {
  backgroundColor: string;
  borderColor: string;
  textColor: string;
  barColor: string;
  badgeText: string;
  label: string;
} {
  const t = Math.max(0, Math.min(1, intensity));

  // Stops RGB:
  // t = 0.0 -> Slate-Blue suave [56, 139, 214]
  // t = 0.5 -> Âmbar quente [245, 158, 11]
  // t = 1.0 -> Carmesim intenso [239, 68, 68]
  let r: number;
  let g: number;
  let b: number;

  if (t < 0.5) {
    const localT = t / 0.5;
    r = Math.round(56 + (245 - 56) * localT);
    g = Math.round(139 + (158 - 139) * localT);
    b = Math.round(214 + (11 - 214) * localT);
  } else {
    const localT = (t - 0.5) / 0.5;
    r = Math.round(245 + (239 - 245) * localT);
    g = Math.round(158 + (68 - 158) * localT);
    b = Math.round(11 + (68 - 11) * localT);
  }

  const bgAlpha = 0.09 + t * 0.34; // 0.09 (suave) -> 0.43 (intenso)
  const borderAlpha = 0.24 + t * 0.54; // 0.24 -> 0.78

  const label =
    t >= 0.78
      ? 'Muito Quente'
      : t >= 0.55
      ? 'Quente'
      : t >= 0.35
      ? 'Neutra'
      : t >= 0.18
      ? 'Fria'
      : 'Muito Fria';

  return {
    backgroundColor: `rgba(${r}, ${g}, ${b}, ${bgAlpha.toFixed(3)})`,
    borderColor: `rgba(${r}, ${g}, ${b}, ${borderAlpha.toFixed(3)})`,
    textColor: t >= 0.75 ? '#fff1f2' : t >= 0.45 ? '#fef3c7' : '#cbd5e1',
    barColor: `rgb(${r}, ${g}, ${b})`,
    badgeText: `rgb(${r}, ${g}, ${b})`,
    label,
  };
}

export const MapaCalorDezenas100Card: React.FC<MapaCalorDezenas100CardProps> = ({
  latestDraw = CONCURSO_ATUAL,
  statsList = [],
  onApplyNumbers,
}) => {
  const [selectedNumero, setSelectedNumero] = useState<number | null>(null);
  const [appliedNotice, setAppliedNotice] = useState<string | null>(null);

  const { cells, totalDraws, minFreq, maxFreq, avgFreq, top5Quentes, top5Frias } = useMemo(() => {
    const draws100 = getHistoricalNDraws(100, latestDraw);
    const total = draws100.length || 100;
    const expectedMean = total * 0.6; // 15 de 25 dezenas por sorteio = 60%

    const freqMap = new Map<number, number>();
    const delayMap = new Map<number, number>();
    for (let n = 1; n <= 25; n++) {
      freqMap.set(n, 0);
      delayMap.set(n, total);
    }

    draws100.forEach((draw, idx) => {
      draw.dezenas.forEach((num) => {
        if (num >= 1 && num <= 25) {
          freqMap.set(num, (freqMap.get(num) || 0) + 1);
          if (delayMap.get(num) === total) {
            delayMap.set(num, idx);
          }
        }
      });
    });

    const statsByNum = new Map<number, DezenaStats>();
    statsList.forEach((s) => statsByNum.set(s.numero, s));

    const freqs = Array.from(freqMap.values());
    const min = Math.min(...freqs);
    const max = Math.max(...freqs);
    const span = max - min || 1;
    const avg = freqs.reduce((acc, v) => acc + v, 0) / 25;

    const list: HeatCellData[] = Array.from({ length: 25 }, (_, i) => {
      const numero = i + 1;
      const vezes100 = freqMap.get(numero) || 0;
      const stat = statsByNum.get(numero);
      const atrasoAtual = stat?.atrasoAtual ?? delayMap.get(numero) ?? 0;

      return {
        numero,
        vezes100,
        totalDraws: total,
        percentual: (vezes100 / total) * 100,
        atrasoAtual,
        desvioMedia: Number((vezes100 - expectedMean).toFixed(1)),
        intensity: (vezes100 - min) / span,
        ePrimo: PRIMOS.includes(numero),
        eMoldura: MOLDURA.includes(numero),
        eFibonacci: FIBONACCI.includes(numero),
      };
    });

    const sortedDesc = [...list].sort(
      (a, b) => b.vezes100 - a.vezes100 || a.atrasoAtual - b.atrasoAtual || a.numero - b.numero
    );
    const sortedAsc = [...list].sort(
      (a, b) => a.vezes100 - b.vezes100 || b.atrasoAtual - a.atrasoAtual || a.numero - b.numero
    );

    return {
      cells: list,
      totalDraws: total,
      minFreq: min,
      maxFreq: max,
      avgFreq: avg,
      top5Quentes: sortedDesc.slice(0, 5),
      top5Frias: sortedAsc.slice(0, 5),
    };
  }, [latestDraw, statsList]);

  const activeCell = useMemo(() => {
    if (selectedNumero !== null) {
      return cells.find((c) => c.numero === selectedNumero) || top5Quentes[0];
    }
    return top5Quentes[0];
  }, [selectedNumero, cells, top5Quentes]);

  const handleApplyTop15Quentes = () => {
    if (!onApplyNumbers) return;
    const top15 = [...cells]
      .sort((a, b) => b.vezes100 - a.vezes100 || a.numero - b.numero)
      .slice(0, 15)
      .map((c) => c.numero)
      .sort((a, b) => a - b);
    onApplyNumbers(top15);
    setAppliedNotice(
      `15 dezenas mais quentes nos últimos ${totalDraws} concursos enviadas para o Fechamento.`
    );
    setTimeout(() => setAppliedNotice(null), 4000);
  };

  return (
    <section
      aria-label="Mapa de Calor de Dezenas 5x5"
      className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4"
    >
      {/* Cabeçalho */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <Flame className="w-4 h-4 text-rose-400 shrink-0" />
            <h3 className="font-sans text-base sm:text-lg font-bold text-white tracking-tight">
              Mapa de Calor de Dezenas (Matriz 5×5)
            </h3>
            <span className="px-2 py-0.5 rounded-md bg-rose-500/15 border border-rose-500/35 text-rose-300 font-mono text-[11px] font-bold tabular-nums">
              ÚLTIMOS {totalDraws} CONCURSOS
            </span>
          </div>
          <p className="font-sans text-xs text-slate-400">
            Frequência absoluta de cada dezena (<span className="font-mono text-slate-300">01</span> a{' '}
            <span className="font-mono text-slate-300">25</span>) até o Concurso{' '}
            <span className="font-mono text-emerald-400">#{latestDraw.concurso}</span> com gradiente térmico contínuo.
          </p>
        </div>

        {/* Barra de Legenda Térmica Contínua */}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center gap-2 bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-1.5">
            <span className="font-sans text-[11px] text-sky-300 font-semibold whitespace-nowrap">
              Fria (<span className="font-mono tabular-nums">{minFreq}×</span>)
            </span>
            <div
              className="w-24 sm:w-32 h-2 rounded-full"
              style={{
                background:
                  'linear-gradient(90deg, rgba(56,139,214,0.65) 0%, rgba(245,158,11,0.8) 50%, rgba(239,68,68,0.95) 100%)',
              }}
            />
            <span className="font-sans text-[11px] text-rose-300 font-semibold whitespace-nowrap">
              Quente (<span className="font-mono tabular-nums">{maxFreq}×</span>)
            </span>
          </div>

          {onApplyNumbers && (
            <button
              type="button"
              onClick={handleApplyTop15Quentes}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-sans font-bold text-xs transition cursor-pointer whitespace-nowrap shrink-0"
            >
              <Sparkles className="w-3.5 h-3.5 shrink-0" />
              <span>Usar 15 Mais Quentes</span>
              <ArrowRight className="w-3.5 h-3.5 shrink-0" />
            </button>
          )}
        </div>
      </div>

      {appliedNotice && (
        <div className="px-3.5 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-sans font-semibold">
          {appliedNotice}
        </div>
      )}

      {/* Grid Principal: Matriz 5x5 à esquerda + Detalhe & Rankings à direita */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
        {/* Matriz Térmica 5×5 */}
        <div className="xl:col-span-8">
          <div className="grid grid-cols-5 gap-2 sm:gap-2.5">
            {cells.map((cell) => {
              const colors = getContinuousHeatColors(cell.intensity);
              const isSelected = activeCell?.numero === cell.numero;
              const isInLatest = latestDraw.dezenas.includes(cell.numero);

              return (
                <button
                  key={cell.numero}
                  type="button"
                  onClick={() => setSelectedNumero(cell.numero)}
                  style={{
                    backgroundColor: colors.backgroundColor,
                    borderColor: isSelected ? '#10b981' : colors.borderColor,
                  }}
                  className={`relative rounded-xl border p-2 sm:p-3 text-left transition cursor-pointer focus:outline-none ${
                    isSelected ? 'ring-2 ring-emerald-400/70' : 'hover:brightness-110'
                  }`}
                  title={`Dezena ${cell.numero.toString().padStart(2, '0')}: ${cell.vezes100} aparições nos últimos ${cell.totalDraws} concursos (${cell.percentual.toFixed(0)}%)`}
                >
                  <div className="flex items-start justify-between gap-1">
                    <span
                      style={{ color: colors.textColor }}
                      className="font-mono text-base sm:text-xl font-bold tabular-nums leading-none"
                    >
                      {cell.numero.toString().padStart(2, '0')}
                    </span>

                    {isInLatest && (
                      <span
                        className="font-mono text-[9px] font-bold px-1 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 leading-none"
                        title="Presente no último concurso"
                      >
                        ULT
                      </span>
                    )}
                  </div>

                  <div className="mt-2 flex items-baseline justify-between gap-1 font-mono tabular-nums">
                    <span className="text-xs sm:text-sm font-bold text-white">
                      {cell.vezes100}
                      <span className="text-[10px] text-slate-400 font-normal">/{cell.totalDraws}</span>
                    </span>
                    <span className="text-[10px] text-slate-300 hidden sm:inline">
                      {cell.percentual.toFixed(0)}%
                    </span>
                  </div>

                  {/* Barra proporcional de intensidade térmica */}
                  <div className="mt-1.5 h-1 w-full rounded-full bg-slate-950/60 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.max(12, Math.round(cell.intensity * 100))}%`,
                        backgroundColor: colors.barColor,
                      }}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Painel Lateral: Inspeção da Dezena & Rankings Quentes/Frias */}
        <div className="xl:col-span-4 space-y-3">
          {/* Card de Inspeção da Dezena Selecionada */}
          {activeCell && (
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 font-mono font-bold text-sm text-white tabular-nums">
                    {activeCell.numero.toString().padStart(2, '0')}
                  </span>
                  <div>
                    <div className="font-sans text-xs font-bold text-white">
                      Inspeção da Dezena
                    </div>
                    <div className="font-sans text-[11px] text-slate-400">
                      Perfil:{' '}
                      <strong
                        style={{ color: getContinuousHeatColors(activeCell.intensity).badgeText }}
                      >
                        {getContinuousHeatColors(activeCell.intensity).label}
                      </strong>
                    </div>
                  </div>
                </div>

                <span className="font-mono text-xs font-bold text-emerald-400 tabular-nums">
                  {activeCell.vezes100} aparições
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs font-mono tabular-nums pt-1">
                <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-2">
                  <span className="font-sans text-[10px] text-slate-400 block">Frequência</span>
                  <strong className="text-white">{activeCell.percentual.toFixed(1)}%</strong>
                </div>
                <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-2">
                  <span className="font-sans text-[10px] text-slate-400 block">Desvio (60)</span>
                  <strong
                    className={
                      activeCell.desvioMedia >= 0 ? 'text-rose-300' : 'text-sky-300'
                    }
                  >
                    {activeCell.desvioMedia > 0 ? `+${activeCell.desvioMedia}` : activeCell.desvioMedia}
                  </strong>
                </div>
                <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-2">
                  <span className="font-sans text-[10px] text-slate-400 block">Atraso Atual</span>
                  <strong className={activeCell.atrasoAtual >= 3 ? 'text-amber-300' : 'text-slate-200'}>
                    {activeCell.atrasoAtual}c
                  </strong>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-sans">
                {activeCell.eMoldura && (
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                    Moldura
                  </span>
                )}
                {!activeCell.eMoldura && (
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                    Miolo / Centro
                  </span>
                )}
                {activeCell.ePrimo && (
                  <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                    Primo
                  </span>
                )}
                {activeCell.eFibonacci && (
                  <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                    Fibonacci
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Top 5 Mais Quentes & Mais Frias */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 space-y-3">
            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-sans font-bold text-rose-300 flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                  <span>Top 5 Mais Quentes</span>
                </span>
                <span className="font-mono text-[10px] text-slate-400 tabular-nums">
                  Média: {avgFreq.toFixed(1)}×
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5 font-mono tabular-nums">
                {top5Quentes.map((c) => (
                  <button
                    key={c.numero}
                    type="button"
                    onClick={() => setSelectedNumero(c.numero)}
                    className="px-2 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/35 text-xs text-rose-200 cursor-pointer transition"
                  >
                    <strong>{c.numero.toString().padStart(2, '0')}</strong>{' '}
                    <span className="text-[10px] text-rose-300/80">({c.vezes100}×)</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2.5 border-t border-slate-800/80">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-sans font-bold text-sky-300 flex items-center gap-1.5">
                  <Snowflake className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                  <span>Top 5 Mais Frias</span>
                </span>
                <span className="font-mono text-[10px] text-slate-400 tabular-nums">
                  Amplitude: {maxFreq - minFreq}×
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5 font-mono tabular-nums">
                {top5Frias.map((c) => (
                  <button
                    key={c.numero}
                    type="button"
                    onClick={() => setSelectedNumero(c.numero)}
                    className="px-2 py-1 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/35 text-xs text-sky-200 cursor-pointer transition"
                  >
                    <strong>{c.numero.toString().padStart(2, '0')}</strong>{' '}
                    <span className="text-[10px] text-sky-300/80">({c.vezes100}×)</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800/80 flex items-center gap-1.5 text-[11px] font-sans text-slate-400">
              <Info className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <span>Toque em qualquer dezena da matriz 5×5 para inspecionar métricas.</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
