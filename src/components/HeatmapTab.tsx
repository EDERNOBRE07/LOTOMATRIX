import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import { LotofacilDraw } from '../types/lotofacil';
import { CONCURSO_ATUAL, MOLDURA, PRIMOS } from '../data/lotofacilData';
import { getHistorical100Draws } from '../services/historical100Draws';
import { predictDezenaWeightsLogistic } from '../services/aiEngine';
import {
  Grid3X3,
  TrendingUp,
  ArrowRight,
  RotateCcw,
  Plus,
  Check,
  Share2,
} from 'lucide-react';

interface HeatmapTabProps {
  latestDraw?: LotofacilDraw;
  onSendToFechamento?: (selectedNumbers: number[]) => void;
}

interface PairMetric {
  a: number;
  b: number;
  coOccurrence: number;
  jointPct: number;
  pBGivenA: number;
  pAGivenB: number;
  conditionalAffinityPct: number; // Média condicional: (P(B|A) + P(A|B)) / 2
  mutualMinPct: number; // Mínimo bilateral: min(P(B|A), P(A|B))
  correlation: number; // Pearson phi in [-1, 1]
}

interface CorrelationCluster {
  id: number;
  name: string;
  color: string;
  members: number[];
  avgAffinityPct: number;
  internalPairsCount: number;
  strongestPair: PairMetric | null;
}

interface NumberFreqSummary {
  dezena: number;
  count: number;
  pct: number;
  cumulativeSeries: number[]; // length = drawsCount
  logisticScore: number;
  isMoldura: boolean;
  isPrimo: boolean;
  inLatest: boolean;
}

const MOLDURA_SET = new Set(MOLDURA);
const PRIMOS_SET = new Set(PRIMOS);

const CLUSTER_COLORS = ['#38bdf8', '#34d399', '#fbbf24', '#a78bfa', '#fb7185', '#2dd4bf'];

