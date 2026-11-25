import type { Transition, Variants } from 'framer-motion';

export interface StaggerAnimationConfig {
  staggerChildren?: number;
  delayChildren?: number;
  duration?: number;
  yOffset?: number;
}

/**
 * Gera variantes do Framer Motion para revelação escalonada (staggered fade-in)
 * ao atualizar concursos na Header, StatisticsTab e demais painéis de dezenas.
 */
export function createStaggerContainerVariants(
  config: StaggerAnimationConfig = {}
): Variants {
  const { staggerChildren = 0.035, delayChildren = 0.04 } = config;
  return {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren,
        delayChildren,
      },
    },
  };
}

export function createStaggerItemVariants(
  config: StaggerAnimationConfig = {}
): Variants {
  const { duration = 0.28, yOffset = 8 } = config;
  return {
    hidden: {
      opacity: 0,
      y: yOffset,
      scale: 0.88,
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration,
        ease: [0.22, 1, 0.36, 1],
      },
    },
  };
}

export const staggerContainerVariants: Variants = createStaggerContainerVariants({
  staggerChildren: 0.032,
  delayChildren: 0.02,
});

export const staggerBallVariants: Variants = createStaggerItemVariants({
  duration: 0.26,
  yOffset: 6,
});

export const staggerCardVariants: Variants = createStaggerItemVariants({
  duration: 0.24,
  yOffset: 10,
});

/**
 * Transição fluida de layout para reordenação e redimensionamento de contêineres de filtros
 * (ex: ativar/desativar Distância de Hamming na FechamentoTab).
 */
export const filterLayoutTransition: Transition = {
  layout: {
    duration: 0.28,
    ease: [0.22, 1, 0.36, 1],
  },
  opacity: { duration: 0.2 },
};

/**
 * Utilitário CSS otimizado de delay escalonado caso algum subcomponente utilize transições CSS puras.
 */
export function getStaggerCssTransitionStyle(index: number, stepMs: number = 35): {
  animationDelay: string;
  transitionDelay: string;
} {
  const delay = `${Math.max(0, index) * stepMs}ms`;
  return {
    animationDelay: delay,
    transitionDelay: delay,
  };
}
