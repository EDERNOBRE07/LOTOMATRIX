import React, { useEffect, useState } from 'react';
import { LotofacilDraw } from '../types/lotofacil';
import { CONCURSO_ATUAL } from '../data/lotofacilData';
import { Flame, Bell, Check, AlertTriangle, RotateCcw } from 'lucide-react';

export const CYCLE_THRESHOLD_STORAGE_KEY = 'lotosniper_cycle_threshold';
export const CYCLE_VISUAL_ALERT_ENABLED_KEY = 'lotosniper_cycle_visual_alert_enabled';
export const CYCLE_THRESHOLD_UPDATED_EVENT = 'lotosniper-cycle-threshold-updated';

export function getSavedCycleThreshold(): number {
  try {
    const raw = localStorage.getItem(CYCLE_THRESHOLD_STORAGE_KEY);
    if (raw !== null) {
      const parsed = parseInt(raw, 10);
      if (!Number.isNaN(parsed) && parsed >= 1 && parsed <= 6) {
        return parsed;
      }
    }
  } catch {}
  return 3;
}

export function getSavedCycleVisualAlertEnabled(): boolean {
  try {
    const raw = localStorage.getItem(CYCLE_VISUAL_ALERT_ENABLED_KEY);
    return raw !== null ? raw === 'true' : true;
  } catch {
    return true;
  }
}

interface AlertaFimCicloConfigPanelProps {
  latestDraw?: LotofacilDraw;
  cyclePendingNumbers?: number[];
  concursosNoCiclo?: number;
  onNotice?: (message: string) => void;
}

const THRESHOLD_OPTIONS = [1, 2, 3, 4, 5, 6];

