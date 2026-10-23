import React, { useState, useEffect } from 'react';
import {
  Bell,
  X,
  Check,
  Flame,
  RotateCw,
  Volume2,
  VolumeX,
  ShieldCheck,
  Smartphone,
  Trash2,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Info,
} from 'lucide-react';
import {
  getPushNotificationConfig,
  savePushNotificationConfig,
  getAlertsHistory,
  markAllAlertsAsRead,
  clearAlertsHistory,
  requestBrowserPushPermission,
  fireBrowserPushNotification,
  PushNotificationConfig,
  IntelligentAlert,
} from '../services/notificationService';
import { soundService } from '../services/soundAlert';

interface IntelligentPushNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAlertsChanged?: () => void;
}

export const IntelligentPushNotificationModal: React.FC<
  IntelligentPushNotificationModalProps
> = ({ isOpen, onClose, onAlertsChanged }) => {
  const [config, setConfig] = useState<PushNotificationConfig>(getPushNotificationConfig);
  const [alerts, setAlerts] = useState<IntelligentAlert[]>(getAlertsHistory);
  const [permissionStatus, setPermissionStatus] = useState<string>('default');
  const [testSent, setTestSent] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermissionStatus(Notification.permission);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setAlerts(getAlertsHistory());
      setConfig(getPushNotificationConfig());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleUpdateConfig = (partial: Partial<PushNotificationConfig>) => {
    const updated = { ...config, ...partial };
    setConfig(updated);
    savePushNotificationConfig(updated);
  };

  const handleRequestPermission = async () => {
    const perm = await requestBrowserPushPermission();
    setPermissionStatus(perm);
    if (perm === 'granted') {
      handleUpdateConfig({ pushEnabled: true });
    }
  };

  const handleMarkAllRead = () => {
    markAllAlertsAsRead();
    setAlerts(getAlertsHistory());
    if (onAlertsChanged) onAlertsChanged();
  };

  const handleClear = () => {
    clearAlertsHistory();
    setAlerts([]);
    if (onAlertsChanged) onAlertsChanged();
  };

  const handleSendTestAlert = () => {
    const title = '🎯 LotoSniper • Teste de Notificação Inteligente';
    const body = 'Sistema de Alertas Push Inteligentes calibrado com sucesso para Radar > 90% e Novos Ciclos!';
    fireBrowserPushNotification(title, body);
    soundService.playGoldenZoneSuccessChime();
    setTestSent(true);
    setTimeout(() => setTestSent(false), 4000);
  };

  const unreadCount = alerts.filter((a) => !a.read).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border-2 border-slate-700/80 rounded-3xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-rose-950/70 via-slate-900 to-amber-950/60 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-br from-rose-500 to-amber-500 text-slate-950 shadow-lg shadow-rose-500/25">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-white">
                  Notificações Push Inteligentes
                </h3>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-black">
                    {unreadCount} nova(s)
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Configure alertas em tempo real para Radar de Tendências e Início de Ciclos.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content body */}
        <div className="p-4 sm:p-6 space-y-6 overflow-y-auto flex-1">
          {/* Permission banner */}
          {permissionStatus !== 'granted' && (
            <div className="bg-amber-950/50 border border-amber-500/40 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
              <div className="flex items-center gap-3">
                <Smartphone className="w-5 h-5 text-amber-400 shrink-0" />
                <div>
                  <span className="text-xs font-bold text-white block">
                    Permissão de Notificação do Navegador
                  </span>
                  <span className="text-[11px] text-slate-300">
                    Ative as notificações do navegador para receber alertas mesmo quando o app estiver em segundo plano.
                  </span>
                </div>
              </div>
              <button
                onClick={handleRequestPermission}
                className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition cursor-pointer shrink-0 shadow-md shadow-amber-500/20"
              >
                Ativar Notificações
              </button>
            </div>
          )}

          {/* Configuration Settings */}
          <div className="space-y-4">
            <h4 className="text-xs uppercase font-mono tracking-wider font-bold text-slate-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Gatilhos de Alerta Automático</span>
            </h4>

            {/* Trigger 1: Radar Tendências Quentes > 90% */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-rose-500/15 text-rose-400 border border-rose-500/30">
                    <Flame className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block">
                      Radar de Tendências Quentes: Probabilidade &gt; {config.radarThreshold}%
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Dispara alerta push quando o algoritmo EMA detectar uma dezena com alta probabilidade nos próximos 5 concursos.
                    </span>
                  </div>
                </div>

                <input
                  type="checkbox"
                  checked={config.radarAlertEnabled}
                  onChange={(e) => handleUpdateConfig({ radarAlertEnabled: e.target.checked })}
                  className="w-5 h-5 accent-rose-500 cursor-pointer rounded"
                />
              </div>

              {config.radarAlertEnabled && (
                <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
                  <div className="flex justify-between text-xs text-slate-300">
                    <span>Sensibilidade do Radar:</span>
                    <span className="font-mono font-bold text-rose-400">{config.radarThreshold}%</span>
                  </div>
                  <input
                    type="range"
                    min="80"
                    max="95"
                    step="1"
                    value={config.radarThreshold}
                    onChange={(e) =>
                      handleUpdateConfig({ radarThreshold: parseInt(e.target.value, 10) })
                    }
                    className="w-full accent-rose-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500">
                    <span>80% (Mais frequente)</span>
                    <span className="font-bold text-rose-400">90% (Padrão Recomendado)</span>
                    <span>95% (Apenas Hiper-Quentes)</span>
                  </div>
                </div>
              )}
            </div>

            {/* Trigger 2: Início de Novo Ciclo */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30">
                  <RotateCw className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-white block">
                    Início de um Novo Ciclo das 25 Dezenas
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Notifica imediatamente no 1º concurso de cada ciclo para que você aproveite as 10 ausentes e o ponto de virada estatística.
                  </span>
                </div>
              </div>

              <input
                type="checkbox"
                checked={config.newCycleAlertEnabled}
                onChange={(e) => handleUpdateConfig({ newCycleAlertEnabled: e.target.checked })}
                className="w-5 h-5 accent-amber-500 cursor-pointer rounded"
              />
            </div>

            {/* Audio Toggle */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                  {config.soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                </div>
                <div>
                  <span className="text-xs font-bold text-white block">
                    Efeitos Sonoros de Notificação
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Tocar sino festivo e chime sonoro ao receber alertas de oportunidade.
                  </span>
                </div>
              </div>

              <input
                type="checkbox"
                checked={config.soundEnabled}
                onChange={(e) => handleUpdateConfig({ soundEnabled: e.target.checked })}
                className="w-5 h-5 accent-cyan-500 cursor-pointer rounded"
              />
            </div>
          </div>

          {/* Test & Actions Bar */}
          <div className="flex items-center justify-between gap-3 pt-2">
            <button
              onClick={handleSendTestAlert}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition cursor-pointer flex items-center gap-1.5 border border-slate-700"
            >
              {testSent ? <Check className="w-4 h-4 text-emerald-400" /> : <Sparkles className="w-4 h-4 text-amber-400" />}
              <span>{testSent ? 'Alerta Teste Disparado!' : 'Testar Alerta Agora'}</span>
            </button>

            {alerts.length > 0 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleMarkAllRead}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition cursor-pointer"
                >
                  Marcar Lidos
                </button>
                <button
                  onClick={handleClear}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-400 transition cursor-pointer"
                  title="Limpar histórico"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Alerts History Feed */}
          <div className="space-y-3">
            <h4 className="text-xs uppercase font-mono tracking-wider font-bold text-slate-400 flex items-center justify-between">
              <span>Histórico de Alertas Recentes ({alerts.length})</span>
            </h4>

            {alerts.length === 0 ? (
              <div className="p-8 text-center bg-slate-950/50 rounded-2xl border border-slate-800 space-y-2">
                <Bell className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-xs text-slate-400">
                  Nenhum alerta disparado ainda. O LotoSniper monitorará ativamente os próximos concursos.
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`p-3 rounded-2xl border transition ${
                      !alert.read
                        ? 'bg-gradient-to-r from-rose-950/40 to-slate-900 border-rose-500/40 shadow-sm'
                        : 'bg-slate-950/60 border-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2.5">
                        <div
                          className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${
                            alert.type === 'radar_90'
                              ? 'bg-rose-500/20 text-rose-300'
                              : 'bg-amber-500/20 text-amber-300'
                          }`}
                        >
                          {alert.type === 'radar_90' ? (
                            <Flame className="w-4 h-4" />
                          ) : (
                            <RotateCw className="w-4 h-4" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-white">
                              {alert.title}
                            </span>
                            {!alert.read && (
                              <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                            {alert.body}
                          </p>
                        </div>
                      </div>

                      <span className="text-[10px] font-mono text-slate-500 shrink-0">
                        {alert.dateStr}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Processamento 100% no cliente sem dependência de servidores externos</span>
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition cursor-pointer shadow-lg shadow-emerald-500/20"
          >
            Concluir
          </button>
        </div>
      </div>
    </div>
  );
};
