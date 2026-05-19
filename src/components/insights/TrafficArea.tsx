"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardHead, CardTitle, CardMeta } from "@/components/primitives/Card";
import { useAdminAuth } from "@/lib/auth/AdminAuthProvider";
import { listQueue } from "@/lib/api/articles.api";
import type { ArticleCardDTO } from "@/lib/types/article";

const DAYS = 14;
const DAY_MS = 24 * 60 * 60 * 1000;

interface DayBucket {
  date: Date;
  views: number;
  count: number;
}

function bucketArticlesByDay(articles: ArticleCardDTO[]): DayBucket[] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const buckets: DayBucket[] = [];
  for (let i = DAYS - 1; i >= 0; i--) {
    buckets.push({
      date: new Date(today.getTime() - i * DAY_MS),
      views: 0,
      count: 0,
    });
  }
  for (const article of articles) {
    if (!article.publishedAt) continue;
    const publishedDay = new Date(
      new Date(article.publishedAt).getFullYear(),
      new Date(article.publishedAt).getMonth(),
      new Date(article.publishedAt).getDate(),
    );
    const ix = Math.floor((today.getTime() - publishedDay.getTime()) / DAY_MS);
    const slot = DAYS - 1 - ix;
    if (slot < 0 || slot >= DAYS) continue;
    buckets[slot].views += article.viewCount ?? 0;
    buckets[slot].count += 1;
  }
  return buckets;
}

export function TrafficArea() {
  const { getIdToken, role } = useAdminAuth();
  const enabled = role === "admin";

  const q = useQuery({
    enabled,
    queryKey: ["overview", "traffic-14d"],
    queryFn: async () => {
      const token = await getIdToken();
      if (!token) return { items: [] as ArticleCardDTO[] };
      const result = await listQueue(
        { status: "published", page: 1, limit: 100 },
        token,
      );
      return { items: result.data ?? [] };
    },
    staleTime: 60_000,
  });

  const buckets = useMemo(
    () => bucketArticlesByDay(q.data?.items ?? []),
    [q.data?.items],
  );

  const maxViews = Math.max(1, ...buckets.map((b) => b.views));
  const width = 560;
  const height = 200;
  const padding = 12;
  const innerW = width - padding * 2;
  const innerH = height - padding * 2;
  const stepX = innerW / Math.max(1, buckets.length - 1);

  const linePath = buckets
    .map((b, i) => {
      const x = padding + i * stepX;
      const y = padding + innerH - (b.views / maxViews) * innerH;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");

  const areaPath =
    buckets.length > 0
      ? `${linePath} L${(padding + innerW).toFixed(1)} ${padding + innerH} L${padding} ${padding + innerH} Z`
      : "";

  return (
    <Card hov>
      <CardHead>
        <CardTitle>Traffic · last 14 days</CardTitle>
        <CardMeta>
          {q.isPending && enabled
            ? "Loading…"
            : q.isError
              ? "Couldn’t load"
              : `${buckets.reduce((s, b) => s + b.views, 0).toLocaleString()} views`}
        </CardMeta>
      </CardHead>
      <div className="relative">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-[220px]"
          aria-hidden
        >
          <defs>
            <linearGradient id="trafficGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.45" />
              <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0" />
            </linearGradient>
          </defs>
          {/* Horizontal grid lines */}
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
              <path d={areaPath} fill="url(#trafficGradient)" />
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
        <p className="absolute bottom-1 left-3 font-hand text-[11px] text-muted">
          Per-day view deltas — derived from cached counters
        </p>
      </div>
    </Card>
  );
}
