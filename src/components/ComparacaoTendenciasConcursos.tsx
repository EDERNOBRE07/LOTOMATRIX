import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import {
  GitCompare,
  ArrowLeftRight,
  TrendingUp,
  TrendingDown,
  Sparkles,
  BarChart3,
  CheckCircle2,
} from 'lucide-react';
import { LotofacilDraw } from '../types/lotofacil';
import { CONCURSO_ATUAL } from '../data/lotofacilData';
import { getHistoricalNDraws } from '../services/historical100Draws';

interface ComparacaoTendenciasConcursosProps {
  latestDraw?: LotofacilDraw;
  onApplyNumbers?: (numbers: number[]) => void;
}

type SortMode = 'numero' | 'alta_desc' | 'queda_desc' | 'freqB_desc';
type AnalysisMode = 'janelas_comparativas' | 'intervalo_entre';

interface TrendBarDatum {
  numero: number;
  label: string;
  freqA: number;
  freqB: number;
  pctA: number;
  pctB: number;
  delta: number;
  deltaPct: number;
  saiuEmA: boolean;
  saiuEmB: boolean;
  freqEntre: number;
  pctEntre: number;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: { payload: TrendBarDatum }[];
  concursoA: number;
  concursoB: number;
  windowSize: number;
  analysisMode: AnalysisMode;
  intervalCount: number;
}

const TrendComparisonTooltip: React.FC<CustomTooltipProps> = ({
  active,
  payload,
  concursoA,
  concursoB,
  windowSize,
  analysisMode,
  intervalCount,
}) => {
  if (!active || !payload || payload.length === 0) return null;
  const d = payload[0].payload;

  return (
    <div className="bg-slate-950/95 border border-slate-700 rounded-xl p-3.5 shadow-2xl text-xs space-y-2 min-w-[220px] backdrop-blur-md">
      <div className="flex items-center justify-between gap-3 pb-1.5 border-b border-slate-800">
        <span className="font-mono font-bold text-white text-sm tabular-nums">
          Dezena {d.label}
        </span>
        <span
          className={`font-mono font-bold tabular-nums ${
            d.delta > 0
              ? 'text-emerald-400'
              : d.delta < 0
              ? 'text-rose-400'
              : 'text-slate-400'
          }`}
        >
          {d.delta > 0 ? `+${d.delta}` : d.delta} ({d.deltaPct > 0 ? `+${d.deltaPct}` : d.deltaPct}{' '}
          pp)
        </span>
      </div>

      {analysisMode === 'janelas_comparativas' ? (
        <div className="space-y-1.5 font-mono tabular-nums">
          <div className="flex items-center justify-between gap-4">
            <span className="text-amber-300">Concurso #{concursoA} ({windowSize}c):</span>
            <strong className="text-white">
              {d.freqA}/{windowSize} ({d.pctA}%)
            </strong>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-emerald-300">Concurso #{concursoB} ({windowSize}c):</span>
            <strong className="text-white">
              {d.freqB}/{windowSize} ({d.pctB}%)
            </strong>
          </div>
        </div>
      ) : (
        <div className="space-y-1.5 font-mono tabular-nums">
          <div className="flex items-center justify-between gap-4">
            <span className="text-cyan-300">
              Entre #{Math.min(concursoA, concursoB)} e #{Math.max(concursoA, concursoB)}:
            </span>
            <strong className="text-white">
              {d.freqEntre}/{intervalCount} ({d.pctEntre}%)
            </strong>
          </div>
        </div>
      )}

      <div className="pt-1.5 border-t border-slate-800 flex items-center justify-between gap-2 text-[11px] text-slate-400">
        <span>
          Em #{concursoA}:{' '}
          <strong className={d.saiuEmA ? 'text-amber-300' : 'text-slate-500'}>
            {d.saiuEmA ? 'Sorteada' : 'Ausente'}
          </strong>
        </span>
        <span aria-hidden="true">·</span>
        <span>
          Em #{concursoB}:{' '}
          <strong className={d.saiuEmB ? 'text-emerald-300' : 'text-slate-500'}>
            {d.saiuEmB ? 'Sorteada' : 'Ausente'}
          </strong>
        </span>
      </div>
    </div>
  );
};

