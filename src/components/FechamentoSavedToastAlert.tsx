import React, { useEffect, useState } from 'react';
import { CheckCircle2, ArrowRight, X, Layers, Database, Eye } from 'lucide-react';
import { soundService } from '../services/soundAlert';

export interface FechamentoSavedEventDetail {
  id: string;
  title?: string;
  name?: string;
  totalJogos?: number;
  garantia?: string;
  concurso?: number;
  timestamp?: number;
}

export const FechamentoSavedToastAlert: React.FC = () => {
  const [activeAlert, setActiveAlert] = useState<FechamentoSavedEventDetail | null>(null);

  useEffect(() => {
    const handleSaved = (e: any) => {
      const detail: FechamentoSavedEventDetail = e.detail || {};
      setActiveAlert(detail);
      try {
        soundService.playGoldenZoneSuccessChime();
      } catch {}
    };

    window.addEventListener('lotosniper-fechamento-saved-alert', handleSaved);
    return () => {
      window.removeEventListener('lotosniper-fechamento-saved-alert', handleSaved);
    };
  }, []);

  // Auto-dismiss após 12 segundos
  useEffect(() => {
    if (!activeAlert) return;
    const timer = setTimeout(() => {
      setActiveAlert(null);
    }, 12000);
    return () => clearTimeout(timer);
  }, [activeAlert]);

  if (!activeAlert) return null;

  const handleGoToSavedGames = () => {
    setActiveAlert(null);
    window.dispatchEvent(new CustomEvent('switch-tab', { detail: 'jogos' }));
  };

  return (
    <div className="fixed top-5 right-4 sm:right-6 z-50 max-w-md w-full animate-bounce-short shadow-2xl">
      <div className="bg-slate-900/95 backdrop-blur-xl border-2 border-emerald-400/80 rounded-2xl p-4 sm:p-5 shadow-2xl shadow-emerald-500/20 text-white space-y-3.5 relative overflow-hidden">
        {/* Glow de fundo */}
        <div className="absolute top-0 right-0 -mr-10 -mt-10 w-40 h-40 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-emerald-500/30 shrink-0 animate-pulse">
              <CheckCircle2 className="w-6 h-6 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-mono font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  ✓ FECHAMENTO SALVO
                </span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                  <Database className="w-2.5 h-2.5" />
                  Banco de Dados OK
                </span>
              </div>
              <h4 className="text-sm sm:text-base font-black text-white mt-1 leading-tight">
                {activeAlert.title || 'Fechamento Salvo com Sucesso!'}
              </h4>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setActiveAlert(null)}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer shrink-0"
            title="Fechar alerta"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed font-sans">
          {activeAlert.name ? (
            <>
              O fechamento <strong className="text-white font-mono">{activeAlert.name}</strong>{' '}
              {activeAlert.totalJogos ? `(${activeAlert.totalJogos} jogos)` : ''} foi arquivado com sucesso no seu banco de dados com dossiê técnico completo.
            </>
          ) : (
            'Seu fechamento foi arquivado com sucesso no banco de dados com todos os filtros canônicos e dossiê técnico completo.'
          )}
        </p>

        {/* Botão para Ver Jogos Salvos */}
        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={handleGoToSavedGames}
            className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-yellow-300 text-slate-950 font-black text-xs transition cursor-pointer shadow-lg shadow-amber-500/30 flex items-center justify-center gap-2 hover:scale-102 active:scale-95 ring-2 ring-amber-300"
          >
            <Eye className="w-4 h-4 text-slate-950" />
            <span>Ver Jogos Salvos</span>
            <ArrowRight className="w-4 h-4 text-slate-950" />
          </button>

          <button
            type="button"
            onClick={() => setActiveAlert(null)}
            className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition cursor-pointer shrink-0"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
