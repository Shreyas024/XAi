import { useState, useEffect } from 'react';

export function useCountUp(end, duration = 1000, enabled = true) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!enabled || end == null) return;

    const startTime = Date.now();
    const startVal = 0;

    const tick = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(startVal + (end - startVal) * eased);

      if (progress < 1) {
        requestAnimationFrame(tick);
      } else {
        setValue(end);
      }
    };

    requestAnimationFrame(tick);
  }, [end, duration, enabled]);

  return value;
}
