import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as d3 from 'd3';
import { GameTicket, LotofacilDraw } from '../types/lotofacil';
import { CONCURSO_ATUAL, RECENT_DRAWS } from '../data/lotofacilData';
import { getHistorical100Draws } from '../services/historical100Draws';
import {
  SavedFechamentoPrognostico,
  getSavedFechamentos,
} from '../services/savedFechamentosStorage';
import { countMatches, VALOR_APOSTA_LOTOFACIL } from '../services/combinatorics';
import { soundService } from '../services/soundAlert';
import {
  TrendingUp,
  Play,
  RotateCcw,
  Calendar,
  Layers,
  Award,
  DollarSign,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  BarChart3,
  Flame,
  Info,
} from 'lucide-react';

interface SimulacaoBacktestD3ComponentProps {
  currentTickets: GameTicket[];
  latestDraw?: LotofacilDraw;
}

interface ContestBacktestResult {
  concurso: number;
  data: string;
  dezenas: number[];
  hitsDistribution: { [hits: number]: number };
  maxHits: number;
  totalPremiado: number;
  custoConcurso: number;
  saldoConcurso: number;
  saldoAcumulado: number;
  mediaAcertos: number;
}

export const SimulacaoBacktestD3Component: React.FC<SimulacaoBacktestD3ComponentProps> = ({
  currentTickets,
  latestDraw = CONCURSO_ATUAL,
}) => {
  const [selectedSourceType, setSelectedSourceType] = useState<'current' | 'saved'>('current');
  const [selectedSavedId, setSelectedSavedId] = useState<string>('');
  const [historyScope, setHistoryScope] = useState<10 | 20 | 50 | 100>(10);
  const [chartMetric, setChartMetric] = useState<'saldo' | 'media_acertos' | 'premiacao'>('saldo');
  const [hoveredPoint, setHoveredPoint] = useState<ContestBacktestResult | null>(null);

  const savedList = useMemo(() => getSavedFechamentos(), []);

  useEffect(() => {
    if (savedList.length > 0 && !selectedSavedId) {
      setSelectedSavedId(savedList[0].id);
    }
  }, [savedList, selectedSavedId]);

  // Determine active tickets to backtest
  const activeTickets: GameTicket[] = useMemo(() => {
    if (selectedSourceType === 'saved') {
      const found = savedList.find((f) => f.id === selectedSavedId);
      if (found && found.tickets.length > 0) return found.tickets;
    }
    return currentTickets.length > 0 ? currentTickets : savedList[0]?.tickets || [];
  }, [selectedSourceType, selectedSavedId, currentTickets, savedList]);

  // Historical draws ending at latestDraw
  const historicalDraws = useMemo(() => {
    const list = getHistorical100Draws(latestDraw);
    return list.slice(0, historyScope).reverse(); // chronological order (oldest to newest)
  }, [latestDraw, historyScope]);

  // Run backtest calculation across the chosen historical draws
  const backtestResults: ContestBacktestResult[] = useMemo(() => {
    if (activeTickets.length === 0 || historicalDraws.length === 0) return [];

    let saldoAcumulado = 0;
    const custoPorConcurso = activeTickets.length * VALOR_APOSTA_LOTOFACIL;

    return historicalDraws.map((draw) => {
      const hitsDist: { [hits: number]: number } = { 11: 0, 12: 0, 13: 0, 14: 0, 15: 0 };
      let maxHits = 0;
      let totalHitsSum = 0;
      let totalPremiado = 0;

      activeTickets.forEach((ticket) => {
        const matches = countMatches(ticket.dezenas, draw.dezenas);
        totalHitsSum += matches;
        if (matches > maxHits) maxHits = matches;

        if (matches >= 11 && matches <= 15) {
          hitsDist[matches] = (hitsDist[matches] || 0) + 1;

          // Caixa prize valuation
          if (matches === 15) {
            totalPremiado += draw.premiacoes?.faixa15?.valor || 2000000;
          } else if (matches === 14) {
            totalPremiado += draw.premiacoes?.faixa14?.valor || 1800;
          } else if (matches === 13) {
            totalPremiado += 35.0;
          } else if (matches === 12) {
            totalPremiado += 14.0;
          } else if (matches === 11) {
            totalPremiado += 7.0;
          }
        }
      });

      const saldoConcurso = totalPremiado - custoPorConcurso;
      saldoAcumulado += saldoConcurso;
      const mediaAcertos = Number((totalHitsSum / activeTickets.length).toFixed(2));

      return {
        concurso: draw.concurso,
        data: draw.data,
        dezenas: draw.dezenas,
        hitsDistribution: hitsDist,
        maxHits,
        totalPremiado,
        custoConcurso: custoPorConcurso,
        saldoConcurso,
        saldoAcumulado: Number(saldoAcumulado.toFixed(2)),
        mediaAcertos,
      };
    });
  }, [activeTickets, historicalDraws]);

  // Overall Backtest Metrics
  const summaryStats = useMemo(() => {
    if (backtestResults.length === 0) {
      return {
        totalInvestido: 0,
        totalPremiado: 0,
        saldoFinal: 0,
        roi: 0,
        concursosComLucro: 0,
        concursosPremiados: 0,
        maxHitsAllTime: 0,
        total14Ou15: 0,
      };
    }

    const totalInvestido = backtestResults.reduce((acc, r) => acc + r.custoConcurso, 0);
    const totalPremiado = backtestResults.reduce((acc, r) => acc + r.totalPremiado, 0);
    const saldoFinal = totalPremiado - totalInvestido;
    const roi = totalInvestido > 0 ? Number(((totalPremiado / totalInvestido) * 100).toFixed(1)) : 0;

    const concursosComLucro = backtestResults.filter((r) => r.saldoConcurso > 0).length;
    const concursosPremiados = backtestResults.filter((r) => r.totalPremiado > 0).length;
    const maxHitsAllTime = Math.max(...backtestResults.map((r) => r.maxHits));
    const total14Ou15 = backtestResults.reduce(
      (acc, r) => acc + (r.hitsDistribution[14] || 0) + (r.hitsDistribution[15] || 0),
      0
    );

    return {
      totalInvestido,
      totalPremiado,
      saldoFinal,
      roi,
      concursosComLucro,
      concursosPremiados,
      maxHitsAllTime,
      total14Ou15,
    };
  }, [backtestResults]);

  // D3 Chart SVG Reference
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!svgRef.current || backtestResults.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove(); // clear previous renders

    const containerWidth = svgRef.current.clientWidth || 800;
    const containerHeight = 280;
    const margin = { top: 25, right: 30, bottom: 35, left: 65 };
    const width = containerWidth - margin.left - margin.right;
    const height = containerHeight - margin.top - margin.bottom;

    const g = svg
      .attr('viewBox', `0 0 ${containerWidth} ${containerHeight}`)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // X Scale
    const xScale = d3
      .scalePoint<string>()
      .domain(backtestResults.map((d) => `#${d.concurso}`))
      .range([0, width])
      .padding(0.3);

    // Y Scale depending on active metric
    let yMin = 0;
    let yMax = 100;

    if (chartMetric === 'saldo') {
      const minSaldo = d3.min(backtestResults, (d) => d.saldoAcumulado) || 0;
      const maxSaldo = d3.max(backtestResults, (d) => d.saldoAcumulado) || 100;
      yMin = Math.min(0, minSaldo * 1.15);
      yMax = Math.max(100, maxSaldo * 1.15);
    } else if (chartMetric === 'media_acertos') {
      yMin = 7;
      yMax = 15;
    } else {
      const maxP = d3.max(backtestResults, (d) => d.totalPremiado) || 100;
      yMin = 0;
      yMax = Math.max(100, maxP * 1.2);
    }

    const yScale = d3.scaleLinear().domain([yMin, yMax]).range([height, 0]);

    // Gridlines
    g.append('g')
      .attr('class', 'grid')
      .attr('opacity', 0.15)
      .call(d3.axisLeft(yScale).tickSize(-width).tickFormat(() => ''))
      .selectAll('line')
      .attr('stroke', '#94a3b8');

    // Zero Reference Line for Saldo
    if (chartMetric === 'saldo' && yMin < 0 && yMax > 0) {
      g.append('line')
        .attr('x1', 0)
        .attr('x2', width)
        .attr('y1', yScale(0))
        .attr('y2', yScale(0))
        .attr('stroke', '#fbbf24')
        .attr('stroke-dasharray', '4 4')
        .attr('stroke-width', 1.5);
    }

    // Gradient Definition
    const defs = svg.append('defs');
    const areaGradient = defs
      .append('linearGradient')
      .attr('id', 'd3BacktestGradient')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');

    const gradColor = chartMetric === 'saldo' && summaryStats.saldoFinal >= 0 ? '#10b981' : '#f59e0b';

    areaGradient.append('stop').attr('offset', '0%').attr('stop-color', gradColor).attr('stop-opacity', 0.45);
    areaGradient.append('stop').attr('offset', '100%').attr('stop-color', gradColor).attr('stop-opacity', 0.02);

    // Area Generator
    const area = d3
      .area<ContestBacktestResult>()
      .x((d) => xScale(`#${d.concurso}`) || 0)
      .y0(chartMetric === 'saldo' ? yScale(0) : height)
      .y1((d) => {
        const val =
          chartMetric === 'saldo'
            ? d.saldoAcumulado
            : chartMetric === 'media_acertos'
            ? d.mediaAcertos
            : d.totalPremiado;
        return yScale(val);
      })
      .curve(d3.curveMonotoneX);

    g.append('path').datum(backtestResults).attr('fill', 'url(#d3BacktestGradient)').attr('d', area);

    // Line Generator
    const line = d3
      .line<ContestBacktestResult>()
      .x((d) => xScale(`#${d.concurso}`) || 0)
      .y((d) => {
        const val =
          chartMetric === 'saldo'
            ? d.saldoAcumulado
            : chartMetric === 'media_acertos'
            ? d.mediaAcertos
            : d.totalPremiado;
        return yScale(val);
      })
      .curve(d3.curveMonotoneX);

    g.append('path')
      .datum(backtestResults)
      .attr('fill', 'none')
      .attr('stroke', gradColor)
      .attr('stroke-width', 3)
      .attr('d', line);

    // X Axis
    const tickInterval = Math.ceil(backtestResults.length / 10);
    const visibleTicks = backtestResults
      .filter((_, i) => i % tickInterval === 0 || i === backtestResults.length - 1)
      .map((d) => `#${d.concurso}`);

    const xAxis = d3.axisBottom(xScale).tickValues(visibleTicks);

    g.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(xAxis)
      .selectAll('text')
      .attr('fill', '#94a3b8')
      .attr('font-size', '10px')
      .attr('font-family', 'monospace');

    // Y Axis
    const yAxis = d3
      .axisLeft(yScale)
      .ticks(6)
      .tickFormat((d) => {
        const n = d.valueOf();
        if (chartMetric === 'saldo' || chartMetric === 'premiacao') {
          if (Math.abs(n) >= 1000) return `R$${(n / 1000).toFixed(1)}k`;
          return `R$${n}`;
        }
        return `${n} pts`;
      });

    g.append('g')
      .call(yAxis)
      .selectAll('text')
      .attr('fill', '#94a3b8')
      .attr('font-size', '10px')
      .attr('font-family', 'monospace');

    // Interactive Points
    const dots = g
      .selectAll('.dot')
      .data(backtestResults)
      .enter()
      .append('circle')
      .attr('cx', (d) => xScale(`#${d.concurso}`) || 0)
      .attr('cy', (d) => {
        const val =
          chartMetric === 'saldo'
            ? d.saldoAcumulado
            : chartMetric === 'media_acertos'
            ? d.mediaAcertos
            : d.totalPremiado;
        return yScale(val);
      })
      .attr('r', (d) => (d.maxHits >= 14 ? 6 : 4))
      .attr('fill', (d) => {
        if (d.maxHits === 15) return '#fbbf24';
        if (d.maxHits === 14) return '#38bdf8';
        if (d.saldoConcurso > 0) return '#10b981';
        return gradColor;
      })
      .attr('stroke', '#0f172a')
      .attr('stroke-width', 2)
      .style('cursor', 'pointer')
      .on('mouseenter', (_event, d) => {
        setHoveredPoint(d);
        try {
          soundService.playFilterClick();
        } catch {}
      });

    // Animate points with pop effect
    dots.transition().duration(400).attr('opacity', 1);
  }, [backtestResults, chartMetric, summaryStats.saldoFinal]);

  return (
    <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-5 shadow-2xl space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="p-2 rounded-xl bg-gradient-to-br from-amber-400 to-yellow-600 text-slate-950 shadow-md shadow-amber-500/20">
              <TrendingUp className="w-5 h-5 font-black" />
            </span>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white tracking-wide flex items-center gap-2">
                <span>Simulação de Backtest Real de Jogos Salvos</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase font-black">
                  D3.JS Engine • {historyScope} Concursos
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Rode seus jogos salvos contra os sorteios oficiais passados da Caixa para auditar o ROI financeiro e a performance real de acertos.
              </p>
            </div>
          </div>
        </div>

        {/* Source Selector & Scope */}
        <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto text-xs">
          {/* Escolha da Origem dos Jogos */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setSelectedSourceType('current')}
              className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                selectedSourceType === 'current'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Jogos do Simulador ({currentTickets.length})
            </button>
            <button
              onClick={() => setSelectedSourceType('saved')}
              className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                selectedSourceType === 'saved'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Jogos Salvos ({savedList.length})
            </button>
          </div>

          {/* Seletor de Concursos */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
            {([10, 20, 50, 100] as const).map((count) => (
              <button
                key={count}
                onClick={() => setHistoryScope(count)}
                className={`px-2.5 py-1.5 rounded-lg font-mono font-bold transition cursor-pointer ${
                  historyScope === count
                    ? 'bg-emerald-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {count} Conc.
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Select Saved Fechamento Dropdown if 'saved' chosen */}
      {selectedSourceType === 'saved' && savedList.length > 0 && (
        <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="text-slate-300 font-bold">Selecione o Fechamento Salvo no Banco:</span>
            <select
              value={selectedSavedId}
              onChange={(e) => setSelectedSavedId(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-amber-300 font-bold rounded-lg px-3 py-1.5 focus:outline-none focus:border-amber-400"
            >
              {savedList.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.tipoFechamento} ({f.totalJogos} jogos) • #{f.concurso}
                </option>
              ))}
            </select>
          </div>
          <span className="text-slate-400 font-mono text-[11px]">
            {activeTickets.length} apostas carregadas para simulação
          </span>
        </div>
      )}

      {/* Summary KPI Cards Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800/80">
          <span className="text-[10px] text-slate-400 block uppercase font-bold">Total Investido</span>
          <strong className="text-base font-mono font-black text-slate-200">
            {summaryStats.totalInvestido.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </strong>
          <span className="text-[10px] text-slate-400 block mt-0.5">
            {historyScope} conc. × {activeTickets.length} apostas
          </span>
        </div>

        <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800/80">
          <span className="text-[10px] text-slate-400 block uppercase font-bold">Total Arrecadado</span>
          <strong className="text-base font-mono font-black text-emerald-400">
            {summaryStats.totalPremiado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </strong>
          <span className="text-[10px] text-slate-400 block mt-0.5">
            {summaryStats.concursosPremiados} de {historyScope} conc. premiados
          </span>
        </div>

        <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800/80">
          <span className="text-[10px] text-slate-400 block uppercase font-bold">Saldo Líquido / ROI</span>
          <div className="flex items-center gap-2 mt-0.5">
            <strong
              className={`text-base font-mono font-black ${
                summaryStats.saldoFinal >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {summaryStats.saldoFinal >= 0 ? '+' : ''}
              {summaryStats.saldoFinal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </strong>
            <span
              className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-bold ${
                summaryStats.roi >= 100
                  ? 'bg-emerald-500/20 text-emerald-300'
                  : 'bg-rose-500/20 text-rose-300'
              }`}
            >
              {summaryStats.roi}%
            </span>
          </div>
          <span className="text-[10px] text-slate-400 block mt-0.5">Retorno sobre o capital</span>
        </div>

        <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800/80">
          <span className="text-[10px] text-slate-400 block uppercase font-bold">Pico de Acertos</span>
          <div className="flex items-center gap-2 mt-0.5">
            <strong className="text-base font-mono font-black text-amber-300">
              {summaryStats.maxHitsAllTime} Acertos
            </strong>
            {summaryStats.total14Ou15 > 0 && (
              <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-amber-400 text-slate-950 animate-pulse">
                {summaryStats.total14Ou15}x (14/15)
              </span>
            )}
          </div>
          <span className="text-[10px] text-slate-400 block mt-0.5">Maior premiação alcançada</span>
        </div>
      </div>

      {/* D3 Interactive Line Chart Viewport */}
      <div className="bg-slate-950/90 rounded-2xl border border-slate-800 p-4 shadow-inner space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-bold">Métrica D3:</span>
            <div className="flex items-center bg-slate-900 p-1 rounded-xl border border-slate-700">
              <button
                onClick={() => setChartMetric('saldo')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                  chartMetric === 'saldo'
                    ? 'bg-amber-500 text-slate-950 font-black'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Saldo Acumulado (R$)
              </button>
              <button
                onClick={() => setChartMetric('media_acertos')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                  chartMetric === 'media_acertos'
                    ? 'bg-amber-500 text-slate-950 font-black'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Média de Acertos
              </button>
              <button
                onClick={() => setChartMetric('premiacao')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                  chartMetric === 'premiacao'
                    ? 'bg-amber-500 text-slate-950 font-black'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Premiação por Concurso
              </button>
            </div>
          </div>

          <span className="text-slate-500 text-[11px] font-mono">
            Passe o mouse sobre os nós do gráfico para inspecionar cada sorteio
          </span>
        </div>

        {/* SVG Container for D3 */}
        <div className="w-full overflow-hidden">
          <svg ref={svgRef} className="w-full h-72 block"></svg>
        </div>

        {/* Hovered Contest Drawer Inspector */}
        {hoveredPoint && (
          <div className="bg-slate-900 border border-amber-500/40 p-3 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs animate-fadeIn">
            <div className="flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-lg bg-amber-400 text-slate-950 font-black font-mono flex items-center justify-center text-xs">
                #{hoveredPoint.concurso}
              </span>
              <div>
                <strong className="text-white block font-mono">
                  Concurso #{hoveredPoint.concurso} ({hoveredPoint.data})
                </strong>
                <span className="text-slate-400 text-[11px]">
                  Média de Acertos: <strong className="text-amber-300">{hoveredPoint.mediaAcertos} pts</strong> • Pico:{' '}
                  <strong className="text-white">{hoveredPoint.maxHits} acertos</strong>
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 font-mono text-[11px]">
              <div>
                <span className="text-slate-400 block text-[10px]">Premiação:</span>
                <span className="text-emerald-400 font-bold">
                  {hoveredPoint.totalPremiado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Custo:</span>
                <span className="text-slate-300">
                  {hoveredPoint.custoConcurso.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Saldo Acumulado:</span>
                <span
                  className={`font-black ${
                    hoveredPoint.saldoAcumulado >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {hoveredPoint.saldoAcumulado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
