"use client";

import { useQuery } from "@tanstack/react-query";
import { KpiCard } from "@/components/primitives/KpiCard";
import { Spark } from "@/components/primitives/Spark";
import { useAdminAuth } from "@/lib/auth/AdminAuthProvider";
import { useCountUp } from "@/hooks/useCountUp";
import { listUsers } from "@/lib/api/users.api";
import { listQueue } from "@/lib/api/articles.api";
import { listAdminComments } from "@/lib/api/comments.api";
import type { ArticleCardDTO } from "@/lib/types/article";

const SAMPLE_A = [4, 6, 5, 8, 6, 9, 7, 10, 12, 9, 11, 13];
const SAMPLE_B = [3, 4, 6, 5, 7, 9, 8, 11, 9, 12, 10, 14];
const SAMPLE_C = [2, 3, 2, 4, 3, 5, 4, 5, 6, 4, 5, 6];
const SAMPLE_D = [1, 2, 1, 3, 2, 4, 2, 3, 4, 3, 4, 5];

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export function KpiGrid() {
  const { getIdToken, role } = useAdminAuth();
  const enabled = role === "admin";

  const usersQ = useQuery({
    enabled,
    queryKey: ["kpi", "users-total"],
    queryFn: async () => {
      const token = await getIdToken();
      if (!token) return 0;
      const result = await listUsers({ limit: 1 }, token);
      return result.meta?.total ?? 0;
    },
    staleTime: 30_000,
  });

  // For "articles this week" we fetch a single page of recently-published
  // and count locally. Cheap until the backend exposes a date-window endpoint.
  const articlesQ = useQuery({
    enabled,
    queryKey: ["kpi", "articles-this-week"],
    queryFn: async () => {
      const token = await getIdToken();
      if (!token) return { total: 0, recent: 0 };
      const result = await listQueue(
        { status: "published", page: 1, limit: 50 },
        token,
      );
      const cutoff = Date.now() - WEEK_MS;
      const recent = (result.data ?? []).filter(
        (a: ArticleCardDTO) => a.publishedAt && Date.parse(a.publishedAt) >= cutoff,
      ).length;
      return { total: result.meta?.total ?? 0, recent };
    },
    staleTime: 30_000,
  });

  const pendingCommentsQ = useQuery({
    enabled,
    queryKey: ["kpi", "comments-pending"],
    queryFn: async () => {
      const token = await getIdToken();
      if (!token) return 0;
      const result = await listAdminComments(
        { status: "pending", limit: 1 },
        token,
      );
      return result.meta?.total ?? 0;
    },
    staleTime: 30_000,
  });

  return (
    <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <KpiSlot
        accent
        label="Total users"
        target={usersQ.data ?? 0}
        loading={usersQ.isPending && enabled}
        error={usersQ.isError ? "load failed" : null}
        meta={
          usersQ.data === undefined
            ? "Fetching…"
            : `Across all roles · last 30d in Phase 8`
        }
        spark={<Spark points={SAMPLE_A} />}
      />
      <KpiSlot
        label="Articles · this week"
        target={articlesQ.data?.recent ?? 0}
        loading={articlesQ.isPending && enabled}
        error={articlesQ.isError ? "load failed" : null}
        meta={
          articlesQ.data
            ? `${articlesQ.data.total} published all-time`
            : "Fetching…"
        }
        spark={<Spark points={SAMPLE_B} />}
      />
      <KpiSlot
        label="Pending moderation"
        target={pendingCommentsQ.data ?? 0}
        loading={pendingCommentsQ.isPending && enabled}
        error={pendingCommentsQ.isError ? "load failed" : null}
        meta="Comments awaiting review"
        spark={<Spark points={SAMPLE_C} />}
      />
      <KpiSlot
        label="Role requests"
        target={0}
        loading={false}
        error={null}
        meta="Activates after §0a backend lands"
        spark={<Spark points={SAMPLE_D} />}
      />
    </section>
  );
}

function KpiSlot({
  label,
  target,
  meta,
  spark,
  accent,
  loading,
  error,
}: {
  label: string;
  target: number;
  meta: string;
  spark?: React.ReactNode;
  accent?: boolean;
  loading: boolean;
  error: string | null;
}) {
  const display = useCountUp(target);
  return (
    <KpiCard
      accent={accent}
      label={label}
      value={loading ? "…" : error ? "—" : display.toLocaleString()}
      meta={error ? <span className="text-accent">Couldn&apos;t load.</span> : meta}
      spark={spark}
    />
  );
}
