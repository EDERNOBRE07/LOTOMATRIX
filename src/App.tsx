import React, { useState, useEffect, useMemo } from 'react';
import { Header } from './components/Header';
import { FechamentoTab } from './components/FechamentoTab';
import { FiltrosInteligentesTab } from './components/FiltrosInteligentesTab';
import { AIPredictorTab } from './components/AIPredictorTab';
import { StatisticsTab } from './components/StatisticsTab';
import { SimulatorTab } from './components/SimulatorTab';
import { GamesManagerTab } from './components/GamesManagerTab';
import { HostingerGuideTab } from './components/HostingerGuideTab';
import { SettingsTab } from './components/SettingsTab';
import { GuidedTourModal } from './components/GuidedTourModal';
import { ModuloConferenciaJogos } from './components/ModuloConferenciaJogos';
import { VolanteSelector } from './components/VolanteSelector';
import { AppShellSidebar } from './components/AppShellSidebar';
import { AppShellMobileBottomNav } from './components/AppShellMobileBottomNav';
import { NavigationMenu } from './components/NavigationMenu';
import { OfflineIndicator } from './components/OfflineIndicator';
import { DevServerHealthStatus, ServerHealthState } from './components/DevServerHealthStatus';
import { ErrorBoundary } from './components/ErrorBoundary';
import { BackupRestoreCenterModal } from './components/BackupRestoreCenterModal';
import { FechamentoSavedToastAlert } from './components/FechamentoSavedToastAlert';
import { LegalInfoPages, PublicInfoRoute } from './components/LegalInfoPages';
import { HistoricoFechamentosRecentes } from './components/HistoricoFechamentosRecentes';
import { HeatmapTab } from './components/HeatmapTab';
import {
  getSavedCycleThreshold,
  getSavedCycleVisualAlertEnabled,
  CYCLE_THRESHOLD_UPDATED_EVENT,
} from './components/AlertaFimCicloConfigPanel';
import {
  saveLocalSnapshot,
  isAutoDownloadOnSaveEnabled,
  triggerForcedJSONDownload,
  checkAndRunScheduledDailyBackup,
} from './services/backupManagerService';
import { useActiveFilterConfig } from './hooks/useActiveFilterConfig';
import {
  sendNativeJackpotNotification,
  sendNativeTop5TrendNotification,
  auditAndNotifyTop5Trends,
  requestNativeNotificationPermission,
  isNotificationSupported,
  getNotificationPermission,
  sendNativeCycleAlertNotification,
} from './services/nativeNotificationService';
import { GameTicket, AIPredictionResponse, LotofacilDraw, FechamentoExportMeta, DezenaStats, FilterCriteria } from './types/lotofacil';
import { CONCURSO_ATUAL, RECENT_DRAWS } from './data/lotofacilData';
import { syncLatestLotofacil, computeDynamicStats } from './services/lotofacilSync';
import { buildOptimal18Pool, countMatches, normalizeGameTickets } from './services/combinatorics';
import {
  getSavedFechamentos,
  getLatestSavedTickets,
  syncWithMySQLHostinger,
} from './services/savedFechamentosStorage';
import { predictDezenaWeightsLogistic } from './services/aiEngine';
import { soundService } from './services/soundAlert';
import {
  auditAndTriggerIntelligentAlerts,
  auditAndTriggerHybridAlerts,
  getDetailedNotificationRules,
  fireBrowserPushNotification,
  getCriticalDelayMonitorConfig,
  resolveMonitoredCriticalDelayNumbers,
  getAlertsHistory,
  saveAlertsHistory,
  IntelligentAlert,
  shouldMuteBackgroundAudio,
  shouldMuteBackgroundPush,
} from './services/notificationService';
import {
  auditAndNotifySavedGames,
  SavedGamesAuditResult,
  CUSTOM_PRIZE_ALERT_TRIGGERED_EVENT,
  CustomPrizeAlertTriggeredPayload,
} from './services/savedGamesAuditorService';
import {
  Layers,
  Sparkles,
  BarChart3,
  Award,
  Download,
  Globe,
  Zap,
  CheckCircle2,
  RefreshCw,
  Bell,
  X,
  ClipboardCheck,
  Settings,
  HelpCircle,
  Flame,
  ArrowRight,
  Trophy,
} from 'lucide-react';

export type TabType =
  | 'fechamento'
  | 'filtros'
  | 'conferencia'
  | 'ia_preditor'
  | 'estatisticas'
  | 'heatmap'
  | 'simulador'
  | 'jogos'
  | 'configuracoes'
  | 'hostinger';

export type AppPublicRoute = '/' | PublicInfoRoute;

const ROUTE_TITLES: Record<AppPublicRoute, string> = {
  '/': 'LotoSniper – Fechamentos e IA para Lotofácil',
  '/sobre': 'Sobre o LotoSniper – Metodologia Matemática e IA',
  '/contato': 'Contato – LotoSniper Suporte e Parcerias',
  '/termos': 'Termos de Uso – LotoSniper Lotofácil',
  '/privacidade': 'Política de Privacidade – LotoSniper',
};

function resolvePublicRouteFromLocation(): AppPublicRoute {
  if (typeof window === 'undefined') return '/';
  const raw = window.location.pathname.replace(/\/+$/, '') || '/';
  if (raw === '/sobre' || raw === '/contato' || raw === '/termos' || raw === '/privacidade') {
    return raw;
  }
  return '/';
}

