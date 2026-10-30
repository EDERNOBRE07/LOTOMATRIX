import React, { useState } from 'react';
import {
  DEZENAS_STATS,
  TOP_DUPLAS,
  PARIDADE_HISTORICA,
  PRIMOS_HISTORICA,
  CONCURSO_ATUAL,
} from '../data/lotofacilData';
import { LotofacilDraw, DezenaStats } from '../types/lotofacil';
import { FrequencyDelayChart } from './FrequencyDelayChart';
import { MonteCarloSimulation } from './MonteCarloSimulation';
import { QuentesFriasModule } from './QuentesFriasModule';
import { RadarZoneGoldChart } from './RadarZoneGoldChart';
import { DezenasAscensaoModule } from './DezenasAscensaoModule';
import { DicasDeOuroPanel } from './DicasDeOuroPanel';
import { ParesDeOuroModule } from './ParesDeOuroModule';
import { EvolucaoPontuacaoChart } from './EvolucaoPontuacaoChart';
import { AnaliseVarianciaComponent } from './AnaliseVarianciaComponent';
import { ROIForecastComponent } from './ROIForecastComponent';
import { EspelhamentoDezenasModule } from './EspelhamentoDezenasModule';
import { SazonalidadeDezenasModule } from './SazonalidadeDezenasModule';
import { LinhaDoTempoCiclosComponent } from './LinhaDoTempoCiclosComponent';
import { AnaliseEspelhamentoConcursoModule } from './AnaliseEspelhamentoConcursoModule';
import { RadarTendenciasQuentesComponent } from './RadarTendenciasQuentesComponent';
import { CurvaAbcDezenasComponent } from './CurvaAbcDezenasComponent';
import { RastreadorPerformanceHistoricaComponent } from './RastreadorPerformanceHistoricaComponent';
import { MapaCalorVaziosComponent } from './MapaCalorVaziosComponent';
import { DashboardDesempenhoFinanceiroComponent } from './DashboardDesempenhoFinanceiroComponent';
import { SimulacaoBacktestingComponent } from './SimulacaoBacktestingComponent';
import { FrequenciaVinteConcursosComponent } from './FrequenciaVinteConcursosComponent';
import { CorrelacaoFrequenciaAtrasoD3Component } from './CorrelacaoFrequenciaAtrasoD3Component';
import { Top15FrequenciaUltimos10Card } from './Top15FrequenciaUltimos10Card';
import { IndiceMolduraUltimos10Card } from './IndiceMolduraUltimos10Card';
import { HistoricoParidadeVinteConcursosCard } from './HistoricoParidadeVinteConcursosCard';
import { DistribuicaoPrimosCard } from './DistribuicaoPrimosCard';
import { BacktestingEstrategias100Card } from './BacktestingEstrategias100Card';
import { RelatorioPerformanceDetalhadoModal } from './RelatorioPerformanceDetalhadoModal';
import { RastreadorPrecisaoIA30DiasCard } from './RastreadorPrecisaoIA30DiasCard';
import { ProbabilidadePreditivaRegressao200Card } from './ProbabilidadePreditivaRegressao200Card';
import { GameTicket } from '../types/lotofacil';
import {
  BarChart,
  TrendingUp,
  Play,
  Clock,
  Flame,
  Award,
  Layers,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  Sparkles,
  ArrowRight,
  Target,
  Compass,
  Lightbulb,
  Scale,
  Link2,
  Calendar,
  RotateCcw,
  DollarSign,
  ShieldAlert,
} from 'lucide-react';

interface StatisticsTabProps {
  latestDraw?: LotofacilDraw;
  statsList?: DezenaStats[];
  cyclePendingNumbers?: number[];
  concursosNoCiclo?: number;
  onApplyNumbers?: (numbers: number[]) => void;
  savedTickets?: GameTicket[];
  fechamentoNome?: string;
}

