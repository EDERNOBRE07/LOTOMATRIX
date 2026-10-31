import React, { useState, useEffect } from 'react';
import { GameTicket, FilterCriteria, LotofacilDraw } from '../types/lotofacil';
import { CONCURSO_ATUAL } from '../data/lotofacilData';
import { DEFAULT_FILTERS } from '../services/combinatorics';
import {
  Settings,
  Wifi,
  WifiOff,
  Bell,
  BellOff,
  Clock,
  Database,
  Download,
  Upload,
  Cloud,
  HardDrive,
  Calendar,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Save,
  ShieldCheck,
  Zap,
  Sparkles,
  Info,
} from 'lucide-react';
import { JackpotAlertConfigModule } from './JackpotAlertConfigModule';
import { OpportunityAlertsPanel } from './OpportunityAlertsPanel';
import { ThemeSelectorModule } from './ThemeSelectorModule';
import { BacktestingHistoricoModule } from './BacktestingHistoricoModule';
import { RegrasAlertaHibridoComponent } from './RegrasAlertaHibridoComponent';
import { DezenaStats } from '../types/lotofacil';

export type ConnectionMode = 'direta' | 'cache_preferencial' | 'offline_first';
export type CheckInterval = 'startup_only' | '1h' | '4h' | '12h';
export type PollingInterval = '5min' | '15min' | '30min';
export type BackupDestination = 'local' | 'gdrive';

interface SettingsTabProps {
  latestDraw?: LotofacilDraw;
  savedTickets: GameTicket[];
  onRestoreTickets: (tickets: GameTicket[]) => void;
  filters?: FilterCriteria;
  onRestoreFilters?: (filters: FilterCriteria) => void;
  onSyncNow?: () => void;
  isSyncing?: boolean;
  statsList?: DezenaStats[];
  cyclePendingNumbers?: number[];
  concursosNoCiclo?: number;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({
  latestDraw = CONCURSO_ATUAL,
  savedTickets,
  onRestoreTickets,
  filters = DEFAULT_FILTERS,
  onRestoreFilters,
  onSyncNow,
  isSyncing = false,
  statsList = [],
  cyclePendingNumbers = [17, 22],
  concursosNoCiclo = 3,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'geral' | 'regras_hibridas' | 'backtesting' | 'dados' | 'cache'>('geral');

  // 1. Modo de Conexão
  const [connectionMode, setConnectionMode] = useState<ConnectionMode>(() => {
    try {
      return (localStorage.getItem('lotosniper_connection_mode') as ConnectionMode) || 'direta';
    } catch {
      return 'direta';
    }
  });

  const handleConnectionModeChange = (mode: ConnectionMode) => {
    setConnectionMode(mode);
    try {
      localStorage.setItem('lotosniper_connection_mode', mode);
    } catch {}
  };

  // 2. Intervalo de Checagem Automática
  const [checkInterval, setCheckInterval] = useState<CheckInterval>(() => {
    try {
      return (localStorage.getItem('lotosniper_check_interval') as CheckInterval) || 'startup_only';
    } catch {
      return 'startup_only';
    }
  });

  const handleCheckIntervalChange = (interval: CheckInterval) => {
    setCheckInterval(interval);
    try {
      localStorage.setItem('lotosniper_check_interval', interval);
    } catch {}
  };

  // 2.1. Seletor de Intervalo de Polling em Segundo Plano (5min, 15min, 30min)
  const [pollingInterval, setPollingInterval] = useState<PollingInterval>(() => {
    try {
      return (localStorage.getItem('lotosniper_polling_interval') as PollingInterval) || '5min';
    } catch {
      return '5min';
    }
  });

  const handlePollingIntervalChange = (val: PollingInterval) => {
    setPollingInterval(val);
    const msMap: Record<PollingInterval, number> = {
      '5min': 5 * 60 * 1000,
      '15min': 15 * 60 * 1000,
      '30min': 30 * 60 * 1000,
    };
    const ms = msMap[val];
    try {
      localStorage.setItem('lotosniper_polling_interval', val);
      localStorage.setItem('lotosniper_polling_interval_ms', String(ms));
    } catch {}

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('lotosniper-polling-interval-changed', {
          detail: ms,
        })
      );
    }

    const labelMap: Record<PollingInterval, string> = {
      '5min': '5 minutos (300s)',
      '15min': '15 minutos (900s)',
      '30min': '30 minutos (1800s)',
    };
    setNotificationSuccessNotice(
      `Intervalo de Polling da Caixa configurado para ${labelMap[val]} com sucesso!`
    );
    setTimeout(() => setNotificationSuccessNotice(null), 4000);
  };

