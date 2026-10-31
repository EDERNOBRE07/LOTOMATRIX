import React, { useMemo, useRef, useState, useEffect } from 'react';
import * as d3 from 'd3';
import { GameTicket, LotofacilDraw } from '../types/lotofacil';
import { CONCURSO_ATUAL } from '../data/lotofacilData';
import { getHistorical100Draws } from '../services/historical100Draws';
import { countMatches, FECHAMENTO_PRESETS } from '../services/combinatorics';
import {
  Zap,
  TrendingUp,
  Award,
  CheckCircle2,
  Calendar,
  Layers,
  Sparkles,
  ArrowRight,
  Info,
  Flame,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import { soundService } from '../services/soundAlert';

interface QuickBacktestD3AreaProps {
  tickets: GameTicket[];
  latestDraw?: LotofacilDraw;
  onGoToGenerator?: () => void;
  onGoToGamesManager?: () => void;
}

interface ContestEvaluation {
  concurso: number;
  data: string;
  label: string;
  dezenas: number[];
  avgMatches: number;
  maxMatches: number;
  minMatches: number;
  awardedCount: number;
  taxaPremiacao: number;
  hitsBreakdown: { [hit: number]: number };
  bestTicketIndex: number;
}

export const QuickBacktestD3Area: React.FC<QuickBacktestD3AreaProps> = ({
  tickets,
  latestDraw = CONCURSO_ATUAL,
  onGoToGenerator,
  onGoToGamesManager,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState<number>(760);
  const [selectedContest, setSelectedContest] = useState<ContestEvaluation | null>(null);
  const [isFallbackPreset, setIsFallbackPreset] = useState<boolean>(false);

  // Measure container width for responsive D3 rendering
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      if (entries[0] && entries[0].contentRect.width > 0) {
        setContainerWidth(entries[0].contentRect.width);
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Effective tickets to test: user saved tickets or preset fallback
  const effectiveTickets: GameTicket[] = useMemo(() => {
    if (tickets && tickets.length > 0) {
      setIsFallbackPreset(false);
      return tickets;
    }

    // Try localStorage saved tickets
    try {
      const stored = localStorage.getItem('lotosniper_saved_tickets');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setIsFallbackPreset(false);
          return parsed;
        }
      }
    } catch {}

    // Fallback: 24 standard tickets from optimal preset
    setIsFallbackPreset(true);
    const preset = FECHAMENTO_PRESETS['18_14_15'];
    const pool = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 17, 20, 25];
    return Array.from({ length: 24 }, (_, idx) => {
      // Pick 15 numbers deterministically
      const start = (idx * 3) % pool.length;
      const dezenas: number[] = [];
      for (let i = 0; i < 15; i++) {
        dezenas.push(pool[(start + i) % pool.length]);
      }
      return {
        id: `preset_ticket_${idx + 1}`,
        index: idx + 1,
        dezenas: dezenas.sort((a, b) => a - b),
        pares: dezenas.filter((n) => n % 2 === 0).length,
        impares: dezenas.filter((n) => n % 2 !== 0).length,
        primos: dezenas.filter((n) => [2, 3, 5, 7, 11, 13, 17, 19, 23].includes(n)).length,
        soma: dezenas.reduce((acc, curr) => acc + curr, 0),
        moldura: dezenas.filter((n) => [1, 2, 3, 4, 5, 6, 10, 11, 15, 16, 20, 21, 22, 23, 24, 25].includes(n)).length,
        fibonacci: dezenas.filter((n) => [1, 2, 3, 5, 8, 13, 21].includes(n)).length,
      };
    });
  }, [tickets]);

  // Execute Automatic Backtest across the last 5 contests (Chronological: oldest to newest)
  const { evaluations, overallAvg, overallMax, overallAwardRate, totalAwarded } = useMemo(() => {
    const historical = getHistorical100Draws(latestDraw);
    // Last 5 official draws in chronological order (oldest to newest)
    const last5 = historical.slice(0, 5).reverse();

    const evals: ContestEvaluation[] = last5.map((draw) => {
      let sumHits = 0;
      let maxHits = 0;
      let minHits = 15;
      let awardedCount = 0;
      let bestIdx = 1;
      const hitsMap: { [hit: number]: number } = { 11: 0, 12: 0, 13: 0, 14: 0, 15: 0 };

      effectiveTickets.forEach((t) => {
        const hits = countMatches(t.dezenas, draw.dezenas);
        sumHits += hits;
        if (hits > maxHits) {
          maxHits = hits;
          bestIdx = t.index;
        }
        if (hits < minHits) {
          minHits = hits;
        }
        if (hits >= 11) {
          awardedCount++;
          if (hitsMap[hits] !== undefined) {
            hitsMap[hits]++;
          }
        }
      });

      const avg = effectiveTickets.length > 0 ? sumHits / effectiveTickets.length : 0;
      const taxa = effectiveTickets.length > 0 ? (awardedCount / effectiveTickets.length) * 100 : 0;

      return {
        concurso: draw.concurso,
        data: draw.data,
        label: `#${draw.concurso}`,
        dezenas: draw.dezenas,
        avgMatches: Number(avg.toFixed(2)),
        maxMatches: maxHits,
        minMatches: minHits === 15 && effectiveTickets.length === 0 ? 0 : minHits,
        awardedCount,
        taxaPremiacao: Number(taxa.toFixed(1)),
        hitsBreakdown: hitsMap,
        bestTicketIndex: bestIdx,
      };
    });

    const sumAvg = evals.reduce((acc, curr) => acc + curr.avgMatches, 0);
    const avgTotal = evals.length > 0 ? sumAvg / evals.length : 0;
    const maxTotal = Math.max(...evals.map((e) => e.maxMatches), 0);
    const sumAwarded = evals.reduce((acc, curr) => acc + curr.awardedCount, 0);
    const totalTested = effectiveTickets.length * evals.length;
    const awardRateTotal = totalTested > 0 ? (sumAwarded / totalTested) * 100 : 0;

    return {
      evaluations: evals,
      overallAvg: Number(avgTotal.toFixed(2)),
      overallMax: maxTotal,
      overallAwardRate: Number(awardRateTotal.toFixed(1)),
      totalAwarded: sumAwarded,
    };
  }, [effectiveTickets, latestDraw]);

  // Set default selected contest to the latest draw
  useEffect(() => {
    if (evaluations.length > 0 && !selectedContest) {
      setSelectedContest(evaluations[evaluations.length - 1]);
    }
  }, [evaluations, selectedContest]);

  // D3 Area Chart Rendering Effect
  useEffect(() => {
    if (!svgRef.current || evaluations.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = containerWidth;
    const height = 260;
    const margin = { top: 30, right: 35, bottom: 40, left: 45 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    svg.attr('viewBox', `0 0 ${width} ${height}`);

    // Definitions (Gradients & Drop Shadows)
    const defs = svg.append('defs');

    // Emerald Area Gradient
    const areaGradient = defs
      .append('linearGradient')
      .attr('id', 'quickBacktestAreaGrad')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');

    areaGradient.append('stop').attr('offset', '0%').attr('stop-color', '#10b981').attr('stop-opacity', 0.55);
    areaGradient.append('stop').attr('offset', '65%').attr('stop-color', '#059669').attr('stop-opacity', 0.18);
    areaGradient.append('stop').attr('offset', '100%').attr('stop-color', '#047857').attr('stop-opacity', 0.0);

    // Golden Peak Line Gradient
    const goldGradient = defs
      .append('linearGradient')
      .attr('id', 'quickBacktestGoldLine')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '100%')
      .attr('y2', '0%');

    goldGradient.append('stop').attr('offset', '0%').attr('stop-color', '#fbbf24');
    goldGradient.append('stop').attr('offset', '100%').attr('stop-color', '#f59e0b');

    // Main Chart Group
    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    // Scales
    const xScale = d3
      .scalePoint<string>()
      .domain(evaluations.map((d) => d.label))
      .range([0, innerWidth])
      .padding(0.35);

    // Y Scale: from 6 hits to 15 hits
    const yScale = d3.scaleLinear().domain([6, 15]).range([innerHeight, 0]);

    // Horizontal Grid Lines
    const yAxisTicks = [6, 8, 9, 10, 11, 12, 13, 14, 15];
    g.append('g')
      .attr('class', 'grid')
      .selectAll('line')
      .data(yAxisTicks)
      .enter()
      .append('line')
      .attr('x1', 0)
      .attr('x2', innerWidth)
      .attr('y1', (d) => yScale(d))
      .attr('y2', (d) => yScale(d))
      .attr('stroke', '#334155')
      .attr('stroke-opacity', 0.35)
      .attr('stroke-dasharray', '2,2');

    // Reference Benchmark: Baseline 9.0 (Random Hit Expectation)
    g.append('line')
      .attr('x1', 0)
      .attr('x2', innerWidth)
      .attr('y1', yScale(9))
      .attr('y2', yScale(9))
      .attr('stroke', '#64748b')
      .attr('stroke-width', 1.5)
      .attr('stroke-dasharray', '4,4');

    g.append('text')
      .attr('x', 6)
      .attr('y', yScale(9) - 5)
      .attr('fill', '#94a3b8')
      .attr('font-size', '9px')
      .attr('font-weight', '600')
      .attr('font-family', 'ui-monospace, monospace')
      .text('Média Randômica (9.0)');

    // Reference Benchmark: Profit Line 11.0 (Minimum Prize Tier)
    g.append('line')
      .attr('x1', 0)
      .attr('x2', innerWidth)
      .attr('y1', yScale(11))
      .attr('y2', yScale(11))
      .attr('stroke', '#f59e0b')
      .attr('stroke-width', 1.5)
      .attr('stroke-dasharray', '5,4');

    g.append('text')
      .attr('x', innerWidth - 8)
      .attr('y', yScale(11) - 5)
      .attr('text-anchor', 'end')
      .attr('fill', '#fbbf24')
      .attr('font-size', '9px')
      .attr('font-weight', '700')
      .attr('font-family', 'ui-monospace, monospace')
      .text('Faixa Premiada (11.0+)');

    // D3 Area Generator for Average Matches
    const areaGenerator = d3
      .area<ContestEvaluation>()
      .x((d) => xScale(d.label) || 0)
      .y0(innerHeight)
      .y1((d) => yScale(d.avgMatches))
      .curve(d3.curveMonotoneX);

    // Draw the Gradient Area
    g.append('path')
      .datum(evaluations)
      .attr('d', areaGenerator)
      .attr('fill', 'url(#quickBacktestAreaGrad)');

    // D3 Line Generator for Average Matches
    const lineGenerator = d3
      .line<ContestEvaluation>()
      .x((d) => xScale(d.label) || 0)
      .y((d) => yScale(d.avgMatches))
      .curve(d3.curveMonotoneX);

    g.append('path')
      .datum(evaluations)
      .attr('d', lineGenerator)
      .attr('fill', 'none')
      .attr('stroke', '#10b981')
      .attr('stroke-width', 3)
      .attr('stroke-linecap', 'round');

    // D3 Line Generator for Max Matches (Dashed Golden Line)
    const maxLineGenerator = d3
      .line<ContestEvaluation>()
      .x((d) => xScale(d.label) || 0)
      .y((d) => yScale(d.maxMatches))
      .curve(d3.curveMonotoneX);

    g.append('path')
      .datum(evaluations)
      .attr('d', maxLineGenerator)
      .attr('fill', 'none')
      .attr('stroke', 'url(#quickBacktestGoldLine)')
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '5,3')
      .attr('stroke-opacity', 0.85);

    // Draw Interactive Nodes (Circles) for Average Matches
    evaluations.forEach((d) => {
      const cx = xScale(d.label) || 0;
      const cy = yScale(d.avgMatches);
      const cyMax = yScale(d.maxMatches);

      // Node for Max Matches (Golden Diamond)
      g.append('rect')
        .attr('x', cx - 4.5)
        .attr('y', cyMax - 4.5)
        .attr('width', 9)
        .attr('height', 9)
        .attr('transform', `rotate(45, ${cx}, ${cyMax})`)
        .attr('fill', '#f59e0b')
        .attr('stroke', '#1e293b')
        .attr('stroke-width', 1.5)
        .style('cursor', 'pointer')
        .on('click', () => {
          setSelectedContest(d);
          soundService.playTickCountdown();
        });

      // Label for Max Matches on top of diamond
      g.append('text')
        .attr('x', cx)
        .attr('y', cyMax - 10)
        .attr('text-anchor', 'middle')
        .attr('fill', '#fbbf24')
        .attr('font-size', '10px')
        .attr('font-weight', '800')
        .attr('font-family', 'ui-monospace, monospace')
        .text(`${d.maxMatches} pts`);

      // Outer glow circle for Average Matches
      g.append('circle')
        .attr('cx', cx)
        .attr('cy', cy)
        .attr('r', selectedContest?.concurso === d.concurso ? 8 : 6)
        .attr('fill', selectedContest?.concurso === d.concurso ? '#34d399' : '#10b981')
        .attr('stroke', '#0f172a')
        .attr('stroke-width', 2.5)
        .style('cursor', 'pointer')
        .on('click', () => {
          setSelectedContest(d);
          soundService.playTickCountdown();
        });

      // Direct text label on Average Matches
      g.append('text')
        .attr('x', cx)
        .attr('y', cy + 18)
        .attr('text-anchor', 'middle')
        .attr('fill', '#e2e8f0')
        .attr('font-size', '10px')
        .attr('font-weight', '700')
        .attr('font-family', 'ui-monospace, monospace')
        .text(`${d.avgMatches.toFixed(1)}`);
    });

    // X Axis Labels
    const xAxisG = g.append('g').attr('transform', `translate(0,${innerHeight})`);

    evaluations.forEach((d) => {
      const x = xScale(d.label) || 0;
      const isSelected = selectedContest?.concurso === d.concurso;

      const text = xAxisG
        .append('text')
        .attr('x', x)
        .attr('y', 20)
        .attr('text-anchor', 'middle')
        .attr('fill', isSelected ? '#38bdf8' : '#94a3b8')
        .attr('font-size', '11px')
        .attr('font-weight', isSelected ? '800' : '600')
        .attr('font-family', 'ui-monospace, monospace')
        .style('cursor', 'pointer')
        .text(d.label)
        .on('click', () => {
          setSelectedContest(d);
          soundService.playTickCountdown();
        });

      xAxisG
        .append('text')
        .attr('x', x)
        .attr('y', 33)
        .attr('text-anchor', 'middle')
        .attr('fill', '#64748b')
        .attr('font-size', '9px')
        .attr('font-family', 'ui-sans-serif, system-ui')
        .text(d.data.split('/')[0] + '/' + d.data.split('/')[1]);
    });

    // Y Axis Labels
    const yAxisG = g.append('g');
    [6, 9, 11, 13, 15].forEach((val) => {
      yAxisG
        .append('text')
        .attr('x', -10)
        .attr('y', yScale(val) + 4)
        .attr('text-anchor', 'end')
        .attr('fill', val >= 11 ? '#fbbf24' : '#64748b')
        .attr('font-size', '10px')
        .attr('font-family', 'ui-monospace, monospace')
        .attr('font-weight', val >= 11 ? '700' : '500')
        .text(`${val}p`);
    });
  }, [evaluations, containerWidth, selectedContest]);

  return (
    <div
      ref={containerRef}
      className="bg-slate-900/95 rounded-2xl border border-emerald-500/30 p-5 sm:p-6 shadow-2xl relative overflow-hidden space-y-5"
    >
      {/* Background Accent Glows */}
      <div className="absolute -top-24 -right-24 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header Section */}
      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400 via-teal-500 to-emerald-600 flex items-center justify-center text-slate-950 shadow-lg shadow-emerald-500/25 shrink-0">
            <Zap className="w-6 h-6 fill-current stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base sm:text-lg font-black text-white tracking-wide">
                Quick Backtest Automático · Performance dos Jogos Salvos
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 uppercase font-mono tracking-wider">
                Últimos 5 Sorteios
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 uppercase font-mono">
                Área D3.JS
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Execução instantânea e sem cliques: testa os{' '}
              <strong className="text-white font-mono">{effectiveTickets.length} bilhetes</strong> contra os concursos{' '}
              <strong className="text-emerald-300 font-mono">
                #{evaluations[0]?.concurso} ao #{evaluations[evaluations.length - 1]?.concurso}
              </strong>
              {isFallbackPreset && (
                <span className="text-amber-400 ml-1.5 font-semibold">
                  (Simulando com 24 bilhetes de fechamento padrão)
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          {effectiveTickets.length > 0 && onGoToGamesManager && (
            <button
              onClick={onGoToGamesManager}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700/80 transition cursor-pointer"
            >
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              <span>Ver Meus Jogos ({effectiveTickets.length})</span>
            </button>
          )}

          {onGoToGenerator && (
            <button
              onClick={onGoToGenerator}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 text-xs font-black shadow-md shadow-emerald-500/20 transition cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Gerar Novo Fechamento</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 relative z-10">
        <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3.5 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Média de Acertos</span>
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-white font-mono flex items-baseline gap-1.5">
            <span>{overallAvg.toFixed(2)}</span>
            <span className="text-xs text-emerald-400 font-bold">pontos</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
            <span className="text-emerald-400 font-bold">
              +{(overallAvg - 9.0).toFixed(2)}
            </span>
            <span>acima do ponto aleatório (9.0)</span>
          </div>
        </div>

        <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3.5 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Pico de Acertos</span>
            <Award className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400 font-mono flex items-baseline gap-1.5">
            <span>{overallMax}</span>
            <span className="text-xs text-amber-300 font-bold">acertos</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            Melhor marca nos últimos 5 sorteios
          </div>
        </div>

        <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3.5 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Taxa Premiada (≥11)</span>
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="text-2xl font-black text-cyan-300 font-mono flex items-baseline gap-1.5">
            <span>{overallAwardRate}%</span>
            <span className="text-xs text-slate-400">({totalAwarded} jogos)</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            Percentual de bilhetes que pagaram prêmio
          </div>
        </div>

        <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3.5 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Validação de Matriz</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-base sm:text-lg font-black text-emerald-300">
            {overallAvg >= 10.0 ? 'Alta Aderência' : 'Consistente'}
          </div>
          <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
            <span>5 concursos consecutivos</span>
          </div>
        </div>
      </div>

      {/* D3 Area Chart Container */}
      <div className="bg-slate-950/70 rounded-xl border border-slate-800/80 p-4 relative z-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <span>Curva de Acertos Médios & Picos (D3.js Area Chart)</span>
            </h4>
            <p className="text-[11px] text-slate-400">
              A área esmeralda representa a média de acertos dos seus jogos; a linha dourada superior indica o melhor bilhete de cada concurso.
            </p>
          </div>

          <div className="flex items-center gap-3 text-[11px] font-mono text-slate-400 shrink-0">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-emerald-500/70 inline-block border border-emerald-400" /> Média de Acertos
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-amber-400 inline-block border-t border-dashed border-amber-300" /> Melhor Bilhete
            </span>
          </div>
        </div>

        {/* SVG Render Element */}
        <div className="w-full">
          <svg ref={svgRef} className="w-full h-auto overflow-visible select-none" />
        </div>
      </div>

      {/* Detailed Contest Selector Pills & Breakdown */}
      <div className="space-y-3 relative z-10">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-amber-400" />
            <span>Auditoria Concurso a Concurso (Selecione para inspecionar):</span>
          </h4>
          <span className="text-[10px] text-slate-400 font-mono">
            {evaluations.length} sorteios auditados
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5">
          {evaluations.map((ev) => {
            const isSelected = selectedContest?.concurso === ev.concurso;
            return (
              <button
                key={ev.concurso}
                onClick={() => {
                  setSelectedContest(ev);
                  soundService.playTickCountdown();
                }}
                className={`p-3 rounded-xl border text-left transition cursor-pointer relative ${
                  isSelected
                    ? 'bg-emerald-500/15 border-emerald-400 text-white shadow-lg shadow-emerald-500/10 ring-1 ring-emerald-400/40'
                    : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-900/60'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-black font-mono mb-1">
                  <span className={isSelected ? 'text-emerald-300' : 'text-white'}>
                    Concurso {ev.label}
                  </span>
                  <span
                    className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${
                      ev.maxMatches >= 13
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    Top: {ev.maxMatches}p
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 mb-1.5 flex items-center justify-between">
                  <span>{ev.data}</span>
                  <span className="text-emerald-400 font-semibold">{ev.taxaPremiacao}% premiados</span>
                </div>
                <div className="flex items-center justify-between text-[11px] font-mono border-t border-slate-800/80 pt-1.5">
                  <span className="text-slate-400">Média:</span>
                  <strong className={isSelected ? 'text-emerald-300' : 'text-white'}>
                    {ev.avgMatches.toFixed(2)} pts
                  </strong>
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected Contest Inspection Card */}
        {selectedContest && (
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-3 mt-3 animate-fadeIn">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-slate-800 gap-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                <h5 className="text-sm font-bold text-white">
                  Detalhamento do Concurso #{selectedContest.concurso} ({selectedContest.data})
                </h5>
              </div>
              <div className="flex items-center gap-2 text-xs font-mono">
                <span className="text-slate-400">Melhor Jogo:</span>
                <span className="text-amber-300 font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                  Bilhete #{selectedContest.bestTicketIndex} cravou {selectedContest.maxMatches} acertos
                </span>
              </div>
            </div>

            {/* Drawn Numbers Balls */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-slate-400">
                15 Dezenas Sorteadas pela Caixa neste Concurso:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {selectedContest.dezenas.map((num) => (
                  <span
                    key={num}
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center justify-center font-mono font-black text-xs shadow-sm"
                  >
                    {num.toString().padStart(2, '0')}
                  </span>
                ))}
              </div>
            </div>

            {/* Tier breakdown */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center pt-1">
              {[
                { label: '11 Acertos', count: selectedContest.hitsBreakdown[11] || 0, color: 'text-slate-300' },
                { label: '12 Acertos', count: selectedContest.hitsBreakdown[12] || 0, color: 'text-cyan-300' },
                { label: '13 Acertos', count: selectedContest.hitsBreakdown[13] || 0, color: 'text-emerald-300' },
                { label: '14 Acertos', count: selectedContest.hitsBreakdown[14] || 0, color: 'text-amber-300' },
                { label: '15 Acertos', count: selectedContest.hitsBreakdown[15] || 0, color: 'text-amber-400 font-black' },
              ].map((tier) => (
                <div key={tier.label} className="bg-slate-900/90 rounded-lg p-2 border border-slate-800">
                  <div className="text-[10px] text-slate-400">{tier.label}</div>
                  <div className={`text-base font-bold font-mono ${tier.color}`}>
                    {tier.count} {tier.count === 1 ? 'jogo' : 'jogos'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Strategic Footer */}
      <div className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-400 relative z-10">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            <strong className="text-slate-200">Quick Backtest:</strong> Executado automaticamente com algoritmo de interseção determinística em O(N·K) sem latência de rede.
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono text-emerald-400 font-bold">
            Taxa Média: {overallAvg.toFixed(2)} pts/jogo
          </span>
        </div>
      </div>
    </div>
  );
};
