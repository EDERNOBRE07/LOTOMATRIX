import React, { useState, useMemo, useEffect } from 'react';
import {
  FechamentoMode,
  FilterCriteria,
  GameTicket,
  AIPredictionResponse,
  LotofacilDraw,
  DezenaStats,
  FechamentoExportMeta,
} from '../types/lotofacil';
import { CONCURSO_ATUAL, DEZENAS_STATS, PRIMOS, MOLDURA } from '../data/lotofacilData';
import { VolanteSelector } from './VolanteSelector';
import { FilterControls } from './FilterControls';
import {
  FECHAMENTO_PRESETS,
  generateFechamentoCovering,
  generateFibonacciOptimizedGames,
  DEFAULT_FILTERS,
  buildOptimalPool,
  buildOptimal18Pool,
  VALOR_APOSTA_LOTOFACIL,
} from '../services/combinatorics';
import { generateFechamentoTxtContent } from '../services/txtExportFormatter';
import { TotalizadorDeCustos } from './TotalizadorDeCustos';
import { StatisticalMonitoringAlert } from './StatisticalMonitoringAlert';
import { SomaScatterPlot } from './SomaScatterPlot';
import { EquilibrioEstruturalSelector } from './EquilibrioEstruturalSelector';
import { RealTimeFilterSimulation } from './RealTimeFilterSimulation';
import { ClosingIntegrityValidator } from './ClosingIntegrityValidator';
import { D3CoverageHeatmap } from './D3CoverageHeatmap';
import { TurboGeneratorModal } from './TurboGeneratorModal';
import { TurboResult } from '../services/turboBruteForce';
import { soundService } from '../services/soundAlert';
import { analyzeGamesList, MonitoringSummary } from '../services/statisticalMonitor';
import {
  Sparkles,
  Zap,
  Copy,
  Check,
  TrendingDown,
  DollarSign,
  ShieldCheck,
  Download,
  Play,
  Layers,
  ChevronDown,
  Filter,
  History,
  RotateCcw,
  RefreshCw,
  Volume2,
  VolumeX,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  X,
} from 'lucide-react';

interface FechamentoTabProps {
  latestDraw: LotofacilDraw;
  dynamicStats?: DezenaStats[];
  cyclePendingNumbers?: number[];
  aiPrediction: AIPredictionResponse | null;
  initialFixedNumbers?: number[];
  onSaveTickets: (tickets: GameTicket[], meta?: FechamentoExportMeta) => void;
  onGoToSimulator: (tickets: GameTicket[]) => void;
  onGoToGamesManager?: (tickets?: GameTicket[], meta?: FechamentoExportMeta) => void;
  isAILoading: boolean;
}

