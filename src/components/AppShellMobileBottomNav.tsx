import React from 'react';
import {
  BarChart3,
  Layers,
  Award,
  Download,
} from 'lucide-react';
import { TabType } from '../App';

interface AppShellMobileBottomNavProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  savedTicketsCount: number;
}

export const AppShellMobileBottomNav: React.FC<AppShellMobileBottomNavProps> = ({
  activeTab,
  onTabChange,
  savedTicketsCount,
}) => {
  const isJogosActive = activeTab === 'jogos' || activeTab === 'conferencia';

  const items = [
    {
      id: 'estatisticas' as TabType,
      label: 'Painel',
      icon: BarChart3,
      isActive: activeTab === 'estatisticas',
      activeColor: 'text-emerald-400',
      activeBg: 'bg-emerald-500/15 border-emerald-500/30',
    },
    {
      id: 'fechamento' as TabType,
      label: 'Estúdio',
      icon: Layers,
      isActive: activeTab === 'fechamento',
      activeColor: 'text-amber-400',
      activeBg: 'bg-amber-500/15 border-amber-500/30',
    },
    {
      id: 'jogos' as TabType,
      label: 'Meus Jogos',
      icon: Download,
      isActive: isJogosActive,
      activeColor: 'text-cyan-400',
      activeBg: 'bg-cyan-500/15 border-cyan-500/30',
      badge: savedTicketsCount > 0 ? savedTicketsCount : undefined,
    },
    {
      id: 'simulador' as TabType,
      label: 'Simulador',
      icon: Award,
      isActive: activeTab === 'simulador',
      activeColor: 'text-purple-400',
      activeBg: 'bg-purple-500/15 border-purple-500/30',
    },
  ];

  return (
    <nav
      aria-label="Navegação Inferior Mobile LotoSniper"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 border-t border-slate-800/90 backdrop-blur-xl px-2 py-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-[0_-4px_25px_rgba(0,0,0,0.5)]"
    >
      <div className="grid grid-cols-4 gap-1 items-center max-w-md mx-auto">
        {items.map((item) => {
          const Icon = item.icon;
          const active = item.isActive;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onTabChange(item.id)}
              className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all cursor-pointer relative ${
                active ? `${item.activeBg} border ${item.activeColor}` : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${active ? 'scale-110' : ''} transition-transform`} />
                {item.badge !== undefined && (
                  <span className="absolute -top-1.5 -right-2 px-1 py-0.2 rounded-full bg-cyan-500 text-slate-950 font-mono text-[9px] font-black leading-none shadow-sm">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className={`text-[10px] mt-1 tracking-tight ${active ? 'font-black' : 'font-medium'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
