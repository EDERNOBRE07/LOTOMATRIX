import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Sparkles,
  AlertTriangle,
  RefreshCw,
  Zap,
  Flame,
  ArrowRight,
  X,
  Crown,
  Contrast,
  Moon,
  ShieldCheck,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Check,
  BookOpen,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { LotofacilDraw } from '../types/lotofacil';
import { RECENT_DRAWS } from '../data/lotofacilData';
import { LotoSniperLogo } from './LotoSniperLogo';
import { DevServerHealthStatus } from './DevServerHealthStatus';
import { staggerBallVariants, staggerContainerVariants } from '../utils/staggerAnimation';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import {
  calcularParametrosConcurso,
  resolvePreviousDrawDezenas,
} from '../utils/concursoParametros';

export type HeaderAppTheme = 'gold' | 'high_contrast' | 'slate';

const THEME_ORDER: HeaderAppTheme[] = ['gold', 'high_contrast', 'slate'];

const THEME_META: Record<
  HeaderAppTheme,
  {
    label: string;
    shortLabel: string;
    description: string;
    swatch: string;
    buttonClass: string;
  }
> = {
  gold: {
    label: 'Gold Imperial',
    shortLabel: 'Gold',
    description: 'Preto obsidiana com acentos dourados',
    swatch: 'bg-amber-400 border-amber-200',
    buttonClass:
      'bg-amber-400 text-slate-950 border-amber-300 shadow-amber-400/20 hover:bg-amber-300',
  },
  high_contrast: {
    label: 'Alto Contraste',
    shortLabel: 'Alto Contraste',
    description: 'Preto absoluto com máxima legibilidade P&B',
    swatch: 'bg-white border-zinc-400',
    buttonClass:
      'bg-zinc-100 text-zinc-950 border-white hover:bg-white ring-1 ring-white/50',
  },
  slate: {
    label: 'Dark (Slate)',
    shortLabel: 'Dark Slate',
    description: 'Tema escuro padrão em ardósia e esmeralda',
    swatch: 'bg-slate-700 border-emerald-400',
    buttonClass:
      'bg-slate-800 text-slate-100 border-slate-600 hover:bg-slate-700 hover:border-emerald-400/60',
  },
};

