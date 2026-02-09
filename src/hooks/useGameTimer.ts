import { useState, useEffect } from 'react';

type UseGameTimerProps = {
  isActive: boolean;
  duration: number;
  onTimeout: () => void;
  onTick?: (timer: number) => void;
  shouldRun: boolean;
};

export function useGameTimer({
  isActive,
  duration,
  onTimeout,
  onTick,
  shouldRun
}: UseGameTimerProps) {
  const [timer, setTimer] = useState(duration);

  useEffect(() => {
    if (!isActive || !shouldRun) return;

    if (timer > 0) {
      const timeout = setTimeout(() => {
        const nextTime = timer - 1;
        setTimer(nextTime);
        onTick?.(nextTime);
      }, 1000);

      return () => clearTimeout(timeout);
    } else {
      onTimeout();
    }
  }, [timer, isActive, shouldRun]);

  return { timer, setTimer };
}