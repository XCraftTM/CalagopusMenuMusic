import { useEffect, useState } from 'react';

const ACTIVITY_EVENTS = ['pointermove', 'pointerdown', 'keydown', 'wheel', 'touchstart', 'scroll'] as const;

/**
 * Becomes `true` after `timeoutMs` without any user input and back to `false` on the next input.
 * Passing `null` disables tracking and always returns `false`.
 */
export function useIdle(timeoutMs: number | null): boolean {
  const [idle, setIdle] = useState(false);

  useEffect(() => {
    if (timeoutMs === null) {
      setIdle(false);
      return;
    }

    let timer: ReturnType<typeof setTimeout>;
    let lastActivity = 0;

    const arm = () => {
      clearTimeout(timer);
      timer = setTimeout(() => setIdle(true), timeoutMs);
    };

    const onActivity = () => {
      setIdle(false);

      // pointermove fires constantly, re-arming a few times per second is plenty
      const now = Date.now();
      if (now - lastActivity < 250) return;
      lastActivity = now;
      arm();
    };

    arm();
    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, onActivity, { capture: true, passive: true });
    }

    return () => {
      clearTimeout(timer);
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, onActivity, { capture: true });
      }
    };
  }, [timeoutMs]);

  return idle;
}
