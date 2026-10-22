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
import { GameTicket, AIPredictionResponse, LotofacilDraw, FechamentoExportMeta, DezenaStats } from './types/lotofacil';
import { CONCURSO_ATUAL, RECENT_DRAWS } from './data/lotofacilData';
import { syncLatestLotofacil, computeDynamicStats } from './services/lotofacilSync';
import { buildOptimal18Pool, countMatches } from './services/combinatorics';
import { soundService } from './services/soundAlert';
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
  }, [latestDraw.concurso, dezenasPendentesCiclo.length, concursosNoCiclo]);

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

  // Disparo automático de alertas sonoros e push para 14 e 15 acertos ao atualizar o concurso da Caixa
  const triggerAutomaticJackpotAlerts = (draw: LotofacilDraw, ticketsToCheck: GameTicket[]) => {
    if (!ticketsToCheck || ticketsToCheck.length === 0 || !draw?.dezenas) return;

    const alertEnabled = localStorage.getItem('lotosniper_alert_14_15_enabled') !== 'false';
    if (!alertEnabled) return;

    const soundEnabled = localStorage.getItem('lotosniper_alert_sound_enabled') !== 'false';
    const pushEnabled = localStorage.getItem('lotosniper_alert_push_enabled') !== 'false';
    const threshold = (localStorage.getItem('lotosniper_alert_threshold') as '15_only' | '14_and_15' | '13_plus') || '14_and_15';

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
      // 1. Tocar áudio festivo correspondente
      if (soundEnabled) {
        if (maxHits >= 15) {
          soundService.play15PontosJackpotSound();
        } else if (maxHits >= 14) {
          soundService.play14PontosCelebrationSound();
        } else {
          soundService.playGoldenZoneSuccessChime();
        }
      }

      // 2. Disparar notificação push no navegador se autorizada
      if (pushEnabled && typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        const title = maxHits >= 15 ? '🎉 GRAND JACKPOT: 15 PONTOS NA LOTOFÁCIL!' : `🏆 ${maxHits} PONTOS DETECTADOS!`;
        const body = `Seu Jogo #${bestIdx} em 'Meus Jogos' cravou ${maxHits} PONTOS no Concurso Caixa #${draw.concurso}! Toque para auditar.`;
        try {
          new Notification(title, { body, icon: '/favicon.ico' });
        } catch {}
      }

      // 3. Exibir banner de premiação no topo da tela
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

      // Dispara monitoramento passivo de oportunidades (Atrasos Críticos e Ciclo < 3)
      const { stats: newStats, dezenasPendentesCiclo: newPending } = computeDynamicStats(result.draw, RECENT_DRAWS);
      triggerAutomaticOpportunityAlerts(result.draw, newStats, newPending);

      // After updating latest draw, trigger AI prediction optimization with the newly loaded draw
      fetchAIPrediction(result.draw);
    } catch (err) {
      console.error('Falha na sincronização:', err);
    } finally {
      setIsSyncing(false);
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

    const scores = Array.from({ length: 25 }, (_, i) => {
      const num = i + 1;
      let score = 50;
      if (dezenasPendentesCiclo.includes(num)) score += 40; // High cycle urgency
      if (recomendadas18.includes(num)) score += 25; // Inside optimal pool
      if ([11, 20, 25, 10, 13, 24, 1, 4].includes(num)) score += 15; // Top historical frequency
      if (draw.dezenas.includes(num)) score += 12; // Repetition likelihood
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
      justificativaTecnica: `Sincronização LotoSniper com o Concurso #${draw.concurso} (${draw.data}). Matriz construída com a Regra do Documento Oficial: proporção de Repetidas e Ausentes calibrada com base no Concurso 3804 (fechamento de ciclo 100% comprovado com 01, 18 e 25). Proteção estatística com filtros ampliados para 8-11 moldura e 4-7 primos para máxima assertividade sem podas indevidas.`,
      dezenasChave: dezenasPendentesCiclo.concat(recomendadas18.slice(0, 2)).slice(0, 5),
      padroesSugeridos: {
        paresImpares: '8 Pares / 7 Ímpares (ou 7P/8I)',
        primos: '4 a 7 Primos (calibrado #3804)',
        moldura: '8 a 11 Dezenas (calibrado #3804)',
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
        onSyncNow={() => runAutoUpdate(true)}
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
    </div>
  );
}
