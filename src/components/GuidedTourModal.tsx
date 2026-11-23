import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Layers,
  SlidersHorizontal,
  Brain,
  Swords,
  ClipboardCheck,
  Rocket,
  ChevronRight,
  ChevronLeft,
  X,
  CheckCircle2,
  Lightbulb,
  Target,
} from 'lucide-react';

interface GuidedTourModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab: (tab: string) => void;
}

interface TourHighlight {
  label: string;
  detail: string;
}

interface TourStep {
  id: string;
  section: string;
  title: string;
  subtitle: string;
  whatItDoes: string;
  howToUse: TourHighlight[];
  goldenTip: string;
  icon: React.ComponentType<{ className?: string }>;
  accentIconBg: string;
  targetTab: string;
  ctaLabel?: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    id: 'boas-vindas',
    section: 'Visão Geral',
    title: 'Jogue com estratégia, não no escuro',
    subtitle: 'Entenda em 1 minuto como o LotoSniper AI Pro organiza suas apostas na Lotofácil.',
    whatItDoes:
      'Em vez de marcar dezenas no "achismo", o aplicativo cruza os sorteios oficiais da Caixa com fechamentos matemáticos e inteligência estatística para transformar seu orçamento em bilhetes muito mais competitivos.',
    howToUse: [
      {
        label: '1. Escolha suas dezenas',
        detail: 'Use sugestões da IA, o Radar de Ciclo ou monte seu próprio grupo de dezenas favoritas.',
      },
      {
        label: '2. Gere o fechamento ideal',
        detail: 'Aplique filtros prontos para cortar combinações improváveis e economizar no valor total.',
      },
      {
        label: '3. Teste, confira e imprima',
        detail: 'Simule contra sorteios passados, confira acertos automaticamente e baixe o PDF pronto para a lotérica.',
      },
    ],
    goldenTip:
      'Você pode navegar entre as etapas abaixo ou pular o guia agora — se quiser rever depois, basta clicar no botão "Guia" no topo da tela ou no menu lateral.',
    icon: Sparkles,
    accentIconBg: 'text-amber-300 bg-amber-500/15 border-amber-500/35',
    targetTab: 'fechamento',
  },
  {
    id: 'central-fechamento',
    section: 'Estúdio de Fechamentos',
    title: 'Central Unificada & Matrizes de Alta Eficiência',
    subtitle: 'Cubra mais dezenas gastando menos com garantias matemáticas de 13 e 14 pontos.',
    whatItDoes:
      'Um fechamento (matriz LJCR) combina suas dezenas escolhidas de forma inteligente, evitando jogos repetitivos. Se as 15 sorteadas caírem dentro do seu grupo, você tem garantia real de premiação (13 ou 14 pontos) com muito menos bilhetes.',
    howToUse: [
      {
        label: 'Universo campeão (16 a 18 dezenas)',
        detail: 'É a faixa com melhor custo-benefício do app: alta chance de 13 e 14 pontos sem precisar fazer centenas de apostas.',
      },
      {
        label: 'Use 2 a 3 dezenas fixas',
        detail: 'Fixar de 2 a 3 dezenas muito fortes reduz drasticamente o número de jogos e o investimento, sem engessar o fechamento.',
      },
      {
        label: 'Acompanhe a Garantia Efetiva (LJCR)',
        detail: 'O indicador mostra em tempo real quanto da garantia original foi mantida e quanta economia os filtros geraram.',
      },
    ],
    goldenTip:
      'Comece pela matriz de 18 dezenas com 12 ou 24 jogos (Alta Eficiência) e 2 dezenas fixas — é o ponto de partida favorito para equilibrar risco e orçamento.',
    icon: Layers,
    accentIconBg: 'text-amber-300 bg-amber-500/15 border-amber-500/35',
    targetTab: 'fechamento',
  },
  {
    id: 'filtros-presets',
    section: 'Filtros Inteligentes',
    title: 'Presets Calibrados e Proteção Anti-Vazio',
    subtitle: 'Elimine combinações que quase nunca saem, sem precisar configurar regra por regra.',
    whatItDoes:
      'Os Presets Estatísticos (Equilíbrio Pro, Conservador, Balanceado e Agressivo) já vêm ajustados com os padrões que mais se repetem nos resultados históricos da Lotofácil — você escolhe o perfil em um clique.',
    howToUse: [
      {
        label: 'Soma Estratificada (Proteção de Caudas)',
        detail: 'Concentra a maior parte dos jogos na faixa de soma mais comum (180 a 215), mas preserva uma cota nas faixas vizinhas para você não ficar de fora de sorteios atípicos.',
      },
      {
        label: 'Equilíbrio completo em 6 frentes',
        detail: 'Controla automaticamente Pares/Ímpares, Moldura, Primos, Fibonacci e Repetidas do último concurso.',
      },
      {
        label: 'Fallback Progressivo automático',
        detail: 'Se os filtros ficarem rígidos demais para o seu grupo de dezenas, o motor relaxa as margens aos poucos para nunca gerar fechamento vazio.',
      },
    ],
    goldenTip:
      'Se o Indicador de Garantia ficar abaixo de 75%, clique em "Flexibilizar Filtros" ou troque para o preset Balanceado para recuperar cobertura matemática.',
    icon: SlidersHorizontal,
    accentIconBg: 'text-emerald-300 bg-emerald-500/15 border-emerald-500/35',
    targetTab: 'fechamento',
  },
  {
    id: 'motor-ia',
    section: 'Motor de IA & Predição',
    title: 'Escolha dezenas fortes com o scoreIA',
    subtitle: 'Transforme o histórico recente em uma pontuação simples para cada dezena de 01 a 25.',
    whatItDoes:
      'O Motor de IA avalia frequência, atraso, repetição e comportamento de ciclo para gerar o Índice de Precisão (scoreIA) — quanto maior o score, mais alinhada a dezena ou aposta está com o momento atual dos sorteios.',
    howToUse: [
      {
        label: 'Curva ABC & Pares de Ouro',
        detail: 'Identifica rapidamente quais dezenas estão em alta (Classe A), equilibradas (B) ou frias (C), além das duplas que mais saem juntas.',
      },
      {
        label: 'Fechamento de Ciclo',
        detail: 'Mostra exatamente quais dezenas ainda faltam sair para completar todas as 25 — quando restam 1 a 3 pendentes, a pressão para saírem dispara.',
      },
      {
        label: 'Dezenas Âncoras prontas',
        detail: 'Envie as dezenas recomendadas ou âncoras direto para o Estúdio de Fechamentos com apenas 1 clique.',
      },
    ],
    goldenTip:
      'Quando o alerta de "Reta Final do Ciclo" aparecer no topo do app, use as 1 ou 2 dezenas pendentes como fixas no seu próximo fechamento.',
    icon: Brain,
    accentIconBg: 'text-cyan-300 bg-cyan-500/15 border-cyan-500/35',
    targetTab: 'ia_preditor',
  },
  {
    id: 'simulador-backtesting',
    section: 'Simulador & Estatísticas',
    title: 'Teste sua estratégia antes de apostar',
    subtitle: 'Valide fechamentos contra concursos reais anteriores e compare algoritmos lado a lado.',
    whatItDoes:
      'Antes de gastar dinheiro na lotérica, o Simulador & Backtesting testa seus bilhetes contra dezenas de sorteios passados da Caixa, mostrando quantas vezes você teria premiado e qual seria o retorno financeiro.',
    howToUse: [
      {
        label: 'Backtesting Histórico & Monte Carlo',
        detail: 'Veja em segundos o desempenho dos seus jogos nos últimos concursos ou em até 1.000 sorteios simulados.',
      },
      {
        label: 'Duelo de Algoritmos',
        detail: 'Coloque estratégias diferentes para competir lado a lado e descubra qual combina melhor com seu estilo de aposta.',
      },
      {
        label: 'Estatísticas & Mapa de Calor',
        detail: 'Explore gráficos visuais de frequência, atrasos e calor nos últimos 100 concursos para refinar sua seleção.',
      },
    ],
    goldenTip:
      'Sempre passe um fechamento novo pelo Backtesting Rápido: se ele teve boa regularidade de 11, 12 e 13 pontos no histórico recente, tende a devolver parte do custo com frequência.',
    icon: Swords,
    accentIconBg: 'text-purple-300 bg-purple-500/15 border-purple-500/35',
    targetTab: 'simulador',
  },
  {
    id: 'gestao-impressao',
    section: 'Meus Jogos & Conferência',
    title: 'Confira acertos, acompanhe o ROI e imprima',
    subtitle: 'Seus bilhetes salvos conferidos automaticamente com a Caixa e prontos para o papel.',
    whatItDoes:
      'Na aba Meus Jogos & Conferência, cada fechamento salvo fica organizado em dossiê. Assim que um novo concurso oficial da Caixa é sincronizado, o sistema audita todos os bilhetes e calcula seu ROI real (custo vs. prêmio).',
    howToUse: [
      {
        label: 'Conferência automática + ROI real',
        detail: 'Veja imediatamente bilhetes com 11 a 15 pontos destacados e monitore o retorno de cada jogo salvo.',
      },
      {
        label: 'PDF Impressão Rápida, Volantes 5×5 & Cologa',
        detail: 'Baixe a lista limpa em PDF para impressão rápida (economia de tinta), gere volantes visuais de lotérica ou exporte em CSV/TXT/Cologa.',
      },
      {
        label: 'Backup em JSON e Nuvem',
        detail: 'Salve e restaure todo o seu histórico de fechamentos a qualquer momento para nunca perder seus jogos.',
      },
    ],
    goldenTip:
      'Use o botão "Impressão Rápida (PDF)" em Meus Jogos para gerar uma folha A4 limpa com caixinhas de marcação — ideal para conferir ou passar para o volante na lotérica sem gastar tinta.',
    icon: ClipboardCheck,
    accentIconBg: 'text-emerald-300 bg-emerald-500/15 border-emerald-500/35',
    targetTab: 'jogos',
  },
  {
    id: 'pronto-para-comecar',
    section: 'Comece Agora',
    title: 'Tudo pronto para seu primeiro fechamento',
    subtitle: 'Siga este roteiro de 3 passos rápidos e gere sua primeira matriz auditada.',
    whatItDoes:
      'Agora você já conhece o caminho completo do LotoSniper AI Pro. Vamos levar você direto para a Central Unificada de Fechamento para colocar tudo em prática agora mesmo.',
    howToUse: [
      {
        label: 'Passo 1 · Escolha de 16 a 18 dezenas',
        detail: 'Use o preenchimento inteligente da IA ou selecione manualmente no volante 5×5, marcando 2 ou 3 dezenas fixas.',
      },
      {
        label: 'Passo 2 · Selecione um Preset de Filtros',
        detail: 'Escolha o preset Equilíbrio Pro / Balanceado e confira o Indicador de Garantia Efetiva (LJCR).',
      },
      {
        label: 'Passo 3 · Gere, salve e baixe o PDF',
        detail: 'Clique em gerar fechamento, salve em Meus Jogos e imprima com 1 clique quando estiver pronto.',
      },
    ],
    goldenTip:
      'Dica final: no cabeçalho do app você também pode alternar o tema visual entre Gold, Alto Contraste e Dark (Slate) para ler com máximo conforto a qualquer hora.',
    icon: Rocket,
    accentIconBg: 'text-amber-300 bg-amber-500/15 border-amber-500/35',
    targetTab: 'fechamento',
    ctaLabel: 'Ir para o Fechamento',
  },
];

