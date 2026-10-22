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
import { GameTicket } from '../types/lotofacil';
import {
  BarChart,
  TrendingUp,
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
    | 'roi_forecast'
    | 'variancia'
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
              INFLADO / DEFLADO
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

        <span className="text-[11px] font-mono text-slate-400 pr-2">
          Base: 3.800 Concursos Oficiais
        </span>
      </div>

      {/* SUBTAB 1: ATRASOS DAS DEZENAS */}
      {activeSubTab === 'atrasos' && (
        <div className="space-y-6">
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

          {/* Módulo Especial: Sequências de Quentes (Últimos 3 Concursos) e Frias (> 5 Concursos Ausentes) */}
          <QuentesFriasModule
            latestDraw={latestDraw}
            statsList={statsList}
            cyclePendingNumbers={cyclePendingNumbers}
            onApplyNumbers={onApplyNumbers}
          />

          {/* Dynamic Recharts Bar Chart */}
          <FrequencyDelayChart
            statsList={statsList}
            cyclePendingNumbers={cyclePendingNumbers}
            latestDraw={latestDraw}
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

      {/* SUBTAB: ROI FORECAST & RENTABILIDADE (ÚLTIMOS 10 CONCURSOS) */}
      {activeSubTab === 'roi_forecast' && (
        <ROIForecastComponent
          latestDraw={latestDraw}
          savedTickets={savedTickets}
          fechamentoNome={fechamentoNome}
          onApplyNumbers={onApplyNumbers}
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
    </div>
  );
};
