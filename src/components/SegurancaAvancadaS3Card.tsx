import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Cloud,
  Key,
  Lock,
  Globe,
  Database,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Upload,
  Eye,
  EyeOff,
  FileJson,
  FileSpreadsheet,
  Clock,
  Sparkles,
  Server,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { LotofacilDraw, GameTicket } from '../types/lotofacil';
import {
  S3BackupConfig,
  getS3BackupConfig,
  saveS3BackupConfig,
  testS3Connection,
  uploadBackupToS3,
} from '../services/s3BackupService';
import { getSavedFechamentos } from '../services/savedFechamentosStorage';
import { soundService } from '../services/soundAlert';

interface SegurancaAvancadaS3CardProps {
  latestDraw?: LotofacilDraw;
  savedTickets?: GameTicket[];
}

export const SegurancaAvancadaS3Card: React.FC<SegurancaAvancadaS3CardProps> = ({
  latestDraw,
  savedTickets = [],
}) => {
  const [config, setConfig] = useState<S3BackupConfig>(getS3BackupConfig);
  const [showSecret, setShowSecret] = useState<boolean>(false);
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [uploadResult, setUploadResult] = useState<{ success: boolean; message: string; files?: string[] } | null>(null);
  const [saveSuccessNotice, setSaveSuccessNotice] = useState<boolean>(false);

  useEffect(() => {
    const handleUpdate = (e: any) => {
      if (e.detail) setConfig(e.detail);
    };
    window.addEventListener('lotosniper-s3-config-updated', handleUpdate);
    return () => window.removeEventListener('lotosniper-s3-config-updated', handleUpdate);
  }, []);

  const handleSave = () => {
    saveS3BackupConfig(config);
    soundService.playGoldenZoneSuccessChime();
    setSaveSuccessNotice(true);
    setTimeout(() => setSaveSuccessNotice(false), 3500);
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await testS3Connection(config);
      setTestResult(res);
      if (res.success) {
        soundService.playGoldenZoneSuccessChime();
      }
    } finally {
      setIsTesting(false);
    }
  };

  const handleImmediateUpload = async () => {
    setIsUploading(true);
    setUploadResult(null);
    try {
      const savedFechamentos = getSavedFechamentos();
      const allTickets = savedFechamentos.flatMap((f) => f.tickets);
      const targetTickets = allTickets.length > 0 ? allTickets : savedTickets;

      // Cria conteúdo JSON
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

      // Cria conteúdo CSV formatado
      const headers = ['Jogo', 'Dezenas', 'AcertosEsperados', 'Estrategia', 'Concurso', 'Data'];
      const rows = targetTickets.map((t, idx) => {
        const dezStr = t.dezenas.map((n) => n.toString().padStart(2, '0')).join(' - ');
        return [`Jogo ${(t.index || idx + 1).toString().padStart(2, '0')}`, dezStr, t.scoreIA || 14, 'Fechamento Salvo', latestDraw?.concurso || 3817, latestDraw?.data || ''];
      });
      const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');

      const res = await uploadBackupToS3(config, {
        jsonContent,
        csvContent,
        concursoRef: latestDraw?.concurso,
      });

      setUploadResult({
        success: res.success,
        message: res.message,
        files: res.filesUploaded,
      });

      if (res.success) {
        soundService.playGoldenZoneSuccessChime();
      }
    } catch (err: any) {
      setUploadResult({
        success: false,
        message: err.message || 'Falha ao processar e enviar backup S3',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const isConfigured = Boolean(config.endpoint && config.bucket && config.accessKeyId && config.secretAccessKey);

  return (
    <div className="bg-gradient-to-br from-slate-900/95 via-indigo-950/20 to-slate-900/90 rounded-3xl border-2 border-indigo-500/40 p-5 sm:p-6 shadow-2xl relative overflow-hidden space-y-5">
      {/* Glow Decorator */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 blur-3xl pointer-events-none rounded-full" />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800 relative z-10">
        <div className="flex items-start gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-600 to-indigo-700 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30 shrink-0">
            <Cloud className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base sm:text-lg font-black text-white tracking-wide">
                Segurança Avançada · Redundância em Nuvem S3 Compatível
              </h3>
              {isConfigured ? (
                <span className="text-[10px] font-mono font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  Pronto para Sincronização
                </span>
              ) : (
                <span className="text-[10px] font-mono font-black uppercase px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  Credenciais Pendentes
                </span>
              )}
            </div>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
              Configure o armazenamento automático e espelhado dos seus arquivos de backup (<strong>.json</strong> estruturado e <strong>.csv</strong> para planilhas) em qualquer bucket compatível com a API S3 (AWS S3, Cloudflare R2, MinIO, Wasabi ou Backblaze B2).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start md:self-center shrink-0">
          <span className="text-[11px] text-slate-400 font-mono">
            Provedor: <strong className="text-indigo-300">S3 API v4</strong>
          </span>
        </div>
      </div>

      {/* Feedback Alerts */}
      {saveSuccessNotice && (
        <div className="bg-emerald-500/15 border border-emerald-500/50 text-emerald-300 p-3 rounded-xl text-xs flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Configurações e credenciais do Bucket S3 salvas localmente com sucesso!</span>
        </div>
      )}

      {testResult && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 animate-fadeIn ${
            testResult.success
              ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-200'
              : 'bg-rose-500/15 border-rose-500/50 text-rose-200'
          }`}
        >
          {testResult.success ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          )}
          <div>
            <strong className="block font-bold">{testResult.success ? 'Conexão Aprovada!' : 'Erro na Verificação S3:'}</strong>
            <span className="text-[11px] opacity-90">{testResult.message}</span>
          </div>
        </div>
      )}

      {uploadResult && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 animate-fadeIn ${
            uploadResult.success
              ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-200'
              : 'bg-rose-500/15 border-rose-500/50 text-rose-200'
          }`}
        >
          {uploadResult.success ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          )}
          <div>
            <strong className="block font-bold">{uploadResult.success ? 'Upload para S3 Realizado!' : 'Falha no Upload:'}</strong>
            <span className="text-[11px] opacity-90">{uploadResult.message}</span>
            {uploadResult.files && uploadResult.files.length > 0 && (
              <div className="mt-2 space-y-1">
                <span className="text-[10px] text-slate-400 block font-mono">Objetos armazenados no bucket:</span>
                {uploadResult.files.map((f, i) => (
                  <span key={i} className="inline-block mr-2 px-2 py-0.5 rounded bg-slate-950/80 text-emerald-300 font-mono text-[10px] border border-emerald-500/30">
                    {f}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Formulário de Configuração S3 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Endpoint S3 */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5 text-indigo-400" />
            <span>Endpoint S3 (URL do Servidor / Gateway)</span>
            <span className="text-rose-400">*</span>
          </label>
          <input
            type="text"
            value={config.endpoint}
            onChange={(e) => setConfig({ ...config, endpoint: e.target.value })}
            placeholder="https://s3.us-east-1.amazonaws.com ou Cloudflare R2"
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
          />
          <div className="flex gap-2 text-[10px] text-slate-500">
            <span>Exemplos: AWS S3, Cloudflare R2, MinIO, Wasabi, Backblaze B2</span>
          </div>
        </div>

        {/* Bucket Name */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5 text-indigo-400" />
            <span>Nome do Bucket</span>
            <span className="text-rose-400">*</span>
          </label>
          <input
            type="text"
            value={config.bucket}
            onChange={(e) => setConfig({ ...config, bucket: e.target.value })}
            placeholder="ex: lotosniper-backups-2026"
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
          />
          <div className="flex justify-between text-[10px] text-slate-500">
            <span>Identificador único do seu repositório de dados</span>
          </div>
        </div>

        {/* Access Key ID */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
            <Key className="w-3.5 h-3.5 text-indigo-400" />
            <span>Access Key ID</span>
            <span className="text-rose-400">*</span>
          </label>
          <input
            type="text"
            value={config.accessKeyId}
            onChange={(e) => setConfig({ ...config, accessKeyId: e.target.value })}
            placeholder="ex: AKIAIOSFODNN7EXAMPLE"
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
          />
        </div>

        {/* Secret Access Key */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-indigo-400" />
            <span>Secret Access Key</span>
            <span className="text-rose-400">*</span>
          </label>
          <div className="relative">
            <input
              type={showSecret ? 'text' : 'password'}
              value={config.secretAccessKey}
              onChange={(e) => setConfig({ ...config, secretAccessKey: e.target.value })}
              placeholder="••••••••••••••••••••••••••••••••"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 pr-10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
            />
            <button
              type="button"
              onClick={() => setShowSecret(!showSecret)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
              title={showSecret ? 'Ocultar chave' : 'Exibir chave'}
            >
              {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Região (Region) */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
            <Server className="w-3.5 h-3.5 text-indigo-400" />
            <span>Região (Region / Datacenter)</span>
          </label>
          <input
            type="text"
            value={config.region}
            onChange={(e) => setConfig({ ...config, region: e.target.value })}
            placeholder="us-east-1, sa-east-1 ou auto"
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
          />
        </div>

        {/* Prefixo de Pasta no Bucket */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-indigo-400" />
            <span>Prefixo / Diretório no Bucket</span>
          </label>
          <input
            type="text"
            value={config.backupPrefix}
            onChange={(e) => setConfig({ ...config, backupPrefix: e.target.value })}
            placeholder="backups/lotosniper/"
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
          />
        </div>
      </div>

      {/* Seletores de Formato (.json e .csv) e Frequência */}
      <div className="bg-slate-950/80 rounded-2xl border border-slate-800 p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Formatos Selecionados */}
          <div>
            <span className="text-xs font-bold text-white block mb-2">
              Formatos de Arquivo para Redundância:
            </span>
            <div className="flex flex-wrap gap-3">
              <label className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={config.includeJson}
                  onChange={(e) => setConfig({ ...config, includeJson: e.target.checked })}
                  className="rounded border-slate-700 text-indigo-500 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                />
                <FileJson className="w-4 h-4 text-amber-400" />
                <span className="text-xs text-slate-200 font-bold">Arquivo .JSON</span>
                <span className="text-[10px] text-slate-400 font-mono">(Estrutura completa)</span>
              </label>

              <label className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={config.includeCsv}
                  onChange={(e) => setConfig({ ...config, includeCsv: e.target.checked })}
                  className="rounded border-slate-700 text-indigo-500 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                />
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                <span className="text-xs text-slate-200 font-bold">Arquivo .CSV</span>
                <span className="text-[10px] text-slate-400 font-mono">(Excel / Planilhas)</span>
              </label>
            </div>
          </div>

          {/* Frequência de Redundância */}
          <div>
            <span className="text-xs font-bold text-white block mb-2">
              Frequência de Sincronização S3:
            </span>
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'immediate', label: 'Ao Salvar Fechamento' },
                { id: 'daily', label: 'Diário (21h)' },
                { id: 'weekly', label: 'Semanal' },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setConfig({ ...config, syncFrequency: item.id as any })}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                    config.syncFrequency === item.id
                      ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/50 font-bold'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Ações: Testar Conexão, Salvar Credenciais e Enviar Backup Agora */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Clock className="w-3.5 h-3.5 text-indigo-400" />
          <span>
            {config.lastSyncTimestamp
              ? `Último envio para S3: ${new Date(config.lastSyncTimestamp).toLocaleString('pt-BR')}`
              : 'Nenhum backup enviado ainda'}
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Testar Conexão */}
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={isTesting || !config.endpoint || !config.bucket}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 active:scale-95"
            title="Verificar conectividade com o Endpoint e validar nome do Bucket"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin text-indigo-400' : ''}`} />
            <span>{isTesting ? 'Testando...' : 'Testar Conexão S3'}</span>
          </button>

          {/* Salvar Configuração */}
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-indigo-500/40 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
            <span>Salvar Credenciais S3</span>
          </button>

          {/* Enviar Backup Imediato */}
          <button
            type="button"
            onClick={handleImmediateUpload}
            disabled={isUploading || !isConfigured}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 via-purple-600 to-indigo-600 hover:from-indigo-400 hover:to-purple-500 text-white font-black text-xs transition flex items-center gap-2 cursor-pointer shadow-lg shadow-indigo-500/25 disabled:opacity-50 active:scale-95"
            title="Gerar os arquivos .json e .csv e sincronizar imediatamente no Bucket S3"
          >
            <Upload className={`w-3.5 h-3.5 ${isUploading ? 'animate-bounce' : ''}`} />
            <span>{isUploading ? 'Enviando para S3...' : 'Fazer Backup Imediato para S3'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
