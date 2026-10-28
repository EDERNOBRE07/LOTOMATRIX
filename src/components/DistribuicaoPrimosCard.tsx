import React, { useMemo, useState } from 'react';
import { LotofacilDraw } from '../types/lotofacil';
import { RECENT_DRAWS, PRIMOS, PRIMOS_HISTORICA } from '../data/lotofacilData';
import {
  Sparkles,
  Sliders,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Info,
  ShieldCheck,
  TrendingUp,
  ArrowRight,
  Flame,
} from 'lucide-react';
import { soundService } from '../services/soundAlert';
import { useMetricGlow } from '../hooks/useMetricGlow';

interface DistribuicaoPrimosCardProps {
  latestDraw: LotofacilDraw;
  onApplyPrimosFilter?: (min: number, max: number) => void;
  onNavigateToFechamento?: () => void;
}

export const DistribuicaoPrimosCard: React.FC<DistribuicaoPrimosCardProps> = ({
  latestDraw,
  onApplyPrimosFilter,
  onNavigateToFechamento,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [appliedFeedback, setAppliedFeedback] = useState<string | null>(null);
  const isGlowing = useMetricGlow(latestDraw.concurso);

  // Consolidated list of last 20 draws for recent adherence analysis
  const recentDrawsList = useMemo(() => {
    const list: LotofacilDraw[] = [latestDraw];
    RECENT_DRAWS.forEach((d) => {
      if (!list.some((existing) => existing.concurso === d.concurso)) {
        list.push(d);
      }
    });
    return list.slice(0, 20);
  }, [latestDraw]);

  // Primes in latest draw
  const primosNoConcurso = useMemo(() => {
    return latestDraw.dezenas.filter((n) => PRIMOS.includes(n)).sort((a, b) => a - b);
  }, [latestDraw.dezenas]);

  const totalPrimosAtual = primosNoConcurso.length;

  // Recent adherence rate (draws with 4 to 7 primes)
  const { aderenciaPct, aderenciaCount, avgPrimosRecente, distribuicaoRecente } = useMemo(() => {
    let dentroIntervalo = 0;
    let somaTotal = 0;
    const distMap: Record<number, number> = {};

    recentDrawsList.forEach((d) => {
      const pCount = d.dezenas.filter((n) => PRIMOS.includes(n)).length;
      somaTotal += pCount;
      distMap[pCount] = (distMap[pCount] || 0) + 1;
      if (pCount >= 4 && pCount <= 7) {
        dentroIntervalo++;
      }
    });

    const total = recentDrawsList.length || 1;
    const pct = Math.round((dentroIntervalo / total) * 100);
    const avg = Number((somaTotal / total).toFixed(1));

    return {
      aderenciaPct: pct,
      aderenciaCount: dentroIntervalo,
      avgPrimosRecente: avg,
      distribuicaoRecente: distMap,
    };
  }, [recentDrawsList]);

  // Status label for latest draw
  const statusAtual = useMemo(() => {
    if (totalPrimosAtual === 5 || totalPrimosAtual === 6) {
      return {
        label: 'Faixa de Ouro (5 ou 6 Primos)',
        classe: 'text-amber-400 bg-amber-500/20 border-amber-500/40',
        tipo: 'ouro',
      };
    }
    if (totalPrimosAtual === 4 || totalPrimosAtual === 7) {
      return {
        label: 'Intervalo Aceitável (4 ou 7 Primos)',
        classe: 'text-emerald-400 bg-emerald-500/20 border-emerald-500/40',
        tipo: 'aceitavel',
      };
    }
    return {
      label: `Desvio Atípico (${totalPrimosAtual} Primos)`,
      classe: 'text-rose-400 bg-rose-500/20 border-rose-500/40',
      tipo: 'atipico',
    };
  }, [totalPrimosAtual]);

  // Quick calibration to golden primes interval (5 a 6)
  const handleCalibratePrimos = (min = 5, max = 6) => {
    soundService.playGoldenZoneSuccessChime();
    if (onApplyPrimosFilter) {
      onApplyPrimosFilter(min, max);
    }

    try {
      const event = new CustomEvent('lotosniper-primos-filter-applied', {
        detail: { primosMin: min, primosMax: max },
      });
      window.dispatchEvent(event);
    } catch {}

    setAppliedFeedback(
      `Filtro de Números Primos calibrado com sucesso: [${min} a ${max} Primos] (Faixa de Máxima Eficiência)!`
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

  return (
    <div
      className={`card-pro overflow-hidden border border-purple-500/30 bg-slate-900/90 shadow-2xl backdrop-blur-md transition-all duration-500 hover:border-purple-400/50 mb-6 ${
        isGlowing ? 'animate-golden-glow ring-2 ring-amber-400/90' : ''
      }`}
    >
      {/* HEADER DO CARD */}
      <div className="p-4 sm:p-5 border-b border-purple-500/20 bg-gradient-to-r from-purple-950/40 via-slate-900/60 to-slate-900/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-400 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/20 text-slate-950 shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base sm:text-lg font-bold text-purple-300 tracking-wide flex items-center gap-2">
                Distribuição de Números Primos no Volante
                <span
                  className={`text-[11px] font-normal uppercase px-2 py-0.5 rounded-full border transition-all ${
                    isGlowing
                      ? 'bg-amber-400 text-slate-950 border-amber-300 font-bold shadow-[0_0_15px_rgba(251,191,36,0.6)]'
                      : 'bg-purple-500/20 border-purple-400/30 text-purple-300'
                  }`}
                >
                  Padrão Canônico: 4 a 7 Primos
                </span>
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Frequência de saída dos 9 números primos da Lotofácil [2, 3, 5, 7, 11, 13, 17, 19, 23] contra o
              intervalo estatisticamente aceitável.
            </p>
          </div>
        </div>

        {/* Action Controls & Collapse */}
        <div className="flex items-center gap-2 self-end md:self-auto">
          <button
            onClick={() => handleCalibratePrimos(5, 6)}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 text-white text-xs font-bold shadow-md shadow-purple-500/20 hover:scale-[1.02] active:scale-95 transition cursor-pointer"
            title="Aplica o pico de ouro de 5 a 6 primos nos filtros"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Calibrar Primos (5 a 6)</span>
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
        <div className="mx-4 mt-3 p-2.5 rounded-lg bg-purple-500/20 border border-purple-500/40 text-purple-300 text-xs flex items-center justify-between gap-2 animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0" />
            <span>{appliedFeedback}</span>
          </div>
          {onNavigateToFechamento && (
            <button
              onClick={onNavigateToFechamento}
              className="px-2 py-0.5 rounded bg-purple-500 text-slate-950 text-[11px] font-bold hover:bg-purple-400 transition"
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
            {/* Primos no Concurso Atual */}
            <div className="p-3 rounded-xl bg-slate-950/60 border border-purple-500/20 flex flex-col justify-between">
              <span className="text-[11px] text-purple-400/80 font-medium">Primos no Concurso #{latestDraw.concurso}</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-xl sm:text-2xl font-black text-purple-300">{totalPrimosAtual}</span>
                <span className="text-xs text-slate-400">/ 9 primos</span>
              </div>
              <span className="text-[10px] text-slate-400 mt-1">
                Teórico esperado: <strong className="text-slate-300">5.4 primos</strong>
              </span>
            </div>

            {/* Taxa de Aderência ao Intervalo 4-7 */}
            <div className="p-3 rounded-xl bg-slate-950/60 border border-emerald-500/20 flex flex-col justify-between">
              <span className="text-[11px] text-emerald-400/80 font-medium">Aderência ao Intervalo (4 a 7)</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-xl sm:text-2xl font-black text-emerald-400">{aderenciaPct}%</span>
                <span className="text-xs text-slate-400">({aderenciaCount}/20)</span>
              </div>
              <span className="text-[10px] text-emerald-400/90 mt-1 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 inline" /> 91.3% na história Caixa
              </span>
            </div>

            {/* Média Recente */}
            <div className="p-3 rounded-xl bg-slate-950/60 border border-indigo-500/20 flex flex-col justify-between">
              <span className="text-[11px] text-indigo-400/80 font-medium">Média Últimos 20</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-xl sm:text-2xl font-black text-indigo-300">{avgPrimosRecente}</span>
                <span className="text-xs text-slate-400">primos</span>
              </div>
              <span className="text-[10px] text-slate-400 mt-1">Equilíbrio contínuo</span>
            </div>

            {/* Pico de Ouro Histórico */}
            <div className="p-3 rounded-xl bg-slate-950/60 border border-amber-500/20 flex flex-col justify-between">
              <span className="text-[11px] text-amber-400/80 font-medium">Pico de Ouro (5 ou 6)</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-xl sm:text-2xl font-black text-amber-300">60,2%</span>
                <span className="text-xs text-slate-400">dos sorteios</span>
              </div>
              <span className="text-[10px] text-amber-300/90 mt-1 flex items-center gap-1">
                <Flame className="w-3 h-3 inline fill-current" /> Padrão Ouro Lotofácil
              </span>
            </div>
          </div>

          {/* BARRA DE PROGRESSO VISUAL DE ADERÊNCIA (ESPECTRO DE 0 A 9 PRIMOS) */}
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-purple-400" />
                <h4 className="text-xs sm:text-sm font-bold text-slate-200">
                  Barra Visual de Aderência do Volante (Espectro de 0 a 9 Primos)
                </h4>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1 text-slate-400">
                  Status Atual:
                  <strong className={`px-2 py-0.5 rounded-full border text-[11px] ${statusAtual.classe}`}>
                    {totalPrimosAtual} Primos • {statusAtual.label}
                  </strong>
                </span>
              </div>
            </div>

            {/* BARRA SEGMENTADA DE ADERÊNCIA COM MARCADOR */}
            <div className="space-y-1.5 pt-2">
              <div className="grid grid-cols-10 gap-1.5 h-7">
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((val) => {
                  const isCurrent = totalPrimosAtual === val;
                  const isOptimal = val === 5 || val === 6;
                  const isAcceptable = val === 4 || val === 7;
                  const isOutside = val <= 3 || val >= 8;

                  let bgColor = 'bg-rose-950/40 border-rose-900/50 text-rose-500';
                  let zoneLabel = 'Atípico';
                  if (isOptimal) {
                    bgColor =
                      'bg-gradient-to-b from-amber-500/30 to-yellow-600/30 border-amber-400 text-amber-300 font-black shadow-sm shadow-amber-500/20';
                    zoneLabel = 'Pico Ouro (60%)';
                  } else if (isAcceptable) {
                    bgColor =
                      'bg-gradient-to-b from-emerald-500/20 to-teal-600/20 border-emerald-400/50 text-emerald-300 font-bold';
                    zoneLabel = 'Aceitável (31%)';
                  }

                  return (
                    <div
                      key={val}
                      className={`relative rounded-md border flex flex-col items-center justify-center transition-all ${bgColor} ${
                        isCurrent
                          ? 'ring-2 ring-white scale-105 shadow-lg shadow-purple-500/40 z-10'
                          : 'opacity-85'
                      }`}
                      title={`${val} Primos: ${zoneLabel}`}
                    >
                      <span className="text-xs font-black">{val}</span>
                      {isCurrent && (
                        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 flex flex-col items-center">
                          <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                          <span className="text-[9px] font-black uppercase text-amber-300 bg-slate-950 px-1 rounded border border-amber-400">
                            Atual
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Legenda do Espectro */}
              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                <span className="text-rose-400/80">0 a 3: Desvio Raro (&lt;5%)</span>
                <span className="text-emerald-400 font-bold">4 a 7: Intervalo Estatisticamente Aceitável (91,3%)</span>
                <span className="text-rose-400/80">8 a 9: Desvio Raro (&lt;3%)</span>
              </div>
            </div>
          </div>

          {/* AUDITORIA DOS 9 PRIMOS OFICIAIS NO ÚLTIMO CONCURSO */}
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200">
                Auditoria dos 9 Primos no Concurso #{latestDraw.concurso} ({primosNoConcurso.length} Sorteados / 9 Possíveis):
              </span>
              <span className="text-[11px] text-purple-400">
                {primosNoConcurso.length >= 4 && primosNoConcurso.length <= 7
                  ? '✓ Dentro da Faixa Aceitável'
                  : '⚠ Desvio da Faixa'}
              </span>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-9 gap-2">
              {PRIMOS.map((num) => {
                const wasDrawn = latestDraw.dezenas.includes(num);
                return (
                  <div
                    key={num}
                    className={`p-2 rounded-lg border text-center transition-all ${
                      wasDrawn
                        ? 'bg-gradient-to-br from-purple-500/30 to-indigo-600/30 border-purple-400/60 shadow-md shadow-purple-500/20'
                        : 'bg-slate-900 border-slate-800 opacity-60'
                    }`}
                  >
                    <span
                      className={`text-sm font-black block ${
                        wasDrawn ? 'text-purple-300' : 'text-slate-500'
                      }`}
                    >
                      {num.toString().padStart(2, '0')}
                    </span>
                    <span
                      className={`text-[9px] uppercase font-bold block mt-0.5 ${
                        wasDrawn ? 'text-purple-400' : 'text-slate-600'
                      }`}
                    >
                      {wasDrawn ? 'Presente' : 'Ausente'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* EDUCATIONAL TIP BANNER */}
          <div className="p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs text-slate-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <Info className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-purple-200">Por que calibrar os números primos?</p>
                <p className="text-slate-400 text-[11px] mt-0.5">
                  A Lotofácil possui apenas 9 números primos. Em mais de <strong>91% das apurações oficiais</strong>,
                  o resultado sorteado contém entre <strong className="text-purple-300">4 e 7 números primos</strong>{' '}
                  (com pico de 60,2% em 5 ou 6). Apostas com menos de 4 ou mais de 7 primos representam
                  combinações estatisticamente inviáveis.
                </p>
              </div>
            </div>

            <button
              onClick={() => handleCalibratePrimos(4, 7)}
              className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-300 text-xs font-bold transition cursor-pointer"
            >
              <span>Aplicar Faixa 4 a 7</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