interface HeaderProps {
  latestDraw: LotofacilDraw;
  recentDraws?: LotofacilDraw[];
  isSyncing: boolean;
  onSyncNow: () => void;
  syncSource?: string;
  cyclePendingNumbers?: number[];
  concursosNoCiclo?: number;
  onQuickOptimize?: () => void;
  onOpenAIPredictor?: () => void;
  onOpenBackup?: () => void;
  onOpenTour?: () => void;
  aiStatus: 'online' | 'ready' | 'loading';
  titleAsSpan?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  latestDraw,
  recentDraws = RECENT_DRAWS,
  isSyncing,
  onSyncNow,
  syncSource = 'caixa-oficial',
  cyclePendingNumbers = [],
  concursosNoCiclo = 1,
  onQuickOptimize,
  onOpenAIPredictor,
  onOpenBackup,
  onOpenTour,
  aiStatus,
  titleAsSpan = false,
}) => {
  const [dismissedAlert, setDismissedAlert] = useState(false);
  const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);
  const [viewedDrawOffset, setViewedDrawOffset] = useState<number>(0);
  const [showDrawParams, setShowDrawParams] = useState<boolean>(true);
  const [trendMetric, setTrendMetric] = useState<'somaTotal' | 'primos'>('somaTotal');
  const themeMenuRef = useRef<HTMLDivElement>(null);

  // Histórico unificado ordenado do concurso mais recente para o mais antigo
  const drawsHistory = useMemo<LotofacilDraw[]>(() => {
    const merged: LotofacilDraw[] = [latestDraw];
    const seen = new Set<number>([latestDraw.concurso]);
    for (const d of recentDraws) {
      if (!seen.has(d.concurso)) {
        merged.push(d);
        seen.add(d.concurso);
      }
    }
    return merged.sort((a, b) => b.concurso - a.concurso);
  }, [latestDraw, recentDraws]);

  // Sempre retorna ao concurso recém-carregado quando latestDraw é atualizado
  useEffect(() => {
    setViewedDrawOffset(0);
  }, [latestDraw.concurso]);

  const safeOffset = Math.min(viewedDrawOffset, Math.max(0, drawsHistory.length - 1));
  const displayedDraw = drawsHistory[safeOffset] || latestDraw;
  const isViewingLatest = safeOffset === 0;

  const previousDezenas = useMemo(
    () => resolvePreviousDrawDezenas(displayedDraw.concurso, drawsHistory),
    [displayedDraw.concurso, drawsHistory]
  );

  const parametrosConcurso = useMemo(
    () => calcularParametrosConcurso(displayedDraw.dezenas || [], previousDezenas),
    [displayedDraw.dezenas, previousDezenas]
  );

  const sequenciaResumo = useMemo(() => {
    if (parametrosConcurso.blocosConsecutivos.length === 0) return 'Sem seq.';
    return parametrosConcurso.blocosConsecutivos
      .slice(0, 3)
      .map((b) => `${String(b[0]).padStart(2, '0')}–${String(b[b.length - 1]).padStart(2, '0')}`)
      .join(', ');
  }, [parametrosConcurso.blocosConsecutivos]);

  // Evolução da Soma Total e Quantidade de Primos nos últimos 5 concursos (ancorado no concurso exibido)
  const trendLast5 = useMemo(() => {
    const window5 = drawsHistory.slice(safeOffset, safeOffset + 5).reverse();
    const points = window5.map((d) => {
      const stats = calcularParametrosConcurso(d.dezenas || []);
      return {
        concurso: d.concurso,
        label: `#${d.concurso}`,
        data: d.data,
        somaTotal: stats.somaTotal,
        primos: stats.primos,
        isCurrent: d.concurso === displayedDraw.concurso,
      };
    });

    const avgSoma =
      points.length > 0
        ? Number((points.reduce((acc, p) => acc + p.somaTotal, 0) / points.length).toFixed(1))
        : 0;
    const avgPrimos =
      points.length > 0
        ? Number((points.reduce((acc, p) => acc + p.primos, 0) / points.length).toFixed(1))
        : 0;

    return { points, avgSoma, avgPrimos };
  }, [drawsHistory, safeOffset, displayedDraw.concurso]);

  const [currentTheme, setCurrentTheme] = useState<HeaderAppTheme>(() => {
    try {
      const saved = localStorage.getItem('lotosniper_theme');
      if (saved === 'high_contrast') return 'high_contrast';
      if (saved === 'gold') return 'gold';
      if (saved === 'slate') return 'slate';
      return 'gold';
    } catch {
      return 'gold';
    }
  });

  useEffect(() => {
    const handleThemeEvent = (e: Event) => {
      const custom = e as CustomEvent<HeaderAppTheme>;
      if (
        custom.detail === 'gold' ||
        custom.detail === 'high_contrast' ||
        custom.detail === 'slate'
      ) {
        setCurrentTheme(custom.detail);
      }
    };
    window.addEventListener('lotosniper-theme-changed', handleThemeEvent);
    return () => window.removeEventListener('lotosniper-theme-changed', handleThemeEvent);
  }, []);

  useEffect(() => {
    if (!isThemeMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (themeMenuRef.current && !themeMenuRef.current.contains(e.target as Node)) {
        setIsThemeMenuOpen(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsThemeMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [isThemeMenuOpen]);

  const applyGlobalTheme = (nextTheme: HeaderAppTheme) => {
    setCurrentTheme(nextTheme);
    setIsThemeMenuOpen(false);
    try {
      localStorage.setItem('lotosniper_theme', nextTheme);
      if (typeof document !== 'undefined') {
        document.documentElement.classList.remove(
          'theme-gold',
          'theme-high-contrast',
          'theme-night-contrast',
          'theme-slate'
        );
        if (nextTheme === 'gold') {
          document.documentElement.classList.add('theme-gold');
        } else if (nextTheme === 'high_contrast') {
          document.documentElement.classList.add('theme-high-contrast', 'theme-night-contrast');
        } else {
          document.documentElement.classList.add('theme-slate');
        }
        window.dispatchEvent(new CustomEvent('lotosniper-theme-changed', { detail: nextTheme }));
      }
    } catch {}
  };

  const cycleTheme = () => {
    const idx = THEME_ORDER.indexOf(currentTheme);
    const nextTheme = THEME_ORDER[(idx + 1) % THEME_ORDER.length];
    applyGlobalTheme(nextTheme);
  };

  const nextThemeInCycle =
    THEME_ORDER[(THEME_ORDER.indexOf(currentTheme) + 1) % THEME_ORDER.length];
  const activeThemeMeta = THEME_META[currentTheme];

  // Reta final do ciclo: menos de 3 dezenas pendentes (1 ou 2 dezenas restantes, até 3)
  const isRetaFinalCiclo =
    cyclePendingNumbers.length > 0 && cyclePendingNumbers.length <= 3;

  const getSourceLabel = (src: string) => {
    if (src === 'caixa-oficial') return 'Caixa Oficial (Tempo Real)';
    if (src === 'espelho-api') return 'Espelho Oficial (Online)';
    if (src === 'cache-local') return 'Cache Local Atualizado';
    if (src === 'base-local-verificada') return 'Base Oficial Consolidada';
    return 'Base Oficial';
  };

  return (
    <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-40 transition-all duration-300">
      {/* Alerta Visual Intermitente na Reta Final do Ciclo */}
      {isRetaFinalCiclo && !dismissedAlert && (
        <div className="bg-gradient-to-r from-amber-950/90 via-orange-950/95 to-amber-950/90 border-b border-amber-500/50 px-4 py-2 text-xs shadow-[0_0_20px_rgba(245,158,11,0.25)] relative overflow-hidden">
          {/* Luz de pulso e efeito luminoso de fundo */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-500/10 to-transparent animate-pulse pointer-events-none" />

          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-2.5 relative z-10">
            <div className="flex items-center gap-3">
              {/* Radar intermitente */}
              <span className="relative flex h-3.5 w-3.5 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-80" />
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-gradient-to-r from-amber-400 to-orange-500 shadow-[0_0_10px_#f59e0b]" />
              </span>

              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/30 border border-amber-400/60 text-amber-200 font-black tracking-wider text-[10px] uppercase shadow-sm">
                  <Flame className="w-3 h-3 text-amber-300 animate-bounce" />
                  Reta Final do Ciclo • {concursosNoCiclo}º Concurso
                </span>

                <span className="text-slate-200">
                  Apenas <strong className="text-amber-300 font-bold">{cyclePendingNumbers.length} dezena{cyclePendingNumbers.length > 1 ? 's' : ''}</strong> pendente{cyclePendingNumbers.length > 1 ? 's' : ''} para zerar o ciclo:{' '}
                  <span className="inline-flex items-center gap-1 font-mono font-black text-white bg-amber-500/30 px-2 py-0.5 rounded border border-amber-400/40">
                    {cyclePendingNumbers.map((n) => n.toString().padStart(2, '0')).join(' - ')}
                  </span>
                </span>

                <span className="hidden xl:inline text-amber-200/80 text-[11px]">
                  — Oportunidade estratégica: probabilidade máxima de fechamento iminente nos próximos sorteios!
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {onQuickOptimize && (
                <button
                  onClick={onQuickOptimize}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-[11px] shadow-md shadow-amber-500/30 hover:scale-[1.02] active:scale-[0.98] transition cursor-pointer"
                  title="Ir para o Fechamento e fixar as dezenas pendentes do ciclo"
                >
                  <Zap className="w-3 h-3 fill-current" />
                  <span>Aproveitar no Fechamento</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              )}

              <button
                onClick={() => setDismissedAlert(true)}
                className="text-amber-400/60 hover:text-amber-200 p-1 rounded transition cursor-pointer"
                title="Minimizar aviso"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        {/* Brand & Identity with Official LotoSniper Logo */}
        <div className="flex items-center gap-3">
          <LotoSniperLogo size="md" showText={false} />
          <div>
            <div className="flex items-center gap-2">
              {titleAsSpan ? (
                <span className="text-xl font-black tracking-wider text-emerald-400 font-mono flex items-center gap-1.5 drop-shadow-[0_0_8px_rgba(52,211,153,0.3)]">
                  LOTOSNIPER
                </span>
              ) : (
                <h1 className="text-xl font-black tracking-wider text-emerald-400 font-mono flex items-center gap-1.5 drop-shadow-[0_0_8px_rgba(52,211,153,0.3)]">
                  LOTOSNIPER
                </h1>
              )}
              <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                Alvo 15 Pontos
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Precisão Cirúrgica • Fechamentos Matemáticos & IA para Lotofácil
            </p>
          </div>
        </div>

        {/* Live Context Telemetry Badges */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Latest Contest Badge with Auto-Update info */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800/90 border border-slate-700/80 text-slate-300">
            <span className={`w-2 h-2 rounded-full ${isSyncing ? 'bg-amber-400 animate-ping' : 'bg-emerald-400'}`}></span>
            <span>Último Concurso:</span>
            <strong className="text-white font-mono">#{latestDraw.concurso}</strong>
            <span className="text-slate-400">({latestDraw.data})</span>
            <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 hidden sm:inline">
              {getSourceLabel(syncSource)}
            </span>
          </div>

          {/* Sync Button */}
          <button
            onClick={onSyncNow}
            disabled={isSyncing}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition cursor-pointer active:scale-95 shadow-sm ${
              isSyncing
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 cursor-wait'
                : 'bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-300 border-emerald-500/40 hover:border-emerald-400'
            }`}
            title="Consultar e atualizar imediatamente com o último concurso da Caixa Econômica Federal"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-amber-400' : 'text-emerald-400'}`} />
            <span>{isSyncing ? 'Atualizando...' : 'Atualizar'}</span>
          </button>

          {/* Ciclo Telemetry com Destaque Intermitente quando em Reta Final */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border transition ${
              isRetaFinalCiclo
                ? 'bg-amber-500/20 border-amber-400/80 text-amber-200 shadow-[0_0_14px_rgba(245,158,11,0.35)] animate-pulse'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
            }`}
          >
            {isRetaFinalCiclo ? (
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-400"></span>
              </span>
            ) : (
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            )}

            <span>Ciclo ({concursosNoCiclo}º):</span>
            <span className="text-slate-300">Faltam:</span>
            <strong className="text-amber-200 font-mono font-bold bg-amber-500/30 px-1.5 py-0.5 rounded border border-amber-400/40">
              {cyclePendingNumbers.length > 0
                ? cyclePendingNumbers.map((n) => n.toString().padStart(2, '0')).join(', ')
                : 'Ciclo Fechado!'}
            </strong>

            {isRetaFinalCiclo && (
              <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.2 rounded bg-amber-400 text-slate-950 ml-0.5">
                Reta Final
              </span>
            )}
          </div>

          {/* AI Status (opens Preditor IA) */}
          <button
            type="button"
            onClick={onOpenAIPredictor}
            disabled={!onOpenAIPredictor}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 transition ${
              onOpenAIPredictor ? 'hover:bg-emerald-500/20 hover:border-emerald-400 cursor-pointer' : ''
            }`}
            title="Abrir Preditor de IA em Tempo Real"
          >
            <Sparkles className={`w-3.5 h-3.5 text-emerald-400 ${aiStatus === 'loading' ? 'animate-spin' : ''}`} />
            <span>IA:</span>
            <strong className="text-white font-mono">
              {aiStatus === 'loading' ? 'Otimizando...' : 'Online'}
            </strong>
          </button>

          {/* Vite Dev Server Health Status Pill */}
          <DevServerHealthStatus showPillInHeader={true} />

          {/* Global Theme Switcher: Alternância rápida entre Gold, Alto Contraste e Dark (Slate) */}
          <div className="relative flex items-center" ref={themeMenuRef}>
            <div className="inline-flex items-stretch rounded-lg shadow-sm overflow-hidden">
              <button
                type="button"
                onClick={cycleTheme}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 border border-r-0 rounded-l-lg text-xs font-black transition cursor-pointer active:scale-[0.98] whitespace-nowrap shrink-0 ${activeThemeMeta.buttonClass}`}
                title={`Tema atual: ${activeThemeMeta.label}. Clique para alternar para ${THEME_META[nextThemeInCycle].label}.`}
                aria-label={`Alternar tema global. Atual: ${activeThemeMeta.label}. Próximo: ${THEME_META[nextThemeInCycle].label}.`}
              >
                {currentTheme === 'gold' && <Crown className="w-3.5 h-3.5 fill-current shrink-0" />}
                {currentTheme === 'high_contrast' && <Contrast className="w-3.5 h-3.5 shrink-0" />}
                {currentTheme === 'slate' && <Moon className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                <span>{activeThemeMeta.shortLabel}</span>
              </button>

              <button
                type="button"
                onClick={() => setIsThemeMenuOpen((prev) => !prev)}
                className={`px-1.5 py-1.5 border rounded-r-lg transition cursor-pointer flex items-center justify-center ${activeThemeMeta.buttonClass}`}
                title="Escolher tema (Gold, Alto Contraste ou Dark Slate)"
                aria-label="Abrir seletor de tema"
                aria-expanded={isThemeMenuOpen}
                aria-haspopup="menu"
              >
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform duration-200 ${
                    isThemeMenuOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>
            </div>

            {isThemeMenuOpen && (
              <div
                role="menu"
                aria-label="Selecionar tema global"
                className="absolute right-0 top-full mt-2 w-60 rounded-xl bg-slate-900 border border-slate-700 shadow-2xl p-1.5 z-50 space-y-1"
              >
                <div className="px-2.5 py-1.5 text-[11px] font-semibold text-slate-400 border-b border-slate-800">
                  Tema Visual Global
                </div>
                {THEME_ORDER.map((themeKey) => {
                  const meta = THEME_META[themeKey];
                  const isActive = currentTheme === themeKey;
                  return (
                    <button
                      key={themeKey}
                      type="button"
                      role="menuitemradio"
                      aria-checked={isActive}
                      onClick={() => applyGlobalTheme(themeKey)}
                      className={`w-full flex items-center justify-between gap-2.5 px-2.5 py-2 rounded-lg text-left transition cursor-pointer ${
                        isActive
                          ? 'bg-slate-800 text-white'
                          : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className={`w-3.5 h-3.5 rounded-full border shrink-0 ${meta.swatch}`}
                          aria-hidden="true"
                        />
                        <div className="min-w-0">
                          <span className="text-xs font-bold block truncate">{meta.label}</span>
                          <span className="text-[10px] text-slate-400 block truncate">
                            {meta.description}
                          </span>
                        </div>
                      </div>
                      {isActive && <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Reopen Guided Tour Button (Desktop & Mobile) */}
          {onOpenTour && (
            <button
              type="button"
              onClick={onOpenTour}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-bold transition cursor-pointer shadow-sm active:scale-95 bg-slate-800/90 hover:bg-slate-700 text-amber-300 border-amber-500/35 hover:border-amber-400 whitespace-nowrap shrink-0"
              title="Abrir guia interativo de uso do LotoSniper AI Pro"
              aria-label="Abrir tutorial interativo"
            >
              <BookOpen className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>Guia</span>
            </button>
          )}

          {/* Backup & Nuvem Button */}
          {onOpenBackup && (
            <button
              type="button"
              onClick={onOpenBackup}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition cursor-pointer shadow-sm active:scale-95 bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border-emerald-500/40 hover:border-emerald-400 whitespace-nowrap shrink-0"
              title="Central de Backup: Download Forçado JSON, Snapshots de Segurança e Google Drive"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Backup</span>
              <span className="text-[9px] font-mono uppercase bg-emerald-500/20 text-emerald-300 px-1 py-0.2 rounded font-black hidden sm:inline">
                JSON
              </span>
            </button>
          )}
        </div>
      </div>

      {/* PAINEL OFICIAL DE TELEMETRIA: ÚLTIMO CONCURSO, CICLO DAS 25 DEZENAS & GANHADORES */}
      <div className="bg-slate-950/70 border-t border-slate-800/80 px-4 sm:px-6 lg:px-8 py-2.5">
        <div className="max-w-7xl mx-auto space-y-2.5">
          <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3">
            {/* Concurso, Navegação Histórica, Data do Sorteio & Progresso do Ciclo Atual */}
            <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 text-xs">
              {/* Concurso & Data com navegação reativa entre concursos */}
              <div className="flex items-center gap-1.5 bg-slate-900/90 px-2.5 py-1.5 rounded-xl border border-slate-700/80 shadow-inner">
                <button
                  type="button"
                  disabled={safeOffset >= drawsHistory.length - 1}
                  onClick={() =>
                    setViewedDrawOffset((prev) => Math.min(drawsHistory.length - 1, prev + 1))
                  }
                  className="p-0.5 rounded text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
                  title="Ver concurso anterior"
                  aria-label="Ver concurso anterior"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className={`w-2 h-2 rounded-full ${isViewingLatest ? 'bg-emerald-400 animate-pulse' : 'bg-sky-400'}`} />
                <span className="text-slate-400 font-medium">Concurso:</span>
                <strong className="text-white font-mono font-black text-sm tabular-nums">
                  #{displayedDraw.concurso}
                </strong>
                <span className="text-slate-500 font-mono">|</span>
                <span className="text-amber-300 font-mono font-semibold tabular-nums">
                  {displayedDraw.data}
                </span>
                <button
                  type="button"
                  disabled={safeOffset <= 0}
                  onClick={() => setViewedDrawOffset((prev) => Math.max(0, prev - 1))}
                  className="p-0.5 rounded text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
                  title="Ver próximo concurso"
                  aria-label="Ver próximo concurso"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
                {!isViewingLatest && (
                  <button
                    type="button"
                    onClick={() => setViewedDrawOffset(0)}
                    className="ml-1 px-1.5 py-0.5 rounded bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-[10px] font-semibold transition cursor-pointer"
                  >
                    Atual
                  </button>
                )}
              </div>

              {/* Progresso do Ciclo Atual das 25 Dezenas Alinhado com a Data */}
              <div
                className={`flex items-center gap-2.5 px-3 py-1.5 rounded-xl border transition shadow-sm ${
                  isRetaFinalCiclo
                    ? 'bg-amber-950/40 border-amber-500/60 text-amber-200'
                    : 'bg-slate-900/90 border-slate-700/80 text-slate-300'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <Flame className={`w-3.5 h-3.5 ${isRetaFinalCiclo ? 'text-amber-400 animate-bounce' : 'text-amber-400/80'}`} />
                  <span className="font-bold text-white">
                    Ciclo: <span className="text-amber-400 font-mono font-black">{Math.max(0, 25 - cyclePendingNumbers.length)}/25</span> dezenas sorteadas
                  </span>
                  <span className="text-slate-400 font-mono text-[11px] hidden sm:inline">
                    ({Math.round(((Math.max(0, 25 - cyclePendingNumbers.length)) / 25) * 100)}%)
                  </span>
                </div>

                {/* Barra de progresso visual do ciclo */}
                <div className="w-16 sm:w-20 bg-slate-800 rounded-full h-1.5 overflow-hidden border border-slate-700/60 hidden sm:block">
                  <div
                    className="bg-gradient-to-r from-amber-500 to-yellow-400 h-1.5 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.round(((Math.max(0, 25 - cyclePendingNumbers.length)) / 25) * 100))}%` }}
                  />
                </div>

                {/* Indicador de Pressão Estatística Atual */}
                <span
                  className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded font-bold tracking-wider ${
                    isRetaFinalCiclo
                      ? 'bg-amber-400 text-slate-950 shadow-sm animate-pulse'
                      : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                  }`}
                  title={
                    isRetaFinalCiclo
                      ? `Pressão Máxima de Fechamento: Restam apenas [${cyclePendingNumbers.map(n => n.toString().padStart(2, '0')).join(', ')}] para fechar todas as 25 dezenas!`
                      : `Ciclo em andamento no ${concursosNoCiclo}º concurso.`
                  }
                >
                  {isRetaFinalCiclo
                    ? `⚡ Pressão Iminente (${cyclePendingNumbers.length} rest.)`
                    : `${concursosNoCiclo}º Conc. do Ciclo`}
                </span>
              </div>
            </div>

            {/* 15 Dezenas Sorteadas no Concurso Exibido (Staggered Fade-In ao Atualizar/Navegar) */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider hidden md:inline">
                Dezenas:
              </span>
              <motion.div
                key={`header-dezenas-${displayedDraw.concurso}-${(displayedDraw.dezenas || []).join('-')}`}
                variants={staggerContainerVariants}
                initial="hidden"
                animate="visible"
                className="flex items-center gap-1 flex-wrap"
              >
                {(displayedDraw.dezenas || []).map((num) => (
                  <motion.span
                    key={num}
                    variants={staggerBallVariants}
                    className="w-6 h-6 sm:w-6.5 sm:h-6.5 rounded-full bg-gradient-to-br from-amber-400 via-amber-500 to-yellow-600 text-slate-950 font-mono font-black text-[11px] sm:text-xs flex items-center justify-center shadow-sm shadow-amber-500/30 border border-amber-300/80 select-none hover:scale-110 transition-transform"
                    title={`Dezena ${num.toString().padStart(2, '0')} sorteada no concurso #${displayedDraw.concurso}`}
                  >
                    {num.toString().padStart(2, '0')}
                  </motion.span>
                ))}
              </motion.div>
            </div>

            {/* Número Oficial de Ganhadores + Botão de Toggle dos Parâmetros Estatísticos */}
            <div className="flex items-center gap-2 text-xs flex-wrap">
              <div className="flex items-center gap-1.5 bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border border-amber-500/30 px-2.5 py-1 rounded-lg text-amber-200">
                <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>
                  <strong>15 pts:</strong>{' '}
                  <span className="font-mono font-bold text-white tabular-nums">
                    {displayedDraw.premiacoes?.faixa15?.ganhadores ?? 1}
                  </span>{' '}
                  {(displayedDraw.premiacoes?.faixa15?.ganhadores ?? 1) === 1 ? 'ganhador' : 'ganhadores'}
                </span>
              </div>

              <div className="flex items-center gap-1.5 bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-700/80 text-slate-300">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0" />
                <span>
                  <strong>14 pts:</strong>{' '}
                  <span className="font-mono font-bold text-cyan-300 tabular-nums">
                    {displayedDraw.premiacoes?.faixa14?.ganhadores ?? 325}
                  </span>{' '}
                  apostas
                </span>
              </div>

              <button
                type="button"
                onClick={() => setShowDrawParams((prev) => !prev)}
                aria-expanded={showDrawParams}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-slate-700/80 bg-slate-900 hover:bg-slate-800 text-slate-300 text-[11px] font-medium transition cursor-pointer"
                title="Exibir ou recolher parâmetros estatísticos do concurso"
              >
                <span>Parâmetros</span>
                <ChevronDown
                  className={`w-3 h-3 transition-transform ${showDrawParams ? 'rotate-180' : ''}`}
                />
              </button>
            </div>
          </div>

          {/* PAINEL AUTOMÁTICO DE PARÂMETROS ESTATÍSTICOS COMPLETOS DO CONCURSO */}
          {showDrawParams && (
            <div
              aria-label={`Parâmetros estatísticos do Concurso ${displayedDraw.concurso}`}
              className="pt-2 border-t border-slate-800/80 space-y-2.5"
            >
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-9 gap-2">
                {/* 1. Pares e Ímpares */}
                <div className="bg-slate-900/90 border border-slate-800 rounded-lg px-2.5 py-1.5">
                  <div className="text-[10px] text-slate-400 leading-tight">Pares / Ímpares</div>
                  <div className="mt-0.5 text-xs font-mono font-semibold text-white tabular-nums">
                    {parametrosConcurso.pares}P / {parametrosConcurso.impares}I
                  </div>
                </div>

                {/* 2. Repetidas do Concurso Anterior */}
                <div
                  className="bg-slate-900/90 border border-slate-800 rounded-lg px-2.5 py-1.5"
                  title={
                    parametrosConcurso.repetidasAnterior !== null
                      ? `Dezenas repetidas em relação ao concurso #${displayedDraw.concurso - 1}`
                      : 'Concurso imediatamente anterior indisponível no histórico local'
                  }
                >
                  <div className="text-[10px] text-slate-400 leading-tight">Repetidas (#{displayedDraw.concurso - 1})</div>
                  <div className="mt-0.5 text-xs font-mono font-semibold text-emerald-400 tabular-nums">
                    {parametrosConcurso.repetidasAnterior !== null
                      ? `${parametrosConcurso.repetidasAnterior} dez.`
                      : 'N/A'}
                  </div>
                </div>

                {/* 3. Soma Total */}
                <div className="bg-slate-900/90 border border-slate-800 rounded-lg px-2.5 py-1.5">
                  <div className="text-[10px] text-slate-400 leading-tight">Soma Total</div>
                  <div className="mt-0.5 text-xs font-mono font-semibold text-amber-300 tabular-nums">
                    {parametrosConcurso.somaTotal}
                  </div>
                </div>

                {/* 4. Números Primos */}
                <div className="bg-slate-900/90 border border-slate-800 rounded-lg px-2.5 py-1.5">
                  <div className="text-[10px] text-slate-400 leading-tight">Primos</div>
                  <div className="mt-0.5 text-xs font-mono font-semibold text-sky-300 tabular-nums">
                    {parametrosConcurso.primos} dez.
                  </div>
                </div>

                {/* 5. Moldura e Miolo */}
                <div className="bg-slate-900/90 border border-slate-800 rounded-lg px-2.5 py-1.5">
                  <div className="text-[10px] text-slate-400 leading-tight">Moldura / Miolo</div>
                  <div className="mt-0.5 text-xs font-mono font-semibold text-slate-100 tabular-nums">
                    {parametrosConcurso.moldura}M / {parametrosConcurso.miolo}C
                  </div>
                </div>

                {/* 6. Sequência de Fibonacci */}
                <div className="bg-slate-900/90 border border-slate-800 rounded-lg px-2.5 py-1.5">
                  <div className="text-[10px] text-slate-400 leading-tight">Fibonacci</div>
                  <div className="mt-0.5 text-xs font-mono font-semibold text-amber-200 tabular-nums">
                    {parametrosConcurso.fibonacci} dez.
                  </div>
                </div>

                {/* 7. Números em Sequência */}
                <div
                  className="bg-slate-900/90 border border-slate-800 rounded-lg px-2.5 py-1.5"
                  title={`Blocos consecutivos encontrados: ${sequenciaResumo}`}
                >
                  <div className="text-[10px] text-slate-400 leading-tight">Sequência</div>
                  <div className="mt-0.5 text-xs font-mono font-semibold text-slate-100 tabular-nums truncate">
                    Máx {parametrosConcurso.maiorSequencia}{' '}
                    <span className="text-[10px] font-normal text-slate-400">
                      ({sequenciaResumo})
                    </span>
                  </div>
                </div>

                {/* 8. Cruz da Lotofácil */}
                <div className="bg-slate-900/90 border border-slate-800 rounded-lg px-2.5 py-1.5">
                  <div className="text-[10px] text-slate-400 leading-tight">Cruz Central</div>
                  <div className="mt-0.5 text-xs font-mono font-semibold text-emerald-300 tabular-nums">
                    {parametrosConcurso.cruz} dez.
                  </div>
                </div>

                {/* 9. Quadrantes (Q1, Q2, Q3, Q4) */}
                <div
                  className="bg-slate-900/90 border border-slate-800 rounded-lg px-2.5 py-1.5 col-span-2 sm:col-span-1"
                  title={
                    parametrosConcurso.quadrantes.centro13
                      ? 'Distribuição pelos 4 quadrantes (dezena central 13 também sorteada)'
                      : 'Distribuição pelos 4 quadrantes do volante 5×5'
                  }
                >
                  <div className="text-[10px] text-slate-400 leading-tight">
                    Quadrantes (Q1–Q4)
                  </div>
                  <div className="mt-0.5 text-[11px] font-mono font-semibold text-cyan-300 tabular-nums">
                    {parametrosConcurso.quadrantes.q1}·{parametrosConcurso.quadrantes.q2}·
                    {parametrosConcurso.quadrantes.q3}·{parametrosConcurso.quadrantes.q4}
                    {parametrosConcurso.quadrantes.centro13 ? ' (+13)' : ''}
                  </div>
                </div>
              </div>

              {/* Mini Gráfico de Linha: Tendência dos Últimos 5 Concursos (Soma Total ou Primos) */}
              {trendLast5.points.length >= 2 && (
                <div className="bg-slate-900/90 border border-slate-800 rounded-lg px-3 py-2 flex flex-col md:flex-row md:items-center gap-3">
                  <div className="md:w-64 shrink-0 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-semibold text-slate-200">
                        Tendência · Últimos {trendLast5.points.length} Concursos
                      </span>
                    </div>

                    <div className="flex items-center gap-1 p-0.5 rounded-md bg-slate-950 border border-slate-800 w-fit">
                      <button
                        type="button"
                        onClick={() => setTrendMetric('somaTotal')}
                        className={`px-2 py-0.5 rounded text-[11px] font-medium transition cursor-pointer whitespace-nowrap ${
                          trendMetric === 'somaTotal'
                            ? 'bg-slate-800 text-amber-300'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        Soma Total
                      </button>
                      <button
                        type="button"
                        onClick={() => setTrendMetric('primos')}
                        className={`px-2 py-0.5 rounded text-[11px] font-medium transition cursor-pointer whitespace-nowrap ${
                          trendMetric === 'primos'
                            ? 'bg-slate-800 text-sky-300'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        Qtd. Primos
                      </button>
                    </div>

                    <div className="text-[10px] text-slate-400 font-mono tabular-nums">
                      Média 5c:{' '}
                      <span className={trendMetric === 'somaTotal' ? 'text-amber-300' : 'text-sky-300'}>
                        {trendMetric === 'somaTotal'
                          ? trendLast5.avgSoma
                          : `${trendLast5.avgPrimos} dez.`}
                      </span>
                      {' · '}
                      Ideal: {trendMetric === 'somaTotal' ? '175–220' : '4–7'}
                    </div>
                  </div>

                  <div className="flex-1 h-[84px] min-w-[220px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={trendLast5.points}
                        margin={{ top: 8, right: 14, left: -18, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                        <XAxis
                          dataKey="label"
                          stroke="#64748b"
                          tick={{ fill: '#94a3b8', fontSize: 10, fontFamily: 'monospace' }}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis
                          stroke="#64748b"
                          tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'monospace' }}
                          tickLine={false}
                          axisLine={false}
                          domain={
                            trendMetric === 'somaTotal'
                              ? ['dataMin - 10', 'dataMax + 10']
                              : [0, 9]
                          }
                        />
                        <ReferenceLine
                          y={trendMetric === 'somaTotal' ? trendLast5.avgSoma : trendLast5.avgPrimos}
                          stroke={trendMetric === 'somaTotal' ? '#fbbf24' : '#38bdf8'}
                          strokeOpacity={0.35}
                          strokeDasharray="3 3"
                        />
                        <Tooltip
                          content={({ active, payload }) => {
                            if (!active || !payload || !payload.length) return null;
                            const pt = payload[0].payload as (typeof trendLast5.points)[number];
                            return (
                              <div className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-[11px] font-mono tabular-nums shadow-xl space-y-0.5">
                                <div className="text-white font-semibold">
                                  Concurso {pt.label}{' '}
                                  <span className="text-slate-400 font-normal">({pt.data})</span>
                                </div>
                                <div className="text-amber-300">Soma Total: {pt.somaTotal}</div>
                                <div className="text-sky-300">Primos: {pt.primos} dez.</div>
                              </div>
                            );
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey={trendMetric}
                          stroke={trendMetric === 'somaTotal' ? '#fbbf24' : '#38bdf8'}
                          strokeWidth={2}
                          dot={{
                            r: 3,
                            fill: trendMetric === 'somaTotal' ? '#fbbf24' : '#38bdf8',
                            strokeWidth: 0,
                          }}
                          activeDot={{
                            r: 5,
                            stroke: '#020617',
                            strokeWidth: 1.5,
                          }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
