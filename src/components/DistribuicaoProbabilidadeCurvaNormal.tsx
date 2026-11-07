import React, { useState, useMemo, useEffect } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ReferenceLine,
  Cell,
} from 'recharts';
import { LotofacilDraw, GameTicket } from '../types/lotofacil';
import { CONCURSO_ATUAL, RECENT_DRAWS } from '../data/lotofacilData';
import { SavedFechamentoPrognostico, getSavedFechamentos } from '../services/savedFechamentosStorage';
import { countMatches } from '../services/combinatorics';
import { getHistoricalNDraws } from '../services/historical100Draws';
import {
  TrendingUp,
  Award,
  Calendar,
  Layers,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  Scale,
  Target,
  RefreshCw,
  Info,
  BarChart,
  Activity,
  Zap,
} from 'lucide-react';

interface DistribuicaoProbabilidadeCurvaNormalProps {
  latestDraw?: LotofacilDraw;
  savedTickets?: GameTicket[];
  fechamentoNome?: string;
}

// Total de combinações da Lotofácil C(25, 15) = 3.268.760
const TOTAL_COMBINACOES_LOTOFACIL = 3268760;

// Tabela hipergeométrica exata da Lotofácil para k acertos de 0 a 15
// P(X = k) = [C(15, k) * C(10, 15 - k)] / C(25, 15)
const TABELA_PROBABILIDADE_TEORICA: Record<
  number,
  {
    combinacoes: number;
    probabilidadePercent: number;
    odds: string;
    premiacao: string;
    isPremiado: boolean;
  }
> = {
  0: { combinacoes: 0, probabilidadePercent: 0, odds: 'Impossível', premiacao: 'Sem Prêmio', isPremiado: false },
  1: { combinacoes: 0, probabilidadePercent: 0, odds: 'Impossível', premiacao: 'Sem Prêmio', isPremiado: false },
  2: { combinacoes: 0, probabilidadePercent: 0, odds: 'Impossível', premiacao: 'Sem Prêmio', isPremiado: false },
  3: { combinacoes: 0, probabilidadePercent: 0, odds: 'Impossível', premiacao: 'Sem Prêmio', isPremiado: false },
  4: { combinacoes: 0, probabilidadePercent: 0, odds: 'Impossível', premiacao: 'Sem Prêmio', isPremiado: false },
  5: { combinacoes: 3003, probabilidadePercent: (3003 / TOTAL_COMBINACOES_LOTOFACIL) * 100, odds: '1 em 1.088', premiacao: 'Sem Prêmio', isPremiado: false },
  6: { combinacoes: 50050, probabilidadePercent: (50050 / TOTAL_COMBINACOES_LOTOFACIL) * 100, odds: '1 em 65,3', premiacao: 'Sem Prêmio', isPremiado: false },
  7: { combinacoes: 289575, probabilidadePercent: (289575 / TOTAL_COMBINACOES_LOTOFACIL) * 100, odds: '1 em 11,3', premiacao: 'Sem Prêmio', isPremiado: false },
  8: { combinacoes: 772200, probabilidadePercent: (772200 / TOTAL_COMBINACOES_LOTOFACIL) * 100, odds: '1 em 4,2', premiacao: 'Sem Prêmio', isPremiado: false },
  9: { combinacoes: 1051050, probabilidadePercent: (1051050 / TOTAL_COMBINACOES_LOTOFACIL) * 100, odds: '1 em 3,1 (Média μ)', premiacao: 'Pico da Curva Normal', isPremiado: false },
  10: { combinacoes: 756756, probabilidadePercent: (756756 / TOTAL_COMBINACOES_LOTOFACIL) * 100, odds: '1 em 4,3', premiacao: 'Quase Premiado', isPremiado: false },
  11: { combinacoes: 286650, probabilidadePercent: (286650 / TOTAL_COMBINACOES_LOTOFACIL) * 100, odds: '1 em 11,4', premiacao: 'R$ 6,00 (Fixo)', isPremiado: true },
  12: { combinacoes: 54600, probabilidadePercent: (54600 / TOTAL_COMBINACOES_LOTOFACIL) * 100, odds: '1 em 59,9', premiacao: 'R$ 12,00 (Fixo)', isPremiado: true },
  13: { combinacoes: 4725, probabilidadePercent: (4725 / TOTAL_COMBINACOES_LOTOFACIL) * 100, odds: '1 em 691,8', premiacao: 'R$ 30,00 (Fixo)', isPremiado: true },
  14: { combinacoes: 150, probabilidadePercent: (150 / TOTAL_COMBINACOES_LOTOFACIL) * 100, odds: '1 em 21.791', premiacao: 'R$ 1.500+ (Variável)', isPremiado: true },
  15: { combinacoes: 1, probabilidadePercent: (1 / TOTAL_COMBINACOES_LOTOFACIL) * 100, odds: '1 em 3.268.760', premiacao: 'Prêmio Milionário', isPremiado: true },
};

