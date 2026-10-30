import { LotofacilDraw, GameTicket } from '../types/lotofacil';
import { getSavedFechamentos, SavedFechamentoPrognostico } from './savedFechamentosStorage';
import { countMatches } from './combinatorics';
import { soundService } from './soundAlert';
import { saveAlertsHistory, getAlertsHistory, IntelligentAlert } from './notificationService';

export interface SavedGamesAuditResult {
  concurso: number;
  dataConcurso: string;
  totalFechamentos: number;
  totalBilhetesAvaliados: number;
  maxHits: number;
  bestTicketNumbers: number[];
  bestFechamentoTitle: string;
  totalWinningTickets: number;
  hits15: number;
  hits14: number;
  hits13: number;
  hits12: number;
  hits11: number;
  premioEstimadoTotal: number;
  notificationDispatched: boolean;
  timestamp: number;
}

const STORAGE_LAST_AUDITED_CONCURSO = 'lotosniper_last_audited_concurso';
const STORAGE_PUSH_ENABLED = 'lotosniper_push_saved_games_enabled';

/**
 * Checks if Notification API is supported by the browser
 */
export function isPushNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

/**
 * Gets current notification permission
 */
export function getPushPermission(): NotificationPermission {
  if (!isPushNotificationSupported()) return 'denied';
  return Notification.permission;
}

/**
 * Requests native browser permission for Service Worker push notifications
 */
export async function requestPushPermission(): Promise<NotificationPermission> {
  if (!isPushNotificationSupported()) return 'denied';
  try {
    const permission = await Notification.requestPermission();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('lotosniper-push-perm-changed', { detail: permission })
      );
    }
    return permission;
  } catch (e) {
    console.warn('Falha ao solicitar permissão de push:', e);
    return 'denied';
  }
}

/**
 * Checks if automatic push notification is enabled by user preference
 */
export function isPushEnabledByUser(): boolean {
  try {
    const saved = localStorage.getItem(STORAGE_PUSH_ENABLED);
    return saved !== 'false'; // Enabled by default
  } catch {
    return true;
  }
}

/**
 * Toggles user preference for push notifications
 */
export function setPushEnabledByUser(enabled: boolean): void {
  try {
    localStorage.setItem(STORAGE_PUSH_ENABLED, enabled ? 'true' : 'false');
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('lotosniper-push-config-changed', { detail: enabled })
      );
    }
  } catch {}
}

/**
 * Audits all saved games (fechamentos prognósticos & saved tickets) against a newly synchronized draw
 * and dispatches a rich Service Worker Push Notification, even if the browser is in the background.
 */
