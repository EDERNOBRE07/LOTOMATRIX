import React, { useState, useEffect } from 'react';
import { Palette, Sparkles, Check, Moon, Crown, Sun } from 'lucide-react';

export type AppTheme = 'slate' | 'gold';

interface ThemeSelectorModuleProps {
  onThemeChange?: (theme: AppTheme) => void;
}

export const ThemeSelectorModule: React.FC<ThemeSelectorModuleProps> = ({ onThemeChange }) => {
  const [currentTheme, setCurrentTheme] = useState<AppTheme>(() => {
    try {
      const saved = localStorage.getItem('lotosniper_theme') as AppTheme;
      return saved === 'gold' ? 'gold' : 'slate';
    } catch {
      return 'slate';
    }
  });

  // Apply theme class to documentElement
  const applyTheme = (theme: AppTheme) => {
    setCurrentTheme(theme);
    try {
      localStorage.setItem('lotosniper_theme', theme);
      if (typeof document !== 'undefined') {
        if (theme === 'gold') {
          document.documentElement.classList.add('theme-gold');
        } else {
          document.documentElement.classList.remove('theme-gold');
        }
      }
      if (onThemeChange) {
        onThemeChange(theme);
      }
    } catch {}
  };

  useEffect(() => {
    // Synchronize on mount
    if (typeof document !== 'undefined') {
      if (currentTheme === 'gold') {
        document.documentElement.classList.add('theme-gold');
      } else {
        document.documentElement.classList.remove('theme-gold');
      }
    }
  }, [currentTheme]);

  return (
    <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-5 sm:p-6 shadow-xl space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-slate-800 gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-gradient-to-tr from-amber-500/20 to-yellow-500/20 border border-amber-500/30 text-amber-300">
            <Palette className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <span>Personalização Visual & Paleta da Interface</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 uppercase font-bold">
                Imersão Lotérica
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Alterne entre o visual escuro técnico padrão e a atmosfera de alta imersão em tons dourados e pretos profundos.
            </p>
          </div>
        </div>

        <span className="text-xs font-mono text-slate-400">
          Tema Ativo: <strong className={currentTheme === 'gold' ? 'text-amber-400' : 'text-emerald-400'}>{currentTheme === 'gold' ? 'Modo Gold Imperial' : 'Modo Slate Padrão'}</strong>
        </span>
      </div>

      {/* Theme Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Option 1: Slate Dark */}
        <button
          type="button"
          onClick={() => applyTheme('slate')}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden group ${
            currentTheme === 'slate'
              ? 'bg-slate-950 border-emerald-500 ring-2 ring-emerald-500/40 shadow-xl shadow-emerald-500/10'
              : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
          }`}
        >
          {/* Active Badge */}
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
                Modo Escuro Padrão (Slate & Esmeralda)
              </strong>
              <span className="text-[11px] text-slate-400">
                Design técnico tradicional de alta precisão
              </span>
            </div>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed mb-3">
            Interface equilibrada com superfícies em ardósia escura, contraste cirúrgico e destaques em verde esmeralda.
          </p>

          {/* Color Swatch Preview */}
          <div className="flex items-center gap-2 pt-2 border-t border-slate-850">
            <span className="text-[10px] font-mono text-slate-500 uppercase">Paleta:</span>
            <div className="flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-slate-950 border border-slate-700" title="#020617 (Slate 950)"></span>
              <span className="w-4 h-4 rounded-full bg-slate-900 border border-slate-700" title="#0f172a (Slate 900)"></span>
              <span className="w-4 h-4 rounded-full bg-slate-800 border border-slate-700" title="#1e293b (Slate 800)"></span>
              <span className="w-4 h-4 rounded-full bg-emerald-500 border border-emerald-400" title="#10b981 (Emerald)"></span>
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
          {/* Active Badge */}
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
                <span>Modo Gold Imperial (Preto Profundo & Ouro)</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded font-mono font-black bg-amber-500 text-slate-950">
                  NOVO
                </span>
              </strong>
              <span className="text-[11px] text-amber-400/80">
                Experiência imersiva inspirada nos grandes prêmios
              </span>
            </div>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed mb-3">
            Paleta luxuosa com pretos profundos obsidiana, linhas douradas refinadas e destaques em ouro champanhe para máxima emoção ao conferir volantes.
          </p>

          {/* Color Swatch Preview */}
          <div className="flex items-center gap-2 pt-2 border-t border-slate-850">
            <span className="text-[10px] font-mono text-amber-500/80 uppercase">Paleta:</span>
            <div className="flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-[#060503] border border-amber-500/40" title="Preto Profundo Obsidiana"></span>
              <span className="w-4 h-4 rounded-full bg-[#120f09] border border-amber-500/40" title="Superfície Luxo"></span>
              <span className="w-4 h-4 rounded-full bg-[#d97706] border border-amber-400" title="Ouro Escovado"></span>
              <span className="w-4 h-4 rounded-full bg-[#fbbf24] border border-yellow-200" title="Ouro Dourado Brilhante"></span>
            </div>
          </div>
        </button>
      </div>
    </div>
  );
};