interface ProbabilityDataPoint {
  pontos: number;
  pontosLabel: string;
  probTeoricaPercent: number;
  probTeoricaCombinacoes: number;
  oddsTeorica: string;
  premiacao: string;
  isPremiado: boolean;
  userTicketsCount: number;
  userTicketsPercent: number;
  isPeakUser: boolean;
  isPeakTeorico: boolean;
}

export const DistribuicaoProbabilidadeCurvaNormal: React.FC<
  DistribuicaoProbabilidadeCurvaNormalProps
> = ({
  latestDraw = CONCURSO_ATUAL,
  savedTickets: initialSavedTickets = [],
  fechamentoNome = 'Fechamento Ativo',
}) => {
  const [savedFechamentos, setSavedFechamentos] = useState<SavedFechamentoPrognostico[]>(() =>
    getSavedFechamentos()
  );
  const [selectedFechamentoId, setSelectedFechamentoId] = useState<string>('todos');
  const [selectedConcursoRef, setSelectedConcursoRef] = useState<number>(latestDraw.concurso);
  const [viewMetric, setViewMetric] = useState<'percentual' | 'quantidade'>('percentual');

  // Atualiza fechamentos salvos ao receber eventos de salvamento
  useEffect(() => {
    const handleUpdated = () => {
      setSavedFechamentos(getSavedFechamentos());
    };
    window.addEventListener('lotosniper-saved-fechamentos-updated', handleUpdated);
    return () => {
      window.removeEventListener('lotosniper-saved-fechamentos-updated', handleUpdated);
    };
  }, []);

  // Lista de concursos disponíveis para conferência de referência
  const availableDraws = useMemo(() => {
    const hist = getHistoricalNDraws(30);
    const set = new Map<number, LotofacilDraw>();
    if (latestDraw?.concurso) set.set(latestDraw.concurso, latestDraw);
    (RECENT_DRAWS || []).forEach((d) => set.set(d.concurso, d));
    hist.forEach((d) => set.set(d.concurso, d));
    return Array.from(set.values()).sort((a, b) => b.concurso - a.concurso);
  }, [latestDraw]);

  // Obter dezenas do concurso de referência selecionado
  const activeDraw = useMemo(() => {
    return availableDraws.find((d) => d.concurso === selectedConcursoRef) || latestDraw;
  }, [availableDraws, selectedConcursoRef, latestDraw]);

  // Obter bilhetes a avaliar
  const evaluatedTickets = useMemo(() => {
    if (selectedFechamentoId === 'todos') {
      const tickets: GameTicket[] = [];
      savedFechamentos.forEach((f) => {
        if (Array.isArray(f.tickets)) {
          tickets.push(...f.tickets);
        }
      });
      if (tickets.length > 0) return tickets;
      return initialSavedTickets;
    }

    const found = savedFechamentos.find((f) => f.id === selectedFechamentoId);
    if (found && Array.isArray(found.tickets) && found.tickets.length > 0) {
      return found.tickets;
    }
    return initialSavedTickets;
  }, [savedFechamentos, selectedFechamentoId, initialSavedTickets]);

  // Contagem de acertos dos bilhetes do usuário contra o concurso de referência
  const { chartData, statsSummary } = useMemo(() => {
    const counts: Record<number, number> = {};
    for (let i = 0; i <= 15; i++) counts[i] = 0;

    const totalTickets = evaluatedTickets.length;
    let totalScoreSum = 0;
    let premiadosCount = 0;

    if (totalTickets > 0 && activeDraw?.dezenas?.length === 15) {
      evaluatedTickets.forEach((ticket) => {
        const hits = countMatches(ticket.dezenas, activeDraw.dezenas);
        const clampedHits = Math.max(0, Math.min(15, hits));
        counts[clampedHits] = (counts[clampedHits] || 0) + 1;
        totalScoreSum += clampedHits;
        if (clampedHits >= 11) {
          premiadosCount++;
        }
      });
    }

    // Identificar pico do usuário
    let maxUserCount = 0;
    let userPeakHits = 9;
    for (let i = 0; i <= 15; i++) {
      if (counts[i] > maxUserCount) {
        maxUserCount = counts[i];
        userPeakHits = i;
      }
    }

    const data: ProbabilityDataPoint[] = [];
    for (let k = 5; k <= 15; k++) {
      const teorico = TABELA_PROBABILIDADE_TEORICA[k] || {
        combinacoes: 0,
        probabilidadePercent: 0,
        odds: '-',
        premiacao: 'Sem Prêmio',
        isPremiado: false,
      };

      const userCount = counts[k] || 0;
      const userPercent = totalTickets > 0 ? (userCount / totalTickets) * 100 : 0;

      data.push({
        pontos: k,
        pontosLabel: `${k} pts`,
        probTeoricaPercent: Number(teorico.probabilidadePercent.toFixed(3)),
        probTeoricaCombinacoes: teorico.combinacoes,
        oddsTeorica: teorico.odds,
        premiacao: teorico.premiacao,
        isPremiado: teorico.isPremiado,
        userTicketsCount: userCount,
        userTicketsPercent: Number(userPercent.toFixed(2)),
        isPeakUser: k === userPeakHits && totalTickets > 0,
        isPeakTeorico: k === 9,
      });
    }

    const mediaUsuario = totalTickets > 0 ? totalScoreSum / totalTickets : 9.0;
    const mediaTeorica = 9.0;
    const deltaMedia = mediaUsuario - mediaTeorica;
    const taxaPremiacaoUsuario = totalTickets > 0 ? (premiadosCount / totalTickets) * 100 : 0;
    const taxaPremiacaoTeorica = 10.589; // 11 a 15 pontos teóricos somam ~10.59%

    return {
      chartData: data,
      statsSummary: {
        totalTickets,
        mediaUsuario,
        mediaTeorica,
        deltaMedia,
        premiadosCount,
        taxaPremiacaoUsuario,
        taxaPremiacaoTeorica,
        userPeakHits,
      },
    };
  }, [evaluatedTickets, activeDraw]);

  return (
    <div className="bg-slate-900/90 rounded-3xl border-2 border-slate-800 p-5 sm:p-7 shadow-2xl space-y-6 animate-fadeIn">
      {/* Cabeçalho */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between pb-5 border-b border-slate-800 gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-mono font-black uppercase px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1.5">
              <BarChart className="w-3.5 h-3.5 text-amber-400" />
              <span>DISTRIBUIÇÃO DE PROBABILIDADE • RECHARTS</span>
            </span>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              <span>Curva Hipergeométrica Gaussiana</span>
            </span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-white mt-1.5 flex items-center gap-2">
            <span>Distribuição de Probabilidade vs. Curva Normal</span>
          </h2>
          <p className="text-xs text-slate-300 mt-1 max-w-3xl leading-relaxed">
            Compara a <strong>curva normal teórica de probabilidade da Lotofácil</strong> (distribuição aleatória de 3.268.760 combinações) com a <strong>frequência real de acertos dos seus jogos salvos</strong>, demonstrando o deslocamento estatístico para a zona de premiação (11 a 15 acertos).
          </p>
        </div>

        {/* Controles de Filtro e Visualização */}
        <div className="flex items-center gap-2.5 flex-wrap shrink-0">
          {/* Seletor de Fechamento */}
          <div className="flex items-center gap-1.5 bg-slate-950/80 px-3 py-1.5 rounded-xl border border-slate-800">
            <Layers className="w-3.5 h-3.5 text-amber-400" />
            <select
              value={selectedFechamentoId}
              onChange={(e) => setSelectedFechamentoId(e.target.value)}
              className="bg-transparent text-xs text-slate-200 font-semibold focus:outline-none cursor-pointer max-w-[210px] truncate"
              title="Selecione o fechamento para comparar"
            >
              <option value="todos" className="bg-slate-900 text-slate-200">
                Todos os Fechamentos Salvos ({savedFechamentos.length})
              </option>
              {savedFechamentos.map((f, i) => (
                <option key={f.id} value={f.id} className="bg-slate-900 text-slate-200">
                  #{i + 1} - {f.tipoFechamento || f.modalidadeMatriz} ({f.totalJogos} jogos)
                </option>
              ))}
            </select>
          </div>

          {/* Seletor de Concurso de Referência */}
          <div className="flex items-center gap-1.5 bg-slate-950/80 px-3 py-1.5 rounded-xl border border-slate-800">
            <Calendar className="w-3.5 h-3.5 text-emerald-400" />
            <select
              value={selectedConcursoRef}
              onChange={(e) => setSelectedConcursoRef(Number(e.target.value))}
              className="bg-transparent text-xs text-slate-200 font-semibold focus:outline-none cursor-pointer"
              title="Concurso base para cálculo de acertos reais"
            >
              {availableDraws.slice(0, 15).map((d) => (
                <option key={d.concurso} value={d.concurso} className="bg-slate-900 text-slate-200">
                  Concurso #{d.concurso} ({d.data})
                </option>
              ))}
            </select>
          </div>

          {/* Alternador de Métrica (% ou Quantidade) */}
          <div className="flex items-center bg-slate-950/80 p-0.5 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setViewMetric('percentual')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                viewMetric === 'percentual'
                  ? 'bg-amber-400 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Percentual (%)
            </button>
            <button
              type="button"
              onClick={() => setViewMetric('quantidade')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                viewMetric === 'quantidade'
                  ? 'bg-amber-400 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Qtd. Bilhetes
            </button>
          </div>
        </div>
      </div>

      {/* Cards de Métricas / KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Média de Acertos dos Jogos Salvos */}
        <div className="bg-slate-950/70 border border-slate-800/90 rounded-2xl p-4 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-semibold">Média dos Seus Jogos (μ)</span>
            <Activity className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-white font-mono">
              {statsSummary.mediaUsuario.toFixed(2)}
            </span>
            <span className="text-xs text-slate-400">pontos</span>
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-xs">
            {statsSummary.deltaMedia >= 0 ? (
              <span className="text-emerald-400 font-bold flex items-center gap-0.5">
                <ArrowUpRight className="w-3.5 h-3.5" />
                +{statsSummary.deltaMedia.toFixed(2)} vs Aleatório
              </span>
            ) : (
              <span className="text-rose-400 font-bold">
                {statsSummary.deltaMedia.toFixed(2)} vs Aleatório
              </span>
            )}
            <span className="text-[11px] text-slate-500 font-mono">(Média Teórica: 9,00)</span>
          </div>
        </div>

        {/* Card 2: Taxa na Zona de Premiação (11 a 15 Pontos) */}
        <div className="bg-slate-950/70 border border-slate-800/90 rounded-2xl p-4 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-semibold">Zona Premiada (11 a 15)</span>
            <Award className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-amber-400 font-mono">
              {statsSummary.taxaPremiacaoUsuario.toFixed(1)}%
            </span>
            <span className="text-xs text-slate-400 font-mono">
              ({statsSummary.premiadosCount}/{statsSummary.totalTickets} bilhetes)
            </span>
          </div>
          <div className="mt-1 text-xs text-slate-400">
            Aposta aleatória comum:{' '}
            <strong className="text-slate-300 font-mono">
              {statsSummary.taxaPremiacaoTeorica.toFixed(1)}%
            </strong>
          </div>
        </div>

        {/* Card 3: Pico de Concentração */}
        <div className="bg-slate-950/70 border border-slate-800/90 rounded-2xl p-4 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-semibold">Pico dos Jogos Salvos</span>
            <Target className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-cyan-400 font-mono">
              {statsSummary.userPeakHits} Acertos
            </span>
          </div>
          <div className="mt-1 text-xs text-slate-400">
            Pico da Curva Aleatória:{' '}
            <strong className="text-slate-300 font-mono">9 Acertos (32,15%)</strong>
          </div>
        </div>

        {/* Card 4: Multiplicador de Eficiência */}
        <div className="bg-slate-950/70 border border-slate-800/90 rounded-2xl p-4 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-semibold">Eficiência da Matriz</span>
            <Zap className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono">
              {statsSummary.taxaPremiacaoTeorica > 0
                ? (statsSummary.taxaPremiacaoUsuario / statsSummary.taxaPremiacaoTeorica).toFixed(1)
                : '1.0'}
              x
            </span>
            <span className="text-xs text-emerald-300 font-bold">Mais Prêmios</span>
          </div>
          <div className="mt-1 text-xs text-slate-400 truncate">
            {statsSummary.totalTickets} bilhetes avaliados
          </div>
        </div>
      </div>

      {/* Gráfico Recharts Principal */}
      <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-slate-800/80 gap-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-amber-400" />
            <h4 className="text-sm font-bold text-white">
              Gráfico Comparativo: Curva Normal Aleatória vs. Frequência Real dos Jogos Salvos
            </h4>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5 text-cyan-400 font-mono font-medium">
              <span className="w-3 h-1.5 rounded-full bg-cyan-400 inline-block"></span>
              Curva Teórica Caixa (Gaussiana)
            </span>
            <span className="flex items-center gap-1.5 text-amber-400 font-mono font-medium">
              <span className="w-3 h-3 rounded-sm bg-gradient-to-t from-amber-500 to-yellow-400 inline-block"></span>
              Seus Jogos Salvos
            </span>
          </div>
        </div>

        <div className="h-80 sm:h-96 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 10, bottom: 20 }}
            >
              <defs>
                <linearGradient id="curvaTeoricaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="userBarGradPremiado" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.95} />
                  <stop offset="100%" stopColor="#047857" stopOpacity={0.8} />
                </linearGradient>
                <linearGradient id="userBarGradPadrao" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#b45309" stopOpacity={0.7} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />

              <XAxis
                dataKey="pontosLabel"
                stroke="#94a3b8"
                fontSize={12}
                tickLine={false}
                axisLine={{ stroke: '#475569' }}
              />

              <YAxis
                stroke="#94a3b8"
                fontSize={12}
                tickLine={false}
                axisLine={{ stroke: '#475569' }}
                unit={viewMetric === 'percentual' ? '%' : ''}
              />

              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload || !payload.length) return null;
                  const data = payload[0].payload as ProbabilityDataPoint;
                  return (
                    <div className="bg-slate-900 border-2 border-slate-700 rounded-xl p-4 shadow-2xl space-y-2 text-xs font-mono max-w-xs">
                      <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
                        <span className="font-black text-sm text-white flex items-center gap-1.5">
                          <span>{data.pontos} Acertos</span>
                          {data.isPremiado && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                              PREMIADO
                            </span>
                          )}
                        </span>
                        <span className="text-amber-300 font-bold">{data.premiacao}</span>
                      </div>

                      <div className="space-y-1 pt-1">
                        <div className="flex items-center justify-between text-slate-300">
                          <span className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                            Probabilidade Teórica:
                          </span>
                          <strong className="text-cyan-300">
                            {data.probTeoricaPercent.toFixed(3)}%
                          </strong>
                        </div>
                        <div className="flex items-center justify-between text-slate-400 text-[11px]">
                          <span>Odds Aleatórias:</span>
                          <span>{data.oddsTeorica}</span>
                        </div>
                        <div className="flex items-center justify-between text-slate-400 text-[11px]">
                          <span>Combinações na Caixa:</span>
                          <span>{data.probTeoricaCombinacoes.toLocaleString('pt-BR')}</span>
                        </div>
                      </div>

                      <div className="space-y-1 pt-1.5 border-t border-slate-800">
                        <div className="flex items-center justify-between text-slate-300">
                          <span className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                            Seus Jogos Salvos:
                          </span>
                          <strong className="text-amber-300">
                            {data.userTicketsPercent.toFixed(2)}%
                          </strong>
                        </div>
                        <div className="flex items-center justify-between text-slate-400 text-[11px]">
                          <span>Total de Bilhetes:</span>
                          <span className="text-white font-bold">{data.userTicketsCount} jogos</span>
                        </div>
                      </div>
                    </div>
                  );
                }}
              />

              <Legend
                verticalAlign="bottom"
                height={36}
                formatter={(value) => (
                  <span className="text-xs font-semibold text-slate-300 mr-4">{value}</span>
                )}
              />

              {/* Linha de Referência da Média Teórica (9 Acertos) */}
              <ReferenceLine
                x="9 pts"
                stroke="#06b6d4"
                strokeDasharray="4 4"
                label={{
                  value: 'Média μ = 9',
                  fill: '#06b6d4',
                  fontSize: 10,
                  position: 'top',
                }}
              />

              {/* Linha de Referência: Início da Faixa de Premiação (11 Acertos) */}
              <ReferenceLine
                x="11 pts"
                stroke="#10b981"
                strokeWidth={2}
                strokeDasharray="3 3"
                label={{
                  value: 'Zona de Premiação (≥ 11 pts)',
                  fill: '#10b981',
                  fontSize: 10,
                  position: 'insideTopLeft',
                }}
              />

              {/* Área / Curva Teórica Normal Gaussiana */}
              <Area
                type="monotone"
                dataKey={viewMetric === 'percentual' ? 'probTeoricaPercent' : 'probTeoricaCombinacoes'}
                name="Curva Teórica Caixa"
                fill="url(#curvaTeoricaGrad)"
                stroke="#06b6d4"
                strokeWidth={2}
              />

              {/* Linha Fina Traçando a Curva Teórica */}
              <Line
                type="monotone"
                dataKey={viewMetric === 'percentual' ? 'probTeoricaPercent' : 'probTeoricaCombinacoes'}
                stroke="#22d3ee"
                strokeWidth={2}
                dot={{ r: 3, fill: '#0891b2' }}
                activeDot={{ r: 6 }}
                legendType="none"
              />

              {/* Barras: Frequência Real dos Jogos Salvos */}
              <Bar
                dataKey={viewMetric === 'percentual' ? 'userTicketsPercent' : 'userTicketsCount'}
                name="Seus Jogos Salvos"
                radius={[6, 6, 0, 0]}
                barSize={24}
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.isPremiado ? 'url(#userBarGradPremiado)' : 'url(#userBarGradPadrao)'}
                    stroke={entry.isPeakUser ? '#fef08a' : 'transparent'}
                    strokeWidth={entry.isPeakUser ? 2 : 0}
                  />
                ))}
              </Bar>
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Legenda explicativa no rodapé */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3 border-t border-slate-800 text-xs">
          <div className="flex items-start gap-2 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
            <span className="w-3 h-3 rounded-full bg-cyan-400 shrink-0 mt-0.5"></span>
            <div>
              <strong className="text-white">Curva Normal (Aleatória):</strong>
              <p className="text-slate-400 text-[11px] mt-0.5">
                Pico centrado em 9 acertos (32,15%). Apenas 10,59% de apostas aleatórias atingem a zona de premiação (11 a 15 pontos).
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
            <span className="w-3 h-3 rounded-full bg-emerald-400 shrink-0 mt-0.5"></span>
            <div>
              <strong className="text-white">Seus Jogos Salvos (Verde/Ouro):</strong>
              <p className="text-slate-400 text-[11px] mt-0.5">
                Graças aos filtros canônicos e garantia de 14 pontos, a distribuição se desloca para a direita, concentrando jogos entre 11, 12, 13 e 14 acertos.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
            <span className="w-3 h-3 rounded-full bg-amber-400 shrink-0 mt-0.5"></span>
            <div>
              <strong className="text-white">Zona de Premiação (≥ 11):</strong>
              <p className="text-slate-400 text-[11px] mt-0.5">
                Faixas oficiais de rateio da Caixa: 11 pts (R$ 6), 12 pts (R$ 12), 13 pts (R$ 30), 14 pts e 15 pts (prêmios variáveis).
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabela Detalhada das 15 Faixas */}
      <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <h4 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
            <Scale className="w-4 h-4 text-emerald-400" />
            <span>Tabela Comparativa de Densidade por Faixa de Pontuação</span>
          </h4>
          <span className="text-[11px] text-slate-400 font-mono">
            Concurso Avaliado: #{activeDraw.concurso} ({activeDraw.data})
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-mono">
                <th className="py-2.5 px-3">Pontuação</th>
                <th className="py-2.5 px-3">Faixa de Prêmio</th>
                <th className="py-2.5 px-3">Probabilidade Teórica</th>
                <th className="py-2.5 px-3">Odds Caixa</th>
                <th className="py-2.5 px-3">Jogos Salvos (Qtd)</th>
                <th className="py-2.5 px-3">Frequência Seus Jogos</th>
                <th className="py-2.5 px-3">Desvio da Curva (Δ)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {chartData.map((row) => {
                const delta = row.userTicketsPercent - row.probTeoricaPercent;
                return (
                  <tr
                    key={row.pontos}
                    className={`hover:bg-slate-800/40 transition ${
                      row.isPremiado ? 'bg-emerald-950/10' : ''
                    }`}
                  >
                    <td className="py-2.5 px-3 font-bold text-white flex items-center gap-1.5">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          row.isPremiado ? 'bg-emerald-400' : 'bg-slate-500'
                        }`}
                      ></span>
                      <span>{row.pontos} Acertos</span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-300">
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                          row.isPremiado
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : 'text-slate-400'
                        }`}
                      >
                        {row.premiacao}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-cyan-300">
                      {row.probTeoricaPercent.toFixed(3)}%
                    </td>
                    <td className="py-2.5 px-3 text-slate-400">{row.oddsTeorica}</td>
                    <td className="py-2.5 px-3 text-white font-bold">
                      {row.userTicketsCount} jogos
                    </td>
                    <td className="py-2.5 px-3 text-amber-300 font-bold">
                      {row.userTicketsPercent.toFixed(2)}%
                    </td>
                    <td className="py-2.5 px-3">
                      {delta > 0 ? (
                        <span className="text-emerald-400 font-bold">
                          +{delta.toFixed(2)}%
                        </span>
                      ) : delta < 0 ? (
                        <span className="text-slate-500">
                          {delta.toFixed(2)}%
                        </span>
                      ) : (
                        <span className="text-slate-600">0.00%</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