export const GuidedTourModal: React.FC<GuidedTourModalProps> = ({
  isOpen,
  onClose,
  onNavigateTab,
}) => {
  const [currentStep, setCurrentStep] = useState<number>(0);

  // Reinicia sempre na etapa 1 ao reabrir o tutorial
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0);
    }
  }, [isOpen]);

  // Navegação por teclado (ESC para pular/fechar, setas esquerda/direita)
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleSkip();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, currentStep]);

  if (!isOpen) return null;

  const totalSteps = TOUR_STEPS.length;
  const step = TOUR_STEPS[currentStep];
  const Icon = step.icon;
  const isFirst = currentStep === 0;
  const isLast = currentStep === totalSteps - 1;
  const progressPercent = Math.round(((currentStep + 1) / totalSteps) * 100);

  const markCompleted = () => {
    try {
      localStorage.setItem('lotosniper_tour_completed', 'true');
    } catch {}
  };

  const handleGoToStep = (index: number) => {
    if (index < 0 || index >= totalSteps) return;
    setCurrentStep(index);
    onNavigateTab(TOUR_STEPS[index].targetTab);
  };

  const handleNext = () => {
    if (isLast) {
      markCompleted();
      onNavigateTab('fechamento');
      onClose();
    } else {
      handleGoToStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (!isFirst) {
      handleGoToStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    markCompleted();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/85 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="guided-tour-title"
    >
      <div className="bg-slate-900 border border-amber-500/30 rounded-2xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl shadow-black/70 relative overflow-hidden">
        {/* Barra de Progresso Superior */}
        <div className="w-full h-1.5 bg-slate-800 shrink-0" aria-hidden="true">
          <div
            className="h-full bg-gradient-to-r from-amber-500 via-yellow-400 to-emerald-400 transition-all duration-300 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Cabeçalho Compacto */}
        <div className="px-5 sm:px-6 pt-4 pb-3 border-b border-slate-800/90 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-400 min-w-0">
            <span className="font-mono font-bold text-amber-400 tabular-nums whitespace-nowrap">
              Etapa {currentStep + 1} de {totalSteps}
            </span>
            <span aria-hidden="true" className="text-slate-600">
              ·
            </span>
            <span className="text-slate-300 font-semibold truncate">{step.section}</span>
            <span aria-hidden="true" className="text-slate-600 hidden sm:inline">
              ·
            </span>
            <span className="font-mono text-slate-500 tabular-nums hidden sm:inline">
              {progressPercent}%
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleSkip}
              className="text-xs font-medium text-slate-400 hover:text-white px-2.5 py-1.5 rounded-lg hover:bg-slate-800 transition cursor-pointer whitespace-nowrap"
            >
              Pular tutorial
            </button>
            <button
              type="button"
              onClick={handleSkip}
              className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition cursor-pointer"
              aria-label="Fechar tutorial"
              title="Fechar tutorial"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Conteúdo Rolável (Responsivo Desktop & Mobile) */}
        <div className="px-5 sm:px-6 py-5 overflow-y-auto space-y-5 flex-1">
          {/* Título + Ícone Principal */}
          <div className="flex items-start gap-3.5">
            <div
              className={`p-3 rounded-xl border shrink-0 flex items-center justify-center ${step.accentIconBg}`}
            >
              <Icon className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <h2
                id="guided-tour-title"
                className="text-lg sm:text-xl font-bold text-white leading-snug tracking-tight"
                style={{ textWrap: 'balance' }}
              >
                {step.title}
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-1 leading-relaxed">
                {step.subtitle}
              </p>
            </div>
          </div>

          {/* Para que serve */}
          <div className="space-y-1.5">
            <h3 className="text-xs font-semibold text-amber-400">Para que serve</h3>
            <p className="text-sm text-slate-200 leading-relaxed">{step.whatItDoes}</p>
          </div>

          {/* Como usar na prática */}
          <div className="bg-slate-950/75 rounded-xl border border-slate-800 p-4 space-y-3">
            <h3 className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>Como usar na prática</span>
            </h3>
            <ul className="space-y-2.5">
              {step.howToUse.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2.5 text-xs sm:text-[13px] leading-relaxed">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div className="text-slate-300">
                    <strong className="text-white font-semibold">{item.label}:</strong>{' '}
                    <span>{item.detail}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Dica de Ouro (1 por etapa — contraste suave sem borda grossa à esquerda) */}
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3.5 sm:p-4 flex items-start gap-3">
            <div className="p-2 rounded-lg bg-amber-500/20 text-amber-300 shrink-0 mt-0.5">
              <Lightbulb className="w-4 h-4" />
            </div>
            <div className="space-y-0.5 min-w-0">
              <span className="text-xs font-bold text-amber-300 block">Dica de Ouro</span>
              <p className="text-xs sm:text-[13px] text-amber-100/90 leading-relaxed">
                {step.goldenTip}
              </p>
            </div>
          </div>
        </div>

        {/* Rodapé com Navegação de Etapas e Botões */}
        <div className="px-5 sm:px-6 py-4 border-t border-slate-800/90 bg-slate-950/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shrink-0">
          {/* Indicadores Clicáveis das Etapas */}
          <div className="flex items-center justify-center sm:justify-start gap-1.5" role="tablist" aria-label="Etapas do tutorial">
            {TOUR_STEPS.map((s, idx) => {
              const isActive = idx === currentStep;
              const isCompleted = idx < currentStep;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => handleGoToStep(idx)}
                  aria-label={`Ir para etapa ${idx + 1}: ${s.section}`}
                  aria-current={isActive ? 'step' : undefined}
                  title={`Etapa ${idx + 1}: ${s.section}`}
                  className={`h-2.5 rounded-full transition-all duration-200 cursor-pointer ${
                    isActive
                      ? 'w-7 bg-amber-400'
                      : isCompleted
                      ? 'w-2.5 bg-emerald-400/80 hover:bg-emerald-300'
                      : 'w-2.5 bg-slate-700 hover:bg-slate-500'
                  }`}
                />
              );
            })}
          </div>

          {/* Botões de Ação */}
          <div className="flex items-center justify-between sm:justify-end gap-2">
            {!isFirst ? (
              <button
                type="button"
                onClick={handlePrev}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Anterior</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSkip}
                className="px-3 py-2.5 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 text-xs font-medium transition cursor-pointer whitespace-nowrap shrink-0 sm:hidden"
              >
                Pular
              </button>
            )}

            <button
              type="button"
              onClick={handleNext}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-yellow-400 text-slate-950 text-xs font-black transition shadow-lg shadow-amber-500/20 cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 ml-auto sm:ml-0"
            >
              <span>{isLast ? step.ctaLabel || 'Começar Agora' : 'Próximo'}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
