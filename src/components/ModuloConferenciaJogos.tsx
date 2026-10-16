import React, { useState, useMemo } from 'react';
import { LotofacilDraw, GameTicket } from '../types/lotofacil';
import { CONCURSO_ATUAL, RECENT_DRAWS } from '../data/lotofacilData';
import { countMatches, VALOR_APOSTA_LOTOFACIL } from '../services/combinatorics';
import { ExportCSVModal, CSVExportGame } from './ExportCSVModal';
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
} from 'lucide-react';

export interface SubsetTierMetric {
  tier: number;
  label: string;
  custo: number;
  disponivel: boolean;
  totalJogosAvaliados: number;
  total15: number;
  total14: number;
  total13: number;
  total12: number;
  total11: number;
  totalPremiados: number;
  premiosValorTotal: number;
  saldoLiquido: number;
  roi: number;
  taxaAcerto: number;
  bestHit: number;
  isBestROI?: boolean;
  isBestProfit?: boolean;
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
}

export const ModuloConferenciaJogos: React.FC<ModuloConferenciaJogosProps> = ({
  latestDraw = CONCURSO_ATUAL,
  generatedTickets = [],
}) => {
  // Input raw text with 24 games as initial value
  const [inputText, setInputText] = useState<string>(SAMPLE_24_GAMES_TEXT);
  const [isEditorExpanded, setIsEditorExpanded] = useState<boolean>(true);
  const [filterFaixa, setFilterFaixa] = useState<'all' | 'premiados' | '15' | '14' | '13' | '12' | '11'>('all');
  const [copiedNotification, setCopiedNotification] = useState<boolean>(false);

  // TOTALIZER SUBSET STATE (6 a 15 jogos)
  const [selectedSubsetSize, setSelectedSubsetSize] = useState<number | 'all'>('all');
  const [totalizerViewMode, setTotalizerViewMode] = useState<'cards' | 'table'>('cards');

  // CSV EXPORT MODAL STATE
  const [isCSVModalOpen, setIsCSVModalOpen] = useState<boolean>(false);
  const [csvModalSubset, setCsvModalSubset] = useState<number | null>(null);

  // CONTEST SELECTOR: LATEST CONTEST IS ALWAYS THE DEFAULT & HIGHEST PRIORITY
  const [selectedConcursoId, setSelectedConcursoId] = useState<number>(latestDraw.concurso);

  // Sync priority when latestDraw updates
  React.useEffect(() => {
    setSelectedConcursoId(latestDraw.concurso);
  }, [latestDraw.concurso]);

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

  // TOTALIZER CALCULATION: 6 JOGOS, 7 JOGOS ATÉ 15 JOGOS
  const SUBSET_TIERS = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15];

  const subsetTiersSummary = useMemo<SubsetTierMetric[]>(() => {
    const validGameResults = conferenceSummary.gameResults.filter((g) => g.isValid);

    const metrics: SubsetTierMetric[] = SUBSET_TIERS.map((tier) => {
      const custo = tier * VALOR_APOSTA_LOTOFACIL;
      const slice = validGameResults.slice(0, tier);
      const disponivel = validGameResults.length >= tier;
      const totalJogosAvaliados = slice.length;

      let t15 = 0;
      let t14 = 0;
      let t13 = 0;
      let t12 = 0;
      let t11 = 0;
      let premiosValorTotal = 0;
      let bestHit = 0;

      slice.forEach((g) => {
        if (g.hits > bestHit) bestHit = g.hits;
        if (g.hits === 15) t15++;
        else if (g.hits === 14) t14++;
        else if (g.hits === 13) t13++;
        else if (g.hits === 12) t12++;
        else if (g.hits === 11) t11++;
        premiosValorTotal += g.premioValor;
      });

      const totalPremiados = t15 + t14 + t13 + t12 + t11;
      const saldoLiquido = premiosValorTotal - custo;
      const roi = custo > 0 ? ((premiosValorTotal - custo) / custo) * 100 : 0;
      const taxaAcerto = totalJogosAvaliados > 0 ? (totalPremiados / totalJogosAvaliados) * 100 : 0;

      return {
        tier,
        label: `${tier} Jogos`,
        custo,
        disponivel,
        totalJogosAvaliados,
        total15: t15,
        total14: t14,
        total13: t13,
        total12: t12,
        total11: t11,
        totalPremiados,
        premiosValorTotal,
        saldoLiquido,
        roi,
        taxaAcerto,
        bestHit,
      };
    });

    let maxRoi = -Infinity;
    let maxRoiIndex = -1;
    let maxProfit = -Infinity;
    let maxProfitIndex = -1;

    metrics.forEach((m, idx) => {
      if (m.saldoLiquido > maxProfit) {
        maxProfit = m.saldoLiquido;
        maxProfitIndex = idx;
      }
      if (m.roi > maxRoi) {
        maxRoi = m.roi;
        maxRoiIndex = idx;
      }
    });

    if (maxProfitIndex !== -1 && metrics[maxProfitIndex].premiosValorTotal > 0) {
      metrics[maxProfitIndex].isBestProfit = true;
    }
    if (maxRoiIndex !== -1 && metrics[maxRoiIndex].premiosValorTotal > 0) {
      metrics[maxRoiIndex].isBestROI = true;
    }

    return metrics;
  }, [conferenceSummary.gameResults]);

  // Filtered games list (combines subset slice and prize tier filter)
  const filteredGames = useMemo(() => {
    let pool = conferenceSummary.gameResults;
    if (selectedSubsetSize !== 'all') {
      const validPool = pool.filter((g) => g.isValid);
      const invalidPool = pool.filter((g) => !g.isValid);
      pool = [...validPool.slice(0, selectedSubsetSize), ...invalidPool];
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
  }, [conferenceSummary.gameResults, selectedSubsetSize, filterFaixa]);

  // Games prepared for CSV export (all games or selected subset)
  const gamesForCSV: CSVExportGame[] = useMemo(() => {
    let targetList = conferenceSummary.gameResults.filter((g) => g.isValid);
    if (csvModalSubset !== null) {
      targetList = targetList.slice(0, csvModalSubset);
    } else if (selectedSubsetSize !== 'all') {
      targetList = targetList.slice(0, selectedSubsetSize);
    }

    return targetList.map((g, idx) => ({
      index: idx + 1,
      label: g.label,
      dezenas: g.dezenas,
      hits: g.hits,
      premioNome: g.premioNome,
      premioValor: g.premioValor,
    }));
  }, [conferenceSummary.gameResults, csvModalSubset, selectedSubsetSize]);

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

      {/* TARGET CONTEST DRAWN NUMBERS BANNER */}
      <div className={`p-4 rounded-xl border transition-all ${
        isCurrentPriority
          ? 'bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 border-emerald-500/30'
          : 'bg-slate-950/60 border-slate-800'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-bold text-slate-300">
              Resultado Concurso <span className="font-mono text-emerald-400 font-extrabold text-sm">#{targetDraw.concurso}</span> ({targetDraw.data})
            </span>
            {isCurrentPriority && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono">
                ★ PRIORIDADE MÁXIMA
              </span>
            )}
          </div>

          <div className="text-xs text-slate-400 flex items-center gap-3">
            <span>Aposta Unitária: <strong className="text-slate-200">R$ {VALOR_APOSTA_LOTOFACIL.toFixed(2).replace('.', ',')}</strong></span>
            {targetDraw.premiacoes?.faixa15?.ganhadores !== undefined && (
              <span className="hidden sm:inline text-slate-500">• {targetDraw.premiacoes.faixa15.ganhadores} ganhador(es) de 15 pts</span>
            )}
          </div>
        </div>

        {/* Drawn balls display */}
        <div className="mt-3 flex flex-wrap items-center gap-1.5 sm:gap-2">
          {targetDraw.dezenas.map((num) => (
            <div
              key={num}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-b from-emerald-400 to-emerald-600 text-slate-950 font-black font-mono text-xs sm:text-sm flex items-center justify-center shadow-lg shadow-emerald-500/20 border border-emerald-300/40 select-none"
            >
              {num.toString().padStart(2, '0')}
            </div>
          ))}
        </div>
      </div>

      {/* INPUT AREA (TEXTAREA FOR GAMES IN REQUESTED FORMAT) */}
      <div className="bg-slate-950/90 rounded-xl border border-slate-800 overflow-hidden">
        <div className="p-3 bg-slate-900/80 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold text-slate-200">
              Entrada de Jogos para Conferência ({parsedGames.length} {parsedGames.length === 1 ? 'jogo identificado' : 'jogos identificados'})
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <button
              onClick={handleLoadSample24}
              className="px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold transition cursor-pointer flex items-center gap-1.5"
            >
              <RefreshCw className="w-3 h-3 text-emerald-400" />
              <span>Carregar os 24 Jogos de Exemplo</span>
            </button>

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
      {/* TOTALIZADOR OFICIAL DE JOGOS: CORTES DE 6 A 15 JOGOS (R$ 3,50 CADA)     */}
      {/* ========================================================================= */}
      <div className="bg-slate-950/95 rounded-2xl border border-emerald-500/30 p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                <Calculator className="w-4 h-4" />
              </div>
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <span>Totalizador de Investimento & Retorno (6 a 15 Jogos)</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  R$ {VALOR_APOSTA_LOTOFACIL.toFixed(2).replace('.', ',')} / aposta
                </span>
              </h3>
            </div>
            <p className="text-xs text-slate-400">
              Calcule quanto gastará e qual seria sua premiação líquida caso decida apostar de <strong>6 até 15 jogos</strong> desta matriz no Concurso #{targetDraw.concurso}.
            </p>
          </div>

          {/* View mode toggle & reset */}
          <div className="flex items-center gap-2">
            {selectedSubsetSize !== 'all' && (
              <button
                onClick={() => setSelectedSubsetSize('all')}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
              >
                <span>Mostrar Todos ({conferenceSummary.totalJogos})</span>
              </button>
            )}

            <div className="bg-slate-900 p-1 rounded-xl border border-slate-800 flex items-center gap-1 text-xs">
              <button
                onClick={() => setTotalizerViewMode('cards')}
                className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  totalizerViewMode === 'cards'
                    ? 'bg-emerald-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Cards</span>
              </button>
              <button
                onClick={() => setTotalizerViewMode('table')}
                className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  totalizerViewMode === 'table'
                    ? 'bg-emerald-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Table className="w-3.5 h-3.5" />
                <span>Tabela Comparativa</span>
              </button>
            </div>
          </div>
        </div>

        {/* Subset Active Notification Banner */}
        {selectedSubsetSize !== 'all' && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-emerald-300">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                Filtro ativo: <strong>Apenas os primeiros {selectedSubsetSize} jogos</strong> (Jogos 01 a {selectedSubsetSize.toString().padStart(2, '0')}).
                Investimento: <strong>R$ {(Number(selectedSubsetSize) * VALOR_APOSTA_LOTOFACIL).toFixed(2).replace('.', ',')}</strong>.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setCsvModalSubset(selectedSubsetSize as number);
                  setIsCSVModalOpen(true);
                }}
                className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 border border-emerald-500/40 text-xs font-bold transition cursor-pointer flex items-center gap-1"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Exportar estes {selectedSubsetSize} em CSV</span>
              </button>
              <button
                onClick={() => setSelectedSubsetSize('all')}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition cursor-pointer"
              >
                Restaurar Todos
              </button>
            </div>
          </div>
        )}

        {/* View Mode: CARDS (Grid of 6 to 15 games) */}
        {totalizerViewMode === 'cards' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {subsetTiersSummary.map((item) => {
              const isSelected = selectedSubsetSize === item.tier;
              const hasProfit = item.saldoLiquido > 0;
              const hasBreakEven = item.saldoLiquido === 0 && item.premiosValorTotal > 0;

              return (
                <div
                  key={item.tier}
                  className={`p-3.5 rounded-xl border flex flex-col justify-between transition-all ${
                    isSelected
                      ? 'bg-emerald-950/40 border-emerald-500 shadow-lg shadow-emerald-500/10 ring-2 ring-emerald-400/50'
                      : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div>
                    {/* Header with Title and badges */}
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-mono font-black text-sm text-white">
                        {item.tier} Jogos
                      </span>
                      {isSelected ? (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500 text-slate-950">
                          ATIVO
                        </span>
                      ) : item.isBestROI ? (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-400 text-slate-950">
                          ★ MELHOR ROI
                        </span>
                      ) : item.isBestProfit ? (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-cyan-400 text-slate-950">
                          ★ MAIS LUCRO
                        </span>
                      ) : null}
                    </div>

                    {/* Cost of betting this subset */}
                    <div className="mt-1.5 flex items-baseline justify-between">
                      <span className="text-[11px] text-slate-400">Investimento:</span>
                      <span className="font-mono font-bold text-amber-400 text-xs sm:text-sm">
                        R$ {item.custo.toFixed(2).replace('.', ',')}
                      </span>
                    </div>

                    {/* Total prizes won */}
                    <div className="mt-1 flex items-baseline justify-between">
                      <span className="text-[11px] text-slate-400">Prêmios:</span>
                      <span className="font-mono font-bold text-emerald-400 text-xs sm:text-sm">
                        R$ {item.premiosValorTotal.toFixed(2).replace('.', ',')}
                      </span>
                    </div>

                    {/* Net balance */}
                    <div className="mt-1 flex items-baseline justify-between">
                      <span className="text-[11px] text-slate-400">Saldo:</span>
                      <span
                        className={`font-mono font-black text-xs sm:text-sm ${
                          hasProfit
                            ? 'text-emerald-400'
                            : hasBreakEven
                            ? 'text-cyan-400'
                            : 'text-slate-400'
                        }`}
                      >
                        {item.saldoLiquido > 0 ? '+' : ''}
                        R$ {item.saldoLiquido.toFixed(2).replace('.', ',')}
                      </span>
                    </div>

                    {/* Badges of hits */}
                    <div className="mt-2.5 pt-2 border-t border-slate-800 text-[10px] space-y-1">
                      <div className="flex items-center justify-between text-slate-400">
                        <span>Premiados:</span>
                        <strong className="text-slate-200 font-mono">
                          {item.totalPremiados} de {item.totalJogosAvaliados} ({item.taxaAcerto.toFixed(0)}%)
                        </strong>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {item.total15 > 0 && (
                          <span className="px-1.5 py-0.2 rounded bg-amber-400 text-slate-950 font-bold font-mono">
                            {item.total15}x 15p
                          </span>
                        )}
                        {item.total14 > 0 && (
                          <span className="px-1.5 py-0.2 rounded bg-indigo-400 text-slate-950 font-bold font-mono">
                            {item.total14}x 14p
                          </span>
                        )}
                        {item.total13 > 0 && (
                          <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-bold font-mono">
                            {item.total13}x 13p
                          </span>
                        )}
                        {item.total12 > 0 && (
                          <span className="px-1.5 py-0.2 rounded bg-teal-500/20 text-teal-300 font-bold font-mono">
                            {item.total12}x 12p
                          </span>
                        )}
                        {item.total11 > 0 && (
                          <span className="px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 font-bold font-mono">
                            {item.total11}x 11p
                          </span>
                        )}
                        {item.totalPremiados === 0 && (
                          <span className="text-slate-500">Sem acerto 11+</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions for this tier */}
                  <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center gap-1.5">
                    <button
                      onClick={() => setSelectedSubsetSize(isSelected ? 'all' : item.tier)}
                      className={`flex-1 py-1 px-2 rounded-lg text-[11px] font-bold transition cursor-pointer text-center ${
                        isSelected
                          ? 'bg-slate-800 text-white hover:bg-slate-700'
                          : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30'
                      }`}
                    >
                      {isSelected ? 'Ver Todos' : `Conferir ${item.tier}`}
                    </button>
                    <button
                      onClick={() => {
                        setCsvModalSubset(item.tier);
                        setIsCSVModalOpen(true);
                      }}
                      title={`Exportar estes ${item.tier} jogos em CSV para volantes`}
                      className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-emerald-400 border border-slate-700 transition cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* View Mode: COMPARATIVE TABLE (6 to 15 games) */
          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900 text-slate-400 font-bold text-[11px] uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="p-3">Qtd Jogos</th>
                  <th className="p-3">Investimento</th>
                  <th className="p-3 text-center">15 pts</th>
                  <th className="p-3 text-center">14 pts</th>
                  <th className="p-3 text-center">13 pts</th>
                  <th className="p-3 text-center">12 pts</th>
                  <th className="p-3 text-center">11 pts</th>
                  <th className="p-3 text-center">Total Premiados</th>
                  <th className="p-3 text-right">Prêmios (R$)</th>
                  <th className="p-3 text-right">Saldo Líquido</th>
                  <th className="p-3 text-center">ROI</th>
                  <th className="p-3 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 font-mono">
                {subsetTiersSummary.map((item) => {
                  const isSelected = selectedSubsetSize === item.tier;
                  const hasProfit = item.saldoLiquido > 0;

                  return (
                    <tr
                      key={item.tier}
                      className={`hover:bg-slate-900/60 transition ${
                        isSelected ? 'bg-emerald-950/20 font-bold' : ''
                      }`}
                    >
                      <td className="p-3 text-white font-bold flex items-center gap-1.5">
                        <span>{item.tier} Jogos</span>
                        {item.isBestROI && (
                          <span className="text-[9px] font-sans px-1.5 py-0.2 rounded bg-amber-400 text-slate-950 font-bold">
                            MELHOR ROI
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-amber-400 font-semibold">
                        R$ {item.custo.toFixed(2).replace('.', ',')}
                      </td>
                      <td className="p-3 text-center text-amber-400 font-black">{item.total15}</td>
                      <td className="p-3 text-center text-indigo-400 font-black">{item.total14}</td>
                      <td className="p-3 text-center text-emerald-400">{item.total13}</td>
                      <td className="p-3 text-center text-teal-400">{item.total12}</td>
                      <td className="p-3 text-center text-cyan-400">{item.total11}</td>
                      <td className="p-3 text-center font-bold text-slate-200">
                        {item.totalPremiados} / {item.totalJogosAvaliados}
                      </td>
                      <td className="p-3 text-right text-emerald-400 font-bold">
                        R$ {item.premiosValorTotal.toFixed(2).replace('.', ',')}
                      </td>
                      <td
                        className={`p-3 text-right font-black ${
                          hasProfit ? 'text-emerald-400' : 'text-slate-400'
                        }`}
                      >
                        {item.saldoLiquido > 0 ? '+' : ''}
                        R$ {item.saldoLiquido.toFixed(2).replace('.', ',')}
                      </td>
                      <td
                        className={`p-3 text-center font-bold ${
                          item.roi > 0 ? 'text-emerald-400' : 'text-slate-400'
                        }`}
                      >
                        {item.roi > 0 ? '+' : ''}
                        {item.roi.toFixed(1)}%
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1.5 font-sans">
                          <button
                            onClick={() => setSelectedSubsetSize(isSelected ? 'all' : item.tier)}
                            className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer"
                          >
                            {isSelected ? 'Ver Todos' : 'Conferir'}
                          </button>
                          <button
                            onClick={() => {
                              setCsvModalSubset(item.tier);
                              setIsCSVModalOpen(true);
                            }}
                            title="Exportar CSV deste subconjunto"
                            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-emerald-400 cursor-pointer"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
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
        </div>

        <div className="text-xs text-slate-400 font-mono">
          Mostrando <strong className="text-emerald-400">{filteredGames.length}</strong> bilhete(s)
        </div>
      </div>

      {/* GAMES CARDS LIST */}
      <div className="space-y-2.5">
        {filteredGames.length === 0 ? (
          <div className="bg-slate-950/60 rounded-xl border border-slate-800 p-8 text-center text-slate-400 text-xs">
            Nenhum jogo atende ao filtro selecionado. Selecione <strong className="text-slate-200">"Todos"</strong> ou verifique o texto dos jogos acima.
          </div>
        ) : (
          filteredGames.map((game) => {
            const isWinner = game.hits >= 11;

            return (
              <div
                key={game.id}
                className={`p-3.5 rounded-xl border transition-all ${
                  game.hits === 15
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
                  <div className="flex items-center gap-3">
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
          csvModalSubset !== null
            ? `Exportar Subconjunto de ${csvModalSubset} Jogos em CSV`
            : selectedSubsetSize !== 'all'
            ? `Exportar Subconjunto de ${selectedSubsetSize} Jogos em CSV`
            : 'Exportar Jogos da Conferência em CSV'
        }
        defaultFilename={
          csvModalSubset !== null
            ? `lotosniper_volantes_${csvModalSubset}_jogos.csv`
            : selectedSubsetSize !== 'all'
            ? `lotosniper_volantes_${selectedSubsetSize}_jogos.csv`
            : `lotosniper_conferencia_${gamesForCSV.length}_jogos.csv`
        }
      />
    </div>
  );
};
