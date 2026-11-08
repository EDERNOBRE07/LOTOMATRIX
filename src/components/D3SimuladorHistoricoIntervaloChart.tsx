import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { GameTicket, LotofacilDraw } from '../types/lotofacil';
import { RECENT_DRAWS, CONCURSO_ATUAL } from '../data/lotofacilData';
import { VALOR_APOSTA_LOTOFACIL, countMatches } from '../services/combinatorics';
import {
  TrendingUp,
  BarChart3,
  Award,
  DollarSign,
  Calendar,
  Layers,
  Sparkles,
  Info,
  CheckCircle2,
} from 'lucide-react';

interface D3SimuladorHistoricoIntervaloChartProps {
  tickets?: GameTicket[];
  historicalDraws?: LotofacilDraw[];
  fechamentoNome?: string;
}

interface ConcursoSimuladoPoint {
  index: number;
  concurso: number;
  data: string;
  custoConcurso: number;
  premioConcurso: number;
  saldoConcurso: number;
  acertos11: number;
  acertos12: number;
  acertos13: number;
  acertos14: number;
  acertos15: number;
  maiorAcerto: number;
  // Acumulados
  custoAcumulado: number;
  premioAcumulado: number;
  saldoAcumulado: number;
  roiAcumulado: number;
}