export const AlertaFimCicloConfigPanel: React.FC<AlertaFimCicloConfigPanelProps> = ({
  latestDraw = CONCURSO_ATUAL,
  cyclePendingNumbers = [],
  concursosNoCiclo = 1,
  onNotice,
}) => {
  const [threshold, setThreshold] = useState<number>(() => getSavedCycleThreshold());
  const [visualAlertEnabled, setVisualAlertEnabled] = useState<boolean>(() =>
    getSavedCycleVisualAlertEnabled()
  );
  const [savedFeedback, setSavedFeedback] = useState<boolean>(false);

  useEffect(() => {
    const syncFromStorage = () => {
      setThreshold(getSavedCycleThreshold());
      setVisualAlertEnabled(getSavedCycleVisualAlertEnabled());
    };
    window.addEventListener(CYCLE_THRESHOLD_UPDATED_EVENT, syncFromStorage);
    window.addEventListener('storage', syncFromStorage);
    return () => {
      window.removeEventListener(CYCLE_THRESHOLD_UPDATED_EVENT, syncFromStorage);
      window.removeEventListener('storage', syncFromStorage);
    };
  }, []);

  const persistConfig = (nextThreshold: number, nextEnabled: boolean, notify = true) => {
    const clamped = Math.max(1, Math.min(6, Math.round(nextThreshold)));
    setThreshold(clamped);
    setVisualAlertEnabled(nextEnabled);
    try {
      localStorage.setItem(CYCLE_THRESHOLD_STORAGE_KEY, String(clamped));
      localStorage.setItem(CYCLE_VISUAL_ALERT_ENABLED_KEY, String(nextEnabled));
      window.dispatchEvent(
        new CustomEvent(CYCLE_THRESHOLD_UPDATED_EVENT, {
          detail: { threshold: clamped, enabled: nextEnabled },
        })
      );
    } catch {}

    setSavedFeedback(true);
    window.setTimeout(() => setSavedFeedback(false), 2400);

    if (notify) {
      onNotice?.(
        nextEnabled
          ? `Alerta visual de fim de ciclo configurado para disparar com ≤ ${clamped} ${
              clamped === 1 ? 'dezena ausente' : 'dezenas ausentes'
            }.`
          : 'Alerta visual de fim de ciclo desativado.'
      );
    }
  };

  const pendingCount = cyclePendingNumbers.length;
  const drawnCount = Math.max(0, 25 - pendingCount);
  const isCycleClosed = pendingCount === 0;
  const isAlertTriggered = visualAlertEnabled && pendingCount > 0 && pendingCount <= threshold;

  const formattedPending =
    pendingCount > 0
      ? cyclePendingNumbers.map((d) => String(d).padStart(2, '0')).join(', ')
      : 'Nenhuma (ciclo fechado)';

  return (
    <section className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-5 sm:px-6 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-slate-100">
            <Flame className="w-4 h-4 text-amber-400 shrink-0" />
            <h3 className="text-base font-semibold tracking-tight">
              Alerta Visual de Fim de Ciclo
            </h3>
          </div>
          <p className="mt-1 text-sm text-slate-400">
            Defina a partir de quantas dezenas ausentes o sistema dispara o alerta visual de reta final do ciclo das 25 dezenas.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {savedFeedback && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-400">
              <Check className="w-3.5 h-3.5" />
              Salvo
            </span>
          )}
          <button
            type="button"
            role="switch"
            aria-checked={visualAlertEnabled}
            onClick={() => persistConfig(threshold, !visualAlertEnabled)}
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition cursor-pointer ${
              visualAlertEnabled
                ? 'border-amber-500/60 bg-amber-500/15 text-amber-300'
                : 'border-slate-700 bg-slate-800/80 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            {visualAlertEnabled ? 'Alerta visual ativo' : 'Alerta visual pausado'}
          </button>
        </div>
      </div>

      {/* Controls Grid */}
      <div className="p-5 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Threshold Selector */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-baseline justify-between gap-2">
            <label
              htmlFor="cycle-threshold-range"
              className="text-sm font-medium text-slate-200"
            >
              Limite de dezenas ausentes para disparo
            </label>
            <span className="text-sm font-mono tabular-nums font-semibold text-amber-400">
              ≤ {threshold} {threshold === 1 ? 'dezena ausente' : 'dezenas ausentes'}
            </span>
          </div>

          {/* Direct numeric buttons 1..6 */}
          <div className="grid grid-cols-6 gap-2" role="radiogroup" aria-label="Limite de dezenas ausentes">
            {THRESHOLD_OPTIONS.map((val) => {
              const selected = threshold === val;
              return (
                <button
                  key={val}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => persistConfig(val, visualAlertEnabled)}
                  className={`py-2.5 rounded-lg border text-sm font-mono tabular-nums font-semibold transition cursor-pointer ${
                    selected
                      ? 'border-amber-400 bg-amber-500/15 text-amber-300'
                      : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  {val}
                </button>
              );
            })}
          </div>

          {/* Range Slider */}
          <div className="pt-1">
            <input
              id="cycle-threshold-range"
              type="range"
              min={1}
              max={6}
              step={1}
              value={threshold}
              onChange={(e) => persistConfig(Number(e.target.value), visualAlertEnabled)}
              className="w-full accent-amber-400 cursor-pointer"
            />
            <div className="mt-1 flex justify-between text-[11px] font-mono tabular-nums text-slate-500">
              <span>1 (Crítico)</span>
              <span>3 (Recomendado)</span>
              <span>6 (Antecipado)</span>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
            <span>
              Dispara quando o ciclo atingir{' '}
              <strong className="text-slate-200 font-mono tabular-nums">
                {25 - threshold} ou mais
              </strong>{' '}
              dezenas sorteadas de 25.
            </span>
            {threshold !== 3 && (
              <button
                type="button"
                onClick={() => persistConfig(3, true)}
                className="inline-flex items-center gap-1 text-xs font-medium text-sky-400 hover:text-sky-300 transition cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                Padrão (3)
              </button>
            )}
          </div>
        </div>

        {/* Right: Current Cycle Status & Live Visual Alert Preview */}
        <div className="lg:col-span-5 lg:border-l lg:border-slate-800 lg:pl-6 flex flex-col justify-between gap-4">
          <div className="space-y-2.5">
            <div className="text-xs font-medium text-slate-400">
              Situação atual · Concurso #{latestDraw.concurso} ({concursosNoCiclo}º do ciclo)
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs font-mono tabular-nums">
              <div className="py-2 border-b border-slate-800">
                <div className="text-slate-500 font-sans text-[11px]">Sorteadas no ciclo</div>
                <div className="mt-0.5 text-base font-semibold text-slate-100">
                  {drawnCount}/25
                </div>
              </div>
              <div className="py-2 border-b border-slate-800">
                <div className="text-slate-500 font-sans text-[11px]">Ausentes restantes</div>
                <div
                  className={`mt-0.5 text-base font-semibold ${
                    isAlertTriggered ? 'text-amber-400' : 'text-slate-100'
                  }`}
                >
                  {pendingCount}
                </div>
              </div>
            </div>

            <div className="text-xs text-slate-400">
              Dezenas ausentes:{' '}
              <span className="font-mono tabular-nums text-slate-200">{formattedPending}</span>
            </div>
          </div>

          {/* Live Preview of the Visual End-of-Cycle Alert */}
          <div
            className={`p-3.5 rounded-lg border text-xs ${
              !visualAlertEnabled
                ? 'border-slate-800 bg-slate-950/60 text-slate-500'
                : isAlertTriggered
                ? 'border-amber-500/60 bg-amber-500/10 text-amber-200'
                : 'border-slate-800 bg-slate-950/60 text-slate-300'
            }`}
          >
            <div className="flex items-start gap-2.5">
              <AlertTriangle
                className={`w-4 h-4 shrink-0 mt-0.5 ${
                  !visualAlertEnabled
                    ? 'text-slate-600'
                    : isAlertTriggered
                    ? 'text-amber-400'
                    : 'text-slate-400'
                }`}
              />
              <div>
                <div className="font-semibold">
                  {!visualAlertEnabled
                    ? 'Alerta visual desativado'
                    : isCycleClosed
                    ? 'Ciclo completo (25/25 dezenas sorteadas)'
                    : isAlertTriggered
                    ? `Alerta de Fim de Ciclo ATIVO (${pendingCount} ≤ ${threshold})`
                    : `Aguardando gatilho (${pendingCount} ausentes · limite ≤ ${threshold})`}
                </div>
                <p className="mt-1 text-[11px] opacity-85 leading-relaxed">
                  {!visualAlertEnabled
                    ? 'Ative o interruptor acima para exibir o banner visual no topo da aplicação quando o ciclo entrar na reta final.'
                    : isAlertTriggered
                    ? `O banner visual de Fim de Ciclo está ativo no topo da aplicação destacando as dezenas [${formattedPending}].`
                    : isCycleClosed
                    ? 'O próximo sorteio abrirá um novo ciclo das 25 dezenas.'
                    : `Faltam sair mais ${Math.max(
                        1,
                        pendingCount - threshold
                      )} dezenas ausentes para disparar o alerta visual de fim de ciclo.`}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
