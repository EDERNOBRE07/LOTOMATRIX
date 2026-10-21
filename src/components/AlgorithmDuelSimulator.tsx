import React, { useState, useMemo } from 'react';
import { GameTicket, LotofacilDraw, DezenaStats, SimulationResult } from '../types/lotofacil';
import { RECENT_DRAWS, CONCURSO_ATUAL, DEZENAS_STATS } from '../data/lotofacilData';
import {
  generateFechamentoCovering,
  buildOptimalPool,
  runSimulation,
  countMatches,
  DEFAULT_FILTERS,
  FECHAMENTO_PRESETS,
} from '../services/combinatorics';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ReferenceLine,
  Cell,
} from 'recharts';
import {
  Swords,
  Trophy,
  TrendingUp,
  DollarSign,
  ArrowRight,
  RotateCw,
  Award,
  Sparkles,
  ShieldCheck,
  Zap,
  BarChart3,
  CheckCircle2,
  Percent,
} from 'lucide-react';

interface AlgorithmDuelSimulatorProps {
  latestDraw?: LotofacilDraw;
  dynamicStats?: DezenaStats[];
  cyclePendingNumbers?: number[];
  userSavedTickets?: GameTicket[];
  onApplyStrategy?: (numbers: number[], targetHits?: number) => void;
}

export type StrategyKey =
  | 'estrategia_documento'
  | 'top18_ia'
  | 'fechar_ciclo'
  | 'equilibrio_canonico'
  | 'economico_16'
  | 'ouro_17'
  | 'agressivo_19'
  | 'aleatorio_baseline'
  | 'meus_jogos';

interface StrategyDefinition {
  key: StrategyKey;
  name: string;
  shortName: string;
  description: string;
  dezenasCount: number;
  ticketsCount: number;
  badge: string;
}

const STRATEGIES: StrategyDefinition[] = [
  {
    key: 'estrategia_documento',
    name: '⚡ Estratégia Documento (18D • 9 Rep + 9 Aus)',
    shortName: 'Estratégia Documento',
    description: 'Proporção áurea 9 Repetidas e 9 Ausentes calibrada com filtros canônicos',
    dezenasCount: 18,
    ticketsCount: 24,
    badge: '18D • 24 Jogos',
  },
  {
    key: 'top18_ia',
    name: '🤖 Top 18 IA Neural (Garantia 14 Pontos)',
    shortName: 'Top 18 IA',
    description: '18 dezenas de maior propensão probabilística pela rede neural',
    dezenasCount: 18,
    ticketsCount: 24,
    badge: '18D • 24 Jogos',
  },
  {
    key: 'fechar_ciclo',
    name: '🔄 Fechar Ciclo 18D (Pressão Dezenas Atrasadas)',
    shortName: 'Fechar Ciclo 18D',
    description: 'Prioridade absoluta para as dezenas pendentes de fechar as 25',
    dezenasCount: 18,
    ticketsCount: 16,
    badge: '18D • 16 Jogos',
  },
  {
    key: 'equilibrio_canonico',
    name: '⚖️ Equilíbrio Canônico 18D (9 Pares / 9 Ímpares)',
    shortName: 'Equilíbrio Canônico',
    description: 'Rigorosa simetria estrutural paridade e moldura balanceada',
    dezenasCount: 18,
    ticketsCount: 16,
    badge: '18D • 16 Jogos',
  },
  {
    key: 'economico_16',
    name: '💎 Fechamento Econômico 16D (14 se 15)',
    shortName: 'Econômico 16D',
    description: 'Apenas 4 jogos com altíssima taxa de retorno financeiro',
    dezenasCount: 16,
    ticketsCount: 4,
    badge: '16D • 4 Jogos',
  },
  {
    key: 'ouro_17',
    name: '🚀 Fechamento Ouro 17D (8 Jogos)',
    shortName: 'Ouro 17D',
    description: 'Excelente custo-benefício cobrindo 17 dezenas em 8 apostas',
    dezenasCount: 17,
    ticketsCount: 8,
    badge: '17D • 8 Jogos',
  },
  {
    key: 'agressivo_19',
    name: '🔥 Fechamento Agressivo 19D (32 Jogos)',
    shortName: 'Agressivo 19D',
    description: 'Cobertura ampla de 19 dezenas visando cravar 14 e 15 pontos',
    dezenasCount: 19,
    ticketsCount: 32,
    badge: '19D • 32 Jogos',
  },
  {
    key: 'aleatorio_baseline',
    name: '🎲 Surpresinha / Aleatório (Baseline 15D)',
    shortName: 'Aleatório Baseline',
    description: 'Apostas aleatórias sem calibração estatística nem filtros',
    dezenasCount: 15,
    ticketsCount: 10,
    badge: '15D • 10 Jogos',
  },
  {
    key: 'meus_jogos',
    name: '📂 Meus Jogos Salvos Atuais',
    shortName: 'Meus Jogos',
    description: 'Seus bilhetes atualmente salvos em Meus Jogos & Conferidor',
    dezenasCount: 15,
    ticketsCount: 0,
    badge: 'Personalizado',
  },
];

