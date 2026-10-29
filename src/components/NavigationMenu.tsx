import React, { useState, useEffect } from 'react';
import {
  Layers,
  ClipboardCheck,
  Sparkles,
  BarChart3,
  Award,
  Download,
  Settings,
  Globe,
  HelpCircle,
  Zap,
  Flame,
  CheckCircle2,
  TrendingUp,
  Sliders,
  ChevronRight,
  Bell,
} from 'lucide-react';
import { TabType } from '../App';
import { GameTicket } from '../types/lotofacil';
import { getUnreadAlertsCount } from '../services/notificationService';
import { IntelligentPushNotificationModal } from './IntelligentPushNotificationModal';

interface NavigationMenuProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  savedTickets: GameTicket[];
  onOpenTour: () => void;
  concursoAtualNumero?: number;
}

interface NavItemConfig {
  id: TabType;
  label: string;
  shortLabel?: string;
  badge?: string;
  badgeValue?: number | string;
  subtitle: string;
  icon: React.ElementType;
  activeColorClass: string;
  hoverColorClass: string;
  inactiveIconColor: string;
  glowColor: string;
  accentBorder: string;
}

export const NavigationMenu: React.FC<NavigationMenuProps> = ({
  activeTab,
  onTabChange,
  savedTickets,
  onOpenTour,
  concursoAtualNumero,
}) => {
  const [unreadAlerts, setUnreadAlerts] = useState<number>(() => getUnreadAlertsCount());
  const [isAlertsModalOpen, setIsAlertsModalOpen] = useState<boolean>(false);

  useEffect(() => {
    const handleAlertsUpdate = () => {
      setUnreadAlerts(getUnreadAlertsCount());
    };
    window.addEventListener('lotosniper-alerts-updated', handleAlertsUpdate);
    return () => window.removeEventListener('lotosniper-alerts-updated', handleAlertsUpdate);
  }, []);

  // 6 Módulos Principais solicitados pelo usuário com cores vibrantes e identidades exclusivas
  const primaryTabs: NavItemConfig[] = [
    {
      id: 'fechamento',
      label: 'Fechamentos & 14 Pontos',
      shortLabel: 'Fechamento',
      badge: '14 Pts',
      subtitle: 'Matrizes combinatórias de 15 a 21 dezenas com cobertura matemática exata',
      icon: Layers,
      activeColorClass:
        'bg-gradient-to-r from-emerald-400 via-emerald-500 to-teal-400 text-slate-950 shadow-[0_0_30px_rgba(16,185,129,0.55)] border-emerald-300 ring-2 ring-emerald-400/40',
      hoverColorClass:
        'hover:border-emerald-500/60 hover:text-emerald-300 hover:bg-emerald-950/40 hover:shadow-[0_0_20px_rgba(16,185,129,0.25)]',
      inactiveIconColor: 'text-emerald-400',
      glowColor: 'bg-emerald-500',
      accentBorder: 'border-emerald-500/40',
    },
    {
      id: 'conferencia',
      label: 'Conferência de Jogos',
      shortLabel: 'Conferência',
      badge: 'Auditoria',
      badgeValue: '24',
      subtitle: 'Conferência oficial Caixa com contagem de acertos, premiação e checagem de volantes',
      icon: ClipboardCheck,
      activeColorClass:
        'bg-gradient-to-r from-sky-400 via-blue-500 to-indigo-500 text-white shadow-[0_0_30px_rgba(14,165,233,0.55)] border-sky-300 ring-2 ring-sky-400/40',
      hoverColorClass:
        'hover:border-sky-500/60 hover:text-sky-300 hover:bg-sky-950/40 hover:shadow-[0_0_20px_rgba(14,165,233,0.25)]',
      inactiveIconColor: 'text-sky-400',
      glowColor: 'bg-sky-500',
      accentBorder: 'border-sky-500/40',
    },
    {
      id: 'ia_preditor',
      label: 'Preditor de IA em Tempo Real',
      shortLabel: 'Preditor IA',
      badge: 'IA Live',
      subtitle: 'Motor preditivo neural em tempo real com mapa de calor e rankings probabilísticos',
      icon: Sparkles,
      activeColorClass:
        'bg-gradient-to-r from-purple-500 via-fuchsia-500 to-pink-500 text-white shadow-[0_0_30px_rgba(217,70,239,0.55)] border-fuchsia-300 ring-2 ring-fuchsia-400/40',
      hoverColorClass:
        'hover:border-fuchsia-500/60 hover:text-fuchsia-300 hover:bg-fuchsia-950/40 hover:shadow-[0_0_20px_rgba(217,70,239,0.25)]',
      inactiveIconColor: 'text-fuchsia-400',
      glowColor: 'bg-fuchsia-500',
      accentBorder: 'border-fuchsia-500/40',
    },
    {
      id: 'estatisticas',
      label: 'Estatísticas & Atrasos',
      shortLabel: 'Estatísticas',
      badge: unreadAlerts > 0 ? 'Radar Alerta' : 'Pares de Ouro',
      badgeValue: unreadAlerts > 0 ? `${unreadAlerts} novo(s)` : undefined,
      subtitle: 'Frequências históricas, atrasos atuais, Pares de Ouro e status do ciclo das 25 dezenas',
      icon: BarChart3,
      activeColorClass:
        'bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500 text-slate-950 shadow-[0_0_30px_rgba(245,158,11,0.55)] border-amber-300 ring-2 ring-amber-400/40',
      hoverColorClass:
        'hover:border-amber-500/60 hover:text-amber-300 hover:bg-amber-950/40 hover:shadow-[0_0_20px_rgba(245,158,11,0.25)]',
      inactiveIconColor: 'text-amber-400',
      glowColor: 'bg-amber-500',
      accentBorder: 'border-amber-500/40',
    },
    {
      id: 'simulador',
      label: 'Simulador & Backtest',
      shortLabel: 'Simulador',
      badge: 'Evolução Saldo',
      badgeValue: savedTickets.length > 0 ? `${savedTickets.length} salvos` : undefined,
      subtitle: 'Backtesting histórico nos últimos 50 concursos com gráfico interativo de Evolução do Saldo',
      icon: Award,
      activeColorClass:
        'bg-gradient-to-r from-rose-500 via-pink-500 to-rose-600 text-white shadow-[0_0_30px_rgba(244,63,94,0.55)] border-rose-300 ring-2 ring-rose-400/40',
      hoverColorClass:
        'hover:border-rose-500/60 hover:text-rose-300 hover:bg-rose-950/40 hover:shadow-[0_0_20px_rgba(244,63,94,0.25)]',
      inactiveIconColor: 'text-rose-400',
      glowColor: 'bg-rose-500',
      accentBorder: 'border-rose-500/40',
    },
    {
      id: 'jogos',
      label: 'Jogos Salvos',
      shortLabel: 'Jogos Salvos',
      badge: 'Fechamentos',
      badgeValue: savedTickets.length > 0 ? `${savedTickets.length} jogos` : undefined,
      subtitle: 'Histórico de fechamentos salvos com dossiê técnico de filtros e exportação para conferência',
      icon: Download,
      activeColorClass:
        'bg-gradient-to-r from-teal-400 via-emerald-500 to-cyan-500 text-slate-950 shadow-[0_0_30px_rgba(20,184,166,0.55)] border-teal-300 ring-2 ring-teal-400/40',
      hoverColorClass:
        'hover:border-teal-500/60 hover:text-teal-300 hover:bg-teal-950/40 hover:shadow-[0_0_20px_rgba(20,184,166,0.25)]',
      inactiveIconColor: 'text-teal-400',
      glowColor: 'bg-teal-500',
      accentBorder: 'border-teal-500/40',
    },
  ];

  const currentTabConfig = primaryTabs.find((t) => t.id === activeTab);

  return (
    <div className="space-y-2">
      {/* Container Principal do Menu com Glassmorphism, Borda Tecnológica e Destaque Visual */}
      <nav
        aria-label="Navegação Principal do LotoSniper"
        className="bg-slate-900/95 backdrop-blur-xl rounded-2xl border-2 border-slate-800/90 p-2 sm:p-2.5 shadow-2xl relative overflow-hidden"
      >
        {/* Luzes de fundo de atmosfera / ambient glow */}
        <div className="absolute top-0 left-1/4 w-96 h-20 bg-emerald-500/10 blur-3xl pointer-events-none" />
        <div className="absolute top-0 right-1/4 w-96 h-20 bg-fuchsia-500/10 blur-3xl pointer-events-none" />

        {/* Top Header do Menu: Facilita Localização Imediata */}
        <div className="flex items-center justify-between px-2.5 py-1 mb-2 border-b border-slate-800/80 text-[11px]">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-80" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="font-mono font-bold tracking-wider uppercase text-slate-400 text-[10px]">
              Menu de Módulos Estratégicos
            </span>
            {concursoAtualNumero && (
              <span className="hidden sm:inline font-mono text-[10px] text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-full border border-slate-700/60">
                Base Concurso #{concursoAtualNumero}
              </span>
            )}
          </div>

          {/* Atalhos Rápidos Utilitários no Topo Direito */}
          <div className="flex items-center gap-1.5">
            {/* Botão de Notificações Push Inteligentes com Badge */}
            <button
              type="button"
              onClick={() => setIsAlertsModalOpen(true)}
              className="relative flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700/80 hover:border-rose-500/50 shadow-sm"
              title="Notificações Push Inteligentes (Radar > 90% e Novos Ciclos)"
            >
              <Bell className={`w-3.5 h-3.5 ${unreadAlerts > 0 ? 'text-rose-400 animate-bounce' : 'text-slate-400'}`} />
              <span className="hidden sm:inline">Alertas Push</span>
              {unreadAlerts > 0 && (
                <span className="flex items-center justify-center px-1.5 py-0.2 rounded-full bg-rose-500 text-white font-mono text-[9px] font-black animate-pulse shadow-sm shadow-rose-500/50">
                  {unreadAlerts}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => onTabChange('configuracoes')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
                activeTab === 'configuracoes'
                  ? 'bg-slate-800 text-white border border-slate-700'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
              title="Configurações e Parâmetros da Base de Dados"
            >
              <Settings className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Configurações</span>
            </button>

            <button
              type="button"
              onClick={() => onTabChange('hostinger')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
                activeTab === 'hostinger'
                  ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/50'
                  : 'text-indigo-400 hover:text-indigo-300 hover:bg-indigo-950/30'
              }`}
              title="Instruções de Deploy Hostinger"
            >
              <Globe className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Publicar</span>
            </button>

            <button
              type="button"
              onClick={onOpenTour}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 font-bold transition text-[11px] cursor-pointer shadow-sm hover:scale-[1.02] active:scale-95"
              title="Iniciar Tour Guiado com Dicas de Cada Módulo"
            >
              <Sparkles className="w-3.5 h-3.5 animate-pulse" />
              <span>Tour Guiado</span>
            </button>
          </div>
        </div>

        {/* Grid / Carrossel dos 6 Módulos Principais com Botões Animados e Cores Vibrantes */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-2.5">
          {primaryTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onTabChange(tab.id)}
                className={`group relative flex flex-col justify-between p-3 sm:p-3.5 rounded-xl border text-left cursor-pointer transition-all duration-300 ease-out transform overflow-hidden select-none min-h-[78px] sm:min-h-[86px] ${
                  isActive
                    ? `${tab.activeColorClass} scale-[1.02] z-10 font-black`
                    : `bg-slate-950/70 border-slate-800/90 text-slate-300 hover:-translate-y-1 hover:scale-[1.02] ${tab.hoverColorClass}`
                }`}
              >
                {/* Efeito de Shimmer / Brilho Animado que cruza o botão no hover */}
                <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 pointer-events-none" />

                {/* Linha Superior: Ícone Animado + Badge Vibrante */}
                <div className="flex items-start justify-between gap-1.5 w-full relative z-10">
                  <div
                    className={`p-1.5 rounded-lg transition-all duration-300 transform group-hover:scale-115 group-hover:rotate-6 ${
                      isActive
                        ? 'bg-slate-950/20 text-current shadow-sm'
                        : `bg-slate-900 border border-slate-800 ${tab.inactiveIconColor} group-hover:bg-slate-800`
                    }`}
                  >
                    <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>

                  {/* Micro-badge de destaque dinâmico */}
                  {tab.badge && (
                    <span
                      className={`text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded-md font-bold transition-transform group-hover:scale-105 shrink-0 ${
                        isActive
                          ? 'bg-slate-950/30 text-current border border-black/10'
                          : 'bg-slate-800/90 text-slate-300 border border-slate-700/60'
                      }`}
                    >
                      {tab.badgeValue !== undefined ? `${tab.badge}: ${tab.badgeValue}` : tab.badge}
                    </span>
                  )}
                </div>

                {/* Linha Inferior: Rótulo Principal com Tipografia Forte e Clara */}
                <div className="mt-2.5 relative z-10">
                  <span
                    className={`block font-extrabold text-xs sm:text-[13px] tracking-tight leading-snug transition-colors ${
                      isActive ? 'text-inherit font-black' : 'text-slate-100 group-hover:text-white'
                    }`}
                  >
                    {tab.label}
                  </span>

                  {/* Indicador de ativação animado (linha inferior luminosa) */}
                  {isActive && (
                    <span className="block mt-1 w-6 h-1 rounded-full bg-slate-950/40 animate-pulse" />
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Faixa Inferior de Contexto: Facilita Localização e Explica o Módulo Ativo */}
        {currentTabConfig && (
          <div className="mt-2.5 pt-2 border-t border-slate-800/80 px-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 text-slate-300 min-w-0">
              <span className="flex items-center gap-1 font-bold text-white shrink-0">
                <span className={`w-2 h-2 rounded-full ${currentTabConfig.glowColor}`} />
                <span>Módulo Ativo:</span>
              </span>
              <span className="text-slate-400 truncate text-[11px]">
                {currentTabConfig.subtitle}
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-400 shrink-0 self-end sm:self-auto">
              <span>Navegue com 1 clique</span>
              <ChevronRight className="w-3 h-3 text-slate-500" />
            </div>
          </div>
        )}
      </nav>

      {/* Modal de Configuração e Histórico de Notificações Push Inteligentes */}
      <IntelligentPushNotificationModal
        isOpen={isAlertsModalOpen}
        onClose={() => setIsAlertsModalOpen(false)}
        onAlertsChanged={() => setUnreadAlerts(getUnreadAlertsCount())}
      />
    </div>
  );
};
