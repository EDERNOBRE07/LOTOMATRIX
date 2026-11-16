import React, { useEffect, useRef, useState } from 'react';
import { animate, useReducedMotion } from 'framer-motion';

const brlFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

interface AnimatedCurrencyValueProps {
  value: number;
  signed?: boolean;
  className?: string;
  suffix?: string;
  duration?: number;
}

export const AnimatedCurrencyValue: React.FC<AnimatedCurrencyValueProps> = ({
  value,
  signed = false,
  className = '',
  suffix = '',
  duration = 0.65,
}) => {
  const shouldReduceMotion = useReducedMotion();
  const safeTarget = Number.isFinite(value) ? value : 0;
  const currentRef = useRef<number>(safeTarget);
  const [displayValue, setDisplayValue] = useState<number>(safeTarget);

  useEffect(() => {
    if (shouldReduceMotion) {
      currentRef.current = safeTarget;
      setDisplayValue(safeTarget);
      return;
    }

    const startValue = currentRef.current;
    if (Math.abs(startValue - safeTarget) < 0.001) {
      currentRef.current = safeTarget;
      setDisplayValue(safeTarget);
      return;
    }

    const controls = animate(startValue, safeTarget, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (latest) => {
        currentRef.current = latest;
        setDisplayValue(latest);
      },
      onComplete: () => {
        currentRef.current = safeTarget;
        setDisplayValue(safeTarget);
      },
    });

    return () => {
      controls.stop();
    };
  }, [safeTarget, duration, shouldReduceMotion]);

  const cleanDisplay = Math.abs(displayValue) < 0.005 ? 0 : displayValue;
  let formatted: string;
  if (signed) {
    if (cleanDisplay > 0.005) {
      formatted = `+${brlFormatter.format(cleanDisplay)}`;
    } else if (cleanDisplay < -0.005) {
      formatted = `-${brlFormatter.format(Math.abs(cleanDisplay))}`;
    } else {
      formatted = brlFormatter.format(0);
    }
  } else {
    formatted = brlFormatter.format(Math.max(0, cleanDisplay) === 0 && cleanDisplay < 0 ? cleanDisplay : cleanDisplay);
  }

  return (
    <span className={`font-mono tabular-nums ${className}`}>
      {formatted}
      {suffix}
    </span>
  );
};

interface AnimatedNumberValueProps {
  value: number;
  decimals?: number;
  signed?: boolean;
  prefix?: string;
  suffix?: string;
  className?: string;
  duration?: number;
}

export const AnimatedNumberValue: React.FC<AnimatedNumberValueProps> = ({
  value,
  decimals = 1,
  signed = false,
  prefix = '',
  suffix = '',
  className = '',
  duration = 0.65,
}) => {
  const shouldReduceMotion = useReducedMotion();
  const safeTarget = Number.isFinite(value) ? value : 0;
  const currentRef = useRef<number>(safeTarget);
  const [displayValue, setDisplayValue] = useState<number>(safeTarget);

  useEffect(() => {
    if (shouldReduceMotion) {
      currentRef.current = safeTarget;
      setDisplayValue(safeTarget);
      return;
    }

    const startValue = currentRef.current;
    if (Math.abs(startValue - safeTarget) < 0.001) {
      currentRef.current = safeTarget;
      setDisplayValue(safeTarget);
      return;
    }

    const controls = animate(startValue, safeTarget, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (latest) => {
        currentRef.current = latest;
        setDisplayValue(latest);
      },
      onComplete: () => {
        currentRef.current = safeTarget;
        setDisplayValue(safeTarget);
      },
    });

    return () => {
      controls.stop();
    };
  }, [safeTarget, duration, shouldReduceMotion]);

  const clean = Math.abs(displayValue) < 0.005 ? 0 : displayValue;
  const signPrefix = signed && clean > 0.05 ? '+' : '';
  const formattedNum = clean.toFixed(decimals).replace('.', ',');

  return (
    <span className={`font-mono tabular-nums ${className}`}>
      {prefix}
      {signPrefix}
      {formattedNum}
      {suffix}
    </span>
  );
};
