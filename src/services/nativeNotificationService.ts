import { soundService } from './soundAlert';
import { saveAlertsHistory, getAlertsHistory, IntelligentAlert } from './notificationService';

export interface NativeJackpotPayload {
  concurso: number;
  maxHits: number;
  winningTicketsCount: number;
  bestTicketIndex: number;
  dataSorteio?: string;
}

/**
 * Checks if the browser supports Notification API
 */
export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

/**
 * Gets current notification permission
 */
export function getNotificationPermission(): NotificationPermission {
  if (!isNotificationSupported()) return 'denied';
  return Notification.permission;
}

/**
 * Prompts user for browser notification permission
 */
export async function requestNativeNotificationPermission(): Promise<NotificationPermission> {
  if (!isNotificationSupported()) return 'denied';
  try {
    const permission = await Notification.requestPermission();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('lotosniper-notification-perm-changed', { detail: permission })
      );
    }
    return permission;
  } catch (e) {
    console.warn('Falha ao solicitar permissão de notificações:', e);
    return 'denied';
  }
}

/**
 * Sends a native browser notification for 13, 14, or 15 hits.
 * Designed to work reliably even when the browser tab is in background or minimized,
 * utilizing the Service Worker registration when available.
 */
export async function sendNativeJackpotNotification(payload: NativeJackpotPayload): Promise<boolean> {
  const { concurso, maxHits, winningTicketsCount, bestTicketIndex } = payload;
  if (maxHits < 13) return false;

  // 1. Play auditory celebration
  try {
    if (maxHits >= 15) {
      soundService.play15PontosJackpotSound();
    } else if (maxHits >= 14) {
      soundService.play14PontosCelebrationSound();
    } else {
      soundService.playGoldenZoneSuccessChime();
    }
  } catch {}

  // 2. Prepare Title and Body
  let title = '';
  let badgeText = '';
  if (maxHits >= 15) {
    title = `🎉 GRAND JACKPOT: 15 PONTOS NA LOTOFÁCIL!`;
    badgeText = 'PRÊMIO MÁXIMO';
  } else if (maxHits >= 14) {
    title = `💎 14 PONTOS CRAVADOS NO CONCURSO #${concurso}!`;
    badgeText = 'FAIXA DE ELITE';
  } else {
    title = `⭐ PREMIAÇÃO: 13 PONTOS NO CONCURSO #${concurso}!`;
    badgeText = 'LUCRO GARANTIDO';
  }

  const pluralJogos = winningTicketsCount > 1 ? ` (${winningTicketsCount} jogos premiados com 13+ pontos)` : '';
  const body = `Seu Jogo #${bestTicketIndex} em 'Meus Jogos' cravou ${maxHits} acertos no Concurso Caixa #${concurso}!${pluralJogos} Toque para auditar a premiação.`;

  // 3. Register in in-app alerts history
  try {
    const existing = getAlertsHistory();
    const alertId = `jackpot_${concurso}_${maxHits}_${Date.now()}`;
    const newAlert: IntelligentAlert = {
      id: alertId,
      timestamp: Date.now(),
      dateStr: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      type: 'system',
      title: `${title} [${badgeText}]`,
      body,
      concurso,
      read: false,
    };
    saveAlertsHistory([newAlert, ...existing]);
  } catch {}

  // 4. Native Browser Notification (Foreground & Background Tab Support)
  if (!isNotificationSupported() || Notification.permission !== 'granted') {
    return false;
  }

  const notificationOptions: NotificationOptions & {
    renotify?: boolean;
    vibrate?: number[];
  } = {
    body,
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    tag: `lotosniper-jackpot-${concurso}`,
    renotify: true,
    requireInteraction: true, // Keeps notification visible until user interacts with it
    data: {
      url: '/#jogos',
      concurso,
      maxHits,
      action: 'view_games',
    },
  };

  try {
    // Prefer ServiceWorker registration so notification renders even with inactive background tab
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      if (registration && 'showNotification' in registration) {
        await registration.showNotification(title, notificationOptions);
        return true;
      }
    }

    // Fallback: window Notification
    const notif = new Notification(title, notificationOptions);
    notif.onclick = () => {
      window.focus();
      window.dispatchEvent(new CustomEvent('switch-tab', { detail: 'jogos' }));
      notif.close();
    };
    return true;
  } catch (e) {
    console.warn('Erro ao exibir notificação nativa:', e);
    return false;
  }
}
