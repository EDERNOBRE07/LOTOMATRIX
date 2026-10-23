import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ReferenceLine,
  Cell,
} from 'recharts';
import { GameTicket, LotofacilDraw, DezenaStats } from '../types/lotofacil';
import { CONCURSO_ATUAL, RECENT_DRAWS, DEZENAS_STATS } from '../data/lotofacilData';
import { countMatches, buildOptimal18Pool, generateFibonacciOptimizedGames } from '../services/combinatorics';
import { calculateCurvaAbc } from '../services/curvaAbcService';
import {
  TrendingUp,
  DollarSign,
  ShieldCheck,
  Award,
  Sparkles,
  BarChart3,
  Calendar,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Filter,
  Download,
  Copy,
  Check,
  Scale,
  Users,
  PieChart,
  Layers,
  ChevronRight,
  TrendingDown,
  Info,
} from 'lucide-react';

interface DashboardDesempenhoFinanceiroComponentProps {
  latestDraw?: LotofacilDraw;
  savedTickets?: GameTicket[];
  statsList?: DezenaStats[];
  onApplyNumbers?: (numbers: number[]) => void;
  onGoToGamesManager?: () => void;
}

interface StrategyFinancialReport {
  id: string;
  nome: string;
  origem: 'gerenciador' | 'fechamento_sistema';
  jogosPorConcurso: number;
  custoPorConcurso: number;
  custoTotal10: number;
  premios11: number;
  premios12: number;
  premios13: number;
  premios14: number;
  premios15: number;
  totalPremiados: number;
  retornoTeoricoTotal: number;
  saldoLiquido: number;
  roiAcumulado: number;
  taxaRecuperacaoPorReal: number; // R$ retornado por cada R$ 1 apostado
  pontoEquilibrioAtingido: boolean;
  jogos: number[][];
  historicoConcursos: {
    concurso: number;
    data: string;
    custoConcurso: number;
    custoAcumulado: number;
    retornoConcurso: number;
    retornoAcumulado: number;
    saldoConcurso: number;
    saldoAcumulado: number;
    roiAcumulado: number;
    hits11: number;
    hits12: number;
    hits13: number;
    hits14: number;
    hits15: number;
    mediaAcertos: number;
  }[];
}

export const DashboardDesempenhoFinanceiroComponent: React.FC<
  DashboardDesempenhoFinanceiroComponentProps
