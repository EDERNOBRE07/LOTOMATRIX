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
  Layers,
  Sparkles,
  ExternalLink,
  Save,
  Check,
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
  const [activeTab, setActiveTab] = useState<'exportar' | 'restaurar' | 'snapshots' | 'drive'>('exportar');
  const [autoDownload, setAutoDownload] = useState<boolean>(isAutoDownloadOnSaveEnabled());
  const [lastBackup, setLastBackup] = useState<number | null>(getLastBackupTimestamp());
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
        const totalTickets = parsed.meusJogos?.ticketsAtuais?.length || (Array.isArray(parsed) ? parsed.length : 0);
        const totalFechamentos = parsed.meusJogos?.fechamentosSalvos?.length || (parsed.fechamentos?.length || 0);
        const dataHora = parsed.dataHoraFormatada || parsed.dataExportacao || 'Data desconhecida';

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
      // 2. Abre a pasta do Google Drive
      window.open('https://drive.google.com/drive/u/0/my-drive', '_blank');
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
            className={`pb-2.5 px-3 font-bold transition border-b-2 flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'exportar'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Download className="w-4 h-4" />
            <span>Download Forçado (JSON)</span>
          </button>

          <button
            onClick={() => setActiveTab('drive')}
            className={`pb-2.5 px-3 font-bold transition border-b-2 flex items-center gap-1.5 cursor-pointer ${
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
            className={`pb-2.5 px-3 font-bold transition border-b-2 flex items-center gap-1.5 cursor-pointer ${
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
            className={`pb-2.5 px-3 font-bold transition border-b-2 flex items-center gap-1.5 cursor-pointer ${
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

              {/* Opção de Download Automático */}
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
