import React, { useState } from 'react';
import {
  FechamentoMode,
  FilterCriteria,
  GameTicket,
  AIPredictionResponse,
  LotofacilDraw,
  DezenaStats,
} from '../types/lotofacil';
import { CONCURSO_ATUAL, DEZENAS_STATS } from '../data/lotofacilData';
import { VolanteSelector } from './VolanteSelector';
import { FilterControls } from './FilterControls';
import {
  FECHAMENTO_PRESETS,
  generateFechamentoCovering,
  DEFAULT_FILTERS,
  buildOptimalPool,
  buildOptimal18Pool,
  VALOR_APOSTA_LOTOFACIL,
} from '../services/combinatorics';
import { TotalizadorDeCustos } from './TotalizadorDeCustos';
import { ModuloConferenciaJogos } from './ModuloConferenciaJogos';
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
} from 'lucide-react';

interface FechamentoTabProps {
  latestDraw: LotofacilDraw;
  dynamicStats?: DezenaStats[];
  cyclePendingNumbers?: number[];
  aiPrediction: AIPredictionResponse | null;
  onSaveTickets: (tickets: GameTicket[]) => void;
  onGoToSimulator: (tickets: GameTicket[]) => void;
  isAILoading: boolean;
}

export const FechamentoTab: React.FC<FechamentoTabProps> = ({
  latestDraw = CONCURSO_ATUAL,
  dynamicStats = DEZENAS_STATS,
  cyclePendingNumbers = [17, 22],
  aiPrediction,
  onSaveTickets,
  onGoToSimulator,
  isAILoading,
}) => {
  const [mode, setMode] = useState<FechamentoMode>('18_14_15');
  const preset = FECHAMENTO_PRESETS[mode];
  const targetCount = preset.dezenasNecessarias;

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
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationTimeMs, setGenerationTimeMs] = useState<number | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedTicketId, setCopiedTicketId] = useState<string | null>(null);
  const [documentMessage, setDocumentMessage] = useState<string | null>(null);

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

  const handleGenerate = () => {
    setIsGenerating(true);
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

        setGeneratedTickets(tickets);
        onSaveTickets(tickets);
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

  return (
    <div className="space-y-6">
      {/* Introduction Hero Card */}
      <div className="bg-gradient-to-r from-slate-900 via-emerald-950/40 to-slate-900 rounded-2xl border border-emerald-500/20 p-5 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold mb-2.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Garantia Matemática Comprovada</span>
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

      {/* Mode Selection Carousel */}
      <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-4 shadow-xl">
        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2.5">
          Selecione a Estratégia de Fechamento:
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
          {(Object.keys(FECHAMENTO_PRESETS) as FechamentoMode[]).map((key) => {
            const p = FECHAMENTO_PRESETS[key];
            const isSelected = mode === key;
            const custoFechamento = p.jogosMaximos * VALOR_APOSTA_LOTOFACIL;
            return (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setMode(key);
                  // Adjust number selection count if needed
                  if (selectedNumbers.length < p.dezenasNecessarias) {
                    const pool = [1, 2, 3, 4, 5, 7, 8, 9, 10, 11, 12, 13, 14, 15, 17, 19, 20, 21, 22, 24, 25];
                    setSelectedNumbers(pool.slice(0, p.dezenasNecessarias));
                  } else if (selectedNumbers.length > p.dezenasNecessarias) {
                    setSelectedNumbers(selectedNumbers.slice(0, p.dezenasNecessarias));
                  }
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

      {/* Totalizador de Custos - Cálculo Automático do Investimento */}
      <TotalizadorDeCustos
        preset={preset}
        mode={mode}
        targetCount={targetCount}
        totalJogos={generatedTickets.length || preset.jogosMaximos}
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
        onClear={() => {
          setSelectedNumbers([]);
          setFixedNumbers([]);
          setExcludedNumbers([]);
        }}
        targetCount={targetCount}
      />

      {/* 1. FILTROS MATEMÁTICOS & RESTRIÇÕES CANÔNICAS (LOGO APÓS O VOLANTE OFICIAL INTERATIVO 5×5) */}
      <FilterControls
        filters={filters}
        onChange={setFilters}
        onReset={() => setFilters(DEFAULT_FILTERS)}
      />

      {/* 2. PRONTO PARA PROCESSAR A MATRIZ? (EM DESTAQUE COM DESIGN APRIMORADO) */}
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

          {/* Action Row & Process Button */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-1">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                Algoritmo de cobertura combinatorial com eliminação de desvios e matriz comprovada de 14 pontos.
              </span>
            </div>

            <button
              onClick={handleGenerate}
              disabled={selectedNumbers.length < targetCount || isGenerating}
              className={`flex items-center justify-center gap-3 px-8 py-4 rounded-xl font-black text-sm tracking-wide transition-all shadow-xl cursor-pointer ${
                selectedNumbers.length === targetCount && !isGenerating
                  ? 'bg-gradient-to-r from-emerald-400 via-emerald-500 to-teal-400 hover:from-emerald-300 hover:to-teal-300 text-slate-950 shadow-emerald-500/30 hover:shadow-emerald-500/50 hover:scale-[1.02] active:scale-[0.98]'
                  : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-60'
              }`}
            >
              {isGenerating ? (
                <>
                  <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  <span>PROCESSANDO COMBINAÇÕES...</span>
                </>
              ) : (
                <>
                  <Zap className="w-5 h-5 fill-current" />
                  <span>
                    {selectedNumbers.length === targetCount
                      ? `PROCESSAR & GERAR ${preset.jogosMaximos} JOGOS OTIMIZADOS`
                      : `SELECIONE MAIS ${targetCount - selectedNumbers.length} DEZENA(S) NO VOLANTE`}
                  </span>
                  <Sparkles className="w-4 h-4 text-slate-950" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Generated Games Table Display */}
      {generatedTickets.length > 0 && (
        <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-5 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-slate-800 gap-3">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-emerald-400" />
                  <span>Matriz Gerada: {generatedTickets.length} Bilhetes Otimizados</span>
                </h3>
                {generationTimeMs !== null && (
                  <span className="text-[11px] text-slate-500 font-mono">
                    ({generationTimeMs}ms)
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
                Todos os bilhetes atendem estritamente aos filtros matemáticos e à garantia de{' '}
                {preset.garantia}.
              </p>
            </div>

            <div className="flex items-center gap-2">
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
                onClick={() => onGoToSimulator(generatedTickets)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-semibold transition cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 text-emerald-400" />
                <span>Simular no Histórico Caixa</span>
              </button>
            </div>
          </div>

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
          />

          {/* Tickets List */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[600px] overflow-y-auto pr-1">
            {generatedTickets.map((ticket) => (
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

      {/* Módulo de Conferência Oficial de Jogos para conferência dos bilhetes gerados */}
      {generatedTickets.length > 0 && (
        <div className="pt-2">
          <ModuloConferenciaJogos
            latestDraw={latestDraw}
            generatedTickets={generatedTickets}
          />
        </div>
      )}
    </div>
  );
};
