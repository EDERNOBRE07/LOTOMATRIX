import React, { useState } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Filter,
  Sparkles,
  Info,
  Scale,
  Zap,
  ArrowRight,
  Sliders,
  HelpCircle,
} from 'lucide-react';
import {
  MonitoringSummary,
  GameMonitoringResult,
  StatisticalAnomaly,
} from '../services/statisticalMonitor';

interface StatisticalMonitoringAlertProps {
  summary: MonitoringSummary;
  savedTicketsSummary?: MonitoringSummary;
  hasSavedTickets: boolean;
  activeFilter: 'all' | 'improbable' | string;
  onFilterChange: (filter: 'all' | 'improbable' | string) => void;
  onSelectGame?: (gameId: string) => void;
  onGoToFechamento?: () => void;
}

export const StatisticalMonitoringAlert: React.FC<StatisticalMonitoringAlertProps> = ({
  summary,
  savedTicketsSummary,
  hasSavedTickets,
  activeFilter,
  onFilterChange,
  onSelectGame,
  onGoToFechamento,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [activeTabSource, setActiveTabSource] = useState<'conferencia' | 'salvos'>(() => {
    if (savedTicketsSummary && savedTicketsSummary.improbableCount > 0) return 'salvos';
    return 'conferencia';
  });

  // Automatically focus on saved games if anomalies are detected there
  React.useEffect(() => {
    if (savedTicketsSummary && savedTicketsSummary.improbableCount > 0) {
      setActiveTabSource('salvos');
    }
  }, [savedTicketsSummary?.improbableCount]);

  // Determine current active summary based on tab
  const activeSummary =
    activeTabSource === 'salvos' && savedTicketsSummary ? savedTicketsSummary : summary;

  const hasAnomalies = activeSummary.improbableCount > 0;
  const isFilterActive = activeFilter === 'improbable';

  const savedTicketsHaveAnomalies =
    savedTicketsSummary && savedTicketsSummary.improbableCount > 0;

  return (
    <div className="space-y-3">
      {/* High-priority notification alert for saved games if anomalies exist */}
      {savedTicketsHaveAnomalies && activeTabSource !== 'salvos' && (
        <div className="bg-rose-950/80 border border-rose-500/50 rounded-xl p-3 px-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs shadow-lg shadow-rose-950/30 animate-pulse">
          <div className="flex items-center gap-2.5">
            <span className="p-1 rounded bg-rose-500/20 text-rose-300">
              <ShieldAlert className="w-4 h-4 text-rose-400" />
            </span>
            <div className="text-slate-200">
              <strong className="text-rose-300 font-bold">
                Atenção aos Jogos Salvos:
              </strong>{' '}
              <span>
                Detectamos {savedTicketsSummary.improbableCount} jogo(s) salvo(s) com padrões improváveis (ex: soma fora de 175-220 ou pares/ímpares desbalanceados).
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setActiveTabSource('salvos')}
            className="px-3 py-1 rounded-lg bg-rose-500 hover:bg-rose-400 text-slate-950 font-bold text-xs transition cursor-pointer shrink-0"
          >
            Ver Jogos Salvos Afetados
          </button>
        </div>
      )}

      {/* Main Alert Card */}
      <div
        className={`rounded-2xl border p-4 sm:p-5 transition-all shadow-xl relative overflow-hidden ${
          hasAnomalies
            ? 'bg-gradient-to-br from-amber-950/40 via-slate-900 to-rose-950/30 border-amber-500/40 shadow-amber-950/20'
            : 'bg-gradient-to-br from-emerald-950/30 via-slate-900 to-slate-950 border-emerald-500/30 shadow-emerald-950/20'
        }`}
      >
        {/* Glow Accent */}
        <div
          className={`absolute top-0 right-0 w-64 h-32 blur-3xl pointer-events-none opacity-20 ${
            hasAnomalies ? 'bg-amber-400' : 'bg-emerald-400'
          }`}
        />

        {/* Top Header: Status & Quick Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 relative z-10">
          <div className="flex items-start sm:items-center gap-3">
            <div
              className={`p-2.5 rounded-xl border shrink-0 ${
                hasAnomalies
                  ? 'bg-amber-500/15 text-amber-300 border-amber-500/30 shadow-md shadow-amber-500/10'
                  : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 shadow-md shadow-emerald-500/10'
              }`}
            >
              {hasAnomalies ? (
                <ShieldAlert className="w-5 h-5 sm:w-6 sm:h-6 text-amber-400 animate-pulse" />
              ) : (
                <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-400" />
              )}
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border font-mono ${
                    hasAnomalies
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  }`}
                >
                  {hasAnomalies ? '⚠️ ALERTA DE PROBABILIDADE' : '✓ CONFORMIDADE ESTATÍSTICA'}
                </span>

                {hasSavedTickets && (
                  <span className="text-[10px] text-slate-400 font-mono">
                    • Monitorando jogos salvos e conferência
                  </span>
                )}
              </div>

              <h3 className="text-base sm:text-lg font-black text-white tracking-tight mt-0.5">
                {hasAnomalies ? (
                  <span>
                    Sistema de Monitoramento:{' '}
                    <strong className="text-amber-300 font-extrabold">
                      {activeSummary.improbableCount} de {activeSummary.totalAnalyzed} jogo(s)
                    </strong>{' '}
                    com padrão improvável detectado!
                  </span>
                ) : (
                  <span>
                    Monitoramento Estatístico:{' '}
                    <strong className="text-emerald-300">100% dos jogos</strong> dentro dos
                    parâmetros canônicos de alta assertividade
                  </span>
                )}
              </h3>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 self-start md:self-auto shrink-0 flex-wrap">
            {hasAnomalies && (
              <button
                type="button"
                onClick={() => onFilterChange(isFilterActive ? 'all' : 'improbable')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  isFilterActive
                    ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20'
                    : 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40'
                }`}
              >
                <Filter className="w-3.5 h-3.5" />
                <span>
                  {isFilterActive
                    ? 'Exibindo Apenas Improváveis'
                    : `Filtrar ${activeSummary.improbableCount} Improváveis`}
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition cursor-pointer flex items-center gap-1.5"
            >
              <span>{isExpanded ? 'Recolher Detalhes' : 'Ver Análise Detalhada'}</span>
              {isExpanded ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>

        {/* Source Selector Tab (if user has saved tickets in Fechamento) */}
        {hasSavedTickets && savedTicketsSummary && (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-800/80 text-xs">
            <span className="text-slate-400 text-[11px] font-medium">Origem do Monitoramento:</span>
            <div className="inline-flex rounded-lg bg-slate-950 p-0.5 border border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setActiveTabSource('conferencia')}
                className={`px-2.5 py-1 rounded-md transition font-semibold cursor-pointer ${
                  activeTabSource === 'conferencia'
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Jogos da Conferência ({summary.totalAnalyzed})
                {summary.improbableCount > 0 && (
                  <span className="ml-1 text-[10px] px-1 rounded bg-amber-500/20 text-amber-300">
                    {summary.improbableCount} ⚠
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTabSource('salvos')}
                className={`px-2.5 py-1 rounded-md transition font-semibold cursor-pointer ${
                  activeTabSource === 'salvos'
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Meus Jogos Salvos ({savedTicketsSummary.totalAnalyzed})
                {savedTicketsSummary.improbableCount > 0 ? (
                  <span className="ml-1 text-[10px] px-1 rounded bg-rose-500/20 text-rose-300 font-bold">
                    {savedTicketsSummary.improbableCount} ⚠
                  </span>
                ) : (
                  <span className="ml-1 text-[10px] px-1 rounded bg-emerald-500/20 text-emerald-300">
                    ✓ OK
                  </span>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Quick Diagnostic Metric Chips */}
        {hasAnomalies && (
          <div className="mt-3.5 flex flex-wrap items-center gap-2 pt-3 border-t border-slate-800/80 text-xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Anomalias Encontradas:
            </span>

            {activeSummary.somaAnomaliesCount > 0 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-500/15 text-rose-300 border border-rose-500/30 font-semibold text-[11px]">
                <Scale className="w-3.5 h-3.5 text-rose-400" />
                <span>
                  {activeSummary.somaAnomaliesCount} jogo(s) com Soma fora de 175-220
                </span>
              </span>
            )}

            {activeSummary.paridadeAnomaliesCount > 0 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-300 border border-amber-500/30 font-semibold text-[11px]">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                <span>
                  {activeSummary.paridadeAnomaliesCount} jogo(s) com excesso de Pares/Ímpares (10+)
                </span>
              </span>
            )}

            {activeSummary.primosAnomaliesCount > 0 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-500/15 text-purple-300 border border-purple-500/30 font-semibold text-[11px]">
                <span>
                  {activeSummary.primosAnomaliesCount} jogo(s) com Primos fora da faixa (4-7)
                </span>
              </span>
            )}

            {activeSummary.molduraAnomaliesCount > 0 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-semibold text-[11px]">
                <span>
                  {activeSummary.molduraAnomaliesCount} jogo(s) com Moldura fora da faixa (8-11)
                </span>
              </span>
            )}

            {activeSummary.sequenciaAnomaliesCount > 0 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-500/15 text-red-300 border border-red-500/30 font-semibold text-[11px]">
                <span>
                  {activeSummary.sequenciaAnomaliesCount} jogo(s) com Sequência Longa (7+ seguidos)
                </span>
              </span>
            )}
          </div>
        )}

        {/* List of Affected Games Tags */}
        {hasAnomalies && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] text-slate-400 mr-1">Jogos sinalizados:</span>
            {activeSummary.gamesWithAnomalies.map((game) => (
              <button
                key={game.gameId}
                type="button"
                onClick={() => {
                  if (onSelectGame) onSelectGame(game.gameId);
                }}
                className="px-2 py-0.5 rounded-md bg-slate-800 hover:bg-amber-500/20 text-slate-200 hover:text-amber-300 border border-slate-700 hover:border-amber-500/40 text-[11px] font-mono font-bold transition cursor-pointer flex items-center gap-1"
                title={game.anomalies.map((a) => a.title).join(' • ')}
              >
                <span>{game.gameId}</span>
                <span className="text-amber-400">⚠</span>
                <span className="text-[10px] text-slate-400 font-normal">
                  (Soma {game.soma} • {game.pares}P/{game.impares}I)
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Expanded Details Section */}
        {isExpanded && (
          <div className="mt-4 pt-4 border-t border-slate-800 space-y-4 text-xs animate-in fade-in duration-200">
            {/* Educational Recommendation Box */}
            <div className="bg-slate-950/80 rounded-xl p-3.5 border border-slate-800 text-slate-300 space-y-2">
              <div className="flex items-center gap-2 font-bold text-white text-xs">
                <Info className="w-4 h-4 text-sky-400" />
                <span>Por que esses padrões são considerados estatisticamente improváveis?</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Na história de mais de 3.800 concursos oficiais da Lotofácil Caixa, mais de{' '}
                <strong className="text-emerald-300">82% dos sorteios</strong> têm soma das 15
                dezenas concentrada entre <strong className="text-white">175 e 220</strong>, e{' '}
                <strong className="text-emerald-300">62.3% dos sorteios</strong> apresentam paridade
                exata de <strong className="text-white">7 Pares / 8 Ímpares</strong> ou{' '}
                <strong className="text-white">8 Pares / 7 Ímpares</strong>. Apostar em bilhetes com
                somas extremas (&lt;175 ou &gt;220) ou com 10 ou mais números pares/ímpares reduz
                drasticamente a probabilidade de acerto.
              </p>
              {onGoToFechamento && (
                <button
                  type="button"
                  onClick={onGoToFechamento}
                  className="inline-flex items-center gap-1 text-[11px] text-emerald-400 hover:text-emerald-300 font-bold mt-1 transition cursor-pointer"
                >
                  <span>Recalibrar filtros automáticos no Fechamento</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Individual Anomaly Breakdown */}
            <div className="space-y-2.5">
              <h4 className="font-bold text-white text-xs flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-amber-400" />
                <span>Detalhamento dos Bilhetes Sinalizados ({activeSummary.gamesWithAnomalies.length}):</span>
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-[350px] overflow-y-auto pr-1">
                {activeSummary.gamesWithAnomalies.map((game) => (
                  <div
                    key={game.gameId}
                    className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/90 hover:border-amber-500/40 transition space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-white text-xs flex items-center gap-1.5">
                        <span className="text-amber-400">⚠️</span>
                        <span>{game.gameId}</span>
                      </span>
                      <div className="flex items-center gap-1 text-[10px] font-mono text-slate-400">
                        <span className="px-1.5 py-0.5 rounded bg-slate-800">
                          Soma: <strong>{game.soma}</strong>
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-slate-800">
                          {game.pares}P / {game.impares}I
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-slate-800">
                          {game.primos} Primos
                        </span>
                      </div>
                    </div>

                    {/* Dezenas */}
                    <div className="flex flex-wrap gap-1">
                      {game.dezenas.map((num) => (
                        <span
                          key={num}
                          className="w-6 h-6 rounded bg-slate-800 text-slate-200 font-mono text-[10px] font-bold flex items-center justify-center border border-slate-700"
                        >
                          {num.toString().padStart(2, '0')}
                        </span>
                      ))}
                    </div>

                    {/* Anomalies list */}
                    <div className="space-y-1 pt-1 border-t border-slate-900">
                      {game.anomalies.map((anom, i) => (
                        <div
                          key={i}
                          className={`p-1.5 rounded-lg text-[10px] flex items-start gap-1.5 ${
                            anom.severity === 'critical'
                              ? 'bg-rose-500/10 text-rose-300 border border-rose-500/20'
                              : 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                          }`}
                        >
                          <span className="font-bold shrink-0">•</span>
                          <div>
                            <span className="font-bold">{anom.title}:</span>{' '}
                            <span>{anom.description}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