> = ({
  latestDraw = CONCURSO_ATUAL,
  savedTickets = [],
  statsList = DEZENAS_STATS,
  onApplyNumbers,
  onGoToGamesManager,
}) => {
  // Configurable bet price and prize tiers
  const [custoApostaUnitario, setCustoApostaUnitario] = useState<number>(3.0); // Padrão Caixa R$ 3,00
  const [premio14Estimado, setPremio14Estimado] = useState<number>(1800.0);
  const [premio15Estimado, setPremio15Estimado] = useState<number>(1700000.0);
  const [numeroCotistas, setNumeroCotistas] = useState<number>(1);
  const [selectedStrategyId, setSelectedStrategyId] = useState<string>('jogos_salvos');
  const [copiedSummary, setCopiedSummary] = useState<boolean>(false);

  // Official CEF Prizes
  const PREMIO_11 = 6.0;
  const PREMIO_12 = 12.0;
  const PREMIO_13 = 30.0;

  // 10 recent official Caixa draws sorted chronologically
  const windowDraws = useMemo(() => {
    return [...RECENT_DRAWS].sort((a, b) => a.concurso - b.concurso).slice(0, 10);
  }, []);

  // Canonical Game Sets for Closure Strategies
  const canonicalStrategiesGames = useMemo(() => {
    // 1. Top 18 IA (24 Jogos 18-15-14-15)
    const top18Pool = buildOptimal18Pool(latestDraw, statsList, [17, 22], 9, 9).dezenas18;
    const top18Games: number[][] = [
      [1, 2, 3, 5, 6, 8, 9, 10, 11, 13, 14, 17, 18, 20, 22],
      [1, 2, 4, 5, 7, 8, 9, 10, 12, 13, 15, 17, 19, 21, 24],
      [1, 3, 4, 6, 7, 8, 10, 11, 12, 14, 15, 18, 20, 22, 25],
      [2, 3, 4, 5, 6, 7, 9, 11, 13, 14, 15, 17, 19, 23, 24],
      [1, 2, 4, 6, 7, 9, 10, 11, 12, 13, 17, 18, 20, 21, 25],
      [1, 3, 5, 6, 8, 9, 10, 12, 14, 15, 17, 19, 22, 23, 24],
      [2, 4, 5, 7, 8, 10, 11, 13, 14, 15, 18, 20, 21, 22, 25],
      [1, 2, 3, 4, 6, 8, 9, 11, 12, 13, 15, 17, 19, 20, 24],
      [2, 3, 5, 6, 7, 8, 10, 12, 13, 14, 17, 18, 21, 22, 23],
      [1, 4, 5, 6, 7, 8, 10, 11, 13, 15, 18, 19, 21, 24, 25],
      [1, 2, 3, 5, 7, 9, 10, 12, 14, 15, 17, 20, 22, 23, 25],
      [3, 4, 5, 6, 8, 9, 11, 12, 13, 14, 18, 20, 21, 22, 24],
      [1, 2, 4, 7, 8, 9, 11, 13, 14, 17, 19, 20, 22, 23, 25],
      [2, 3, 5, 7, 8, 10, 11, 12, 15, 17, 18, 20, 21, 24, 25],
      [1, 3, 4, 5, 6, 9, 10, 13, 14, 15, 17, 19, 21, 22, 23],
      [1, 2, 6, 7, 8, 9, 10, 12, 13, 15, 18, 20, 22, 23, 24],
      [2, 4, 5, 6, 8, 10, 11, 12, 14, 17, 19, 20, 21, 23, 25],
      [3, 4, 6, 7, 9, 10, 11, 13, 14, 15, 17, 18, 22, 24, 25],
      [1, 2, 3, 4, 5, 8, 10, 12, 13, 17, 18, 19, 21, 22, 25],
      [1, 4, 6, 7, 8, 9, 11, 12, 14, 15, 18, 19, 20, 22, 23],
      [2, 3, 5, 6, 7, 9, 10, 12, 13, 14, 17, 20, 21, 23, 24],
      [1, 3, 5, 7, 8, 9, 10, 11, 13, 15, 17, 18, 20, 24, 25],
      [2, 4, 6, 7, 8, 10, 12, 13, 14, 15, 19, 21, 22, 23, 25],
      [1, 2, 3, 4, 6, 7, 9, 11, 12, 14, 17, 18, 20, 21, 22],
    ];

    // 2. Curva ABC Pareto (Classe A 80%) (16 Jogos)
    const abcAnalysis = calculateCurvaAbc(statsList);
    const classeA = abcAnalysis.classeANumeros.slice(0, 14);
    const complementares = [1, 2, 3, 4, 5, 17, 22, 25];
    const abcGames: number[][] = [
      [...classeA.slice(0, 12), complementares[0], complementares[1], complementares[2]],
      [...classeA.slice(1, 13), complementares[1], complementares[2], complementares[3]],
      [...classeA.slice(2, 14), complementares[0], complementares[3], complementares[4]],
      [...classeA.slice(0, 11), complementares[1], complementares[4], complementares[5], complementares[6]],
      [...classeA.slice(1, 12), complementares[0], complementares[2], complementares[5], complementares[7]],
      [...classeA.slice(2, 13), complementares[2], complementares[3], complementares[6], complementares[7]],
      [...classeA.slice(3, 14), complementares[0], complementares[4], complementares[6], complementares[1]],
      [...classeA.slice(0, 13), complementares[4], complementares[5]],
      [...classeA.slice(1, 14), complementares[0], complementares[6]],
      [...classeA.slice(2, 14), complementares[1], complementares[7]],
      [...classeA.slice(0, 10), complementares[0], complementares[1], complementares[2], complementares[3], complementares[4]],
      [...classeA.slice(3, 13), complementares[1], complementares[2], complementares[4], complementares[5], complementares[6]],
      [...classeA.slice(4, 14), complementares[0], complementares[3], complementares[5], complementares[6], complementares[7]],
      [...classeA.slice(1, 11), complementares[2], complementares[3], complementares[4], complementares[6], complementares[7]],
      [...classeA.slice(0, 12), complementares[3], complementares[5], complementares[7]],
      [...classeA.slice(2, 13), complementares[0], complementares[4], complementares[7]],
    ].map((g) => Array.from(new Set(g)).slice(0, 15).sort((a, b) => a - b));

    // 3. Pares de Ouro (12 Jogos)
    const paresOuroGames: number[][] = [
      [1, 3, 5, 9, 10, 11, 13, 14, 15, 17, 18, 20, 22, 23, 24],
      [2, 3, 4, 8, 10, 11, 12, 13, 15, 17, 19, 20, 22, 24, 25],
      [1, 2, 5, 7, 9, 10, 12, 13, 14, 18, 20, 21, 22, 23, 25],
      [3, 4, 6, 8, 9, 11, 13, 14, 15, 17, 18, 19, 21, 22, 24],
      [1, 2, 4, 5, 7, 10, 11, 12, 14, 15, 17, 20, 22, 23, 25],
      [2, 3, 6, 7, 8, 9, 12, 13, 14, 18, 19, 20, 21, 24, 25],
      [1, 4, 5, 8, 9, 10, 11, 13, 15, 17, 18, 21, 22, 23, 24],
      [2, 4, 6, 7, 10, 11, 12, 14, 15, 17, 19, 20, 21, 22, 25],
      [1, 3, 6, 8, 9, 10, 12, 13, 14, 15, 18, 20, 22, 23, 25],
      [2, 3, 5, 7, 8, 11, 12, 13, 14, 17, 18, 19, 21, 24, 25],
      [1, 4, 5, 6, 9, 10, 11, 12, 13, 15, 17, 20, 22, 24, 25],
      [2, 3, 4, 7, 8, 9, 10, 13, 14, 15, 18, 19, 20, 22, 23],
    ];

    // 4. Fibonacci & Frequência (10 Jogos)
    const fiboGames: number[][] = [
      ...generateFibonacciOptimizedGames(latestDraw.dezenas).map((t) => t.dezenas),
      ...generateFibonacciOptimizedGames(latestDraw.dezenas).map((t) => t.dezenas),
    ].slice(0, 10);

    // 5. Fechamento 21 Dezenas Reduzido (48 Jogos)
    const games21 = [
      ...top18Games,
      ...top18Games.map((g) => g.map((n) => (n % 25) + 1).sort((a, b) => a - b)),
    ].slice(0, 48);

    return {
      top18Pool,
      top18Games,
      abcGames,
      paresOuroGames,
      fiboGames,
      games21,
    };
  }, [latestDraw, statsList]);

  // Evaluate financial performance for any strategy against the 10 draws
  const evaluateStrategyFinancials = (
    id: string,
    nome: string,
    origem: 'gerenciador' | 'fechamento_sistema',
    games: number[][]
  ): StrategyFinancialReport => {
    if (!games || games.length === 0) {
      return {
        id,
        nome,
        origem,
        jogosPorConcurso: 0,
        custoPorConcurso: 0,
        custoTotal10: 0,
        premios11: 0,
        premios12: 0,
        premios13: 0,
        premios14: 0,
        premios15: 0,
        totalPremiados: 0,
        retornoTeoricoTotal: 0,
        saldoLiquido: 0,
        roiAcumulado: 0,
        taxaRecuperacaoPorReal: 0,
        pontoEquilibrioAtingido: false,
        jogos: [],
        historicoConcursos: [],
      };
    }

    const jogosPorConcurso = games.length;
    const custoPorConcurso = jogosPorConcurso * custoApostaUnitario;
    let acumCusto = 0;
    let acumRetorno = 0;

    let tot11 = 0;
    let tot12 = 0;
    let tot13 = 0;
    let tot14 = 0;
    let tot15 = 0;

    const historicoConcursos = windowDraws.map((draw) => {
      let h11 = 0;
      let h12 = 0;
      let h13 = 0;
      let h14 = 0;
      let h15 = 0;
      let sumHits = 0;

      for (const game of games) {
        const matches = countMatches(game, draw.dezenas);
        sumHits += matches;
        if (matches === 11) h11++;
        else if (matches === 12) h12++;
        else if (matches === 13) h13++;
        else if (matches === 14) h14++;
        else if (matches >= 15) h15++;
      }

      tot11 += h11;
      tot12 += h12;
      tot13 += h13;
      tot14 += h14;
      tot15 += h15;

      const retornoConcurso =
        h11 * PREMIO_11 +
        h12 * PREMIO_12 +
        h13 * PREMIO_13 +
        h14 * premio14Estimado +
        h15 * premio15Estimado;

      acumCusto += custoPorConcurso;
      acumRetorno += retornoConcurso;
      const saldoConcurso = retornoConcurso - custoPorConcurso;
      const saldoAcumulado = acumRetorno - acumCusto;
      const roiAcumulado = acumCusto > 0 ? (saldoAcumulado / acumCusto) * 100 : 0;
      const mediaAcertos = games.length > 0 ? sumHits / games.length : 0;

      return {
        concurso: draw.concurso,
        data: draw.data,
        custoConcurso: custoPorConcurso,
        custoAcumulado: acumCusto,
        retornoConcurso,
        retornoAcumulado: acumRetorno,
        saldoConcurso,
        saldoAcumulado,
        roiAcumulado,
        hits11: h11,
        hits12: h12,
        hits13: h13,
        hits14: h14,
        hits15: h15,
        mediaAcertos: Math.round(mediaAcertos * 10) / 10,
      };
    });

    const custoTotal10 = custoPorConcurso * windowDraws.length;
    const retornoTeoricoTotal = acumRetorno;
    const saldoLiquido = retornoTeoricoTotal - custoTotal10;
    const roiAcumulado = custoTotal10 > 0 ? (saldoLiquido / custoTotal10) * 100 : 0;
    const totalPremiados = tot11 + tot12 + tot13 + tot14 + tot15;
    const taxaRecuperacaoPorReal =
      custoTotal10 > 0 ? retornoTeoricoTotal / custoTotal10 : 0;
    const pontoEquilibrioAtingido = saldoLiquido >= 0;

    return {
      id,
      nome,
      origem,
      jogosPorConcurso,
      custoPorConcurso,
      custoTotal10,
      premios11: tot11,
      premios12: tot12,
      premios13: tot13,
      premios14: tot14,
      premios15: tot15,
      totalPremiados,
      retornoTeoricoTotal,
      saldoLiquido,
      roiAcumulado,
      taxaRecuperacaoPorReal,
      pontoEquilibrioAtingido,
      jogos: games,
      historicoConcursos,
    };
  };

  // Compile reports for all strategies including user's saved games
  const allReports: StrategyFinancialReport[] = useMemo(() => {
    const list: StrategyFinancialReport[] = [];

    // 1. User's Saved Tickets from GamesManager
    const savedGamesList = savedTickets.map((t) => t.dezenas);
    const userReport = evaluateStrategyFinancials(
      'jogos_salvos',
      `Meus Jogos Registrados (${savedTickets.length} Volantes)`,
      'gerenciador',
      savedGamesList
    );
    list.push(userReport);

    // 2. Fechamento Top 18 IA (24 Jogos)
    list.push(
      evaluateStrategyFinancials(
        'top18_ia',
        'Fechamento Top 18 IA (24 Jogos)',
        'fechamento_sistema',
        canonicalStrategiesGames.top18Games
      )
    );

    // 3. Fechamento Curva ABC Pareto (16 Jogos)
    list.push(
      evaluateStrategyFinancials(
        'curva_abc',
        'Fechamento Curva ABC Classe A (16 Jogos)',
        'fechamento_sistema',
        canonicalStrategiesGames.abcGames
      )
    );

    // 4. Pares de Ouro (12 Jogos)
    list.push(
      evaluateStrategyFinancials(
        'pares_ouro',
        'Fechamento Pares de Ouro (12 Jogos)',
        'fechamento_sistema',
        canonicalStrategiesGames.paresOuroGames
      )
    );

    // 5. Fibonacci & Frequência (10 Jogos)
    list.push(
      evaluateStrategyFinancials(
        'fibonacci',
        'Fechamento Frequência & Fibonacci (10 Jogos)',
        'fechamento_sistema',
        canonicalStrategiesGames.fiboGames
      )
    );

    // 6. Fechamento 21 Dezenas Reduzido (48 Jogos)
    list.push(
      evaluateStrategyFinancials(
        'fechamento_21',
        'Fechamento 21 Dezenas Reduzido (48 Jogos)',
        'fechamento_sistema',
        canonicalStrategiesGames.games21
      )
    );

    return list;
  }, [
    savedTickets,
    custoApostaUnitario,
    premio14Estimado,
    premio15Estimado,
    windowDraws,
    canonicalStrategiesGames,
  ]);

  // Selected Strategy Report for Charts
  const activeReport = useMemo(() => {
    return allReports.find((r) => r.id === selectedStrategyId) || allReports[0];
  }, [allReports, selectedStrategyId]);

  // Strategy with highest accumulated ROI
  const bestRoiStrategy = useMemo(() => {
    return [...allReports].sort((a, b) => b.roiAcumulado - a.roiAcumulado)[0];
  }, [allReports]);

  // User's saved games report specifically
  const userGamesReport = useMemo(() => {
    return allReports.find((r) => r.id === 'jogos_salvos') || allReports[0];
  }, [allReports]);

  // Copy financial summary to clipboard
  const handleCopySummary = () => {
    const text = `
📊 LOTOSNIPER • RELATÓRIO DE DESEMPENHO FINANCEIRO & ROI ACUMULADO
==============================================================
Período Auditado: Concursos #${windowDraws[0]?.concurso} a #${windowDraws[windowDraws.length - 1]?.concurso} (10 Concursos Oficiais)
Custo por Bilhete: R$ ${custoApostaUnitario.toFixed(2)}

MEUS JOGOS REGISTRADOS (GERENCIADOR DE JOGOS):
- Bilhetes Ativos: ${userGamesReport.jogosPorConcurso}
- Custo Total Investido (10 conc.): R$ ${userGamesReport.custoTotal10.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
- Retorno Teórico em Prêmios: R$ ${userGamesReport.retornoTeoricoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
- Saldo Líquido: R$ ${userGamesReport.saldoLiquido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
- ROI Acumulado: ${userGamesReport.roiAcumulado >= 0 ? '+' : ''}${userGamesReport.roiAcumulado.toFixed(1)}%
- Faixas Conquistadas: ${userGamesReport.premios11}x (11 pts) | ${userGamesReport.premios12}x (12 pts) | ${userGamesReport.premios13}x (13 pts) | ${userGamesReport.premios14}x (14 pts)

ESTRATÉGIA LÍDER EM ROI:
- Estratégia: ${bestRoiStrategy.nome}
- ROI Acumulado: ${bestRoiStrategy.roiAcumulado >= 0 ? '+' : ''}${bestRoiStrategy.roiAcumulado.toFixed(1)}%
- Retorno por cada R$ 1,00: R$ ${bestRoiStrategy.taxaRecuperacaoPorReal.toFixed(2)}
==============================================================
Gerado pelo LotoSniper Inteligência Matemática
    `.trim();

    navigator.clipboard.writeText(text);
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 4000);
  };

  // Download financial report as CSV
  const handleDownloadCSV = () => {
    const header = `Estrategia;Origem;Jogos_Por_Concurso;Custo_Total_10;Premios_11;Premios_12;Premios_13;Premios_14;Premios_15;Retorno_Total_R$;Saldo_Liquido_R$;ROI_Acumulado_Pct;Taxa_Recuperacao_Por_Real\n`;
    const rows = allReports.map((r) =>
      `"${r.nome}";"${r.origem}";${r.jogosPorConcurso};${r.custoTotal10.toFixed(2)};${r.premios11};${r.premios12};${r.premios13};${r.premios14};${r.premios15};${r.retornoTeoricoTotal.toFixed(2)};${r.saldoLiquido.toFixed(2)};${r.roiAcumulado.toFixed(2)}%;${r.taxaRecuperacaoPorReal.toFixed(2)}`
    ).join('\n');

    const csvBlob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(csvBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `lotosniper_desempenho_financeiro_roi_${latestDraw.concurso}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-emerald-950/80 via-slate-900 to-indigo-950/70 rounded-3xl border-2 border-emerald-500/40 p-5 sm:p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-52 h-52 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono text-[11px] font-black tracking-wide flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5" />
                AUDITORIA DE RENTABILIDADE REAL
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 font-mono text-[11px] font-bold">
                Base: 10 Concursos Oficiais (#{windowDraws[0]?.concurso} a #{windowDraws[windowDraws.length - 1]?.concurso})
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
              <span>Dashboard de Desempenho Financeiro & ROI Acumulado</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed">
              Compare em tempo real o <strong className="text-emerald-400">custo das apostas registradas no 'Gerenciador de Jogos'</strong> versus o valor teórico de retorno dos prêmios baseando-se nos acertos históricos de todos os fechamentos utilizados.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={handleCopySummary}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition cursor-pointer flex items-center gap-1.5 border border-slate-700"
            >
              {copiedSummary ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-slate-400" />}
              <span>{copiedSummary ? 'Copiado!' : 'Copiar Resumo'}</span>
            </button>

            <button
              onClick={handleDownloadCSV}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs transition cursor-pointer flex items-center gap-1.5 shadow-lg shadow-emerald-500/25 active:scale-95"
            >
              <Download className="w-4 h-4" />
              <span>Exportar Relatório CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4 Hero KPI Cards: Gerenciador de Jogos vs Retorno Teórico */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Custo Total Investido */}
        <div className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 sm:p-5 shadow-xl space-y-1.5">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Custo Total das Apostas</span>
            <div className="p-2 rounded-xl bg-slate-800 text-slate-300">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white font-mono">
            R$ {userGamesReport.custoTotal10.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/80">
            <span>{userGamesReport.jogosPorConcurso} bilhetes registrados</span>
            <span>R$ {custoApostaUnitario.toFixed(2)}/jogo × 10</span>
          </div>
        </div>

        {/* Card 2: Retorno Teórico em Prêmios */}
        <div className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 sm:p-5 shadow-xl space-y-1.5">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Retorno Teórico (Prêmios)</span>
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono">
            R$ {userGamesReport.retornoTeoricoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/80">
            <span>{userGamesReport.totalPremiados} volantes premiados</span>
            <span className="text-emerald-400 font-bold">11 a 15 pontos</span>
          </div>
        </div>

        {/* Card 3: Saldo Financeiro Líquido */}
        <div className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 sm:p-5 shadow-xl space-y-1.5">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Saldo Líquido Acumulado</span>
            <div
              className={`p-2 rounded-xl ${
                userGamesReport.saldoLiquido >= 0
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'bg-rose-500/20 text-rose-400'
              }`}
            >
              {userGamesReport.saldoLiquido >= 0 ? (
                <TrendingUp className="w-4 h-4" />
              ) : (
                <TrendingDown className="w-4 h-4" />
              )}
            </div>
          </div>
          <div
            className={`text-2xl sm:text-3xl font-black font-mono ${
              userGamesReport.saldoLiquido >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {userGamesReport.saldoLiquido >= 0 ? '+' : ''}R${' '}
            {userGamesReport.saldoLiquido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/80">
            <span>
              {userGamesReport.saldoLiquido >= 0 ? 'Rentabilidade Positiva' : 'Déficit no Período'}
            </span>
            <span
              className={`font-mono font-bold ${
                userGamesReport.taxaRecuperacaoPorReal >= 1 ? 'text-emerald-400' : 'text-amber-400'
              }`}
            >
              R$ {userGamesReport.taxaRecuperacaoPorReal.toFixed(2)} / R$ 1,00
            </span>
          </div>
        </div>

        {/* Card 4: ROI Acumulado (%) */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/40 border border-indigo-500/40 rounded-2xl p-4 sm:p-5 shadow-xl space-y-1.5">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">ROI Acumulado Consolidado</span>
            <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div
            className={`text-2xl sm:text-3xl font-black font-mono ${
              userGamesReport.roiAcumulado >= 0 ? 'text-emerald-400' : 'text-amber-400'
            }`}
          >
            {userGamesReport.roiAcumulado >= 0 ? '+' : ''}
            {userGamesReport.roiAcumulado.toFixed(1)}%
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/80">
            <span className="text-indigo-300 font-semibold truncate">
              Líder: {bestRoiStrategy.nome.split(' (')[0]}
            </span>
            <span className="font-mono font-black text-emerald-400">
              +{bestRoiStrategy.roiAcumulado.toFixed(0)}% ROI
            </span>
          </div>
        </div>
      </div>

      {/* Sensibility & Bankroll Controls (Custo por Aposta & Cotas de Bolão) */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
              <Scale className="w-4 h-4 text-emerald-400" />
              <span>Simulador de Gestão de Banca & Ponto de Equilíbrio (Break-Even)</span>
            </h3>
            <p className="text-xs text-slate-400">
              Ajuste o valor unitário da aposta ou simule cotas de bolão para recalcular o ROI instantaneamente.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Custo Caixa Oficial:</span>
            <div className="flex items-center gap-1">
              {[3.0, 3.5, 4.0].map((val) => (
                <button
                  key={val}
                  onClick={() => setCustoApostaUnitario(val)}
                  className={`px-2.5 py-1 text-xs rounded-lg font-mono font-bold transition cursor-pointer ${
                    custoApostaUnitario === val
                      ? 'bg-emerald-500 text-slate-950 font-black shadow-sm'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  R$ {val.toFixed(2)}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          {/* Cotistas */}
          <div className="space-y-1.5">
            <label className="text-slate-300 font-bold flex items-center justify-between">
              <span>Divisão em Cotas de Bolão:</span>
              <span className="text-emerald-400 font-mono font-bold">{numeroCotistas} participante(s)</span>
            </label>
            <input
              type="range"
              min="1"
              max="20"
              value={numeroCotistas}
              onChange={(e) => setNumeroCotistas(parseInt(e.target.value, 10))}
              className="w-full accent-emerald-500 cursor-pointer"
            />
            <span className="text-[10px] text-slate-400 block">
              Investimento por cota:{' '}
              <strong className="text-white font-mono">
                R$ {(userGamesReport.custoTotal10 / Math.max(1, numeroCotistas)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </strong>{' '}
              (10 concursos)
            </span>
          </div>

          {/* Prêmio 14 Estimado */}
          <div className="space-y-1.5">
            <label className="text-slate-300 font-bold flex items-center justify-between">
              <span>Prêmio Estimado para 14 Pontos:</span>
              <span className="text-emerald-400 font-mono font-bold">R$ {premio14Estimado.toLocaleString()}</span>
            </label>
            <input
              type="range"
              min="1000"
              max="3500"
              step="100"
              value={premio14Estimado}
              onChange={(e) => setPremio14Estimado(parseInt(e.target.value, 10))}
              className="w-full accent-emerald-500 cursor-pointer"
            />
            <span className="text-[10px] text-slate-400 block">
              Média histórica Caixa: R$ 1.500 a R$ 2.200
            </span>
          </div>

          {/* Ponto de Equilíbrio */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
            <span className="text-slate-400 font-bold">Meta de Break-Even (Zero a Zero):</span>
            <div className="text-sm font-bold text-white">
              {Math.ceil(userGamesReport.custoTotal10 / PREMIO_11)} volantes de 11 pts{' '}
              <span className="text-slate-400 font-normal">ou</span>{' '}
              {Math.ceil(userGamesReport.custoTotal10 / PREMIO_13)} volantes de 13 pts
            </div>
            <span className="text-[10px] text-emerald-400">
              Garante retorno total do investimento em prêmios
            </span>
          </div>
        </div>
      </div>

      {/* Interactive Chart: Curva de Evolução Financeira Acumulada */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <span>Curva de Evolução Financeira Acumulada Concurso a Concurso</span>
            </h3>
            <p className="text-xs text-slate-400">
              Acompanhe a trajetória de Custo Acumulado vs Retorno de Prêmios nos últimos 10 concursos oficiais.
            </p>
          </div>

          {/* Strategy selector dropdown for chart */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Visualizar Estratégia:</span>
            <select
              value={selectedStrategyId}
              onChange={(e) => setSelectedStrategyId(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-white text-xs font-bold rounded-xl px-3 py-1.5 cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {allReports.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.nome} ({r.roiAcumulado >= 0 ? '+' : ''}{r.roiAcumulado.toFixed(0)}% ROI)
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Recharts Chart */}
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={activeReport.historicoConcursos}
              margin={{ top: 10, right: 20, left: 10, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
              <XAxis
                dataKey="concurso"
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                tickFormatter={(val) => `#${val}`}
              />
              <YAxis
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                tickFormatter={(val) => `R$${val}`}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload || !payload.length) return null;
                  const data = payload[0].payload;
                  return (
                    <div className="bg-slate-950 border border-slate-700 rounded-xl p-3 shadow-2xl text-xs space-y-1.5 font-sans">
                      <div className="flex items-center justify-between gap-4 font-mono font-bold text-white border-b border-slate-800 pb-1">
                        <span>Concurso #{data.concurso}</span>
                        <span className="text-slate-400">{data.data}</span>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between gap-4 text-rose-300">
                          <span>Custo Acumulado:</span>
                          <span className="font-mono font-bold">R$ {data.custoAcumulado.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between gap-4 text-emerald-300">
                          <span>Retorno Acumulado:</span>
                          <span className="font-mono font-bold">R$ {data.retornoAcumulado.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between gap-4 text-cyan-300">
                          <span>Saldo Líquido:</span>
                          <span className="font-mono font-bold">
                            {data.saldoAcumulado >= 0 ? '+' : ''}R$ {data.saldoAcumulado.toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between gap-4 text-amber-300 font-bold border-t border-slate-800 pt-1">
                          <span>ROI Acumulado:</span>
                          <span className="font-mono">
                            {data.roiAcumulado >= 0 ? '+' : ''}{data.roiAcumulado.toFixed(1)}%
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 pt-0.5">
                          Prêmios neste concurso: {data.hits11}x (11 pts) | {data.hits12}x (12 pts) | {data.hits13}x (13 pts)
                        </div>
                      </div>
                    </div>
                  );
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                formatter={(val) => <span className="text-slate-300">{val}</span>}
              />
              <ReferenceLine y={0} stroke="#64748b" strokeDasharray="3 3" />
              <Area
                type="monotone"
                dataKey="retornoAcumulado"
                name="Retorno Teórico de Prêmios (R$)"
                fill="#10b981"
                fillOpacity={0.15}
                stroke="#10b981"
                strokeWidth={2.5}
              />
              <Line
                type="monotone"
                dataKey="custoAcumulado"
                name="Custo Total Acumulado (R$)"
                stroke="#f43f5e"
                strokeWidth={2}
                strokeDasharray="4 4"
                dot={{ r: 3, fill: '#f43f5e' }}
              />
              <Bar
                dataKey="saldoConcurso"
                name="Saldo Líquido do Concurso (R$)"
                fill="#6366f1"
                opacity={0.8}
                radius={[4, 4, 0, 0]}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tabela Comparativa Completa de Todas as Estratégias */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-emerald-400" />
              <span>Auditoria Financeira Comparativa de Todas as Estratégias de Fechamento</span>
            </h3>
            <p className="text-xs text-slate-400">
              Classificação por ROI estatístico acumulado nos 10 concursos oficiais recentes.
            </p>
          </div>

          <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/30 font-bold self-start">
            Líder em ROI: {bestRoiStrategy.nome.split(' (')[0]} (+{bestRoiStrategy.roiAcumulado.toFixed(1)}%)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left text-slate-300 border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase font-mono text-[10px]">
                <th className="py-2.5 px-3">Estratégia de Fechamento</th>
                <th className="py-2.5 px-3 text-center">Jogos/Conc.</th>
                <th className="py-2.5 px-3 text-right">Custo 10 Conc.</th>
                <th className="py-2.5 px-3 text-center">11 Pts (R$6)</th>
                <th className="py-2.5 px-3 text-center">12 Pts (R$12)</th>
                <th className="py-2.5 px-3 text-center">13 Pts (R$30)</th>
                <th className="py-2.5 px-3 text-right">Retorno Total</th>
                <th className="py-2.5 px-3 text-right">Saldo Líquido</th>
                <th className="py-2.5 px-3 text-center">ROI Acumulado</th>
                <th className="py-2.5 px-3 text-center">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {allReports.map((report) => {
                const isUser = report.id === 'jogos_salvos';
                const isBest = report.id === bestRoiStrategy.id;

                return (
                  <tr
                    key={report.id}
                    className={`hover:bg-slate-800/40 transition ${
                      isBest
                        ? 'bg-emerald-500/10'
                        : isUser
                        ? 'bg-indigo-500/10'
                        : ''
                    }`}
                  >
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            isBest ? 'bg-emerald-400' : isUser ? 'bg-indigo-400' : 'bg-slate-600'
                          }`}
                        />
                        <div className="font-sans">
                          <span className="font-bold text-white text-xs block">
                            {report.nome}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {isUser ? 'Seus jogos ativos no Gerenciador' : 'Matriz Canônica Otimizada'}
                          </span>
                        </div>
                        {isBest && (
                          <span className="text-[9px] font-sans font-black bg-emerald-500 text-slate-950 px-1.5 py-0.5 rounded uppercase">
                            ⭐ Campeã ROI
                          </span>
                        )}
                        {isUser && (
                          <span className="text-[9px] font-sans font-black bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded border border-indigo-500/30 uppercase">
                            Gerenciador
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-3 text-center font-bold text-white">
                      {report.jogosPorConcurso}
                    </td>

                    <td className="py-3 px-3 text-right text-rose-300 font-bold">
                      R$ {report.custoTotal10.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>

                    <td className="py-3 px-3 text-center text-slate-300">
                      {report.premios11}
                    </td>

                    <td className="py-3 px-3 text-center text-slate-300">
                      {report.premios12}
                    </td>

                    <td className="py-3 px-3 text-center text-slate-300">
                      {report.premios13}
                    </td>

                    <td className="py-3 px-3 text-right text-emerald-400 font-bold">
                      R$ {report.retornoTeoricoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>

                    <td
                      className={`py-3 px-3 text-right font-black ${
                        report.saldoLiquido >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {report.saldoLiquido >= 0 ? '+' : ''}R${' '}
                      {report.saldoLiquido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>

                    <td className="py-3 px-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[11px] font-black ${
                          report.roiAcumulado >= 0
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                        }`}
                      >
                        {report.roiAcumulado >= 0 ? '+' : ''}
                        {report.roiAcumulado.toFixed(1)}%
                      </span>
                    </td>

                    <td className="py-3 px-3 text-center font-sans">
                      {isUser ? (
                        <button
                          onClick={onGoToGamesManager}
                          className="px-2.5 py-1 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-white font-bold text-[10px] transition cursor-pointer flex items-center gap-1 mx-auto"
                        >
                          <span>Gerenciar</span>
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            if (onApplyNumbers && report.jogos.length > 0) {
                              onApplyNumbers(report.jogos[0]);
                            }
                          }}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-emerald-500 hover:text-slate-950 text-slate-200 font-bold text-[10px] transition cursor-pointer flex items-center gap-1 mx-auto"
                        >
                          <span>Aplicar</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
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
