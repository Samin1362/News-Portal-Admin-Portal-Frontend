import { cn } from "@/lib/utils/cn";

interface Props {
  /** Sequence of y-values, normalised to a 0..1 range. */
  points: number[];
  width?: number;
  height?: number;
  className?: string;
  /** Stroke colour — defaults to accent red. */
  stroke?: string;
}

/**
 * Tiny SVG sparkline anchored top-right. The dashIn animation draws the
 * line in on mount.
 */
export function Spark({
  points,
  width = 88,
  height = 28,
  className,
  stroke = "var(--color-accent)",
}: Props) {
  if (points.length === 0) return null;

  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const stepX = points.length > 1 ? width / (points.length - 1) : 0;

  const path = points
    .map((p, i) => {
      const x = i * stepX;
      const y = height - ((p - min) / span) * height;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");

  // Approximate total length for stroke-dasharray; doesn't need to be exact.
  const approxLen = points.length * stepX;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={cn("overflow-visible", className)}
      aria-hidden
    >
      <path
        d={path}
        fill="none"
        stroke={stroke}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
          strokeDasharray: approxLen,
          strokeDashoffset: approxLen,
          animation: "dashIn 1.2s ease-out forwards",
        }}
      />
    </svg>
  );
}