export const HeatmapTab: React.FC<HeatmapTabProps> = ({
  latestDraw = CONCURSO_ATUAL,
  onSendToFechamento,
}) => {
  const [matrixMode, setMatrixMode] = useState<'correlacao' | 'coocorrencia'>('correlacao');
  const [freqSortMode, setFreqSortMode] = useState<'numero' | 'frequencia'>('frequencia');
  const [clusterThreshold, setClusterThreshold] = useState<60 | 65 | 70>(60);
  const [clusterMetricMode, setClusterMetricMode] = useState<'media' | 'bilateral'>('media');
  const [hoveredClusterNode, setHoveredClusterNode] = useState<number | null>(null);
  const [hoveredClusterLink, setHoveredClusterLink] = useState<PairMetric | null>(null);
  const [focusedNumber, setFocusedNumber] = useState<number>(13);
  const [hoveredCell, setHoveredCell] = useState<{
    row: number;
    col: number;
    coOccurrence: number;
    correlation: number;
  } | null>(null);
  const [manualSelection, setManualSelection] = useState<number[]>([]);
  const [sentNotice, setSentNotice] = useState<boolean>(false);

  const freqSvgRef = useRef<SVGSVGElement | null>(null);
  const cumulativeSvgRef = useRef<SVGSVGElement | null>(null);
  const matrixSvgRef = useRef<SVGSVGElement | null>(null);
  const clusterSvgRef = useRef<SVGSVGElement | null>(null);

  // Últimos 100 concursos em ordem cronológica crescente para frequência acumulada e correlação
  const analytics = useMemo(() => {
    const draws100Desc = getHistorical100Draws(latestDraw);
    const draws100Asc = [...draws100Desc].sort((a, b) => a.concurso - b.concurso);
    const N = draws100Asc.length || 1;
    const latestSet = new Set(latestDraw.dezenas);

    const logistic = predictDezenaWeightsLogistic(latestDraw, draws100Desc);

    // Presença binária [25][N]
    const presence: number[][] = Array.from({ length: 25 }, () => new Array<number>(N).fill(0));
    const counts = new Array<number>(25).fill(0);
    const cumulative: number[][] = Array.from({ length: 25 }, () => new Array<number>(N).fill(0));

    for (let t = 0; t < N; t++) {
      const drawSet = new Set(draws100Asc[t].dezenas);
      for (let d = 0; d < 25; d++) {
        const hit = drawSet.has(d + 1) ? 1 : 0;
        presence[d][t] = hit;
        counts[d] += hit;
        cumulative[d][t] = counts[d];
      }
    }

    // Matriz 25x25 de co-ocorrência e correlação de Pearson (phi)
    const coMatrix: number[][] = Array.from({ length: 25 }, () => new Array<number>(25).fill(0));
    const corrMatrix: number[][] = Array.from({ length: 25 }, () => new Array<number>(25).fill(0));
    const topPairs: PairMetric[] = [];

    for (let i = 0; i < 25; i++) {
      const meanI = counts[i] / N;
      const varI = meanI * (1 - meanI);

      for (let j = i; j < 25; j++) {
        let both = 0;
        for (let t = 0; t < N; t++) {
          if (presence[i][t] === 1 && presence[j][t] === 1) both++;
        }
        coMatrix[i][j] = both;
        coMatrix[j][i] = both;

        if (i === j) {
          corrMatrix[i][j] = 1;
        } else {
          const meanJ = counts[j] / N;
          const varJ = meanJ * (1 - meanJ);
          const denom = Math.sqrt(varI * varJ);
          const cov = both / N - meanI * meanJ;
          const phi = denom > 1e-8 ? cov / denom : 0;
          const rounded = Number(phi.toFixed(3));
          corrMatrix[i][j] = rounded;
          corrMatrix[j][i] = rounded;
          const pBGivenA = counts[i] > 0 ? (both / counts[i]) * 100 : 0;
          const pAGivenB = counts[j] > 0 ? (both / counts[j]) * 100 : 0;
          const conditionalAffinityPct = Number((((pBGivenA + pAGivenB) / 2)).toFixed(1));
          const mutualMinPct = Number(Math.min(pBGivenA, pAGivenB).toFixed(1));
          const jointPct = Number(((both / N) * 100).toFixed(1));
          topPairs.push({
            a: i + 1,
            b: j + 1,
            coOccurrence: both,
            jointPct,
            pBGivenA: Number(pBGivenA.toFixed(1)),
            pAGivenB: Number(pAGivenB.toFixed(1)),
            conditionalAffinityPct,
            mutualMinPct,
            correlation: rounded,
          });
        }
      }
    }

    const pairsByAffinity = [...topPairs].sort(
      (p1, p2) =>
        p2.conditionalAffinityPct - p1.conditionalAffinityPct ||
        p2.correlation - p1.correlation ||
        p2.coOccurrence - p1.coOccurrence
    );
    topPairs.sort((p1, p2) => p2.correlation - p1.correlation || p2.coOccurrence - p1.coOccurrence);

    const freqList: NumberFreqSummary[] = Array.from({ length: 25 }, (_, i) => ({
      dezena: i + 1,
      count: counts[i],
      pct: Number(((counts[i] / N) * 100).toFixed(1)),
      cumulativeSeries: cumulative[i],
      logisticScore: logistic.scores[i] ?? 50,
      isMoldura: MOLDURA_SET.has(i + 1),
      isPrimo: PRIMOS_SET.has(i + 1),
      inLatest: latestSet.has(i + 1),
    }));

    const sortedByFreq = [...freqList].sort((a, b) => b.count - a.count || a.dezena - b.dezena);

    return {
      drawsCount: N,
      firstConcurso: draws100Asc[0]?.concurso ?? latestDraw.concurso - 99,
      lastConcurso: draws100Asc[N - 1]?.concurso ?? latestDraw.concurso,
      freqList,
      sortedByFreq,
      coMatrix,
      corrMatrix,
      allPairs: topPairs,
      pairsByAffinity,
      topPositivePairs: topPairs.slice(0, 8),
      topNegativePairs: [...topPairs].reverse().slice(0, 5),
      hottest: sortedByFreq[0],
      coldest: sortedByFreq[sortedByFreq.length - 1],
    };
  }, [latestDraw]);

  // Detecção determinística de Clusters de Correlação (>60% de frequência conjunta condicional)
  const clusterAnalysis = useMemo(() => {
    const getScore = (p: PairMetric) =>
      clusterMetricMode === 'bilateral' ? p.mutualMinPct : p.conditionalAffinityPct;

    const qualifyingPairs = analytics.pairsByAffinity
      .filter((p) => getScore(p) > clusterThreshold)
      .sort((a, b) => getScore(b) - getScore(a) || b.correlation - a.correlation);

    // Mapeia adjacências ponderadas para particionamento em clusters coesos (até 5 dezenas/cluster)
    const adj = new Map<number, Map<number, PairMetric>>();
    for (const pair of qualifyingPairs) {
      if (!adj.has(pair.a)) adj.set(pair.a, new Map());
      if (!adj.has(pair.b)) adj.set(pair.b, new Map());
      adj.get(pair.a)!.set(pair.b, pair);
      adj.get(pair.b)!.set(pair.a, pair);
    }

    const unassigned = new Set<number>(Array.from(adj.keys()));
    const clusters: CorrelationCluster[] = [];
    const nodeClusterMap = new Map<number, number>();
    const MAX_CLUSTER_SIZE = 5;

    for (const seedPair of qualifyingPairs) {
      if (clusters.length >= CLUSTER_COLORS.length) break;
      if (!unassigned.has(seedPair.a) || !unassigned.has(seedPair.b)) continue;

      const members = [seedPair.a, seedPair.b];
      unassigned.delete(seedPair.a);
      unassigned.delete(seedPair.b);

      // Expande o cluster adicionando dezenas com maior afinidade média com os membros atuais
      while (members.length < MAX_CLUSTER_SIZE) {
        let bestCandidate = -1;
        let bestAvgScore = -1;

        for (const cand of unassigned) {
          const candEdges = adj.get(cand);
          if (!candEdges) continue;
          let sumScore = 0;
          let linkedCount = 0;
          for (const m of members) {
            const edge = candEdges.get(m);
            if (edge) {
              sumScore += getScore(edge);
              linkedCount++;
            }
          }
          // Exige conexão forte com pelo menos metade dos membros do cluster
          const minLinks = Math.max(1, Math.ceil(members.length * 0.5));
          if (linkedCount >= minLinks) {
            const avg = sumScore / linkedCount;
            if (avg > bestAvgScore) {
              bestAvgScore = avg;
              bestCandidate = cand;
            }
          }
        }

        if (bestCandidate === -1) break;
        members.push(bestCandidate);
        unassigned.delete(bestCandidate);
      }

      members.sort((x, y) => x - y);
      const internalPairs = qualifyingPairs.filter(
        (p) => members.includes(p.a) && members.includes(p.b)
      );
      const avgAffinityPct =
        internalPairs.length > 0
          ? Number(
              (
                internalPairs.reduce((acc, p) => acc + getScore(p), 0) /
                internalPairs.length
              ).toFixed(1)
            )
          : getScore(seedPair);

      const clusterId = clusters.length;
      for (const m of members) {
        nodeClusterMap.set(m, clusterId);
      }

      clusters.push({
        id: clusterId,
        name: `Cluster ${String.fromCharCode(65 + clusterId)}`,
        color: CLUSTER_COLORS[clusterId % CLUSTER_COLORS.length],
        members,
        avgAffinityPct,
        internalPairsCount: internalPairs.length,
        strongestPair: internalPairs[0] ?? seedPair,
      });
    }

    // Dezenas remanescentes com arestas >threshold entram no cluster de maior afinidade conectada
    for (const leftover of Array.from(unassigned)) {
      const edges = adj.get(leftover);
      if (!edges || clusters.length === 0) continue;
      let bestClusterId = -1;
      let bestScore = -1;
      for (const [neighbor, pair] of edges.entries()) {
        const cId = nodeClusterMap.get(neighbor);
        if (cId !== undefined && getScore(pair) > bestScore) {
          bestScore = getScore(pair);
          bestClusterId = cId;
        }
      }
      if (bestClusterId !== -1) {
        nodeClusterMap.set(leftover, bestClusterId);
      }
    }

    const activeNumbers = Array.from(adj.keys()).sort((a, b) => a - b);
    // Limita arestas exibidas no grafo para clareza visual (mantendo todas internas dos clusters + top globais)
    const internalKeys = new Set<string>();
    const graphLinks: PairMetric[] = [];
    for (const pair of qualifyingPairs) {
      const cA = nodeClusterMap.get(pair.a);
      const cB = nodeClusterMap.get(pair.b);
      const isInternal = cA !== undefined && cA === cB;
      const key = `${pair.a}-${pair.b}`;
      if (isInternal) {
        internalKeys.add(key);
        graphLinks.push(pair);
      }
    }
    for (const pair of qualifyingPairs) {
      if (graphLinks.length >= 42) break;
      const key = `${pair.a}-${pair.b}`;
      if (!internalKeys.has(key)) {
        graphLinks.push(pair);
      }
    }

    return {
      qualifyingPairs,
      clusters,
      nodeClusterMap,
      activeNumbers,
      graphLinks,
      getScore,
    };
  }, [analytics, clusterThreshold, clusterMetricMode]);

  const toggleManualNumber = (num: number) => {
    setManualSelection((prev) => {
      if (prev.includes(num)) return prev.filter((n) => n !== num);
      if (prev.length >= 21) return prev;
      return [...prev, num].sort((a, b) => a - b);
    });
  };

  const addPairToSelection = (a: number, b: number) => {
    setManualSelection((prev) => {
      const next = new Set(prev);
      if (next.size < 21) next.add(a);
      if (next.size < 21) next.add(b);
      return Array.from(next).sort((x, y) => x - y);
    });
  };

  const addClusterToSelection = (members: number[]) => {
    setManualSelection((prev) => {
      const next = new Set(prev);
      for (const n of members) {
        if (next.size >= 21) break;
        next.add(n);
      }
      return Array.from(next).sort((x, y) => x - y);
    });
  };

  const selectTop18ByFreqAndCorr = () => {
    const top18 = analytics.sortedByFreq
      .slice(0, 18)
      .map((item) => item.dezena)
      .sort((a, b) => a - b);
    setManualSelection(top18);
  };

  const handleSendManualPool = () => {
    if (manualSelection.length < 15) return;
    try {
      localStorage.setItem('lotosniper_selected_numbers', JSON.stringify(manualSelection));
    } catch {}
    onSendToFechamento?.(manualSelection);
    setSentNotice(true);
    window.setTimeout(() => setSentNotice(false), 3000);
  };

  // D3 Render 1: Gráfico de Barras de Frequência Acumulada (100 concursos)
  useEffect(() => {
    const svgEl = freqSvgRef.current;
    if (!svgEl) return;

    const data =
      freqSortMode === 'frequencia' ? analytics.sortedByFreq : analytics.freqList;

    const width = 760;
    const height = 230;
    const margin = { top: 20, right: 16, bottom: 34, left: 38 };
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    const svg = d3.select(svgEl);
    svg.selectAll('*').remove();
    svg.attr('viewBox', `0 0 ${width} ${height}`);

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const x = d3
      .scaleBand<string>()
      .domain(data.map((d) => String(d.dezena).padStart(2, '0')))
      .range([0, innerW])
      .padding(0.22);

    const maxCount = Math.max(75, d3.max(data, (d) => d.count) ?? 75);
    const minCount = Math.max(0, (d3.min(data, (d) => d.count) ?? 40) - 8);

    const y = d3.scaleLinear().domain([minCount, maxCount]).nice().range([innerH, 0]);

    const colorScale = d3
      .scaleSequential(d3.interpolateYlGnBu)
      .domain([minCount, maxCount]);

    // Horizontal grid lines
    g.append('g')
      .attr('class', 'grid')
      .call(
        d3
          .axisLeft(y)
          .ticks(5)
          .tickSize(-innerW)
          .tickFormat(() => '')
      )
      .call((sel) => sel.select('.domain').remove())
      .call((sel) => sel.selectAll('line').attr('stroke', '#1e293b').attr('stroke-dasharray', '2,3'));

    // Theoretical expectation line (60% of draws = 60 in 100 contests)
    const expectedLine = analytics.drawsCount * 0.6;
    if (expectedLine >= minCount && expectedLine <= maxCount) {
      g.append('line')
        .attr('x1', 0)
        .attr('x2', innerW)
        .attr('y1', y(expectedLine))
        .attr('y2', y(expectedLine))
        .attr('stroke', '#f59e0b')
        .attr('stroke-width', 1.25)
        .attr('stroke-dasharray', '5,4');

      g.append('text')
        .attr('x', innerW - 4)
        .attr('y', y(expectedLine) - 5)
        .attr('text-anchor', 'end')
        .attr('fill', '#fbbf24')
        .attr('font-size', 10)
        .attr('font-family', 'ui-monospace, SFMono-Regular, Menlo, monospace')
        .text(`Média teórica (${expectedLine.toFixed(0)})`);
    }

    // Bars
    g.selectAll('rect.freq-bar')
      .data(data)
      .enter()
      .append('rect')
      .attr('class', 'freq-bar')
      .attr('x', (d) => x(String(d.dezena).padStart(2, '0')) ?? 0)
      .attr('y', (d) => y(d.count))
      .attr('width', x.bandwidth())
      .attr('height', (d) => Math.max(2, innerH - y(d.count)))
      .attr('rx', 3)
      .attr('fill', (d) =>
        manualSelection.includes(d.dezena)
          ? '#10b981'
          : d.dezena === focusedNumber
          ? '#38bdf8'
          : colorScale(d.count)
      )
      .attr('stroke', (d) =>
        d.dezena === focusedNumber
          ? '#e0f2fe'
          : manualSelection.includes(d.dezena)
          ? '#6ee7b7'
          : 'transparent'
      )
      .attr('stroke-width', (d) =>
        d.dezena === focusedNumber || manualSelection.includes(d.dezena) ? 1.5 : 0
      )
      .style('cursor', 'pointer')
      .on('mouseenter', (_event, d) => setFocusedNumber(d.dezena))
      .on('click', (_event, d) => {
        setFocusedNumber(d.dezena);
        toggleManualNumber(d.dezena);
      });

    // Value labels above bars
    g.selectAll('text.bar-val')
      .data(data)
      .enter()
      .append('text')
      .attr('class', 'bar-val')
      .attr('x', (d) => (x(String(d.dezena).padStart(2, '0')) ?? 0) + x.bandwidth() / 2)
      .attr('y', (d) => y(d.count) - 4)
      .attr('text-anchor', 'middle')
      .attr('fill', (d) => (d.dezena === focusedNumber ? '#f8fafc' : '#94a3b8'))
      .attr('font-size', 9.5)
      .attr('font-family', 'ui-monospace, SFMono-Regular, Menlo, monospace')
      .text((d) => d.count);

    // X Axis
    g.append('g')
      .attr('transform', `translate(0,${innerH})`)
      .call(d3.axisBottom(x).tickSizeOuter(0))
      .call((sel) => sel.select('.domain').attr('stroke', '#334155'))
      .call((sel) => sel.selectAll('line').attr('stroke', '#334155'))
      .call((sel) =>
        sel
          .selectAll('text')
          .attr('fill', '#cbd5e1')
          .attr('font-size', 10)
          .attr('font-family', 'ui-monospace, SFMono-Regular, Menlo, monospace')
      );

    // Y Axis
    g.append('g')
      .call(d3.axisLeft(y).ticks(5))
      .call((sel) => sel.select('.domain').attr('stroke', '#334155'))
      .call((sel) => sel.selectAll('line').attr('stroke', '#334155'))
      .call((sel) =>
        sel
          .selectAll('text')
          .attr('fill', '#94a3b8')
          .attr('font-size', 10)
          .attr('font-family', 'ui-monospace, SFMono-Regular, Menlo, monospace')
      );
  }, [analytics, freqSortMode, focusedNumber, manualSelection]);

  // D3 Render 2: Curva de Frequência Acumulada (100 concursos) para a dezena em foco
  useEffect(() => {
    const svgEl = cumulativeSvgRef.current;
    if (!svgEl) return;

    const target = analytics.freqList[focusedNumber - 1];
    if (!target) return;

    const series = target.cumulativeSeries;
    const N = series.length;

    const width = 420;
    const height = 190;
    const margin = { top: 18, right: 16, bottom: 28, left: 36 };
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    const svg = d3.select(svgEl);
    svg.selectAll('*').remove();
    svg.attr('viewBox', `0 0 ${width} ${height}`);

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const x = d3.scaleLinear().domain([1, N]).range([0, innerW]);
    const maxY = Math.max(Math.ceil(N * 0.65), series[N - 1] || 60) + 4;
    const y = d3.scaleLinear().domain([0, maxY]).range([innerH, 0]);

    // Grid
    g.append('g')
      .call(
        d3
          .axisLeft(y)
          .ticks(4)
          .tickSize(-innerW)
          .tickFormat(() => '')
      )
      .call((sel) => sel.select('.domain').remove())
      .call((sel) => sel.selectAll('line').attr('stroke', '#1e293b').attr('stroke-dasharray', '2,3'));

    // Theoretical cumulative baseline (0.6 * k)
    const baselineLine = d3
      .line<number>()
      .x((_d, i) => x(i + 1))
      .y((_d, i) => y((i + 1) * 0.6));

    g.append('path')
      .datum(series)
      .attr('fill', 'none')
      .attr('stroke', '#64748b')
      .attr('stroke-width', 1.25)
      .attr('stroke-dasharray', '4,4')
      .attr('d', baselineLine);

    // Observed cumulative curve
    const actualLine = d3
      .line<number>()
      .x((_d, i) => x(i + 1))
      .y((d) => y(d));

    g.append('path')
      .datum(series)
      .attr('fill', 'none')
      .attr('stroke', '#38bdf8')
      .attr('stroke-width', 2.2)
      .attr('d', actualLine);

    // End dot
    g.append('circle')
      .attr('cx', x(N))
      .attr('cy', y(series[N - 1] ?? 0))
      .attr('r', 3.5)
      .attr('fill', '#38bdf8');

    // Axes
    g.append('g')
      .attr('transform', `translate(0,${innerH})`)
      .call(d3.axisBottom(x).ticks(5).tickFormat((d) => `#${d}`))
      .call((sel) => sel.select('.domain').attr('stroke', '#334155'))
      .call((sel) => sel.selectAll('line').attr('stroke', '#334155'))
      .call((sel) =>
        sel
          .selectAll('text')
          .attr('fill', '#94a3b8')
          .attr('font-size', 9.5)
          .attr('font-family', 'ui-monospace, SFMono-Regular, Menlo, monospace')
      );

    g.append('g')
      .call(d3.axisLeft(y).ticks(4))
      .call((sel) => sel.select('.domain').attr('stroke', '#334155'))
      .call((sel) => sel.selectAll('line').attr('stroke', '#334155'))
      .call((sel) =>
        sel
          .selectAll('text')
          .attr('fill', '#94a3b8')
          .attr('font-size', 9.5)
          .attr('font-family', 'ui-monospace, SFMono-Regular, Menlo, monospace')
      );
  }, [analytics, focusedNumber]);

  // D3 Render 3: Matriz Heatmap 25x25 de Correlação / Co-ocorrência
  useEffect(() => {
    const svgEl = matrixSvgRef.current;
    if (!svgEl) return;

    const labels = Array.from({ length: 25 }, (_, i) => String(i + 1).padStart(2, '0'));
    const size = 610;
    const margin = { top: 28, right: 16, bottom: 16, left: 28 };
    const inner = size - margin.left - margin.right;

    const svg = d3.select(svgEl);
    svg.selectAll('*').remove();
    svg.attr('viewBox', `0 0 ${size} ${size}`);

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const band = d3.scaleBand<string>().domain(labels).range([0, inner]).padding(0.06);

    const corrColor = d3
      .scaleDiverging<string>(d3.interpolateRdBu)
      .domain([-0.32, 0, 0.32]);

    const coValues: number[] = [];
    for (let i = 0; i < 25; i++) {
      for (let j = 0; j < 25; j++) {
        if (i !== j) coValues.push(analytics.coMatrix[i][j]);
      }
    }
    const minCo = d3.min(coValues) ?? 20;
    const maxCo = d3.max(coValues) ?? 55;
    const coColor = d3.scaleSequential(d3.interpolateYlGnBu).domain([minCo, maxCo]);

    interface CellDatum {
      row: number;
      col: number;
      coOccurrence: number;
      correlation: number;
    }

    const cells: CellDatum[] = [];
    for (let r = 0; r < 25; r++) {
      for (let c = 0; c < 25; c++) {
        cells.push({
          row: r + 1,
          col: c + 1,
          coOccurrence: analytics.coMatrix[r][c],
          correlation: analytics.corrMatrix[r][c],
        });
      }
    }

    // Column labels (top)
    g.selectAll('text.col-lbl')
      .data(labels)
      .enter()
      .append('text')
      .attr('class', 'col-lbl')
      .attr('x', (d) => (band(d) ?? 0) + band.bandwidth() / 2)
      .attr('y', -8)
      .attr('text-anchor', 'middle')
      .attr('fill', (_d, idx) =>
        hoveredCell && hoveredCell.col === idx + 1 ? '#f8fafc' : '#94a3b8'
      )
      .attr('font-size', 9.5)
      .attr('font-weight', (_d, idx) =>
        hoveredCell && hoveredCell.col === idx + 1 ? '700' : '500'
      )
      .attr('font-family', 'ui-monospace, SFMono-Regular, Menlo, monospace')
      .text((d) => d);

    // Row labels (left)
    g.selectAll('text.row-lbl')
      .data(labels)
      .enter()
      .append('text')
      .attr('class', 'row-lbl')
      .attr('x', -6)
      .attr('y', (d) => (band(d) ?? 0) + band.bandwidth() / 2 + 3)
      .attr('text-anchor', 'end')
      .attr('fill', (_d, idx) =>
        hoveredCell && hoveredCell.row === idx + 1 ? '#f8fafc' : '#94a3b8'
      )
      .attr('font-size', 9.5)
      .attr('font-weight', (_d, idx) =>
        hoveredCell && hoveredCell.row === idx + 1 ? '700' : '500'
      )
      .attr('font-family', 'ui-monospace, SFMono-Regular, Menlo, monospace')
      .text((d) => d);

    // Matrix cells
    g.selectAll('rect.hm-cell')
      .data(cells)
      .enter()
      .append('rect')
      .attr('class', 'hm-cell')
      .attr('x', (d) => band(String(d.col).padStart(2, '0')) ?? 0)
      .attr('y', (d) => band(String(d.row).padStart(2, '0')) ?? 0)
      .attr('width', band.bandwidth())
      .attr('height', band.bandwidth())
      .attr('rx', 2)
      .attr('fill', (d) => {
        if (d.row === d.col) return '#0f172a';
        if (matrixMode === 'correlacao') {
          return corrColor(Math.max(-0.32, Math.min(0.32, d.correlation)));
        }
        return coColor(d.coOccurrence);
      })
      .attr('stroke', (d) => {
        if (hoveredCell && hoveredCell.row === d.row && hoveredCell.col === d.col) {
          return '#f8fafc';
        }
        if (d.row === d.col) return '#334155';
        return 'none';
      })
      .attr('stroke-width', (d) =>
        hoveredCell && hoveredCell.row === d.row && hoveredCell.col === d.col ? 1.8 : 0.75
      )
      .style('cursor', 'pointer')
      .on('mouseenter', (_event, d) => {
        setHoveredCell(d);
        setFocusedNumber(d.row);
      })
      .on('click', (_event, d) => {
        if (d.row === d.col) {
          toggleManualNumber(d.row);
        } else {
          addPairToSelection(d.row, d.col);
        }
      });

    // Diagonal frequency number inside diagonal cells
    g.selectAll('text.diag-val')
      .data(cells.filter((c) => c.row === c.col))
      .enter()
      .append('text')
      .attr('class', 'diag-val')
      .attr('x', (d) => (band(String(d.col).padStart(2, '0')) ?? 0) + band.bandwidth() / 2)
      .attr('y', (d) => (band(String(d.row).padStart(2, '0')) ?? 0) + band.bandwidth() / 2 + 3)
      .attr('text-anchor', 'middle')
      .attr('fill', '#cbd5e1')
      .attr('font-size', 8.5)
      .attr('font-family', 'ui-monospace, SFMono-Regular, Menlo, monospace')
      .style('pointer-events', 'none')
      .text((d) => d.coOccurrence);
  }, [analytics, matrixMode, hoveredCell]);

  // D3 Render 4: Grafo Force-Directed de Cluster de Correlação (>60% nos últimos 100 concursos)
  useEffect(() => {
    const svgEl = clusterSvgRef.current;
    if (!svgEl) return;

    const width = 760;
    const height = 400;
    const svg = d3.select(svgEl);
    svg.selectAll('*').remove();
    svg.attr('viewBox', `0 0 ${width} ${height}`);

    const { clusters, nodeClusterMap, activeNumbers, graphLinks, getScore } = clusterAnalysis;
    if (activeNumbers.length === 0 || graphLinks.length === 0) {
      svg
        .append('text')
        .attr('x', width / 2)
        .attr('y', height / 2)
        .attr('text-anchor', 'middle')
        .attr('fill', '#94a3b8')
        .attr('font-size', 13)
        .text(`Nenhum par atingiu frequência superior a ${clusterThreshold}% neste critério.`);
      return;
    }

    interface ClusterNode extends d3.SimulationNodeDatum {
      id: number;
      clusterId: number;
      color: string;
      freqCount: number;
      isSelected: boolean;
      targetX: number;
      targetY: number;
    }

    interface ClusterLink extends d3.SimulationLinkDatum<ClusterNode> {
      pair: PairMetric;
      weight: number;
      sameCluster: boolean;
    }

    const totalClusters = Math.max(1, clusters.length);
    const clusterCentroids = clusters.map((c, idx) => {
      const angle = (idx / totalClusters) * Math.PI * 2 - Math.PI / 2;
      const rx = totalClusters === 1 ? 0 : 230;
      const ry = totalClusters === 1 ? 0 : 112;
      return {
        id: c.id,
        x: width / 2 + Math.cos(angle) * rx,
        y: height / 2 + Math.sin(angle) * ry,
      };
    });

    const nodes: ClusterNode[] = activeNumbers.map((num, idx) => {
      const cId = nodeClusterMap.get(num) ?? 0;
      const centroid = clusterCentroids[cId] ?? { x: width / 2, y: height / 2 };
      const jitterAngle = (idx * 2.39996) % (Math.PI * 2);
      return {
        id: num,
        clusterId: cId,
        color: CLUSTER_COLORS[cId % CLUSTER_COLORS.length],
        freqCount: analytics.freqList[num - 1]?.count ?? 50,
        isSelected: manualSelection.includes(num),
        targetX: centroid.x,
        targetY: centroid.y,
        x: centroid.x + Math.cos(jitterAngle) * 32,
        y: centroid.y + Math.sin(jitterAngle) * 32,
      };
    });

    const nodeById = new Map(nodes.map((n) => [n.id, n]));
    const links: ClusterLink[] = graphLinks
      .filter((p) => nodeById.has(p.a) && nodeById.has(p.b))
      .map((pair) => {
        const s = nodeById.get(pair.a)!;
        const t = nodeById.get(pair.b)!;
        return {
          source: s,
          target: t,
          pair,
          weight: getScore(pair),
          sameCluster: s.clusterId === t.clusterId,
        };
      });

    const simulation = d3
      .forceSimulation<ClusterNode>(nodes)
      .force(
        'link',
        d3
          .forceLink<ClusterNode, ClusterLink>(links)
          .id((d) => d.id)
          .distance((l) => (l.sameCluster ? 64 : 135))
          .strength((l) => (l.sameCluster ? 0.65 : 0.12))
      )
      .force('charge', d3.forceManyBody<ClusterNode>().strength(-140))
      .force('x', d3.forceX<ClusterNode>((d) => d.targetX).strength(0.32))
      .force('y', d3.forceY<ClusterNode>((d) => d.targetY).strength(0.36))
      .force('collide', d3.forceCollide<ClusterNode>(24))
      .stop();

    for (let i = 0; i < 220; i++) {
      simulation.tick();
    }

    // Clamp positions safely inside viewport padding
    const padX = 36;
    const padY = 36;
    for (const n of nodes) {
      n.x = Math.max(padX, Math.min(width - padX, n.x ?? width / 2));
      n.y = Math.max(padY, Math.min(height - padY, n.y ?? height / 2));
    }

    const root = svg.append('g');

    // Draw subtle convex hulls around clusters with >= 3 members
    const hullGroup = root.append('g').attr('class', 'cluster-hulls');
    clusters.forEach((cluster) => {
      const memberNodes = nodes.filter((n) => cluster.members.includes(n.id));
      if (memberNodes.length < 2) return;

      const cx = d3.mean(memberNodes, (n) => n.x ?? 0) ?? width / 2;
      const cy = d3.mean(memberNodes, (n) => n.y ?? 0) ?? height / 2;

      if (memberNodes.length >= 3) {
        const pts: [number, number][] = memberNodes.map((n) => [n.x ?? cx, n.y ?? cy]);
        const hull = d3.polygonHull(pts);
        if (hull) {
          const expanded = hull.map(([px, py]): [number, number] => {
            const vx = px - cx;
            const vy = py - cy;
            const len = Math.hypot(vx, vy) || 1;
            return [px + (vx / len) * 26, py + (vy / len) * 26];
          });
          const hullPath =
            d3
              .line<[number, number]>()
              .curve(d3.curveCardinalClosed.tension(0.65))(expanded) ?? '';

          hullGroup
            .append('path')
            .attr('d', hullPath)
            .attr('fill', cluster.color)
            .attr('fill-opacity', 0.07)
            .attr('stroke', cluster.color)
            .attr('stroke-opacity', 0.32)
            .attr('stroke-width', 1.2)
            .attr('stroke-dasharray', '4,3');
        }
      }

      const topY = d3.min(memberNodes, (n) => n.y ?? cy) ?? cy;
      hullGroup
        .append('text')
        .attr('x', cx)
        .attr('y', Math.max(16, topY - 28))
        .attr('text-anchor', 'middle')
        .attr('fill', cluster.color)
        .attr('font-size', 10.5)
        .attr('font-weight', '600')
        .attr('font-family', 'ui-monospace, SFMono-Regular, Menlo, monospace')
        .text(`${cluster.name} · ${cluster.avgAffinityPct.toFixed(1)}%`);
    });

    const maxWeight = d3.max(links, (l) => l.weight) ?? 75;
    const strokeScale = d3
      .scaleLinear()
      .domain([clusterThreshold, Math.max(clusterThreshold + 5, maxWeight)])
      .range([1.1, 3.6]);

    // Draw weighted links (>60% pairs)
    const linkSel = root
      .append('g')
      .selectAll('line.cluster-link')
      .data(links)
      .enter()
      .append('line')
      .attr('class', 'cluster-link')
      .attr('x1', (d) => (d.source as ClusterNode).x ?? 0)
      .attr('y1', (d) => (d.source as ClusterNode).y ?? 0)
      .attr('x2', (d) => (d.target as ClusterNode).x ?? 0)
      .attr('y2', (d) => (d.target as ClusterNode).y ?? 0)
      .attr('stroke', (d) => {
        const s = d.source as ClusterNode;
        return d.sameCluster ? s.color : '#64748b';
      })
      .attr('stroke-width', (d) => strokeScale(d.weight))
      .attr('stroke-opacity', (d) => {
        if (hoveredClusterLink) {
          return hoveredClusterLink.a === d.pair.a && hoveredClusterLink.b === d.pair.b
            ? 0.95
            : 0.12;
        }
        if (hoveredClusterNode !== null) {
          return d.pair.a === hoveredClusterNode || d.pair.b === hoveredClusterNode ? 0.92 : 0.1;
        }
        return d.sameCluster ? 0.52 : 0.18;
      })
      .style('cursor', 'pointer')
      .on('mouseenter', (_e, d) => {
        setHoveredClusterLink(d.pair);
        setHoveredClusterNode(null);
      })
      .on('mouseleave', () => {
        setHoveredClusterLink(null);
      })
      .on('click', (_e, d) => {
        addPairToSelection(d.pair.a, d.pair.b);
      });

    void linkSel;

    // Draw cluster nodes
    const minFreq = d3.min(nodes, (n) => n.freqCount) ?? 40;
    const maxFreq = d3.max(nodes, (n) => n.freqCount) ?? 70;
    const radiusScale = d3
      .scaleLinear()
      .domain([minFreq, Math.max(minFreq + 1, maxFreq)])
      .range([13, 18]);

    const connectedToHovered = new Set<number>();
    if (hoveredClusterNode !== null) {
      connectedToHovered.add(hoveredClusterNode);
      for (const l of links) {
        if (l.pair.a === hoveredClusterNode) connectedToHovered.add(l.pair.b);
        if (l.pair.b === hoveredClusterNode) connectedToHovered.add(l.pair.a);
      }
    }

    const nodeG = root
      .append('g')
      .selectAll('g.cluster-node')
      .data(nodes)
      .enter()
      .append('g')
      .attr('class', 'cluster-node')
      .attr('transform', (d) => `translate(${d.x ?? 0},${d.y ?? 0})`)
      .style('cursor', 'pointer')
      .attr('opacity', (d) => {
        if (hoveredClusterNode !== null) {
          return connectedToHovered.has(d.id) ? 1 : 0.25;
        }
        if (hoveredClusterLink) {
          return d.id === hoveredClusterLink.a || d.id === hoveredClusterLink.b ? 1 : 0.3;
        }
        return 1;
      })
      .on('mouseenter', (_e, d) => {
        setHoveredClusterNode(d.id);
        setHoveredClusterLink(null);
        setFocusedNumber(d.id);
      })
      .on('mouseleave', () => {
        setHoveredClusterNode(null);
      })
      .on('click', (_e, d) => {
        toggleManualNumber(d.id);
      });

    nodeG
      .append('circle')
      .attr('r', (d) => radiusScale(d.freqCount))
      .attr('fill', (d) => (d.isSelected ? '#064e3b' : '#0f172a'))
      .attr('stroke', (d) => (d.isSelected ? '#34d399' : d.color))
      .attr('stroke-width', (d) => (d.isSelected ? 2.6 : 1.8));

    nodeG
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .attr('fill', (d) => (d.isSelected ? '#6ee7b7' : '#f8fafc'))
      .attr('font-size', 10.5)
      .attr('font-weight', '700')
      .attr('font-family', 'ui-monospace, SFMono-Regular, Menlo, monospace')
      .style('pointer-events', 'none')
      .text((d) => String(d.id).padStart(2, '0'));
  }, [
    analytics,
    clusterAnalysis,
    clusterThreshold,
    manualSelection,
    hoveredClusterNode,
    hoveredClusterLink,
  ]);

  const focusedStats = analytics.freqList[focusedNumber - 1];
  const expectedFinal = analytics.drawsCount * 0.6;
  const focusedDelta = focusedStats ? Number((focusedStats.count - expectedFinal).toFixed(1)) : 0;

  return (
    <div className="space-y-6">
      {/* Header & Summary Strip */}
      <section className="bg-slate-900 border border-slate-800 rounded-xl p-5 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-5 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2 text-slate-100">
              <Grid3X3 className="w-4 h-4 text-sky-400 shrink-0" />
              <h2 className="text-lg font-semibold tracking-tight">
                Mapa de Calor & Correlação D3 (Últimos {analytics.drawsCount} Concursos)
              </h2>
            </div>
            <p className="mt-1 text-sm text-slate-400">
              Frequência acumulada e matriz de correlação de Pearson entre pares de dezenas (#{analytics.firstConcurso} a #{analytics.lastConcurso}) para apoio a fechamentos manuais.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-6 font-mono tabular-nums text-xs">
            <div>
              <div className="text-slate-500 font-sans text-[11px]">Mais frequente</div>
              <div className="mt-0.5 text-sm font-semibold text-emerald-400">
                Dez. {String(analytics.hottest.dezena).padStart(2, '0')} · {analytics.hottest.count}/{analytics.drawsCount}
              </div>
            </div>
            <div>
              <div className="text-slate-500 font-sans text-[11px]">Menos frequente</div>
              <div className="mt-0.5 text-sm font-semibold text-amber-400">
                Dez. {String(analytics.coldest.dezena).padStart(2, '0')} · {analytics.coldest.count}/{analytics.drawsCount}
              </div>
            </div>
            <div>
              <div className="text-slate-500 font-sans text-[11px]">Par mais correlacionado</div>
              <div className="mt-0.5 text-sm font-semibold text-sky-400">
                {String(analytics.topPositivePairs[0]?.a ?? 1).padStart(2, '0')}–
                {String(analytics.topPositivePairs[0]?.b ?? 2).padStart(2, '0')} · φ{' '}
                {(analytics.topPositivePairs[0]?.correlation ?? 0) >= 0 ? '+' : ''}
                {(analytics.topPositivePairs[0]?.correlation ?? 0).toFixed(2)}
              </div>
            </div>
          </div>
        </div>

        {/* Manual Closing Builder Bar */}
        <div className="pt-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="text-xs text-slate-400">
              Seleção para fechamento manual (clique em barras ou células da matriz):{' '}
              <strong className="font-mono tabular-nums text-slate-100">
                {manualSelection.length}/15–21 dezenas
              </strong>
            </div>
            <div className="mt-1 text-xs font-mono tabular-nums text-slate-300 truncate">
              {manualSelection.length > 0
                ? manualSelection.map((n) => String(n).padStart(2, '0')).join(' · ')
                : 'Nenhuma dezena selecionada — clique nas dezenas abaixo ou use "Top 18 Frequentes".'}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={selectTop18ByFreqAndCorr}
              className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800/80 hover:bg-slate-800 text-xs font-medium text-slate-200 transition cursor-pointer"
            >
              Top 18 Frequentes
            </button>
            {manualSelection.length > 0 && (
              <button
                type="button"
                onClick={() => setManualSelection([])}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-800 bg-slate-950 hover:border-slate-700 text-xs font-medium text-slate-400 hover:text-slate-200 transition cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Limpar
              </button>
            )}
            <button
              type="button"
              disabled={manualSelection.length < 15}
              onClick={handleSendManualPool}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                manualSelection.length >= 15
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 cursor-pointer'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              {sentNotice ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  Enviado ao Gerador
                </>
              ) : (
                <>
                  Enviar ao Gerador
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </div>
      </section>

      {/* Row 1: D3 Frequency Bar Chart + D3 Cumulative Curve */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <section className="xl:col-span-8 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-100">
                Frequência nos Últimos {analytics.drawsCount} Concursos
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Clique em uma barra para adicionar ou remover a dezena da sua seleção manual.
              </p>
            </div>

            <div className="flex items-center gap-1 p-0.5 rounded-lg bg-slate-950 border border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setFreqSortMode('frequencia')}
                className={`px-2.5 py-1 rounded-md font-medium transition cursor-pointer ${
                  freqSortMode === 'frequencia'
                    ? 'bg-slate-800 text-slate-100'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Por Frequência
              </button>
              <button
                type="button"
                onClick={() => setFreqSortMode('numero')}
                className={`px-2.5 py-1 rounded-md font-medium transition cursor-pointer ${
                  freqSortMode === 'numero'
                    ? 'bg-slate-800 text-slate-100'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Dezena 01–25
              </button>
            </div>
          </div>

          <div className="p-4">
            <svg ref={freqSvgRef} className="w-full h-auto block" role="img" aria-label="Gráfico D3 de frequência das 25 dezenas nos últimos 100 concursos" />
          </div>
        </section>

        {/* Focused Number Cumulative Curve */}
        <section className="xl:col-span-4 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col justify-between">
          <div className="px-5 py-4 border-b border-slate-800">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-slate-100">
                <TrendingUp className="w-4 h-4 text-sky-400 shrink-0" />
                <h3 className="text-sm font-semibold">
                  Frequência Acumulada · Dezena {String(focusedNumber).padStart(2, '0')}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => toggleManualNumber(focusedNumber)}
                className={`px-2.5 py-1 rounded-md border text-xs font-medium transition cursor-pointer ${
                  manualSelection.includes(focusedNumber)
                    ? 'border-emerald-500/60 bg-emerald-500/15 text-emerald-300'
                    : 'border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700'
                }`}
              >
                {manualSelection.includes(focusedNumber) ? 'Selecionada' : '+ Selecionar'}
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Linha azul: acumulado real · Tracejada: expectativa teórica (60%).
            </p>
          </div>

          <div className="p-4">
            <svg
              ref={cumulativeSvgRef}
              className="w-full h-auto block"
              role="img"
              aria-label={`Curva D3 de frequência acumulada da dezena ${focusedNumber}`}
            />
          </div>

          {focusedStats && (
            <div className="px-5 py-3.5 border-t border-slate-800 bg-slate-950/40 grid grid-cols-3 gap-3 text-xs font-mono tabular-nums">
              <div>
                <div className="text-slate-500 font-sans text-[11px]">Saídas / Desvio</div>
                <div className="mt-0.5 text-slate-100 font-semibold">
                  {focusedStats.count} ({focusedDelta >= 0 ? '+' : ''}
                  {focusedDelta})
                </div>
              </div>
              <div>
                <div className="text-slate-500 font-sans text-[11px]">Peso Logístico (50c)</div>
                <div className="mt-0.5 text-sky-400 font-semibold">
                  {focusedStats.logisticScore}/100
                </div>
              </div>
              <div>
                <div className="text-slate-500 font-sans text-[11px]">Perfil</div>
                <div className="mt-0.5 text-slate-300 font-sans">
                  {focusedStats.isMoldura ? 'Moldura' : 'Miolo'}
                  {focusedStats.isPrimo ? ' · Primo' : ''}
                </div>
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Row 2: D3 25x25 Correlation / Co-occurrence Heatmap + Strongest Pairs Table */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <section className="xl:col-span-8 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-100">
                Matriz 25×25 de Correlação & Co-ocorrência (D3)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Diagonal exibe a frequência individual; clique em qualquer célula para adicionar o par à seleção manual.
              </p>
            </div>

            <div className="flex items-center gap-1 p-0.5 rounded-lg bg-slate-950 border border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setMatrixMode('correlacao')}
                className={`px-2.5 py-1 rounded-md font-medium transition cursor-pointer ${
                  matrixMode === 'correlacao'
                    ? 'bg-slate-800 text-slate-100'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Correlação (φ)
              </button>
              <button
                type="button"
                onClick={() => setMatrixMode('coocorrencia')}
                className={`px-2.5 py-1 rounded-md font-medium transition cursor-pointer ${
                  matrixMode === 'coocorrencia'
                    ? 'bg-slate-800 text-slate-100'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Co-ocorrência
              </button>
            </div>
          </div>

          {/* Live Hover Inspector */}
          <div className="px-5 py-2.5 border-b border-slate-800/80 bg-slate-950/50 flex flex-wrap items-center justify-between gap-2 text-xs font-mono tabular-nums">
            {hoveredCell ? (
              hoveredCell.row === hoveredCell.col ? (
                <span className="text-slate-200">
                  Dezena <strong>{String(hoveredCell.row).padStart(2, '0')}</strong> (Diagonal) ·{' '}
                  {hoveredCell.coOccurrence} aparições em {analytics.drawsCount} concursos
                </span>
              ) : (
                <span className="text-slate-200">
                  Par{' '}
                  <strong>
                    {String(hoveredCell.row).padStart(2, '0')} &amp;{' '}
                    {String(hoveredCell.col).padStart(2, '0')}
                  </strong>{' '}
                  · Saíram juntas{' '}
                  <strong className="text-sky-400">
                    {hoveredCell.coOccurrence}/{analytics.drawsCount}
                  </strong>{' '}
                  vezes · Correlação φ{' '}
                  <strong
                    className={
                      hoveredCell.correlation >= 0.08
                        ? 'text-emerald-400'
                        : hoveredCell.correlation <= -0.08
                        ? 'text-rose-400'
                        : 'text-slate-300'
                    }
                  >
                    {hoveredCell.correlation >= 0 ? '+' : ''}
                    {hoveredCell.correlation.toFixed(3)}
                  </strong>
                </span>
              )
            ) : (
              <span className="text-slate-400 font-sans">
                Passe o cursor sobre a matriz para inspecionar a correlação exata entre qualquer par de dezenas.
              </span>
            )}

            <span className="text-[11px] text-slate-500 font-sans">
              {matrixMode === 'correlacao'
                ? 'Escala: Vermelho (repulsão) · Claro (neutro) · Azul (afinidade)'
                : 'Escala: Claro (baixa co-ocorrência) → Azul profundo (alta co-ocorrência)'}
            </span>
          </div>

          <div className="p-4 flex justify-center">
            <svg
              ref={matrixSvgRef}
              className="w-full max-w-[610px] h-auto block"
              role="img"
              aria-label="Matriz de calor D3 25 por 25 de correlação entre dezenas da Lotofácil"
            />
          </div>
        </section>

        {/* Strongest Correlated Pairs & Repulsion Pairs */}
        <section className="xl:col-span-4 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-slate-800">
            <h3 className="text-sm font-semibold text-slate-100">
              Pares com Maior Afinidade (100 Concursos)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Duplas que apareceram juntas acima do acaso estatístico.
            </p>
          </div>

          <div className="divide-y divide-slate-800/80 flex-1">
            {analytics.topPositivePairs.map((pair) => {
              const bothSelected =
                manualSelection.includes(pair.a) && manualSelection.includes(pair.b);
              return (
                <div
                  key={`${pair.a}-${pair.b}`}
                  className="px-5 py-3 flex items-center justify-between gap-3 hover:bg-slate-800/20 transition-colors"
                >
                  <div className="font-mono tabular-nums text-xs">
                    <span className="font-semibold text-slate-100">
                      {String(pair.a).padStart(2, '0')} · {String(pair.b).padStart(2, '0')}
                    </span>
                    <span className="ml-2 text-slate-400">
                      {pair.coOccurrence}× juntas
                    </span>
                    <span className="ml-2 text-emerald-400 font-semibold">
                      φ +{pair.correlation.toFixed(2)}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => addPairToSelection(pair.a, pair.b)}
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-md border text-[11px] font-medium transition cursor-pointer ${
                      bothSelected
                        ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-300'
                        : 'border-slate-700 bg-slate-800/80 hover:bg-slate-800 text-slate-200'
                    }`}
                  >
                    {bothSelected ? (
                      <>
                        <Check className="w-3 h-3" />
                        No pool
                      </>
                    ) : (
                      <>
                        <Plus className="w-3 h-3" />
                        Adicionar
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Negative Correlation Summary */}
          <div className="px-5 py-4 border-t border-slate-800 bg-slate-950/40">
            <div className="text-xs font-medium text-slate-300 mb-2">
              Pares com Maior Repulsão (Evitar juntos como fixas)
            </div>
            <div className="space-y-1.5 font-mono tabular-nums text-xs text-slate-400">
              {analytics.topNegativePairs.map((pair) => (
                <div
                  key={`neg-${pair.a}-${pair.b}`}
                  className="flex items-center justify-between"
                >
                  <span className="text-slate-300">
                    {String(pair.a).padStart(2, '0')} · {String(pair.b).padStart(2, '0')}
                  </span>
                  <span>
                    {pair.coOccurrence}× juntas ·{' '}
                    <strong className="text-rose-400 font-medium">
                      φ {pair.correlation.toFixed(2)}
                    </strong>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      {/* Row 3: D3 Cluster de Correlação (Pares com Frequência > 60% nos Últimos 100 Concursos) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <section className="xl:col-span-8 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-800 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-slate-100">
                <Share2 className="w-4 h-4 text-sky-400 shrink-0" />
                <h3 className="text-sm font-semibold">
                  Cluster de Correlação D3 (Frequência Conjunta &gt; {clusterThreshold}%)
                </h3>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Identifica comunidades de dezenas que tendem a sair juntas acima da linha de base (58,3%) nos últimos {analytics.drawsCount} concursos. Clique em um nó ou aresta para adicionar ao pool.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-slate-950 border border-slate-800 text-xs">
                {([60, 65, 70] as const).map((thr) => (
                  <button
                    key={thr}
                    type="button"
                    onClick={() => setClusterThreshold(thr)}
                    className={`px-2.5 py-1 rounded-md font-mono tabular-nums font-medium transition cursor-pointer ${
                      clusterThreshold === thr
                        ? 'bg-slate-800 text-slate-100'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    &gt;{thr}%
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-slate-950 border border-slate-800 text-xs">
                <button
                  type="button"
                  onClick={() => setClusterMetricMode('media')}
                  className={`px-2.5 py-1 rounded-md font-medium transition cursor-pointer ${
                    clusterMetricMode === 'media'
                      ? 'bg-slate-800 text-slate-100'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Média Cond.
                </button>
                <button
                  type="button"
                  onClick={() => setClusterMetricMode('bilateral')}
                  className={`px-2.5 py-1 rounded-md font-medium transition cursor-pointer ${
                    clusterMetricMode === 'bilateral'
                      ? 'bg-slate-800 text-slate-100'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Bilateral
                </button>
              </div>
            </div>
          </div>

          {/* Cluster Graph Live Inspector */}
          <div className="px-5 py-2.5 border-b border-slate-800/80 bg-slate-950/50 flex flex-wrap items-center justify-between gap-2 text-xs font-mono tabular-nums">
            {hoveredClusterLink ? (
              <span className="text-slate-200">
                Par{' '}
                <strong>
                  {String(hoveredClusterLink.a).padStart(2, '0')}–
                  {String(hoveredClusterLink.b).padStart(2, '0')}
                </strong>{' '}
                · Saem juntas em{' '}
                <strong className="text-emerald-400">
                  {clusterAnalysis.getScore(hoveredClusterLink).toFixed(1)}%
                </strong>{' '}
                ({hoveredClusterLink.coOccurrence}× em {analytics.drawsCount} conc. · P({String(hoveredClusterLink.b).padStart(2, '0')}|{String(hoveredClusterLink.a).padStart(2, '0')}) {hoveredClusterLink.pBGivenA.toFixed(1)}% · φ{' '}
                {hoveredClusterLink.correlation >= 0 ? '+' : ''}
                {hoveredClusterLink.correlation.toFixed(2)})
              </span>
            ) : hoveredClusterNode !== null ? (
              <span className="text-slate-200">
                Dezena <strong>{String(hoveredClusterNode).padStart(2, '0')}</strong> ·{' '}
                {
                  clusterAnalysis.qualifyingPairs.filter(
                    (p) => p.a === hoveredClusterNode || p.b === hoveredClusterNode
                  ).length
                }{' '}
                conexões &gt;{clusterThreshold}% · Clique para incluir/remover do pool manual
              </span>
            ) : (
              <span className="text-slate-400 font-sans">
                {clusterAnalysis.qualifyingPairs.length} pares acima de {clusterThreshold}% organizados em {clusterAnalysis.clusters.length} clusters de afinidade.
              </span>
            )}

            <span className="text-[11px] text-slate-500 font-sans">
              Espessura da linha proporcional à frequência conjunta
            </span>
          </div>

          <div className="p-4">
            <svg
              ref={clusterSvgRef}
              className="w-full h-auto block"
              role="img"
              aria-label={`Grafo D3 de Clusters de Correlação com pares acima de ${clusterThreshold}% nos últimos 100 concursos`}
            />
          </div>
        </section>

        {/* Detected Clusters & Top >60% Pairs */}
        <section className="xl:col-span-4 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-slate-800">
            <h3 className="text-sm font-semibold text-slate-100">
              Clusters &amp; Pares &gt;{clusterThreshold}%
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Adicione um cluster completo ou duplas específicas ao seu fechamento manual.
            </p>
          </div>

          {/* Clusters List */}
          <div className="divide-y divide-slate-800/80 border-b border-slate-800">
            {clusterAnalysis.clusters.length === 0 ? (
              <div className="px-5 py-4 text-xs text-slate-400">
                Nenhum cluster detectado acima de {clusterThreshold}%. Reduza o limiar para 60%.
              </div>
            ) : (
              clusterAnalysis.clusters.map((cluster) => {
                const allInPool = cluster.members.every((m) => manualSelection.includes(m));
                return (
                  <div
                    key={cluster.id}
                    className="px-5 py-3 flex items-center justify-between gap-3 hover:bg-slate-800/20 transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-xs">
                        <span
                          className="font-semibold"
                          style={{ color: cluster.color }}
                        >
                          {cluster.name}
                        </span>
                        <span className="text-slate-500">·</span>
                        <span className="font-mono tabular-nums text-slate-300">
                          {cluster.avgAffinityPct.toFixed(1)}% média
                        </span>
                      </div>
                      <div className="mt-1 font-mono tabular-nums text-xs text-slate-200">
                        {cluster.members.map((m) => String(m).padStart(2, '0')).join(' · ')}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => addClusterToSelection(cluster.members)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md border text-[11px] font-medium transition cursor-pointer shrink-0 ${
                        allInPool
                          ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-300'
                          : 'border-slate-700 bg-slate-800/80 hover:bg-slate-800 text-slate-200'
                      }`}
                    >
                      {allInPool ? (
                        <>
                          <Check className="w-3 h-3" />
                          No pool
                        </>
                      ) : (
                        <>
                          <Plus className="w-3 h-3" />
                          Cluster
                        </>
                      )}
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* Top >60% Pairs */}
          <div className="px-5 py-3 bg-slate-950/40 flex-1">
            <div className="text-xs font-medium text-slate-300 mb-2">
              Top Pares com Saída Conjunta &gt;{clusterThreshold}%
            </div>
            <div className="space-y-2 font-mono tabular-nums text-xs">
              {clusterAnalysis.qualifyingPairs.slice(0, 8).map((pair) => {
                const score = clusterAnalysis.getScore(pair);
                const bothSelected =
                  manualSelection.includes(pair.a) && manualSelection.includes(pair.b);
                return (
                  <div
                    key={`c60-${pair.a}-${pair.b}`}
                    className="flex items-center justify-between gap-2"
                  >
                    <div className="text-slate-300">
                      <span className="font-semibold text-slate-100">
                        {String(pair.a).padStart(2, '0')}–{String(pair.b).padStart(2, '0')}
                      </span>
                      <span className="ml-2 text-emerald-400 font-semibold">
                        {score.toFixed(1)}%
                      </span>
                      <span className="ml-2 text-slate-500">
                        ({pair.coOccurrence}×)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => addPairToSelection(pair.a, pair.b)}
                      className={`px-2 py-0.5 rounded border text-[11px] font-sans font-medium transition cursor-pointer ${
                        bothSelected
                          ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-300'
                          : 'border-slate-700 bg-slate-800/80 hover:bg-slate-800 text-slate-200'
                      }`}
                    >
                      {bothSelected ? 'No pool' : '+ Par'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
