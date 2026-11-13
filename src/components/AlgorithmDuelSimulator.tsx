import React, { useState, useMemo, useEffect, useRef } from 'react';
import { GameTicket, LotofacilDraw, DezenaStats } from '../types/lotofacil';
import { RECENT_DRAWS, CONCURSO_ATUAL, DEZENAS_STATS } from '../data/lotofacilData';
import {
  generateFechamentoCovering,
  buildOptimalPool,
  runSimulation,
  countMatches,
  DEFAULT_FILTERS,
  normalizeGameTickets,
} from '../services/combinatorics';
import { getSavedFechamentos, SavedFechamentoPrognostico } from '../services/savedFechamentosStorage';
import { restoreBackupFromJSON } from '../services/backupManagerService';
import { soundService } from '../services/soundAlert';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
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
  Upload,
  FileJson,
  AlertTriangle,
  Flame,
  ArrowUpRight,
  Star,
  Check,
  Target,
  FileText,
  Filter,
} from 'lucide-react';

export interface AlgorithmDuelSimulatorProps {
  latestDraw?: LotofacilDraw;
  dynamicStats?: DezenaStats[];
  cyclePendingNumbers?: number[];
  userSavedTickets?: GameTicket[];
  savedFechamentosList?: SavedFechamentoPrognostico[];
  onApplyStrategy?: (numbers: number[], targetHits?: number) => void;
}

export type StrategyKey =
  | 'garantia_14_pts'
  | 'filtro_ia'
  | 'garantia_15_pts'
  | 'estrategia_documento'
  | 'top18_ia'
  | 'fechar_ciclo'
  | 'equilibrio_canonico'
  | 'economico_16'
  | 'ouro_17'
  | 'agressivo_19'
  | 'aleatorio_baseline'
  | 'meus_jogos'
  | (string & {});

interface StrategyDefinition {
  key: StrategyKey;
  name: string;
  shortName: string;
  description: string;
  dezenasCount: number;
  ticketsCount: number;
  badge: string;
}

