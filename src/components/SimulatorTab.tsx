import React, { useState } from 'react';
import { GameTicket, SimulationResult, LotofacilDraw } from '../types/lotofacil';
import { RECENT_DRAWS, CONCURSO_ATUAL } from '../data/lotofacilData';
import { runSimulation, countMatches, VALOR_APOSTA_LOTOFACIL, FECHAMENTO_PRESETS } from '../services/combinatorics';
import { EspelhoAnalysisTab } from './EspelhoAnalysisTab';
import { CostBenefitCalculator } from './CostBenefitCalculator';
import { AnimatedDrawChecker } from './AnimatedDrawChecker';
import { EfficiencyReportModal } from './EfficiencyReportModal';
import { TotalizadorDeCustos } from './TotalizadorDeCustos';
import {
  Play,
  RotateCcw,
  TrendingUp,
  DollarSign,
  Award,
  Layers,
  Sparkles,
  CheckCircle2,
  Calendar,
  Calculator,
  Film,
  FileSpreadsheet,
  BarChart3,
  Download,
  ArrowRight,
} from 'lucide-react';

interface SimulatorTabProps {
  tickets: GameTicket[];
  latestDraw?: LotofacilDraw;
  onGoToGenerator: () => void;
  onGoToGamesManager?: () => void;
}

