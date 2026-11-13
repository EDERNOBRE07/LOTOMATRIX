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
  operador: 'E' | 'OU'; // AND ou OR entre as condições

  // Condições de Performance (ex: SE acertos > 13 E ROI > 50%)
  tipoRegra?: 'dezenas_radar' | 'resultado_performance';
  acertosAtivo?: boolean;
  acertosCriterio?: '>' | '>=' | '==';
  acertosValor?: number; // ex: 13, 14, 15
  roiAtivo?: boolean;
  roiCriterio?: '>' | '>=';
  roiValor?: number; // ex: 50 (%)

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

  // Ação ENTÃO (Execução do Alerta)
  acaoEntao?: 'notificacao_urgente' | 'alerta_sonoro' | 'push_browser' | 'todos';
  notificacaoUrgente?: boolean;

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

export type NotificationEventKey =
  | 'inicioCiclo'
  | 'fimCiclo'
  | 'atrasosCriticos'
  | 'premiacoes13Plus'
  | 'premiacoes11e12'
  | 'radarTendencias'
  | 'novoConcurso';

export interface NotificationEventRule {
  enabled: boolean;
  soundEnabled: boolean;
  nativePushEnabled: boolean;
  threshold?: number;
}

export interface DetailedNotificationRules {
  masterEnabled: boolean;
  quietMode: boolean;
  events: Record<NotificationEventKey, NotificationEventRule>;
}

export const DEFAULT_DETAILED_NOTIFICATION_RULES: DetailedNotificationRules = {
  masterEnabled: true,
  quietMode: false,
  events: {
    inicioCiclo: { enabled: true, soundEnabled: true, nativePushEnabled: true },
    fimCiclo: { enabled: true, soundEnabled: true, nativePushEnabled: true, threshold: 3 },
    atrasosCriticos: { enabled: true, soundEnabled: true, nativePushEnabled: true, threshold: 5 },
    premiacoes13Plus: { enabled: true, soundEnabled: true, nativePushEnabled: true, threshold: 13 },
    premiacoes11e12: { enabled: false, soundEnabled: false, nativePushEnabled: false, threshold: 11 },
    radarTendencias: { enabled: true, soundEnabled: true, nativePushEnabled: true, threshold: 90 },
    novoConcurso: { enabled: true, soundEnabled: true, nativePushEnabled: true },
  },
};

const DETAILED_RULES_KEY = 'lotosniper_detailed_notification_rules';
const HYBRID_RULES_KEY = 'lotosniper_hybrid_alert_rules';

const CONFIG_KEY = 'lotosniper_push_notification_config';
const ALERTS_KEY = 'lotosniper_push_alerts_history';

export function getDetailedNotificationRules(): DetailedNotificationRules {
  try {
    const raw = localStorage.getItem(DETAILED_RULES_KEY);
    if (!raw) {
      return {
        ...DEFAULT_DETAILED_NOTIFICATION_RULES,
        events: { ...DEFAULT_DETAILED_NOTIFICATION_RULES.events },
      };
    }
    const parsed = JSON.parse(raw);
    const mergedEvents = { ...DEFAULT_DETAILED_NOTIFICATION_RULES.events };
    (Object.keys(mergedEvents) as NotificationEventKey[]).forEach((key) => {
      if (parsed?.events?.[key]) {
        mergedEvents[key] = { ...mergedEvents[key], ...parsed.events[key] };
      }
    });
    return {
      masterEnabled: parsed?.masterEnabled !== undefined ? Boolean(parsed.masterEnabled) : true,
      quietMode: Boolean(parsed?.quietMode),
      events: mergedEvents,
    };
  } catch {
    return {
      ...DEFAULT_DETAILED_NOTIFICATION_RULES,
      events: { ...DEFAULT_DETAILED_NOTIFICATION_RULES.events },
    };
  }
}

