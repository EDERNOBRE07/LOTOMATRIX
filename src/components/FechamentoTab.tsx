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

      {/* Módulo de Conferência Oficial de Jogos (Colocado após o Volante Oficial Interativo 5×5) */}
      <ModuloConferenciaJogos
        latestDraw={latestDraw}
        generatedTickets={generatedTickets}
      />

      {/* Filter Constraints Panel */}
      <FilterControls
        filters={filters}
        onChange={setFilters}
        onReset={() => setFilters(DEFAULT_FILTERS)}
      />

      {/* Generate Call to Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-900 rounded-2xl border border-slate-800 p-5 shadow-xl">
        <div>
          <div className="text-white font-bold text-base flex items-center gap-2">
            <span>Pronto para processar a Matriz?</span>
            {selectedNumbers.length === targetCount ? (
              <span className="text-emerald-400 text-xs font-normal">
                ✓ {targetCount} dezenas selecionadas
              </span>
            ) : (
              <span className="text-amber-400 text-xs font-normal">
                ⚠ Selecione {targetCount - selectedNumbers.length} dezena(s) para completar
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            O motor combinatório irá podar ramos inválidos e gerar os {preset.jogosMaximos} jogos
            otimizados.
          </p>
        </div>

        <button
          onClick={handleGenerate}
          disabled={selectedNumbers.length < targetCount || isGenerating}
          className={`flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-bold text-sm tracking-wide transition shadow-lg cursor-pointer ${
            selectedNumbers.length === targetCount && !isGenerating
              ? 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 shadow-emerald-500/25 active:scale-95'
              : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-60'
          }`}
        >
          {isGenerating ? (
            <>
              <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
              <span>Processando Combinações...</span>
            </>
          ) : (
            <>
              <Zap className="w-4 h-4 fill-current" />
              <span>GERAR {preset.jogosMaximos} JOGOS OTIMIZADOS</span>
            </>
          )}
        </button>
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
    </div>
  );
};
