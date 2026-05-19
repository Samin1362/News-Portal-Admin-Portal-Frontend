import { cn } from "@/lib/utils/cn";
import type { ReactNode } from "react";

type Tone = "ink" | "accent" | "accent-2" | "warn" | "info" | "muted";

const TONE_CLASS: Record<Tone, string> = {
  ink: "bg-ink text-paper border-ink",
  accent: "bg-paper text-accent border-accent",
  "accent-2": "bg-paper text-accent-2 border-accent-2",
  warn: "bg-paper text-[color:var(--color-warn)] border-[color:var(--color-warn)]",
  info: "bg-paper text-[color:var(--color-info)] border-[color:var(--color-info)]",
  muted: "bg-paper-2 text-muted border-muted/50",
};

interface Props {
  children: ReactNode;
  tone?: Tone;
  className?: string;
  /** Adds the pulsing live dot suffix. */
  live?: boolean;
}

export function Pill({ children, tone = "ink", className, live }: Props) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 border-[1.5px] rounded-full",
        "font-hand text-[11px] uppercase tracking-wider",
        TONE_CLASS[tone],
        live && "live-dot",
        className,
      )}
    >
      {children}
    </span>
  );
}
