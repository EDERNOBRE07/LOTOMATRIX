import { soundService } from './soundAlert';
import { isNotificationSupported } from './nativeNotificationService';

export interface ScheduledAlertReminder {
  id: string;
  title: string;
  description: string;
  category: 'concurso_futuro' | 'meta_ciclo' | 'fechamento_especial' | 'personalizado';
  targetConcurso?: number;
  targetCyclePending?: number[];
  scheduledDate: string; // YYYY-MM-DD
  scheduledTime: string; // HH:mm
  repeatSchedule: 'once' | 'draw_days' | 'daily' | 'cycle_step';
  notifyViaServiceWorker: boolean;
  notifySound: boolean;
  active: boolean;
  status: 'pending' | 'triggered' | 'dismissed';
  lastTriggeredAt?: string;
  createdAt: string;
}

export const STORAGE_SCHEDULED_ALERTS = 'lotosniper_scheduled_alerts';

const DEFAULT_SCHEDULED_ALERTS: ScheduledAlertReminder[] = [
  {
    id: 'alert-rem-1',
    title: 'Lembrete do Concurso #3819 da Lotofácil',
    description: 'Conferir matrizes salvas e registrar fechamento ouro antes do encerramento das apostas às 19:30.',
    category: 'concurso_futuro',
    targetConcurso: 3819,
    scheduledDate: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
    scheduledTime: '19:15',
    repeatSchedule: 'draw_days',
    notifyViaServiceWorker: true,
    notifySound: true,
    active: true,
    status: 'pending',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'alert-rem-2',
    title: 'Meta de Fechamento de Ciclo (Dezenas 17 e 22)',
    description: 'Monitorar 4º concurso do ciclo: as dezenas 17 e 22 possuem 88.4% de probabilidade matemática de encerramento do ciclo.',
    category: 'meta_ciclo',
    targetConcurso: 3819,
    targetCyclePending: [17, 22],
    scheduledDate: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
    scheduledTime: '20:45',
    repeatSchedule: 'cycle_step',
    notifyViaServiceWorker: true,
    notifySound: true,
    active: true,
    status: 'pending',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'alert-rem-3',
    title: 'Auditoria Silenciosa do Fechamento Salvo',
    description: 'Disparar conferência automática dos bilhetes vencedores logo após a publicação do rateio pela Caixa.',
    category: 'fechamento_especial',
    targetConcurso: 3819,
    scheduledDate: new Date().toISOString().slice(0, 10),
    scheduledTime: '21:00',
    repeatSchedule: 'daily',
    notifyViaServiceWorker: true,
    notifySound: false,
    active: true,
    status: 'pending',
    createdAt: new Date().toISOString(),
  },
];

export function getScheduledAlerts(): ScheduledAlertReminder[] {
  try {
    const raw = localStorage.getItem(STORAGE_SCHEDULED_ALERTS);
    if (!raw) {
      localStorage.setItem(STORAGE_SCHEDULED_ALERTS, JSON.stringify(DEFAULT_SCHEDULED_ALERTS));
      return DEFAULT_SCHEDULED_ALERTS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_SCHEDULED_ALERTS;
  } catch {
    return DEFAULT_SCHEDULED_ALERTS;
  }
}

export function saveScheduledAlerts(alerts: ScheduledAlertReminder[]): void {
  try {
    localStorage.setItem(STORAGE_SCHEDULED_ALERTS, JSON.stringify(alerts));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('lotosniper-scheduled-alerts-updated', { detail: alerts })
      );
    }
  } catch (err) {
    console.error('Erro ao salvar alertas agendados:', err);
  }
}

export function addScheduledAlert(
  alert: Omit<ScheduledAlertReminder, 'id' | 'createdAt' | 'status'>
): ScheduledAlertReminder {
  const newAlert: ScheduledAlertReminder = {
    ...alert,
    id: `alert-rem-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };

  const current = getScheduledAlerts();
  saveScheduledAlerts([newAlert, ...current]);
  return newAlert;
}

export function deleteScheduledAlert(id: string): void {
  const current = getScheduledAlerts();
  const filtered = current.filter((a) => a.id !== id);
  saveScheduledAlerts(filtered);
}

export function toggleScheduledAlert(id: string, active: boolean): void {
  const current = getScheduledAlerts();
  const updated = current.map((a) => (a.id === id ? { ...a, active } : a));
  saveScheduledAlerts(updated);
}

/**
 * Envia notificação push via Service Worker para um lembrete agendado
 */
export async function triggerScheduledAlertPush(
  alert: ScheduledAlertReminder
): Promise<boolean> {
  // 1. Toca o alerta sonoro se habilitado
  if (alert.notifySound) {
    try {
      soundService.playGoldenZoneSuccessChime();
    } catch {}
  }

  // 2. Dispara a notificação push nativa via Service Worker
  if (!isNotificationSupported() || Notification.permission !== 'granted') {
    console.warn('[Alertas Agendados] Permissão de notificação não concedida ou não suportada.');
    return false;
  }

  const title = `🔔 ${alert.title}`;
  const notificationOptions: NotificationOptions & {
    renotify?: boolean;
    vibrate?: number[];
  } = {
    body: alert.description,
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    tag: `lotosniper-scheduled-${alert.id}`,
    renotify: true,
    requireInteraction: true,
    data: {
      url: '/#configuracoes',
      alertId: alert.id,
      category: alert.category,
      targetConcurso: alert.targetConcurso,
    },
  };

  let pushSuccess = false;

  try {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      if (registration && 'showNotification' in registration) {
        await registration.showNotification(title, notificationOptions);
        pushSuccess = true;
      }
    }

    if (!pushSuccess) {
      const notif = new Notification(title, notificationOptions);
      notif.onclick = () => {
        window.focus();
        window.dispatchEvent(new CustomEvent('switch-tab', { detail: 'configuracoes' }));
        notif.close();
      };
      pushSuccess = true;
    }

    // 3. Atualiza status no storage
    const current = getScheduledAlerts();
    const nowTime = new Date().toLocaleTimeString('pt-BR');
    const updated = current.map((a) =>
      a.id === alert.id
        ? {
            ...a,
            status: 'triggered' as const,
            lastTriggeredAt: `${new Date().toLocaleDateString('pt-BR')} às ${nowTime}`,
          }
        : a
    );
    saveScheduledAlerts(updated);

    return true;
  } catch (err) {
    console.error('[Alertas Agendados] Erro ao enviar notificação push:', err);
    return false;
  }
}
