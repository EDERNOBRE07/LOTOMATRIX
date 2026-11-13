import React, { useState, useEffect } from 'react';
import {
  Bell,
  Volume2,
  VolumeX,
  Monitor,
  ShieldCheck,
  RotateCcw,
  Play,
  CheckCircle2,
  AlertCircle,
  Trophy,
  Clock,
  Flame,
  RefreshCw,
  Award,
  Sparkles,
} from 'lucide-react';
import { LotofacilDraw } from '../types/lotofacil';
import { CONCURSO_ATUAL } from '../data/lotofacilData';
import {
  DetailedNotificationRules,
  DEFAULT_DETAILED_NOTIFICATION_RULES,
  NotificationEventKey,
  getDetailedNotificationRules,
  saveDetailedNotificationRules,
  fireBrowserPushNotification,
  requestBrowserPushPermission,
} from '../services/notificationService';
import {
  isNotificationSupported,
  getNotificationPermission,
} from '../services/nativeNotificationService';
import { soundService, Alert13PlusSoundType } from '../services/soundAlert';

interface PushNotificationRulesPanelProps {
  latestDraw?: LotofacilDraw;
  onNotice?: (msg: string) => void;
}

interface EventMeta {
  key: NotificationEventKey;
  title: string;
  description: string;
  category: string;
  icon: React.ReactNode;
  thresholdLabel?: string;
  thresholdOptions?: { value: number; label: string }[];
  testTitle: (threshold?: number, concurso?: number) => string;
  testBody: (threshold?: number, concurso?: number) => string;
  playSound: () => void;
}

