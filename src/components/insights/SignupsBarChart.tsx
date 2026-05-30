"use client";

import type { SignupBucket } from "@/lib/types/analytics";

interface Props {
  buckets: SignupBucket[];
  height?: number;
}

/**
 * Minimal column chart of daily signups. Single bar per day; tooltip on
 * hover shows the date + count + per-role breakdown via title attribute
 * (kept simple — no JS tooltip library to lift in).
 */
export function SignupsBarChart({ buckets, height = 200 }: Props) {
  const max = Math.max(1, ...buckets.map((b) => b.count));
  const width = 720;
  const padding = 14;
  const innerW = width - padding * 2;
  const innerH = height - padding * 2;
  const barW = innerW / buckets.length;
  const gap = Math.min(2, barW * 0.2);

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        style={{ height }}
        aria-hidden
      >
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
        {buckets.map((bucket, i) => {
          const h = (bucket.count / max) * innerH;
          const x = padding + i * barW + gap / 2;
          const y = padding + innerH - h;
          return (
            <rect
              key={i}
              x={x}
              y={y}
              width={Math.max(1, barW - gap)}
              height={h}
              fill="var(--color-accent-2)"
              opacity={bucket.count === 0 ? 0.2 : 0.85}
            >
              <title>
                {bucket.date.toLocaleDateString("en-GB", {
                  day: "2-digit",
                  month: "short",
                })}
                {" — "}
                {bucket.count} new
                {bucket.count > 0 && roleBreakdown(bucket)}
              </title>
            </rect>
          );
        })}
      </svg>
    </div>
  );
}

function roleBreakdown(bucket: SignupBucket): string {
  const parts: string[] = [];
  for (const [role, count] of Object.entries(bucket.byRole)) {
    if (count > 0) parts.push(`${count} ${role}`);
  }
  return parts.length > 0 ? ` (${parts.join(", ")})` : "";
}
