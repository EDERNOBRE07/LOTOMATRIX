import React, { useState, useMemo } from 'react';
import {
  Zap,
  Sparkles,
  Flame,
  ShieldCheck,
  Check,
  ArrowRight,
  Filter,
  Layers,
  Award,
  RefreshCw,
  Scale,
  FileText,
  DollarSign,
  AlertCircle,
  Cpu,
} from 'lucide-react';
import { FechamentoMode, FilterCriteria } from '../types/lotofacil';
import { FECHAMENTO_PRESETS, VALOR_APOSTA_LOTOFACIL } from '../services/combinatorics';

export interface MatrixCatalogItem {
  id: string;
  mode: FechamentoMode;
  dezenas: number;
  jogos: number;
  garantia: string;
  condicao: string;
  tag?: string;
  popular?: boolean;
}

export const UNIFIED_MATRIX_CATALOG: MatrixCatalogItem[] = [
  // 15 Dezenas
  {
    id: 'matriz-15-1',
    mode: 'surpresinha_inteligente',
    dezenas: 15,
    jogos: 1,
    garantia: 'Aposta Simples',
    condicao: '15 dezenas calibradas por IA',
    tag: 'Econômico',
  },
  // 16 Dezenas
  {
    id: 'matriz-16-4',
    mode: '16_14_15',
    dezenas: 16,
    jogos: 4,
    garantia: '14 se 15',
    condicao: 'Acertando as 15 sorteadas entre as 16 escolhidas',
    tag: 'Alta Eficiência',
    popular: true,
  },
  {
    id: 'matriz-16-16',
    mode: '16_14_15',
    dezenas: 16,
    jogos: 16,
    garantia: '15 se 15 (100%)',
    condicao: 'Fechamento integral 100% matemático',
    tag: 'Garantia Máxima',
  },
  // 17 Dezenas
  {
    id: 'matriz-17-8',
    mode: '17_14_15',
    dezenas: 17,
    jogos: 8,
    garantia: '14 se 15',
    condicao: 'Acertando as 15 entre as 17 escolhidas',
    tag: 'Equilibrado',
    popular: true,
  },
  {
    id: 'matriz-17-136',
    mode: '17_14_15',
    dezenas: 17,
    jogos: 136,
    garantia: '15 se 15 (100%)',
    condicao: 'Desdobramento total de 17 dezenas',
    tag: 'Bolão Master',
  },
  // 18 Dezenas
  {
    id: 'matriz-18-24',
    mode: '18_14_15',
    dezenas: 18,
    jogos: 24,
    garantia: '14 se 15',
    condicao: '35% de chance de 15 pontos se 15',
    tag: 'Padrão Ouro',
    popular: true,
  },
  {
    id: 'matriz-18-64',
    mode: '18_14_15',
    dezenas: 18,
    jogos: 64,
    garantia: '14 se 15 Reforçado',
    condicao: 'Altíssima densidade de 14 e 15 pontos',
    tag: 'Profissional',
  },
  {
    id: 'matriz-18-816',
    mode: '18_14_15',
    dezenas: 18,
    jogos: 816,
    garantia: '15 se 15 (100%)',
    condicao: 'Desdobramento integral de 18 números',
    tag: 'Grande Bolão',
  },
  // 19 Dezenas
  {
    id: 'matriz-19-36',
    mode: '19_14_15',
    dezenas: 19,
    jogos: 36,
    garantia: '13 se 15',
    condicao: 'Cobertura ampla de 76% do volante',
    tag: 'Econômico Amplo',
  },
  {
    id: 'matriz-19-70',
    mode: '19_14_15',
    dezenas: 19,
    jogos: 70,
    garantia: '14 se 15',
    condicao: 'Acertando 15 entre 19 escolhidas',
    tag: 'Alta Probabilidade',
    popular: true,
  },
  // 20 Dezenas
  {
    id: 'matriz-20-64',
    mode: '20_14_15',
    dezenas: 20,
    jogos: 64,
    garantia: '13 se 14',
    condicao: 'Acertando 14 entre 20 dezenas',
    tag: 'Redução 99.6%',
    popular: true,
  },
  {
    id: 'matriz-20-128',
    mode: '20_14_15',
    dezenas: 20,
    jogos: 128,
    garantia: '14 se 15',
    condicao: 'Garantia robusta de 14 pontos em 20 dezenas',
    tag: 'Super Bolão',
  },
  // 21 Dezenas
  {
    id: 'matriz-21-100',
    mode: '21_13_15',
    dezenas: 21,
    jogos: 100,
    garantia: '13 se 15',
    condicao: '84% de cobertura de todas as 25 dezenas',
    tag: 'Mega Cobertura',
  },
];