export const StatisticsTab: React.FC<StatisticsTabProps> = ({
  latestDraw = CONCURSO_ATUAL,
  statsList = DEZENAS_STATS,
  cyclePendingNumbers = [17, 22],
  concursosNoCiclo = 4,
  onApplyNumbers,
  savedTickets = [],
  fechamentoNome = '18 Dezenas • 24 Jogos (18-15-14-15)',
}) => {
  const [activeSubTab, setActiveSubTab] = useState<
    | 'atrasos'
    | 'correlacao_d3'
    | 'frequencia_20'
    | 'simulacao_backtest'
    | 'mapa_vazios'
    | 'desempenho_financeiro'
    | 'performance_historica'
    | 'curva_abc'
    | 'radar_quentes'
    | 'roi_forecast'
    | 'espelhamento'
    | 'analise_espelho'
    | 'sazonalidade'
    | 'variancia'
    | 'ciclos_timeline'
    | 'radar_ouro'
    | 'ascensao'
    | 'dicas_ouro'
    | 'pares_ouro'
    | 'quentes_frias'
    | 'montecarlo'
    | 'duplas'
    | 'evolucao'
    | 'ciclos'
    | 'padroes'
  >('atrasos');
  const [atrasoSortOrder, setAtrasoSortOrder] = useState<
    'dezena' | 'atraso_desc' | 'vezes_desc'
  >('atraso_desc');
  const [isPerformanceModalOpen, setIsPerformanceModalOpen] = useState<boolean>(false);

  // Sorted views of the 25 numbers
  const sortedDezenas = [...statsList].sort((a, b) => {
    if (atrasoSortOrder === 'atraso_desc') return b.atrasoAtual - a.atrasoAtual;
    if (atrasoSortOrder === 'vezes_desc') return b.vezes - a.vezes;
    return a.numero - b.numero;
  });

  return (
    <div className="space-y-6">
      {/* Subtab Selector */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/90 p-3 rounded-2xl border border-slate-800 shadow-xl">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setActiveSubTab('atrasos')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
              activeSubTab === 'atrasos'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20 font-bold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Estatística & Atrasos</span>
          </button>

          <button
            onClick={() => setActiveSubTab('correlacao_d3')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
              activeSubTab === 'correlacao_d3'
                ? 'bg-gradient-to-r from-cyan-400 via-teal-400 to-emerald-400 text-slate-950 shadow-md shadow-cyan-500/25 font-black'
                : 'text-cyan-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Target className="w-4 h-4" />
            <span>Dispersão D3 (Freq × Atraso)</span>
            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-mono">
              D3.JS INTERATIVO
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('frequencia_20')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
              activeSubTab === 'frequencia_20'
                ? 'bg-gradient-to-r from-orange-500 via-rose-500 to-amber-500 text-white shadow-md shadow-rose-500/25 font-black'
                : 'text-orange-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Flame className="w-4 h-4 fill-current text-orange-400" />
            <span>Frequência 20 Concursos</span>
            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-orange-500/20 text-orange-300 border border-orange-500/40 font-mono">
              QUENTES & FRIAS
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('simulacao_backtest')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
              activeSubTab === 'simulacao_backtest'
                ? 'bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500 text-slate-950 shadow-md shadow-cyan-500/25 font-black'
                : 'text-cyan-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Play className="w-4 h-4" />
            <span>Simulação de Backtesting</span>
            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-mono">
              REAL VS PROJETADO
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('mapa_vazios')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
              activeSubTab === 'mapa_vazios'
                ? 'bg-gradient-to-r from-rose-500 via-orange-500 to-amber-500 text-slate-950 shadow-md shadow-rose-500/25 font-black'
                : 'text-rose-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            <span>Mapa de Calor de Vazios</span>
            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 font-mono">
              ANTI-AFINIDADE
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('desempenho_financeiro')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
              activeSubTab === 'desempenho_financeiro'
                ? 'bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 text-slate-950 shadow-md shadow-emerald-500/25 font-black'
                : 'text-emerald-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <DollarSign className="w-4 h-4" />
            <span>Desempenho Financeiro</span>
            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono">
              ROI ACUMULADO
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('performance_historica')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
              activeSubTab === 'performance_historica'
                ? 'bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white shadow-md shadow-indigo-500/25 font-black'
                : 'text-indigo-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <TrendingUp className="w-4 h-4 text-indigo-400" />
            <span>Performance dos Jogos</span>
            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 font-mono">
              10 CONCURSOS
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('curva_abc')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
              activeSubTab === 'curva_abc'
                ? 'bg-gradient-to-r from-amber-500 via-yellow-400 to-emerald-400 text-slate-950 shadow-md shadow-amber-500/25 font-black'
                : 'text-amber-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Award className="w-4 h-4" />
            <span>Curva ABC (Pareto)</span>
            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono">
              CLASSE A 80%
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('radar_quentes')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
              activeSubTab === 'radar_quentes'
                ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 text-white shadow-md shadow-orange-500/25 font-black'
                : 'text-amber-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Flame className="w-4 h-4 text-amber-400" />
            <span>Radar Tendências Quentes</span>
            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono">
              EMA TOP 3
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('roi_forecast')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
              activeSubTab === 'roi_forecast'
                ? 'bg-gradient-to-r from-emerald-400 to-teal-500 text-slate-950 shadow-md shadow-emerald-500/20 font-black'
                : 'text-emerald-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>ROI Forecast (10 Concursos)</span>
            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono">
              RENTABILIDADE
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('espelhamento')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
              activeSubTab === 'espelhamento'
                ? 'bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white shadow-md shadow-indigo-500/25 font-black'
                : 'text-indigo-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Link2 className="w-4 h-4" />
            <span>Espelhamento (Pares & Trios)</span>
            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 font-mono">
              CO-OCORRÊNCIA
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('analise_espelho')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
              activeSubTab === 'analise_espelho'
                ? 'bg-gradient-to-r from-cyan-500 via-teal-500 to-emerald-500 text-slate-950 shadow-md shadow-cyan-500/25 font-black'
                : 'text-cyan-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <RotateCcw className="w-4 h-4" />
            <span>Análise do Espelho</span>
            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-mono">
              10 AUSENTES
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('sazonalidade')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
              activeSubTab === 'sazonalidade'
                ? 'bg-gradient-to-r from-purple-500 via-indigo-600 to-pink-500 text-white shadow-md shadow-purple-500/25 font-black'
                : 'text-purple-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Sazonalidade de Dezenas</span>
            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40 font-mono">
              10 ANOS
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('variancia')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
              activeSubTab === 'variancia'
                ? 'bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 shadow-md shadow-cyan-500/20 font-black'
                : 'text-cyan-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Scale className="w-4 h-4" />
            <span>Análise de Variância (13,0)</span>
            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-mono">
              RÉGUA DINÂMICA
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('ciclos_timeline')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
              activeSubTab === 'ciclos_timeline'
                ? 'bg-gradient-to-r from-amber-500 via-orange-400 to-yellow-500 text-slate-950 shadow-md shadow-amber-500/20 font-black'
                : 'text-amber-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <RotateCw className="w-4 h-4" />
            <span>Linha do Tempo de Ciclos</span>
            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono">
              10 CICLOS
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('radar_ouro')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
              activeSubTab === 'radar_ouro'
                ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 shadow-md shadow-amber-500/20 font-black'
                : 'text-amber-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Compass className="w-4 h-4" />
            <span>Radar Zona de Ouro (0–100%)</span>
            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
              RADAR
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('ascensao')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
              activeSubTab === 'ascensao'
                ? 'bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 shadow-md shadow-cyan-500/20 font-black'
                : 'text-cyan-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>Dezenas em Ascensão</span>
            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
              10 CONCURSOS
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('dicas_ouro')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
              activeSubTab === 'dicas_ouro'
                ? 'bg-gradient-to-r from-amber-500 to-emerald-500 text-slate-950 shadow-md shadow-amber-500/20 font-black'
                : 'text-emerald-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Lightbulb className="w-4 h-4" />
            <span>Dicas de Ouro</span>
          </button>

          <button
            onClick={() => setActiveSubTab('pares_ouro')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
              activeSubTab === 'pares_ouro'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20 font-bold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Award className="w-4 h-4" />
            <span>Pares de Ouro</span>
          </button>

          <button
            onClick={() => setActiveSubTab('evolucao')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
              activeSubTab === 'evolucao'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20 font-bold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Target className="w-4 h-4" />
            <span>Evolução da Pontuação Média</span>
          </button>

          <button
            onClick={() => setActiveSubTab('quentes_frias')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
              activeSubTab === 'quentes_frias'
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-md shadow-amber-500/20 font-black'
                : 'text-amber-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Flame className="w-4 h-4 fill-current" />
            <span>Radar Quentes & Frias</span>
          </button>

          <button
            onClick={() => setActiveSubTab('montecarlo')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
              activeSubTab === 'montecarlo'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20 font-bold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span>Simulação Monte Carlo</span>
          </button>

          <button
            onClick={() => setActiveSubTab('duplas')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
              activeSubTab === 'duplas'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20 font-bold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Flame className="w-4 h-4" />
            <span>Duplas Amigas</span>
          </button>

          <button
            onClick={() => setActiveSubTab('ciclos')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
              activeSubTab === 'ciclos'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20 font-bold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <RotateCw className="w-4 h-4" />
            <span>Controle de Ciclos</span>
          </button>

          <button
            onClick={() => setActiveSubTab('padroes')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
              activeSubTab === 'padroes'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20 font-bold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <BarChart className="w-4 h-4" />
            <span>Paridade, Primos, Moldura</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPerformanceModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-slate-950 text-xs font-black shadow-md shadow-amber-500/20 transition cursor-pointer"
            title="Abrir Auditoria Cruzada: Backtest 100 Concursos vs Comportamento Real do Usuário nos Últimos 30 Dias"
          >
            <Award className="w-4 h-4" />
            <span>Relatório de Performance</span>
          </button>
          <span className="text-[11px] font-mono text-slate-400 pr-2 hidden sm:inline">
            Base: 3.800 Concursos Oficiais
          </span>
        </div>
      </div>

      {/* SUBTAB 1: ATRASOS DAS DEZENAS & ESTATÍSTICAS FUNDAMENTAIS */}
      {activeSubTab === 'atrasos' && (
        <div className="space-y-6">
          {/* 1. Top 15 Dezenas Mais Sorteadas nos Últimos 10 Concursos */}
          <Top15FrequenciaUltimos10Card
            latestDraw={latestDraw}
            onApplyTop15ToFechamento={() => {
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('switch-tab', { detail: 'fechamento' }));
              }
            }}
            onFixTopDezenas={() => {
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('switch-tab', { detail: 'fechamento' }));
              }
            }}
          />

          {/* 2. Índice de Moldura vs Centro (Últimos 10 Concursos) */}
          <IndiceMolduraUltimos10Card
            latestDraw={latestDraw}
            onNavigateToFechamento={() => {
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('switch-tab', { detail: 'fechamento' }));
              }
            }}
          />

          {/* 3. Histórico de Paridade (Pares vs Ímpares - Últimos 20 Concursos) */}
          <HistoricoParidadeVinteConcursosCard
            latestDraw={latestDraw}
            onNavigateToFechamento={() => {
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('switch-tab', { detail: 'fechamento' }));
              }
            }}
          />

          {/* 4. Distribuição de Números Primos no Volante (4 a 7 Primos) */}
          <DistribuicaoPrimosCard
            latestDraw={latestDraw}
            onNavigateToFechamento={() => {
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('switch-tab', { detail: 'fechamento' }));
              }
            }}
          />

          {/* 5. Rastreador de Precisão das Predições da IA (30 Dias) & Calibração de Agressividade */}
          <RastreadorPrecisaoIA30DiasCard
            latestDraw={latestDraw}
            onNavigateToFechamento={() => {
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('switch-tab', { detail: 'fechamento' }));
              }
            }}
          />

          {/* 6. Probabilidade Preditiva de Saída (Regressão Linear OLS sobre 200 Concursos - Top 10 Dezenas) */}
          <ProbabilidadePreditivaRegressao200Card
            latestDraw={latestDraw}
            statsList={statsList}
            cyclePendingNumbers={cyclePendingNumbers}
            onApplyNumbers={onApplyNumbers}
          />

          {/* BANNER DE ACESSO AO RELATÓRIO DE PERFORMANCE DETALHADO */}
          <div className="bg-gradient-to-r from-amber-950/40 via-slate-900 to-amber-950/30 rounded-2xl border border-amber-500/40 p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-400 to-yellow-600 flex items-center justify-center text-slate-950 shadow-lg shadow-amber-500/25 shrink-0">
                <Award className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm sm:text-base font-bold text-white tracking-wide">
                    Relatório de Performance Detalhado · Auditoria Cruzada
                  </h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    100 CONCURSOS × 30 DIAS
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-1">
                  Cruza as probabilidades matemáticas do backtesting de 100 concursos com o histórico prático das suas apostas salvas nos últimos 30 dias, calculando convergência estatística, ROI e laudo preditivo.
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsPerformanceModalOpen(true)}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-yellow-400 text-slate-950 font-black text-xs shadow-md shadow-amber-500/30 transition cursor-pointer shrink-0"
            >
              <Sparkles className="w-4 h-4 fill-current" />
              <span>Abrir Relatório Detalhado</span>
            </button>
          </div>

          {/* 5. Backtesting de Estratégias nos Últimos 100 Concursos Reais (13, 14 e 15 Pontos) */}
          <BacktestingEstrategias100Card
            latestDraw={latestDraw}
            savedTickets={savedTickets}
            dynamicStats={statsList}
            onNavigateToFechamento={() => {
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('switch-tab', { detail: 'fechamento' }));
              }
            }}
          />

          {/* Quick callout to Monte Carlo projection */}
          <div className="bg-gradient-to-r from-emerald-950/50 via-slate-900 to-indigo-950/40 rounded-2xl border border-emerald-500/30 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-white flex items-center gap-2 flex-wrap">
                  <span>Projeção de Monte Carlo Estocástica para os Próximos 5 Concursos</span>
                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    5.000 ITERAÇÕES
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Simulação de probabilidade de ocorrência para cada uma das 25 dezenas nos concursos #{latestDraw.concurso + 1} a #{latestDraw.concurso + 5} ponderada por atrasos e ciclo.
                </p>
              </div>
            </div>
            <button
              onClick={() => setActiveSubTab('montecarlo')}
              className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition cursor-pointer shrink-0 shadow-md shadow-emerald-500/20 flex items-center gap-1.5 justify-center"
            >
              <span>Ver Simulação Monte Carlo</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Banner Simulação de Backtesting: Real vs Projetado */}
          <div className="bg-gradient-to-r from-cyan-950/80 via-blue-950/50 to-slate-900 border-2 border-cyan-500/60 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl shadow-cyan-500/10">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 text-slate-950 shadow-md shadow-cyan-500/30 shrink-0">
                <Play className="w-5 h-5 text-slate-950" />
              </div>
              <div>
                <div className="text-xs font-bold text-white flex items-center gap-2 flex-wrap">
                  <span className="text-cyan-300 font-black">Simulação de Backtesting: Desempenho Real vs Projetado</span>
                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-mono">
                    VALIDAÇÃO DO MODELO
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 mt-0.5">
                  Audite o desempenho real de qualquer fechamento contra períodos históricos passados (10, 25, 50 ou 100 sorteios) confrontando com a projeção teórica do LotoSniper.
                </p>
              </div>
            </div>
            <button
              onClick={() => setActiveSubTab('simulacao_backtest')}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-slate-950 font-black text-xs transition cursor-pointer shrink-0 shadow-md shadow-cyan-500/30 flex items-center gap-1.5 justify-center active:scale-95"
            >
              <span>Abrir Backtesting</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Banner Mapa de Calor de Vazios & Combinações Anti-Afinidade */}
          <div className="bg-gradient-to-r from-rose-950/80 via-orange-950/50 to-slate-900 border-2 border-rose-500/60 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl shadow-rose-500/10">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-rose-500 to-orange-500 text-white shadow-md shadow-rose-500/30 shrink-0">
                <ShieldAlert className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="text-xs font-bold text-white flex items-center gap-2 flex-wrap">
                  <span className="text-rose-300 font-black">Mapa de Calor de Vazios & Combinações Anti-Afinidade</span>
                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 font-mono">
                    ÚLTIMOS 10 CONCURSOS
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 mt-0.5">
                  Visualização de duplas e trios que historicamente raramente saem juntas. Aplique filtros de exclusão inteligentes baseados em combinações de vazio para proteger seu fechamento.
                </p>
              </div>
            </div>
            <button
              onClick={() => setActiveSubTab('mapa_vazios')}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-rose-500 to-orange-500 hover:from-rose-400 hover:to-orange-400 text-slate-950 font-black text-xs transition cursor-pointer shrink-0 shadow-md shadow-rose-500/30 flex items-center gap-1.5 justify-center active:scale-95"
            >
              <span>Abrir Mapa de Vazios</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Banner Dashboard de Desempenho Financeiro (Custo Gerenciador vs Retorno Teórico) */}
          <div className="bg-gradient-to-r from-emerald-950/80 via-teal-950/50 to-slate-900 border-2 border-emerald-500/60 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl shadow-emerald-500/10">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 text-slate-950 shadow-md shadow-emerald-500/30 shrink-0">
                <DollarSign className="w-5 h-5 text-slate-950" />
              </div>
              <div>
                <div className="text-xs font-bold text-white flex items-center gap-2 flex-wrap">
                  <span className="text-emerald-300 font-black">Dashboard de Desempenho Financeiro & ROI Acumulado</span>
                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono">
                    GERENCIADOR VS RETORNO
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 mt-0.5">
                  Calcule o ROI acumulado de todas as estratégias comparando o custo real das apostas registradas versus o retorno teórico de prêmios históricos.
                </p>
              </div>
            </div>
            <button
              onClick={() => setActiveSubTab('desempenho_financeiro')}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-xs transition cursor-pointer shrink-0 shadow-md shadow-emerald-500/30 flex items-center gap-1.5 justify-center active:scale-95"
            >
              <span>Ver Dashboard Financeiro</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Banner Performance Histórica dos Jogos & Auditoria de Estratégias */}
          <div className="bg-gradient-to-r from-indigo-950/80 via-purple-950/50 to-slate-900 border-2 border-indigo-500/60 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl shadow-indigo-500/10">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-md shadow-indigo-500/30 shrink-0">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="text-xs font-bold text-white flex items-center gap-2 flex-wrap">
                  <span className="text-indigo-300 font-black">Performance Histórica dos Jogos & Auditoria de Estratégias</span>
                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 font-mono">
                    ÚLTIMOS 10 CONCURSOS
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 mt-0.5">
                  Rastreie a média de acertos concurso a concurso e identifique quais estratégias de fechamento entregam o melhor ROI estatístico.
                </p>
              </div>
            </div>
            <button
              onClick={() => setActiveSubTab('performance_historica')}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white font-black text-xs transition cursor-pointer shrink-0 shadow-md shadow-indigo-500/30 flex items-center gap-1.5 justify-center active:scale-95"
            >
              <span>Ver Performance & ROI</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Banner Curva ABC (Princípio de Pareto 80/20 • Destaque Classe A) */}
          <div className="bg-gradient-to-r from-amber-950/80 via-yellow-950/50 to-slate-900 border-2 border-amber-500/60 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl shadow-amber-500/10">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500 to-yellow-400 text-slate-950 shadow-md shadow-amber-500/30 shrink-0">
                <Award className="w-5 h-5 text-slate-950" />
              </div>
              <div>
                <div className="text-xs font-bold text-white flex items-center gap-2 flex-wrap">
                  <span className="text-amber-300 font-black">Curva ABC das Dezenas (Princípio de Pareto 80/20)</span>
                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono">
                    CLASSE A = 80% DAS BOLAS
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 mt-0.5">
                  Estratificação das 25 dezenas com base nas 57.000 bolas dos 3.800+ concursos. A Classe A concentra 80% da frequência histórica e define os melhores fechamentos.
                </p>
              </div>
            </div>
            <button
              onClick={() => setActiveSubTab('curva_abc')}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-xs transition cursor-pointer shrink-0 shadow-md shadow-amber-500/30 flex items-center gap-1.5 justify-center active:scale-95"
            >
              <span>Abrir Curva ABC</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Banner Radar de Tendências Quentes (Média Móvel Exponencial EMA • Top 3 Força 1 a 100) */}
          <div className="bg-gradient-to-r from-amber-950/70 via-orange-950/50 to-slate-900 border border-amber-500/50 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 shrink-0">
                <Flame className="w-5 h-5 text-amber-400 animate-pulse" />
              </div>
              <div>
                <div className="text-xs font-bold text-white flex items-center gap-2 flex-wrap">
                  <span>Radar de Tendências Quentes (Média Móvel Exponencial EMA)</span>
                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono">
                    TOP 3 NOS PRÓXIMOS 5 CONCURSOS
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Algoritmo preditivo de momentum exponencial que calcula a probabilidade e a força (1 a 100) para os próximos 5 concursos da Lotofácil.
                </p>
              </div>
            </div>
            <button
              onClick={() => setActiveSubTab('radar_quentes')}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs transition cursor-pointer shrink-0 shadow-md shadow-amber-500/20 flex items-center gap-1.5 justify-center"
            >
              <span>Abrir Radar EMA</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Banner ROI Forecast & Histórico de Rentabilidade (Últimos 10 Concursos) */}
          <div className="bg-gradient-to-r from-emerald-950/60 via-teal-950/40 to-slate-900 border border-emerald-500/40 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shrink-0">
                <TrendingUp className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <div className="text-xs font-bold text-white flex items-center gap-2 flex-wrap">
                  <span>Simulador de Rentabilidade Histórica: ROI Forecast (10 Concursos)</span>
                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    {savedTickets.length > 0 ? `${savedTickets.length} JOGOS ATIVOS` : 'MATRIZ 24 JOGOS'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Calcule o custo bruto da aposta vs. retorno financeiro real (com prêmios de 11, 12, 13 e 14 pontos) nos últimos 10 concursos oficiais da Caixa.
                </p>
              </div>
            </div>
            <button
              onClick={() => setActiveSubTab('roi_forecast')}
              className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition cursor-pointer shrink-0 shadow-md shadow-emerald-500/20 flex items-center gap-1.5 justify-center"
            >
              <span>Abrir ROI Forecast</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Banner Espelhamento de Dezenas (Co-ocorrência de Pares & Trios) */}
          <div className="bg-gradient-to-r from-indigo-950/60 via-purple-950/40 to-slate-900 border border-indigo-500/40 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 shrink-0">
                <Link2 className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <div className="text-xs font-bold text-white flex items-center gap-2 flex-wrap">
                  <span>Espelhamento de Dezenas: Afinidade e Co-ocorrência (Pares & Trios)</span>
                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    SINERGIA MATRICIAL
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Identifique pares e trios de dezenas que mais frequentemente aparecem juntos nos concursos oficiais para fixação e agrupamento estratégico nos fechamentos.
                </p>
              </div>
            </div>
            <button
              onClick={() => setActiveSubTab('espelhamento')}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-400 hover:to-purple-400 text-white font-bold text-xs transition cursor-pointer shrink-0 shadow-md shadow-indigo-500/20 flex items-center gap-1.5 justify-center"
            >
              <span>Explorar Espelhamento</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Quick Dual Navigation: Análise do Espelho & Linha do Tempo de Ciclos */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Card 1: Análise do Espelho (10 Ausentes) */}
            <div className="bg-gradient-to-r from-cyan-950/50 via-slate-900 to-teal-950/40 border border-cyan-500/40 rounded-2xl p-4 flex flex-col justify-between gap-3 shadow-xl">
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shrink-0">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-white">Análise do Espelho (10 Dezenas Ausentes)</span>
                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 font-mono">
                      RETORNO IMINENTE
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Audita a taxa de retorno das dezenas não sorteadas para o próximo sorteio e compara a correlação com ausentes de ciclos passados.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveSubTab('analise_espelho')}
                className="self-end px-3 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition cursor-pointer shadow-md shadow-cyan-500/20 flex items-center gap-1.5"
              >
                <span>Ver Análise do Espelho</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Card 2: Linha do Tempo de Ciclos */}
            <div className="bg-gradient-to-r from-amber-950/50 via-slate-900 to-orange-950/40 border border-amber-500/40 rounded-2xl p-4 flex flex-col justify-between gap-3 shadow-xl">
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 shrink-0">
                  <RotateCw className="w-5 h-5 animate-spin-slow" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-white">Linha do Tempo dos Ciclos (Últimos 10)</span>
                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-mono">
                      ACELERAÇÃO & RETARDO
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Visualize a duração dos ciclos anteriores e a pressão de fechamento do Ciclo 804 (dezenas 17 e 22 pendentes).
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveSubTab('ciclos_timeline')}
                className="self-end px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition cursor-pointer shadow-md shadow-amber-500/20 flex items-center gap-1.5"
              >
                <span>Ver Linha do Tempo</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Módulo Especial: Sequências de Quentes (Últimos 3 Concursos) e Frias (> 5 Concursos Ausentes) */}
          <QuentesFriasModule
            latestDraw={latestDraw}
            statsList={statsList}
            cyclePendingNumbers={cyclePendingNumbers}
            onApplyNumbers={onApplyNumbers}
          />

          {/* Gráfico de Barras Recharts: Frequência das 25 Dezenas nos Últimos 20 Concursos (Quentes & Frias) */}
          <FrequenciaVinteConcursosComponent
            latestDraw={latestDraw}
            dynamicStats={statsList}
            onApplyNumbers={onApplyNumbers}
          />

          {/* Dynamic Recharts Bar Chart (Histórico 3.800 Concursos) */}
          <FrequencyDelayChart
            statsList={statsList}
            cyclePendingNumbers={cyclePendingNumbers}
            latestDraw={latestDraw}
          />

          {/* Card Estatístico de Índice de Moldura vs Centro (Últimos 10 Concursos) */}
          <IndiceMolduraUltimos10Card
            latestDraw={latestDraw}
          />

          {/* Card Estatístico de Histórico de Paridade (Últimos 20 Concursos - 7/8 e 8/7) */}
          <HistoricoParidadeVinteConcursosCard
            latestDraw={latestDraw}
          />

          {/* Componente de Visualização de Distribuição de Números Primos (4 a 7 Primos por Volante) */}
          <DistribuicaoPrimosCard
            latestDraw={latestDraw}
          />

          {/* Gráfico de Dispersão D3.js: Correlação Frequência Histórica (100) vs Atraso Atual */}
          <CorrelacaoFrequenciaAtrasoD3Component
            statsList={statsList}
            latestDraw={latestDraw}
            onApplyNumbers={onApplyNumbers}
          />

          {/* Componente de Análise de Variância (Desvio de 13,0 • Concursos Inflados vs Deflados) */}
          <AnaliseVarianciaComponent
            latestDraw={latestDraw}
            onApplyBiasRecommendation={onApplyNumbers}
          />

          {/* Detailed Statistics Table */}
          <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-5 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-slate-800 gap-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Clock className="w-4 h-4 text-emerald-400" />
                  <span>Tabela Detalhada de Frequência e Atraso das 25 Dezenas</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Atraso atual, último atraso, maior atraso histórico e média de ocorrência (dados oficiais do anexo).
                </p>
              </div>

            {/* Sorter */}
            <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
              <span className="text-slate-500 px-2 text-[11px]">Ordenar por:</span>
              <button
                onClick={() => setAtrasoSortOrder('atraso_desc')}
                className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer ${
                  atrasoSortOrder === 'atraso_desc'
                    ? 'bg-slate-800 text-white font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Maior Atraso
              </button>
              <button
                onClick={() => setAtrasoSortOrder('vezes_desc')}
                className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer ${
                  atrasoSortOrder === 'vezes_desc'
                    ? 'bg-slate-800 text-white font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Mais Sorteadas
              </button>
              <button
                onClick={() => setAtrasoSortOrder('dezena')}
                className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer ${
                  atrasoSortOrder === 'dezena'
                    ? 'bg-slate-800 text-white font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Dezena (1-25)
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-slate-950 text-slate-400 font-mono uppercase text-[10px] border-b border-slate-800">
                  <th className="py-2.5 px-3">Dezena</th>
                  <th className="py-2.5 px-3 text-center">Frequência Total</th>
                  <th className="py-2.5 px-3 text-center">Atraso Atual</th>
                  <th className="py-2.5 px-3 text-center">Último Atraso</th>
                  <th className="py-2.5 px-3 text-center">Maior Histórico</th>
                  <th className="py-2.5 px-3 text-center">Atraso Médio</th>
                  <th className="py-2.5 px-3 text-center">Status / Pressão</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {sortedDezenas.map((dez) => {
                  const isHighDelay = dez.atrasoAtual >= 3;
                  const isCycleKey = dez.numero === 17 || dez.numero === 22;

                  return (
                    <tr
                      key={dez.numero}
                      className={`hover:bg-slate-800/40 transition ${
                        isCycleKey ? 'bg-amber-500/5' : ''
                      }`}
                    >
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2 font-bold text-white text-sm">
                          <span
                            className={`inline-flex items-center justify-center w-7 h-7 rounded-lg font-mono ${
                              isCycleKey
                                ? 'bg-amber-500 text-slate-950 font-black'
                                : dez.atrasoAtual === 0
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : 'bg-slate-800 text-slate-200'
                            }`}
                          >
                            {dez.numero.toString().padStart(2, '0')}
                          </span>
                          {isCycleKey && (
                            <span className="text-[10px] font-sans font-black text-amber-400 bg-amber-500/20 px-1.5 py-0.5 rounded">
                              CICLO 804
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-2.5 px-3 text-center text-slate-200 font-bold">
                        {dez.vezes.toLocaleString()}
                        <span className="text-[10px] text-slate-500 ml-1">
                          ({((dez.vezes / 3800) * 100).toFixed(1)}%)
                        </span>
                      </td>

                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-bold ${
                            dez.atrasoAtual === 0
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : isHighDelay
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 font-black'
                              : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          {dez.atrasoAtual} {dez.atrasoAcimaDaMedia ? '+' : ''}
                        </span>
                      </td>

                      <td className="py-2.5 px-3 text-center text-slate-400">
                        {dez.atrasoUltimo}
                      </td>

                      <td className="py-2.5 px-3 text-center text-slate-400">
                        {dez.maiorAtraso} conc.
                      </td>

                      <td className="py-2.5 px-3 text-center text-slate-400">
                        {dez.atrasoMedio.toFixed(1)} {dez.atrasoAcimaDaMedia ? '(+)' : ''}
                      </td>

                      <td className="py-2.5 px-3 text-center font-sans">
                        {isCycleKey ? (
                          <span className="text-amber-400 font-bold text-[11px]">
                            ⚡ Pressão Máxima (Ciclo)
                          </span>
                        ) : dez.atrasoAtual === 0 ? (
                          <span className="text-emerald-400 text-[11px]">
                            ✓ Saiu no #{latestDraw.concurso}
                          </span>
                        ) : dez.atrasoAcimaDaMedia ? (
                          <span className="text-rose-400 font-medium text-[11px]">
                            Acima da Média
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">Normal</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Módulo Especial: Pares de Ouro (Identificação Automática de Duplas de Alta Afinidade) */}
        <ParesDeOuroModule
          latestDraw={latestDraw}
          onApplyPairAsFilter={(pair) => {
            if (onApplyNumbers) onApplyNumbers([pair[0], pair[1]]);
          }}
        />
      </div>
      )}

      {/* SUBTAB: GRÁFICO DE DISPERSÃO D3.JS (CORRELAÇÃO FREQUÊNCIA 100 VS ATRASO ATUAL) */}
      {activeSubTab === 'correlacao_d3' && (
        <div className="space-y-6">
          <CorrelacaoFrequenciaAtrasoD3Component
            statsList={statsList}
            latestDraw={latestDraw}
            onApplyNumbers={onApplyNumbers}
          />
        </div>
      )}

      {/* SUBTAB: FREQUÊNCIA DAS 25 DEZENAS NOS ÚLTIMOS 20 CONCURSOS (RECHARTS • QUENTES & FRIAS) */}
      {activeSubTab === 'frequencia_20' && (
        <FrequenciaVinteConcursosComponent
          latestDraw={latestDraw}
          dynamicStats={statsList}
          onApplyNumbers={onApplyNumbers}
        />
      )}

      {/* SUBTAB: SIMULAÇÃO DE BACKTESTING (DESEMPENHO REAL VS PROJETADO & 100 CONCURSOS REAIS) */}
      {activeSubTab === 'simulacao_backtest' && (
        <div className="space-y-6">
          <BacktestingEstrategias100Card
            latestDraw={latestDraw}
            savedTickets={savedTickets}
            dynamicStats={statsList}
            onNavigateToFechamento={() => {
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('switch-tab', { detail: 'fechamento' }));
              }
            }}
          />

          <SimulacaoBacktestingComponent
            latestDraw={latestDraw}
            savedTickets={savedTickets}
            statsList={statsList}
            onApplyNumbers={onApplyNumbers}
            onGoToFechamento={() => {
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('switch-tab', { detail: 'fechamento' }));
              }
            }}
          />
        </div>
      )}

      {/* SUBTAB: MAPA DE CALOR DE VAZIOS (COMBINAÇÕES ANTI-AFINIDADE 10 CONCURSOS) */}
      {activeSubTab === 'mapa_vazios' && (
        <MapaCalorVaziosComponent
          latestDraw={latestDraw}
          statsList={statsList}
          onApplyExclusionsToFechamento={(pairs) => {
            if (onApplyNumbers && pairs.length > 0) {
              onApplyNumbers([pairs[0][0], pairs[0][1]]);
            }
          }}
          onGoToFechamento={() => {
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('switch-tab', { detail: 'fechamento' }));
            }
          }}
        />
      )}

      {/* SUBTAB: DASHBOARD DE DESEMPENHO FINANCEIRO (GERENCIADOR VS RETORNO TEÓRICO) */}
      {activeSubTab === 'desempenho_financeiro' && (
        <DashboardDesempenhoFinanceiroComponent
          latestDraw={latestDraw}
          savedTickets={savedTickets}
          statsList={statsList}
          onApplyNumbers={onApplyNumbers}
          onGoToGamesManager={() => {
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('switch-tab', { detail: 'jogos' }));
            }
          }}
        />
      )}

      {/* SUBTAB: PERFORMANCE HISTÓRICA DOS JOGOS (MÉDIA DE ACERTOS & ROI 10 CONCURSOS) */}
      {activeSubTab === 'performance_historica' && (
        <RastreadorPerformanceHistoricaComponent
          latestDraw={latestDraw}
          savedTickets={savedTickets}
          statsList={statsList}
          onApplyNumbers={onApplyNumbers}
        />
      )}

      {/* SUBTAB: CURVA ABC DAS DEZENAS (PRINCÍPIO DE PARETO 80/20) */}
      {activeSubTab === 'curva_abc' && (
        <CurvaAbcDezenasComponent
          statsList={statsList}
          latestDraw={latestDraw}
          onApplyNumbers={onApplyNumbers}
        />
      )}

      {/* SUBTAB: RADAR DE TENDÊNCIAS QUENTES (MÉDIA MÓVEL EXPONENCIAL EMA) */}
      {activeSubTab === 'radar_quentes' && (
        <RadarTendenciasQuentesComponent
          latestDraw={latestDraw}
          statsList={statsList}
          onApplyNumbers={onApplyNumbers}
        />
      )}

      {/* SUBTAB: ROI FORECAST & RENTABILIDADE (ÚLTIMOS 10 CONCURSOS) */}
      {activeSubTab === 'roi_forecast' && (
        <ROIForecastComponent
          latestDraw={latestDraw}
          savedTickets={savedTickets}
          fechamentoNome={fechamentoNome}
          onApplyNumbers={onApplyNumbers}
        />
      )}

      {/* SUBTAB: ESPELHAMENTO DE DEZENAS (CO-OCORRÊNCIA DE PARES & TRIOS) */}
      {activeSubTab === 'espelhamento' && (
        <EspelhamentoDezenasModule
          latestDraw={latestDraw}
          statsList={statsList}
          onApplyNumbers={onApplyNumbers}
        />
      )}

      {/* SUBTAB: ANÁLISE DE ESPELHAMENTO DO CONCURSO (DEZENAS AUSENTES & CORRELAÇÃO) */}
      {activeSubTab === 'analise_espelho' && (
        <AnaliseEspelhamentoConcursoModule
          latestDraw={latestDraw}
          statsList={statsList}
          onApplyNumbers={onApplyNumbers}
        />
      )}

      {/* SUBTAB: SAZONALIDADE DE DEZENAS (HISTÓRICO 10 ANOS) */}
      {activeSubTab === 'sazonalidade' && (
        <SazonalidadeDezenasModule
          latestDraw={latestDraw}
          onApplyNumbers={onApplyNumbers}
        />
      )}

      {/* SUBTAB: LINHA DO TEMPO DE CICLOS (ÚLTIMOS 10 CICLOS) */}
      {activeSubTab === 'ciclos_timeline' && (
        <LinhaDoTempoCiclosComponent
          latestDraw={latestDraw}
          onApplyCycleNumbers={onApplyNumbers}
        />
      )}

      {/* SUBTAB: SIMULAÇÃO DE MONTE CARLO (PRÓXIMOS 5 CONCURSOS) */}
      {activeSubTab === 'montecarlo' && (
        <MonteCarloSimulation
          latestDraw={latestDraw}
          statsList={statsList}
          cyclePendingNumbers={cyclePendingNumbers}
          onApplyNumbers={onApplyNumbers}
        />
      )}

      {/* SUBTAB 2: DUPLAS AMIGAS / PARES DE OURO */}
      {activeSubTab === 'duplas' && (
        <ParesDeOuroModule
          latestDraw={latestDraw}
          onApplyPairAsFilter={(pair) => {
            if (onApplyNumbers) onApplyNumbers([pair[0], pair[1]]);
          }}
        />
      )}

      {/* SUBTAB 3: CICLOS DA LOTOFÁCIL */}
      {activeSubTab === 'ciclos' && (
        <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-5 shadow-xl space-y-5">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <RotateCw className="w-4 h-4 text-emerald-400" />
              <span>Controle Rigoroso de Ciclos Normais e Ciclo Inverso</span>
            </h3>
            <p className="text-xs text-slate-400">
              O ciclo da Lotofácil mede a quantidade de sorteios necessários até que todas as 25
              dezenas tenham saído ao menos uma vez.
            </p>
          </div>

          {/* Current Cycle Highlight Card */}
          <div className="bg-gradient-to-r from-amber-950/40 via-slate-950 to-slate-950 border border-amber-500/40 rounded-xl p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <span className="text-amber-400 text-xs font-bold uppercase tracking-wider">
                  Ciclo Atual em Aberto (Ciclo 804)
                </span>
                <h4 className="text-lg font-black text-white mt-0.5">
                  Faltam apenas 2 dezenas para o fechamento do ciclo
                </h4>
                <p className="text-xs text-slate-300 mt-1">
                  Atualmente com <strong className="text-white">4 concursos decorridos</strong>. A
                  média histórica de todos os 804 ciclos é de{' '}
                  <strong className="text-emerald-400">4,7 concursos</strong>. A probabilidade de
                  fechar no 5º concurso é superior a 78%.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-amber-500/20 border border-amber-500/40 min-w-[70px]">
                  <span className="font-mono text-2xl font-black text-amber-300">17</span>
                  <span className="text-[10px] text-amber-400 font-bold uppercase">Atraso 7</span>
                </div>
                <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-amber-500/20 border border-amber-500/40 min-w-[70px]">
                  <span className="font-mono text-2xl font-black text-amber-300">22</span>
                  <span className="text-[10px] text-amber-400 font-bold uppercase">Atraso 5</span>
                </div>
              </div>
            </div>
          </div>

          {/* Ciclo Inverso */}
          <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800 text-xs space-y-2">
            <h5 className="font-bold text-emerald-400 text-sm">
              Ciclo Inverso (Exclusivo NumeroMania & LotoMatrix Pro)
            </h5>
            <p className="text-slate-300">
              Processado na ordem cronológica decrescente a partir do concurso 3800. Se a dezena{' '}
              <strong className="text-amber-400 font-mono font-bold">17</strong> for sorteada no
              próximo concurso, fecha-se um ciclo inverso iniciado no concurso 3794 (com 6
              concursos de duração).
            </p>
          </div>
        </div>
      )}

      {/* SUBTAB 4: PADRÕES CANÔNICOS */}
      {activeSubTab === 'padroes' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Paridade Table */}
          <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-5 shadow-xl space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 pb-2 border-b border-slate-800">
              <Layers className="w-4 h-4 text-emerald-400" />
              <span>Distribuição Histórica de Pares e Ímpares</span>
            </h3>

            <div className="space-y-2">
              {PARIDADE_HISTORICA.map((p, idx) => (
                <div
                  key={idx}
                  className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-850 flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-bold text-white block">{p.configuracao}</span>
                    <span className="text-[10px] text-slate-500">
                      Atraso atual: {p.atrasoAtual} conc.
                    </span>
                  </div>
                  <div className="text-right font-mono">
                    <span className="text-emerald-400 font-bold">{p.percentual}%</span>
                    <span className="text-[10px] text-slate-500 block">
                      {p.ocorrencias} sorteios
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Primos Table */}
          <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-5 shadow-xl space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 pb-2 border-b border-slate-800">
              <Layers className="w-4 h-4 text-purple-400" />
              <span>Incidência de Números Primos (2,3,5,7,11,13,17,19,23)</span>
            </h3>

            <div className="space-y-2">
              {PRIMOS_HISTORICA.map((p, idx) => (
                <div
                  key={idx}
                  className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-850 flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-bold text-white block">{p.primos} Primos no Bilhete</span>
                    <span className="text-[10px] text-slate-500">
                      Atraso atual: {p.atrasoAtual} conc.
                    </span>
                  </div>
                  <div className="text-right font-mono">
                    <span className="text-purple-400 font-bold">{p.percentual}%</span>
                    <span className="text-[10px] text-slate-500 block">
                      {p.ocorrencias} sorteios
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB DEDICADA: RADAR DE DEZENAS QUENTES & FRIAS */}
      {activeSubTab === 'quentes_frias' && (
        <QuentesFriasModule
          latestDraw={latestDraw}
          statsList={statsList}
          cyclePendingNumbers={cyclePendingNumbers}
          onApplyNumbers={onApplyNumbers}
        />
      )}

      {/* SUBTAB: RADAR DA ZONA DE OURO & ADERÊNCIA ESTATÍSTICA 0-100% */}
      {activeSubTab === 'radar_ouro' && (
        <RadarZoneGoldChart latestDraw={latestDraw} />
      )}

      {/* SUBTAB: DEZENAS EM ASCENSÃO (MOMENTUM ÚLTIMOS 10 CONCURSOS) */}
      {activeSubTab === 'ascensao' && (
        <DezenasAscensaoModule latestDraw={latestDraw} onApplyNumbers={onApplyNumbers} />
      )}

      {/* SUBTAB: DICAS DE OURO DA LOTOFÁCIL */}
      {activeSubTab === 'dicas_ouro' && (
        <DicasDeOuroPanel />
      )}

      {/* SUBTAB: PARES DE OURO COM MAIOR AFINIDADE */}
      {activeSubTab === 'pares_ouro' && (
        <ParesDeOuroModule
          latestDraw={latestDraw}
          onApplyPairAsFilter={(pair) => {
            if (onApplyNumbers) onApplyNumbers([pair[0], pair[1]]);
          }}
        />
      )}

      {/* SUBTAB: EVOLUÇÃO DA PONTUAÇÃO MÉDIA (ÚLTIMOS 10 CONCURSOS) */}
      {activeSubTab === 'evolucao' && (
        <EvolucaoPontuacaoChart latestDraw={latestDraw} />
      )}

      {/* SUBTAB: ANÁLISE DE VARIÂNCIA (DESVIO DA MÉDIA 13,0) */}
      {activeSubTab === 'variancia' && (
        <AnaliseVarianciaComponent
          latestDraw={latestDraw}
          onApplyBiasRecommendation={onApplyNumbers}
        />
      )}

      {/* MODAL DE RELATÓRIO DE PERFORMANCE DETALHADO (100 CONCURSOS × 30 DIAS) */}
      <RelatorioPerformanceDetalhadoModal
        isOpen={isPerformanceModalOpen}
        onClose={() => setIsPerformanceModalOpen(false)}
        latestDraw={latestDraw}
        savedTickets={savedTickets}
        dynamicStats={statsList}
      />
    </div>
  );
};