export default function App() {
  const [publicRoute, setPublicRoute] = useState<AppPublicRoute>(() => resolvePublicRouteFromLocation());
  const [activeTab, setActiveTab] = useState<TabType>('fechamento');
  const [jogosSubView, setJogosSubView] = useState<'salvos' | 'conferencia'>('salvos');

  const navigatePublicRoute = (targetPath: AppPublicRoute) => {
    if (typeof window !== 'undefined' && window.location.pathname !== targetPath) {
      window.history.pushState({}, '', targetPath);
    }
    setPublicRoute(targetPath);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSelectStudioTab = (tab: TabType) => {
    if (publicRoute !== '/') {
      navigatePublicRoute('/');
    }
    setActiveTab(tab);
  };

  useEffect(() => {
    const onPopState = () => {
      setPublicRoute(resolvePublicRouteFromLocation());
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined' || typeof window === 'undefined') return;
    document.title = ROUTE_TITLES[publicRoute];
    const canonicalEl = document.querySelector('link[rel="canonical"]');
    if (canonicalEl) {
      canonicalEl.setAttribute('href', `${window.location.origin}${publicRoute}`);
    }
  }, [publicRoute]);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('lotosniper_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const handleToggleSidebar = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('lotosniper_sidebar_collapsed', String(next));
      } catch {}
      return next;
    });
  };

  // Estado unificado e persistente do activeFilterConfig (Pipeline Combinatório)
  const {
    activeFilterConfig,
    setActiveFilterConfig,
    applyStrategicFilters,
    resetToCanonicalFilters,
  } = useActiveFilterConfig();

  // Guided Tour modal state (opens on first load or on demand)
  const [isTourOpen, setIsTourOpen] = useState<boolean>(() => {
    try {
      return localStorage.getItem('lotosniper_tour_completed') !== 'true';
    } catch {
      return false;
    }
  });

  // Estado de permissão de Notificações Nativas do Navegador (13+ Pontos)
  const [nativePerm, setNativePerm] = useState<NotificationPermission>(() => {
    return isNotificationSupported() ? getNotificationPermission() : 'denied';
  });
  const [dismissPermPrompt, setDismissPermPrompt] = useState<boolean>(false);

  const handleRequestNativePerm = async () => {
    const res = await requestNativeNotificationPermission();
    setNativePerm(res);
  };

  // Theme initialization ('gold', 'high_contrast' or 'slate')
  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem('lotosniper_theme') || 'gold';
      document.documentElement.classList.remove(
        'theme-gold',
        'theme-high-contrast',
        'theme-night-contrast',
        'theme-slate'
      );
      if (savedTheme === 'high_contrast') {
        document.documentElement.classList.add('theme-high-contrast', 'theme-night-contrast');
      } else if (savedTheme === 'gold') {
        document.documentElement.classList.add('theme-gold');
      } else {
        document.documentElement.classList.add('theme-slate');
      }
    } catch {}
  }, []);

  // Notificação de brinde (toast) ao detectar fechamento ou início de ciclo das 25 dezenas
  const [cycleToast, setCycleToast] = useState<{
    type: 'closed' | 'started' | 'urgent';
    title: string;
    description: string;
    concurso: number;
  } | null>(null);

  // Limite configurável de dezenas ausentes para disparar o alerta visual de fim de ciclo
  const [cycleVisualThreshold, setCycleVisualThreshold] = useState<number>(() =>
    getSavedCycleThreshold()
  );
  const [cycleVisualAlertEnabled, setCycleVisualAlertEnabled] = useState<boolean>(() =>
    getSavedCycleVisualAlertEnabled()
  );

  useEffect(() => {
    const handleSyncCycleConfig = () => {
      setCycleVisualThreshold(getSavedCycleThreshold());
      setCycleVisualAlertEnabled(getSavedCycleVisualAlertEnabled());
    };
    window.addEventListener(CYCLE_THRESHOLD_UPDATED_EVENT, handleSyncCycleConfig);
    window.addEventListener('storage', handleSyncCycleConfig);
    return () => {
      window.removeEventListener(CYCLE_THRESHOLD_UPDATED_EVENT, handleSyncCycleConfig);
      window.removeEventListener('storage', handleSyncCycleConfig);
    };
  }, []);

  // Dynamic Contest State (Loaded automatically every time the app opens)
  const [latestDraw, setLatestDraw] = useState<LotofacilDraw>(CONCURSO_ATUAL);
  const [isSyncing, setIsSyncing] = useState<boolean>(true);
  const [syncSource, setSyncSource] = useState<string>('caixa-oficial');
  const [syncNotice, setSyncNotice] = useState<{
    message: string;
    source: string;
    concurso: number;
    data: string;
  } | null>(null);

  const [savedTickets, setSavedTickets] = useState<GameTicket[]>(() => {
    try {
      // Prioriza sempre os últimos fechamentos salvos para garantir carregamento e conferência ao abrir/atualizar
      const latest = getLatestSavedTickets();
      if (latest.tickets.length > 0) {
        return normalizeGameTickets(latest.tickets, CONCURSO_ATUAL.dezenas);
      }
      return [];
    } catch {
      return [];
    }
  });

  const [isBackupModalOpen, setIsBackupModalOpen] = useState<boolean>(false);
  const hasSavedTicketsMountedRef = React.useRef<boolean>(false);

  // Salvar no localStorage sempre que savedTickets mudar (inclusive ao limpar) e disparar snapshot
  useEffect(() => {
    try {
      if (!hasSavedTicketsMountedRef.current) {
        hasSavedTicketsMountedRef.current = true;
        if (savedTickets.length > 0) {
          localStorage.setItem('lotosniper_saved_tickets', JSON.stringify(savedTickets));
        }
        return;
      }

      localStorage.setItem('lotosniper_saved_tickets', JSON.stringify(savedTickets));
      if (savedTickets.length > 0) {
        saveLocalSnapshot('auto', latestDraw?.concurso);
        if (isAutoDownloadOnSaveEnabled()) {
          triggerForcedJSONDownload(undefined, latestDraw?.concurso);
        }
      }
    } catch {}
  }, [savedTickets]);

  // Agendador diário em segundo plano para download automático JSON via triggerForcedJSONDownload
  useEffect(() => {
    const runScheduleCheck = () => {
      checkAndRunScheduledDailyBackup(latestDraw?.concurso);
    };
    runScheduleCheck();
    const intervalId = window.setInterval(runScheduleCheck, 15000);
    window.addEventListener('lotosniper-daily-backup-schedule-updated', runScheduleCheck);
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('lotosniper-daily-backup-schedule-updated', runScheduleCheck);
    };
  }, [latestDraw?.concurso]);

  const [customPrizeAlertNotice, setCustomPrizeAlertNotice] =
    useState<CustomPrizeAlertTriggeredPayload | null>(null);

  const [jackpotHitNotice, setJackpotHitNotice] = useState<{
    concurso: number;
    maxHits: number;
    winningTicketsCount: number;
    bestTicketIndex: number;
  } | null>(null);

  const [savedGamesAuditNotice, setSavedGamesAuditNotice] = useState<SavedGamesAuditResult | null>(null);

  const [activeFechamentoMeta, setActiveFechamentoMeta] = useState<FechamentoExportMeta | null>(() => {
    try {
      const saved = localStorage.getItem('lotosniper_active_fechamento_meta');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const buildLogisticPredictionResponse = (
    draw: LotofacilDraw,
    filtersCfg: FilterCriteria = activeFilterConfig
  ): AIPredictionResponse => {
    const logistic = predictDezenaWeightsLogistic(draw);
    const confianca = Number(
      Math.min(98.5, Math.max(72.0, 100 - logistic.modelMetrics.logLoss * 42)).toFixed(1)
    );
    const fixas = filtersCfg?.dezenasFixas || [];
    const excluidas = filtersCfg?.dezenasExcluidas || [];
    const mergedPool = Array.from(
      new Set([
        ...fixas,
        ...logistic.dezenasRecomendadas18.filter((n) => !excluidas.includes(n)),
      ])
    );
    if (mergedPool.length < 18) {
      for (let n = 1; n <= 25; n++) {
        if (mergedPool.length >= 18) break;
        if (!excluidas.includes(n) && !mergedPool.includes(n)) {
          mergedPool.push(n);
        }
      }
    }
    const recomendadas18 = mergedPool.slice(0, 18).sort((a, b) => a - b);

    return {
      scores: logistic.scores,
      dezenasRecomendadas18: recomendadas18,
      dezenasRecomendadas15_Ouro: logistic.dezenasRecomendadas15_Ouro,
      taxaConfianca: confianca,
      justificativaTecnica: logistic.explicacaoEstrategica,
      dezenasChave: logistic.dezenasChave,
      padroesSugeridos: {
        paresImpares: `${filtersCfg?.paresMin ?? 6} a ${filtersCfg?.paresMax ?? 8} Pares`,
        primos: `${filtersCfg?.primosMin ?? 4} a ${filtersCfg?.primosMax ?? 7} Primos`,
        moldura: `${filtersCfg?.molduraMin ?? 8} a ${filtersCfg?.molduraMax ?? 11} Dezenas`,
        fibonacci: `${filtersCfg?.fibonacciMin ?? 3} a ${filtersCfg?.fibonacciMax ?? 6} Fibonacci`,
        somaFaixa: `${filtersCfg?.somaMin ?? 175} a ${filtersCfg?.somaMax ?? 220}${
          filtersCfg?.estratificacaoCaudaAtiva ? ' · Caudas 75/15/10' : ''
        }`,
        repetidas: `${filtersCfg?.repetidasMin ?? 7} a ${filtersCfg?.repetidasMax ?? 10} Repetidas do Concurso #${draw.concurso}`,
      },
    };
  };

  const [pendingFixedNumbers, setPendingFixedNumbers] = useState<number[]>([]);
  const [aiPrediction, setAiPrediction] = useState<AIPredictionResponse | null>(() =>
    buildLogisticPredictionResponse(CONCURSO_ATUAL)
  );
  const [isAILoading, setIsAILoading] = useState<boolean>(false);

  // Dynamically recomputed cycle and delay statistics based on current loaded contest
  const { stats: dynamicStats, dezenasPendentesCiclo, concursosNoCiclo } = useMemo(() => {
    return computeDynamicStats(latestDraw, RECENT_DRAWS);
  }, [latestDraw]);

  // Efeito disparado na carga do concurso ou ajuste de limite para detectar alerta visual de fim de ciclo
  useEffect(() => {
    if (!latestDraw) return;
    if (!cycleVisualAlertEnabled) {
      setCycleToast(null);
    } else if (dezenasPendentesCiclo.length === 0) {
      setCycleToast({
        type: 'closed',
        title: '🎉 Brinde de Ciclo: FECHAMENTO COMPLETO DAS 25 DEZENAS!',
        description: `Todas as 25 dezenas da Lotofácil foram sorteadas ao longo de ${concursosNoCiclo} concursos! Momento estatístico de ouro para reiniciar estratégias canônicas.`,
        concurso: latestDraw.concurso,
      });
    } else if (concursosNoCiclo === 1) {
      setCycleToast({
        type: 'started',
        title: '🚀 Início de um Novo Ciclo das 25 Dezenas!',
        description: `O Concurso #${latestDraw.concurso} iniciou um novo ciclo. 15 dezenas saíram e 10 dezenas ausentes entram com alta propensão de saída.`,
        concurso: latestDraw.concurso,
      });
    } else if (dezenasPendentesCiclo.length <= cycleVisualThreshold) {
      setCycleToast({
        type: 'urgent',
        title: `⚡ Alerta de Fim de Ciclo (${concursosNoCiclo}º Concurso · limite ≤ ${cycleVisualThreshold} ausentes)`,
        description: `Faltam apenas ${dezenasPendentesCiclo.length} ${
          dezenasPendentesCiclo.length === 1 ? 'dezena' : 'dezenas'
        } [${dezenasPendentesCiclo
          .map((d) => d.toString().padStart(2, '0'))
          .join(', ')}] para completar todas as 25! Forte pressão estatística.`,
        concurso: latestDraw.concurso,
      });
    } else {
      setCycleToast((prev) => (prev?.type === 'urgent' ? null : prev));
    }

    // Dispara auditoria de Notificações Push Inteligentes (Radar > 90% e Início de Ciclos)
    auditAndTriggerIntelligentAlerts(latestDraw, dynamicStats, concursosNoCiclo);

    // Dispara auditoria das Regras de Alerta Híbrido (E / OU: Radar + Atrasos Críticos)
    auditAndTriggerHybridAlerts(latestDraw, dynamicStats, dezenasPendentesCiclo);
  }, [
    latestDraw.concurso,
    dezenasPendentesCiclo.length,
    concursosNoCiclo,
    latestDraw,
    dynamicStats,
    dezenasPendentesCiclo,
    cycleVisualThreshold,
    cycleVisualAlertEnabled,
  ]);

  // Listener para navegação rápida entre abas acionada por componentes filhos
  useEffect(() => {
    const handleSwitchTab = (e: any) => {
      const detail = e.detail;
      if (typeof detail === 'string') {
        setActiveTab(detail as any);
      } else if (detail && typeof detail === 'object') {
        if (detail.tickets && Array.isArray(detail.tickets)) {
          setSavedTickets(normalizeGameTickets(detail.tickets, latestDraw.dezenas));
        }
        if (detail.tab) {
          setActiveTab(detail.tab);
        }
      }
    };
    window.addEventListener('switch-tab', handleSwitchTab);
    return () => window.removeEventListener('switch-tab', handleSwitchTab);
  }, [latestDraw.dezenas]);

  // Escuta evento global para abrir a Central de Backup & Segurança
  useEffect(() => {
    const handleOpenBackup = () => setIsBackupModalOpen(true);
    window.addEventListener('lotosniper-open-backup', handleOpenBackup);
    return () => window.removeEventListener('lotosniper-open-backup', handleOpenBackup);
  }, []);

  // Escuta atualização direta de bilhetes e fechamentos salvos (garante sincronização contínua para conferência)
  useEffect(() => {
    const handleTicketsUpdated = (e: any) => {
      try {
        if (e?.detail && Array.isArray(e.detail)) {
          setSavedTickets(normalizeGameTickets(e.detail, latestDraw.dezenas));
          return;
        }
        const latest = getLatestSavedTickets();
        if (latest.tickets.length > 0) {
          setSavedTickets(normalizeGameTickets(latest.tickets, latestDraw.dezenas));
        }
      } catch {}
    };
    const handleFechamentosUpdated = () => {
      try {
        const latest = getLatestSavedTickets();
        const normalized = normalizeGameTickets(latest.tickets, latestDraw.dezenas);
        setSavedTickets(normalized);
      } catch {}
    };
    window.addEventListener('lotosniper-saved-tickets-updated', handleTicketsUpdated);
    window.addEventListener('lotosniper-saved-fechamentos-updated', handleFechamentosUpdated);
    window.addEventListener('storage', handleFechamentosUpdated);
    return () => {
      window.removeEventListener('lotosniper-saved-tickets-updated', handleTicketsUpdated);
      window.removeEventListener('lotosniper-saved-fechamentos-updated', handleFechamentosUpdated);
      window.removeEventListener('storage', handleFechamentosUpdated);
    };
  }, [latestDraw.dezenas]);

  // Escuta restauração de backup de fechamentos para auditar automaticamente todos os jogos salvos sem exceção
  useEffect(() => {
    const handleBackupRestored = async () => {
      try {
        const rawTickets = localStorage.getItem('lotosniper_saved_tickets');
        if (rawTickets) {
          const normalized = normalizeGameTickets(JSON.parse(rawTickets), latestDraw.dezenas);
          if (normalized.length > 0) {
            setSavedTickets(normalized);
          } else {
            const fechamentos = getSavedFechamentos();
            setSavedTickets(
              normalizeGameTickets(
                fechamentos.flatMap((f) => (Array.isArray(f.tickets) ? f.tickets : [])),
                latestDraw.dezenas
              )
            );
          }
        } else {
          const fechamentos = getSavedFechamentos();
          setSavedTickets(
            normalizeGameTickets(
              fechamentos.flatMap((f) => (Array.isArray(f.tickets) ? f.tickets : [])),
              latestDraw.dezenas
            )
          );
        }
      } catch {}
      try {
        const res = await auditAndNotifySavedGames(latestDraw, true);
        if (res) {
          setSavedGamesAuditNotice(res);
        }
      } catch (err) {
        console.warn('Erro ao auditar jogos após restauração do backup:', err);
      }
    };
    window.addEventListener('lotosniper-backup-restored', handleBackupRestored);
    return () => window.removeEventListener('lotosniper-backup-restored', handleBackupRestored);
  }, [latestDraw]);

  // Escuta cliques nas notificações emitidas pelo Service Worker em segundo plano
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      const handleSwMessage = (event: MessageEvent) => {
        if (
          event.data?.type === 'NOTIFICATION_SAVED_GAMES_CLICKED' ||
          event.data?.type === 'NOTIFICATION_JACKPOT_CLICKED'
        ) {
          setActiveTab('jogos');
        }
      };
      navigator.serviceWorker.addEventListener('message', handleSwMessage);
      return () => navigator.serviceWorker.removeEventListener('message', handleSwMessage);
    }
  }, []);

  // Escuta evento customizado de auditoria de jogos salvos para exibir notificação em tela
  useEffect(() => {
    const handleAudited = (e: any) => {
      if (e.detail) {
        setSavedGamesAuditNotice(e.detail);
      }
    };
    const handleCustomPrizeAlert = (e: Event) => {
      const detail = (e as CustomEvent<CustomPrizeAlertTriggeredPayload>).detail;
      if (detail) {
        setCustomPrizeAlertNotice(detail);
      }
    };
    window.addEventListener('lotosniper-saved-games-audited', handleAudited);
    window.addEventListener(CUSTOM_PRIZE_ALERT_TRIGGERED_EVENT, handleCustomPrizeAlert);
    return () => {
      window.removeEventListener('lotosniper-saved-games-audited', handleAudited);
      window.removeEventListener(CUSTOM_PRIZE_ALERT_TRIGGERED_EVENT, handleCustomPrizeAlert);
    };
  }, []);

  // Escuta atualizações de concurso em tempo real para sincronização global
  useEffect(() => {
    const handleDrawUpdated = (e: any) => {
      const incomingDraw = e.detail;
      if (incomingDraw && incomingDraw.concurso) {
        setLatestDraw((prev) => {
          if (incomingDraw.concurso >= prev.concurso) {
            return incomingDraw;
          }
          return prev;
        });
      }
    };
    window.addEventListener('lotosniper-concurso-updated', handleDrawUpdated);
    return () => window.removeEventListener('lotosniper-concurso-updated', handleDrawUpdated);
  }, []);

  // 2.1. Intervalo de Polling em segundo plano configurável pelo usuário (5min, 15min, 30min)
  const [pollingIntervalMs, setPollingIntervalMs] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('lotosniper_polling_interval_ms');
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed > 0) return parsed;
      }
    } catch {}
    return 5 * 60 * 1000; // Padrão: 5 minutos (300.000ms)
  });

  useEffect(() => {
    const handlePollingChange = (e: any) => {
      if (e.detail && typeof e.detail === 'number' && e.detail > 0) {
        console.log(`[LotoSniper Polling] Intervalo atualizado em tempo real para ${e.detail / 60000} minutos (${e.detail}ms).`);
        setPollingIntervalMs(e.detail);
      }
    };
    window.addEventListener('lotosniper-polling-interval-changed', handlePollingChange);
    return () => window.removeEventListener('lotosniper-polling-interval-changed', handlePollingChange);
  }, []);

  // Polling em segundo plano: verifica periodicamente se há novo concurso apurado pela Caixa
  useEffect(() => {
    console.log(`[LotoSniper Polling Caixa] Loop de verificação ativo: checando a cada ${pollingIntervalMs / 60000} minutos (${pollingIntervalMs}ms).`);
    const timer = setInterval(() => {
      runAutoUpdate(false).catch(() => {});
    }, pollingIntervalMs);
    return () => clearInterval(timer);
  }, [latestDraw.concurso, pollingIntervalMs]);

  // Disparo automático de alertas sonoros e notificações nativas do navegador para 13+ pontos (13, 14 e 15 acertos)
  const triggerAutomaticJackpotAlerts = (draw: LotofacilDraw, ticketsToCheck: GameTicket[]) => {
    if (!ticketsToCheck || ticketsToCheck.length === 0 || !draw?.dezenas) return;

    const detailed = getDetailedNotificationRules();
    if (!detailed.masterEnabled) return;

    const prizeRule = detailed.events.premiacoes13Plus;
    const alertEnabled = localStorage.getItem('lotosniper_alert_14_15_enabled') !== 'false' && prizeRule.enabled;
    if (!alertEnabled) return;

    const threshold = (localStorage.getItem('lotosniper_alert_threshold') as '15_only' | '14_and_15' | '13_plus') || '13_plus';

    let maxHits = 0;
    let winningCount = 0;
    let bestIdx = 1;

    ticketsToCheck.forEach((t) => {
      const hits = countMatches(t.dezenas, draw.dezenas);
      if (hits > maxHits) {
        maxHits = hits;
        bestIdx = t.index;
      }
      if (hits >= 13) winningCount++;
    });

    const isTriggered =
      (threshold === '15_only' && maxHits >= 15) ||
      (threshold === '14_and_15' && maxHits >= 14) ||
      (threshold === '13_plus' && maxHits >= 13);

    if (isTriggered) {
      // 1. Disparar Notificação Nativa e Alerta Sonoro respeitando regras individuais
      sendNativeJackpotNotification({
        concurso: draw.concurso,
        maxHits,
        winningTicketsCount: winningCount,
        bestTicketIndex: bestIdx,
        dataSorteio: draw.data,
        playAudio: !shouldMuteBackgroundAudio() && prizeRule.soundEnabled,
        sendPush: !shouldMuteBackgroundPush() && prizeRule.nativePushEnabled,
      });

      // 2. Exibir banner de premiação no topo da tela
      setJackpotHitNotice({
        concurso: draw.concurso,
        maxHits,
        winningTicketsCount: winningCount,
        bestTicketIndex: bestIdx,
      });
    }
  };

  // Auditoria passiva de Alertas de Oportunidade (Atrasos Críticos & Fechamento de Ciclo)
  const triggerAutomaticOpportunityAlerts = (
    draw: LotofacilDraw,
    stats: DezenaStats[],
    pendingCycle: number[],
    concursosNoCiclo?: number
  ) => {
    try {
      const detailed = getDetailedNotificationRules();
      if (!detailed.masterEnabled) return;

      const delayRule = detailed.events.atrasosCriticos;
      const cycleRule = detailed.events.fimCiclo;

      // Lê a configuração visual de dezenas para Atraso Crítico (automáticas de ciclo + extras escolhidas pelo usuário)
      const delayConfig = getCriticalDelayMonitorConfig();
      const { cycleNumbers, extraNumbers, combinedNumbers } = resolveMonitoredCriticalDelayNumbers(
        pendingCycle,
        delayConfig
      );

      const delayThreshold = delayConfig.threshold ?? delayRule.threshold ?? 5;
      const cycleThreshold = cycleRule.threshold ?? 3;

      const delayedNums = delayRule.enabled
        ? stats.filter((s) => {
            const isMonitored = combinedNumbers.includes(s.numero);
            return isMonitored && s.atrasoAtual >= delayThreshold;
          })
        : [];

      const isCycleJustClosed = pendingCycle.length === 0 || concursosNoCiclo === 1;
      const cycleTriggered =
        cycleRule.enabled &&
        (cycleThreshold === 0
          ? isCycleJustClosed
          : isCycleJustClosed || (pendingCycle.length > 0 && pendingCycle.length <= cycleThreshold));

      if (delayedNums.length > 0) {
        const triggeredFromCycle = delayedNums
          .filter((d) => cycleNumbers.includes(d.numero))
          .map((d) => d.numero.toString().padStart(2, '0'));
        const triggeredFromExtra = delayedNums
          .filter((d) => extraNumbers.includes(d.numero) && !cycleNumbers.includes(d.numero))
          .map((d) => d.numero.toString().padStart(2, '0'));

        const summaryParts: string[] = [];
        if (triggeredFromCycle.length > 0) {
          summaryParts.push(`Ciclo: ${triggeredFromCycle.join(', ')}`);
        }
        if (triggeredFromExtra.length > 0) {
          summaryParts.push(`Extras: ${triggeredFromExtra.join(', ')}`);
        }

        const alertId = `critical_delay_${draw.concurso}`;
        const existingHistory = getAlertsHistory();
        if (!existingHistory.some((a) => a.id === alertId)) {
          const newAlert: IntelligentAlert = {
            id: alertId,
            timestamp: Date.now(),
            dateStr: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
            type: 'critical_delay',
            title: `Atraso Crítico (≥ ${delayThreshold} conc.) • #${draw.concurso}`,
            body: `${delayedNums.length} dezena(s) monitorada(s) em hiato crítico (${summaryParts.join(' | ')}).`,
            concurso: draw.concurso,
            read: false,
            dezenasGatilho: delayedNums.map((d) => d.numero),
          };
          saveAlertsHistory([newAlert, ...existingHistory]);
        }

        if (!shouldMuteBackgroundAudio() && delayRule.soundEnabled) {
          soundService.playOpportunityAlert();
        }
        if (delayRule.nativePushEnabled && !shouldMuteBackgroundPush()) {
          void fireBrowserPushNotification(
            `LotoSniper • Atraso Crítico (#${draw.concurso})`,
            `${delayedNums.length} dezena(s) com atraso ≥ ${delayThreshold} concursos (${summaryParts.join(' | ')}).`,
            `lotosniper-delay-${draw.concurso}`
          );
        }
      }

      if (cycleTriggered) {
        if (!shouldMuteBackgroundAudio() && cycleRule.soundEnabled) {
          soundService.playCycleAlertSound();
        }
        if (cycleRule.nativePushEnabled && !shouldMuteBackgroundPush()) {
          const title = isCycleJustClosed
            ? `LotoSniper • Fechamento de Ciclo (#${draw.concurso})`
            : `LotoSniper • Reta Final do Ciclo (#${draw.concurso})`;
          const body = isCycleJustClosed
            ? `O Concurso #${draw.concurso} concluiu o fechamento do ciclo das 25 dezenas! Novo ciclo iniciado.`
            : `Restam apenas ${pendingCycle.length} dezenas (${pendingCycle
                .map((n) => n.toString().padStart(2, '0'))
                .join(', ')}) para fechar o ciclo atual.`;
          void fireBrowserPushNotification(
            title,
            body,
            `lotosniper-cycle-${draw.concurso}`
          );
        }
      }
    } catch (e) {
      console.warn('Erro ao avaliar alerta de oportunidade:', e);
    }
  };

  // Real-time synchronization function: triggered on every app open
  const runAutoUpdate = async (forceFresh: boolean = false) => {
    setIsSyncing(true);
    try {
      const result = await syncLatestLotofacil(forceFresh);
      setLatestDraw(result.draw);
      setSyncSource(result.source);
      setSyncNotice({
        message: result.message,
        source: result.source,
        concurso: result.draw.concurso,
        data: result.draw.data,
      });

      // Sincroniza fechamentos persistidos (MySQL/fallback + localStorage) antes da conferência automática
      try {
        await syncWithMySQLHostinger();
      } catch {}

      const hydrated = getLatestSavedTickets();
      const ticketsToCheck = normalizeGameTickets(
        hydrated.tickets.length > 0 ? hydrated.tickets : savedTickets,
        result.draw.dezenas
      );
      if (ticketsToCheck.length > 0) {
        setSavedTickets(ticketsToCheck);
      }

      // Dispara conferência e auditoria automática nos bilhetes de 'Meus Jogos & Conferidor'
      triggerAutomaticJackpotAlerts(result.draw, ticketsToCheck);

      // Auditoria dos Jogos Salvos com notificação push via Service Worker (força conferência ao atualizar)
      try {
        const auditRes = await auditAndNotifySavedGames(result.draw, forceFresh);
        if (auditRes) {
          setSavedGamesAuditNotice(auditRes);
        }
      } catch (e) {
        console.warn('Erro ao auditar jogos salvos para push:', e);
      }

      // Auditoria das Top 5 Dezenas de Tendência (Atraso Zero & Repetição Consecutiva via Service Worker)
      try {
        await auditAndNotifyTop5Trends(result.draw);
      } catch (e) {
        console.warn('Erro ao auditar Top 5 de tendências para push:', e);
      }

      // Dispara monitoramento passivo de oportunidades (Atrasos Críticos e Fechamento de Ciclo)
      const { stats: newStats, dezenasPendentesCiclo: newPending, concursosNoCiclo: newCicloNum } = computeDynamicStats(result.draw, RECENT_DRAWS);
      triggerAutomaticOpportunityAlerts(result.draw, newStats, newPending, newCicloNum);
      auditAndTriggerIntelligentAlerts(result.draw, newStats, newCicloNum);

      // After updating latest draw, trigger AI prediction optimization only if contest changed
      if (lastPredictedConcursoRef.current !== result.draw.concurso) {
        fetchAIPrediction(result.draw);
      }
      return result;
    } catch (err) {
      console.error('Falha na sincronização:', err);
      throw err;
    } finally {
      setIsSyncing(false);
    }
  };

  // Disparo manual instantâneo do botão de atualização com feedback tátil e sonoro
  const handleManualSync = async () => {
    try {
      soundService.playFilterClick();
    } catch {}
    setSyncNotice({
      message: 'Consultando Caixa Econômica Federal em tempo real...',
      source: 'caixa-oficial',
      concurso: latestDraw.concurso,
      data: latestDraw.data,
    });
    try {
      const res = await runAutoUpdate(true);
      try {
        soundService.playGoldenZoneSuccessChime();
      } catch {}
    } catch (e) {
      setSyncNotice({
        message: 'Aviso: Não foi possível obter novo concurso da rede. Mantendo base oficial segura.',
        source: 'cache-local',
        concurso: latestDraw.concurso,
        data: latestDraw.data,
      });
    }
  };

  const lastPredictedConcursoRef = React.useRef<number | null>(null);

  // Fetch AI prediction based on the target contest
  const fetchAIPrediction = async (draw: LotofacilDraw = latestDraw, force: boolean = false) => {
    if (!force && lastPredictedConcursoRef.current === draw.concurso && aiPrediction) {
      setIsAILoading(false);
      return;
    }
    lastPredictedConcursoRef.current = draw.concurso;
    setIsAILoading(true);
    try {
      const response = await fetch('/api/ai/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          concurso: draw.concurso,
          dezenasAnterior: draw.dezenas,
          dezenasFixas: activeFilterConfig.dezenasFixas || [],
          dezenasExcluidas: activeFilterConfig.dezenasExcluidas || [],
          filtrosEstatisticos: activeFilterConfig,
          metaGarantia: '14_pontos',
          forceFresh: force,
        }),
      });

      if (response.ok) {
        const json = await response.json();
        if (json.success && json.data) {
          setAiPrediction(json.data);
          return;
        }
      }
      setAiPrediction(buildLogisticPredictionResponse(draw, activeFilterConfig));
    } catch (err) {
      console.warn('API backend unreachable, usando heurística avançada local:', err);
      setAiPrediction(buildLogisticPredictionResponse(draw, activeFilterConfig));
    } finally {
      setIsAILoading(false);
    }
  };

  // Run automatically on application mount (every time user opens the app)
  useEffect(() => {
    runAutoUpdate(false);
  }, []);

  const [conferenciaVolanteNumbers, setConferenciaVolanteNumbers] = useState<number[]>(latestDraw.dezenas);

  // Sync conference Volante with latestDraw
  useEffect(() => {
    if (latestDraw && latestDraw.dezenas) {
      setConferenciaVolanteNumbers(latestDraw.dezenas);
    }
  }, [latestDraw.concurso]);

  const handleToggleConferenciaNumber = (n: number) => {
    setConferenciaVolanteNumbers((prev) =>
      prev.includes(n) ? prev.filter((x) => x !== n) : prev.length < 15 ? [...prev, n].sort((a, b) => a - b) : prev
    );
  };

  const handleApplyAIRecsToFechamento = (numbers: number[]) => {
    if (numbers && numbers.length > 0) {
      setPendingFixedNumbers(numbers);
    }
    setActiveTab('fechamento');
  };

  const handleGoToSimulator = (tickets: GameTicket[]) => {
    setSavedTickets(tickets);
    setActiveTab('simulador');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Dev Server Health Check Alert Banner (Activates if server connection or assets fail) */}
      <DevServerHealthStatus showPillInHeader={false} />

      {/* Alerta Global Flutuante de Fechamento Salvo com Botão Ver Jogos Salvos */}
      <FechamentoSavedToastAlert />

      {/* Header with live synchronization controls */}
      <Header
        latestDraw={latestDraw}
        isSyncing={isSyncing}
        onSyncNow={handleManualSync}
        syncSource={syncSource}
        cyclePendingNumbers={dezenasPendentesCiclo}
        concursosNoCiclo={concursosNoCiclo}
        aiStatus={isAILoading ? 'loading' : 'ready'}
        onQuickOptimize={() => handleSelectStudioTab('fechamento')}
        onOpenBackup={() => setIsBackupModalOpen(true)}
        onOpenTour={() => setIsTourOpen(true)}
        titleAsSpan={publicRoute !== '/'}
      />

      {/* App Shell Layout: Sidebar Colapsável (Desktop) + Conteúdo Principal */}
      <div className="flex-1 flex w-full relative">
        {/* Desktop Sidebar Fina/Colapsável com os 4 Pilares */}
        <AppShellSidebar
          activeTab={activeTab}
          onTabChange={handleSelectStudioTab}
          savedTicketsCount={savedTickets.length}
          onOpenBackup={() => setIsBackupModalOpen(true)}
          onOpenTour={() => setIsTourOpen(true)}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={handleToggleSidebar}
        />

        {/* Main Content Area */}
        <main className="flex-1 min-w-0 max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-5 pb-24 md:pb-8 space-y-5">
          {/* Real-time Update Notification Banner */}
        {syncNotice && (
          <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-xl p-3 sm:px-4 flex items-center justify-between gap-3 text-xs shadow-md">
            <div className="flex items-center gap-2.5">
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <div className="text-slate-300">
                <strong className="text-white font-mono">
                  Concurso #{syncNotice.concurso} ({syncNotice.data})
                </strong>
                <span className="hidden sm:inline text-slate-400 ml-2">
                  — Dezenas sorteadas:{' '}
                  <span className="font-mono text-emerald-300 font-bold">
                    {latestDraw.dezenas.map((d) => d.toString().padStart(2, '0')).join(', ')}
                  </span>
                </span>
                <span className="text-emerald-400 text-[11px] ml-2 font-medium">
                  • {syncNotice.message}
                </span>
              </div>
            </div>

            <button
              onClick={() => setSyncNotice(null)}
              className="text-slate-400 hover:text-white p-1 rounded transition cursor-pointer"
              title="Fechar aviso"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Cycle Toast Notification Banner (Detects cycle closure or start of a new cycle) */}
        {cycleToast && (
          <div className="bg-gradient-to-r from-amber-950/60 via-slate-900 to-amber-950/60 border border-amber-500/40 rounded-xl p-3 sm:px-4 flex items-center justify-between gap-3 text-xs shadow-lg">
            <div className="flex items-center gap-2.5">
              <span className="p-1.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0">
                <Flame className="w-4 h-4 fill-amber-400" />
              </span>
              <div>
                <strong className="text-amber-300 font-bold block">{cycleToast.title}</strong>
                <span className="text-slate-300 text-[11px]">{cycleToast.description}</span>
              </div>
            </div>

            <button
              onClick={() => setCycleToast(null)}
              className="text-slate-400 hover:text-white p-1 rounded transition cursor-pointer shrink-0"
              title="Fechar notificação de ciclo"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Banner Comemorativo de 14 ou 15 Acertos Disparado Automaticamente */}
        {jackpotHitNotice && (
          <div className="bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 rounded-2xl p-4 text-slate-950 shadow-2xl border-2 border-yellow-300 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-slate-950 text-amber-400 rounded-2xl shadow-xl flex items-center justify-center shrink-0">
                <Award className="w-7 h-7" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="bg-slate-950 text-yellow-300 text-[10px] font-black uppercase px-2 py-0.5 rounded-full tracking-wider">
                    {jackpotHitNotice.maxHits === 15 ? '🔥 15 PONTOS - JACKPOT MÁXIMO!' : '⚡ 14 PONTOS CONFIRMADOS!'}
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-900">
                    Concurso Caixa #{jackpotHitNotice.concurso}
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-black tracking-tight mt-0.5">
                  Parabéns! Seu Jogo #{jackpotHitNotice.bestTicketIndex} cravou {jackpotHitNotice.maxHits} ACERTOS!
                </h3>
                <p className="text-xs font-medium text-slate-900/90">
                  {jackpotHitNotice.winningTicketsCount} bilhete(s) na faixa de premiação alta em 'Meus Jogos & Conferidor'.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <button
                onClick={() => {
                  setActiveTab('jogos');
                  setJackpotHitNotice(null);
                }}
                className="px-4 py-2 rounded-xl bg-slate-950 hover:bg-slate-900 text-yellow-300 font-black text-xs shadow-lg transition cursor-pointer flex items-center gap-2"
              >
                <span>Conferir em Meus Jogos</span>
                <CheckCircle2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setJackpotHitNotice(null)}
                className="p-2 rounded-xl bg-slate-950/20 hover:bg-slate-950/40 text-slate-950 transition cursor-pointer"
                title="Fechar notificação"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Alerta Visual Específico — Regra Personalizada de Prêmio Mínimo Estimado */}
        {customPrizeAlertNotice && (
          <div
            role="alert"
            aria-live="assertive"
            className={`rounded-2xl p-4 sm:p-5 shadow-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${
              customPrizeAlertNotice.alertStyle === 'emerald_banner'
                ? 'bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-950 border-emerald-400/70 text-white'
                : customPrizeAlertNotice.alertStyle === 'high_priority_modal'
                ? 'bg-gradient-to-r from-rose-950 via-amber-950/90 to-slate-950 border-amber-400 text-white ring-2 ring-amber-400/40'
                : 'bg-gradient-to-r from-amber-950 via-slate-900 to-yellow-950/90 border-amber-400/80 text-white'
            }`}
          >
            <div className="flex items-start sm:items-center gap-3.5 min-w-0">
              <div
                className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-lg ${
                  customPrizeAlertNotice.alertStyle === 'emerald_banner'
                    ? 'bg-emerald-400 text-slate-950'
                    : customPrizeAlertNotice.alertStyle === 'high_priority_modal'
                    ? 'bg-gradient-to-br from-amber-300 to-rose-400 text-slate-950'
                    : 'bg-amber-400 text-slate-950'
                }`}
              >
                <Trophy className="w-5 h-5" />
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] font-mono">
                  <span
                    className={`font-bold uppercase tracking-wider ${
                      customPrizeAlertNotice.alertStyle === 'emerald_banner'
                        ? 'text-emerald-300'
                        : 'text-amber-300'
                    }`}
                  >
                    Alerta de Prêmio Personalizado
                  </span>
                  <span className="text-slate-500">·</span>
                  <span className="text-slate-300">Concurso #{customPrizeAlertNotice.concurso}</span>
                  <span className="text-slate-500">·</span>
                  <span className="text-slate-400">{customPrizeAlertNotice.dataConcurso}</span>
                  {customPrizeAlertNotice.isSimulatedTest && (
                    <>
                      <span className="text-slate-500">·</span>
                      <span className="text-sky-300 font-semibold">Simulação de Teste</span>
                    </>
                  )}
                </div>

                <h3 className="text-sm sm:text-base font-bold text-white mt-0.5">
                  Prêmio estimado de{' '}
                  <span className="font-mono tabular-nums text-amber-300">
                    R${' '}
                    {customPrizeAlertNotice.premioEstimadoTotal.toLocaleString('pt-BR', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>{' '}
                  atingiu sua meta mínima (R${' '}
                  {customPrizeAlertNotice.minEstimatedPrizeBRL.toLocaleString('pt-BR', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                  )
                </h3>

                <p className="text-xs text-slate-300 mt-0.5 truncate">
                  {customPrizeAlertNotice.totalWinningTickets} bilhete(s) premiado(s) · Melhor:{' '}
                  <span className="font-mono font-bold text-white">
                    {customPrizeAlertNotice.maxHits} acertos
                  </span>{' '}
                  · {customPrizeAlertNotice.bestFechamentoTitle}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('jogos');
                  setCustomPrizeAlertNotice(null);
                }}
                className={`px-4 py-2 rounded-xl font-bold text-xs shadow-md transition cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                  customPrizeAlertNotice.alertStyle === 'emerald_banner'
                    ? 'bg-emerald-400 hover:bg-emerald-300 text-slate-950'
                    : 'bg-amber-400 hover:bg-amber-300 text-slate-950'
                }`}
              >
                <span>Ver Jogos Premiados</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setCustomPrizeAlertNotice(null)}
                className="p-2 text-slate-400 hover:text-white rounded-lg transition cursor-pointer"
                title="Fechar alerta de prêmio"
                aria-label="Fechar alerta de prêmio"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Banner de Auditoria Automática de Jogos Salvos via Service Worker */}
        {savedGamesAuditNotice && (
          <div className="bg-gradient-to-r from-emerald-950/90 via-slate-900 to-teal-950/90 border-2 border-emerald-500/70 rounded-2xl p-4 text-white shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-slate-950 font-black shrink-0 shadow-lg shadow-emerald-500/25">
                <Bell className="w-6 h-6 text-slate-950" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono">
                    PUSH SERVICE WORKER • CONCURSO #{savedGamesAuditNotice.concurso}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">({savedGamesAuditNotice.dataConcurso})</span>
                </div>
                <h3 className="text-sm sm:text-base font-bold text-white mt-0.5">
                  {savedGamesAuditNotice.totalWinningTickets > 0
                    ? `🎉 ${savedGamesAuditNotice.totalWinningTickets} bilhete(s) premiados! Melhor jogo obteve ${savedGamesAuditNotice.maxHits} acertos.`
                    : `Conferência automática concluída: ${savedGamesAuditNotice.totalBilhetesAvaliados} bilhetes conferidos (Melhor: ${savedGamesAuditNotice.maxHits} pts).`}
                </h3>
                <p className="text-xs text-slate-300">
                  {savedGamesAuditNotice.bestFechamentoTitle}
                  {savedGamesAuditNotice.premioEstimadoTotal > 0 && (
                    <span className="text-emerald-400 font-mono font-bold ml-2">
                      • Prêmio Estimado: R$ {savedGamesAuditNotice.premioEstimadoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => {
                  setActiveTab('jogos');
                  setSavedGamesAuditNotice(null);
                }}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-400 to-teal-400 text-slate-950 font-black text-xs shadow-md transition cursor-pointer hover:scale-105 active:scale-95 flex items-center gap-1.5"
              >
                <span>Ver Jogos Salvos</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => setSavedGamesAuditNotice(null)}
                className="p-2 text-slate-400 hover:text-white rounded-lg transition cursor-pointer"
                title="Fechar aviso"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Banner de Ativação de Notificações Nativas do Navegador (13+ Pontos) */}
        {nativePerm === 'default' && !dismissPermPrompt && (
          <div className="bg-gradient-to-r from-amber-950/70 via-slate-900 to-indigo-950/60 border border-amber-500/40 rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 shrink-0">
                <Bell className="w-4 h-4 animate-bounce" />
              </div>
              <div className="text-xs">
                <div className="font-bold text-amber-300 flex items-center gap-2">
                  <span>Ativar Alertas Nativos no Navegador (13+ Pontos)</span>
                  <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded border border-amber-500/30 font-mono">
                    2º PLANO
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 mt-0.5">
                  Receba avisos instantâneos com som e resumo do prêmio na área de trabalho mesmo se a aba estiver em segundo plano ou minimizada.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
              <button
                onClick={handleRequestNativePerm}
                className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition cursor-pointer shadow-md flex items-center gap-1.5"
              >
                <Bell className="w-3.5 h-3.5" />
                <span>Permitir Alertas</span>
              </button>
              <button
                onClick={() => setDismissPermPrompt(true)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                title="Ignorar"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Tab Viewport */}
        <ErrorBoundary fallbackTitle="LotoSniper • Módulo Ativo">
          {publicRoute !== '/' ? (
            <LegalInfoPages page={publicRoute} onNavigate={navigatePublicRoute} />
          ) : (
            <>
          {activeTab === 'fechamento' && (
            <FechamentoTab
              latestDraw={latestDraw}
              dynamicStats={dynamicStats}
              cyclePendingNumbers={dezenasPendentesCiclo}
              concursosNoCiclo={concursosNoCiclo}
              aiPrediction={aiPrediction}
              initialFixedNumbers={pendingFixedNumbers}
              onSaveTickets={(tickets, meta) => {
                setSavedTickets(normalizeGameTickets(tickets, latestDraw.dezenas));
                if (meta) {
                  setActiveFechamentoMeta(meta);
                  try {
                    localStorage.setItem('lotosniper_active_fechamento_meta', JSON.stringify(meta));
                  } catch {}
                }
              }}
              onGoToSimulator={handleGoToSimulator}
              onGoToGamesManager={(tickets, meta) => {
                if (tickets && tickets.length > 0) {
                  setSavedTickets(normalizeGameTickets(tickets, latestDraw.dezenas));
                }
                if (meta) {
                  setActiveFechamentoMeta(meta);
                  try {
                    localStorage.setItem('lotosniper_active_fechamento_meta', JSON.stringify(meta));
                  } catch {}
                }
                setActiveTab('jogos');
              }}
              isAILoading={isAILoading}
              activeFilterConfig={activeFilterConfig}
              onFiltersConfigChange={setActiveFilterConfig}
            />
          )}

          {activeTab === 'filtros' && (
            <FiltrosInteligentesTab
              filters={activeFilterConfig}
              onChangeFilters={setActiveFilterConfig}
              onResetFilters={resetToCanonicalFilters}
              latestDraw={latestDraw}
              aiPrediction={aiPrediction}
              onApplyToFechamento={() => setActiveTab('fechamento')}
            />
          )}

          {activeTab === 'conferencia' && (
            <div className="space-y-6">
              {/* Volante Oficial Interativo 5×5 */}
              <VolanteSelector
                selectedNumbers={conferenciaVolanteNumbers}
                fixedNumbers={[]}
                excludedNumbers={[]}
                statsList={dynamicStats}
                cyclePendingNumbers={dezenasPendentesCiclo}
                latestDraw={latestDraw}
                onToggleNumber={handleToggleConferenciaNumber}
                onSetFixed={() => {}}
                onSetExcluded={() => {}}
                onSelectSet={(nums) => setConferenciaVolanteNumbers(nums.slice(0, 15))}
                onClear={() => setConferenciaVolanteNumbers([])}
                targetCount={15}
              />

              {/* Módulo de Conferência Oficial de Jogos */}
              <ModuloConferenciaJogos
                latestDraw={latestDraw}
                generatedTickets={savedTickets}
                inspectedVolanteNumbers={conferenciaVolanteNumbers}
                onGoToFechamento={() => setActiveTab('fechamento')}
              />
            </div>
          )}

          {activeTab === 'ia_preditor' && (
            <AIPredictorTab
              latestDraw={latestDraw}
              dynamicStats={dynamicStats}
              cyclePendingNumbers={dezenasPendentesCiclo}
              prediction={aiPrediction}
              isLoading={isAILoading}
              activeFilterConfig={activeFilterConfig}
              onOpenFiltros={() => setActiveTab('filtros')}
              onRefreshPrediction={() => fetchAIPrediction(latestDraw, true)}
              onApplyRecommendation={handleApplyAIRecsToFechamento}
              onFixAnchors={(anchors) => {
                setPendingFixedNumbers(anchors);
                setActiveTab('fechamento');
              }}
            />
          )}

          {activeTab === 'estatisticas' && (
            <StatisticsTab
              latestDraw={latestDraw}
              statsList={dynamicStats}
              cyclePendingNumbers={dezenasPendentesCiclo}
              concursosNoCiclo={concursosNoCiclo}
              onApplyNumbers={handleApplyAIRecsToFechamento}
              savedTickets={savedTickets}
              fechamentoNome={activeFechamentoMeta?.modeName || activeFechamentoMeta?.strategyName}
              filters={activeFechamentoMeta?.filters || activeFilterConfig}
              aiPrediction={aiPrediction}
            />
          )}

          {activeTab === 'simulador' && (
            <SimulatorTab
              tickets={savedTickets}
              latestDraw={latestDraw}
              onGoToGenerator={() => setActiveTab('fechamento')}
              onGoToGamesManager={() => setActiveTab('jogos')}
            />
          )}

          {activeTab === 'jogos' && (
            <div className="space-y-4">
              {/* Seletor Segmentado Unificado: Jogos Salvos vs Conferidor Oficial */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 p-2.5 rounded-2xl shadow-xl">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setJogosSubView('salvos')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                      jogosSubView === 'salvos'
                        ? 'bg-gradient-to-r from-cyan-400 to-sky-500 text-slate-950 font-black shadow-lg shadow-cyan-500/20'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <Download className="w-4 h-4" />
                    <span>Fechamentos Salvos & Dossiê</span>
                    {savedTickets.length > 0 && (
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-md bg-slate-950/20 text-slate-950 font-black">
                        {savedTickets.length}
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setJogosSubView('conferencia')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                      jogosSubView === 'conferencia'
                        ? 'bg-gradient-to-r from-emerald-400 to-teal-500 text-slate-950 font-black shadow-lg shadow-emerald-500/20'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <ClipboardCheck className="w-4 h-4" />
                    <span>Conferidor Automático & Volante 5×5</span>
                  </button>
                </div>

                <div className="text-xs text-slate-400 hidden sm:flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="font-mono text-[11px]">Destaque 11 a 15 Acertos Caixa</span>
                </div>
              </div>

              {jogosSubView === 'salvos' ? (
                <div className="space-y-6">
                  <HistoricoFechamentosRecentes
                    latestDraw={latestDraw}
                    maxItems={5}
                    onApplyFilters={setActiveFilterConfig}
                    onGoToFechamento={() => setActiveTab('fechamento')}
                  />

                  <GamesManagerTab
                    savedTickets={savedTickets}
                    latestDraw={latestDraw}
                    fechamentoMeta={activeFechamentoMeta}
                    onClearTickets={() => {
                      setSavedTickets([]);
                      try {
                        localStorage.setItem('lotosniper_saved_tickets', '[]');
                      } catch {}
                    }}
                    onGoToGenerator={() => setActiveTab('fechamento')}
                  />
                </div>
              ) : (
                <div className="space-y-6">
                  <VolanteSelector
                    selectedNumbers={conferenciaVolanteNumbers}
                    fixedNumbers={[]}
                    excludedNumbers={[]}
                    statsList={dynamicStats}
                    cyclePendingNumbers={dezenasPendentesCiclo}
                    latestDraw={latestDraw}
                    onToggleNumber={handleToggleConferenciaNumber}
                    onSetFixed={() => {}}
                    onSetExcluded={() => {}}
                    onSelectSet={(nums) => setConferenciaVolanteNumbers(nums.slice(0, 15))}
                    onClear={() => setConferenciaVolanteNumbers([])}
                    targetCount={15}
                  />

                  <ModuloConferenciaJogos
                    latestDraw={latestDraw}
                    generatedTickets={savedTickets}
                    inspectedVolanteNumbers={conferenciaVolanteNumbers}
                    onGoToFechamento={() => setActiveTab('fechamento')}
                  />
                </div>
              )}
            </div>
          )}

          {activeTab === 'configuracoes' && (
            <SettingsTab
              latestDraw={latestDraw}
              savedTickets={savedTickets}
              onRestoreTickets={(t) => setSavedTickets(normalizeGameTickets(t, latestDraw.dezenas))}
              filters={activeFilterConfig}
              onRestoreFilters={setActiveFilterConfig}
              onGoToFechamento={() => setActiveTab('fechamento')}
              onSyncNow={() => runAutoUpdate(true)}
              isSyncing={isSyncing}
              statsList={dynamicStats}
              cyclePendingNumbers={dezenasPendentesCiclo}
              concursosNoCiclo={concursosNoCiclo}
            />
          )}

          {activeTab === 'heatmap' && (
            <HeatmapTab
              latestDraw={latestDraw}
              onSendToFechamento={(nums) => {
                try {
                  localStorage.setItem('lotosniper_selected_numbers', JSON.stringify(nums));
                } catch {}
                setActiveTab('fechamento');
              }}
            />
          )}

          {activeTab === 'hostinger' && <HostingerGuideTab />}
            </>
          )}
        </ErrorBoundary>
      </main>
    </div>

    {/* Mobile Bottom Navigation Bar Fixa (PWA) */}
    <AppShellMobileBottomNav
      activeTab={activeTab}
      onTabChange={handleSelectStudioTab}
      savedTicketsCount={savedTickets.length}
    />

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 py-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
          <div>
            <span className="font-black text-emerald-400 font-mono tracking-wider">LOTOSNIPER</span> — Precisão
            cirúrgica na Lotofácil • Concurso #{latestDraw.concurso} ({latestDraw.data}).
            <p className="text-[11px] text-slate-600 mt-0.5">
              Dados oficiais Caixa Econômica Federal. Fechamentos matemáticos com garantia de 14 pontos.
            </p>
          </div>

          <nav aria-label="Links institucionais e legais" className="flex flex-wrap items-center justify-center gap-4 text-[11px] text-slate-400">
            <a
              href="/sobre"
              onClick={(e) => {
                e.preventDefault();
                navigatePublicRoute('/sobre');
              }}
              className="hover:text-emerald-400 transition"
            >
              Sobre
            </a>
            <a
              href="/contato"
              onClick={(e) => {
                e.preventDefault();
                navigatePublicRoute('/contato');
              }}
              className="hover:text-emerald-400 transition"
            >
              Contato
            </a>
            <a
              href="/termos"
              onClick={(e) => {
                e.preventDefault();
                navigatePublicRoute('/termos');
              }}
              className="hover:text-emerald-400 transition"
            >
              Termos de Uso
            </a>
            <a
              href="/privacidade"
              onClick={(e) => {
                e.preventDefault();
                navigatePublicRoute('/privacidade');
              }}
              className="hover:text-emerald-400 transition"
            >
              Privacidade
            </a>
            <a
              href="mailto:contato@lotosniper.com.br"
              className="text-emerald-400 hover:text-emerald-300 font-mono transition"
            >
              contato@lotosniper.com.br
            </a>
          </nav>

          <div className="flex items-center gap-3 text-[11px] text-slate-400">
            <span>C(25,15) = 3.268.760 combinações</span>
            <span>•</span>
            <span className="text-emerald-400 font-semibold">Alvo 15 Pontos</span>
          </div>
        </div>
      </footer>

      {/* Interactive Guided Tour Modal */}
      <GuidedTourModal
        isOpen={isTourOpen}
        onClose={() => setIsTourOpen(false)}
        onNavigateTab={(tab) => handleSelectStudioTab(tab as TabType)}
      />

      {/* Central de Backup & Segurança de Dados (Download Forçado JSON, Snapshots & Drive) */}
      <BackupRestoreCenterModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
      />

      {/* Indicador de Funcionamento Offline PWA */}
      <OfflineIndicator />
    </div>
  );
}
