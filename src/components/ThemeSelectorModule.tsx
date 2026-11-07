import React, { useState, useEffect } from 'react';
import {
  Palette,
  Sparkles,
  Check,
  Moon,
  Crown,
  Sun,
  Contrast,
  Eye,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { soundService } from '../services/soundAlert';

export type AppTheme = 'slate' | 'gold' | 'high_contrast';

interface ThemeSelectorModuleProps {
  onThemeChange?: (theme: AppTheme) => void;
}

export const ThemeSelectorModule: React.FC<ThemeSelectorModuleProps> = ({ onThemeChange }) => {
  const [currentTheme, setCurrentTheme] = useState<AppTheme>(() => {
    try {
      const saved = localStorage.getItem('lotosniper_theme') as AppTheme;
      if (saved === 'high_contrast') return 'high_contrast';
      if (saved === 'gold') return 'gold';
      if (saved === 'slate') return 'slate';
      return 'gold';
    } catch {
      return 'gold';
    }
  });

  const [feedback, setFeedback] = useState<string | null>(null);

  // Apply theme class to documentElement
  const applyTheme = (theme: AppTheme, notify = true) => {
    setCurrentTheme(theme);
    try {
      localStorage.setItem('lotosniper_theme', theme);
      if (typeof document !== 'undefined') {
        document.documentElement.classList.remove('theme-gold', 'theme-high-contrast', 'theme-night-contrast');
        if (theme === 'gold') {
          document.documentElement.classList.add('theme-gold');
        } else if (theme === 'high_contrast') {
          document.documentElement.classList.add('theme-high-contrast', 'theme-night-contrast');
        }
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('lotosniper-theme-changed', { detail: theme }));
      }

      if (onThemeChange) {
        onThemeChange(theme);
      }

      try {
        soundService.playFilterClick();
      } catch {}

      if (notify) {
        const labels: Record<AppTheme, string> = {
          high_contrast: 'Modo Noturno (Preto Absoluto / Alto Contraste) ativado com sucesso!',
          gold: 'Modo Gold Imperial ativado com sucesso!',
          slate: 'Modo Slate Técnico ativado com sucesso!',
        };
        setFeedback(labels[theme]);
        setTimeout(() => setFeedback(null), 4000);
      }
    } catch {}
  };

  useEffect(() => {
    // Sincroniza evento externo (ex: clique no botão do Header)
    const handleThemeChange = (e: any) => {
      if (e.detail && (e.detail === 'gold' || e.detail === 'high_contrast' || e.detail === 'slate')) {
        setCurrentTheme(e.detail);
      }
    };
    window.addEventListener('lotosniper-theme-changed', handleThemeChange);
    return () => window.removeEventListener('lotosniper-theme-changed', handleThemeChange);
  }, []);

  useEffect(() => {
    // Synchronize on mount
    if (typeof document !== 'undefined') {
      document.documentElement.classList.remove('theme-gold', 'theme-high-contrast', 'theme-night-contrast');
      if (currentTheme === 'gold') {
        document.documentElement.classList.add('theme-gold');
      } else if (currentTheme === 'high_contrast') {
        document.documentElement.classList.add('theme-high-contrast', 'theme-night-contrast');
      }
    }
  }, [currentTheme]);

  const isNightMode = currentTheme === 'high_contrast';

  const toggleMasterNightMode = () => {
    applyTheme(isNightMode ? 'gold' : 'high_contrast', true);
  };

  return (
    <div className="bg-slate-900/90 rounded-3xl border-2 border-slate-800 p-5 sm:p-6 shadow-xl space-y-6">
      {/* Toast Feedback */}
      {feedback && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center justify-between gap-2 shadow-lg animate-fadeIn">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{feedback}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-slate-400 hover:text-white text-xs px-2 py-0.5 rounded bg-slate-800"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-800 gap-3">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-zinc-700 via-zinc-800 to-black border border-zinc-600 text-white shadow-md shrink-0">
            <Palette className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-black text-white">
                Personalização Visual & Alternância de Tema
              </h3>
              <span
                className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full border uppercase font-black ${
                  isNightMode
                    ? 'bg-zinc-800 text-white border-zinc-500'
                    : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                }`}
              >
                {isNightMode ? 'Modo Noturno Ativo' : 'Modo Padrão Ativo'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Controle a paleta de cores para otimizar o conforto visual e eliminar a fadiga ocular em sessões prolongadas de análise combinatória.
            </p>
          </div>
        </div>

        <span className="text-xs font-mono text-slate-400 shrink-0">
          Tema em Uso:{' '}
          <strong
            className={
              currentTheme === 'gold'
                ? 'text-amber-400'
                : currentTheme === 'high_contrast'
                ? 'text-white'
                : 'text-emerald-400'
            }
          >
            {currentTheme === 'gold'
              ? 'Modo Gold Imperial'
              : currentTheme === 'high_contrast'
              ? 'Modo Noturno (Preto Absoluto)'
              : 'Modo Slate Padrão'}
          </strong>
        </span>
      </div>

      {/* BANNER PRINCIPAL: ALTERNÂNCIA MASTER 'MODO NOTURNO' (PRETO ABSOLUTO & ALTO CONTRASTE) */}
      <div
        className={`p-4 sm:p-5 rounded-2xl border-2 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden ${
          isNightMode
            ? 'bg-black border-white shadow-xl shadow-white/10 ring-1 ring-white/50'
            : 'bg-slate-950/80 border-slate-700/80 hover:border-slate-600'
        }`}
      >
        <div className="flex items-start gap-3.5">
          <div
            className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black shrink-0 transition-colors ${
              isNightMode
                ? 'bg-white text-black shadow-lg shadow-white/20'
                : 'bg-zinc-800 text-zinc-300 border border-zinc-700'
            }`}
          >
            <Moon className="w-6 h-6 fill-current" />
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-sm sm:text-base font-black text-white flex items-center gap-1.5">
                <span>Modo Noturno (Preto Absoluto & Alto Contraste)</span>
              </h4>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-200 border border-zinc-600">
                Anti-Fadiga Visual
              </span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Substitui o esquema de cores padrão (Slate/Gold) por uma paleta de <strong>alto contraste com tons de cinza escuro (#09090b / #18181b) e preto absoluto (#000000)</strong>, eliminando reflexos ofuscantes e reduzindo a tensão ocular durante sessões noturnas de análise estatística.
            </p>
          </div>
        </div>

        {/* Master Toggle Switch */}
        <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
          <button
            type="button"
            onClick={toggleMasterNightMode}
            className={`px-4 py-2.5 rounded-xl font-black text-xs transition cursor-pointer flex items-center gap-2 shadow-md active:scale-95 ${
              isNightMode
                ? 'bg-white hover:bg-zinc-200 text-black shadow-white/20 ring-2 ring-white/80'
                : 'bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-600'
            }`}
            title="Alternar entre o Modo Noturno de Alto Contraste e a paleta Slate/Gold padrão"
          >
            <Contrast className="w-4 h-4" />
            <span>{isNightMode ? 'Desativar Modo Noturno' : 'Ativar Modo Noturno'}</span>
          </button>
        </div>
      </div>

      {/* Theme Cards Grid */}
      <div className="space-y-2">
        <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 block font-bold">
          Todas as Opções de Paleta Disponíveis:
        </span>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Option 1: Modo Noturno / Alto Contraste */}
          <button
            type="button"
            onClick={() => applyTheme('high_contrast')}
            className={`p-4 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden group ${
              currentTheme === 'high_contrast'
                ? 'bg-black border-white ring-2 ring-white/60 shadow-xl shadow-white/10'
                : 'bg-slate-950/60 border-slate-800 hover:border-zinc-500'
            }`}
          >
            {currentTheme === 'high_contrast' && (
              <div className="absolute top-3 right-3 p-1 rounded-full bg-white text-black shadow-md">
                <Check className="w-3.5 h-3.5 stroke-[3]" />
              </div>
            )}

            <div className="flex items-center gap-2.5 mb-2">
              <div className="p-2 rounded-xl bg-zinc-800 text-white border border-zinc-700">
                <Contrast className="w-4 h-4 text-white" />
              </div>
              <div>
                <strong className="text-sm font-bold text-white block flex items-center gap-1.5">
                  <span>Modo Noturno (Preto Absoluto)</span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded font-mono font-black bg-white text-black">
                    P&B
                  </span>
                </strong>
                <span className="text-[11px] text-zinc-400">
                  Preto #000000 & Cinza Escuro
                </span>
              </div>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed mb-3">
              Fundo preto absoluto com tipografia de alta legibilidade, sem saturação cansativa para proteger a visão no escuro.
            </p>

            <div className="flex items-center gap-2 pt-2 border-t border-zinc-800">
              <span className="text-[10px] font-mono text-zinc-400 uppercase">Paleta:</span>
              <div className="flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-black border border-white" title="#000000"></span>
                <span className="w-4 h-4 rounded-full bg-zinc-900 border border-zinc-600" title="#09090b"></span>
                <span className="w-4 h-4 rounded-full bg-zinc-800 border border-zinc-500" title="#18181b"></span>
                <span className="w-4 h-4 rounded-full bg-white border border-zinc-300" title="#ffffff"></span>
              </div>
            </div>
          </button>

          {/* Option 2: Gold Luxury / Imperial */}
          <button
            type="button"
            onClick={() => applyTheme('gold')}
            className={`p-4 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden group ${
              currentTheme === 'gold'
                ? 'bg-[#0a0804] border-amber-400 ring-2 ring-amber-400/50 shadow-xl shadow-amber-500/20'
                : 'bg-slate-950/60 border-slate-800 hover:border-amber-500/40'
            }`}
          >
            {currentTheme === 'gold' && (
              <div className="absolute top-3 right-3 p-1 rounded-full bg-gradient-to-r from-amber-400 to-yellow-300 text-slate-950 shadow-md">
                <Check className="w-3.5 h-3.5 stroke-[3]" />
              </div>
            )}

            <div className="flex items-center gap-2.5 mb-2">
              <div className="p-2 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300">
                <Crown className="w-4 h-4 text-amber-400" />
              </div>
              <div>
                <strong className="text-sm font-bold text-amber-300 block flex items-center gap-1.5">
                  <span>Modo Gold Imperial</span>
                </strong>
                <span className="text-[11px] text-amber-400/80">
                  Preto profundo & ouro
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed mb-3">
              Paleta luxuosa com pretos profundos, linhas douradas refinadas e atmosfera imersiva de alta aposta.
            </p>

            <div className="flex items-center gap-2 pt-2 border-t border-slate-850">
              <span className="text-[10px] font-mono text-amber-500/80 uppercase">Paleta:</span>
              <div className="flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-[#060503] border border-amber-500/40" title="Preto Obsidiana"></span>
                <span className="w-4 h-4 rounded-full bg-[#120f09] border border-amber-500/40" title="Superfície Luxo"></span>
                <span className="w-4 h-4 rounded-full bg-[#fbbf24] border border-yellow-200" title="Ouro Dourado"></span>
              </div>
            </div>
          </button>

          {/* Option 3: Slate Dark */}
          <button
            type="button"
            onClick={() => applyTheme('slate')}
            className={`p-4 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden group ${
              currentTheme === 'slate'
                ? 'bg-slate-950 border-emerald-500 ring-2 ring-emerald-500/40 shadow-xl shadow-emerald-500/10'
                : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
            }`}
          >
            {currentTheme === 'slate' && (
              <div className="absolute top-3 right-3 p-1 rounded-full bg-emerald-500 text-slate-950 shadow-md">
                <Check className="w-3.5 h-3.5 stroke-[3]" />
              </div>
            )}

            <div className="flex items-center gap-2.5 mb-2">
              <div className="p-2 rounded-xl bg-slate-800 text-slate-200">
                <Moon className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <strong className="text-sm font-bold text-white block">
                  Modo Slate Clássico
                </strong>
                <span className="text-[11px] text-slate-400">
                  Ardósia escura & Esmeralda
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed mb-3">
              Interface equilibrada com superfícies em ardósia escura e destaques pontuais em verde esmeralda.
            </p>

            <div className="flex items-center gap-2 pt-2 border-t border-slate-850">
              <span className="text-[10px] font-mono text-slate-500 uppercase">Paleta:</span>
              <div className="flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-slate-950 border border-slate-700"></span>
                <span className="w-4 h-4 rounded-full bg-slate-800 border border-slate-700"></span>
                <span className="w-4 h-4 rounded-full bg-emerald-500 border border-emerald-400"></span>
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};
