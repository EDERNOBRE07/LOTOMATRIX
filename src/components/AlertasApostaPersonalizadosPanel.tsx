import React, { useState, useEffect } from 'react';
import {
  BellRing,
  DollarSign,
  CheckCircle2,
  Sparkles,
  Play,
  ShieldCheck,
  Award,
  Save,
  AlertTriangle,
  Eye,
} from 'lucide-react';
import { LotofacilDraw } from '../types/lotofacil';
import { CONCURSO_ATUAL } from '../data/lotofacilData';
import {
  CustomPrizeAlertConfig,
  CustomPrizeAlertStyle,
  SavedGamesAuditResult,
  getCustomPrizeAlertConfig,
  saveCustomPrizeAlertConfig,
  auditAndNotifySavedGames,
  dispatchCustomPrizeVisualAlert,
  CUSTOM_PRIZE_ALERT_CONFIG_EVENT,
} from '../services/savedGamesAuditorService';
import { soundService } from '../services/soundAlert';

interface AlertasApostaPersonalizadosPanelProps {
  latestDraw?: LotofacilDraw;
  onNotice?: (message: string) => void;
}

const PRESET_VALUES_BRL = [14, 35, 50, 100, 500, 1500, 10000];

const ALERT_STYLES: {
  id: CustomPrizeAlertStyle;
  label: string;
  description: string;
  previewClass: string;
  accentText: string;
}[] = [
  {
    id: 'gold_banner',
    label: 'Destaque Gold Imperial',
    description: 'Banner dourado de alta visibilidade no topo do painel',
    previewClass: 'bg-amber-500/15 border-amber-400/60 text-amber-100',
    accentText: 'text-amber-300',
  },
  {
    id: 'emerald_banner',
    label: 'Destaque Esmeralda',
    description: 'Banner verde esmeralda focado em retorno financeiro',
    previewClass: 'bg-emerald-500/15 border-emerald-400/60 text-emerald-100',
    accentText: 'text-emerald-300',
  },
  {
    id: 'high_priority_modal',
    label: 'Alerta Prioritário',
    description: 'Faixa de alto contraste com ênfase máxima para prêmios altos',
    previewClass: 'bg-rose-500/15 border-rose-400/70 text-rose-100',
    accentText: 'text-rose-300',
  },
];

function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  });
}

