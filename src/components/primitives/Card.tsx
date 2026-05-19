import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

interface CardProps {
  children: ReactNode;
  className?: string;
  /** Adds the hover-lift animation (translateY + hard shadow). */
  hov?: boolean;
  /** Adds a 3px accent-red left rail; useful for KPI / featured cards. */
  accentRail?: boolean;
}

export function Card({ children, className, hov, accentRail }: CardProps) {
  return (
    <section
      className={cn(
        "relative bg-paper border-[1.5px] border-ink rounded-sm p-4",
        hov && "card-hov",
        accentRail && "border-l-[3px] border-l-accent",
        className,
      )}
    >
      {children}
    </section>
  );
}

interface CardHeadProps {
  children: ReactNode;
  className?: string;
}

export function CardHead({ children, className }: CardHeadProps) {
  return (
    <header
      className={cn(
        "flex items-center justify-between gap-3 mb-3",
        className,
      )}
    >
      {children}
    </header>
  );
}

export function CardTitle({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <h2
      className={cn(
        "serif text-[16px] font-extrabold tracking-tight uline pr-2",
        className,
      )}
    >
      {children}
    </h2>
  );
}

export function CardMeta({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn("font-hand text-[11px] text-muted", className)}
    >
      {children}
    </span>
  );
}
