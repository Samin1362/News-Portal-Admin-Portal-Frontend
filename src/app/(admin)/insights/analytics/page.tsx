"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardHead,
  CardMeta,
  CardTitle,
} from "@/components/primitives/Card";
import { SectionTitle } from "@/components/primitives/SectionTitle";
import { WindowSwitch } from "@/components/insights/WindowSwitch";
import { TrafficWindowChart } from "@/components/insights/TrafficWindowChart";
import { SignupsBarChart } from "@/components/insights/SignupsBarChart";
import { TopArticlesList } from "@/components/insights/TopArticlesList";
import { useAdminAuth } from "@/lib/auth/AdminAuthProvider";
import {
  bucketSignupsByDay,
  bucketTrafficByDay,
  loadAnalyticsSnapshot,
  topArticlesByMetric,
} from "@/lib/api/analytics.api";
import type { AnalyticsWindow } from "@/lib/types/analytics";
import { compactCount } from "@/lib/utils/format";

export default function AnalyticsPage() {
  const { getIdToken, role } = useAdminAuth();
  const enabled = role === "admin";

  const [windowDays, setWindowDays] = useState<AnalyticsWindow>(14);

  const q = useQuery({
    enabled,
    queryKey: ["insights", "analytics", windowDays],
    queryFn: async () => {
      const token = await getIdToken();
      if (!token) throw new Error("Not signed in.");
      return loadAnalyticsSnapshot(windowDays, token);
    },
    staleTime: 60_000,
  });

  const trafficBuckets = useMemo(
    () => bucketTrafficByDay(q.data?.articles ?? [], windowDays),
    [q.data?.articles, windowDays],
  );
  const signupBuckets = useMemo(
    () => bucketSignupsByDay(q.data?.recentUsers ?? [], windowDays),
    [q.data?.recentUsers, windowDays],
  );
  const topByViews = useMemo(
    () => topArticlesByMetric(q.data?.articles ?? [], "viewCount", windowDays),
    [q.data?.articles, windowDays],
  );
  const topByComments = useMemo(
    () =>
      topArticlesByMetric(q.data?.articles ?? [], "commentCount", windowDays),
    [q.data?.articles, windowDays],
  );

  const totalViews = trafficBuckets.reduce((s, b) => s + b.views, 0);
  const totalSignups = signupBuckets.reduce((s, b) => s + b.count, 0);
  const totalPublished = trafficBuckets.reduce(
    (s, b) => s + b.publishedCount,
    0,
  );

  return (
    <>
      <section className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="font-hand text-[12px] uppercase tracking-wider text-muted">
            Insights / Analytics
          </p>
          <SectionTitle className="mt-1">Analytics</SectionTitle>
          <p className="mt-2 font-hand text-[12px] text-muted">
            Aggregated client-side from cached counters. A dedicated{" "}
            <code>/admin/analytics</code> endpoint would replace this — see
            Known Backend Gaps.
          </p>
        </div>
        <WindowSwitch
          value={windowDays}
          onChange={setWindowDays}
          disabled={q.isFetching}
        />
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <SummaryTile
          label="Total views"
          value={compactCount(totalViews)}
          meta="from articles published in window"
        />
        <SummaryTile
          label="New sign-ups"
          value={totalSignups.toString()}
          meta={`across last ${windowDays}d (200 most recent users)`}
        />
        <SummaryTile
          label="Articles published"
          value={totalPublished.toString()}
          meta="counted in the chosen window"
        />
      </section>

      <Card hov>
        <CardHead>
          <CardTitle>Traffic · last {windowDays} days</CardTitle>
          <CardMeta>
            {q.isPending && enabled
              ? "Loading…"
              : q.isError
                ? "Couldn’t load"
                : `${totalViews.toLocaleString()} views across window`}
          </CardMeta>
        </CardHead>
        {q.isError ? (
          <p className="font-hand text-[12px] text-accent">
            {q.error?.message ?? "Failed to load."}
          </p>
        ) : (
          <TrafficWindowChart buckets={trafficBuckets} />
        )}
      </Card>

      <section className="grid gap-3 md:grid-cols-2">
        <Card hov>
          <CardHead>
            <CardTitle>Top 10 by views</CardTitle>
            <CardMeta>published in window</CardMeta>
          </CardHead>
          {q.isPending && enabled ? (
            <ListSkeleton />
          ) : (
            <TopArticlesList rows={topByViews} metric="viewCount" />
          )}
        </Card>

        <Card hov>
          <CardHead>
            <CardTitle>Top 10 by comments</CardTitle>
            <CardMeta>published in window</CardMeta>
          </CardHead>
          {q.isPending && enabled ? (
            <ListSkeleton />
          ) : (
            <TopArticlesList rows={topByComments} metric="commentCount" />
          )}
        </Card>
      </section>

      <Card hov>
        <CardHead>
          <CardTitle>New sign-ups · per day</CardTitle>
          <CardMeta>
            {q.isPending && enabled
              ? "Loading…"
              : `${totalSignups} new readers in window · hover bars for breakdown`}
          </CardMeta>
        </CardHead>
        {q.isError ? (
          <p className="font-hand text-[12px] text-accent">
            {q.error?.message ?? "Failed to load."}
          </p>
        ) : (
          <SignupsBarChart buckets={signupBuckets} />
        )}
      </Card>
    </>
  );
}

function SummaryTile({
  label,
  value,
  meta,
}: {
  label: string;
  value: string;
  meta: string;
}) {
  return (
    <Card>
      <p className="font-hand text-[11px] uppercase tracking-wider text-muted">
        {label}
      </p>
      <p className="serif text-[32px] font-extrabold tracking-tight leading-none mt-1">
        {value}
      </p>
      <p className="font-hand text-[11px] text-muted mt-1">{meta}</p>
    </Card>
  );
}

function ListSkeleton() {
  return (
    <ul className="space-y-1.5">
      {Array.from({ length: 6 }).map((_, i) => (
        <li
          key={i}
          className="h-9 bg-paper-2 rounded-sm animate-pulse"
          aria-hidden
        />
      ))}
    </ul>
  );
}
