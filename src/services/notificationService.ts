import { LotofacilDraw, DezenaStats } from '../types/lotofacil';
import { soundService } from './soundAlert';
import { RECENT_DRAWS } from '../data/lotofacilData';

export interface IntelligentAlert {
  id: string;
  timestamp: number;
  dateStr: string;
  type: 'radar_90' | 'new_cycle' | 'cycle_closed' | 'system' | 'hibrido';
  title: string;
  body: string;
  dezena?: number;
  probabilidade?: number;
  concurso?: number;
  read: boolean;
  dezenasGatilho?: number[];
  regraNome?: string;
}

export interface HybridAlertRule {
  id: string;
  nome: string;
  ativa: boolean;
  operador: 'E' | 'OU'; // AND ou OR entre Radar e Atraso Crítico
  
  // Condição Radar de Tendências Quentes
  radarAtivo: boolean;
  radarCriterio: 'forca_minima' | 'probabilidade_minima' | 'top3';
  radarValor: number; // ex: 80%
  
  // Condição Atrasos Críticos
  atrasoAtivo: boolean;
  atrasoCriterio: 'atraso_minimo' | 'atraso_maior_medio' | 'pendente_ciclo';
  atrasoValor: number; // ex: 2 ou 3 concursos
  
  // Conjunto de Dezenas Definido pelo Usuário
  dezenasMonitoradas: number[]; // Dezenas selecionadas pelo usuário (1 a 25)
  
  criadoEm: number;
  ultimoDisparo?: number;
}

export interface PushNotificationConfig {
  pushEnabled: boolean;
  radarAlertEnabled: boolean;
  radarThreshold: number; // default: 90%
  newCycleAlertEnabled: boolean;
  soundEnabled: boolean;
}

const HYBRID_RULES_KEY = 'lotosniper_hybrid_alert_rules';

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
 * Computes EMA Trend metrics for all 25 numbers over the recent draws
 */
