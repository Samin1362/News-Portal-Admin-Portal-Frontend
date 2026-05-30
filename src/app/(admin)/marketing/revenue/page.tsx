"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Info } from "lucide-react";
import {
  Card,
  CardHead,
  CardMeta,
  CardTitle,
} from "@/components/primitives/Card";
import { Pill } from "@/components/primitives/Pill";
import { SectionTitle } from "@/components/primitives/SectionTitle";
import { useAdminAuth } from "@/lib/auth/AdminAuthProvider";
import {
  formatCtr,
  loadAllAds,
  rollupAds,
  type AdLeader,
} from "@/lib/api/adAggregate";
import { AD_PLACEMENT_LABEL } from "@/lib/types/ad";
import { compactCount } from "@/lib/utils/format";

export default function RevenuePage() {
  const { getIdToken, role } = useAdminAuth();
  const enabled = role === "admin";

  const q = useQuery({
    enabled,
    queryKey: ["marketing", "revenue"],
    queryFn: async () => {
      const token = await getIdToken();
      if (!token) throw new Error("Not signed in.");
      return loadAllAds(token);
    },
    staleTime: 60_000,
  });

  const rollup = useMemo(() => rollupAds(q.data ?? []), [q.data]);

  return (
    <>
      <section className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="font-hand text-[12px] uppercase tracking-wider text-muted">
            Marketing / Revenue
          </p>
          <SectionTitle className="mt-1">Revenue &amp; performance</SectionTitle>
          <p className="mt-2 font-hand text-[12px] text-muted">
            Read-only roll-up of ad performance. Aggregated from{" "}
            <Link href="/marketing/ads" className="hover:text-accent underline">
              all ads
            </Link>{" "}
            — backend has no billing endpoint, so financial reporting is
            intentionally absent.
          </p>
        </div>
      </section>

      <Card accentRail>
        <div className="flex items-start gap-2.5">
          <Info size={16} aria-hidden className="mt-0.5 shrink-0 text-accent" />
          <p className="font-sans text-[13px]">
            Monetization tracking is read-only — billing and invoicing are
            handled outside this portal. Numbers below reflect{" "}
            <span className="font-semibold">lifetime</span> impressions and
            clicks tracked by the public ad-serving endpoint.
          </p>
        </div>
      </Card>

      <section className="grid gap-3 sm:grid-cols-4">
        <SummaryTile
          label="Total impressions"
          value={compactCount(rollup.totalImpressions)}
          meta="lifetime"
        />
        <SummaryTile
          label="Total clicks"
          value={compactCount(rollup.totalClicks)}
          meta="lifetime"
        />
        <SummaryTile
          label="Average CTR"
          value={formatCtr(rollup.averageCtr)}
          meta="weighted by impressions"
        />
        <SummaryTile
          label="Active ads"
          value={`${rollup.activeCount}`}
          meta={`${rollup.inactiveCount} paused`}
        />
      </section>

      <section className="grid gap-3 md:grid-cols-2">
        <Card hov>
          <CardHead>
            <CardTitle>Top 5 by clicks</CardTitle>
            <CardMeta>highest absolute clicks</CardMeta>
          </CardHead>
          {q.isPending && enabled ? (
            <ListSkeleton />
          ) : rollup.topByClicks.length === 0 ? (
            <p className="font-hand text-[12px] text-muted py-6 text-center">
              No ads have recorded clicks yet.
            </p>
          ) : (
            <LeaderTable rows={rollup.topByClicks} metric="clicks" />
          )}
        </Card>

        <Card hov>
          <CardHead>
            <CardTitle>Top 5 by CTR</CardTitle>
            <CardMeta>ads with at least 1 impression</CardMeta>
          </CardHead>
          {q.isPending && enabled ? (
            <ListSkeleton />
          ) : rollup.topByCtr.length === 0 ? (
            <p className="font-hand text-[12px] text-muted py-6 text-center">
              No ads have recorded impressions yet.
            </p>
          ) : (
            <LeaderTable rows={rollup.topByCtr} metric="ctr" />
          )}
        </Card>
      </section>

      {q.isError ? (
        <Card>
          <p className="font-hand text-[12px] text-accent">
            Couldn’t load ads — {q.error?.message ?? "unknown error"}.
          </p>
        </Card>
      ) : null}
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
      <p className="serif text-[28px] font-extrabold tracking-tight leading-none mt-1">
        {value}
      </p>
      <p className="font-hand text-[11px] text-muted mt-1">{meta}</p>
    </Card>
  );
}

function LeaderTable({
  rows,
  metric,
}: {
  rows: AdLeader[];
  metric: "clicks" | "ctr";
}) {
  return (
    <ol className="space-y-1.5">
      {rows.map((row, ix) => (
        <li
          key={row.id}
          className="grid grid-cols-[24px_minmax(0,1fr)_auto] items-center gap-2 px-2 py-1.5 rounded-sm hover:bg-paper-2"
        >
          <span className="serif text-[15px] font-extrabold tabular-nums text-muted">
            {ix + 1}
          </span>
          <div className="min-w-0">
            <Link
              href={`/marketing/ads/${row.id}`}
              className="font-sans text-[13px] truncate hover:text-accent"
            >
              {row.name}
            </Link>
            <div className="mt-0.5">
              <Pill tone="muted">{AD_PLACEMENT_LABEL[row.placement]}</Pill>
            </div>
          </div>
          <div className="text-right">
            <p className="font-sans text-[13px] tabular-nums font-semibold">
              {metric === "ctr"
                ? formatCtr(row.ctr)
                : compactCount(row.clicks)}
            </p>
            <p className="font-hand text-[10.5px] text-muted">
              {metric === "ctr"
                ? `${compactCount(row.clicks)} / ${compactCount(row.impressions)}`
                : `${compactCount(row.impressions)} impressions`}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}

function ListSkeleton() {
  return (
    <ul className="space-y-1.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <li
          key={i}
          className="h-10 bg-paper-2 rounded-sm animate-pulse"
          aria-hidden
        />
      ))}
    </ul>
  );
}
