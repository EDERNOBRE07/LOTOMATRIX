import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import {
  Flame,
  Snowflake,
  Sparkles,
  Grid3X3,
  LayoutGrid,
  CheckCircle2,
  RotateCcw,
  ArrowRight,
  Clock,
  Activity,
} from 'lucide-react';
import { LotofacilDraw, DezenaStats } from '../types/lotofacil';
import { CONCURSO_ATUAL, DEZENAS_STATS, MOLDURA, PRIMOS, FIBONACCI } from '../data/lotofacilData';
import { getHistorical100Draws } from '../services/historical100Draws';

interface MatrizCalor50ConcursosD3Props {
  latestDraw?: LotofacilDraw;
  statsList?: DezenaStats[];
  onApplyNumbers?: (numbers: number[]) => void;
}

type ThermalClass = 'quente' | 'equilibrada' | 'fria';
type HeatmapMode = 'matriz_25x50' | 'volante_5x5';
type FilterThermal = 'todas' | 'quente' | 'fria';

interface Dezena50Summary {
  numero: number;
  label: string;
  freq50: number;
  pct50: number;
  atrasoAtual: number;
  ratio: number; // 0 (fria) -> 1 (quente)
  thermal: ThermalClass;
  statusLabel: string;
  isMoldura: boolean;
  isPrimo: boolean;
  isFibonacci: boolean;
  row: number;
  col: number;
}

interface CellDatum {
  numero: number;
  concurso: number;
  data: string;
  saiu: boolean;
  freq50: number;
  pct50: number;
  atrasoAtual: number;
  ratio: number;
  thermal: ThermalClass;
}