export const SimulatorTab: React.FC<SimulatorTabProps> = ({
  tickets,
  latestDraw = CONCURSO_ATUAL,
  onGoToGenerator,
  onGoToGamesManager,
}) => {
  const handleGoToGamesManager = () => {
    if (onGoToGamesManager) {
      onGoToGamesManager();
    } else {
      window.dispatchEvent(new CustomEvent('switch-tab', { detail: 'jogos' }));
    }
  };
  const [activeSubTab, setActiveSubTab] = useState<'backtest' | 'calculadora' | 'animacao' | 'espelho'>('backtest');
  const [isEfficiencyModalOpen, setIsEfficiencyModalOpen] = useState(false);
  const [simulationScope, setSimulationScope] = useState<
    'concurso_3803' | 'concurso_3802' | 'concurso_3801' | 'ultimos_15' | 'monte_carlo_1000'
  >('concurso_3803');
  const [results, setResults] = useState<SimulationResult | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  // Generate synthetic random draws according to historical distribution for 1,000 simulation runs
  const generateMonteCarloDraws = (count: number): LotofacilDraw[] => {
    const list: LotofacilDraw[] = [];
    const pool = Array.from({ length: 25 }, (_, i) => i + 1);

    for (let c = 1; c <= count; c++) {
      // Fisher-yates shuffle
      const shuffled = [...pool].sort(() => Math.random() - 0.5);
      const drawn = shuffled.slice(0, 15).sort((a, b) => a - b);
      list.push({
        concurso: latestDraw.concurso + c,
        data: `Simulação #${c}`,
        dezenas: drawn,
      });
    }
    return list;
  };

  const handleRunSimulation = () => {
    if (tickets.length === 0) return;
    setIsSimulating(true);

    setTimeout(() => {
      let drawsToTest: LotofacilDraw[] = [];
      const draw3803 = RECENT_DRAWS.find((d) => d.concurso === 3803) || latestDraw;
      const draw3802 = RECENT_DRAWS.find((d) => d.concurso === 3802) || latestDraw;
      const draw3801 = RECENT_DRAWS.find((d) => d.concurso === 3801) || latestDraw;

      if (simulationScope === 'concurso_3803') {
        drawsToTest = [draw3803];
      } else if (simulationScope === 'concurso_3802') {
        drawsToTest = [draw3802];
      } else if (simulationScope === 'concurso_3801') {
        drawsToTest = [draw3801];
      } else if (simulationScope === 'ultimos_15') {
        drawsToTest = RECENT_DRAWS.slice(0, 15);
      } else {
        drawsToTest = generateMonteCarloDraws(1000);
      }

      const res = runSimulation(tickets, drawsToTest);
      setResults(res);
      setIsSimulating(false);
    }, 200);
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-5 shadow-xl flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <Award className="w-5 h-5 text-emerald-400" />
            <span>Simulador de Alta Precisão & Backtesting Monte Carlo</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Validação matemática da sua matriz de bilhetes contra concursos reais da Caixa ou
            testes probabilísticos de Monte Carlo em larga escala.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setIsEfficiencyModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/40 border border-indigo-500/50 text-indigo-300 font-bold text-xs transition cursor-pointer shadow-sm"
            title="Relatório de Eficiência: ROI histórico de estratégias (18D vs 19D) ao longo dos últimos 200 concursos"
          >
            <BarChart3 className="w-4 h-4 text-indigo-400" />
            <span>Relatório de Eficiência (ROI 200)</span>
          </button>

          {tickets.length > 0 && (
            <button
              type="button"
              onClick={handleGoToGamesManager}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs transition shadow-md shadow-emerald-500/20 active:scale-95 cursor-pointer whitespace-nowrap"
              title="Ir para Meus Jogos & Conferidor mantendo os jogos gerados"
            >
              <Download className="w-4 h-4 text-slate-950" />
              <span>Gerenciar & Conferir ({tickets.length})</span>
              <ArrowRight className="w-4 h-4 text-slate-950" />
            </button>
          )}

          {tickets.length > 0 ? (
            <button
              onClick={handleRunSimulation}
              disabled={isSimulating}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition shadow-md shadow-emerald-500/20 cursor-pointer"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>{isSimulating ? 'Simulando...' : 'Executar Simulação'}</span>
            </button>
          ) : (
            <button
              onClick={onGoToGenerator}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition cursor-pointer"
            >
              Gerar Jogos no Fechamento Primeiro
            </button>
          )}
        </div>
      </div>

      {/* Subtab Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/90 p-2.5 rounded-2xl border border-slate-800 shadow-xl">
        <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold">
          <button
            onClick={() => setActiveSubTab('backtest')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition cursor-pointer ${
              activeSubTab === 'backtest'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20 font-bold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Award className="w-4 h-4" />
            <span>Simulador & Backtest Principal</span>
          </button>

          <button
            onClick={() => setActiveSubTab('calculadora')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition cursor-pointer ${
              activeSubTab === 'calculadora'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20 font-bold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Calculator className="w-4 h-4" />
            <span>Calculadora Custo-Benefício (15 a 21)</span>
          </button>

          <button
            onClick={() => setActiveSubTab('animacao')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition cursor-pointer ${
              activeSubTab === 'animacao'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-bold'
                : 'text-amber-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Sorteio Animado Bola a Bola</span>
          </button>

          <button
            onClick={() => setActiveSubTab('espelho')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition cursor-pointer ${
              activeSubTab === 'espelho'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/25 font-bold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <RotateCcw className="w-4 h-4 text-purple-400" />
            <span>Análise do Espelho</span>
            <span
              className={`text-[9px] font-bold px-1.5 py-0.5 rounded font-mono ${
                activeSubTab === 'espelho'
                  ? 'bg-purple-950 text-purple-200 border border-purple-400/30'
                  : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
              }`}
            >
              10 NÃO ESCOLHIDAS
            </span>
          </button>
        </div>

        {tickets.length > 0 && (
          <div className="text-xs text-slate-400 font-mono px-2">
            Base: <strong className="text-white">{tickets.length}</strong> bilhetes salvos
          </div>
        )}
      </div>

      {/* Modal de Relatório de Eficiência */}
      <EfficiencyReportModal
        isOpen={isEfficiencyModalOpen}
        onClose={() => setIsEfficiencyModalOpen(false)}
      />

      {/* Render Subtab Views */}
      {activeSubTab === 'calculadora' ? (
        <CostBenefitCalculator />
      ) : activeSubTab === 'animacao' ? (
        tickets.length > 0 ? (
          <AnimatedDrawChecker
            tickets={tickets}
            targetDraw={latestDraw}
          />
        ) : (
          <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-12 text-center space-y-4">
            <Sparkles className="w-12 h-12 text-amber-500/60 mx-auto" />
            <h3 className="text-lg font-bold text-white">Nenhum bilhete carregado para conferência animada</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Gere uma matriz na aba <strong>Fechamento & Desdobramentos</strong> para acompanhar a revelação bola a bola dos seus bilhetes.
            </p>
            <button
              onClick={onGoToGenerator}
              className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition cursor-pointer"
            >
              Ir para o Gerador de Fechamentos
            </button>
          </div>
        )
      ) : activeSubTab === 'espelho' ? (
        <EspelhoAnalysisTab
          tickets={tickets}
          latestDraw={latestDraw}
          onGoToGenerator={onGoToGenerator}
        />
      ) : tickets.length === 0 ? (
        <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-12 text-center space-y-4">
          <Layers className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-lg font-bold text-white">Nenhum bilhete carregado para simulação</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Acesse a aba <strong>Fechamento & Desdobramentos</strong> para gerar uma matriz de
            18 dezenas (24 jogos) ou use a <strong>IA Preditora</strong> para gerar apostas
            calibradas.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={onGoToGenerator}
              className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition cursor-pointer"
            >
              Ir para o Gerador de Fechamentos
            </button>
            <button
              onClick={handleGoToGamesManager}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-emerald-500/30 font-bold text-xs transition cursor-pointer shadow-sm"
              title="Acessar Meus Jogos & Conferidor"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span>Gerenciar & Conferir</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Totalizador de Custos dos Jogos Gerados com Botão de Atalho 'Gerenciar & Conferir' */}
          <TotalizadorDeCustos
            preset={FECHAMENTO_PRESETS['18_14_15']}
            targetCount={tickets[0]?.dezenas?.length || 18}
            totalJogos={tickets.length}
            isGenerated={true}
            title="Totalizador de Custos dos Jogos Gerados"
            subtitle={`Investimento total calculado: ${tickets.length} jogos × R$ 3,50 = R$ ${(
              tickets.length * VALOR_APOSTA_LOTOFACIL
            ).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
            shortcutButtonLabel="Gerenciar & Conferir"
            onGoToGamesManager={handleGoToGamesManager}
          />

          {/* Simulation Scope Selector */}
          <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-4 shadow-xl flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-semibold">Cenário de Teste:</span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setSimulationScope('concurso_3803')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
                    simulationScope === 'concurso_3803'
                      ? 'bg-emerald-500 text-slate-950 font-bold'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  Concurso #3803 (13/10)
                </button>
                <button
                  onClick={() => setSimulationScope('concurso_3802')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
                    simulationScope === 'concurso_3802'
                      ? 'bg-emerald-500 text-slate-950 font-bold'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  Concurso #3802 (11/10)
                </button>
                <button
                  onClick={() => setSimulationScope('concurso_3801')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
                    simulationScope === 'concurso_3801'
                      ? 'bg-emerald-500 text-slate-950 font-bold'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  Concurso #3801 (09/10)
                </button>
                <button
                  onClick={() => setSimulationScope('ultimos_15')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
                    simulationScope === 'ultimos_15'
                      ? 'bg-emerald-500 text-slate-950 font-bold'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  Últimos 15 Concursos
                </button>
                <button
                  onClick={() => setSimulationScope('monte_carlo_1000')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
                    simulationScope === 'monte_carlo_1000'
                      ? 'bg-emerald-500 text-slate-950 font-bold'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  Monte Carlo (1.000 Sorteios)
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="text-slate-400 font-mono">
                Bilhetes Prontos: <strong className="text-white">{tickets.length}</strong> (Custo oficial:{' '}
                <span className="text-emerald-400 font-bold">R$ {(tickets.length * VALOR_APOSTA_LOTOFACIL).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>)
              </div>
              <button
                type="button"
                onClick={handleGoToGamesManager}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 font-bold text-xs transition cursor-pointer shadow-sm active:scale-95"
                title="Acessar Meus Jogos & Conferidor"
              >
                <Download className="w-3.5 h-3.5 text-emerald-400" />
                <span>Gerenciar & Conferir</span>
                <ArrowRight className="w-3.5 h-3.5 text-emerald-400" />
              </button>
            </div>
          </div>

          {/* Results Display */}
          {results && (
            <div className="space-y-6">
              {/* Scorecard Financial & Hits */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
                  <span className="text-[11px] text-slate-400 block">Total Investido</span>
                  <strong className="text-white font-mono text-base font-bold">
                    R$ {results.custoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </strong>
                </div>

                <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
                  <span className="text-[11px] text-slate-400 block">Total Premiado</span>
                  <strong className="text-emerald-400 font-mono text-base font-bold">
                    R$ {results.premioTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </strong>
                </div>

                <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
                  <span className="text-[11px] text-slate-400 block">Saldo Líquido</span>
                  <strong
                    className={`font-mono text-base font-bold ${
                      results.saldoLiquido >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    R$ {results.saldoLiquido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </strong>
                </div>

                <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
                  <span className="text-[11px] text-slate-400 block">14 Pontos (R$ 1.505)</span>
                  <strong className="text-amber-400 font-mono text-base font-bold">
                    {results.acertos14} acertos
                  </strong>
                </div>

                <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
                  <span className="text-[11px] text-slate-400 block">13 Pontos (R$ 35)</span>
                  <strong className="text-teal-400 font-mono text-base font-bold">
                    {results.acertos13} acertos
                  </strong>
                </div>

                <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
                  <span className="text-[11px] text-slate-400 block">11 e 12 Pontos</span>
                  <strong className="text-slate-300 font-mono text-base font-bold">
                    {results.acertos11 + results.acertos12} acertos
                  </strong>
                </div>
              </div>

              {/* Single Contest Specific Detailed Hits Breakdown */}
              {simulationScope.startsWith('concurso_') && (() => {
                const concursoNum = simulationScope === 'concurso_3803' ? 3803 : simulationScope === 'concurso_3802' ? 3802 : 3801;
                const targetTestDraw = RECENT_DRAWS.find(d => d.concurso === concursoNum) || latestDraw;

                return (
                  <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-5 shadow-xl space-y-3">
                    <h3 className="text-base font-bold text-white flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-slate-800 gap-1">
                      <span>Resultado do Conferidor no Concurso #{targetTestDraw.concurso} ({targetTestDraw.data})</span>
                      <span className="text-xs font-mono text-emerald-400">
                        Dezenas Sorteadas: {targetTestDraw.dezenas.map(n => n.toString().padStart(2, '0')).join(', ')}
                      </span>
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pr-1">
                      {tickets.map((t) => {
                        const matches = countMatches(t.dezenas, targetTestDraw.dezenas);
                        const isAwarded = matches >= 11;

                      return (
                        <div
                          key={t.id}
                          className={`p-3 rounded-xl border transition ${
                            matches >= 14
                              ? 'bg-amber-500/10 border-amber-500/40 ring-1 ring-amber-400/40'
                              : matches >= 13
                              ? 'bg-emerald-500/10 border-emerald-500/30'
                              : isAwarded
                              ? 'bg-slate-950/80 border-slate-800'
                              : 'bg-slate-950/40 border-slate-850 opacity-70'
                          }`}
                        >
                          <div className="flex items-center justify-between text-xs mb-2">
                            <span className="font-mono font-bold text-white">
                              Bilhete #{t.index.toString().padStart(2, '0')}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded font-mono font-black text-xs ${
                                matches >= 14
                                  ? 'bg-amber-400 text-slate-950'
                                  : matches >= 11
                                  ? 'bg-emerald-500/20 text-emerald-300'
                                  : 'bg-slate-800 text-slate-400'
                              }`}
                            >
                              {matches} ACERTOS {matches >= 11 ? '★ PREMIADO' : ''}
                            </span>
                          </div>

                          <div className="flex flex-wrap gap-1">
                            {t.dezenas.map((num) => {
                              const wasDrawn = targetTestDraw.dezenas.includes(num);
                              return (
                                <span
                                  key={num}
                                  className={`inline-flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 rounded text-xs font-mono font-bold ${
                                    wasDrawn
                                      ? 'bg-emerald-500 text-slate-950 font-black'
                                      : 'bg-slate-800 text-slate-500'
                                  }`}
                                >
                                  {num.toString().padStart(2, '0')}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
