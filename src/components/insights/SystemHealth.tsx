"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardHead, CardTitle, CardMeta } from "@/components/primitives/Card";
import { getHealth } from "@/lib/api/health.api";
import { cn } from "@/lib/utils/cn";

interface HealthBar {
  label: string;
  value: number | null; // 0..1, or null when unknown
  display: string;
  tooltip?: string;
}

export function SystemHealth() {
  const q = useQuery({
    queryKey: ["overview", "health"],
    queryFn: getHealth,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const isOk = q.data?.status === "ok";

  const bars: HealthBar[] = [
    {
      label: "API uptime",
      value: isOk ? 1 : q.data?.status === "degraded" ? 0.6 : 0,
      display: q.data ? q.data.status : q.isPending ? "checking…" : "unknown",
    },
    {
      label: "Error rate",
      value: isOk ? 0.02 : 0.3,
      display: isOk ? "low" : "elevated",
    },
    {
      label: "CDN cache hit",
      value: null,
      display: "—",
      tooltip: "metric not exported",
    },
    {
      label: "DB query p95",
      value: null,
      display: "—",
      tooltip: "metric not exported",
    },
    {
      label: "Storage used",
      value: null,
      display: "—",
      tooltip: "metric not exported",
    },
    {
      label: "Queue backlog",
      value: null,
      display: "—",
      tooltip: "metric not exported",
    },
  ];

  return (
    <Card hov>
      <CardHead>
        <CardTitle>System health</CardTitle>
        <CardMeta>
          {q.isError ? "offline" : q.data?.status ?? "checking…"}
        </CardMeta>
      </CardHead>
      <ul className="space-y-2.5">
        {bars.map((bar) => (
          <li
            key={bar.label}
            className="grid grid-cols-[minmax(80px,130px)_minmax(0,1fr)_70px] items-center gap-2"
          >
            <span className="font-sans text-[12.5px] truncate">{bar.label}</span>
            <div className="h-2 bg-paper-2 rounded-full overflow-hidden">
              {bar.value === null ? (
                <div className="h-full w-full bg-[repeating-linear-gradient(45deg,var(--color-paper-2)_0_6px,var(--color-ink)/0.06_6px_12px)]" />
              ) : (
                <div
                  className={cn(
                    "h-full",
                    bar.label === "Error rate"
                      ? bar.value > 0.1
                        ? "bg-accent"
                        : "bg-accent-2"
                      : bar.value > 0.5
                        ? "bg-accent-2"
                        : "bg-[color:var(--color-warn)]",
                  )}
                  style={{ width: `${Math.max(4, Math.round(bar.value * 100))}%` }}
                />
              )}
            </div>
            <span
              className="font-hand text-[11px] text-muted text-right"
              title={bar.tooltip}
            >
              {bar.display}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
