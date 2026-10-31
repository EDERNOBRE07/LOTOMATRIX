import React, { useState } from 'react';
import {
  Sparkles,
  TrendingUp,
  AlertTriangle,
  RefreshCw,
  Zap,
  Flame,
  ArrowRight,
  BellRing,
  X,
  Crown,
  Contrast,
} from 'lucide-react';
import { LotofacilDraw } from '../types/lotofacil';
import { LotoSniperLogo } from './LotoSniperLogo';

interface HeaderProps {
  latestDraw: LotofacilDraw;
  isSyncing: boolean;
  onSyncNow: () => void;
  syncSource?: string;
  cyclePendingNumbers?: number[];
  concursosNoCiclo?: number;
  onQuickOptimize?: () => void;
  aiStatus: 'online' | 'ready' | 'loading';
}

export const Header: React.FC<HeaderProps> = ({
  latestDraw,
  isSyncing,
  onSyncNow,
  syncSource = 'caixa-oficial',
  cyclePendingNumbers = [17, 22],
  concursosNoCiclo = 4,
  onQuickOptimize,
  aiStatus,
}) => {
  const [dismissedAlert, setDismissedAlert] = useState(false);
  const [currentTheme, setCurrentTheme] = useState<'gold' | 'high_contrast' | 'slate'>(() => {
    try {
      const saved = localStorage.getItem('lotosniper_theme');
      if (saved === 'high_contrast') return 'high_contrast';
      if (saved === 'gold') return 'gold';
      return 'gold';
    } catch {
      return 'gold';
    }
  });

  const toggleTheme = () => {
    // Alterna entre o modo 'Gold' e 'Alto Contraste' (monocromático para leitura noturna prolongada)
    const nextTheme = currentTheme === 'gold' ? 'high_contrast' : 'gold';
    setCurrentTheme(nextTheme);
    try {
      localStorage.setItem('lotosniper_theme', nextTheme);
      if (typeof document !== 'undefined') {
        document.documentElement.classList.remove('theme-gold', 'theme-high-contrast');
        if (nextTheme === 'gold') {
          document.documentElement.classList.add('theme-gold');
        } else if (nextTheme === 'high_contrast') {
          document.documentElement.classList.add('theme-high-contrast');
        }
        window.dispatchEvent(new CustomEvent('lotosniper-theme-changed', { detail: nextTheme }));
      }
    } catch {}
  };

  // Reta final do ciclo: menos de 3 dezenas pendentes (1 ou 2 dezenas restantes, até 3)
  const isRetaFinalCiclo =
    cyclePendingNumbers.length > 0 && cyclePendingNumbers.length <= 3;

  const getSourceLabel = (src: string) => {
    if (src === 'caixa-oficial') return 'Caixa Oficial (Tempo Real)';
    if (src === 'espelho-api') return 'Espelho Oficial (Online)';
    if (src === 'cache-local') return 'Cache Local Atualizado';
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
              <h1 className="text-xl font-black tracking-wider text-emerald-400 font-mono flex items-center gap-1.5 drop-shadow-[0_0_8px_rgba(52,211,153,0.3)]">
                LOTOSNIPER
              </h1>
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

          {/* AI Status */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>IA:</span>
            <strong className="text-white font-mono">
              {aiStatus === 'loading' ? 'Otimizando...' : 'Online'}
            </strong>
          </div>

          {/* Theme Quick Switcher: Alternância entre Modo Gold e Alto Contraste (Monocromático) */}
          <button
            type="button"
            onClick={toggleTheme}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-black transition cursor-pointer shadow-sm active:scale-95 ${
              currentTheme === 'high_contrast'
                ? 'bg-zinc-100 text-zinc-950 border-white hover:bg-white ring-1 ring-white/50'
                : 'bg-amber-400 text-slate-950 border-amber-300 shadow-amber-400/20 hover:bg-amber-300'
            }`}
            title={
              currentTheme === 'gold'
                ? 'Alternar para Modo Alto Contraste (Monocromático para leitura prolongada em baixa luminosidade)'
                : 'Alternar para Modo Gold Imperial'
            }
          >
            {currentTheme === 'high_contrast' ? (
              <>
                <Contrast className="w-3.5 h-3.5 text-zinc-950" />
                <span>Alto Contraste</span>
                <span className="text-[9px] font-mono uppercase bg-black text-white px-1 py-0.2 rounded font-black hidden sm:inline">
                  P&B
                </span>
              </>
            ) : (
              <>
                <Crown className="w-3.5 h-3.5 fill-current text-slate-950" />
                <span>Modo Gold</span>
              </>
            )}
          </button>

          {onQuickOptimize && (
            <button
              onClick={onQuickOptimize}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs transition shadow-md shadow-emerald-500/20 cursor-pointer"
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Gerar 14 Pontos</span>
            </button>
          )}
        </div>
      </div>

      {/* PAINEL OFICIAL DE TELEMETRIA: ÚLTIMO CONCURSO, CICLO DAS 25 DEZENAS & GANHADORES */}
      <div className="bg-slate-950/70 border-t border-slate-800/80 px-4 sm:px-6 lg:px-8 py-2.5">
        <div className="max-w-7xl mx-auto flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3">
          {/* Concurso, Data do Sorteio & Progresso do Ciclo Atual (Alinhados Visualmente) */}
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 text-xs">
            {/* Concurso & Data */}
            <div className="flex items-center gap-2 bg-slate-900/90 px-3 py-1.5 rounded-xl border border-slate-700/80 shadow-inner">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-slate-400 font-medium">Concurso:</span>
              <strong className="text-white font-mono font-black text-sm">#{latestDraw.concurso}</strong>
              <span className="text-slate-500 font-mono">|</span>
              <span className="text-amber-300 font-mono font-semibold">
                🗓️ {latestDraw.data}
              </span>
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

          {/* 15 Dezenas Sorteadas no Último Concurso */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider hidden md:inline">
              Dezenas:
            </span>
            <div className="flex items-center gap-1 flex-wrap">
              {(latestDraw.dezenas || []).map((num) => (
                <span
                  key={num}
                  className="w-6 h-6 sm:w-6.5 sm:h-6.5 rounded-full bg-gradient-to-br from-amber-400 via-amber-500 to-yellow-600 text-slate-950 font-mono font-black text-[11px] sm:text-xs flex items-center justify-center shadow-sm shadow-amber-500/30 border border-amber-300/80 select-none hover:scale-110 transition-transform"
                  title={`Dezena ${num.toString().padStart(2, '0')} sorteada no concurso #${latestDraw.concurso}`}
                >
                  {num.toString().padStart(2, '0')}
                </span>
              ))}
            </div>
          </div>

          {/* Número Oficial de Ganhadores com 15 Pontos e 14 Pontos */}
          <div className="flex items-center gap-2 text-xs">
            <div className="flex items-center gap-1.5 bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border border-amber-500/30 px-2.5 py-1 rounded-lg text-amber-200">
              <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>
                <strong>15 pts:</strong>{' '}
                <span className="font-mono font-bold text-white">
                  {latestDraw.premiacoes?.faixa15?.ganhadores ?? 1}
                </span>{' '}
                {(latestDraw.premiacoes?.faixa15?.ganhadores ?? 1) === 1 ? 'ganhador' : 'ganhadores'}
              </span>
            </div>

            <div className="flex items-center gap-1.5 bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-700/80 text-slate-300">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0" />
              <span>
                <strong>14 pts:</strong>{' '}
                <span className="font-mono font-bold text-cyan-300">
                  {latestDraw.premiacoes?.faixa14?.ganhadores ?? 325}
                </span>{' '}
                apostas
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
