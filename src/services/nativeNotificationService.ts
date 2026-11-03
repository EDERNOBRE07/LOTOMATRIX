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

export interface PrizeNotificationTiersConfig {
  hits11: boolean;
  hits12: boolean;
  hits13: boolean;
  hits14: boolean;
  hits15: boolean;
}

export const DEFAULT_PRIZE_NOTIFICATION_TIERS: PrizeNotificationTiersConfig = {
  hits11: false, // 11 acertos (desativado por padrão para poupar notificações)
  hits12: false, // 12 acertos
  hits13: true,  // 13 acertos (ativo por padrão)
  hits14: true,  // 14 acertos (ativo por padrão)
  hits15: true,  // 15 acertos (ativo por padrão)
};

export const PRIZE_TIERS_STORAGE_KEY = 'lotosniper_prize_notification_tiers';

/**
 * Retrieves the user-configured prize notification tiers from localStorage
 */
export function getPrizeNotificationTiers(): PrizeNotificationTiersConfig {
  try {
    const raw = localStorage.getItem(PRIZE_TIERS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        hits11: Boolean(parsed.hits11),
        hits12: Boolean(parsed.hits12),
        hits13: parsed.hits13 !== undefined ? Boolean(parsed.hits13) : true,
        hits14: parsed.hits14 !== undefined ? Boolean(parsed.hits14) : true,
        hits15: parsed.hits15 !== undefined ? Boolean(parsed.hits15) : true,
      };
    }
  } catch {}
  return { ...DEFAULT_PRIZE_NOTIFICATION_TIERS };
}

/**
 * Persists the prize notification tiers config
 */
export function savePrizeNotificationTiers(config: PrizeNotificationTiersConfig): void {
  try {
    localStorage.setItem(PRIZE_TIERS_STORAGE_KEY, JSON.stringify(config));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('lotosniper-prize-tiers-changed', { detail: config })
      );
    }
  } catch {}
}

/**
 * Checks if notifications for a specific number of hits (11-15) are enabled
 */
export function isPrizeTierEnabled(hits: number): boolean {
  const tiers = getPrizeNotificationTiers();
  if (hits >= 15) return tiers.hits15;
  if (hits === 14) return tiers.hits14;
  if (hits === 13) return tiers.hits13;
  if (hits === 12) return tiers.hits12;
  if (hits === 11) return tiers.hits11;
  return false;
}

/**
 * Sends a native browser notification for 11, 12, 13, 14, or 15 hits,
 * respecting the individually configured notification tiers.
 * Designed to work reliably even when the browser tab is in background or minimized,
 * utilizing the Service Worker registration when available.
 */
