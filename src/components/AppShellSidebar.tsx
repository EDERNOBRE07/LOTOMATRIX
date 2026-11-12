import React from 'react';
import {
  BarChart3,
  Layers,
  Award,
  Download,
  Settings,
  Sparkles,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Flame,
  Zap,
} from 'lucide-react';
import { TabType } from '../App';

interface AppShellSidebarProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  savedTicketsCount: number;
  onOpenBackup: () => void;
  onOpenTour: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export const AppShellSidebar: React.FC<AppShellSidebarProps> = ({
  activeTab,
  onTabChange,
  savedTicketsCount,
  onOpenBackup,
  onOpenTour,
  isCollapsed,
  onToggleCollapse,
}) => {
  const isJogosActive = activeTab === 'jogos' || activeTab === 'conferencia';

  const pillars = [
    {
      id: 'estatisticas' as TabType,
      label: 'Painel & Estatísticas',
      shortLabel: 'Painel',
      description: 'Resultados, Ciclos & Análises',
      icon: BarChart3,
      badge: 'Live',
      badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
      activeColor: 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black shadow-lg shadow-emerald-500/20',
      hoverColor: 'hover:bg-slate-900 hover:text-emerald-300',
      isActive: activeTab === 'estatisticas',
    },
    {
      id: 'fechamento' as TabType,
      label: 'Estúdio de Fechamentos',
      shortLabel: 'Estúdio',
      description: 'Matrizes 15 a 21 & Motores',
      icon: Layers,
      badge: '14 Pts',
      badgeColor: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
      activeColor: 'bg-gradient-to-r from-amber-400 to-yellow-400 text-slate-950 font-black shadow-lg shadow-amber-500/20',
      hoverColor: 'hover:bg-slate-900 hover:text-amber-300',
      isActive: activeTab === 'fechamento',
    },
    {
      id: 'jogos' as TabType,
      label: 'Meus Jogos & Conferência',
      shortLabel: 'Jogos',
      description: 'Dossiês, Acertos & Exportações',
      icon: Download,
      badge: savedTicketsCount > 0 ? `${savedTicketsCount}` : undefined,
      badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
      activeColor: 'bg-gradient-to-r from-cyan-400 to-sky-500 text-slate-950 font-black shadow-lg shadow-cyan-500/20',
      hoverColor: 'hover:bg-slate-900 hover:text-cyan-300',
      isActive: isJogosActive,
    },
    {
      id: 'simulador' as TabType,
      label: 'Auditoria & Simulador',
      shortLabel: 'Simulador',
      description: 'Backtesting 50 & Cobertura',
      icon: Award,
      badge: '50 Draws',
      badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
      activeColor: 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-black shadow-lg shadow-purple-500/20',
      hoverColor: 'hover:bg-slate-900 hover:text-purple-300',
      isActive: activeTab === 'simulador',
    },
  ];

  return (
    <aside
      className={`hidden md:flex flex-col justify-between shrink-0 bg-slate-950/90 border-r border-slate-800/80 backdrop-blur-xl transition-all duration-300 ease-in-out sticky top-[73px] h-[calc(100vh-73px)] z-30 select-none ${
        isCollapsed ? 'w-20 px-2 py-4' : 'w-64 p-3.5'
      }`}
    >
      {/* Top Section: Pilares de Navegação */}
      <div className="space-y-4">
        {!isCollapsed && (
          <div className="px-2 pt-1 pb-1">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 block">
              Módulos Principais
            </span>
          </div>
        )}

        <nav className="space-y-1.5" aria-label="Navegação dos 4 Pilares">
          {pillars.map((item) => {
            const Icon = item.icon;
            const active = item.isActive;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onTabChange(item.id)}
                title={isCollapsed ? item.label : undefined}
                className={`w-full group flex items-center gap-3 rounded-xl transition-all duration-200 cursor-pointer ${
                  isCollapsed ? 'justify-center p-3' : 'px-3 py-2.5 text-left'
                } ${
                  active
                    ? item.activeColor
                    : `text-slate-300 border border-transparent ${item.hoverColor}`
                }`}
              >
                <div className="relative shrink-0">
                  <Icon className={`w-5 h-5 transition-transform group-hover:scale-110 ${active ? 'fill-current' : ''}`} />
                  {isCollapsed && item.badge && (
                    <span className="absolute -top-1.5 -right-2 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-slate-950" />
                  )}
                </div>

                {!isCollapsed && (
                  <div className="min-w-0 flex-1 flex items-center justify-between gap-1.5">
                    <div className="truncate">
                      <span className="text-xs font-bold block truncate tracking-tight">
                        {item.label}
                      </span>
                      <span className={`text-[10px] block truncate ${active ? 'text-slate-900/80 font-medium' : 'text-slate-400'}`}>
                        {item.description}
                      </span>
                    </div>

                    {item.badge && (
                      <span
                        className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded-md border shrink-0 ${
                          active
                            ? 'bg-slate-950/20 text-slate-950 border-black/20'
                            : item.badgeColor
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Section: Utilitários & Ações Secundárias */}
      <div className="pt-4 border-t border-slate-800/80 space-y-1">
        {/* Configurações */}
        <button
          type="button"
          onClick={() => onTabChange('configuracoes')}
          title={isCollapsed ? 'Configurações' : undefined}
          className={`w-full flex items-center gap-3 rounded-xl transition cursor-pointer text-slate-400 hover:text-white hover:bg-slate-900 ${
            isCollapsed ? 'justify-center p-2.5' : 'px-3 py-2 text-left'
          } ${activeTab === 'configuracoes' ? 'bg-slate-900 text-white font-bold border border-slate-700' : ''}`}
        >
          <Settings className="w-4 h-4 shrink-0" />
          {!isCollapsed && <span className="text-xs font-semibold">Configurações</span>}
        </button>

        {/* Backup JSON */}
        <button
          type="button"
          onClick={onOpenBackup}
          title={isCollapsed ? 'Backup & Nuvem' : undefined}
          className={`w-full flex items-center gap-3 rounded-xl transition cursor-pointer text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/30 ${
            isCollapsed ? 'justify-center p-2.5' : 'px-3 py-2 text-left'
          }`}
        >
          <ShieldCheck className="w-4 h-4 shrink-0" />
          {!isCollapsed && (
            <div className="flex items-center justify-between flex-1 text-xs font-semibold">
              <span>Backup JSON</span>
              <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Auto
              </span>
            </div>
          )}
        </button>

        {/* Tour Guiado */}
        <button
          type="button"
          onClick={onOpenTour}
          title={isCollapsed ? 'Tour Guiado' : undefined}
          className={`w-full flex items-center gap-3 rounded-xl transition cursor-pointer text-amber-400 hover:text-amber-300 hover:bg-amber-950/30 ${
            isCollapsed ? 'justify-center p-2.5' : 'px-3 py-2 text-left'
          }`}
        >
          <Sparkles className="w-4 h-4 shrink-0" />
          {!isCollapsed && <span className="text-xs font-semibold">Tour Guiado</span>}
        </button>

        {/* Toggle Collapse Sidebar */}
        <button
          type="button"
          onClick={onToggleCollapse}
          className={`w-full mt-2 flex items-center justify-center p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-900 border border-slate-800 transition cursor-pointer text-xs`}
          title={isCollapsed ? 'Expandir barra lateral' : 'Recolher barra lateral'}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          {!isCollapsed && <span className="ml-2 text-[11px] font-mono">Recolher Menu</span>}
        </button>
      </div>
    </aside>
  );
};
