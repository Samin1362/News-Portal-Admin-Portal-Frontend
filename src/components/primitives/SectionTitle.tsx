import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

interface Props {
  children: ReactNode;
  className?: string;
}

/** Heading with the skewed editorial-red underline accent. */
export function SectionTitle({ children, className }: Props) {
  return (
    <h2
      className={cn(
        "serif uline text-[22px] sm:text-[26px] font-extrabold tracking-tight leading-none",
        className,
      )}
    >
      {children}
    </h2>
  );
}