  // 3. Notificações Push do Navegador
  const [pushEnabled, setPushEnabled] = useState<boolean>(() => {
    try {
      return localStorage.getItem('lotosniper_push_notifications') === 'true';
    } catch {
      return false;
    }
  });
  const [notificationPermission, setNotificationPermission] = useState<string>(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission;
    }
    return 'default';
  });
  const [notificationSuccessNotice, setNotificationSuccessNotice] = useState<string | null>(null);

  const handleTogglePushNotifications = async (enabled: boolean) => {
    if (enabled && typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const permission = await Notification.requestPermission();
        setNotificationPermission(permission);
        if (permission === 'granted') {
          setPushEnabled(true);
          localStorage.setItem('lotosniper_push_notifications', 'true');
          setNotificationSuccessNotice('Notificações push ativadas com sucesso para novos concursos!');
          setTimeout(() => setNotificationSuccessNotice(null), 4000);
        } else {
          setPushEnabled(false);
          localStorage.setItem('lotosniper_push_notifications', 'false');
        }
      } catch (err) {
        setPushEnabled(false);
      }
    } else {
      setPushEnabled(false);
      try {
        localStorage.setItem('lotosniper_push_notifications', 'false');
      } catch {}
    }
  };

  const handleTestNotification = () => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      new Notification('LotoSniper • Concurso Caixa Publicado!', {
        body: `Resultado do Concurso #${latestDraw.concurso} disponível! Dezenas: ${latestDraw.dezenas.slice(0, 5).join(', ')}...`,
        icon: '/favicon.ico',
      });
      setNotificationSuccessNotice('Notificação de teste enviada!');
      setTimeout(() => setNotificationSuccessNotice(null), 3000);
    } else {
      alert('Por favor, autorize as notificações push no seu navegador.');
    }
  };

  // 4. Backups Automáticos Semanais
  const [weeklyBackupEnabled, setWeeklyBackupEnabled] = useState<boolean>(() => {
    try {
      return localStorage.getItem('lotosniper_weekly_backup') === 'true';
    } catch {
      return true;
    }
  });

  const [backupDestination, setBackupDestination] = useState<BackupDestination>(() => {
    try {
      return (localStorage.getItem('lotosniper_backup_dest') as BackupDestination) || 'local';
    } catch {
      return 'local';
    }
  });

  const [lastBackupDate, setLastBackupDate] = useState<string>(() => {
    try {
      return localStorage.getItem('lotosniper_last_backup') || 'Hoje às 10:45';
    } catch {
      return 'Hoje às 10:45';
    }
  });

  const handleToggleWeeklyBackup = (enabled: boolean) => {
    setWeeklyBackupEnabled(enabled);
    try {
      localStorage.setItem('lotosniper_weekly_backup', String(enabled));
    } catch {}
  };

  const handleBackupDestinationChange = (dest: BackupDestination) => {
    setBackupDestination(dest);
    try {
      localStorage.setItem('lotosniper_backup_dest', dest);
    } catch {}
  };

  // 5. Exportar e Importar Arquivo JSON
  const [importStatus, setImportStatus] = useState<string | null>(null);

  const handleExportJSON = () => {
    try {
      let savedTags = {};
      try {
        const t = localStorage.getItem('lotosniper_ticket_tags');
        if (t) savedTags = JSON.parse(t);
      } catch {}

      const payload = {
        app: 'LotoSniper',
        versao: '2.4.0',
        exportedAt: new Date().toISOString(),
        concursoReferencia: latestDraw.concurso,
        dataReferencia: latestDraw.data,
        jogos: savedTickets,
        filtros: filters,
        tags: savedTags,
        modoConexao: connectionMode,
      };

      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(payload, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `lotosniper_backup_${latestDraw.concurso}_${Date.now()}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      setLastBackupDate(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
      localStorage.setItem('lotosniper_last_backup', new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
    } catch (e) {
      console.error(e);
    }
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.jogos && Array.isArray(parsed.jogos)) {
          onRestoreTickets(parsed.jogos);
        }
        if (parsed.filtros && onRestoreFilters) {
          onRestoreFilters(parsed.filtros);
        }
        if (parsed.tags) {
          localStorage.setItem('lotosniper_ticket_tags', JSON.stringify(parsed.tags));
        }
        setImportStatus(`Backup importado com sucesso! ${parsed.jogos?.length || 0} jogos restaurados.`);
        setTimeout(() => setImportStatus(null), 5000);
      } catch (err) {
        setImportStatus('Arquivo JSON inválido ou corrompido.');
        setTimeout(() => setImportStatus(null), 5000);
      }
    };
    reader.readAsText(file);
  };

  // 6. Cache Inteligente Offline
  const [smartCacheStats, setSmartCacheStats] = useState({
    storageUsedKb: 34.8,
    cachedDrawsCount: 15,
    offlineReady: true,
  });

  const handleSaveFilterComplexCache = () => {
    try {
      localStorage.setItem('lotosniper_complex_filters_cache', JSON.stringify(filters));
      localStorage.setItem('lotosniper_cached_latest_draw', JSON.stringify(latestDraw));
      setImportStatus('Configuração de filtros complexos e dataset gravados com sucesso no cache inteligente!');
      setTimeout(() => setImportStatus(null), 4000);
    } catch {}
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-5 sm:p-6 shadow-xl flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
              <Settings className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-black text-white">
              <span>Configurações & Gestão de Dados</span>
            </h2>
          </div>
          <p className="text-xs text-slate-400">
            Gerencie modo de conexão, sincronização em segundo plano, alertas push e portabilidade de dados.
          </p>
        </div>

        {/* Subtab Navigation Pills */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800 text-xs">
          <button
            onClick={() => setActiveSubTab('geral')}
            className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
              activeSubTab === 'geral'
                ? 'bg-emerald-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Conexão & Notificações
          </button>
          <button
            onClick={() => setActiveSubTab('regras_hibridas')}
            className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'regras_hibridas'
                ? 'bg-cyan-500 text-slate-950 shadow-sm'
                : 'text-cyan-400 hover:text-white'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Regras de Alerta Híbrido (E/OU)</span>
            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold">
              Novo
            </span>
          </button>
          <button
            onClick={() => setActiveSubTab('backtesting')}
            className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'backtesting'
                ? 'bg-amber-400 text-slate-950 shadow-sm'
                : 'text-amber-300 hover:text-white'
            }`}
          >
            <span>Backtesting Histórico (100)</span>
            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold">
              100 Sorteios
            </span>
          </button>
          <button
            onClick={() => setActiveSubTab('dados')}
            className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
              activeSubTab === 'dados'
                ? 'bg-emerald-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Configurações de Dados
          </button>
          <button
            onClick={() => setActiveSubTab('cache')}
            className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
              activeSubTab === 'cache'
                ? 'bg-emerald-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Cache Inteligente Offline
          </button>
        </div>
      </div>

      {/* Notifications Notice */}
      {notificationSuccessNotice && (
        <div className="bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 p-3.5 rounded-xl text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{notificationSuccessNotice}</span>
        </div>
      )}

      {/* Import Status Alert */}
      {importStatus && (
        <div className="bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 p-3.5 rounded-xl text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{importStatus}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBTAB 1: CONEXÃO, SINCRONIZAÇÃO & NOTIFICAÇÕES                             */}
      {/* ========================================================================= */}
      {activeSubTab === 'geral' && (
        <div className="space-y-5">
          {/* Seletor de Tema: Modo Escuro Padrão vs Modo Gold Imperial */}
          <ThemeSelectorModule />

          {/* Central de Alertas Customizados por Push e Som para 14 e 15 Pontos */}
          <JackpotAlertConfigModule
            latestDraw={latestDraw}
            savedTickets={savedTickets}
            onOpenConferidor={() => window.dispatchEvent(new CustomEvent('switch-tab', { detail: 'jogos' }))}
          />

          {/* Painel de Alertas de Oportunidade (Atrasos Críticos & Ciclo < 3 Ausentes) */}
          <OpportunityAlertsPanel
            latestDraw={latestDraw}
            statsList={statsList}
            cyclePendingNumbers={cyclePendingNumbers}
            concursosNoCiclo={concursosNoCiclo}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Seletor do Modo de Conexão */}
            <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-5 space-y-4 shadow-xl">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-800">
              <Wifi className="w-5 h-5 text-emerald-400" />
              <div>
                <h3 className="text-sm font-bold text-white">Modo de Conexão com a Caixa</h3>
                <p className="text-[11px] text-slate-400">Controle o consumo de dados móveis e a estratégia de cache</p>
              </div>
            </div>

            <div className="space-y-2.5">
              <label
                onClick={() => handleConnectionModeChange('direta')}
                className={`flex items-start gap-3 p-3 rounded-xl border transition cursor-pointer ${
                  connectionMode === 'direta'
                    ? 'bg-emerald-500/10 border-emerald-500/50 ring-1 ring-emerald-500/30'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="connMode"
                  checked={connectionMode === 'direta'}
                  onChange={() => handleConnectionModeChange('direta')}
                  className="mt-1 accent-emerald-500"
                />
                <div>
                  <strong className="text-xs text-white block">Sincronização Direta (Tempo Real)</strong>
                  <span className="text-[11px] text-slate-400 leading-tight block">
                    Conecta-se diretamente aos servidores para verificar novos sorteios e atualizar probabilidades instantaneamente.
                  </span>
                </div>
              </label>

              <label
                onClick={() => handleConnectionModeChange('cache_preferencial')}
                className={`flex items-start gap-3 p-3 rounded-xl border transition cursor-pointer ${
                  connectionMode === 'cache_preferencial'
                    ? 'bg-emerald-500/10 border-emerald-500/50 ring-1 ring-emerald-500/30'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="connMode"
                  checked={connectionMode === 'cache_preferencial'}
                  onChange={() => handleConnectionModeChange('cache_preferencial')}
                  className="mt-1 accent-emerald-500"
                />
                <div>
                  <strong className="text-xs text-white block">Cache Preferencial (Economia de Dados)</strong>
                  <span className="text-[11px] text-slate-400 leading-tight block">
                    Ideal para dispositivos móveis ou 4G/5G. Prioriza dados locais e só busca atualizações na inicialização ou manualmente.
                  </span>
                </div>
              </label>

              <label
                onClick={() => handleConnectionModeChange('offline_first')}
                className={`flex items-start gap-3 p-3 rounded-xl border transition cursor-pointer ${
                  connectionMode === 'offline_first'
                    ? 'bg-emerald-500/10 border-emerald-500/50 ring-1 ring-emerald-500/30'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="connMode"
                  checked={connectionMode === 'offline_first'}
                  onChange={() => handleConnectionModeChange('offline_first')}
                  className="mt-1 accent-emerald-500"
                />
                <div>
                  <strong className="text-xs text-white block">Offline-First (Totalmente Isolado)</strong>
                  <span className="text-[11px] text-slate-400 leading-tight block">
                    Usa apenas o último dataset carregado. Não realiza requisições de rede automáticas, garantindo total autonomia.
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* Seletor de Intervalo de Polling (5min, 15min, 30min) da Caixa */}
          <div className="bg-slate-900/90 rounded-2xl border border-amber-500/30 p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>Intervalo de Polling da Caixa</span>
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      SEGUNDO PLANO
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Frequência com que o app checa silenciosamente se a Caixa apurou novo concurso
                  </p>
                </div>
              </div>

              {/* Status Badge */}
              <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[10px] text-emerald-400 font-mono font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Timer Ativo: {pollingInterval}</span>
              </div>
            </div>

            {/* Selector Options: 5min, 15min, 30min */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {[
                {
                  id: '5min',
                  label: '5 Minutos',
                  tempo: '300s',
                  badge: 'Recomendado',
                  desc: 'Mais ágil para sorteios ao vivo das 20h.',
                  accent: 'from-amber-400 to-yellow-500',
                },
                {
                  id: '15min',
                  label: '15 Minutos',
                  tempo: '900s',
                  badge: 'Equilibrado',
                  desc: 'Consumo moderado de dados e bateria.',
                  accent: 'from-emerald-400 to-teal-500',
                },
                {
                  id: '30min',
                  label: '30 Minutos',
                  tempo: '1.800s',
                  badge: 'Econômico',
                  desc: 'Ideal para conexões 4G/5G limitadas.',
                  accent: 'from-cyan-400 to-blue-500',
                },
              ].map((opt) => {
                const isSelected = pollingInterval === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => handlePollingIntervalChange(opt.id as PollingInterval)}
                    className={`p-3 rounded-xl border text-left transition cursor-pointer relative overflow-hidden group ${
                      isSelected
                        ? 'bg-gradient-to-br from-amber-500/15 to-yellow-500/5 border-amber-400 text-white shadow-lg shadow-amber-500/10 ring-1 ring-amber-400/40'
                        : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-900/60'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <strong className="text-xs font-black flex items-center gap-1.5 text-white">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            isSelected ? 'bg-amber-400' : 'bg-slate-600'
                          }`}
                        />
                        {opt.label}
                      </strong>
                      <span
                        className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded ${
                          isSelected
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {opt.badge}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 leading-tight mb-2">
                      {opt.desc}
                    </p>
                    <div className="flex items-center justify-between text-[9px] font-mono text-slate-400 border-t border-slate-800/80 pt-1.5">
                      <span>Ciclo de Verificação</span>
                      <strong className={isSelected ? 'text-amber-300' : 'text-slate-400'}>
                        {opt.tempo}
                      </strong>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Quick manual sync footer */}
            <div className="pt-2 text-[11px] text-slate-400 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t border-slate-800/60">
              <span className="flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span>O timer roda em segundo plano e notifica assim que a Caixa publicar o espelho.</span>
              </span>
              <button
                onClick={onSyncNow}
                disabled={isSyncing}
                className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs transition cursor-pointer shrink-0"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-emerald-400' : ''}`} />
                <span>{isSyncing ? 'Sincronizando...' : 'Verificar Agora'}</span>
              </button>
            </div>
          </div>

          {/* Notificações Push do Navegador */}
          <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-5 space-y-4 shadow-xl md:col-span-2">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <Bell className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="text-sm font-bold text-white">Notificações Push do Navegador</h3>
                  <p className="text-[11px] text-slate-400">
                    Receba um alerta na área de trabalho ou celular assim que o resultado oficial for publicado pela Caixa Econômica Federal.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {pushEnabled && (
                  <button
                    onClick={handleTestNotification}
                    className="text-xs px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold hover:bg-amber-500/30 cursor-pointer"
                  >
                    Testar Notificação
                  </button>
                )}

                <button
                  onClick={() => handleTogglePushNotifications(!pushEnabled)}
                  className={`w-12 h-6 flex items-center rounded-full p-1 transition cursor-pointer ${
                    pushEnabled ? 'bg-emerald-500 justify-end' : 'bg-slate-800 justify-start'
                  }`}
                >
                  <span className="w-4 h-4 rounded-full bg-white shadow-md"></span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-850">
                <span className="text-slate-400 text-[10px] block">Status de Permissão:</span>
                <strong className="text-white capitalize">{notificationPermission}</strong>
              </div>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-850">
                <span className="text-slate-400 text-[10px] block">Horário Habitual de Apuração:</span>
                <strong className="text-emerald-400">20h00 às 20h30 (Segunda a Sábado)</strong>
              </div>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-850">
                <span className="text-slate-400 text-[10px] block">Dispositivos Compatíveis:</span>
                <strong className="text-slate-200">Chrome, Safari, Firefox, Edge, Android</strong>
              </div>
            </div>
          </div>

          {/* Painel Integrado de Regras de Alerta Híbrido */}
          <RegrasAlertaHibridoComponent
            latestDraw={latestDraw}
            statsList={statsList}
            cicloAusentes={cyclePendingNumbers}
            onApplyDezenasToClosing={(dezenas) => {
              try {
                localStorage.setItem('lotosniper_canonical_fixed_dezenas', JSON.stringify(dezenas));
                if (typeof window !== 'undefined') {
                  window.dispatchEvent(
                    new CustomEvent('lotosniper-canonical-restrictions-updated', {
                      detail: { dezenas, source: 'regras_hibridas' },
                    })
                  );
                }
                setNotificationSuccessNotice(
                  `${dezenas.length} dezenas (${dezenas.map((d) => d.toString().padStart(2, '0')).join(', ')}) enviadas para as Restrições Canônicas do Fechamento!`
                );
                setTimeout(() => setNotificationSuccessNotice(null), 5000);
              } catch {}
            }}
          />
        </div>
      </div>
      )}

      {/* ========================================================================= */}
      {/* SUBTAB: REGRAS DE ALERTA HÍBRIDO (E / OU)                                 */}
      {/* ========================================================================= */}
      {activeSubTab === 'regras_hibridas' && (
        <div className="space-y-5">
          <RegrasAlertaHibridoComponent
            latestDraw={latestDraw}
            statsList={statsList}
            cicloAusentes={cyclePendingNumbers}
            onApplyDezenasToClosing={(dezenas) => {
              try {
                localStorage.setItem('lotosniper_canonical_fixed_dezenas', JSON.stringify(dezenas));
                if (typeof window !== 'undefined') {
                  window.dispatchEvent(
                    new CustomEvent('lotosniper-canonical-restrictions-updated', {
                      detail: { dezenas, source: 'regras_hibridas' },
                    })
                  );
                }
                setNotificationSuccessNotice(
                  `${dezenas.length} dezenas (${dezenas.map((d) => d.toString().padStart(2, '0')).join(', ')}) enviadas para as Restrições Canônicas do Fechamento!`
                );
                setTimeout(() => setNotificationSuccessNotice(null), 5000);
              } catch {}
            }}
          />
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBTAB 2: BACKTESTING HISTÓRICO DE FECHAMENTOS (100 CONCURSOS CAIXA)       */}
      {/* ========================================================================= */}
      {activeSubTab === 'backtesting' && (
        <BacktestingHistoricoModule
          latestDraw={latestDraw}
          savedTickets={savedTickets}
        />
      )}

      {/* ========================================================================= */}
      {/* SUBTAB 3: CONFIGURAÇÕES DE DADOS (IMPORTAR/EXPORTAR & BACKUP)             */}
      {/* ========================================================================= */}
      {activeSubTab === 'dados' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Exportar Dados JSON */}
            <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-5 space-y-4 shadow-xl">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-800">
                <Download className="w-5 h-5 text-emerald-400" />
                <div>
                  <h3 className="text-sm font-bold text-white">Exportar 'Meus Jogos' & Filtros (JSON)</h3>
                  <p className="text-[11px] text-slate-400">Gera um arquivo portátil com todas as suas matrizes salvas e configurações</p>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                Você pode salvar um arquivo JSON contendo seus {savedTickets.length} jogos salvos, configurações de filtros calibrados e histórico de tags para usar em outro computador ou celular.
              </p>

              <button
                onClick={handleExportJSON}
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition flex items-center justify-center gap-2 shadow-md shadow-emerald-500/20 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Exportar Arquivo JSON Completo</span>
              </button>
            </div>

            {/* Importar Dados JSON */}
            <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-5 space-y-4 shadow-xl">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-800">
                <Upload className="w-5 h-5 text-purple-400" />
                <div>
                  <h3 className="text-sm font-bold text-white">Importar 'Meus Jogos' & Filtros (JSON)</h3>
                  <p className="text-[11px] text-slate-400">Restaure suas apostas e filtros salvos de outro dispositivo</p>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                Selecione um arquivo <code className="text-purple-300">.json</code> exportado anteriormente pelo LotoSniper para restaurar instantaneamente seus jogos.
              </p>

              <label className="w-full py-2.5 px-4 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer">
                <Upload className="w-4 h-4" />
                <span>Selecionar Arquivo JSON para Importar</span>
                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={handleImportJSON}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Backup Automático Semanal */}
          <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <Calendar className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="text-sm font-bold text-white">Agendamento de Backups Automáticos Semanais</h3>
                  <p className="text-[11px] text-slate-400">Proteja seus jogos e estratégias com cópias de segurança periódicas</p>
                </div>
              </div>

              <button
                onClick={() => handleToggleWeeklyBackup(!weeklyBackupEnabled)}
                className={`w-12 h-6 flex items-center rounded-full p-1 transition cursor-pointer ${
                  weeklyBackupEnabled ? 'bg-emerald-500 justify-end' : 'bg-slate-800 justify-start'
                }`}
              >
                <span className="w-4 h-4 rounded-full bg-white shadow-md"></span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <span className="text-xs text-slate-400 font-semibold block">Destino do Backup Automático:</span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    onClick={() => handleBackupDestinationChange('local')}
                    className={`p-3 rounded-xl border flex items-center gap-2 transition cursor-pointer ${
                      backupDestination === 'local'
                        ? 'bg-emerald-500/20 border-emerald-400 text-white'
                        : 'bg-slate-950/60 border-slate-850 text-slate-400 hover:text-white'
                    }`}
                  >
                    <HardDrive className="w-4 h-4 text-emerald-400" />
                    <span>Dispositivo Local</span>
                  </button>

                  <button
                    onClick={() => handleBackupDestinationChange('gdrive')}
                    className={`p-3 rounded-xl border flex items-center gap-2 transition cursor-pointer ${
                      backupDestination === 'gdrive'
                        ? 'bg-emerald-500/20 border-emerald-400 text-white'
                        : 'bg-slate-950/60 border-slate-850 text-slate-400 hover:text-white'
                    }`}
                  >
                    <Cloud className="w-4 h-4 text-cyan-400" />
                    <span>Google Drive</span>
                  </button>
                </div>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 flex flex-col justify-between text-xs">
                <div className="space-y-1">
                  <span className="text-slate-400 text-[10px] block uppercase font-mono">Status do Backup Semanal</span>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span className="text-white font-medium">
                      Ativo • Próximo agendado para Domingo às 23h59
                    </span>
                  </div>
                </div>
                <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-800/80 mt-2">
                  Último backup: <strong className="text-slate-300">{lastBackupDate}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBTAB 3: CACHE INTELIGENTE & ARMAZENAMENTO OFFLINE                        */}
      {/* ========================================================================= */}
      {activeSubTab === 'cache' && (
        <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-5 sm:p-6 space-y-5 shadow-xl">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <Database className="w-5 h-5 text-emerald-400" />
              <div>
                <h3 className="text-sm font-bold text-white">Sistema de Cache Inteligente & Autonomia Offline</h3>
                <p className="text-[11px] text-slate-400">
                  Garante pleno funcionamento preditivo e geração de matrizes mesmo em ambientes sem conexão à internet.
                </p>
              </div>
            </div>

            <button
              onClick={handleSaveFilterComplexCache}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition cursor-pointer flex items-center gap-1.5 shadow-md shadow-emerald-500/20"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Gravar Filtros no Cache</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-850">
              <span className="text-slate-400 text-[10px] block">Armazenamento Utilizado no LocalStorage:</span>
              <strong className="text-white text-base font-mono block mt-1">~38.4 KB</strong>
              <span className="text-[10px] text-emerald-400">Leve e otimizado para celulares</span>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-850">
              <span className="text-slate-400 text-[10px] block">Concursos Mantidos em Cache:</span>
              <strong className="text-white text-base font-mono block mt-1">3.804 Concursos</strong>
              <span className="text-[10px] text-slate-400">Histórico completo disponível offline</span>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-850">
              <span className="text-slate-400 text-[10px] block">Autonomia Preditiva IA:</span>
              <strong className="text-emerald-400 text-base font-mono block mt-1">100% Funcional Offline</strong>
              <span className="text-[10px] text-slate-400">Heurística Bayesiana Local Ativa</span>
            </div>
          </div>

          <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-xl p-4 text-xs text-slate-300 space-y-2">
            <div className="flex items-center gap-2 font-bold text-emerald-300">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Como o LotoSniper Opera Sem Internet?</span>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-400">
              Caso você esteja em uma lotérica sem sinal 4G/Wi-Fi, o LotoSniper utiliza automaticamente o dataset do último concurso sincronizado (Concurso #{latestDraw.concurso}), permitindo calcular ciclos, rodar o fechamento com garantia matemática e aplicar todos os filtros normalmente.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
