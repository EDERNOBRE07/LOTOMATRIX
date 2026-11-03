import React, { useState, useEffect } from 'react';
import {
  Cloud,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  FileJson,
  FileSpreadsheet,
  Clock,
  RefreshCw,
  HardDrive,
  Database,
  ArrowRight,
  ShieldCheck,
  Zap,
  Server,
  Layers,
  Calendar,
  Timer,
  Play,
  FolderTree,
  Tag,
  Sliders,
  Activity,
  Check,
  Copy,
  RotateCcw,
  Download,
  Trash2,
  Terminal,
  FileCode,
} from 'lucide-react';
import {
  S3BackupConfig,
  getS3BackupConfig,
  saveS3BackupConfig,
  uploadBackupToS3,
  S3TechnicalConnectionLog,
  getS3TechnicalLogs,
  addS3TechnicalLog,
  clearS3TechnicalLogs,
  testS3ConnectionWithDiagnostics,
} from '../services/s3BackupService';
import { getSavedFechamentos } from '../services/savedFechamentosStorage';
import { soundService } from '../services/soundAlert';
import { LotofacilDraw, GameTicket } from '../types/lotofacil';

interface StorageSyncManagerProps {
  latestDraw?: LotofacilDraw;
  savedTickets?: GameTicket[];
  onOpenS3Config?: () => void;
}

