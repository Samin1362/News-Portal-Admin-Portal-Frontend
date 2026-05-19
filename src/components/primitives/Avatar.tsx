import { cn } from "@/lib/utils/cn";

type Size = "xs" | "sm" | "md" | "lg";
type Tone = "ink" | "accent" | "accent-2" | "warm" | "info";

const SIZE: Record<Size, string> = {
  xs: "w-6 h-6 text-[10px]",
  sm: "w-8 h-8 text-[11px]",
  md: "w-10 h-10 text-[13px]",
  lg: "w-14 h-14 text-[16px]",
};

const TONE: Record<Tone, string> = {
  ink: "bg-ink text-paper",
  accent: "bg-accent text-paper",
  "accent-2": "bg-accent-2 text-paper",
  warm: "bg-[color:var(--color-warn)] text-ink",
  info: "bg-[color:var(--color-info)] text-paper",
};

interface Props {
  name?: string;
  src?: string | null;
  size?: Size;
  tone?: Tone;
  className?: string;
}

function initials(name?: string): string {
  if (!name) return "·";
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "·";
}

export function Avatar({ name, src, size = "md", tone = "ink", className }: Props) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full border-[1.5px] border-ink shrink-0 overflow-hidden font-sans font-semibold uppercase",
        SIZE[size],
        !src && TONE[tone],
        className,
      )}
      aria-hidden={src ? undefined : true}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={name ?? ""} className="w-full h-full object-cover" />
      ) : (
        initials(name)
      )}
    </span>
  );
}
