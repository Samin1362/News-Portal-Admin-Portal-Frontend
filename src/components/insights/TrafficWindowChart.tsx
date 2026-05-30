"use client";

import { useMemo } from "react";
import type { TrafficBucket } from "@/lib/types/analytics";

interface Props {
  buckets: TrafficBucket[];
  height?: number;
}

/**
 * Variable-window area chart used by /insights/analytics. The Overview
 * version (`TrafficArea`) is hard-coded to 14 days and lives next to its
 * own data query — this one is purely presentational and accepts any
 * bucket array.
 */
export function TrafficWindowChart({ buckets, height = 220 }: Props) {
  const width = 720;
  const padding = 14;
  const innerW = width - padding * 2;
  const innerH = height - padding * 2;
  const stepX = innerW / Math.max(1, buckets.length - 1);
  const maxViews = Math.max(1, ...buckets.map((b) => b.views));

  const linePath = useMemo(() => {
    return buckets
      .map((b, i) => {
        const x = padding + i * stepX;
        const y = padding + innerH - (b.views / maxViews) * innerH;
        return `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(" ");
  }, [buckets, innerH, maxViews, padding, stepX]);

  const areaPath =
    buckets.length > 0
      ? `${linePath} L${(padding + innerW).toFixed(1)} ${padding + innerH} L${padding} ${padding + innerH} Z`
      : "";

  // Pick 4 x-axis ticks evenly across the window so the chart is readable
  // for 14- and 90-day windows alike.
  const tickIxs = pickTicks(buckets.length, 4);

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        style={{ height }}
        aria-hidden
      >
        <defs>
          <linearGradient id="trafficWindowGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.45" />
            <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((t) => (
          <line
            key={t}
            x1={padding}
            x2={width - padding}
            y1={padding + innerH * (1 - t)}
            y2={padding + innerH * (1 - t)}
            stroke="var(--color-ink)"
            strokeOpacity={0.08}
            strokeDasharray="2 4"
          />
        ))}
        {areaPath ? (
          <>
            <path d={areaPath} fill="url(#trafficWindowGradient)" />
            <path
              d={linePath}
              fill="none"
              stroke="var(--color-accent)"
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </>
        ) : null}
      </svg>
      <div className="mt-1 flex justify-between px-2 font-hand text-[10.5px] text-muted">
        {tickIxs.map((ix) => (
          <span key={ix}>{formatTickDate(buckets[ix]?.date)}</span>
        ))}
      </div>
    </div>
  );
}

function pickTicks(length: number, count: number): number[] {
  if (length <= count) return Array.from({ length }, (_, i) => i);
  const step = (length - 1) / (count - 1);
  return Array.from({ length: count }, (_, i) => Math.round(i * step));
}

function formatTickDate(d?: Date): string {
  if (!d) return "";
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}
