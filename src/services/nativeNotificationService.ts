import { soundService } from './soundAlert';
import { saveAlertsHistory, getAlertsHistory, IntelligentAlert } from './notificationService';
import { LotofacilDraw } from '../types/lotofacil';
import { getHistorical100Draws } from './historical100Draws';

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

export interface Top5TrendNotificationPayload {
  dezena: number;
  marco: 'atraso_zero' | 'repeticao_consecutiva';
  concurso: number;
  repeticoes?: number;
  frequencia20?: number;
}

/**
 * Sends a Service Worker / native browser notification when a Top 5 trend number
 * hits a milestone ('atraso zero' or 'repeticao consecutiva').
 */
export async function sendNativeTop5TrendNotification(payload: Top5TrendNotificationPayload): Promise<boolean> {
  const { dezena, marco, concurso, repeticoes = 2, frequencia20 = 15 } = payload;
  const numStr = dezena.toString().padStart(2, '0');

  // 1. Play auditory chime
  try {
    soundService.playGoldenZoneSuccessChime();
  } catch {}

  // 2. Prepare Title and Body
  const isConsecutive = marco === 'repeticao_consecutiva';
  const title = isConsecutive
    ? `🔥 Top 5 de Tendência: Dezena ${numStr} em Repetição Consecutiva!`
    : `⚡ Top 5 de Tendência: Dezena ${numStr} Atinge Atraso Zero!`;

  const body = isConsecutive
    ? `A Dezena ${numStr} (Top 5 dos últimos 20 concursos com ${frequencia20} aparições) foi sorteada no Concurso #${concurso} pelo ${repeticoes}º sorteio seguido!`
    : `A Dezena ${numStr} (uma das 5 mais sorteadas nos últimos 20 concursos) foi sorteada no Concurso #${concurso}, alcançando Atraso Zero no volante.`;

  // 3. Register in in-app alerts history
  try {
    const existing = getAlertsHistory();
    const alertId = `top5_trend_${concurso}_${dezena}_${marco}_${Date.now()}`;
    const newAlert: IntelligentAlert = {
      id: alertId,
      timestamp: Date.now(),
      dateStr: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      type: 'system',
      title,
      body,
      concurso,
      read: false,
    };
    saveAlertsHistory([newAlert, ...existing]);
  } catch {}

  // 4. Native Browser Notification (Foreground & Background Tab Support via Service Worker)
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
    tag: `lotosniper-top5-${dezena}-${concurso}-${marco}`,
    renotify: true,
    data: {
      url: '/#estatisticas',
      tab: 'estatisticas',
      dezena,
      marco,
      concurso,
      type: 'NOTIFICATION_TOP5_TREND_CLICKED',
    },
  };

  try {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      if (registration && 'showNotification' in registration) {
        await registration.showNotification(title, notificationOptions);
        return true;
      }
    }

    const notif = new Notification(title, notificationOptions);
    notif.onclick = () => {
      window.focus();
      window.dispatchEvent(new CustomEvent('switch-tab', { detail: 'estatisticas' }));
      notif.close();
    };
    return true;
  } catch (e) {
    console.warn('Erro ao disparar notificação Top 5 de tendência:', e);
    return false;
  }
}

/**
 * Passive auditor called upon new draw sync to check if any of the Top 5 numbers
 * hit "atraso zero" or "repeticao consecutiva", dispatching push notifications.
 */
export async function auditAndNotifyTop5Trends(latestDraw: LotofacilDraw): Promise<boolean> {
  try {
    const isEnabled = localStorage.getItem('lotosniper_push_top5_trends_enabled') === 'true';
    if (!isEnabled) return false;

    // Deduplication check
    const dedupeKey = `lotosniper_top5_audit_${latestDraw.concurso}`;
    if (sessionStorage.getItem(dedupeKey)) return false;

    const historical = getHistorical100Draws(latestDraw);
    const last20 = historical.slice(0, 20);
    const previousDraw = historical[1];

    const counts: { [num: number]: number } = {};
    for (let i = 1; i <= 25; i++) counts[i] = 0;
    last20.forEach((d) => d.dezenas.forEach((n) => counts[n]++));

    const sortedTop5 = Object.keys(counts)
      .map((k) => ({ num: parseInt(k, 10), freq: counts[parseInt(k, 10)] }))
      .sort((a, b) => b.freq - a.freq || a.num - b.num)
      .slice(0, 5);

    const allowAtrasoZero = localStorage.getItem('lotosniper_push_top5_atraso_zero') !== 'false';
    const allowRepeticao = localStorage.getItem('lotosniper_push_top5_repeticao') !== 'false';

    let anySent = false;
    for (const item of sortedTop5) {
      const drawnInLatest = latestDraw.dezenas.includes(item.num);
      if (!drawnInLatest) continue;

      const drawnInPrev = previousDraw ? previousDraw.dezenas.includes(item.num) : false;

      if (drawnInPrev && allowRepeticao) {
        await sendNativeTop5TrendNotification({
          dezena: item.num,
          marco: 'repeticao_consecutiva',
          concurso: latestDraw.concurso,
          repeticoes: 2,
          frequencia20: item.freq,
        });
        anySent = true;
      } else if (allowAtrasoZero) {
        await sendNativeTop5TrendNotification({
          dezena: item.num,
          marco: 'atraso_zero',
          concurso: latestDraw.concurso,
          frequencia20: item.freq,
        });
        anySent = true;
      }
    }

    if (anySent) {
      sessionStorage.setItem(dedupeKey, 'true');
    }
    return anySent;
  } catch (err) {
    console.warn('Erro ao auditar Top 5 de tendências:', err);
    return false;
  }
}


