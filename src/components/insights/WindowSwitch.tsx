"use client";

import { cn } from "@/lib/utils/cn";
import type { AnalyticsWindow } from "@/lib/types/analytics";

interface Props {
  value: AnalyticsWindow;
  onChange: (next: AnalyticsWindow) => void;
  disabled?: boolean;
}

const OPTIONS: AnalyticsWindow[] = [14, 30, 90];

export function WindowSwitch({ value, onChange, disabled }: Props) {
  return (
    <div
      role="tablist"
      aria-label="Analytics window"
      className="inline-flex border-[1.5px] border-ink rounded-md overflow-hidden"
    >
      {OPTIONS.map((opt, idx) => {
        const active = opt === value;
        return (
          <button
            key={opt}
            type="button"
            role="tab"
            aria-selected={active}
            disabled={disabled}
            onClick={() => onChange(opt)}
            className={cn(
              "px-3 py-1 font-sans font-semibold text-[12px] transition-colors",
              idx > 0 && "border-l-[1.5px] border-ink",
              active
                ? "bg-ink text-paper"
                : "bg-paper text-ink hover:bg-paper-2 disabled:opacity-50",
            )}
          >
            {opt}d
          </button>
        );
      })}
    </div>
  );
}
