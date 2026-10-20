import React, { useState } from 'react';
import {
  Sparkles,
  Layers,
  BarChart3,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  X,
  ShieldCheck,
  Zap,
  Award,
  Play,
  RotateCcw,
} from 'lucide-react';

interface GuidedTourModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab: (tab: string) => void;
}

export const GuidedTourModal: React.FC<GuidedTourModalProps> = ({
  isOpen,
  onClose,
  onNavigateTab,
}) => {
  const [currentStep, setCurrentStep] = useState<number>(0);

  if (!isOpen) return null;

  const steps = [
    {
      title: 'Bem-vindo ao LotoSniper!',
      badge: 'Guia do Novo Usuário',
      icon: Sparkles,
      iconColor: 'text-emerald-400 bg-emerald-500/20 border-emerald-500/30',
      description:
        'O LotoSniper é a plataforma definitiva de inteligência probabilística e desdobramentos matemáticos para a Lotofácil. Em poucos passos, você aprenderá como montar matrizes enxutas com garantia de 14 pontos.',
      points: [
        'Elimina combinações matematicamente improváveis (podas de ramos)',
        'Garante 14 pontos se as 15 sorteadas estiverem no seu volante escolhido',
        'Sincronizado automaticamente com os dados oficiais da Caixa',
      ],
      targetTab: 'fechamento',
    },
    {
      title: '1. Fechamentos & Garantia de 14 Pontos',
      badge: 'Aba Principal',
      icon: Layers,
      iconColor: 'text-amber-400 bg-amber-500/20 border-amber-500/30',
      description:
        'Aqui você seleciona de 15 a 21 dezenas e o motor matemático calcula a matriz perfeita com cobertura otimizada de garantias.',
      points: [
        'Escolha sua estratégia: ⚡ Estratégia Documento (9R + 9A), Top 18 IA ou Fechar Ciclo',
        'Configure os Filtros Obrigatórios (Soma Canônica 190-210 e Paridade 8P/7I)',
        'O validador em tempo real testa a integridade matemática da sua matriz',
      ],
      targetTab: 'fechamento',
    },
    {
      title: '2. Preditor de IA em Tempo Real',
      badge: 'Inteligência Artificial',
      icon: Zap,
      iconColor: 'text-cyan-400 bg-cyan-500/20 border-cyan-500/30',
      description:
        'A rede neural estatística avalia a probabilidade de cada uma das 25 dezenas com base em 500 concursos oficiais e no atraso atual.',
      points: [
        'Vetor de propensão probabilística das 25 dezenas',
        'Monitoramento de dezenas críticas para o fechamento de ciclo',
        'Gera 3 Apostas Ouro prontas para registrar na lotérica por apenas R$ 10,50',
      ],
      targetTab: 'ia_preditor',
    },
    {
      title: '3. Estatísticas, Atrasos & Radar da Zona de Ouro',
      badge: 'Análise Avançada',
      icon: BarChart3,
      iconColor: 'text-purple-400 bg-purple-500/20 border-purple-500/30',
      description:
        'Explore gráficos detalhados de frequência, atrasos atuais, dezenas em ascensão e o exclusivo gráfico de radar de aderência à Zona de Ouro.',
      points: [
        'Radar de Aderência (0 a 100%) comparando seu jogo com a Zona de Ouro',
        'Dezenas em Ascensão com maior momentum nos últimos 10 concursos',
        'Pares de Ouro com maior frequência conjunta para usar como filtro',
      ],
      targetTab: 'estatisticas',
    },
    {
      title: 'Pronto para Gerar Seu Primeiro Fechamento!',
      badge: 'Comece Agora',
      icon: Award,
      iconColor: 'text-emerald-400 bg-emerald-500/20 border-emerald-500/30',
      description:
        'Tudo pronto! Vamos abrir a aba de Fechamentos para você gerar seu primeiro jogo com 14 pontos garantidos.',
      points: [
        'Selecione 18 dezenas recomendadas pela IA',
        'Clique em "Gerar Fechamento Otimizado"',
        'Exporte em CSV para ferramentas ou imprima diretamente em volantes da Lotofácil',
      ],
      targetTab: 'fechamento',
    },
  ];

  const current = steps[currentStep];
  const Icon = current.icon;
  const isLast = currentStep === steps.length - 1;

  const handleNext = () => {
    if (isLast) {
      onNavigateTab('fechamento');
      onClose();
      try {
        localStorage.setItem('lotosniper_tour_completed', 'true');
      } catch {}
    } else {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      onNavigateTab(steps[nextStep].targetTab);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      const prevStep = currentStep - 1;
      setCurrentStep(prevStep);
      onNavigateTab(steps[prevStep].targetTab);
    }
  };

  const handleSkip = () => {
    onClose();
    try {
      localStorage.setItem('lotosniper_tour_completed', 'true');
    } catch {}
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full p-6 shadow-2xl relative overflow-hidden space-y-5">
        {/* Progress Bar Top */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-slate-800">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 transition-all duration-300"
            style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
          ></div>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 font-bold border border-slate-700 uppercase">
              Etapa {currentStep + 1} de {steps.length}
            </span>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30">
              {current.badge}
            </span>
          </div>

          <button
            onClick={handleSkip}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
            title="Pular tutorial"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-2xl border ${current.iconColor}`}>
              <Icon className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white">{current.title}</h3>
              <p className="text-xs text-slate-400 mt-0.5">LotoSniper Guia Rápido de Alta Performance</p>
            </div>
          </div>

          <p className="text-sm text-slate-300 leading-relaxed">{current.description}</p>

          {/* Key Bullet Points */}
          <div className="bg-slate-950/70 rounded-2xl border border-slate-850 p-4 space-y-2">
            {current.points.map((pt, idx) => (
              <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>{pt}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Action Controls Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-800">
          <button
            onClick={handleSkip}
            className="text-xs text-slate-400 hover:text-slate-200 transition cursor-pointer"
          >
            Pular Tutorial
          </button>

          <div className="flex items-center gap-2">
            {currentStep > 0 && (
              <button
                onClick={handlePrev}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition cursor-pointer flex items-center gap-1"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Anterior</span>
              </button>
            )}

            <button
              onClick={handleNext}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 text-xs font-black transition shadow-lg shadow-emerald-500/25 cursor-pointer flex items-center gap-1.5"
            >
              <span>{isLast ? 'Gerar Meu Fechamento!' : 'Próximo'}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