export async function auditAndNotifySavedGames(
  draw: LotofacilDraw,
  isManualTest: boolean = false
): Promise<SavedGamesAuditResult | null> {
  if (!draw || !draw.dezenas || draw.dezenas.length !== 15) {
    return null;
  }

  // Prevent duplicate notification for the same contest unless manually tested
  if (!isManualTest) {
    try {
      const lastAudited = localStorage.getItem(STORAGE_LAST_AUDITED_CONCURSO);
      if (lastAudited && parseInt(lastAudited, 10) === draw.concurso) {
        return null;
      }
    } catch {}
  }

  // 1. Gather all saved games
  const savedFechamentos = getSavedFechamentos();
  let individualTickets: GameTicket[] = [];
  try {
    const rawTickets = localStorage.getItem('lotosniper_saved_tickets');
    if (rawTickets) {
      individualTickets = JSON.parse(rawTickets);
    }
  } catch {}

  const allTicketsToCheck: { ticket: GameTicket; sourceTitle: string }[] = [];

  savedFechamentos.forEach((f) => {
    (f.tickets || []).forEach((t) => {
      allTicketsToCheck.push({
        ticket: t,
        sourceTitle: f.tipoFechamento || f.modalidadeMatriz || 'Fechamento Salvo',
      });
    });
  });

  individualTickets.forEach((t) => {
    // Avoid exact duplicate checks if already present in fechamentos
    allTicketsToCheck.push({
      ticket: t,
      sourceTitle: 'Meus Jogos & Conferidor',
    });
  });

  if (allTicketsToCheck.length === 0 && !isManualTest) {
    return null;
  }

  // 2. Perform Mathematical Audit against the drawn numbers
  let maxHits = 0;
  let bestTicketNumbers: number[] = [];
  let bestFechamentoTitle = 'Fechamento Salvo';
  let hits15 = 0;
  let hits14 = 0;
  let hits13 = 0;
  let hits12 = 0;
  let hits11 = 0;
  let premioEstimadoTotal = 0;

  const P11 = draw.premiacoes?.faixa11?.valor || 7.0;
  const P12 = draw.premiacoes?.faixa12?.valor || 14.0;
  const P13 = draw.premiacoes?.faixa13?.valor || 35.0;
  const P14 = draw.premiacoes?.faixa14?.valor || 1500.0;
  const P15 = draw.premiacoes?.faixa15?.valor || 1800000.0;

  allTicketsToCheck.forEach(({ ticket, sourceTitle }) => {
    const hits = countMatches(ticket.dezenas, draw.dezenas);
    if (hits > maxHits) {
      maxHits = hits;
      bestTicketNumbers = ticket.dezenas;
      bestFechamentoTitle = sourceTitle;
    }

    if (hits === 15) {
      hits15++;
      premioEstimadoTotal += P15;
    } else if (hits === 14) {
      hits14++;
      premioEstimadoTotal += P14;
    } else if (hits === 13) {
      hits13++;
      premioEstimadoTotal += P13;
    } else if (hits === 12) {
      hits12++;
      premioEstimadoTotal += P12;
    } else if (hits === 11) {
      hits11++;
      premioEstimadoTotal += P11;
    }
  });

  const totalWinningTickets = hits15 + hits14 + hits13 + hits12 + hits11;

  // 3. Mark contest as audited
  try {
    localStorage.setItem(STORAGE_LAST_AUDITED_CONCURSO, draw.concurso.toString());
  } catch {}

  // 4. Play auditory celebration if appropriate
  try {
    if (maxHits >= 15) {
      soundService.play15PontosJackpotSound();
    } else if (maxHits >= 14) {
      soundService.play14PontosCelebrationSound();
    } else if (totalWinningTickets > 0) {
      soundService.playGoldenZoneSuccessChime();
    }
  } catch {}

  // 5. Construct High-Impact Push Title and Body
  let title = '';
  let body = '';

  if (maxHits >= 15) {
    title = `🔥 15 PONTOS NA LOTOFÁCIL! Concurso #${draw.concurso}`;
    body = `PARABÉNS! Seu jogo salvo cravou 15 ACERTOS! Prêmio máximo apurado. Toque para abrir seus bilhetes!`;
  } else if (maxHits === 14) {
    title = `⚡ 14 PONTOS CONFIRMADOS! Concurso #${draw.concurso}`;
    body = `Sensacional! Seu fechamento "${bestFechamentoTitle}" acertou 14 pontos! Total de ${totalWinningTickets} bilhetes premiados.`;
  } else if (maxHits === 13) {
    title = `⭐ PREMIAÇÃO: 13 ACERTOS no Concurso #${draw.concurso}`;
    body = `Excelente resultado: ${totalWinningTickets} bilhetes premiados nos seus jogos salvos! Toque para conferir o espelho.`;
  } else if (totalWinningTickets > 0) {
    title = `🎉 Lotofácil #${draw.concurso}: ${totalWinningTickets} Bilhetes Premiados!`;
    const resumo = [
      hits13 > 0 ? `${hits13}x 13 pts` : '',
      hits12 > 0 ? `${hits12}x 12 pts` : '',
      hits11 > 0 ? `${hits11}x 11 pts` : '',
    ].filter(Boolean).join(' • ');
    body = `${bestFechamentoTitle}: Melhor bilhete com ${maxHits} acertos. ${resumo}. Toque para auditar.`;
  } else {
    title = `🎯 Lotofácil Concurso #${draw.concurso} Apurado`;
    body = `Concurso #${draw.concurso} sincronizado: ${allTicketsToCheck.length} bilhetes salvos conferidos (Melhor jogo: ${maxHits} acertos).`;
  }

  // 6. Record in In-App Notification Center
  try {
    const existing = getAlertsHistory();
    const newAlert: IntelligentAlert = {
      id: `audit_result_${draw.concurso}_${Date.now()}`,
      timestamp: Date.now(),
      dateStr: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      type: 'system',
      title,
      body,
      concurso: draw.concurso,
      read: false,
    };
    saveAlertsHistory([newAlert, ...existing]);
  } catch {}

  // 7. Dispatch Service Worker Push Notification (Works in Background & Minimized Tabs)
  let notificationDispatched = false;

  if (isPushNotificationSupported() && Notification.permission === 'granted' && isPushEnabledByUser()) {
    const notificationOptions: NotificationOptions & {
      renotify?: boolean;
      vibrate?: number[];
      actions?: { action: string; title: string }[];
    } = {
      body,
      icon: '/favicon.svg',
      badge: '/favicon.svg',
      tag: `lotosniper-saved-result-${draw.concurso}`,
      renotify: true,
      requireInteraction: maxHits >= 13,
      vibrate: [300, 100, 300, 100, 300],
      data: {
        url: '/#jogos',
        concurso: draw.concurso,
        maxHits,
        totalWinningTickets,
        action: 'view_saved_games_result',
      },
      actions: [
        { action: 'conferir', title: '🎯 Conferir Jogos Salvos' },
        { action: 'fechar', title: 'Dispensar' },
      ],
    };

    try {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        if (registration && 'showNotification' in registration) {
          await registration.showNotification(title, notificationOptions);
          notificationDispatched = true;
        }
      }

      if (!notificationDispatched) {
        // Fallback: standard Window Notification
        const notif = new Notification(title, notificationOptions);
        notif.onclick = () => {
          window.focus();
          window.dispatchEvent(
            new CustomEvent('switch-tab', { detail: { tab: 'jogos', section: 'fechamentos_salvos' } })
          );
          notif.close();
        };
        notificationDispatched = true;
      }
    } catch (err) {
      console.warn('Erro ao disparar notificação push via Service Worker:', err);
    }
  }

  const result: SavedGamesAuditResult = {
    concurso: draw.concurso,
    dataConcurso: draw.data,
    totalFechamentos: savedFechamentos.length,
    totalBilhetesAvaliados: allTicketsToCheck.length,
    maxHits,
    bestTicketNumbers,
    bestFechamentoTitle,
    totalWinningTickets,
    hits15,
    hits14,
    hits13,
    hits12,
    hits11,
    premioEstimadoTotal,
    notificationDispatched,
    timestamp: Date.now(),
  };

  // Dispatch custom in-app event so UI components can display toast or banner
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('lotosniper-saved-games-audited', { detail: result })
    );
  }

  return result;
}