export const D3SimuladorHistoricoIntervaloChart: React.FC<D3SimuladorHistoricoIntervaloChartProps> = ({
  tickets = [],
  historicalDraws = RECENT_DRAWS,
  fechamentoNome = 'Fechamento Otimizado LotoSniper',
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Intervalo de concursos passados a testar (10 a 50)
  const [rangeSize, setRangeSize] = useState<number>(30);
  const [activeTooltip, setActiveTooltip] = useState<ConcursoSimuladoPoint | null>(null);

  // Se não houver tickets gerados ainda, cria um conjunto padrão de 10 jogos baseados no concurso atual
  const activeTickets: number[][] = useMemo(() => {
    if (tickets && tickets.length > 0) {
      return tickets.map((t) => t.dezenas);
    }
    // Conjunto padrão de alta densidade se nenhum bilhete estiver em tela
    return [
      [1, 2, 6, 7, 9, 10, 12, 13, 15, 17, 18, 20, 21, 24, 25],
      [1, 2, 3, 7, 8, 10, 11, 13, 14, 16, 18, 20, 21, 24, 25],
      [1, 4, 6, 7, 9, 10, 12, 13, 15, 16, 18, 19, 21, 24, 25],
      [2, 3, 6, 7, 8, 10, 12, 14, 15, 17, 19, 20, 22, 23, 25],
      [1, 3, 5, 7, 9, 11, 12, 13, 15, 18, 20, 21, 22, 24, 25],
      [2, 4, 6, 8, 9, 10, 12, 13, 15, 17, 18, 20, 21, 23, 24],
      [1, 2, 5, 7, 10, 11, 12, 14, 16, 17, 18, 20, 22, 24, 25],
      [3, 4, 6, 7, 9, 10, 13, 14, 15, 18, 19, 20, 21, 24, 25],
      [1, 2, 6, 8, 9, 11, 12, 13, 15, 17, 19, 21, 22, 24, 25],
      [2, 3, 5, 7, 8, 10, 12, 13, 16, 17, 18, 20, 21, 23, 25],
    ];
  }, [tickets]);

  // Filtra e ordena os concursos cronologicamente (do mais antigo para o mais recente no intervalo)
  const simulationData: ConcursoSimuladoPoint[] = useMemo(() => {
    const drawsSlice = historicalDraws.slice(0, Math.min(rangeSize, historicalDraws.length)).reverse();
    const custoPorConcurso = activeTickets.length * VALOR_APOSTA_LOTOFACIL;

    let accumCusto = 0;
    let accumPremio = 0;

    return drawsSlice.map((draw, idx) => {
      const drawn = draw.dezenas;
      let c11 = 0;
      let c12 = 0;
      let c13 = 0;
      let c14 = 0;
      let c15 = 0;
      let maxHit = 0;

      for (const ticket of activeTickets) {
        const hits = countMatches(ticket, drawn);
        if (hits > maxHit) maxHit = hits;
        if (hits === 15) c15++;
        else if (hits === 14) c14++;
        else if (hits === 13) c13++;
        else if (hits === 12) c12++;
        else if (hits === 11) c11++;
      }

      // Cálculo de premiação oficial Caixa
      const val15 = draw.premiacoes?.faixa15?.valor || 2500000.0;
      const val14 = draw.premiacoes?.faixa14?.valor || 1950.0;
      const val13 = draw.premiacoes?.faixa13?.valor || 35.0;
      const val12 = draw.premiacoes?.faixa12?.valor || 14.0;
      const val11 = draw.premiacoes?.faixa11?.valor || 7.0;

      const premioConcurso =
        (c15 * val15) +
        (c14 * val14) +
        (c13 * val13) +
        (c12 * val12) +
        (c11 * val11);

      accumCusto += custoPorConcurso;
      accumPremio += premioConcurso;
      const accumSaldo = accumPremio - accumCusto;
      const roiAcumulado = accumCusto > 0 ? (accumSaldo / accumCusto) * 100 : 0;

      return {
        index: idx + 1,
        concurso: draw.concurso,
        data: draw.data,
        custoConcurso: custoPorConcurso,
        premioConcurso,
        saldoConcurso: premioConcurso - custoPorConcurso,
        acertos11: c11,
        acertos12: c12,
        acertos13: c13,
        acertos14: c14,
        acertos15: c15,
        maiorAcerto: maxHit,
        custoAcumulado: accumCusto,
        premioAcumulado: accumPremio,
        saldoAcumulado: accumSaldo,
        roiAcumulado: Math.round(roiAcumulado * 10) / 10,
      };
    });
  }, [historicalDraws, rangeSize, activeTickets]);

  // Métricas agregadas
  const metrics = useMemo(() => {
    if (simulationData.length === 0) {
      return {
        totalInvestido: 0,
        totalResgatado: 0,
        saldoLiquido: 0,
        roiGeral: 0,
        total14: 0,
        total13: 0,
        total12: 0,
        total11: 0,
        concursosLucrativos: 0,
        melhorConcurso: null,
      };
    }

    const last = simulationData[simulationData.length - 1];
    let t14 = 0;
    let t13 = 0;
    let t12 = 0;
    let t11 = 0;
    let lucrativos = 0;
    let bestPoint = simulationData[0];

    simulationData.forEach((p) => {
      t14 += p.acertos14;
      t13 += p.acertos13;
      t12 += p.acertos12;
      t11 += p.acertos11;
      if (p.saldoConcurso > 0) lucrativos++;
      if (p.premioConcurso > bestPoint.premioConcurso) {
        bestPoint = p;
      }
    });

    return {
      totalInvestido: last.custoAcumulado,
      totalResgatado: last.premioAcumulado,
      saldoLiquido: last.saldoAcumulado,
      roiGeral: last.roiAcumulado,
      total14: t14,
      total13: t13,
      total12: t12,
      total11: t11,
      concursosLucrativos: lucrativos,
      melhorConcurso: bestPoint,
    };
  }, [simulationData]);

  // Renderização D3 do Gráfico de Área & Linhas Acumuladas
  useEffect(() => {
    if (!svgRef.current || !containerRef.current || simulationData.length === 0) return;

    const containerWidth = containerRef.current.clientWidth || 800;
    const height = 360;
    const margin = { top: 30, right: 40, bottom: 45, left: 65 };
    const width = containerWidth - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    svg.attr('viewBox', `0 0 ${containerWidth} ${height}`);

    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Escalas
    const xScale = d3
      .scaleLinear()
      .domain([1, simulationData.length])
      .range([0, width]);

    const maxVal = Math.max(
      d3.max(simulationData, (d) => Math.max(d.premioAcumulado, d.custoAcumulado)) || 100,
      100
    );

    const yScale = d3
      .scaleLinear()
      .domain([0, maxVal * 1.15])
      .range([innerHeight, 0])
      .nice();

    // Gradientes Defs
    const defs = svg.append('defs');

    // Gradiente Retorno Acumulado (Emerald)
    const returnGradient = defs
      .append('linearGradient')
      .attr('id', 'sim-return-grad')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');
    returnGradient.append('stop').attr('offset', '0%').attr('stop-color', '#10b981').attr('stop-opacity', 0.45);
    returnGradient.append('stop').attr('offset', '100%').attr('stop-color', '#10b981').attr('stop-opacity', 0.0);

    // Gradiente Custo Acumulado (Slate / Indigo)
    const costGradient = defs
      .append('linearGradient')
      .attr('id', 'sim-cost-grad')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');
    costGradient.append('stop').attr('offset', '0%').attr('stop-color', '#64748b').attr('stop-opacity', 0.25);
    costGradient.append('stop').attr('offset', '100%').attr('stop-color', '#64748b').attr('stop-opacity', 0.0);

    // Grid Horizontal
    g.append('g')
      .attr('class', 'grid')
      .call(
        d3
          .axisLeft(yScale)
          .ticks(5)
          .tickSize(-width)
          .tickFormat(() => '')
      )
      .selectAll('line')
      .attr('stroke', '#334155')
      .attr('stroke-dasharray', '3,3')
      .attr('stroke-opacity', 0.4);

    // Áreas
    const returnArea = d3
      .area<ConcursoSimuladoPoint>()
      .x((d) => xScale(d.index))
      .y0(innerHeight)
      .y1((d) => yScale(d.premioAcumulado))
      .curve(d3.curveMonotoneX);

    g.append('path')
      .datum(simulationData)
      .attr('fill', 'url(#sim-return-grad)')
      .attr('d', returnArea);

    // Linha de Custo (Tracejada)
    const costLine = d3
      .line<ConcursoSimuladoPoint>()
      .x((d) => xScale(d.index))
      .y((d) => yScale(d.custoAcumulado))
      .curve(d3.curveLinear);

    g.append('path')
      .datum(simulationData)
      .attr('fill', 'none')
      .attr('stroke', '#94a3b8')
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '4,4')
      .attr('d', costLine);

    // Linha de Retorno (Sólida Esmeralda)
    const returnLine = d3
      .line<ConcursoSimuladoPoint>()
      .x((d) => xScale(d.index))
      .y((d) => yScale(d.premioAcumulado))
      .curve(d3.curveMonotoneX);

    g.append('path')
      .datum(simulationData)
      .attr('fill', 'none')
      .attr('stroke', '#10b981')
      .attr('stroke-width', 2.5)
      .attr('d', returnLine);

    // Eixo X
    const xAxis = d3
      .axisBottom(xScale)
      .ticks(Math.min(simulationData.length, 10))
      .tickFormat((d) => {
        const pt = simulationData[Number(d) - 1];
        return pt ? `#${pt.concurso}` : '';
      });

    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(xAxis)
      .attr('color', '#64748b')
      .selectAll('text')
      .attr('fill', '#94a3b8')
      .attr('font-size', '10px');

    // Eixo Y
    const yAxis = d3
      .axisLeft(yScale)
      .ticks(6)
      .tickFormat((d) => `R$ ${d3.format(',.0f')(Number(d))}`);

    g.append('g')
      .call(yAxis)
      .attr('color', '#64748b')
      .selectAll('text')
      .attr('fill', '#94a3b8')
      .attr('font-size', '10px');

    // Pontos Interativos (com destaque para acertos de 14 ou 13 pontos)
    const dots = g
      .selectAll('.dot-point')
      .data(simulationData)
      .enter()
      .append('g')
      .attr('class', 'dot-point');

    dots
      .append('circle')
      .attr('cx', (d) => xScale(d.index))
      .attr('cy', (d) => yScale(d.premioAcumulado))
      .attr('r', (d) => (d.acertos14 > 0 ? 6 : d.acertos13 > 0 ? 4.5 : 3))
      .attr('fill', (d) => (d.acertos14 > 0 ? '#fbbf24' : d.acertos13 > 0 ? '#38bdf8' : '#10b981'))
      .attr('stroke', '#0f172a')
      .attr('stroke-width', 1.5)
      .attr('cursor', 'pointer')
      .on('mouseenter', (_, d) => setActiveTooltip(d));

    // Overlay transparente para captura de mouse suave
    g.append('rect')
      .attr('width', width)
      .attr('height', innerHeight)
      .attr('fill', 'transparent')
      .on('mousemove', (event) => {
        const [mx] = d3.pointer(event);
        const idx = Math.max(1, Math.min(simulationData.length, Math.round(xScale.invert(mx))));
        const pt = simulationData[idx - 1];
        if (pt) setActiveTooltip(pt);
      })
      .on('mouseleave', () => setActiveTooltip(null));
  }, [simulationData]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-2xl backdrop-blur-md">
      {/* Header do Simulador */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                Simulador Histórico com D3.js (10 a 50 Concursos)
                <span className="px-2 py-0.5 text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded">
                  Backtesting Real CEF
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Simula o desempenho exato do fechamento {fechamentoNome} contra o histórico oficial
              </p>
            </div>
          </div>
        </div>

        {/* Seletor do Intervalo */}
        <div className="flex items-center gap-1.5 bg-slate-800/80 p-1 rounded-lg border border-slate-700">
          <Calendar className="w-3.5 h-3.5 text-slate-400 ml-2" />
          <span className="text-xs text-slate-400 mr-1">Histórico:</span>
          {[10, 20, 30, 40, 50].map((sz) => (
            <button
              key={sz}
              type="button"
              onClick={() => setRangeSize(sz)}
              className={`px-2.5 py-1 text-xs font-semibold rounded transition-all ${
                rangeSize === sz
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-300 hover:bg-slate-700 hover:text-white'
              }`}
            >
              {sz} jogos
            </button>
          ))}
        </div>
      </div>

      {/* Cards de Métricas Principais */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
        <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-700/80">
          <span className="text-[11px] text-slate-400 flex items-center gap-1">
            <DollarSign className="w-3 h-3 text-slate-400" />
            Total Apostado ({rangeSize} sorteios)
          </span>
          <div className="text-lg font-bold text-slate-200 mt-1">
            R$ {metrics.totalInvestido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[10px] text-slate-400">
            {activeTickets.length} apostas × R$ 3,50 / concurso
          </span>
        </div>

        <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-700/80">
          <span className="text-[11px] text-slate-400 flex items-center gap-1">
            <Award className="w-3 h-3 text-emerald-400" />
            Total Resgatado em Prêmios
          </span>
          <div className="text-lg font-bold text-emerald-400 mt-1">
            R$ {metrics.totalResgatado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[10px] text-emerald-300/80">
            {metrics.concursosLucrativos} sorteios com premiação líquida positiva
          </span>
        </div>

        <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-700/80">
          <span className="text-[11px] text-slate-400 flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-amber-400" />
            ROI Histórico Acumulado
          </span>
          <div className={`text-lg font-bold mt-1 ${metrics.saldoLiquido >= 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
            {metrics.roiGeral >= 0 ? `+${metrics.roiGeral}%` : `${metrics.roiGeral}%`}
          </div>
          <span className="text-[10px] text-slate-400">
            Saldo: R$ {metrics.saldoLiquido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </span>
        </div>

        <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-700/80">
          <span className="text-[11px] text-slate-400 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-400" />
            Faixas de Destaque Atingidas
          </span>
          <div className="text-xs font-bold text-slate-200 mt-1.5 flex items-center gap-2">
            <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
              {metrics.total14}x 14 pts
            </span>
            <span className="px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30">
              {metrics.total13}x 13 pts
            </span>
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">
            {metrics.total12}x 12 pts • {metrics.total11}x 11 pts
          </span>
        </div>
      </div>

      {/* Área do Gráfico D3 */}
      <div ref={containerRef} className="relative mt-4 bg-slate-950/60 rounded-lg p-2 border border-slate-800">
        <svg ref={svgRef} className="w-full h-auto overflow-visible" />

        {/* Tooltip Dinâmico em Hover */}
        {activeTooltip && (
          <div className="absolute top-4 right-4 bg-slate-900/95 border border-emerald-500/40 rounded-lg p-3 shadow-2xl backdrop-blur-md pointer-events-none text-xs min-w-[210px] z-20">
            <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 mb-1.5">
              <span className="font-bold text-white">Concurso #{activeTooltip.concurso}</span>
              <span className="text-[11px] text-slate-400">{activeTooltip.data}</span>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-400">Prêmio no Concurso:</span>
                <span className="font-bold text-emerald-400">
                  R$ {activeTooltip.premioConcurso.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Custo Acumulado:</span>
                <span className="text-slate-300">
                  R$ {activeTooltip.custoAcumulado.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Retorno Acumulado:</span>
                <span className="font-bold text-emerald-400">
                  R$ {activeTooltip.premioAcumulado.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between border-t border-slate-800/80 pt-1">
                <span className="text-slate-400">ROI Acumulado:</span>
                <span className={`font-bold ${activeTooltip.roiAcumulado >= 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {activeTooltip.roiAcumulado >= 0 ? `+${activeTooltip.roiAcumulado}%` : `${activeTooltip.roiAcumulado}%`}
                </span>
              </div>
              <div className="border-t border-slate-800/80 pt-1 text-[11px] text-slate-300 flex justify-between">
                <span>Maior acerto:</span>
                <span className="font-bold text-amber-300">{activeTooltip.maiorAcerto} pontos</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Legenda e Observações Técnicas */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400 mt-3 pt-3 border-t border-slate-800">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-emerald-500 rounded-full" />
            <span>Retorno Financeiro Acumulado (R$)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 border-b border-dashed border-slate-400" />
            <span>Custo Total dos Volantes (R$)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span>Ponto com 14 Pontos</span>
          </div>
        </div>

        <div className="text-[11px] text-slate-400 flex items-center gap-1">
          <Info className="w-3.5 h-3.5 text-slate-500" />
          <span>Calculado com tabela e rateios oficiais Caixa Econômica Federal</span>
        </div>
      </div>
    </div>
  );
};