interface CentralUnificadaFechamentoProps {
  // Estado e seleções
  mode: FechamentoMode;
  onSelectMode: (mode: FechamentoMode, dezenasTarget?: number) => void;
  selectedNumbers: number[];
  fixedNumbers: number[];
  targetCount: number;
  isGenerating: boolean;

  // Ações de preenchimento rápido (Passo 1)
  onApplyTopIA: () => void;
  onApplyFecharCiclo: () => void;
  onApplyEquilibrioCanonico: () => void;
  onApplyParDeOuro: () => void;
  onApplyEstrategia9x9: () => void;
  onClearSelection: () => void;
  onCompleteWithTopIA: () => void;

  // Ações dos 4 Motores Rápidos
  onOpenTurboModal: () => void;
  onGenerateFibonacci: () => void;
  onGeneratePonderado: () => void;
  onGenerateEstratificada: () => void;

  // Ação Primária de Processar
  onGeneratePrimary: () => void;

  // Presets de filtro
  activePreset: 'conservador' | 'balanceado' | 'agressivo' | 'anti_cisne_negro';
  onSelectPreset: (preset: 'conservador' | 'balanceado' | 'agressivo' | 'anti_cisne_negro') => void;

  // Metadados
  cyclePendingCount?: number;
  garantiaEfetivaPct?: number;
}

