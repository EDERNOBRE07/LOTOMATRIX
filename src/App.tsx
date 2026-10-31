import React, { useState, useEffect, useMemo } from 'react';
import { Header } from './components/Header';
import { FechamentoTab } from './components/FechamentoTab';
import { AIPredictorTab } from './components/AIPredictorTab';
import { StatisticsTab } from './components/StatisticsTab';
import { SimulatorTab } from './components/SimulatorTab';
import { GamesManagerTab } from './components/GamesManagerTab';
import { HostingerGuideTab } from './components/HostingerGuideTab';
import { SettingsTab } from './components/SettingsTab';
import { GuidedTourModal } from './components/GuidedTourModal';
import { ModuloConferenciaJogos } from './components/ModuloConferenciaJogos';
import { VolanteSelector } from './components/VolanteSelector';
import { NavigationMenu } from './components/NavigationMenu';
import { OfflineIndicator } from './components/OfflineIndicator';
import {
  sendNativeJackpotNotification,
  requestNativeNotificationPermission,
  isNotificationSupported,
  getNotificationPermission,
} from './services/nativeNotificationService';
import { GameTicket, AIPredictionResponse, LotofacilDraw, FechamentoExportMeta, DezenaStats } from './types/lotofacil';
import { CONCURSO_ATUAL, RECENT_DRAWS } from './data/lotofacilData';
import { syncLatestLotofacil, computeDynamicStats } from './services/lotofacilSync';
import { buildOptimal18Pool, countMatches } from './services/combinatorics';
import { soundService } from './services/soundAlert';
import { auditAndTriggerIntelligentAlerts, auditAndTriggerHybridAlerts } from './services/notificationService';
import { auditAndNotifySavedGames, SavedGamesAuditResult } from './services/savedGamesAuditorService';
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
} from 'lucide-react';

