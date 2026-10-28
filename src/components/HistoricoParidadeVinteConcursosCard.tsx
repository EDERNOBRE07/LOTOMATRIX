import React, { useMemo, useState } from 'react';
import { LotofacilDraw } from '../types/lotofacil';
import { RECENT_DRAWS, PARIDADE_HISTORICA } from '../data/lotofacilData';
import {
  Scale,
  TrendingUp,
  Sliders,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Info,
  ShieldCheck,
  ArrowRight,
} from 'lucide-react';
import { soundService } from '../services/soundAlert';

interface HistoricoParidadeVinteConcursosCardProps {
  latestDraw: LotofacilDraw;
  onApplyParidadeFilter?: (minPares: number, maxPares: number) => void;
  onNavigateToFechamento?: () => void;
}

export interface DrawParityInfo {
  concurso: number;
  data: string;
  paresCount: number;
  imparesCount: number;
  paresDezenas: number[];
  imparesDezenas: number[];
  isIdealPattern: boolean; // 7P/8I or 8P/7I (canonical golden average)
  isAcceptablePattern: boolean; // 6P/9I or 9P/6I
  isAtypical: boolean; // <= 5 or >= 10
  statusLabel: string;
}

export const HistoricoParidadeVinteConcursosCard: React.FC<HistoricoParidadeVinteConcursosCardProps> = ({
  latestDraw,
  onApplyParidadeFilter,
  onNavigateToFechamento,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [selectedConcurso, setSelectedConcurso] = useState<number | null>(null);
  const [appliedFeedback, setAppliedFeedback] = useState<string | null>(null);

  // Consolidate the last 20 draws (latestDraw + RECENT_DRAWS)
  const last20Draws = useMemo(() => {
    const list: LotofacilDraw[] = [latestDraw];
    RECENT_DRAWS.forEach((d) => {
      if (!list.some((existing) => existing.concurso === d.concurso)) {
        list.push(d);
      }
    });
    return list.slice(0, 20);
  }, [latestDraw]);

  // Compute parity analysis for each of the 20 draws
  const { drawsParity, avgPares, avgImpares, idealZonePct, distributionMap, mostFrequentParity } =
    useMemo(() => {
      let sumPares = 0;
      let sumImpares = 0;
      let idealCount = 0;
      const freqCounts: Record<string, number> = {};

      const analysis: DrawParityInfo[] = last20Draws.map((draw) => {
        const pDezenas = draw.dezenas.filter((n) => n % 2 === 0).sort((a, b) => a - b);
        const iDezenas = draw.dezenas.filter((n) => n % 2 !== 0).sort((a, b) => a - b);
        const pCount = pDezenas.length;
        const iCount = iDezenas.length;

        sumPares += pCount;
        sumImpares += iCount;

        const key = `${pCount}P/${iCount}I`;
        freqCounts[key] = (freqCounts[key] || 0) + 1;

        const isIdeal = (pCount === 7 && iCount === 8) || (pCount === 8 && iCount === 7);
        const isAcceptable = (pCount === 6 && iCount === 9) || (pCount === 9 && iCount === 6);
        const isAtyp = pCount <= 5 || pCount >= 10;

        if (isIdeal) idealCount++;

        let statusLabel = 'Padrão Não Canônico';
        if (pCount === 7 && iCount === 8) statusLabel = '7 Pares / 8 Ímpares (Média Ideal #1)';
        else if (pCount === 8 && iCount === 7) statusLabel = '8 Pares / 7 Ímpares (Média Ideal #2)';
        else if (pCount === 6 && iCount === 9) statusLabel = '6 Pares / 9 Ímpares (Aceitável)';
        else if (pCount === 9 && iCount === 6) statusLabel = '9 Pares / 6 Ímpares (Aceitável)';
        else statusLabel = `${pCount}P / ${iCount}I (Desvio Extremo Atípico)`;

        return {
          concurso: draw.concurso,
          data: draw.data,
          paresCount: pCount,
          imparesCount: iCount,
          paresDezenas: pDezenas,
          imparesDezenas: iDezenas,
          isIdealPattern: isIdeal,
          isAcceptablePattern: isAcceptable,
          isAtypical: isAtyp,
          statusLabel,
        };
      });

      const total = last20Draws.length || 1;
      const avgP = Number((sumPares / total).toFixed(1));
      const avgI = Number((sumImpares / total).toFixed(1));
      const idealPct = Math.round((idealCount / total) * 100);

      // Mode
      let maxFreq = 0;
      let mode = '7P/8I';
      Object.entries(freqCounts).forEach(([k, count]) => {
        if (count > maxFreq) {
          maxFreq = count;
          mode = k;
        }
      });

      return {
        drawsParity: analysis,
        avgPares: avgP,
        avgImpares: avgI,
        idealZonePct: idealPct,
        distributionMap: freqCounts,
        mostFrequentParity: mode,
      };
    }, [last20Draws]);

  // Handle calibrating the canonical parity filter (7 a 8 Pares)
  const handleCalibrateParidade = (minPares = 7, maxPares = 8) => {
    soundService.playGoldenZoneSuccessChime();
    if (onApplyParidadeFilter) {
      onApplyParidadeFilter(minPares, maxPares);
    }

    try {
      const event = new CustomEvent('lotosniper-paridade-filter-applied', {
        detail: { paresMin: minPares, paresMax: maxPares },
      });
      window.dispatchEvent(event);
    } catch {}

    setAppliedFeedback(
      `Filtro de Paridade calibrado com sucesso: [${minPares} a ${maxPares} Pares] (7P/8I e 8P/7I)!`
    );
    setTimeout(() => {
      setAppliedFeedback(null);
    }, 4500);

    if (onNavigateToFechamento) {
      setTimeout(() => {
        onNavigateToFechamento();
      }, 700);
    }
  };

  const selectedDrawDetail = selectedConcurso
    ? drawsParity.find((d) => d.concurso === selectedConcurso)
    : null;

  return (
    <div className="card-pro overflow-hidden border border-cyan-500/30 bg-slate-900/90 shadow-2xl backdrop-blur-md transition-all duration-300 hover:border-cyan-400/50 mb-6">
      {/* HEADER DO CARD */}
      <div className="p-4 sm:p-5 border-b border-cyan-500/20 bg-gradient-to-r from-cyan-950/40 via-slate-900/60 to-slate-900/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 text-slate-950 shrink-0">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base sm:text-lg font-bold text-cyan-300 tracking-wide flex items-center gap-2">
                Histórico de Paridade (Pares vs Ímpares)
                <span className="text-[11px] font-normal uppercase px-2 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-400/30 text-cyan-300">
                  Últimos 20 Concursos
                </span>
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Auditoria de equilíbrio de pares e ímpares, destacando a média ideal (7/8 ou 8/7) para ajuste
              fino de fechamentos.
            </p>
          </div>
        </div>

        {/* Action Controls & Collapse */}
        <div className="flex items-center gap-2 self-end md:self-auto">
          <button
            onClick={() => handleCalibrateParidade(7, 8)}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 text-xs font-bold shadow-md shadow-cyan-500/20 hover:scale-[1.02] active:scale-95 transition cursor-pointer"
            title="Aplica o intervalo ideal de 7 a 8 pares nos filtros de fechamento"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Calibrar Paridade (7/8 ou 8/7)</span>
          </button>

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 rounded-lg border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
            title={isCollapsed ? 'Expandir' : 'Recolher'}
          >
            {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* FEEDBACK BANNER */}
      {appliedFeedback && (
        <div className="mx-4 mt-3 p-2.5 rounded-lg bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 text-xs flex items-center justify-between gap-2 animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>{appliedFeedback}</span>
          </div>
          {onNavigateToFechamento && (
            <button
              onClick={onNavigateToFechamento}
              className="px-2 py-0.5 rounded bg-cyan-500 text-slate-950 text-[11px] font-bold hover:bg-cyan-400 transition"
            >
              Ir para Fechamento →
            </button>
          )}
        </div>
      )}

      {/* CARD BODY */}
      {!isCollapsed && (
        <div className="p-4 sm:p-5 space-y-5">
          {/* TOP METRICS SUMMARY */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Média de Pares */}
            <div className="p-3 rounded-xl bg-slate-950/60 border border-cyan-500/20 flex flex-col justify-between">
              <span className="text-[11px] text-cyan-400/80 font-medium">Média de Pares</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-xl sm:text-2xl font-black text-cyan-300">{avgPares}</span>
                <span className="text-xs text-slate-400">/ 15 dezenas</span>
              </div>
              <span className="text-[10px] text-slate-400 mt-1">
                Teórico esperado: <strong className="text-slate-300">7.2 pares</strong>
              </span>
            </div>

            {/* Média de Ímpares */}
            <div className="p-3 rounded-xl bg-slate-950/60 border border-amber-500/20 flex flex-col justify-between">
              <span className="text-[11px] text-amber-400/80 font-medium">Média de Ímpares</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-xl sm:text-2xl font-black text-amber-300">{avgImpares}</span>
                <span className="text-xs text-slate-400">/ 15 dezenas</span>
              </div>
              <span className="text-[10px] text-slate-400 mt-1">
                Teórico esperado: <strong className="text-slate-300">7.8 ímpares</strong>
              </span>
            </div>

            {/* Taxa Média Ideal (7/8 ou 8/7) */}
            <div className="p-3 rounded-xl bg-slate-950/60 border border-emerald-500/20 flex flex-col justify-between">
              <span className="text-[11px] text-emerald-400/80 font-medium">Taxa Média Ideal</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-xl sm:text-2xl font-black text-emerald-400">{idealZonePct}%</span>
                <span className="text-xs text-slate-400">(7/8 ou 8/7)</span>
              </div>
              <span className="text-[10px] text-emerald-400/90 mt-1 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 inline" /> 56.8% Histórico Total
              </span>
            </div>

            {/* Moda Recente */}
            <div className="p-3 rounded-xl bg-slate-950/60 border border-indigo-500/20 flex flex-col justify-between">
              <span className="text-[11px] text-indigo-400/80 font-medium">Paridade Mais Frequente</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-xl sm:text-2xl font-black text-indigo-300">{mostFrequentParity}</span>
              </div>
              <span className="text-[10px] text-slate-400 mt-1">Pico nos últimos 20</span>
            </div>
          </div>

          {/* LISTA DOS 20 CONCURSOS COM BARRA DUPLA DE PARIDADE */}
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-cyan-400" />
                <h4 className="text-xs sm:text-sm font-bold text-slate-200">
                  Histórico Concurso a Concurso (Últimas 20 Apurações)
                </h4>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <span className="flex items-center gap-1.5 text-cyan-400 font-medium">
                  <span className="w-3 h-3 rounded-sm bg-gradient-to-r from-cyan-500 to-blue-500 inline-block shadow-sm shadow-cyan-500/40" />
                  Pares (12 possíveis)
                </span>
                <span className="flex items-center gap-1.5 text-amber-400 font-medium">
                  <span className="w-3 h-3 rounded-sm bg-gradient-to-r from-amber-500 to-yellow-400 inline-block shadow-sm shadow-amber-500/40" />
                  Ímpares (13 possíveis)
                </span>
              </div>
            </div>

            <div className="space-y-2 pt-1 max-h-96 overflow-y-auto pr-1">
              {drawsParity.map((item, idx) => {
                const paresPct = Math.round((item.paresCount / 15) * 100);
                const imparesPct = 100 - paresPct;
                const isSelected = selectedConcurso === item.concurso;
                const isLatest = idx === 0;

                return (
                  <div
                    key={item.concurso}
                    onClick={() =>
                      setSelectedConcurso(selectedConcurso === item.concurso ? null : item.concurso)
                    }
                    className={`p-2.5 rounded-lg border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-cyan-400 bg-cyan-950/20 shadow-md shadow-cyan-500/10'
                        : 'border-slate-800/80 bg-slate-900/60 hover:bg-slate-850 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-200">
                          #{item.concurso}
                          {isLatest && (
                            <span className="ml-1.5 text-[10px] uppercase font-semibold px-1.5 py-0.2 rounded bg-cyan-500 text-slate-950">
                              Atual
                            </span>
                          )}
                        </span>
                        <span className="text-[11px] text-slate-400 hidden sm:inline">{item.data}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="font-bold text-cyan-300 text-xs">{item.paresCount} Pares</span>
                        <span className="text-slate-500">•</span>
                        <span className="font-bold text-amber-300 text-xs">
                          {item.imparesCount} Ímpares
                        </span>

                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${
                            item.isIdealPattern
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                              : item.isAcceptablePattern
                              ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                              : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                          }`}
                        >
                          {item.isIdealPattern
                            ? '★ Média Ideal (7/8 ou 8/7)'
                            : item.isAcceptablePattern
                            ? 'Aceitável (6/9 ou 9/6)'
                            : 'Atípico'}
                        </span>
                      </div>
                    </div>

                    {/* DUAL COLOR BAR */}
                    <div className="h-3.5 rounded-md overflow-hidden flex bg-slate-950 border border-slate-700/60">
                      <div
                        style={{ width: `${paresPct}%` }}
                        className="bg-gradient-to-r from-cyan-600 via-cyan-500 to-blue-500 flex items-center justify-center text-[10px] font-black text-slate-950 transition-all duration-500"
                        title={`Pares: ${item.paresCount} (${paresPct}%)`}
                      >
                        {item.paresCount}P
                      </div>
                      <div
                        style={{ width: `${imparesPct}%` }}
                        className="bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-400 flex items-center justify-center text-[10px] font-black text-slate-950 transition-all duration-500"
                        title={`Ímpares: ${item.imparesCount} (${imparesPct}%)`}
                      >
                        {item.imparesCount}I
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* INSPECTION DRAWER */}
          {selectedDrawDetail && (
            <div className="p-4 rounded-xl bg-slate-950/80 border border-cyan-500/40 space-y-3 animate-fadeIn">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  <h4 className="text-sm font-bold text-cyan-300">
                    Concurso #{selectedDrawDetail.concurso} ({selectedDrawDetail.data})
                  </h4>
                </div>
                <span className="text-xs text-slate-400">{selectedDrawDetail.statusLabel}</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3 rounded-lg bg-cyan-950/20 border border-cyan-500/30">
                  <span className="text-xs font-bold text-cyan-300 block mb-2">
                    Dezenas Pares ({selectedDrawDetail.paresCount})
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedDrawDetail.paresDezenas.map((dez) => (
                      <span
                        key={dez}
                        className="w-7 h-7 rounded-md bg-gradient-to-br from-cyan-400 to-blue-500 text-slate-950 font-black text-xs flex items-center justify-center shadow-sm"
                      >
                        {dez.toString().padStart(2, '0')}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-amber-950/20 border border-amber-500/30">
                  <span className="text-xs font-bold text-amber-300 block mb-2">
                    Dezenas Ímpares ({selectedDrawDetail.imparesCount})
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedDrawDetail.imparesDezenas.map((dez) => (
                      <span
                        key={dez}
                        className="w-7 h-7 rounded-md bg-gradient-to-br from-amber-400 to-yellow-500 text-slate-950 font-black text-xs flex items-center justify-center shadow-sm"
                      >
                        {dez.toString().padStart(2, '0')}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* EDUCATIONAL TIP */}
          <div className="p-3.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-xs text-slate-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-cyan-200">A Regra dos 7/8 e 8/7 na Lotofácil:</p>
                <p className="text-slate-400 text-[11px] mt-0.5">
                  As configurações <strong>7 Pares / 8 Ímpares (31,3%)</strong> e{' '}
                  <strong>8 Pares / 7 Ímpares (25,5%)</strong> representam sozinhas{' '}
                  <strong className="text-cyan-300">56,8% de todos os concursos oficiais da história</strong>.
                  Ajustar seus fechamentos para este intervalo (7 a 8 pares) elimina mais de 43% dos jogos
                  matematicamente improváveis e maximiza o ROI da aposta.
                </p>
              </div>
            </div>

            <button
              onClick={() => handleCalibrateParidade(7, 8)}
              className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 text-xs font-bold transition cursor-pointer"
            >
              <span>Aplicar Paridade Ideal (7 a 8 Pares)</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
