import React, { useState, useEffect } from 'react';
import { GameTicket, LotofacilDraw } from '../types/lotofacil';
import { soundService } from '../services/soundAlert';
import { countMatches } from '../services/combinatorics';
import {
  Bell,
  Volume2,
  VolumeX,
  Sparkles,
  Trophy,
  CheckCircle2,
  AlertCircle,
  Play,
  Flame,
  ShieldCheck,
  Smartphone,
  Radio,
  Sliders,
} from 'lucide-react';

interface JackpotAlertConfigModuleProps {
  latestDraw: LotofacilDraw;
  savedTickets: GameTicket[];
  onOpenConferidor?: () => void;
}

export type AlertThresholdType = '15_only' | '14_and_15' | '13_plus';

export const JackpotAlertConfigModule: React.FC<JackpotAlertConfigModuleProps> = ({
  latestDraw,
  savedTickets,
  onOpenConferidor,
}) => {
  // 1. Estado mestre de alertas de 14 e 15 acertos
  const [alertsMasterEnabled, setAlertsMasterEnabled] = useState<boolean>(() => {
    try {
      const v = localStorage.getItem('lotosniper_alert_14_15_enabled');
      return v !== null ? v === 'true' : true;
    } catch {
      return true;
    }
  });

  // 2. Alerta Sonoro
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    try {
      const v = localStorage.getItem('lotosniper_alert_sound_enabled');
      return v !== null ? v === 'true' : true;
    } catch {
      return true;
    }
  });

  // 3. Alerta Push Notification
  const [pushEnabled, setPushEnabled] = useState<boolean>(() => {
    try {
      const v = localStorage.getItem('lotosniper_alert_push_enabled');
      return v !== null ? v === 'true' : true;
    } catch {
      return true;
    }
  });

  // 4. Limiar de acertos para disparo
  const [threshold, setThreshold] = useState<AlertThresholdType>(() => {
    try {
      const v = localStorage.getItem('lotosniper_alert_threshold');
      return (v as AlertThresholdType) || '14_and_15';
    } catch {
      return '14_and_15';
    }
  });

  const [notificationPermission, setNotificationPermission] = useState<string>(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission;
    }
    return 'default';
  });

  const [feedbackNotice, setFeedbackNotice] = useState<string | null>(null);

  // Persistência das preferências
  const handleToggleMaster = (val: boolean) => {
    setAlertsMasterEnabled(val);
    try {
      localStorage.setItem('lotosniper_alert_14_15_enabled', String(val));
    } catch {}
    showNotice(val ? 'Alertas automáticos ativados!' : 'Alertas desativados.');
  };

  const handleToggleSound = (val: boolean) => {
    setSoundEnabled(val);
    try {
      localStorage.setItem('lotosniper_alert_sound_enabled', String(val));
    } catch {}
    showNotice(val ? 'Alerta sonoro (fanfarra) ativado.' : 'Som desativado.');
  };

  const handleTogglePush = async (val: boolean) => {
    if (val && typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const perm = await Notification.requestPermission();
        setNotificationPermission(perm);
        if (perm === 'granted') {
          setPushEnabled(true);
          localStorage.setItem('lotosniper_alert_push_enabled', 'true');
          showNotice('Push-Notification ativada com sucesso!');
        } else {
          setPushEnabled(false);
          localStorage.setItem('lotosniper_alert_push_enabled', 'false');
          showNotice('Permissão negada pelo navegador.');
        }
      } catch {
        setPushEnabled(false);
      }
    } else {
      setPushEnabled(val);
      try {
        localStorage.setItem('lotosniper_alert_push_enabled', String(val));
      } catch {}
      showNotice(val ? 'Push ativada.' : 'Push desativada.');
    }
  };

  const handleSelectThreshold = (th: AlertThresholdType) => {
    setThreshold(th);
    try {
      localStorage.setItem('lotosniper_alert_threshold', th);
    } catch {}
    showNotice(`Gatilho configurado para: ${th === '15_only' ? 'Apenas 15' : th === '14_and_15' ? '14 e 15' : '13+'}`);
  };

  const showNotice = (msg: string) => {
    setFeedbackNotice(msg);
    setTimeout(() => setFeedbackNotice(null), 3500);
  };

  // Funções de teste
  const test14Sound = () => {
    soundService.play14PontosCelebrationSound();
    showNotice('Reproduzindo Fanfarra de 14 Pontos (Web Audio API)!');
  };

  const test15Sound = () => {
    soundService.play15PontosJackpotSound();
    showNotice('Reproduzindo Fanfarra Épica de 15 Pontos (Grand Jackpot)!');
  };

  const testPushNotification = () => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      new Notification('🏆 LOTOSNIPER • 14 PONTOS DETECTADOS!', {
        body: `Jogo #04 em 'Meus Jogos' cravou 14 ACERTOS no Concurso Caixa #${latestDraw.concurso}! Toque para auditar.`,
        icon: '/favicon.ico',
      });
      showNotice('Notificação de teste enviada para sua área de trabalho/celular!');
    } else {
      showNotice('Ative a permissão de notificação no navegador para receber.');
      handleTogglePush(true);
    }
  };

  // Checagem em tempo real sobre os jogos salvos no último concurso
  const matchesSummary = React.useMemo(() => {
    if (savedTickets.length === 0 || !latestDraw) {
      return { total15: 0, total14: 0, total13: 0, winningTickets: [] };
    }

    let c15 = 0;
    let c14 = 0;
    let c13 = 0;
    const winning: { index: number; hits: number }[] = [];

    savedTickets.forEach((t) => {
      const hits = countMatches(t.dezenas, latestDraw.dezenas);
      if (hits === 15) {
        c15++;
        winning.push({ index: t.index, hits: 15 });
      } else if (hits === 14) {
        c14++;
        winning.push({ index: t.index, hits: 14 });
      } else if (hits === 13) {
        c13++;
        winning.push({ index: t.index, hits: 13 });
      }
    });

    return { total15: c15, total14: c14, total13: c13, winningTickets: winning };
  }, [savedTickets, latestDraw]);

  return (
    <div className="bg-gradient-to-br from-slate-900 via-slate-900/95 to-slate-950 rounded-2xl border border-amber-500/30 p-5 sm:p-6 shadow-2xl space-y-5 relative overflow-hidden">
      {/* Decorative Glow */}
      <div className="absolute -top-16 -right-16 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800 relative z-10">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 font-black shadow-lg shadow-amber-500/20">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <span>Alertas Customizados: 14 & 15 Pontos Automáticos</span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Concurso Caixa Live
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Disparo instantâneo por som fanfarra e push-notification quando os jogos gerados em 'Meus Jogos &
                Conferidor' atingirem a zona de premiação.
              </p>
            </div>
          </div>
        </div>

        {/* Master Toggle */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-slate-300">
            {alertsMasterEnabled ? 'Monitoramento Ativo' : 'Pausado'}
          </span>
          <button
            type="button"
            onClick={() => handleToggleMaster(!alertsMasterEnabled)}
            className={`w-14 h-7 flex items-center rounded-full p-1 transition cursor-pointer shadow-inner ${
              alertsMasterEnabled
                ? 'bg-gradient-to-r from-emerald-500 to-teal-400 justify-end ring-2 ring-emerald-400/40'
                : 'bg-slate-800 justify-start'
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-white shadow-md"></span>
          </button>
        </div>
      </div>

      {/* Feedback notice toast */}
      {feedbackNotice && (
        <div className="bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 p-3 rounded-xl text-xs flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{feedbackNotice}</span>
        </div>
      )}

      {/* Live Monitored Games Status Card */}
      <div className="bg-slate-950/80 rounded-xl border border-slate-800 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-emerald-400 animate-ping"></div>
          <div>
            <div className="font-bold text-white flex items-center gap-2">
              <span>Jogos Vinculados à Auditoria:</span>
              <span className="font-mono text-emerald-400 font-black text-sm">
                {savedTickets.length} bilhetes em 'Meus Jogos & Conferidor'
              </span>
            </div>
            <span className="text-[11px] text-slate-400">
              Concurso de Apuração Atual: <strong className="text-white font-mono">#{latestDraw.concurso}</strong> (
              {latestDraw.data})
            </span>
          </div>
        </div>

        {matchesSummary.total15 > 0 || matchesSummary.total14 > 0 ? (
          <div className="flex items-center gap-2 bg-amber-500/15 border border-amber-500/40 px-3 py-1.5 rounded-lg text-amber-300 font-bold">
            <Flame className="w-4 h-4 fill-amber-400" />
            <span>
              {matchesSummary.total15 > 0 ? `🎉 ${matchesSummary.total15} jogo(s) com 15 PONTOS!` : ''}
              {matchesSummary.total14 > 0 ? ` ⚡ ${matchesSummary.total14} jogo(s) com 14 PONTOS!` : ''}
            </span>
            {onOpenConferidor && (
              <button
                onClick={onOpenConferidor}
                className="ml-2 underline text-white hover:text-amber-200 cursor-pointer"
              >
                Conferir agora
              </button>
            )}
          </div>
        ) : (
          <div className="text-[11px] text-slate-400 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Aguardando apuração automática do próximo concurso</span>
          </div>
        )}
      </div>

      {/* Settings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Option 1: Áudio & Fanfarra */}
        <div className="bg-slate-950/70 rounded-xl border border-slate-800/90 p-4 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-850">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-teal-500/15 text-teal-400 border border-teal-500/30">
                <Volume2 className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-white text-xs">Alerta Sonoro (Web Audio Fanfarra)</h4>
                <p className="text-[11px] text-slate-400">Síntese de áudio imediata sem necessidade de arquivos externos</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleToggleSound(!soundEnabled)}
              className={`w-10 h-5 flex items-center rounded-full p-0.5 transition cursor-pointer ${
                soundEnabled ? 'bg-teal-500 justify-end' : 'bg-slate-800 justify-start'
              }`}
            >
              <span className="w-4 h-4 rounded-full bg-white shadow"></span>
            </button>
          </div>

          <p className="text-[11px] text-slate-300 leading-relaxed">
            Toca fanfarras triunfais calibradas em tríade maior quando uma aposta salvar cravou 14 pontos (fanfarra C5-E5-G5-C6) ou 15 pontos (Grande Prêmio).
          </p>

          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={test14Sound}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-teal-950/60 hover:bg-teal-900/80 text-teal-300 font-bold text-[11px] border border-teal-500/40 transition cursor-pointer"
            >
              <Play className="w-3 h-3 fill-current" />
              <span>Ouvir 14 Pontos</span>
            </button>

            <button
              type="button"
              onClick={test15Sound}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-amber-950/60 hover:bg-amber-900/80 text-amber-300 font-bold text-[11px] border border-amber-500/40 transition cursor-pointer"
            >
              <Sparkles className="w-3 h-3 fill-current" />
              <span>Ouvir 15 Pontos</span>
            </button>
          </div>
        </div>

        {/* Option 2: Push Notifications */}
        <div className="bg-slate-950/70 rounded-xl border border-slate-800/90 p-4 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-850">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-amber-500/15 text-amber-400 border border-amber-500/30">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-white text-xs">Push-Notification (Desktop & Mobile)</h4>
                <p className="text-[11px] text-slate-400">Notificação pop-up nativa na barra do sistema</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleTogglePush(!pushEnabled)}
              className={`w-10 h-5 flex items-center rounded-full p-0.5 transition cursor-pointer ${
                pushEnabled ? 'bg-amber-500 justify-end' : 'bg-slate-800 justify-start'
              }`}
            >
              <span className="w-4 h-4 rounded-full bg-white shadow"></span>
            </button>
          </div>

          <p className="text-[11px] text-slate-300 leading-relaxed">
            Envia notificação mesmo com a aba em segundo plano assim que a Caixa concluir o sorteio e um bilhete seu premiar.
          </p>

          <div className="flex items-center justify-between gap-2 pt-1 text-[11px]">
            <span className="text-slate-400 font-mono">
              Permissão: <strong className="text-white capitalize">{notificationPermission}</strong>
            </span>

            <button
              type="button"
              onClick={testPushNotification}
              className="flex items-center gap-1.5 py-1.5 px-3 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold border border-amber-500/30 transition cursor-pointer"
            >
              <Radio className="w-3 h-3" />
              <span>Disparar Push de Teste</span>
            </button>
          </div>
        </div>
      </div>

      {/* Threshold Selector (Gatilho) */}
      <div className="bg-slate-950/90 rounded-xl border border-slate-800 p-4 space-y-2.5">
        <div className="flex items-center gap-2 text-xs font-bold text-white">
          <Sliders className="w-4 h-4 text-amber-400" />
          <span>Definir Faixa Mínima de Acertos para Disparo Automático:</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <button
            type="button"
            onClick={() => handleSelectThreshold('14_and_15')}
            className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
              threshold === '14_and_15'
                ? 'bg-amber-500/15 border-amber-400 ring-1 ring-amber-400/30 text-white'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
            }`}
          >
            <div>
              <div className="flex items-center justify-between">
                <strong className="text-xs text-amber-300 font-bold block">14 e 15 Pontos</strong>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  RECOMENDADO
                </span>
              </div>
              <span className="text-[11px] text-slate-300 mt-1 block">
                Dispara para qualquer bilhete que cravar as duas faixas nobres da Lotofácil.
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleSelectThreshold('15_only')}
            className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
              threshold === '15_only'
                ? 'bg-amber-500/15 border-amber-400 ring-1 ring-amber-400/30 text-white'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
            }`}
          >
            <div>
              <strong className="text-xs text-white font-bold block">Apenas 15 Pontos (Jackpot)</strong>
              <span className="text-[11px] text-slate-400 mt-1 block">
                Alerta exclusivo de premiação máxima do sorteio Caixa.
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleSelectThreshold('13_plus')}
            className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
              threshold === '13_plus'
                ? 'bg-amber-500/15 border-amber-400 ring-1 ring-amber-400/30 text-white'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
            }`}
          >
            <div>
              <strong className="text-xs text-white font-bold block">A partir de 13 Pontos</strong>
              <span className="text-[11px] text-slate-400 mt-1 block">
                Dispara também para 13 pontos (faixa de retorno financeiro ampliado).
              </span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};
