import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LotofacilDraw } from '../types/lotofacil';
import { CONCURSO_ATUAL } from '../data/lotofacilData';
import { soundService } from '../services/soundAlert';
import {
  sendNativeCycleAlertNotification,
  isNotificationSupported,
  getNotificationPermission,
  requestNativeNotificationPermission,
} from '../services/nativeNotificationService';
import {
  RefreshCw,
  Bell,
  BellOff,
  Volume2,
  VolumeX,
  Flame,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Layers,
  Save,
  Radio,
  Sliders,
  Info,
  Clock,
} from 'lucide-react';

interface CycleMonitoringCardProps {
  latestDraw?: LotofacilDraw;
  cyclePendingNumbers?: number[];
  concursosNoCiclo?: number;
}

export const CycleMonitoringCard: React.FC<CycleMonitoringCardProps> = ({
  latestDraw = CONCURSO_ATUAL,
  cyclePendingNumbers = [17, 22],
  concursosNoCiclo = 3,
}) => {
  // 1. Limite de Ausência (Padrão 3 dezenas, conforme especificado)
  const [absenceThreshold, setAbsenceThreshold] = useState<number>(() => {
    try {
      const stored = localStorage.getItem('lotosniper_cycle_threshold');
      if (stored) {
        const val = parseInt(stored, 10);
        if (!isNaN(val) && val >= 1 && val <= 5) return val;
      }
    } catch {}
    return 3; // Padrão: 3 dezenas
  });

  // 2. Notificações Sonoras
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem('lotosniper_cycle_sound_enabled');
      return stored !== null ? stored === 'true' : true;
    } catch {
      return true;
    }
  });

  // 3. Notificações Push
  const [pushEnabled, setPushEnabled] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem('lotosniper_cycle_push_enabled');
      return stored !== null ? stored === 'true' : true;
    } catch {
      return true;
    }
  });

  const [notificationPermission, setNotificationPermission] = useState<string>(() => {
    return getNotificationPermission();
  });

  const [feedbackNotice, setFeedbackNotice] = useState<string | null>(null);
  const [isTestingPush, setIsTestingPush] = useState<boolean>(false);

  // Sync notification permission state
  useEffect(() => {
    const handlePermChange = (e: any) => {
      setNotificationPermission(e.detail || getNotificationPermission());
    };
    window.addEventListener('lotosniper-notification-perm-changed', handlePermChange);
    return () => {
      window.removeEventListener('lotosniper-notification-perm-changed', handlePermChange);
    };
  }, []);

  const totalSorteadasNoCiclo = 25 - cyclePendingNumbers.length;
  const isThresholdTriggered =
    cyclePendingNumbers.length > 0 && cyclePendingNumbers.length <= absenceThreshold;

  const handleThresholdSelect = (threshold: number) => {
    setAbsenceThreshold(threshold);
    try {
      localStorage.setItem('lotosniper_cycle_threshold', threshold.toString());
    } catch {}
    soundService.playTick();
    setFeedbackNotice(`Limite de ausência do ciclo ajustado para ${threshold} ${threshold === 1 ? 'dezena' : 'dezenas'}!`);
    setTimeout(() => setFeedbackNotice(null), 3500);
  };

  const handleToggleSound = (enabled: boolean) => {
    setSoundEnabled(enabled);
    try {
      localStorage.setItem('lotosniper_cycle_sound_enabled', String(enabled));
    } catch {}
    if (enabled) {
      soundService.playCycleAlertSound();
      setFeedbackNotice('Alerta sonoro de ciclo ativado com sucesso.');
    } else {
      setFeedbackNotice('Alerta sonoro de ciclo silenciado.');
    }
    setTimeout(() => setFeedbackNotice(null), 3000);
  };

  const handleTogglePush = async (enabled: boolean) => {
    if (enabled) {
      if (isNotificationSupported() && Notification.permission !== 'granted') {
        const perm = await requestNativeNotificationPermission();
        setNotificationPermission(perm);
        if (perm !== 'granted') {
          setPushEnabled(false);
          setFeedbackNotice('Permissão de notificações bloqueada no navegador.');
          setTimeout(() => setFeedbackNotice(null), 3500);
          return;
        }
      }
      setPushEnabled(true);
      try {
        localStorage.setItem('lotosniper_cycle_push_enabled', 'true');
      } catch {}
      setFeedbackNotice('Notificações push de ciclo ativadas.');
    } else {
      setPushEnabled(false);
      try {
        localStorage.setItem('lotosniper_cycle_push_enabled', 'false');
      } catch {}
      setFeedbackNotice('Notificações push de ciclo desativadas.');
    }
    setTimeout(() => setFeedbackNotice(null), 3000);
  };

  const handleTestSound = () => {
    soundService.playCycleAlertSound();
    setFeedbackNotice('Alarme sonoro sintetizado de reta final do ciclo reproduzido!');
    setTimeout(() => setFeedbackNotice(null), 3000);
  };

  const handleTestPush = async () => {
    setIsTestingPush(true);
    try {
      if (isNotificationSupported() && Notification.permission !== 'granted') {
        const perm = await requestNativeNotificationPermission();
        setNotificationPermission(perm);
        if (perm !== 'granted') {
          setFeedbackNotice('Por favor, permita as notificações no navegador para receber o teste.');
          setIsTestingPush(false);
          return;
        }
      }

      const ok = await sendNativeCycleAlertNotification({
        ausentesCount: cyclePendingNumbers.length,
        dezenasAusentes: cyclePendingNumbers,
        concurso: latestDraw.concurso,
        concursosNoCiclo,
        threshold: absenceThreshold,
        playAudio: soundEnabled,
      });

      if (ok) {
        setFeedbackNotice(`Notificação push de ciclo disparada: ${cyclePendingNumbers.length} ausentes (limite: ${absenceThreshold})!`);
      } else {
        setFeedbackNotice('Alerta sonoro executado e registrado no histórico interno do sistema.');
      }
    } catch (e) {
      console.warn('Erro ao testar push de ciclo:', e);
    } finally {
      setIsTestingPush(false);
      setTimeout(() => setFeedbackNotice(null), 4000);
    }
  };

  const handleSaveAll = () => {
    try {
      localStorage.setItem('lotosniper_cycle_threshold', absenceThreshold.toString());
      localStorage.setItem('lotosniper_cycle_sound_enabled', String(soundEnabled));
      localStorage.setItem('lotosniper_cycle_push_enabled', String(pushEnabled));
      soundService.playSuccess();
      setFeedbackNotice('Configurações de Monitoramento de Ciclo salvas com sucesso!');
      setTimeout(() => setFeedbackNotice(null), 3500);
    } catch {}
  };

  return (
    <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-5 shadow-xl relative overflow-hidden">
      {/* Glow Effects */}
      <div className="absolute -top-20 -right-20 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Card Header */}
      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 via-orange-500 to-amber-600 flex items-center justify-center text-slate-950 shadow-lg shadow-amber-500/20 shrink-0">
            <Flame className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base sm:text-lg font-black text-white tracking-wide">
                Monitoramento de Ciclo
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 uppercase font-mono tracking-wider">
                Reta Final das 25 Dezenas
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Defina o limite de ausência (padrão 3 dezenas) para disparar notificações sonoras e push, integrando com o estado de ciclo atual da aplicação.
            </p>
          </div>
        </div>

        {/* Live Cycle Indicator Badge */}
        <div className="flex items-center gap-2 shrink-0">
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-mono font-bold ${
              isThresholdTriggered
                ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 shadow-md shadow-amber-500/20 animate-pulse'
                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isThresholdTriggered ? 'bg-amber-400 animate-ping' : 'bg-emerald-400'
              }`}
            />
            <span>
              {isThresholdTriggered
                ? `🚨 GATILHO ATIVO (≤ ${absenceThreshold} AUSENTES)`
                : `CICLO: ${totalSorteadasNoCiclo}/25 DEZENAS`}
            </span>
          </div>
        </div>
      </div>

      {/* Feedback Toast */}
      {feedbackNotice && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="mt-4 bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 p-3 rounded-xl text-xs flex items-center gap-2 relative z-10"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="font-semibold">{feedbackNotice}</span>
        </motion.div>
      )}

      {/* State of Current Cycle Box */}
      <div className="mt-4 bg-slate-950/70 border border-slate-800 rounded-xl p-4 sm:p-5 space-y-4 relative z-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800/80 gap-2">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-amber-400" />
            <h4 className="text-xs sm:text-sm font-bold text-white">
              Estado Dinâmico do Ciclo Atual
            </h4>
            <span className="text-[10px] font-mono text-slate-400">
              Concurso Base Caixa #{latestDraw.concurso}
            </span>
          </div>
          <span className="text-[11px] font-mono text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/30 self-start sm:self-auto font-semibold">
            {concursosNoCiclo}º Concurso no Ciclo Atual
          </span>
        </div>

        {/* Progress bar across 25 dezenas */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-400 font-medium">Progresso de Saída das 25 Dezenas:</span>
            <span className="font-mono font-bold text-white">
              <strong className="text-emerald-400">{totalSorteadasNoCiclo}</strong> de 25 sorteadas (
              <span className="text-amber-400 font-bold">{cyclePendingNumbers.length} ausentes</span>)
            </span>
          </div>
          <div className="w-full bg-slate-800 h-3 rounded-full overflow-hidden p-0.5 border border-slate-700">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(totalSorteadasNoCiclo / 25) * 100}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className={`h-full rounded-full ${
                isThresholdTriggered
                  ? 'bg-gradient-to-r from-amber-500 via-yellow-400 to-orange-500 shadow-[0_0_12px_#f59e0b]'
                  : 'bg-gradient-to-r from-emerald-500 to-teal-400'
              }`}
            />
          </div>
        </div>

        {/* Pending Missing Numbers Badges */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-xs text-slate-300 font-bold flex items-center gap-1.5">
            <span>Dezenas Ausentes para Fechamento do Ciclo:</span>
          </span>
          {cyclePendingNumbers.length > 0 ? (
            <div className="flex items-center gap-1.5 flex-wrap">
              {cyclePendingNumbers.map((num) => (
                <span
                  key={num}
                  className={`px-2.5 py-1 rounded-lg font-mono font-black text-xs border shadow-sm ${
                    isThresholdTriggered
                      ? 'bg-amber-500 text-slate-950 border-amber-400 ring-2 ring-amber-400/50 shadow-amber-500/30 animate-pulse'
                      : 'bg-slate-800 text-amber-300 border-slate-700'
                  }`}
                >
                  {num.toString().padStart(2, '0')}
                </span>
              ))}
            </div>
          ) : (
            <span className="text-xs text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
              Ciclo 100% Completo! Todas as 25 dezenas foram sorteadas.
            </span>
          )}
        </div>

        {/* Dynamic Condition Status Banner */}
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-start gap-3 ${
            isThresholdTriggered
              ? 'bg-gradient-to-r from-amber-950/60 to-orange-950/40 border-amber-500/50 text-amber-200'
              : 'bg-slate-900 border-slate-800 text-slate-300'
          }`}
        >
          {isThresholdTriggered ? (
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5 animate-bounce" />
          ) : (
            <Info className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
          )}
          <div>
            <div className="font-bold text-white text-xs">
              {isThresholdTriggered
                ? `⚠️ GATILHO ATIVO: Ciclo com ${cyclePendingNumbers.length} ${cyclePendingNumbers.length === 1 ? 'dezena ausente' : 'dezenas ausentes'} (limite configurado: ≤ ${absenceThreshold})`
                : `Ciclo em evolução: ${cyclePendingNumbers.length} dezenas ausentes restantes`}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
              {isThresholdTriggered
                ? `A pressão estatística para o sorteio das dezenas ausentes [${cyclePendingNumbers.map(n => n.toString().padStart(2, '0')).join(', ')}] é máxima. Os canais de notificação dispararão alertas ao usuário.`
                : `O alerta sonoro e push disparará automaticamente quando restarem ${absenceThreshold} ou menos dezenas ausentes para o ciclo fechar.`}
            </p>
          </div>
        </div>
      </div>

      {/* Threshold Selector: 1, 2, 3 (Padrão), 4, 5 */}
      <div className="mt-4 bg-slate-950/70 border border-slate-800 rounded-xl p-4 sm:p-5 space-y-3 relative z-10">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
          <label className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
            <Sliders className="w-4 h-4 text-amber-400" />
            <span>Definir Limite de Ausência para Disparo (Dezenas Restantes)</span>
          </label>
          <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
            Atual: {absenceThreshold} {absenceThreshold === 1 ? 'dezena' : 'dezenas'}
          </span>
        </div>

        <p className="text-xs text-slate-400">
          Escolha quando o sistema deve acionar os alertas. O padrão recomendado pela análise estatística da Lotofácil é <strong>3 dezenas</strong>.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5 text-xs">
          {[
            {
              threshold: 1,
              title: '1 Dezena',
              subtitle: 'Pressão Máxima',
              desc: 'Dispara quando faltar apenas a última dezena para fechar o ciclo de 25.',
              badge: 'Crítico',
            },
            {
              threshold: 2,
              title: '2 Dezenas',
              subtitle: 'Alta Urgência',
              desc: 'Dispara quando restarem 2 dezenas ausentes.',
              badge: 'Urgente',
            },
            {
              threshold: 3,
              title: '3 Dezenas',
              subtitle: 'Reta Final',
              desc: 'Padrão recomendado: alerta na reta final canônica (≤ 3 ausentes).',
              badge: 'Padrão',
            },
            {
              threshold: 4,
              title: '4 Dezenas',
              subtitle: 'Antecipado',
              desc: 'Dispara quando restarem 4 dezenas para planejamento prévio.',
              badge: 'Antecipado',
            },
            {
              threshold: 5,
              title: '5 Dezenas',
              subtitle: 'Radar Amplo',
              desc: 'Radar expandido quando o ciclo ultrapassar 20 dezenas sorteadas.',
              badge: 'Expandido',
            },
          ].map((item) => {
            const isSelected = absenceThreshold === item.threshold;
            return (
              <button
                key={item.threshold}
                type="button"
                onClick={() => handleThresholdSelect(item.threshold)}
                className={`p-3 rounded-xl border text-left transition cursor-pointer relative ${
                  isSelected
                    ? 'bg-amber-500/20 border-amber-400 text-white shadow-md shadow-amber-500/20 ring-1 ring-amber-400'
                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-850'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-xs text-white flex items-center gap-1.5">
                    {item.title}
                  </span>
                  <span
                    className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded ${
                      isSelected
                        ? 'bg-amber-400 text-slate-950'
                        : item.threshold === 3
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {item.badge}
                  </span>
                </div>
                <div className="text-[10px] text-amber-300/90 font-medium mb-1">
                  {item.subtitle}
                </div>
                <p className="text-[10px] text-slate-400 leading-tight">
                  {item.desc}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Channels: Sound & Push Toggles */}
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs relative z-10">
        {/* Notificações Push */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 flex flex-col justify-between space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div
                className={`w-9 h-9 rounded-lg flex items-center justify-center border ${
                  pushEnabled
                    ? 'bg-amber-500/15 border-amber-500/40 text-amber-400'
                    : 'bg-slate-800 border-slate-700 text-slate-500'
                }`}
              >
                {pushEnabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
              </div>
              <div>
                <strong className="block text-white font-bold text-xs">
                  Notificações Push no Navegador
                </strong>
                <span className="text-[11px] text-slate-400">
                  Permissão: {notificationPermission === 'granted' ? 'Autorizada' : notificationPermission}
                </span>
              </div>
            </div>

            <button
              onClick={() => handleTogglePush(!pushEnabled)}
              className={`w-11 h-6 flex items-center rounded-full p-1 transition cursor-pointer shrink-0 ${
                pushEnabled ? 'bg-amber-500 justify-end' : 'bg-slate-800 justify-start'
              }`}
              title={pushEnabled ? 'Desativar notificações push' : 'Ativar notificações push'}
            >
              <span className="w-4 h-4 rounded-full bg-white shadow-md"></span>
            </button>
          </div>

          <p className="text-[11px] text-slate-400 leading-relaxed">
            Emite alerta push na tela mesmo com o navegador em segundo plano quando o número de dezenas ausentes for menor ou igual a <strong>{absenceThreshold}</strong>.
          </p>

          <button
            type="button"
            onClick={handleTestPush}
            disabled={isTestingPush}
            className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-200 text-xs font-semibold transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isTestingPush ? 'animate-spin text-amber-400' : ''}`} />
            <span>{isTestingPush ? 'Enviando Alerta Push...' : 'Testar Notificação Push de Ciclo'}</span>
          </button>
        </div>

        {/* Notificações Sonoras */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 flex flex-col justify-between space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div
                className={`w-9 h-9 rounded-lg flex items-center justify-center border ${
                  soundEnabled
                    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                    : 'bg-slate-800 border-slate-700 text-slate-500'
                }`}
              >
                {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </div>
              <div>
                <strong className="block text-white font-bold text-xs">
                  Notificações Sonoras (Web Audio API)
                </strong>
                <span className="text-[11px] text-slate-400">
                  Pulso de radar harmônico sintetizado
                </span>
              </div>
            </div>

            <button
              onClick={() => handleToggleSound(!soundEnabled)}
              className={`w-11 h-6 flex items-center rounded-full p-1 transition cursor-pointer shrink-0 ${
                soundEnabled ? 'bg-emerald-500 justify-end' : 'bg-slate-800 justify-start'
              }`}
              title={soundEnabled ? 'Silenciar avisos sonoros' : 'Ativar avisos sonoros'}
            >
              <span className="w-4 h-4 rounded-full bg-white shadow-md"></span>
            </button>
          </div>

          <p className="text-[11px] text-slate-400 leading-relaxed">
            Toca um alarme harmônico acústico exclusivo de reta final do ciclo sem necessidade de carregar arquivos externos de áudio.
          </p>

          <button
            type="button"
            onClick={handleTestSound}
            className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-200 text-xs font-semibold transition cursor-pointer"
          >
            <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Testar Alarme Sonoro de Ciclo</span>
          </button>
        </div>
      </div>

      {/* Save Button */}
      <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-end gap-2 relative z-10">
        <button
          type="button"
          onClick={handleSaveAll}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 transition cursor-pointer active:scale-95"
        >
          <Save className="w-3.5 h-3.5" />
          <span>Salvar Preferências de Ciclo</span>
        </button>
      </div>
    </div>
  );
};
