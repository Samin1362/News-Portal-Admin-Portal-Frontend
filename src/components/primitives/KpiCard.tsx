import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

interface Props {
  label: string;
  value: ReactNode;
  meta?: ReactNode;
  /** Adds the 3px accent-red left rail. */
  accent?: boolean;
  /** Right-aligned content — typically a Spark. */
  spark?: ReactNode;
  className?: string;
}

export function KpiCard({ label, value, meta, accent, spark, className }: Props) {
  return (
    <section
      className={cn(
        "relative bg-paper border-[1.5px] border-ink rounded-sm p-4 card-hov overflow-hidden",
        accent && "border-l-[3px] border-l-accent",
        className,
      )}
    >
      <span className="font-hand text-[11px] uppercase tracking-wider text-muted block">
        {label}
      </span>
      <div className="mt-1 flex items-end justify-between gap-2">
        <span className="serif text-[34px] font-extrabold leading-none tracking-tight">
          {value}
        </span>
        {spark ? <div className="shrink-0">{spark}</div> : null}
      </div>
      {meta ? (
        <div className="mt-2 font-hand text-[11px] text-muted">{meta}</div>
      ) : null}
    </section>
  );
}
