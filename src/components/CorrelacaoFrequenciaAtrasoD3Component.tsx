import React, { useRef, useEffect, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { LotofacilDraw, DezenaStats, FilterCriteria } from '../types/lotofacil';
import { CONCURSO_ATUAL, RECENT_DRAWS, DEZENAS_STATS, PRIMOS, MOLDURA, FIBONACCI } from '../data/lotofacilData';
import {
  ScatterChart,
  Flame,
  Snowflake,
  Crosshair,
  Check,
  CheckCircle2,
  Sparkles,
  Info,
  Layers,
  ArrowRight,
  RotateCcw,
  ShieldCheck,
  Lock,
} from 'lucide-react';
import { soundService } from '../services/soundAlert';

interface CorrelacaoFrequenciaAtrasoD3Props {
  latestDraw?: LotofacilDraw;
  statsList?: DezenaStats[];
  onApplyNumbers?: (numbers: number[]) => void;
  onGoToFechamento?: () => void;
}

// 100-concurso canonical frequency mapping (anchored to Caixa official 100 draws data)
const BASE_100_CONCURSOS_FREQ: Record<number, number> = {
  1: 61,
  2: 59,
  3: 58,
  4: 62,
  5: 57,
  6: 58,
  7: 55,
  8: 49,
  9: 59,
  10: 67,
  11: 65,
  12: 56,
  13: 63,
  14: 57,
  15: 58,
  16: 60,
  17: 50,
  18: 62,
  19: 61,
  20: 68,
  21: 59,
  22: 54,
  23: 64,
  24: 58,
  25: 60,
};

export interface DezenaScatterPoint {
  numero: number;
  label: string;
  frequencia100: number; // Eixo X: 45 a 70
  atrasoAtual: number; // Eixo Y: 0 a 6+
  quadrante: 'retorno_iminente' | 'momentum_quente' | 'neutro_recente' | 'zona_fria';
  quadranteLabel: string;
  ePrimo: boolean;
  eMoldura: boolean;
  eFibonacci: boolean;
  vezesGeral: number;
  color: string;
}

export const CorrelacaoFrequenciaAtrasoD3Component: React.FC<CorrelacaoFrequenciaAtrasoD3Props> = ({
  latestDraw = CONCURSO_ATUAL,
  statsList = DEZENAS_STATS,
  onApplyNumbers,
  onGoToFechamento,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [selectedDezenas, setSelectedDezenas] = useState<number[]>(() => {
    try {
      const saved = localStorage.getItem('lotosniper_canonical_fixed_dezenas');
      return saved ? JSON.parse(saved) : [11, 20];
    } catch {
      return [11, 20];
    }
  });

  const [hoveredPoint, setHoveredPoint] = useState<DezenaScatterPoint | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Prepara os dados das 25 dezenas com Frequência 100 e Atraso Atual
  const pointsData = useMemo<DezenaScatterPoint[]>(() => {
    return Array.from({ length: 25 }, (_, i) => i + 1).map((num) => {
      const freq100 = BASE_100_CONCURSOS_FREQ[num] || 60;
      const stat = statsList.find((s) => s.numero === num);
      const atraso = stat ? stat.atrasoAtual : latestDraw.dezenas.includes(num) ? 0 : 1;

      // Classificação em 4 Quadrantes (Linhas de Corte: Frequência = 60, Atraso = 2)
      let quadrante: DezenaScatterPoint['quadrante'] = 'momentum_quente';
      let quadranteLabel = 'Momentum Quente (Alta Freq / Baixo Atraso)';
      let color = '#10b981'; // Emerald

      if (freq100 >= 60 && atraso >= 2) {
        quadrante = 'retorno_iminente';
        quadranteLabel = 'Pressão de Retorno (Alta Freq / Alto Atraso)';
        color = '#f59e0b'; // Gold / Amber
      } else if (freq100 >= 60 && atraso < 2) {
        quadrante = 'momentum_quente';
        quadranteLabel = 'Momentum Quente (Alta Freq / Baixo Atraso)';
        color = '#f43f5e'; // Rose / Flame
      } else if (freq100 < 60 && atraso >= 2) {
        quadrante = 'zona_fria';
        quadranteLabel = 'Zona Fria (Baixa Freq / Alto Atraso)';
        color = '#38bdf8'; // Sky / Ice Blue
      } else {
        quadrante = 'neutro_recente';
        quadranteLabel = 'Oscilação Neutra (Baixa Freq / Baixo Atraso)';
        color = '#06b6d4'; // Cyan
      }

      return {
        numero: num,
        label: num.toString().padStart(2, '0'),
        frequencia100: freq100,
        atrasoAtual: atraso,
        quadrante,
        quadranteLabel,
        ePrimo: PRIMOS.includes(num),
        eMoldura: MOLDURA.includes(num),
        eFibonacci: FIBONACCI.includes(num),
        vezesGeral: stat ? stat.vezes : 2200,
        color,
      };
    });
  }, [statsList, latestDraw]);

  // Função para adicionar ou alternar dezena às Restrições Canônicas (Dezenas Fixas)
  const toggleDezenaCanonical = (num: number) => {
    let next: number[];
    if (selectedDezenas.includes(num)) {
      next = selectedDezenas.filter((n) => n !== num);
      setSuccessBanner(`Dezena [${num.toString().padStart(2, '0')}] removida das Restrições Canônicas.`);
    } else {
      next = [...selectedDezenas, num].sort((a, b) => a - b);
      soundService.playGoldenZoneSuccessChime();
      setSuccessBanner(
        `✓ Dezena [${num.toString().padStart(2, '0')}] adicionada instantaneamente às Restrições Canônicas (Dezenas Fixas)!`
      );
    }
    setSelectedDezenas(next);
    try {
      localStorage.setItem('lotosniper_canonical_fixed_dezenas', JSON.stringify(next));
    } catch {}

    // Notifica os componentes da aplicação e a aba de Fechamento
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('lotosniper-canonical-restrictions-updated', {
          detail: {
            fixedNumbers: next,
            action: 'toggle',
            dezena: num,
          },
        })
      );
    }

    if (onApplyNumbers) {
      onApplyNumbers(next);
    }

    setTimeout(() => setSuccessBanner(null), 4500);
  };

  // Selecionar dezenas do quadrante de retorno iminente (Alta Frequência + Alto Atraso)
  const handleSelectRetornoIminente = () => {
    const retornoNums = pointsData
      .filter((p) => p.quadrante === 'retorno_iminente')
      .map((p) => p.numero);
    const merged = Array.from(new Set([...selectedDezenas, ...retornoNums])).sort((a, b) => a - b);
    setSelectedDezenas(merged);
    try {
      localStorage.setItem('lotosniper_canonical_fixed_dezenas', JSON.stringify(merged));
    } catch {}

    soundService.playGoldenZoneSuccessChime();
    setSuccessBanner(
      `✓ ${retornoNums.length} dezenas do Quadrante de Retorno Iminente adicionadas às Restrições Canônicas!`
    );

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('lotosniper-canonical-restrictions-updated', {
          detail: { fixedNumbers: merged },
        })
      );
    }
    if (onApplyNumbers) onApplyNumbers(merged);
    setTimeout(() => setSuccessBanner(null), 5000);
  };

  const handleClearSelection = () => {
    setSelectedDezenas([]);
    try {
      localStorage.removeItem('lotosniper_canonical_fixed_dezenas');
    } catch {}
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('lotosniper-canonical-restrictions-updated', {
          detail: { fixedNumbers: [] },
        })
      );
    }
    if (onApplyNumbers) onApplyNumbers([]);
    setSuccessBanner('Seleção de dezenas canônicas limpa.');
    setTimeout(() => setSuccessBanner(null), 3000);
  };

  // Renderização D3.js do Gráfico de Dispersão
  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = 760;
    const height = 440;
    const margin = { top: 40, right: 40, bottom: 65, left: 65 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const maxAtraso = Math.max(5, d3.max(pointsData, (d) => d.atrasoAtual) || 5);
    const minFreq = 45;
    const maxFreq = 72;

    // Escalas D3
    const xScale = d3.scaleLinear().domain([minFreq, maxFreq]).range([0, innerWidth]);
    const yScale = d3.scaleLinear().domain([0, maxAtraso + 0.8]).range([innerHeight, 0]);

    const g = svg
      .attr('viewBox', `0 0 ${width} ${height}`)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Definições de Gradientes e Filtros de Glow
    const defs = svg.append('defs');

    // Glow filter
    const filter = defs.append('filter').attr('id', 'd3-glow');
    filter.append('feGaussianBlur').attr('stdDeviation', '3.5').attr('result', 'coloredBlur');
    const feMerge = filter.append('feMerge');
    feMerge.append('feMergeNode').attr('in', 'coloredBlur');
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    // Quadrant Background Shading
    // Q1: Retorno Iminente (Top Right: x >= 60, y >= 2)
    g.append('rect')
      .attr('x', xScale(60))
      .attr('y', 0)
      .attr('width', innerWidth - xScale(60))
      .attr('height', yScale(2))
      .attr('fill', '#f59e0b')
      .attr('fill-opacity', 0.05)
      .attr('rx', 8);

    // Q2: Momentum Quente (Bottom Right: x >= 60, y < 2)
    g.append('rect')
      .attr('x', xScale(60))
      .attr('y', yScale(2))
      .attr('width', innerWidth - xScale(60))
      .attr('height', innerHeight - yScale(2))
      .attr('fill', '#f43f5e')
      .attr('fill-opacity', 0.05)
      .attr('rx', 8);

    // Q3: Zona Fria (Top Left: x < 60, y >= 2)
    g.append('rect')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', xScale(60))
      .attr('height', yScale(2))
      .attr('fill', '#38bdf8')
      .attr('fill-opacity', 0.04)
      .attr('rx', 8);

    // Grid Horizontal
    const yAxisGrid = d3.axisLeft(yScale).tickSize(-innerWidth).tickFormat(() => '').ticks(maxAtraso + 1);
    g.append('g').attr('class', 'grid').call(yAxisGrid).selectAll('line').attr('stroke', '#1e293b').attr('stroke-dasharray', '3 3');

    // Grid Vertical
    const xAxisGrid = d3.axisBottom(xScale).tickSize(-innerHeight).tickFormat(() => '').ticks(7);
    g.append('g').attr('class', 'grid').attr('transform', `translate(0,${innerHeight})`).call(xAxisGrid).selectAll('line').attr('stroke', '#1e293b').attr('stroke-dasharray', '3 3');

    // Linha de Corte de Frequência (X = 60 Média Teórica nos 100 sorteios)
    g.append('line')
      .attr('x1', xScale(60))
      .attr('x2', xScale(60))
      .attr('y1', 0)
      .attr('y2', innerHeight)
      .attr('stroke', '#10b981')
      .attr('stroke-dasharray', '5 5')
      .attr('stroke-width', 1.5)
      .attr('stroke-opacity', 0.6);

    // Linha de Corte de Atraso (Y = 2)
    g.append('line')
      .attr('x1', 0)
      .attr('x2', innerWidth)
      .attr('y1', yScale(2))
      .attr('y2', yScale(2))
      .attr('stroke', '#f59e0b')
      .attr('stroke-dasharray', '5 5')
      .attr('stroke-width', 1.5)
      .attr('stroke-opacity', 0.6);

    // Legendas dos Quadrantes
    g.append('text')
      .attr('x', xScale(60) + 12)
      .attr('y', 20)
      .attr('fill', '#fbbf24')
      .attr('font-size', '10px')
      .attr('font-weight', 'bold')
      .attr('font-family', 'sans-serif')
      .text('⚡ RETORNO IMINENTE (Alta Freq / Alto Atraso)');

    g.append('text')
      .attr('x', xScale(60) + 12)
      .attr('y', innerHeight - 12)
      .attr('fill', '#f43f5e')
      .attr('font-size', '10px')
      .attr('font-weight', 'bold')
      .attr('font-family', 'sans-serif')
      .text('🔥 MOMENTUM QUENTE (Alta Freq / Baixo Atraso)');

    g.append('text')
      .attr('x', 12)
      .attr('y', 20)
      .attr('fill', '#38bdf8')
      .attr('font-size', '10px')
      .attr('font-weight', 'bold')
      .attr('font-family', 'sans-serif')
      .text('❄️ ZONA FRIA (Baixa Freq / Alto Atraso)');

    g.append('text')
      .attr('x', 12)
      .attr('y', innerHeight - 12)
      .attr('fill', '#94a3b8')
      .attr('font-size', '10px')
      .attr('font-weight', 'bold')
      .attr('font-family', 'sans-serif')
      .text('⚖️ OSCILAÇÃO NEUTRA (Baixa Freq / Baixo Atraso)');

    // Eixo X
    const xAxis = d3.axisBottom(xScale).ticks(8).tickFormat((d) => `${d}x`);
    const xAxisG = g
      .append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(xAxis);

    xAxisG.selectAll('text').attr('fill', '#94a3b8').attr('font-family', 'monospace').attr('font-size', '11px');
    xAxisG.selectAll('path, line').attr('stroke', '#334155');

    // Eixo Y
    const yAxis = d3.axisLeft(yScale).ticks(maxAtraso + 1).tickFormat((d) => `${d} conc.`);
    const yAxisG = g.append('g').call(yAxis);
    yAxisG.selectAll('text').attr('fill', '#94a3b8').attr('font-family', 'monospace').attr('font-size', '10px');
    yAxisG.selectAll('path, line').attr('stroke', '#334155');

    // Rótulo Eixo X
    g.append('text')
      .attr('x', innerWidth / 2)
      .attr('y', innerHeight + 46)
      .attr('text-anchor', 'middle')
      .attr('fill', '#cbd5e1')
      .attr('font-size', '12px')
      .attr('font-weight', 'bold')
      .text('Frequência Histórica das Dezenas (Últimos 100 Concursos)');

    // Rótulo Eixo Y
    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -innerHeight / 2)
      .attr('y', -48)
      .attr('text-anchor', 'middle')
      .attr('fill', '#cbd5e1')
      .attr('font-size', '12px')
      .attr('font-weight', 'bold')
      .text('Atraso Atual (Concursos sem Sair)');

    // Renderização dos Pontos de Dispersão (25 Dezenas)
    const pointsGroup = g.append('g').attr('class', 'points');

    pointsData.forEach((d) => {
      const isSelected = selectedDezenas.includes(d.numero);
      const cx = xScale(d.frequencia100);
      // Adiciona uma pequena dispersão estocástica determinística no X para evitar sobreposição exata
      const jitterX = ((d.numero * 7) % 5 - 2) * 2.5;
      const pointX = cx + jitterX;
      const pointY = yScale(d.atrasoAtual);

      const pointG = pointsGroup
        .append('g')
        .attr('class', `point-node point-${d.numero}`)
        .attr('cursor', 'pointer')
        .on('mouseenter', () => setHoveredPoint(d))
        .on('mouseleave', () => setHoveredPoint(null))
        .on('click', () => toggleDezenaCanonical(d.numero));

      // Glow / Anel Pulsante se Selecionado para Restrições Canônicas
      if (isSelected) {
        pointG
          .append('circle')
          .attr('cx', pointX)
          .attr('cy', pointY)
          .attr('r', 21)
          .attr('fill', 'none')
          .attr('stroke', '#fbbf24')
          .attr('stroke-width', 2.5)
          .attr('stroke-dasharray', '4 2')
          .attr('filter', 'url(#d3-glow)')
          .attr('opacity', 0.9);
      }

      // Círculo Principal
      pointG
        .append('circle')
        .attr('cx', pointX)
        .attr('cy', pointY)
        .attr('r', isSelected ? 16 : 14)
        .attr('fill', isSelected ? '#fbbf24' : d.color)
        .attr('stroke', isSelected ? '#ffffff' : '#0f172a')
        .attr('stroke-width', isSelected ? 2.5 : 1.5)
        .attr('fill-opacity', isSelected ? 1 : 0.85)
        .attr('filter', isSelected ? 'url(#d3-glow)' : null);

      // Texto com a Dezena Formatada (ex: '05')
      pointG
        .append('text')
        .attr('x', pointX)
        .attr('y', pointY + 4)
        .attr('text-anchor', 'middle')
        .attr('fill', isSelected ? '#0f172a' : '#ffffff')
        .attr('font-size', '11px')
        .attr('font-weight', '900')
        .attr('font-family', 'monospace')
        .attr('pointer-events', 'none')
        .text(d.label);
    });
  }, [pointsData, selectedDezenas]);

  return (
    <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-5 sm:p-6 shadow-2xl space-y-5">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-md shadow-indigo-500/20">
              <Crosshair className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <span>Dispersão D3: Frequência Histórica (100) vs Atraso Atual</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 uppercase font-bold">
                  D3.js Interativo
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Clique nos pontos (dezenas) para adicioná-las <strong className="text-amber-300">instantaneamente às Restrições Canônicas (Dezenas Fixas)</strong> do fechamento.
              </p>
            </div>
          </div>
        </div>

        {/* Quick Toolbar */}
        <div className="flex items-center flex-wrap gap-2 shrink-0">
          <button
            type="button"
            onClick={handleSelectRetornoIminente}
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs transition cursor-pointer shadow-md shadow-amber-500/20 flex items-center gap-1.5 active:scale-95"
            title="Seleciona automaticamente todas as dezenas de alta frequência que estão atrasadas"
          >
            <Flame className="w-3.5 h-3.5 fill-current" />
            <span>Retorno Iminente</span>
          </button>

          {selectedDezenas.length > 0 && (
            <button
              type="button"
              onClick={handleClearSelection}
              className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-semibold transition cursor-pointer flex items-center gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Limpar ({selectedDezenas.length})</span>
            </button>
          )}

          {onGoToFechamento && (
            <button
              type="button"
              onClick={onGoToFechamento}
              className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition cursor-pointer shadow-md shadow-emerald-500/20 flex items-center gap-1.5 active:scale-95"
            >
              <span>Ver no Fechamento</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Success Notification */}
      {successBanner && (
        <div className="bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs px-4 py-2.5 rounded-xl flex items-center justify-between shadow-lg shadow-emerald-500/10 animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successBanner}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessBanner(null)}
            className="text-emerald-400 hover:text-white font-bold text-xs px-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Selected Canonical Fixed Numbers Bar */}
      <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs text-slate-300 font-bold">
            <Lock className="w-3.5 h-3.5 text-amber-400" />
            <span>Restrições Canônicas Ativas ({selectedDezenas.length} Fixadas):</span>
          </div>
          {selectedDezenas.length === 0 ? (
            <span className="text-xs text-slate-500 italic">
              Nenhuma dezena fixada. Clique nos pontos do gráfico abaixo para fixar.
            </span>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {selectedDezenas.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => toggleDezenaCanonical(n)}
                  className="px-2 py-0.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono text-xs font-bold hover:bg-rose-500/20 hover:text-rose-300 hover:border-rose-500/40 transition cursor-pointer flex items-center gap-1"
                  title="Clique para desmarcar das Restrições Canônicas"
                >
                  <span>{n.toString().padStart(2, '0')}</span>
                  <span className="text-[10px] opacity-70">✕</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <span className="text-[11px] text-slate-400 font-mono">
          Integração em tempo real com Fechamento & Matriz Pro
        </span>
      </div>

      {/* D3 Scatter Plot SVG Container */}
      <div className="relative bg-slate-950/90 rounded-2xl border border-slate-800/80 p-2 sm:p-4 overflow-hidden">
        <svg ref={svgRef} className="w-full h-auto select-none" />

        {/* Hover Floating Card */}
        {hoveredPoint && (
          <div className="absolute top-4 right-4 bg-slate-900/95 border border-slate-700 p-3 rounded-xl shadow-2xl text-xs space-y-1.5 backdrop-blur-md pointer-events-none min-w-[220px]">
            <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono font-bold flex items-center justify-center">
                  {hoveredPoint.label}
                </span>
                <span className="text-white font-bold">Dezena {hoveredPoint.label}</span>
              </div>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                {selectedDezenas.includes(hoveredPoint.numero) ? '✓ Fixada' : 'Não fixada'}
              </span>
            </div>

            <div className="space-y-1 font-mono text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-400">Freq. 100 Concursos:</span>
                <strong className="text-white">{hoveredPoint.frequencia100} saídas</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Atraso Atual:</span>
                <span className={hoveredPoint.atrasoAtual === 0 ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                  {hoveredPoint.atrasoAtual === 0 ? 'Saiu no último sorteio' : `${hoveredPoint.atrasoAtual} conc. sem sair`}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Classificação:</span>
                <span className="text-amber-300 font-semibold">{hoveredPoint.quadranteLabel.split('(')[0]}</span>
              </div>
            </div>

            <p className="text-[10px] text-cyan-400 pt-1 border-t border-slate-800/80 font-sans">
              💡 Clique para {selectedDezenas.includes(hoveredPoint.numero) ? 'remover das' : 'adicionar às'} Restrições Canônicas
            </p>
          </div>
        )}
      </div>

      {/* Quadrants Legend & Statistical Guide */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs pt-1">
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-1">
          <div className="flex items-center gap-1.5 font-bold text-amber-400">
            <Flame className="w-3.5 h-3.5 fill-current" />
            <span>Retorno Iminente</span>
          </div>
          <p className="text-[11px] text-slate-300">
            Alta frequência histórica (≥60) e atraso atual alto (≥2). Dezenas com forte pressão elástica para retorno imediato.
          </p>
        </div>

        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 space-y-1">
          <div className="flex items-center gap-1.5 font-bold text-rose-400">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Momentum Quente</span>
          </div>
          <p className="text-[11px] text-slate-300">
            Alta frequência histórica (≥60) com saída recente (atraso 0 ou 1). Dezenas ativas de alta dominância Caixa.
          </p>
        </div>

        <div className="p-3 rounded-xl bg-sky-500/10 border border-sky-500/30 space-y-1">
          <div className="flex items-center gap-1.5 font-bold text-sky-400">
            <Snowflake className="w-3.5 h-3.5" />
            <span>Zona Fria</span>
          </div>
          <p className="text-[11px] text-slate-300">
            Baixa frequência histórica (&lt;60) e atraso prolongado. Indicadas para exclusão em fechamentos conservadores.
          </p>
        </div>

        <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30 space-y-1">
          <div className="flex items-center gap-1.5 font-bold text-cyan-400">
            <Crosshair className="w-3.5 h-3.5" />
            <span>Oscilação Neutra</span>
          </div>
          <p className="text-[11px] text-slate-300">
            Baixa frequência com saída recente. Comportamento errático que requer atenção antes de fixação.
          </p>
        </div>
      </div>
    </div>
  );
};