export const ComparacaoTendenciasConcursos: React.FC<ComparacaoTendenciasConcursosProps> = ({
  latestDraw = CONCURSO_ATUAL,
  onApplyNumbers,
}) => {
  // Carrega 120 concursos históricos ordenados do mais recente (idx 0) ao mais antigo
  const historicalDraws = useMemo(() => getHistoricalNDraws(120, latestDraw), [latestDraw]);

  // Apenas os 100 primeiros concursos têm janela completa de até 20 sorteios anteriores disponível
  const selectableDraws = useMemo(() => historicalDraws.slice(0, 100), [historicalDraws]);

  const [concursoA, setConcursoA] = useState<number>(() =>
    selectableDraws.length > 15 ? selectableDraws[15].concurso : latestDraw.concurso - 10
  );
  const [concursoB, setConcursoB] = useState<number>(() =>
    selectableDraws.length > 0 ? selectableDraws[0].concurso : latestDraw.concurso
  );
  const [windowSize, setWindowSize] = useState<10 | 15 | 20>(15);
  const [sortMode, setSortMode] = useState<SortMode>('numero');
  const [analysisMode, setAnalysisMode] = useState<AnalysisMode>('janelas_comparativas');
  const [appliedFeedback, setAppliedFeedback] = useState<string | null>(null);

  const drawA = useMemo(
    () => selectableDraws.find((d) => d.concurso === concursoA) || selectableDraws[10] || selectableDraws[0],
    [selectableDraws, concursoA]
  );
  const drawB = useMemo(
    () => selectableDraws.find((d) => d.concurso === concursoB) || selectableDraws[0],
    [selectableDraws, concursoB]
  );

  // Garante seleção de dois concursos diferentes
  const handleSelectConcursoA = (val: number) => {
    if (val === concursoB) {
      const alt = selectableDraws.find((d) => d.concurso !== val);
      if (alt) setConcursoB(alt.concurso);
    }
    setConcursoA(val);
  };

  const handleSelectConcursoB = (val: number) => {
    if (val === concursoA) {
      const alt = selectableDraws.find((d) => d.concurso !== val);
      if (alt) setConcursoA(alt.concurso);
    }
    setConcursoB(val);
  };

  const handleSwapConcursos = () => {
    setConcursoA(concursoB);
    setConcursoB(concursoA);
  };

  const handleQuickCompare = (offsetBack: number) => {
    if (selectableDraws.length < 2) return;
    const latestIdx = 0;
    const olderIdx = Math.min(offsetBack, selectableDraws.length - 1);
    setConcursoB(selectableDraws[latestIdx].concurso);
    setConcursoA(selectableDraws[olderIdx].concurso);
  };

  // Calcula frequência das 25 dezenas na janela de cada concurso selecionado e no intervalo entre eles
  const { chartData, intervalCount, sharedDirectCount, topRising, topFalling } = useMemo(() => {
    const idxA = historicalDraws.findIndex((d) => d.concurso === drawA.concurso);
    const idxB = historicalDraws.findIndex((d) => d.concurso === drawB.concurso);

    const sliceA =
      idxA >= 0 ? historicalDraws.slice(idxA, idxA + windowSize) : historicalDraws.slice(0, windowSize);
    const sliceB =
      idxB >= 0 ? historicalDraws.slice(idxB, idxB + windowSize) : historicalDraws.slice(0, windowSize);

    const minC = Math.min(drawA.concurso, drawB.concurso);
    const maxC = Math.max(drawA.concurso, drawB.concurso);
    const betweenDraws = historicalDraws.filter(
      (d) => d.concurso >= minC && d.concurso <= maxC
    );
    const effectiveIntervalCount = Math.max(1, betweenDraws.length);

    const setA = new Set(drawA.dezenas);
    const setB = new Set(drawB.dezenas);
    const sharedDirect = drawA.dezenas.filter((n) => setB.has(n)).length;

    const rawList: TrendBarDatum[] = Array.from({ length: 25 }, (_, i) => {
      const numero = i + 1;
      const freqA = sliceA.filter((d) => d.dezenas.includes(numero)).length;
      const freqB = sliceB.filter((d) => d.dezenas.includes(numero)).length;
      const freqEntre = betweenDraws.filter((d) => d.dezenas.includes(numero)).length;

      const pctA = Number(((freqA / Math.max(1, sliceA.length)) * 100).toFixed(1));
      const pctB = Number(((freqB / Math.max(1, sliceB.length)) * 100).toFixed(1));
      const pctEntre = Number(((freqEntre / effectiveIntervalCount) * 100).toFixed(1));

      return {
        numero,
        label: numero.toString().padStart(2, '0'),
        freqA,
        freqB,
        pctA,
        pctB,
        delta: freqB - freqA,
        deltaPct: Number((pctB - pctA).toFixed(1)),
        saiuEmA: setA.has(numero),
        saiuEmB: setB.has(numero),
        freqEntre,
        pctEntre,
      };
    });

    const rising = [...rawList]
      .sort((a, b) => b.delta - a.delta || b.freqB - a.freqB)
      .slice(0, 5);
    const falling = [...rawList]
      .sort((a, b) => a.delta - b.delta || a.freqB - b.freqB)
      .slice(0, 5);

    const sorted = [...rawList].sort((a, b) => {
      if (sortMode === 'alta_desc') return b.delta - a.delta || b.freqB - a.freqB;
      if (sortMode === 'queda_desc') return a.delta - b.delta || a.freqB - b.freqB;
      if (sortMode === 'freqB_desc') return b.freqB - a.freqB || a.numero - b.numero;
      return a.numero - b.numero;
    });

    return {
      chartData: sorted,
      intervalCount: effectiveIntervalCount,
      sharedDirectCount: sharedDirect,
      topRising: rising,
      topFalling: falling,
    };
  }, [historicalDraws, drawA, drawB, windowSize, sortMode]);

  const handleApplyTop18Rising = () => {
    if (!onApplyNumbers) return;
    const top18 = [...chartData]
      .sort((a, b) => b.freqB * 1.4 + b.delta - (a.freqB * 1.4 + a.delta))
      .slice(0, 18)
      .map((d) => d.numero)
      .sort((a, b) => a - b);

    onApplyNumbers(top18);
    setAppliedFeedback(`18 dezenas de melhor tendência aplicadas ao Estúdio de Fechamentos!`);
    setTimeout(() => setAppliedFeedback(null), 4000);
  };

  const expectedMean =
    analysisMode === 'janelas_comparativas'
      ? Number((windowSize * 0.6).toFixed(1))
      : Number((intervalCount * 0.6).toFixed(1));

  return (
    <section
      aria-label="Comparação de Tendências entre Concursos Históricos"
      className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-5"
    >
      {/* Cabeçalho */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <GitCompare className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Comparação de Tendências</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums text-amber-300 font-semibold">
              #{drawA.concurso} vs #{drawB.concurso}
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums text-slate-300">
              {Math.abs(drawB.concurso - drawA.concurso)} concurso(s) de distância
            </span>
          </div>
          <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
            Frequência Comparativa das 25 Dezenas entre Dois Concursos Históricos
          </h3>
          <p className="text-xs text-slate-400 max-w-2xl">
            Selecione dois concursos diferentes para comparar o perfil de frequência das 25 dezenas
            lado a lado e identificar quais números ganharam ou perderam força estatística.
          </p>
        </div>

        {/* Atalhos Rápidos */}
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { label: 'Atual vs -10', offset: 10 },
            { label: 'Atual vs -20', offset: 20 },
            { label: 'Atual vs -50', offset: 50 },
          ].map((preset) => (
            <button
              key={preset.offset}
              type="button"
              onClick={() => handleQuickCompare(preset.offset)}
              className="px-3 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs font-mono font-semibold transition cursor-pointer whitespace-nowrap"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Seletores dos Dois Concursos + Controles de Visualização */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-3 items-end bg-slate-950/75 border border-slate-800 rounded-xl p-4">
        {/* Concurso A */}
        <div className="xl:col-span-4 space-y-1.5">
          <label
            htmlFor="trend-select-concurso-a"
            className="text-xs font-semibold text-amber-300 flex items-center justify-between"
          >
            <span>Concurso Histórico A (Referência)</span>
            <span className="font-mono text-[11px] text-slate-400">{drawA.data}</span>
          </label>
          <select
            id="trend-select-concurso-a"
            value={drawA.concurso}
            onChange={(e) => handleSelectConcursoA(parseInt(e.target.value, 10))}
            className="w-full bg-slate-900 border border-amber-500/40 focus:border-amber-400 rounded-xl px-3 py-2 text-xs font-mono text-white cursor-pointer focus:outline-none"
          >
            {selectableDraws.map((d) => (
              <option key={`a-${d.concurso}`} value={d.concurso}>
                Concurso #{d.concurso} — {d.data}
              </option>
            ))}
          </select>
        </div>

        {/* Botão Inverter */}
        <div className="xl:col-span-1 flex justify-center">
          <button
            type="button"
            onClick={handleSwapConcursos}
            className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-amber-300 transition cursor-pointer"
            title="Inverter Concurso A e Concurso B"
            aria-label="Inverter concursos selecionados"
          >
            <ArrowLeftRight className="w-4 h-4" />
          </button>
        </div>

        {/* Concurso B */}
        <div className="xl:col-span-4 space-y-1.5">
          <label
            htmlFor="trend-select-concurso-b"
            className="text-xs font-semibold text-emerald-300 flex items-center justify-between"
          >
            <span>Concurso Histórico B (Comparado)</span>
            <span className="font-mono text-[11px] text-slate-400">{drawB.data}</span>
          </label>
          <select
            id="trend-select-concurso-b"
            value={drawB.concurso}
            onChange={(e) => handleSelectConcursoB(parseInt(e.target.value, 10))}
            className="w-full bg-slate-900 border border-emerald-500/40 focus:border-emerald-400 rounded-xl px-3 py-2 text-xs font-mono text-white cursor-pointer focus:outline-none"
          >
            {selectableDraws.map((d) => (
              <option key={`b-${d.concurso}`} value={d.concurso}>
                Concurso #{d.concurso} — {d.data}
              </option>
            ))}
          </select>
        </div>

        {/* Modo e Janela */}
        <div className="xl:col-span-3 space-y-1.5">
          <span className="text-xs font-semibold text-slate-300 block">
            Base de Frequência
          </span>
          <div className="inline-flex w-full p-1 bg-slate-900 border border-slate-800 rounded-xl">
            <button
              type="button"
              onClick={() => setAnalysisMode('janelas_comparativas')}
              className={`flex-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition cursor-pointer whitespace-nowrap ${
                analysisMode === 'janelas_comparativas'
                  ? 'bg-amber-400 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              A vs B ({windowSize}c)
            </button>
            <button
              type="button"
              onClick={() => setAnalysisMode('intervalo_entre')}
              className={`flex-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition cursor-pointer whitespace-nowrap ${
                analysisMode === 'intervalo_entre'
                  ? 'bg-cyan-400 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Entre A e B ({intervalCount}c)
            </button>
          </div>
        </div>
      </div>

      {/* Barra Secundária: Janela (10/15/20) + Ordenação + Legenda */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          {analysisMode === 'janelas_comparativas' && (
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">Janela por concurso:</span>
              <div className="inline-flex p-0.5 bg-slate-950 border border-slate-800 rounded-lg">
                {([10, 15, 20] as const).map((w) => (
                  <button
                    key={w}
                    type="button"
                    onClick={() => setWindowSize(w)}
                    className={`px-2.5 py-1 rounded-md font-mono text-[11px] font-semibold transition cursor-pointer ${
                      windowSize === w
                        ? 'bg-slate-800 text-amber-300'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {w}c
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">Ordenar:</span>
            <select
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value as SortMode)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-200 cursor-pointer focus:outline-none focus:border-amber-400"
            >
              <option value="numero">Dezena (01 → 25)</option>
              <option value="alta_desc">Maior Alta de Tendência</option>
              <option value="queda_desc">Maior Queda de Tendência</option>
              <option value="freqB_desc">Maior Frequência em #{drawB.concurso}</option>
            </select>
          </div>
        </div>

        {/* Legenda Limpa */}
        <div className="flex flex-wrap items-center gap-4 font-mono text-[11px] text-slate-300">
          {analysisMode === 'janelas_comparativas' ? (
            <>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-amber-400 inline-block" />
                <span>Concurso #{drawA.concurso}</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-400 inline-block" />
                <span>Concurso #{drawB.concurso}</span>
              </span>
            </>
          ) : (
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-cyan-400 inline-block" />
              <span>
                Frequência entre #{Math.min(drawA.concurso, drawB.concurso)} e #
                {Math.max(drawA.concurso, drawB.concurso)}
              </span>
            </span>
          )}
          <span className="text-slate-500">·</span>
          <span className="text-slate-400 tabular-nums">
            Média teórica (60%): <strong className="text-slate-200">{expectedMean}</strong>
          </span>
        </div>
      </div>

      {/* Gráfico de Barras Comparativo (25 Dezenas) */}
      <div className="bg-slate-950/75 border border-slate-800 rounded-xl p-3 sm:p-4">
        <div className="h-[340px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 12, right: 12, left: -12, bottom: 4 }}
              barGap={2}
              barCategoryGap="18%"
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: '#cbd5e1', fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}
                axisLine={{ stroke: '#334155' }}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                cursor={{ fill: 'rgba(148, 163, 184, 0.08)' }}
                content={
                  <TrendComparisonTooltip
                    concursoA={drawA.concurso}
                    concursoB={drawB.concurso}
                    windowSize={windowSize}
                    analysisMode={analysisMode}
                    intervalCount={intervalCount}
                  />
                }
              />
              <ReferenceLine
                y={expectedMean}
                stroke="#64748b"
                strokeDasharray="4 4"
                strokeWidth={1.2}
              />

              {analysisMode === 'janelas_comparativas' ? (
                <>
                  <Bar
                    dataKey="freqA"
                    name={`Concurso #${drawA.concurso}`}
                    fill="#fbbf24"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={14}
                  />
                  <Bar
                    dataKey="freqB"
                    name={`Concurso #${drawB.concurso}`}
                    fill="#34d399"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={14}
                  />
                </>
              ) : (
                <Bar
                  dataKey="freqEntre"
                  name={`Entre #${Math.min(drawA.concurso, drawB.concurso)} e #${Math.max(
                    drawA.concurso,
                    drawB.concurso
                  )}`}
                  fill="#22d3ee"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={22}
                />
              )}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Insights Práticos: Top 5 em Alta, Top 5 em Queda e Síntese Direta */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Top 5 em Alta */}
        <div className="bg-slate-950/75 border border-slate-800 rounded-xl p-4 space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-emerald-400 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4" />
              <span>Maior Alta (#{drawA.concurso} → #{drawB.concurso})</span>
            </span>
          </div>
          <div className="space-y-1.5">
            {topRising.map((item) => (
              <div
                key={`rise-${item.numero}`}
                className="flex items-center justify-between text-xs font-mono tabular-nums py-1 border-b border-slate-800/70 last:border-0"
              >
                <span className="font-bold text-white">Dezena {item.label}</span>
                <span className="text-slate-400">
                  {item.freqA} → {item.freqB}
                </span>
                <span className="font-bold text-emerald-400">
                  {item.delta > 0 ? `+${item.delta}` : item.delta}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Top 5 em Queda */}
        <div className="bg-slate-950/75 border border-slate-800 rounded-xl p-4 space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-rose-400 flex items-center gap-1.5">
              <TrendingDown className="w-4 h-4" />
              <span>Maior Queda (#{drawA.concurso} → #{drawB.concurso})</span>
            </span>
          </div>
          <div className="space-y-1.5">
            {topFalling.map((item) => (
              <div
                key={`fall-${item.numero}`}
                className="flex items-center justify-between text-xs font-mono tabular-nums py-1 border-b border-slate-800/70 last:border-0"
              >
                <span className="font-bold text-white">Dezena {item.label}</span>
                <span className="text-slate-400">
                  {item.freqA} → {item.freqB}
                </span>
                <span className="font-bold text-rose-400">{item.delta}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Síntese & Ação */}
        <div className="bg-slate-950/75 border border-slate-800 rounded-xl p-4 flex flex-col justify-between gap-3">
          <div className="space-y-2">
            <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
              <BarChart3 className="w-4 h-4" />
              <span>Síntese do Comparativo</span>
            </span>
            <div className="space-y-1.5 text-xs text-slate-300 font-mono tabular-nums">
              <div className="flex justify-between">
                <span className="text-slate-400">Repetidas diretas (A ∩ B):</span>
                <strong className="text-white">{sharedDirectCount} de 15</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Concursos no intervalo:</span>
                <strong className="text-white">{intervalCount} sorteios</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Janela comparada:</span>
                <strong className="text-amber-300">{windowSize} concursos</strong>
              </div>
            </div>
          </div>

          {onApplyNumbers && (
            <button
              type="button"
              onClick={handleApplyTop18Rising}
              className="w-full px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-slate-950 text-xs font-black transition cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/15"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Aplicar Top 18 em Alta no Fechamento</span>
            </button>
          )}
        </div>
      </div>

      {appliedFeedback && (
        <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-200 text-xs font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{appliedFeedback}</span>
        </div>
      )}
    </section>
  );
};
