import React, { useEffect, useRef } from 'react';
import { motion, useAnimationControls, useReducedMotion } from 'framer-motion';

interface AnimatedRoiCardProps {
  children: React.ReactNode;
  refreshKey: string | number;
  delay?: number;
  className?: string;
}

/**
 * Cartão animado com Framer Motion (fade-in + slide-up) na montagem inicial
 * e sempre que os dados subjacentes (`refreshKey`) são atualizados,
 * preservando a instância montada para que os contadores numéricos internos
 * façam a transição suave sem saltos.
 */
export const AnimatedRoiCard: React.FC<AnimatedRoiCardProps> = ({
  children,
  refreshKey,
  delay = 0,
  className = '',
}) => {
  const controls = useAnimationControls();
  const shouldReduceMotion = useReducedMotion();
  const isFirstMount = useRef(true);

  useEffect(() => {
    if (shouldReduceMotion) {
      controls.set({ opacity: 1, y: 0 });
      return;
    }

    if (isFirstMount.current) {
      isFirstMount.current = false;
      controls.set({ opacity: 0, y: 16 });
      void controls.start({
        opacity: 1,
        y: 0,
        transition: {
          duration: 0.36,
          delay,
          ease: [0.16, 1, 0.3, 1],
        },
      });
      return;
    }

    controls.set({ opacity: 0.2, y: 12 });
    void controls.start({
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.34,
        delay: delay * 0.6,
        ease: [0.16, 1, 0.3, 1],
      },
    });
  }, [refreshKey, delay, shouldReduceMotion, controls]);

  return (
    <motion.div
      initial={shouldReduceMotion ? false : { opacity: 0, y: 16 }}
      animate={controls}
      className={className}
    >
      {children}
    </motion.div>
  );
};
