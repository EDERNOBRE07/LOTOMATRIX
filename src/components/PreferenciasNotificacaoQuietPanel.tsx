import React, { useEffect, useState } from 'react';
import { BellOff, Clock, VolumeX, Volume2, Moon, CheckCircle2, Shield } from 'lucide-react';
import {
  QuietHoursPreferences,
  getQuietHoursPreferences,
  saveQuietHoursPreferences,
  isCurrentlyInQuietHours,
  shouldMuteBackgroundAudio,
} from '../services/notificationService';

interface PreferenciasNotificacaoQuietPanelProps {
  onNotice?: (message: string) => void;
}

const WEEKDAYS: { day: number; label: string; full: string }[] = [
  { day: 0, label: 'Dom', full: 'Domingo' },
  { day: 1, label: 'Seg', full: 'Segunda' },
  { day: 2, label: 'Ter', full: 'Terça' },
  { day: 3, label: 'Qua', full: 'Quarta' },
  { day: 4, label: 'Qui', full: 'Quinta' },
  { day: 5, label: 'Sex', full: 'Sexta' },
  { day: 6, label: 'Sáb', full: 'Sábado' },
];

const QUIET_PRESETS: { id: string; label: string; start: string; end: string }[] = [
  { id: 'noturno', label: 'Noturno (22:00 – 08:00)', start: '22:00', end: '08:00' },
  { id: 'comercial', label: 'Foco Comercial (09:00 – 18:00)', start: '09:00', end: '18:00' },
  { id: 'madrugada', label: 'Madrugada (00:00 – 07:00)', start: '00:00', end: '07:00' },
];

