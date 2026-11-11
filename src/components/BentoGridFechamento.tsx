import React from 'react';
import {
  Zap,
  Sparkles,
  Flame,
  ShieldCheck,
  Download,
  Printer,
  FileSpreadsheet,
  FileText,
  Play,
  Sliders,
  Check,
  Copy,
  Layers,
  ArrowRight,
  Shield,
  Activity,
  Award,
} from 'lucide-react';
import { FilterCriteria, FechamentoPreset, GameTicket } from '../types/lotofacil';
import { VALOR_APOSTA_LOTOFACIL } from '../services/combinatorics';

interface BentoGridFechamentoProps {
  // Estado e seleções
  targetCount: number;
  selectedNumbers: number[];
  fixedNumbers: number[];
  preset: FechamentoPreset;
  filters: FilterCriteria;
  isGenerating: boolean;

  // Ações do Gerador Turbo
  onOpenTurboModal: () => void;

  // Ações da Matriz Estratificada
  onGenerateEstratificada: () => void;
  onSelectPreset: (preset: 'conservador' | 'balanceado' | 'agressivo' | 'anti_cisne_negro') => void;
  activePreset: 'conservador' | 'balanceado' | 'agressivo' | 'anti_cisne_negro';

  // Ações de Filtros / Motores Rápido
  onGeneratePonderado: () => void;
  onGenerateFibonacci: () => void;
  onGeneratePrimary: () => void;

  // Opções de Exportação
  hasGeneratedTickets: boolean;
  generatedTicketsCount: number;
  onExportPDF: () => void;
  onExportCartoesPDF: () => void;
  onExportCSV: () => void;
  onDownloadTXT: () => void;
  onExportCologa: () => void;
  onOpenPrintVolantesModal: () => void;
  onGoToSimulator?: () => void;
  onCopyTXT?: () => void;
}