export const AlgorithmDuelSimulator: React.FC<AlgorithmDuelSimulatorProps> = ({
  latestDraw = CONCURSO_ATUAL,
  dynamicStats = DEZENAS_STATS,
  cyclePendingNumbers = [17, 22],
  userSavedTickets = [],
  onApplyStrategy,
}) => {
  const [strategyAKey, setStrategyAKey] = useState<StrategyKey>('estrategia_documento');
  const [strategyBKey, setStrategyBKey] = useState<StrategyKey>('top18_ia');
  const [testScope, setTestScope] = useState<'10_concursos' | '25_concursos' | '50_concursos'>('25_concursos');
  const [activeChartMetric, setActiveChartMetric] = useState<'roi' | 'financeiro' | 'acertos'>('roi');
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [duelRunCounter, setDuelRunCounter] = useState<number>(0);

  // Gera o conjunto de jogos de cada estratégia
  const generateTicketsForStrategy = (key: StrategyKey): { tickets: GameTicket[]; pool: number[] } => {
    if (key === 'meus_jogos' && userSavedTickets.length > 0) {
      const allNums = Array.from(new Set(userSavedTickets.flatMap((t) => t.dezenas))).sort((a, b) => a - b);
      return { tickets: userSavedTickets, pool: allNums };
    }

    let pool: number[] = [];
    let targetHits = 14;
    let maxTickets = 24;

    if (key === 'estrategia_documento') {
      const p = buildOptimalPool(18, latestDraw, dynamicStats, cyclePendingNumbers, 9, 9);
      pool = p.dezenas;
      maxTickets = 24;
    } else if (key === 'top18_ia') {
      const sortedByScore = [...dynamicStats].sort((a, b) => b.vezes - a.vezes).map((s) => s.numero);
      pool = sortedByScore.slice(0, 18).sort((a, b) => a - b);
      maxTickets = 24;
    } else if (key === 'fechar_ciclo') {
      const nonCycle = Array.from({ length: 25 }, (_, i) => i + 1).filter((n) => !cyclePendingNumbers.includes(n));
      pool = [...cyclePendingNumbers, ...nonCycle.slice(0, 18 - cyclePendingNumbers.length)].sort((a, b) => a - b);
      maxTickets = 16;
    } else if (key === 'equilibrio_canonico') {
      const evens = Array.from({ length: 25 }, (_, i) => i + 1).filter((n) => n % 2 === 0).slice(0, 9);
      const odds = Array.from({ length: 25 }, (_, i) => i + 1).filter((n) => n % 2 !== 0).slice(0, 9);
      pool = [...evens, ...odds].sort((a, b) => a - b);
      maxTickets = 16;
    } else if (key === 'economico_16') {
      pool = [1, 2, 4, 7, 9, 10, 11, 13, 14, 15, 17, 18, 20, 22, 24, 25];
      maxTickets = 4;
    } else if (key === 'ouro_17') {
      pool = [1, 2, 4, 7, 9, 10, 11, 13, 14, 15, 17, 18, 20, 21, 22, 24, 25];
      maxTickets = 8;
    } else if (key === 'agressivo_19') {
      pool = [1, 2, 3, 4, 5, 7, 9, 10, 11, 13, 14, 15, 17, 18, 20, 21, 22, 24, 25];
      maxTickets = 32;
    } else {
      // aleatorio_baseline
      const randTickets: GameTicket[] = [];
      for (let i = 1; i <= 10; i++) {
        const nums = Array.from({ length: 25 }, (_, n) => n + 1)
          .sort(() => Math.random() - 0.5)
          .slice(0, 15)
          .sort((a, b) => a - b);
        const molduraCount = nums.filter((n) => [1, 2, 3, 4, 5, 6, 10, 11, 15, 16, 20, 21, 22, 23, 24, 25].includes(n)).length;
        randTickets.push({
          id: `rand-${i}`,
          index: i,
          dezenas: nums,
          pares: nums.filter((n) => n % 2 === 0).length,
          impares: nums.filter((n) => n % 2 !== 0).length,
          primos: nums.filter((n) => [2, 3, 5, 7, 11, 13, 17, 19, 23].includes(n)).length,
          moldura: molduraCount,
          miolo: 15 - molduraCount,
          fibonacci: nums.filter((n) => [1, 2, 3, 5, 8, 13, 21].includes(n)).length,
          repetidas: nums.filter((n) => latestDraw.dezenas.includes(n)).length,
          soma: nums.reduce((a, b) => a + b, 0),
          maxConsecutivas: 3,
          scoreIA: 50,
        });
      }
      return { tickets: randTickets, pool: Array.from({ length: 25 }, (_, i) => i + 1) };
    }

    const tickets = generateFechamentoCovering(
      pool,
      targetHits,
      maxTickets,
      DEFAULT_FILTERS,
      latestDraw.dezenas
    );

    return { tickets, pool };
  };

  // Concursos selecionados para o backtest
  const drawsForBacktest = useMemo(() => {
    let count = 25;
    if (testScope === '10_concursos') count = 10;
    else if (testScope === '50_concursos') count = 50;

    return [latestDraw, ...RECENT_DRAWS.filter((d) => d.concurso !== latestDraw.concurso)].slice(0, count);
  }, [testScope, latestDraw]);

  // Simulação e Comparação do Duelo
  const duelResults = useMemo(() => {
    const stratA = generateTicketsForStrategy(strategyAKey);
    const stratB = generateTicketsForStrategy(strategyBKey);

    const simA = runSimulation(stratA.tickets, drawsForBacktest);
    const simB = runSimulation(stratB.tickets, drawsForBacktest);

    // Determina o vencedor pelo ROI (ou saldo líquido se empatado)
    const winner: 'A' | 'B' | 'Empate' =
      simA.roi > simB.roi ? 'A' : simB.roi > simA.roi ? 'B' : simA.saldoLiquido >= simB.saldoLiquido ? 'A' : 'B';

    const roiDiff = Math.abs(simA.roi - simB.roi);

    return {
      stratA,
      stratB,
      simA,
      simB,
      winner,
      roiDiff: Number(roiDiff.toFixed(1)),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [strategyAKey, strategyBKey, drawsForBacktest, duelRunCounter]);

  const stratAConfig = STRATEGIES.find((s) => s.key === strategyAKey)!;
  const stratBConfig = STRATEGIES.find((s) => s.key === strategyBKey)!;

  const handleRerunDuel = () => {
    setIsSimulating(true);
    setTimeout(() => {
      setDuelRunCounter((c) => c + 1);
      setIsSimulating(false);
    }, 300);
  };

  // Dados para o Gráfico de Barras do Duelo
  const roiChartData = [
    {
      metric: 'Retorno Sobre Investimento (ROI)',
      [stratAConfig.shortName]: duelResults.simA.roi,
      [stratBConfig.shortName]: duelResults.simB.roi,
    },
  ];

  const financialChartData = [
    {
      category: 'Custo Total Investido',
      [stratAConfig.shortName]: duelResults.simA.custoTotal,
      [stratBConfig.shortName]: duelResults.simB.custoTotal,
    },
    {
      category: 'Total de Prêmios Arrecadados',
      [stratAConfig.shortName]: duelResults.simA.premioTotal,
      [stratBConfig.shortName]: duelResults.simB.premioTotal,
    },
    {
      category: 'Saldo Líquido',
      [stratAConfig.shortName]: duelResults.simA.saldoLiquido,
      [stratBConfig.shortName]: duelResults.simB.saldoLiquido,
    },
  ];

  const hitsChartData = [
    {
      faixa: '11 Pontos',
      [stratAConfig.shortName]: duelResults.simA.acertos11,
      [stratBConfig.shortName]: duelResults.simB.acertos11,
    },
    {
      faixa: '12 Pontos',
      [stratAConfig.shortName]: duelResults.simA.acertos12,
      [stratBConfig.shortName]: duelResults.simB.acertos12,
    },
    {
      faixa: '13 Pontos',
      [stratAConfig.shortName]: duelResults.simA.acertos13,
      [stratBConfig.shortName]: duelResults.simB.acertos13,
    },
    {
      faixa: '14 Pontos',
      [stratAConfig.shortName]: duelResults.simA.acertos14,
      [stratBConfig.shortName]: duelResults.simB.acertos14,
    },
    {
      faixa: '15 Pontos',
      [stratAConfig.shortName]: duelResults.simA.acertos15,
      [stratBConfig.shortName]: duelResults.simB.acertos15,
    },
  ];

  return (
    <div className="bg-slate-900/95 rounded-2xl border border-slate-800 p-5 sm:p-6 shadow-2xl space-y-6 font-sans">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-gradient-to-br from-rose-500/20 via-pink-500/20 to-amber-500/20 text-rose-400 border border-rose-500/30">
              <Swords className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <span>Duelo de Algoritmos: Comparativo de Eficiência & ROI</span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  Head-to-Head
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Simule e compare o desempenho financeiro de 2 matrizes de fechamento simultaneamente contra o histórico
                oficial da Caixa para descobrir qual modelo entrega o melhor retorno líquido sobre o investimento.
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleRerunDuel}
          disabled={isSimulating}
          className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-400 hover:to-pink-400 text-white font-bold text-xs shadow-lg shadow-rose-500/20 transition cursor-pointer"
        >
          <RotateCw className={`w-3.5 h-3.5 ${isSimulating ? 'animate-spin' : ''}`} />
          <span>{isSimulating ? 'Calculando Duelo...' : 'Recalcular Duelo'}</span>
        </button>
      </div>

      {/* Selectors Bar: Estratégia A vs Estratégia B & Scope */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Selector A */}
        <div className="bg-slate-950/80 p-4 rounded-xl border border-emerald-500/40 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 uppercase tracking-wider">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
              Algoritmo A (Verde)
            </span>
            <span className="text-[10px] font-mono text-slate-400">
              {stratAConfig.badge}
            </span>
          </div>

          <select
            value={strategyAKey}
            onChange={(e) => setStrategyAKey(e.target.value as StrategyKey)}
            className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg p-2 text-xs font-semibold focus:outline-none focus:border-emerald-500 cursor-pointer"
          >
            {STRATEGIES.map((s) => (
              <option key={s.key} value={s.key} disabled={s.key === 'meus_jogos' && userSavedTickets.length === 0}>
                {s.name} {s.key === 'meus_jogos' && userSavedTickets.length === 0 ? '(Nenhum salvo)' : ''}
              </option>
            ))}
          </select>

          <p className="text-[11px] text-slate-400 leading-tight">
            {stratAConfig.description} • {duelResults.stratA.tickets.length} apostas por concurso.
          </p>
        </div>

        {/* Selector B */}
        <div className="bg-slate-950/80 p-4 rounded-xl border border-sky-500/40 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-sky-400 flex items-center gap-1.5 uppercase tracking-wider">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-400"></span>
              Algoritmo B (Azul)
            </span>
            <span className="text-[10px] font-mono text-slate-400">
              {stratBConfig.badge}
            </span>
          </div>

          <select
            value={strategyBKey}
            onChange={(e) => setStrategyBKey(e.target.value as StrategyKey)}
            className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg p-2 text-xs font-semibold focus:outline-none focus:border-sky-500 cursor-pointer"
          >
            {STRATEGIES.map((s) => (
              <option key={s.key} value={s.key} disabled={s.key === 'meus_jogos' && userSavedTickets.length === 0}>
                {s.name} {s.key === 'meus_jogos' && userSavedTickets.length === 0 ? '(Nenhum salvo)' : ''}
              </option>
            ))}
          </select>

          <p className="text-[11px] text-slate-400 leading-tight">
            {stratBConfig.description} • {duelResults.stratB.tickets.length} apostas por concurso.
          </p>
        </div>

        {/* Scope Selector */}
        <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Escopo Histórico de Teste
            </span>
            <span className="text-[10px] font-mono text-emerald-400 font-bold">
              {drawsForBacktest.length} sorteios
            </span>
          </div>

          <select
            value={testScope}
            onChange={(e) => setTestScope(e.target.value as any)}
            className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg p-2 text-xs font-semibold focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            <option value="10_concursos">Últimos 10 Concursos Oficiais</option>
            <option value="25_concursos">Últimos 25 Concursos Oficiais (Recomendado)</option>
            <option value="50_concursos">Últimos 50 Concursos Oficiais (Longo Prazo)</option>
          </select>

          <p className="text-[11px] text-slate-400 leading-tight">
            Concursos #{drawsForBacktest[drawsForBacktest.length - 1]?.concurso} ao #{latestDraw.concurso}.
          </p>
        </div>
      </div>

      {/* Duel Winner Banner */}
      <div className="bg-gradient-to-r from-amber-950/60 via-slate-950 to-slate-950 rounded-2xl border-2 border-amber-500/40 p-4 sm:p-5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 rounded-2xl font-black shadow-lg shadow-amber-500/20 shrink-0">
            <Trophy className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-amber-400 text-slate-950 font-black text-[10px] uppercase px-2 py-0.5 rounded-full tracking-wider font-mono">
                Vencedor do Duelo
              </span>
              <span className="text-xs text-amber-300 font-bold">
                {duelResults.winner === 'A' ? stratAConfig.shortName : stratBConfig.shortName}
              </span>
            </div>

            <h4 className="text-lg font-black text-white mt-0.5">
              {duelResults.winner === 'A' ? stratAConfig.shortName : stratBConfig.shortName} superou o adversário com{' '}
              <span className="text-emerald-400 font-mono">+{duelResults.roiDiff}%</span> de vantagem em ROI!
            </h4>
            <p className="text-xs text-slate-300 mt-0.5">
              {duelResults.winner === 'A'
                ? `Algoritmo A obteve ROI de ${duelResults.simA.roi}% (Saldo R$ ${duelResults.simA.saldoLiquido.toFixed(2)}) versus ${duelResults.simB.roi}% do Algoritmo B.`
                : `Algoritmo B obteve ROI de ${duelResults.simB.roi}% (Saldo R$ ${duelResults.simB.saldoLiquido.toFixed(2)}) versus ${duelResults.simA.roi}% do Algoritmo A.`}
            </p>
          </div>
        </div>

        {onApplyStrategy && (
          <button
            type="button"
            onClick={() => {
              const winningPool = duelResults.winner === 'A' ? duelResults.stratA.pool : duelResults.stratB.pool;
              onApplyStrategy(winningPool);
            }}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-xs shadow-lg transition cursor-pointer shrink-0"
          >
            <span>Carregar Vencedor no Fechamento</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Metric Selector Tabs for Chart */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-slate-800">
        <div className="flex items-center gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800 text-xs">
          <button
            type="button"
            onClick={() => setActiveChartMetric('roi')}
            className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer flex items-center gap-1.5 ${
              activeChartMetric === 'roi'
                ? 'bg-emerald-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Percent className="w-3.5 h-3.5" />
            <span>Comparativo de ROI (%)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveChartMetric('financeiro')}
            className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer flex items-center gap-1.5 ${
              activeChartMetric === 'financeiro'
                ? 'bg-emerald-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span>Custo vs Premiações (R$)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveChartMetric('acertos')}
            className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer flex items-center gap-1.5 ${
              activeChartMetric === 'acertos'
                ? 'bg-emerald-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            <span>Faixas de Acerto (11 a 15)</span>
          </button>
        </div>

        <div className="text-xs text-slate-400 font-mono">
          <span className="text-emerald-400 font-bold">Verde: {stratAConfig.shortName}</span>
          <span className="mx-2">•</span>
          <span className="text-sky-400 font-bold">Azul: {stratBConfig.shortName}</span>
        </div>
      </div>

      {/* Comparative Bar Chart */}
      <div className="bg-slate-950/80 rounded-xl border border-slate-800 p-4">
        <div className="h-64 sm:h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            {activeChartMetric === 'roi' ? (
              <BarChart data={roiChartData} margin={{ top: 20, right: 30, left: 10, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="metric" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis
                  stroke="#64748b"
                  tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'monospace' }}
                  tickFormatter={(val) => `${val}%`}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-slate-900 border border-slate-700 p-3 rounded-xl shadow-xl text-xs space-y-1.5 font-mono">
                          <strong className="text-white block border-b border-slate-800 pb-1">
                            Eficiência de ROI
                          </strong>
                          <div className="text-emerald-400 flex items-center justify-between gap-4">
                            <span>{stratAConfig.shortName}:</span>
                            <span className="font-bold">{payload[0]?.value}%</span>
                          </div>
                          <div className="text-sky-400 flex items-center justify-between gap-4">
                            <span>{stratBConfig.shortName}:</span>
                            <span className="font-bold">{payload[1]?.value}%</span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <ReferenceLine y={0} stroke="#475569" strokeWidth={1.5} />
                <Bar dataKey={stratAConfig.shortName} fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey={stratBConfig.shortName} fill="#0ea5e9" radius={[4, 4, 0, 0]} />
              </BarChart>
            ) : activeChartMetric === 'financeiro' ? (
              <BarChart data={financialChartData} margin={{ top: 20, right: 30, left: 20, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="category" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis
                  stroke="#64748b"
                  tick={{ fill: '#94a3b8', fontSize: 10, fontFamily: 'monospace' }}
                  tickFormatter={(val) => `R$ ${val}`}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-slate-900 border border-slate-700 p-3 rounded-xl shadow-xl text-xs space-y-1.5 font-mono">
                          <strong className="text-white block border-b border-slate-800 pb-1">{label}</strong>
                          <div className="text-emerald-400 flex items-center justify-between gap-4">
                            <span>{stratAConfig.shortName}:</span>
                            <span className="font-bold">R$ {Number(payload[0]?.value).toFixed(2)}</span>
                          </div>
                          <div className="text-sky-400 flex items-center justify-between gap-4">
                            <span>{stratBConfig.shortName}:</span>
                            <span className="font-bold">R$ {Number(payload[1]?.value).toFixed(2)}</span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <ReferenceLine y={0} stroke="#475569" strokeWidth={1} />
                <Bar dataKey={stratAConfig.shortName} fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey={stratBConfig.shortName} fill="#0ea5e9" radius={[4, 4, 0, 0]} />
              </BarChart>
            ) : (
              <BarChart data={hitsChartData} margin={{ top: 20, right: 30, left: 10, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="faixa" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'monospace' }} />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-slate-900 border border-slate-700 p-3 rounded-xl shadow-xl text-xs space-y-1.5 font-mono">
                          <strong className="text-white block border-b border-slate-800 pb-1">{label}</strong>
                          <div className="text-emerald-400 flex items-center justify-between gap-4">
                            <span>{stratAConfig.shortName}:</span>
                            <span className="font-bold">{payload[0]?.value} bilhete(s)</span>
                          </div>
                          <div className="text-sky-400 flex items-center justify-between gap-4">
                            <span>{stratBConfig.shortName}:</span>
                            <span className="font-bold">{payload[1]?.value} bilhete(s)</span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey={stratAConfig.shortName} fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey={stratBConfig.shortName} fill="#0ea5e9" radius={[4, 4, 0, 0]} />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* Head-to-Head Detailed Comparative Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-950 text-slate-400 font-mono text-[11px] uppercase tracking-wider border-b border-slate-800">
            <tr>
              <th className="p-3">Métrica Estatística / Financeira</th>
              <th className="p-3 text-emerald-400 font-bold">{stratAConfig.shortName} (A)</th>
              <th className="p-3 text-sky-400 font-bold">{stratBConfig.shortName} (B)</th>
              <th className="p-3 text-right pr-4">Diferencial / Vantagem</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 font-mono">
            <tr>
              <td className="p-3 text-slate-300 font-sans font-medium">ROI (Retorno Sobre Investimento)</td>
              <td className="p-3 font-bold text-sm text-emerald-400">{duelResults.simA.roi}%</td>
              <td className="p-3 font-bold text-sm text-sky-400">{duelResults.simB.roi}%</td>
              <td className="p-3 text-right pr-4 font-bold text-amber-300">
                {duelResults.winner === 'A'
                  ? `+${duelResults.roiDiff}% para Algoritmo A`
                  : `+${duelResults.roiDiff}% para Algoritmo B`}
              </td>
            </tr>
            <tr>
              <td className="p-3 text-slate-300 font-sans font-medium">Saldo Líquido Final (R$)</td>
              <td className={`p-3 font-bold ${duelResults.simA.saldoLiquido >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                R$ {duelResults.simA.saldoLiquido.toFixed(2)}
              </td>
              <td className={`p-3 font-bold ${duelResults.simB.saldoLiquido >= 0 ? 'text-sky-400' : 'text-rose-400'}`}>
                R$ {duelResults.simB.saldoLiquido.toFixed(2)}
              </td>
              <td className="p-3 text-right pr-4 text-slate-300">
                Dif. R$ {Math.abs(duelResults.simA.saldoLiquido - duelResults.simB.saldoLiquido).toFixed(2)}
              </td>
            </tr>
            <tr>
              <td className="p-3 text-slate-300 font-sans font-medium">Total de Prêmios Arrecadados (R$)</td>
              <td className="p-3 text-slate-200">R$ {duelResults.simA.premioTotal.toFixed(2)}</td>
              <td className="p-3 text-slate-200">R$ {duelResults.simB.premioTotal.toFixed(2)}</td>
              <td className="p-3 text-right pr-4 text-slate-400">
                {duelResults.simA.premioTotal >= duelResults.simB.premioTotal ? 'A faturou mais' : 'B faturou mais'}
              </td>
            </tr>
            <tr>
              <td className="p-3 text-slate-300 font-sans font-medium">Custo Total Investido (R$)</td>
              <td className="p-3 text-slate-400">R$ {duelResults.simA.custoTotal.toFixed(2)}</td>
              <td className="p-3 text-slate-400">R$ {duelResults.simB.custoTotal.toFixed(2)}</td>
              <td className="p-3 text-right pr-4 text-slate-400">
                {duelResults.simA.custoTotal <= duelResults.simB.custoTotal ? 'A é mais econômico' : 'B é mais econômico'}
              </td>
            </tr>
            <tr>
              <td className="p-3 text-slate-300 font-sans font-medium">Bilhetes com 14 Pontos</td>
              <td className="p-3 font-bold text-amber-300">{duelResults.simA.acertos14} bilhete(s)</td>
              <td className="p-3 font-bold text-amber-300">{duelResults.simB.acertos14} bilhete(s)</td>
              <td className="p-3 text-right pr-4 text-slate-300">
                {duelResults.simA.acertos14 > duelResults.simB.acertos14 ? 'A cravou mais' : duelResults.simB.acertos14 > duelResults.simA.acertos14 ? 'B cravou mais' : 'Empate'}
              </td>
            </tr>
            <tr>
              <td className="p-3 text-slate-300 font-sans font-medium">Bilhetes com 15 Pontos (Jackpot)</td>
              <td className="p-3 font-bold text-yellow-400">{duelResults.simA.acertos15} bilhete(s)</td>
              <td className="p-3 font-bold text-yellow-400">{duelResults.simB.acertos15} bilhete(s)</td>
              <td className="p-3 text-right pr-4 text-slate-300">
                {duelResults.simA.acertos15 > duelResults.simB.acertos15 ? 'A cravou 15!' : duelResults.simB.acertos15 > duelResults.simA.acertos15 ? 'B cravou 15!' : 'Nenhum'}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};
