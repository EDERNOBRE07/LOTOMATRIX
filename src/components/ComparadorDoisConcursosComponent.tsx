import React, { useState, useMemo } from 'react';
import { LotofacilDraw, DezenaStats } from '../types/lotofacil';
import { CONCURSO_ATUAL, PRIMOS, MOLDURA, FIBONACCI } from '../data/lotofacilData';
import { getHistoricalNDraws } from '../services/historical100Draws';
import {
  GitCompare,
  ArrowRight,
  RotateCcw,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Minus,
  Sparkles,
  Calendar,
  Layers,
  Award,
  Hash,
  Scale,
  Copy,
  Check,
  Zap,
  Info,
  Sliders,
  Filter,
} from 'lucide-react';
import { soundService } from '../services/soundAlert';

interface ComparadorDoisConcursosComponentProps {
  latestDraw?: LotofacilDraw;
  statsList?: DezenaStats[];
  onApplyNumbers?: (numbers: number[]) => void;
  onNavigateToFechamento?: () => void;
}

type NumberStatus = 'repetiu' | 'entrou' | 'saiu' | 'ausente_ambos';

interface NumberComparison {
  numero: number;
  status: NumberStatus;
  noConcursoA: boolean;
  noConcursoB: boolean;
}

export const ComparadorDoisConcursosComponent: React.FC<ComparadorDoisConcursosComponentProps> = ({
  latestDraw = CONCURSO_ATUAL,
  statsList,
  onApplyNumbers,
  onNavigateToFechamento,
}) => {
  // 100 historical draws sorted descending by contest number
  const draws = useMemo(() => getHistoricalNDraws(100, latestDraw), [latestDraw]);

  // Default selection: Concurso B = newest (index 0), Concurso A = immediately preceding (index 1)
  const [selectedConcursoA, setSelectedConcursoA] = useState<number>(() => {
    return draws.length > 1 ? draws[1].concurso : latestDraw.concurso - 1;
  });

  const [selectedConcursoB, setSelectedConcursoB] = useState<number>(() => {
    return draws.length > 0 ? draws[0].concurso : latestDraw.concurso;
  });

  const [filterCategory, setFilterCategory] = useState<'todos' | NumberStatus>('todos');
  const [activeNumberDetail, setActiveNumberDetail] = useState<number | null>(null);
  const [copiedStatus, setCopiedStatus] = useState<string | null>(null);

  // Retrieve actual draw objects
  const drawA = useMemo(() => {
    return draws.find((d) => d.concurso === selectedConcursoA) || draws[1] || draws[0];
  }, [draws, selectedConcursoA]);

  const drawB = useMemo(() => {
    return draws.find((d) => d.concurso === selectedConcursoB) || draws[0];
  }, [draws, selectedConcursoB]);

  // Calculate sets and metrics
  const setA = useMemo(() => new Set(drawA.dezenas), [drawA]);
  const setB = useMemo(() => new Set(drawB.dezenas), [drawB]);

  // Compute status for all 25 numbers
  const comparisons: NumberComparison[] = useMemo(() => {
    const list: NumberComparison[] = [];
    for (let n = 1; n <= 25; n++) {
      const inA = setA.has(n);
      const inB = setB.has(n);
      let status: NumberStatus = 'ausente_ambos';

      if (inA && inB) {
        status = 'repetiu';
      } else if (!inA && inB) {
        status = 'entrou';
      } else if (inA && !inB) {
        status = 'saiu';
      } else {
        status = 'ausente_ambos';
      }

      list.push({
        numero: n,
        status,
        noConcursoA: inA,
        noConcursoB: inB,
      });
    }
    return list;
  }, [setA, setB]);

  // Aggregated subsets
  const repetidas = useMemo(() => comparisons.filter((c) => c.status === 'repetiu').map((c) => c.numero), [comparisons]);
  const entraram = useMemo(() => comparisons.filter((c) => c.status === 'entrou').map((c) => c.numero), [comparisons]);
  const sairam = useMemo(() => comparisons.filter((c) => c.status === 'saiu').map((c) => c.numero), [comparisons]);
  const ausentesAmbos = useMemo(() => comparisons.filter((c) => c.status === 'ausente_ambos').map((c) => c.numero), [comparisons]);

  // Analytical Metrics for Draw A and Draw B
  const metricsA = useMemo(() => {
    const sum = drawA.dezenas.reduce((acc, curr) => acc + curr, 0);
    const pares = drawA.dezenas.filter((n) => n % 2 === 0).length;
    const impares = 15 - pares;
    const primos = drawA.dezenas.filter((n) => PRIMOS.includes(n)).length;
    const moldura = drawA.dezenas.filter((n) => MOLDURA.includes(n)).length;
    const fibonacci = drawA.dezenas.filter((n) => FIBONACCI.includes(n)).length;
    return { sum, pares, impares, primos, moldura, fibonacci };
  }, [drawA]);

  const metricsB = useMemo(() => {
    const sum = drawB.dezenas.reduce((acc, curr) => acc + curr, 0);
    const pares = drawB.dezenas.filter((n) => n % 2 === 0).length;
    const impares = 15 - pares;
    const primos = drawB.dezenas.filter((n) => PRIMOS.includes(n)).length;
    const moldura = drawB.dezenas.filter((n) => MOLDURA.includes(n)).length;
    const fibonacci = drawB.dezenas.filter((n) => FIBONACCI.includes(n)).length;
    return { sum, pares, impares, primos, moldura, fibonacci };
  }, [drawB]);

  // Deltas (B - A)
  const deltaSoma = metricsB.sum - metricsA.sum;
  const deltaPares = metricsB.pares - metricsA.pares;
  const deltaPrimos = metricsB.primos - metricsA.primos;
  const deltaMoldura = metricsB.moldura - metricsA.moldura;
  const deltaFibonacci = metricsB.fibonacci - metricsA.fibonacci;

  // Repetition percentage
  const taxaRepeticao = ((repetidas.length / 15) * 100).toFixed(1);

  // Quick preset helper
  const handleSwapOrder = () => {
    setSelectedConcursoA(selectedConcursoB);
    setSelectedConcursoB(selectedConcursoA);
    soundService.playClick();
  };

  const handleApplyPreset = (step: number) => {
    const baseIndex = 0;
    const targetIndex = Math.min(step, draws.length - 1);
    setSelectedConcursoB(draws[baseIndex].concurso);
    setSelectedConcursoA(draws[targetIndex].concurso);
    soundService.playClick();
  };

  const handleCopyNumbers = (nums: number[], label: string) => {
    const text = nums.map((n) => String(n).padStart(2, '0')).join(', ');
    navigator.clipboard.writeText(text);
    setCopiedStatus(label);
    soundService.playSuccess();
    setTimeout(() => setCopiedStatus(null), 2500);
  };

  const handleApplyToFechamento = (nums: number[]) => {
    if (onApplyNumbers) {
      onApplyNumbers(nums);
    }
    soundService.playSuccess();
    if (onNavigateToFechamento) {
      onNavigateToFechamento();
    } else if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('switch-tab', { detail: { tab: 'fechamento' } }));
    }
  };

  // Filtered numbers for matrix
  const displayedComparisons = useMemo(() => {
    if (filterCategory === 'todos') return comparisons;
    return comparisons.filter((c) => c.status === filterCategory);
  }, [comparisons, filterCategory]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/60 to-slate-900 border border-indigo-500/30 rounded-2xl p-5 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25 shrink-0 mt-0.5">
              <GitCompare className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold text-white tracking-tight">
                  Comparador Comparativo de Dois Concursos
                </h2>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 font-mono">
                  ANÁLISE DE TRANSIÇÃO 1 A 25
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                Compare lado a lado dois concursos históricos para visualizar o comportamento dinâmico de cada uma das 25 dezenas: identifique quais <span className="text-emerald-400 font-semibold">repetiram</span>, quais <span className="text-cyan-400 font-semibold">emergiram (novidades)</span>, quais <span className="text-amber-400 font-semibold">entraram em hiato (saíram)</span> e quais <span className="text-slate-400 font-semibold">permaneceram ausentes</span>.
              </p>
            </div>
          </div>

          {/* Quick Presets */}
          <div className="flex items-center gap-1.5 flex-wrap shrink-0">
            <button
              onClick={() => handleApplyPreset(1)}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition cursor-pointer flex items-center gap-1"
              title="Compara o último concurso contra o seu anterior imediato"
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>N-1 vs N</span>
            </button>
            <button
              onClick={() => handleApplyPreset(5)}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition cursor-pointer"
            >
              Intervalo 5
            </button>
            <button
              onClick={() => handleApplyPreset(10)}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition cursor-pointer"
            >
              Intervalo 10
            </button>
            <button
              onClick={handleSwapOrder}
              className="px-2.5 py-1.5 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 text-xs font-bold border border-indigo-500/40 transition cursor-pointer flex items-center gap-1"
              title="Inverter ordem dos concursos selecionados"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Inverter</span>
            </button>
          </div>
        </div>
      </div>

      {/* Selectors Bar */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Concurso A (Referência) */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-black flex items-center justify-center font-mono">
                A
              </span>
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Concurso Base (Referência)
              </span>
            </div>
            <span className="text-[11px] font-mono text-slate-400">
              {drawA.data}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedConcursoA}
              onChange={(e) => setSelectedConcursoA(Number(e.target.value))}
              className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono font-bold focus:outline-none focus:border-indigo-500 transition cursor-pointer"
            >
              {draws.map((d) => (
                <option key={`a-${d.concurso}`} value={d.concurso}>
                  Concurso #{d.concurso} • {d.data} ({d.dezenas.length} dezenas)
                </option>
              ))}
            </select>
          </div>

          {/* Balls Preview Concurso A */}
          <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80 space-y-2">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>Dezenas Sorteadas (15):</span>
              <span className="font-mono text-slate-300">Soma: {metricsA.sum}</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {drawA.dezenas.map((n) => (
                <span
                  key={`drawA-${n}`}
                  className="w-7 h-7 rounded-lg bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs font-mono font-bold flex items-center justify-center shadow-sm"
                >
                  {String(n).padStart(2, '0')}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Concurso B (Comparado) */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-xs font-black flex items-center justify-center font-mono">
                B
              </span>
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Concurso Comparado (Posterior / Alvo)
              </span>
            </div>
            <span className="text-[11px] font-mono text-slate-400">
              {drawB.data}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedConcursoB}
              onChange={(e) => setSelectedConcursoB(Number(e.target.value))}
              className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono font-bold focus:outline-none focus:border-cyan-500 transition cursor-pointer"
            >
              {draws.map((d) => (
                <option key={`b-${d.concurso}`} value={d.concurso}>
                  Concurso #{d.concurso} • {d.data} ({d.dezenas.length} dezenas)
                </option>
              ))}
            </select>
          </div>

          {/* Balls Preview Concurso B */}
          <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80 space-y-2">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>Dezenas Sorteadas (15):</span>
              <span className="font-mono text-slate-300">Soma: {metricsB.sum}</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {drawB.dezenas.map((n) => (
                <span
                  key={`drawB-${n}`}
                  className="w-7 h-7 rounded-lg bg-cyan-500/15 border border-cyan-500/40 text-cyan-300 text-xs font-mono font-bold flex items-center justify-center shadow-sm"
                >
                  {String(n).padStart(2, '0')}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards: 4 Status Buckets */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Repetiram */}
        <div
          onClick={() => setFilterCategory(filterCategory === 'repetiu' ? 'todos' : 'repetiu')}
          className={`p-4 rounded-2xl border transition cursor-pointer ${
            filterCategory === 'repetiu'
              ? 'bg-emerald-950/80 border-emerald-400 shadow-lg shadow-emerald-500/20 ring-1 ring-emerald-400'
              : 'bg-slate-900/90 border-emerald-500/30 hover:border-emerald-500/60'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Repetiram
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
              {taxaRepeticao}%
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black font-mono text-white">
              {repetidas.length}
            </span>
            <span className="text-xs text-slate-400 font-mono">/ 15 dezenas</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">
            Sorteadas tanto em A quanto em B
          </p>
        </div>

        {/* Entraram (Emergentes) */}
        <div
          onClick={() => setFilterCategory(filterCategory === 'entrou' ? 'todos' : 'entrou')}
          className={`p-4 rounded-2xl border transition cursor-pointer ${
            filterCategory === 'entrou'
              ? 'bg-cyan-950/80 border-cyan-400 shadow-lg shadow-cyan-500/20 ring-1 ring-cyan-400'
              : 'bg-slate-900/90 border-cyan-500/30 hover:border-cyan-500/60'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5" />
              Entraram no 2º
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
              NOVIDADES
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black font-mono text-white">
              {entraram.length}
            </span>
            <span className="text-xs text-slate-400 font-mono">dezenas</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">
            Ausentes no Concurso A, saíram no B
          </p>
        </div>

        {/* Saíram (Hiato) */}
        <div
          onClick={() => setFilterCategory(filterCategory === 'saiu' ? 'todos' : 'saiu')}
          className={`p-4 rounded-2xl border transition cursor-pointer ${
            filterCategory === 'saiu'
              ? 'bg-amber-950/80 border-amber-400 shadow-lg shadow-amber-500/20 ring-1 ring-amber-400'
              : 'bg-slate-900/90 border-amber-500/30 hover:border-amber-500/60'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <TrendingDown className="w-3.5 h-3.5" />
              Saíram no 2º
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
              EM HIATO
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black font-mono text-white">
              {sairam.length}
            </span>
            <span className="text-xs text-slate-400 font-mono">dezenas</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">
            Sorteadas em A, não saíram no B
          </p>
        </div>

        {/* Ausentes em Ambos */}
        <div
          onClick={() => setFilterCategory(filterCategory === 'ausente_ambos' ? 'todos' : 'ausente_ambos')}
          className={`p-4 rounded-2xl border transition cursor-pointer ${
            filterCategory === 'ausente_ambos'
              ? 'bg-slate-800 border-slate-400 shadow-lg ring-1 ring-slate-400'
              : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Minus className="w-3.5 h-3.5" />
              Ausentes em Ambos
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
              INATIVAS
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black font-mono text-white">
              {ausentesAmbos.length}
            </span>
            <span className="text-xs text-slate-400 font-mono">dezenas</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">
            Não sorteadas em nenhum dos dois
          </p>
        </div>
      </div>

      {/* Delta Metrics Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl">
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800/80">
          <div className="flex items-center gap-2">
            <Scale className="w-4 h-4 text-indigo-400" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Deltas Estruturais entre Concurso #{drawA.concurso} ➔ Concurso #{drawB.concurso}
            </h3>
          </div>
          <span className="text-[11px] text-slate-400">
            Variação líquida de métricas canônicas
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {/* Delta Soma */}
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80">
            <span className="text-[10px] font-bold text-slate-400 uppercase block">Soma Total</span>
            <div className="flex items-center justify-between mt-1">
              <span className="text-xs font-mono text-slate-300">
                {metricsA.sum} ➔ {metricsB.sum}
              </span>
              <span
                className={`text-xs font-mono font-bold px-1.5 py-0.5 rounded ${
                  deltaSoma > 0
                    ? 'bg-rose-500/20 text-rose-300'
                    : deltaSoma < 0
                    ? 'bg-cyan-500/20 text-cyan-300'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {deltaSoma > 0 ? `+${deltaSoma}` : deltaSoma}
              </span>
            </div>
          </div>

          {/* Delta Pares / Ímpares */}
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80">
            <span className="text-[10px] font-bold text-slate-400 uppercase block">Pares (Paridade)</span>
            <div className="flex items-center justify-between mt-1">
              <span className="text-xs font-mono text-slate-300">
                {metricsA.pares}P/{metricsA.impares}I ➔ {metricsB.pares}P/{metricsB.impares}I
              </span>
              <span
                className={`text-xs font-mono font-bold px-1.5 py-0.5 rounded ${
                  deltaPares > 0
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : deltaPares < 0
                    ? 'bg-amber-500/20 text-amber-300'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {deltaPares > 0 ? `+${deltaPares}` : deltaPares}
              </span>
            </div>
          </div>

          {/* Delta Primos */}
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80">
            <span className="text-[10px] font-bold text-slate-400 uppercase block">Números Primos</span>
            <div className="flex items-center justify-between mt-1">
              <span className="text-xs font-mono text-slate-300">
                {metricsA.primos} ➔ {metricsB.primos}
              </span>
              <span
                className={`text-xs font-mono font-bold px-1.5 py-0.5 rounded ${
                  deltaPrimos > 0
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : deltaPrimos < 0
                    ? 'bg-rose-500/20 text-rose-300'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {deltaPrimos > 0 ? `+${deltaPrimos}` : deltaPrimos}
              </span>
            </div>
          </div>

          {/* Delta Moldura */}
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80">
            <span className="text-[10px] font-bold text-slate-400 uppercase block">Moldura (16 dez)</span>
            <div className="flex items-center justify-between mt-1">
              <span className="text-xs font-mono text-slate-300">
                {metricsA.moldura} ➔ {metricsB.moldura}
              </span>
              <span
                className={`text-xs font-mono font-bold px-1.5 py-0.5 rounded ${
                  deltaMoldura > 0
                    ? 'bg-indigo-500/20 text-indigo-300'
                    : deltaMoldura < 0
                    ? 'bg-amber-500/20 text-amber-300'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {deltaMoldura > 0 ? `+${deltaMoldura}` : deltaMoldura}
              </span>
            </div>
          </div>

          {/* Delta Fibonacci */}
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80">
            <span className="text-[10px] font-bold text-slate-400 uppercase block">Fibonacci (7 dez)</span>
            <div className="flex items-center justify-between mt-1">
              <span className="text-xs font-mono text-slate-300">
                {metricsA.fibonacci} ➔ {metricsB.fibonacci}
              </span>
              <span
                className={`text-xs font-mono font-bold px-1.5 py-0.5 rounded ${
                  deltaFibonacci > 0
                    ? 'bg-purple-500/20 text-purple-300'
                    : deltaFibonacci < 0
                    ? 'bg-rose-500/20 text-rose-300'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {deltaFibonacci > 0 ? `+${deltaFibonacci}` : deltaFibonacci}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Volante 5x5 Matrix: Interactive Transition Map */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-cyan-400" />
              <span>Mapa Matricial de Transição no Volante (5 × 5)</span>
            </h3>
            <p className="text-xs text-slate-400">
              Cada dezena exibe o status de presença e transição entre Concurso #{drawA.concurso} e Concurso #{drawB.concurso}.
            </p>
          </div>

          {/* Filter Pill Tabs */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs flex-wrap">
            <button
              onClick={() => setFilterCategory('todos')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer ${
                filterCategory === 'todos' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Todas (25)
            </button>
            <button
              onClick={() => setFilterCategory('repetiu')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer ${
                filterCategory === 'repetiu'
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow'
                  : 'text-emerald-400 hover:bg-slate-900'
              }`}
            >
              Repetiram ({repetidas.length})
            </button>
            <button
              onClick={() => setFilterCategory('entrou')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer ${
                filterCategory === 'entrou'
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow'
                  : 'text-cyan-400 hover:bg-slate-900'
              }`}
            >
              Entraram ({entraram.length})
            </button>
            <button
              onClick={() => setFilterCategory('saiu')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer ${
                filterCategory === 'saiu'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow'
                  : 'text-amber-400 hover:bg-slate-900'
              }`}
            >
              Saíram ({sairam.length})
            </button>
            <button
              onClick={() => setFilterCategory('ausente_ambos')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer ${
                filterCategory === 'ausente_ambos'
                  ? 'bg-slate-700 text-white font-bold shadow'
                  : 'text-slate-400 hover:bg-slate-900'
              }`}
            >
              Ausentes ({ausentesAmbos.length})
            </button>
          </div>
        </div>

        {/* 5x5 Volante Grid */}
        <div className="grid grid-cols-5 gap-2.5 sm:gap-3 p-3 bg-slate-950/70 rounded-2xl border border-slate-800/80">
          {comparisons.map((item) => {
            const isMatch = filterCategory === 'todos' || item.status === filterCategory;
            const isSelected = activeNumberDetail === item.numero;

            let badgeBg = 'bg-slate-900/60 border-slate-800 text-slate-500';
            let statusText = 'Ausente em Ambos';
            let icon = <Minus className="w-3.5 h-3.5" />;

            if (item.status === 'repetiu') {
              badgeBg = 'bg-emerald-950/70 border-emerald-500/60 text-emerald-300 shadow-md shadow-emerald-500/10 hover:border-emerald-400';
              statusText = 'Repetiu (A e B)';
              icon = <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />;
            } else if (item.status === 'entrou') {
              badgeBg = 'bg-cyan-950/70 border-cyan-500/60 text-cyan-300 shadow-md shadow-cyan-500/10 hover:border-cyan-400';
              statusText = 'Entrou no Concurso B';
              icon = <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />;
            } else if (item.status === 'saiu') {
              badgeBg = 'bg-amber-950/70 border-amber-500/60 text-amber-300 shadow-md shadow-amber-500/10 hover:border-amber-400';
              statusText = 'Saiu no Concurso B';
              icon = <TrendingDown className="w-3.5 h-3.5 text-amber-400" />;
            }

            return (
              <div
                key={`matrix-${item.numero}`}
                onClick={() => {
                  setActiveNumberDetail(isSelected ? null : item.numero);
                  soundService.playClick();
                }}
                className={`relative p-3 rounded-xl border transition cursor-pointer flex flex-col items-center justify-center gap-1.5 ${badgeBg} ${
                  !isMatch ? 'opacity-25 grayscale' : 'opacity-100'
                } ${isSelected ? 'ring-2 ring-white scale-105 z-10' : ''}`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-[10px] font-mono font-bold opacity-75">
                    #{item.numero}
                  </span>
                  {icon}
                </div>

                <div className="text-xl sm:text-2xl font-black font-mono tracking-tight">
                  {String(item.numero).padStart(2, '0')}
                </div>

                <div className="text-[10px] font-semibold tracking-tight text-center truncate max-w-full">
                  {item.status === 'repetiu' && <span className="text-emerald-400">Repetiu</span>}
                  {item.status === 'entrou' && <span className="text-cyan-400">Entrou</span>}
                  {item.status === 'saiu' && <span className="text-amber-400">Saiu</span>}
                  {item.status === 'ausente_ambos' && <span className="text-slate-500">Ausente</span>}
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected Number Inspector */}
        {activeNumberDetail !== null && (
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-600/30 border border-indigo-500/50 flex items-center justify-center font-mono font-black text-white text-lg">
                {String(activeNumberDetail).padStart(2, '0')}
              </div>
              <div>
                <div className="text-xs font-bold text-white flex items-center gap-2">
                  <span>Diagnóstico da Dezena {String(activeNumberDetail).padStart(2, '0')}</span>
                  {PRIMOS.includes(activeNumberDetail) && (
                    <span className="px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 text-[9px] font-mono border border-purple-500/40">
                      Primo
                    </span>
                  )}
                  {MOLDURA.includes(activeNumberDetail) && (
                    <span className="px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 text-[9px] font-mono border border-indigo-500/40">
                      Moldura
                    </span>
                  )}
                  {FIBONACCI.includes(activeNumberDetail) && (
                    <span className="px-1.5 py-0.2 rounded bg-pink-500/20 text-pink-300 text-[9px] font-mono border border-pink-500/40">
                      Fibonacci
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Concurso #{drawA.concurso}: {setA.has(activeNumberDetail) ? '✅ Sorteada' : '❌ Não Sorteada'} | Concurso #{drawB.concurso}: {setB.has(activeNumberDetail) ? '✅ Sorteada' : '❌ Não Sorteada'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleApplyToFechamento([activeNumberDetail])}
                className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition cursor-pointer flex items-center gap-1 shadow-md shadow-emerald-500/20"
              >
                <span>Fixar Dezena</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setActiveNumberDetail(null)}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        )}

        {/* Action Strategy Bar */}
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-2">
                <span>Estratégia Recomendada para o Próximo Concurso</span>
                <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-mono">
                  TAXA DE RETENÇÃO TÍPICA: 8 A 10 DEZENAS
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Neste comparativo, <strong className="text-emerald-300 font-mono">{repetidas.length} dezenas</strong> repetiram entre os dois sorteios. Você pode transferir essas repetidas ou as novidades para calibrar seu fechamento matemático.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap shrink-0">
            {/* Copy Repeated */}
            <button
              onClick={() => handleCopyNumbers(repetidas, 'repetidas')}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition cursor-pointer flex items-center gap-1.5"
            >
              {copiedStatus === 'repetidas' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400 font-bold">Copiadas!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copiar {repetidas.length} Repetidas</span>
                </>
              )}
            </button>

            {/* Apply Repeated to Fechamento */}
            <button
              onClick={() => handleApplyToFechamento(repetidas)}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-xs transition cursor-pointer shadow-md shadow-emerald-500/20 flex items-center gap-1.5 active:scale-95"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Aplicar Repetidas no Fechamento</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
