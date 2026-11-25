import React, { useEffect, useMemo, useState } from 'react';
import { Clock, CheckCircle2, RotateCcw, BellRing } from 'lucide-react';
import { DezenaStats, LotofacilDraw } from '../types/lotofacil';
import { CONCURSO_ATUAL } from '../data/lotofacilData';
import {
  CriticalDelayMonitorConfig,
  DEFAULT_CRITICAL_DELAY_MONITOR_CONFIG,
  getCriticalDelayMonitorConfig,
  saveCriticalDelayMonitorConfig,
  resolveMonitoredCriticalDelayNumbers,
  fireBrowserPushNotification,
} from '../services/notificationService';
import { soundService } from '../services/soundAlert';

interface CriticalDelayNumbersConfigPanelProps {
  latestDraw?: LotofacilDraw;
  statsList?: DezenaStats[];
  cyclePendingNumbers?: number[];
  onNotice?: (msg: string) => void;
}

export const CriticalDelayNumbersConfigPanel: React.FC<CriticalDelayNumbersConfigPanelProps> = ({
  latestDraw = CONCURSO_ATUAL,
  statsList = [],
  cyclePendingNumbers = [],
  onNotice,
}) => {
  const [config, setConfig] = useState<CriticalDelayMonitorConfig>(() =>
    getCriticalDelayMonitorConfig()
  );
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    const sync = () => setConfig(getCriticalDelayMonitorConfig());
    window.addEventListener('lotosniper-critical-delay-config-updated', sync);
    window.addEventListener('lotosniper-backup-restored', sync);
    return () => {
      window.removeEventListener('lotosniper-critical-delay-config-updated', sync);
      window.removeEventListener('lotosniper-backup-restored', sync);
    };
  }, []);

  const commit = (next: CriticalDelayMonitorConfig, message?: string) => {
    setConfig(next);
    saveCriticalDelayMonitorConfig(next);
    if (message) {
      setFeedback(message);
      onNotice?.(message);
      setTimeout(() => setFeedback(null), 3500);
    }
  };

  const { cycleNumbers, extraNumbers, combinedNumbers } = useMemo(
    () => resolveMonitoredCriticalDelayNumbers(cyclePendingNumbers, config),
    [cyclePendingNumbers, config]
  );

  const triggeredNow = useMemo(
    () =>
      statsList.filter(
        (s) => combinedNumbers.includes(s.numero) && s.atrasoAtual >= config.threshold
      ),
    [statsList, combinedNumbers, config.threshold]
  );

  const drawnNow = useMemo(
    () => combinedNumbers.filter((num) => latestDraw.dezenas.includes(num)),
    [combinedNumbers, latestDraw.dezenas]
  );

  const notifyWhenDrawnEnabled = config.notifyWhenDrawn !== false;

  const handleToggleExtraNumber = (num: number) => {
    const exists = config.extraSelectedNumbers.includes(num);
    const updated = exists
      ? config.extraSelectedNumbers.filter((n) => n !== num)
      : [...config.extraSelectedNumbers, num].sort((a, b) => a - b);

    commit(
      { ...config, extraSelectedNumbers: updated },
      `Dezena ${String(num).padStart(2, '0')} ${
        exists ? 'removida do' : 'adicionada ao'
      } monitoramento de Atraso Crítico (salvo no localStorage).`
    );
  };

  const handleTestCriticalDelayAlert = async () => {
    soundService.playOpportunityAlert();
    const listPreview =
      triggeredNow.length > 0
        ? triggeredNow.map((d) => `${String(d.numero).padStart(2, '0')} (${d.atrasoAtual}x)`).join(', ')
        : combinedNumbers.slice(0, 5).map((n) => String(n).padStart(2, '0')).join(', ');
    const drawnPreview =
      notifyWhenDrawnEnabled && drawnNow.length > 0
        ? ` | Sorteadas no #${latestDraw.concurso}: ${drawnNow
            .map((n) => String(n).padStart(2, '0'))
            .join(', ')}`
        : '';

    await fireBrowserPushNotification(
      `LotoSniper • Monitoramento de Dezenas (#${latestDraw.concurso})`,
      `Monitorando ${combinedNumbers.length} dezenas (hiato ≥ ${config.threshold} conc.): ${listPreview}${drawnPreview}.`,
      `lotosniper-test-delay-${latestDraw.concurso}`
    );

    setFeedback(
      `Monitoramento validado: ${combinedNumbers.length} dezenas ativas (${cycleNumbers.length} do ciclo + ${extraNumbers.length} extras)${
        notifyWhenDrawnEnabled ? ` · Push ao sair ativo (${drawnNow.length} no #${latestDraw.concurso})` : ''
      }.`
    );
    setTimeout(() => setFeedback(null), 4000);
  };

  return (
    <section
      aria-label="Configuração de Dezenas para Alerta de Atraso Crítico"
      className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4"
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
            <Clock className="w-4 h-4 text-rose-400 shrink-0" />
            <span>Monitoramento Passivo</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">
              {combinedNumbers.length} dezenas monitoradas ({cycleNumbers.length} ciclo + {extraNumbers.length} extras)
            </span>
          </div>
          <h3 className="text-base font-bold text-white">
            Seleção Visual de Dezenas para Alerta de Atraso Crítico
          </h3>
          <p className="text-xs text-slate-400 max-w-2xl">
            Escolha exatamente quais dezenas extras, além das automáticas do ciclo atual, devem disparar alertas de Atraso Crítico no monitoramento passivo.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleTestCriticalDelayAlert}
            className="px-3 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/40 text-rose-300 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
          >
            <BellRing className="w-3.5 h-3.5" />
            <span>Testar Gatilho</span>
          </button>

          <button
            type="button"
            onClick={() =>
              commit(
                { ...DEFAULT_CRITICAL_DELAY_MONITOR_CONFIG },
                'Seleção padrão restaurada e salva no localStorage.'
              )
            }
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Padrão</span>
          </button>
        </div>
      </div>

      {feedback && (
        <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Controles de Inclusão do Ciclo, Push ao Sair e Limiar de Atraso */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5">
        <div className="bg-slate-950/75 border border-slate-800 rounded-xl p-4 flex items-center justify-between gap-3">
          <div className="space-y-0.5">
            <span className="text-xs font-bold text-white block">
              Incluir Dezenas Automáticas do Ciclo ({cyclePendingNumbers.length})
            </span>
            <p className="text-[11px] text-slate-400">
              Mantém automaticamente todas as dezenas pendentes do ciclo em vigência no radar passivo.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={config.includeCycleNumbersAutomatically}
            aria-label="Incluir dezenas automáticas de ciclo no alerta de atraso crítico"
            onClick={() =>
              commit(
                {
                  ...config,
                  includeCycleNumbersAutomatically: !config.includeCycleNumbersAutomatically,
                },
                !config.includeCycleNumbersAutomatically
                  ? 'Inclusão automática das dezenas de ciclo ativada.'
                  : 'Inclusão automática das dezenas de ciclo desativada.'
              )
            }
            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition-colors cursor-pointer ${
              config.includeCycleNumbersAutomatically
                ? 'bg-emerald-500 justify-end'
                : 'bg-slate-700 justify-start'
            }`}
          >
            <span className="inline-block h-5 w-5 rounded-full bg-white shadow-md" />
          </button>
        </div>

        <div className="bg-slate-950/75 border border-slate-800 rounded-xl p-4 flex items-center justify-between gap-3">
          <div className="space-y-0.5">
            <span className="text-xs font-bold text-white block">
              Push quando Dezena Monitorada Sair
            </span>
            <p className="text-[11px] text-slate-400">
              Dispara alerta push nativo também quando qualquer dezena monitorada for sorteada no concurso mais recente.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={notifyWhenDrawnEnabled}
            aria-label="Alertar por push quando dezena monitorada for sorteada no concurso mais recente"
            onClick={() =>
              commit(
                {
                  ...config,
                  notifyWhenDrawn: !notifyWhenDrawnEnabled,
                },
                !notifyWhenDrawnEnabled
                  ? 'Alerta push para dezenas monitoradas sorteadas ativado.'
                  : 'Alerta push para dezenas monitoradas sorteadas desativado.'
              )
            }
            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition-colors cursor-pointer ${
              notifyWhenDrawnEnabled
                ? 'bg-emerald-500 justify-end'
                : 'bg-slate-700 justify-start'
            }`}
          >
            <span className="inline-block h-5 w-5 rounded-full bg-white shadow-md" />
          </button>
        </div>

        <div className="bg-slate-950/75 border border-slate-800 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <label htmlFor="critical-delay-threshold-range" className="text-xs font-bold text-white">
              Limiar de Atraso Crítico para Disparo:
            </label>
            <span className="font-mono font-bold text-xs text-rose-300 tabular-nums">
              ≥ {config.threshold} concursos
            </span>
          </div>
          <input
            id="critical-delay-threshold-range"
            type="range"
            min={3}
            max={10}
            step={1}
            value={config.threshold}
            onChange={(e) =>
              commit(
                { ...config, threshold: Number(e.target.value) },
                `Limiar de atraso crítico ajustado para ≥ ${e.target.value} concursos.`
              )
            }
            className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-500"
          />
          <div className="flex justify-between text-[10px] font-mono text-slate-500 tabular-nums">
            <span>3 conc.</span>
            <span>5 (Padrão)</span>
            <span>7 (Raro)</span>
            <span>10 (Extremo)</span>
          </div>
        </div>
      </div>

      {/* Volante Visual 5x5 (01 a 25) */}
      <div className="bg-slate-950/75 border border-slate-800 rounded-xl p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-400">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" />
              <span>Automática de Ciclo</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-rose-500 inline-block" />
              <span>Extra Selecionada</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-amber-400 inline-block" />
              <span>Ciclo + Extra</span>
            </span>
          </div>

          <div className="flex items-center gap-3 text-[11px] font-semibold">
            <button
              type="button"
              onClick={() =>
                commit(
                  {
                    ...config,
                    extraSelectedNumbers: Array.from({ length: 25 }, (_, i) => i + 1),
                  },
                  'Todas as 25 dezenas extras selecionadas para monitoramento.'
                )
              }
              className="text-emerald-400 hover:underline cursor-pointer"
            >
              Marcar Todas
            </button>
            <span className="text-slate-600">·</span>
            <button
              type="button"
              onClick={() =>
                commit(
                  { ...config, extraSelectedNumbers: [] },
                  'Dezenas extras limpas (mantendo apenas regras automáticas de ciclo se ativas).'
                )
              }
              className="text-slate-400 hover:text-white cursor-pointer"
            >
              Limpar Extras
            </button>
          </div>
        </div>

        <div className="grid grid-cols-5 sm:grid-cols-10 md:grid-cols-13 gap-1.5">
          {Array.from({ length: 25 }, (_, i) => i + 1).map((num) => {
            const isCycle = config.includeCycleNumbersAutomatically && cyclePendingNumbers.includes(num);
            const isExtra = config.extraSelectedNumbers.includes(num);
            const stat = statsList.find((s) => s.numero === num);
            const atraso = stat?.atrasoAtual ?? 0;
            const isInCriticalNow = (isCycle || isExtra) && atraso >= config.threshold;

            let toneClass = 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700';
            if (isCycle && isExtra) {
              toneClass = 'bg-amber-500/20 border-amber-400/60 text-amber-200 font-bold';
            } else if (isExtra) {
              toneClass = 'bg-rose-500/20 border-rose-500/60 text-rose-200 font-bold';
            } else if (isCycle) {
              toneClass = 'bg-emerald-500/15 border-emerald-500/50 text-emerald-200 font-semibold';
            }

            return (
              <button
                key={num}
                type="button"
                onClick={() => handleToggleExtraNumber(num)}
                title={`Dezena ${String(num).padStart(2, '0')} · Atraso atual: ${atraso}x${
                  isCycle ? ' · Automática do ciclo' : ''
                }${isExtra ? ' · Extra selecionada' : ''}`}
                className={`p-2 rounded-lg border text-center transition cursor-pointer ${toneClass} ${
                  isInCriticalNow ? 'ring-1 ring-rose-400/70' : ''
                }`}
              >
                <span className="font-mono text-xs block tabular-nums">
                  {String(num).padStart(2, '0')}
                </span>
                <span
                  className={`font-mono text-[10px] block tabular-nums ${
                    atraso >= config.threshold ? 'text-amber-300 font-bold' : 'text-slate-500'
                  }`}
                >
                  {atraso}x
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80 text-[11px] font-mono text-slate-400 tabular-nums">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span>
              Em atraso (≥ {config.threshold}):{' '}
              <strong className={triggeredNow.length > 0 ? 'text-rose-400' : 'text-slate-300'}>
                {triggeredNow.length > 0
                  ? triggeredNow.map((d) => String(d.numero).padStart(2, '0')).join(', ')
                  : 'Nenhuma no limite'}
              </strong>
            </span>
            {notifyWhenDrawnEnabled && (
              <span>
                Sorteadas no #{latestDraw.concurso}:{' '}
                <strong className={drawnNow.length > 0 ? 'text-emerald-400' : 'text-slate-300'}>
                  {drawnNow.length > 0
                    ? drawnNow.map((n) => String(n).padStart(2, '0')).join(', ')
                    : 'Nenhuma'}
                </strong>
              </span>
            )}
          </div>
          <span>Persistência: localStorage</span>
        </div>
      </div>
    </section>
  );
};
