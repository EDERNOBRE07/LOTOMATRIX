import { useEffect, useRef, useState } from 'react';

/**
 * Hook to trigger a smooth golden glow animation on metric cards whenever
 * the contest number or the tracked value updates with significant changes.
 */
export function useMetricGlow<T>(triggerValue: T, durationMs: number = 2400): boolean {
  const [isGlowing, setIsGlowing] = useState(false);
  const prevValueRef = useRef<T>(triggerValue);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      prevValueRef.current = triggerValue;
      return;
    }

    if (triggerValue !== prevValueRef.current) {
      prevValueRef.current = triggerValue;
      setIsGlowing(true);
      const timer = setTimeout(() => {
        setIsGlowing(false);
      }, durationMs);
      return () => clearTimeout(timer);
    }
  }, [triggerValue, durationMs]);

  return isGlowing;
}
