import React from 'react';
import { Sparkles, TrendingUp, AlertTriangle, RefreshCw } from 'lucide-react';
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
  const getSourceLabel = (src: string) => {
    if (src === 'caixa-oficial') return 'Caixa Oficial (Tempo Real)';
    if (src === 'espelho-api') return 'Espelho Oficial (Online)';
    if (src === 'cache-local') return 'Cache Local Atualizado';
    return 'Base Oficial';
  };

  return (
    <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-40">
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
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition cursor-pointer disabled:opacity-50"
            title="Verificar e atualizar com o último concurso da Caixa Econômica Federal"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-emerald-400' : 'text-slate-400'}`} />
            <span>{isSyncing ? 'Buscando...' : 'Atualizar'}</span>
          </button>

          {/* Ciclo Telemetry */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            <span>Ciclo ({concursosNoCiclo}º):</span>
            <span className="text-slate-300">Faltam:</span>
            <strong className="text-amber-200 font-mono font-bold bg-amber-500/20 px-1.5 py-0.5 rounded">
              {cyclePendingNumbers.map((n) => n.toString().padStart(2, '0')).join(', ')}
            </strong>
          </div>

          {/* AI Status */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>IA:</span>
            <strong className="text-white font-mono">
              {aiStatus === 'loading' ? 'Otimizando...' : 'Online'}
            </strong>
          </div>

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
    </header>
  );
};