export const FechamentoTab: React.FC<FechamentoTabProps> = ({
  latestDraw = CONCURSO_ATUAL,
  dynamicStats = DEZENAS_STATS,
  cyclePendingNumbers = [17, 22],
  aiPrediction,
  initialFixedNumbers,
  onSaveTickets,
  onGoToSimulator,
  onGoToGamesManager,
  isAILoading,
}) => {
  const [mode, setMode] = useState<FechamentoMode>('18_14_15');
  const preset = FECHAMENTO_PRESETS[mode];
  const targetCount = preset.dezenasNecessarias;

  const [strategyName, setStrategyName] = useState<string>(
    '⚡ Estratégia Documento (9 Repetidas + 9 Ausentes)'
  );

  const [selectedNumbers, setSelectedNumbers] = useState<number[]>(() => {
    try {
      const optimal = buildOptimal18Pool(latestDraw, dynamicStats, cyclePendingNumbers, 9, 9);
      return optimal.dezenas18.slice(0, 18);
    } catch {
      return [1, 2, 3, 4, 5, 7, 8, 9, 10, 11, 12, 13, 14, 15, 19, 20, 21, 22];
    }
  });

  const [fixedNumbers, setFixedNumbers] = useState<number[]>(cyclePendingNumbers.slice(0, 2));
  const [excludedNumbers, setExcludedNumbers] = useState<number[]>([]);
  const [filters, setFilters] = useState<FilterCriteria>(DEFAULT_FILTERS);
  const [generatedTickets, setGeneratedTickets] = useState<GameTicket[]>([]);
  const [fechamentoFilter, setFechamentoFilter] = useState<'all' | 'improbable' | string>('all');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationTimeMs, setGenerationTimeMs] = useState<number | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedTicketId, setCopiedTicketId] = useState<string | null>(null);
  const [documentMessage, setDocumentMessage] = useState<string | null>(null);
  const [generationType, setGenerationType] = useState<'matriz' | 'fibonacci' | 'turbo'>('matriz');
  const [isTurboModalOpen, setIsTurboModalOpen] = useState(false);
  const [generationError, setGenerationError] = useState<{
    title: string;
    summary: string;
    reasons: string[];
    suggestions: string[];
  } | null>(null);

  // Listener para aplicação automática de Dezenas Fixas / Par de Ouro
  useEffect(() => {
    if (initialFixedNumbers && initialFixedNumbers.length > 0) {
      setFixedNumbers((prev) =>
        Array.from(new Set([...prev, ...initialFixedNumbers])).sort((a, b) => a - b)
      );
      setSelectedNumbers((prev) => {
        const union = Array.from(new Set([...initialFixedNumbers, ...prev])).sort((a, b) => a - b);
        return union.slice(0, targetCount);
      });
      setStrategyName(
        `Par de Ouro [${initialFixedNumbers.map((n) => n.toString().padStart(2, '0')).join(', ')}]`
      );
      setDocumentMessage(
        `Par de Ouro [${initialFixedNumbers
          .map((n) => n.toString().padStart(2, '0'))
          .join(', ')}] aplicado com sucesso como restrição fixa no Fechamento!`
      );
      setTimeout(() => setDocumentMessage(null), 6000);
    }
  }, [initialFixedNumbers, targetCount]);

  // Notificação sonora opcional para jogos fora da zona de ouro (190-210)
  const [soundAlertEnabled, setSoundAlertEnabled] = useState<boolean>(() => {
    try {
      return localStorage.getItem('lotosniper_sound_alert') === 'true';
    } catch {
      return false;
    }
  });

  const handleToggleSoundAlert = (enabled: boolean) => {
    setSoundAlertEnabled(enabled);
    try {
      localStorage.setItem('lotosniper_sound_alert', String(enabled));
    } catch {}
  };

  // Histórico de Auto-Save para as últimas 10 gerações
  const [autoSaveHistory, setAutoSaveHistory] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('lotosniper_matrix_autosave');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [isAutoSaveModalOpen, setIsAutoSaveModalOpen] = useState(false);

  const saveToAutoSave = (
    tickets: GameTicket[],
    genMode: FechamentoMode,
    numbers: number[],
    genFilters: FilterCriteria,
    type: 'matriz' | 'fibonacci'
  ) => {
    try {
      const item = {
        id: `gen-${Date.now()}`,
        timestamp: Date.now(),
        dateStr: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        mode: genMode,
        targetCount: numbers.length,
        selectedNumbers: numbers,
        filters: genFilters,
        ticketsCount: tickets.length,
        tickets,
        generationType: type,
      };
      const updated = [item, ...autoSaveHistory.filter((h) => h.id !== item.id)].slice(0, 10);
      setAutoSaveHistory(updated);
      localStorage.setItem('lotosniper_matrix_autosave', JSON.stringify(updated));
    } catch (e) {
      console.error('Falha ao salvar auto-save:', e);
    }
  };

  const handleRestoreGeneration = (item: any) => {
    setMode(item.mode);
    setSelectedNumbers(item.selectedNumbers);
    setFilters(item.filters);
    setGeneratedTickets(item.tickets);
    setGenerationType(item.generationType);
    onSaveTickets(item.tickets);
    setIsAutoSaveModalOpen(false);
  };

  // Monitoramento Estatístico dos Fechamentos Gerados
  const fechamentoMonitoringSummary = useMemo<MonitoringSummary | null>(() => {
    if (generatedTickets.length === 0) return null;
    return analyzeGamesList(
      generatedTickets.map((t) => ({
        id: `Bilhete #${t.index.toString().padStart(2, '0')}`,
        dezenas: t.dezenas,
        label: `Bilhete #${t.index.toString().padStart(2, '0')}`,
        index: t.index,
      }))
    );
  }, [generatedTickets]);

  // Bilhetes exibidos com suporte a filtro do monitoramento
  const displayedTickets = useMemo(() => {
    if (fechamentoFilter === 'improbable' && fechamentoMonitoringSummary) {
      const improbableIds = fechamentoMonitoringSummary.gamesWithAnomalies.map((g) => g.gameId);
      return generatedTickets.filter((t) =>
        improbableIds.includes(`Bilhete #${t.index.toString().padStart(2, '0')}`)
      );
    }
    if (fechamentoFilter.startsWith('Bilhete #')) {
      return generatedTickets.filter(
        (t) => `Bilhete #${t.index.toString().padStart(2, '0')}` === fechamentoFilter
      );
    }
    return generatedTickets;
  }, [generatedTickets, fechamentoFilter, fechamentoMonitoringSummary]);

  // Modelo de Prognóstico Ativo
  const [activeModel, setActiveModel] = useState<string>(
    '⚡ Estratégia Documento (9 Repetidas + 9 Ausentes)'
  );

  const applyStrategyModel = (modelType: string, overrideTargetCount?: number) => {
    const tCount = overrideTargetCount ?? targetCount;
    setActiveModel(modelType);

    if (modelType.includes('Documento')) {
      const optimal = buildOptimalPool(tCount, latestDraw, dynamicStats, cyclePendingNumbers);
      setSelectedNumbers(optimal.dezenas.slice(0, tCount));
      const name = '⚡ Estratégia Documento (9 Repetidas + 9 Ausentes)';
      setStrategyName(name);
      setDocumentMessage(optimal.explicacao);
      setTimeout(() => setDocumentMessage(null), 6000);
    } else if (modelType.includes('Top') || modelType.includes('IA')) {
      const sorted = [...dynamicStats]
        .sort((a, b) => {
          const scoreA = aiPrediction?.scores ? aiPrediction.scores[a.numero - 1] : a.vezes / 24 + a.atrasoAtual * 5;
          const scoreB = aiPrediction?.scores ? aiPrediction.scores[b.numero - 1] : b.vezes / 24 + b.atrasoAtual * 5;
          return scoreB - scoreA;
        })
        .slice(0, tCount)
        .map((s) => s.numero)
        .sort((a, b) => a - b);
      setSelectedNumbers(sorted);
      const name = tCount === 18 ? 'Top 18 IA' : `Top 18 IA (Top ${tCount} Dezenas)`;
      setStrategyName(name);
      setDocumentMessage(`Top ${tCount} IA aplicado: dezenas ranqueadas com maior índice preditivo.`);
      setTimeout(() => setDocumentMessage(null), 5000);
    } else if (modelType.includes('Fechar Ciclo')) {
      const cycleFocus = Array.from(
        new Set([
          2, 7, 10,
          ...cyclePendingNumbers,
          ...dynamicStats.filter((s) => s.atrasoAcimaDaMedia).map((s) => s.numero),
          11, 20, 25, 13, 24, 1, 4, 3, 5, 9, 12, 14, 15, 19, 21, 22, 23,
        ])
      )
        .slice(0, tCount)
        .sort((a, b) => a - b);
      setSelectedNumbers(cycleFocus);
      const name = 'Fechar Ciclo (2, 7, 10)';
      setStrategyName(name);
      setDocumentMessage(`Modelo Fechar Ciclo (2, 7, 10) aplicado: foco na conclusão do ciclo atual da Lotofácil.`);
      setTimeout(() => setDocumentMessage(null), 5000);
    } else if (modelType.includes('Equilíbrio')) {
      const eq = [1, 2, 3, 5, 7, 8, 10, 11, 13, 14, 15, 19, 20, 21, 22, 23, 24, 25]
        .slice(0, tCount)
        .sort((a, b) => a - b);
      setSelectedNumbers(eq);
      const name = 'Equilíbrio Canônico';
      setStrategyName(name);
      setDocumentMessage(`Equilíbrio Canônico aplicado: harmonia exata de moldura, miolo, primos e fibonacci.`);
      setTimeout(() => setDocumentMessage(null), 5000);
    }
  };

  // Apply Document Strategy (Calibrated pool dynamically scaled to targetCount)
  const handleApplyOptimalDocumentPool = (repCount?: number, ausCount?: number) => {
    const optimal = buildOptimalPool(targetCount, latestDraw, dynamicStats, cyclePendingNumbers, repCount, ausCount);
    setSelectedNumbers(optimal.dezenas);
    setDocumentMessage(optimal.explicacao);
    setTimeout(() => setDocumentMessage(null), 6000);
  };

  // Toggle selection
  const handleToggleNumber = (n: number) => {
    if (fixedNumbers.includes(n)) {
      setFixedNumbers(fixedNumbers.filter((num) => num !== n));
    }
    if (excludedNumbers.includes(n)) {
      setExcludedNumbers(excludedNumbers.filter((num) => num !== n));
    }

    if (selectedNumbers.includes(n)) {
      setSelectedNumbers(selectedNumbers.filter((num) => num !== n));
    } else {
      if (selectedNumbers.length < targetCount) {
        setSelectedNumbers([...selectedNumbers, n].sort((a, b) => a - b));
      } else {
        // Replace last or alert
        const next = [...selectedNumbers.slice(1), n].sort((a, b) => a - b);
        setSelectedNumbers(next);
      }
    }
  };

  const handleSetFixed = (n: number) => {
    if (fixedNumbers.includes(n)) {
      setFixedNumbers(fixedNumbers.filter((num) => num !== n));
    } else {
      setFixedNumbers([...fixedNumbers, n].sort((a, b) => a - b));
      if (!selectedNumbers.includes(n)) {
        setSelectedNumbers([...selectedNumbers, n].sort((a, b) => a - b));
      }
      setExcludedNumbers(excludedNumbers.filter((num) => num !== n));
    }
  };

  const handleSetExcluded = (n: number) => {
    if (excludedNumbers.includes(n)) {
      setExcludedNumbers(excludedNumbers.filter((num) => num !== n));
    } else {
      setExcludedNumbers([...excludedNumbers, n].sort((a, b) => a - b));
      setSelectedNumbers(selectedNumbers.filter((num) => num !== n));
      setFixedNumbers(fixedNumbers.filter((num) => num !== n));
    }
  };

  const diagnoseGenerationFailure = (
    pool: number[],
    fixed: number[],
    excluded: number[],
    activeFilters: FilterCriteria,
    targetNeeded: number,
    draw: LotofacilDraw
  ) => {
    const reasons: string[] = [];
    const suggestions: string[] = [];

    if (pool.length < targetNeeded) {
      reasons.push(`Você selecionou ${pool.length} dezenas no volante, mas a modalidade '${preset.nome}' requer exatamente ${targetNeeded} dezenas.`);
      suggestions.push(`Marque mais ${targetNeeded - pool.length} dezenas no volante acima ou utilize uma das estratégias de calibração automática.`);
    }

    if (fixed.length > 15) {
      reasons.push(`Foram marcadas ${fixed.length} dezenas fixas. O bilhete da Lotofácil é composto por exatamente 15 dezenas.`);
      suggestions.push('Reduza a quantidade de dezenas fixas para no máximo 10 ou 12.');
    }

    const overlap = fixed.filter((n) => excluded.includes(n));
    if (overlap.length > 0) {
      reasons.push(`Conflito de regras: a(s) dezena(s) [${overlap.map(n => n.toString().padStart(2, '0')).join(', ')}] estão simultaneamente marcadas como Fixas e Excluídas.`);
      suggestions.push('Desmarque a exclusão das dezenas que você deseja manter fixas.');
    }

    const effectivePool = pool.filter((n) => !excluded.includes(n));
    if (effectivePool.length < 15) {
      reasons.push(`Após aplicar as dezenas excluídas, restaram apenas ${effectivePool.length} dezenas disponíveis no volante (são necessárias no mínimo 15).`);
      suggestions.push('Remova algumas dezenas excluídas para permitir a formação de bilhetes válidos.');
    }

    if (activeFilters.somaMin > activeFilters.somaMax) {
      reasons.push(`Faixa de soma inválida: o valor mínimo (${activeFilters.somaMin}) é maior que o valor máximo (${activeFilters.somaMax}).`);
      suggestions.push('Ajuste o intervalo de soma para os padrões oficiais (ex: 175 a 220).');
    }

    const sortedPool = [...pool].sort((a, b) => a - b);
    if (sortedPool.length >= 15) {
      const minPossibleSum = sortedPool.slice(0, 15).reduce((a, b) => a + b, 0);
      const maxPossibleSum = sortedPool.slice(-15).reduce((a, b) => a + b, 0);

      if (activeFilters.somaMin > maxPossibleSum) {
        reasons.push(`A soma mínima configurada (${activeFilters.somaMin}) é superior à soma máxima possível de qualquer combinação das suas dezenas selecionadas (${maxPossibleSum}).`);
        suggestions.push(`Reduza o limite de soma mínima para ${Math.min(220, maxPossibleSum)} ou inclua dezenas de numeração mais alta.`);
      }

      if (activeFilters.somaMax < minPossibleSum) {
        reasons.push(`A soma máxima configurada (${activeFilters.somaMax}) é inferior à menor soma possível com as suas dezenas selecionadas (${minPossibleSum}).`);
        suggestions.push(`Aumente o limite de soma máxima para ${Math.max(175, minPossibleSum)} ou inclua dezenas menores.`);
      }
    }

    const totalEven = pool.filter((n) => n % 2 === 0).length;
    if (activeFilters.paresMin > totalEven) {
      reasons.push(`O filtro de pares exige no mínimo ${activeFilters.paresMin} pares, porém seu pool só contém ${totalEven} dezenas pares.`);
      suggestions.push(`Reduza o mínimo de pares para no máximo ${totalEven} ou marque mais números pares no volante.`);
    }

    const totalPrimes = pool.filter((n) => PRIMOS.includes(n)).length;
    if (activeFilters.primosMin > totalPrimes) {
      reasons.push(`O filtro de primos exige no mínimo ${activeFilters.primosMin} primos, porém seu pool só contém ${totalPrimes} números primos.`);
      suggestions.push(`Diminua a restrição de primos ou adicione números primos (2, 3, 5, 7, 11, 13, 17, 19, 23).`);
    }

    const totalMoldura = pool.filter((n) => MOLDURA.includes(n)).length;
    if (activeFilters.molduraMin > totalMoldura) {
      reasons.push(`O filtro de moldura exige no mínimo ${activeFilters.molduraMin} dezenas na borda, mas seu pool só contém ${totalMoldura}.`);
      suggestions.push(`Ajuste o filtro da moldura para no máximo ${totalMoldura} ou selecione mais números da borda do volante.`);
    }

    if (reasons.length === 0) {
      reasons.push('A combinação simultânea de múltiplos filtros estritos (Soma, Pares, Primos, Moldura, Fibonacci e Sequências Consecutivas) podou 100% das combinações combinatórias possíveis do fechamento.');
      suggestions.push('Clique em "Restaurar Filtros Padrão" para aplicar as janelas de tolerância canônicas da Lotofácil (175–220 soma, 6–9 pares, 4–7 primos, 8–11 moldura).');
      suggestions.push('Verifique se as dezenas fixas escolhidas não entram em conflito com as faixas de soma ou paridade.');
    }

    return {
      title: 'Não foi possível gerar jogos com a configuração atual',
      summary: 'O motor combinatório do LotoSniper não conseguiu gerar jogos válidos porque os filtros e restrições ativas descartaram todas as combinações possíveis.',
      reasons,
      suggestions,
    };
  };

  const handleGenerate = () => {
    setIsGenerating(true);
    setGenerationError(null);
    const start = performance.now();

    setTimeout(() => {
      try {
        const fullFilters: FilterCriteria = {
          ...filters,
          dezenasFixas: fixedNumbers,
          dezenasExcluidas: excludedNumbers,
        };

        const tickets = generateFechamentoCovering(
          selectedNumbers,
          mode.includes('13') ? 13 : 14,
          preset.jogosMaximos,
          fullFilters,
          latestDraw.dezenas,
          aiPrediction?.scores
        );

        if (!tickets || tickets.length === 0) {
          const diag = diagnoseGenerationFailure(
            selectedNumbers,
            fixedNumbers,
            excludedNumbers,
            fullFilters,
            targetCount,
            latestDraw
          );
          setGenerationError(diag);
          setGeneratedTickets([]);
          return;
        }

        // Sucesso comprovado
        setGenerationError(null);
        const exportMeta: FechamentoExportMeta = {
          strategyName,
          modeName: `${preset.nome} (${preset.jogosMaximos} Jogos - Garantia ${preset.garantia})`,
          garantia: preset.garantia,
          targetCount: targetCount,
          selectedNumbers: selectedNumbers,
          fixedNumbers: fixedNumbers,
          excludedNumbers: excludedNumbers,
          filters: fullFilters,
          concurso: latestDraw.concurso,
          dataConcurso: latestDraw.data,
          timestamp: Date.now(),
        };
        try {
          localStorage.setItem('lotosniper_active_fechamento_meta', JSON.stringify(exportMeta));
        } catch {}

        setGeneratedTickets(tickets);
        onSaveTickets(tickets, exportMeta);
        setGenerationType('matriz');
        saveToAutoSave(tickets, mode, selectedNumbers, fullFilters, 'matriz');

        if (soundAlertEnabled) {
          const hasOutside = tickets.some((t) => t.soma < 190 || t.soma > 210);
          if (hasOutside) soundService.playOutsideGoldenZoneAlert();
          else soundService.playGoldenZoneSuccessChime();
        }

        const end = performance.now();
        setGenerationTimeMs(Math.round(end - start));
      } catch (err: any) {
        console.error(err);
        const diag = diagnoseGenerationFailure(
          selectedNumbers,
          fixedNumbers,
          excludedNumbers,
          {
            ...filters,
            dezenasFixas: fixedNumbers,
            dezenasExcluidas: excludedNumbers,
          },
          targetCount,
          latestDraw
        );
        if (err?.message && !diag.reasons.includes(err.message)) {
          diag.reasons.unshift(err.message);
        }
        setGenerationError(diag);
        setGeneratedTickets([]);
      } finally {
        setIsGenerating(false);
      }
    }, 150);
  };

  const handleApplyTurbo = (tickets: GameTicket[], turboRes: TurboResult) => {
    setGenerationError(null);
    setGeneratedTickets(tickets);
    setGenerationType('turbo');
    setGenerationTimeMs(turboRes.elapsedMs);
    setStrategyName(`⚡ Gerador Turbo (Força Bruta 14 Pts • ${turboRes.elapsedMs}ms)`);

    const exportMeta: FechamentoExportMeta = {
      strategyName: `⚡ Gerador Turbo Força Bruta (${turboRes.elapsedMs}ms)`,
      modeName: `Turbo 14 Pontos (${tickets.length} Jogos - Garantia 100% de 14)`,
      garantia: '14 Pontos',
      targetCount: turboRes.poolSize,
      selectedNumbers: selectedNumbers.length >= 16 ? selectedNumbers : tickets[0]?.numeros || [],
      fixedNumbers,
      excludedNumbers,
      filters: {
        ...filters,
        dezenasFixas: fixedNumbers,
        dezenasExcluidas: excludedNumbers,
      },
      concurso: latestDraw.concurso,
      dataConcurso: latestDraw.data,
      timestamp: Date.now(),
    };

    try {
      localStorage.setItem('lotosniper_active_fechamento_meta', JSON.stringify(exportMeta));
    } catch {}

    onSaveTickets(tickets, exportMeta);
    saveToAutoSave(tickets, mode, selectedNumbers, filters, 'matriz');

    setDocumentMessage(
      `✓ Fechamento Turbo gerado em ${turboRes.elapsedMs}ms com 100% de garantia de 14 pontos (${tickets.length} jogos salvos)!`
    );
    setTimeout(() => setDocumentMessage(null), 6000);
  };

  const handleDownloadTXT = () => {
    if (generatedTickets.length === 0) return;

    const fullFilters: FilterCriteria = {
      ...filters,
      dezenasFixas: fixedNumbers,
      dezenasExcluidas: excludedNumbers,
    };

    const exportMeta: FechamentoExportMeta = {
      strategyName,
      modeName: `${preset.nome} (${generatedTickets.length} Jogos - Garantia ${preset.garantia})`,
      garantia: preset.garantia,
      targetCount: targetCount,
      selectedNumbers: selectedNumbers,
      fixedNumbers: fixedNumbers,
      excludedNumbers: excludedNumbers,
      filters: fullFilters,
      concurso: latestDraw.concurso,
      dataConcurso: latestDraw.data,
      timestamp: Date.now(),
    };

    const content = generateFechamentoTxtContent({
      tickets: generatedTickets,
      latestDraw,
      meta: exportMeta,
    });

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `lotosniper_fechamento_concurso_${latestDraw.concurso}_${generatedTickets.length}_jogos.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Gerador de Sequências Otimizadas baseado em distribuições de Fibonacci
  // Cria 5 jogos com garantia de pelo menos 3 jogos na Regra de Ouro (soma 190-210)
  const handleGenerateFibonacci = () => {
    setIsGenerating(true);
    const start = performance.now();

    setTimeout(() => {
      try {
        const tickets = generateFibonacciOptimizedGames(
          latestDraw.dezenas,
          aiPrediction?.scores
        );

        const fiboMeta: FechamentoExportMeta = {
          strategyName: 'Distribuição de Fibonacci Otimizada (Zona de Ouro)',
          modeName: '5 Bilhetes Fibonacci Otimizados',
          garantia: 'Pelo menos 3 jogos na Regra de Ouro (soma 190-210)',
          targetCount: 15,
          selectedNumbers: latestDraw.dezenas,
          fixedNumbers: [],
          excludedNumbers: [],
          filters,
          concurso: latestDraw.concurso,
          dataConcurso: latestDraw.data,
          timestamp: Date.now(),
        };
        try {
          localStorage.setItem('lotosniper_active_fechamento_meta', JSON.stringify(fiboMeta));
        } catch {}

        setGeneratedTickets(tickets);
        onSaveTickets(tickets, fiboMeta);
        setGenerationType('fibonacci');
        saveToAutoSave(tickets, mode, selectedNumbers, filters, 'fibonacci');

        if (soundAlertEnabled) {
          const hasOutside = tickets.some((t) => t.soma < 190 || t.soma > 210);
          if (hasOutside) soundService.playOutsideGoldenZoneAlert();
          else soundService.playGoldenZoneSuccessChime();
        }

        const end = performance.now();
        setGenerationTimeMs(Math.round(end - start));
      } catch (err: any) {
        console.error(err);
      } finally {
        setIsGenerating(false);
      }
    }, 150);
  };

  // Copy all tickets in standard text format
  const handleCopyAll = () => {
    if (generatedTickets.length === 0) return;
    const text = generatedTickets
      .map(
        (t) =>
          `Jogo ${t.index.toString().padStart(2, '0')}: ${t.dezenas
            .map((n) => n.toString().padStart(2, '0'))
            .join(' - ')}`
      )
      .join('\n');
    navigator.clipboard.writeText(text);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  const handleCopyTicket = (ticket: GameTicket) => {
    const text = ticket.dezenas.map((n) => n.toString().padStart(2, '0')).join(' ');
    navigator.clipboard.writeText(text);
    setCopiedTicketId(ticket.id);
    setTimeout(() => setCopiedTicketId(null), 1500);
  };

  // Financial calculations with official Caixa bet price (R$ 3,50)
  const totalCost = (generatedTickets.length || preset.jogosMaximos) * VALOR_APOSTA_LOTOFACIL;
  // Full raw Caixa permutation cost
  const rawPermutations =
    targetCount === 15 ? 1 : targetCount === 16 ? 16 : targetCount === 17 ? 136 : targetCount === 18 ? 816 : targetCount === 19 ? 3876 : targetCount === 20 ? 15504 : 54264;
  const rawCaixaCost = rawPermutations * VALOR_APOSTA_LOTOFACIL;
  const savings = Math.max(0, rawCaixaCost - totalCost);

  const getCurrentExportMeta = (): FechamentoExportMeta => {
    return {
      strategyName,
      modeName: `${preset.nome} (${preset.jogosMaximos} Jogos - Garantia ${preset.garantia})`,
      garantia: preset.garantia,
      targetCount: targetCount,
      selectedNumbers: selectedNumbers,
      fixedNumbers: fixedNumbers,
      excludedNumbers: excludedNumbers,
      filters: {
        ...filters,
        dezenasFixas: fixedNumbers,
        dezenasExcluidas: excludedNumbers,
      },
      concurso: latestDraw.concurso,
      dataConcurso: latestDraw.data,
      timestamp: Date.now(),
    };
  };

  return (
    <div className="space-y-6">
      {/* Introduction Hero Card */}
      <div className="bg-gradient-to-r from-slate-900 via-emerald-950/40 to-slate-900 rounded-2xl border border-emerald-500/20 p-5 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2.5 flex-wrap">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Garantia Matemática Comprovada</span>
              </div>

              {autoSaveHistory.length > 0 && (
                <button
                  type="button"
                  onClick={() => setIsAutoSaveModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-400/40 text-indigo-300 text-xs font-bold transition cursor-pointer shadow-sm"
                  title="Recuperar configurações e jogos das últimas 10 gerações salvas no localStorage"
                >
                  <History className="w-3.5 h-3.5" />
                  <span>Histórico Auto-Save ({autoSaveHistory.length}/10)</span>
                </button>
              )}
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Otimizador de Fechamentos para 14 Pontos
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl mt-1 leading-relaxed">
              Algoritmo de cobertura exata combinatória (Covering Design). Ao acertar as 15
              sorteadas dentro das suas {targetCount} dezenas selecionadas, a matriz garante
              no mínimo 14 pontos (com alta probabilidade de 15 pontos), reduzindo os custos
              de aposta em até <strong className="text-emerald-400 font-mono">97.1%</strong>.
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 text-xs shrink-0">
            <div>
              <span className="text-slate-400 text-[11px] block">Aposta Pura (Caixa):</span>
              <strong className="text-slate-300 font-mono text-sm">
                R$ {rawCaixaCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </strong>
            </div>
            <div>
              <span className="text-slate-400 text-[11px] block">Matriz Pro (Fechamento):</span>
              <strong className="text-emerald-400 font-mono text-sm font-bold">
                R$ {totalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </strong>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <span className="text-slate-400 text-[11px] block">Economia Real:</span>
              <strong className="text-amber-400 font-mono text-sm font-bold flex items-center gap-1">
                <TrendingDown className="w-3.5 h-3.5" />
                {preset.reducaoPercentual}%
              </strong>
            </div>
          </div>
        </div>
      </div>

      {/* Mode Selection Carousel (15 a 21 Dezenas) */}
      <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-4 shadow-xl space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
            1. Selecione a Estratégia de Fechamento (15 a 21 Números):
          </label>
          <span className="text-[11px] font-mono text-emerald-400 font-bold bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-full self-start sm:self-auto">
            Matriz Selecionada: {targetCount} Dezenas ({preset.jogosMaximos} Jogos • Garantia {preset.garantia})
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
          {(
            [
              'surpresinha_inteligente',
              '16_14_15',
              '17_14_15',
              '18_14_15',
              '18_13_14',
              '19_14_15',
              '20_14_15',
              '21_13_15',
            ] as FechamentoMode[]
          ).map((key) => {
            const p = FECHAMENTO_PRESETS[key];
            const isSelected = mode === key;
            const custoFechamento = p.jogosMaximos * VALOR_APOSTA_LOTOFACIL;
            return (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setMode(key);
                  applyStrategyModel(activeModel, p.dezenasNecessarias);
                }}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-emerald-500/15 border-emerald-400 shadow-md shadow-emerald-500/10 ring-1 ring-emerald-400'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs sm:text-sm text-white">
                    {p.dezenasNecessarias} Dezenas
                  </span>
                  <div className="text-right">
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-emerald-400 font-bold block">
                      {p.jogosMaximos} jogos
                    </span>
                    <span className="text-[10px] font-mono font-bold text-amber-300 block mt-0.5">
                      R$ {custoFechamento.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
                <div className="text-[11px] text-emerald-300 font-semibold mt-1">
                  {p.garantia}
                </div>
                <div className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">
                  Economia de {p.reducaoPercentual}%
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Seletor de Modelos de Prognósticos & Estratégias */}
      <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-4 shadow-xl space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
            2. Selecione o Modelo de Prognóstico da Matriz ({targetCount} Dezenas):
          </label>
          <span className="text-[11px] font-mono text-cyan-400 font-bold bg-cyan-950/60 border border-cyan-500/30 px-2 py-0.5 rounded-full self-start sm:self-auto">
            Modelo Ativo: {strategyName}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {/* Modelo 1: ⚡ Estratégia Documento */}
          <button
            type="button"
            onClick={() => applyStrategyModel('⚡ Estratégia Documento (9 Repetidas + 9 Ausentes)')}
            className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer relative overflow-hidden ${
              strategyName.includes('Documento')
                ? 'bg-emerald-500/15 border-emerald-400 shadow-md shadow-emerald-500/20 ring-1 ring-emerald-400'
                : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                <Zap className="w-4 h-4 fill-current" />
              </span>
              <div>
                <span className="font-bold text-xs sm:text-sm text-white block">
                  Estratégia Documento
                </span>
                <span className="text-[10px] font-mono font-bold text-emerald-400">
                  9 Repetidas + 9 Ausentes
                </span>
              </div>
            </div>
            <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
              Captura proporcional de 9 das ausentes do Concurso anterior e repetidas de alta frequência.
            </p>
          </button>

          {/* Modelo 2: 🤖 Top 18 IA */}
          <button
            type="button"
            onClick={() => applyStrategyModel('Top 18 IA')}
            className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer relative overflow-hidden ${
              strategyName.includes('Top')
                ? 'bg-emerald-500/15 border-emerald-400 shadow-md shadow-emerald-500/20 ring-1 ring-emerald-400'
                : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-teal-500/20 text-teal-400 border border-teal-500/40">
                <Sparkles className="w-4 h-4" />
              </span>
              <div>
                <span className="font-bold text-xs sm:text-sm text-white block">
                  Top 18 IA
                </span>
                <span className="text-[10px] font-mono font-bold text-teal-400">
                  Calor & Probabilidade IA
                </span>
              </div>
            </div>
            <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
              Seleção das melhores dezenas ordenadas pelos scores de inteligência artificial e urgência estatística.
            </p>
          </button>

          {/* Modelo 3: 🔄 Fechar Ciclo */}
          <button
            type="button"
            onClick={() => applyStrategyModel('Fechar Ciclo (2, 7, 10)')}
            className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer relative overflow-hidden ${
              strategyName.includes('Fechar Ciclo')
                ? 'bg-amber-500/15 border-amber-400 shadow-md shadow-amber-500/20 ring-1 ring-amber-400'
                : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/40">
                <RefreshCw className="w-4 h-4" />
              </span>
              <div>
                <span className="font-bold text-xs sm:text-sm text-white block">
                  Fechar Ciclo (2, 7, 10)
                </span>
                <span className="text-[10px] font-mono font-bold text-amber-400">
                  Dezenas de Alta Pressão
                </span>
              </div>
            </div>
            <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
              Prioriza as dezenas pendentes para fechar o Ciclo da Lotofácil mais as dezenas mais frequentes.
            </p>
          </button>

          {/* Modelo 4: ⚖️ Equilíbrio Canônico */}
          <button
            type="button"
            onClick={() => applyStrategyModel('Equilíbrio Canônico')}
            className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer relative overflow-hidden ${
              strategyName.includes('Equilíbrio Canônico')
                ? 'bg-emerald-500/15 border-emerald-400 shadow-md shadow-emerald-500/20 ring-1 ring-emerald-400'
                : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/40">
                <ShieldCheck className="w-4 h-4" />
              </span>
              <div>
                <span className="font-bold text-xs sm:text-sm text-white block">
                  Equilíbrio Canônico
                </span>
                <span className="text-[10px] font-mono font-bold text-indigo-400">
                  Harmonia 100% Canônica
                </span>
              </div>
            </div>
            <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
              Distribuição harmônica de moldura, miolo, primos e fibonacci calibrada para a Zona de Ouro (190-210).
            </p>
          </button>
        </div>
      </div>

      {/* Totalizador de Custos - Cálculo Automático do Investimento */}
      <TotalizadorDeCustos
        preset={preset}
        mode={mode}
        targetCount={targetCount}
        totalJogos={generatedTickets.length || preset.jogosMaximos}
        onGoToGamesManager={
          onGoToGamesManager
            ? () => onGoToGamesManager(generatedTickets, getCurrentExportMeta())
            : undefined
        }
      />

      {/* Success Notification for Document Strategy Pool */}
      {documentMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs flex items-center justify-between gap-3 shadow-md animate-in fade-in">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{documentMessage}</span>
          </div>
          <button
            onClick={() => setDocumentMessage(null)}
            className="text-emerald-400/70 hover:text-emerald-200 text-xs font-semibold cursor-pointer"
          >
            Fechar
          </button>
        </div>
      )}

      {/* Volante 5x5 Grid */}
      <VolanteSelector
        selectedNumbers={selectedNumbers}
        fixedNumbers={fixedNumbers}
        excludedNumbers={excludedNumbers}
        aiScores={aiPrediction?.scores}
        statsList={dynamicStats}
        cyclePendingNumbers={cyclePendingNumbers}
        latestDraw={latestDraw}
        onToggleNumber={handleToggleNumber}
        onSetFixed={handleSetFixed}
        onSetExcluded={handleSetExcluded}
        onSelectSet={(nums) => setSelectedNumbers(nums.slice(0, targetCount))}
        onStrategySelect={(stratName) => {
          setStrategyName(stratName);
          setActiveModel(stratName);
        }}
        activeStrategy={strategyName}
        onClear={() => {
          setSelectedNumbers([]);
          setFixedNumbers([]);
          setExcludedNumbers([]);
        }}
        targetCount={targetCount}
      />

      {/* 1. SELETOR VISUAL DE EQUILÍBRIO ESTRUTURAL (PARES & ÍMPARES) */}
      <EquilibrioEstruturalSelector
        filters={filters}
        onChange={setFilters}
        selectedNumbers={selectedNumbers}
        latestDraw={latestDraw}
      />

      {/* 2. FILTROS PERSONALIZADOS & RESTRIÇÕES CANÔNICAS (GRID 2X2 COM FIBONACCI E ALERTA SONORO) */}
      <FilterControls
        filters={filters}
        onChange={setFilters}
        onReset={() => setFilters(DEFAULT_FILTERS)}
        latestDraw={latestDraw}
        soundAlertEnabled={soundAlertEnabled}
        onToggleSoundAlert={handleToggleSoundAlert}
      />

      {/* 3. SIMULAÇÃO EM TEMPO REAL DOS FILTROS PERSONALIZADOS (PRÉVIA DE 5 JOGOS) */}
      <RealTimeFilterSimulation
        filters={filters}
        selectedNumbers={selectedNumbers}
        latestDraw={latestDraw}
        aiScores={aiPrediction?.scores}
      />

      {/* 4. GRÁFICO DE DISPERSÃO DE SOMAS DOS ÚLTIMOS 100 CONCURSOS & ZONA DE OURO (190–210) */}
      <SomaScatterPlot
        latestDraw={latestDraw}
        currentSomaMin={filters.somaMin}
        currentSomaMax={filters.somaMax}
        onApplySomaRange={(min, max) =>
          setFilters((prev) => ({ ...prev, somaMin: min, somaMax: max }))
        }
      />

      {/* 3. PRONTO PARA PROCESSAR A MATRIZ? (EM DESTAQUE COM DESIGN APRIMORADO) */}
      <div
        className={`relative overflow-hidden rounded-2xl border-2 transition-all p-5 sm:p-6 shadow-2xl ${
          selectedNumbers.length === targetCount
            ? 'bg-gradient-to-br from-slate-900 via-emerald-950/50 to-slate-900 border-emerald-500/60 shadow-emerald-500/15'
            : 'bg-gradient-to-br from-slate-900 via-slate-900/95 to-amber-950/30 border-amber-500/40 shadow-slate-950/60'
        }`}
      >
        {/* Glow ambient background effect */}
        <div
          className={`absolute -top-12 -right-12 w-64 h-64 blur-3xl pointer-events-none rounded-full transition-opacity ${
            selectedNumbers.length === targetCount ? 'bg-emerald-500/25 opacity-100' : 'bg-amber-500/15 opacity-80'
          }`}
        />

        <div className="relative z-10 space-y-5">
          {/* Top Status & Heading */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-4 border-b border-slate-800/80">
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                {selectedNumbers.length === targetCount ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 font-black text-xs uppercase tracking-wider font-mono shadow-sm">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
                    </span>
                    <span>✓ Matriz Calibrada ({targetCount} Dezenas)</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/50 text-amber-300 font-bold text-xs uppercase tracking-wider font-mono">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400"></span>
                    </span>
                    <span>Faltam {targetCount - selectedNumbers.length} dezena(s) para completar</span>
                  </span>
                )}

                <span className="text-[11px] font-semibold text-slate-400 font-mono">
                  Garantia: <strong className="text-white">{preset.garantia}</strong> • {preset.jogosMaximos} Bilhetes
                </span>
              </div>

              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-2 flex items-center gap-2.5">
                <span className="p-1.5 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  <Zap className="w-5 h-5 fill-current" />
                </span>
                <span>Pronto para processar a Matriz?</span>
              </h2>

              <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
                O motor combinatório de alta precisão podará combinações estatisticamente inviáveis
                com base nas restrições canônicas ativas e desdobrará as {targetCount} dezenas em exatamente{' '}
                <strong className="text-emerald-300 font-bold">{preset.jogosMaximos} jogos otimizados</strong> de 15 números.
              </p>
            </div>

            {/* Quick Metrics Telemetry Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 shrink-0 text-xs">
              <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Garantia</span>
                <strong className="text-white font-bold font-mono text-xs">{preset.garantia}</strong>
                <span className="text-[10px] text-emerald-400 block font-medium">100% matemática</span>
              </div>

              <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Total de Jogos</span>
                <strong className="text-white font-bold font-mono text-xs">{preset.jogosMaximos} Bilhetes</strong>
                <span className="text-[10px] text-slate-400 block font-medium">15 dezenas cada</span>
              </div>

              <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800 col-span-2 sm:col-span-1">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Investimento</span>
                <strong className="text-emerald-400 font-bold font-mono text-xs">
                  R$ {(preset.jogosMaximos * VALOR_APOSTA_LOTOFACIL).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </strong>
                <span className="text-[10px] text-slate-400 block font-medium">R$ 3,50 / aposta</span>
              </div>
            </div>
          </div>

          {/* Selection Progress or Numbers Preview Bar */}
          <div className="bg-slate-950/80 rounded-xl p-3 sm:p-4 border border-slate-800/80 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-300 flex items-center gap-2">
                <span>Progresso da Matriz de {targetCount} Dezenas:</span>
                <span className="font-mono font-bold text-white px-2 py-0.5 rounded bg-slate-800 border border-slate-700">
                  {selectedNumbers.length} / {targetCount}
                </span>
              </span>

              <span className="font-mono text-xs font-bold text-emerald-400">
                {Math.round((selectedNumbers.length / targetCount) * 100)}%
              </span>
            </div>

            {/* Visual Progress bar */}
            <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden p-0.5">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  selectedNumbers.length === targetCount
                    ? 'bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)]'
                    : 'bg-gradient-to-r from-amber-500 to-orange-500'
                }`}
                style={{ width: `${Math.min(100, (selectedNumbers.length / targetCount) * 100)}%` }}
              />
            </div>

            {/* Selected Numbers Chip Preview when filled */}
            {selectedNumbers.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[11px] text-slate-400 mr-1">Dezenas prontas:</span>
                {selectedNumbers.map((n) => {
                  const isPendingCycle = cyclePendingNumbers?.includes(n);
                  return (
                    <span
                      key={n}
                      className={`inline-flex items-center justify-center w-6 h-6 rounded-md font-mono text-[11px] font-bold shadow-sm ${
                        isPendingCycle
                          ? 'bg-amber-500 text-slate-950 ring-1 ring-amber-300'
                          : 'bg-slate-800 text-slate-100 border border-slate-700'
                      }`}
                    >
                      {n.toString().padStart(2, '0')}
                    </span>
                  );
                })}
              </div>
            )}
          </div>

          {/* Action Row & Process Buttons */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pt-1">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs text-slate-300 font-semibold">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Algoritmo Combinatório Oficial com Filtros Canônicos e Proteção Estatística</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Gere a matriz desdobrada das {targetCount} dezenas ou crie automaticamente 5 sequências com padrões de Fibonacci.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              {/* Botão Gerador Turbo (Força Bruta 14 Pts < 2s via Web Worker) */}
              <button
                type="button"
                onClick={() => setIsTurboModalOpen(true)}
                className="flex items-center justify-center gap-2.5 px-5 py-3.5 rounded-xl font-bold text-xs sm:text-sm bg-gradient-to-r from-amber-500 via-yellow-400 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer border border-amber-300 font-black whitespace-nowrap"
                title="Gera fechamento com garantia matemática de 14 pontos em menos de 2 segundos utilizando força bruta paralela em Web Worker"
              >
                <Zap className="w-4 h-4 fill-current text-slate-950 shrink-0" />
                <div className="text-left">
                  <div className="flex items-center gap-1.5 font-black text-xs sm:text-sm">
                    <span>GERADOR TURBO</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-950 text-amber-300 font-bold border border-amber-400/40">
                      &lt; 2s • WEB WORKER
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-900 font-semibold block">
                    Força Bruta 14 Pts • 100% Auditado
                  </span>
                </div>
              </button>

              {/* Botão Gerador de Sequências Otimizadas (Fibonacci + Regra de Ouro) */}
              <button
                type="button"
                onClick={handleGenerateFibonacci}
                disabled={isGenerating}
                className="flex items-center justify-center gap-2.5 px-5 py-3.5 rounded-xl font-bold text-xs sm:text-sm bg-gradient-to-r from-cyan-600 via-indigo-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer border border-indigo-400/40 whitespace-nowrap"
                title="Cria automaticamente 5 jogos baseados em distribuições de Fibonacci, garantindo que pelo menos 3 jogos sigam a Regra de Ouro de soma (190-210)"
              >
                <Sparkles className="w-4 h-4 text-cyan-300 shrink-0" />
                <div className="text-left">
                  <div className="flex items-center gap-1.5 font-black text-xs sm:text-sm">
                    <span>Gerador de Sequências Otimizadas</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-400/40 font-bold">
                      5 JOGOS
                    </span>
                  </div>
                  <span className="text-[10px] text-cyan-200/80 font-normal block">
                    Padrões Fibonacci • ≥ 3 na Regra de Ouro (190–210)
                  </span>
                </div>
              </button>

              {/* Botão Principal de Processar Matriz do Volante */}
              <button
                type="button"
                onClick={handleGenerate}
                disabled={selectedNumbers.length < targetCount || isGenerating}
                className={`flex items-center justify-center gap-3 px-6 py-3.5 rounded-xl font-black text-xs sm:text-sm tracking-wide transition-all shadow-xl cursor-pointer whitespace-nowrap ${
                  selectedNumbers.length === targetCount && !isGenerating
                    ? 'bg-gradient-to-r from-emerald-400 via-emerald-500 to-teal-400 hover:from-emerald-300 hover:to-teal-300 text-slate-950 shadow-emerald-500/30 hover:shadow-emerald-500/50 hover:scale-[1.02] active:scale-[0.98]'
                    : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-60'
                }`}
              >
                {isGenerating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                    <span>PROCESSANDO...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 fill-current" />
                    <span>
                      {selectedNumbers.length === targetCount
                        ? `PROCESSAR & GERAR ${preset.jogosMaximos} JOGOS`
                        : `SELECIONE MAIS ${targetCount - selectedNumbers.length} DEZENA(S)`}
                    </span>
                    <Sparkles className="w-3.5 h-3.5 text-slate-950" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* AVISO EXPLICATIVO QUANDO NÃO FOR POSSÍVEL GERAR JOGOS */}
      {generationError && (
        <div className="bg-gradient-to-br from-rose-950/40 via-slate-900 to-amber-950/30 rounded-2xl border-2 border-rose-500/50 p-5 sm:p-6 shadow-2xl space-y-4 animate-in fade-in duration-300">
          <div className="flex items-start justify-between gap-3 pb-3 border-b border-rose-500/20">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-400 shrink-0">
                <AlertTriangle className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                  <span>{generationError.title}</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold uppercase">
                    Diagnóstico LotoSniper
                  </span>
                </h3>
                <p className="text-xs text-rose-200/80 mt-0.5">
                  {generationError.summary}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setGenerationError(null)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              title="Fechar aviso"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* O que aconteceu */}
            <div className="bg-slate-950/80 p-4 rounded-xl border border-rose-500/20 space-y-2">
              <span className="font-mono font-bold text-rose-300 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                O que causou o bloqueio da geração:
              </span>
              <ul className="space-y-1.5 text-slate-300">
                {generationError.reasons.map((reason, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-rose-400 font-bold leading-tight">•</span>
                    <span className="leading-relaxed">{reason}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Como resolver */}
            <div className="bg-slate-950/80 p-4 rounded-xl border border-emerald-500/20 space-y-2">
              <span className="font-mono font-bold text-emerald-300 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                Como ajustar para gerar com sucesso:
              </span>
              <ul className="space-y-1.5 text-slate-300">
                {generationError.suggestions.map((sugg, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-emerald-400 font-bold leading-tight">✓</span>
                    <span className="leading-relaxed">{sugg}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800 text-xs">
            <span className="text-slate-400 text-[11px]">
              Dica: As faixas canônicas oficiais do LotoSniper asseguram combinações estatisticamente favoráveis com alta garantia.
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setFilters(DEFAULT_FILTERS);
                  setFixedNumbers(cyclePendingNumbers.slice(0, 2));
                  setExcludedNumbers([]);
                  setGenerationError(null);
                  setDocumentMessage('Filtros padrão restaurados! Tente processar a matriz novamente.');
                  setTimeout(() => setDocumentMessage(null), 5000);
                }}
                className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold transition cursor-pointer shadow-sm"
              >
                Restaurar Filtros Padrão & Limpar Restrições
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Generated Games Table Display */}
      {generatedTickets.length > 0 && (
        <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-5 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-slate-800 gap-3">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-emerald-400" />
                  <span>
                    {generationType === 'fibonacci' || generatedTickets.length === 5
                      ? 'Sequências Otimizadas (Fibonacci): 5 Bilhetes Gerados'
                      : `Matriz Gerada: ${generatedTickets.length} Bilhetes Otimizados`}
                  </span>
                </h3>
                {generationTimeMs !== null && (
                  <span className="text-[11px] text-slate-500 font-mono">
                    ({generationTimeMs}ms)
                  </span>
                )}
                {generationType === 'fibonacci' && (
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                    Regra de Ouro (190–210) Ativa
                  </span>
                )}
                <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                  <span>Custo Total:</span>
                  <strong className="text-emerald-400">
                    R$ {(generatedTickets.length * VALOR_APOSTA_LOTOFACIL).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </strong>
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {generationType === 'fibonacci' || generatedTickets.length === 5
                  ? 'Jogos calibrados com distribuições de Fibonacci (3 a 5 dezenas) e garantia de que pelo menos 3 jogos residem na Zona de Ouro de soma (190–210).'
                  : `Todos os bilhetes atendem estritamente aos filtros matemáticos e à garantia de ${preset.garantia}.`}
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={handleCopyAll}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition cursor-pointer"
              >
                {copiedAll ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Copiados!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar Todos (TXT)</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={handleDownloadTXT}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition cursor-pointer shadow-md shadow-emerald-500/20"
                title="Fazer download do relatório completo da matriz gerada em arquivo .txt"
              >
                <Download className="w-3.5 h-3.5 text-slate-950" />
                <span>Baixar TXT</span>
              </button>
              <button
                onClick={() => onGoToSimulator(generatedTickets)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-semibold transition cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 text-emerald-400" />
                <span>Simular no Histórico Caixa</span>
              </button>
            </div>
          </div>

          {/* VERIFICAÇÃO DE INTEGRIDADE DE FECHAMENTO (WORKER BACKGROUND) */}
          <ClosingIntegrityValidator
            selectedNumbers={selectedNumbers}
            targetHits={mode.includes('13') ? 13 : 14}
            tickets={generatedTickets}
            targetCount={targetCount}
          />

          {/* MAPA DE CALOR D3 DE COBERTURA DE GARANTIAS EM TEMPO REAL */}
          <D3CoverageHeatmap
            tickets={generatedTickets}
            latestDraw={latestDraw}
          />

          {/* SISTEMA DE MONITORAMENTO ESTATÍSTICO DOS FECHAMENTOS GERADOS */}
          {fechamentoMonitoringSummary && (
            <StatisticalMonitoringAlert
              summary={fechamentoMonitoringSummary}
              isFechamentoEvaluator={true}
              hasSavedTickets={false}
              activeFilter={fechamentoFilter}
              onFilterChange={setFechamentoFilter}
              onSelectGame={(gameId) => setFechamentoFilter(gameId)}
              title="Sistema de Monitoramento dos Fechamentos Gerados"
              subtitle="Auditoria matemática de probabilidade avaliando todos os bilhetes da matriz recém-gerada"
              activeFiltersConfig={filters}
            />
          )}

          {/* Componente Totalizador de Custos para os Fechamentos Gerados */}
          <TotalizadorDeCustos
            preset={preset}
            mode={mode}
            targetCount={targetCount}
            totalJogos={generatedTickets.length}
            isGenerated={true}
            title="Totalizador de Custos dos Jogos Gerados"
            subtitle={`Investimento total calculado automaticamente: ${generatedTickets.length} jogos × R$ 3,50 = R$ ${(
              generatedTickets.length * VALOR_APOSTA_LOTOFACIL
            ).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
            onGoToGamesManager={
              onGoToGamesManager
                ? () => onGoToGamesManager(generatedTickets, getCurrentExportMeta())
                : undefined
            }
          />

          {/* Feedback de Filtro Ativo do Monitoramento */}
          {fechamentoFilter !== 'all' && (
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200">
              <span className="flex items-center gap-1.5 font-medium">
                <Filter className="w-3.5 h-3.5 text-amber-400" />
                <span>
                  Filtro do Monitoramento: Exibindo {displayedTickets.length} de {generatedTickets.length} fechamentos
                  {fechamentoFilter === 'improbable' ? ' com padrão improvável' : ` (${fechamentoFilter})`}
                </span>
              </span>
              <button
                type="button"
                onClick={() => setFechamentoFilter('all')}
                className="underline text-amber-300 font-bold hover:text-white transition cursor-pointer"
              >
                Limpar Filtro e Ver Todos os Fechamentos
              </button>
            </div>
          )}

          {/* Tickets List */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[600px] overflow-y-auto pr-1">
            {displayedTickets.map((ticket) => (
              <div
                key={ticket.id}
                className="bg-slate-950/70 rounded-xl border border-slate-800/90 p-3.5 hover:border-slate-700 transition"
              >
                {/* Header of Ticket */}
                <div className="flex items-center justify-between text-xs mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-white bg-slate-800 px-2 py-0.5 rounded text-[11px]">
                      Bilhete #{ticket.index.toString().padStart(2, '0')}
                    </span>
                    <span className="text-[10px] text-emerald-400 font-mono">
                      IA Score: {ticket.scoreIA}%
                    </span>
                  </div>

                  <button
                    onClick={() => handleCopyTicket(ticket)}
                    className="text-slate-400 hover:text-white p-1 rounded transition cursor-pointer"
                    title="Copiar dezenas deste jogo"
                  >
                    {copiedTicketId === ticket.id ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>

                {/* Number Balls */}
                <div className="flex flex-wrap gap-1.5 my-2.5">
                  {ticket.dezenas.map((num) => {
                    const isKey = num === 17 || num === 22;
                    return (
                      <span
                        key={num}
                        className={`inline-flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-lg font-mono text-xs font-bold transition shadow-sm ${
                          isKey
                            ? 'bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 ring-1 ring-amber-300'
                            : 'bg-gradient-to-br from-slate-800 to-slate-900 text-slate-100 border border-slate-700'
                        }`}
                      >
                        {num.toString().padStart(2, '0')}
                      </span>
                    );
                  })}
                </div>

                {/* Analytical Tags */}
                <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-slate-400 pt-2 border-t border-slate-850">
                  <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                    {ticket.pares}P / {ticket.impares}I
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-purple-950/40 text-purple-300 font-mono border border-purple-500/20">
                    {ticket.primos} Primos
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-amber-950/40 text-amber-300 font-mono border border-amber-500/20">
                    {ticket.moldura} Moldura
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-cyan-950/40 text-cyan-300 font-mono border border-cyan-500/20">
                    {ticket.fibonacci} Fibo
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                    Soma: {ticket.soma}
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                    {ticket.repetidas} Rep. #{latestDraw.concurso}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {/* Modal de Histórico de Auto-Save (Últimas 10 Gerações) */}
      {isAutoSaveModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-bold text-white">
                  Histórico de Auto-Save (Últimas 10 Gerações)
                </h3>
              </div>
              <button
                onClick={() => setIsAutoSaveModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400">
              O LotoSniper armazena automaticamente no seu navegador (localStorage) as últimas 10 gerações. Clique em &quot;Restaurar Matriz&quot; para recuperar imediatamente as dezenas, os filtros e todos os bilhetes gerados.
            </p>

            <div className="space-y-2.5">
              {autoSaveHistory.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-xs">
                  Nenhuma matriz armazenada ainda. Gere um fechamento para salvar automaticamente.
                </div>
              ) : (
                autoSaveHistory.map((item, idx) => (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-indigo-500/50 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <strong className="text-white font-mono">
                          Geração #{idx + 1} ({item.dateStr})
                        </strong>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                          {item.generationType === 'fibonacci' ? 'Sequência Fibonacci' : `Matriz ${item.targetCount} Dezenas`}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {item.ticketsCount} bilhetes
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono mt-1">
                        Dezenas: {item.selectedNumbers.slice(0, 10).map((n: number) => n.toString().padStart(2, '0')).join(', ')}...
                        <span className="ml-2 text-emerald-400">
                          (Soma: {item.filters.somaMin}–{item.filters.somaMax}, Pares: {item.filters.paresMin}–{item.filters.paresMax})
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRestoreGeneration(item)}
                      className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition cursor-pointer shrink-0"
                    >
                      Restaurar Matriz
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-between items-center text-xs text-slate-400">
              <span>{autoSaveHistory.length} de 10 slots utilizados</span>
              {autoSaveHistory.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setAutoSaveHistory([]);
                    localStorage.removeItem('lotosniper_matrix_autosave');
                  }}
                  className="text-rose-400 hover:underline cursor-pointer"
                >
                  Limpar Histórico
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL DO GERADOR TURBO (FORÇA BRUTA 14 PONTOS EM WEB WORKER) */}
      <TurboGeneratorModal
        isOpen={isTurboModalOpen}
        onClose={() => setIsTurboModalOpen(false)}
        selectedNumbers={selectedNumbers}
        fixedNumbers={fixedNumbers}
        excludedNumbers={excludedNumbers}
        latestDraw={latestDraw}
        onApplyTickets={handleApplyTurbo}
      />
    </div>
  );
};
