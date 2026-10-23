import { LotofacilDraw, DezenaStats } from '../types/lotofacil';
import { soundService } from './soundAlert';

export interface IntelligentAlert {
  id: string;
  timestamp: number;
  dateStr: string;
  type: 'radar_90' | 'new_cycle' | 'cycle_closed' | 'system';
  title: string;
  body: string;
  dezena?: number;
  probabilidade?: number;
  concurso?: number;
  read: boolean;
}

export interface PushNotificationConfig {
  pushEnabled: boolean;
  radarAlertEnabled: boolean;
  radarThreshold: number; // default: 90%
  newCycleAlertEnabled: boolean;
  soundEnabled: boolean;
}

const CONFIG_KEY = 'lotosniper_push_notification_config';
const ALERTS_KEY = 'lotosniper_push_alerts_history';

export function getPushNotificationConfig(): PushNotificationConfig {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (!raw) {
      return {
        pushEnabled: true,
        radarAlertEnabled: true,
        radarThreshold: 90,
        newCycleAlertEnabled: true,
        soundEnabled: true,
      };
    }
    return JSON.parse(raw);
  } catch {
    return {
      pushEnabled: true,
      radarAlertEnabled: true,
      radarThreshold: 90,
      newCycleAlertEnabled: true,
      soundEnabled: true,
    };
  }
}

export function savePushNotificationConfig(config: PushNotificationConfig): void {
  try {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('lotosniper-push-config-updated', { detail: config }));
    }
  } catch (e) {
    console.error('Falha ao salvar configuração push:', e);
  }
}

export function getAlertsHistory(): IntelligentAlert[] {
  try {
    const raw = localStorage.getItem(ALERTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveAlertsHistory(alerts: IntelligentAlert[]): void {
  try {
    localStorage.setItem(ALERTS_KEY, JSON.stringify(alerts.slice(0, 30))); // Keep last 30
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('lotosniper-alerts-updated', { detail: alerts }));
    }
  } catch (e) {
    console.error('Falha ao salvar histórico de alertas:', e);
  }
}

export function getUnreadAlertsCount(): number {
  const list = getAlertsHistory();
  return list.filter((a) => !a.read).length;
}

export function markAllAlertsAsRead(): void {
  const list = getAlertsHistory();
  const updated = list.map((a) => ({ ...a, read: true }));
  saveAlertsHistory(updated);
}

export function clearAlertsHistory(): void {
  saveAlertsHistory([]);
}

/**
 * Request browser push notification permission
 */
export async function requestBrowserPushPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }
  try {
    const perm = await Notification.requestPermission();
    return perm;
  } catch {
    return 'denied';
  }
}

/**
 * Send an OS-level browser push notification if permitted
 */
export function fireBrowserPushNotification(title: string, body: string): void {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission === 'granted') {
    try {
      new Notification(title, {
        body,
        icon: '/favicon.ico',
        tag: 'lotosniper-alert',
      });
    } catch (e) {
      console.warn('Erro ao disparar push notification:', e);
    }
  }
}

/**
 * Checks all conditions and generates intelligent alerts when:
 * 1. Radar de Tendências Quentes detects a dezena with probability/strength > 90%
 * 2. A new cycle is started (concursosNoCiclo === 1 or 15 dezenas sorted)
 */
export function auditAndTriggerIntelligentAlerts(
  latestDraw: LotofacilDraw,
  statsList: DezenaStats[],
  concursosNoCiclo: number,
  radarTopNumbers?: { dezena: number; probabilidade: number; forcaEma: number }[]
): void {
  const config = getPushNotificationConfig();
  const existingAlerts = getAlertsHistory();
  const newAlerts: IntelligentAlert[] = [];

  const now = Date.now();
  const dateStr = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  // 1. Check Radar de Tendências Quentes > 90%
  if (config.radarAlertEnabled && radarTopNumbers && radarTopNumbers.length > 0) {
    const threshold = config.radarThreshold || 90;
    const hotNumbersOver90 = radarTopNumbers.filter((r) => r.probabilidade >= threshold || r.forcaEma >= threshold);

    hotNumbersOver90.forEach((item) => {
      const dezenaPad = item.dezena.toString().padStart(2, '0');
      const alertId = `radar_90_${item.dezena}_${latestDraw.concurso}`;

      // Avoid duplicates for the same draw and number
      const alreadyTriggered = existingAlerts.some((a) => a.id === alertId);
      if (!alreadyTriggered) {
        const title = `🔥 Radar de Tendências: Dezena ${dezenaPad} em ${Math.round(item.probabilidade)}%!`;
        const body = `A Dezena ${dezenaPad} atingiu ${Math.round(item.probabilidade)}% de probabilidade pelo algoritmo EMA para os próximos 5 concursos (Concurso #${latestDraw.concurso}).`;

        newAlerts.push({
          id: alertId,
          timestamp: now,
          dateStr,
          type: 'radar_90',
          title,
          body,
          dezena: item.dezena,
          probabilidade: item.probabilidade,
          concurso: latestDraw.concurso,
          read: false,
        });

        if (config.pushEnabled) {
          fireBrowserPushNotification(title, body);
        }
        if (config.soundEnabled) {
          soundService.playGoldenZoneSuccessChime();
        }
      }
    });
  }

  // 2. Check if a new cycle is started (concursosNoCiclo === 1)
  if (config.newCycleAlertEnabled && concursosNoCiclo === 1) {
    const alertId = `new_cycle_${latestDraw.concurso}`;
    const alreadyTriggered = existingAlerts.some((a) => a.id === alertId);

    if (!alreadyTriggered) {
      const title = `🚀 Início de um Novo Ciclo das 25 Dezenas!`;
      const body = `O Concurso #${latestDraw.concurso} iniciou o 1º sorteio de um novo ciclo. As 10 dezenas ausentes entram com alta propensão estatística para o fechamento.`;

      newAlerts.push({
        id: alertId,
        timestamp: now,
        dateStr,
        type: 'new_cycle',
        title,
        body,
        concurso: latestDraw.concurso,
        read: false,
      });

      if (config.pushEnabled) {
        fireBrowserPushNotification(title, body);
      }
      if (config.soundEnabled) {
        soundService.playOpportunityAlert();
      }
    }
  }

  if (newAlerts.length > 0) {
    saveAlertsHistory([...newAlerts, ...existingAlerts]);
  }
}
