import React, { useMemo, useState } from 'react';
import { LotofacilDraw } from '../types/lotofacil';
import { RECENT_DRAWS, MOLDURA, MIOLO } from '../data/lotofacilData';
import {
  Layers,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Info,
  CheckCircle2,
  TrendingUp,
  Sliders,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';
import { soundService } from '../services/soundAlert';

interface IndiceMolduraUltimos10CardProps {
  latestDraw: LotofacilDraw;
  onApplyMolduraFilter?: (min: number, max: number) => void;
  onNavigateToFechamento?: () => void;
}

export interface DrawMolduraInfo {
  concurso: number;
  data: string;
  totalDezenas: number;
  molduraCount: number;
  mioloCount: number;
  molduraDezenas: number[];
  mioloDezenas: number[];
  isGoldenZone: boolean; // 9 or 10 on Moldura (canonical standard)
  isAcceptableZone: boolean; // 8 or 11
  isAtypical: boolean; // <= 7 or >= 12
  statusLabel: string;
}

export const IndiceMolduraUltimos10Card: React.FC<IndiceMolduraUltimos10CardProps> = ({
  latestDraw,
  onApplyMolduraFilter,
  onNavigateToFechamento,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [selectedConcurso, setSelectedConcurso] = useState<number | null>(null);
  const [appliedFeedback, setAppliedFeedback] = useState<string | null>(null);

  // Consolidated list of last 10 draws
  const last10Draws = useMemo(() => {
    const list: LotofacilDraw[] = [latestDraw];
    RECENT_DRAWS.forEach((d) => {
      if (!list.some((existing) => existing.concurso === d.concurso)) {
        list.push(d);
      }
    });
    return list.slice(0, 10);
  }, [latestDraw]);

  // Compute Moldura vs Miolo analytics for each of the 10 draws
  const { drawsAnalysis, avgMoldura, avgMiolo, goldenZonePct, mostFrequentMoldura, distributionStats } =
    useMemo(() => {
      let sumMoldura = 0;
      let sumMiolo = 0;
      let goldenZoneCount = 0;
      const freqCounts: Record<number, number> = {};

      const analysis: DrawMolduraInfo[] = last10Draws.map((draw) => {
        const mDezenas = draw.dezenas.filter((n) => MOLDURA.includes(n)).sort((a, b) => a - b);
        const cDezenas = draw.dezenas.filter((n) => MIOLO.includes(n)).sort((a, b) => a - b);
        const mCount = mDezenas.length;
        const cCount = cDezenas.length;

        sumMoldura += mCount;
        sumMiolo += cCount;
        freqCounts[mCount] = (freqCounts[mCount] || 0) + 1;

        const isGolden = mCount === 9 || mCount === 10;
        const isAcceptable = mCount === 8 || mCount === 11;
        const isAtyp = mCount <= 7 || mCount >= 12;

        if (isGolden) goldenZoneCount++;

        let statusLabel = 'Zona de Ouro (Padrão Canônico)';
        if (mCount === 10) statusLabel = '10 Moldura / 5 Miolo (Máxima Probabilidade)';
        else if (mCount === 9) statusLabel = '9 Moldura / 6 Miolo (Equilíbrio Teórico)';
        else if (mCount === 8) statusLabel = '8 Moldura / 7 Miolo (Centro Ativo)';
        else if (mCount === 11) statusLabel = '11 Moldura / 4 Miolo (Borda Expandida)';
        else statusLabel = `${mCount} Moldura / ${cCount} Miolo (Desvio Atípico)`;

        return {
          concurso: draw.concurso,
          data: draw.data,
          totalDezenas: draw.dezenas.length,
          molduraCount: mCount,
          mioloCount: cCount,
          molduraDezenas: mDezenas,
          mioloDezenas: cDezenas,
          isGoldenZone: isGolden,
          isAcceptableZone: isAcceptable,
          isAtypical: isAtyp,
          statusLabel,
        };
      });

      const total = last10Draws.length || 1;
      const avgM = Number((sumMoldura / total).toFixed(1));
      const avgC = Number((sumMiolo / total).toFixed(1));
      const goldenPct = Math.round((goldenZoneCount / total) * 100);

      // Find mode (most frequent Moldura count)
      let maxFreq = 0;
      let mode = 10;
      Object.entries(freqCounts).forEach(([mVal, count]) => {
        if (count > maxFreq) {
          maxFreq = count;
          mode = Number(mVal);
        }
      });

      return {
        drawsAnalysis: analysis,
        avgMoldura: avgM,
        avgMiolo: avgC,
        goldenZonePct: goldenPct,
        mostFrequentMoldura: mode,
        distributionStats: freqCounts,
      };
    }, [last10Draws]);

  // Handle auto-calibrating the canonical Moldura filter (9 a 10)
  const handleCalibrateMoldura = (min = 9, max = 10) => {
    soundService.playGoldenZoneSuccessChime();
    if (onApplyMolduraFilter) {
      onApplyMolduraFilter(min, max);
    }

    // Also dispatch custom event so FechamentoTab receives it globally
    try {
      const event = new CustomEvent('lotosniper-moldura-filter-applied', {
        detail: { molduraMin: min, molduraMax: max },
      });
      window.dispatchEvent(event);
    } catch {
      // ignore
    }

    setAppliedFeedback(`Filtro calibrado com sucesso: Moldura entre ${min} e ${max} dezenas!`);
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
    ? drawsAnalysis.find((d) => d.concurso === selectedConcurso)
    : null;

  return (
    <div className="card-pro overflow-hidden border border-amber-500/30 bg-slate-900/90 shadow-2xl backdrop-blur-md transition-all duration-300 hover:border-amber-400/50 mb-6">
      {/* HEADER DO CARD */}
      <div className="p-4 sm:p-5 border-b border-amber-500/20 bg-gradient-to-r from-amber-950/40 via-slate-900/60 to-slate-900/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/20 text-slate-950">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-bold text-amber-300 tracking-wide flex items-center gap-2">
                Índice de Moldura vs Centro
                <span className="text-[11px] font-normal uppercase px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/30 text-amber-300">
                  Últimos 10 Concursos
                </span>
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Relação de dezenas na borda externa (16 dezenas) versus centro do volante (9 dezenas) para
              calibração matemática de fechamentos.
            </p>
          </div>
        </div>

        {/* Action Controls & Collapse */}
        <div className="flex items-center gap-2 self-end md:self-auto">
          <button
            onClick={() => handleCalibrateMoldura(9, 10)}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-slate-950 text-xs font-bold shadow-md shadow-amber-500/20 hover:scale-[1.02] active:scale-95 transition cursor-pointer"
            title="Aplica o intervalo de ouro de 9 a 10 dezenas nos filtros de fechamento"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Calibrar Filtro (9 a 10)</span>
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
        <div className="mx-4 mt-3 p-2.5 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs flex items-center justify-between gap-2 animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{appliedFeedback}</span>
          </div>
          {onNavigateToFechamento && (
            <button
              onClick={onNavigateToFechamento}
              className="px-2 py-0.5 rounded bg-amber-500 text-slate-950 text-[11px] font-bold hover:bg-amber-400 transition"
            >
              Ir para Volante →
            </button>
          )}
        </div>
      )}

      {/* CARD BODY */}
      {!isCollapsed && (
        <div className="p-4 sm:p-5 space-y-5">
          {/* TOP METRICS SUMMARY BANNER */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Média Moldura */}
            <div className="p-3 rounded-xl bg-slate-950/60 border border-amber-500/20 flex flex-col justify-between">
              <span className="text-[11px] text-amber-400/80 font-medium">Média na Moldura (Borda)</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-xl sm:text-2xl font-black text-amber-300">{avgMoldura}</span>
                <span className="text-xs text-slate-400">/ 16 dezenas</span>
              </div>
              <span className="text-[10px] text-slate-400 mt-1">
                Teórico esperado: <strong className="text-slate-300">9.6</strong>
              </span>
            </div>

            {/* Média Miolo */}
            <div className="p-3 rounded-xl bg-slate-950/60 border border-cyan-500/20 flex flex-col justify-between">
              <span className="text-[11px] text-cyan-400/80 font-medium">Média no Miolo (Centro)</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-xl sm:text-2xl font-black text-cyan-300">{avgMiolo}</span>
                <span className="text-xs text-slate-400">/ 9 dezenas</span>
              </div>
              <span className="text-[10px] text-slate-400 mt-1">
                Teórico esperado: <strong className="text-slate-300">5.4</strong>
              </span>
            </div>

            {/* Taxa Zona de Ouro (9 ou 10) */}
            <div className="p-3 rounded-xl bg-slate-950/60 border border-emerald-500/20 flex flex-col justify-between">
              <span className="text-[11px] text-emerald-400/80 font-medium">Conformidade Zona de Ouro</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-xl sm:text-2xl font-black text-emerald-400">{goldenZonePct}%</span>
                <span className="text-xs text-slate-400">(9 ou 10)</span>
              </div>
              <span className="text-[10px] text-emerald-400/90 mt-1 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 inline" /> Padrão de Alta Eficiência
              </span>
            </div>

            {/* Ponto Focal / Moda */}
            <div className="p-3 rounded-xl bg-slate-950/60 border border-amber-500/20 flex flex-col justify-between">
              <span className="text-[11px] text-yellow-400/80 font-medium">Moda Recente</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-xl sm:text-2xl font-black text-yellow-300">
                  {mostFrequentMoldura}M / {15 - mostFrequentMoldura}C
                </span>
              </div>
              <span className="text-[10px] text-slate-400 mt-1">Distribuição mais recorrente</span>
            </div>
          </div>

          {/* VISUAL BAR CHART TIMELINE (ÚLTIMOS 10 CONCURSOS) */}
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-amber-400" />
                <h4 className="text-xs sm:text-sm font-bold text-slate-200">
                  Distribuição Visual Concurso a Concurso (Borda Externa vs Centro)
                </h4>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <span className="flex items-center gap-1.5 text-amber-400 font-medium">
                  <span className="w-3 h-3 rounded-sm bg-gradient-to-r from-amber-500 to-yellow-500 inline-block shadow-sm shadow-amber-500/40" />
                  Moldura (16 dezenas)
                </span>
                <span className="flex items-center gap-1.5 text-cyan-400 font-medium">
                  <span className="w-3 h-3 rounded-sm bg-gradient-to-r from-cyan-600 to-blue-500 inline-block shadow-sm shadow-cyan-500/40" />
                  Centro / Miolo (9 dezenas)
                </span>
              </div>
            </div>

            {/* PROGRESS LIST */}
            <div className="space-y-2.5 pt-1">
              {drawsAnalysis.map((item, idx) => {
                const molduraPct = Math.round((item.molduraCount / 15) * 100);
                const mioloPct = 100 - molduraPct;
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
                        ? 'border-amber-400 bg-amber-950/20 shadow-md shadow-amber-500/10'
                        : 'border-slate-800/80 bg-slate-900/60 hover:bg-slate-850 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-200">
                          #{item.concurso}
                          {isLatest && (
                            <span className="ml-1.5 text-[10px] uppercase font-semibold px-1.5 py-0.2 rounded bg-amber-500 text-slate-950">
                              Atual
                            </span>
                          )}
                        </span>
                        <span className="text-[11px] text-slate-400 hidden sm:inline">{item.data}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="font-bold text-amber-300 text-xs">
                          {item.molduraCount} Moldura
                        </span>
                        <span className="text-slate-500">•</span>
                        <span className="font-bold text-cyan-300 text-xs">{item.mioloCount} Centro</span>

                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${
                            item.isGoldenZone
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                              : item.isAcceptableZone
                              ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                              : 'bg-red-500/20 text-red-300 border-red-500/40'
                          }`}
                        >
                          {item.isGoldenZone ? '★ Zona de Ouro' : item.isAcceptableZone ? 'Aceitável' : 'Desvio'}
                        </span>
                      </div>
                    </div>

                    {/* DUAL COLOR SPLIT BAR */}
                    <div className="h-4 rounded-md overflow-hidden flex bg-slate-950 border border-slate-700/60">
                      {/* Moldura Segment (Gold / Amber) */}
                      <div
                        style={{ width: `${molduraPct}%` }}
                        className="bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-400 flex items-center justify-center text-[10px] font-black text-slate-950 transition-all duration-500"
                        title={`Moldura: ${item.molduraCount} dezenas (${molduraPct}%)`}
                      >
                        {item.molduraCount}M
                      </div>

                      {/* Miolo Segment (Cyan / Teal) */}
                      <div
                        style={{ width: `${mioloPct}%` }}
                        className="bg-gradient-to-r from-cyan-600 to-blue-500 flex items-center justify-center text-[10px] font-black text-slate-950 transition-all duration-500"
                        title={`Miolo: ${item.mioloCount} dezenas (${mioloPct}%)`}
                      >
                        {item.mioloCount}C
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* INSPECTION DRAWER FOR SELECTED CONCURSO */}
          {selectedDrawDetail && (
            <div className="p-4 rounded-xl bg-slate-950/80 border border-amber-500/40 space-y-3 animate-fadeIn">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <h4 className="text-sm font-bold text-amber-300">
                    Detalhamento do Concurso #{selectedDrawDetail.concurso} ({selectedDrawDetail.data})
                  </h4>
                </div>
                <span className="text-xs text-slate-400">{selectedDrawDetail.statusLabel}</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Dezenas na Moldura */}
                <div className="p-3 rounded-lg bg-amber-950/20 border border-amber-500/30">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-amber-300">
                      Borda Externa / Moldura ({selectedDrawDetail.molduraCount} dezenas)
                    </span>
                    <span className="text-[10px] text-amber-400">16 possíveis</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedDrawDetail.molduraDezenas.map((dez) => (
                      <span
                        key={dez}
                        className="w-7 h-7 rounded-md bg-gradient-to-br from-amber-400 to-yellow-500 text-slate-950 font-black text-xs flex items-center justify-center shadow-sm"
                      >
                        {dez.toString().padStart(2, '0')}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Dezenas no Miolo */}
                <div className="p-3 rounded-lg bg-cyan-950/20 border border-cyan-500/30">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-cyan-300">
                      Centro / Miolo ({selectedDrawDetail.mioloCount} dezenas)
                    </span>
                    <span className="text-[10px] text-cyan-400">9 possíveis</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedDrawDetail.mioloDezenas.map((dez) => (
                      <span
                        key={dez}
                        className="w-7 h-7 rounded-md bg-gradient-to-br from-cyan-400 to-blue-500 text-slate-950 font-black text-xs flex items-center justify-center shadow-sm"
                      >
                        {dez.toString().padStart(2, '0')}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* EDUCATIONAL / STRATEGIC GUIDANCE BANNER */}
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-slate-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-200">Por que o Índice de Moldura é crucial?</p>
                <p className="text-slate-400 text-[11px] mt-0.5">
                  Estatisticamente, mais de <strong>63% dos concursos oficiais</strong> da Lotofácil contêm{' '}
                  <strong className="text-amber-300">9 ou 10 dezenas na Moldura</strong> (e respectivamente 6 ou 5
                  no Miolo). Fechamentos que respeitam este equilíbrio reduzem apostas com viés improvável e
                  maximizam o retorno matemático do desdobramento.
                </p>
              </div>
            </div>

            <button
              onClick={() => handleCalibrateMoldura(9, 10)}
              className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-bold transition cursor-pointer"
            >
              <span>Aplicar Zona de Ouro (9-10)</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
