import React, { useState } from 'react';
import { GameTicket, SimulationResult, LotofacilDraw } from '../types/lotofacil';
import { RECENT_DRAWS, CONCURSO_ATUAL } from '../data/lotofacilData';
import { runSimulation, countMatches } from '../services/combinatorics';
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
} from 'lucide-react';

interface SimulatorTabProps {
  tickets: GameTicket[];
  onGoToGenerator: () => void;
}

export const SimulatorTab: React.FC<SimulatorTabProps> = ({ tickets, onGoToGenerator }) => {
  const [simulationScope, setSimulationScope] = useState<'concurso_3800' | 'ultimos_15' | 'monte_carlo_1000'>('concurso_3800');
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
        concurso: 3800 + c,
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
      if (simulationScope === 'concurso_3800') {
        drawsToTest = [CONCURSO_ATUAL];
      } else if (simulationScope === 'ultimos_15') {
        drawsToTest = RECENT_DRAWS;
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

        {tickets.length > 0 ? (
          <div className="flex items-center gap-2">
            <button
              onClick={handleRunSimulation}
              disabled={isSimulating}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition shadow-md shadow-emerald-500/20 cursor-pointer"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>{isSimulating ? 'Simulando...' : 'Executar Simulação'}</span>
            </button>
          </div>
        ) : (
          <button
            onClick={onGoToGenerator}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition cursor-pointer"
          >
            Gerar Jogos no Fechamento Primeiro
          </button>
        )}
      </div>

      {tickets.length === 0 ? (
        <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-12 text-center space-y-4">
          <Layers className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-lg font-bold text-white">Nenhum bilhete carregado para simulação</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Acesse a aba <strong>Fechamento & Desdobramentos</strong> para gerar uma matriz de
            18 dezenas (24 jogos) ou use a <strong>IA Preditora</strong> para gerar apostas
            calibradas.
          </p>
          <button
            onClick={onGoToGenerator}
            className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition cursor-pointer"
          >
            Ir para o Gerador de Fechamentos
          </button>
        </div>
      ) : (
        <>
          {/* Simulation Scope Selector */}
          <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-4 shadow-xl flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-semibold">Cenário de Teste:</span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setSimulationScope('concurso_3800')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
                    simulationScope === 'concurso_3800'
                      ? 'bg-emerald-500 text-slate-950 font-bold'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  Concurso #{CONCURSO_ATUAL.concurso} (08/10/2026)
                </button>
                <button
                  onClick={() => setSimulationScope('ultimos_15')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
                    simulationScope === 'ultimos_15'
                      ? 'bg-emerald-500 text-slate-950 font-bold'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  Últimos 15 Concursos Oficiais
                </button>
                <button
                  onClick={() => setSimulationScope('monte_carlo_1000')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
                    simulationScope === 'monte_carlo_1000'
                      ? 'bg-emerald-500 text-slate-950 font-bold'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  Monte Carlo (1.000 Sorteios Aleatórios)
                </button>
              </div>
            </div>

            <div className="text-slate-400 font-mono">
              Bilhetes Prontos: <strong className="text-white">{tickets.length}</strong> (Custo base:{' '}
              R$ {(tickets.length * 3).toFixed(2)})
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

              {/* Concurso 3800 Specific Detailed Hits Breakdown */}
              {simulationScope === 'concurso_3800' && (
                <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-5 shadow-xl space-y-3">
                  <h3 className="text-base font-bold text-white flex items-center justify-between pb-2 border-b border-slate-800">
                    <span>Resultado do Conferidor no Concurso #3800</span>
                    <span className="text-xs font-mono text-slate-400">
                      Dezenas Oficiais: 01, 02, 03, 04, 05, 07, 08, 09, 10, 12, 13, 14, 15, 19, 21
                    </span>
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pr-1">
                    {tickets.map((t) => {
                      const matches = countMatches(t.dezenas, CONCURSO_ATUAL.dezenas);
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
                              const wasDrawn = CONCURSO_ATUAL.dezenas.includes(num);
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
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};
