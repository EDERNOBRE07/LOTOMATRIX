import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { LotofacilDraw, DezenaStats } from '../types/lotofacil';
import { CONCURSO_ATUAL, DEZENAS_STATS } from '../data/lotofacilData';
import { getHistorical500Draws } from '../services/fechamentoPonderadoService';
import { soundService } from '../services/soundAlert';
import {
  Flame,
  TrendingUp,
  Sparkles,
  Target,
  ArrowRight,
  Info,
  CheckCircle2,
  RotateCcw,
  Sliders,
  Compass,
} from 'lucide-react';

interface MapaCalorProbabilidadesD3Props {
  latestDraw?: LotofacilDraw;
  statsList?: DezenaStats[];
  cyclePendingNumbers?: number[];
  onApplyNumbers?: (numbers: number[]) => void;
}

export interface DezenaProbabilidadeData {
  numero: number;
  dezenaPad: string;
  row: number; // 0..4
  col: number; // 0..4
  probabilidadePreditiva: number; // 38% a 88%
  beta: number; // coeficiente angular OLS
  alpha: number; // intercepto
  r2: number; // coeficiente de determinação R²
  atrasoAtual: number;
  frequencia200: number;
  frequenciaPercentual: number;
  isCyclePending: boolean;
  tendencia: 'Forte Alta' | 'Alta Moderada' | 'Estável' | 'Em Retração';
}

