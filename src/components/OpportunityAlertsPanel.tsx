import React, { useState, useEffect } from 'react';
import { DezenaStats, LotofacilDraw } from '../types/lotofacil';
import { soundService } from '../services/soundAlert';
import {
  Bell,
  Volume2,
  VolumeX,
  Radio,
  Sparkles,
  AlertTriangle,
  Clock,
  Layers,
  CheckCircle2,
  RotateCcw,
  Sliders,
  Send,
  Zap,
} from 'lucide-react';

export interface OpportunityAlertConfig {
  enabled: boolean;
  soundEnabled: boolean;
  pushEnabled: boolean;
  criticalDelayThreshold: number; // e.g. 5 contests
  monitorMode: 'all' | 'custom';
  customNumbers: number[];
  cycleAlertEnabled: boolean; // triggers when pending cycle numbers < 3
  lastTriggeredConcurso?: number;
}

export const DEFAULT_OPPORTUNITY_CONFIG: OpportunityAlertConfig = {
  enabled: true,
  soundEnabled: true,
  pushEnabled: true,
  criticalDelayThreshold: 5,
  monitorMode: 'all',
  customNumbers: [5, 10, 13, 20, 24],
  cycleAlertEnabled: true,
};

interface OpportunityAlertsPanelProps {
  latestDraw?: LotofacilDraw;
  statsList?: DezenaStats[];
  cyclePendingNumbers?: number[];
  concursosNoCiclo?: number;
}

