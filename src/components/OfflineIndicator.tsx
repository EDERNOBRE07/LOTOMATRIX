import React from 'react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { WifiOff, Database, ShieldCheck } from 'lucide-react';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:right-auto sm:max-w-md z-50 flex items-center gap-3 rounded-2xl bg-slate-900/95 border-2 border-amber-500/70 p-3.5 shadow-2xl backdrop-blur-md text-amber-200 animate-fadeIn">
      <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 shrink-0">
        <WifiOff className="w-5 h-5 animate-pulse" />
      </div>
      <div className="text-xs">
        <div className="font-black text-amber-300 flex items-center gap-1.5">
          <span>Modo Offline Ativo (LotoSniper PWA)</span>
          <span className="text-[9px] font-mono bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded border border-amber-500/40">
            LOCAL
          </span>
        </div>
        <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">
          Sem conexão à internet. Suas estatísticas anteriores, fechamentos e jogos salvos continuam 100% operacionais via cache local.
        </p>
      </div>
    </div>
  );
};
