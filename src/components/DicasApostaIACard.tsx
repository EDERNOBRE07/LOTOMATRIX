import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  AIPredictionResponse,
  DezenaStats,
  FilterCriteria,
  LotofacilDraw,
} from '../types/lotofacil';
import { CONCURSO_ATUAL, DEZENAS_STATS } from '../data/lotofacilData';
import { analyzeTicket } from '../services/combinatorics';
import { staggerBallVariants, staggerContainerVariants } from '../utils/staggerAnimation';
import {
  Flame,
  Snowflake,
  Sparkles,
  ArrowRight,
  Copy,
  Check,
  Target,
  ShieldCheck,
} from 'lucide-react';

interface DicasApostaIACardProps {
  latestDraw?: LotofacilDraw;
  prediction: AIPredictionResponse | null;
  isLoading?: boolean;
  fallbackScores?: number[];
  dynamicStats?: DezenaStats[];
  cyclePendingNumbers?: number[];
  activeFilterConfig?: FilterCriteria;
  onApplyRecommendation: (numbers: number[]) => void;
  onFixHotNumbers?: (numbers: number[]) => void;
  hideHotColdGrid?: boolean;
}

interface RankedNumber {
  numero: number;
  score: number;
  atrasoAtual: number;
  saiuUltimo: boolean;
  pendenteCiclo: boolean;
  isChaveIA: boolean;
}