export const AlertasApostaPersonalizadosPanel: React.FC<AlertasApostaPersonalizadosPanelProps> = ({
  latestDraw = CONCURSO_ATUAL,
  onNotice,
}) => {
  const [config, setConfig] = useState<CustomPrizeAlertConfig>(() => getCustomPrizeAlertConfig());
  const [inputValue, setInputValue] = useState<string>(() =>
    String(getCustomPrizeAlertConfig().minEstimatedPrizeBRL)
  );
  const [isAuditing, setIsAuditing] = useState<boolean>(false);
  const [lastAuditResult, setLastAuditResult] = useState<SavedGamesAuditResult | null>(null);
  const [localFeedback, setLocalFeedback] = useState<string | null>(null);

  useEffect(() => {
    const syncConfig = () => {
      const latest = getCustomPrizeAlertConfig();
      setConfig(latest);
      setInputValue(String(latest.minEstimatedPrizeBRL));
    };
    window.addEventListener(CUSTOM_PRIZE_ALERT_CONFIG_EVENT, syncConfig);
    window.addEventListener('storage', syncConfig);
    return () => {
      window.removeEventListener(CUSTOM_PRIZE_ALERT_CONFIG_EVENT, syncConfig);
      window.removeEventListener('storage', syncConfig);
    };
  }, []);

  const showFeedback = (msg: string) => {
    setLocalFeedback(msg);
    onNotice?.(msg);
    setTimeout(() => setLocalFeedback(null), 4500);
  };

  const handleParseAndSetValue = (raw: string) => {
    setInputValue(raw);
    const cleaned = raw.replace(',', '.').replace(/[^0-9.]/g, '');
    const parsed = parseFloat(cleaned);
    if (Number.isFinite(parsed) && parsed >= 0) {
      setConfig((prev) => ({ ...prev, minEstimatedPrizeBRL: parsed }));
    }
  };

  const handleSelectPreset = (val: number) => {
    setInputValue(String(val));
    setConfig((prev) => ({ ...prev, minEstimatedPrizeBRL: val }));
  };

  const handleSave = () => {
    const normalized: CustomPrizeAlertConfig = {
      ...config,
      minEstimatedPrizeBRL: Math.max(0, Number(config.minEstimatedPrizeBRL) || 0),
    };
    saveCustomPrizeAlertConfig(normalized);
    setConfig(normalized);
    setInputValue(String(normalized.minEstimatedPrizeBRL));
    try {
      soundService.playGoldenZoneSuccessChime();
    } catch {}
    showFeedback(
      normalized.enabled
        ? `Alerta de Aposta Personalizado salvo: disparo visual ativo a partir de ${formatBRL(
            normalized.minEstimatedPrizeBRL
          )}.`
        : 'Alerta de Aposta Personalizado pausado e configuração salva.'
    );
  };

  const handleRunLiveAudit = async () => {
    // Salva a regra atual antes de rodar a auditoria real no savedGamesAuditorService
    const normalized: CustomPrizeAlertConfig = {
      ...config,
      minEstimatedPrizeBRL: Math.max(0, Number(config.minEstimatedPrizeBRL) || 0),
    };
    saveCustomPrizeAlertConfig(normalized);
    setIsAuditing(true);
    try {
      const res = await auditAndNotifySavedGames(latestDraw, true);
      setLastAuditResult(res);
      if (res) {
        if (res.customPrizeAlertTriggered) {
          showFeedback(
            `Meta atingida no Concurso #${res.concurso}! Prêmio estimado de ${formatBRL(
              res.premioEstimadoTotal
            )} (≥ ${formatBRL(normalized.minEstimatedPrizeBRL)}). Alerta visual disparado.`
          );
        } else {
          showFeedback(
            `Auditoria concluída (${res.totalBilhetesAvaliados} bilhete(s) no Concurso #${
              res.concurso
            }): prêmio estimado atual ${formatBRL(
              res.premioEstimadoTotal
            )} — abaixo da meta de ${formatBRL(normalized.minEstimatedPrizeBRL)}.`
          );
        }
      } else {
        showFeedback('Nenhum bilhete salvo encontrado para auditar neste concurso.');
      }
    } finally {
      setIsAuditing(false);
    }
  };

  const handleTestVisualAlert = () => {
    const normalized: CustomPrizeAlertConfig = {
      ...config,
      enabled: true,
      minEstimatedPrizeBRL: Math.max(0, Number(config.minEstimatedPrizeBRL) || 0),
    };
    saveCustomPrizeAlertConfig(normalized);
    setConfig(normalized);

    const simulatedPrize = Math.max(normalized.minEstimatedPrizeBRL, 35) + 14;
    dispatchCustomPrizeVisualAlert({
      concurso: latestDraw.concurso,
      dataConcurso: latestDraw.data,
      premioEstimadoTotal: simulatedPrize,
      maiorPremioIndividual: simulatedPrize,
      minEstimatedPrizeBRL: normalized.minEstimatedPrizeBRL,
      totalWinningTickets: 3,
      maxHits: simulatedPrize >= 1400 ? 14 : 13,
      bestFechamentoTitle: 'Simulação de Teste · Regra Personalizada',
      alertStyle: normalized.alertStyle,
      isSimulatedTest: true,
      timestamp: Date.now(),
    });

    try {
      soundService.playGoldenZoneSuccessChime();
    } catch {}

    showFeedback(
      `Alerta visual de teste disparado no topo da tela para meta de ${formatBRL(
        normalized.minEstimatedPrizeBRL
      )}.`
    );
  };

  const activeStyleMeta =
    ALERT_STYLES.find((s) => s.id === config.alertStyle) || ALERT_STYLES[0];

  return (
    <section
      aria-label="Alertas de Aposta Personalizados"
      className="bg-slate-900/90 rounded-2xl border border-amber-500/30 p-5 sm:p-6 shadow-xl space-y-5"
    >
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/35 text-amber-400 shrink-0">
            <BellRing className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="font-semibold text-amber-400">
                Auditoria Automática de Jogos Salvos
              </span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums text-slate-300">
                Concurso #{latestDraw.concurso}
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
              Alertas de Aposta Personalizados
            </h3>
            <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
              Defina um valor mínimo de prêmio estimado (em reais). Sempre que o auditor de jogos
              salvos identificar premiação igual ou superior à sua meta, um alerta visual dedicado
              será exibido automaticamente no topo do aplicativo.
            </p>
          </div>
        </div>

        {/* Toggle Mestre */}
        <button
          type="button"
          role="switch"
          aria-checked={config.enabled}
          onClick={() => setConfig((prev) => ({ ...prev, enabled: !prev.enabled }))}
          className={`px-4 py-2 rounded-xl text-xs font-bold border transition cursor-pointer flex items-center gap-2 self-start sm:self-center whitespace-nowrap shrink-0 ${
            config.enabled
              ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
              : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
          }`}
        >
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              config.enabled ? 'bg-emerald-400' : 'bg-slate-500'
            }`}
          />
          <span>{config.enabled ? 'Alerta Ativo' : 'Alerta Pausado'}</span>
        </button>
      </div>

      {/* Feedback Local */}
      {localFeedback && (
        <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-200 text-xs font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{localFeedback}</span>
        </div>
      )}

      {/* Grade de Configuração */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Coluna 1: Valor Mínimo de Prêmio Estimado */}
        <div className="bg-slate-950/70 rounded-xl border border-slate-800 p-4 space-y-4">
          <div className="space-y-1">
            <label
              htmlFor="custom-min-prize-input"
              className="text-xs font-bold text-white flex items-center gap-1.5"
            >
              <DollarSign className="w-4 h-4 text-amber-400" />
              <span>Valor Mínimo de Prêmio Estimado (R$)</span>
            </label>
            <p className="text-[11px] text-slate-400">
              O alerta visual dispara quando seus jogos salvos atingirem ou ultrapassarem este
              valor no concurso auditado.
            </p>
          </div>

          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-amber-400">
              R$
            </span>
            <input
              id="custom-min-prize-input"
              type="number"
              min={0}
              step={1}
              value={inputValue}
              onChange={(e) => handleParseAndSetValue(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 focus:border-amber-400 rounded-xl pl-10 pr-4 py-2.5 text-sm font-mono font-bold text-white tabular-nums focus:outline-none transition"
              placeholder="Ex: 50"
            />
          </div>

          {/* Atalhos Rápidos */}
          <div className="space-y-1.5">
            <span className="text-[11px] text-slate-400 block">Metas rápidas comuns:</span>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_VALUES_BRL.map((val) => {
                const isSelected = Math.abs(config.minEstimatedPrizeBRL - val) < 0.01;
                return (
                  <button
                    key={val}
                    type="button"
                    onClick={() => handleSelectPreset(val)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-mono tabular-nums font-semibold border transition cursor-pointer whitespace-nowrap ${
                      isSelected
                        ? 'bg-amber-400 text-slate-950 border-amber-300 font-bold'
                        : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-amber-500/40 hover:text-white'
                    }`}
                  >
                    {val >= 1000 ? `R$ ${(val / 1000).toLocaleString('pt-BR')} mil` : `R$ ${val}`}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Escopo da Checagem */}
          <label className="flex items-start gap-2.5 pt-3 border-t border-slate-800 cursor-pointer">
            <input
              type="checkbox"
              checked={config.includeIndividualPrizeCheck}
              onChange={(e) =>
                setConfig((prev) => ({
                  ...prev,
                  includeIndividualPrizeCheck: e.target.checked,
                }))
              }
              className="mt-0.5 rounded accent-amber-400 cursor-pointer"
            />
            <span className="text-xs text-slate-300 leading-snug">
              Disparar tanto pelo <strong className="text-white">prêmio somado de todos os bilhetes</strong>{' '}
              quanto se <strong className="text-white">um único bilhete</strong> atingir o valor mínimo.
            </span>
          </label>
        </div>

        {/* Coluna 2: Estilo Visual & Prévia em Tempo Real */}
        <div className="bg-slate-950/70 rounded-xl border border-slate-800 p-4 space-y-4">
          <div className="space-y-1">
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              <Eye className="w-4 h-4 text-emerald-400" />
              <span>Estilo do Alerta Visual Específico</span>
            </span>
            <p className="text-[11px] text-slate-400">
              Escolha como o aviso de meta atingida será destacado na interface.
            </p>
          </div>

          <div className="space-y-2" role="radiogroup" aria-label="Estilo do alerta visual">
            {ALERT_STYLES.map((styleOpt) => {
              const isSelected = config.alertStyle === styleOpt.id;
              return (
                <button
                  key={styleOpt.id}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() => setConfig((prev) => ({ ...prev, alertStyle: styleOpt.id }))}
                  className={`w-full text-left p-3 rounded-xl border transition cursor-pointer flex items-center justify-between gap-3 ${
                    isSelected
                      ? 'bg-slate-900 border-amber-400/70 ring-1 ring-amber-400/30'
                      : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div>
                    <span className={`text-xs font-bold block ${styleOpt.accentText}`}>
                      {styleOpt.label}
                    </span>
                    <span className="text-[11px] text-slate-400 block mt-0.5">
                      {styleOpt.description}
                    </span>
                  </div>
                  <span
                    className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                      isSelected ? 'border-amber-400 bg-amber-400' : 'border-slate-600'
                    }`}
                  >
                    {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-slate-950" />}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Prévia Compacta */}
          <div className="pt-2 border-t border-slate-800 space-y-1.5">
            <span className="text-[11px] text-slate-400 block">Prévia do alerta visual:</span>
            <div
              className={`rounded-xl border p-3 text-xs flex items-center justify-between gap-3 ${activeStyleMeta.previewClass}`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Award className={`w-4 h-4 shrink-0 ${activeStyleMeta.accentText}`} />
                <div className="min-w-0">
                  <strong className="block truncate">
                    Meta de Prêmio Atingida (≥ {formatBRL(config.minEstimatedPrizeBRL)})
                  </strong>
                  <span className="text-[11px] opacity-80 block truncate">
                    Concurso #{latestDraw.concurso} · Auditoria automática de jogos salvos
                  </span>
                </div>
              </div>
              <span className="font-mono font-bold tabular-nums text-[11px] whitespace-nowrap shrink-0">
                {formatBRL(Math.max(config.minEstimatedPrizeBRL, 35))}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Resultado da Última Auditoria Executada pelo Painel */}
      {lastAuditResult && (
        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-start gap-2.5">
            {lastAuditResult.customPrizeAlertTriggered ? (
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            )}
            <div className="space-y-0.5">
              <strong className="text-white block">
                Última Auditoria ({lastAuditResult.totalBilhetesAvaliados} bilhetes · Concurso #
                {lastAuditResult.concurso})
              </strong>
              <p className="text-slate-400 font-mono tabular-nums">
                Prêmio estimado: {formatBRL(lastAuditResult.premioEstimadoTotal)} · Premiados:{' '}
                {lastAuditResult.totalWinningTickets} · Melhor acerto: {lastAuditResult.maxHits} pts
              </p>
            </div>
          </div>
          <span
            className={`font-mono font-bold text-xs whitespace-nowrap ${
              lastAuditResult.customPrizeAlertTriggered ? 'text-emerald-400' : 'text-slate-400'
            }`}
          >
            {lastAuditResult.customPrizeAlertTriggered
              ? 'Meta superada · Alerta disparado'
              : `Abaixo da meta (${formatBRL(config.minEstimatedPrizeBRL)})`}
          </span>
        </div>
      )}

      {/* Barra de Ações */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800">
        <div className="text-[11px] text-slate-400 font-mono tabular-nums">
          Regra atual:{' '}
          <strong className={config.enabled ? 'text-amber-300' : 'text-slate-500'}>
            {config.enabled ? `≥ ${formatBRL(config.minEstimatedPrizeBRL)}` : 'Desativada'}
          </strong>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleTestVisualAlert}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/35 text-xs font-bold transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Testar Alerta Visual</span>
          </button>

          <button
            type="button"
            onClick={handleRunLiveAudit}
            disabled={isAuditing}
            className="px-3.5 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 disabled:opacity-50 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            <Play className="w-3.5 h-3.5 text-emerald-400" />
            <span>{isAuditing ? 'Auditando...' : 'Auditar Jogos Salvos Agora'}</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-slate-950 text-xs font-black transition cursor-pointer shadow-md shadow-amber-500/20 flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Salvar Regra</span>
          </button>
        </div>
      </div>
    </section>
  );
};
