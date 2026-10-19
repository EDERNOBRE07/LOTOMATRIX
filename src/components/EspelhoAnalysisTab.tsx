import React, { useState, useMemo } from 'react';
import { GameTicket, LotofacilDraw } from '../types/lotofacil';
import { RECENT_DRAWS, CONCURSO_ATUAL } from '../data/lotofacilData';
import { countMatches } from '../services/combinatorics';
import {
  RotateCcw,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  TrendingDown,
  TrendingUp,
  Scale,
  Award,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Info,
  Layers,
  ArrowRight,
  Flame,
  ShieldAlert,
} from 'lucide-react';

interface EspelhoAnalysisTabProps {
  tickets: GameTicket[];
  latestDraw?: LotofacilDraw;
  onGoToGenerator: () => void;
}

export const EspelhoAnalysisTab: React.FC<EspelhoAnalysisTabProps> = ({
  tickets,
  latestDraw = CONCURSO_ATUAL,
  onGoToGenerator,
}) => {
  const [selectedConcursoId, setSelectedConcursoId] = useState<number>(latestDraw.concurso);
  const [scopeMode, setScopeMode] = useState<'single' | 'last5' | 'last10'>('single');
  const [filterLevel, setFilterLevel] = useState<'all' | 'alta' | 'moderada' | 'favor'>('all');
  const [copiedTicketId, setCopiedTicketId] = useState<string | null>(null);

  // Draws pool: latestDraw is strictly placed first
  const allDraws = useMemo(() => {
    const others = RECENT_DRAWS.filter((d) => d.concurso !== latestDraw.concurso);
    return [latestDraw, ...others];
  }, [latestDraw]);

  // Selected single draw
  const targetDraw = useMemo(() => {
    return allDraws.find((d) => d.concurso === selectedConcursoId) || latestDraw;
  }, [allDraws, selectedConcursoId, latestDraw]);

  // Analyzed contests array based on scopeMode
  const analyzedDraws = useMemo<LotofacilDraw[]>(() => {
    if (scopeMode === 'single') return [targetDraw];
    if (scopeMode === 'last5') return allDraws.slice(0, 5);
    return allDraws.slice(0, 10);
  }, [scopeMode, targetDraw, allDraws]);

  const all25 = useMemo(() => Array.from({ length: 25 }, (_, i) => i + 1), []);

  // Detailed mirror metrics for each ticket
  const ticketMirrorMetrics = useMemo(() => {
    return tickets.map((t) => {
      const espelho = all25.filter((n) => !t.dezenas.includes(n)); // 10 unchosen numbers

      // Single contest matches
      const singleHitsJogo = countMatches(t.dezenas, targetDraw.dezenas);
      const singleHitsEspelho = countMatches(espelho, targetDraw.dezenas);
      const singleEspelhoSorteados = espelho.filter((n) => targetDraw.dezenas.includes(n));

      // Multi-contest average
      let totalHitsEspelhoMulti = 0;
      let totalHitsJogoMulti = 0;
      let countHighContraSorte = 0;

      analyzedDraws.forEach((draw) => {
        const hitsE = countMatches(espelho, draw.dezenas);
        const hitsJ = countMatches(t.dezenas, draw.dezenas);
        totalHitsEspelhoMulti += hitsE;
        totalHitsJogoMulti += hitsJ;
        if (hitsE >= 6) countHighContraSorte++;
      });

      const avgHitsEspelho = totalHitsEspelhoMulti / analyzedDraws.length;
      const avgHitsJogo = totalHitsJogoMulti / analyzedDraws.length;
      const contraSorteRate = (countHighContraSorte / analyzedDraws.length) * 100;

      // Classification level based on single or multi
      const effectiveHitsEspelho = scopeMode === 'single' ? singleHitsEspelho : avgHitsEspelho;

      let contraSorteLevel: 'alta' | 'moderada' | 'neutra' | 'favor' = 'neutra';
      if (effectiveHitsEspelho >= 6.5) contraSorteLevel = 'alta';
      else if (effectiveHitsEspelho >= 5.5) contraSorteLevel = 'moderada';
      else if (effectiveHitsEspelho <= 4.2) contraSorteLevel = 'favor';

      return {
        ticket: t,
        espelho,
        singleHitsJogo,
        singleHitsEspelho,
        singleEspelhoSorteados,
        avgHitsEspelho,
        avgHitsJogo,
        contraSorteRate,
        contraSorteLevel,
      };
    });
  }, [tickets, all25, targetDraw, analyzedDraws, scopeMode]);

  // Global summary across all tickets
  const globalMirrorSummary = useMemo(() => {
    if (ticketMirrorMetrics.length === 0) {
      return {
        avgHitsEspelho: 0,
        avgHitsJogo: 0,
        highContraSorteCount: 0,
        moderateCount: 0,
        favorCount: 0,
        maxHitsEspelho: 0,
        minHitsEspelho: 10,
        worstTicketLabel: '',
        bestTicketLabel: '',
        contraSortePercent: 0,
      };
    }

    let sumHitsEspelho = 0;
    let sumHitsJogo = 0;
    let highContraSorteCount = 0;
    let moderateCount = 0;
    let favorCount = 0;
    let maxHitsEspelho = -1;
    let minHitsEspelho = 99;
    let worstTicketLabel = '';
    let bestTicketLabel = '';

    ticketMirrorMetrics.forEach((m) => {
      const hitsE = scopeMode === 'single' ? m.singleHitsEspelho : m.avgHitsEspelho;
      const hitsJ = scopeMode === 'single' ? m.singleHitsJogo : m.avgHitsJogo;

      sumHitsEspelho += hitsE;
      sumHitsJogo += hitsJ;

      if (m.contraSorteLevel === 'alta') highContraSorteCount++;
      else if (m.contraSorteLevel === 'moderada') moderateCount++;
      else if (m.contraSorteLevel === 'favor') favorCount++;

      if (hitsE > maxHitsEspelho) {
        maxHitsEspelho = hitsE;
        worstTicketLabel = `Bilhete #${m.ticket.index.toString().padStart(2, '0')}`;
      }

      if (hitsE < minHitsEspelho) {
        minHitsEspelho = hitsE;
        bestTicketLabel = `Bilhete #${m.ticket.index.toString().padStart(2, '0')}`;
      }
    });

    const total = ticketMirrorMetrics.length;
    const avgHitsEspelho = sumHitsEspelho / total;
    const avgHitsJogo = sumHitsJogo / total;
    const contraSortePercent = ((highContraSorteCount + moderateCount) / total) * 100;

    return {
      avgHitsEspelho,
      avgHitsJogo,
      highContraSorteCount,
      moderateCount,
      favorCount,
      maxHitsEspelho,
      minHitsEspelho,
      worstTicketLabel,
      bestTicketLabel,
      contraSortePercent,
    };
  }, [ticketMirrorMetrics, scopeMode]);

  // Ranking of the most excluded numbers that were drawn (the "traitor" numbers)
  const topExcludedDrawnNumbers = useMemo(() => {
    const frequencyMap: Record<number, { excludedInCount: number; drawnCount: number }> = {};
    for (let i = 1; i <= 25; i++) {
      frequencyMap[i] = { excludedInCount: 0, drawnCount: 0 };
    }

    tickets.forEach((t) => {
      const espelho = all25.filter((n) => !t.dezenas.includes(n));
      espelho.forEach((num) => {
        frequencyMap[num].excludedInCount++;
      });
    });

    analyzedDraws.forEach((draw) => {
      draw.dezenas.forEach((num) => {
        if (frequencyMap[num]) {
          frequencyMap[num].drawnCount++;
        }
      });
    });

    return Object.entries(frequencyMap)
      .map(([numStr, data]) => ({
        numero: Number(numStr),
        excludedInCount: data.excludedInCount,
        excludedPercentage: (data.excludedInCount / tickets.length) * 100,
        drawnCount: data.drawnCount,
        drawnRate: (data.drawnCount / analyzedDraws.length) * 100,
        impactScore: (data.excludedInCount / tickets.length) * (data.drawnCount / analyzedDraws.length),
      }))
      .filter((d) => d.excludedInCount > 0 && d.drawnCount > 0)
      .sort((a, b) => b.impactScore - a.impactScore)
      .slice(0, 6);
  }, [tickets, all25, analyzedDraws]);

  // Filtered tickets list
  const filteredMetrics = useMemo(() => {
    return ticketMirrorMetrics.filter((m) => {
      if (filterLevel === 'all') return true;
      if (filterLevel === 'alta') return m.contraSorteLevel === 'alta';
      if (filterLevel === 'moderada') return m.contraSorteLevel === 'moderada';
      if (filterLevel === 'favor') return m.contraSorteLevel === 'favor';
      return true;
    });
  }, [ticketMirrorMetrics, filterLevel]);

  const handleCopyEspelho = (ticketId: string, numbers: number[]) => {
    navigator.clipboard.writeText(numbers.map((n) => n.toString().padStart(2, '0')).join(' - '));
    setCopiedTicketId(ticketId);
    setTimeout(() => setCopiedTicketId(null), 2000);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Mirror Header & Inverted Luck Thermometer */}
      <div
        className={`rounded-2xl border p-5 sm:p-6 shadow-xl relative overflow-hidden transition-all ${
          globalMirrorSummary.contraSortePercent >= 40
            ? 'bg-gradient-to-br from-amber-950/40 via-slate-900 to-rose-950/30 border-amber-500/40'
            : globalMirrorSummary.contraSortePercent <= 20
            ? 'bg-gradient-to-br from-emerald-950/40 via-slate-900 to-teal-950/30 border-emerald-500/40'
            : 'bg-gradient-to-br from-slate-900 via-indigo-950/20 to-slate-900 border-indigo-500/30'
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1 max-w-2xl">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 text-xs font-bold font-mono">
                <RotateCcw className="w-3.5 h-3.5" />
                <span>ANÁLISE DO ESPELHO (10 DEZENAS EXCLUÍDAS)</span>
              </span>

              <span
                className={`text-xs font-bold font-mono px-2.5 py-0.5 rounded-full ${
                  globalMirrorSummary.contraSortePercent >= 40
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                    : globalMirrorSummary.contraSortePercent <= 20
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                }`}
              >
                {globalMirrorSummary.contraSortePercent >= 40
                  ? '⚠️ ALERTA DE CONTRA-SORTE'
                  : globalMirrorSummary.contraSortePercent <= 20
                  ? '✓ SORTE A FAVOR'
                  : '⚖ DISTRIBUIÇÃO EQUILIBRADA'}
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              {globalMirrorSummary.contraSortePercent >= 40 ? (
                <span>
                  Você pode estar{' '}
                  <span className="text-rose-400 underline decoration-rose-500/60">
                    jogando contra a sorte
                  </span>{' '}
                  em parte dos bilhetes!
                </span>
              ) : globalMirrorSummary.contraSortePercent <= 20 ? (
                <span>
                  Suas escolhas estão{' '}
                  <span className="text-emerald-400">a favor da sorte</span>!
                </span>
              ) : (
                <span>Desempenho Inverso Estável das 10 Dezenas Excluídas</span>
              )}
            </h2>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              O <strong>Espelho</strong> avalia o que acontece com as 10 dezenas que você{' '}
              <strong>deixou de fora</strong> de cada jogo. Na Lotofácil, como sempre são sorteadas 15
              dezenas, a relação é direta:{' '}
              <span className="text-purple-300 font-mono font-bold">
                Acertos no Jogo + Acertos no Espelho = 15
              </span>
              . Se o seu espelho fizer 7, 8 ou 9 acertos, significa que você excluiu as dezenas que
              mais saíram!
            </p>
          </div>

          {/* Quick Scope Selector */}
          <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 space-y-2 shrink-0 self-start md:self-auto">
            <span className="text-[11px] font-bold text-slate-400 block uppercase tracking-wider">
              Concurso de Teste:
            </span>

            <div className="flex flex-col gap-1.5">
              <select
                value={selectedConcursoId}
                onChange={(e) => {
                  setSelectedConcursoId(Number(e.target.value));
                  setScopeMode('single');
                }}
                className="bg-slate-900 text-slate-200 text-xs font-semibold rounded-lg px-3 py-1.5 border border-slate-700 hover:border-purple-500 focus:outline-none transition cursor-pointer"
              >
                {allDraws.map((d) => (
                  <option key={d.concurso} value={d.concurso}>
                    {d.concurso === latestDraw.concurso ? `★ Concurso #${d.concurso} (Último Oficial)` : `Concurso #${d.concurso} (${d.data})`}
                  </option>
                ))}
              </select>

              <div className="flex items-center gap-1 text-[11px]">
                <button
                  onClick={() => setScopeMode('single')}
                  className={`px-2 py-1 rounded font-medium transition cursor-pointer ${
                    scopeMode === 'single'
                      ? 'bg-purple-600 text-white font-bold'
                      : 'bg-slate-900 text-slate-400 hover:text-white'
                  }`}
                >
                  Este Concurso
                </button>
                <button
                  onClick={() => setScopeMode('last5')}
                  className={`px-2 py-1 rounded font-medium transition cursor-pointer ${
                    scopeMode === 'last5'
                      ? 'bg-purple-600 text-white font-bold'
                      : 'bg-slate-900 text-slate-400 hover:text-white'
                  }`}
                >
                  Últimos 5
                </button>
                <button
                  onClick={() => setScopeMode('last10')}
                  className={`px-2 py-1 rounded font-medium transition cursor-pointer ${
                    scopeMode === 'last10'
                      ? 'bg-purple-600 text-white font-bold'
                      : 'bg-slate-900 text-slate-400 hover:text-white'
                  }`}
                >
                  Últimos 10
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Global Mirror Metrics Scorecard */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3 mt-5 pt-5 border-t border-slate-800/80">
          <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800">
            <span className="text-[11px] text-slate-400 block font-medium">Média no Espelho</span>
            <div className="text-xl font-black font-mono text-purple-300 mt-0.5">
              {globalMirrorSummary.avgHitsEspelho.toFixed(1)}{' '}
              <span className="text-xs text-slate-400 font-normal">/ 10</span>
            </div>
            <span className="text-[10px] text-slate-500">
              Média no jogo: {globalMirrorSummary.avgHitsJogo.toFixed(1)} de 15
            </span>
          </div>

          <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800">
            <span className="text-[11px] text-slate-400 block font-medium">Taxa de Contra-Sorte</span>
            <div
              className={`text-xl font-black font-mono mt-0.5 ${
                globalMirrorSummary.contraSortePercent >= 40
                  ? 'text-rose-400'
                  : globalMirrorSummary.contraSortePercent <= 20
                  ? 'text-emerald-400'
                  : 'text-amber-300'
              }`}
            >
              {globalMirrorSummary.contraSortePercent.toFixed(0)}%
            </div>
            <span className="text-[10px] text-slate-500">
              {globalMirrorSummary.highContraSorteCount + globalMirrorSummary.moderateCount} bilhetes
              com &ge; 6 no espelho
            </span>
          </div>

          <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800">
            <span className="text-[11px] text-slate-400 block font-medium">Alta Contra-Sorte</span>
            <div className="text-xl font-black font-mono text-rose-400 mt-0.5">
              {globalMirrorSummary.highContraSorteCount}{' '}
              <span className="text-xs text-slate-400 font-normal">jogos</span>
            </div>
            <span className="text-[10px] text-slate-500">&ge; 7 acertos nas 10 excluídas</span>
          </div>

          <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800">
            <span className="text-[11px] text-slate-400 block font-medium">Sorte a Favor</span>
            <div className="text-xl font-black font-mono text-emerald-400 mt-0.5">
              {globalMirrorSummary.favorCount}{' '}
              <span className="text-xs text-slate-400 font-normal">jogos</span>
            </div>
            <span className="text-[10px] text-slate-500">&le; 4 acertos no espelho (11+ no jogo)</span>
          </div>

          <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 col-span-2 sm:col-span-4 lg:col-span-1">
            <span className="text-[11px] text-slate-400 block font-medium">Pior Contra-Sorte</span>
            <div className="text-xl font-black font-mono text-amber-300 mt-0.5">
              {globalMirrorSummary.worstTicketLabel || '—'}
            </div>
            <span className="text-[10px] text-slate-500">
              Pico de {typeof globalMirrorSummary.maxHitsEspelho === 'number' ? globalMirrorSummary.maxHitsEspelho.toFixed(0) : '0'} acertos no espelho
            </span>
          </div>
        </div>
      </div>

      {/* TOP DEZENAS EXCLUÍDAS QUE MAIS FORAM SORTEADAS (OS VILÕES DO FECHAMENTO) */}
      {topExcludedDrawnNumbers.length > 0 && (
        <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-5 shadow-xl space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800 gap-2">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Flame className="w-4 h-4 text-rose-400" />
                <span>As Dezenas Excluídas que Mais Saíram ("Vilões do Fechamento")</span>
              </h3>
              <p className="text-xs text-slate-400">
                Números que ficaram de fora de grande parte dos seus bilhetes, mas foram fortemente
                sorteados no período analisado.
              </p>
            </div>
            <span className="text-[11px] font-mono text-slate-400 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
              {analyzedDraws.length === 1
                ? `Concurso #${targetDraw.concurso}`
                : `${analyzedDraws.length} Concursos Testados`}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {topExcludedDrawnNumbers.map((item) => (
              <div
                key={item.numero}
                className="bg-slate-950/80 rounded-xl p-3 border border-slate-800 hover:border-purple-500/40 transition space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 text-slate-950 font-black font-mono text-sm flex items-center justify-center shadow-md shadow-purple-500/20">
                    {item.numero.toString().padStart(2, '0')}
                  </span>
                  <span className="text-[10px] font-mono font-bold text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20">
                    {item.drawnRate.toFixed(0)}% Sorteada
                  </span>
                </div>

                <div className="text-[11px] text-slate-300 font-medium">
                  Excluída em <strong>{item.excludedInCount}</strong> de {tickets.length} bilhetes
                </div>
                <div className="text-[10px] text-slate-500">
                  {item.drawnCount}x em {analyzedDraws.length} sorteio(s)
                </div>
              </div>
            ))}
          </div>

          <div className="p-3 rounded-xl bg-purple-950/20 border border-purple-500/30 text-purple-200 text-xs flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-purple-400 shrink-0" />
              <span>
                <strong>Dica Estratégica:</strong> Caso note dezenas excluídas com 80%+ de sorteio,
                considere marcá-las como <strong>Dezenas Fixas</strong> no gerador do Fechamento
                para eliminar a contra-sorte.
              </span>
            </div>
            <button
              onClick={onGoToGenerator}
              className="px-3 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition cursor-pointer whitespace-nowrap"
            >
              Ajustar no Fechamento
            </button>
          </div>
        </div>
      )}

      {/* DETAILED TICKETS LIST (15 JOGADAS vs. 10 DO ESPELHO) */}
      <div className="space-y-3">
        {/* Filter bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-900/90 rounded-2xl border border-slate-800 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-slate-400 font-semibold mr-1">Filtrar por Nível:</span>

            <button
              onClick={() => setFilterLevel('all')}
              className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                filterLevel === 'all'
                  ? 'bg-slate-700 text-white'
                  : 'bg-slate-950 text-slate-400 hover:text-white'
              }`}
            >
              Todos ({tickets.length})
            </button>

            <button
              onClick={() => setFilterLevel('alta')}
              className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer flex items-center gap-1 ${
                filterLevel === 'alta'
                  ? 'bg-rose-500 text-white shadow-sm'
                  : 'bg-rose-500/15 text-rose-300 hover:bg-rose-500/25 border border-rose-500/30'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Alta Contra-Sorte ({globalMirrorSummary.highContraSorteCount})</span>
            </button>

            <button
              onClick={() => setFilterLevel('moderada')}
              className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer flex items-center gap-1 ${
                filterLevel === 'moderada'
                  ? 'bg-amber-400 text-slate-950 shadow-sm'
                  : 'bg-amber-500/15 text-amber-300 hover:bg-amber-500/25 border border-amber-500/30'
              }`}
            >
              <span>Moderada ({globalMirrorSummary.moderateCount})</span>
            </button>

            <button
              onClick={() => setFilterLevel('favor')}
              className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer flex items-center gap-1 ${
                filterLevel === 'favor'
                  ? 'bg-emerald-500 text-slate-950 shadow-sm'
                  : 'bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 border border-emerald-500/30'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Sorte a Favor ({globalMirrorSummary.favorCount})</span>
            </button>
          </div>

          <div className="text-slate-400 font-mono text-xs">
            Exibindo <strong>{filteredMetrics.length}</strong> de {tickets.length} bilhete(s)
          </div>
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {filteredMetrics.map((item) => {
            const isHighContraSorte = item.contraSorteLevel === 'alta';
            const isModerateContraSorte = item.contraSorteLevel === 'moderada';
            const isFavor = item.contraSorteLevel === 'favor';

            return (
              <div
                key={item.ticket.id}
                className={`rounded-2xl border p-4 transition space-y-3.5 ${
                  isHighContraSorte
                    ? 'bg-gradient-to-br from-rose-950/30 via-slate-900 to-slate-950 border-rose-500/40 shadow-lg shadow-rose-950/20'
                    : isModerateContraSorte
                    ? 'bg-gradient-to-br from-amber-950/20 via-slate-900 to-slate-950 border-amber-500/35'
                    : isFavor
                    ? 'bg-gradient-to-br from-emerald-950/20 via-slate-900 to-slate-950 border-emerald-500/30'
                    : 'bg-slate-950/70 border-slate-800'
                }`}
              >
                {/* Header of Ticket */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-white text-xs px-2.5 py-0.5 rounded-lg bg-slate-900 border border-slate-800">
                      Bilhete #{item.ticket.index.toString().padStart(2, '0')}
                    </span>

                    {/* Status Pill */}
                    <span
                      className={`text-[11px] font-black font-mono px-2.5 py-0.5 rounded-full border ${
                        isHighContraSorte
                          ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
                          : isModerateContraSorte
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          : isFavor
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}
                    >
                      {isHighContraSorte
                        ? '⚠️ ALTA CONTRA-SORTE'
                        : isModerateContraSorte
                        ? '⚡ CONTRA-SORTE MODERADA'
                        : isFavor
                        ? '✓ SORTE A FAVOR'
                        : '⚖ EQUILIBRADO'}
                    </span>
                  </div>

                  <button
                    onClick={() => handleCopyEspelho(item.ticket.id, item.espelho)}
                    title="Copiar as 10 dezenas do espelho deste bilhete"
                    className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 transition cursor-pointer"
                  >
                    {copiedTicketId === item.ticket.id ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400 font-bold">Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copiar Espelho</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Score Comparison: Jogo Principal vs Espelho */}
                <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-slate-950/80 border border-slate-850 text-xs font-mono">
                  <div>
                    <span className="text-slate-400 text-[10px] block">No Bilhete (15 Dezenas):</span>
                    <strong
                      className={`text-sm ${
                        item.singleHitsJogo >= 11 ? 'text-emerald-400 font-black' : 'text-slate-200'
                      }`}
                    >
                      {item.singleHitsJogo} Acertos{' '}
                      {item.singleHitsJogo >= 11 ? '★ PREMIADO' : '(Sem prêmio)'}
                    </strong>
                  </div>

                  <div>
                    <span className="text-purple-300 text-[10px] block font-semibold">
                      No Espelho (10 Não Escolhidas):
                    </span>
                    <strong
                      className={`text-sm ${
                        isHighContraSorte
                          ? 'text-rose-400 font-black'
                          : isModerateContraSorte
                          ? 'text-amber-300 font-black'
                          : 'text-purple-300 font-bold'
                      }`}
                    >
                      {item.singleHitsEspelho} de 10 Acertos ({((item.singleHitsEspelho / 10) * 100).toFixed(0)}%)
                    </strong>
                  </div>
                </div>

                {/* 10 DEZENAS DO ESPELHO (AS NÃO ESCOLHIDAS) */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-purple-300 flex items-center gap-1">
                      <RotateCcw className="w-3 h-3" />
                      <span>Espelho: 10 Dezenas que você NÃO escolheu:</span>
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {item.singleEspelhoSorteados.length} saíram no concurso
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {item.espelho.map((num) => {
                      const wasDrawn = targetDraw.dezenas.includes(num);

                      return (
                        <div
                          key={num}
                          className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg font-mono text-xs font-bold flex items-center justify-center transition-all select-none ${
                            wasDrawn
                              ? 'bg-gradient-to-br from-purple-500 to-fuchsia-600 text-slate-950 font-black shadow-md shadow-purple-500/30 ring-1 ring-purple-300 border border-purple-200'
                              : 'bg-slate-900/90 text-slate-500 border border-slate-800'
                          }`}
                          title={
                            wasDrawn
                              ? `Dezena ${num} NÃO estava no bilhete, mas FOI SORTEADA no Concurso #${targetDraw.concurso}!`
                              : `Dezena ${num} não estava no bilhete e não foi sorteada.`
                          }
                        >
                          {num.toString().padStart(2, '0')}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 15 DEZENAS ESCOLHIDAS (BILHETE ORIGINAL) */}
                <div className="space-y-1 pt-2 border-t border-slate-900">
                  <span className="text-[10px] text-slate-400 block font-medium">
                    15 Dezenas Escolhidas no Bilhete:
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {item.ticket.dezenas.map((num) => {
                      const wasDrawn = targetDraw.dezenas.includes(num);

                      return (
                        <span
                          key={num}
                          className={`w-6 h-6 rounded text-[10px] font-mono font-bold flex items-center justify-center ${
                            wasDrawn
                              ? 'bg-emerald-500 text-slate-950 font-black'
                              : 'bg-slate-900 text-slate-500 border border-slate-800'
                          }`}
                        >
                          {num.toString().padStart(2, '0')}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
