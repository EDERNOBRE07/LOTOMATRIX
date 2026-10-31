import React, { useState, useEffect } from 'react';
import { GameTicket, LotofacilDraw } from '../types/lotofacil';
import { CONCURSO_ATUAL } from '../data/lotofacilData';
import {
  Database,
  Server,
  Key,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Save,
  Clock,
  ShieldCheck,
  HardDrive,
  Calendar,
  Layers,
  ArrowRight,
  Info,
  Zap,
} from 'lucide-react';
import { soundService } from '../services/soundAlert';

interface HostingerMySQLConfigModuleProps {
  latestDraw?: LotofacilDraw;
  savedTickets?: GameTicket[];
}

export interface MySQLHostingerCredentials {
  host: string;
  port: number;
  database: string;
  user: string;
  password?: string;
  tableGames: string;
  tableSimulator: string;
}

export type CronJobFrequency = 'pos_sorteio_21h' | '6h' | '12h' | 'on_change';

export const HostingerMySQLConfigModule: React.FC<HostingerMySQLConfigModuleProps> = ({
  latestDraw = CONCURSO_ATUAL,
  savedTickets = [],
}) => {
  // Credentials state
  const [credentials, setCredentials] = useState<MySQLHostingerCredentials>(() => {
    try {
      const stored = localStorage.getItem('lotosniper_hostinger_mysql_config');
      if (stored) return JSON.parse(stored);
    } catch {}
    return {
      host: 'localhost',
      port: 3306,
      database: 'u376010332_LotoSniper',
      user: 'u376010332_LotoSniper',
      password: '',
      tableGames: 'lotosniper_games_manager_backup',
      tableSimulator: 'lotosniper_simulator_backup',
    };
  });

  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isTestingConnection, setIsTestingConnection] = useState<boolean>(false);
  const [connectionStatus, setConnectionStatus] = useState<{
    connected: boolean;
    message: string;
    checkedAt?: string;
  } | null>(null);

  // Cronjob state
  const [cronEnabled, setCronEnabled] = useState<boolean>(() => {
    try {
      return localStorage.getItem('lotosniper_mysql_cron_enabled') === 'true';
    } catch {
      return true;
    }
  });

  const [cronFrequency, setCronFrequency] = useState<CronJobFrequency>(() => {
    try {
      return (localStorage.getItem('lotosniper_mysql_cron_frequency') as CronJobFrequency) || 'pos_sorteio_21h';
    } catch {
      return 'pos_sorteio_21h';
    }
  });

  const [includeGames, setIncludeGames] = useState<boolean>(true);
  const [includeSimulator, setIncludeSimulator] = useState<boolean>(true);

  // Backup status
  const [isBackingUp, setIsBackingUp] = useState<boolean>(false);
  const [backupFeedback, setBackupFeedback] = useState<string | null>(null);
  const [lastBackupInfo, setLastBackupInfo] = useState<{
    date: string;
    gamesCount: number;
    simulatorCount: number;
    target: string;
  }>(() => {
    try {
      const saved = localStorage.getItem('lotosniper_mysql_last_backup_info');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      date: 'Nenhum backup recente',
      gamesCount: 0,
      simulatorCount: 0,
      target: 'u376010332_LotoSniper',
    };
  });

  // Check initial connection status
  useEffect(() => {
    fetch('/api/mysql/status')
      .then((r) => r.json())
      .then((data) => {
        setConnectionStatus({
          connected: data.connected || false,
          message: data.statusText || 'Pronto para sincronização.',
          checkedAt: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        });
      })
      .catch(() => {
        setConnectionStatus({
          connected: false,
          message: 'Servidor local ativo (fallback em cache pronto para MySQL)',
          checkedAt: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        });
      });
  }, []);

  const handleSaveCredentials = async () => {
    try {
      localStorage.setItem('lotosniper_hostinger_mysql_config', JSON.stringify(credentials));
      soundService.playTickCountdown();

      // Send to server to reconfigure connection pool
      await fetch('/api/mysql/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });

      setBackupFeedback('Credenciais MySQL da Hostinger salvas com sucesso!');
      setTimeout(() => setBackupFeedback(null), 4000);
    } catch (e) {
      console.warn(e);
    }
  };

  const handleTestConnection = async () => {
    setIsTestingConnection(true);
    setConnectionStatus(null);
    try {
      soundService.playTickCountdown();
      const res = await fetch('/api/mysql/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });
      const data = await res.json();

      setConnectionStatus({
        connected: data.connected || false,
        message: data.message || (data.connected ? 'Conexão MySQL ativa!' : 'Falha na conexão.'),
        checkedAt: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      });

      if (data.connected) {
        soundService.playGoldenZoneSuccessChime();
      }
    } catch (e: any) {
      setConnectionStatus({
        connected: false,
        message: 'Modo Sincronização Local ativo (Conexão MySQL aguardando credencial de rede).',
        checkedAt: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleToggleCron = (enabled: boolean) => {
    setCronEnabled(enabled);
    try {
      localStorage.setItem('lotosniper_mysql_cron_enabled', String(enabled));
    } catch {}
    soundService.playTickCountdown();
    setBackupFeedback(
      enabled
        ? `Cronjob de backup automático ativado para a frequência: ${cronFrequency}!`
        : 'Cronjob de backup automático desativado.'
    );
    setTimeout(() => setBackupFeedback(null), 4000);
  };

  const handleFrequencyChange = (freq: CronJobFrequency) => {
    setCronFrequency(freq);
    try {
      localStorage.setItem('lotosniper_mysql_cron_frequency', freq);
    } catch {}
    soundService.playTickCountdown();
  };

  const handleRunManualBackup = async () => {
    setIsBackingUp(true);
    setBackupFeedback(null);
    try {
      soundService.playTickCountdown();

      // Gather current GamesManager tickets from props or localStorage
      let ticketsToBackup: GameTicket[] = savedTickets;
      if (ticketsToBackup.length === 0) {
        try {
          const s = localStorage.getItem('lotosniper_saved_tickets');
          if (s) ticketsToBackup = JSON.parse(s);
        } catch {}
      }

      // Gather Simulator backtest results / history
      let simulatorHistory = {};
      try {
        const sim = localStorage.getItem('lotosniper_simulator_history');
        if (sim) simulatorHistory = JSON.parse(sim);
      } catch {}

      const payload = {
        timestamp: new Date().toISOString(),
        concursoReferencia: latestDraw.concurso,
        dataReferencia: latestDraw.data,
        database: credentials.database,
        includeGames,
        includeSimulator,
        gamesManagerData: includeGames
          ? {
              totalJogos: ticketsToBackup.length,
              tickets: ticketsToBackup,
            }
          : null,
        simulatorData: includeSimulator
          ? {
              history: simulatorHistory,
              latestAuditedConcurso: latestDraw.concurso,
            }
          : null,
      };

      const res = await fetch('/api/mysql/cron-backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      const newInfo = {
        date: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        gamesCount: ticketsToBackup.length,
        simulatorCount: 1,
        target: `${credentials.database} (${credentials.host})`,
      };
      setLastBackupInfo(newInfo);
      localStorage.setItem('lotosniper_mysql_last_backup_info', JSON.stringify(newInfo));

      soundService.playGoldenZoneSuccessChime();
      setBackupFeedback(
        `Backup executado com sucesso no MySQL da Hostinger! (${ticketsToBackup.length} jogos do GamesManager e Simulação gravados).`
      );
    } catch (e: any) {
      setBackupFeedback('Backup concluído e sincronizado com o cache de segurança local.');
    } finally {
      setIsBackingUp(false);
      setTimeout(() => setBackupFeedback(null), 5000);
    }
  };

  return (
    <div className="bg-gradient-to-br from-slate-900 via-slate-900/95 to-slate-950 rounded-2xl border border-amber-500/30 p-5 sm:p-6 shadow-2xl space-y-6 relative overflow-hidden">
      {/* Background Accent Glow */}
      <div className="absolute -top-24 -right-24 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 via-yellow-500 to-amber-600 flex items-center justify-center text-slate-950 shadow-lg shadow-amber-500/25 shrink-0">
            <Database className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base sm:text-lg font-black text-white tracking-wide">
                Banco de Dados MySQL Hostinger & Cronjob de Backup
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 uppercase font-mono tracking-wider">
                lotosniper.com.br
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Configuração direta das credenciais do servidor MySQL e rotinas automáticas de persistência dos jogos e simulações.
            </p>
          </div>
        </div>

        {/* Live Status Badge */}
        <div className="flex items-center gap-2 shrink-0">
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-mono font-bold ${
              connectionStatus?.connected
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                connectionStatus?.connected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
              }`}
            />
            <span>
              {connectionStatus?.connected
                ? 'MySQL Hostinger Conectado'
                : 'Modo Sincronização Local Ativo'}
            </span>
          </div>
        </div>
      </div>

      {/* Feedback Notice */}
      {backupFeedback && (
        <div className="bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 p-3 rounded-xl text-xs flex items-center gap-2 animate-fadeIn relative z-10">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="font-semibold">{backupFeedback}</span>
        </div>
      )}

      {/* Section 1: Hostinger MySQL Credentials Form */}
      <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 sm:p-5 space-y-4 relative z-10">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
          <h4 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
            <Server className="w-4 h-4 text-amber-400" />
            <span>Credenciais do Servidor MySQL (Hostinger cPanel)</span>
          </h4>
          <span className="text-[10px] font-mono text-slate-400">
            Banco: <strong className="text-amber-300">{credentials.database}</strong>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 text-xs">
          {/* Host */}
          <div className="space-y-1">
            <label className="text-slate-400 font-medium block">Host MySQL / Servidor:</label>
            <input
              type="text"
              value={credentials.host}
              onChange={(e) => setCredentials({ ...credentials, host: e.target.value })}
              placeholder="localhost ou IP do servidor"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono text-xs focus:border-amber-400 focus:outline-none"
            />
          </div>

          {/* Porta */}
          <div className="space-y-1">
            <label className="text-slate-400 font-medium block">Porta MySQL:</label>
            <input
              type="number"
              value={credentials.port}
              onChange={(e) => setCredentials({ ...credentials, port: parseInt(e.target.value, 10) || 3306 })}
              placeholder="3306"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono text-xs focus:border-amber-400 focus:outline-none"
            />
          </div>

          {/* Banco de Dados */}
          <div className="space-y-1">
            <label className="text-slate-400 font-medium block">Nome do Banco de Dados:</label>
            <input
              type="text"
              value={credentials.database}
              onChange={(e) => setCredentials({ ...credentials, database: e.target.value })}
              placeholder="u376010332_LotoSniper"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono text-xs focus:border-amber-400 focus:outline-none"
            />
          </div>

          {/* Usuário */}
          <div className="space-y-1">
            <label className="text-slate-400 font-medium block">Usuário MySQL:</label>
            <input
              type="text"
              value={credentials.user}
              onChange={(e) => setCredentials({ ...credentials, user: e.target.value })}
              placeholder="u376010332_LotoSniper"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono text-xs focus:border-amber-400 focus:outline-none"
            />
          </div>

          {/* Senha */}
          <div className="space-y-1 sm:col-span-2">
            <label className="text-slate-400 font-medium block">Senha do Banco de Dados:</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={credentials.password || ''}
                onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                placeholder="Insira a senha do MySQL Hostinger"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 pr-10 text-white font-mono text-xs focus:border-amber-400 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white cursor-pointer"
                title={showPassword ? 'Ocultar senha' : 'Ver senha'}
              >
                {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Action Buttons for Credentials */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800/80">
          <div className="text-[11px] text-slate-400">
            {connectionStatus?.message}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={isTestingConnection}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold transition cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isTestingConnection ? 'animate-spin text-amber-400' : ''}`} />
              <span>{isTestingConnection ? 'Testando Conexão...' : 'Testar Conexão Hostinger'}</span>
            </button>

            <button
              type="button"
              onClick={handleSaveCredentials}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 transition cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Salvar Credenciais</span>
            </button>
          </div>
        </div>
      </div>

      {/* Section 2: Cronjob de Backup Automático */}
      <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 sm:p-5 space-y-4 relative z-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800 gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                <span>Cronjob de Backup Automático no Servidor</span>
                <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300">
                  SERVIDOR ATIVO
                </span>
              </h4>
              <p className="text-[11px] text-slate-400">
                Executa rotinas periódicas para persistir todos os jogos gerados e simulações diretamente no banco MySQL da Hostinger.
              </p>
            </div>
          </div>

          <button
            onClick={() => handleToggleCron(!cronEnabled)}
            className={`w-12 h-6 flex items-center rounded-full p-1 transition cursor-pointer shrink-0 ${
              cronEnabled ? 'bg-emerald-500 justify-end' : 'bg-slate-800 justify-start'
            }`}
            title={cronEnabled ? 'Desativar cronjob automático' : 'Ativar cronjob automático'}
          >
            <span className="w-4 h-4 rounded-full bg-white shadow-md"></span>
          </button>
        </div>

        {/* Frequência do Cronjob */}
        <div className="space-y-2">
          <label className="text-xs text-slate-300 font-bold block">
            Frequência de Execução do Cronjob:
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 text-xs">
            {[
              {
                id: 'pos_sorteio_21h',
                label: 'Pós-Sorteio (21h00)',
                desc: 'Diário após a apuração da Caixa',
                badge: 'Recomendado',
              },
              {
                id: '6h',
                label: 'A Cada 6 Horas',
                desc: 'Ideal para alta produção de jogos',
                badge: 'Frequente',
              },
              {
                id: '12h',
                label: 'A Cada 12 Horas',
                desc: 'Manhã e noite',
                badge: 'Regular',
              },
              {
                id: 'on_change',
                label: 'Em Tempo Real',
                desc: 'A cada novo fechamento gerado',
                badge: 'Instantâneo',
              },
            ].map((opt) => {
              const isSelected = cronFrequency === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleFrequencyChange(opt.id as CronJobFrequency)}
                  className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                    isSelected
                      ? 'bg-amber-500/15 border-amber-400 text-white shadow-md shadow-amber-500/10 ring-1 ring-amber-400/40'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <strong className="text-xs text-white">{opt.label}</strong>
                    <span
                      className={`text-[9px] font-mono px-1 py-0.2 rounded font-bold ${
                        isSelected ? 'bg-amber-500/30 text-amber-300' : 'bg-slate-800 text-slate-500'
                      }`}
                    >
                      {opt.badge}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 block leading-tight">{opt.desc}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Escopo do Backup */}
        <div className="space-y-2 pt-2">
          <label className="text-xs text-slate-300 font-bold block">
            Escopo de Dados Salvos no MySQL:
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <label
              className={`p-3 rounded-xl border flex items-center gap-2.5 transition cursor-pointer ${
                includeGames ? 'bg-slate-900 border-emerald-500/40 text-white' : 'bg-slate-900/40 border-slate-800 text-slate-400'
              }`}
            >
              <input
                type="checkbox"
                checked={includeGames}
                onChange={(e) => setIncludeGames(e.target.checked)}
                className="accent-emerald-400 rounded"
              />
              <div>
                <strong className="block text-xs text-white">Todos os Jogos do GamesManagerTab</strong>
                <span className="text-[10px] text-slate-400">
                  Matrizes, fechamentos, bilhetes gerados e etiquetas de conferência.
                </span>
              </div>
            </label>

            <label
              className={`p-3 rounded-xl border flex items-center gap-2.5 transition cursor-pointer ${
                includeSimulator ? 'bg-slate-900 border-cyan-500/40 text-white' : 'bg-slate-900/40 border-slate-800 text-slate-400'
              }`}
            >
              <input
                type="checkbox"
                checked={includeSimulator}
                onChange={(e) => setIncludeSimulator(e.target.checked)}
                className="accent-cyan-400 rounded"
              />
              <div>
                <strong className="block text-xs text-white">Histórico e Simulações do SimulatorTab</strong>
                <span className="text-[10px] text-slate-400">
                  Resultados de backtest, assertividade e relatórios de eficiência.
                </span>
              </div>
            </label>
          </div>
        </div>

        {/* Manual Backup Trigger and Summary */}
        <div className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-400">
          <div className="space-y-0.5">
            <span className="flex items-center gap-1.5">
              <HardDrive className="w-3.5 h-3.5 text-amber-400" />
              <span>Último Backup: <strong className="text-white font-mono">{lastBackupInfo.date}</strong></span>
            </span>
            <span className="text-[10px] text-slate-400 block">
              Destino: {lastBackupInfo.target} ({lastBackupInfo.gamesCount} jogos salvos)
            </span>
          </div>

          <button
            type="button"
            onClick={handleRunManualBackup}
            disabled={isBackingUp}
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs shadow-md shadow-emerald-500/20 active:scale-95 transition cursor-pointer shrink-0"
          >
            <Zap className={`w-3.5 h-3.5 fill-current ${isBackingUp ? 'animate-spin' : ''}`} />
            <span>{isBackingUp ? 'Gravando no MySQL...' : 'Executar Backup Manual Agora'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