export const BentoGridFechamento: React.FC<BentoGridFechamentoProps> = ({
  targetCount,
  selectedNumbers,
  fixedNumbers,
  preset,
  filters,
  isGenerating,
  onOpenTurboModal,
  onGenerateEstratificada,
  onSelectPreset,
  activePreset,
  onGeneratePonderado,
  onGenerateFibonacci,
  onGeneratePrimary,
  hasGeneratedTickets,
  generatedTicketsCount,
  onExportPDF,
  onExportCartoesPDF,
  onExportCSV,
  onDownloadTXT,
  onExportCologa,
  onOpenPrintVolantesModal,
  onGoToSimulator,
  onCopyTXT,
}) => {
  const isProntoParaGerar = selectedNumbers.length === targetCount && !isGenerating;
  const faltamDezenas = Math.max(0, targetCount - selectedNumbers.length);
  const custoTotal = preset.jogosMaximos * VALOR_APOSTA_LOTOFACIL;

  return (
    <div className="space-y-4">
      {/* Cabeçalho da Seção */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <Layers className="w-4 h-4" />
          </span>
          <h3 className="text-xs sm:text-sm font-black text-white tracking-wide uppercase">
            Painel Bento Grid de Motores, Filtros &amp; Exportação
          </h3>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-bold">
            100% RESPONSIVO
          </span>
        </div>
        <span className="text-[11px] text-slate-400">
          Controles agrupados em sub-seções estruturadas para desktop e mobile
        </span>
      </div>

      {/* Grid Principal Bento (Layout Responsivo de 4 Sub-seções) */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* ================================================================= */}
        {/* SUB-SEÇÃO 1: CONTROLES DO GERADOR TURBO                           */}
        {/* ================================================================= */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col justify-between space-y-3.5">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <Zap className="w-4 h-4 fill-current" />
                </span>
                <div>
                  <h4 className="text-xs font-black text-white uppercase tracking-tight">
                    Gerador Turbo
                  </h4>
                  <span className="text-[10px] text-slate-400 block font-medium">
                    Web Worker Paralelo
                  </span>
                </div>
              </div>
              <span className="text-[10px] font-mono font-black px-2 py-0.5 rounded-full bg-emerald-400 text-slate-950 shadow-sm">
                &lt; 2s • 60 FPS
              </span>
            </div>

            <p className="text-[11px] text-slate-300 mt-2.5 font-medium leading-relaxed">
              Força bruta combinatória com garantia matemática de 14 pontos rodando fora da main thread sem nenhum travamento.
            </p>

            <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
              <div className="p-2 rounded-xl bg-slate-950/80 border border-slate-800">
                <span className="text-[9px] text-slate-400 block font-bold uppercase">Garantia</span>
                <span className="font-mono font-black text-emerald-400 text-xs">14 se 15</span>
              </div>
              <div className="p-2 rounded-xl bg-slate-950/80 border border-slate-800">
                <span className="text-[9px] text-slate-400 block font-bold uppercase">Latência</span>
                <span className="font-mono font-black text-cyan-300 text-xs">&lt; 1.800 ms</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenTurboModal}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-black text-xs bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-500 hover:from-emerald-300 hover:to-teal-300 text-slate-950 shadow-lg shadow-emerald-500/25 active:scale-[0.98] transition cursor-pointer"
          >
            <Zap className="w-4 h-4 fill-current" />
            <span>Abrir Gerador Turbo (14 Pts)</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* ================================================================= */}
        {/* SUB-SEÇÃO 2: CONFIGURAÇÃO DA MATRIZ ESTRATIFICADA (ANTI-CISNE)   */}
        {/* ================================================================= */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col justify-between space-y-3.5">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  <ShieldCheck className="w-4 h-4" />
                </span>
                <div>
                  <h4 className="text-xs font-black text-white uppercase tracking-tight">
                    Matriz Estratificada
                  </h4>
                  <span className="text-[10px] text-amber-400 block font-medium">
                    Anti-Cisne Negro (75/15/10%)
                  </span>
                </div>
              </div>
              <span className="text-[10px] font-mono font-black px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 shadow-sm">
                PRO • #3825
              </span>
            </div>

            <p className="text-[11px] text-slate-300 mt-2.5 font-medium leading-relaxed">
              Distribui os bilhetes em 3 estratos para capturar sorteios de baixa soma (155–179) e sequências longas como no Concurso #3825.
            </p>

            {/* As 3 Faixas de Estratificação */}
            <div className="space-y-1.5 mt-2.5 text-[10px] font-mono">
              <div className="flex items-center justify-between p-1.5 rounded-lg bg-slate-950/80 border border-slate-800 text-emerald-300">
                <span>75% Zona de Ouro:</span>
                <strong>Soma 180–215</strong>
              </div>
              <div className="flex items-center justify-between p-1.5 rounded-lg bg-slate-950/80 border border-slate-800 text-cyan-300">
                <span>15% Cauda Baixa:</span>
                <strong>Soma 155–179 (&gt;7 seq)</strong>
              </div>
              <div className="flex items-center justify-between p-1.5 rounded-lg bg-slate-950/80 border border-slate-800 text-amber-300">
                <span>10% Cauda Alta:</span>
                <strong>Soma 216–230</strong>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onGenerateEstratificada}
            disabled={selectedNumbers.length < targetCount || isGenerating}
            className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-black text-xs bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-yellow-300 text-slate-950 shadow-lg shadow-amber-500/25 active:scale-[0.98] transition cursor-pointer ${
              selectedNumbers.length < targetCount || isGenerating ? 'opacity-60 cursor-not-allowed' : ''
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Gerar Matriz Estratificada</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* ================================================================= */}
        {/* SUB-SEÇÃO 3: FILTROS CANÔNICOS & PRESETS RÁPIDOS                  */}
        {/* ================================================================= */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col justify-between space-y-3.5">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-purple-500/20 text-purple-400 border border-purple-500/30">
                  <Sliders className="w-4 h-4" />
                </span>
                <div>
                  <h4 className="text-xs font-black text-white uppercase tracking-tight">
                    Filtros Canônicos
                  </h4>
                  <span className="text-[10px] text-slate-400 block font-medium">
                    Limites Estatísticos
                  </span>
                </div>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 font-bold">
                ATIVOS
              </span>
            </div>

            {/* Chips de Resumo dos Filtros Ativos */}
            <div className="grid grid-cols-2 gap-1.5 mt-2.5 text-[10px] font-mono">
              <div className="p-1.5 rounded-lg bg-slate-950/80 border border-slate-800 text-slate-300">
                Soma: <strong className="text-emerald-400">{filters.somaMin}–{filters.somaMax}</strong>
              </div>
              <div className="p-1.5 rounded-lg bg-slate-950/80 border border-slate-800 text-slate-300">
                Pares: <strong className="text-cyan-400">{filters.paresMin}–{filters.paresMax}P</strong>
              </div>
              <div className="p-1.5 rounded-lg bg-slate-950/80 border border-slate-800 text-slate-300">
                Primos: <strong className="text-amber-400">{filters.primosMin}–{filters.primosMax}</strong>
              </div>
              <div className="p-1.5 rounded-lg bg-slate-950/80 border border-slate-800 text-slate-300">
                Moldura: <strong className="text-purple-400">{filters.molduraMin}–{filters.molduraMax}</strong>
              </div>
            </div>

            {/* Presets Rápidos */}
            <div className="grid grid-cols-2 gap-1.5 mt-2.5">
              <button
                type="button"
                onClick={() => onSelectPreset('conservador')}
                className={`px-2 py-1.5 rounded-lg text-[10px] font-bold border transition cursor-pointer text-left ${
                  activePreset === 'conservador'
                    ? 'bg-emerald-500/25 border-emerald-400 text-emerald-300 font-black'
                    : 'bg-slate-950 hover:bg-slate-800 border-slate-800 text-slate-400'
                }`}
              >
                🛡️ Conservador
              </button>
              <button
                type="button"
                onClick={() => onSelectPreset('balanceado')}
                className={`px-2 py-1.5 rounded-lg text-[10px] font-bold border transition cursor-pointer text-left ${
                  activePreset === 'balanceado'
                    ? 'bg-cyan-500/25 border-cyan-400 text-cyan-300 font-black'
                    : 'bg-slate-950 hover:bg-slate-800 border-slate-800 text-slate-400'
                }`}
              >
                ⚖️ Balanceado
              </button>
            </div>
          </div>

          {/* Botões dos outros motores */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onGenerateFibonacci}
              disabled={isGenerating}
              className="flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl font-bold text-[11px] bg-slate-800 hover:bg-slate-700 text-sky-300 border border-sky-500/30 transition cursor-pointer"
              title="5 Jogos baseados em Fibonacci e Regra de Ouro"
            >
              <Sparkles className="w-3.5 h-3.5 text-sky-400 shrink-0" />
              <span>Fibonacci (5)</span>
            </button>
            <button
              type="button"
              onClick={onGeneratePonderado}
              disabled={selectedNumbers.length < targetCount || isGenerating}
              className="flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl font-bold text-[11px] bg-slate-800 hover:bg-slate-700 text-purple-300 border border-purple-500/30 transition cursor-pointer disabled:opacity-50"
              title="Pondera frequência x atraso nas 50 apurações"
            >
              <Flame className="w-3.5 h-3.5 text-purple-400 shrink-0 fill-current" />
              <span>Ponderado</span>
            </button>
          </div>
        </div>

        {/* ================================================================= */}
        {/* SUB-SEÇÃO 4: CENTRAL DE EXPORTAÇÃO & DOSSIÊ TÉCNICO               */}
        {/* ================================================================= */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col justify-between space-y-3.5">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-sky-500/20 text-sky-400 border border-sky-500/30">
                  <Download className="w-4 h-4" />
                </span>
                <div>
                  <h4 className="text-xs font-black text-white uppercase tracking-tight">
                    Central de Exportação
                  </h4>
                  <span className="text-[10px] text-slate-400 block font-medium">
                    Dossiês Oficiais da Caixa
                  </span>
                </div>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30 font-bold">
                {hasGeneratedTickets ? `${generatedTicketsCount} JOGOS` : 'PRONTO'}
              </span>
            </div>

            <p className="text-[11px] text-slate-300 mt-2.5 font-medium leading-relaxed">
              Exporte seus bilhetes em múltiplos formatos oficiais prontos para conferência, bolões ou impressão de volantes.
            </p>

            {/* Botões de Ação de Exportação (Grid 2 Colunas Mobile / Desktop) */}
            <div className="grid grid-cols-2 gap-2 mt-3">
              <button
                type="button"
                onClick={onExportPDF}
                disabled={!hasGeneratedTickets}
                className="flex items-center justify-center gap-1.5 p-2 rounded-xl bg-slate-950/80 hover:bg-slate-800 border border-slate-700 text-slate-200 text-[11px] font-bold transition cursor-pointer disabled:opacity-50"
                title="Baixar dossiê executivo em PDF"
              >
                <FileText className="w-3.5 h-3.5 text-rose-400" />
                <span>Dossiê PDF</span>
              </button>

              <button
                type="button"
                onClick={onExportCartoesPDF}
                disabled={!hasGeneratedTickets}
                className="flex items-center justify-center gap-1.5 p-2 rounded-xl bg-slate-950/80 hover:bg-slate-800 border border-slate-700 text-slate-200 text-[11px] font-bold transition cursor-pointer disabled:opacity-50"
                title="Imprimir cartões no grid 5x5 oficial"
              >
                <Printer className="w-3.5 h-3.5 text-amber-400" />
                <span>Cartões 5×5</span>
              </button>

              <button
                type="button"
                onClick={onExportCSV}
                disabled={!hasGeneratedTickets}
                className="flex items-center justify-center gap-1.5 p-2 rounded-xl bg-slate-950/80 hover:bg-slate-800 border border-slate-700 text-slate-200 text-[11px] font-bold transition cursor-pointer disabled:opacity-50"
                title="Exportar planilha CSV compatível com Excel"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                <span>Planilha CSV</span>
              </button>

              <button
                type="button"
                onClick={onDownloadTXT}
                disabled={!hasGeneratedTickets}
                className="flex items-center justify-center gap-1.5 p-2 rounded-xl bg-slate-950/80 hover:bg-slate-800 border border-slate-700 text-slate-200 text-[11px] font-bold transition cursor-pointer disabled:opacity-50"
                title="Baixar arquivo TXT"
              >
                <Download className="w-3.5 h-3.5 text-cyan-400" />
                <span>Baixar TXT</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenPrintVolantesModal}
              disabled={!hasGeneratedTickets}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-indigo-300 border border-indigo-500/30 font-bold text-[10px] transition cursor-pointer disabled:opacity-50"
            >
              <Printer className="w-3 h-3" />
              <span>Cédula Caixa</span>
            </button>

            {onGoToSimulator && (
              <button
                type="button"
                onClick={onGoToSimulator}
                disabled={!hasGeneratedTickets}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 font-bold text-[10px] transition cursor-pointer disabled:opacity-50"
              >
                <Play className="w-3 h-3 text-emerald-400" />
                <span>Simulador</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Barra de Resumo Fixa e Botão Primário de Disparo */}
      <div className="bg-slate-950/95 border-2 border-emerald-500/40 backdrop-blur-xl rounded-2xl p-4 shadow-2xl flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
            <span className="text-[10px] text-slate-400 block font-medium">Universo Escolhido</span>
            <span className="font-mono font-bold text-white text-xs sm:text-sm">
              {selectedNumbers.length} / {targetCount} dezenas
            </span>
          </div>

          <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
            <span className="text-[10px] text-slate-400 block font-medium">Dezenas Fixas</span>
            <span className="font-mono font-bold text-cyan-300 text-xs sm:text-sm">
              {fixedNumbers.length} dezenas
            </span>
          </div>

          <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
            <span className="text-[10px] text-slate-400 block font-medium">Matriz Alvo</span>
            <span className="font-mono font-bold text-emerald-400 text-xs sm:text-sm">
              {preset.jogosMaximos} Jogos ({preset.garantia})
            </span>
          </div>

          <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
            <span className="text-[10px] text-slate-400 block font-medium">Investimento Oficial</span>
            <span className="font-mono font-bold text-amber-300 text-xs sm:text-sm">
              R$ {custoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={onGeneratePrimary}
          disabled={!isProntoParaGerar}
          className={`flex items-center justify-center gap-3 px-6 py-4 rounded-xl font-black text-xs sm:text-sm tracking-wide transition-all shadow-xl cursor-pointer whitespace-nowrap shrink-0 ${
            isProntoParaGerar
              ? 'bg-gradient-to-r from-emerald-400 via-emerald-500 to-teal-400 hover:from-emerald-300 hover:to-teal-300 text-slate-950 shadow-emerald-500/30 hover:shadow-emerald-500/50 hover:scale-[1.02] active:scale-[0.98]'
              : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-60'
          }`}
        >
          {isGenerating ? (
            <>
              <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
              <span>PROCESSANDO MATRIZ COMBINATÓRIA...</span>
            </>
          ) : (
            <>
              <Zap className="w-4 h-4 fill-current" />
              <span>
                {isProntoParaGerar
                  ? `PROCESSAR & GERAR ${preset.jogosMaximos} JOGOS`
                  : `SELECIONE MAIS ${faltamDezenas} DEZENA(S)`}
              </span>
              <Sparkles className="w-3.5 h-3.5" />
            </>
          )}
        </button>
      </div>
    </div>
  );
};
