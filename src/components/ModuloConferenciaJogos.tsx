import React, { useState, useMemo } from 'react';
import { LotofacilDraw, GameTicket } from '../types/lotofacil';
import { CONCURSO_ATUAL, RECENT_DRAWS } from '../data/lotofacilData';
import { countMatches, VALOR_APOSTA_LOTOFACIL } from '../services/combinatorics';
import { ExportCSVModal, CSVExportGame } from './ExportCSVModal';
import {
  analyzeGamesList,
  analyzeGameStatistics,
  GameMonitoringResult,
  MonitoringSummary,
} from '../services/statisticalMonitor';
import { StatisticalMonitoringAlert } from './StatisticalMonitoringAlert';
import {
  ClipboardCheck,
  CheckCircle2,
  AlertCircle,
  Copy,
  Trash2,
  RefreshCw,
  Sparkles,
  Award,
  DollarSign,
  Star,
  ChevronDown,
  ChevronUp,
  FileText,
  Filter,
  Check,
  Layers,
  ArrowRight,
  TrendingUp,
  HelpCircle,
  Calculator,
  Table,
  LayoutGrid,
  FileSpreadsheet,
  Download,
  Target,
  ShieldAlert,
  AlertTriangle,
  Scale,
} from 'lucide-react';

export interface PontosTierMetric {
  pontos: number;
  label: string;
  count: number;
  percentage: number;
  isPremiado: boolean;
  premioDesc: string;
  premioValorEstimado?: number;
  colorTheme: {
    bgCard: string;
    borderCard: string;
    textTitle: string;
    badgeBg: string;
    badgeText: string;
    ring: string;
  };
}

export const SAMPLE_24_GAMES_TEXT = `Jogo 01: 01 - 02 - 03 - 04 - 05 - 06 - 10 - 11 - 12 - 13 - 20 - 22 - 23 - 24 - 25
Jogo 02: 01 - 02 - 03 - 04 - 05 - 06 - 10 - 11 - 13 - 14 - 15 - 20 - 21 - 22 - 23
Jogo 03: 01 - 02 - 03 - 04 - 05 - 06 - 10 - 11 - 12 - 13 - 14 - 15 - 21 - 24 - 25
Jogo 04: 01 - 02 - 03 - 04 - 05 - 06 - 10 - 11 - 12 - 14 - 15 - 20 - 22 - 23 - 24
Jogo 05: 01 - 02 - 03 - 04 - 05 - 06 - 10 - 11 - 12 - 14 - 20 - 21 - 22 - 23 - 25
Jogo 06: 01 - 02 - 03 - 04 - 05 - 06 - 10 - 11 - 12 - 15 - 20 - 21 - 22 - 24 - 25
Jogo 07: 01 - 02 - 03 - 04 - 05 - 06 - 10 - 11 - 13 - 14 - 15 - 20 - 23 - 24 - 25
Jogo 08: 01 - 02 - 03 - 04 - 05 - 06 - 10 - 11 - 12 - 13 - 14 - 21 - 22 - 23 - 24
Jogo 09: 01 - 02 - 03 - 04 - 05 - 06 - 10 - 11 - 12 - 13 - 15 - 21 - 22 - 23 - 25
Jogo 10: 01 - 02 - 03 - 04 - 05 - 06 - 10 - 11 - 12 - 13 - 14 - 15 - 20 - 22 - 25
Jogo 11: 01 - 02 - 03 - 04 - 05 - 06 - 10 - 11 - 12 - 13 - 15 - 20 - 21 - 23 - 24
Jogo 12: 01 - 02 - 03 - 04 - 05 - 06 - 10 - 11 - 13 - 14 - 15 - 21 - 22 - 24 - 25
Jogo 13: 01 - 02 - 03 - 04 - 05 - 06 - 10 - 11 - 12 - 13 - 14 - 20 - 21 - 22 - 24
Jogo 14: 01 - 02 - 03 - 04 - 05 - 06 - 10 - 11 - 12 - 13 - 14 - 20 - 21 - 23 - 25
Jogo 15: 01 - 02 - 03 - 04 - 05 - 06 - 10 - 11 - 12 - 14 - 15 - 22 - 23 - 24 - 25
Jogo 16: 01 - 02 - 03 - 04 - 05 - 06 - 10 - 11 - 13 - 14 - 20 - 21 - 22 - 23 - 24
Jogo 17: 01 - 02 - 03 - 04 - 05 - 06 - 10 - 11 - 12 - 14 - 15 - 20 - 23 - 24 - 25
Jogo 18: 01 - 02 - 03 - 04 - 05 - 06 - 10 - 11 - 12 - 13 - 14 - 15 - 20 - 21 - 22
Jogo 19: 01 - 02 - 03 - 04 - 05 - 06 - 10 - 11 - 12 - 13 - 14 - 15 - 20 - 21 - 23
Jogo 20: 01 - 02 - 03 - 04 - 05 - 06 - 10 - 11 - 12 - 13 - 14 - 15 - 20 - 21 - 24
Jogo 21: 01 - 02 - 03 - 04 - 05 - 06 - 10 - 11 - 12 - 13 - 14 - 15 - 20 - 21 - 25
Jogo 22: 01 - 02 - 03 - 04 - 05 - 06 - 10 - 11 - 12 - 13 - 14 - 15 - 20 - 22 - 23
Jogo 23: 01 - 02 - 03 - 04 - 05 - 06 - 10 - 11 - 12 - 13 - 14 - 15 - 20 - 22 - 24
Jogo 24: 01 - 02 - 03 - 04 - 05 - 06 - 10 - 11 - 12 - 13 - 14 - 15 - 20 - 23 - 24`;

export interface ParsedGameItem {
  id: string;
  label: string;
  dezenas: number[];
  rawLine: string;
  isValid: boolean;
  error?: string;
}

interface ModuloConferenciaJogosProps {
  latestDraw?: LotofacilDraw;
  generatedTickets?: GameTicket[];
  onImportFechamento?: () => void;
  inspectedVolanteNumbers?: number[];
  onAddVolanteToConference?: (nums: number[]) => void;
  onGoToFechamento?: () => void;
}