export const PreferenciasNotificacaoQuietPanel: React.FC<PreferenciasNotificacaoQuietPanelProps> = ({
  onNotice,
}) => {
  const [prefs, setPrefs] = useState<QuietHoursPreferences>(() => getQuietHoursPreferences());
  const [nowTick, setNowTick] = useState<Date>(() => new Date());

  useEffect(() => {
    const handleSync = () => {
      setPrefs(getQuietHoursPreferences());
    };
    window.addEventListener('lotosniper-quiet-hours-updated', handleSync);
    window.addEventListener('lotosniper-detailed-rules-updated', handleSync);

    const timer = window.setInterval(() => {
      setNowTick(new Date());
    }, 30_000);

    return () => {
      window.removeEventListener('lotosniper-quiet-hours-updated', handleSync);
      window.removeEventListener('lotosniper-detailed-rules-updated', handleSync);
      window.clearInterval(timer);
    };
  }, []);

  const updatePrefs = (next: QuietHoursPreferences, notice?: string) => {
    const saved = saveQuietHoursPreferences(next);
    setPrefs(saved);
    if (notice && onNotice) {
      onNotice(notice);
    }
  };

  const toggleDay = (day: number) => {
    const exists = prefs.daysOfWeek.includes(day);
    const nextDays = exists
      ? prefs.daysOfWeek.filter((d) => d !== day)
      : [...prefs.daysOfWeek, day].sort((a, b) => a - b);

    updatePrefs(
      { ...prefs, daysOfWeek: nextDays },
      'Dias de vigência do modo Não Perturbe atualizados.'
    );
  };

  const inScheduledQuiet = isCurrentlyInQuietHours(nowTick, prefs);
  const audioSilencedNow = shouldMuteBackgroundAudio(nowTick);

  return (
    <section
      aria-label="Preferências de Notificação e Modo Não Perturbe"
      className="bg-slate-900/90 rounded-2xl border border-slate-800 p-4 sm:p-5 space-y-4 shadow-xl"
    >
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-slate-800">
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/35 flex items-center justify-center text-amber-300 shrink-0">
            <Moon className="w-4 h-4" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-sans text-sm sm:text-base font-bold text-white tracking-tight">
                Preferências de Notificação · Modo &ldquo;Não Perturbe&rdquo;
              </h3>
              <span
                className={`px-2 py-0.5 rounded-md border font-mono text-[11px] font-bold tabular-nums ${
                  audioSilencedNow
                    ? 'bg-amber-500/15 text-amber-300 border-amber-500/40'
                    : prefs.enabled
                    ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/35'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}
              >
                {prefs.alwaysMute
                  ? 'QUIET MODE ATIVO'
                  : inScheduledQuiet
                  ? 'SILENCIADO PELO HORÁRIO'
                  : prefs.enabled
                  ? `AGENDADO ${prefs.startTime}–${prefs.endTime}`
                  : 'ÁUDIO LIBERADO'}
              </span>
            </div>
            <p className="font-sans text-xs text-slate-400 mt-0.5">
              Defina horários programados para silenciar alertas sonoros do monitoramento em segundo plano sem interromper momentos de foco ou descanso.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() =>
            updatePrefs(
              { ...prefs, enabled: !prefs.enabled },
              !prefs.enabled
                ? `Horário "Não Perturbe" ativado (${prefs.startTime} às ${prefs.endTime}).`
                : 'Agendamento de "Não Perturbe" desativado.'
            )
          }
          className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-sans font-bold transition cursor-pointer whitespace-nowrap shrink-0 border ${
            prefs.enabled
              ? 'bg-amber-500 text-slate-950 border-amber-400'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
          }`}
        >
          <Clock className="w-3.5 h-3.5 shrink-0" />
          <span>{prefs.enabled ? 'Agendamento Ativo' : 'Ativar Horário Não Perturbe'}</span>
        </button>
      </div>

      {/* Controles de Horário e Modo Contínuo */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Coluna 1: Janela de Horários + Presets */}
        <div className="lg:col-span-7 bg-slate-950/75 border border-slate-800 rounded-xl p-4 space-y-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-sans text-xs font-bold text-white flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>Janela Diária de Silêncio (Quiet Mode)</span>
            </span>
            <span className="font-mono text-[11px] text-slate-400 tabular-nums">
              Hora atual: {nowTick.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block space-y-1">
              <span className="font-sans text-[11px] font-medium text-slate-400 block">
                Horário de Início
              </span>
              <input
                type="time"
                value={prefs.startTime}
                onChange={(e) =>
                  updatePrefs(
                    { ...prefs, startTime: e.target.value, enabled: true },
                    `Início do "Não Perturbe" ajustado para ${e.target.value}.`
                  )
                }
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 font-mono text-sm text-white focus:outline-none focus:border-amber-400"
              />
            </label>

            <label className="block space-y-1">
              <span className="font-sans text-[11px] font-medium text-slate-400 block">
                Horário de Término
              </span>
              <input
                type="time"
                value={prefs.endTime}
                onChange={(e) =>
                  updatePrefs(
                    { ...prefs, endTime: e.target.value, enabled: true },
                    `Término do "Não Perturbe" ajustado para ${e.target.value}.`
                  )
                }
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 font-mono text-sm text-white focus:outline-none focus:border-amber-400"
              />
            </label>
          </div>

          {/* Presets Rápidos */}
          <div className="space-y-1.5">
            <span className="font-sans text-[11px] text-slate-400 block">Atalhos de Foco & Descanso:</span>
            <div className="flex flex-wrap gap-1.5">
              {QUIET_PRESETS.map((preset) => {
                const isActive =
                  prefs.enabled && prefs.startTime === preset.start && prefs.endTime === preset.end;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() =>
                      updatePrefs(
                        { ...prefs, enabled: true, startTime: preset.start, endTime: preset.end },
                        `Preset "${preset.label}" aplicado.`
                      )
                    }
                    className={`px-2.5 py-1.5 rounded-lg text-[11px] font-sans font-semibold border transition cursor-pointer whitespace-nowrap ${
                      isActive
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800'
                    }`}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Dias da Semana */}
          <div className="space-y-1.5 pt-1">
            <span className="font-sans text-[11px] text-slate-400 block">
              Dias da Semana com Silenciamento Ativo:
            </span>
            <div className="grid grid-cols-7 gap-1.5">
              {WEEKDAYS.map((wd) => {
                const selected = prefs.daysOfWeek.includes(wd.day);
                return (
                  <button
                    key={wd.day}
                    type="button"
                    title={wd.full}
                    onClick={() => toggleDay(wd.day)}
                    className={`py-1.5 rounded-lg text-[11px] font-sans font-bold border transition cursor-pointer ${
                      selected
                        ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
                        : 'bg-slate-900 text-slate-500 border-slate-800 hover:text-slate-300'
                    }`}
                  >
                    {wd.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Coluna 2: Silenciamento Contínuo & Comportamento de Push */}
        <div className="lg:col-span-5 flex flex-col justify-between gap-3">
          <div className="bg-slate-950/75 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="font-sans text-xs font-bold text-white flex items-center gap-1.5">
                  {prefs.alwaysMute ? (
                    <VolumeX className="w-4 h-4 text-amber-400 shrink-0" />
                  ) : (
                    <Volume2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  )}
                  <span>Silenciar Sons Agora (Quiet Mode Contínuo)</span>
                </div>
                <p className="font-sans text-[11px] text-slate-400 leading-relaxed">
                  Silencia imediatamente todos os alertas sonoros em segundo plano (independente do relógio) mantendo o histórico visual intacto.
                </p>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={prefs.alwaysMute}
                onClick={() =>
                  updatePrefs(
                    { ...prefs, alwaysMute: !prefs.alwaysMute },
                    !prefs.alwaysMute
                      ? 'Quiet Mode Contínuo ativado: alertas sonoros em segundo plano silenciados.'
                      : 'Quiet Mode Contínuo desativado.'
                  )
                }
                className={`w-11 h-6 flex items-center rounded-full p-1 transition cursor-pointer shrink-0 ${
                  prefs.alwaysMute ? 'bg-amber-500 justify-end' : 'bg-slate-800 justify-start'
                }`}
              >
                <span className="w-4 h-4 rounded-full bg-white shadow-sm" />
              </button>
            </div>

            <div className="pt-3 border-t border-slate-800/80 flex items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="font-sans text-xs font-bold text-white flex items-center gap-1.5">
                  <BellOff className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>Pausar Push Visual no Horário Silencioso</span>
                </div>
                <p className="font-sans text-[11px] text-slate-400 leading-relaxed">
                  Quando ativo, também suprime notificações push do sistema operacional durante a janela de &ldquo;Não Perturbe&rdquo;.
                </p>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={prefs.mutePushInQuietHours}
                onClick={() =>
                  updatePrefs(
                    { ...prefs, mutePushInQuietHours: !prefs.mutePushInQuietHours },
                    !prefs.mutePushInQuietHours
                      ? 'Notificações push visuais também serão pausadas durante o Não Perturbe.'
                      : 'Notificações push visuais permanecem ativas mesmo no Não Perturbe.'
                  )
                }
                className={`w-11 h-6 flex items-center rounded-full p-1 transition cursor-pointer shrink-0 ${
                  prefs.mutePushInQuietHours
                    ? 'bg-emerald-500 justify-end'
                    : 'bg-slate-800 justify-start'
                }`}
              >
                <span className="w-4 h-4 rounded-full bg-white shadow-sm" />
              </button>
            </div>
          </div>

          {/* Resumo de Garantia */}
          <div className="bg-slate-950/75 border border-slate-800 rounded-xl p-3.5 flex items-start gap-2.5 text-xs">
            {audioSilencedNow ? (
              <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            ) : (
              <Shield className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            )}
            <div className="font-sans text-[11px] text-slate-300 leading-relaxed">
              {audioSilencedNow ? (
                <span>
                  <strong className="text-amber-300">Modo Silencioso em vigor:</strong> o monitoramento passivo da Caixa, auditoria de bilhetes e alertas agendados não emitirão áudio agora.
                </span>
              ) : (
                <span>
                  <strong className="text-emerald-300">Auditoria ativa com áudio:</strong> as regras de som configuradas tocarão normalmente fora da janela de Não Perturbe.
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
