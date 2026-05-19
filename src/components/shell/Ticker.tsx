import { cn } from "@/lib/utils/cn";

export interface TickerItem {
  label: string;
  value: string;
}

interface Props {
  items: TickerItem[];
  className?: string;
}

/**
 * Sticky strip below the topbar. Infinite-scroll marquee — children are
 * duplicated so the animation can translate -50% without seams.
 */
export function Ticker({ items, className }: Props) {
  if (items.length === 0) return null;
  const doubled = [...items, ...items];
  return (
    <div
      className={cn(
        "border-b-[1.5px] border-ink/40 bg-paper-2 overflow-hidden",
        className,
      )}
    >
      <div className="ticker-track py-1.5 font-hand text-[12px] text-ink/80">
        {doubled.map((item, i) => (
          <span key={i} className="inline-flex items-center gap-1.5">
            <span className="uppercase tracking-wider text-muted">{item.label}</span>
            <span className="font-semibold">{item.value}</span>
            <span aria-hidden className="text-ink/30 px-2">·</span>
          </span>
        ))}
      </div>
    </div>
  );
}
