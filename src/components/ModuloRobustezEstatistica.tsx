import React, { useMemo } from 'react';
import { FilterCriteria, LotofacilDraw, DezenaStats } from '../types/lotofacil';
import {
  ShieldCheck,
  Zap,
  TrendingUp,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Info,
  Flame,
  Layers,
  Sparkles,
} from 'lucide-react';
import {
  getIntervalosRobustez50,
  calculateIndicePerformance,
  calcularSazonalidadeEstatistica,
  PerformanceIndexResult,
} from '../services/fechamentoPonderadoService';
import { soundService } from '../services/soundAlert';

interface ModuloRobustezEstatisticaProps {
  filters: FilterCriteria;
  onChange: (filters: FilterCriteria) => void;
  dynamicStats: DezenaStats[];
  latestDraw: LotofacilDraw;
  discardedByRobustezCount?: number;
  totalCombinacoesAvaliadas?: number;
  onGeneratePonderado?: () => void;
  isGenerating?: boolean;
}

export const ModuloRobustezEstatistica: React.FC<ModuloRobustezEstatisticaProps> = ({
  filters,
  onChange,
  dynamicStats,
  latestDraw,
  discardedByRobustezCount = 0,
  totalCombinacoesAvaliadas = 0,
  onGeneratePonderado,
  isGenerating = false,
}) => {
  const sazonalidade = useMemo(() => calcularSazonalidadeEstatistica(latestDraw), [latestDraw]);
  const robustezIntervals = useMemo(() => sazonalidade.intervalosAjustados, [sazonalidade]);

  // Top 5 dezenas com maior Índice de Performance (relação frequência x atraso)
  const topPerformanceDezenas = useMemo<PerformanceIndexResult[]>(() => {
    return dynamicStats
      .map((s) => calculateIndicePerformance(s, dynamicStats))
      .sort((a, b) => b.indicePerformance - a.indicePerformance)
      .slice(0, 6);
  }, [dynamicStats]);

  const isRobustezAtiva = Boolean(filters.robustezEstatisticaAtiva);
  const isPonderadoAtivo = Boolean(filters.fechamentoPonderadoAtivo);

  const handleToggleRobustez = () => {
    const nextState = !isRobustezAtiva;
    soundService.playGoldenZoneSuccessChime();
    onChange({
      ...filters,
      robustezEstatisticaAtiva: nextState,
      robustez50SomaMin: robustezIntervals.somaMin,
      robustez50SomaMax: robustezIntervals.somaMax,
      robustez50ParesMin: robustezIntervals.paresMin,
      robustez50ParesMax: robustezIntervals.paresMax,
      robustez50MolduraMin: robustezIntervals.molduraMin,
      robustez50MolduraMax: robustezIntervals.molduraMax,
    });
  };

  const handleTogglePonderado = () => {
    const nextState = !isPonderadoAtivo;
    soundService.playGoldenZoneSuccessChime();
    onChange({
      ...filters,
      fechamentoPonderadoAtivo: nextState,
    });
  };

  return (
    <div className="card-pro overflow-hidden border border-emerald-500/30 bg-slate-900/95 shadow-2xl backdrop-blur-md mb-6">
      {/* HEADER DO MÓDULO */}
      <div className="p-4 sm:p-5 border-b border-emerald-500/20 bg-gradient-to-r from-emerald-950/40 via-slate-900/80 to-teal-950/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-slate-950 shadow-lg shadow-emerald-500/20 shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base sm:text-lg font-bold text-emerald-300 tracking-wide flex items-center gap-2">
                Robustez Estatística & Fechamento Ponderado
              </h3>
              <span
                className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border transition-all ${
                  isRobustezAtiva
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}
              >
                {isRobustezAtiva ? 'Filtro de Robustez: Ativo' : 'Filtro de Robustez: Inativo'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Descarta automaticamente combinações fora do intervalo estatisticamente provável (base últimas 50
              apurações da Caixa) e pondera a geração pelo Índice de Performance.
            </p>
          </div>
        </div>

        {/* CONTROLES RÁPIDOS */}
        <div className="flex items-center gap-2.5 flex-wrap self-end md:self-auto">
          {/* TOGGLE ROBUSTEZ */}
          <button
            onClick={handleToggleRobustez}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer border shadow-sm ${
              isRobustezAtiva
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 border-emerald-400 shadow-emerald-500/20'
                : 'bg-slate-800/90 text-slate-300 border-slate-700 hover:bg-slate-750'
            }`}
            title="Ativar/Desativar descarte automático de combinações atípicas"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Robustez 50 {isRobustezAtiva ? 'Ligada' : 'Desligada'}</span>
          </button>

          {/* TOGGLE PONDERADO */}
          <button
            onClick={handleTogglePonderado}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer border shadow-sm ${
              isPonderadoAtivo
                ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 border-amber-400 shadow-amber-500/20'
                : 'bg-slate-800/90 text-slate-300 border-slate-700 hover:bg-slate-750'
            }`}
            title="Dá preferência às dezenas com maior Índice de Performance"
          >
            <Flame className="w-4 h-4 fill-current" />
            <span>Modo Ponderado {isPonderadoAtivo ? 'Ativo' : 'Desativado'}</span>
          </button>

          {onGeneratePonderado && (
            <button
              onClick={onGeneratePonderado}
              disabled={isGenerating}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-yellow-400 text-slate-950 text-xs font-black shadow-md shadow-amber-500/25 hover:scale-[1.02] active:scale-95 transition cursor-pointer disabled:opacity-50"
            >
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span>{isGenerating ? 'Gerando...' : 'Gerar Ponderado'}</span>
            </button>
          )}
        </div>
      </div>

      {/* CORPO DO MÓDULO */}
      <div className="p-4 sm:p-5 space-y-4">
        {/* BANNER DINÂMICO: SAZONALIDADE ESTATÍSTICA (MM 100 vs MM 50) */}
        <div className="p-3.5 rounded-xl bg-slate-950/80 border border-teal-500/30 space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-teal-400" />
              <span className="text-xs font-bold text-teal-300">
                Sazonalidade Estatística (Média Móvel de 100 Concursos vs Janela Recente de 50)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-teal-500/20 text-teal-300 border border-teal-500/30">
                {sazonalidade.classificacaoSazonal}
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Agressividade: {sazonalidade.agressividadeFiltros}
              </span>
            </div>
          </div>

          <p className="text-[11px] text-slate-300 leading-relaxed">
            {sazonalidade.explicacaoSazonal}
          </p>

          <div className="grid grid-cols-3 gap-2 pt-1 text-[11px] text-slate-400">
            <div className="bg-slate-900/90 p-2 rounded-lg border border-slate-800">
              <span className="text-[10px] block text-slate-500">Soma MM100 / MM50:</span>
              <strong className="text-emerald-300 font-mono">
                {sazonalidade.mm100Soma} → {sazonalidade.mm50Soma} ({sazonalidade.deltaSoma >= 0 ? '+' : ''}{sazonalidade.deltaSoma})
              </strong>
            </div>
            <div className="bg-slate-900/90 p-2 rounded-lg border border-slate-800">
              <span className="text-[10px] block text-slate-500">Pares MM100 / MM50:</span>
              <strong className="text-cyan-300 font-mono">
                {sazonalidade.mm100Pares} → {sazonalidade.mm50Pares} ({sazonalidade.deltaPares >= 0 ? '+' : ''}{sazonalidade.deltaPares})
              </strong>
            </div>
            <div className="bg-slate-900/90 p-2 rounded-lg border border-slate-800">
              <span className="text-[10px] block text-slate-500">Moldura MM100 / MM50:</span>
              <strong className="text-amber-300 font-mono">
                {sazonalidade.mm100Moldura} → {sazonalidade.mm50Moldura} ({sazonalidade.deltaMoldura >= 0 ? '+' : ''}{sazonalidade.deltaMoldura})
              </strong>
            </div>
          </div>
        </div>

        {/* GRID DOS 3 INTERVALOS PROVÁVEIS (BASE 50 CONCURSOS CALIBRADA COM MM100) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* 1. Intervalo de Soma */}
          <div
            className={`p-3.5 rounded-xl border transition-all ${
              isRobustezAtiva
                ? 'bg-emerald-950/20 border-emerald-500/40'
                : 'bg-slate-950/60 border-slate-800/80'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5" />
                Soma Estatística Provável
              </span>
              <span className="text-[10px] text-slate-400">Últimos 50 Concursos</span>
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl font-black text-emerald-400">
                [{robustezIntervals.somaMin} a {robustezIntervals.somaMax}]
              </span>
              <span className="text-xs text-slate-400">
                (Média: <strong>{robustezIntervals.mediaSoma}</strong>)
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Descarta combinações com somatórios atípicos (&lt; 180 ou &gt; 220), que ocorrem em menos de 8% dos
              sorteios.
            </p>
          </div>

          {/* 2. Intervalo de Paridade */}
          <div
            className={`p-3.5 rounded-xl border transition-all ${
              isRobustezAtiva
                ? 'bg-cyan-950/20 border-cyan-500/40'
                : 'bg-slate-950/60 border-slate-800/80'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5" />
                Paridade Canônica
              </span>
              <span className="text-[10px] text-slate-400">Últimos 50 Concursos</span>
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl font-black text-cyan-400">
                [{robustezIntervals.paresMin} a {robustezIntervals.paresMax} Pares]
              </span>
              <span className="text-xs text-slate-400">
                ({robustezIntervals.imparesMin} a {robustezIntervals.imparesMax} Ímpares)
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Descarta paridades extremas (&lt; 6 ou &gt; 8 pares), preservando a faixa que concentra mais de 84%
              dos resultados oficiais.
            </p>
          </div>

          {/* 3. Intervalo de Moldura */}
          <div
            className={`p-3.5 rounded-xl border transition-all ${
              isRobustezAtiva
                ? 'bg-amber-950/20 border-amber-500/40'
                : 'bg-slate-950/60 border-slate-800/80'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" />
                Moldura Externa
              </span>
              <span className="text-[10px] text-slate-400">Últimos 50 Concursos</span>
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl font-black text-amber-400">
                [{robustezIntervals.molduraMin} a {robustezIntervals.molduraMax} Moldura]
              </span>
              <span className="text-xs text-slate-400">
                (Média: <strong>{robustezIntervals.mediaMoldura}</strong>)
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Descarta bilhetes com menos de 9 ou mais de 11 dezenas na borda, mantendo o balanceamento perfeito
              com o centro.
            </p>
          </div>
        </div>

        {/* RADAR DE ÍNDICE DE PERFORMANCE (DEZENAS PRIORIZADAS NO FECHAMENTO PONDERADO) */}
        <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2.5">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-amber-400" />
              <h4 className="text-xs sm:text-sm font-bold text-slate-200">
                Top Dezenas com Maior Índice de Performance (Frequência × Atraso)
              </h4>
            </div>
            <span className="text-[11px] text-slate-400">
              Cálculo dinâmico baseado no Concurso #{latestDraw.concurso}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 pt-1">
            {topPerformanceDezenas.map((item, idx) => (
              <div
                key={item.numero}
                className="p-2 rounded-lg bg-slate-900 border border-amber-500/30 flex flex-col items-center text-center shadow-sm hover:border-amber-400 transition"
              >
                <div className="flex items-center justify-between w-full text-[10px] text-slate-400 mb-1">
                  <span className="font-mono">#{idx + 1}</span>
                  <span className="text-amber-400 font-bold">IP {item.indicePerformance}%</span>
                </div>
                <span className="w-8 h-8 rounded-md bg-gradient-to-br from-amber-400 to-yellow-500 text-slate-950 font-black text-sm flex items-center justify-center shadow-md">
                  {item.dezenaPad}
                </span>
                <span className="text-[10px] text-slate-300 font-medium mt-1">
                  Atraso: {item.atrasoAtual} • {item.vezes}x
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* TELEMETRIA DE COMBINAÇÕES DESCARTADAS (QUANDO DISPONÍVEL) */}
        {discardedByRobustezCount > 0 && (
          <div className="p-3 rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-xs text-emerald-300 flex items-center justify-between gap-3 animate-fadeIn">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                <strong>{discardedByRobustezCount} combinações descartadas automaticamente</strong> pelo Filtro
                de Robustez Estatística por divergirem da média das 50 apurações.
              </span>
            </div>
            <span className="text-[10px] font-mono text-emerald-400 font-bold px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/40 shrink-0">
              OUTLIERS BLOQUEADOS
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