export const MapaCalorProbabilidadesD3: React.FC<MapaCalorProbabilidadesD3Props> = ({
  latestDraw = CONCURSO_ATUAL,
  statsList = DEZENAS_STATS,
  cyclePendingNumbers = [17, 22],
  onApplyNumbers,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const [selectedNumbers, setSelectedNumbers] = useState<number[]>([]);
  const [hoveredData, setHoveredData] = useState<DezenaProbabilidadeData | null>(null);
  const [appliedNotice, setAppliedNotice] = useState<string | null>(null);

  // 1. Cálculo da Regressão Linear Mínimos Quadrados (OLS) sobre os últimos 200 concursos para todas as 25 dezenas
  const gridData = useMemo<DezenaProbabilidadeData[]>(() => {
    const historical200 = getHistorical500Draws(latestDraw).slice(0, 200);

    // 10 janelas cronológicas de 20 concursos cada
    const windowCount = 10;
    const windowSize = 20;
    const windows: LotofacilDraw[][] = [];
    for (let w = windowCount - 1; w >= 0; w--) {
      const start = w * windowSize;
      windows.push(historical200.slice(start, start + windowSize));
    }

    const tValues = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const meanT = 5.5;
    const sumTDiffSq = 82.5; // sum((t - 5.5)^2)

    const list: DezenaProbabilidadeData[] = [];

    for (let num = 1; num <= 25; num++) {
      const stat = statsList.find((s) => s.numero === num);
      const atrasoAtual = stat?.atrasoAtual ?? 0;
      const isCyclePending = cyclePendingNumbers.includes(num) || Boolean(stat?.pendenteNoCiclo);

      // Frequências nas 10 janelas cronológicas
      const yValues: number[] = windows.map((win) => {
        return win.filter((draw) => draw.dezenas.includes(num)).length;
      });

      const totalFreq200 = yValues.reduce((a, b) => a + b, 0);
      const meanY = totalFreq200 / windowCount;

      let sumNumerator = 0;
      let ssTotal = 0;
      for (let i = 0; i < windowCount; i++) {
        const tDiff = tValues[i] - meanT;
        const yDiff = yValues[i] - meanY;
        sumNumerator += tDiff * yDiff;
        ssTotal += yDiff * yDiff;
      }

      const beta = sumNumerator / sumTDiffSq;
      const alpha = meanY - beta * meanT;
      const projectedNextWindowFreq = alpha + beta * 11;

      let ssRes = 0;
      for (let i = 0; i < windowCount; i++) {
        const yPred = alpha + beta * tValues[i];
        ssRes += Math.pow(yValues[i] - yPred, 2);
      }
      const r2 = ssTotal > 0 ? Math.max(0, Math.min(1, 1 - ssRes / ssTotal)) : 0;

      // Probabilidade Preditiva calibrada
      let rawProb = (projectedNextWindowFreq / windowSize) * 100;
      if (isCyclePending) {
        rawProb += 8.5; // bônus de pressão de ciclo
      } else if (atrasoAtual >= 3) {
        rawProb += Math.min(6, atrasoAtual * 1.5);
      } else if (atrasoAtual === 0) {
        rawProb += 4.0;
      }

      const finalProb = Number(Math.min(88.5, Math.max(38.0, rawProb)).toFixed(1));

      let tendencia: DezenaProbabilidadeData['tendencia'] = 'Estável';
      if (beta >= 0.25) tendencia = 'Forte Alta';
      else if (beta >= 0.08) tendencia = 'Alta Moderada';
      else if (beta <= -0.15) tendencia = 'Em Retração';

      const row = Math.floor((num - 1) / 5);
      const col = (num - 1) % 5;

      list.push({
        numero: num,
        dezenaPad: num.toString().padStart(2, '0'),
        row,
        col,
        probabilidadePreditiva: finalProb,
        beta: Number(beta.toFixed(3)),
        alpha: Number(alpha.toFixed(2)),
        r2: Number(r2.toFixed(3)),
        atrasoAtual,
        frequencia200: totalFreq200,
        frequenciaPercentual: Number(((totalFreq200 / 200) * 100).toFixed(1)),
        isCyclePending,
        tendencia,
      });
    }

    return list;
  }, [latestDraw, statsList, cyclePendingNumbers]);

  // Ranking ordenado decrescente por probabilidade
  const sortedByProb = useMemo(() => {
    return [...gridData].sort((a, b) => b.probabilidadePreditiva - a.probabilidadePreditiva);
  }, [gridData]);

  // 2. Renderização do D3.js
  useEffect(() => {
    if (!svgRef.current || gridData.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = 640;
    const height = 640;
    const padding = 16;
    const innerWidth = width - padding * 2;
    const innerHeight = height - padding * 2;
    const cellSize = innerWidth / 5;
    const cellGap = 8;
    const actualCellSize = cellSize - cellGap;

    svg.attr('viewBox', `0 0 ${width} ${height}`);

    // D3 Color Scale: Gradiente Ouro Imperial
    // Do âmbar escuro / ardósia ao dourado solar incandescente
    const minProb = d3.min(gridData, (d) => d.probabilidadePreditiva) ?? 40;
    const maxProb = d3.max(gridData, (d) => d.probabilidadePreditiva) ?? 85;

    const colorScale = d3
      .scaleLinear<string>()
      .domain([minProb, minProb + (maxProb - minProb) * 0.35, minProb + (maxProb - minProb) * 0.7, maxProb])
      .range(['#1e293b', '#78350f', '#f59e0b', '#fef08a'])
      .interpolate(d3.interpolateRgb);

    // Container com margem
    const g = svg.append('g').attr('transform', `translate(${padding}, ${padding})`);

    // Grade 5x5
    const cellGroups = g
      .selectAll<SVGGElement, DezenaProbabilidadeData>('g.cell')
      .data(gridData, (d) => d.numero.toString())
      .enter()
      .append('g')
      .attr('class', 'cell')
      .attr(
        'transform',
        (d) => `translate(${d.col * cellSize + cellGap / 2}, ${d.row * cellSize + cellGap / 2})`
      )
      .style('cursor', 'pointer');

    // Fundo do retângulo da célula
    cellGroups
      .append('rect')
      .attr('width', actualCellSize)
      .attr('height', actualCellSize)
      .attr('rx', 12)
      .attr('ry', 12)
      .attr('fill', '#0f172a')
      .attr('stroke', (d) => {
        if (selectedNumbers.includes(d.numero)) return '#10b981'; // Verde se selecionado
        if (d.isCyclePending) return '#fbbf24'; // Dourado brilhante para ciclo
        return '#334155';
      })
      .attr('stroke-width', (d) => (selectedNumbers.includes(d.numero) ? 3.5 : d.isCyclePending ? 2.5 : 1.5))
      .transition()
      .duration(700)
      .ease(d3.easeCubicOut)
      .attr('fill', (d) => colorScale(d.probabilidadePreditiva));

    // Efeito de brilho / glow para ciclo ou topo
    cellGroups
      .filter((d) => d.isCyclePending || d.probabilidadePreditiva >= 78)
      .append('rect')
      .attr('width', actualCellSize)
      .attr('height', actualCellSize)
      .attr('rx', 12)
      .attr('ry', 12)
      .attr('fill', 'none')
      .attr('stroke', '#f59e0b')
      .attr('stroke-width', 1.5)
      .attr('opacity', 0.6)
      .style('filter', 'drop-shadow(0 0 6px rgba(245, 158, 11, 0.45))');

    // Número da Dezena (ex: "01", "07", "22")
    cellGroups
      .append('text')
      .attr('x', actualCellSize / 2)
      .attr('y', actualCellSize / 2 - 10)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'central')
      .attr('font-size', '28px')
      .attr('font-weight', '900')
      .attr('font-family', 'ui-monospace, monospace')
      .attr('fill', (d) => {
        // Contraste dinâmico: se a cor de fundo for ouro claro, texto preto, senão branco
        return d.probabilidadePreditiva >= 76 ? '#0f172a' : '#ffffff';
      })
      .style('text-shadow', (d) => (d.probabilidadePreditiva >= 76 ? 'none' : '0 1px 3px rgba(0,0,0,0.8)'))
      .text((d) => d.dezenaPad);

    // Probabilidade % (ex: "82.4%")
    cellGroups
      .append('text')
      .attr('x', actualCellSize / 2)
      .attr('y', actualCellSize / 2 + 20)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'central')
      .attr('font-size', '13px')
      .attr('font-weight', '800')
      .attr('font-family', 'ui-monospace, monospace')
      .attr('fill', (d) => (d.probabilidadePreditiva >= 76 ? '#020617' : '#fef08a'))
      .text((d) => `${d.probabilidadePreditiva}%`);

    // Indicador de Tendência Angular Beta (ex: +0.28 ou -0.15)
    cellGroups
      .append('text')
      .attr('x', actualCellSize / 2)
      .attr('y', actualCellSize / 2 + 38)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'central')
      .attr('font-size', '10px')
      .attr('font-weight', '700')
      .attr('font-family', 'ui-monospace, monospace')
      .attr('fill', (d) => {
        if (d.probabilidadePreditiva >= 76) return '#334155';
        if (d.beta > 0) return '#34d399';
        if (d.beta < 0) return '#f87171';
        return '#94a3b8';
      })
      .text((d) => `β ${d.beta > 0 ? '+' : ''}${d.beta}`);

    // Badge de Ciclo (Fogo) no canto superior direito se pendente
    cellGroups
      .filter((d) => d.isCyclePending)
      .append('circle')
      .attr('cx', actualCellSize - 12)
      .attr('cy', 12)
      .attr('r', 6)
      .attr('fill', '#ef4444')
      .attr('stroke', '#fef08a')
      .attr('stroke-width', 1.5)
      .style('filter', 'drop-shadow(0 0 4px #ef4444)');

    // Indicador de Seleção no canto superior esquerdo
    cellGroups
      .filter((d) => selectedNumbers.includes(d.numero))
      .append('circle')
      .attr('cx', 12)
      .attr('cy', 12)
      .attr('r', 6)
      .attr('fill', '#10b981')
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 1.5);

    // Interações D3: Hover, MouseOut, Click
    cellGroups
      .on('mouseenter', function (_event, d) {
        d3.select(this)
          .select('rect')
          .transition()
          .duration(150)
          .attr('transform', 'scale(1.04)')
          .attr('transform-origin', `${actualCellSize / 2} ${actualCellSize / 2}`);
        setHoveredData(d);
      })
      .on('mouseleave', function () {
        d3.select(this)
          .select('rect')
          .transition()
          .duration(150)
          .attr('transform', 'scale(1)')
          .attr('transform-origin', `${actualCellSize / 2} ${actualCellSize / 2}`);
        setHoveredData(null);
      })
      .on('click', function (_event, d) {
        soundService.playFilterClick();
        toggleSelectNumber(d.numero);
      });
  }, [gridData, selectedNumbers]);

  const toggleSelectNumber = (num: number) => {
    setSelectedNumbers((prev) => {
      if (prev.includes(num)) {
        return prev.filter((n) => n !== num);
      }
      if (prev.length >= 20) {
        return prev;
      }
      return [...prev, num].sort((a, b) => a - b);
    });
  };

  const selectTopN = (count: number) => {
    soundService.playFilterClick();
    const topNums = sortedByProb.slice(0, count).map((d) => d.numero).sort((a, b) => a - b);
    setSelectedNumbers(topNums);
  };

  const handleApplyToFechamento = () => {
    if (selectedNumbers.length < 15) {
      soundService.playAnomalyDetected();
      return;
    }
    soundService.playGoldenZoneSuccessChime();
    if (onApplyNumbers) {
      onApplyNumbers(selectedNumbers);
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('switch-tab', {
          detail: {
            tab: 'fechamento',
            selectedNumbers,
          },
        })
      );
    }
    setAppliedNotice(`Matriz de ${selectedNumbers.length} dezenas transferida com sucesso para o Fechamento Inteligente!`);
    setTimeout(() => setAppliedNotice(null), 4000);
  };

  return (
    <div className="bg-slate-900/95 border border-amber-500/30 rounded-2xl p-5 sm:p-6 shadow-2xl relative overflow-hidden">
      {/* Luz dourada de fundo */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-amber-500/10 via-yellow-500/5 to-transparent blur-3xl pointer-events-none" />

      {/* Cabeçalho do Card */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-800">
        <div className="flex items-start gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 via-amber-500 to-yellow-600 flex items-center justify-center text-slate-950 shadow-lg shadow-amber-500/30 shrink-0">
            <Flame className="w-6 h-6 fill-current" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono">
                D3.js • GRADE 5X5 VOLANTE
              </span>
              <span className="text-[10px] font-bold text-slate-400">
                Regressão Linear Mínimos Quadrados (200 Concursos)
              </span>
            </div>
            <h3 className="text-lg sm:text-xl font-black text-white tracking-tight mt-1 flex items-center gap-2">
              Mapa de Calor de Probabilidades das 25 Dezenas
            </h3>
            <p className="text-xs text-slate-300 mt-0.5">
              A intensidade da cor dourada representa a propensão preditiva de saída de cada dezena no próximo concurso.
            </p>
          </div>
        </div>

        {/* Legenda de Cores Douradas */}
        <div className="flex items-center gap-2 self-start lg:self-center bg-slate-950/80 px-3.5 py-2 rounded-xl border border-slate-800 text-xs">
          <span className="text-slate-400 font-medium">Escala:</span>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded bg-[#1e293b] border border-slate-700" title="Menor Propensão (~40%)" />
            <span className="w-3.5 h-3.5 rounded bg-[#78350f] border border-amber-900" title="Média (~60%)" />
            <span className="w-3.5 h-3.5 rounded bg-[#f59e0b] border border-amber-500" title="Alta (~75%)" />
            <span className="w-3.5 h-3.5 rounded bg-[#fef08a] border border-yellow-200 shadow-[0_0_8px_#fde047]" title="Máxima (~88%)" />
          </div>
          <span className="text-amber-300 font-bold font-mono text-[11px] ml-1">Ouro Solar = Saída Imminente</span>
        </div>
      </div>

      {/* Conteúdo Principal: Volante D3 + Painel Lateral de Inteligência */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6 items-start">
        {/* Grade Interativa D3.js (Volante 5x5) */}
        <div className="lg:col-span-7 flex flex-col items-center">
          <div className="w-full max-w-[500px] bg-slate-950/90 rounded-2xl p-3 border border-slate-800 shadow-inner">
            <svg
              ref={svgRef}
              className="w-full h-auto drop-shadow-md select-none"
              style={{ maxHeight: '480px' }}
            />
          </div>

          <div className="flex items-center justify-between w-full max-w-[500px] mt-2 text-[11px] text-slate-400 px-1">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              Ponto Vermelho = Dezena Pendente no Ciclo
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Ponto Verde = Selecionada
            </span>
          </div>
        </div>

        {/* Painel Lateral com Detalhes da Dezena & Ações */}
        <div className="lg:col-span-5 space-y-4">
          {/* Card de Detalhe Interativo (Hover ou Seleção) */}
          <div className="bg-slate-950/90 border border-amber-500/30 rounded-xl p-4 shadow-lg min-h-[220px] flex flex-col justify-between">
            {hoveredData ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2.5">
                    <span className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-400 to-yellow-600 text-slate-950 font-black font-mono text-lg flex items-center justify-center shadow-md">
                      {hoveredData.dezenaPad}
                    </span>
                    <div>
                      <h4 className="text-sm font-black text-white">Dezena {hoveredData.dezenaPad}</h4>
                      <span className="text-[10px] text-slate-400">
                        {hoveredData.isCyclePending ? '🔥 PENDENTE NO CICLO' : 'Histórico 200 Concursos'}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs text-slate-400 block">Propensão</span>
                    <span className="text-lg font-black font-mono text-amber-300">
                      {hoveredData.probabilidadePreditiva}%
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                    <span className="text-slate-400 block text-[10px]">Coeficiente Angular (β)</span>
                    <strong className={`font-mono text-xs ${hoveredData.beta > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {hoveredData.beta > 0 ? '+' : ''}{hoveredData.beta} ({hoveredData.tendencia})
                    </strong>
                  </div>

                  <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                    <span className="text-slate-400 block text-[10px]">R² (Determinação OLS)</span>
                    <strong className="font-mono text-xs text-cyan-300">{hoveredData.r2}</strong>
                  </div>

                  <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                    <span className="text-slate-400 block text-[10px]">Atraso Atual</span>
                    <strong className="font-mono text-xs text-amber-200">
                      {hoveredData.atrasoAtual} concurso{hoveredData.atrasoAtual !== 1 ? 's' : ''}
                    </strong>
                  </div>

                  <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                    <span className="text-slate-400 block text-[10px]">Frequência em 200</span>
                    <strong className="font-mono text-xs text-slate-200">
                      {hoveredData.frequencia200} ({hoveredData.frequenciaPercentual}%)
                    </strong>
                  </div>
                </div>

                <p className="text-[11px] text-slate-400 italic">
                  Clique na célula para alternar a seleção no volante.
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-6 text-center text-slate-400">
                <Compass className="w-8 h-8 text-amber-400/60 mb-2 animate-pulse" />
                <h4 className="text-xs font-bold text-slate-300">Passe o mouse sobre as células</h4>
                <p className="text-[11px] text-slate-500 max-w-xs mt-1">
                  Exibe o coeficiente angular $\beta$, correlação linear OLS e pressão estatística para cada número.
                </p>
              </div>
            )}
          </div>

          {/* Ferramentas Rápidas de Seleção */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300 font-bold">Seleção Ativa:</span>
              <span className="font-mono font-black text-emerald-400">
                {selectedNumbers.length} / 20 dezenas
              </span>
            </div>

            {selectedNumbers.length > 0 && (
              <div className="flex flex-wrap gap-1 p-2 bg-slate-900 rounded-lg border border-slate-800 max-h-20 overflow-y-auto font-mono text-xs text-emerald-300">
                {selectedNumbers.map((n) => n.toString().padStart(2, '0')).join(', ')}
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => selectTopN(18)}
                className="px-2.5 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40 font-bold transition cursor-pointer text-center"
              >
                Top 18 Ouro
              </button>

              <button
                type="button"
                onClick={() => selectTopN(15)}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold transition cursor-pointer text-center"
              >
                Top 15 Ouro
              </button>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleApplyToFechamento}
                disabled={selectedNumbers.length < 15}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs shadow-md shadow-emerald-500/20 transition cursor-pointer disabled:opacity-40"
              >
                <span>Aplicar no Fechamento</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              {selectedNumbers.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedNumbers([])}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
                  title="Limpar seleção"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              )}
            </div>

            {appliedNotice && (
              <div className="p-2 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[11px] font-bold flex items-center gap-1.5 animate-fadeIn">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>{appliedNotice}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