const CANONICAL_STRATEGIES: StrategyDefinition[] = [
  {
    key: 'garantia_14_pts',
    name: '🎯 Garantia 14 Pontos (Fechamento 18D • 14 se 15 • 24 Jogos)',
    shortName: 'Garantia 14 pts',
    description: 'Matriz combinatória 18-15-14-15 com garantia matemática mínima de 14 pontos cravados acertando as 15 no universo',
    dezenasCount: 18,
    ticketsCount: 24,
    badge: '18D • 14 se 15 (24 Jogos)',
  },
  {
    key: 'filtro_ia',
    name: '🤖 Filtro de IA Neural (Score Preditivo • 24 Jogos)',
    shortName: 'Filtro de IA',
    description: 'Fechamento otimizado com pontuação neural de propensão, poda de redundâncias e calibragem de padrões estatísticos',
    dezenasCount: 18,
    ticketsCount: 24,
    badge: 'IA Score • 24 Jogos',
  },
  {
    key: 'garantia_15_pts',
    name: '🏆 Garantia 15 Pontos (Fechamento Total 16D • 4 Jogos)',
    shortName: 'Garantia 15 pts',
    description: 'Fechamento fechado cobrindo 16 dezenas em 4 apostas com garantia de 15 pontos se as 15 estiverem no pool',
    dezenasCount: 16,
    ticketsCount: 4,
    badge: '16D • 15 se 15 (4 Jogos)',
  },
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
    name: '🤖 Top 18 IA Frequência (Garantia 14 Pontos)',
    shortName: 'Top 18 IA',
    description: '18 dezenas de maior propensão probabilística por repetição histórica',
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

export interface BackupAuditedFechamento {
  fechamento: SavedFechamentoPrognostico;
  totalJogos: number;
  custoTotal: number;
  premioTotal: number;
  saldoLiquido: number;
  roi: number;
  hits15: number;
  hits14: number;
  hits13: number;
  hits12: number;
  hits11: number;
  totalPremiados: number;
  taxaPremiacao: number; // % de jogos que premiaram (11 a 15)
  maxHits: number;
  bestTicket: GameTicket | null;
  dezenasAcertadasNoUniverso: number; // Quantas das 15 sorteadas estavam no universo
  taxaUniversoIA: number; // % do universo que acertou
  isAbove50Percent: boolean;
}

export interface SavedTicketComparison {
  ticket: GameTicket;
  hits: number;
  aproveitamento: number;
  isAbove50Percent: boolean;
  isAwarded: boolean;
  premioEstimado: number;
  isBestScore: boolean;
}

export const AlgorithmDuelSimulator: React.FC<AlgorithmDuelSimulatorProps> = ({
  latestDraw = CONCURSO_ATUAL,
  dynamicStats = DEZENAS_STATS,
  cyclePendingNumbers = [17, 22],
  userSavedTickets = [],
  savedFechamentosList,
  onApplyStrategy,
}) => {
  const [savedFechamentos, setSavedFechamentos] = useState<SavedFechamentoPrognostico[]>(() => {
    return savedFechamentosList && savedFechamentosList.length > 0 ? savedFechamentosList : getSavedFechamentos();
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const hasInitialSaved =
    (userSavedTickets && userSavedTickets.length > 0) ||
    (savedFechamentosList && savedFechamentosList.length > 0);
  const [activeTab, setActiveTab] = useState<'comparacao_salvos' | 'duelo' | 'backup_audit'>(
    hasInitialSaved ? 'comparacao_salvos' : 'duelo'
  );
  const [ticketFilterMode, setTicketFilterMode] = useState<'above_50' | 'all'>('above_50');
  const [strategyAKey, setStrategyAKey] = useState<StrategyKey>('garantia_14_pts');
  const [strategyBKey, setStrategyBKey] = useState<StrategyKey>('filtro_ia');
  const [testScope, setTestScope] = useState<'10_concursos' | '25_concursos' | '50_concursos'>('25_concursos');
  const [activeChartMetric, setActiveChartMetric] = useState<'roi' | 'financeiro' | 'acertos'>('acertos');
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [duelRunCounter, setDuelRunCounter] = useState<number>(0);
  const [feedbackNotice, setFeedbackNotice] = useState<string | null>(null);

  // Escuta restauração de backup de fechamentos para atualizar e reauditar instantaneamente
  useEffect(() => {
    const handleBackupRestored = () => {
      const updated = getSavedFechamentos();
      setSavedFechamentos(updated);
      setDuelRunCounter((c) => c + 1);
      setActiveTab('comparacao_salvos');
      try {
        soundService.playGoldenZoneSuccessChime();
      } catch {}
      setFeedbackNotice(
        `✓ Backup de fechamentos carregado! ${updated.length} fechamentos confrontados contra o Concurso #${latestDraw.concurso}.`
      );
      setTimeout(() => setFeedbackNotice(null), 6000);
    };

    const handleFechamentosUpdated = (e: any) => {
      if (e.detail && Array.isArray(e.detail)) {
        setSavedFechamentos(e.detail);
      } else {
        setSavedFechamentos(getSavedFechamentos());
      }
      setDuelRunCounter((c) => c + 1);
    };

    const handleTicketsUpdated = () => {
      setDuelRunCounter((c) => c + 1);
    };

    window.addEventListener('lotosniper-backup-restored', handleBackupRestored);
    window.addEventListener('lotosniper-saved-fechamentos-updated', handleFechamentosUpdated);
    window.addEventListener('lotosniper-saved-tickets-updated', handleTicketsUpdated);
    return () => {
      window.removeEventListener('lotosniper-backup-restored', handleBackupRestored);
      window.removeEventListener('lotosniper-saved-fechamentos-updated', handleFechamentosUpdated);
      window.removeEventListener('lotosniper-saved-tickets-updated', handleTicketsUpdated);
    };
  }, [latestDraw.concurso]);

  // Carrega arquivo de backup JSON diretamente
  const handleUploadBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const res = restoreBackupFromJSON(content, 'replace');
        if (res.success) {
          const list = getSavedFechamentos();
          setSavedFechamentos(list);
          setDuelRunCounter((c) => c + 1);
          setActiveTab('backup_audit');
          try {
            soundService.playGoldenZoneSuccessChime();
          } catch {}
          setFeedbackNotice(
            `✓ Backup restaurado com sucesso! ${res.fechamentosRestored} fechamentos confrontados contra o Concurso #${latestDraw.concurso}.`
          );
        } else {
          setFeedbackNotice(`Erro ao carregar backup: ${res.message}`);
        }
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Helper para obter configuração de uma estratégia ou fechamento salvo
  const getStrategyConfig = (key: string): StrategyDefinition => {
    if (key.startsWith('saved_')) {
      const id = key.replace('saved_', '');
      const found = savedFechamentos.find((f) => f.id === id);
      if (found) {
        return {
          key: key as any,
          name: `📂 ${found.modalidadeMatriz || found.tipoFechamento || 'Fechamento Salvo'} (${found.totalJogos || found.tickets.length} Jogos)`,
          shortName: (found.modalidadeMatriz || found.tipoFechamento || 'Fechamento Salvo').slice(0, 22),
          description: `Fechamento do backup (${found.dataCriacao || `Conc #${found.concurso}`}) com ${found.universoDezenas?.length || 18} dezenas e ${found.tickets.length} apostas.`,
          dezenasCount: found.universoDezenas?.length || 18,
          ticketsCount: found.tickets.length,
          badge: `${found.tickets.length} Jogos • Backup`,
        };
      }
    }
    return CANONICAL_STRATEGIES.find((s) => s.key === key) || CANONICAL_STRATEGIES[0];
  };

  // AUDITORIA DO BACKUP DE FECHAMENTOS CONTRA O CONCURSO SORTEADO
  const backupAuditReport = useMemo(() => {
    const P11 = latestDraw.premiacoes?.faixa11?.valor || 7.0;
    const P12 = latestDraw.premiacoes?.faixa12?.valor || 14.0;
    const P13 = latestDraw.premiacoes?.faixa13?.valor || 35.0;
    const P14 = latestDraw.premiacoes?.faixa14?.valor || 1500.0;
    const P15 = latestDraw.premiacoes?.faixa15?.valor || 1800000.0;
    const drawnNumbers = latestDraw.dezenas || [];

    const auditedList: BackupAuditedFechamento[] = savedFechamentos.map((f) => {
      const tickets = f.tickets || [];
      const totalJogos = tickets.length;
      const custoTotal = totalJogos * 3.5;

      let h15 = 0;
      let h14 = 0;
      let h13 = 0;
      let h12 = 0;
      let h11 = 0;
      let premioTotal = 0;
      let maxHits = 0;
      let bestTicket: GameTicket | null = null;

      tickets.forEach((t) => {
        const hits = countMatches(t.dezenas, drawnNumbers);
        if (hits > maxHits) {
          maxHits = hits;
          bestTicket = t;
        }

        if (hits === 15) {
          h15++;
          premioTotal += P15;
        } else if (hits === 14) {
          h14++;
          premioTotal += P14;
        } else if (hits === 13) {
          h13++;
          premioTotal += P13;
        } else if (hits === 12) {
          h12++;
          premioTotal += P12;
        } else if (hits === 11) {
          h11++;
          premioTotal += P11;
        }
      });

      const totalPremiados = h15 + h14 + h13 + h12 + h11;
      const taxaPremiacao = totalJogos > 0 ? (totalPremiados / totalJogos) * 100 : 0;
      const saldoLiquido = premioTotal - custoTotal;
      const roi = custoTotal > 0 ? ((premioTotal - custoTotal) / custoTotal) * 100 : 0;

      // Análise dos prognósticos da IA no universo de dezenas
      const universo = f.universoDezenas || [];
      const dezenasAcertadasNoUniverso = universo.filter((d) => drawnNumbers.includes(d)).length;
      const taxaUniversoIA = universo.length > 0 ? (dezenasAcertadasNoUniverso / 15) * 100 : 0;

      return {
        fechamento: f,
        totalJogos,
        custoTotal,
        premioTotal,
        saldoLiquido,
        roi,
        hits15: h15,
        hits14: h14,
        hits13: h13,
        hits12: h12,
        hits11: h11,
        totalPremiados,
        taxaPremiacao,
        maxHits,
        bestTicket,
        dezenasAcertadasNoUniverso,
        taxaUniversoIA,
        isAbove50Percent: taxaPremiacao > 50,
      };
    });

    // Ordena do melhor resultado para o pior (maior pontuação e maior taxa de premiação)
    auditedList.sort((a, b) => {
      if (b.maxHits !== a.maxHits) return b.maxHits - a.maxHits;
      if (b.taxaPremiacao !== a.taxaPremiacao) return b.taxaPremiacao - a.taxaPremiacao;
      return b.premioTotal - a.premioTotal;
    });

    const bestResult = auditedList.length > 0 ? auditedList[0] : null;
    const above50List = auditedList.filter((a) => a.isAbove50Percent);

    return {
      auditedList,
      bestResult,
      above50List,
      totalFechamentos: auditedList.length,
      totalBilhetes: auditedList.reduce((acc, curr) => acc + curr.totalJogos, 0),
    };
  }, [savedFechamentos, latestDraw, duelRunCounter]);

  // Bilhetes salvos efetivos (props -> localStorage lotosniper_saved_tickets -> fechamentos salvos)
  const effectiveSavedTickets = useMemo(() => {
    const sortedDrawn = [...(latestDraw.dezenas || [])].sort((a, b) => a - b);
    if (userSavedTickets && userSavedTickets.length > 0) {
      return normalizeGameTickets(userSavedTickets, sortedDrawn);
    }
    try {
      const raw = localStorage.getItem('lotosniper_saved_tickets');
      if (raw) {
        const parsed = normalizeGameTickets(JSON.parse(raw), sortedDrawn);
        if (parsed.length > 0) return parsed;
      }
    } catch {}
    if (savedFechamentos.length > 0) {
      return normalizeGameTickets(
        savedFechamentos.flatMap((f) => (Array.isArray(f.tickets) ? f.tickets : [])),
        sortedDrawn
      );
    }
    return [];
  }, [userSavedTickets, savedFechamentos, latestDraw.dezenas, duelRunCounter]);

  // COMPARAÇÃO AUTOMÁTICA: Bilhetes Salvos vs Concurso Sorteado + Filtro > 50% Aproveitamento
  const savedTicketsComparison = useMemo(() => {
    const sortedDrawn = [...(latestDraw.dezenas || [])].sort((a, b) => a - b);
    const P11 = latestDraw.premiacoes?.faixa11?.valor || 7.0;
    const P12 = latestDraw.premiacoes?.faixa12?.valor || 14.0;
    const P13 = latestDraw.premiacoes?.faixa13?.valor || 35.0;
    const P14 = latestDraw.premiacoes?.faixa14?.valor || 1500.0;
    const P15 = latestDraw.premiacoes?.faixa15?.valor || 1800000.0;

    if (effectiveSavedTickets.length === 0 || sortedDrawn.length === 0) {
      return {
        allComparisons: [] as SavedTicketComparison[],
        above50Comparisons: [] as SavedTicketComparison[],
        bestComparison: null as SavedTicketComparison | null,
        maxHits: 0,
        awardedCount: 0,
        totalPremioEstimado: 0,
        mediaAcertos: 0,
      };
    }

    let maxHits = 0;
    let totalHitsSum = 0;
    let awardedCount = 0;
    let totalPremioEstimado = 0;

    const prelim = effectiveSavedTickets.map((ticket) => {
      const sortedTicketDez = [...ticket.dezenas].sort((a, b) => a - b);
      const hits = countMatches(sortedTicketDez, sortedDrawn);
      const aproveitamento = (hits / 15) * 100;
      const isAbove50Percent = aproveitamento > 50; // > 50% (8+ acertos de 15)
      const isAwarded = hits >= 11;

      let premioEstimado = 0;
      if (hits === 15) premioEstimado = P15;
      else if (hits === 14) premioEstimado = P14;
      else if (hits === 13) premioEstimado = P13;
      else if (hits === 12) premioEstimado = P12;
      else if (hits === 11) premioEstimado = P11;

      if (hits > maxHits) maxHits = hits;
      if (isAwarded) awardedCount++;
      totalHitsSum += hits;
      totalPremioEstimado += premioEstimado;

      return {
        ticket,
        hits,
        aproveitamento,
        isAbove50Percent,
        isAwarded,
        premioEstimado,
        isBestScore: false,
      };
    });

    // Ordena por maior pontuação, depois maior scoreIA
    prelim.sort((a, b) => {
      if (b.hits !== a.hits) return b.hits - a.hits;
      return (b.ticket.scoreIA || 0) - (a.ticket.scoreIA || 0);
    });

    const bestId = prelim[0]?.ticket.id;
    const allComparisons: SavedTicketComparison[] = prelim.map((item) => ({
      ...item,
      isBestScore: item.ticket.id === bestId && item.hits === maxHits,
    }));

    const above50Comparisons = allComparisons.filter((c) => c.isAbove50Percent);

    return {
      allComparisons,
      above50Comparisons,
      bestComparison: allComparisons[0] || null,
      maxHits,
      awardedCount,
      totalPremioEstimado,
      mediaAcertos: Number((totalHitsSum / effectiveSavedTickets.length).toFixed(2)),
    };
  }, [effectiveSavedTickets, latestDraw]);

  // Gera o conjunto de jogos de cada estratégia
  const generateTicketsForStrategy = (key: StrategyKey): { tickets: GameTicket[]; pool: number[] } => {
    if (key.startsWith('saved_')) {
      const id = key.replace('saved_', '');
      const found = savedFechamentos.find((f) => f.id === id);
      if (found && found.tickets.length > 0) {
        return { tickets: found.tickets, pool: found.universoDezenas || [] };
      }
    }

    if (key === 'meus_jogos' && userSavedTickets.length > 0) {
      const allNums = Array.from(new Set(userSavedTickets.flatMap((t) => t.dezenas))).sort((a, b) => a - b);
      return { tickets: userSavedTickets, pool: allNums };
    }

    let pool: number[] = [];
    let targetHits = 14;
    let maxTickets = 24;

    if (key === 'garantia_14_pts') {
      const p = buildOptimalPool(18, latestDraw, dynamicStats, cyclePendingNumbers, 9, 9);
      pool = p.dezenas;
      maxTickets = 24;
      targetHits = 14;
    } else if (key === 'filtro_ia') {
      const sortedByScore = [...dynamicStats]
        .sort((a, b) => {
          const scoreA = b.vezes * 1.5 + (b.atrasoAtual === 0 ? 8 : -b.atrasoAtual * 2);
          const scoreB = a.vezes * 1.5 + (a.atrasoAtual === 0 ? 8 : -a.atrasoAtual * 2);
          return scoreA - scoreB;
        })
        .map((s) => s.numero);
      pool = sortedByScore.slice(0, 18).sort((a, b) => a - b);
      maxTickets = 24;
      targetHits = 14;
    } else if (key === 'garantia_15_pts') {
      pool = [1, 2, 4, 7, 9, 10, 11, 13, 14, 15, 17, 18, 20, 22, 24, 25];
      maxTickets = 4;
      targetHits = 15;
    } else if (key === 'estrategia_documento') {
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
        const molduraCount = nums.filter((n) =>
          [1, 2, 3, 4, 5, 6, 10, 11, 15, 16, 20, 21, 22, 23, 24, 25].includes(n)
        ).length;
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

  // Simulação e Comparação do Duelo Head-to-Head
  const duelResults = useMemo(() => {
    const stratA = generateTicketsForStrategy(strategyAKey);
    const stratB = generateTicketsForStrategy(strategyBKey);

    const simA = runSimulation(stratA.tickets, drawsForBacktest);
    const simB = runSimulation(stratB.tickets, drawsForBacktest);

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

  const stratAConfig = getStrategyConfig(strategyAKey);
  const stratBConfig = getStrategyConfig(strategyBKey);

  const handleRerunDuel = () => {
    setIsSimulating(true);
    setTimeout(() => {
      setDuelRunCounter((c) => c + 1);
      setIsSimulating(false);
      try {
        soundService.playFilterClick();
      } catch {}
    }, 300);
  };

  // Gráficos Recharts
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
    <div className="bg-slate-900/95 rounded-3xl border border-slate-800 p-5 sm:p-6 shadow-2xl space-y-6 font-sans">
      {/* Top Banner com Subtabs de Modo Duelo e Auditoria de Backup */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-rose-500/20 via-pink-500/20 to-amber-500/20 text-rose-400 border border-rose-500/30 shrink-0">
            <Swords className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <span>⚔️ Modo Duelo (14 Pts vs IA) & Auditoria de Backup</span>
              </h3>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                Concurso Base #{latestDraw.concurso}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Confronte a Garantia Canônica de 14 Pontos contra o Filtro Neural de IA e audite os fechamentos do backup
              frente ao resultado oficial da Caixa.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap shrink-0">
          {/* Navegação entre Visualizações */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 flex-wrap gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('comparacao_salvos')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'comparacao_salvos'
                  ? 'bg-emerald-500 text-slate-950 shadow-md font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Target className="w-3.5 h-3.5" />
              <span>Bilhetes vs Sorteio ({effectiveSavedTickets.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('backup_audit')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'backup_audit'
                  ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Trophy className="w-3.5 h-3.5" />
              <span>Auditoria Backup ({savedFechamentos.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('duelo')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'duelo'
                  ? 'bg-rose-500 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Swords className="w-3.5 h-3.5" />
              <span>Duelo Head-to-Head</span>
            </button>
          </div>

          {/* Upload de Backup JSON */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleUploadBackup}
            accept=".json"
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shadow-sm"
            title="Carregar arquivo .json de backup para auditar fechamentos e comparar com a IA"
          >
            <Upload className="w-3.5 h-3.5 text-amber-400" />
            <span>Carregar Backup (.json)</span>
          </button>

          <button
            type="button"
            onClick={handleRerunDuel}
            disabled={isSimulating}
            className="flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-400 hover:to-pink-400 text-white font-bold text-xs shadow-lg shadow-rose-500/20 transition cursor-pointer active:scale-95"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isSimulating ? 'animate-spin' : ''}`} />
            <span>{isSimulating ? 'Calculando...' : 'Recalcular'}</span>
          </button>
        </div>
      </div>

      {/* Mensagem de Feedback */}
      {feedbackNotice && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center justify-between gap-2 shadow-lg animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{feedbackNotice}</span>
          </div>
          <button onClick={() => setFeedbackNotice(null)} className="text-slate-400 hover:text-white text-xs font-bold">
            ✕
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 0: COMPARAÇÃO AUTOMÁTICA DE BILHETES SALVOS VS CONCURSO SORTEADO    */}
      {/* ========================================================================= */}
      {activeTab === 'comparacao_salvos' && (
        <div className="space-y-5 animate-in fade-in">
          {/* Dezenas Oficiais do Concurso Base */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 block">
                Concurso Sorteado de Referência
              </span>
              <div className="text-sm font-mono font-bold text-white">
                Concurso #{latestDraw.concurso} · {latestDraw.data}
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {[...latestDraw.dezenas]
                .sort((a, b) => a - b)
                .map((num) => (
                  <span
                    key={num}
                    className="w-7 h-7 rounded-lg bg-emerald-500 text-slate-950 font-mono font-black text-xs flex items-center justify-center tabular-nums"
                  >
                    {num.toString().padStart(2, '0')}
                  </span>
                ))}
            </div>
          </div>

          {savedTicketsComparison.allComparisons.length === 0 ? (
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-8 text-center space-y-2">
              <Target className="w-10 h-10 text-slate-500 mx-auto" />
              <h4 className="text-sm font-bold text-white">Nenhum bilhete salvo disponível para comparação</h4>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Salve bilhetes no Estúdio de Fechamentos ou carregue um arquivo JSON de backup para comparar automaticamente contra o Concurso #{latestDraw.concurso}.
              </p>
            </div>
          ) : (
            <>
              {/* KPIs de Comparação Automática */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 font-mono tabular-nums">
                <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3.5">
                  <span className="text-[11px] text-slate-400 font-sans block">Bilhetes Comparados</span>
                  <strong className="text-xl font-black text-white">
                    {savedTicketsComparison.allComparisons.length}
                  </strong>
                  <span className="text-[11px] text-slate-500 block">
                    Média: {savedTicketsComparison.mediaAcertos} pts
                  </span>
                </div>

                <div className="bg-slate-900/80 border border-amber-500/40 rounded-2xl p-3.5">
                  <span className="text-[11px] text-amber-300 font-sans block">Maior Pontuação</span>
                  <strong className="text-xl font-black text-amber-400">
                    {savedTicketsComparison.maxHits}/15 pts
                  </strong>
                  <span className="text-[11px] text-slate-400 block">
                    Jogo #{savedTicketsComparison.bestComparison?.ticket.index.toString().padStart(2, '0')}
                  </span>
                </div>

                <div className="bg-slate-900/80 border border-emerald-500/40 rounded-2xl p-3.5">
                  <span className="text-[11px] text-emerald-300 font-sans block">Aproveitamento &gt; 50%</span>
                  <strong className="text-xl font-black text-emerald-400">
                    {savedTicketsComparison.above50Comparisons.length} jogos
                  </strong>
                  <span className="text-[11px] text-slate-400 block">
                    {((savedTicketsComparison.above50Comparisons.length / savedTicketsComparison.allComparisons.length) * 100).toFixed(1)}% da matriz (≥ 8 pts)
                  </span>
                </div>

                <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3.5">
                  <span className="text-[11px] text-slate-400 font-sans block">Premiados (11–15 pts)</span>
                  <strong className="text-xl font-black text-cyan-400">
                    {savedTicketsComparison.awardedCount} jogos
                  </strong>
                  <span className="text-[11px] text-emerald-400 block">
                    R$ {savedTicketsComparison.totalPremioEstimado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Card Destaque: Bilhete de Maior Pontuação */}
              {savedTicketsComparison.bestComparison && (
                <div className="bg-slate-900/80 border border-amber-500/50 rounded-2xl p-5 space-y-3 shadow-xl">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="px-2.5 py-1 rounded-lg bg-amber-400 text-slate-950 font-mono text-xs font-black uppercase flex items-center gap-1.5">
                        <Trophy className="w-3.5 h-3.5" />
                        <span>Maior Pontuação</span>
                      </span>
                      <span className="font-mono font-black text-white text-base tabular-nums">
                        Bilhete #{savedTicketsComparison.bestComparison.ticket.index.toString().padStart(2, '0')}
                      </span>
                      <span className="text-xs font-mono text-slate-400">
                        Soma {savedTicketsComparison.bestComparison.ticket.soma} · {savedTicketsComparison.bestComparison.ticket.pares}P/{savedTicketsComparison.bestComparison.ticket.impares}I
                      </span>
                    </div>

                    <div className="flex items-center gap-2 font-mono tabular-nums">
                      <span className="px-3 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-black">
                        {savedTicketsComparison.bestComparison.hits} ACERTOS ({savedTicketsComparison.bestComparison.aproveitamento.toFixed(1)}%)
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {savedTicketsComparison.bestComparison.ticket.dezenas.map((num) => {
                      const matched = latestDraw.dezenas.includes(num);
                      return (
                        <span
                          key={num}
                          className={`w-8 h-8 rounded-lg flex items-center justify-center font-mono text-xs tabular-nums transition ${
                            matched
                              ? 'bg-emerald-500 text-slate-950 font-black ring-2 ring-emerald-300/60'
                              : 'bg-slate-800 text-slate-400 border border-slate-700'
                          }`}
                        >
                          {num.toString().padStart(2, '0')}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Controle de Filtro Automático (> 50% Aproveitamento) */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/80 border border-slate-800 rounded-2xl p-3.5">
                <div className="flex items-center gap-2 text-xs">
                  <Filter className="w-4 h-4 text-emerald-400" />
                  <span className="font-bold text-white">Filtro Automático de Desempenho:</span>
                  <span className="text-slate-400 font-mono">
                    {ticketFilterMode === 'above_50'
                      ? `Exibindo ${savedTicketsComparison.above50Comparisons.length} jogo(s) com aproveitamento > 50% (≥ 8 acertos)`
                      : `Exibindo todos os ${savedTicketsComparison.allComparisons.length} jogo(s)`}
                  </span>
                </div>

                <div className="inline-flex rounded-xl bg-slate-950 p-1 border border-slate-800 text-xs font-mono">
                  <button
                    type="button"
                    onClick={() => setTicketFilterMode('above_50')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                      ticketFilterMode === 'above_50'
                        ? 'bg-emerald-500 text-slate-950 font-black'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Aproveitamento &gt; 50% ({savedTicketsComparison.above50Comparisons.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setTicketFilterMode('all')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                      ticketFilterMode === 'all'
                        ? 'bg-slate-700 text-white font-black'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Todos ({savedTicketsComparison.allComparisons.length})
                  </button>
                </div>
              </div>

              {/* Lista de Bilhetes Comparados */}
              {(() => {
                const listToShow =
                  ticketFilterMode === 'above_50'
                    ? savedTicketsComparison.above50Comparisons
                    : savedTicketsComparison.allComparisons;

                if (listToShow.length === 0) {
                  return (
                    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 text-center space-y-2">
                      <AlertTriangle className="w-7 h-7 text-amber-400 mx-auto" />
                      <p className="text-xs text-slate-300">
                        Nenhum bilhete ultrapassou 50% de aproveitamento (≥ 8 acertos) neste concurso.
                      </p>
                      <button
                        type="button"
                        onClick={() => setTicketFilterMode('all')}
                        className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold cursor-pointer"
                      >
                        Visualizar Todos os {savedTicketsComparison.allComparisons.length} Bilhetes
                      </button>
                    </div>
                  );
                }

                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[540px] overflow-y-auto pr-1">
                    {listToShow.map((item) => (
                      <div
                        key={item.ticket.id}
                        className={`p-3.5 rounded-2xl border bg-slate-900/80 space-y-2.5 font-mono transition ${
                          item.isBestScore
                            ? 'border-amber-400/60 ring-1 ring-amber-400/40'
                            : item.isAwarded
                            ? 'border-emerald-500/40'
                            : 'border-slate-800'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-black text-white tabular-nums">
                              Jogo #{item.ticket.index.toString().padStart(2, '0')}
                            </span>
                            {item.isBestScore && (
                              <span className="px-1.5 py-0.5 rounded bg-amber-400 text-slate-950 text-[10px] font-black uppercase">
                                Top Score
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 tabular-nums">
                            <span
                              className={`px-2 py-0.5 rounded font-black text-[11px] ${
                                item.hits >= 14
                                  ? 'bg-amber-400 text-slate-950'
                                  : item.hits >= 11
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                  : item.isAbove50Percent
                                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                                  : 'bg-slate-800 text-slate-400'
                              }`}
                            >
                              {item.hits}/15 ({item.aproveitamento.toFixed(1)}%)
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-1">
                          {item.ticket.dezenas.map((num) => {
                            const matched = latestDraw.dezenas.includes(num);
                            return (
                              <span
                                key={num}
                                className={`w-7 h-7 rounded flex items-center justify-center text-xs tabular-nums ${
                                  matched
                                    ? 'bg-emerald-500 text-slate-950 font-black'
                                    : 'bg-slate-800/80 text-slate-400'
                                }`}
                              >
                                {num.toString().padStart(2, '0')}
                              </span>
                            );
                          })}
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800 tabular-nums">
                          <span>Soma: {item.ticket.soma} · P/I: {item.ticket.pares}/{item.ticket.impares}</span>
                          <span className={item.premioEstimado > 0 ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
                            {item.premioEstimado > 0
                              ? `Prêmio: R$ ${item.premioEstimado.toFixed(2)}`
                              : item.isAbove50Percent
                              ? 'Desempenho > 50%'
                              : 'Abaixo de 50%'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 1: AUDITORIA DO BACKUP DE FECHAMENTOS (MELHOR RESULTADO & TAXA > 50%) */}
      {/* ========================================================================= */}
      {activeTab === 'backup_audit' && (
        <div className="space-y-6 animate-in fade-in">
          {/* 1. CARD HERO: MELHOR RESULTADO DO BACKUP */}
          {backupAuditReport.bestResult ? (
            <div className="bg-gradient-to-br from-amber-950/40 via-slate-900 to-slate-950 rounded-3xl border-2 border-amber-500/50 p-5 sm:p-6 shadow-2xl relative overflow-hidden">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-3 py-1 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 text-xs font-black uppercase tracking-wider flex items-center gap-1 shadow-md shadow-amber-500/20">
                      <Trophy className="w-3.5 h-3.5 text-slate-950 fill-current" />
                      Melhor Resultado do Backup
                    </span>
                    <span className="text-xs font-mono font-bold text-amber-300">
                      Concurso #{latestDraw.concurso} ({latestDraw.data})
                    </span>
                  </div>

                  <div>
                    <h4 className="text-xl sm:text-2xl font-black text-white">
                      {backupAuditReport.bestResult.fechamento.tipoFechamento ||
                        backupAuditReport.bestResult.fechamento.modalidadeMatriz}
                    </h4>
                    <p className="text-xs text-slate-300 mt-1">
                      Este fechamento cravou{' '}
                      <strong className="text-amber-400 font-mono text-sm">
                        {backupAuditReport.bestResult.maxHits} ACERTOS
                      </strong>{' '}
                      e obteve{' '}
                      <strong className="text-emerald-400 font-mono text-sm">
                        {backupAuditReport.bestResult.totalPremiados} de {backupAuditReport.bestResult.totalJogos} bilhetes premiados ({backupAuditReport.bestResult.taxaPremiacao.toFixed(1)}%)
                      </strong>!
                    </p>
                  </div>

                  {/* Detalhe do Bilhete Campeão com Dezenas Sorteadas Destacadas */}
                  {backupAuditReport.bestResult.bestTicket && (
                    <div className="p-3 bg-slate-950/80 rounded-2xl border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
                        <span>
                          Bilhete Campeão #
                          {(backupAuditReport.bestResult.bestTicket.index || 1).toString().padStart(2, '0')}
                        </span>
                        <span className="text-emerald-400 font-bold">
                          {backupAuditReport.bestResult.maxHits} dezenas sorteadas cravadas!
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {backupAuditReport.bestResult.bestTicket.dezenas.map((num) => {
                          const isMatch = latestDraw.dezenas.includes(num);
                          return (
                            <span
                              key={num}
                              className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center font-mono text-xs font-bold transition ${
                                isMatch
                                  ? 'bg-emerald-500 text-slate-950 font-black shadow-md shadow-emerald-500/30 ring-2 ring-emerald-400'
                                  : 'bg-slate-800 text-slate-300 border border-slate-700'
                              }`}
                            >
                              {num.toString().padStart(2, '0')}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Métricas Rápidas do Campeão */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 shrink-0 bg-slate-950/70 p-4 rounded-2xl border border-slate-800/80">
                  <div className="text-center p-2 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block font-bold">Taxa de Premiação</span>
                    <span
                      className={`text-base font-mono font-black ${
                        backupAuditReport.bestResult.taxaPremiacao > 50 ? 'text-emerald-400' : 'text-amber-400'
                      }`}
                    >
                      {backupAuditReport.bestResult.taxaPremiacao.toFixed(1)}%
                    </span>
                    <span className="text-[9px] text-slate-500 block">
                      {backupAuditReport.bestResult.totalPremiados}/{backupAuditReport.bestResult.totalJogos} jogos
                    </span>
                  </div>

                  <div className="text-center p-2 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block font-bold">Prêmio Estimado</span>
                    <span className="text-base font-mono font-black text-emerald-400">
                      R$ {backupAuditReport.bestResult.premioTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                    <span className="text-[9px] text-slate-500 block">
                      Custo: R$ {backupAuditReport.bestResult.custoTotal.toFixed(2)}
                    </span>
                  </div>

                  <div className="text-center p-2 rounded-xl bg-slate-900 border border-slate-800 col-span-2 sm:col-span-1">
                    <span className="text-[10px] text-slate-400 block font-bold">Universo da IA</span>
                    <span className="text-base font-mono font-black text-sky-400">
                      {backupAuditReport.bestResult.dezenasAcertadasNoUniverso}/15
                    </span>
                    <span className="text-[9px] text-slate-500 block">
                      {backupAuditReport.bestResult.taxaUniversoIA.toFixed(0)}% de acerto
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-slate-950/60 rounded-3xl border border-slate-800 p-8 text-center space-y-3">
              <FileJson className="w-10 h-10 text-amber-500/60 mx-auto" />
              <h4 className="text-base font-bold text-white">Nenhum fechamento salvo carregado no momento</h4>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Carregue um arquivo de backup (.json) usando o botão acima ou gere um novo fechamento no{' '}
                <strong>Estúdio de Fechamentos</strong> para auditar aqui.
              </p>
            </div>
          )}

          {/* 2. RESULTADOS COM TAXA DE PREMIAÇÃO ACIMA DE 50% */}
          <div className="space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <Flame className="w-4 h-4 fill-current" />
                </div>
                <h4 className="text-sm sm:text-base font-black text-white">
                  Fechamentos de Alta Performance (Taxa de Premiação &gt; 50%)
                </h4>
              </div>
              <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold">
                {backupAuditReport.above50List.length} fechamento(s) qualificado(s)
              </span>
            </div>

            {backupAuditReport.above50List.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {backupAuditReport.above50List.map((item) => (
                  <div
                    key={item.fechamento.id}
                    className="bg-slate-950/80 rounded-2xl border-2 border-emerald-500/40 p-4 space-y-3 shadow-lg hover:border-emerald-400 transition"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          {item.taxaPremiacao.toFixed(1)}% PREMIADO
                        </span>
                        <h5 className="text-sm font-bold text-white mt-1.5 line-clamp-1">
                          {item.fechamento.tipoFechamento || item.fechamento.modalidadeMatriz}
                        </h5>
                      </div>
                      <span className="text-xs font-mono font-black text-amber-400 px-2 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 shrink-0">
                        {item.maxHits} Pts
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-1 border-t border-slate-800">
                      <div>
                        <span className="text-[10px] text-slate-500 block font-sans">Jogos Premiados:</span>
                        <strong className="text-emerald-400">
                          {item.totalPremiados} de {item.totalJogos} jogos
                        </strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block font-sans">Retorno / Saldo:</span>
                        <strong className={item.saldoLiquido >= 0 ? 'text-emerald-400' : 'text-slate-300'}>
                          R$ {item.premioTotal.toFixed(2)}
                        </strong>
                      </div>
                    </div>

                    {/* Resumo das faixas acertadas */}
                    <div className="flex items-center gap-1.5 flex-wrap text-[10px] font-mono">
                      {item.hits15 > 0 && (
                        <span className="px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-300 border border-yellow-500/40 font-bold">
                          {item.hits15}x 15 pts!
                        </span>
                      )}
                      {item.hits14 > 0 && (
                        <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold">
                          {item.hits14}x 14 pts
                        </span>
                      )}
                      {item.hits13 > 0 && (
                        <span className="px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/40">
                          {item.hits13}x 13 pts
                        </span>
                      )}
                      {item.hits12 > 0 && (
                        <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                          {item.hits12}x 12 pts
                        </span>
                      )}
                      {item.hits11 > 0 && (
                        <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                          {item.hits11}x 11 pts
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 bg-slate-950/60 rounded-2xl border border-slate-800 text-xs text-slate-400 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white block font-bold">
                    Nenhum fechamento atingiu &gt; 50% de premiação no Concurso #{latestDraw.concurso}
                  </strong>
                  <p className="mt-0.5">
                    {backupAuditReport.bestResult
                      ? `O fechamento mais próximo foi "${backupAuditReport.bestResult.fechamento.tipoFechamento}" com ${backupAuditReport.bestResult.taxaPremiacao.toFixed(1)}% de bilhetes premiados. Para superar 50%, utilize a matriz canônica 18-15-14-15 com 9 repetidas e 9 ausentes.`
                      : 'Carregue um arquivo de backup contendo fechamentos salvos para visualizar esta análise.'}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* 3. TABELA COMPLETA DE ANÁLISE DOS PROGNÓSTICOS DA IA */}
          <div className="space-y-3 pt-2">
            <h4 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-sky-400" />
              <span>Análise dos Prognósticos da IA em Todos os Fechamentos do Backup</span>
            </h4>

            <div className="overflow-x-auto rounded-2xl border border-slate-800">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-950 text-slate-400 text-[11px] uppercase tracking-wider border-b border-slate-800 font-sans">
                  <tr>
                    <th className="p-3">Fechamento / Prognóstico</th>
                    <th className="p-3 text-center">Universo IA</th>
                    <th className="p-3 text-center">Jogos</th>
                    <th className="p-3 text-center">Máx Acertos</th>
                    <th className="p-3 text-center">Premiados</th>
                    <th className="p-3 text-center">Taxa Premiação</th>
                    <th className="p-3 text-right pr-4">Premiação (R$)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 bg-slate-900/60">
                  {backupAuditReport.auditedList.map((item, idx) => (
                    <tr key={item.fechamento.id || idx} className="hover:bg-slate-800/40 transition">
                      <td className="p-3 font-sans font-medium text-slate-200">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0"></span>
                          <span className="line-clamp-1">
                            {item.fechamento.tipoFechamento || item.fechamento.modalidadeMatriz}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-500 font-mono block">
                          {item.fechamento.dataCriacao || `Concurso #${item.fechamento.concurso}`}
                        </span>
                      </td>

                      <td className="p-3 text-center">
                        <span className="text-sky-300 font-bold">
                          {item.dezenasAcertadasNoUniverso}/15 ({item.taxaUniversoIA.toFixed(0)}%)
                        </span>
                      </td>

                      <td className="p-3 text-center text-slate-300">{item.totalJogos}</td>

                      <td className="p-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded font-black ${
                            item.maxHits >= 14
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                              : item.maxHits >= 13
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          {item.maxHits} pts
                        </span>
                      </td>

                      <td className="p-3 text-center text-slate-300">
                        {item.totalPremiados}/{item.totalJogos}
                      </td>

                      <td className="p-3 text-center">
                        <span
                          className={`font-black ${
                            item.taxaPremiacao > 50 ? 'text-emerald-400 font-bold' : 'text-slate-300'
                          }`}
                        >
                          {item.taxaPremiacao.toFixed(1)}%
                        </span>
                      </td>

                      <td className="p-3 text-right pr-4 font-bold text-emerald-400">
                        R$ {item.premioTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 2: MODO DUELO HEAD-TO-HEAD (14 PTS VS IA & RECHARTS)                  */}
      {/* ========================================================================= */}
      {activeTab === 'duelo' && (
        <div className="space-y-6 animate-in fade-in">
          {/* Selectores Bar: Estratégia A vs Estratégia B & Scope */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Selector A */}
            <div className="bg-slate-950/80 p-4 rounded-2xl border border-emerald-500/40 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 uppercase tracking-wider">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                  Algoritmo A (Verde)
                </span>
                <span className="text-[10px] font-mono text-slate-400">{stratAConfig.badge}</span>
              </div>

              <select
                value={strategyAKey}
                onChange={(e) => setStrategyAKey(e.target.value as StrategyKey)}
                className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl p-2 text-xs font-semibold focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                <optgroup label="Estratégias Canônicas">
                  {CANONICAL_STRATEGIES.map((s) => (
                    <option key={s.key} value={s.key}>
                      {s.name}
                    </option>
                  ))}
                </optgroup>
                {savedFechamentos.length > 0 && (
                  <optgroup label="Fechamentos do Backup">
                    {savedFechamentos.map((f) => (
                      <option key={`saved_${f.id}`} value={`saved_${f.id}`}>
                        📂 {f.tipoFechamento || f.modalidadeMatriz} ({f.tickets?.length || 0} Jogos)
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>

              <p className="text-[11px] text-slate-400 leading-tight">
                {stratAConfig.description} • {duelResults.stratA.tickets.length} apostas por concurso.
              </p>
            </div>

            {/* Selector B */}
            <div className="bg-slate-950/80 p-4 rounded-2xl border border-sky-500/40 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-sky-400 flex items-center gap-1.5 uppercase tracking-wider">
                  <span className="w-2.5 h-2.5 rounded-full bg-sky-400"></span>
                  Algoritmo B (Azul)
                </span>
                <span className="text-[10px] font-mono text-slate-400">{stratBConfig.badge}</span>
              </div>

              <select
                value={strategyBKey}
                onChange={(e) => setStrategyBKey(e.target.value as StrategyKey)}
                className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl p-2 text-xs font-semibold focus:outline-none focus:border-sky-500 cursor-pointer"
              >
                <optgroup label="Estratégias Canônicas">
                  {CANONICAL_STRATEGIES.map((s) => (
                    <option key={s.key} value={s.key}>
                      {s.name}
                    </option>
                  ))}
                </optgroup>
                {savedFechamentos.length > 0 && (
                  <optgroup label="Fechamentos do Backup">
                    {savedFechamentos.map((f) => (
                      <option key={`saved_${f.id}`} value={`saved_${f.id}`}>
                        📂 {f.tipoFechamento || f.modalidadeMatriz} ({f.tickets?.length || 0} Jogos)
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>

              <p className="text-[11px] text-slate-400 leading-tight">
                {stratBConfig.description} • {duelResults.stratB.tickets.length} apostas por concurso.
              </p>
            </div>

            {/* Scope Selector */}
            <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800 space-y-2">
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
                className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl p-2 text-xs font-semibold focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="10_concursos">Últimos 10 Concursos Oficiais</option>
                <option value="25_concursos">Últimos 25 Concursos Oficiais (Recomendado)</option>
                <option value="50_concursos">Últimos 50 Concursos Oficiais (Longo Prazo)</option>
              </select>

              <p className="text-[11px] text-slate-400 leading-tight">
                Confrontando Concursos #{drawsForBacktest[drawsForBacktest.length - 1]?.concurso} ao #{latestDraw.concurso}.
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
                  activeChartMetric === 'roi' ? 'bg-emerald-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Percent className="w-3.5 h-3.5" />
                <span>Comparativo de ROI (%)</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveChartMetric('financeiro')}
                className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  activeChartMetric === 'financeiro' ? 'bg-emerald-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                <DollarSign className="w-3.5 h-3.5" />
                <span>Custo vs Premiações (R$)</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveChartMetric('acertos')}
                className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  activeChartMetric === 'acertos' ? 'bg-emerald-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
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
          <div className="bg-slate-950/80 rounded-2xl border border-slate-800 p-4">
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
          <div className="overflow-x-auto rounded-2xl border border-slate-800">
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
                    {duelResults.simA.acertos14 > duelResults.simB.acertos14
                      ? 'A cravou mais'
                      : duelResults.simB.acertos14 > duelResults.simA.acertos14
                      ? 'B cravou mais'
                      : 'Empate'}
                  </td>
                </tr>
                <tr>
                  <td className="p-3 text-slate-300 font-sans font-medium">Bilhetes com 15 Pontos (Jackpot)</td>
                  <td className="p-3 font-bold text-yellow-400">{duelResults.simA.acertos15} bilhete(s)</td>
                  <td className="p-3 font-bold text-yellow-400">{duelResults.simB.acertos15} bilhete(s)</td>
                  <td className="p-3 text-right pr-4 text-slate-300">
                    {duelResults.simA.acertos15 > duelResults.simB.acertos15
                      ? 'A cravou 15!'
                      : duelResults.simB.acertos15 > duelResults.simA.acertos15
                      ? 'B cravou 15!'
                      : 'Nenhum'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