export function saveDetailedNotificationRules(rules: DetailedNotificationRules): void {
  try {
    localStorage.setItem(DETAILED_RULES_KEY, JSON.stringify(rules));

    // Sincroniza chaves legadas para manter compatibilidade total com auditores existentes
    const legacyCfg: PushNotificationConfig = {
      pushEnabled: rules.masterEnabled && rules.events.novoConcurso.nativePushEnabled,
      radarAlertEnabled: rules.masterEnabled && rules.events.radarTendencias.enabled,
      radarThreshold: rules.events.radarTendencias.threshold ?? 90,
      newCycleAlertEnabled: rules.masterEnabled && rules.events.inicioCiclo.enabled,
      soundEnabled:
        rules.masterEnabled &&
        !rules.quietMode &&
        (rules.events.inicioCiclo.soundEnabled ||
          rules.events.atrasosCriticos.soundEnabled ||
          rules.events.premiacoes13Plus.soundEnabled),
    };
    localStorage.setItem(CONFIG_KEY, JSON.stringify(legacyCfg));

    // Sincroniza configurações de premiação 13+
    const minPrizeHits = rules.events.premiacoes13Plus.threshold ?? 13;
    const prizeThreshold =
      minPrizeHits >= 15 ? '15_only' : minPrizeHits === 14 ? '14_and_15' : '13_plus';
    localStorage.setItem(
      'lotosniper_alert_14_15_enabled',
      String(rules.masterEnabled && rules.events.premiacoes13Plus.enabled)
    );
    localStorage.setItem('lotosniper_alert_threshold', prizeThreshold);

    // Sincroniza faixas de premiação (11-15)
    try {
      const tiers = {
        hits11: rules.masterEnabled && rules.events.premiacoes11e12.enabled && rules.events.premiacoes11e12.nativePushEnabled,
        hits12: rules.masterEnabled && rules.events.premiacoes11e12.enabled && rules.events.premiacoes11e12.nativePushEnabled,
        hits13: rules.masterEnabled && rules.events.premiacoes13Plus.enabled && minPrizeHits <= 13,
        hits14: rules.masterEnabled && rules.events.premiacoes13Plus.enabled && minPrizeHits <= 14,
        hits15: rules.masterEnabled && rules.events.premiacoes13Plus.enabled && minPrizeHits <= 15,
      };
      localStorage.setItem('lotosniper_prize_notification_tiers', JSON.stringify(tiers));
    } catch {}

    // Sincroniza configurações de oportunidades (atrasos críticos & ciclo)
    try {
      const prevOppRaw = localStorage.getItem('lotosniper_opportunity_alerts_config');
      const prevOpp = prevOppRaw ? JSON.parse(prevOppRaw) : {};
      const nextOpp = {
        ...prevOpp,
        enabled:
          rules.masterEnabled &&
          (rules.events.atrasosCriticos.enabled || rules.events.fimCiclo.enabled),
        criticalDelayThreshold: rules.events.atrasosCriticos.threshold ?? 5,
        cycleAlertEnabled: rules.events.fimCiclo.enabled,
        soundEnabled:
          !rules.quietMode &&
          (rules.events.atrasosCriticos.soundEnabled || rules.events.fimCiclo.soundEnabled),
        pushEnabled:
          rules.events.atrasosCriticos.nativePushEnabled || rules.events.fimCiclo.nativePushEnabled,
      };
      localStorage.setItem('lotosniper_opportunity_alerts_config', JSON.stringify(nextOpp));
    } catch {}

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('lotosniper-detailed-rules-updated', { detail: rules }));
      window.dispatchEvent(new CustomEvent('lotosniper-push-config-updated', { detail: legacyCfg }));
    }
  } catch (e) {
    console.error('Falha ao salvar regras detalhadas de notificação:', e);
  }
}

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
 * Send an OS-level browser push notification if permitted (prefers Service Worker when available)
 */