export const ModuloConferenciaJogos: React.FC<ModuloConferenciaJogosProps> = ({
  latestDraw = CONCURSO_ATUAL,
  generatedTickets = [],
  inspectedVolanteNumbers = [],
  onAddVolanteToConference,
  onGoToFechamento,
}) => {
  // Input raw text with 24 games as initial value
  const [inputText, setInputText] = useState<string>(SAMPLE_24_GAMES_TEXT);
  const [isEditorExpanded, setIsEditorExpanded] = useState<boolean>(true);
  const [filterFaixa, setFilterFaixa] = useState<'all' | 'premiados' | '15' | '14' | '13' | '12' | '11'>('all');
  const [copiedNotification, setCopiedNotification] = useState<boolean>(false);

  // SISTEMA DE MONITORAMENTO ESTATÍSTICO DE ANOMALIAS
  const [monitoringFilter, setMonitoringFilter] = useState<'all' | 'improbable' | string>('all');
  const [highlightedGameId, setHighlightedGameId] = useState<string | null>(null);

  // CONTADOR DE PONTOS / ACERTOS (6 A 15 PONTOS)
  const [selectedPontosFilter, setSelectedPontosFilter] = useState<number | 'all'>('all');
  const [totalizerViewMode, setTotalizerViewMode] = useState<'cards' | 'table'>('cards');

  // CSV EXPORT MODAL STATE
  const [isCSVModalOpen, setIsCSVModalOpen] = useState<boolean>(false);
  const [csvModalSubset, setCsvModalSubset] = useState<number | null>(null);

  // CONTEST SELECTOR: LATEST CONTEST IS ALWAYS THE DEFAULT & HIGHEST PRIORITY
  const [selectedConcursoId, setSelectedConcursoId] = useState<number>(latestDraw.concurso);
  const [loadedFechamentoNotice, setLoadedFechamentoNotice] = useState<string | null>(null);

  // Sync priority when latestDraw updates
  React.useEffect(() => {
    setSelectedConcursoId(latestDraw.concurso);
  }, [latestDraw.concurso]);

  // Listener para carregar jogos de fechamento salvo diretamente na Entrada de Jogos
  React.useEffect(() => {
    // 1. Checa se há jogos pendentes salvos em localStorage ao montar
    try {
      const raw = localStorage.getItem('lotosniper_pending_conference_games');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.text) {
          setInputText(parsed.text);
          setIsEditorExpanded(true);
          const name = parsed.name || 'Fechamento Salvo';
          setLoadedFechamentoNotice(`✓ Fechamento "${name}" carregado com sucesso na Entrada de Jogos para Conferência!`);
          localStorage.removeItem('lotosniper_pending_conference_games');
          setTimeout(() => {
            const el = document.getElementById('entrada-jogos-conferencia');
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }, 300);
          setTimeout(() => setLoadedFechamentoNotice(null), 7000);
        }
      }
    } catch {}

    // 2. Listener para eventos disparados com o módulo já montado
    const handleLoadConferenceGames = (e: any) => {
      if (e?.detail?.text) {
        setInputText(e.detail.text);
        setIsEditorExpanded(true);
        const name = e.detail.name || 'Fechamento Salvo';
        setLoadedFechamentoNotice(`✓ Fechamento "${name}" carregado com sucesso na Entrada de Jogos para Conferência!`);
        setTimeout(() => {
          const el = document.getElementById('entrada-jogos-conferencia');
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 150);
        setTimeout(() => setLoadedFechamentoNotice(null), 7000);
      }
    };
    window.addEventListener('lotosniper-load-conference-games', handleLoadConferenceGames);
    return () => window.removeEventListener('lotosniper-load-conference-games', handleLoadConferenceGames);
  }, []);

  // Combine draws with latestDraw strictly placed first
  const allDraws = useMemo(() => {
    const others = RECENT_DRAWS.filter((d) => d.concurso !== latestDraw.concurso);
    return [latestDraw, ...others];
  }, [latestDraw]);

  // Selected draw object
  const targetDraw = useMemo(() => {
    return allDraws.find((d) => d.concurso === selectedConcursoId) || latestDraw;
  }, [allDraws, selectedConcursoId, latestDraw]);

  const isCurrentPriority = targetDraw.concurso === latestDraw.concurso;

  // Robust line-by-line parser for the requested format
  const parsedGames = useMemo<ParsedGameItem[]>(() => {
    if (!inputText.trim()) return [];

    const lines = inputText.split('\n');
    const result: ParsedGameItem[] = [];

    lines.forEach((line, idx) => {
      const trimmed = line.trim();
      if (!trimmed) return;

      // Extract label if present (e.g., "Jogo 01:", "Jogo 1 -", etc.)
      let label = `Jogo ${(idx + 1).toString().padStart(2, '0')}`;
      let numbersPart = trimmed;

      const labelMatch = trimmed.match(/^(Jogo\s*\d+[\s*:\-_]*)/i);
      if (labelMatch) {
        label = labelMatch[0].replace(/[:\-_]/g, '').trim();
        numbersPart = trimmed.slice(labelMatch[0].length);
      }

      // Extract all numbers between 1 and 25
      const matches = numbersPart.match(/\b([1-9]|0[1-9]|1\d|2[0-5])\b/g);
      const numbers: number[] = matches ? Array.from(new Set(matches.map((m) => parseInt(m, 10)))) : [];
      numbers.sort((a, b) => a - b);

      const isValid = numbers.length === 15;
      let error: string | undefined;
      if (numbers.length < 15) {
        error = `${numbers.length} dezenas (${15 - numbers.length} faltando)`;
      } else if (numbers.length > 15) {
        error = `${numbers.length} dezenas (${numbers.length - 15} a mais)`;
      }

      result.push({
        id: `game-${idx + 1}-${numbers.join('-')}`,
        label,
        dezenas: numbers,
        rawLine: trimmed,
        isValid,
        error,
      });
    });

    return result;
  }, [inputText]);

  // Performance calculation against target contest
  const conferenceSummary = useMemo(() => {
    let total15 = 0;
    let total14 = 0;
    let total13 = 0;
    let total12 = 0;
    let total11 = 0;
    let totalNaoPremiados = 0;
    let premiosValorTotal = 0;

    const gameResults = parsedGames.map((game) => {
      if (!game.isValid) {
        return {
          ...game,
          hits: 0,
          acertosList: [] as number[],
          premioNome: 'Inválido',
          premioValor: 0,
        };
      }

      const hits = countMatches(game.dezenas, targetDraw.dezenas);
      const acertosList = game.dezenas.filter((n) => targetDraw.dezenas.includes(n));

      let premioNome = 'Não premiado';
      let premioValor = 0;

      if (hits === 15) {
        total15++;
        premioNome = '15 Pontos (Faixa Máxima)';
        premioValor = targetDraw.premiacoes?.faixa15?.valor || 1750000;
      } else if (hits === 14) {
        total14++;
        premioNome = '14 Pontos';
        premioValor = targetDraw.premiacoes?.faixa14?.valor || 1400;
      } else if (hits === 13) {
        total13++;
        premioNome = '13 Pontos';
        premioValor = targetDraw.premiacoes?.faixa13?.valor || 35.0;
      } else if (hits === 12) {
        total12++;
        premioNome = '12 Pontos';
        premioValor = targetDraw.premiacoes?.faixa12?.valor || 14.0;
      } else if (hits === 11) {
        total11++;
        premioNome = '11 Pontos';
        premioValor = targetDraw.premiacoes?.faixa11?.valor || 7.0;
      } else {
        totalNaoPremiados++;
      }

      premiosValorTotal += premioValor;

      return {
        ...game,
        hits,
        acertosList,
        premioNome,
        premioValor,
      };
    });

    const totalJogos = parsedGames.filter((g) => g.isValid).length;
    const custoApostas = totalJogos * VALOR_APOSTA_LOTOFACIL;
    const saldoLiquido = premiosValorTotal - custoApostas;
    const totalPremiados = total15 + total14 + total13 + total12 + total11;
    const taxaAcerto = totalJogos > 0 ? (totalPremiados / totalJogos) * 100 : 0;

    return {
      gameResults,
      totalJogos,
      custoApostas,
      premiosValorTotal,
      saldoLiquido,
      total15,
      total14,
      total13,
      total12,
      total11,
      totalNaoPremiados,
      totalPremiados,
      taxaAcerto,
    };
  }, [parsedGames, targetDraw]);

  // CONTADOR OFICIAL DE ACERTOS DA CONFERÊNCIA: 6 A 15 PONTOS
  const PONTOS_TIERS = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15];

  const pontosCountSummary = useMemo<PontosTierMetric[]>(() => {
    const validGames = conferenceSummary.gameResults.filter((g) => g.isValid);
    const totalValid = validGames.length;

    const themeMap: Record<number, PontosTierMetric['colorTheme']> = {
      15: {
        bgCard: 'bg-gradient-to-br from-amber-500/25 via-amber-900/30 to-amber-950/40',
        borderCard: 'border-amber-400/80',
        textTitle: 'text-amber-300',
        badgeBg: 'bg-amber-400',
        badgeText: 'text-slate-950',
        ring: 'ring-2 ring-amber-400/70 shadow-lg shadow-amber-500/20',
      },
      14: {
        bgCard: 'bg-gradient-to-br from-purple-500/20 via-indigo-950/30 to-slate-900',
        borderCard: 'border-purple-400/70',
        textTitle: 'text-purple-300',
        badgeBg: 'bg-purple-400',
        badgeText: 'text-slate-950',
        ring: 'ring-2 ring-purple-400/50 shadow-md shadow-purple-500/20',
      },
      13: {
        bgCard: 'bg-gradient-to-br from-emerald-500/20 via-emerald-950/30 to-slate-900',
        borderCard: 'border-emerald-400/60',
        textTitle: 'text-emerald-300',
        badgeBg: 'bg-emerald-400',
        badgeText: 'text-slate-950',
        ring: 'ring-1 ring-emerald-400/50',
      },
      12: {
        bgCard: 'bg-gradient-to-br from-teal-500/15 via-teal-950/30 to-slate-900',
        borderCard: 'border-teal-400/50',
        textTitle: 'text-teal-300',
        badgeBg: 'bg-teal-400',
        badgeText: 'text-slate-950',
        ring: 'ring-1 ring-teal-400/40',
      },
      11: {
        bgCard: 'bg-gradient-to-br from-cyan-500/15 via-cyan-950/30 to-slate-900',
        borderCard: 'border-cyan-400/50',
        textTitle: 'text-cyan-300',
        badgeBg: 'bg-cyan-400',
        badgeText: 'text-slate-950',
        ring: 'ring-1 ring-cyan-400/40',
      },
      10: {
        bgCard: 'bg-slate-900/90',
        borderCard: 'border-indigo-800/40',
        textTitle: 'text-indigo-300',
        badgeBg: 'bg-indigo-950 border border-indigo-700/50',
        badgeText: 'text-indigo-300',
        ring: 'ring-1 ring-indigo-500/20',
      },
      9: {
        bgCard: 'bg-slate-900/80',
        borderCard: 'border-slate-800',
        textTitle: 'text-sky-300',
        badgeBg: 'bg-slate-800',
        badgeText: 'text-sky-300',
        ring: '',
      },
      8: {
        bgCard: 'bg-slate-900/70',
        borderCard: 'border-slate-800',
        textTitle: 'text-slate-300',
        badgeBg: 'bg-slate-800',
        badgeText: 'text-slate-300',
        ring: '',
      },
      7: {
        bgCard: 'bg-slate-900/60',
        borderCard: 'border-slate-800/80',
        textTitle: 'text-slate-400',
        badgeBg: 'bg-slate-850',
        badgeText: 'text-slate-400',
        ring: '',
      },
      6: {
        bgCard: 'bg-slate-900/50',
        borderCard: 'border-slate-800/60',
        textTitle: 'text-slate-500',
        badgeBg: 'bg-slate-900',
        badgeText: 'text-slate-500',
        ring: '',
      },
    };

    return PONTOS_TIERS.map((pontos) => {
      const matchingGames = validGames.filter((g) => g.hits === pontos);
      const count = matchingGames.length;
      const percentage = totalValid > 0 ? (count / totalValid) * 100 : 0;
      const isPremiado = pontos >= 11;

      let premioDesc = 'Sem premiação';
      let premioValorEstimado: number | undefined;

      if (pontos === 15) {
        premioDesc = 'Faixa Máxima (15 Pontos)';
        premioValorEstimado = targetDraw.premiacoes?.faixa15?.valor || 1750000;
      } else if (pontos === 14) {
        premioDesc = '14 Pontos Oficial';
        premioValorEstimado = targetDraw.premiacoes?.faixa14?.valor || 1400;
      } else if (pontos === 13) {
        premioDesc = '13 Pontos (R$ 35,00)';
        premioValorEstimado = targetDraw.premiacoes?.faixa13?.valor || 35.0;
      } else if (pontos === 12) {
        premioDesc = '12 Pontos (R$ 14,00)';
        premioValorEstimado = targetDraw.premiacoes?.faixa12?.valor || 14.0;
      } else if (pontos === 11) {
        premioDesc = '11 Pontos (R$ 7,00)';
        premioValorEstimado = targetDraw.premiacoes?.faixa11?.valor || 7.0;
      } else if (pontos === 10) {
        premioDesc = 'A 1 acerto do prêmio';
      } else if (pontos === 9) {
        premioDesc = 'A 2 acertos do prêmio';
      } else if (pontos === 8) {
        premioDesc = '8 acertos';
      } else if (pontos === 7) {
        premioDesc = '7 acertos';
      } else if (pontos === 6) {
        premioDesc = '6 acertos';
      }

      return {
        pontos,
        label: `${pontos} Pontos`,
        count,
        percentage,
        isPremiado,
        premioDesc,
        premioValorEstimado,
        colorTheme: themeMap[pontos] || themeMap[6],
      };
    });
  }, [conferenceSummary.gameResults, targetDraw]);

  // SISTEMA DE MONITORAMENTO ESTATÍSTICO: JOGOS DA CONFERÊNCIA
  const monitoringSummary = useMemo<MonitoringSummary>(() => {
    const validGames = conferenceSummary.gameResults
      .filter((g) => g.isValid)
      .map((g, idx) => ({ dezenas: g.dezenas, label: g.label, index: idx + 1 }));
    return analyzeGamesList(validGames);
  }, [conferenceSummary.gameResults]);

  // SISTEMA DE MONITORAMENTO ESTATÍSTICO: JOGOS SALVOS DO USUÁRIO (FECHAMENTO)
  const savedTicketsMonitoringSummary = useMemo<MonitoringSummary | undefined>(() => {
    if (!generatedTickets || generatedTickets.length === 0) return undefined;
    const tickets = generatedTickets.map((t) => ({
      dezenas: t.dezenas,
      label: `Bilhete #${t.index.toString().padStart(2, '0')}`,
      index: t.index,
    }));
    return analyzeGamesList(tickets);
  }, [generatedTickets]);

  // Map for fast lookup by game label
  const gamesMonitoringMap = useMemo(() => {
    const map = new Map<string, GameMonitoringResult>();
    monitoringSummary.allResults.forEach((r) => {
      map.set(r.gameId, r);
    });
    return map;
  }, [monitoringSummary.allResults]);

  // Filtered games list (combines exact points filter, prize tier filter, and monitoring filter)
  const filteredGames = useMemo(() => {
    let pool = conferenceSummary.gameResults;
    if (selectedPontosFilter !== 'all') {
      pool = pool.filter((g) => g.hits === selectedPontosFilter);
    }

    // Monitoring filter: improbable only or specific game
    if (monitoringFilter === 'improbable') {
      const improbableIds = new Set(
        monitoringSummary.gamesWithAnomalies.map((g) => g.gameId)
      );
      pool = pool.filter((g) => improbableIds.has(g.label));
    } else if (monitoringFilter !== 'all') {
      pool = pool.filter((g) => g.label === monitoringFilter);
    }

    return pool.filter((game) => {
      if (filterFaixa === 'all') return true;
      if (filterFaixa === 'premiados') return game.hits >= 11;
      if (filterFaixa === '15') return game.hits === 15;
      if (filterFaixa === '14') return game.hits === 14;
      if (filterFaixa === '13') return game.hits === 13;
      if (filterFaixa === '12') return game.hits === 12;
      if (filterFaixa === '11') return game.hits === 11;
      return true;
    });
  }, [
    conferenceSummary.gameResults,
    selectedPontosFilter,
    filterFaixa,
    monitoringFilter,
    monitoringSummary.gamesWithAnomalies,
  ]);

  // Games prepared for CSV export (all games or selected points filter)
  const gamesForCSV: CSVExportGame[] = useMemo(() => {
    let targetList = conferenceSummary.gameResults.filter((g) => g.isValid);
    if (selectedPontosFilter !== 'all') {
      targetList = targetList.filter((g) => g.hits === selectedPontosFilter);
    }

    return targetList.map((g, idx) => ({
      index: idx + 1,
      label: g.label,
      dezenas: g.dezenas,
      hits: g.hits,
      premioNome: g.premioNome,
      premioValor: g.premioValor,
    }));
  }, [conferenceSummary.gameResults, selectedPontosFilter]);

  // Action handlers
  const handleLoadSample24 = () => {
    setInputText(SAMPLE_24_GAMES_TEXT);
  };

  const handleClear = () => {
    setInputText('');
  };

  const handleCopyInput = () => {
    navigator.clipboard.writeText(inputText);
    setCopiedNotification(true);
    setTimeout(() => setCopiedNotification(false), 2000);
  };

  const handleImportFromFechamento = () => {
    if (!generatedTickets || generatedTickets.length === 0) return;
    const formatted = generatedTickets
      .map(
        (t) =>
          `Jogo ${t.index.toString().padStart(2, '0')}: ${t.dezenas
            .map((n) => n.toString().padStart(2, '0'))
            .join(' - ')}`
      )
      .join('\n');
    setInputText(formatted);
  };

  const handleResetToPriorityDraw = () => {
    setSelectedConcursoId(latestDraw.concurso);
  };

  return (
    <div className="bg-slate-900/95 rounded-2xl border border-slate-800 p-6 shadow-2xl space-y-6">
      {/* Header of Conference Module */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-5 border-b border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-500/15 rounded-xl border border-emerald-500/30 text-emerald-400">
              <ClipboardCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2.5">
                <span>Módulo de Conferência Oficial de Jogos</span>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  LotoSniper
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Entrada direta no formato <code className="text-emerald-400 font-mono">Jogo XX: 01 - 02 - ...</code> e conferência instantânea com prioridade no último sorteio.
              </p>
            </div>
          </div>
        </div>

        {/* PRIORITY CONTEST SELECTOR */}
        <div className="bg-slate-950/80 rounded-xl border border-slate-800 p-3 flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="flex items-center gap-2">
            <Star className={`w-4 h-4 ${isCurrentPriority ? 'text-amber-400 fill-amber-400' : 'text-slate-500'}`} />
            <span className="text-xs font-bold text-slate-300">Concurso Alvo:</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={selectedConcursoId}
              onChange={(e) => setSelectedConcursoId(Number(e.target.value))}
              className="bg-slate-900 text-slate-200 text-xs font-semibold rounded-lg px-3 py-2 border border-slate-700 hover:border-emerald-500 focus:outline-none focus:border-emerald-500 transition cursor-pointer"
            >
              {allDraws.map((d, index) => {
                const isLatest = d.concurso === latestDraw.concurso;
                return (
                  <option key={d.concurso} value={d.concurso}>
                    {isLatest ? `★ [PRIORIDADE] Concurso #${d.concurso} (${d.data}) - Último Oficial` : `Concurso #${d.concurso} (${d.data})`}
                  </option>
                );
              })}
            </select>

            {!isCurrentPriority && (
              <button
                onClick={handleResetToPriorityDraw}
                title="Restaurar prioridade para o último concurso oficial"
                className="px-2.5 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-bold flex items-center gap-1 transition cursor-pointer whitespace-nowrap"
              >
                <Star className="w-3.5 h-3.5 fill-amber-300" />
                <span>Voltar ao Último (#{latestDraw.concurso})</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Alerta de Fechamento Salvo Carregado na Entrada de Jogos para Conferência */}
      {loadedFechamentoNotice && (
        <div className="bg-sky-500/15 border-2 border-sky-400/60 rounded-xl p-3.5 flex items-center justify-between gap-3 text-xs text-sky-200 animate-fadeIn shadow-lg shadow-sky-500/10">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-sky-400 shrink-0" />
            <span className="font-bold">{loadedFechamentoNotice}</span>
          </div>
          <button
            onClick={() => setLoadedFechamentoNotice(null)}
            className="text-slate-400 hover:text-white px-2 py-0.5 rounded bg-slate-800 text-[11px]"
          >
            Dispensar
          </button>
        </div>
      )}

      {/* INPUT AREA (TEXTAREA FOR GAMES IN REQUESTED FORMAT) */}
      <div id="entrada-jogos-conferencia" className="bg-slate-950/90 rounded-xl border border-slate-800 overflow-hidden scroll-mt-24">
        <div className="p-3 bg-slate-900/80 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold text-slate-200">
              Entrada de Jogos para Conferência ({parsedGames.length} {parsedGames.length === 1 ? 'jogo identificado' : 'jogos identificados'})
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <button
              onClick={handleClear}
              disabled={!inputText.trim()}
              className="px-2.5 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 disabled:opacity-40 disabled:cursor-not-allowed text-rose-300 border border-rose-500/30 text-[11px] font-bold transition cursor-pointer flex items-center gap-1.5"
              title="Limpar todos os jogos inseridos na conferência"
            >
              <Trash2 className="w-3 h-3 text-rose-400" />
              <span>Limpar jogos conferidos</span>
            </button>

            {inspectedVolanteNumbers && inspectedVolanteNumbers.length === 15 && (
              <button
                onClick={() => {
                  const sorted = [...inspectedVolanteNumbers].sort((a, b) => a - b);
                  const nextGameNum = parsedGames.length + 1;
                  const newLine = `Jogo ${nextGameNum.toString().padStart(2, '0')}: ${sorted
                    .map((n) => n.toString().padStart(2, '0'))
                    .join(' - ')}`;
                  setInputText((prev) => (prev.trim() ? `${prev.trim()}\n${newLine}` : newLine));
                  if (onAddVolanteToConference) {
                    onAddVolanteToConference(sorted);
                  }
                }}
                className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-[11px] font-bold transition cursor-pointer flex items-center gap-1.5"
                title="Inserir as 15 dezenas selecionadas no Volante Oficial Interativo 5x5 acima para conferir"
              >
                <Sparkles className="w-3 h-3 text-emerald-400" />
                <span>+ Adicionar Dezenas do Volante 5×5</span>
              </button>
            )}

            {generatedTickets.length > 0 && (
              <button
                onClick={handleImportFromFechamento}
                className="px-2.5 py-1 rounded-lg bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 border border-indigo-500/30 text-[11px] font-bold transition cursor-pointer flex items-center gap-1.5"
              >
                <Layers className="w-3 h-3 text-indigo-400" />
                <span>Importar {generatedTickets.length} Jogos do Fechamento</span>
              </button>
            )}

            <button
              onClick={() => {
                setCsvModalSubset(null);
                setIsCSVModalOpen(true);
              }}
              className="px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold transition cursor-pointer flex items-center gap-1.5"
              title="Exportar jogos em formato CSV pronto para impressão de volantes ou Excel"
            >
              <FileSpreadsheet className="w-3 h-3 text-emerald-400" />
              <span>Exportar CSV (Volantes)</span>
            </button>

            <button
              onClick={handleCopyInput}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[11px] font-semibold transition cursor-pointer flex items-center gap-1"
            >
              {copiedNotification ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copiedNotification ? 'Copiado!' : 'Copiar'}</span>
            </button>

            <button
              onClick={handleClear}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 border border-slate-700 hover:border-rose-500/30 text-[11px] font-semibold transition cursor-pointer flex items-center gap-1"
            >
              <Trash2 className="w-3 h-3" />
              <span>Limpar</span>
            </button>

            <button
              onClick={() => setIsEditorExpanded(!isEditorExpanded)}
              className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700 transition cursor-pointer"
              title={isEditorExpanded ? 'Recolher editor' : 'Expandir editor'}
            >
              {isEditorExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {isEditorExpanded && (
          <div className="p-3">
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              rows={8}
              placeholder={`Jogo 01: 01 - 02 - 03 - 04 - 05 - 06 - 10 - 11 - 12 - 13 - 20 - 22 - 23 - 24 - 25\nJogo 02: 01 - 02 - 03 - 04 - 05 - 06 - 10 - 11 - 13 - 14 - 15 - 20 - 21 - 22 - 23\n...`}
              className="w-full bg-slate-900 text-emerald-300 font-mono text-xs rounded-xl p-3 border border-slate-800 focus:outline-none focus:border-emerald-500/60 leading-relaxed resize-y"
            />
            <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
              <span>Formato aceito: <code className="text-slate-400 font-mono">Jogo 01: 01 - 02 - 03 ...</code> (hífens, espaços ou vírgulas são aceitos).</span>
              <span>{parsedGames.filter((g) => g.isValid).length} de {parsedGames.length} válidos (15 dezenas)</span>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* CONTADOR OFICIAL DE ACERTOS: 6 A 15 PONTOS (CORES DIFERENCIADAS)        */}
      {/* ========================================================================= */}
      <div className="bg-slate-950/95 rounded-2xl border border-slate-800 p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                <Target className="w-4 h-4" />
              </div>
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <span>Contador de Acertos da Conferência (6 a 15 Pontos)</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  {conferenceSummary.totalJogos} {conferenceSummary.totalJogos === 1 ? 'Jogo' : 'Jogos'} Analisados
                </span>
              </h3>
            </div>
            <p className="text-xs text-slate-400">
              Distribuição exata de quantos jogos conferidos acertaram <strong>6, 7, 8, 9, 10, 11, 12, 13, 14 ou 15 dezenas</strong> no Concurso #{targetDraw.concurso}. Clique para filtrar.
            </p>
          </div>

          {selectedPontosFilter !== 'all' && (
            <button
              onClick={() => setSelectedPontosFilter('all')}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer self-start sm:self-auto"
            >
              <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
              <span>Restaurar Todos ({conferenceSummary.totalJogos})</span>
            </button>
          )}
        </div>

        {/* Active Filter Banner */}
        {selectedPontosFilter !== 'all' && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-emerald-300">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                Filtro ativo: Exibindo apenas os jogos com <strong>{selectedPontosFilter} pontos</strong> ({filteredGames.length} {filteredGames.length === 1 ? 'jogo encontrado' : 'jogos encontrados'}).
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsCSVModalOpen(true)}
                className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 border border-emerald-500/40 text-xs font-bold transition cursor-pointer flex items-center gap-1"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Exportar estes {filteredGames.length} em CSV</span>
              </button>
              <button
                onClick={() => setSelectedPontosFilter('all')}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition cursor-pointer"
              >
                Ver Todos os Jogos
              </button>
            </div>
          </div>
        )}

        {/* 1. FAIXAS PREMIADAS (11 A 15 PONTOS) - CORES VIBRANTES E DESTACADAS */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5" />
              <span>Faixas Premiadas Oficiais (11 a 15 Dezenas Sorteadas)</span>
            </span>
            <span className="text-[11px] text-slate-400 font-mono">
              Total Premiados: <strong className="text-emerald-300">{conferenceSummary.totalPremiados}</strong> de {conferenceSummary.totalJogos} ({conferenceSummary.taxaAcerto.toFixed(1)}%)
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
            {pontosCountSummary
              .filter((tier) => tier.isPremiado)
              .map((tier) => {
                const isSelected = selectedPontosFilter === tier.pontos;
                const hasHits = tier.count > 0;

                return (
                  <button
                    key={tier.pontos}
                    type="button"
                    onClick={() => setSelectedPontosFilter(isSelected ? 'all' : tier.pontos)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between ${
                      isSelected
                        ? `${tier.colorTheme.bgCard} ${tier.colorTheme.borderCard} ${tier.colorTheme.ring}`
                        : hasHits
                        ? `${tier.colorTheme.bgCard} ${tier.colorTheme.borderCard} hover:scale-[1.02]`
                        : 'bg-slate-900/50 border-slate-800/80 opacity-60 hover:opacity-90'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className={`text-xs font-black font-mono ${tier.colorTheme.textTitle}`}>
                          {tier.label}
                        </span>
                        <span className={`text-[9px] font-black font-mono px-1.5 py-0.2 rounded ${tier.colorTheme.badgeBg} ${tier.colorTheme.badgeText}`}>
                          {tier.pontos === 15 ? '★ PRÊMIO MÁXIMO' : '★ PREMIADO'}
                        </span>
                      </div>

                      {/* Number of Games Counter */}
                      <div className="mt-1 flex items-baseline gap-1.5">
                        <span className="text-2xl font-black font-mono text-white">
                          {tier.count}
                        </span>
                        <span className="text-xs text-slate-400 font-semibold">
                          {tier.count === 1 ? 'jogo' : 'jogos'}
                        </span>
                      </div>

                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                        {tier.percentage.toFixed(1)}% do total
                      </div>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px]">
                      <span className="text-slate-400 truncate">{tier.premioDesc}</span>
                      {isSelected && (
                        <span className="font-bold text-emerald-400 font-mono">ATIVO</span>
                      )}
                    </div>
                  </button>
                );
              })}
          </div>
        </div>

        {/* 2. FAIXAS NÃO PREMIADAS (6 A 10 PONTOS) - TONS DISCRETOS */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-slate-500" />
              <span>Faixas Não Premiadas (6 a 10 Dezenas Sorteadas)</span>
            </span>
            <span className="text-[11px] text-slate-500 font-mono">
              {conferenceSummary.totalNaoPremiados} jogos abaixo de 11 pontos
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
            {pontosCountSummary
              .filter((tier) => !tier.isPremiado)
              .map((tier) => {
                const isSelected = selectedPontosFilter === tier.pontos;
                const hasHits = tier.count > 0;

                return (
                  <button
                    key={tier.pontos}
                    type="button"
                    onClick={() => setSelectedPontosFilter(isSelected ? 'all' : tier.pontos)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between ${
                      isSelected
                        ? `${tier.colorTheme.bgCard} border-emerald-500 ring-2 ring-emerald-400/50`
                        : hasHits
                        ? `${tier.colorTheme.bgCard} ${tier.colorTheme.borderCard} hover:border-slate-700`
                        : 'bg-slate-950/40 border-slate-850 opacity-40 hover:opacity-70'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className={`text-xs font-bold font-mono ${tier.colorTheme.textTitle}`}>
                          {tier.label}
                        </span>
                        {tier.pontos === 10 ? (
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-indigo-950 text-indigo-300 border border-indigo-800/50">
                            QUASE LÁ
                          </span>
                        ) : null}
                      </div>

                      {/* Number of Games Counter */}
                      <div className="mt-1 flex items-baseline gap-1.5">
                        <span className="text-xl font-bold font-mono text-slate-200">
                          {tier.count}
                        </span>
                        <span className="text-xs text-slate-400 font-medium">
                          {tier.count === 1 ? 'jogo' : 'jogos'}
                        </span>
                      </div>

                      <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                        {tier.percentage.toFixed(1)}% do total
                      </div>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[10px]">
                      <span className="text-slate-500 truncate">{tier.premioDesc}</span>
                      {isSelected && (
                        <span className="font-bold text-emerald-400 font-mono">ATIVO</span>
                      )}
                    </div>
                  </button>
                );
              })}
          </div>
        </div>
      </div>

      {/* FINANCIAL & PERFORMANCE TOTALIZER */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        {/* Total Games */}
        <div className="bg-slate-950/80 rounded-xl border border-slate-800 p-3.5">
          <div className="text-[11px] font-semibold text-slate-400">Total de Jogos</div>
          <div className="text-xl font-black font-mono text-white mt-1">
            {conferenceSummary.totalJogos}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            {conferenceSummary.totalJogos === 24 ? 'Matriz Completa (24)' : 'Apostas conferidas'}
          </div>
        </div>

        {/* Cost of Bets */}
        <div className="bg-slate-950/80 rounded-xl border border-slate-800 p-3.5">
          <div className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
            <DollarSign className="w-3 h-3 text-amber-400" />
            <span>Investimento Total</span>
          </div>
          <div className="text-xl font-black font-mono text-amber-400 mt-1">
            R$ {conferenceSummary.custoApostas.toFixed(2).replace('.', ',')}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            {conferenceSummary.totalJogos} × R$ 3,50
          </div>
        </div>

        {/* Total Won */}
        <div className="bg-slate-950/80 rounded-xl border border-slate-800 p-3.5">
          <div className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
            <Award className="w-3 h-3 text-emerald-400" />
            <span>Total em Prêmios</span>
          </div>
          <div className="text-xl font-black font-mono text-emerald-400 mt-1">
            R$ {conferenceSummary.premiosValorTotal.toFixed(2).replace('.', ',')}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            {conferenceSummary.totalPremiados} jogos premiados
          </div>
        </div>

        {/* Net Balance */}
        <div className="bg-slate-950/80 rounded-xl border border-slate-800 p-3.5">
          <div className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-cyan-400" />
            <span>Saldo Líquido</span>
          </div>
          <div
            className={`text-xl font-black font-mono mt-1 ${
              conferenceSummary.saldoLiquido >= 0 ? 'text-emerald-400' : 'text-slate-400'
            }`}
          >
            {conferenceSummary.saldoLiquido >= 0 ? '+' : ''}
            R$ {conferenceSummary.saldoLiquido.toFixed(2).replace('.', ',')}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            {conferenceSummary.saldoLiquido >= 0 ? 'Lucro das apostas' : 'Balanço financeiro'}
          </div>
        </div>

        {/* Success Rate */}
        <div className="bg-slate-950/80 rounded-xl border border-slate-800 p-3.5">
          <div className="text-[11px] font-semibold text-slate-400">Taxa de Premiação</div>
          <div className="text-xl font-black font-mono text-cyan-300 mt-1">
            {conferenceSummary.taxaAcerto.toFixed(1)}%
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            Acertos ≥ 11 pontos
          </div>
        </div>

        {/* Top Hits Badge */}
        <div className="bg-slate-950/80 rounded-xl border border-slate-800 p-3.5">
          <div className="text-[11px] font-semibold text-slate-400">Melhor Desempenho</div>
          <div className="text-xl font-black font-mono text-amber-300 mt-1">
            {conferenceSummary.total15 > 0
              ? '15 Pontos'
              : conferenceSummary.total14 > 0
              ? '14 Pontos'
              : conferenceSummary.total13 > 0
              ? '13 Pontos'
              : conferenceSummary.total12 > 0
              ? '12 Pontos'
              : conferenceSummary.total11 > 0
              ? '11 Pontos'
              : 'Sem prêmio'}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            No concurso #{targetDraw.concurso}
          </div>
        </div>
      </div>

      {/* PRIZE TIER PILLS & FILTER BAR */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-950/70 rounded-xl border border-slate-800">
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-slate-400 font-semibold mr-1 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" />
            <span>Filtrar Faixas:</span>
          </span>

          <button
            onClick={() => setFilterFaixa('all')}
            className={`px-3 py-1 rounded-lg font-bold text-xs transition cursor-pointer ${
              filterFaixa === 'all'
                ? 'bg-slate-700 text-white shadow-sm'
                : 'bg-slate-900 text-slate-400 hover:text-white'
            }`}
          >
            Todos ({conferenceSummary.totalJogos})
          </button>

          <button
            onClick={() => setFilterFaixa('premiados')}
            className={`px-3 py-1 rounded-lg font-bold text-xs transition cursor-pointer ${
              filterFaixa === 'premiados'
                ? 'bg-emerald-500 text-slate-950 shadow-sm'
                : 'bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25'
            }`}
          >
            Premiados 11+ ({conferenceSummary.totalPremiados})
          </button>

          {conferenceSummary.total15 > 0 && (
            <button
              onClick={() => setFilterFaixa('15')}
              className={`px-3 py-1 rounded-lg font-bold text-xs transition cursor-pointer ${
                filterFaixa === '15'
                  ? 'bg-amber-400 text-slate-950 shadow-sm'
                  : 'bg-amber-500/15 text-amber-300'
              }`}
            >
              15 pts ({conferenceSummary.total15})
            </button>
          )}

          {conferenceSummary.total14 > 0 && (
            <button
              onClick={() => setFilterFaixa('14')}
              className={`px-3 py-1 rounded-lg font-bold text-xs transition cursor-pointer ${
                filterFaixa === '14'
                  ? 'bg-indigo-400 text-slate-950 shadow-sm'
                  : 'bg-indigo-500/15 text-indigo-300'
              }`}
            >
              14 pts ({conferenceSummary.total14})
            </button>
          )}

          {conferenceSummary.total13 > 0 && (
            <button
              onClick={() => setFilterFaixa('13')}
              className={`px-3 py-1 rounded-lg font-bold text-xs transition cursor-pointer ${
                filterFaixa === '13'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-emerald-600/20 text-emerald-400'
              }`}
            >
              13 pts ({conferenceSummary.total13})
            </button>
          )}

          {conferenceSummary.total12 > 0 && (
            <button
              onClick={() => setFilterFaixa('12')}
              className={`px-3 py-1 rounded-lg font-bold text-xs transition cursor-pointer ${
                filterFaixa === '12'
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'bg-teal-600/20 text-teal-400'
              }`}
            >
              12 pts ({conferenceSummary.total12})
            </button>
          )}

          {conferenceSummary.total11 > 0 && (
            <button
              onClick={() => setFilterFaixa('11')}
              className={`px-3 py-1 rounded-lg font-bold text-xs transition cursor-pointer ${
                filterFaixa === '11'
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'bg-cyan-600/20 text-cyan-400'
              }`}
            >
              11 pts ({conferenceSummary.total11})
            </button>
          )}

          {/* Improbable Games Filter Button */}
          {monitoringSummary.improbableCount > 0 && (
            <button
              onClick={() => setMonitoringFilter(monitoringFilter === 'improbable' ? 'all' : 'improbable')}
              className={`px-3 py-1 rounded-lg font-bold text-xs transition cursor-pointer flex items-center gap-1.5 ${
                monitoringFilter === 'improbable'
                  ? 'bg-amber-400 text-slate-950 shadow-sm'
                  : 'bg-amber-500/15 text-amber-300 hover:bg-amber-500/25 border border-amber-500/30'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
              <span>Improváveis ({monitoringSummary.improbableCount})</span>
            </button>
          )}

          {monitoringFilter !== 'all' && monitoringFilter !== 'improbable' && (
            <button
              onClick={() => {
                setMonitoringFilter('all');
                setHighlightedGameId(null);
              }}
              className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-200 border border-amber-500/40 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
            >
              <span>Filtro: {monitoringFilter}</span>
              <span className="text-amber-400 text-[10px] font-bold">✕</span>
            </button>
          )}
        </div>

        <div className="text-xs text-slate-400 font-mono">
          Mostrando <strong className="text-emerald-400">{filteredGames.length}</strong> bilhete(s)
        </div>
      </div>

      {/* GAMES CARDS LIST */}
      <div className="space-y-2.5">
        {filteredGames.length === 0 ? (
          <div className="bg-slate-950/60 rounded-xl border border-slate-800 p-8 text-center text-slate-400 text-xs space-y-2">
            <div>
              Nenhum jogo atende ao filtro selecionado ({monitoringFilter === 'improbable' ? 'Apenas Improváveis' : filterFaixa}).
            </div>
            <button
              onClick={() => {
                setFilterFaixa('all');
                setMonitoringFilter('all');
                setSelectedPontosFilter('all');
              }}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition cursor-pointer"
            >
              Restaurar Todos os Jogos
            </button>
          </div>
        ) : (
          filteredGames.map((game) => {
            const isWinner = game.hits >= 11;
            const gameMonitoring = gamesMonitoringMap.get(game.label);
            const isHighlighted = highlightedGameId === game.label;

            return (
              <div
                key={game.id}
                className={`p-3.5 rounded-xl border transition-all ${
                  isHighlighted
                    ? 'ring-2 ring-amber-400 shadow-xl shadow-amber-500/20 bg-slate-900 border-amber-400'
                    : game.hits === 15
                    ? 'bg-amber-950/30 border-amber-500/60 shadow-lg shadow-amber-500/10'
                    : game.hits === 14
                    ? 'bg-indigo-950/30 border-indigo-500/50 shadow-md'
                    : game.hits === 13
                    ? 'bg-emerald-950/25 border-emerald-500/40'
                    : game.hits >= 11
                    ? 'bg-slate-950/80 border-emerald-500/25'
                    : 'bg-slate-950/50 border-slate-800/80'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  {/* Game Label & Hits Badge */}
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="font-mono font-bold text-xs text-slate-300 px-2 py-0.5 rounded bg-slate-900 border border-slate-800">
                      {game.label}
                    </span>

                    {/* Hits Badge */}
                    <div
                      className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-black font-mono ${
                        game.hits === 15
                          ? 'bg-amber-400 text-slate-950'
                          : game.hits === 14
                          ? 'bg-indigo-400 text-slate-950'
                          : game.hits === 13
                          ? 'bg-emerald-400 text-slate-950'
                          : game.hits === 12
                          ? 'bg-teal-400 text-slate-950'
                          : game.hits === 11
                          ? 'bg-cyan-400 text-slate-950'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {game.hits >= 11 ? <CheckCircle2 className="w-3.5 h-3.5" /> : null}
                      <span>{game.hits} Acertos</span>
                    </div>

                    {/* Statistical Improbability Alert Pill */}
                    {gameMonitoring && gameMonitoring.isImprobable ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/35 text-[10px] font-bold font-mono">
                        <ShieldAlert className="w-3 h-3 text-amber-400" />
                        <span>Padrão Improvável</span>
                      </span>
                    ) : gameMonitoring ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-medium font-mono">
                        <span>✓ Equilibrado</span>
                      </span>
                    ) : null}

                    {/* Prize description */}
                    {isWinner && (
                      <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                        <Award className="w-3 h-3" />
                        <span>{game.premioNome}</span>
                        {game.premioValor > 0 && (
                          <span className="font-mono text-emerald-300">
                            (+R$ {game.premioValor.toFixed(2).replace('.', ',')})
                          </span>
                        )}
                      </span>
                    )}

                    {!game.isValid && (
                      <span className="text-xs font-semibold text-rose-400 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>{game.error}</span>
                      </span>
                    )}
                  </div>

                  {/* Quick copy of this line */}
                  <button
                    onClick={() => navigator.clipboard.writeText(game.rawLine)}
                    title="Copiar linha deste jogo"
                    className="text-[11px] text-slate-500 hover:text-slate-300 flex items-center gap-1 transition cursor-pointer self-start sm:self-auto"
                  >
                    <Copy className="w-3 h-3" />
                    <span>Copiar</span>
                  </button>
                </div>

                {/* 15 Numbers Balls */}
                <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                  {game.dezenas.map((num) => {
                    const isHit = targetDraw.dezenas.includes(num);

                    return (
                      <div
                        key={num}
                        className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg font-mono text-xs font-bold flex items-center justify-center transition-all select-none ${
                          isHit
                            ? 'bg-gradient-to-b from-emerald-400 to-emerald-600 text-slate-950 font-black shadow-md shadow-emerald-500/20 border border-emerald-300/40 ring-1 ring-emerald-400/50 scale-105'
                            : 'bg-slate-900 text-slate-500 border border-slate-800'
                        }`}
                        title={isHit ? `Dezena ${num} SORTEADA no Concurso #${targetDraw.concurso}` : `Dezena ${num} não sorteada`}
                      >
                        {num.toString().padStart(2, '0')}
                      </div>
                    );
                  })}
                </div>

                {/* Statistical Diagnosis Footer on Card */}
                {gameMonitoring && (
                  <div className="mt-2.5 pt-2 border-t border-slate-850 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-[10px]">
                    <div className="flex flex-wrap items-center gap-1.5 font-mono">
                      <span
                        className={`px-1.5 py-0.5 rounded ${
                          gameMonitoring.soma < 175 || gameMonitoring.soma > 220
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/35 font-bold'
                            : 'bg-slate-900 text-slate-300'
                        }`}
                      >
                        Soma: {gameMonitoring.soma}
                      </span>

                      <span
                        className={`px-1.5 py-0.5 rounded ${
                          gameMonitoring.pares >= 10 || gameMonitoring.impares >= 10
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/35 font-bold'
                            : 'bg-slate-900 text-slate-300'
                        }`}
                      >
                        {gameMonitoring.pares}P / {gameMonitoring.impares}I
                      </span>

                      <span
                        className={`px-1.5 py-0.5 rounded ${
                          gameMonitoring.primos <= 2 || gameMonitoring.primos >= 9
                            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/35 font-bold'
                            : 'bg-slate-900 text-slate-400'
                        }`}
                      >
                        {gameMonitoring.primos} Primos
                      </span>

                      <span
                        className={`px-1.5 py-0.5 rounded ${
                          gameMonitoring.moldura <= 6 || gameMonitoring.moldura >= 13
                            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/35 font-bold'
                            : 'bg-slate-900 text-slate-400'
                        }`}
                      >
                        {gameMonitoring.moldura} Moldura
                      </span>

                      <span className="px-1.5 py-0.5 rounded bg-slate-900 text-slate-400">
                        {gameMonitoring.miolo} Miolo
                      </span>
                    </div>

                    {gameMonitoring.isImprobable ? (
                      <span className="text-amber-300 font-sans font-medium flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-amber-400" />
                        <span>{gameMonitoring.anomalies.map((a) => a.title).join(' • ')}</span>
                      </span>
                    ) : (
                      <span className="text-slate-500 font-sans">
                        ✓ Calibração estatística recomendada
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
      {/* Modal de Exportação CSV para Volantes e Excel */}
      <ExportCSVModal
        isOpen={isCSVModalOpen}
        onClose={() => {
          setIsCSVModalOpen(false);
          setCsvModalSubset(null);
        }}
        games={gamesForCSV}
        concursoRef={targetDraw.concurso}
        title={
          selectedPontosFilter !== 'all'
            ? `Exportar Jogos com ${selectedPontosFilter} Pontos em CSV`
            : 'Exportar Jogos da Conferência em CSV'
        }
        defaultFilename={
          selectedPontosFilter !== 'all'
            ? `lotosniper_jogos_${selectedPontosFilter}_pontos.csv`
            : `lotosniper_conferencia_${gamesForCSV.length}_jogos.csv`
        }
      />
    </div>
  );
};
