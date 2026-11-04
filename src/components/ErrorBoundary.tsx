import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, RotateCcw, ShieldAlert, Layers } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[LotoSniper ErrorBoundary] Erro de renderização capturado:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReload = () => {
    if (this.props.onReset) {
      this.props.onReset();
    }
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  private handleHardReset = () => {
    try {
      localStorage.removeItem('lotosniper_active_fechamento_meta');
      localStorage.removeItem('lotosniper_matrix_autosave');
    } catch {}
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[400px] flex items-center justify-center p-6 bg-slate-950 text-slate-100">
          <div className="max-w-xl w-full bg-slate-900 border-2 border-rose-500/50 rounded-2xl p-6 sm:p-8 shadow-2xl shadow-rose-950/40 space-y-5 animate-in fade-in duration-200">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 shrink-0">
                <ShieldAlert className="w-8 h-8 text-rose-400" />
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold">
                  Recuperação Automática Ativa
                </span>
                <h2 className="text-lg sm:text-xl font-black text-white">
                  {this.props.fallbackTitle || 'Ocorreu uma oscilação na renderização deste módulo'}
                </h2>
                <p className="text-xs text-slate-400 leading-relaxed">
                  O LotoSniper interceptou com segurança uma inconsistência de dados ou filtros. Seus dados salvos continuam intactos.
                </p>
              </div>
            </div>

            {/* Error Message Details */}
            {this.state.error && (
              <div className="bg-slate-950/90 rounded-xl p-3.5 border border-slate-800 font-mono text-xs text-rose-300/90 space-y-1 overflow-x-auto">
                <div className="font-bold text-[11px] text-slate-400">Diagnóstico Técnico:</div>
                <div className="text-rose-400 break-words">{this.state.error.message || String(this.state.error)}</div>
              </div>
            )}

            {/* Recovery Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-xs transition cursor-pointer shadow-lg shadow-emerald-500/20 active:scale-95"
              >
                <RefreshCw className="w-4 h-4 fill-current" />
                <span>Restaurar Visualização</span>
              </button>

              <button
                type="button"
                onClick={this.handleHardReset}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold transition cursor-pointer"
                title="Limpar memória cache temporária de fechamentos e recarregar a página"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                <span>Limpar Cache & Recarregar</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
