import { useState, useEffect, useRef, useCallback } from 'react';
import { getSecondsRemaining } from '../lib/session';

interface UseTimerProps {
  expiresAt: string;
  onTimeExpired: () => void;
}

export function useTimer({ expiresAt, onTimeExpired }: UseTimerProps) {
  const [remainingSeconds, setRemainingSeconds] = useState<number>(() => getSecondsRemaining(expiresAt));
  const expiredHandledRef = useRef<boolean>(false);
  const onTimeExpiredRef = useRef(onTimeExpired);
  onTimeExpiredRef.current = onTimeExpired;

  useEffect(() => {
    expiredHandledRef.current = false;

    const tick = () => {
      const remaining = getSecondsRemaining(expiresAt);
      setRemainingSeconds(remaining);

      if (remaining <= 0 && !expiredHandledRef.current) {
        expiredHandledRef.current = true;
        onTimeExpiredRef.current();
      }
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  const formattedTime = useCallback((totalSeconds: number): string => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }, []);

  return {
    remainingSeconds,
    formatted: formattedTime(remainingSeconds),
    isUrgent: remainingSeconds <= 300, // Last 5 minutes
    isExpired: remainingSeconds <= 0,
  };
}