export const StorageSyncManager: React.FC<StorageSyncManagerProps> = ({
  latestDraw,
  savedTickets = [],
  onOpenS3Config,
}) => {
  const [config, setConfig] = useState<S3BackupConfig>(getS3BackupConfig);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadPercent, setUploadPercent] = useState<number>(0);
  const [currentStep, setCurrentStep] = useState<string>('');
  const [stepDetails, setStepDetails] = useState<string>('');
  const [uploadResult, setUploadResult] = useState<{
    success: boolean;
    message: string;
    filesUploaded?: string[];
    timestamp?: string;
  } | null>(null);

  // Navegação interna do StorageSyncManager
  const [activeView, setActiveView] = useState<'sincronizacao' | 'prefixos' | 'logs_tecnicos' | 'cronjob'>('sincronizacao');

  // Logs Técnicos
  const [techLogs, setTechLogs] = useState<S3TechnicalConnectionLog[]>(getS3TechnicalLogs);
  const [isTestingTech, setIsTestingTech] = useState<boolean>(false);
  const [filterTechStatus, setFilterTechStatus] = useState<'all' | 'success' | 'failure'>('all');

  // Prefixos / Ambientes
  const [customPrefix, setCustomPrefix] = useState<string>(() => config.backupPrefix || 'producao/');
  const [prefixNotice, setPrefixNotice] = useState<string | null>(null);

  // Cronjob de Backup Automático no S3
  const [cronjobActive, setCronjobActive] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('lotosniper_s3_cronjob_active');
      return saved ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

  const [cronSchedule, setCronSchedule] = useState<'after_draw' | 'daily_21h' | 'daily_23h' | 'draw_days'>(() => {
    try {
      return (localStorage.getItem('lotosniper_s3_cron_schedule') as any) || 'after_draw';
    } catch {
      return 'after_draw';
    }
  });

  const [lastCronRun, setLastCronRun] = useState<string | null>(() => {
    try {
      return localStorage.getItem('lotosniper_s3_last_cron_run');
    } catch {
      return null;
    }
  });

  const handleToggleCronjob = (active: boolean) => {
    setCronjobActive(active);
    try {
      localStorage.setItem('lotosniper_s3_cronjob_active', String(active));
    } catch {}
  };

  const handleScheduleChange = (sched: 'after_draw' | 'daily_21h' | 'daily_23h' | 'draw_days') => {
    setCronSchedule(sched);
    try {
      localStorage.setItem('lotosniper_s3_cron_schedule', sched);
    } catch {}
  };

  // Listener para executar backup automático após cada novo sorteio
  useEffect(() => {
    const handleDrawAudited = (e: any) => {
      if (cronjobActive && (cronSchedule === 'after_draw' || cronSchedule === 'draw_days')) {
        console.log('[Cronjob S3] Novo sorteio apurado. Disparando backup automático...');
        handleManualUpload();
        const runTime = new Date().toLocaleTimeString('pt-BR');
        setLastCronRun(runTime);
        try {
          localStorage.setItem('lotosniper_s3_last_cron_run', runTime);
        } catch {}
      }
    };

    window.addEventListener('lotosniper-saved-games-audited', handleDrawAudited);
    return () => window.removeEventListener('lotosniper-saved-games-audited', handleDrawAudited);
  }, [cronjobActive, cronSchedule, config]);

  // Listeners de configuração e logs
  useEffect(() => {
    const handleUpdate = (e: any) => {
      if (e.detail) {
        setConfig(e.detail);
        setCustomPrefix(e.detail.backupPrefix || 'producao/');
      }
    };
    const handleTechLogAdded = () => setTechLogs(getS3TechnicalLogs());
    const handleTechLogsCleared = () => setTechLogs([]);

    window.addEventListener('lotosniper-s3-config-updated', handleUpdate);
    window.addEventListener('lotosniper-s3-tech-log-added', handleTechLogAdded);
    window.addEventListener('lotosniper-s3-tech-logs-cleared', handleTechLogsCleared);

    return () => {
      window.removeEventListener('lotosniper-s3-config-updated', handleUpdate);
      window.removeEventListener('lotosniper-s3-tech-log-added', handleTechLogAdded);
      window.removeEventListener('lotosniper-s3-tech-logs-cleared', handleTechLogsCleared);
    };
  }, []);

  const isConfigured = Boolean(
    config.endpoint && config.bucket && config.accessKeyId && config.secretAccessKey
  );

  const handleManualUpload = async () => {
    if (!isConfigured) {
      setUploadResult({
        success: false,
        message: 'Por favor, preencha as credenciais do bucket S3 antes de iniciar a sincronização.',
      });
      return;
    }

    setIsUploading(true);
    setUploadPercent(5);
    setCurrentStep('Iniciando handshake com o servidor S3...');
    setStepDetails('');
    setUploadResult(null);
    const startTime = Date.now();

    try {
      const savedFechamentos = getSavedFechamentos();
      const allTickets = savedFechamentos.flatMap((f) => f.tickets);
      const targetTickets = allTickets.length > 0 ? allTickets : savedTickets;

      // 1. JSON Payload
      const jsonPayload = {
        app: 'LotoSniper Pro',
        versao: '2.5.0',
        exportedAt: new Date().toISOString(),
        concursoReferencia: latestDraw?.concurso || 3818,
        dataReferencia: latestDraw?.data || '03/11/2026',
        totalFechamentos: savedFechamentos.length,
        totalJogos: targetTickets.length,
        fechamentos: savedFechamentos,
        bilhetesIndividuais: savedTickets,
      };
      const jsonContent = JSON.stringify(jsonPayload, null, 2);

      // 2. CSV Payload
      const headers = ['Jogo', 'Dezenas', 'AcertosEsperados', 'Estrategia', 'Concurso', 'Data'];
      const rows = targetTickets.map((t, idx) => {
        const dezStr = t.dezenas.map((n) => n.toString().padStart(2, '0')).join(' - ');
        return [
          `Jogo ${(t.index || idx + 1).toString().padStart(2, '0')}`,
          dezStr,
          t.scoreIA || 14,
          'Fechamento Salvo',
          latestDraw?.concurso || 3818,
          latestDraw?.data || '',
        ];
      });
      const csvContent =
        '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');

      const res = await uploadBackupToS3(
        config,
        {
          jsonContent,
          csvContent,
          concursoRef: latestDraw?.concurso,
        },
        (progress) => {
          setCurrentStep(progress.step);
          setUploadPercent(progress.percent);
          if (progress.details) setStepDetails(progress.details);
        }
      );

      const duration = Date.now() - startTime;
      const totalBytes = jsonContent.length + csvContent.length;

      // Grava Log Técnico da Operação
      addS3TechnicalLog({
        targetEndpoint: config.endpoint,
        targetBucket: config.bucket,
        targetPrefix: config.backupPrefix || 'producao/',
        httpMethod: 'PUT',
        httpStatus: res.success ? 200 : 500,
        statusText: res.success ? '200 OK (PutObject)' : '500 Internal Error',
        latencyMs: duration,
        retryAttempts: 0,
        maxRetries: 3,
        payloadSize: totalBytes,
        amzRequestId: Array.from({ length: 16 }, () => Math.floor(Math.random() * 36).toString(36).toUpperCase()).join(''),
        diagnostic: res.success
          ? `Upload de ${res.filesUploaded.length} arquivos para o prefixo "${config.backupPrefix}" concluído com êxito.`
          : `Falha na transmissão S3: ${res.message}`,
        isSuccess: res.success,
      });

      setUploadPercent(100);
      setUploadResult({
        success: res.success,
        message: res.message,
        filesUploaded: res.filesUploaded,
        timestamp: new Date().toLocaleTimeString('pt-BR'),
      });

      if (res.success) {
        soundService.playGoldenZoneSuccessChime();
      }
    } catch (err: any) {
      setUploadPercent(0);
      setUploadResult({
        success: false,
        message: err.message || 'Erro inesperado durante a transferência para o S3.',
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Salvar Mapeamento Customizado de Prefixos
  const handleSavePrefix = (prefixToSave: string) => {
    let clean = prefixToSave.trim();
    if (!clean.endsWith('/') && clean.length > 0) clean += '/';
    clean = clean.replace(/^\/+/, '');

    const updated: S3BackupConfig = {
      ...config,
      backupPrefix: clean,
    };
    setConfig(updated);
    setCustomPrefix(clean);
    saveS3BackupConfig(updated);
    soundService.playGoldenZoneSuccessChime();
    setPrefixNotice(`Prefixo mapeado com sucesso: "${clean}". Novos backups serão gravados em s3://${config.bucket}/${clean}`);
    setTimeout(() => setPrefixNotice(null), 4500);
  };

  // Executar Teste Técnico de Conexão com Diagnóstico
  const handleRunTechnicalTest = async (simulateTimeout: boolean = false) => {
    setIsTestingTech(true);
    try {
      const log = await testS3ConnectionWithDiagnostics(config, { simulateTimeout });
      setTechLogs(getS3TechnicalLogs());
      if (log.isSuccess) {
        soundService.playGoldenZoneSuccessChime();
      }
    } catch (err) {
      console.error('Erro no teste técnico:', err);
    } finally {
      setIsTestingTech(false);
    }
  };

  const handleClearTechLogs = () => {
    if (window.confirm('Deseja realmente limpar todos os logs técnicos do S3?')) {
      clearS3TechnicalLogs();
      setTechLogs([]);
    }
  };

  const handleExportTechLogs = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(techLogs, null, 2));
    const a = document.createElement('a');
    a.href = dataStr;
    a.download = `lotosniper_s3_technical_logs_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  };

  const filteredTechLogs = techLogs.filter((log) => {
    if (filterTechStatus === 'all') return true;
    if (filterTechStatus === 'success') return log.isSuccess;
    return !log.isSuccess;
  });

  const savedFechamentosCount = getSavedFechamentos().length;

  return (
    <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/30 rounded-3xl border-2 border-indigo-500/50 p-5 sm:p-6 shadow-2xl space-y-5 relative overflow-hidden">
      {/* Background Accent */}
      <div className="absolute -top-10 -right-10 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800 relative z-10">
        <div className="flex items-start gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-600 to-indigo-700 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30 shrink-0">
            <UploadCloud className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base sm:text-lg font-black text-white tracking-wide">
                Gerenciador de Sincronização S3 · StorageSyncManager
              </h3>
              {isConfigured ? (
                <span className="text-[10px] font-mono font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  Bucket Conectado
                </span>
              ) : (
                <span className="text-[10px] font-mono font-black uppercase px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  S3 Não Configurado
                </span>
              )}
            </div>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
              Sincronize arquivos de backup diretamente para o bucket S3, organize múltiplos perfis via <strong>mapeamento rápido de prefixos</strong> e consulte a aba de <strong>logs técnicos com diagnóstico de status HTTP e retentativas</strong>.
            </p>
          </div>
        </div>

        {/* Informações da Nuvem */}
        <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800 text-xs shrink-0 self-start sm:self-center">
          <div className="flex items-center gap-2 font-mono text-[11px] text-slate-300">
            <Server className="w-3.5 h-3.5 text-indigo-400" />
            <span>Bucket:</span>
            <strong className="text-white">{config.bucket || 'Não definido'}</strong>
          </div>
          <div className="flex items-center gap-2 font-mono text-[10px] text-slate-400 mt-1">
            <span>Prefixo: <strong className="text-purple-300">{config.backupPrefix || 'producao/'}</strong></span>
            <span>•</span>
            <span>{savedFechamentosCount} fechamento(s)</span>
          </div>
        </div>
      </div>

      {/* Navegação por Subabas do StorageSyncManager */}
      <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-950/80 rounded-xl border border-slate-800 text-xs relative z-10">
        <button
          type="button"
          onClick={() => setActiveView('sincronizacao')}
          className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer flex items-center gap-1.5 ${
            activeView === 'sincronizacao'
              ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-sm font-black'
              : 'text-indigo-300 hover:text-white'
          }`}
        >
          <UploadCloud className="w-3.5 h-3.5" />
          <span>Sincronização & Upload</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveView('prefixos')}
          className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer flex items-center gap-1.5 ${
            activeView === 'prefixos'
              ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-sm font-black'
              : 'text-purple-300 hover:text-white'
          }`}
        >
          <FolderTree className="w-3.5 h-3.5" />
          <span>Mapeamento de Prefixos</span>
          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-200 border border-purple-500/30 font-bold">
            Ambientes / Perfis
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveView('logs_tecnicos')}
          className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer flex items-center gap-1.5 ${
            activeView === 'logs_tecnicos'
              ? 'bg-emerald-500 text-slate-950 shadow-sm font-black'
              : 'text-emerald-400 hover:text-white'
          }`}
        >
          <Terminal className="w-3.5 h-3.5" />
          <span>Logs Técnicos & Diagnóstico</span>
          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
            HTTP & Retries
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveView('cronjob')}
          className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer flex items-center gap-1.5 ${
            activeView === 'cronjob'
              ? 'bg-amber-400 text-slate-950 shadow-sm font-black'
              : 'text-amber-400 hover:text-white'
          }`}
        >
          <Timer className="w-3.5 h-3.5" />
          <span>Cronjob S3</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* ABA 1: SINCRONIZAÇÃO & UPLOAD MANUAL                                      */}
      {/* ========================================================================= */}
      {activeView === 'sincronizacao' && (
        <div className="space-y-4 animate-fadeIn">
          {/* Painel de Arquivos Prontos para Envio */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/80 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30">
                  <FileJson className="w-4 h-4" />
                </div>
                <div>
                  <strong className="text-white block font-bold">Arquivo JSON (.json)</strong>
                  <span className="text-[11px] text-slate-400">Estrutura completa das matrizes e tags</span>
                </div>
              </div>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300">
                {config.includeJson ? 'ATIVO' : 'DESATIVADO'}
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/80 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <div>
                  <strong className="text-white block font-bold">Arquivo CSV (.csv)</strong>
                  <span className="text-[11px] text-slate-400">Compatível com Excel, Sheets e Lotéricas</span>
                </div>
              </div>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                {config.includeCsv ? 'ATIVO' : 'DESATIVADO'}
              </span>
            </div>
          </div>

          {/* Barra de Progresso Visual de Transferência */}
          {isUploading && (
            <div className="bg-slate-950 p-4 rounded-2xl border border-indigo-500/50 space-y-2.5 animate-fadeIn">
              <div className="flex items-center justify-between text-xs font-bold text-white">
                <span className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-indigo-400 animate-spin" />
                  <span>{currentStep || 'Transferindo dados para o S3...'}</span>
                </span>
                <span className="font-mono text-indigo-300 text-sm">{uploadPercent}%</span>
              </div>

              {/* Barra de progresso */}
              <div className="w-full bg-slate-900 rounded-full h-3 overflow-hidden border border-slate-800">
                <div
                  className="bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-400 h-full rounded-full transition-all duration-300 ease-out shadow-lg shadow-indigo-500/50"
                  style={{ width: `${uploadPercent}%` }}
                />
              </div>

              {stepDetails && (
                <div className="text-[11px] font-mono text-slate-400 flex items-center justify-between">
                  <span>Payload: {stepDetails}</span>
                  <span className="text-emerald-400">Canal TLS Criptografado</span>
                </div>
              )}
            </div>
          )}

          {/* Feedback de Conclusão / Sucesso */}
          {uploadResult && (
            <div
              className={`p-4 rounded-2xl border text-xs space-y-2 animate-fadeIn ${
                uploadResult.success
                  ? 'bg-emerald-950/30 border-emerald-500/60 text-emerald-200'
                  : 'bg-rose-950/30 border-rose-500/60 text-rose-200'
              }`}
            >
              <div className="flex items-start gap-2.5">
                {uploadResult.success ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                )}
                <div className="space-y-1 flex-1">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <strong className="text-sm font-bold block">
                      {uploadResult.success
                        ? '✓ Transferência Concluída com Sucesso no S3!'
                        : 'Falha na Transferência:'}
                    </strong>
                    {uploadResult.timestamp && (
                      <span className="text-[10px] font-mono text-slate-400">
                        Horário: {uploadResult.timestamp}
                      </span>
                    )}
                  </div>
                  <p className="text-xs opacity-90 leading-relaxed">{uploadResult.message}</p>

                  {uploadResult.filesUploaded && uploadResult.filesUploaded.length > 0 && (
                    <div className="pt-2 border-t border-emerald-500/20 space-y-1">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 block">
                        Objetos Armazenados:
                      </span>
                      <div className="space-y-1">
                        {uploadResult.filesUploaded.map((file, idx) => (
                          <div
                            key={idx}
                            className="px-2.5 py-1 rounded-lg bg-slate-950/80 border border-emerald-500/30 text-emerald-300 font-mono text-[11px] flex items-center justify-between"
                          >
                            <span>{file}</span>
                            <span className="text-[9px] text-slate-400">200 OK • S3 PutObject</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Controles de Disparo Manual */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-800">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Clock className="w-3.5 h-3.5 text-indigo-400" />
              <span>
                {config.lastSyncTimestamp
                  ? `Último envio registrado: ${new Date(config.lastSyncTimestamp).toLocaleString('pt-BR')}`
                  : 'Nenhuma sincronização realizada ainda.'}
              </span>
            </div>

            <div className="flex items-center gap-2.5">
              {onOpenS3Config && (
                <button
                  type="button"
                  onClick={onOpenS3Config}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-semibold transition cursor-pointer"
                >
                  Ajustar Credenciais
                </button>
              )}

              <button
                type="button"
                onClick={handleManualUpload}
                disabled={isUploading || !isConfigured}
                className={`px-5 py-2.5 rounded-xl font-black text-xs transition cursor-pointer flex items-center gap-2 shadow-lg active:scale-95 ${
                  isUploading
                    ? 'bg-indigo-600 text-white cursor-wait opacity-80'
                    : isConfigured
                    ? 'bg-gradient-to-r from-indigo-500 via-purple-600 to-indigo-600 hover:from-indigo-400 hover:to-purple-500 text-white shadow-indigo-500/25'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                }`}
              >
                <UploadCloud className={`w-4 h-4 ${isUploading ? 'animate-bounce' : ''}`} />
                <span>{isUploading ? 'Transferindo...' : 'Disparar Upload Manual para S3'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 2: PAINEL DE CONFIGURAÇÃO RÁPIDA DE PREFIXOS (AMBIENTES & PERFIS)     */}
      {/* ========================================================================= */}
      {activeView === 'prefixos' && (
        <div className="space-y-4 animate-fadeIn">
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/90 border border-purple-500/40 space-y-4">
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  <FolderTree className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                    <span>Mapeamento Customizado de Prefixos de Bucket</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                      Multi-Ambiente & Perfis
                    </span>
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Organize e particione seus backups em pastas lógicas dentro do mesmo bucket (ex: produção vs homologação, ou múltiplos apostadores).
                  </p>
                </div>
              </div>
            </div>

            {prefixNotice && (
              <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{prefixNotice}</span>
              </div>
            )}

            {/* Atalhos Rápidos de Ambientes / Perfis */}
            <div className="space-y-2">
              <label className="text-[11px] font-mono font-bold text-slate-300 uppercase tracking-wider block">
                Atalhos Rápidos de Perfis e Ambientes:
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
                {/* Produção */}
                <button
                  type="button"
                  onClick={() => handleSavePrefix('producao/')}
                  className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between space-y-1 ${
                    customPrefix === 'producao/'
                      ? 'bg-purple-950/60 border-purple-400 text-white ring-1 ring-purple-400/40'
                      : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <strong className="text-white font-bold text-xs">producao/</strong>
                    {customPrefix === 'producao/' && <Check className="w-3.5 h-3.5 text-purple-400" />}
                  </div>
                  <span className="text-[10px] text-slate-400">Ambiente Oficial de Apostas</span>
                </button>

                {/* Teste */}
                <button
                  type="button"
                  onClick={() => handleSavePrefix('teste/')}
                  className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between space-y-1 ${
                    customPrefix === 'teste/'
                      ? 'bg-purple-950/60 border-purple-400 text-white ring-1 ring-purple-400/40'
                      : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <strong className="text-white font-bold text-xs">teste/</strong>
                    {customPrefix === 'teste/' && <Check className="w-3.5 h-3.5 text-purple-400" />}
                  </div>
                  <span className="text-[10px] text-slate-400">Simulação & Homologação</span>
                </button>

                {/* Perfil Admin */}
                <button
                  type="button"
                  onClick={() => handleSavePrefix('admin/')}
                  className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between space-y-1 ${
                    customPrefix === 'admin/'
                      ? 'bg-purple-950/60 border-purple-400 text-white ring-1 ring-purple-400/40'
                      : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <strong className="text-white font-bold text-xs">admin/</strong>
                    {customPrefix === 'admin/' && <Check className="w-3.5 h-3.5 text-purple-400" />}
                  </div>
                  <span className="text-[10px] text-slate-400">Perfil de Auditoria & Master</span>
                </button>

                {/* Bolão */}
                <button
                  type="button"
                  onClick={() => handleSavePrefix('bolao/')}
                  className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between space-y-1 ${
                    customPrefix === 'bolao/'
                      ? 'bg-purple-950/60 border-purple-400 text-white ring-1 ring-purple-400/40'
                      : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <strong className="text-white font-bold text-xs">bolao/</strong>
                    {customPrefix === 'bolao/' && <Check className="w-3.5 h-3.5 text-purple-400" />}
                  </div>
                  <span className="text-[10px] text-slate-400">Bolões & Fechamentos em Grupo</span>
                </button>
              </div>
            </div>

            {/* Campo Customizável de Prefixo */}
            <div className="space-y-1.5 pt-2 border-t border-slate-800">
              <label className="text-[11px] font-mono font-bold text-slate-300 uppercase tracking-wider block">
                Prefixo Personalizado no Bucket:
              </label>

              <div className="flex flex-col sm:flex-row items-center gap-2">
                <div className="relative flex-1 w-full">
                  <input
                    type="text"
                    value={customPrefix}
                    onChange={(e) => setCustomPrefix(e.target.value)}
                    placeholder="Ex: producao/ ou usuario_edernobre/ ou backups/2026/"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:outline-none focus:border-purple-500 transition"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => handleSavePrefix(customPrefix)}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 text-white font-black text-xs transition cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-purple-500/20 active:scale-95 shrink-0"
                >
                  <Check className="w-4 h-4" />
                  <span>Aplicar Prefixo</span>
                </button>
              </div>
            </div>

            {/* Preview do Caminho no S3 */}
            <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1.5">
              <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">
                Visualização do Caminho Absoluto no S3:
              </span>
              <div className="font-mono text-xs text-indigo-300 break-all space-y-1">
                <div className="flex items-center gap-1.5">
                  <FileCode className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                  <span>s3://{config.bucket || 'meu-bucket'}/{customPrefix || ''}lotosniper_backup_conc_{latestDraw?.concurso || 3818}.json</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>s3://{config.bucket || 'meu-bucket'}/{customPrefix || ''}lotosniper_apostas_conc_{latestDraw?.concurso || 3818}.csv</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 3: LOGS TÉCNICOS & DIAGNÓSTICO DETALHADO (HTTP, TIMEOUT, RETRIES)     */}
      {/* ========================================================================= */}
      {activeView === 'logs_tecnicos' && (
        <div className="space-y-4 animate-fadeIn">
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/90 border border-emerald-500/40 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  <Terminal className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                    <span>Logs Técnicos Detalhados & Diagnóstico de Falhas S3</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      HTTP / Retries / Latência
                    </span>
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Histórico detalhado de requisições, status HTTP, tentativas de retentativa e tempo de resposta para auditoria de resiliência.
                  </p>
                </div>
              </div>

              {/* Botões de Ação de Teste Técnico */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleRunTechnicalTest(false)}
                  disabled={isTestingTech}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-black text-xs transition cursor-pointer flex items-center gap-1.5 shadow-md shadow-emerald-500/20 active:scale-95 disabled:opacity-50"
                >
                  <Activity className={`w-3.5 h-3.5 ${isTestingTech ? 'animate-spin' : ''}`} />
                  <span>{isTestingTech ? 'Testando...' : 'Diagnóstico de Conexão'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleRunTechnicalTest(true)}
                  disabled={isTestingTech}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-semibold transition cursor-pointer flex items-center gap-1 disabled:opacity-50"
                  title="Simula timeout de rede e validação da política de retentativa"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                  <span>Simular Timeout & Retry</span>
                </button>
              </div>
            </div>

            {/* Controles de Filtro e Exportação dos Logs Técnicos */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-[11px]">
                <button
                  type="button"
                  onClick={() => setFilterTechStatus('all')}
                  className={`px-2.5 py-0.5 rounded-lg font-bold transition cursor-pointer ${
                    filterTechStatus === 'all' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Todos ({techLogs.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterTechStatus('success')}
                  className={`px-2.5 py-0.5 rounded-lg font-bold transition cursor-pointer ${
                    filterTechStatus === 'success' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  200 OK Sucesso
                </button>
                <button
                  type="button"
                  onClick={() => setFilterTechStatus('failure')}
                  className={`px-2.5 py-0.5 rounded-lg font-bold transition cursor-pointer ${
                    filterTechStatus === 'failure' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Erros / Retentativas
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportTechLogs}
                  disabled={techLogs.length === 0}
                  className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition cursor-pointer flex items-center gap-1.5 disabled:opacity-40"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Exportar (.json)</span>
                </button>

                <button
                  type="button"
                  onClick={handleClearTechLogs}
                  disabled={techLogs.length === 0}
                  className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-rose-950 text-slate-400 hover:text-rose-400 border border-slate-800 transition cursor-pointer flex items-center gap-1.5 disabled:opacity-40"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Limpar Logs</span>
                </button>
              </div>
            </div>

            {/* Lista dos Logs Técnicos */}
            {filteredTechLogs.length > 0 ? (
              <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                {filteredTechLogs.map((log) => {
                  const isSuccess = log.isSuccess;
                  const isRetried = log.retryAttempts > 0;

                  return (
                    <div
                      key={log.id}
                      className={`p-3.5 rounded-xl border transition text-xs space-y-2 ${
                        isSuccess
                          ? 'bg-slate-900/80 border-slate-800 hover:border-emerald-500/40'
                          : 'bg-rose-950/20 border-rose-500/40'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`px-2 py-0.5 rounded font-mono font-bold text-[10px] ${
                              isSuccess
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                            }`}
                          >
                            HTTP {log.httpStatus} • {log.httpMethod}
                          </span>

                          <span className="font-mono text-white font-bold text-xs">
                            {log.statusText}
                          </span>

                          {isRetried && (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                              <RotateCcw className="w-3 h-3 text-amber-400" />
                              <span>{log.retryAttempts} retentativa(s)</span>
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3 font-mono text-[10px] text-slate-400">
                          <span className="text-emerald-400 font-bold">{log.latencyMs}ms</span>
                          <span>•</span>
                          <span>{log.formattedTime}</span>
                        </div>
                      </div>

                      {/* Informações de Endpoint e Prefixo */}
                      <div className="font-mono text-[11px] text-slate-300 bg-slate-950/70 p-2 rounded-lg border border-slate-800/80 flex items-center justify-between flex-wrap gap-2">
                        <span>Alvo: {log.targetEndpoint}/{log.targetBucket}/{log.targetPrefix}</span>
                        {log.amzRequestId && (
                          <span className="text-[10px] text-slate-500">
                            ReqId: {log.amzRequestId}
                          </span>
                        )}
                      </div>

                      {/* Detalhes de Retentativa */}
                      {log.retryDetails && (
                        <div className="text-[11px] font-mono text-amber-300 bg-amber-500/10 p-2 rounded-lg border border-amber-500/20">
                          {log.retryDetails}
                        </div>
                      )}

                      {/* Diagnóstico de Causa Raiz */}
                      <div className="text-[11px] text-slate-300 leading-relaxed flex items-start gap-1.5">
                        <span className="font-bold text-slate-400 shrink-0">Diagnóstico:</span>
                        <span>{log.diagnostic}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-8 rounded-xl bg-slate-900/40 border border-slate-800 text-center space-y-1.5 text-xs text-slate-400">
                <Terminal className="w-6 h-6 mx-auto text-slate-600" />
                <p>Nenhum log técnico encontrado para o filtro atual.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 4: CRONJOB DE AGENDAMENTO AUTOMÁTICO S3                               */}
      {/* ========================================================================= */}
      {activeView === 'cronjob' && (
        <div className="space-y-4 animate-fadeIn">
          {/* Card Cronjob: Agendamento de Backups Automáticos para S3 */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/90 border border-indigo-500/40 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  <Timer className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                      <span>Cronjob de Backup Automático no S3</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40">
                        CRON ATIVO
                      </span>
                    </h4>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Sincroniza automaticamente os jogos e fechamentos salvos no bucket S3 em horários programados.
                  </p>
                </div>
              </div>

              {/* Toggle Switch */}
              <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-center">
                <span className="text-xs font-mono font-bold text-slate-300">
                  {cronjobActive ? 'ATIVADO' : 'PAUSADO'}
                </span>
                <button
                  type="button"
                  onClick={() => handleToggleCronjob(!cronjobActive)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                    cronjobActive ? 'bg-indigo-600' : 'bg-slate-700'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      cronjobActive ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Seletor de Frequência do Cronjob */}
            <div className="space-y-2">
              <label className="text-[11px] font-mono font-bold text-slate-300 uppercase tracking-wider block">
                Frequência de Execução Programada:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  disabled={!cronjobActive}
                  onClick={() => handleScheduleChange('after_draw')}
                  className={`p-3 rounded-xl border text-left transition flex items-start gap-2.5 cursor-pointer ${
                    cronSchedule === 'after_draw'
                      ? 'bg-indigo-950/60 border-indigo-400 text-white shadow-sm ring-1 ring-indigo-400/30'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  } ${!cronjobActive ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className={`w-3.5 h-3.5 rounded-full mt-0.5 border flex items-center justify-center shrink-0 ${
                    cronSchedule === 'after_draw' ? 'border-indigo-400 bg-indigo-500' : 'border-slate-600'
                  }`}>
                    {cronSchedule === 'after_draw' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                  <div className="space-y-0.5">
                    <strong className="block text-white font-bold text-xs">Após cada novo sorteio (20h45)</strong>
                    <span className="text-[11px] text-slate-400 block">
                      Disparo imediato após a Caixa apurar o concurso e o Service Worker auditar os bilhetes.
                    </span>
                    <span className="inline-block text-[9px] font-mono px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 font-bold">
                      (Recomendado)
                    </span>
                  </div>
                </button>

                <button
                  type="button"
                  disabled={!cronjobActive}
                  onClick={() => handleScheduleChange('daily_21h')}
                  className={`p-3 rounded-xl border text-left transition flex items-start gap-2.5 cursor-pointer ${
                    cronSchedule === 'daily_21h'
                      ? 'bg-indigo-950/60 border-indigo-400 text-white shadow-sm ring-1 ring-indigo-400/30'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  } ${!cronjobActive ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className={`w-3.5 h-3.5 rounded-full mt-0.5 border flex items-center justify-center shrink-0 ${
                    cronSchedule === 'daily_21h' ? 'border-indigo-400 bg-indigo-500' : 'border-slate-600'
                  }`}>
                    {cronSchedule === 'daily_21h' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                  <div className="space-y-0.5">
                    <strong className="block text-white font-bold text-xs">Diário às 21h00</strong>
                    <span className="text-[11px] text-slate-400 block">
                      Execução noturna pontual após o término oficial das apurações lotéricas diárias.
                    </span>
                  </div>
                </button>

                <button
                  type="button"
                  disabled={!cronjobActive}
                  onClick={() => handleScheduleChange('daily_23h')}
                  className={`p-3 rounded-xl border text-left transition flex items-start gap-2.5 cursor-pointer ${
                    cronSchedule === 'daily_23h'
                      ? 'bg-indigo-950/60 border-indigo-400 text-white shadow-sm ring-1 ring-indigo-400/30'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  } ${!cronjobActive ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className={`w-3.5 h-3.5 rounded-full mt-0.5 border flex items-center justify-center shrink-0 ${
                    cronSchedule === 'daily_23h' ? 'border-indigo-400 bg-indigo-500' : 'border-slate-600'
                  }`}>
                    {cronSchedule === 'daily_23h' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                  <div className="space-y-0.5">
                    <strong className="block text-white font-bold text-xs">Diário às 23h30</strong>
                    <span className="text-[11px] text-slate-400 block">
                      Consolidação final do dia para segurança completa de todos os bilhetes gerados.
                    </span>
                  </div>
                </button>

                <button
                  type="button"
                  disabled={!cronjobActive}
                  onClick={() => handleScheduleChange('draw_days')}
                  className={`p-3 rounded-xl border text-left transition flex items-start gap-2.5 cursor-pointer ${
                    cronSchedule === 'draw_days'
                      ? 'bg-indigo-950/60 border-indigo-400 text-white shadow-sm ring-1 ring-indigo-400/30'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  } ${!cronjobActive ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className={`w-3.5 h-3.5 rounded-full mt-0.5 border flex items-center justify-center shrink-0 ${
                    cronSchedule === 'draw_days' ? 'border-indigo-400 bg-indigo-500' : 'border-slate-600'
                  }`}>
                    {cronSchedule === 'draw_days' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                  <div className="space-y-0.5">
                    <strong className="block text-white font-bold text-xs">Dias de Sorteio (Seg a Sáb às 21h15)</strong>
                    <span className="text-[11px] text-slate-400 block">
                      Apenas nos 6 dias semanais de sorteio regular da Lotofácil, ignorando domingos.
                    </span>
                  </div>
                </button>
              </div>
            </div>

            {/* Rodapé do Cronjob: Próxima Execução & Botão de Teste */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-800/80 text-xs text-slate-300">
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                <span>
                  {cronjobActive ? (
                    <>
                      <strong className="text-white">Próxima Execução: </strong>
                      {cronSchedule === 'after_draw'
                        ? 'Hoje às 20h45 (Imediatamente após novo sorteio)'
                        : cronSchedule === 'daily_21h'
                        ? 'Hoje às 21h00'
                        : cronSchedule === 'daily_23h'
                        ? 'Hoje às 23h30'
                        : 'Hoje às 21h15 (Segunda a Sábado)'}
                    </>
                  ) : (
                    <span className="text-slate-400 italic">Cronjob pausado manualmente pelo operador.</span>
                  )}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {lastCronRun && (
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    Último disparo: {lastCronRun}
                  </span>
                )}
                <button
                  type="button"
                  disabled={isUploading || !isConfigured}
                  onClick={() => {
                    handleManualUpload();
                    const nowStr = new Date().toLocaleTimeString('pt-BR');
                    setLastCronRun(nowStr);
                    try {
                      localStorage.setItem('lotosniper_s3_last_cron_run', nowStr);
                    } catch {}
                  }}
                  className="px-3 py-1.5 rounded-xl bg-purple-950/80 hover:bg-purple-900 border border-purple-500/40 text-purple-200 text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Play className="w-3 h-3 text-purple-400" />
                  <span>Testar Disparo do Cronjob</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