export const MatrizCalor50ConcursosD3: React.FC<MatrizCalor50ConcursosD3Props> = ({
  latestDraw = CONCURSO_ATUAL,
  statsList = DEZENAS_STATS,
  onApplyNumbers,
}) => {
  const [viewMode, setViewMode] = useState<HeatmapMode>('matriz_25x50');
  const [thermalFilter, setThermalFilter] = useState<FilterThermal>('todas');
  const [selectedNumbers, setSelectedNumbers] = useState<number[]>([]);
  const [appliedNotice, setAppliedNotice] = useState<string | null>(null);
  const [hoveredCell, setHoveredCell] = useState<{
    numero: number;
    concurso?: number;
    data?: string;
    saiu?: boolean;
    freq50: number;
    pct50: number;
    atrasoAtual: number;
    thermal: ThermalClass;
    x: number;
    y: number;
  } | null>(null);

  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Últimos 50 concursos em ordem cronológica (mais antigo -> mais recente)
  const draws50Chronological = useMemo(() => {
    const all100 = getHistorical100Draws(latestDraw);
    const last50Desc = [...all100]
      .sort((a, b) => b.concurso - a.concurso)
      .slice(0, 50);
    return last50Desc.reverse();
  }, [latestDraw]);

  const totalConcursos = draws50Chronological.length || 50;

  // Resumo térmico e frequência exata nos últimos 50 concursos para as 25 dezenas
  const summaries = useMemo<Dezena50Summary[]>(() => {
    const counts = new Array(26).fill(0);
    const lastSeenIdx = new Array(26).fill(-1);

    draws50Chronological.forEach((draw, idx) => {
      draw.dezenas.forEach((n) => {
        if (n >= 1 && n <= 25) {
          counts[n]++;
          lastSeenIdx[n] = idx;
        }
      });
    });

    const rawCounts = Array.from({ length: 25 }, (_, i) => counts[i + 1]);
    const minFreq = Math.min(...rawCounts);
    const maxFreq = Math.max(...rawCounts);
    const span = Math.max(1, maxFreq - minFreq);

    const list: Dezena50Summary[] = [];
    for (let num = 1; num <= 25; num++) {
      const freq50 = counts[num];
      const pct50 = Number(((freq50 / totalConcursos) * 100).toFixed(1));
      const statMatch = statsList.find((s) => s.numero === num);
      const atrasoComputed =
        lastSeenIdx[num] >= 0 ? totalConcursos - 1 - lastSeenIdx[num] : totalConcursos;
      const atrasoAtual = statMatch?.atrasoAtual ?? atrasoComputed;

      const ratio = (freq50 - minFreq) / span;
      let thermal: ThermalClass = 'equilibrada';
      let statusLabel = 'Equilibrada';

      if (ratio >= 0.65 || freq50 >= Math.ceil(totalConcursos * 0.64)) {
        thermal = 'quente';
        statusLabel = 'Quente';
      } else if (ratio <= 0.35 || freq50 <= Math.floor(totalConcursos * 0.54) || atrasoAtual >= 3) {
        thermal = 'fria';
        statusLabel = atrasoAtual >= 3 ? `Fria (${atrasoAtual}c atraso)` : 'Fria';
      }

      list.push({
        numero: num,
        label: String(num).padStart(2, '0'),
        freq50,
        pct50,
        atrasoAtual,
        ratio,
        thermal,
        statusLabel,
        isMoldura: MOLDURA.includes(num),
        isPrimo: PRIMOS.includes(num),
        isFibonacci: FIBONACCI.includes(num),
        row: Math.floor((num - 1) / 5),
        col: (num - 1) % 5,
      });
    }

    return list;
  }, [draws50Chronological, totalConcursos, statsList]);

  const filteredSummaries = useMemo(() => {
    if (thermalFilter === 'todas') return summaries;
    return summaries.filter((s) => s.thermal === thermalFilter);
  }, [summaries, thermalFilter]);

  const { topQuentes, topFrias, mediaFreq } = useMemo(() => {
    const byFreqDesc = [...summaries].sort((a, b) => b.freq50 - a.freq50 || a.atrasoAtual - b.atrasoAtual);
    const byColdDesc = [...summaries].sort(
      (a, b) => a.freq50 - b.freq50 || b.atrasoAtual - a.atrasoAtual
    );
    const avg = summaries.reduce((acc, s) => acc + s.freq50, 0) / 25;
    return {
      topQuentes: byFreqDesc.slice(0, 6),
      topFrias: byColdDesc.slice(0, 6),
      mediaFreq: Number(avg.toFixed(1)),
    };
  }, [summaries]);

  const toggleDezena = (num: number) => {
    setSelectedNumbers((prev) =>
      prev.includes(num) ? prev.filter((n) => n !== num) : [...prev, num].sort((a, b) => a - b)
    );
  };

  // Escala térmica D3 (Azul Frio -> Esmeralda -> Âmbar -> Vermelho Quente)
  const thermalColorScale = useMemo(() => {
    return d3
      .scaleLinear<string>()
      .domain([0, 0.3, 0.55, 0.8, 1])
      .range(['#2563eb', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444'])
      .interpolate(d3.interpolateRgb);
  }, []);

  // Renderização D3.js do Heatmap
  useEffect(() => {
    if (!svgRef.current || summaries.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const updateTooltipPos = (event: MouseEvent) => {
      if (!containerRef.current) return { x: 16, y: 16 };
      const rect = containerRef.current.getBoundingClientRect();
      const rawX = event.clientX - rect.left;
      const rawY = event.clientY - rect.top;
      return {
        x: Math.min(Math.max(12, rawX + 14), Math.max(12, rect.width - 230)),
        y: Math.min(Math.max(12, rawY - 12), Math.max(12, rect.height - 130)),
      };
    };

    if (viewMode === 'matriz_25x50') {
      const visibleRows = filteredSummaries;
      const rowHeight = 22;
      const margin = { top: 34, right: 118, bottom: 44, left: 52 };
      const width = 960;
      const innerHeight = Math.max(180, visibleRows.length * rowHeight);
      const height = innerHeight + margin.top + margin.bottom;
      const innerWidth = width - margin.left - margin.right;

      svg.attr('viewBox', `0 0 ${width} ${height}`);

      const g = svg
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

      const xScale = d3
        .scaleBand<number>()
        .domain(draws50Chronological.map((d) => d.concurso))
        .range([0, innerWidth])
        .paddingInner(0.14)
        .paddingOuter(0.05);

      const yScale = d3
        .scaleBand<number>()
        .domain(visibleRows.map((d) => d.numero))
        .range([0, innerHeight])
        .paddingInner(0.16);

      // Cabeçalho de coluna
      g.append('text')
        .attr('x', 0)
        .attr('y', -14)
        .attr('fill', '#94a3b8')
        .attr('font-size', '10px')
        .attr('font-family', 'ui-monospace, SFMono-Regular, Menlo, monospace')
        .attr('font-weight', '600')
        .text(
          `Concurso #${draws50Chronological[0]?.concurso ?? ''} → #${
            draws50Chronological[draws50Chronological.length - 1]?.concurso ?? ''
          } (${totalConcursos} sorteios)`
        );

      g.append('text')
        .attr('x', innerWidth + 12)
        .attr('y', -14)
        .attr('fill', '#94a3b8')
        .attr('font-size', '10px')
        .attr('font-family', 'ui-monospace, SFMono-Regular, Menlo, monospace')
        .attr('font-weight', '700')
        .text('FREQ / STATUS');

      // Labels das 25 dezenas no eixo Y (clicáveis para selecionar)
      const yLabels = g
        .selectAll('.y-dezena-group')
        .data(visibleRows)
        .enter()
        .append('g')
        .attr('class', 'y-dezena-group')
        .style('cursor', 'pointer')
        .on('click', (_, d) => toggleDezena(d.numero));

      yLabels
        .append('rect')
        .attr('x', -44)
        .attr('y', (d) => yScale(d.numero) ?? 0)
        .attr('width', 36)
        .attr('height', yScale.bandwidth())
        .attr('rx', 5)
        .attr('fill', (d) =>
          selectedNumbers.includes(d.numero) ? '#10b981' : '#0f172a'
        )
        .attr('stroke', (d) =>
          selectedNumbers.includes(d.numero)
            ? '#34d399'
            : d.thermal === 'quente'
            ? '#ef4444'
            : d.thermal === 'fria'
            ? '#38bdf8'
            : '#334155'
        )
        .attr('stroke-width', 1.2);

      yLabels
        .append('text')
        .attr('x', -26)
        .attr('y', (d) => (yScale(d.numero) ?? 0) + yScale.bandwidth() / 2 + 3.5)
        .attr('text-anchor', 'middle')
        .attr('fill', (d) => (selectedNumbers.includes(d.numero) ? '#020617' : '#f8fafc'))
        .attr('font-size', '10.5px')
        .attr('font-weight', '700')
        .attr('font-family', 'ui-monospace, SFMono-Regular, Menlo, monospace')
        .text((d) => d.label);

      // Dados de células (25 x 50 = 1250 células)
      const cells: CellDatum[] = [];
      visibleRows.forEach((s) => {
        draws50Chronological.forEach((draw) => {
          cells.push({
            numero: s.numero,
            concurso: draw.concurso,
            data: draw.data,
            saiu: draw.dezenas.includes(s.numero),
            freq50: s.freq50,
            pct50: s.pct50,
            atrasoAtual: s.atrasoAtual,
            ratio: s.ratio,
            thermal: s.thermal,
          });
        });
      });

      g.selectAll('.heatmap-cell')
        .data(cells)
        .enter()
        .append('rect')
        .attr('class', 'heatmap-cell')
        .attr('x', (d) => xScale(d.concurso) ?? 0)
        .attr('y', (d) => yScale(d.numero) ?? 0)
        .attr('width', xScale.bandwidth())
        .attr('height', yScale.bandwidth())
        .attr('rx', 2.5)
        .attr('fill', (d) => {
          if (!d.saiu) return '#0f172a';
          return thermalColorScale(d.ratio);
        })
        .attr('fill-opacity', (d) => (d.saiu ? 0.92 : 0.75))
        .attr('stroke', (d) => {
          if (selectedNumbers.includes(d.numero) && d.saiu) return '#f8fafc';
          return d.saiu ? 'rgba(255,255,255,0.12)' : '#1e293b';
        })
        .attr('stroke-width', (d) => (selectedNumbers.includes(d.numero) && d.saiu ? 1 : 0.6))
        .style('cursor', 'pointer')
        .on('mouseenter', function (event, d) {
          d3.select(this).attr('stroke', '#ffffff').attr('stroke-width', 1.6);
          const pos = updateTooltipPos(event as unknown as MouseEvent);
          setHoveredCell({
            numero: d.numero,
            concurso: d.concurso,
            data: d.data,
            saiu: d.saiu,
            freq50: d.freq50,
            pct50: d.pct50,
            atrasoAtual: d.atrasoAtual,
            thermal: d.thermal,
            ...pos,
          });
        })
        .on('mousemove', (event, d) => {
          const pos = updateTooltipPos(event as unknown as MouseEvent);
          setHoveredCell({
            numero: d.numero,
            concurso: d.concurso,
            data: d.data,
            saiu: d.saiu,
            freq50: d.freq50,
            pct50: d.pct50,
            atrasoAtual: d.atrasoAtual,
            thermal: d.thermal,
            ...pos,
          });
        })
        .on('mouseleave', function (_, d) {
          d3.select(this)
            .attr(
              'stroke',
              selectedNumbers.includes(d.numero) && d.saiu
                ? '#f8fafc'
                : d.saiu
                ? 'rgba(255,255,255,0.12)'
                : '#1e293b'
            )
            .attr('stroke-width', selectedNumbers.includes(d.numero) && d.saiu ? 1 : 0.6);
          setHoveredCell(null);
        })
        .on('click', (_, d) => toggleDezena(d.numero));

      // Coluna resumo à direita (barra proporcional + freq/50 + badge)
      const rightSummary = g
        .selectAll('.row-summary')
        .data(visibleRows)
        .enter()
        .append('g')
        .attr('class', 'row-summary')
        .style('cursor', 'pointer')
        .on('click', (_, d) => toggleDezena(d.numero));

      rightSummary
        .append('rect')
        .attr('x', innerWidth + 12)
        .attr('y', (d) => (yScale(d.numero) ?? 0) + 2)
        .attr('width', 44)
        .attr('height', Math.max(8, yScale.bandwidth() - 4))
        .attr('rx', 3)
        .attr('fill', '#0f172a')
        .attr('stroke', '#1e293b');

      rightSummary
        .append('rect')
        .attr('x', innerWidth + 12)
        .attr('y', (d) => (yScale(d.numero) ?? 0) + 2)
        .attr('width', (d) => Math.max(4, (d.freq50 / totalConcursos) * 44))
        .attr('height', Math.max(8, yScale.bandwidth() - 4))
        .attr('rx', 3)
        .attr('fill', (d) => thermalColorScale(d.ratio));

      rightSummary
        .append('text')
        .attr('x', innerWidth + 62)
        .attr('y', (d) => (yScale(d.numero) ?? 0) + yScale.bandwidth() / 2 + 3.5)
        .attr('fill', (d) =>
          d.thermal === 'quente'
            ? '#fca5a5'
            : d.thermal === 'fria'
            ? '#7dd3fc'
            : '#a7f3d0'
        )
        .attr('font-size', '10px')
        .attr('font-weight', '700')
        .attr('font-family', 'ui-monospace, SFMono-Regular, Menlo, monospace')
        .text((d) => `${d.freq50}/${totalConcursos}`);

      // Eixo X com marcadores a cada 5 concursos + último
      const tickConcursos = draws50Chronological
        .filter((_, idx) => idx === 0 || idx === draws50Chronological.length - 1 || (idx + 1) % 10 === 0)
        .map((d) => d.concurso);

      const xAxisG = g
        .selectAll('.x-tick-label')
        .data(tickConcursos)
        .enter()
        .append('text')
        .attr('class', 'x-tick-label')
        .attr('x', (c) => (xScale(c) ?? 0) + xScale.bandwidth() / 2)
        .attr('y', innerHeight + 18)
        .attr('text-anchor', 'middle')
        .attr('fill', (c) =>
          c === latestDraw.concurso ? '#34d399' : '#94a3b8'
        )
        .attr('font-size', '9.5px')
        .attr('font-weight', (c) => (c === latestDraw.concurso ? '700' : '500'))
        .attr('font-family', 'ui-monospace, SFMono-Regular, Menlo, monospace')
        .text((c) => `#${c}`);

      void xAxisG;
    } else {
      // MODO VOLANTE 5x5 D3.js
      const width = 680;
      const height = 430;
      const margin = { top: 20, right: 20, bottom: 20, left: 20 };
      const innerWidth = width - margin.left - margin.right;
      const innerHeight = height - margin.top - margin.bottom;

      svg.attr('viewBox', `0 0 ${width} ${height}`);

      const g = svg
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

      const colScale = d3
        .scaleBand<number>()
        .domain([0, 1, 2, 3, 4])
        .range([0, innerWidth])
        .padding(0.1);

      const rowScale = d3
        .scaleBand<number>()
        .domain([0, 1, 2, 3, 4])
        .range([0, innerHeight])
        .padding(0.1);

      const cellGroups = g
        .selectAll('.volante-cell-d3')
        .data(summaries)
        .enter()
        .append('g')
        .attr('class', 'volante-cell-d3')
        .attr(
          'transform',
          (d) => `translate(${colScale(d.col) ?? 0},${rowScale(d.row) ?? 0})`
        )
        .style('cursor', 'pointer')
        .on('click', (_, d) => toggleDezena(d.numero))
        .on('mouseenter', function (event, d) {
          d3.select(this).select('rect.main-tile').attr('stroke', '#ffffff').attr('stroke-width', 2.4);
          const pos = updateTooltipPos(event as unknown as MouseEvent);
          setHoveredCell({
            numero: d.numero,
            freq50: d.freq50,
            pct50: d.pct50,
            atrasoAtual: d.atrasoAtual,
            thermal: d.thermal,
            ...pos,
          });
        })
        .on('mousemove', (event, d) => {
          const pos = updateTooltipPos(event as unknown as MouseEvent);
          setHoveredCell({
            numero: d.numero,
            freq50: d.freq50,
            pct50: d.pct50,
            atrasoAtual: d.atrasoAtual,
            thermal: d.thermal,
            ...pos,
          });
        })
        .on('mouseleave', function (_, d) {
          const isSel = selectedNumbers.includes(d.numero);
          d3.select(this)
            .select('rect.main-tile')
            .attr('stroke', isSel ? '#10b981' : 'rgba(255,255,255,0.16)')
            .attr('stroke-width', isSel ? 2.5 : 1.2);
          setHoveredCell(null);
        });

      const cellW = colScale.bandwidth();
      const cellH = rowScale.bandwidth();

      cellGroups
        .append('rect')
        .attr('class', 'main-tile')
        .attr('width', cellW)
        .attr('height', cellH)
        .attr('rx', 12)
        .attr('fill', (d) => thermalColorScale(d.ratio))
        .attr('fill-opacity', (d) => {
          if (thermalFilter !== 'todas' && d.thermal !== thermalFilter) return 0.22;
          return 0.88;
        })
        .attr('stroke', (d) =>
          selectedNumbers.includes(d.numero) ? '#10b981' : 'rgba(255,255,255,0.16)'
        )
        .attr('stroke-width', (d) => (selectedNumbers.includes(d.numero) ? 2.5 : 1.2));

      // Overlay escuro para leitura nítida
      cellGroups
        .append('rect')
        .attr('width', cellW)
        .attr('height', cellH)
        .attr('rx', 12)
        .attr('fill', 'rgba(2, 6, 23, 0.34)')
        .style('pointer-events', 'none');

      // Número da dezena
      cellGroups
        .append('text')
        .attr('x', cellW / 2)
        .attr('y', cellH * 0.42)
        .attr('text-anchor', 'middle')
        .attr('fill', '#ffffff')
        .attr('font-size', '22px')
        .attr('font-weight', '800')
        .attr('font-family', 'ui-monospace, SFMono-Regular, Menlo, monospace')
        .text((d) => d.label);

      // Frequência nos últimos 50 concursos
      cellGroups
        .append('text')
        .attr('x', cellW / 2)
        .attr('y', cellH * 0.67)
        .attr('text-anchor', 'middle')
        .attr('fill', '#f8fafc')
        .attr('font-size', '11px')
        .attr('font-weight', '700')
        .attr('font-family', 'ui-monospace, SFMono-Regular, Menlo, monospace')
        .text((d) => `${d.freq50}/50 (${d.pct50}%)`);

      // Atraso / Classificação
      cellGroups
        .append('text')
        .attr('x', cellW / 2)
        .attr('y', cellH * 0.86)
        .attr('text-anchor', 'middle')
        .attr('fill', (d) =>
          d.atrasoAtual >= 3 ? '#bae6fd' : d.thermal === 'quente' ? '#fecaca' : '#cbd5e1'
        )
        .attr('font-size', '9.5px')
        .attr('font-weight', '600')
        .attr('font-family', 'ui-monospace, SFMono-Regular, Menlo, monospace')
        .text((d) =>
          d.atrasoAtual === 0
            ? 'Saiu último'
            : `Atraso: ${d.atrasoAtual}c`
        );
    }
  }, [
    viewMode,
    summaries,
    filteredSummaries,
    draws50Chronological,
    selectedNumbers,
    thermalFilter,
    thermalColorScale,
    totalConcursos,
    latestDraw.concurso,
  ]);

  const handleSelectTop15Quentes = () => {
    const top15 = [...summaries]
      .sort((a, b) => b.freq50 - a.freq50 || a.atrasoAtual - b.atrasoAtual)
      .slice(0, 15)
      .map((s) => s.numero)
      .sort((a, b) => a - b);
    setSelectedNumbers(top15);
  };

  const handleSelectBalanced15 = () => {
    const q = [...summaries]
      .sort((a, b) => b.freq50 - a.freq50)
      .slice(0, 9)
      .map((s) => s.numero);
    const f = [...summaries]
      .filter((s) => !q.includes(s.numero))
      .sort((a, b) => b.atrasoAtual - a.atrasoAtual || a.freq50 - b.freq50)
      .slice(0, 6)
      .map((s) => s.numero);
    setSelectedNumbers([...q, ...f].sort((a, b) => a - b));
  };

  const handleApplyToFechamento = () => {
    if (!onApplyNumbers) return;
    const numsToApply =
      selectedNumbers.length >= 15
        ? selectedNumbers
        : [...summaries]
            .sort((a, b) => b.freq50 - a.freq50)
            .slice(0, 15)
            .map((s) => s.numero)
            .sort((a, b) => a - b);
    onApplyNumbers(numsToApply);
    setAppliedNotice(
      `${numsToApply.length} dezenas térmicas aplicadas ao Estúdio de Fechamentos.`
    );
    setTimeout(() => setAppliedNotice(null), 4000);
  };

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-5">
      {/* Cabeçalho Executivo */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="p-2 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400">
              <Flame className="w-5 h-5" />
            </span>
            <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight">
              Matriz de Calor D3.js — Últimos 50 Concursos
            </h3>
            <span className="text-[11px] font-mono tabular-nums px-2 py-0.5 rounded bg-slate-950 border border-slate-700 text-slate-300">
              Concursos #{draws50Chronological[0]?.concurso ?? '—'} a #{latestDraw.concurso}
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Frequência real de saída e atraso de cada uma das 25 dezenas nos últimos 50 sorteios.
            Identifique rapidamente dezenas <strong className="text-rose-400">quentes</strong> (alta
            recorrência) e <strong className="text-sky-400">frias / atrasadas</strong>.
          </p>
        </div>

        {/* Alternador de Visão D3 & Filtro Térmico */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex bg-slate-950 border border-slate-800 rounded-xl p-1">
            <button
              type="button"
              onClick={() => setViewMode('matriz_25x50')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0 transition cursor-pointer ${
                viewMode === 'matriz_25x50'
                  ? 'bg-emerald-500 text-slate-950 font-bold'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Grid3X3 className="w-3.5 h-3.5" />
              <span>Matriz 25×50</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('volante_5x5')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0 transition cursor-pointer ${
                viewMode === 'volante_5x5'
                  ? 'bg-emerald-500 text-slate-950 font-bold'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Volante 5×5</span>
            </button>
          </div>

          <div className="inline-flex bg-slate-950 border border-slate-800 rounded-xl p-1">
            {(
              [
                { id: 'todas', label: 'Todas (25)' },
                { id: 'quente', label: 'Quentes' },
                { id: 'fria', label: 'Frias / Atrasadas' },
              ] as const
            ).map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setThermalFilter(f.id)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition cursor-pointer ${
                  thermalFilter === f.id
                    ? f.id === 'quente'
                      ? 'bg-rose-500 text-white'
                      : f.id === 'fria'
                      ? 'bg-sky-500 text-slate-950 font-bold'
                      : 'bg-slate-800 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Destaques Quentes vs Frias / Atrasadas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch">
        <div className="bg-slate-950/70 border border-rose-500/25 rounded-xl p-4 flex flex-col justify-between gap-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-300 flex items-center gap-1.5 uppercase tracking-wider">
              <Flame className="w-4 h-4 text-rose-400" />
              Top Quentes (50 Concursos)
            </span>
            <span className="text-[11px] font-mono tabular-nums text-rose-400">
              Alta Frequência
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {topQuentes.map((item) => (
              <button
                key={item.numero}
                type="button"
                onClick={() => toggleDezena(item.numero)}
                className={`px-2 py-1 rounded-lg border text-xs font-mono tabular-nums flex items-center gap-1.5 whitespace-nowrap shrink-0 transition cursor-pointer ${
                  selectedNumbers.includes(item.numero)
                    ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-bold'
                    : 'bg-rose-500/15 border-rose-500/35 text-rose-200 hover:bg-rose-500/25'
                }`}
              >
                <span className="font-bold">{item.label}</span>
                <span className="text-[10px] opacity-85">{item.freq50}/50</span>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-slate-950/70 border border-sky-500/25 rounded-xl p-4 flex flex-col justify-between gap-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-sky-300 flex items-center gap-1.5 uppercase tracking-wider">
              <Snowflake className="w-4 h-4 text-sky-400" />
              Top Frias / Atrasadas
            </span>
            <span className="text-[11px] font-mono tabular-nums text-sky-400">
              Pressão de Retorno
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {topFrias.map((item) => (
              <button
                key={item.numero}
                type="button"
                onClick={() => toggleDezena(item.numero)}
                className={`px-2 py-1 rounded-lg border text-xs font-mono tabular-nums flex items-center gap-1.5 whitespace-nowrap shrink-0 transition cursor-pointer ${
                  selectedNumbers.includes(item.numero)
                    ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-bold'
                    : 'bg-sky-500/15 border-sky-500/35 text-sky-200 hover:bg-sky-500/25'
                }`}
              >
                <span className="font-bold">{item.label}</span>
                <span className="text-[10px] opacity-85">
                  {item.freq50}/50 • {item.atrasoAtual}c
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5 uppercase tracking-wider">
              <Activity className="w-4 h-4 text-emerald-400" />
              Equilíbrio Esperado
            </span>
            <span className="text-xs font-mono tabular-nums text-emerald-400 font-bold">
              Média: {mediaFreq}/50
            </span>
          </div>
          <div className="space-y-1.5">
            <div className="h-2.5 rounded-full w-full bg-gradient-to-r from-blue-600 via-emerald-500 via-amber-500 to-red-500" />
            <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
              <span className="text-sky-400">Fria (≤ 26x)</span>
              <span className="text-emerald-400">Neutra (~30x)</span>
              <span className="text-rose-400">Quente (≥ 33x)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Área do Gráfico D3.js com Tooltip Interativo */}
      <div
        ref={containerRef}
        className="relative bg-slate-950/85 border border-slate-800 rounded-xl p-3 sm:p-4 overflow-x-auto"
      >
        <svg
          ref={svgRef}
          className={`w-full h-auto block ${
            viewMode === 'volante_5x5' ? 'max-w-2xl mx-auto' : 'min-w-[720px]'
          }`}
          role="img"
          aria-label="Matriz de Calor D3.js das 25 dezenas nos últimos 50 concursos"
        />

        {hoveredCell && (
          <div
            style={{ left: hoveredCell.x, top: hoveredCell.y }}
            className="pointer-events-none absolute z-30 w-56 bg-slate-900/95 border border-slate-700 rounded-xl p-3 shadow-2xl text-xs space-y-1.5 backdrop-blur-md"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
              <span className="font-mono font-bold text-sm text-white">
                Dezena {String(hoveredCell.numero).padStart(2, '0')}
              </span>
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                  hoveredCell.thermal === 'quente'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                    : hoveredCell.thermal === 'fria'
                    ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                }`}
              >
                {hoveredCell.thermal === 'quente'
                  ? 'Quente'
                  : hoveredCell.thermal === 'fria'
                  ? 'Fria'
                  : 'Equilibrada'}
              </span>
            </div>
            {hoveredCell.concurso !== undefined && (
              <div className="flex items-center justify-between text-slate-300 font-mono">
                <span>Concurso #{hoveredCell.concurso}:</span>
                <span className={hoveredCell.saiu ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
                  {hoveredCell.saiu ? 'SORTEADA' : 'Ausente'}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between text-slate-300 font-mono tabular-nums">
              <span>Freq. 50 conc.:</span>
              <span className="font-bold text-white">
                {hoveredCell.freq50}/50 ({hoveredCell.pct50}%)
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-300 font-mono tabular-nums">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-400" />
                Atraso atual:
              </span>
              <span
                className={
                  hoveredCell.atrasoAtual >= 3 ? 'text-sky-300 font-bold' : 'text-slate-200'
                }
              >
                {hoveredCell.atrasoAtual === 0
                  ? 'Saiu no último'
                  : `${hoveredCell.atrasoAtual} concurso(s)`}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Barra de Seleção & Ação Combinatória */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 border-t border-slate-800/80">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleSelectTop15Quentes}
            className="px-3 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/35 text-xs font-bold flex items-center gap-1.5 whitespace-nowrap shrink-0 transition cursor-pointer"
          >
            <Flame className="w-3.5 h-3.5" />
            <span>Selecionar Top 15 Quentes</span>
          </button>

          <button
            type="button"
            onClick={handleSelectBalanced15}
            className="px-3 py-2 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-500/35 text-xs font-bold flex items-center gap-1.5 whitespace-nowrap shrink-0 transition cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Mesclar 9 Quentes + 6 Atrasadas</span>
          </button>

          {selectedNumbers.length > 0 && (
            <button
              type="button"
              onClick={() => setSelectedNumbers([])}
              className="px-2.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1 whitespace-nowrap shrink-0 transition cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Limpar ({selectedNumbers.length})</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {selectedNumbers.length > 0 && (
            <span className="text-xs font-mono tabular-nums text-slate-300 bg-slate-950 border border-slate-800 px-2.5 py-1.5 rounded-lg">
              {selectedNumbers.map((n) => String(n).padStart(2, '0')).join(' ')}
            </span>
          )}

          {onApplyNumbers && (
            <button
              type="button"
              onClick={handleApplyToFechamento}
              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 whitespace-nowrap shrink-0 shadow-md shadow-emerald-500/20 transition cursor-pointer"
            >
              <span>
                {selectedNumbers.length >= 15
                  ? `Aplicar ${selectedNumbers.length} no Fechamento`
                  : 'Aplicar Top 15 no Fechamento'}
              </span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {appliedNotice && (
        <div className="flex items-center gap-2 text-xs text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-3.5 py-2.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{appliedNotice}</span>
        </div>
      )}
    </div>
  );
};
