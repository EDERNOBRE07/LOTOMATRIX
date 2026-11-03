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
} from 'lucide-react';
import {
  S3BackupConfig,
  getS3BackupConfig,
  saveS3BackupConfig,
  uploadBackupToS3,
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

  useEffect(() => {
    const handleUpdate = (e: any) => {
      if (e.detail) setConfig(e.detail);
    };
    window.addEventListener('lotosniper-s3-config-updated', handleUpdate);
    return () => window.removeEventListener('lotosniper-s3-config-updated', handleUpdate);
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

    try {
      const savedFechamentos = getSavedFechamentos();
      const allTickets = savedFechamentos.flatMap((f) => f.tickets);
      const targetTickets = allTickets.length > 0 ? allTickets : savedTickets;

      // 1. JSON Payload
      const jsonPayload = {
        app: 'LotoSniper Pro',
        versao: '2.5.0',
        exportedAt: new Date().toISOString(),
        concursoReferencia: latestDraw?.concurso || 3817,
        dataReferencia: latestDraw?.data || '29/10/2026',
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
          latestDraw?.concurso || 3817,
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
              Dispare o upload manual dos arquivos de backup (<strong>.json</strong> e <strong>.csv</strong>) diretamente para o seu bucket S3 com acompanhamento de progresso em tempo real e confirmação criptográfica de integridade.
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
            <span>Região: {config.region || 'auto'}</span>
            <span>•</span>
            <span>{savedFechamentosCount} fechamento(s)</span>
          </div>
        </div>
      </div>

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
            title={
              isConfigured
                ? 'Disparar upload manual imediato para o bucket S3'
                : 'Configure as credenciais S3 primeiro'
            }
          >
            <UploadCloud className={`w-4 h-4 ${isUploading ? 'animate-bounce' : ''}`} />
            <span>{isUploading ? 'Transferindo...' : 'Disparar Upload Manual para S3'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