export function computeEmaTrends(
  latestDraw: LotofacilDraw,
  draws: LotofacilDraw[] = RECENT_DRAWS,
  periodoEMA: number = 7
): { dezena: number; probabilidade: number; forcaEma: number }[] {
  const list = [latestDraw];
  draws.forEach((d) => {
    if (!list.some((existing) => existing.concurso === d.concurso)) {
      list.push(d);
    }
  });
  const chronological = list.slice(0, 30).reverse();
  const alphaFast = 2 / (periodoEMA + 1);
  const alphaSlow = 2 / (periodoEMA * 2 + 1);

  const results: { dezena: number; probabilidade: number; forcaEma: number }[] = [];
  for (let num = 1; num <= 25; num++) {
    let emaFast = 0.6;
    let emaSlow = 0.6;
    let countLast5 = 0;

    chronological.forEach((draw, idx) => {
      const isPresent = draw.dezenas.includes(num) ? 1 : 0;
      emaFast = alphaFast * isPresent + (1 - alphaFast) * emaFast;
      emaSlow = alphaSlow * isPresent + (1 - alphaSlow) * emaSlow;
      if (idx >= chronological.length - 5 && isPresent) {
        countLast5++;
      }
    });

    const momentumDelta = Number((emaFast - emaSlow).toFixed(3));
    const atraso = latestDraw.dezenas.includes(num) ? 0 : 1;
    let forcaRaw = emaFast * 65 + momentumDelta * 80 + (countLast5 / 5) * 20;
    if (atraso === 0) forcaRaw += 6;
    else if (atraso === 1) forcaRaw += 4;
    else if (atraso >= 4) forcaRaw -= atraso * 2.5;

    const medidorForca = Math.min(99, Math.max(12, Math.round(forcaRaw)));
    const probabilidadeProximos5 = Math.min(98, Math.max(30, Math.round(medidorForca * 0.92 + 6)));
    results.push({
      dezena: num,
      probabilidade: probabilidadeProximos5,
      forcaEma: medidorForca,
    });
  }
  return results.sort((a, b) => b.probabilidade - a.probabilidade);
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
  const radarData = radarTopNumbers || computeEmaTrends(latestDraw, RECENT_DRAWS);
  if (config.radarAlertEnabled && radarData && radarData.length > 0) {
    const threshold = config.radarThreshold || 90;
    const hotNumbersOver90 = radarData.filter((r) => r.probabilidade >= threshold || r.forcaEma >= threshold);

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

export const DEFAULT_HYBRID_RULES: HybridAlertRule[] = [
  {
    id: 'regra-ciclo-retorno',
    nome: 'Retorno Iminente no Ciclo (17 & 22)',
    ativa: true,
    operador: 'E',
    radarAtivo: true,
    radarCriterio: 'forca_minima',
    radarValor: 60,
    atrasoAtivo: true,
    atrasoCriterio: 'pendente_ciclo',
    atrasoValor: 1,
    dezenasMonitoradas: [17, 22],
    criadoEm: Date.now() - 3600000,
  },
  {
    id: 'regra-pares-ouro-momentum',
    nome: 'Pares de Ouro em Momentum Quente',
    ativa: true,
    operador: 'OU',
    radarAtivo: true,
    radarCriterio: 'top3',
    radarValor: 3,
    atrasoAtivo: true,
    atrasoCriterio: 'atraso_minimo',
    atrasoValor: 2,
    dezenasMonitoradas: [11, 20, 1, 3],
    criadoEm: Date.now() - 7200000,
  },
  {
    id: 'regra-atraso-critico-radar-alto',
    nome: 'Atraso Crítico Alto com Força Radar ≥ 75%',
    ativa: true,
    operador: 'E',
    radarAtivo: true,
    radarCriterio: 'forca_minima',
    radarValor: 75,
    atrasoAtivo: true,
    atrasoCriterio: 'atraso_minimo',
    atrasoValor: 2,
    dezenasMonitoradas: [2, 4, 6, 8, 14, 17, 22],
    criadoEm: Date.now() - 10800000,
  },
];

export function getHybridAlertRules(): HybridAlertRule[] {
  try {
    const raw = localStorage.getItem(HYBRID_RULES_KEY);
    if (!raw) {
      saveHybridAlertRules(DEFAULT_HYBRID_RULES);
      return DEFAULT_HYBRID_RULES;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_HYBRID_RULES;
  } catch {
    return DEFAULT_HYBRID_RULES;
  }
}

export function saveHybridAlertRules(rules: HybridAlertRule[]): void {
  try {
    localStorage.setItem(HYBRID_RULES_KEY, JSON.stringify(rules));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('lotosniper-hybrid-rules-updated', { detail: rules }));
    }
  } catch (e) {
    console.error('Falha ao salvar regras híbridas:', e);
  }
}

export interface HybridEvaluationResult {
  ruleId: string;
  ruleName: string;
  matched: boolean;
  dezenasGatilho: number[];
  detalhes: string[];
}

export function evaluateHybridRule(
  rule: HybridAlertRule,
  latestDraw: LotofacilDraw,
  statsList: DezenaStats[] = [],
  cicloAusentes: number[] = [17, 22],
  radarData?: { dezena: number; probabilidade: number; forcaEma: number }[]
): HybridEvaluationResult {
  const radarMetrics = radarData || computeEmaTrends(latestDraw, RECENT_DRAWS);
  const radarMap = new Map<number, { probabilidade: number; forcaEma: number }>();
  radarMetrics.forEach((m) => radarMap.set(m.dezena, m));

  const statsMap = new Map<number, DezenaStats>();
  statsList.forEach((s) => statsMap.set(s.numero, s));

  // Determine which dezenas are evaluated
  const dezenasToTest = rule.dezenasMonitoradas && rule.dezenasMonitoradas.length > 0
    ? rule.dezenasMonitoradas
    : Array.from({ length: 25 }, (_, i) => i + 1);

  const radarTop3Set = new Set(radarMetrics.slice(0, 3).map((r) => r.dezena));

  const dezenasGatilho: number[] = [];
  const detalhes: string[] = [];

  dezenasToTest.forEach((num) => {
    const radar = radarMap.get(num) || { probabilidade: 50, forcaEma: 50 };
    const stat = statsMap.get(num);
    const atrasoAtual = stat ? stat.atrasoAtual : (latestDraw.dezenas.includes(num) ? 0 : 1);
    const mediaAtraso = stat ? stat.atrasoMedio : 1.6;

    // Evaluate Radar Condition
    let radarPass = false;
    if (!rule.radarAtivo) {
      radarPass = true;
    } else {
      if (rule.radarCriterio === 'forca_minima') {
        radarPass = radar.forcaEma >= rule.radarValor;
      } else if (rule.radarCriterio === 'probabilidade_minima') {
        radarPass = radar.probabilidade >= rule.radarValor;
      } else if (rule.radarCriterio === 'top3') {
        radarPass = radarTop3Set.has(num);
      }
    }

    // Evaluate Atraso Condition
    let atrasoPass = false;
    if (!rule.atrasoAtivo) {
      atrasoPass = true;
    } else {
      if (rule.atrasoCriterio === 'atraso_minimo') {
        atrasoPass = atrasoAtual >= rule.atrasoValor;
      } else if (rule.atrasoCriterio === 'atraso_maior_medio') {
        atrasoPass = atrasoAtual > mediaAtraso;
      } else if (rule.atrasoCriterio === 'pendente_ciclo') {
        atrasoPass = cicloAusentes.includes(num);
      }
    }

    // Combine conditions with operator E (AND) or OU (OR)
    let qualifies = false;
    if (rule.operador === 'E') {
      qualifies = radarPass && atrasoPass;
    } else {
      qualifies = radarPass || atrasoPass;
    }

    if (qualifies) {
      dezenasGatilho.push(num);
      const dezPad = num.toString().padStart(2, '0');
      detalhes.push(`Dezena ${dezPad}: Força EMA ${radar.forcaEma}% | Atraso ${atrasoAtual} conc.`);
    }
  });

  return {
    ruleId: rule.id,
    ruleName: rule.nome,
    matched: dezenasGatilho.length > 0,
    dezenasGatilho,
    detalhes,
  };
}

/**
 * Audit all active hybrid alert rules and trigger push notifications & alerts
 */
export function auditAndTriggerHybridAlerts(
  latestDraw: LotofacilDraw,
  statsList: DezenaStats[] = [],
  cicloAusentes: number[] = [17, 22]
): HybridEvaluationResult[] {
  const rules = getHybridAlertRules().filter((r) => r.ativa);
  const config = getPushNotificationConfig();
  const existingAlerts = getAlertsHistory();
  const radarMetrics = computeEmaTrends(latestDraw, RECENT_DRAWS);
  const now = Date.now();
  const dateStr = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const newAlerts: IntelligentAlert[] = [];
  const results: HybridEvaluationResult[] = [];

  rules.forEach((rule) => {
    const res = evaluateHybridRule(rule, latestDraw, statsList, cicloAusentes, radarMetrics);
    results.push(res);

    if (res.matched) {
      const alertId = `hibrido_${rule.id}_${latestDraw.concurso}`;
      const alreadyTriggered = existingAlerts.some((a) => a.id === alertId);

      if (!alreadyTriggered) {
        const dezStr = res.dezenasGatilho.map((d) => d.toString().padStart(2, '0')).join(', ');
        const title = `⚡ Alerta Híbrido: ${rule.nome}`;
        const body = `Condição '${rule.operador}' atendida para as dezenas [${dezStr}] no Concurso #${latestDraw.concurso}.`;

        newAlerts.push({
          id: alertId,
          timestamp: now,
          dateStr,
          type: 'hibrido',
          title,
          body,
          concurso: latestDraw.concurso,
          read: false,
          dezenasGatilho: res.dezenasGatilho,
          regraNome: rule.nome,
        });

        if (config.pushEnabled) {
          fireBrowserPushNotification(title, body);
        }
        if (config.soundEnabled) {
          soundService.playGoldenZoneSuccessChime();
        }
      }
    }
  });

  if (newAlerts.length > 0) {
    saveAlertsHistory([...newAlerts, ...existingAlerts]);
  }

  return results;
}

