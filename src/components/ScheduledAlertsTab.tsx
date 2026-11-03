import React, { useState, useEffect } from 'react';
import {
  Bell,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  Play,
  RotateCcw,
  Flame,
  Target,
  Sparkles,
  Layers,
  ShieldCheck,
  Zap,
  Volume2,
  Send,
  X,
} from 'lucide-react';
import {
  ScheduledAlertReminder,
  getScheduledAlerts,
  saveScheduledAlerts,
  addScheduledAlert,
  deleteScheduledAlert,
  toggleScheduledAlert,
  triggerScheduledAlertPush,
} from '../services/scheduledAlertsStorage';
import {
  getNotificationPermission,
  requestNativeNotificationPermission,
  isNotificationSupported,
} from '../services/nativeNotificationService';
import { LotofacilDraw } from '../types/lotofacil';
import { CONCURSO_ATUAL } from '../data/lotofacilData';

interface ScheduledAlertsTabProps {
  latestDraw?: LotofacilDraw;
  cyclePendingNumbers?: number[];
  concursosNoCiclo?: number;
}

export const ScheduledAlertsTab: React.FC<ScheduledAlertsTabProps> = ({
  latestDraw = CONCURSO_ATUAL,
  cyclePendingNumbers = [17, 22],
  concursosNoCiclo = 3,
}) => {
  const [alerts, setAlerts] = useState<ScheduledAlertReminder[]>(getScheduledAlerts);
  const [permission, setPermission] = useState<NotificationPermission>(getNotificationPermission);
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [testSuccessMessage, setTestSuccessMessage] = useState<string | null>(null);

  // Campos do formulário
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [category, setCategory] = useState<'concurso_futuro' | 'meta_ciclo' | 'fechamento_especial' | 'personalizado'>('concurso_futuro');
  const [targetConcurso, setTargetConcurso] = useState<number>(latestDraw.concurso + 1);
  const [targetCyclePending, setTargetCyclePending] = useState<string>(cyclePendingNumbers.join(', '));
  const [scheduledDate, setScheduledDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  });
  const [scheduledTime, setScheduledTime] = useState<string>('19:15');
  const [repeatSchedule, setRepeatSchedule] = useState<'once' | 'draw_days' | 'daily' | 'cycle_step'>('draw_days');
  const [notifyViaServiceWorker, setNotifyViaServiceWorker] = useState<boolean>(true);
  const [notifySound, setNotifySound] = useState<boolean>(true);

  // Atualiza lista quando eventos globais ocorrerem
  useEffect(() => {
    const handleAlertsUpdated = (e: any) => {
      setAlerts(e.detail || getScheduledAlerts());
    };
    window.addEventListener('lotosniper-scheduled-alerts-updated', handleAlertsUpdated);
    return () => window.removeEventListener('lotosniper-scheduled-alerts-updated', handleAlertsUpdated);
  }, []);

  // Monitor em background para disparar lembretes no horário exato
  useEffect(() => {
    const checkScheduledAlerts = () => {
      const now = new Date();
      const currentDate = now.toISOString().slice(0, 10);
      const currentHHmm = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      const isSunday = now.getDay() === 0;

      const currentAlerts = getScheduledAlerts();

      currentAlerts.forEach((alert) => {
        if (!alert.active) return;

        let shouldTrigger = false;

        if (alert.repeatSchedule === 'once') {
          shouldTrigger = alert.scheduledDate === currentDate && alert.scheduledTime === currentHHmm && alert.status !== 'triggered';
        } else if (alert.repeatSchedule === 'daily') {
          shouldTrigger = alert.scheduledTime === currentHHmm;
        } else if (alert.repeatSchedule === 'draw_days') {
          // Dias de sorteio: Segunda a Sábado
          shouldTrigger = !isSunday && alert.scheduledTime === currentHHmm;
        }

        if (shouldTrigger) {
          console.log(`[Alertas Agendados] Disparando lembrete agendado: ${alert.title}`);
          triggerScheduledAlertPush(alert);
        }
      });
    };

    const interval = setInterval(checkScheduledAlerts, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleRequestPermission = async () => {
    const perm = await requestNativeNotificationPermission();
    setPermission(perm);
  };

  const handleCreateAlert = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    let parsedDezenas: number[] | undefined;
    if (category === 'meta_ciclo' && targetCyclePending.trim()) {
      parsedDezenas = targetCyclePending
        .split(/[,\s]+/)
        .map((n) => parseInt(n, 10))
        .filter((n) => !isNaN(n) && n >= 1 && n <= 25);
    }

    const created = addScheduledAlert({
      title: title.trim(),
      description: description.trim() || 'Lembrete agendado do LotoSniper.',
      category,
      targetConcurso: targetConcurso || latestDraw.concurso + 1,
      targetCyclePending: parsedDezenas,
      scheduledDate,
      scheduledTime,
      repeatSchedule,
      notifyViaServiceWorker,
      notifySound,
      active: true,
    });

    setAlerts(getScheduledAlerts());
    setIsFormOpen(false);

    // Reset campos
    setTitle('');
    setDescription('');
    setTestSuccessMessage(`Lembrete "${created.title}" criado e agendado com sucesso!`);
    setTimeout(() => setTestSuccessMessage(null), 4000);
  };

  const handleTestPush = async (alert: ScheduledAlertReminder) => {
    if (permission !== 'granted') {
      const perm = await requestNativeNotificationPermission();
      setPermission(perm);
      if (perm !== 'granted') {
        setTestSuccessMessage('Aviso: Permissão de notificações pendente no navegador. Clique em "Autorizar Notificações" para ativar o push.');
        setTimeout(() => setTestSuccessMessage(null), 5000);
        return;
      }
    }

    const success = await triggerScheduledAlertPush(alert);
    if (success) {
      setTestSuccessMessage(`Notificação push do lembrete "${alert.title}" enviada via Service Worker!`);
      setTimeout(() => setTestSuccessMessage(null), 4500);
    }
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Deseja excluir este alerta agendado?')) {
      deleteScheduledAlert(id);
      setAlerts(getScheduledAlerts());
    }
  };

  const handleToggle = (id: string, active: boolean) => {
    toggleScheduledAlert(id, active);
    setAlerts(getScheduledAlerts());
  };

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Banner / Header */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/30 rounded-3xl border-2 border-amber-500/40 p-5 sm:p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800 relative z-10">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 via-orange-600 to-amber-700 flex items-center justify-center text-white shadow-lg shadow-amber-500/30 shrink-0">
              <Bell className="w-6 h-6 animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-black text-white tracking-wide">
                  Alertas Agendados & Metas de Ciclos
                </h3>
                <span className="text-[10px] font-mono font-black uppercase px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  PUSH SERVICE WORKER
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                Crie lembretes personalizados para <strong>concursos futuros</strong> ou <strong>metas de ciclo</strong> da Lotofácil. O Service Worker mantém o monitoramento ativo em segundo plano e envia alertas push pontuais conforme o cronograma definido.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-center">
            <button
              type="button"
              onClick={() => setIsFormOpen(!isFormOpen)}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs transition cursor-pointer flex items-center gap-2 shadow-lg shadow-amber-500/20 active:scale-95"
            >
              {isFormOpen ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              <span>{isFormOpen ? 'Fechar Formulário' : 'Novo Lembrete Agendado'}</span>
            </button>
          </div>
        </div>

        {/* Status de Notificações do Navegador */}
        <div className="pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs relative z-10">
          <div className="flex items-center gap-2 text-slate-300">
            {permission === 'granted' ? (
              <span className="flex items-center gap-1.5 text-emerald-400 font-mono font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Notificações Push Habilitadas no Navegador (Service Worker Pronto)</span>
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-amber-400 font-mono font-bold">
                <AlertCircle className="w-4 h-4 text-amber-400" />
                <span>Permissão de Notificação Push Pendente</span>
              </span>
            )}
          </div>

          {permission !== 'granted' && (
            <button
              type="button"
              onClick={handleRequestPermission}
              className="px-3.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-bold text-xs transition cursor-pointer flex items-center gap-1.5"
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Autorizar Notificações no Navegador</span>
            </button>
          )}
        </div>
      </div>

      {/* Alerta de Sucesso */}
      {testSuccessMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="font-semibold">{testSuccessMessage}</span>
        </div>
      )}

      {/* Formulário de Criação de Lembrete */}
      {isFormOpen && (
        <form
          onSubmit={handleCreateAlert}
          className="bg-slate-900/90 rounded-2xl border-2 border-amber-500/40 p-5 space-y-4 shadow-xl animate-fadeIn"
        >
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Plus className="w-4 h-4 text-amber-400" />
              <span>Configurar Novo Lembrete Agendado</span>
            </h4>
            <span className="text-[10px] font-mono text-slate-400">
              Concurso Atual: #{latestDraw.concurso}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* Título */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-300 block">
                Título do Lembrete:
              </label>
              <input
                type="text"
                required
                placeholder="Ex: Registrar Fechamento Ouro Concurso #3819"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-400"
              />
            </div>

            {/* Categoria */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-300 block">
                Categoria do Alerta:
              </label>
              <select
                value={category}
                onChange={(e: any) => setCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-400"
              >
                <option value="concurso_futuro">Concurso Futuro (Lembrete Pré-Sorteio)</option>
                <option value="meta_ciclo">Meta de Ciclo (Dezenas Faltantes)</option>
                <option value="fechamento_especial">Fechamento Especial & Bolão</option>
                <option value="personalizado">Personalizado</option>
              </select>
            </div>

            {/* Concurso Alvo */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-300 block">
                Concurso Alvo da Caixa:
              </label>
              <input
                type="number"
                value={targetConcurso}
                onChange={(e) => setTargetConcurso(parseInt(e.target.value, 10) || latestDraw.concurso + 1)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono text-xs focus:outline-none focus:border-amber-400"
              />
            </div>

            {/* Dezenas Meta de Ciclo */}
            {category === 'meta_ciclo' ? (
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-300 block">
                  Dezenas Ausentes do Ciclo para Monitorar:
                </label>
                <input
                  type="text"
                  placeholder="Ex: 17, 22"
                  value={targetCyclePending}
                  onChange={(e) => setTargetCyclePending(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono text-xs focus:outline-none focus:border-amber-400"
                />
              </div>
            ) : (
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-300 block">
                  Data de Disparo:
                </label>
                <input
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono text-xs focus:outline-none focus:border-amber-400"
                />
              </div>
            )}

            {/* Horário de Disparo */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-300 block">
                Horário do Alerta (HH:mm):
              </label>
              <input
                type="time"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono text-xs focus:outline-none focus:border-amber-400"
              />
            </div>

            {/* Frequência de Repetição */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-300 block">
                Cronograma de Repetição:
              </label>
              <select
                value={repeatSchedule}
                onChange={(e: any) => setRepeatSchedule(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-400"
              >
                <option value="draw_days">Dias de Sorteio (Segunda a Sábado)</option>
                <option value="daily">Diário (Todos os dias)</option>
                <option value="cycle_step">A cada nova apuração do ciclo</option>
                <option value="once">Apenas uma vez na data definida</option>
              </select>
            </div>
          </div>

          {/* Descrição */}
          <div className="space-y-1 text-xs">
            <label className="text-[11px] font-bold text-slate-300 block">
              Instruções do Lembrete:
            </label>
            <textarea
              rows={2}
              placeholder="Ex: Conferir as dezenas de ouro geradas com a IA e verificar se 17 e 22 foram sorteadas."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-400 resize-none"
            />
          </div>

          {/* Opções de Notificação */}
          <div className="flex flex-wrap items-center gap-4 pt-2 text-xs">
            <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={notifyViaServiceWorker}
                onChange={(e) => setNotifyViaServiceWorker(e.target.checked)}
                className="accent-amber-500 rounded"
              />
              <span>Enviar Notificação Push via Service Worker</span>
            </label>

            <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={notifySound}
                onChange={(e) => setNotifySound(e.target.checked)}
                className="accent-amber-500 rounded"
              />
              <span>Alerta Sonoro (Chime)</span>
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold text-xs transition cursor-pointer shadow-md shadow-amber-500/20"
            >
              Salvar Lembrete Agendado
            </button>
          </div>
        </form>
      )}

      {/* Lista de Alertas Agendados */}
      <div className="space-y-3">
        <div className="flex items-center justify-between pb-1">
          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <span>Seus Lembretes & Metas Ativas</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
              {alerts.length} lembrete(s)
            </span>
          </h4>
        </div>

        {alerts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {alerts.map((alert) => {
              const isCiclo = alert.category === 'meta_ciclo';
              const isConcurso = alert.category === 'concurso_futuro';

              return (
                <div
                  key={alert.id}
                  className={`p-4 rounded-2xl border transition space-y-3 relative overflow-hidden ${
                    alert.active
                      ? isCiclo
                        ? 'bg-gradient-to-br from-slate-900 via-slate-900 to-orange-950/30 border-orange-500/40'
                        : isConcurso
                        ? 'bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/30 border-indigo-500/40'
                        : 'bg-slate-900/90 border-slate-800'
                      : 'bg-slate-950/60 border-slate-850 opacity-60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded ${
                            isCiclo
                              ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
                              : isConcurso
                              ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                              : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                          }`}
                        >
                          {isCiclo ? 'META DE CICLO' : isConcurso ? 'CONCURSO FUTURO' : 'LEMBRETE'}
                        </span>

                        {alert.targetConcurso && (
                          <span className="text-[10px] font-mono font-bold text-slate-400">
                            Concurso #{alert.targetConcurso}
                          </span>
                        )}
                      </div>

                      <strong className="text-sm font-bold text-white block">
                        {alert.title}
                      </strong>
                    </div>

                    {/* Toggle Switch */}
                    <button
                      type="button"
                      onClick={() => handleToggle(alert.id, !alert.active)}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer shrink-0 ${
                        alert.active ? 'bg-amber-500' : 'bg-slate-700'
                      }`}
                      title={alert.active ? 'Pausar lembrete' : 'Ativar lembrete'}
                    >
                      <span
                        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                          alert.active ? 'translate-x-4' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">
                    {alert.description}
                  </p>

                  {/* Dezenas do Ciclo */}
                  {alert.targetCyclePending && alert.targetCyclePending.length > 0 && (
                    <div className="flex items-center gap-1.5 text-xs">
                      <span className="text-[11px] text-slate-400 font-mono">Dezenas Alvo:</span>
                      <div className="flex gap-1">
                        {alert.targetCyclePending.map((d) => (
                          <span
                            key={d}
                            className="w-6 h-6 rounded-md bg-orange-500/20 text-orange-300 border border-orange-500/40 flex items-center justify-center font-mono font-bold text-[10px]"
                          >
                            {d.toString().padStart(2, '0')}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Metadados de Horário e Cronograma */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800 text-[11px] text-slate-400">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1 font-mono">
                        <Clock className="w-3.5 h-3.5 text-amber-400" />
                        <span>{alert.scheduledTime}</span>
                      </span>

                      <span className="flex items-center gap-1 font-mono">
                        <Calendar className="w-3.5 h-3.5 text-slate-500" />
                        <span>
                          {alert.repeatSchedule === 'draw_days'
                            ? 'Seg a Sáb (Sorteios)'
                            : alert.repeatSchedule === 'daily'
                            ? 'Diário'
                            : alert.repeatSchedule === 'cycle_step'
                            ? 'Passo do Ciclo'
                            : alert.scheduledDate}
                        </span>
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleTestPush(alert)}
                        className="p-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 transition cursor-pointer flex items-center gap-1"
                        title="Testar notificação push via Service Worker"
                      >
                        <Send className="w-3 h-3" />
                        <span className="text-[10px] font-bold">Testar Push</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(alert.id)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-400 transition cursor-pointer"
                        title="Excluir lembrete"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {alert.lastTriggeredAt && (
                    <div className="text-[9px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      <span>Último disparo push: {alert.lastTriggeredAt}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 rounded-2xl bg-slate-900/40 border border-slate-800 text-center space-y-2 text-xs text-slate-400">
            <Bell className="w-6 h-6 mx-auto text-slate-600" />
            <p className="font-bold text-slate-300">Nenhum alerta agendado no momento.</p>
            <p>Clique em "Novo Lembrete Agendado" para criar lembretes de concursos ou metas de ciclo.</p>
          </div>
        )}
      </div>
    </div>
  );
};