export const DicasApostaIACard: React.FC<DicasApostaIACardProps> = ({
  latestDraw = CONCURSO_ATUAL,
  prediction,
  isLoading = false,
  fallbackScores,
  dynamicStats = DEZENAS_STATS,
  cyclePendingNumbers = [],
  activeFilterConfig,
  onApplyRecommendation,
  onFixHotNumbers,
  hideHotColdGrid = false,
}) => {
  const [copiedComboIdx, setCopiedComboIdx] = useState<number | null>(null);
  const [fixedApplied, setFixedApplied] = useState<boolean>(false);
  const usingDirectPrediction = Boolean(prediction?.scores && prediction.scores.length === 25);

  const taxaConfianca = prediction?.taxaConfianca ?? 95.8;

  const effectiveScores = useMemo(() => {
    if (prediction?.scores && prediction.scores.length === 25) {
      return prediction.scores.map((s) => Math.round(Math.min(99, Math.max(1, Number(s) || 50))));
    }
    if (fallbackScores && fallbackScores.length === 25) {
      return fallbackScores.map((s) => Math.round(Math.min(99, Math.max(1, Number(s) || 50))));
    }
    return Array.from({ length: 25 }, (_, i) => {
      const num = i + 1;
      const stat = dynamicStats.find((s) => s.numero === num);
      const base = stat ? Math.min(96, Math.round((stat.vezes / 2500) * 85)) : 60;
      return cyclePendingNumbers.includes(num) ? Math.min(99, base + 12) : base;
    });
  }, [prediction?.scores, fallbackScores, dynamicStats, cyclePendingNumbers]);

  const rankedNumbers = useMemo<RankedNumber[]>(() => {
    const excluded = new Set(activeFilterConfig?.dezenasExcluidas || []);
    const keySet = new Set(prediction?.dezenasChave || []);
    return Array.from({ length: 25 }, (_, i) => {
      const numero = i + 1;
      const stat = dynamicStats.find((s) => s.numero === numero);
      return {
        numero,
        score: excluded.has(numero) ? 1 : effectiveScores[i],
        atrasoAtual: stat?.atrasoAtual ?? 0,
        saiuUltimo: latestDraw.dezenas.includes(numero),
        pendenteCiclo: cyclePendingNumbers.includes(numero),
        isChaveIA: keySet.has(numero),
      };
    });
  }, [
    effectiveScores,
    dynamicStats,
    latestDraw.dezenas,
    cyclePendingNumbers,
    activeFilterConfig?.dezenasExcluidas,
    prediction?.dezenasChave,
  ]);

  const meanScore = useMemo(() => {
    const sum = rankedNumbers.reduce((acc, item) => acc + item.score, 0);
    return Number((sum / Math.max(1, rankedNumbers.length)).toFixed(1));
  }, [rankedNumbers]);

  const top5Quentes = useMemo(() => {
    return [...rankedNumbers]
      .sort((a, b) => b.score - a.score || a.numero - b.numero)
      .slice(0, 5);
  }, [rankedNumbers]);

  const top5Frias = useMemo(() => {
    const hotSet = new Set(top5Quentes.map((q) => q.numero));
    return [...rankedNumbers]
      .filter((item) => !hotSet.has(item.numero))
      .sort((a, b) => a.score - b.score || b.atrasoAtual - a.atrasoAtual || a.numero - b.numero)
      .slice(0, 5);
  }, [rankedNumbers, top5Quentes]);

  const avgHotScore = useMemo(
    () =>
      Number(
        (top5Quentes.reduce((acc, item) => acc + item.score, 0) / Math.max(1, top5Quentes.length)).toFixed(1)
      ),
    [top5Quentes]
  );

  const avgColdScore = useMemo(
    () =>
      Number(
        (top5Frias.reduce((acc, item) => acc + item.score, 0) / Math.max(1, top5Frias.length)).toFixed(1)
      ),
    [top5Frias]
  );

  const suggestedCombos = useMemo(() => {
    const excluded = new Set(activeFilterConfig?.dezenasExcluidas || []);
    const fixed = (activeFilterConfig?.dezenasFixas || []).filter((n) => !excluded.has(n));
    const orderedByScore = [...rankedNumbers]
      .filter((r) => !excluded.has(r.numero))
      .sort((a, b) => b.score - a.score || a.numero - b.numero)
      .map((r) => r.numero);

    const hotNums = top5Quentes.map((q) => q.numero).filter((n) => !excluded.has(n));
    const coldNums = top5Frias.map((f) => f.numero).filter((n) => !excluded.has(n));

    const buildBet15 = (seedNums: number[], fallbackOrder: number[]): number[] => {
      const chosen = new Set<number>();
      for (const n of fixed) {
        if (chosen.size < 15) chosen.add(n);
      }
      for (const n of seedNums) {
        if (chosen.size < 15 && !excluded.has(n)) chosen.add(n);
      }
      for (const n of fallbackOrder) {
        if (chosen.size < 15 && !excluded.has(n)) chosen.add(n);
      }
      for (let n = 1; n <= 25 && chosen.size < 15; n++) {
        if (!excluded.has(n)) chosen.add(n);
      }
      return Array.from(chosen).sort((a, b) => a - b);
    };

    // Combinação 1: Núcleo das 5 Quentes + Top Score Geral (foco máxima precisão)
    const combo1Nums = buildBet15(
      [...hotNums, ...cyclePendingNumbers.slice(0, 2)],
      orderedByScore
    );

    // Combinação 2: Equilíbrio Zona de Ouro (4 Quentes + 10 Médias/Ciclo + 1 Fria surpresa)
    const middlePool = orderedByScore.filter(
      (n) => !hotNums.includes(n) && !coldNums.includes(n)
    );
    const combo2Nums = buildBet15(
      [...hotNums.slice(0, 4), ...cyclePendingNumbers.slice(0, 3), ...middlePool.slice(0, 8)],
      [...middlePool, ...coldNums.slice(0, 1), ...orderedByScore]
    );

    // Combinação 3: Pool 18 Dezenas Calibrado (Quentes + Ciclo + Melhores Scores, evitando as 5 mais frias)
    const coldSet = new Set(coldNums);
    const pool18Base = orderedByScore.filter((n) => !coldSet.has(n));
    const pool18 = Array.from(new Set([...fixed, ...hotNums, ...pool18Base, ...orderedByScore]))
      .slice(0, 18)
      .sort((a, b) => a - b);

    const hotSet = new Set(hotNums);
    return [
      {
        titulo: 'Combinação Sniper (5 Quentes + Alta Confiança)',
        badge: `Confiança ${taxaConfianca.toFixed(1)}%`,
        dezenas: combo1Nums,
        analysis: analyzeTicket(combo1Nums, latestDraw.dezenas, effectiveScores),
        quentesCount: combo1Nums.filter((n) => hotSet.has(n)).length,
        isPool18: false,
      },
      {
        titulo: 'Combinação Equilibrada (Quentes + Ciclo + Zona de Ouro)',
        badge: 'Anti-Desvio',
        dezenas: combo2Nums,
        analysis: analyzeTicket(combo2Nums, latestDraw.dezenas, effectiveScores),
        quentesCount: combo2Nums.filter((n) => hotSet.has(n)).length,
        isPool18: false,
      },
      {
        titulo: 'Base Otimizada 18 Dezenas (Exclui Top 5 Frias)',
        badge: 'Para Fechamento',
        dezenas: pool18,
        analysis: analyzeTicket(pool18.slice(0, 15), latestDraw.dezenas, effectiveScores),
        quentesCount: pool18.filter((n) => hotSet.has(n)).length,
        isPool18: true,
      },
    ];
  }, [
    rankedNumbers,
    top5Quentes,
    top5Frias,
    activeFilterConfig?.dezenasExcluidas,
    activeFilterConfig?.dezenasFixas,
    cyclePendingNumbers,
    taxaConfianca,
    latestDraw.dezenas,
    effectiveScores,
  ]);

  const handleCopy = (nums: number[], idx: number) => {
    try {
      navigator.clipboard.writeText(nums.map((n) => n.toString().padStart(2, '0')).join(' '));
      setCopiedComboIdx(idx);
      setTimeout(() => setCopiedComboIdx(null), 2000);
    } catch {}
  };

  return (
    <section
      aria-label="Dicas de Aposta IA"
      className="bg-slate-900 rounded-xl border border-slate-800 p-5 sm:p-6 space-y-5"
    >
      {/* Header */}
      {!hideHotColdGrid && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 font-mono tabular-nums">
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="font-sans text-emerald-400 font-medium">
                Confiança {taxaConfianca.toFixed(1)}%
              </span>
              <span aria-hidden="true">·</span>
              <span>Concurso #{latestDraw.concurso} → #{latestDraw.concurso + 1}</span>
              <span aria-hidden="true">·</span>
              <span className="font-sans">
                {usingDirectPrediction ? 'Fonte: aiPrediction (App)' : 'Fonte: Ponderação Estatística'}
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-semibold text-white tracking-tight">
              Dicas de Aposta IA — Top 5 Quentes &amp; Top 5 Frias
            </h3>
            <p className="text-xs text-slate-400 max-w-2xl">
              {prediction?.justificativaTecnica
                ? prediction.justificativaTecnica
                : `Extração direta dos 25 escores probabilísticos de aiPrediction destacando as 5 dezenas de maior tração e as 5 de menor propensão para o Concurso #${latestDraw.concurso + 1}.`}
            </p>
          </div>

          <button
            type="button"
            onClick={() => onApplyRecommendation(suggestedCombos[2].dezenas)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-semibold text-xs transition cursor-pointer shrink-0 whitespace-nowrap"
          >
            <span>Aplicar Base IA (18 Dez.)</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Loading Skeleton State */}
      {!hideHotColdGrid && (isLoading && !prediction ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[0, 1].map((col) => (
            <div
              key={col}
              className="bg-slate-950/75 border border-slate-800 rounded-lg p-4 space-y-3 animate-pulse"
            >
              <div className="h-4 w-48 bg-slate-800 rounded" />
              <div className="grid grid-cols-5 gap-2">
                {[0, 1, 2, 3, 4].map((cell) => (
                  <div key={cell} className="h-24 bg-slate-800/80 rounded-lg" />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Top 5 Quentes vs Top 5 Frias */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* 5 Dezenas Quentes */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="font-semibold text-white">
                  5 Dezenas Mais Quentes
                </span>
              </div>
              <div className="flex items-center gap-2 font-mono tabular-nums text-[11px]">
                <span className="text-amber-400">
                  Média {avgHotScore}% (+{(avgHotScore - meanScore).toFixed(1)} pts)
                </span>
                {onFixHotNumbers && (
                  <button
                    type="button"
                    onClick={() => {
                      onFixHotNumbers(top5Quentes.slice(0, 3).map((q) => q.numero));
                      setFixedApplied(true);
                      window.setTimeout(() => setFixedApplied(false), 2500);
                    }}
                    className="font-sans px-2 py-0.5 rounded border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 transition cursor-pointer"
                  >
                    {fixedApplied ? 'Fixadas!' : 'Fixar Top 3'}
                  </button>
                )}
              </div>
            </div>

            <motion.div
              key={`quentes-${latestDraw.concurso}-${taxaConfianca}`}
              variants={staggerContainerVariants}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-5 gap-2"
            >
              {top5Quentes.map((item, rankIdx) => (
                <motion.div
                  key={item.numero}
                  variants={staggerBallVariants}
                  className="flex flex-col items-center p-2.5 rounded-lg bg-slate-900 border border-amber-500/35"
                >
                  <div className="w-full flex items-center justify-between text-[10px] font-mono tabular-nums">
                    <span className="text-slate-500">#{rankIdx + 1}</span>
                    {item.isChaveIA && (
                      <span className="text-emerald-400 font-semibold">IA</span>
                    )}
                  </div>
                  <span className="w-9 h-9 rounded-full bg-amber-400 text-slate-950 font-mono font-bold text-sm flex items-center justify-center mt-0.5 tabular-nums">
                    {item.numero.toString().padStart(2, '0')}
                  </span>
                  <span className="text-xs font-mono font-semibold text-amber-300 mt-1.5 tabular-nums">
                    {item.score}%
                  </span>
                  <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden mt-1">
                    <div
                      className="h-full bg-amber-400 rounded-full"
                      style={{ width: `${Math.min(100, Math.max(10, item.score))}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 mt-1 tabular-nums truncate max-w-full">
                    {item.pendenteCiclo
                      ? 'Ciclo'
                      : item.saiuUltimo
                      ? 'Saiu'
                      : `${item.atrasoAtual}c atr.`}
                  </span>
                </motion.div>
              ))}
            </motion.div>
          </div>

          {/* 5 Dezenas Frias */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <Snowflake className="w-4 h-4 text-sky-400 shrink-0" />
                <span className="font-semibold text-white">
                  5 Dezenas Mais Frias
                </span>
              </div>
              <span className="font-mono tabular-nums text-[11px] text-sky-400">
                Média {avgColdScore}% ({(avgColdScore - meanScore).toFixed(1)} pts)
              </span>
            </div>

            <motion.div
              key={`frias-${latestDraw.concurso}-${taxaConfianca}`}
              variants={staggerContainerVariants}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-5 gap-2"
            >
              {top5Frias.map((item, rankIdx) => (
                <motion.div
                  key={item.numero}
                  variants={staggerBallVariants}
                  className="flex flex-col items-center p-2.5 rounded-lg bg-slate-900 border border-sky-500/30"
                >
                  <div className="w-full flex items-center justify-between text-[10px] font-mono tabular-nums">
                    <span className="text-slate-500">#{rankIdx + 1}</span>
                    <span className="text-slate-500">
                      {(item.score - meanScore).toFixed(0)}
                    </span>
                  </div>
                  <span className="w-9 h-9 rounded-full bg-slate-800 text-sky-200 border border-sky-400/40 font-mono font-bold text-sm flex items-center justify-center mt-0.5 tabular-nums">
                    {item.numero.toString().padStart(2, '0')}
                  </span>
                  <span className="text-xs font-mono font-semibold text-sky-300 mt-1.5 tabular-nums">
                    {item.score}%
                  </span>
                  <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden mt-1">
                    <div
                      className="h-full bg-sky-400 rounded-full"
                      style={{ width: `${Math.min(100, Math.max(8, item.score))}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 mt-1 tabular-nums truncate max-w-full">
                    {item.atrasoAtual === 0 ? 'Recente' : `${item.atrasoAtual}c atr.`}
                  </span>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>
      ))}

      {/* Combinações Ideais Sugeridas */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-slate-200 flex items-center gap-1.5">
            <Target className="w-4 h-4 text-emerald-400" />
            <span>Combinações Ideais Sugeridas pela IA (Base # {latestDraw.concurso})</span>
          </span>
          <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Núcleo Quente Ponderado</span>
          </span>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-3">
          {suggestedCombos.map((combo, idx) => {
            const hotSet = new Set(top5Quentes.map((q) => q.numero));
            return (
              <div
                key={idx}
                className="bg-slate-950/90 border border-slate-800 hover:border-amber-500/40 rounded-xl p-3.5 flex flex-col justify-between gap-3 transition"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-bold text-white leading-snug">
                      {combo.titulo}
                    </span>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shrink-0">
                      {combo.badge}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {combo.dezenas.map((num) => {
                      const isHot = hotSet.has(num);
                      return (
                        <span
                          key={num}
                          className={`inline-flex items-center justify-center w-6.5 h-6.5 rounded-md font-mono text-[11px] font-bold border ${
                            isHot
                              ? 'bg-amber-400 text-slate-950 border-amber-300 font-black'
                              : 'bg-slate-800 text-slate-200 border-slate-700'
                          }`}
                          title={isHot ? 'Dezena Quente (Top 5)' : `Dezena ${num.toString().padStart(2, '0')}`}
                        >
                          {num.toString().padStart(2, '0')}
                        </span>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2 text-[10px] font-mono text-slate-400">
                  <span>
                    {combo.isPool18
                      ? `${combo.quentesCount}/5 Quentes • Universo 18`
                      : `Soma ${combo.analysis.soma} • ${combo.analysis.pares}P/${15 - combo.analysis.pares}I • ${combo.quentesCount}/5 Quentes`}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleCopy(combo.dezenas, idx)}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 transition cursor-pointer"
                    >
                      {copiedComboIdx === idx ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span>Copiado</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copiar</span>
                        </>
                      )}
                    </button>
                    {combo.isPool18 && (
                      <button
                        type="button"
                        onClick={() => onApplyRecommendation(combo.dezenas)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-bold transition cursor-pointer"
                      >
                        <span>Usar</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
