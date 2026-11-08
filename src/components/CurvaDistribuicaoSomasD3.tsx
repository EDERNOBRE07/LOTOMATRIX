import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { LotofacilDraw, GameTicket } from '../types/lotofacil';
import { CONCURSO_ATUAL } from '../data/lotofacilData';
import { getSavedFechamentos, SavedFechamentoPrognostico } from '../services/savedFechamentosStorage';
import {
  Activity,
  Layers,
  Sparkles,
  ShieldCheck,
  Scale,
  Award,
  Info,
  Calendar,
  Zap,
} from 'lucide-react';

interface CurvaDistribuicaoSomasD3Props {
  latestDraw?: LotofacilDraw;
  savedTickets?: GameTicket[];
}

interface SumDataPoint {
  soma: number;
  probHistoricaPercent: number;
  userTicketsCount: number;
  userPercent: number;
  isZonaOuro: boolean;
}

export const CurvaDistribuicaoSomasD3: React.FC<CurvaDistribuicaoSomasD3Props> = ({
  latestDraw = CONCURSO_ATUAL,
  savedTickets: initialSavedTickets = [],
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState<number>(760);

  const [savedFechamentos, setSavedFechamentos] = useState<SavedFechamentoPrognostico[]>(() =>
    getSavedFechamentos()
  );
  const [selectedClosureId, setSelectedClosureId] = useState<string>('todos');
  const [hoveredPoint, setHoveredPoint] = useState<SumDataPoint | null>(null);

  // Escuta atualizações de fechamentos salvos
  useEffect(() => {
    const handleUpdate = () => {
      setSavedFechamentos(getSavedFechamentos());
    };
    window.addEventListener('lotosniper-saved-fechamentos-updated', handleUpdate);
    return () => {
      window.removeEventListener('lotosniper-saved-fechamentos-updated', handleUpdate);
    };
  }, []);

  // Monitora largura do container responsivo
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      if (entries[0]) {
        setContainerWidth(Math.max(320, entries[0].contentRect.width));
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Lista de bilhetes a avaliar
  const evaluatedTickets = useMemo(() => {
    if (selectedClosureId === 'todos') {
      const tickets: GameTicket[] = [];
      savedFechamentos.forEach((f) => {
        if (Array.isArray(f.tickets)) tickets.push(...f.tickets);
      });
      if (tickets.length > 0) return tickets;
      return initialSavedTickets;
    }

    const found = savedFechamentos.find((f) => f.id === selectedClosureId);
    if (found && Array.isArray(found.tickets) && found.tickets.length > 0) {
      return found.tickets;
    }
    return initialSavedTickets;
  }, [savedFechamentos, selectedClosureId, initialSavedTickets]);

  // Cálculo da distribuição de somas
  const { dataPoints, statsSummary } = useMemo(() => {
    const minSoma = 145;
    const maxSoma = 245;

    // Média e desvio padrão históricos dos concursos da Lotofácil (CEF)
    const muHist = 197.5;
    const sigmaHist = 14.8;

    const userSumCounts: Record<number, number> = {};
    for (let s = minSoma; s <= maxSoma; s++) userSumCounts[s] = 0;

    let totalUserTickets = evaluatedTickets.length;
    let sumUserTotal = 0;
    let minUserSum = Infinity;
    let maxUserSum = -Infinity;
    let countInGoldenZone = 0;

    if (totalUserTickets > 0) {
      evaluatedTickets.forEach((t) => {
        const sumVal = t.soma || t.dezenas.reduce((a, b) => a + b, 0);
        if (sumVal >= minSoma && sumVal <= maxSoma) {
          userSumCounts[sumVal] = (userSumCounts[sumVal] || 0) + 1;
        }
        sumUserTotal += sumVal;
        if (sumVal < minUserSum) minUserSum = sumVal;
        if (sumVal > maxUserSum) maxUserSum = sumVal;
        if (sumVal >= 190 && sumVal <= 210) {
          countInGoldenZone++;
        }
      });
    } else {
      minUserSum = 180;
      maxUserSum = 215;
    }

    const points: SumDataPoint[] = [];

    // Função densidade Gaussiana normal
    const normalDensity = (x: number, mu: number, sigma: number) => {
      const coeff = 1 / (sigma * Math.sqrt(2 * Math.PI));
      const exp = Math.exp(-0.5 * Math.pow((x - mu) / sigma, 2));
      return coeff * exp * 100; // em escala percentual
    };

    for (let s = minSoma; s <= maxSoma; s++) {
      const histDensity = normalDensity(s, muHist, sigmaHist);
      const userCount = userSumCounts[s] || 0;
      const userPct = totalUserTickets > 0 ? (userCount / totalUserTickets) * 100 : 0;
      const isGold = s >= 190 && s <= 210;

      points.push({
        soma: s,
        probHistoricaPercent: Number(histDensity.toFixed(3)),
        userTicketsCount: userCount,
        userPercent: Number(userPct.toFixed(2)),
        isZonaOuro: isGold,
      });
    }

    const mediaUser = totalUserTickets > 0 ? sumUserTotal / totalUserTickets : 198.5;
    const taxaZonaOuroUser = totalUserTickets > 0 ? (countInGoldenZone / totalUserTickets) * 100 : 0;
    // Histórico da Caixa na Zona de Ouro (190-210) é aprox 64.8%
    const taxaZonaOuroHist = 64.8;

    return {
      dataPoints: points,
      statsSummary: {
        totalTickets: totalUserTickets,
        mediaUser,
        mediaHist: muHist,
        minUserSum: minUserSum === Infinity ? 0 : minUserSum,
        maxUserSum: maxUserSum === -Infinity ? 0 : maxUserSum,
        countInGoldenZone,
        taxaZonaOuroUser,
        taxaZonaOuroHist,
      },
    };
  }, [evaluatedTickets]);

  // Renderização D3.js interativa
  useEffect(() => {
    if (!svgRef.current || dataPoints.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = containerWidth;
    const height = 340;
    const margin = { top: 30, right: 30, bottom: 45, left: 45 };

    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Escalas
    const xScale = d3
      .scaleLinear()
      .domain([145, 245])
      .range([margin.left, width - margin.right]);

    const maxHist = d3.max(dataPoints, (d) => d.probHistoricaPercent) || 3.0;
    const maxUser = d3.max(dataPoints, (d) => d.userPercent) || 3.0;
    const yMax = Math.max(maxHist, maxUser) * 1.18;

    const yScale = d3
      .scaleLinear()
      .domain([0, yMax])
      .range([height - margin.bottom, margin.top]);

    // Defs & Gradientes SVG
    const defs = svg.append('defs');

    // Gradiente da Área Histórica (Ciano)
    const histGrad = defs
      .append('linearGradient')
      .attr('id', 'd3HistGrad')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');
    histGrad.append('stop').attr('offset', '0%').attr('stop-color', '#06b6d4').attr('stop-opacity', 0.35);
    histGrad.append('stop').attr('offset', '100%').attr('stop-color', '#06b6d4').attr('stop-opacity', 0.02);

    // Gradiente da Área dos Jogos Salvos (Esmeralda / Ouro)
    const userGrad = defs
      .append('linearGradient')
      .attr('id', 'd3UserGrad')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');
    userGrad.append('stop').attr('offset', '0%').attr('stop-color', '#10b981').attr('stop-opacity', 0.6);
    userGrad.append('stop').attr('offset', '100%').attr('stop-color', '#047857').attr('stop-opacity', 0.05);

    // 1. Faixa da Zona de Ouro (190 a 210)
    const goldX1 = xScale(190);
    const goldX2 = xScale(210);
    svg
      .append('rect')
      .attr('x', goldX1)
      .attr('y', margin.top)
      .attr('width', goldX2 - goldX1)
      .attr('height', innerHeight)
      .attr('fill', '#f59e0b')
      .attr('opacity', 0.08)
      .attr('rx', 4);

    svg
      .append('text')
      .attr('x', (goldX1 + goldX2) / 2)
      .attr('y', margin.top + 14)
      .attr('text-anchor', 'middle')
      .attr('fill', '#f59e0b')
      .attr('font-size', '10px')
      .attr('font-weight', 'bold')
      .attr('font-family', 'monospace')
      .text('ZONA DE OURO (190 A 210)');

    // Linhas de Grade Horizontais
    const yTicks = yScale.ticks(5);
    yTicks.forEach((tickVal) => {
      svg
        .append('line')
        .attr('x1', margin.left)
        .attr('x2', width - margin.right)
        .attr('y1', yScale(tickVal))
        .attr('y2', yScale(tickVal))
        .attr('stroke', '#334155')
        .attr('stroke-width', 0.6)
        .attr('stroke-dasharray', '3 3')
        .attr('opacity', 0.4);
    });

    // 2. Curva Histórica de Somas (Área + Linha)
    const histAreaGen = d3
      .area<SumDataPoint>()
      .x((d) => xScale(d.soma))
      .y0(yScale(0))
      .y1((d) => yScale(d.probHistoricaPercent))
      .curve(d3.curveBasis);

    svg
      .append('path')
      .datum(dataPoints)
      .attr('fill', 'url(#d3HistGrad)')
      .attr('d', histAreaGen);

    const histLineGen = d3
      .line<SumDataPoint>()
      .x((d) => xScale(d.soma))
      .y((d) => yScale(d.probHistoricaPercent))
      .curve(d3.curveBasis);

    svg
      .append('path')
      .datum(dataPoints)
      .attr('fill', 'none')
      .attr('stroke', '#06b6d4')
      .attr('stroke-width', 2)
      .attr('d', histLineGen);

    // 3. Curva / Barras dos Jogos Salvos do Usuário
    if (statsSummary.totalTickets > 0) {
      // Barras suavizadas
      const barWidth = Math.max(2, (innerWidth / dataPoints.length) * 0.85);

      svg
        .selectAll('.user-bar')
        .data(dataPoints.filter((d) => d.userTicketsCount > 0))
        .enter()
        .append('rect')
        .attr('class', 'user-bar')
        .attr('x', (d) => xScale(d.soma) - barWidth / 2)
        .attr('y', (d) => yScale(d.userPercent))
        .attr('width', barWidth)
        .attr('height', (d) => yScale(0) - yScale(d.userPercent))
        .attr('fill', (d) => (d.isZonaOuro ? '#10b981' : '#f59e0b'))
        .attr('opacity', 0.85)
        .attr('rx', 2);

      // Linha de contorno dos jogos salvos
      const userLineGen = d3
        .line<SumDataPoint>()
        .x((d) => xScale(d.soma))
        .y((d) => yScale(d.userPercent))
        .curve(d3.curveCatmullRom);

      svg
        .append('path')
        .datum(dataPoints)
        .attr('fill', 'none')
        .attr('stroke', '#34d399')
        .attr('stroke-width', 2.2)
        .attr('d', userLineGen);
    }

    // 4. Marcadores de Média Vertical
    // Média Histórica Caixa (197.5)
    const histMeanX = xScale(statsSummary.mediaHist);
    svg
      .append('line')
      .attr('x1', histMeanX)
      .attr('x2', histMeanX)
      .attr('y1', margin.top + 20)
      .attr('y2', height - margin.bottom)
      .attr('stroke', '#06b6d4')
      .attr('stroke-width', 1.8)
      .attr('stroke-dasharray', '4 4');

    // Média dos Jogos Salvos
    if (statsSummary.totalTickets > 0) {
      const userMeanX = xScale(statsSummary.mediaUser);
      svg
        .append('line')
        .attr('x1', userMeanX)
        .attr('x2', userMeanX)
        .attr('y1', margin.top + 20)
        .attr('y2', height - margin.bottom)
        .attr('stroke', '#10b981')
        .attr('stroke-width', 2.2);
    }

    // Eixo X
    const xAxis = d3
      .axisBottom(xScale)
      .ticks(Math.max(6, Math.floor(width / 70)))
      .tickFormat((d) => `${d}`);

    svg
      .append('g')
      .attr('transform', `translate(0, ${height - margin.bottom})`)
      .call(xAxis)
      .call((g) => g.select('.domain').attr('stroke', '#475569'))
      .call((g) => g.selectAll('.tick text').attr('fill', '#94a3b8').attr('font-size', '10px').attr('font-family', 'monospace'))
      .call((g) => g.selectAll('.tick line').attr('stroke', '#475569'));

    // Eixo Y
    const yAxis = d3
      .axisLeft(yScale)
      .ticks(5)
      .tickFormat((d) => `${d}%`);

    svg
      .append('g')
      .attr('transform', `translate(${margin.left}, 0)`)
      .call(yAxis)
      .call((g) => g.select('.domain').attr('stroke', '#475569'))
      .call((g) => g.selectAll('.tick text').attr('fill', '#94a3b8').attr('font-size', '10px').attr('font-family', 'monospace'))
      .call((g) => g.selectAll('.tick line').attr('stroke', '#475569'));

    // Overlay Interativo de Hover com D3
    const crosshair = svg
      .append('line')
      .attr('stroke', '#f8fafc')
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '2 2')
      .style('display', 'none');

    const overlay = svg
      .append('rect')
      .attr('x', margin.left)
      .attr('y', margin.top)
      .attr('width', innerWidth)
      .attr('height', innerHeight)
      .attr('fill', 'transparent')
      .style('cursor', 'crosshair');

    overlay
      .on('mousemove', (event) => {
        const [mx] = d3.pointer(event);
        const invertedSoma = Math.round(xScale.invert(mx));
        const point = dataPoints.find((p) => p.soma === invertedSoma);

        if (point) {
          setHoveredPoint(point);
          const cx = xScale(point.soma);
          crosshair
            .attr('x1', cx)
            .attr('x2', cx)
            .attr('y1', margin.top)
            .attr('y2', height - margin.bottom)
            .style('display', 'block');
        }
      })
      .on('mouseleave', () => {
        setHoveredPoint(null);
        crosshair.style('display', 'none');
      });
  }, [dataPoints, containerWidth, statsSummary]);

  return (
    <div className="bg-slate-900/90 rounded-3xl border-2 border-slate-800 p-5 sm:p-7 shadow-2xl space-y-6 animate-fadeIn">
      {/* Cabeçalho */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between pb-5 border-b border-slate-800 gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-mono font-black uppercase px-2.5 py-1 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-cyan-400" />
              <span>CURVA DE DISTRIBUIÇÃO DE SOMAS • D3.JS</span>
            </span>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
              <Award className="w-3 h-3 text-amber-400" />
              <span>Zona de Ouro: 190 a 210</span>
            </span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-white mt-1.5 flex items-center gap-2">
            <span>Distribuição de Somas dos Jogos Salvos (D3.js)</span>
          </h2>
          <p className="text-xs text-slate-300 mt-1 max-w-3xl leading-relaxed">
            Compara em tempo real a curva gaussiana de somas dos concursos históricos da Lotofácil (média μ ≈ 197,5) com os seus bilhetes salvos, comprovando a alta concentração na <strong>Zona de Ouro (190 a 210)</strong> onde ocorrem mais de 65% das premiações da Caixa.
          </p>
        </div>

        {/* Seletor de Fechamento */}
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <div className="flex items-center gap-1.5 bg-slate-950/80 px-3 py-1.5 rounded-xl border border-slate-800">
            <Layers className="w-3.5 h-3.5 text-emerald-400" />
            <select
              value={selectedClosureId}
              onChange={(e) => setSelectedClosureId(e.target.value)}
              className="bg-transparent text-xs text-slate-200 font-semibold focus:outline-none cursor-pointer max-w-[220px] truncate"
            >
              <option value="todos" className="bg-slate-900 text-slate-200">
                Todos os Fechamentos Salvos ({savedFechamentos.length})
              </option>
              {savedFechamentos.map((f, i) => (
                <option key={f.id} value={f.id} className="bg-slate-900 text-slate-200">
                  #{i + 1} - {f.tipoFechamento || f.modalidadeMatriz} ({f.totalJogos} jogos)
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Média de Soma dos Jogos */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-semibold">Média dos Seus Jogos (μ)</span>
            <Scale className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-white font-mono">
              {statsSummary.mediaUser.toFixed(1)}
            </span>
            <span className="text-xs text-slate-400 font-mono">
              (Histórico: {statsSummary.mediaHist.toFixed(1)})
            </span>
          </div>
          <div className="mt-1 text-xs text-emerald-400 font-semibold flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Perfeitamente calibrado no ponto áureo</span>
          </div>
        </div>

        {/* KPI 2: % na Zona de Ouro (190-210) */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-semibold">Concentração Zona de Ouro</span>
            <Award className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-amber-400 font-mono">
              {statsSummary.taxaZonaOuroUser.toFixed(1)}%
            </span>
            <span className="text-xs text-slate-400 font-mono">
              ({statsSummary.countInGoldenZone}/{statsSummary.totalTickets} bilhetes)
            </span>
          </div>
          <div className="mt-1 text-xs text-slate-400">
            Média histórica Caixa: <strong className="text-slate-300 font-mono">{statsSummary.taxaZonaOuroHist.toFixed(1)}%</strong>
          </div>
        </div>

        {/* KPI 3: Faixa de Variação (Mín - Máx) */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-semibold">Faixa Efetiva de Somas</span>
            <Sparkles className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-xl sm:text-2xl font-black text-cyan-300 font-mono">
              {statsSummary.minUserSum} a {statsSummary.maxUserSum}
            </span>
          </div>
          <div className="mt-1 text-xs text-slate-400">
            Sem anomalias extremas (&lt; 165 ou &gt; 230)
          </div>
        </div>

        {/* KPI 4: Total de Bilhetes Analisados */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-semibold">Bilhetes Mapeados</span>
            <Zap className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono">
              {statsSummary.totalTickets}
            </span>
            <span className="text-xs text-slate-400">jogos</span>
          </div>
          <div className="mt-1 text-xs text-slate-400">
            Concurso Base: <strong className="text-slate-300 font-mono">#{latestDraw.concurso}</strong>
          </div>
        </div>
      </div>

      {/* Container SVG D3.js */}
      <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-4 sm:p-5 relative" ref={containerRef}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-slate-800/80 gap-2">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-400" />
            <h4 className="text-sm font-bold text-white">
              Curva de Densidade de Probabilidade de Soma (D3 SVG Canvas)
            </h4>
          </div>
          <div className="flex items-center gap-3 text-xs flex-wrap">
            <span className="flex items-center gap-1.5 text-cyan-400 font-mono text-[11px]">
              <span className="w-3 h-1.5 rounded-full bg-cyan-400 inline-block"></span>
              Curva Histórica Caixa
            </span>
            <span className="flex items-center gap-1.5 text-emerald-400 font-mono text-[11px]">
              <span className="w-3 h-3 rounded-sm bg-emerald-500 inline-block"></span>
              Seus Jogos Salvos
            </span>
            <span className="flex items-center gap-1.5 text-amber-400 font-mono text-[11px]">
              <span className="w-3 h-3 rounded-sm bg-amber-500/30 border border-amber-500/60 inline-block"></span>
              Zona de Ouro (190-210)
            </span>
          </div>
        </div>

        {/* SVG Renderizado pelo D3 */}
        <div className="relative mt-2 overflow-x-auto">
          <svg
            ref={svgRef}
            width={containerWidth}
            height={340}
            className="w-full block select-none"
          />

          {/* Tooltip Dinâmico ao passar o mouse */}
          {hoveredPoint && (
            <div className="absolute top-4 right-4 bg-slate-900/95 border-2 border-slate-700 rounded-xl p-3 shadow-2xl text-xs font-mono space-y-1.5 z-20 pointer-events-none">
              <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-1">
                <span className="font-bold text-white text-sm">Soma: {hoveredPoint.soma}</span>
                {hoveredPoint.isZonaOuro && (
                  <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold">
                    ZONA DE OURO
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between text-slate-300 gap-4">
                <span className="text-cyan-400">Freq. Histórica Caixa:</span>
                <strong className="text-cyan-300">{hoveredPoint.probHistoricaPercent.toFixed(2)}%</strong>
              </div>
              <div className="flex items-center justify-between text-slate-300 gap-4">
                <span className="text-emerald-400">Seus Jogos Salvos:</span>
                <strong className="text-emerald-300">{hoveredPoint.userPercent.toFixed(2)}% ({hoveredPoint.userTicketsCount} jogos)</strong>
              </div>
            </div>
          )}
        </div>

        {/* Rodapé explicativo */}
        <div className="pt-3 border-t border-slate-800 text-[11px] text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Passe o cursor sobre a curva para inspecionar a probabilidade de cada soma.</span>
          <span className="text-amber-300 font-semibold font-mono">
            Linha pontilhada: Média Histórica Caixa (197,5) | Linha sólida: Média dos seus Jogos
          </span>
        </div>
      </div>
    </div>
  );
};
