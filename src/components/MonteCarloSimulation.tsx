import React, { useState, useMemo } from 'react';
import { LotofacilDraw, DezenaStats } from '../types/lotofacil';
import { CONCURSO_ATUAL, DEZENAS_STATS } from '../data/lotofacilData';
import {
  runMonteCarloSimulation,
  MonteCarloSimulationResult,
  MonteCarloConfig,
  DEFAULT_MONTE_CARLO_CONFIG,
} from '../services/monteCarloService';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
  ReferenceLine,
  LineChart,
  Line,
} from 'recharts';
import {
  Sparkles,
  TrendingUp,
  RotateCw,
  Sliders,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Target,
  BarChart3,
  Calendar,
  Layers,
  ArrowRight,
  Flame,
  Clock,
  Zap,
} from 'lucide-react';

interface MonteCarloSimulationProps {
  latestDraw?: LotofacilDraw;
  statsList?: DezenaStats[];
  cyclePendingNumbers?: number[];
  onApplyNumbers?: (numbers: number[]) => void;
}

export const MonteCarloSimulation: React.FC<MonteCarloSimulationProps> = ({
  latestDraw = CONCURSO_ATUAL,
  statsList = DEZENAS_STATS,
  cyclePendingNumbers = [17, 22],
  onApplyNumbers,
}) => {
  const [config, setConfig] = useState<MonteCarloConfig>(DEFAULT_MONTE_CARLO_CONFIG);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [selectedDezenaDetail, setSelectedDezenaDetail] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'chart' | 'table'>('grid');
  const [simulationTrigger, setSimulationTrigger] = useState<number>(0);

  // Run simulation
  const simulationResult = useMemo<MonteCarloSimulationResult>(() => {
    return runMonteCarloSimulation(
      latestDraw,
      statsList,
      cyclePendingNumbers,
      config
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latestDraw.concurso, config, simulationTrigger]);

  const handleRerunSimulation = () => {
    setIsSimulating(true);
    setTimeout(() => {
      setSimulationTrigger((prev) => prev + 1);
      setIsSimulating(false);
    }, 200);
  };

  // Chart data: 25 numbers sorted by next draw probability
  const chartData = useMemo(() => {
    return [...simulationResult.projections]
      .sort((a, b) => b.probabilidadeProximoConcurso - a.probabilidadeProximoConcurso)
      .map((p) => ({
        dezena: p.numero.toString().padStart(2, '0'),
        numero: p.numero,
        probProximo: p.probabilidadeProximoConcurso,
        probAoMenosUmaVez: p.probabilidadeAoMenosUmaVez,
        ocorrenciasEsperadas: p.ocorrenciasEsperadas,
        isCycle: p.isCyclePending,
        classificacao: p.classificacao,
      }));
  }, [simulationResult.projections]);

  // Selected dezena trajectory across the 5 draws
  const selectedTrajectory = useMemo(() => {
    const targetNum = selectedDezenaDetail || simulationResult.top15ProximoConcurso[0] || 17;
    const proj = simulationResult.projections.find((p) => p.numero === targetNum);
    if (!proj) return [];

    return simulationResult.proximosConcursos.map((concurso, idx) => ({
      concurso: `#${concurso}`,
      probabilidade: proj.probabilidadesPorConcurso[idx],
      numero: targetNum,
    }));
  }, [selectedDezenaDetail, simulationResult]);

  return (
    <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-5 sm:p-6 shadow-2xl space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold mb-2">
            <Zap className="w-3.5 h-3.5 text-emerald-400" />
            <span>Motor Estocástico de Monte Carlo</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <span>Projeção de Monte Carlo (Próximos 5 Concursos)</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-3xl">
            Simulação computacional de <strong>{config.iterations.toLocaleString('pt-BR')} trajetórias</strong> independentes para projetar a probabilidade de ocorrência das 25 dezenas nos Concursos{' '}
            <strong className="text-emerald-300 font-mono">
              #{simulationResult.proximosConcursos[0]} a #{simulationResult.proximosConcursos[4]}
            </strong>
            , ponderando atraso acumulado, urgência do Ciclo 804 e taxa de repetição.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleRerunSimulation}
            disabled={isSimulating}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 active:scale-95 transition cursor-pointer"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isSimulating ? 'animate-spin' : ''}`} />
            <span>{isSimulating ? 'Simulando...' : 'Rodar Nova Simulação'}</span>
          </button>
        </div>
      </div>

      {/* Simulation Controls & Parameters Bar */}
      <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Sliders className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-semibold text-slate-300">Iterações:</span>
            <select
              value={config.iterations}
              onChange={(e) => setConfig({ ...config, iterations: Number(e.target.value) })}
              className="bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-2.5 py-1 font-mono cursor-pointer"
            >
              <option value={5000}>5.000 iterações (Rápido)</option>
              <option value={10000}>10.000 iterações (Recomendado)</option>
              <option value={25000}>25.000 iterações (Alta Precisão)</option>
              <option value={50000}>50.000 iterações (Máxima Acurácia)</option>
            </select>
          </div>

          <label className="flex items-center gap-2 cursor-pointer text-slate-300">
            <input
              type="checkbox"
              checked={config.includeCycleBias}
              onChange={(e) => setConfig({ ...config, includeCycleBias: e.target.checked })}
              className="rounded border-slate-700 text-emerald-500 focus:ring-emerald-500 bg-slate-900 cursor-pointer"
            />
            <span>Ponderar Fechamento de Ciclo (17 e 22)</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer text-slate-300">
            <input
              type="checkbox"
              checked={config.includeDelayPressure}
              onChange={(e) => setConfig({ ...config, includeDelayPressure: e.target.checked })}
              className="rounded border-slate-700 text-emerald-500 focus:ring-emerald-500 bg-slate-900 cursor-pointer"
            />
            <span>Pressão de Atraso Acumulado</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer text-slate-300">
            <input
              type="checkbox"
              checked={config.includeRepeatBias}
              onChange={(e) => setConfig({ ...config, includeRepeatBias: e.target.checked })}
              className="rounded border-slate-700 text-emerald-500 focus:ring-emerald-500 bg-slate-900 cursor-pointer"
            />
            <span>Taxa de Repetição (~9 do anterior)</span>
          </label>
        </div>

        <div className="text-[11px] font-mono text-slate-400">
          Executado em <strong className="text-emerald-400">{simulationResult.tempoExecucaoMs} ms</strong>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            Próximo Concurso Alvo
          </span>
          <div className="text-xl font-black font-mono text-emerald-400 mt-1">
            #{simulationResult.proximosConcursos[0]}
          </div>
          <span className="text-[10px] text-slate-500">
            1º dos 5 simulados
          </span>
        </div>

        <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            Dezenas Alta Propensão
          </span>
          <div className="text-xl font-black font-mono text-cyan-300 mt-1">
            {simulationResult.projections.filter((p) => p.probabilidadeProximoConcurso >= 65).length} Dezenas
          </div>
          <span className="text-[10px] text-slate-500">
            Probabilidade &gt; 65%
          </span>
        </div>

        <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            Chaves do Ciclo (17 e 22)
          </span>
          <div className="text-xl font-black font-mono text-amber-300 mt-1">
            {simulationResult.projections.find((p) => p.numero === 17)?.probabilidadeProximoConcurso}% / {simulationResult.projections.find((p) => p.numero === 22)?.probabilidadeProximoConcurso}%
          </div>
          <span className="text-[10px] text-amber-400/80">
            Máxima pressão de saída
          </span>
        </div>

        <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            Média de Saídas nos 5
          </span>
          <div className="text-xl font-black font-mono text-purple-300 mt-1">
            3,00 <span className="text-xs text-slate-500">/ 5 sorteios</span>
          </div>
          <span className="text-[10px] text-slate-500">
            Valor esperado teórico: 3,00
          </span>
        </div>
      </div>

      {/* TOP 15 & TOP 18 DERIVED RECOMMENDATION BANNERS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Top 15 for Next Draw */}
        <div className="bg-gradient-to-br from-emerald-950/40 via-slate-950 to-slate-950 p-4 rounded-xl border border-emerald-500/30 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-emerald-300 flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-emerald-400" />
              <span>Top 15 Monte Carlo para o Concurso #{simulationResult.proximosConcursos[0]}</span>
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              Maior Probabilidade
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {simulationResult.top15ProximoConcurso.map((num) => {
              const proj = simulationResult.projections.find((p) => p.numero === num);
              const isCycle = cyclePendingNumbers.includes(num);

              return (
                <div
                  key={num}
                  className={`w-9 h-11 rounded-lg flex flex-col items-center justify-center font-mono font-bold transition shadow-sm ${
                    isCycle
                      ? 'bg-gradient-to-b from-amber-400 to-amber-600 text-slate-950 ring-1 ring-amber-300'
                      : 'bg-emerald-500 text-slate-950'
                  }`}
                  title={`Dezena ${num}: ${proj?.probabilidadeProximoConcurso}% de chance`}
                >
                  <span className="text-xs leading-none">{num.toString().padStart(2, '0')}</span>
                  <span className="text-[8px] opacity-80 mt-0.5">{proj?.probabilidadeProximoConcurso}%</span>
                </div>
              );
            })}
          </div>
          {onApplyNumbers && (
            <button
              onClick={() => onApplyNumbers(simulationResult.top15ProximoConcurso)}
              className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 transition cursor-pointer pt-1"
            >
              <span>Aplicar este Top 15 no Volante de Fechamento</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Top 18 for Combinatorial Wheels */}
        <div className="bg-gradient-to-br from-indigo-950/40 via-slate-950 to-slate-950 p-4 rounded-xl border border-indigo-500/30 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-indigo-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>Top 18 Monte Carlo (Grupo Base para 14 Pontos)</span>
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              Cobertura 5 Concursos
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {simulationResult.top18Desdobramento.map((num) => {
              const proj = simulationResult.projections.find((p) => p.numero === num);
              const isCycle = cyclePendingNumbers.includes(num);

              return (
                <div
                  key={num}
                  className={`w-9 h-11 rounded-lg flex flex-col items-center justify-center font-mono font-bold transition shadow-sm ${
                    isCycle
                      ? 'bg-gradient-to-b from-amber-400 to-amber-600 text-slate-950 ring-1 ring-amber-300'
                      : 'bg-indigo-950 border border-indigo-500/40 text-indigo-200'
                  }`}
                  title={`Dezena ${num}: ${proj?.probabilidadeAoMenosUmaVez}% chance de sair ao menos uma vez nos 5 concursos`}
                >
                  <span className="text-xs leading-none">{num.toString().padStart(2, '0')}</span>
                  <span className="text-[8px] opacity-75 mt-0.5">{proj?.probabilidadeAoMenosUmaVez}%</span>
                </div>
              );
            })}
          </div>
          {onApplyNumbers && (
            <button
              onClick={() => onApplyNumbers(simulationResult.top18Desdobramento)}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1 transition cursor-pointer pt-1"
            >
              <span>Transferir Top 18 Monte Carlo para o Fechamento</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* View Mode Switcher (Grid Heatmap / Recharts Chart / Full Table) */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
          <button
            onClick={() => setViewMode('grid')}
            className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer flex items-center gap-1.5 ${
              viewMode === 'grid'
                ? 'bg-emerald-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Mapa de Calor das 25 Dezenas</span>
          </button>
          <button
            onClick={() => setViewMode('chart')}
            className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer flex items-center gap-1.5 ${
              viewMode === 'chart'
                ? 'bg-emerald-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Gráfico de Projeção (Recharts)</span>
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer flex items-center gap-1.5 ${
              viewMode === 'table'
                ? 'bg-emerald-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Tabela 5 Concursos Detalhada</span>
          </button>
        </div>

        <div className="text-xs text-slate-400 font-mono">
          Clique em qualquer dezena para ver a trajetória de 5 sorteios
        </div>
      </div>

      {/* VIEW 1: HEATMAP GRID (25 DEZENAS) */}
      {viewMode === 'grid' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {simulationResult.projections.map((p) => {
              const isSelected = selectedDezenaDetail === p.numero;
              const isCycle = p.isCyclePending;
              const isTop15 = simulationResult.top15ProximoConcurso.includes(p.numero);

              return (
                <div
                  key={p.numero}
                  onClick={() => setSelectedDezenaDetail(isSelected ? null : p.numero)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between ${
                    isSelected
                      ? 'bg-emerald-950/40 border-emerald-500 ring-2 ring-emerald-400/50 shadow-lg'
                      : isCycle
                      ? 'bg-amber-950/30 border-amber-500/50 hover:border-amber-400'
                      : isTop15
                      ? 'bg-slate-950 border-emerald-500/30 hover:border-emerald-500/60'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div>
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-black text-lg text-white">
                        {p.numero.toString().padStart(2, '0')}
                      </span>
                      {isCycle ? (
                        <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-amber-400 text-slate-950 font-mono">
                          ★ CICLO
                        </span>
                      ) : isTop15 ? (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono">
                          TOP 15
                        </span>
                      ) : (
                        <span className="text-[9px] text-slate-500 font-mono">
                          Atr. {p.atrasoAtual}
                        </span>
                      )}
                    </div>

                    {/* Next Draw Probability */}
                    <div className="mt-2 flex items-baseline justify-between">
                      <span className="text-[11px] text-slate-400">Prob. Conc. #{simulationResult.proximosConcursos[0]}:</span>
                      <span
                        className={`font-mono font-black text-sm ${
                          p.probabilidadeProximoConcurso >= 65
                            ? 'text-emerald-400'
                            : p.probabilidadeProximoConcurso >= 58
                            ? 'text-cyan-300'
                            : 'text-slate-400'
                        }`}
                      >
                        {p.probabilidadeProximoConcurso}%
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-1.5">
                      <div
                        className={`h-full rounded-full ${
                          isCycle
                            ? 'bg-amber-400'
                            : p.probabilidadeProximoConcurso >= 65
                            ? 'bg-emerald-400'
                            : 'bg-cyan-500'
                        }`}
                        style={{ width: `${p.probabilidadeProximoConcurso}%` }}
                      />
                    </div>

                    {/* Expected in 5 draws */}
                    <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">Saídas nos 5:</span>
                      <strong className="text-slate-200 font-mono">
                        {p.ocorrenciasEsperadas}x <span className="text-[10px] text-slate-500 font-normal">({p.probabilidadeAoMenosUmaVez}%)</span>
                      </strong>
                    </div>
                  </div>

                  {/* 5-step miniature trajectory dots */}
                  <div className="mt-2 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[9px] font-mono text-slate-400">
                    {p.probabilidadesPorConcurso.map((prob, idx) => (
                      <span
                        key={idx}
                        className={`px-1 rounded ${
                          prob >= 65
                            ? 'text-emerald-400 font-bold'
                            : prob >= 58
                            ? 'text-slate-300'
                            : 'text-slate-500'
                        }`}
                        title={`Concurso #${simulationResult.proximosConcursos[idx]}: ${prob}%`}
                      >
                        +{idx + 1}: {Math.round(prob)}%
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW 2: RECHARTS PROJECTION CHART */}
      {viewMode === 'chart' && (
        <div className="space-y-6">
          {/* Main Bar Chart: All 25 numbers ranked */}
          <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-white flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-emerald-400" />
                <span>Probabilidade de Ocorrência no Concurso #{simulationResult.proximosConcursos[0]} (Ordenado)</span>
              </span>
              <span className="text-[11px] text-slate-500 font-mono">
                Média teórica: 60%
              </span>
            </div>

            <div className="h-64 sm:h-72 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis
                    dataKey="dezena"
                    stroke="#64748b"
                    tick={{ fill: '#94a3b8', fontSize: 10, fontFamily: 'monospace' }}
                  />
                  <YAxis
                    domain={[45, 85]}
                    stroke="#64748b"
                    tick={{ fill: '#94a3b8', fontSize: 10, fontFamily: 'monospace' }}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-slate-900 border border-slate-700 p-2.5 rounded-xl shadow-xl text-xs space-y-1 font-mono">
                            <span className="font-bold text-white block">Dezena {data.dezena}</span>
                            <span className="text-emerald-400 block">
                              Probabilidade: {data.probProximo}%
                            </span>
                            <span className="text-slate-400 block">
                              Saídas esperadas (5 conc): {data.ocorrenciasEsperadas}x
                            </span>
                            <span className="text-cyan-300 block">
                              Chance ao menos 1x: {data.probAoMenosUmaVez}%
                            </span>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <ReferenceLine
                    y={60}
                    stroke="#64748b"
                    strokeDasharray="4 4"
                    label={{ value: 'Média 60%', fill: '#64748b', fontSize: 10, position: 'right' }}
                  />
                  <Bar dataKey="probProximo" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={
                          entry.isCycle
                            ? '#f59e0b'
                            : entry.probProximo >= 65
                            ? '#10b981'
                            : entry.probProximo >= 58
                            ? '#06b6d4'
                            : '#475569'
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Secondary Line Chart: Selected Dezena Trajectory */}
          <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
              <span className="text-xs font-bold text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-cyan-400" />
                <span>
                  Curva de Probabilidade da Dezena{' '}
                  <strong className="text-emerald-400 font-mono text-sm">
                    {selectedTrajectory[0]?.numero?.toString().padStart(2, '0')}
                  </strong>{' '}
                  ao Longo dos 5 Concursos
                </span>
              </span>

              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <span>Trocar dezena:</span>
                <select
                  value={selectedDezenaDetail || 17}
                  onChange={(e) => setSelectedDezenaDetail(Number(e.target.value))}
                  className="bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-2 py-0.5 font-mono cursor-pointer"
                >
                  {Array.from({ length: 25 }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n}>
                      Dezena {n.toString().padStart(2, '0')}{' '}
                      {cyclePendingNumbers.includes(n) ? '(CICLO)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="h-48 sm:h-56 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={selectedTrajectory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="concurso" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'monospace' }} />
                  <YAxis domain={[45, 90]} stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'monospace' }} tickFormatter={(v) => `${v}%`} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-slate-900 border border-slate-700 p-2.5 rounded-xl text-xs font-mono">
                            <span className="font-bold text-white block">{data.concurso}</span>
                            <span className="text-emerald-400 font-bold">
                              Probabilidade: {data.probabilidade}%
                            </span>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="probabilidade"
                    stroke="#10b981"
                    strokeWidth={3}
                    dot={{ r: 5, fill: '#10b981' }}
                    activeDot={{ r: 7, fill: '#34d399' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 3: FULL PROJECTIONS TABLE (25 DEZENAS x 5 CONCURSOS) */}
      {viewMode === 'table' && (
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 font-bold text-[11px] uppercase tracking-wider border-b border-slate-800 font-mono">
              <tr>
                <th className="p-3">Dezena</th>
                <th className="p-3 text-center">Atraso</th>
                <th className="p-3 text-center text-emerald-400 font-bold">
                  #{simulationResult.proximosConcursos[0]} (+1)
                </th>
                <th className="p-3 text-center">
                  #{simulationResult.proximosConcursos[1]} (+2)
                </th>
                <th className="p-3 text-center">
                  #{simulationResult.proximosConcursos[2]} (+3)
                </th>
                <th className="p-3 text-center">
                  #{simulationResult.proximosConcursos[3]} (+4)
                </th>
                <th className="p-3 text-center">
                  #{simulationResult.proximosConcursos[4]} (+5)
                </th>
                <th className="p-3 text-center text-cyan-300 font-bold">
                  Ao Menos 1x
                </th>
                <th className="p-3 text-center">Média Saídas</th>
                <th className="p-3 text-center">Classificação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 font-mono">
              {[...simulationResult.projections]
                .sort((a, b) => b.probabilidadeProximoConcurso - a.probabilidadeProximoConcurso)
                .map((p) => {
                  const isCycle = p.isCyclePending;

                  return (
                    <tr
                      key={p.numero}
                      className={`hover:bg-slate-900/60 transition ${
                        isCycle ? 'bg-amber-500/5' : ''
                      }`}
                    >
                      <td className="p-3 text-white font-bold flex items-center gap-2">
                        <span
                          className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold ${
                            isCycle
                              ? 'bg-amber-400 text-slate-950'
                              : 'bg-slate-800 text-slate-200'
                          }`}
                        >
                          {p.numero.toString().padStart(2, '0')}
                        </span>
                        {isCycle && (
                          <span className="text-[9px] font-sans px-1.5 py-0.2 rounded bg-amber-400 text-slate-950 font-bold">
                            CICLO
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-center text-slate-400">{p.atrasoAtual}</td>
                      <td className="p-3 text-center text-emerald-400 font-black text-sm">
                        {p.probabilidadesPorConcurso[0]}%
                      </td>
                      <td className="p-3 text-center text-slate-300">
                        {p.probabilidadesPorConcurso[1]}%
                      </td>
                      <td className="p-3 text-center text-slate-300">
                        {p.probabilidadesPorConcurso[2]}%
                      </td>
                      <td className="p-3 text-center text-slate-300">
                        {p.probabilidadesPorConcurso[3]}%
                      </td>
                      <td className="p-3 text-center text-slate-300">
                        {p.probabilidadesPorConcurso[4]}%
                      </td>
                      <td className="p-3 text-center text-cyan-300 font-bold">
                        {p.probabilidadeAoMenosUmaVez}%
                      </td>
                      <td className="p-3 text-center font-bold text-slate-200">
                        {p.ocorrenciasEsperadas}x
                      </td>
                      <td className="p-3 text-center">
                        <span
                          className={`text-[10px] font-sans px-2 py-0.5 rounded-full font-bold ${
                            p.classificacao === 'Alta Probabilidade'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                              : p.classificacao === 'Boa Chance'
                              ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {p.classificacao}
                        </span>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      )}

      {/* Methodological Explanation */}
      <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80 flex items-start gap-3 text-xs text-slate-400">
        <HelpCircle className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong>Fundamentação de Monte Carlo:</strong> O método executa milhares de sorteios futuros simultâneos aplicando a Lei dos Grandes Números. As probabilidades são ajustadas em tempo real com base no fechamento do ciclo atual, na taxa média de 9 dezenas repetidas por concurso e na curva de perigo exponencial dos atrasos anômalos.
        </p>
      </div>
    </div>
  );
};