export const PushNotificationRulesPanel: React.FC<PushNotificationRulesPanelProps> = ({
  latestDraw = CONCURSO_ATUAL,
  onNotice,
}) => {
  const [rules, setRules] = useState<DetailedNotificationRules>(() => getDetailedNotificationRules());
  const [permission, setPermission] = useState<NotificationPermission>(() =>
    isNotificationSupported() ? getNotificationPermission() : 'denied'
  );
  const [sound13Type, setSound13Type] = useState<Alert13PlusSoundType>(() =>
    soundService.get13PlusSoundType()
  );
  const [statusFeedback, setStatusFeedback] = useState<{ type: 'ok' | 'warn'; text: string } | null>(null);

  useEffect(() => {
    const syncPerm = () => {
      if (isNotificationSupported()) {
        setPermission(getNotificationPermission());
      }
    };
    window.addEventListener('lotosniper-notification-perm-changed', syncPerm);
    return () => window.removeEventListener('lotosniper-notification-perm-changed', syncPerm);
  }, []);

  const showFeedback = (text: string, type: 'ok' | 'warn' = 'ok') => {
    setStatusFeedback({ text, type });
    onNotice?.(text);
    setTimeout(() => setStatusFeedback(null), 4500);
  };

  const commitRules = (next: DetailedNotificationRules) => {
    setRules(next);
    saveDetailedNotificationRules(next);
  };

  const handleRequestPermission = async () => {
    const perm = await requestBrowserPushPermission();
    setPermission(perm);
    if (perm === 'granted') {
      showFeedback('Permissão de notificações nativas do sistema operacional concedida.', 'ok');
    } else {
      showFeedback('Permissão bloqueada ou negada pelo navegador. Libere nas configurações do site.', 'warn');
    }
  };

  const toggleMaster = () => {
    const next = { ...rules, masterEnabled: !rules.masterEnabled };
    commitRules(next);
    showFeedback(
      next.masterEnabled
        ? 'Sistema de regras de notificação ativado.'
        : 'Sistema de notificações pausado globalmente.',
      next.masterEnabled ? 'ok' : 'warn'
    );
  };

  const toggleQuietMode = () => {
    const next = { ...rules, quietMode: !rules.quietMode };
    commitRules(next);
    showFeedback(
      next.quietMode
        ? 'Modo silencioso ativado: alertas sonoros suspensos.'
        : 'Alertas sonoros reativados conforme cada regra.',
      'ok'
    );
  };

  const updateEventRule = async (
    key: NotificationEventKey,
    patch: Partial<{ enabled: boolean; soundEnabled: boolean; nativePushEnabled: boolean; threshold: number }>
  ) => {
    // Se o usuário estiver ativando push nativo e ainda não tiver permissão, solicita
    if (patch.nativePushEnabled === true && isNotificationSupported() && permission !== 'granted') {
      const perm = await requestBrowserPushPermission();
      setPermission(perm);
    }

    const next: DetailedNotificationRules = {
      ...rules,
      events: {
        ...rules.events,
        [key]: {
          ...rules.events[key],
          ...patch,
        },
      },
    };
    commitRules(next);
  };

  const handleEnableAll = async () => {
    if (isNotificationSupported() && permission !== 'granted') {
      const perm = await requestBrowserPushPermission();
      setPermission(perm);
    }
    const nextEvents = { ...rules.events };
    (Object.keys(nextEvents) as NotificationEventKey[]).forEach((k) => {
      nextEvents[k] = {
        ...nextEvents[k],
        enabled: true,
        soundEnabled: true,
        nativePushEnabled: true,
      };
    });
    commitRules({ masterEnabled: true, quietMode: false, events: nextEvents });
    showFeedback('Todas as regras de notificação sonora e push nativo foram ativadas.', 'ok');
  };

  const handleResetDefaults = () => {
    const def: DetailedNotificationRules = {
      ...DEFAULT_DETAILED_NOTIFICATION_RULES,
      events: { ...DEFAULT_DETAILED_NOTIFICATION_RULES.events },
    };
    commitRules(def);
    showFeedback('Regras de notificação restauradas para o padrão recomendado.', 'ok');
  };

  const handleSound13Change = (val: Alert13PlusSoundType) => {
    setSound13Type(val);
    soundService.set13PlusSoundType(val);
    if (val === 'sino_ouro') soundService.playSinoDeOuro();
    else if (val === 'padrao') soundService.play14PontosCelebrationSound();
  };

  const eventDefinitions: EventMeta[] = [
    {
      key: 'premiacoes13Plus',
      title: 'Premiações 13+ Pontos (13, 14 e 15 Acertos)',
      description: 'Dispara imediatamente ao auditar seus bilhetes salvos e detectar pontuações principais.',
      category: 'Premiação Principal',
      icon: <Trophy className="w-4 h-4 text-amber-400" />,
      thresholdLabel: 'Faixa mínima',
      thresholdOptions: [
        { value: 13, label: '13+ pts' },
        { value: 14, label: '14+ pts' },
        { value: 15, label: '15 pts' },
      ],
      testTitle: (th, c) => `Premiação ${th ?? 13}+ Pontos Confirmada (#${c})`,
      testBody: (th, c) =>
        `Auditoria LotoSniper detectou bilhete premiado na faixa de ${th ?? 13}+ acertos no Concurso #${c}.`,
      playSound: () => soundService.play13PlusAlert(),
    },
    {
      key: 'inicioCiclo',
      title: 'Início de Ciclo das 25 Dezenas',
      description: 'Notifica quando o último sorteio inaugura um novo ciclo e define as 10 dezenas ausentes.',
      category: 'Ciclos',
      icon: <RefreshCw className="w-4 h-4 text-emerald-400" />,
      testTitle: (_th, c) => `Início de Novo Ciclo (#${c})`,
      testBody: (_th, c) =>
        `O Concurso #${c} abriu um novo ciclo das 25 dezenas. Confira as 10 dezenas ausentes para fixação.`,
      playSound: () => soundService.playOpportunityAlert(),
    },
    {
      key: 'fimCiclo',
      title: 'Reta Final / Fechamento de Ciclo',
      description: 'Alerta de alta probabilidade quando restarem poucas dezenas para encerrar o ciclo atual.',
      category: 'Ciclos',
      icon: <Sparkles className="w-4 h-4 text-amber-300" />,
      thresholdLabel: 'Ausentes ≤',
      thresholdOptions: [
        { value: 1, label: '≤ 1 dez.' },
        { value: 2, label: '≤ 2 dez.' },
        { value: 3, label: '≤ 3 dez.' },
      ],
      testTitle: (th, c) => `Reta Final do Ciclo (#${c})`,
      testBody: (th, c) =>
        `Faltam ${th ?? 3} ou menos dezenas para fechar o ciclo no Concurso #${c}. Alta propensão de retorno.`,
      playSound: () => soundService.playCycleAlertSound(),
    },
    {
      key: 'atrasosCriticos',
      title: 'Atrasos Críticos de Dezenas',
      description: 'Monitora hiatos prolongados acima da média estatística para seleção de âncoras.',
      category: 'Tendência & Hiato',
      icon: <Clock className="w-4 h-4 text-rose-400" />,
      thresholdLabel: 'Hiato ≥',
      thresholdOptions: [
        { value: 3, label: '≥ 3 conc.' },
        { value: 4, label: '≥ 4 conc.' },
        { value: 5, label: '≥ 5 conc.' },
        { value: 6, label: '≥ 6 conc.' },
      ],
      testTitle: (th, c) => `Alerta de Atraso Crítico (≥ ${th ?? 5} conc.)`,
      testBody: (th, c) =>
        `Dezenas com hiato igual ou superior a ${th ?? 5} concursos detectadas após o Concurso #${c}.`,
      playSound: () => soundService.playOpportunityAlert(),
    },
    {
      key: 'radarTendencias',
      title: 'Radar de Tendências Quentes (EMA)',
      description: 'Dispara quando uma dezena atinge força estatística extrema no modelo exponencial.',
      category: 'Radar IA',
      icon: <Flame className="w-4 h-4 text-orange-400" />,
      thresholdLabel: 'Força ≥',
      thresholdOptions: [
        { value: 80, label: '≥ 80%' },
        { value: 85, label: '≥ 85%' },
        { value: 90, label: '≥ 90%' },
      ],
      testTitle: (th, c) => `Radar Quente ≥ ${th ?? 90}% (#${c})`,
      testBody: (th, c) =>
        `Dezena em destaque atingiu ${th ?? 90}%+ de força preditiva EMA no Concurso #${c}.`,
      playSound: () => soundService.playGoldenZoneSuccessChime(),
    },
    {
      key: 'premiacoes11e12',
      title: 'Premiações Secundárias (11 e 12 Pontos)',
      description: 'Aviso opcional para acertos de retorno fixo (R$ 7,00 e R$ 14,00) nos bilhetes salvos.',
      category: 'Premiação Fixa',
      icon: <Award className="w-4 h-4 text-cyan-400" />,
      testTitle: (_th, c) => `Premiação Fixa 11/12 Pontos (#${c})`,
      testBody: (_th, c) =>
        `Conferência automática identificou bilhetes com 11 ou 12 acertos no Concurso #${c}.`,
      playSound: () => soundService.playSuccess(),
    },
    {
      key: 'novoConcurso',
      title: 'Novo Concurso Caixa Apurado',
      description: 'Notifica assim que a sincronização detectar um novo resultado oficial publicado pela Caixa.',
      category: 'Sincronização',
      icon: <Bell className="w-4 h-4 text-sky-400" />,
      testTitle: (_th, c) => `Novo Concurso Caixa #${c} Apurado`,
      testBody: (_th, c) =>
        `Resultado oficial do Concurso #${c} sincronizado. Auditoria automática pronta para visualização.`,
      playSound: () => soundService.playGoldenZoneSuccessChime(),
    },
  ];

  const handleTestEvent = async (meta: EventMeta) => {
    const rule = rules.events[meta.key];
    let soundPlayed = false;
    let pushSent = false;

    if (rule.soundEnabled && !rules.quietMode) {
      meta.playSound();
      soundPlayed = true;
    }

    if (rule.nativePushEnabled) {
      if (isNotificationSupported() && Notification.permission !== 'granted') {
        const perm = await requestBrowserPushPermission();
        setPermission(perm);
      }
      pushSent = await fireBrowserPushNotification(
        meta.testTitle(rule.threshold, latestDraw.concurso),
        meta.testBody(rule.threshold, latestDraw.concurso),
        `lotosniper-test-${meta.key}-${Date.now()}`
      );
    }

    if (!soundPlayed && !pushSent) {
      showFeedback(
        `Regra "${meta.title}" está sem canais ativos (Som e Push nativo desmarcados ou permissão pendente).`,
        'warn'
      );
    } else {
      const channels = [
        soundPlayed ? 'Alerta sonoro' : null,
        pushSent ? 'Notificação nativa do SO' : null,
      ]
        .filter(Boolean)
        .join(' + ');
      showFeedback(`Teste executado (${channels}) para "${meta.title}".`, 'ok');
    }
  };

  const activeCount = (Object.keys(rules.events) as NotificationEventKey[]).filter(
    (k) => rules.events[k].enabled
  ).length;

  return (
    <section className="bg-slate-900/95 rounded-2xl border border-slate-800 p-5 sm:p-6 shadow-2xl space-y-5">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-start gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-amber-500/15 border border-amber-500/35 flex items-center justify-center text-amber-400 shrink-0">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="font-semibold text-amber-300">Central de Regras de Notificação</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">{activeCount}/7 eventos ativos</span>
            </div>
            <h3 className="text-base sm:text-lg font-bold text-white tracking-tight mt-0.5">
              Personalização de Alertas Sonoros & Notificações Nativas (Push)
            </h3>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
              Escolha exatamente quais eventos devem disparar alerta sonoro no navegador e/ou notificação nativa do sistema operacional.
            </p>
          </div>
        </div>

        {/* Global Quick Controls */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={toggleMaster}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border transition cursor-pointer whitespace-nowrap shrink-0 ${
              rules.masterEnabled
                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/25'
                : 'bg-rose-500/15 text-rose-300 border-rose-500/40 hover:bg-rose-500/25'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{rules.masterEnabled ? 'Motor Ativo' : 'Motor Pausado'}</span>
          </button>

          <button
            type="button"
            onClick={toggleQuietMode}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition cursor-pointer whitespace-nowrap shrink-0 ${
              rules.quietMode
                ? 'bg-amber-500/15 text-amber-300 border-amber-500/40'
                : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700 hover:text-white'
            }`}
          >
            {rules.quietMode ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            <span>{rules.quietMode ? 'Silencioso: ON' : 'Áudio Liberado'}</span>
          </button>

          <button
            type="button"
            onClick={handleEnableAll}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold border border-slate-700 transition cursor-pointer whitespace-nowrap shrink-0"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Ativar Todos</span>
          </button>

          <button
            type="button"
            onClick={handleResetDefaults}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-300 text-xs font-semibold border border-slate-800 transition cursor-pointer whitespace-nowrap shrink-0"
            title="Restaurar regras padrão"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Padrão</span>
          </button>
        </div>
      </div>

      {/* OS Permission & Sound Profile Bar */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-slate-950/90 rounded-xl border border-slate-800 p-3.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <Monitor
              className={`w-4 h-4 shrink-0 ${
                permission === 'granted'
                  ? 'text-emerald-400'
                  : permission === 'denied'
                  ? 'text-rose-400'
                  : 'text-amber-400'
              }`}
            />
            <div className="min-w-0 text-xs">
              <span className="text-slate-400 block text-[11px]">Permissão Nativa do Sistema Operacional</span>
              <strong
                className={
                  permission === 'granted'
                    ? 'text-emerald-400'
                    : permission === 'denied'
                    ? 'text-rose-400'
                    : 'text-amber-300'
                }
              >
                {permission === 'granted'
                  ? 'Autorizada (Push OS ativo)'
                  : permission === 'denied'
                  ? 'Bloqueada no navegador'
                  : 'Aguardando autorização'}
              </strong>
            </div>
          </div>

          {permission !== 'granted' && (
            <button
              type="button"
              onClick={handleRequestPermission}
              className="px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs transition cursor-pointer whitespace-nowrap shrink-0"
            >
              Autorizar Push OS
            </button>
          )}
        </div>

        <div className="bg-slate-950/90 rounded-xl border border-slate-800 p-3.5 flex items-center justify-between gap-3">
          <div className="text-xs">
            <span className="text-slate-400 block text-[11px]">Timbre Sonoro para 13+ Acertos</span>
            <strong className="text-white">
              {sound13Type === 'sino_ouro'
                ? 'Sino de Ouro Harmônico'
                : sound13Type === 'silencioso'
                ? 'Mudo'
                : 'Fanfarra Padrão'}
            </strong>
          </div>

          <div className="flex items-center gap-1 p-1 bg-slate-900 rounded-lg border border-slate-800 text-[11px] shrink-0">
            {(
              [
                { id: 'padrao', label: 'Fanfarra' },
                { id: 'sino_ouro', label: 'Sino Ouro' },
                { id: 'silencioso', label: 'Mudo' },
              ] as { id: Alert13PlusSoundType; label: string }[]
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => handleSound13Change(opt.id)}
                className={`px-2.5 py-1 rounded-md font-semibold transition cursor-pointer whitespace-nowrap ${
                  sound13Type === opt.id
                    ? 'bg-emerald-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Status Notice */}
      {statusFeedback && (
        <div
          className={`p-3 rounded-xl border text-xs font-medium flex items-center gap-2 ${
            statusFeedback.type === 'ok'
              ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
              : 'bg-amber-500/15 border-amber-500/40 text-amber-300'
          }`}
        >
          {statusFeedback.type === 'ok' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
          )}
          <span>{statusFeedback.text}</span>
        </div>
      )}

      {/* Detailed Rules Matrix */}
      <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/70">
        {/* Table Header (Desktop) */}
        <div className="hidden md:grid md:grid-cols-12 gap-3 px-4 py-3 bg-slate-950 border-b border-slate-800 text-[11px] font-semibold text-slate-400">
          <div className="col-span-5">Evento Monitorado</div>
          <div className="col-span-2 text-center">Parâmetro</div>
          <div className="col-span-2 text-center">Alerta Sonoro</div>
          <div className="col-span-2 text-center">Push Nativo (SO)</div>
          <div className="col-span-1 text-right">Teste</div>
        </div>

        <div className="divide-y divide-slate-800/80">
          {eventDefinitions.map((meta) => {
            const rule = rules.events[meta.key];
            const isActive = rules.masterEnabled && rule.enabled;

            return (
              <div
                key={meta.key}
                className={`p-4 grid grid-cols-1 md:grid-cols-12 gap-3 md:items-center transition-colors ${
                  isActive ? 'bg-slate-950/40 hover:bg-slate-900/50' : 'bg-slate-950/80 opacity-65'
                }`}
              >
                {/* Event Info & Master Event Checkbox */}
                <div className="md:col-span-5 flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={rule.enabled}
                    disabled={!rules.masterEnabled}
                    onChange={(e) => updateEventRule(meta.key, { enabled: e.target.checked })}
                    className="mt-1 w-4 h-4 accent-emerald-500 rounded cursor-pointer shrink-0"
                    aria-label={`Ativar evento ${meta.title}`}
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {meta.icon}
                      <span className="text-xs sm:text-sm font-bold text-white">{meta.title}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                      {meta.description}
                    </p>
                  </div>
                </div>

                {/* Threshold Parameter */}
                <div className="md:col-span-2 flex md:justify-center items-center gap-2">
                  {meta.thresholdOptions ? (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-slate-500 md:hidden">{meta.thresholdLabel}:</span>
                      <select
                        value={rule.threshold ?? meta.thresholdOptions[0].value}
                        disabled={!isActive}
                        onChange={(e) =>
                          updateEventRule(meta.key, { threshold: Number(e.target.value) })
                        }
                        className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono tabular-nums text-white focus:outline-none focus:border-emerald-500 disabled:opacity-50 cursor-pointer"
                      >
                        {meta.thresholdOptions.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <span className="text-[11px] text-slate-500 font-mono">Automático</span>
                  )}
                </div>

                {/* Alerta Sonoro Toggle */}
                <div className="md:col-span-2 flex md:justify-center items-center justify-between">
                  <span className="text-xs text-slate-400 md:hidden">Alerta Sonoro:</span>
                  <button
                    type="button"
                    disabled={!isActive || rules.quietMode}
                    onClick={() => updateEventRule(meta.key, { soundEnabled: !rule.soundEnabled })}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer whitespace-nowrap disabled:opacity-40 ${
                      rule.soundEnabled && !rules.quietMode
                        ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                    }`}
                  >
                    {rule.soundEnabled && !rules.quietMode ? (
                      <Volume2 className="w-3.5 h-3.5" />
                    ) : (
                      <VolumeX className="w-3.5 h-3.5" />
                    )}
                    <span>{rule.soundEnabled && !rules.quietMode ? 'Som Ativo' : 'Sem Som'}</span>
                  </button>
                </div>

                {/* Notificação Nativa SO Toggle */}
                <div className="md:col-span-2 flex md:justify-center items-center justify-between">
                  <span className="text-xs text-slate-400 md:hidden">Push Nativo (SO):</span>
                  <button
                    type="button"
                    disabled={!isActive}
                    onClick={() =>
                      updateEventRule(meta.key, { nativePushEnabled: !rule.nativePushEnabled })
                    }
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer whitespace-nowrap disabled:opacity-40 ${
                      rule.nativePushEnabled
                        ? 'bg-amber-500/15 text-amber-300 border-amber-500/40'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                    }`}
                  >
                    <Bell className="w-3.5 h-3.5" />
                    <span>{rule.nativePushEnabled ? 'Push OS ON' : 'Push OFF'}</span>
                  </button>
                </div>

                {/* Test Button */}
                <div className="md:col-span-1 flex md:justify-end">
                  <button
                    type="button"
                    disabled={!isActive}
                    onClick={() => handleTestEvent(meta)}
                    className="w-full md:w-auto inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition cursor-pointer whitespace-nowrap disabled:opacity-40"
                    title={`Testar som e notificação nativa para ${meta.title}`}
                  >
                    <Play className="w-3 h-3 text-emerald-400" />
                    <span>Testar</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