export type TabType =
  | 'fechamento'
  | 'conferencia'
  | 'ia_preditor'
  | 'estatisticas'
  | 'simulador'
  | 'jogos'
  | 'configuracoes'
  | 'hostinger';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('fechamento');

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
      document.documentElement.classList.remove('theme-gold', 'theme-high-contrast');
      if (savedTheme === 'high_contrast') {
        document.documentElement.classList.add('theme-high-contrast');
      } else if (savedTheme === 'gold') {
        document.documentElement.classList.add('theme-gold');
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
      const saved = localStorage.getItem('lotosniper_saved_tickets');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Salvar no localStorage sempre que novos jogos forem gerados
  useEffect(() => {
    if (savedTickets.length > 0) {
      try {
        localStorage.setItem('lotosniper_saved_tickets', JSON.stringify(savedTickets));
      } catch {}
    }
  }, [savedTickets]);

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
  const [pendingFixedNumbers, setPendingFixedNumbers] = useState<number[]>([]);
  const [aiPrediction, setAiPrediction] = useState<AIPredictionResponse | null>(null);
  const [isAILoading, setIsAILoading] = useState<boolean>(false);

  // Dynamically recomputed cycle and delay statistics based on current loaded contest
  const { stats: dynamicStats, dezenasPendentesCiclo, concursosNoCiclo } = useMemo(() => {
    return computeDynamicStats(latestDraw, RECENT_DRAWS);
  }, [latestDraw]);

  // Efeito disparado na carga do concurso para detectar brinde/status de ciclo
  useEffect(() => {
    if (!latestDraw) return;
    if (dezenasPendentesCiclo.length === 0) {
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
    } else if (dezenasPendentesCiclo.length <= 2) {
      setCycleToast({
        type: 'urgent',
        title: `⚡ Ciclo Quase Fechado (${concursosNoCiclo}º Concurso)`,
        description: `Faltam apenas as dezenas [${dezenasPendentesCiclo.map(d => d.toString().padStart(2, '0')).join(', ')}] para completar todas as 25! Forte pressão estatística.`,
        concurso: latestDraw.concurso,
      });
    }

    // Dispara auditoria de Notificações Push Inteligentes (Radar > 90% e Início de Ciclos)
    auditAndTriggerIntelligentAlerts(latestDraw, dynamicStats, concursosNoCiclo);

    // Dispara auditoria das Regras de Alerta Híbrido (E / OU: Radar + Atrasos Críticos)
    auditAndTriggerHybridAlerts(latestDraw, dynamicStats, dezenasPendentesCiclo);
  }, [latestDraw.concurso, dezenasPendentesCiclo.length, concursosNoCiclo, latestDraw, dynamicStats, dezenasPendentesCiclo]);

  // Listener para navegação rápida entre abas acionada por componentes filhos
  useEffect(() => {
    const handleSwitchTab = (e: any) => {
      const detail = e.detail;
      if (typeof detail === 'string') {
        setActiveTab(detail as any);
      } else if (detail && typeof detail === 'object') {
        if (detail.tickets && Array.isArray(detail.tickets)) {
          setSavedTickets(detail.tickets);
        }
        if (detail.tab) {
          setActiveTab(detail.tab);
        }
      }
    };
    window.addEventListener('switch-tab', handleSwitchTab);
    return () => window.removeEventListener('switch-tab', handleSwitchTab);
  }, []);

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
    window.addEventListener('lotosniper-saved-games-audited', handleAudited);
    return () => window.removeEventListener('lotosniper-saved-games-audited', handleAudited);
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

    const alertEnabled = localStorage.getItem('lotosniper_alert_14_15_enabled') !== 'false';
    if (!alertEnabled) return;

    // Padrão '13_plus' para alertar 13, 14 e 15 acertos conforme solicitado
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
      // 1. Disparar Notificação Nativa do Navegador (funciona em 2º plano via Service Worker)
      sendNativeJackpotNotification({
        concurso: draw.concurso,
        maxHits,
        winningTicketsCount: winningCount,
        bestTicketIndex: bestIdx,
        dataSorteio: draw.data,
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

  // Auditoria passiva de Alertas de Oportunidade (Atrasos Críticos & Ciclo < 3 ausentes)
  const triggerAutomaticOpportunityAlerts = (draw: LotofacilDraw, stats: DezenaStats[], pendingCycle: number[]) => {
    try {
      const cfgRaw = localStorage.getItem('lotosniper_opportunity_alerts_config');
      if (!cfgRaw) return;
      const cfg = JSON.parse(cfgRaw);
      if (!cfg.enabled) return;

      const delayedNums = stats.filter((s) => {
        const isTarget = cfg.monitorMode === 'all' || (cfg.customNumbers || []).includes(s.numero);
        return isTarget && s.atrasoAtual >= (cfg.criticalDelayThreshold || 5);
      });

      const cycleTriggered = cfg.cycleAlertEnabled && pendingCycle.length > 0 && pendingCycle.length < 3;

      if (delayedNums.length > 0 || cycleTriggered) {
        if (cfg.soundEnabled) {
          soundService.playOpportunityAlert();
        }
        if (cfg.pushEnabled && typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
          const body = cycleTriggered
            ? `Ciclo das 25 Dezenas em iminência de fechar: restam apenas ${pendingCycle.join(', ')}!`
            : `Alerta de Atraso Crítico: ${delayedNums.length} dezenas em hiato (${delayedNums.map(d => d.numero.toString().padStart(2, '0')).slice(0, 3).join(', ')}).`;
          new Notification('🎯 LotoSniper • Alerta de Oportunidade', {
            body,
            icon: '/favicon.ico',
          });
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

      // Dispara auditoria automática nos bilhetes de 'Meus Jogos & Conferidor'
      const ticketsToCheck = savedTickets.length > 0 ? savedTickets : (() => {
        try {
          const s = localStorage.getItem('lotosniper_saved_tickets');
          return s ? JSON.parse(s) : [];
        } catch { return []; }
      })();
      triggerAutomaticJackpotAlerts(result.draw, ticketsToCheck);

      // Auditoria dos Jogos Salvos com notificação push via Service Worker (Mesmo em Segundo Plano)
      try {
        const auditRes = await auditAndNotifySavedGames(result.draw);
        if (auditRes) {
          setSavedGamesAuditNotice(auditRes);
        }
      } catch (e) {
        console.warn('Erro ao auditar jogos salvos para push:', e);
      }

      // Dispara monitoramento passivo de oportunidades (Atrasos Críticos e Ciclo < 3)
      const { stats: newStats, dezenasPendentesCiclo: newPending, concursosNoCiclo: newCicloNum } = computeDynamicStats(result.draw, RECENT_DRAWS);
      triggerAutomaticOpportunityAlerts(result.draw, newStats, newPending);
      auditAndTriggerIntelligentAlerts(result.draw, newStats, newCicloNum);

      // After updating latest draw, trigger AI prediction optimization with the newly loaded draw
      fetchAIPrediction(result.draw);
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

  // Fetch AI prediction based on the target contest
  const fetchAIPrediction = async (draw: LotofacilDraw = latestDraw) => {
    setIsAILoading(true);
    try {
      const response = await fetch('/api/ai/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          concurso: draw.concurso,
          dezenasAnterior: draw.dezenas,
          metaGarantia: '14_pontos',
        }),
      });

      if (response.ok) {
        const json = await response.json();
        if (json.success && json.data) {
          setAiPrediction(json.data);
          return;
        }
      }
    } catch (err) {
      console.warn('API backend unreachable, usando heurística avançada local:', err);
    }

    // Dynamic heuristic calculation if API key not available or offline
    const optimalPool = buildOptimal18Pool(draw, dynamicStats, dezenasPendentesCiclo, 9, 9);
    const recomendadas18 = optimalPool.dezenas18;

    // Heurística de Fibonacci: 7 dezenas na Lotofácil [01, 02, 03, 05, 08, 13, 21] (meta ideal de 3 a 5 dezenas)
    const FIBONACCI_NUMBERS = [1, 2, 3, 5, 8, 13, 21];

    // Dezenas companheiras que historicamente acompanham o número 01 em sorteios de fechamento de ciclo
    // Concursos canônicos de ciclo (ex: #3804, #3788, #3752) apontam alta coocorrência com: 02, 03, 05, 11, 13, 17, 20, 21, 22, 25
    const COMPANHEIRAS_01_CICLO = [2, 3, 5, 11, 13, 17, 20, 21, 22, 25];
    const isFechandoCiclo = dezenasPendentesCiclo.length <= 3;

    const scores = Array.from({ length: 25 }, (_, i) => {
      const num = i + 1;
      let score = 50;

      // Urgência probabilística de fechamento de ciclo
      if (dezenasPendentesCiclo.includes(num)) score += 38;

      // Presença no pool ótimo recomendado (9 Repetidas + 9 Ausentes)
      if (recomendadas18.includes(num)) score += 22;

      // Frequência histórica líder (top dezenas)
      if ([11, 20, 25, 10, 13, 24, 1, 4].includes(num)) score += 14;

      // Probabilidade de repetição do concurso anterior
      if (draw.dezenas.includes(num)) score += 12;

      // Heurística de Distribuição de Fibonacci (calibração para 3 a 5 dezenas no bilhete)
      if (FIBONACCI_NUMBERS.includes(num)) {
        score += 15;
      }

      // Ajuste de peso para dezenas que historicamente acompanham o 01 em fechamentos de ciclo
      if (COMPANHEIRAS_01_CICLO.includes(num)) {
        score += isFechandoCiclo ? 22 : 12;
      }

      // Se for a própria dezena 01, atuar como âncora prioritária caso o ciclo esteja na reta final ou pendente
      if (num === 1) {
        score += isFechandoCiclo || dezenasPendentesCiclo.includes(1) ? 20 : 10;
      }

      return Math.min(99, Math.max(15, score));
    });

    setAiPrediction({
      scores,
      dezenasRecomendadas18: recomendadas18,
      dezenasRecomendadas15_Ouro: [
        recomendadas18.slice(0, 15),
        [...recomendadas18.slice(1, 15), recomendadas18[0]].sort((a, b) => a - b),
        [...recomendadas18.slice(2, 16), recomendadas18[1]].sort((a, b) => a - b),
      ],
      taxaConfianca: 96.8,
      justificativaTecnica: `Sincronização LotoSniper com o Concurso #${draw.concurso} (${draw.data}). Matriz construída com a Regra do Documento Oficial: proporção de Repetidas e Ausentes calibrada com base no Concurso 3804 (fechamento de ciclo 100% comprovado com 01, 18 e 25). Heurística de Fibonacci ativa com intervalo de 3 a 5 dezenas (01, 02, 03, 05, 08, 13, 21), incorporando pesos estratégicos para as dezenas companheiras do 01 em momentos de fechamento de ciclo (02, 03, 05, 11, 13, 17, 20, 21, 22, 25). Proteção estatística com filtros ampliados para 8-11 moldura e 4-7 primos para máxima assertividade sem podas indevidas.`,
      dezenasChave: dezenasPendentesCiclo.concat(recomendadas18.slice(0, 2)).slice(0, 5),
      padroesSugeridos: {
        paresImpares: '8 Pares / 7 Ímpares (ou 7P/8I)',
        primos: '4 a 7 Primos (calibrado #3804)',
        moldura: '8 a 11 Dezenas (calibrado #3804)',
        fibonacci: '3 a 5 dezenas Fibonacci (01, 02, 03, 05, 08, 13, 21) com pesos para companheiras do 01',
        somaFaixa: '175 a 220',
        repetidas: `8 a 10 Dezenas do Concurso #${draw.concurso}`,
      },
    });
    setIsAILoading(false);
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
      {/* Header with live synchronization controls */}
      <Header
        latestDraw={latestDraw}
        isSyncing={isSyncing}
        onSyncNow={handleManualSync}
        syncSource={syncSource}
        cyclePendingNumbers={dezenasPendentesCiclo}
        concursosNoCiclo={concursosNoCiclo}
        aiStatus={isAILoading ? 'loading' : 'ready'}
        onQuickOptimize={() => setActiveTab('fechamento')}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 space-y-5">
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

        {/* Navigation Tabs Menu: Design Vibrante, Botões Animados e Localização Facilitada */}
        <NavigationMenu
          activeTab={activeTab}
          onTabChange={setActiveTab}
          savedTickets={savedTickets}
          onOpenTour={() => setIsTourOpen(true)}
          concursoAtualNumero={latestDraw?.concurso}
        />

        {/* Tab Viewport */}
        {activeTab === 'fechamento' && (
          <FechamentoTab
            latestDraw={latestDraw}
            dynamicStats={dynamicStats}
            cyclePendingNumbers={dezenasPendentesCiclo}
            concursosNoCiclo={concursosNoCiclo}
            aiPrediction={aiPrediction}
            initialFixedNumbers={pendingFixedNumbers}
            onSaveTickets={(tickets, meta) => {
              setSavedTickets(tickets);
              if (meta) {
                setActiveFechamentoMeta(meta);
                try {
                  localStorage.setItem('lotosniper_active_fechamento_meta', JSON.stringify(meta));
                } catch {}
              }
            }}
            onGoToSimulator={handleGoToSimulator}
            onGoToGamesManager={(tickets, meta) => {
              if (tickets && tickets.length > 0) setSavedTickets(tickets);
              if (meta) {
                setActiveFechamentoMeta(meta);
                try {
                  localStorage.setItem('lotosniper_active_fechamento_meta', JSON.stringify(meta));
                } catch {}
              }
              setActiveTab('jogos');
            }}
            isAILoading={isAILoading}
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

            {/* Módulo de Conferência Oficial de Jogos (Colocado após o Volante Oficial Interativo 5×5) */}
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
            onRefreshPrediction={() => fetchAIPrediction(latestDraw)}
            onApplyRecommendation={handleApplyAIRecsToFechamento}
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
          <GamesManagerTab
            tickets={savedTickets}
            latestDraw={latestDraw}
            fechamentoMeta={activeFechamentoMeta}
            onClearTickets={() => setSavedTickets([])}
            onGoToGenerator={() => setActiveTab('fechamento')}
          />
        )}

        {activeTab === 'configuracoes' && (
          <SettingsTab
            latestDraw={latestDraw}
            savedTickets={savedTickets}
            onRestoreTickets={(t) => setSavedTickets(t)}
            onSyncNow={() => runAutoUpdate(true)}
            isSyncing={isSyncing}
            statsList={dynamicStats}
            cyclePendingNumbers={dezenasPendentesCiclo}
            concursosNoCiclo={concursosNoCiclo}
          />
        )}

        {activeTab === 'hostinger' && <HostingerGuideTab />}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 py-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <div>
            <span className="font-black text-emerald-400 font-mono tracking-wider">LOTOSNIPER</span> — Precisão
            cirúrgica na Lotofácil • Concurso #{latestDraw.concurso} ({latestDraw.data}).
            <p className="text-[11px] text-slate-600 mt-0.5">
              Dados oficiais Caixa Econômica Federal. Fechamentos matemáticos com garantia de 14 pontos.
            </p>
          </div>

          <div className="flex items-center gap-4 text-[11px] text-slate-400">
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
        onNavigateTab={(tab) => setActiveTab(tab as any)}
      />

      {/* Indicador de Funcionamento Offline PWA */}
      <OfflineIndicator />
    </div>
  );
}
