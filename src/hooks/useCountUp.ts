"use client";

import { useEffect, useState } from "react";

/**
 * Animates a numeric value from its current displayed value → target on
 * mount and whenever `target` changes. Returns the current displayed
 * value, suitable for rendering inside a KpiCard.
 */
export function useCountUp(target: number, durationMs = 700): number {
  const safeTarget = Number.isFinite(target) ? target : 0;
  const [value, setValue] = useState(0);

  useEffect(() => {
    let frame = 0;
    let start: number | null = null;
    let from: number | null = null;

    function step(ts: number) {
      if (start === null) start = ts;
      const elapsed = ts - start;
      const t = Math.min(1, elapsed / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue((current) => {
        if (from === null) from = current;
        return Math.round(from + (safeTarget - from) * eased);
      });
      if (t < 1) frame = requestAnimationFrame(step);
    }

    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [safeTarget, durationMs]);

  return value;
}
