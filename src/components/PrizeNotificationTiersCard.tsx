import React, { useState, useEffect } from 'react';
import {
  Bell,
  BellRing,
  BellOff,
  CheckCircle2,
  AlertCircle,
  Volume2,
  Zap,
  ShieldCheck,
  Award,
  Sparkles,
  Trophy,
  Flame,
} from 'lucide-react';
import {
  PrizeNotificationTiersConfig,
  getPrizeNotificationTiers,
  savePrizeNotificationTiers,
  testNativePrizeNotification,
  isNotificationSupported,
  getNotificationPermission,
  requestNativeNotificationPermission,
} from '../services/nativeNotificationService';

export const PrizeNotificationTiersCard: React.FC = () => {
  const [tiers, setTiers] = useState<PrizeNotificationTiersConfig>(getPrizeNotificationTiers());
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isTestingTier, setIsTestingTier] = useState<number | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  useEffect(() => {
    setPermission(getNotificationPermission());

    const handlePermChange = (e: any) => {
      setPermission(e.detail || getNotificationPermission());
    };
    const handleTiersChange = (e: any) => {
      if (e.detail) setTiers(e.detail);
    };

    window.addEventListener('lotosniper-notification-perm-changed', handlePermChange);
    window.addEventListener('lotosniper-prize-tiers-changed', handleTiersChange);

    return () => {
      window.removeEventListener('lotosniper-notification-perm-changed', handlePermChange);
      window.removeEventListener('lotosniper-prize-tiers-changed', handleTiersChange);
    };
  }, []);

  const handleToggle = (key: keyof PrizeNotificationTiersConfig) => {
    const updated = {
      ...tiers,
      [key]: !tiers[key],
    };
    setTiers(updated);
    savePrizeNotificationTiers(updated);
    setFeedbackMessage('Configurações de alerta salvas com sucesso.');
    setTimeout(() => setFeedbackMessage(null), 3000);
  };

  const handleRequestPermission = async () => {
    const newPerm = await requestNativeNotificationPermission();
    setPermission(newPerm);
    if (newPerm === 'granted') {
      setFeedbackMessage('Permissão de notificações concedida pelo navegador!');
    } else {
      setFeedbackMessage('Notificações bloqueadas ou negadas no navegador.');
    }
    setTimeout(() => setFeedbackMessage(null), 4000);
  };

  const handleTestTier = async (hits: 11 | 12 | 13 | 14 | 15) => {
    setIsTestingTier(hits);
    try {
      const sent = await testNativePrizeNotification(hits);
      if (sent) {
        setFeedbackMessage(`Disparo de teste da faixa de ${hits} acertos enviado com sucesso!`);
      } else {
        setFeedbackMessage(`Aviso: Habilite as notificações do navegador para visualizar o teste da faixa de ${hits} acertos.`);
      }
    } catch {
      setFeedbackMessage('Erro ao disparar teste de notificação.');
    } finally {
      setIsTestingTier(null);
      setTimeout(() => setFeedbackMessage(null), 4000);
    }
  };

  const handleSetPreset = (preset: 'all' | 'high_only' | 'off') => {
    let updated: PrizeNotificationTiersConfig;
    if (preset === 'all') {
      updated = { hits11: true, hits12: true, hits13: true, hits14: true, hits15: true };
    } else if (preset === 'high_only') {
      updated = { hits11: false, hits12: false, hits13: true, hits14: true, hits15: true };
    } else {
      updated = { hits11: false, hits12: false, hits13: false, hits14: false, hits15: false };
    }
    setTiers(updated);
    savePrizeNotificationTiers(updated);
    setFeedbackMessage('Perfil de notificações atualizado.');
    setTimeout(() => setFeedbackMessage(null), 3000);
  };

  const tierDefinitions: Array<{
    hits: 11 | 12 | 13 | 14 | 15;
    key: keyof PrizeNotificationTiersConfig;
    title: string;
    badge: string;
    desc: string;
    color: string;
    borderColor: string;
    badgeColor: string;
    icon: React.ReactNode;
  }> = [
    {
      hits: 15,
      key: 'hits15',
      title: '15 Acertos • Prêmio Máximo',
      badge: 'GRAND JACKPOT',
      desc: 'Notificação imediata persistente com alerta de comemoração ao cravar as 15 dezenas.',
      color: 'from-amber-500/20 via-yellow-500/10 to-transparent',
      borderColor: 'border-amber-500/40',
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      icon: <Trophy className="w-5 h-5 text-amber-400" />,
    },
    {
      hits: 14,
      key: 'hits14',
      title: '14 Acertos • Faixa de Elite',
      badge: 'ALTA PREMIAÇÃO',
      desc: 'Disparo sonoro e push com o jogo premiado e link direto para auditoria de cotas.',
      color: 'from-cyan-500/20 via-teal-500/10 to-transparent',
      borderColor: 'border-cyan-500/40',
      badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
      icon: <Sparkles className="w-5 h-5 text-cyan-400" />,
    },
    {
      hits: 13,
      key: 'hits13',
      title: '13 Acertos • Lucro Garantido',
      badge: 'LUCRO GARANTIDO',
      desc: 'Alerta quando seus fechamentos atingirem 13 pontos (premiação média de R$ 30,00).',
      color: 'from-emerald-500/20 via-green-500/10 to-transparent',
      borderColor: 'border-emerald-500/40',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      icon: <Award className="w-5 h-5 text-emerald-400" />,
    },
    {
      hits: 12,
      key: 'hits12',
      title: '12 Acertos • Premiação Fixa',
      badge: 'R$ 12,00 FIXO',
      desc: 'Notifica bilhetes premiados com 12 acertos no rateio oficial das loterias.',
      color: 'from-blue-500/20 via-indigo-500/10 to-transparent',
      borderColor: 'border-blue-500/30',
      badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
      icon: <Zap className="w-5 h-5 text-blue-400" />,
    },
    {
      hits: 11,
      key: 'hits11',
      title: '11 Acertos • Faixa Mínima',
      badge: 'R$ 6,00 FIXO',
      desc: 'Dispara push para recuperação de custo da aposta com 11 pontos acertados.',
      color: 'from-purple-500/20 via-pink-500/10 to-transparent',
      borderColor: 'border-purple-500/30',
      badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
      icon: <Flame className="w-5 h-5 text-purple-400" />,
    },
  ];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden">
      {/* Decorative gradient top bar */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 via-emerald-400 to-cyan-500" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <BellRing className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              Faixas de Premiação para Notificações Nativas
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                11 A 15 PONTOS
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Personalize individualmente quais acertos disparam notificações push na área de trabalho e mobile
            </p>
          </div>
        </div>

        {/* Quick Presets */}
        <div className="flex items-center gap-1.5 self-start sm:self-center">
          <button
            onClick={() => handleSetPreset('high_only')}
            className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
            title="Apenas 13, 14 e 15 acertos"
          >
            Padrão (13-15)
          </button>
          <button
            onClick={() => handleSetPreset('all')}
            className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 transition cursor-pointer"
            title="Todas as 5 faixas premiadas"
          >
            Todas (11-15)
          </button>
          <button
            onClick={() => handleSetPreset('off')}
            className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/20 transition cursor-pointer"
            title="Desligar todos os alertas de acertos"
          >
            Desativar
          </button>
        </div>
      </div>

      {/* Permission Status Banner */}
      <div className="mb-6 p-4 rounded-2xl bg-slate-950/70 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={`w-8 h-8 rounded-xl flex items-center justify-center ${
              permission === 'granted'
                ? 'bg-emerald-500/20 text-emerald-400'
                : permission === 'denied'
                ? 'bg-red-500/20 text-red-400'
                : 'bg-amber-500/20 text-amber-400'
            }`}
          >
            {permission === 'granted' ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : permission === 'denied' ? (
              <BellOff className="w-4 h-4" />
            ) : (
              <Bell className="w-4 h-4" />
            )}
          </div>
          <div>
            <div className="text-xs font-bold text-white flex items-center gap-2">
              Status da Permissão no Navegador:
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded-md font-bold uppercase ${
                  permission === 'granted'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : permission === 'denied'
                    ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                }`}
              >
                {permission === 'granted'
                  ? 'Autorizado ✓'
                  : permission === 'denied'
                  ? 'Bloqueado no Navegador'
                  : 'Aguardando Permissão'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {permission === 'granted'
                ? 'Notificações push serão exibidas em primeiro plano ou com o navegador minimizado.'
                : permission === 'denied'
                ? 'Para receber alertas, libere as notificações no ícone de cadeado na barra de endereços.'
                : 'Clique no botão ao lado para solicitar a autorização de notificações do sistema.'}
            </p>
          </div>
        </div>

        {permission !== 'granted' && (
          <button
            onClick={handleRequestPermission}
            className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 text-xs font-black rounded-xl shadow-lg shadow-emerald-500/20 transition cursor-pointer shrink-0"
          >
            Habilitar Notificações
          </button>
        )}
      </div>

      {/* Feedback Toast */}
      {feedbackMessage && (
        <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{feedbackMessage}</span>
        </div>
      )}

      {/* 5 Prize Tiers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tierDefinitions.map((item) => {
          const isEnabled = tiers[item.key];
          const isTesting = isTestingTier === item.hits;

          return (
            <div
              key={item.key}
              className={`p-4 rounded-2xl border transition-all duration-200 relative bg-gradient-to-br ${item.color} ${
                isEnabled ? item.borderColor : 'border-slate-800 opacity-60'
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-700/50">
                    {item.icon}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">{item.title}</h4>
                    <span
                      className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded border ${item.badgeColor}`}
                    >
                      {item.badge}
                    </span>
                  </div>
                </div>

                {/* Custom Toggle Switch */}
                <button
                  onClick={() => handleToggle(item.key)}
                  className={`w-11 h-6 rounded-full p-0.5 transition-colors duration-200 cursor-pointer ${
                    isEnabled ? 'bg-emerald-500' : 'bg-slate-700'
                  }`}
                  title={isEnabled ? 'Desativar esta faixa' : 'Ativar esta faixa'}
                  aria-label={`Alternar notificação de ${item.hits} pontos`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform duration-200 ${
                      isEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <p className="text-[11px] text-slate-300 leading-relaxed mb-4 min-h-[32px]">
                {item.desc}
              </p>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                <span className="text-[10px] font-mono text-slate-400">
                  Status: <strong className={isEnabled ? 'text-emerald-400' : 'text-slate-500'}>{isEnabled ? 'ATIVO' : 'DESLIGADO'}</strong>
                </span>

                <button
                  onClick={() => handleTestTier(item.hits)}
                  disabled={isTesting}
                  className="px-2.5 py-1 bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-700 hover:border-emerald-500/50 text-[10px] font-semibold rounded-lg flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                  title={`Testar som e disparo de notificação nativa para ${item.hits} acertos`}
                >
                  <Volume2 className="w-3 h-3 text-emerald-400" />
                  <span>{isTesting ? 'Disparando...' : 'Testar Disparo'}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Info Footer */}
      <div className="mt-6 pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-slate-500 gap-2">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>As notificações operam em segundo plano via Service Worker para auditoria de bilhetes salvos.</span>
        </div>
        <span className="font-mono text-slate-400">Padrão Caixa Econômica Federal</span>
      </div>
    </div>
  );
};