export async function sendNativeJackpotNotification(payload: NativeJackpotPayload): Promise<boolean> {
  const { concurso, maxHits, winningTicketsCount, bestTicketIndex } = payload;
  
  // Verify if this specific tier is activated in user preferences
  if (!isPrizeTierEnabled(maxHits)) {
    return false;
  }

  // 1. Play auditory celebration based on hit tier
  try {
    if (maxHits >= 15) {
      soundService.play15PontosJackpotSound();
    } else if (maxHits >= 14) {
      soundService.play14PontosCelebrationSound();
    } else if (maxHits >= 13) {
      soundService.playGoldenZoneSuccessChime();
    } else {
      soundService.playSuccess();
    }
  } catch {}

  // 2. Prepare Title and Badge by tier
  let title = '';
  let badgeText = '';
  if (maxHits >= 15) {
    title = `🎉 GRAND JACKPOT: 15 PONTOS NA LOTOFÁCIL!`;
    badgeText = 'PRÊMIO MÁXIMO';
  } else if (maxHits >= 14) {
    title = `💎 14 PONTOS CRAVADOS NO CONCURSO #${concurso}!`;
    badgeText = 'FAIXA DE ELITE';
  } else if (maxHits === 13) {
    title = `⭐ PREMIAÇÃO: 13 PONTOS NO CONCURSO #${concurso}!`;
    badgeText = 'LUCRO GARANTIDO';
  } else if (maxHits === 12) {
    title = `✨ PREMIAÇÃO: 12 PONTOS NO CONCURSO #${concurso}!`;
    badgeText = 'PREMIAÇÃO FIXA';
  } else if (maxHits === 11) {
    title = `🎯 PREMIAÇÃO MÍNIMA: 11 PONTOS NO CONCURSO #${concurso}!`;
    badgeText = 'FAIXA 11 ACERTOS';
  } else {
    return false;
  }

  const pluralJogos = winningTicketsCount > 1 ? ` (${winningTicketsCount} jogos premiados com ${maxHits} acertos)` : '';
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
    tag: `lotosniper-jackpot-${concurso}-${maxHits}`,
    renotify: true,
    requireInteraction: maxHits >= 13, // Keeps notification visible for 13+
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

/**
 * Triggers an instant interactive test for a specific prize tier (11, 12, 13, 14 or 15 hits).
 * Bypasses the enable check temporarily so the user can preview the alert before toggling.
 */
export async function testNativePrizeNotification(hits: 11 | 12 | 13 | 14 | 15, concursoNum: number = 3340): Promise<boolean> {
  // 1. Play sound
  try {
    if (hits >= 15) soundService.play15PontosJackpotSound();
    else if (hits >= 14) soundService.play14PontosCelebrationSound();
    else if (hits === 13) soundService.playGoldenZoneSuccessChime();
    else soundService.playSuccess();
  } catch {}

  if (!isNotificationSupported()) return false;

  let permission = Notification.permission;
  if (permission !== 'granted') {
    permission = await requestNativeNotificationPermission();
    if (permission !== 'granted') return false;
  }

  const titles: Record<number, { title: string; badge: string; desc: string }> = {
    15: {
      title: '🎉 TESTE: GRAND JACKPOT 15 PONTOS!',
      badge: 'PRÊMIO MÁXIMO',
      desc: 'Simulação do disparo de 15 Pontos no Concurso Caixa #3340.',
    },
    14: {
      title: '💎 TESTE: 14 PONTOS CRAVADOS!',
      badge: 'FAIXA DE ELITE',
      desc: 'Simulação do disparo de 14 Pontos no Concurso Caixa #3340.',
    },
    13: {
      title: '⭐ TESTE: PREMIAÇÃO 13 PONTOS!',
      badge: 'LUCRO GARANTIDO',
      desc: 'Simulação do disparo de 13 Pontos no Concurso Caixa #3340.',
    },
    12: {
      title: '✨ TESTE: PREMIAÇÃO 12 PONTOS!',
      badge: 'PREMIAÇÃO FIXA',
      desc: 'Simulação do disparo de 12 Pontos (R$ 12,00) no Concurso Caixa #3340.',
    },
    11: {
      title: '🎯 TESTE: PREMIAÇÃO 11 PONTOS!',
      badge: 'FAIXA 11 ACERTOS',
      desc: 'Simulação do disparo de 11 Pontos (R$ 6,00) no Concurso Caixa #3340.',
    },
  };

  const meta = titles[hits];
  const body = `[TESTE DE NOTIFICAÇÃO] ${meta.desc} Faixa: ${meta.badge}. Notificações ativas!`;

  const notificationOptions: any = {
    body,
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    tag: `lotosniper-test-${hits}-${Date.now()}`,
    renotify: true,
    data: { url: '/#configuracoes', testHit: hits },
  };

  try {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      if (registration && 'showNotification' in registration) {
        await registration.showNotification(meta.title, notificationOptions);
        return true;
      }
    }
    new Notification(meta.title, notificationOptions);
    return true;
  } catch (err) {
    console.warn('Erro ao testar notificação de faixa:', err);
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

export interface NativeCycleAlertPayload {
  ausentesCount: number;
  dezenasAusentes: number[];
  concurso: number;
  concursosNoCiclo: number;
  threshold: number;
  playAudio?: boolean;
}

/**
 * Sends a native browser push notification when the cycle approaches closure
 * (i.e. number of missing cycle numbers <= threshold, default 3).
 */
export async function sendNativeCycleAlertNotification(
  payload: NativeCycleAlertPayload
): Promise<boolean> {
  const { ausentesCount, dezenasAusentes, concurso, concursosNoCiclo, threshold, playAudio = true } = payload;

  // 1. Play auditory alarm
  if (playAudio) {
    try {
      soundService.playCycleAlertSound();
    } catch {}
  }

  // 2. Prepare title and body
  const dezenasStr = dezenasAusentes.map((n) => n.toString().padStart(2, '0')).join(', ');
  const title = `⚡ Reta Final do Ciclo (#${concurso}) • ${ausentesCount} Dezenas Ausentes`;
  const body = `Restam apenas ${ausentesCount} dezenas ausentes [${dezenasStr}] para completar as 25 no ${concursosNoCiclo}º concurso deste ciclo! Limite configurado: ≤ ${threshold}. Toque para abrir matrizes.`;

  // 3. Register in in-app alerts history
  try {
    const existing = getAlertsHistory();
    const alertId = `cycle_${concurso}_${ausentesCount}_${Date.now()}`;
    const newAlert: IntelligentAlert = {
      id: alertId,
      timestamp: Date.now(),
      dateStr: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      type: 'cycle_closed',
      title: `⚡ Reta Final do Ciclo: ${ausentesCount} Ausentes [≤ ${threshold}]`,
      body,
      concurso,
      read: false,
    };
    saveAlertsHistory([newAlert, ...existing]);
  } catch {}

  // 4. Browser Notification
  if (!isNotificationSupported() || Notification.permission !== 'granted') {
    return false;
  }

  try {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      if (registration && registration.showNotification) {
        const notifOptions: any = {
          body,
          icon: '/favicon.svg',
          badge: '/favicon.svg',
          tag: `lotosniper-cycle-alert-${concurso}`,
          renotify: true,
          requireInteraction: false,
          data: {
            url: '/#fechamento',
            concurso,
            ausentesCount,
          },
        };
        await registration.showNotification(title, notifOptions);
        return true;
      }
    }

    new Notification(title, {
      body,
      icon: '/favicon.svg',
      badge: '/favicon.svg',
      tag: `lotosniper-cycle-alert-${concurso}`,
    });
    return true;
  } catch (err) {
    console.warn('Erro ao disparar notificação push de ciclo:', err);
    return false;
  }
}



