import React, { useState, useEffect } from 'react';
import {
  Timer,
  Clock,
  CheckCircle2,
  AlertCircle,
  Play,
  RotateCcw,
  FileJson,
  FileSpreadsheet,
  Download,
  Trash2,
  Server,
  Cloud,
  ShieldCheck,
  Calendar,
  Layers,
  ArrowUpRight,
} from 'lucide-react';
import {
  S3BackupConfig,
  getS3BackupConfig,
  saveS3BackupConfig,
  uploadBackupToS3,
  getS3CronLogs,
  addS3CronLog,
  clearS3CronLogs,
  S3CronExecutionLog,
} from '../services/s3BackupService';
import { getSavedFechamentos } from '../services/savedFechamentosStorage';
import { soundService } from '../services/soundAlert';
import { LotofacilDraw, GameTicket } from '../types/lotofacil';

interface S3CronjobManagerCardProps {
  latestDraw?: LotofacilDraw;
  savedTickets?: GameTicket[];
  onOpenS3Config?: () => void;
}

export const S3CronjobManagerCard: React.FC<S3CronjobManagerCardProps> = ({
  latestDraw,
  savedTickets = [],
  onOpenS3Config,
}) => {
  const [config, setConfig] = useState<S3BackupConfig>(getS3BackupConfig);
  const [logs, setLogs] = useState<S3CronExecutionLog[]>(getS3CronLogs);
  const [isExecutingNow, setIsExecutingNow] = useState<boolean>(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'success' | 'failure'>('all');

  // Estado do Cronjob
  const [cronActive, setCronActive] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('lotosniper_s3_cronjob_active');
      return saved ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

  // Horário Diário Escolhido (Padrão 02:00 da manhã)
  const [dailyTime, setDailyTime] = useState<string>(() => {
    try {
      return localStorage.getItem('lotosniper_s3_cron_daily_time') || '02:00';
    } catch {
      return '02:00';
    }
  });

  // Frequência do Cronjob
  const [scheduleType, setScheduleType] = useState<'daily' | 'after_draw' | 'draw_days'>(() => {
    try {
      return (localStorage.getItem('lotosniper_s3_cron_schedule_type') as any) || 'daily';
    } catch {
      return 'daily';
    }
  });

  // Última execução do cron
  const [lastRunNotice, setLastRunNotice] = useState<string | null>(() => {
    try {
      return localStorage.getItem('lotosniper_s3_last_cron_run') || null;
    } catch {
      return null;
    }
  });

  const isConfigured = Boolean(
    config.endpoint && config.bucket && config.accessKeyId && config.secretAccessKey
  );

  const handleToggleCron = (active: boolean) => {
    setCronActive(active);
    try {
      localStorage.setItem('lotosniper_s3_cronjob_active', String(active));
    } catch {}
  };

  const handleTimeChange = (time: string) => {
    setDailyTime(time);
    try {
      localStorage.setItem('lotosniper_s3_cron_daily_time', time);
    } catch {}
  };

  const handleScheduleTypeChange = (type: 'daily' | 'after_draw' | 'draw_days') => {
    setScheduleType(type);
    try {
      localStorage.setItem('lotosniper_s3_cron_schedule_type', type);
    } catch {}
  };

  // Atualiza logs quando emitido evento global
  useEffect(() => {
    const handleLogAdded = () => setLogs(getS3CronLogs());
    const handleLogsCleared = () => setLogs([]);
    const handleConfigUpdated = (e: any) => setConfig(e.detail || getS3BackupConfig());

    window.addEventListener('lotosniper-s3-cron-log-added', handleLogAdded);
    window.addEventListener('lotosniper-s3-cron-logs-cleared', handleLogsCleared);
    window.addEventListener('lotosniper-s3-config-updated', handleConfigUpdated);

    return () => {
      window.removeEventListener('lotosniper-s3-cron-log-added', handleLogAdded);
      window.removeEventListener('lotosniper-s3-cron-logs-cleared', handleLogsCleared);
      window.removeEventListener('lotosniper-s3-config-updated', handleConfigUpdated);
    };
  }, []);

  // Execução do Backup e Registro do Log
  const triggerS3Backup = async (triggerType: 'cron_daily' | 'cron_draw' | 'manual' | 'test') => {
    if (isExecutingNow) return;
    setIsExecutingNow(true);
    const startTime = Date.now();

    try {
      const savedFechamentos = getSavedFechamentos();
      const allTickets = savedFechamentos.flatMap((f) => f.tickets);
      const targetTickets = allTickets.length > 0 ? allTickets : savedTickets;

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

      const headers = ['Jogo', 'Dezenas', 'AcertosEsperados', 'Estrategia', 'Concurso', 'Data'];
      const rows = targetTickets.map((t, idx) => [
        `Jogo ${(t.index || idx + 1).toString().padStart(2, '0')}`,
        t.dezenas.map((n) => n.toString().padStart(2, '0')).join(' - '),
        t.scoreIA || 14,
        'Fechamento Salvo',
        latestDraw?.concurso || 3818,
        latestDraw?.data || '',
      ]);
      const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');

      const res = await uploadBackupToS3(config, {
        jsonContent,
        csvContent,
        concursoRef: latestDraw?.concurso,
      });

      const duration = Date.now() - startTime;
      const totalBytes = (jsonContent.length + csvContent.length);

      const triggerLabelMap = {
        cron_daily: `Cronjob Diário (${dailyTime})`,
        cron_draw: 'Pós-Apuração Caixa (20h45)',
        manual: 'Disparo Manual',
        test: 'Teste do Agendador',
      };

      const newLog = addS3CronLog({
        trigger: triggerType,
        triggerLabel: triggerLabelMap[triggerType],
        scheduledTime: dailyTime,
        status: res.success ? 'success' : 'failure',
        statusCode: res.success ? 200 : 500,
        filesUploaded: res.filesUploaded,
        totalBytes,
        durationMs: duration,
        message: res.message,
        bucket: config.bucket || 's3-bucket',
      });

      const nowTimeStr = new Date().toLocaleTimeString('pt-BR');
      setLastRunNotice(nowTimeStr);
      try {
        localStorage.setItem('lotosniper_s3_last_cron_run', nowTimeStr);
      } catch {}

      if (res.success) {
        soundService.playGoldenZoneSuccessChime();
      }

      setLogs((prev) => [newLog, ...prev.filter((l) => l.id !== newLog.id)]);
    } catch (err: any) {
      const duration = Date.now() - startTime;
      const failLog = addS3CronLog({
        trigger: triggerType,
        triggerLabel: `Cronjob (${dailyTime})`,
        scheduledTime: dailyTime,
        status: 'failure',
        statusCode: 500,
        filesUploaded: [],
        totalBytes: 0,
        durationMs: duration,
        message: err.message || 'Falha durante transmissão para S3',
        bucket: config.bucket || 's3-bucket',
      });
      setLogs((prev) => [failLog, ...prev]);
    } finally {
      setIsExecutingNow(false);
    }
  };

  // Timer para checar horário diário (ex: 02:00) a cada 60s
  useEffect(() => {
    if (!cronActive) return;

    let lastCheckedMinute = '';
    const interval = setInterval(() => {
      const now = new Date();
      const currentHHmm = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

      if (scheduleType === 'daily' || scheduleType === 'draw_days') {
        if (currentHHmm === dailyTime && lastCheckedMinute !== currentHHmm) {
          lastCheckedMinute = currentHHmm;
          // Se for draw_days, checa se não é domingo (0)
          if (scheduleType === 'draw_days' && now.getDay() === 0) return;

          console.log(`[Cronjob S3] Horário programado atingido (${dailyTime}). Disparando backup automático...`);
          triggerS3Backup('cron_daily');
        }
      }
    }, 30000); // Checa a cada 30 segundos

    return () => clearInterval(interval);
  }, [cronActive, dailyTime, scheduleType, config]);

  // Listener para evento de novo sorteio apurado
  useEffect(() => {
    const handleDrawAudited = () => {
      if (cronActive && (scheduleType === 'after_draw' || scheduleType === 'draw_days')) {
        console.log('[Cronjob S3] Sorteio apurado pela Caixa. Disparando backup automático...');
        triggerS3Backup('cron_draw');
      }
    };

    window.addEventListener('lotosniper-saved-games-audited', handleDrawAudited);
    return () => window.removeEventListener('lotosniper-saved-games-audited', handleDrawAudited);
  }, [cronActive, scheduleType, config]);

  const filteredLogs = logs.filter((log) => {
    if (filterStatus === 'all') return true;
    return log.status === filterStatus;
  });

  const handleClearLogs = () => {
    if (window.confirm('Deseja realmente limpar o histórico de logs do Cronjob S3?')) {
      clearS3CronLogs();
      setLogs([]);
    }
  };

  const handleExportLogs = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(logs, null, 2));
    const a = document.createElement('a');
    a.href = dataStr;
    a.download = `lotosniper_cronjob_s3_logs_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  };

  return (
    <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/40 rounded-3xl border-2 border-indigo-500/50 p-5 sm:p-6 shadow-2xl space-y-5 relative overflow-hidden">
      {/* Accent Background */}
      <div className="absolute -top-12 -right-12 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800 relative z-10">
        <div className="flex items-start gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-600 to-indigo-700 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30 shrink-0">
            <Timer className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base sm:text-lg font-black text-white tracking-wide">
                Gerenciador de Cronjobs para S3 · Backups Automáticos
              </h3>
              {cronActive ? (
                <span className="text-[10px] font-mono font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  CRONJOB S3 ATIVO
                </span>
              ) : (
                <span className="text-[10px] font-mono font-black uppercase px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                  CRONJOB PAUSADO
                </span>
              )}
            </div>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
              Agende a rotina diária de backup na nuvem para horários silenciosos (ex: <strong>02:00 da manhã</strong>) e acompanhe o registro cronológico de todas as execuções realizadas no seu bucket.
            </p>
          </div>
        </div>

        {/* Toggle Switch */}
        <div className="flex items-center gap-3 shrink-0 self-start sm:self-center bg-slate-950/80 p-2.5 rounded-2xl border border-slate-800">
          <span className="text-xs font-mono font-bold text-slate-300">
            {cronActive ? 'Agendador Ligado' : 'Agendador Desligado'}
          </span>
          <button
            type="button"
            onClick={() => handleToggleCron(!cronActive)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
              cronActive ? 'bg-indigo-600' : 'bg-slate-700'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                cronActive ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Painel de Configuração de Horário Diário */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 relative z-10">
        {/* Coluna 1: Seletor de Horário Diário (com destaque para 02:00) */}
        <div className="lg:col-span-1 bg-slate-950/80 p-4 rounded-2xl border border-slate-800 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-indigo-400" />
              <span>Horário de Execução Diária:</span>
            </span>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300">
              {dailyTime}
            </span>
          </div>

          <p className="text-[11px] text-slate-400">
            Defina o horário diário programado para o envio silencioso das matrizes e bilhetes salvos:
          </p>

          {/* Time Input */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">
              Horário Personalizado (HH:mm):
            </label>
            <div className="relative">
              <input
                type="time"
                value={dailyTime}
                onChange={(e) => handleTimeChange(e.target.value)}
                disabled={!cronActive}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono font-bold text-sm focus:outline-none focus:border-indigo-500 transition disabled:opacity-50"
              />
            </div>
          </div>

          {/* Botões de Atalho Rápido */}
          <div className="space-y-1.5 pt-1">
            <label className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">
              Atalhos Rápidos:
            </label>
            <div className="grid grid-cols-2 gap-1.5 text-xs">
              <button
                type="button"
                onClick={() => handleTimeChange('02:00')}
                className={`px-2.5 py-2 rounded-xl border text-left font-mono font-bold transition cursor-pointer flex flex-col ${
                  dailyTime === '02:00'
                    ? 'bg-indigo-600 text-white border-indigo-400 shadow-sm'
                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <span>02:00</span>
                <span className="text-[9px] font-normal opacity-80">Madrugada (Recomendado)</span>
              </button>

              <button
                type="button"
                onClick={() => handleTimeChange('03:00')}
                className={`px-2.5 py-2 rounded-xl border text-left font-mono font-bold transition cursor-pointer flex flex-col ${
                  dailyTime === '03:00'
                    ? 'bg-indigo-600 text-white border-indigo-400 shadow-sm'
                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <span>03:00</span>
                <span className="text-[9px] font-normal opacity-80">Madrugada</span>
              </button>

              <button
                type="button"
                onClick={() => handleTimeChange('20:45')}
                className={`px-2.5 py-2 rounded-xl border text-left font-mono font-bold transition cursor-pointer flex flex-col ${
                  dailyTime === '20:45'
                    ? 'bg-indigo-600 text-white border-indigo-400 shadow-sm'
                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <span>20:45</span>
                <span className="text-[9px] font-normal opacity-80">Pós-Sorteio Caixa</span>
              </button>

              <button
                type="button"
                onClick={() => handleTimeChange('23:30')}
                className={`px-2.5 py-2 rounded-xl border text-left font-mono font-bold transition cursor-pointer flex flex-col ${
                  dailyTime === '23:30'
                    ? 'bg-indigo-600 text-white border-indigo-400 shadow-sm'
                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <span>23:30</span>
                <span className="text-[9px] font-normal opacity-80">Consolidação Noturna</span>
              </button>
            </div>
          </div>
        </div>

        {/* Coluna 2: Frequência e Destino */}
        <div className="lg:col-span-2 bg-slate-950/80 p-4 rounded-2xl border border-slate-800 space-y-3 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-purple-400" />
                <span>Modo de Frequência do Cronjob:</span>
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                Bucket: <strong className="text-indigo-300">{config.bucket || 'Não Configurado'}</strong>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
              <button
                type="button"
                onClick={() => handleScheduleTypeChange('daily')}
                className={`p-3 rounded-xl border text-left transition cursor-pointer space-y-1 ${
                  scheduleType === 'daily'
                    ? 'bg-indigo-950/60 border-indigo-400 text-white ring-1 ring-indigo-400/30'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <strong className="block text-white font-bold text-xs">Diário às {dailyTime}</strong>
                  {scheduleType === 'daily' && <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />}
                </div>
                <span className="text-[11px] text-slate-400 block leading-tight">
                  Executa todo dia no horário agendado (ex: 02:00 da manhã).
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleScheduleTypeChange('after_draw')}
                className={`p-3 rounded-xl border text-left transition cursor-pointer space-y-1 ${
                  scheduleType === 'after_draw'
                    ? 'bg-indigo-950/60 border-indigo-400 text-white ring-1 ring-indigo-400/30'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <strong className="block text-white font-bold text-xs">Pós-Sorteio Caixa</strong>
                  {scheduleType === 'after_draw' && <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />}
                </div>
                <span className="text-[11px] text-slate-400 block leading-tight">
                  Disparo imediato após a apuração oficial do concurso (~20h45).
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleScheduleTypeChange('draw_days')}
                className={`p-3 rounded-xl border text-left transition cursor-pointer space-y-1 ${
                  scheduleType === 'draw_days'
                    ? 'bg-indigo-950/60 border-indigo-400 text-white ring-1 ring-indigo-400/30'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <strong className="block text-white font-bold text-xs">Dias de Concurso</strong>
                  {scheduleType === 'draw_days' && <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />}
                </div>
                <span className="text-[11px] text-slate-400 block leading-tight">
                  Segunda a Sábado às {dailyTime}, pausando aos domingos.
                </span>
              </button>
            </div>
          </div>

          {/* Próxima Execução & Disparo Manual Imediato */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-800 text-xs">
            <div className="flex items-center gap-2 text-slate-300">
              <Clock className="w-4 h-4 text-indigo-400 shrink-0" />
              <span>
                {cronActive ? (
                  <>
                    <strong className="text-white">Próxima Execução: </strong>
                    {scheduleType === 'daily'
                      ? `Hoje às ${dailyTime}`
                      : scheduleType === 'after_draw'
                      ? 'Hoje às 20h45 (Imediatamente após novo sorteio)'
                      : `Segunda a Sábado às ${dailyTime}`}
                  </>
                ) : (
                  <span className="text-slate-500 italic">Cronjob pausado pelo usuário.</span>
                )}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {onOpenS3Config && (
                <button
                  type="button"
                  onClick={onOpenS3Config}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-semibold transition cursor-pointer"
                >
                  Credenciais S3
                </button>
              )}

              <button
                type="button"
                onClick={() => triggerS3Backup('test')}
                disabled={isExecutingNow || !isConfigured}
                className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white font-bold text-xs transition cursor-pointer flex items-center gap-1.5 shadow-md shadow-indigo-500/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isExecutingNow ? (
                  <>
                    <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                    <span>Executando...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 text-indigo-200" />
                    <span>Disparar Agora (Gera Log)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Log das Últimas Execuções */}
      <div className="bg-slate-950/90 rounded-2xl border border-slate-800 p-4 space-y-3 relative z-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <h4 className="text-sm font-bold text-white">
              Log das Últimas Execuções do Cronjob S3
            </h4>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
              {filteredLogs.length} registro(s)
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs">
            {/* Filtros de Status */}
            <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-[11px]">
              <button
                type="button"
                onClick={() => setFilterStatus('all')}
                className={`px-2 py-0.5 rounded-lg font-bold transition cursor-pointer ${
                  filterStatus === 'all' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Todos
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus('success')}
                className={`px-2 py-0.5 rounded-lg font-bold transition cursor-pointer ${
                  filterStatus === 'success' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Sucesso
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus('failure')}
                className={`px-2 py-0.5 rounded-lg font-bold transition cursor-pointer ${
                  filterStatus === 'failure' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Falha
              </button>
            </div>

            <button
              type="button"
              onClick={handleExportLogs}
              disabled={logs.length === 0}
              className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition cursor-pointer disabled:opacity-40"
              title="Exportar logs em JSON"
            >
              <Download className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={handleClearLogs}
              disabled={logs.length === 0}
              className="p-1.5 rounded-lg bg-slate-900 hover:bg-rose-950 text-slate-400 hover:text-rose-400 border border-slate-800 transition cursor-pointer disabled:opacity-40"
              title="Limpar todos os logs"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Tabela / Lista de Logs */}
        {filteredLogs.length > 0 ? (
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {filteredLogs.map((log) => {
              const isSuccess = log.status === 'success';
              return (
                <div
                  key={log.id}
                  className={`p-3 rounded-xl border transition text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isSuccess
                      ? 'bg-slate-900/70 border-slate-800 hover:border-emerald-500/40'
                      : 'bg-rose-950/20 border-rose-500/40'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    {isSuccess ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    )}
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <strong className="text-white font-bold">{log.triggerLabel}</strong>
                        <span
                          className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-bold ${
                            isSuccess
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          }`}
                        >
                          {isSuccess ? '200 OK • SUCESSO' : `${log.statusCode} • FALHA`}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">{log.formattedTime}</span>
                      </div>
                      <p className="text-[11px] text-slate-300">{log.message}</p>
                      {log.filesUploaded && log.filesUploaded.length > 0 && (
                        <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400 flex-wrap pt-0.5">
                          <span>Arquivos:</span>
                          {log.filesUploaded.map((f, i) => (
                            <span key={i} className="text-indigo-300 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
                              {f.split('/').pop()}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 self-end sm:self-center font-mono text-[11px] text-slate-400">
                    {log.totalBytes > 0 && <span>{(log.totalBytes / 1024).toFixed(1)} KB</span>}
                    {log.durationMs > 0 && <span>{log.durationMs}ms</span>}
                    <span className="text-slate-500">{log.bucket}</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-6 rounded-xl bg-slate-900/40 border border-slate-800 text-center space-y-1.5 text-xs text-slate-400">
            <Clock className="w-5 h-5 mx-auto text-slate-600" />
            <p>Nenhum log encontrado para o filtro selecionado.</p>
          </div>
        )}
      </div>
    </div>
  );
};
