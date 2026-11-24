import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldCheck,
  Download,
  Upload,
  HardDrive,
  Cloud,
  Clock,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  X,
  FileJson,
  ExternalLink,
  Save,
  Check,
  CalendarClock,
  Play,
  Bell,
  BellRing,
  BellOff,
} from 'lucide-react';
import {
  buildCompleteBackupPayload,
  triggerForcedJSONDownload,
  saveLocalSnapshot,
  getLocalSnapshots,
  restoreLocalSnapshot,
  restoreBackupFromJSON,
  isAutoDownloadOnSaveEnabled,
  setAutoDownloadOnSave,
  getLastBackupTimestamp,
  getDailyBackupSchedule,
  saveDailyBackupSchedule,
  getNextScheduledBackupLabel,
  checkAndRunScheduledDailyBackup,
  sendBackupPreNotification,
  DailyBackupSchedule,
  LocalSnapshotMeta,
  BackupDataPayload,
} from '../services/backupManagerService';
import { soundService } from '../services/soundAlert';

interface BackupRestoreCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccessNotification?: (msg: string) => void;
}

export const BackupRestoreCenterModal: React.FC<BackupRestoreCenterModalProps> = ({
  isOpen,
  onClose,
  onSuccessNotification,
}) => {
  const [activeTab, setActiveTab] = useState<'exportar' | 'agendamento' | 'drive' | 'snapshots' | 'restaurar'>('exportar');
  const [autoDownload, setAutoDownload] = useState<boolean>(isAutoDownloadOnSaveEnabled());
  const [lastBackup, setLastBackup] = useState<number | null>(getLastBackupTimestamp());
  const [dailySchedule, setDailySchedule] = useState<DailyBackupSchedule>(() => getDailyBackupSchedule());
  const [notificationPerm, setNotificationPerm] = useState<NotificationPermission | 'unsupported'>(() =>
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'unsupported'
  );
  const [snapshots, setSnapshots] = useState<{ meta: LocalSnapshotMeta; payload: BackupDataPayload }[]>([]);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Restore file input ref
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFileContent, setSelectedFileContent] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [filePreview, setFilePreview] = useState<{ totalTickets: number; totalFechamentos: number; dataHora: string } | null>(null);

  // Current statistics
  const [currentStats, setCurrentStats] = useState({
    tickets: 0,
    fechamentos: 0,
  });

  const loadData = () => {
    try {
      const payload = buildCompleteBackupPayload();
      setCurrentStats({
        tickets: payload.meusJogos.ticketsAtuais.length,
        fechamentos: payload.meusJogos.fechamentosSalvos.length,
      });
      setSnapshots(getLocalSnapshots());
      setLastBackup(getLastBackupTimestamp());
      setAutoDownload(isAutoDownloadOnSaveEnabled());
      setDailySchedule(getDailyBackupSchedule());
      if (typeof window !== 'undefined' && 'Notification' in window) {
        setNotificationPerm(Notification.permission);
      }
    } catch {}
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
      setStatusMessage(null);
      setSelectedFileContent(null);
      setSelectedFileName(null);
      setFilePreview(null);
    }
  }, [isOpen]);

  useEffect(() => {
    const onScheduledExecuted = (e: Event) => {
      const detail = (e as CustomEvent)?.detail;
      loadData();
      if (detail?.filename) {
        setStatusMessage({
          type: 'success',
          text: `Backup diário agendado (${detail.time}) executado: ${detail.filename} (${detail.sizeKB} KB).`,
        });
      }
    };
    const onPreAlert = (e: Event) => {
      const detail = (e as CustomEvent)?.detail;
      loadData();
      if (detail?.time) {
        setStatusMessage({
          type: 'info',
          text: `Pré-alerta enviado via Notification API: o backup diário das ${detail.time} será disparado em ${detail.leadMinutes} min.`,
        });
      }
    };
    window.addEventListener('lotosniper-daily-backup-executed', onScheduledExecuted);
    window.addEventListener('lotosniper-daily-backup-prealert', onPreAlert);
    return () => {
      window.removeEventListener('lotosniper-daily-backup-executed', onScheduledExecuted);
      window.removeEventListener('lotosniper-daily-backup-prealert', onPreAlert);
    };
  }, []);

  if (!isOpen) return null;

  const handleForcedDownload = () => {
    setIsProcessing(true);
    const result = triggerForcedJSONDownload();
    setIsProcessing(false);

    if (result.success) {
      setLastBackup(Date.now());
      setSnapshots(getLocalSnapshots());
      setStatusMessage({
        type: 'success',
        text: `Backup salvo com sucesso: ${result.filename} (${result.sizeKB} KB). Seus dados estão seguros!`,
      });
      onSuccessNotification?.('Download forçado de backup concluído com sucesso!');
    } else {
      setStatusMessage({
        type: 'error',
        text: 'Não foi possível gerar o arquivo de backup.',
      });
    }
  };

  const handleToggleAutoDownload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setAutoDownload(checked);
    setAutoDownloadOnSave(checked);
    if (checked) {
      saveLocalSnapshot('auto');
      setSnapshots(getLocalSnapshots());
    }
  };

  const updateDailySchedule = (patch: Partial<DailyBackupSchedule>, feedback?: string) => {
    const next: DailyBackupSchedule = {
      ...dailySchedule,
      ...patch,
    };
    setDailySchedule(next);
    saveDailyBackupSchedule(next);
    if (feedback) {
      setStatusMessage({
        type: 'success',
        text: feedback,
      });
    }
  };

  const handleRequestNotificationPermission = async (): Promise<NotificationPermission | 'unsupported'> => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setNotificationPerm('unsupported');
      setStatusMessage({
        type: 'error',
        text: 'Este navegador não suporta a Notification API nativa.',
      });
      return 'unsupported';
    }
    try {
      const result = await Notification.requestPermission();
      setNotificationPerm(result);
      if (result === 'granted') {
        setStatusMessage({
          type: 'success',
          text: 'Permissão concedida! Você receberá alertas nativos antes do backup diário automático.',
        });
      } else {
        setStatusMessage({
          type: 'error',
          text: 'Permissão de notificações não foi concedida pelo navegador. Verifique as permissões do site.',
        });
      }
      return result;
    } catch {
      return Notification.permission;
    }
  };

  const handleTestPreBackupNotification = async () => {
    let perm = notificationPerm;
    if (perm === 'default') {
      perm = await handleRequestNotificationPermission();
    }
    if (perm !== 'granted') {
      setStatusMessage({
        type: 'error',
        text:
          perm === 'unsupported'
            ? 'Notification API indisponível neste ambiente.'
            : 'Permita as notificações do navegador para disparar o alerta nativo.',
      });
      return;
    }
    const leadText =
      dailySchedule.notifyBeforeMinutes > 0
        ? `em ${dailySchedule.notifyBeforeMinutes} minuto(s)`
        : 'agora';
    const sent = await sendBackupPreNotification(
      `LotoSniper • Alerta de Backup (${dailySchedule.time})`,
      `Seu backup diário automático está programado para disparar ${leadText}. Mantenha a aba aberta.`,
      'lotosniper-backup-prealert-test'
    );
    if (sent) {
      soundService.playSuccess();
      setStatusMessage({
        type: 'success',
        text: `Notificação de pré-aviso disparada pela Notification API para o horário ${dailySchedule.time}.`,
      });
    } else {
      setStatusMessage({
        type: 'error',
        text: 'Não foi possível exibir a notificação do sistema.',
      });
    }
  };

  const handleRunScheduledBackupNow = () => {
    setIsProcessing(true);
    const res = checkAndRunScheduledDailyBackup(undefined, true);
    setIsProcessing(false);
    if (res.triggered && res.filename) {
      loadData();
      setStatusMessage({
        type: 'success',
        text: `Download agendado executado com sucesso via triggerForcedJSONDownload: ${res.filename} (${res.sizeKB} KB).`,
      });
      onSuccessNotification?.(`Backup agendado salvo: ${res.filename}`);
    } else {
      setStatusMessage({
        type: 'error',
        text: 'Falha ao disparar o backup agendado.',
      });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setSelectedFileContent(content);
      try {
        const parsed = JSON.parse(content);
        const totalTickets =
          parsed.meusJogos?.ticketsAtuais?.length ??
          parsed.savedTickets?.length ??
          (Array.isArray(parsed) ? parsed.length : 0);
        const totalFechamentos =
          parsed.meusJogos?.fechamentosSalvos?.length ??
          parsed.fechamentos?.length ??
          (Array.isArray(parsed?.savedTickets) && parsed.savedTickets.length > 0 ? 1 : 0);
        const dataHora =
          parsed.dataHoraFormatada || parsed.dataExportacao || parsed.exportedAt || 'Data desconhecida';

        setFilePreview({
          totalTickets,
          totalFechamentos,
          dataHora,
        });
      } catch {
        setFilePreview(null);
        setStatusMessage({
          type: 'error',
          text: 'O arquivo selecionado não contém um JSON válido.',
        });
      }
    };
    reader.readAsText(file);
  };

  const handleApplyRestore = (mode: 'replace' | 'merge') => {
    if (!selectedFileContent) return;

    setIsProcessing(true);
    const res = restoreBackupFromJSON(selectedFileContent, mode);
    setIsProcessing(false);

    if (res.success) {
      soundService.playSuccess();
      setStatusMessage({
        type: 'success',
        text: res.message,
      });
      loadData();
      onSuccessNotification?.(res.message);
      setTimeout(() => {
        onClose();
      }, 1500);
    } else {
      soundService.playOutsideGoldenZoneAlert();
      setStatusMessage({
        type: 'error',
        text: res.message,
      });
    }
  };

  const handleRestoreSnapshot = (id: string) => {
    const confirmed = window.confirm('Deseja restaurar este snapshot local? Os dados atuais serão substituídos.');
    if (!confirmed) return;

    const ok = restoreLocalSnapshot(id);
    if (ok) {
      soundService.playSuccess();
      setStatusMessage({
        type: 'success',
        text: 'Snapshot local restaurado com sucesso!',
      });
      loadData();
      onSuccessNotification?.('Snapshot local restaurado com sucesso!');
      setTimeout(() => {
        onClose();
      }, 1200);
    } else {
      setStatusMessage({
        type: 'error',
        text: 'Erro ao restaurar snapshot local.',
      });
    }
  };

  const handleGoogleDriveExport = () => {
    // 1. Força o download do JSON
    const res = triggerForcedJSONDownload();
    if (res.success) {
      setLastBackup(Date.now());
      // 2. Abre a pasta do Google Drive de forma segura sem window.open
      const link = document.createElement('a');
      link.href = 'https://drive.google.com/drive/u/0/my-drive';
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setStatusMessage({
        type: 'success',
        text: `Arquivo "${res.filename}" gerado! O Google Drive foi aberto em uma nova aba para você salvar o arquivo em nuvem.`,
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-slate-950 shadow-md shadow-emerald-500/20">
              <ShieldCheck className="w-5 h-5 text-slate-950 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <span>Central de Backup & Proteção de Dados</span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  ANTI-PERDA LOCALSTORAGE
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Backup automático de 'Meus Jogos', fechamentos salvos e configurações críticas.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Quick Bar */}
        <div className="px-6 py-3 bg-slate-950/60 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-3">
            <span className="text-slate-400">
              Bilhetes Atuais: <strong className="text-emerald-400 font-bold">{currentStats.tickets}</strong>
            </span>
            <span className="text-slate-600">•</span>
            <span className="text-slate-400">
              Fechamentos no Histórico: <strong className="text-amber-300 font-bold">{currentStats.fechamentos}</strong>
            </span>
          </div>

          <div className="text-slate-400 text-[11px] flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span>Último Backup:</span>
            <strong className="text-white">
              {lastBackup ? new Date(lastBackup).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : 'Pendente hoje'}
            </strong>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 pt-3 border-b border-slate-800 flex items-center gap-2 overflow-x-auto text-xs">
          <button
            onClick={() => setActiveTab('exportar')}
            className={`pb-2.5 px-3 font-bold transition border-b-2 flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'exportar'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Download className="w-4 h-4" />
            <span>Download Forçado (JSON)</span>
          </button>

          <button
            onClick={() => setActiveTab('agendamento')}
            className={`pb-2.5 px-3 font-bold transition border-b-2 flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'agendamento'
                ? 'border-amber-400 text-amber-300'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <CalendarClock className="w-4 h-4" />
            <span>Agendamento Diário</span>
            <span
              className={`text-[9px] font-mono px-1.5 py-0.2 rounded ${
                dailySchedule.enabled
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {dailySchedule.enabled ? dailySchedule.time : 'OFF'}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('drive')}
            className={`pb-2.5 px-3 font-bold transition border-b-2 flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'drive'
                ? 'border-sky-500 text-sky-400'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Cloud className="w-4 h-4" />
            <span>Google Drive / Nuvem</span>
          </button>

          <button
            onClick={() => setActiveTab('snapshots')}
            className={`pb-2.5 px-3 font-bold transition border-b-2 flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'snapshots'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <HardDrive className="w-4 h-4" />
            <span>Snapshots Locais ({snapshots.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('restaurar')}
            className={`pb-2.5 px-3 font-bold transition border-b-2 flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'restaurar'
                ? 'border-purple-500 text-purple-400'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>Restaurar Arquivo</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {statusMessage && (
            <div
              className={`p-3 rounded-xl border text-xs flex items-center justify-between gap-2.5 ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-200'
                  : statusMessage.type === 'error'
                  ? 'bg-rose-950/60 border-rose-500/50 text-rose-200'
                  : 'bg-slate-800 border-slate-700 text-slate-300'
              }`}
            >
              <div className="flex items-center gap-2">
                {statusMessage.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                )}
                <span>{statusMessage.text}</span>
              </div>
              <button
                onClick={() => setStatusMessage(null)}
                className="text-slate-400 hover:text-white text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {/* TAB 1: DOWNLOAD FORÇADO JSON */}
          {activeTab === 'exportar' && (
            <div className="space-y-4">
              <div className="bg-slate-950/80 p-5 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-xl">
                    <FileJson className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Download Forçado de Arquivo JSON</h4>
                    <p className="text-xs text-slate-400">
                      Gera e força o download imediato de um arquivo JSON auto-contido com 100% dos seus jogos,
                      fechamentos gravados e todas as preferências de algoritmos e filtros.
                    </p>
                  </div>
                </div>

                <div className="bg-slate-900/90 p-3.5 rounded-xl border border-slate-800/80 text-xs space-y-1.5 font-mono">
                  <span className="text-slate-400 block text-[11px] uppercase tracking-wider font-bold">
                    O que está incluído no pacote de backup:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-300 pt-1">
                    <div className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{currentStats.tickets} Bilhetes Atuais salvos</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{currentStats.fechamentos} Fechamentos no Histórico</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Metadados e filtros de cada jogo</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Configurações de Alertas e Notificações</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Preferências de Tema e Intervalo</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Tags e classificações de apostas</span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleForcedDownload}
                  disabled={isProcessing}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-400 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-sm shadow-lg shadow-emerald-500/25 transition flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                >
                  <Download className="w-5 h-5 stroke-[2.5]" />
                  <span>Baixar Arquivo de Backup Completo Agora (.JSON)</span>
                </button>
              </div>

              {/* Opção de Download Automático ao Salvar */}
              <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-white block">
                    Download Forçado Automático ao Salvar Jogos
                  </span>
                  <p className="text-[11px] text-slate-400">
                    Sempre que novos fechamentos forem consolidados em 'Meus Jogos', salva uma cópia de segurança
                    local e permite arquivamento automático.
                  </p>
                </div>

                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={autoDownload}
                    onChange={handleToggleAutoDownload}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                </label>
              </div>

              {/* Resumo Rápido do Agendamento Diário */}
              <div className="bg-slate-950/75 p-4 rounded-xl border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <CalendarClock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <span className="font-bold text-white block">
                      Agendamento Diário de Backup ({dailySchedule.enabled ? `Ativo às ${dailySchedule.time}` : 'Desativado'})
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      Próxima execução: {getNextScheduledBackupLabel(dailySchedule)}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('agendamento')}
                  className="px-3 py-1.5 rounded-lg bg-amber-400/15 hover:bg-amber-400/25 border border-amber-400/40 text-amber-300 text-xs font-bold transition cursor-pointer whitespace-nowrap self-start sm:self-center"
                >
                  Configurar Horário Diário
                </button>
              </div>
            </div>
          )}

          {/* TAB 1.5: AGENDAMENTO DIÁRIO DE BACKUP */}
          {activeTab === 'agendamento' && (
            <div className="space-y-4">
              <div className="bg-slate-950/85 p-5 rounded-2xl border border-amber-500/35 space-y-4">
                <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-800">
                  <div className="flex items-start gap-3">
                    <div className="p-3 bg-amber-500/15 border border-amber-500/30 text-amber-400 rounded-xl shrink-0">
                      <CalendarClock className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">
                        Agendamento Diário Automático (Download JSON)
                      </h4>
                      <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                        Defina um horário diário fixo para o LotoSniper disparar automaticamente o download dos seus dados via{' '}
                        <code className="font-mono text-emerald-300">triggerForcedJSONDownload</code>.
                      </p>
                    </div>
                  </div>

                  {/* Switch Ativar / Desativar */}
                  <button
                    type="button"
                    role="switch"
                    aria-checked={dailySchedule.enabled}
                    aria-label="Ativar ou desativar agendamento diário de backup"
                    onClick={() =>
                      updateDailySchedule(
                        { enabled: !dailySchedule.enabled },
                        !dailySchedule.enabled
                          ? `Backup diário ativado para as ${dailySchedule.time}!`
                          : 'Agendamento diário de backup pausado.'
                      )
                    }
                    className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition-colors cursor-pointer ${
                      dailySchedule.enabled ? 'bg-emerald-500 justify-end' : 'bg-slate-700 justify-start'
                    }`}
                  >
                    <span className="inline-block h-5 w-5 rounded-full bg-white shadow-md" />
                  </button>
                </div>

                {/* Seleção do Horário Diário (HH:MM) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                  <div className="space-y-2.5">
                    <label
                      htmlFor="daily-backup-time-input"
                      className="text-xs font-bold text-slate-200 flex items-center gap-1.5"
                    >
                      <Clock className="w-3.5 h-3.5 text-amber-400" />
                      <span>Horário Exato de Preferência (HH:MM):</span>
                    </label>

                    <div className="grid grid-cols-12 gap-2 items-center">
                      <input
                        id="daily-backup-time-input"
                        type="time"
                        step={60}
                        value={dailySchedule.time}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (/^\d{2}:\d{2}$/.test(val)) {
                            updateDailySchedule(
                              { time: val, enabled: true },
                              `Horário diário atualizado e salvo para as ${val}.`
                            );
                          }
                        }}
                        className="col-span-6 bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm font-mono font-bold text-white focus:outline-none focus:border-amber-400"
                      />

                      <div className="col-span-3">
                        <select
                          aria-label="Selecionar hora exata (HH)"
                          value={dailySchedule.time.split(':')[0] || '22'}
                          onChange={(e) => {
                            const mm = dailySchedule.time.split(':')[1] || '00';
                            const val = `${e.target.value}:${mm}`;
                            updateDailySchedule(
                              { time: val, enabled: true },
                              `Horário diário atualizado para ${val}.`
                            );
                          }}
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2 py-2.5 text-xs font-mono font-bold text-amber-300 focus:outline-none focus:border-amber-400 cursor-pointer"
                        >
                          {Array.from({ length: 24 }, (_, h) => String(h).padStart(2, '0')).map((hh) => (
                            <option key={hh} value={hh}>
                              {hh}h
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="col-span-3">
                        <select
                          aria-label="Selecionar minuto exato (MM)"
                          value={dailySchedule.time.split(':')[1] || '00'}
                          onChange={(e) => {
                            const hh = dailySchedule.time.split(':')[0] || '22';
                            const val = `${hh}:${e.target.value}`;
                            updateDailySchedule(
                              { time: val, enabled: true },
                              `Horário diário atualizado para ${val}.`
                            );
                          }}
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2 py-2.5 text-xs font-mono font-bold text-amber-300 focus:outline-none focus:border-amber-400 cursor-pointer"
                        >
                          {Array.from({ length: 60 }, (_, m) => String(m).padStart(2, '0')).map((mm) => (
                            <option key={mm} value={mm}>
                              {mm}m
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Atalhos Rápidos de Horário */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-[10px] text-slate-400 font-sans mr-1">Sugestões:</span>
                      {[
                        { time: '12:00', label: '12:00' },
                        { time: '18:00', label: '18:00' },
                        { time: '21:30', label: '21:30 (Pós-Sorteio)' },
                        { time: '23:00', label: '23:00' },
                      ].map((preset) => (
                        <button
                          key={preset.time}
                          type="button"
                          onClick={() =>
                            updateDailySchedule(
                              { time: preset.time, enabled: true },
                              `Horário diário configurado para as ${preset.time}.`
                            )
                          }
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold border transition cursor-pointer ${
                            dailySchedule.time === preset.time && dailySchedule.enabled
                              ? 'bg-amber-400 text-slate-950 border-amber-300'
                              : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Painel de Status da Execução */}
                  <div className="bg-slate-900/90 rounded-xl border border-slate-800 p-3.5 space-y-2 text-xs font-mono">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-sans">Status do Agendador:</span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                          dailySchedule.enabled
                            ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
                            : 'bg-slate-950 text-slate-400 border-slate-800'
                        }`}
                      >
                        {dailySchedule.enabled ? 'ATIVO DIARIAMENTE' : 'PAUSADO'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-sans">Próximo Download:</span>
                      <strong className="text-amber-300 tabular-nums">
                        {getNextScheduledBackupLabel(dailySchedule)}
                      </strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-sans">Alerta Pré-Backup:</span>
                      <strong className="text-sky-300 tabular-nums">
                        {dailySchedule.notifyBeforeEnabled
                          ? dailySchedule.notifyBeforeMinutes > 0
                            ? `${dailySchedule.notifyBeforeMinutes} min antes`
                            : 'No disparo'
                          : 'Desativado'}
                      </strong>
                    </div>
                    <div className="flex items-center justify-between pt-1.5 border-t border-slate-800/80">
                      <span className="text-slate-400 font-sans">Última Execução Auto:</span>
                      <strong className="text-slate-200 tabular-nums">
                        {dailySchedule.lastRunAt
                          ? new Date(dailySchedule.lastRunAt).toLocaleString('pt-BR', {
                              day: '2-digit',
                              month: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : 'Ainda não executado'}
                      </strong>
                    </div>
                    {dailySchedule.lastRunFilename && (
                      <div className="text-[10px] text-emerald-400 truncate pt-1">
                        Arquivo: {dailySchedule.lastRunFilename}
                      </div>
                    )}
                  </div>
                </div>

                {/* Alerta via Notification API antes do disparo */}
                <div className="bg-slate-900/85 border border-sky-500/30 rounded-xl p-4 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      <div
                        className={`p-2 rounded-lg border shrink-0 ${
                          notificationPerm === 'granted' && dailySchedule.notifyBeforeEnabled
                            ? 'bg-sky-500/15 border-sky-500/35 text-sky-300'
                            : 'bg-slate-800 border-slate-700 text-slate-400'
                        }`}
                      >
                        {notificationPerm === 'granted' ? (
                          <BellRing className="w-4 h-4" />
                        ) : notificationPerm === 'denied' ? (
                          <BellOff className="w-4 h-4 text-rose-400" />
                        ) : (
                          <Bell className="w-4 h-4" />
                        )}
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h5 className="text-xs font-bold text-white">
                            Notificação de Aviso Antes do Backup (Notification API)
                          </h5>
                          <span
                            className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                              notificationPerm === 'granted'
                                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
                                : notificationPerm === 'denied'
                                ? 'bg-rose-500/15 text-rose-300 border-rose-500/40'
                                : 'bg-amber-500/15 text-amber-300 border-amber-500/40'
                            }`}
                          >
                            {notificationPerm === 'granted'
                              ? 'PERMISSÃO CONCEDIDA'
                              : notificationPerm === 'denied'
                              ? 'BLOQUEADA NO NAVEGADOR'
                              : notificationPerm === 'unsupported'
                              ? 'INDISPONÍVEL'
                              : 'AGUARDANDO PERMISSÃO'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Envia um alerta nativo do sistema antes de iniciar o download automático diário via{' '}
                          <code className="font-mono text-sky-300">triggerForcedJSONDownload</code>.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                      {notificationPerm !== 'granted' && notificationPerm !== 'unsupported' && (
                        <button
                          type="button"
                          onClick={handleRequestNotificationPermission}
                          className="px-3 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 text-[11px] font-black transition cursor-pointer"
                        >
                          Ativar Notificações
                        </button>
                      )}

                      <button
                        type="button"
                        role="switch"
                        aria-checked={dailySchedule.notifyBeforeEnabled}
                        aria-label="Ativar notificação prévia antes do backup automático"
                        onClick={() =>
                          updateDailySchedule(
                            { notifyBeforeEnabled: !dailySchedule.notifyBeforeEnabled },
                            !dailySchedule.notifyBeforeEnabled
                              ? 'Alerta pré-backup ativado via Notification API.'
                              : 'Alerta pré-backup desativado.'
                          )
                        }
                        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition-colors cursor-pointer ${
                          dailySchedule.notifyBeforeEnabled
                            ? 'bg-sky-500 justify-end'
                            : 'bg-slate-700 justify-start'
                        }`}
                      >
                        <span className="inline-block h-5 w-5 rounded-full bg-white shadow-md" />
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-2.5 border-t border-slate-800/80">
                    <div className="flex items-center gap-2">
                      <label
                        htmlFor="backup-lead-minutes"
                        className="text-[11px] font-semibold text-slate-300 whitespace-nowrap"
                      >
                        Antecedência do alerta:
                      </label>
                      <select
                        id="backup-lead-minutes"
                        value={dailySchedule.notifyBeforeMinutes}
                        disabled={!dailySchedule.notifyBeforeEnabled}
                        onChange={(e) => {
                          const mins = Number(e.target.value);
                          updateDailySchedule(
                            { notifyBeforeMinutes: mins },
                            mins > 0
                              ? `Você será alertado ${mins} minuto(s) antes do backup das ${dailySchedule.time}.`
                              : `Você será alertado exatamente no momento do backup (${dailySchedule.time}).`
                          );
                        }}
                        className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-sky-400 disabled:opacity-50 cursor-pointer"
                      >
                        <option value={1}>1 minuto antes</option>
                        <option value={5}>5 minutos antes</option>
                        <option value={10}>10 minutos antes</option>
                        <option value={15}>15 minutos antes</option>
                        <option value={0}>No momento do disparo</option>
                      </select>
                    </div>

                    <button
                      type="button"
                      onClick={handleTestPreBackupNotification}
                      className="px-3 py-1.5 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/40 text-sky-300 text-[11px] font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <BellRing className="w-3.5 h-3.5" />
                      <span>Testar Alerta Push Agora</span>
                    </button>
                  </div>
                </div>

                {/* Ações */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-2 border-t border-slate-800/80">
                  <button
                    type="button"
                    onClick={() =>
                      updateDailySchedule(
                        { enabled: true },
                        `Preferência salva no localStorage: backup diário às ${dailySchedule.time}.`
                      )
                    }
                    className="px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <Save className="w-4 h-4" />
                    <span>Salvar Horário ({dailySchedule.time})</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleRunScheduledBackupNow}
                    disabled={isProcessing}
                    className="px-4 py-2.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/45 text-emerald-300 font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Testar Download Agendado Agora</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: GOOGLE DRIVE */}
          {activeTab === 'drive' && (
            <div className="space-y-4">
              <div className="bg-slate-950/80 p-5 rounded-2xl border border-sky-500/30 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-sky-500/20 text-sky-400 rounded-xl">
                    <Cloud className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Sincronização com o Google Drive</h4>
                    <p className="text-xs text-slate-400">
                      Armazene seus arquivos de backup diretamente na sua nuvem Google Drive para acessar seus jogos
                      salvos a partir de qualquer dispositivo ou computador.
                    </p>
                  </div>
                </div>

                <div className="bg-slate-900/90 p-4 rounded-xl border border-slate-800 text-xs space-y-2 text-slate-300">
                  <strong className="text-white block font-sans">Como funciona o fluxo de segurança do Drive:</strong>
                  <ol className="list-decimal pl-4 space-y-1.5 text-slate-400">
                    <li>
                      O LotoSniper gera o arquivo <strong className="text-slate-200">.JSON</strong> criptografado com
                      seus jogos e configurações locais.
                    </li>
                    <li>
                      Ao clicar no botão abaixo, o arquivo é baixado e a pasta raiz do seu{' '}
                      <strong className="text-sky-300">Google Drive</strong> é aberta em uma nova janela.
                    </li>
                    <li>
                      Arraste o arquivo baixado para a pasta do LotoSniper no seu Drive ou salve direto na sua pasta
                      sincronizada local do Google Drive.
                    </li>
                  </ol>
                </div>

                <button
                  type="button"
                  onClick={handleGoogleDriveExport}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-sky-500 via-blue-500 to-sky-400 hover:from-sky-400 hover:to-blue-400 text-slate-950 font-black text-sm shadow-lg shadow-sky-500/25 transition flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                >
                  <Cloud className="w-5 h-5 fill-current" />
                  <span>Gerar Arquivo e Abrir Google Drive</span>
                  <ExternalLink className="w-4 h-4 ml-1" />
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: SNAPSHOTS LOCAIS */}
          {activeTab === 'snapshots' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                    Histórico de Snapshots Locais (Navegador)
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Pontos de restauração gravados automaticamente no armazenamento seguro do seu navegador.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    saveLocalSnapshot('manual');
                    setSnapshots(getLocalSnapshots());
                    setStatusMessage({
                      type: 'success',
                      text: 'Novo snapshot manual gravado com sucesso!',
                    });
                  }}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition cursor-pointer flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Criar Ponto Agora</span>
                </button>
              </div>

              {snapshots.length === 0 ? (
                <div className="p-8 text-center bg-slate-950/60 rounded-xl border border-slate-800 text-slate-400 text-xs">
                  Nenhum snapshot local registrado ainda. Clique em "Criar Ponto Agora" para gerar um ponto de
                  restauração.
                </div>
              ) : (
                <div className="space-y-2">
                  {snapshots.map(({ meta }) => (
                    <div
                      key={meta.id}
                      className="p-3.5 bg-slate-950/80 rounded-xl border border-slate-800/80 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2 font-mono">
                          <strong className="text-white">{meta.dataHora}</strong>
                          <span
                            className={`text-[9px] uppercase font-bold px-1.5 py-0.2 rounded ${
                              meta.origem === 'auto'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            }`}
                          >
                            {meta.origem}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400">
                          {meta.totalTickets} bilhetes salvos • {meta.totalFechamentos} fechamentos • {meta.tamanhoKB} KB
                        </p>
                        {meta.filename && (
                          <p className="text-[10px] font-mono text-emerald-400/90 truncate max-w-xs sm:max-w-md">
                            {meta.filename}
                          </p>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRestoreSnapshot(meta.id)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 font-bold text-xs transition cursor-pointer flex items-center gap-1.5"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Restaurar</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: RESTAURAR ARQUIVO JSON */}
          {activeTab === 'restaurar' && (
            <div className="space-y-4">
              <div className="bg-slate-950/80 p-5 rounded-2xl border border-slate-800 space-y-4">
                <div>
                  <h4 className="text-sm font-bold text-white">Carregar Arquivo de Backup (.JSON)</h4>
                  <p className="text-xs text-slate-400">
                    Selecione um arquivo de backup baixado anteriormente para recuperar seus jogos e configurações.
                  </p>
                </div>

                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".json,application/json"
                  onChange={handleFileChange}
                  className="hidden"
                />

                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-700 hover:border-emerald-500/60 p-6 rounded-xl text-center cursor-pointer transition bg-slate-900/60 group"
                >
                  <Upload className="w-8 h-8 text-slate-500 group-hover:text-emerald-400 mx-auto mb-2 transition" />
                  <span className="text-xs font-bold text-white block">
                    {selectedFileName ? selectedFileName : 'Clique para selecionar o arquivo de backup (.json)'}
                  </span>
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    Suporta arquivos gerados pelo LotoSniper AI Pro
                  </span>
                </div>

                {filePreview && (
                  <div className="p-3.5 bg-slate-900 rounded-xl border border-slate-800 text-xs space-y-2">
                    <strong className="text-white block font-sans">Conteúdo Detectado no Arquivo:</strong>
                    <div className="grid grid-cols-3 gap-2 font-mono text-[11px]">
                      <div className="bg-slate-950 p-2 rounded-lg border border-slate-800">
                        <span className="text-slate-500 block">Bilhetes:</span>
                        <strong className="text-emerald-400 text-sm">{filePreview.totalTickets}</strong>
                      </div>
                      <div className="bg-slate-950 p-2 rounded-lg border border-slate-800">
                        <span className="text-slate-500 block">Fechamentos:</span>
                        <strong className="text-amber-300 text-sm">{filePreview.totalFechamentos}</strong>
                      </div>
                      <div className="bg-slate-950 p-2 rounded-lg border border-slate-800">
                        <span className="text-slate-500 block">Exportado em:</span>
                        <strong className="text-slate-300 text-[10px]">{filePreview.dataHora}</strong>
                      </div>
                    </div>

                    <div className="pt-2 flex flex-col sm:flex-row gap-2">
                      <button
                        type="button"
                        onClick={() => handleApplyRestore('replace')}
                        disabled={isProcessing}
                        className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs shadow-md transition cursor-pointer"
                      >
                        Substituir Dados Atuais (Recomendado)
                      </button>

                      <button
                        type="button"
                        onClick={() => handleApplyRestore('merge')}
                        disabled={isProcessing}
                        className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition cursor-pointer border border-slate-700"
                      >
                        Mesclar com Jogos Atuais
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>LotoSniper AI Pro • Blindagem de Dados</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-semibold transition cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
