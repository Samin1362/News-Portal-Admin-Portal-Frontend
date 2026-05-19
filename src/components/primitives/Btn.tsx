import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

type Variant = "default" | "primary" | "ghost" | "solid";
type Size = "sm" | "md";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
}

const VARIANT: Record<Variant, string> = {
  default: "bg-paper text-ink border-ink hover:bg-paper-2",
  primary: "bg-accent text-paper border-accent hover:bg-ink hover:border-ink",
  ghost: "bg-transparent text-ink border-transparent hover:bg-paper-2",
  solid: "bg-ink text-paper border-ink hover:bg-accent hover:border-accent",
};

const SIZE: Record<Size, string> = {
  sm: "px-2.5 py-1 text-[12px]",
  md: "px-3.5 py-1.5 text-[13px]",
};

export const Btn = forwardRef<HTMLButtonElement, Props>(function Btn(
  { variant = "default", size = "md", className, children, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 border-[1.5px] rounded-md",
        "font-sans font-semibold whitespace-nowrap transition-colors",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/30",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        VARIANT[variant],
        SIZE[size],
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
});
