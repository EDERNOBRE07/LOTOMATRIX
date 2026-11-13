import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import { GameTicket, LotofacilDraw } from '../types/lotofacil';
import { CONCURSO_ATUAL, RECENT_DRAWS } from '../data/lotofacilData';
import { countMatches, normalizeGameTickets } from '../services/combinatorics';
import { getSavedFechamentos } from '../services/savedFechamentosStorage';
import { TrendingUp, Award, BarChart3, Layers } from 'lucide-react';

export interface Historico5ConcursosD3ChartProps {
  savedTickets?: GameTicket[];
  latestDraw?: LotofacilDraw;
  draws?: LotofacilDraw[];
  className?: string;
}

type ScoreChartMetric = 'media' | 'melhor';

interface ContestScorePoint {
  concurso: number;
  label: string;
  data: string;
  mediaAcertos: number;
  melhorJogo: number;
  melhorTicketIndex: number;
  premiados: number;
  totalBilhetes: number;
}

export const Historico5ConcursosD3Chart: React.FC<Historico5ConcursosD3ChartProps> = ({
  savedTickets = [],
  latestDraw = CONCURSO_ATUAL,
  draws = RECENT_DRAWS,
  className = '',
}) => {
  const [metricMode, setMetricMode] = useState<ScoreChartMetric>('media');
  const [hoveredPoint, setHoveredPoint] = useState<ContestScorePoint | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [chartWidth, setChartWidth] = useState<number>(760);

  // Responsividade real do canvas D3
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect?.width;
      if (w && w > 280) {
        setChartWidth(Math.min(920, Math.round(w - 32)));
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Resolve bilhetes salvos efetivos (props -> localStorage -> fechamentos salvos)
  const effectiveTickets = useMemo(() => {
    const sortedDrawn = [...(latestDraw.dezenas || [])].sort((a, b) => a - b);
    if (savedTickets && savedTickets.length > 0) {
      return normalizeGameTickets(savedTickets, sortedDrawn);
    }
    try {
      const raw = localStorage.getItem('lotosniper_saved_tickets');
      if (raw) {
        const normalized = normalizeGameTickets(JSON.parse(raw), sortedDrawn);
        if (normalized.length > 0) return normalized;
      }
    } catch {}
    const fechamentos = getSavedFechamentos();
    if (fechamentos.length > 0) {
      return normalizeGameTickets(
        fechamentos.flatMap((f) => (Array.isArray(f.tickets) ? f.tickets : [])),
        sortedDrawn
      );
    }
    return [];
  }, [savedTickets, latestDraw.dezenas]);

  // Últimos 5 concursos oficiais em ordem cronológica (mais antigo -> mais recente)
  const last5Draws = useMemo(() => {
    const merged = [latestDraw, ...draws.filter((d) => d.concurso !== latestDraw.concurso)];
    return merged
      .sort((a, b) => b.concurso - a.concurso)
      .slice(0, 5)
      .reverse();
  }, [latestDraw, draws]);

  // Calcula histórico real de pontuação por concurso para os bilhetes salvos
  const scoreSeries: ContestScorePoint[] = useMemo(() => {
    return last5Draws.map((draw) => {
      const sortedDrawDez = [...(draw.dezenas || [])].sort((a, b) => a - b);
      if (effectiveTickets.length === 0) {
        return {
          concurso: draw.concurso,
          label: `#${draw.concurso}`,
          data: draw.data,
          mediaAcertos: 0,
          melhorJogo: 0,
          melhorTicketIndex: 0,
          premiados: 0,
          totalBilhetes: 0,
        };
      }

      let sumHits = 0;
      let maxHits = 0;
      let bestIdx = effectiveTickets[0]?.index || 1;
      let awarded = 0;

      effectiveTickets.forEach((ticket) => {
        const sortedTicketDez = [...ticket.dezenas].sort((a, b) => a - b);
        const hits = countMatches(sortedTicketDez, sortedDrawDez);
        sumHits += hits;
        if (hits > maxHits) {
          maxHits = hits;
          bestIdx = ticket.index;
        }
        if (hits >= 11) {
          awarded++;
        }
      });

      return {
        concurso: draw.concurso,
        label: `#${draw.concurso}`,
        data: draw.data,
        mediaAcertos: Number((sumHits / effectiveTickets.length).toFixed(2)),
        melhorJogo: maxHits,
        melhorTicketIndex: bestIdx,
        premiados: awarded,
        totalBilhetes: effectiveTickets.length,
      };
    });
  }, [last5Draws, effectiveTickets]);

  // KPIs agregados dos últimos 5 concursos
  const summaryKpis = useMemo(() => {
    if (effectiveTickets.length === 0 || scoreSeries.length === 0) {
      return { avg5: 0, peak5: 0, totalAwarded5: 0, latestScore: 0 };
    }
    const avg5 =
      scoreSeries.reduce((acc, p) => acc + p.mediaAcertos, 0) / scoreSeries.length;
    const peak5 = Math.max(...scoreSeries.map((p) => p.melhorJogo));
    const totalAwarded5 = scoreSeries.reduce((acc, p) => acc + p.premiados, 0);
    const latestPoint = scoreSeries[scoreSeries.length - 1];
    const latestScore =
      metricMode === 'media' ? latestPoint.mediaAcertos : latestPoint.melhorJogo;

    return {
      avg5: Number(avg5.toFixed(2)),
      peak5,
      totalAwarded5,
      latestScore,
    };
  }, [scoreSeries, effectiveTickets.length, metricMode]);

  // Renderização D3.js do Gráfico de Linhas Interativo
  useEffect(() => {
    if (!svgRef.current || effectiveTickets.length === 0 || scoreSeries.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = Math.max(520, chartWidth);
    const height = 310;
    const margin = { top: 28, right: 32, bottom: 48, left: 46 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    svg.attr('viewBox', `0 0 ${width} ${height}`);

    const defs = svg.append('defs');
    const accentColor = metricMode === 'media' ? '#10b981' : '#f59e0b';
    const accentGlow = metricMode === 'media' ? '#34d399' : '#fbbf24';

    const grad = defs
      .append('linearGradient')
      .attr('id', `grad-hist5-${metricMode}`)
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');
    grad.append('stop').attr('offset', '0%').attr('stop-color', accentColor).attr('stop-opacity', 0.32);
    grad.append('stop').attr('offset', '100%').attr('stop-color', '#0f172a').attr('stop-opacity', 0.0);

    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const getValue = (d: ContestScorePoint) =>
      metricMode === 'media' ? d.mediaAcertos : d.melhorJogo;

    const minVal = d3.min(scoreSeries, getValue) ?? 6;
    const yMin = Math.max(4, Math.floor(minVal) - 1);
    const yMax = 15.3;

    const xScale = d3
      .scalePoint<string>()
      .domain(scoreSeries.map((d) => d.label))
      .range([20, innerWidth - 20])
      .padding(0.2);

    const yScale = d3
      .scaleLinear()
      .domain([yMin, yMax])
      .range([innerHeight, 0]);

    // Grid horizontal
    const yTicks = d3.range(Math.ceil(yMin), 16, 1);
    g.append('g')
      .selectAll('line.grid-y')
      .data(yTicks)
      .enter()
      .append('line')
      .attr('x1', 0)
      .attr('x2', innerWidth)
      .attr('y1', (d) => yScale(d))
      .attr('y2', (d) => yScale(d))
      .attr('stroke', '#1e293b')
      .attr('stroke-dasharray', '3,3');

    // Linha de referência: 11 Pontos (Premiação Mínima)
    if (yMin <= 11) {
      g.append('line')
        .attr('x1', 0)
        .attr('x2', innerWidth)
        .attr('y1', yScale(11))
        .attr('y2', yScale(11))
        .attr('stroke', '#38bdf8')
        .attr('stroke-width', 1.2)
        .attr('stroke-dasharray', '5,4');

      g.append('text')
        .attr('x', innerWidth - 4)
        .attr('y', yScale(11) - 5)
        .attr('text-anchor', 'end')
        .attr('fill', '#38bdf8')
        .attr('font-size', '10px')
        .attr('font-family', 'monospace')
        .text('11 pts (Premiado)');
    }

    // Linha de referência: 14 Pontos (Alvo Sniper)
    g.append('line')
      .attr('x1', 0)
      .attr('x2', innerWidth)
      .attr('y1', yScale(14))
      .attr('y2', yScale(14))
      .attr('stroke', '#f59e0b')
      .attr('stroke-width', 1.2)
      .attr('stroke-dasharray', '4,4');

    g.append('text')
      .attr('x', innerWidth - 4)
      .attr('y', yScale(14) - 5)
      .attr('text-anchor', 'end')
      .attr('fill', '#f59e0b')
      .attr('font-size', '10px')
      .attr('font-family', 'monospace')
      .text('14 pts (Alvo Sniper)');

    // Área preenchida
    const areaGen = d3
      .area<ContestScorePoint>()
      .x((d) => xScale(d.label) ?? 0)
      .y0(innerHeight)
      .y1((d) => yScale(getValue(d)))
      .curve(d3.curveMonotoneX);

    g.append('path')
      .datum(scoreSeries)
      .attr('fill', `url(#grad-hist5-${metricMode})`)
      .attr('d', areaGen);

    // Linha principal
    const lineGen = d3
      .line<ContestScorePoint>()
      .x((d) => xScale(d.label) ?? 0)
      .y((d) => yScale(getValue(d)))
      .curve(d3.curveMonotoneX);

    const path = g
      .append('path')
      .datum(scoreSeries)
      .attr('fill', 'none')
      .attr('stroke', accentColor)
      .attr('stroke-width', 3)
      .attr('stroke-linecap', 'round')
      .attr('d', lineGen);

    const totalLength = path.node()?.getTotalLength() || 600;
    path
      .attr('stroke-dasharray', `${totalLength} ${totalLength}`)
      .attr('stroke-dashoffset', totalLength)
      .transition()
      .duration(650)
      .ease(d3.easeCubicOut)
      .attr('stroke-dashoffset', 0);

    // Pontos e Rótulos de Valor
    const pointGroups = g
      .selectAll('.score-point')
      .data(scoreSeries)
      .enter()
      .append('g')
      .attr('class', 'score-point');

    pointGroups
      .append('circle')
      .attr('cx', (d) => xScale(d.label) ?? 0)
      .attr('cy', (d) => yScale(getValue(d)))
      .attr('r', 6)
      .attr('fill', accentGlow)
      .attr('stroke', '#020617')
      .attr('stroke-width', 2.5);

    pointGroups
      .append('text')
      .attr('x', (d) => xScale(d.label) ?? 0)
      .attr('y', (d) => yScale(getValue(d)) - 12)
      .attr('text-anchor', 'middle')
      .attr('fill', '#f8fafc')
      .attr('font-size', '11px')
      .attr('font-weight', 'bold')
      .attr('font-family', 'monospace')
      .text((d) =>
        metricMode === 'media' ? d.mediaAcertos.toFixed(2) : `${d.melhorJogo} pts`
      );

    // Área interativa invisível para hover confortável
    pointGroups
      .append('rect')
      .attr('x', (d) => (xScale(d.label) ?? 0) - 36)
      .attr('y', 0)
      .attr('width', 72)
      .attr('height', innerHeight)
      .attr('fill', 'transparent')
      .style('cursor', 'pointer')
      .on('mouseenter', (event: MouseEvent, d: ContestScorePoint) => {
        setHoveredPoint(d);
        if (containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect();
          setTooltipPos({ x: event.clientX - rect.left, y: event.clientY - rect.top });
        }
      })
      .on('mousemove', (event: MouseEvent) => {
        if (containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect();
          setTooltipPos({ x: event.clientX - rect.left, y: event.clientY - rect.top });
        }
      })
      .on('mouseleave', () => {
        setHoveredPoint(null);
        setTooltipPos(null);
      });

    // Eixo X
    const xAxis = d3.axisBottom(xScale);
    const gx = g
      .append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(xAxis);

    gx.select('.domain').attr('stroke', '#334155');
    gx.selectAll('line').attr('stroke', '#334155');
    gx.selectAll('text')
      .attr('fill', '#cbd5e1')
      .attr('font-size', '11px')
      .attr('font-weight', 'bold')
      .attr('font-family', 'monospace')
      .attr('dy', '1em');

    // Datas abaixo do número do concurso
    scoreSeries.forEach((pt) => {
      g.append('text')
        .attr('x', xScale(pt.label) ?? 0)
        .attr('y', innerHeight + 34)
        .attr('text-anchor', 'middle')
        .attr('fill', '#64748b')
        .attr('font-size', '9.5px')
        .attr('font-family', 'monospace')
        .text(pt.data);
    });

    // Eixo Y
    const yAxis = d3
      .axisLeft(yScale)
      .tickValues(yTicks)
      .tickFormat((d) => `${d}`);
    const gy = g.append('g').call(yAxis);

    gy.select('.domain').remove();
    gy.selectAll('line').remove();
    gy.selectAll('text')
      .attr('fill', '#94a3b8')
      .attr('font-size', '10.5px')
      .attr('font-family', 'monospace');
  }, [scoreSeries, metricMode, chartWidth, effectiveTickets.length]);

  return (
    <div
      ref={containerRef}
      className={`relative bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl text-slate-100 space-y-4 ${className}`}
    >
      {/* Header + Toggle Média de Acertos vs Melhor Jogo */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-3 border-b border-slate-800">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-black text-white flex flex-wrap items-center gap-2 font-mono">
              <span>Histórico de Pontuação · Últimos 5 Concursos (D3.js)</span>
              <span className="text-[11px] font-normal text-slate-400">
                {effectiveTickets.length} bilhete(s) salvos avaliados
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Acompanhe o desempenho real dos seus bilhetes salvos nos 5 sorteios oficiais mais recentes da Caixa.
            </p>
          </div>
        </div>

        {/* Botões de Alternância: Média de Acertos vs Melhor Jogo */}
        <div className="inline-flex rounded-xl bg-slate-950 p-1 border border-slate-800 text-xs font-mono shrink-0 self-start lg:self-center">
          <button
            type="button"
            onClick={() => setMetricMode('media')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
              metricMode === 'media'
                ? 'bg-emerald-500 text-slate-950 font-black shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Média de Acertos</span>
          </button>

          <button
            type="button"
            onClick={() => setMetricMode('melhor')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
              metricMode === 'melhor'
                ? 'bg-amber-400 text-slate-950 font-black shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            <span>Melhor Jogo</span>
          </button>
        </div>
      </div>

      {/* KPIs Resumo */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono tabular-nums">
        <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3">
          <span className="text-[10px] text-slate-400 uppercase font-sans block">
            Média Geral (5 Conc.)
          </span>
          <strong className="text-base font-black text-emerald-400">
            {summaryKpis.avg5.toFixed(2)} pts
          </strong>
        </div>

        <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3">
          <span className="text-[10px] text-slate-400 uppercase font-sans block">
            Pico Melhor Jogo
          </span>
          <strong className="text-base font-black text-amber-400">
            {summaryKpis.peak5} pts
          </strong>
        </div>

        <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3">
          <span className="text-[10px] text-slate-400 uppercase font-sans block">
            Último Concurso (#{latestDraw.concurso})
          </span>
          <strong className="text-base font-black text-cyan-400">
            {metricMode === 'media'
              ? `${summaryKpis.latestScore.toFixed(2)} méd.`
              : `${summaryKpis.latestScore} pts`}
          </strong>
        </div>

        <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3">
          <span className="text-[10px] text-slate-400 uppercase font-sans block">
            Acertos Premiados (11+)
          </span>
          <strong className="text-base font-black text-white">
            {summaryKpis.totalAwarded5} ocorrências
          </strong>
        </div>
      </div>

      {/* Canvas D3.js ou Estado Vazio */}
      {effectiveTickets.length === 0 ? (
        <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-8 text-center space-y-2">
          <Layers className="w-8 h-8 text-slate-500 mx-auto" />
          <p className="text-sm font-bold text-white">Nenhum bilhete salvo para plotar o histórico</p>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Gere e salve seus jogos no Estúdio de Fechamentos para visualizar a curva D3.js de Média de Acertos e Melhor Jogo nos últimos 5 concursos.
          </p>
        </div>
      ) : (
        <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-2 overflow-x-auto">
          <svg
            ref={svgRef}
            className="w-full h-auto min-w-[500px] max-h-[320px]"
          />
        </div>
      )}

      {/* Tooltip Interativo D3 */}
      {hoveredPoint && tooltipPos && (
        <div
          className="pointer-events-none absolute z-30 -translate-x-1/2 -translate-y-full bg-slate-950/95 border border-slate-700 rounded-xl px-3.5 py-2.5 shadow-2xl text-xs font-mono tabular-nums space-y-1 min-w-[200px]"
          style={{
            left: `${Math.max(110, Math.min(chartWidth - 80, tooltipPos.x))}px`,
            top: `${Math.max(85, tooltipPos.y - 10)}px`,
          }}
        >
          <div className="font-bold text-white border-b border-slate-800 pb-1 flex items-center justify-between gap-3">
            <span>Concurso {hoveredPoint.label}</span>
            <span className="text-slate-400 font-normal">{hoveredPoint.data}</span>
          </div>
          <div className="flex justify-between gap-4 text-[11px]">
            <span className="text-slate-400">Média de Acertos:</span>
            <strong className="text-emerald-400">{hoveredPoint.mediaAcertos.toFixed(2)} pts</strong>
          </div>
          <div className="flex justify-between gap-4 text-[11px]">
            <span className="text-slate-400">Melhor Jogo:</span>
            <strong className="text-amber-400">
              {hoveredPoint.melhorJogo} pts (#{hoveredPoint.melhorTicketIndex.toString().padStart(2, '0')})
            </strong>
          </div>
          <div className="flex justify-between gap-4 text-[11px]">
            <span className="text-slate-400">Premiados (11+):</span>
            <strong className="text-cyan-300">
              {hoveredPoint.premiados}/{hoveredPoint.totalBilhetes}
            </strong>
          </div>
        </div>
      )}
    </div>
  );
};
