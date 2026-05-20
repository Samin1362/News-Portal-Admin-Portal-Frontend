"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardHead, CardTitle, CardMeta } from "@/components/primitives/Card";
import { useAdminAuth } from "@/lib/auth/AdminAuthProvider";
import { listCategories } from "@/lib/api/categories.api";
import { listQueue } from "@/lib/api/articles.api";

interface BarRow {
  id: string;
  label: string;
  total: number;
}

export function ByCategoryBars() {
  const { getIdToken, role } = useAdminAuth();
  const enabled = role === "admin";

  const cats = useQuery({
    enabled,
    queryKey: ["overview", "categories"],
    queryFn: async () => {
      const token = await getIdToken();
      return listCategories({}, token ?? undefined);
    },
    staleTime: 60_000,
  });

  // Pull a single page of published articles and aggregate by category
  // client-side. Avoids the N-call fanout the plan originally sketched
  // and gives identical ordering against the real homepage data.
  const articles = useQuery({
    enabled,
    queryKey: ["overview", "by-category-articles"],
    queryFn: async () => {
      const token = await getIdToken();
      if (!token) return [];
      const result = await listQueue(
        { status: "published", page: 1, limit: 100 },
        token,
      );
      return result.data ?? [];
    },
    staleTime: 60_000,
  });

  const rows = useMemo<BarRow[]>(() => {
    if (!cats.data) return [];
    const counts = new Map<string, number>();
    for (const a of articles.data ?? []) {
      counts.set(a.categoryId, (counts.get(a.categoryId) ?? 0) + 1);
    }
    return cats.data
      .map((c) => ({ id: c.id, label: c.name, total: counts.get(c.id) ?? 0 }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);
  }, [cats.data, articles.data]);

  const max = Math.max(1, ...rows.map((r) => r.total));
  const loading = (cats.isPending || articles.isPending) && enabled;

  return (
    <Card hov>
      <CardHead>
        <CardTitle>By category</CardTitle>
        <CardMeta>{loading ? "Loading…" : `${rows.length} categories`}</CardMeta>
      </CardHead>
      {loading ? (
        <div className="h-[220px] grid place-items-center">
          <span className="font-hand text-[12px] text-muted">Fetching…</span>
        </div>
      ) : rows.length === 0 ? (
        <div className="h-[220px] grid place-items-center">
          <span className="font-hand text-[12px] text-muted">
            No published articles yet.
          </span>
        </div>
      ) : (
        <ul className="space-y-2">
          {rows.map((row) => (
            <li
              key={row.id}
              className="grid grid-cols-[minmax(60px,140px)_minmax(0,1fr)_36px] items-center gap-2"
            >
              <span className="font-sans text-[12.5px] truncate">{row.label}</span>
              <div className="h-2 bg-paper-2 rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent"
                  style={{ width: `${(row.total / max) * 100}%` }}
                />
              </div>
              <span className="font-hand text-[11px] text-muted text-right">
                {row.total}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