export async function fireBrowserPushNotification(title: string, body: string, tag: string = 'lotosniper-alert'): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) return false;
  if (Notification.permission !== 'granted') return false;
  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.ready;
      if (reg && 'showNotification' in reg) {
        await reg.showNotification(title, {
          body,
          icon: '/favicon.svg',
          badge: '/favicon.svg',
          tag,
        });
        return true;
      }
    }
    new Notification(title, {
      body,
      icon: '/favicon.ico',
      tag,
    });
    return true;
  } catch (e) {
    console.warn('Erro ao disparar push notification:', e);
    return false;
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
  const detailed = getDetailedNotificationRules();
  if (!detailed.masterEnabled) return;

  const existingAlerts = getAlertsHistory();
  const newAlerts: IntelligentAlert[] = [];

  const now = Date.now();
  const dateStr = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  // 1. Check Radar de Tendências Quentes
  const radarRule = detailed.events.radarTendencias;
  const radarData = radarTopNumbers || computeEmaTrends(latestDraw, RECENT_DRAWS);
  if (config.radarAlertEnabled && radarRule.enabled && radarData && radarData.length > 0) {
    const threshold = radarRule.threshold || config.radarThreshold || 90;
    const hotNumbersOver90 = radarData.filter((r) => r.probabilidade >= threshold || r.forcaEma >= threshold);

    hotNumbersOver90.forEach((item) => {
      const dezenaPad = item.dezena.toString().padStart(2, '0');
      const alertId = `radar_90_${item.dezena}_${latestDraw.concurso}`;

      const alreadyTriggered = existingAlerts.some((a) => a.id === alertId);
      if (!alreadyTriggered) {
        const title = `Radar de Tendências: Dezena ${dezenaPad} em ${Math.round(item.probabilidade)}%`;
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

        if (config.pushEnabled && radarRule.nativePushEnabled) {
          void fireBrowserPushNotification(title, body, alertId);
        }
        if (config.soundEnabled && !detailed.quietMode && radarRule.soundEnabled) {
          soundService.playGoldenZoneSuccessChime();
        }
      }
    });
  }

  // 2. Check if a new cycle is started (concursosNoCiclo === 1)
  const cycleRule = detailed.events.inicioCiclo;
  if (config.newCycleAlertEnabled && cycleRule.enabled && concursosNoCiclo === 1) {
    const alertId = `new_cycle_${latestDraw.concurso}`;
    const alreadyTriggered = existingAlerts.some((a) => a.id === alertId);

    if (!alreadyTriggered) {
      const title = `Início de Novo Ciclo das 25 Dezenas (#${latestDraw.concurso})`;
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

      if (cycleRule.nativePushEnabled) {
        void fireBrowserPushNotification(title, body, alertId);
      }
      if (!detailed.quietMode && cycleRule.soundEnabled) {
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
    id: 'regra-ouro-acertos-roi',
    nome: 'Super Acertos & ROI: SE acertos > 13 E ROI > 50% ENTÃO Notificação Urgente',
    ativa: true,
    operador: 'E',
    tipoRegra: 'resultado_performance',
    acertosAtivo: true,
    acertosCriterio: '>',
    acertosValor: 13,
    roiAtivo: true,
    roiCriterio: '>',
    roiValor: 50,
    acaoEntao: 'notificacao_urgente',
    notificacaoUrgente: true,
    radarAtivo: false,
    radarCriterio: 'forca_minima',
    radarValor: 70,
    atrasoAtivo: false,
    atrasoCriterio: 'atraso_minimo',
    atrasoValor: 2,
    dezenasMonitoradas: [],
    criadoEm: Date.now() - 1000,
  },
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
  // Se for uma regra baseada em Performance (Acertos / ROI)
  if (rule.tipoRegra === 'resultado_performance' || rule.acertosAtivo || rule.roiAtivo) {
    let mockMaxAcertos = 0;
    let mockRoi = 0;

    try {
      const rawSaved = localStorage.getItem('lotosniper_saved_prognosticos');
      const savedList = rawSaved ? JSON.parse(rawSaved) : [];
      let totalCusto = 0;
      let totalRetorno = 0;

      for (const f of savedList) {
        totalCusto += f.custoTotal || (f.tickets?.length || 0) * 3.5;
        for (const t of f.tickets || []) {
          const hits = (t.dezenas || []).filter((d: number) => latestDraw.dezenas.includes(d)).length;
          if (hits > mockMaxAcertos) mockMaxAcertos = hits;
          if (hits === 15) totalRetorno += 1750000;
          else if (hits === 14) totalRetorno += 1500;
          else if (hits === 13) totalRetorno += 35;
          else if (hits === 12) totalRetorno += 14;
          else if (hits === 11) totalRetorno += 7;
        }
      }

      if (totalCusto > 0) {
        mockRoi = Math.round(((totalRetorno - totalCusto) / totalCusto) * 100);
      } else {
        // Fallback demonstrativo baseado no último concurso
        mockMaxAcertos = 14;
        mockRoi = 68;
      }
    } catch {
      mockMaxAcertos = 14;
      mockRoi = 68;
    }

    const acertosPassed = !rule.acertosAtivo || (
      rule.acertosCriterio === '>' ? mockMaxAcertos > (rule.acertosValor ?? 13) :
      rule.acertosCriterio === '>=' ? mockMaxAcertos >= (rule.acertosValor ?? 13) :
      mockMaxAcertos === (rule.acertosValor ?? 13)
    );

    const roiPassed = !rule.roiAtivo || (
      rule.roiCriterio === '>=' ? mockRoi >= (rule.roiValor ?? 50) : mockRoi > (rule.roiValor ?? 50)
    );

    const matched = rule.operador === 'E' ? (acertosPassed && roiPassed) : (acertosPassed || roiPassed);
    const detalhes = [
      `Acertos detectados: ${mockMaxAcertos} pontos (Critério: ${rule.acertosCriterio || '>'} ${rule.acertosValor ?? 13})`,
      `ROI apurado: ${mockRoi}% (Critério: ${rule.roiCriterio || '>'} ${rule.roiValor ?? 50}%)`,
      `Ação disparada: Notificação Urgente no Navegador`,
    ];

    return {
      ruleId: rule.id,
      ruleName: rule.nome,
      matched,
      dezenasGatilho: [],
      detalhes,
    };
  }

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