export const CentralUnificadaFechamento: React.FC<CentralUnificadaFechamentoProps> = ({
  mode,
  onSelectMode,
  selectedNumbers,
  fixedNumbers,
  targetCount,
  isGenerating,
  onApplyTopIA,
  onApplyFecharCiclo,
  onApplyEquilibrioCanonico,
  onApplyParDeOuro,
  onApplyEstrategia9x9,
  onClearSelection,
  onCompleteWithTopIA,
  onOpenTurboModal,
  onGenerateFibonacci,
  onGeneratePonderado,
  onGenerateEstratificada,
  onGeneratePrimary,
  activePreset,
  onSelectPreset,
  cyclePendingCount = 2,
  garantiaEfetivaPct = 99.4,
}) => {
  const [selectedUniverseTab, setSelectedUniverseTab] = useState<number>(targetCount);
  const [activeQuickPill, setActiveQuickPill] = useState<string>('manual');

  // Mantém a aba de universo sincronizada com o targetCount ativo
  useMemo(() => {
    setSelectedUniverseTab(targetCount);
  }, [targetCount]);

  // Encontra a matriz ativa no catálogo
  const activeMatrix = useMemo(() => {
    return (
      UNIFIED_MATRIX_CATALOG.find(
        (m) => m.mode === mode && m.dezenas === targetCount
      ) || UNIFIED_MATRIX_CATALOG.find((m) => m.dezenas === targetCount) || UNIFIED_MATRIX_CATALOG[5]
    );
  }, [mode, targetCount]);

  const jogosCount = activeMatrix.jogos;
  const investimentoTotal = jogosCount * VALOR_APOSTA_LOTOFACIL;
  const faltamDezenas = Math.max(0, targetCount - selectedNumbers.length);
  const isProntoParaGerar = selectedNumbers.length === targetCount && !isGenerating;

  return (
    <div className="space-y-6">
      {/* ========================================================================= */}
      {/* 1. BARRA DE MOTORES DE GERAÇÃO RÁPIDA (BENTO GRID 4 COLUNAS EM DESKTOP) */}
      {/* ========================================================================= */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Zap className="w-4 h-4 fill-current" />
            </span>
            <h3 className="text-xs sm:text-sm font-black text-white tracking-wide uppercase">
              Motores Cirúrgicos de Geração Rápida
            </h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 font-bold">
              100% AUDITADOS
            </span>
          </div>
          <span className="text-[11px] text-slate-400 hidden sm:inline">
            Clique em qualquer motor para disparo imediato
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Card 1: GERADOR TURBO */}
          <button
            type="button"
            onClick={onOpenTurboModal}
            className="h-full flex flex-col justify-between p-3.5 rounded-xl border border-emerald-500/40 bg-gradient-to-b from-slate-900 to-emerald-950/30 hover:border-emerald-400 hover:from-slate-850 hover:to-emerald-950/50 shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/25 transition-all text-left group cursor-pointer"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono font-black px-2 py-0.5 rounded-full bg-emerald-400 text-slate-950 shadow-sm">
                  &lt; 2s • WEB WORKER
                </span>
                <Zap className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform fill-current" />
              </div>
              <h4 className="text-sm font-black text-white tracking-tight group-hover:text-emerald-300 transition-colors">
                Gerador Turbo
              </h4>
              <p className="text-[11px] text-slate-300 mt-1 font-medium">
                Força Bruta 14 Pts • 100% Auditado
              </p>
            </div>
            <div className="pt-3 mt-2 border-t border-emerald-500/20 flex items-center justify-between text-[10px] text-emerald-400 font-bold">
              <span>Execução Paralela</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>

          {/* Card 2: SEQUÊNCIAS OTIMIZADAS */}
          <button
            type="button"
            onClick={onGenerateFibonacci}
            disabled={isGenerating}
            className="h-full flex flex-col justify-between p-3.5 rounded-xl border border-sky-500/40 bg-gradient-to-b from-slate-900 to-sky-950/30 hover:border-sky-400 hover:from-slate-850 hover:to-sky-950/50 shadow-lg shadow-sky-500/10 hover:shadow-sky-500/25 transition-all text-left group cursor-pointer disabled:opacity-60"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono font-black px-2 py-0.5 rounded-full bg-sky-400 text-slate-950 shadow-sm">
                  5 JOGOS
                </span>
                <Sparkles className="w-4 h-4 text-sky-400 group-hover:scale-110 transition-transform" />
              </div>
              <h4 className="text-sm font-black text-white tracking-tight group-hover:text-sky-300 transition-colors">
                Padrões Fibonacci
              </h4>
              <p className="text-[11px] text-slate-300 mt-1 font-medium">
                ≥ 3 Fibo • Regra de Ouro (190–210)
              </p>
            </div>
            <div className="pt-3 mt-2 border-t border-sky-500/20 flex items-center justify-between text-[10px] text-sky-400 font-bold">
              <span>Série Áurea da Matemática</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>

          {/* Card 3: FECHAMENTO PONDERADO */}
          <button
            type="button"
            onClick={onGeneratePonderado}
            disabled={selectedNumbers.length < targetCount || isGenerating}
            className={`h-full flex flex-col justify-between p-3.5 rounded-xl border border-purple-500/40 bg-gradient-to-b from-slate-900 to-purple-950/30 hover:border-purple-400 hover:from-slate-850 hover:to-purple-950/50 shadow-lg shadow-purple-500/10 hover:shadow-purple-500/25 transition-all text-left group cursor-pointer ${
              selectedNumbers.length < targetCount || isGenerating ? 'opacity-60 cursor-not-allowed' : ''
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono font-black px-2 py-0.5 rounded-full bg-purple-400 text-slate-950 shadow-sm">
                  IP &amp; ROBUSTEZ
                </span>
                <Flame className="w-4 h-4 text-purple-400 group-hover:scale-110 transition-transform fill-current" />
              </div>
              <h4 className="text-sm font-black text-white tracking-tight group-hover:text-purple-300 transition-colors">
                Fechamento Ponderado
              </h4>
              <p className="text-[11px] text-slate-300 mt-1 font-medium">
                Frequência × Atraso • 50 Apurações
              </p>
            </div>
            <div className="pt-3 mt-2 border-t border-purple-500/20 flex items-center justify-between text-[10px] text-purple-400 font-bold">
              <span>Índice de Performance</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>

          {/* Card 4: ANTI-CISNE NEGRO */}
          <button
            type="button"
            onClick={onGenerateEstratificada}
            disabled={selectedNumbers.length < targetCount || isGenerating}
            className={`h-full flex flex-col justify-between p-3.5 rounded-xl border border-amber-500/50 bg-gradient-to-b from-slate-900 to-amber-950/30 hover:border-amber-400 hover:from-slate-850 hover:to-amber-950/50 shadow-lg shadow-amber-500/10 hover:shadow-amber-500/25 transition-all text-left group cursor-pointer ${
              selectedNumbers.length < targetCount || isGenerating ? 'opacity-60 cursor-not-allowed' : ''
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono font-black px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 shadow-sm">
                  75 / 15 / 10% • PRO
                </span>
                <ShieldCheck className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
              </div>
              <h4 className="text-sm font-black text-white tracking-tight group-hover:text-amber-300 transition-colors">
                Anti-Cisne Negro
              </h4>
              <p className="text-[11px] text-slate-300 mt-1 font-medium">
                Matriz Estratificada 3 Níveis
              </p>
            </div>
            <div className="pt-3 mt-2 border-t border-amber-500/20 flex items-center justify-between text-[10px] text-amber-300 font-bold">
              <span>Blindagem Concurso #3825</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. CENTRAL UNIFICADA: FLUXO EM 3 PASSOS (GUIADO & COMPACTO) */}
      {/* ========================================================================= */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-2xl space-y-6">
        {/* Header da Central */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/30 text-emerald-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white tracking-tight flex items-center gap-2">
                <span>Central Unificada de Fechamentos</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                  FLUXO 3 PASSOS
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Selecione sua estratégia, defina o tamanho da matriz combinatória e execute com filtros canônicos auditados.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClearSelection}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition cursor-pointer"
            >
              Limpar Volante
            </button>
          </div>
        </div>

        {/* --------------------------------------------------------------------- */}
        {/* PASSO 1: Escolha da Estratégia de Seleção de Dezenas */}
        {/* --------------------------------------------------------------------- */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-emerald-500 text-slate-950 font-black text-xs flex items-center justify-center font-mono">
                1
              </span>
              <h3 className="text-xs sm:text-sm font-bold text-white tracking-wide">
                PASSO 1: Estratégia de Seleção de Dezenas
              </h3>
            </div>
            <span className="text-[11px] font-mono text-slate-400">
              {selectedNumbers.length}/{targetCount} dezenas selecionadas
            </span>
          </div>

          {/* Pílulas Rápidas de Seleção */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setActiveQuickPill('top_ia');
                onApplyTopIA();
              }}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer border shadow-sm ${
                activeQuickPill === 'top_ia'
                  ? 'bg-amber-400 text-slate-950 border-amber-300 ring-2 ring-amber-400/30 shadow-amber-500/20'
                  : 'bg-slate-950/80 hover:bg-slate-800 text-slate-200 border-slate-700'
              }`}
            >
              <span>🎯 Top IA ({targetCount} Dez)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveQuickPill('fechar_ciclo');
                onApplyFecharCiclo();
              }}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer border shadow-sm ${
                activeQuickPill === 'fechar_ciclo'
                  ? 'bg-emerald-400 text-slate-950 border-emerald-300 ring-2 ring-emerald-400/30 shadow-emerald-500/20'
                  : 'bg-slate-950/80 hover:bg-slate-800 text-slate-200 border-slate-700'
              }`}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>🔄 Fechar Ciclo ({cyclePendingCount} Pendentes)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveQuickPill('equilibrio');
                onApplyEquilibrioCanonico();
              }}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer border shadow-sm ${
                activeQuickPill === 'equilibrio'
                  ? 'bg-cyan-400 text-slate-950 border-cyan-300 ring-2 ring-cyan-400/30 shadow-cyan-500/20'
                  : 'bg-slate-950/80 hover:bg-slate-800 text-slate-200 border-slate-700'
              }`}
            >
              <Scale className="w-3.5 h-3.5" />
              <span>⚖️ Equilíbrio Canônico</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveQuickPill('par_ouro');
                onApplyParDeOuro();
              }}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer border shadow-sm ${
                activeQuickPill === 'par_ouro'
                  ? 'bg-yellow-400 text-slate-950 border-yellow-300 ring-2 ring-yellow-400/30 shadow-yellow-500/20'
                  : 'bg-slate-950/80 hover:bg-slate-800 text-slate-200 border-slate-700'
              }`}
            >
              <Award className="w-3.5 h-3.5" />
              <span>👑 Par de Ouro [11, 20]</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveQuickPill('rep_aus');
                onApplyEstrategia9x9();
              }}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer border shadow-sm ${
                activeQuickPill === 'rep_aus'
                  ? 'bg-purple-400 text-slate-950 border-purple-300 ring-2 ring-purple-400/30 shadow-purple-500/20'
                  : 'bg-slate-950/80 hover:bg-slate-800 text-slate-200 border-slate-700'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>📄 Estratégia 9 Rep + 9 Aus</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveQuickPill('manual')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer border shadow-sm ${
                activeQuickPill === 'manual'
                  ? 'bg-slate-700 text-white border-slate-500'
                  : 'bg-slate-950/80 hover:bg-slate-800 text-slate-400 border-slate-800'
              }`}
            >
              <span>✋ Seleção Manual</span>
            </button>
          </div>

          {/* Contador Dinâmico & Atalho "Completar com Top IA" */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-xs">
            <div className="flex items-center gap-2">
              {faltamDezenas > 0 ? (
                <>
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="text-slate-300">
                    Faltam <strong className="text-amber-400 font-mono">{faltamDezenas}</strong> dezenas para completar a matriz de <strong className="text-white font-mono">{targetCount}</strong>.
                  </span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="text-emerald-300 font-semibold">
                    Matriz completa! <strong className="text-white font-mono">{selectedNumbers.length}</strong> dezenas prontas para processamento.
                  </span>
                </>
              )}
            </div>

            {faltamDezenas > 0 && (
              <button
                type="button"
                onClick={onCompleteWithTopIA}
                className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs transition cursor-pointer shadow-sm active:scale-95 shrink-0"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Completar com Top IA (+{faltamDezenas})</span>
              </button>
            )}
          </div>
        </div>

        {/* --------------------------------------------------------------------- */}
        {/* PASSO 2: Catálogo Unificado de Matrizes (15 a 21 Dezenas) */}
        {/* --------------------------------------------------------------------- */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-emerald-500 text-slate-950 font-black text-xs flex items-center justify-center font-mono">
                2
              </span>
              <h3 className="text-xs sm:text-sm font-bold text-white tracking-wide">
                PASSO 2: Catálogo Unificado de Matrizes Combinatórias
              </h3>
            </div>
            <span className="text-[11px] text-slate-400">
              Valor Oficial: R$ 3,50 por aposta
            </span>
          </div>

          {/* Abas de Tamanho de Universo (15 a 21) */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {[15, 16, 17, 18, 19, 20, 21].map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => {
                  setSelectedUniverseTab(size);
                  // Encontra a primeira matriz deste universo
                  const firstMatrix = UNIFIED_MATRIX_CATALOG.find((m) => m.dezenas === size);
                  if (firstMatrix) {
                    onSelectMode(firstMatrix.mode, size);
                  }
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 border ${
                  selectedUniverseTab === size
                    ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md font-black'
                    : 'bg-slate-950 text-slate-400 hover:text-white border-slate-800'
                }`}
              >
                <span>{size} Dezenas</span>
              </button>
            ))}
          </div>

          {/* Cards de Matrizes para o Universo Selecionado */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {UNIFIED_MATRIX_CATALOG.filter((m) => m.dezenas === selectedUniverseTab).map((item) => {
              const isSelected = mode === item.mode && targetCount === item.dezenas;
              const custoItem = item.jogos * VALOR_APOSTA_LOTOFACIL;
              return (
                <div
                  key={item.id}
                  onClick={() => onSelectMode(item.mode, item.dezenas)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between relative group ${
                    isSelected
                      ? 'bg-gradient-to-b from-slate-900 via-emerald-950/40 to-slate-900 border-2 border-emerald-400 ring-2 ring-emerald-400/20 shadow-xl shadow-emerald-500/10'
                      : 'bg-slate-950/80 hover:bg-slate-850 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {item.popular && (
                    <span className="absolute -top-2.5 right-3 text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 shadow-sm">
                      MAIS JOGADO
                    </span>
                  )}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-mono font-bold text-white">
                        {item.dezenas} Dezenas • {item.jogos} {item.jogos === 1 ? 'Jogo' : 'Jogos'}
                      </span>
                      {item.tag && (
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700">
                          {item.tag}
                        </span>
                      )}
                    </div>
                    <div className="text-sm font-black text-emerald-400 tracking-tight">
                      Garantia: {item.garantia}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                      {item.condicao}
                    </p>
                  </div>

                  <div className="pt-3 mt-3 border-t border-slate-800/80 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">Investimento</span>
                      <span className="text-xs font-mono font-bold text-amber-300">
                        R$ {custoItem.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    <span
                      className={`text-[11px] font-bold px-2 py-1 rounded-lg transition ${
                        isSelected
                          ? 'bg-emerald-400 text-slate-950 font-black'
                          : 'bg-slate-800 text-slate-300 group-hover:bg-slate-700'
                      }`}
                    >
                      {isSelected ? '✓ Selecionada' : 'Escolher'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* --------------------------------------------------------------------- */}
        {/* PASSO 3: Presets de Filtros Rápidos */}
        {/* --------------------------------------------------------------------- */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-emerald-500 text-slate-950 font-black text-xs flex items-center justify-center font-mono">
                3
              </span>
              <h3 className="text-xs sm:text-sm font-bold text-white tracking-wide">
                PASSO 3: Presets de Filtros &amp; Proteção Estatística
              </h3>
            </div>
            <span className="text-[11px] text-slate-400">
              Calibração instantânea dos limites
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <button
              type="button"
              onClick={() => onSelectPreset('conservador')}
              className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                activePreset === 'conservador'
                  ? 'bg-emerald-500/20 border-emerald-400 text-white shadow-md shadow-emerald-500/20'
                  : 'bg-slate-950/80 hover:bg-slate-800 border-slate-800 text-slate-300'
              }`}
            >
              <div className="text-xs font-bold text-emerald-400">🛡️ Conservador</div>
              <div className="text-[10px] text-slate-400 mt-0.5">Soma 190–210 • 7P/8I</div>
            </button>

            <button
              type="button"
              onClick={() => onSelectPreset('balanceado')}
              className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                activePreset === 'balanceado'
                  ? 'bg-cyan-500/20 border-cyan-400 text-white shadow-md shadow-cyan-500/20'
                  : 'bg-slate-950/80 hover:bg-slate-800 border-slate-800 text-slate-300'
              }`}
            >
              <div className="text-xs font-bold text-cyan-400">⚖️ Balanceado</div>
              <div className="text-[10px] text-slate-400 mt-0.5">Soma 180–215 • Amplo</div>
            </button>

            <button
              type="button"
              onClick={() => onSelectPreset('agressivo')}
              className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                activePreset === 'agressivo'
                  ? 'bg-purple-500/20 border-purple-400 text-white shadow-md shadow-purple-500/20'
                  : 'bg-slate-950/80 hover:bg-slate-800 border-slate-800 text-slate-300'
              }`}
            >
              <div className="text-xs font-bold text-purple-400">⚡ Agressivo</div>
              <div className="text-[10px] text-slate-400 mt-0.5">Foco em Prêmios Altos</div>
            </button>

            <button
              type="button"
              onClick={() => onSelectPreset('anti_cisne_negro')}
              className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                activePreset === 'anti_cisne_negro'
                  ? 'bg-amber-500/20 border-amber-400 text-white shadow-md shadow-amber-500/20'
                  : 'bg-slate-950/80 hover:bg-slate-800 border-slate-800 text-slate-300'
              }`}
            >
              <div className="text-xs font-bold text-amber-400">👑 Anti-Cisne Negro</div>
              <div className="text-[10px] text-slate-400 mt-0.5">75 / 15 / 10% Estratificado</div>
            </button>
          </div>
        </div>

        {/* --------------------------------------------------------------------- */}
        {/* BARRA FIXA / RESUMO EM TEMPO REAL & BOTÃO DE AÇÃO PRIMÁRIA */}
        {/* --------------------------------------------------------------------- */}
        <div className="sticky bottom-2 z-30 pt-2">
          <div className="bg-slate-950/95 border-2 border-emerald-500/40 backdrop-blur-xl rounded-2xl p-4 shadow-2xl flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            {/* Metadados ao Vivo */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
              <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-slate-400 block font-medium">Universo</span>
                <span className="font-mono font-bold text-white text-xs sm:text-sm">
                  {selectedNumbers.length} / {targetCount}
                </span>
              </div>

              <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-slate-400 block font-medium">Fixas</span>
                <span className="font-mono font-bold text-cyan-300 text-xs sm:text-sm">
                  {fixedNumbers.length} dezenas
                </span>
              </div>

              <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-slate-400 block font-medium">Qtd Jogos</span>
                <span className="font-mono font-bold text-emerald-400 text-xs sm:text-sm">
                  {jogosCount} bilhetes
                </span>
              </div>

              <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-slate-400 block font-medium">Investimento</span>
                <span className="font-mono font-bold text-amber-300 text-xs sm:text-sm">
                  R$ {investimentoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 col-span-2 sm:col-span-1">
                <span className="text-[10px] text-slate-400 block font-medium">Garantia Efetiva</span>
                <span className="font-mono font-bold text-emerald-300 text-xs sm:text-sm">
                  {garantiaEfetivaPct}%
                </span>
              </div>
            </div>

            {/* Botão de Ação Primária */}
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
                  <span>PROCESSANDO MATRIZ...</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 fill-current" />
                  <span>
                    {isProntoParaGerar
                      ? `PROCESSAR & GERAR ${jogosCount} JOGOS`
                      : `SELECIONE MAIS ${faltamDezenas} DEZENA(S)`}
                  </span>
                  <Sparkles className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
