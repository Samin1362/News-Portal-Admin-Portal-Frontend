"use client";

import {
  AD_PLACEMENTS,
  AD_PLACEMENT_DIMENSIONS,
  AD_PLACEMENT_LABEL,
  type AdPlacement,
} from "@/lib/types/ad";
import { cn } from "@/lib/utils/cn";

interface Props {
  value: AdPlacement;
  onChange: (next: AdPlacement) => void;
  disabled?: boolean;
}

export function PlacementSelect({ value, onChange, disabled }: Props) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {AD_PLACEMENTS.map((p) => {
        const active = p === value;
        const dims = AD_PLACEMENT_DIMENSIONS[p];
        return (
          <button
            key={p}
            type="button"
            disabled={disabled}
            onClick={() => onChange(p)}
            aria-pressed={active}
            className={cn(
              "text-left px-3 py-2 rounded-md border-[1.5px] transition-colors",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              active
                ? "border-accent bg-accent/5"
                : "border-ink/40 bg-paper hover:border-ink",
            )}
          >
            <p
              className={cn(
                "font-sans text-[12.5px] font-semibold",
                active ? "text-accent" : "text-ink",
              )}
            >
              {AD_PLACEMENT_LABEL[p]}
            </p>
            <p className="font-hand text-[11px] text-muted">{dims.label}</p>
          </button>
        );
      })}
    </div>
  );
}