export const OpportunityAlertsPanel: React.FC<OpportunityAlertsPanelProps> = ({
  latestDraw,
  statsList = [],
  cyclePendingNumbers = [],
  concursosNoCiclo = 3,
}) => {
  const [config, setConfig] = useState<OpportunityAlertConfig>(() => {
    try {
      const saved = localStorage.getItem('lotosniper_opportunity_alerts_config');
      return saved ? JSON.parse(saved) : DEFAULT_OPPORTUNITY_CONFIG;
    } catch {
      return DEFAULT_OPPORTUNITY_CONFIG;
    }
  });

  const [testNotice, setTestNotice] = useState<string | null>(null);

  // Save config changes to localStorage
  const updateConfig = (patch: Partial<OpportunityAlertConfig>) => {
    setConfig((prev) => {
      const next = { ...prev, ...patch };
      try {
        localStorage.setItem('lotosniper_opportunity_alerts_config', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  // Find numbers currently matching the delay threshold criteria
  const activeDelayedNumbers = statsList.filter((s) => {
    const isTarget = config.monitorMode === 'all' || config.customNumbers.includes(s.numero);
    return isTarget && s.atrasoAtual >= config.criticalDelayThreshold;
  });

  // Check if cycle condition is triggered (< 3 missing dezenas, i.e. 1 or 2)
  const isCycleTriggered = config.cycleAlertEnabled && cyclePendingNumbers.length > 0 && cyclePendingNumbers.length < 3;

  const totalActiveTriggers = (activeDelayedNumbers.length > 0 ? 1 : 0) + (isCycleTriggered ? 1 : 0);

  const handleToggleNumber = (num: number) => {
    if (config.customNumbers.includes(num)) {
      updateConfig({ customNumbers: config.customNumbers.filter((n) => n !== num) });
    } else {
      updateConfig({ customNumbers: [...config.customNumbers, num].sort((a, b) => a - b) });
    }
  };

  const handleSelectAll = () => {
    updateConfig({ customNumbers: Array.from({ length: 25 }, (_, i) => i + 1) });
  };

  const handleClearNumbers = () => {
    updateConfig({ customNumbers: [] });
  };

  const handleTestTrigger = async () => {
    if (config.soundEnabled) {
      soundService.playOpportunityAlert();
    }

    if (config.pushEnabled && typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        const bodyText = isCycleTriggered
          ? `Ciclo das 25 Dezenas em iminência! Faltam apenas ${cyclePendingNumbers.length} dezenas (${cyclePendingNumbers.join(', ')}).`
          : `Gatilho de Atraso Crítico: ${activeDelayedNumbers.length} dezenas em hiato (${activeDelayedNumbers.map(s => s.numero.toString().padStart(2, '0')).slice(0, 4).join(', ')}).`;

        new Notification('🎯 LotoSniper • Alerta de Oportunidade!', {
          body: bodyText,
          icon: '/favicon.ico',
        });
        setTestNotice('Alerta sonoro sintetizado e notificação push enviada!');
      } else {
        const perm = await Notification.requestPermission();
        if (perm === 'granted') {
          new Notification('🎯 LotoSniper • Alertas de Oportunidade Ativados!', {
            body: 'Você receberá avisos automáticos sobre atrasos críticos e fechamento de ciclo.',
          });
          setTestNotice('Permissão concedida! Notificação disparada.');
        } else {
          setTestNotice('Áudio executado! Para push, autorize as notificações do navegador.');
        }
      }
    } else {
      setTestNotice('Alerta sonoro executado com sucesso!');
    }

    setTimeout(() => setTestNotice(null), 4000);
  };

  return (
    <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-5 sm:p-6 shadow-xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-800 gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-tr from-amber-500/20 via-orange-500/20 to-rose-500/20 border border-amber-500/40 text-amber-300">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <span>Painel de Alertas de Oportunidade</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 uppercase font-bold">
                Monitoramento Passivo
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Gatilhos sonoros e push disparados ao atingir atrasos críticos ou fechamento iminente do ciclo (&lt; 3 ausentes).
            </p>
          </div>
        </div>

        {/* Master Active Toggle & Test */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleTestTrigger}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-bold text-xs transition cursor-pointer"
            title="Simular execução do alerta agora"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Testar Alerta</span>
          </button>

          <button
            type="button"
            onClick={() => updateConfig({ enabled: !config.enabled })}
            className={`w-12 h-6 flex items-center rounded-full p-1 transition cursor-pointer ${
              config.enabled ? 'bg-emerald-500 justify-end' : 'bg-slate-800 justify-start'
            }`}
            title={config.enabled ? 'Monitoramento Passivo Ativo' : 'Monitoramento Desativado'}
          >
            <span className="w-4 h-4 rounded-full bg-white shadow-md"></span>
          </button>
        </div>
      </div>

      {testNotice && (
        <div className="bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 p-3 rounded-xl text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{testNotice}</span>
        </div>
      )}

      {/* Live Monitor Trigger Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {/* Status 1: Atraso Crítico */}
        <div
          className={`p-4 rounded-xl border transition ${
            activeDelayedNumbers.length > 0 && config.enabled
              ? 'bg-amber-950/20 border-amber-500/40 ring-1 ring-amber-500/30'
              : 'bg-slate-950/60 border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-mono font-bold text-slate-400 uppercase flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              Gatilho: Atraso Crítico (≥ {config.criticalDelayThreshold} conc.)
            </span>
            <span
              className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
                activeDelayedNumbers.length > 0
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {activeDelayedNumbers.length} {activeDelayedNumbers.length === 1 ? 'dezena' : 'dezenas'}
            </span>
          </div>

          {activeDelayedNumbers.length > 0 ? (
            <div className="space-y-1.5">
              <div className="flex flex-wrap gap-1.5">
                {activeDelayedNumbers.map((s) => (
                  <span
                    key={s.numero}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-200 border border-amber-500/30 text-xs font-mono font-bold"
                  >
                    <span>{s.numero.toString().padStart(2, '0')}</span>
                    <span className="text-[10px] text-amber-400">({s.atrasoAtual}x)</span>
                  </span>
                ))}
              </div>
              <p className="text-[10px] text-amber-300/80">
                Altíssima pressão estatística de retorno detectada!
              </p>
            </div>
          ) : (
            <p className="text-xs text-slate-400">
              Nenhuma dezena monitorada atingiu {config.criticalDelayThreshold} concursos de hiato.
            </p>
          )}
        </div>

        {/* Status 2: Ciclo das 25 Dezenas (< 3 ausentes) */}
        <div
          className={`p-4 rounded-xl border transition ${
            isCycleTriggered && config.enabled
              ? 'bg-emerald-950/30 border-emerald-500/50 ring-1 ring-emerald-500/30'
              : 'bg-slate-950/60 border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-mono font-bold text-slate-400 uppercase flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-emerald-400" />
              Gatilho: Ciclo &lt; 3 Ausentes
            </span>
            <span
              className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
                isCycleTriggered
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {cyclePendingNumbers.length} ausente(s)
            </span>
          </div>

          {isCycleTriggered ? (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs text-emerald-300 font-bold">Dezenas Chave:</span>
                {cyclePendingNumbers.map((n) => (
                  <span
                    key={n}
                    className="inline-flex items-center justify-center w-6 h-6 rounded bg-emerald-500 text-slate-950 text-xs font-mono font-black shadow-sm"
                  >
                    {n.toString().padStart(2, '0')}
                  </span>
                ))}
              </div>
              <p className="text-[10px] text-emerald-400">
                Gatilho Ativo: restam menos de 3 dezenas no ciclo ({concursosNoCiclo}º concurso).
              </p>
            </div>
          ) : (
            <p className="text-xs text-slate-400">
              Ciclo atual possui {cyclePendingNumbers.length} dezenas ausentes (gatilho dispara quando restar 1 ou 2).
            </p>
          )}
        </div>

        {/* Status 3: Modo de Notificação Ativo */}
        <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 flex flex-col justify-between">
          <div>
            <span className="text-[11px] font-mono font-bold text-slate-400 uppercase block mb-1.5">
              Canais de Alerta
            </span>
            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1 text-slate-300">
                {config.soundEnabled ? (
                  <Volume2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <VolumeX className="w-4 h-4 text-slate-500" />
                )}
                <span>Som: {config.soundEnabled ? 'Ligado' : 'Mudo'}</span>
              </div>
              <div className="flex items-center gap-1 text-slate-300">
                <Bell className={`w-4 h-4 ${config.pushEnabled ? 'text-amber-400' : 'text-slate-500'}`} />
                <span>Push: {config.pushEnabled ? 'Habilitado' : 'Inativo'}</span>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800 text-[10px] text-slate-400 flex items-center justify-between mt-2">
            <span>Disparo em segundo plano:</span>
            <strong className={config.enabled ? 'text-emerald-400' : 'text-slate-500'}>
              {config.enabled ? 'Sincronizado com a Caixa' : 'Pausado'}
            </strong>
          </div>
        </div>
      </div>

      {/* Controles de Configuração dos Gatilhos */}
      <div className="space-y-4 pt-2 border-t border-slate-800">
        <h4 className="text-xs font-bold text-white uppercase font-mono tracking-wider flex items-center gap-2">
          <Sliders className="w-4 h-4 text-emerald-400" />
          <span>Configuração dos Limiares & Parâmetros</span>
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Parâmetro 1: Limiar de Atraso Crítico */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <strong className="text-xs text-white block">Limiar de Atraso Crítico</strong>
                <span className="text-[11px] text-slate-400">
                  Disparar quando a dezena atingir N concursos consecutivos ausente
                </span>
              </div>
              <span className="text-sm font-mono font-black text-amber-400 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30">
                ≥ {config.criticalDelayThreshold} conc.
              </span>
            </div>

            <input
              type="range"
              min={3}
              max={10}
              step={1}
              value={config.criticalDelayThreshold}
              onChange={(e) => updateConfig({ criticalDelayThreshold: parseInt(e.target.value, 10) })}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
            />

            <div className="flex justify-between text-[10px] font-mono text-slate-500">
              <span>3 concursos</span>
              <span>5 (Padrão)</span>
              <span>7 (Raro)</span>
              <span>10 (Extremo)</span>
            </div>
          </div>

          {/* Parâmetro 2: Notificações e Ciclo */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
            <strong className="text-xs text-white block">Gatilhos Habilitados</strong>
            <div className="space-y-2 text-xs">
              <label className="flex items-center gap-2.5 cursor-pointer text-slate-300">
                <input
                  type="checkbox"
                  checked={config.cycleAlertEnabled}
                  onChange={(e) => updateConfig({ cycleAlertEnabled: e.target.checked })}
                  className="rounded accent-emerald-500"
                />
                <span>Alertar quando o Ciclo de Dezenas tiver <strong>menos de 3 ausentes</strong></span>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer text-slate-300">
                <input
                  type="checkbox"
                  checked={config.soundEnabled}
                  onChange={(e) => updateConfig({ soundEnabled: e.target.checked })}
                  className="rounded accent-emerald-500"
                />
                <span>Emitir sinal sonoro sintetizado via Web Audio API</span>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer text-slate-300">
                <input
                  type="checkbox"
                  checked={config.pushEnabled}
                  onChange={(e) => updateConfig({ pushEnabled: e.target.checked })}
                  className="rounded accent-emerald-500"
                />
                <span>Enviar notificação push na área de trabalho / mobile</span>
              </label>
            </div>
          </div>
        </div>

        {/* Modo de Monitoramento: Todas ou Dezenas Específicas */}
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <strong className="text-xs text-white block">Escopo de Dezenas Monitoradas</strong>
              <span className="text-[11px] text-slate-400">
                Defina se o alerta de atraso crítico deve rastrear todo o volante ou dezenas selecionadas
              </span>
            </div>

            <div className="flex items-center gap-1.5 p-1 bg-slate-900 rounded-lg border border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => updateConfig({ monitorMode: 'all' })}
                className={`px-3 py-1 rounded-md font-bold transition cursor-pointer ${
                  config.monitorMode === 'all'
                    ? 'bg-emerald-500 text-slate-950'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Todas as 25 Dezenas
              </button>
              <button
                type="button"
                onClick={() => updateConfig({ monitorMode: 'custom' })}
                className={`px-3 py-1 rounded-md font-bold transition cursor-pointer ${
                  config.monitorMode === 'custom'
                    ? 'bg-emerald-500 text-slate-950'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Personalizado ({config.customNumbers.length})
              </button>
            </div>
          </div>

          {/* Seletor Customizado de Dezenas */}
          {config.monitorMode === 'custom' && (
            <div className="space-y-2 pt-2 border-t border-slate-850">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 text-[11px]">
                  Clique nas dezenas que deseja monitorar passivamente:
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="text-[10px] text-emerald-400 hover:underline cursor-pointer"
                  >
                    Marcar Todas
                  </button>
                  <span className="text-slate-600">•</span>
                  <button
                    type="button"
                    onClick={handleClearNumbers}
                    className="text-[10px] text-slate-400 hover:underline cursor-pointer"
                  >
                    Limpar
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-5 sm:grid-cols-10 md:grid-cols-13 gap-1.5">
                {Array.from({ length: 25 }, (_, i) => i + 1).map((n) => {
                  const isSelected = config.customNumbers.includes(n);
                  const stat = statsList.find((s) => s.numero === n);
                  const delay = stat?.atrasoAtual ?? 0;

                  return (
                    <button
                      key={n}
                      type="button"
                      onClick={() => handleToggleNumber(n)}
                      className={`relative p-2 rounded-lg border text-center transition cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-500/20 border-emerald-500/50 text-white font-black ring-1 ring-emerald-500/30'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-850'
                      }`}
                    >
                      <span className="font-mono text-xs block">{n.toString().padStart(2, '0')}</span>
                      <span
                        className={`text-[9px] font-mono block ${
                          delay >= config.criticalDelayThreshold ? 'text-amber-400 font-bold' : 'text-slate-500'
                        }`}
                      >
                        {delay}x
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
