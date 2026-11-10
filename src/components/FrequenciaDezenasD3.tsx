import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as d3 from 'd3';
import { LotofacilDraw } from '../types/lotofacil';
import { RECENT_DRAWS } from '../data/lotofacilData';
import {
  BarChart2,
  TrendingUp,
  Sparkles,
  Info,
  Flame,
  Snowflake,
  Activity,
  Layers,
} from 'lucide-react';

interface FrequenciaDezenasD3Props {
  draws?: LotofacilDraw[];
  className?: string;
}

interface DezenaFreqData {
  numero: number;
  label: string;
  count: number;
  percent: number;
  desvio: number; // desvio em relação à média esperada (30)
}

export const FrequenciaDezenasD3: React.FC<FrequenciaDezenasD3Props> = ({
  draws = RECENT_DRAWS,
  className = '',
}) => {
  const [viewMode, setViewMode] = useState<'barras' | 'linha'>('barras');
  const [hoveredDezena, setHoveredDezena] = useState<DezenaFreqData | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Considera exatamente os últimos 50 concursos ordenados de forma decrescente
  const last50Draws = useMemo(() => {
    const sorted = [...draws].sort((a, b) => b.concurso - a.concurso);
    return sorted.slice(0, 50);
  }, [draws]);

  const totalConcursos = last50Draws.length || 50;
  const mediaEsperada = Math.round(totalConcursos * 0.6); // 30 em 50

  // Calcula a frequência de saída das 25 dezenas (1 a 25)
  const frequencias: DezenaFreqData[] = useMemo(() => {
    const contagens = new Array(26).fill(0);

    last50Draws.forEach((sorteio) => {
      sorteio.dezenas.forEach((d) => {
        if (d >= 1 && d <= 25) {
          contagens[d]++;
        }
      });
    });

    const lista: DezenaFreqData[] = [];
    for (let d = 1; d <= 25; d++) {
      const c = contagens[d];
      const p = totalConcursos > 0 ? (c / totalConcursos) * 100 : 0;
      lista.push({
        numero: d,
        label: String(d).padStart(2, '0'),
        count: c,
        percent: Math.round(p * 10) / 10,
        desvio: c - mediaEsperada,
      });
    }
    return lista;
  }, [last50Draws, totalConcursos, mediaEsperada]);

  // Estatísticas de destaque
  const { top5Quentes, top5Frias } = useMemo(() => {
    const ordenadas = [...frequencias].sort((a, b) => b.count - a.count);
    return {
      top5Quentes: ordenadas.slice(0, 5),
      top5Frias: ordenadas.slice(-5).reverse(),
    };
  }, [frequencias]);

  // Renderização D3 do Gráfico (Barras ou Linha de Tendência)
  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove(); // Limpa renderização anterior

    const width = 840;
    const height = 360;
    const margin = { top: 35, right: 30, bottom: 50, left: 45 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Escalas X e Y
    const xScale = d3
      .scaleBand<number>()
      .domain(frequencias.map((d) => d.numero))
      .range([0, innerWidth])
      .padding(0.24);

    const maxCount = d3.max(frequencias, (d) => d.count) || 40;
    const minCount = Math.max(0, (d3.min(frequencias, (d) => d.count) || 15) - 5);
    const yScale = d3
      .scaleLinear()
      .domain([minCount, maxCount + 4])
      .range([innerHeight, 0]);

    // Definição de Gradientes SVG
    const defs = svg.append('defs');

    // Gradiente Barras Quentes (Emerald/Gold)
    const gradHot = defs
      .append('linearGradient')
      .attr('id', 'gradBarHot')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');
    gradHot.append('stop').attr('offset', '0%').attr('stop-color', '#10b981');
    gradHot.append('stop').attr('offset', '100%').attr('stop-color', '#047857');

    // Gradiente Barras Normais (Sky)
    const gradNormal = defs
      .append('linearGradient')
      .attr('id', 'gradBarNormal')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');
    gradNormal.append('stop').attr('offset', '0%').attr('stop-color', '#0ea5e9');
    gradNormal.append('stop').attr('offset', '100%').attr('stop-color', '#0369a1');

    // Gradiente Barras Frias (Slate/Rose)
    const gradCold = defs
      .append('linearGradient')
      .attr('id', 'gradBarCold')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');
    gradCold.append('stop').attr('offset', '0%').attr('stop-color', '#f43f5e');
    gradCold.append('stop').attr('offset', '100%').attr('stop-color', '#881337');

    // Gradiente de Área para a Linha de Tendência
    const gradArea = defs
      .append('linearGradient')
      .attr('id', 'gradTrendArea')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');
    gradArea.append('stop').attr('offset', '0%').attr('stop-color', '#0ea5e9').attr('stop-opacity', 0.4);
    gradArea.append('stop').attr('offset', '80%').attr('stop-color', '#10b981').attr('stop-opacity', 0.08);
    gradArea.append('stop').attr('offset', '100%').attr('stop-color', '#0f172a').attr('stop-opacity', 0.0);

    // Linhas de Grade Horizontais
    const yGrid = d3.axisLeft(yScale).ticks(5).tickSize(-innerWidth).tickFormat(() => '');
    g.append('g')
      .attr('class', 'grid')
      .call(yGrid)
      .selectAll('line')
      .attr('stroke', '#1e293b')
      .attr('stroke-dasharray', '3,3');
    g.selectAll('.domain').remove();

    // Linha de Média Teórica (30 saídas / 60%)
    const yMedia = yScale(mediaEsperada);
    g.append('line')
      .attr('x1', 0)
      .attr('x2', innerWidth)
      .attr('y1', yMedia)
      .attr('y2', yMedia)
      .attr('stroke', '#f59e0b')
      .attr('stroke-width', 1.8)
      .attr('stroke-dasharray', '5,4');

    g.append('text')
      .attr('x', innerWidth - 6)
      .attr('y', yMedia - 7)
      .attr('text-anchor', 'end')
      .attr('fill', '#f59e0b')
      .attr('font-size', '10px')
      .attr('font-weight', 'bold')
      .attr('font-family', 'monospace')
      .text(`Média Teórica: ${mediaEsperada} saídas (60%)`);

    if (viewMode === 'barras') {
      // 1. Renderização das Barras
      g.selectAll('.bar')
        .data(frequencias)
        .enter()
        .append('rect')
        .attr('class', 'bar')
        .attr('x', (d) => xScale(d.numero) || 0)
        .attr('width', xScale.bandwidth())
        .attr('y', innerHeight)
        .attr('height', 0)
        .attr('rx', 4)
        .attr('fill', (d) => {
          if (d.count >= mediaEsperada + 3) return 'url(#gradBarHot)';
          if (d.count <= mediaEsperada - 3) return 'url(#gradBarCold)';
          return 'url(#gradBarNormal)';
        })
        .attr('stroke', (d) => {
          if (d.count >= mediaEsperada + 3) return '#34d399';
          if (d.count <= mediaEsperada - 3) return '#fb7185';
          return '#38bdf8';
        })
        .attr('stroke-width', 0.8)
        .style('cursor', 'pointer')
        .on('mouseenter', (event: MouseEvent, d: DezenaFreqData) => {
          setHoveredDezena(d);
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
          setHoveredDezena(null);
          setTooltipPos(null);
        })
        .transition()
        .duration(650)
        .delay((_, i) => i * 18)
        .ease(d3.easeCubicOut)
        .attr('y', (d) => yScale(d.count))
        .attr('height', (d) => innerHeight - yScale(d.count));

      // Rótulos de Valor sobre as Barras
      g.selectAll('.bar-label')
        .data(frequencias)
        .enter()
        .append('text')
        .attr('class', 'bar-label')
        .attr('x', (d) => (xScale(d.numero) || 0) + xScale.bandwidth() / 2)
        .attr('y', (d) => yScale(d.count) - 5)
        .attr('text-anchor', 'middle')
        .attr('fill', (d) => {
          if (d.count >= mediaEsperada + 3) return '#34d399';
          if (d.count <= mediaEsperada - 3) return '#fda4af';
          return '#94a3b8';
        })
        .attr('font-size', '9.5px')
        .attr('font-weight', 'bold')
        .attr('font-family', 'monospace')
        .text((d) => d.count);
    } else {
      // 2. Renderização da Linha de Tendência Histórica & Área Preenchida
      const xPoint = (d: DezenaFreqData) => (xScale(d.numero) || 0) + xScale.bandwidth() / 2;

      // Gerador de Área
      const areaGenerator = d3
        .area<DezenaFreqData>()
        .x(xPoint)
        .y0(innerHeight)
        .y1((d) => yScale(d.count))
        .curve(d3.curveMonotoneX);

      // Gerador de Linha
      const lineGenerator = d3
        .line<DezenaFreqData>()
        .x(xPoint)
        .y((d) => yScale(d.count))
        .curve(d3.curveMonotoneX);

      // Caminho de Área
      g.append('path')
        .datum(frequencias)
        .attr('fill', 'url(#gradTrendArea)')
        .attr('d', areaGenerator);

      // Caminho de Linha
      const path = g
        .append('path')
        .datum(frequencias)
        .attr('fill', 'none')
        .attr('stroke', '#38bdf8')
        .attr('stroke-width', 2.5)
        .attr('stroke-linecap', 'round')
        .attr('d', lineGenerator);

      // Animação de traçado da linha
      const totalLength = path.node()?.getTotalLength() || 1000;
      path
        .attr('stroke-dasharray', `${totalLength} ${totalLength}`)
        .attr('stroke-dashoffset', totalLength)
        .transition()
        .duration(1000)
        .ease(d3.easeCubicOut)
        .attr('stroke-dashoffset', 0);

      // Pontos (Círculos) em cada Dezena
      g.selectAll('.trend-dot')
        .data(frequencias)
        .enter()
        .append('circle')
        .attr('class', 'trend-dot')
        .attr('cx', xPoint)
        .attr('cy', (d) => yScale(d.count))
        .attr('r', 4.5)
        .attr('fill', (d) => {
          if (d.count >= mediaEsperada + 3) return '#10b981';
          if (d.count <= mediaEsperada - 3) return '#f43f5e';
          return '#38bdf8';
        })
        .attr('stroke', '#0f172a')
        .attr('stroke-width', 2)
        .style('cursor', 'pointer')
        .on('mouseenter', (event: MouseEvent, d: DezenaFreqData) => {
          setHoveredDezena(d);
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
          setHoveredDezena(null);
          setTooltipPos(null);
        });

      // Rótulos de Frequência sobre os Pontos
      g.selectAll('.dot-label')
        .data(frequencias)
        .enter()
        .append('text')
        .attr('x', xPoint)
        .attr('y', (d) => yScale(d.count) - 8)
        .attr('text-anchor', 'middle')
        .attr('fill', (d) => {
          if (d.count >= mediaEsperada + 3) return '#34d399';
          if (d.count <= mediaEsperada - 3) return '#fda4af';
          return '#94a3b8';
        })
        .attr('font-size', '9px')
        .attr('font-weight', 'bold')
        .attr('font-family', 'monospace')
        .text((d) => d.count);
    }

    // Eixo X (Dezenas de 01 a 25)
    const xAxis = d3
      .axisBottom(xScale)
      .tickFormat((d) => String(d).padStart(2, '0'));

    const gx = g
      .append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(xAxis);

    gx.selectAll('text')
      .attr('fill', '#94a3b8')
      .attr('font-size', '10.5px')
      .attr('font-weight', 'bold')
      .attr('font-family', 'monospace')
      .attr('dy', '1em');

    gx.select('.domain').attr('stroke', '#334155');
    gx.selectAll('line').attr('stroke', '#334155');

    // Eixo Y (Frequência)
    const yAxis = d3.axisLeft(yScale).ticks(5);
    const gy = g.append('g').call(yAxis);

    gy.selectAll('text')
      .attr('fill', '#64748b')
      .attr('font-size', '10px')
      .attr('font-family', 'monospace');
    gy.select('.domain').remove();
    gy.selectAll('line').remove();
  }, [frequencias, viewMode, mediaEsperada]);

  return (
    <div
      ref={containerRef}
      className={`relative bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl text-slate-100 ${className}`}
    >
      {/* Header do Gráfico & Seletor de Modo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-400">
              <BarChart2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-100 flex items-center gap-2">
                <span>Frequência das 25 Dezenas • Últimos 50 Concursos</span>
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-sky-400 border border-slate-700">
                  D3.js Interativo
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Contagem real de saídas das 25 dezenas com detecção de desvio em relação à média esperada (30 saídas / 60%)
              </p>
            </div>
          </div>
        </div>

        {/* Alternador de Visualização (Barras vs Linha de Tendência) */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-slate-400 font-medium">Modo Gráfico:</span>
          <div className="inline-flex rounded-xl bg-slate-950 p-1 border border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => setViewMode('barras')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                viewMode === 'barras'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5" />
              <span>Barras</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('linha')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                viewMode === 'linha'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Linha de Tendência</span>
            </button>
          </div>
        </div>
      </div>

      {/* Cards de Resumo Rápido (Top Quentes e Frias nos 50) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 my-4">
        {/* Top Quentes */}
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1 mb-1">
              <Flame className="w-3.5 h-3.5 text-emerald-400" />
              Top 5 Mais Frequentes (Quentes)
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {top5Quentes.map((d) => (
                <span
                  key={d.numero}
                  className="px-2 py-0.5 rounded-lg font-mono font-black text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                  title={`Dezena ${d.label}: ${d.count} saídas (${d.percent}%)`}
                >
                  {d.label}
                  <span className="text-[9px] opacity-80 ml-0.5 font-normal">({d.count})</span>
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Top Frias / Em Atraso */}
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-rose-400 flex items-center gap-1 mb-1">
              <Snowflake className="w-3.5 h-3.5 text-rose-400" />
              Top 5 Menos Frequentes (Frias)
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {top5Frias.map((d) => (
                <span
                  key={d.numero}
                  className="px-2 py-0.5 rounded-lg font-mono font-black text-xs bg-rose-500/20 text-rose-300 border border-rose-500/40"
                  title={`Dezena ${d.label}: ${d.count} saídas (${d.percent}%)`}
                >
                  {d.label}
                  <span className="text-[9px] opacity-80 ml-0.5 font-normal">({d.count})</span>
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Detalhe da Dezena em Foco (Hover) */}
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 flex items-center justify-between">
          {hoveredDezena ? (
            <div className="w-full">
              <span className="text-[11px] font-bold text-sky-400 flex items-center gap-1 mb-1">
                <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                Dezena em Foco: <strong className="text-white text-xs">{hoveredDezena.label}</strong>
              </span>
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-300">
                  Saídas: <strong className="text-white">{hoveredDezena.count} / 50</strong>
                </span>
                <span className="text-sky-300">
                  {hoveredDezena.percent}%
                </span>
                <span
                  className={
                    hoveredDezena.desvio >= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'
                  }
                >
                  {hoveredDezena.desvio >= 0 ? `+${hoveredDezena.desvio}` : hoveredDezena.desvio} vs Média
                </span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-slate-500 text-xs">
              <Info className="w-4 h-4 shrink-0 text-slate-500" />
              <span>Passe o cursor sobre qualquer dezena no gráfico para inspecionar frequência e desvio relativo.</span>
            </div>
          )}
        </div>
      </div>

      {/* SVG Canvas Container */}
      <div className="overflow-x-auto bg-slate-950/40 rounded-xl border border-slate-800/80 p-2">
        <svg
          ref={svgRef}
          viewBox="0 0 840 360"
          className="w-full h-auto min-w-[720px] max-h-[380px]"
        />
      </div>

      {/* Tooltip Flutuante Interativo D3 */}
      {hoveredDezena && tooltipPos && (
        <div
          className="pointer-events-none absolute z-30 -translate-x-1/2 -translate-y-full mb-3 bg-slate-950/95 border border-sky-500/50 rounded-xl px-3.5 py-2 shadow-2xl backdrop-blur-md transition-all duration-75 text-xs font-mono"
          style={{
            left: `${tooltipPos.x}px`,
            top: `${tooltipPos.y - 12}px`,
          }}
        >
          <div className="flex items-center gap-2 border-b border-slate-800 pb-1 mb-1.5">
            <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
            <span className="font-bold text-white text-[13px]">Dezena {hoveredDezena.label}</span>
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${
                hoveredDezena.count >= mediaEsperada + 3
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : hoveredDezena.count <= mediaEsperada - 3
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                  : 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
              }`}
            >
              {hoveredDezena.count >= mediaEsperada + 3 ? 'Quente' : hoveredDezena.count <= mediaEsperada - 3 ? 'Fria' : 'Neutra'}
            </span>
          </div>
          <div className="space-y-0.5 text-[11px] text-slate-300">
            <div className="flex justify-between gap-4">
              <span className="text-slate-400">Frequência:</span>
              <strong className="text-white">{hoveredDezena.count} saídas / 50</strong>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-slate-400">Taxa de Saída:</span>
              <span className="text-sky-300 font-bold">{hoveredDezena.percent}%</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-slate-400">Desvio vs Média:</span>
              <span className={hoveredDezena.desvio >= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                {hoveredDezena.desvio >= 0 ? `+${hoveredDezena.desvio}` : hoveredDezena.desvio} saídas
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Legenda Inferior */}
      <div className="flex flex-wrap items-center justify-between text-xs text-slate-400 mt-4 pt-3 border-t border-slate-800/60">
        <div className="flex items-center gap-4 flex-wrap text-[11px]">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-emerald-500 border border-emerald-400/50" />
            <span>Acima da Média (&ge; 33 saídas / &ge; 66%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-sky-500 border border-sky-400/50" />
            <span>Na Média Esperada (28 a 32 saídas)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-rose-500 border border-rose-400/50" />
            <span>Abaixo da Média (&le; 27 saídas / &le; 54%)</span>
          </div>
        </div>

        <span className="text-[10px] font-mono text-slate-500">
          Base: 50 Concursos Recentes da Caixa Econômica Federal
        </span>
      </div>
    </div>
  );
};
