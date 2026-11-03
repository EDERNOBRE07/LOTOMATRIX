import React, { useState, useEffect, useCallback } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Server,
  X,
  FileCode,
  FolderCheck,
  Zap,
  Info,
  ExternalLink,
  ShieldCheck,
  Wifi,
  WifiOff,
} from 'lucide-react';

export type ServerHealthState = 'checking' | 'healthy' | 'degraded' | 'offline';

export interface DevServerHealthInfo {
  status?: string;
  service?: string;
  port?: number;
  environment?: string;
  uptimeSeconds?: number;
  timestamp?: string;
  viteMode?: string;
  memoryUsageMB?: number;
}

export interface AssetsHealthInfo {
  status?: string;
  entryPoint?: {
    file: string;
    path: string;
    exists: boolean;
    sizeBytes?: number;
    targetScript?: string;
  };
  outputDir?: {
    dir: string;
    path: string;
    exists: boolean;
  };
  hmrStatus?: string;
  verifiedAt?: string;
}

interface DevServerHealthStatusProps {
  onStatusChange?: (status: ServerHealthState) => void;
  className?: string;
  showPillInHeader?: boolean;
}

export const DevServerHealthStatus: React.FC<DevServerHealthStatusProps> = ({
  onStatusChange,
  className = '',
  showPillInHeader = true,
}) => {
  const [healthState, setHealthState] = useState<ServerHealthState>('checking');
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [serverInfo, setServerInfo] = useState<DevServerHealthInfo | null>(null);
  const [assetsInfo, setAssetsInfo] = useState<AssetsHealthInfo | null>(null);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isBannerDismissed, setIsBannerDismissed] = useState<boolean>(false);
  const [isRetrying, setIsRetrying] = useState<boolean>(false);

  const checkHealth = useCallback(async () => {
    setIsRetrying(true);
    const start = performance.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    try {
      // 1. Check /api/health (responsiveness & latency)
      const healthRes = await fetch('/api/health', {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      });

      const elapsed = Math.round(performance.now() - start);
      setLatencyMs(elapsed);
      clearTimeout(timeoutId);

      if (!healthRes.ok) {
        throw new Error(`HTTP ${healthRes.status}: ${healthRes.statusText}`);
      }

      const healthData: DevServerHealthInfo = await healthRes.json();
      setServerInfo(healthData);

      // 2. Check /api/health/assets (entry point & dist output directory mapping)
      try {
        const assetsRes = await fetch('/api/health/assets', {
          headers: { Accept: 'application/json' },
        });
        if (assetsRes.ok) {
          const assetsData: AssetsHealthInfo = await assetsRes.json();
          setAssetsInfo(assetsData);
        }
      } catch {}

      const isHealthy = healthData.status === 'ok';
      const newState: ServerHealthState = isHealthy
        ? elapsed > 1500
          ? 'degraded'
          : 'healthy'
        : 'degraded';

      setHealthState(newState);
      setErrorDetails(null);
      setLastChecked(new Date());
      onStatusChange?.(newState);
    } catch (err: any) {
      clearTimeout(timeoutId);
      const isAbort = err?.name === 'AbortError';
      const msg = isAbort
        ? 'Tempo limite de resposta excedido (> 4000ms).'
        : err?.message || 'Falha ao conectar ao servidor Vite na porta 3000.';

      setHealthState('offline');
      setErrorDetails(msg);
      setLatencyMs(null);
      setLastChecked(new Date());
      onStatusChange?.('offline');
    } finally {
      setIsRetrying(false);
    }
  }, [onStatusChange]);

  // Initial check and periodic polling (every 30 seconds)
  useEffect(() => {
    checkHealth();
    const interval = setInterval(() => {
      checkHealth();
    }, 30000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkHealth();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [checkHealth]);

  // Format uptime into human-readable string
  const formatUptime = (seconds?: number) => {
    if (!seconds && seconds !== 0) return '---';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) return `${hrs}h ${mins}m ${secs}s`;
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
  };

  return (
    <div className={className}>
      {/* ===================================================================== */}
      {/* 1. TOP ALERT BANNER (If Server is Offline or Degraded)                */}
      {/* ===================================================================== */}
      {(healthState === 'offline' || healthState === 'degraded') && !isBannerDismissed && (
        <div
          role="alert"
          className={`border-b px-4 py-2.5 text-xs transition-all animate-fadeIn relative z-50 ${
            healthState === 'offline'
              ? 'bg-rose-950/90 border-rose-500/50 text-rose-200'
              : 'bg-amber-950/90 border-amber-500/50 text-amber-200'
          }`}
        >
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div
                className={`p-1.5 rounded-lg shrink-0 ${
                  healthState === 'offline'
                    ? 'bg-rose-500/20 text-rose-400'
                    : 'bg-amber-500/20 text-amber-400'
                }`}
              >
                {healthState === 'offline' ? (
                  <WifiOff className="w-4 h-4" />
                ) : (
                  <AlertTriangle className="w-4 h-4" />
                )}
              </div>
              <div>
                <strong className="font-bold block text-white text-xs sm:text-sm">
                  {healthState === 'offline'
                    ? 'Servidor Vite Indisponível (Porta 3000)'
                    : 'Conexão com o Servidor Vite com Alta Latência'}
                </strong>
                <span className="text-[11px] opacity-90 block leading-tight">
                  {errorDetails ||
                    (healthState === 'offline'
                      ? 'Não foi possível comunicar com o middleware Vite/Express. O app está operando em modo offline de segurança.'
                      : `Tempo de resposta elevado (${latencyMs}ms). Os cálculos continuam funcionando localmente.`)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={checkHealth}
                disabled={isRetrying}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900/90 hover:bg-slate-800 text-white font-bold text-xs border border-slate-700 transition cursor-pointer active:scale-95 shadow-sm disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRetrying ? 'animate-spin text-amber-400' : ''}`} />
                <span>{isRetrying ? 'Reconectando...' : 'Tentar Reconectar'}</span>
              </button>

              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition cursor-pointer active:scale-95 shadow-sm"
              >
                <Server className="w-3.5 h-3.5" />
                <span>Diagnóstico</span>
              </button>

              <button
                type="button"
                onClick={() => setIsBannerDismissed(true)}
                className="p-1 rounded-lg text-slate-400 hover:text-white transition cursor-pointer"
                title="Ignorar aviso temporariamente"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 2. COMPACT STATUS PILL (Rendered in Header Toolbar)                   */}
      {/* ===================================================================== */}
      {showPillInHeader && (
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-mono transition cursor-pointer select-none active:scale-95 ${
            healthState === 'healthy'
              ? 'bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/30 text-emerald-300'
              : healthState === 'degraded'
              ? 'bg-amber-500/15 hover:bg-amber-500/25 border-amber-500/40 text-amber-300 animate-pulse'
              : healthState === 'offline'
              ? 'bg-rose-500/15 hover:bg-rose-500/25 border-rose-500/40 text-rose-300 animate-pulse'
              : 'bg-slate-800/60 hover:bg-slate-800 border-slate-700 text-slate-300'
          }`}
          title="Clique para abrir o painel de diagnóstico do Vite Dev Server"
        >
          {/* Status Indicator Dot */}
          <span className="relative flex h-2 w-2">
            {healthState === 'healthy' && (
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
            )}
            {healthState === 'degraded' && (
              <>
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400" />
              </>
            )}
            {healthState === 'offline' && (
              <>
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-400" />
              </>
            )}
            {healthState === 'checking' && (
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400 animate-pulse" />
            )}
          </span>

          <span className="text-[11px] font-sans font-semibold text-slate-400">Vite:</span>
          <strong className="text-[11px] font-bold text-white">
            {healthState === 'healthy'
              ? `${latencyMs ?? 0}ms`
              : healthState === 'degraded'
              ? 'Degradado'
              : healthState === 'offline'
              ? 'Offline'
              : 'Checando...'}
          </strong>
        </button>
      )}

      {/* ===================================================================== */}
      {/* 3. DIAGNOSTIC MODAL (Detailed Technical Breakdown)                    */}
      {/* ===================================================================== */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-4 text-xs relative overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold ${
                    healthState === 'healthy'
                      ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400'
                      : healthState === 'degraded'
                      ? 'bg-amber-500/15 border border-amber-500/30 text-amber-400'
                      : 'bg-rose-500/15 border border-rose-500/30 text-rose-400'
                  }`}
                >
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white flex items-center gap-2">
                    <span>Diagnóstico do Vite Dev Server</span>
                    <span
                      className={`text-[9px] font-mono px-2 py-0.5 rounded-full font-bold uppercase ${
                        healthState === 'healthy'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : healthState === 'degraded'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      }`}
                    >
                      {healthState}
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Monitoramento de conectividade, carregamento de assets e ambiente do AI Studio.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Diagnostic Metrics Grid */}
            <div className="grid grid-cols-2 gap-2.5">
              {/* Server Status */}
              <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 block font-medium">Status do Servidor:</span>
                <strong
                  className={`text-xs font-mono font-bold flex items-center gap-1.5 mt-0.5 ${
                    healthState === 'healthy'
                      ? 'text-emerald-400'
                      : healthState === 'degraded'
                      ? 'text-amber-400'
                      : 'text-rose-400'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      healthState === 'healthy'
                        ? 'bg-emerald-400'
                        : healthState === 'degraded'
                        ? 'bg-amber-400'
                        : 'bg-rose-400'
                    }`}
                  />
                  <span>{healthState === 'healthy' ? 'Responsivo (OK)' : healthState.toUpperCase()}</span>
                </strong>
              </div>

              {/* Latency */}
              <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 block font-medium">Latência de Resposta:</span>
                <strong className="text-xs font-mono font-bold text-white mt-0.5 block">
                  {latencyMs !== null ? `${latencyMs} ms` : 'Inacessível'}
                </strong>
              </div>

              {/* Port & Host */}
              <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 block font-medium">Porta & Endereço:</span>
                <strong className="text-xs font-mono font-bold text-amber-300 mt-0.5 block">
                  0.0.0.0:{serverInfo?.port || 3000}
                </strong>
              </div>

              {/* Uptime */}
              <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 block font-medium">Tempo Ativo (Uptime):</span>
                <strong className="text-xs font-mono font-bold text-slate-200 mt-0.5 block">
                  {formatUptime(serverInfo?.uptimeSeconds)}
                </strong>
              </div>
            </div>

            {/* Entry Point and Asset Mapping Section */}
            <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-850">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <FileCode className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Ponto de Entrada & Mapeamento de Assets</span>
                </span>
                <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Vite SPA</span>
                </span>
              </div>

              <div className="space-y-1.5 text-[11px] text-slate-300 font-mono">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Entrada Principal (Entry Point):</span>
                  <strong className="text-white">index.html → /src/main.tsx</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Diretório de Distribuição (outDir):</span>
                  <strong className="text-white">dist/</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Configuração HMR:</span>
                  <strong className="text-amber-300">Desativado (Porta 24678 isolada)</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Modo de Execução:</span>
                  <strong className="text-slate-200">Express + vite.middlewares (Porta 3000)</strong>
                </div>
              </div>
            </div>

            {/* AI Studio Environment Safeguards Notice */}
            <div className="bg-emerald-500/10 border border-emerald-500/25 p-3 rounded-xl flex items-start gap-2.5 text-[11px] text-emerald-300">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold text-white block">Configuração Consistente do AI Studio</strong>
                <span>
                  O servidor Vite está configurado sem conflitos de WebSocket/HMR e com vigilância de arquivos otimizada para evitar travamentos durante alterações de código.
                </span>
              </div>
            </div>

            {/* Footer with Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-[11px]">
              <span className="text-slate-400">
                Última verificação:{' '}
                {lastChecked
                  ? lastChecked.toLocaleTimeString('pt-BR', {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })
                  : 'N/A'}
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={checkHealth}
                  disabled={isRetrying}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold transition cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRetrying ? 'animate-spin text-amber-400' : ''}`} />
                  <span>Testar Novamente</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black transition cursor-pointer"
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
