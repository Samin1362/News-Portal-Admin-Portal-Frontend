"use client";

import { Suspense, useCallback, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import {
  Card,
  CardHead,
  CardMeta,
  CardTitle,
} from "@/components/primitives/Card";
import { Btn } from "@/components/primitives/Btn";
import { Pill } from "@/components/primitives/Pill";
import { useAdminAuth } from "@/lib/auth/AdminAuthProvider";
import { useToast } from "@/lib/ui/toast";
import { listAds, updateAd } from "@/lib/api/ads.api";
import {
  AD_PLACEMENTS,
  AD_PLACEMENT_LABEL,
  type AdPlacement,
  type AdminAdDTO,
} from "@/lib/types/ad";
import type { ApiResult } from "@/lib/types/api";
import { cn } from "@/lib/utils/cn";
import { formatShortDate } from "@/lib/utils/format";

type ActiveFilter = "all" | "active" | "inactive";

interface FilterDef {
  key: string;
  label: string;
  active?: ActiveFilter;
  placement?: AdPlacement;
}

const FILTERS: FilterDef[] = [
  { key: "all", label: "All", active: "all" },
  { key: "active", label: "Active", active: "active" },
  { key: "inactive", label: "Inactive", active: "inactive" },
  ...AD_PLACEMENTS.map<FilterDef>((p) => ({
    key: p,
    label: AD_PLACEMENT_LABEL[p],
    placement: p,
  })),
];

const PAGE_LIMIT = 20;

export default function AdsPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <AdsInner />
    </Suspense>
  );
}

function AdsInner() {
  const router = useRouter();
  const params = useSearchParams();
  const { getIdToken, role } = useAdminAuth();
  const toast = useToast();
  const qc = useQueryClient();
  const enabled = role === "admin";

  const filterKey = params.get("filter") ?? "all";
  const page = Number.parseInt(params.get("page") ?? "1", 10) || 1;
  const filter = FILTERS.find((f) => f.key === filterKey) ?? FILTERS[0];

  const queryKey = useMemo(
    () => ["ads", { filter: filter.key, page }] as const,
    [filter.key, page],
  );

  const listQ = useQuery({
    enabled,
    queryKey,
    queryFn: async () => {
      const token = await getIdToken();
      if (!token)
        return {
          data: [] as AdminAdDTO[],
          meta: undefined,
        } satisfies ApiResult<AdminAdDTO[]>;
      return listAds(
        {
          placement: filter.placement,
          isActive:
            filter.active === "active"
              ? true
              : filter.active === "inactive"
                ? false
                : undefined,
          page,
          limit: PAGE_LIMIT,
        },
        token,
      );
    },
    staleTime: 30_000,
  });

  const items = useMemo(() => listQ.data?.data ?? [], [listQ.data?.data]);
  const total = listQ.data?.meta?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT));

  const setQueryParam = useCallback(
    (key: string, value: string | null) => {
      const next = new URLSearchParams(params.toString());
      if (value === null || value === "") next.delete(key);
      else next.set(key, value);
      if (key !== "page") next.delete("page");
      router.replace(`/marketing/ads?${next.toString()}`);
    },
    [params, router],
  );

  const toggleMut = useMutation({
    mutationFn: async (input: { id: string; isActive: boolean }) => {
      const token = await getIdToken();
      if (!token) throw new Error("Not signed in.");
      return updateAd(input.id, { isActive: input.isActive }, token);
    },
  });

  const patchInCache = useCallback(
    (id: string, patch: Partial<AdminAdDTO>) => {
      qc.setQueryData<ApiResult<AdminAdDTO[]>>(queryKey, (prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          data: prev.data.map((a) => (a.id === id ? { ...a, ...patch } : a)),
        };
      });
    },
    [qc, queryKey],
  );

  const handleToggleActive = useCallback(
    async (ad: AdminAdDTO, next: boolean) => {
      // Optimistic update.
      patchInCache(ad.id, { isActive: next });
      try {
        const updated = await toggleMut.mutateAsync({
          id: ad.id,
          isActive: next,
        });
        patchInCache(updated.id, updated);
        qc.invalidateQueries({ queryKey: ["ads"] });
      } catch (err) {
        patchInCache(ad.id, { isActive: !next });
        toast.error(err instanceof Error ? err.message : "Toggle failed.");
      }
    },
    [patchInCache, toggleMut, toast, qc],
  );

  return (
    <>
      <section className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="font-hand text-[12px] uppercase tracking-wider text-muted">
            Marketing
          </p>
          <h1 className="serif text-[28px] sm:text-[34px] font-extrabold tracking-tight leading-none mt-1">
            <span className="uline">Advertisements</span>
          </h1>
          <p className="mt-2 font-hand text-[12px] text-muted">
            {listQ.isPending
              ? "Loading…"
              : `${total.toLocaleString()} total · page ${page} of ${totalPages}`}
          </p>
        </div>
        <Link href="/marketing/ads/new">
          <Btn variant="solid">
            <Plus size={14} aria-hidden />
            New ad
          </Btn>
        </Link>
      </section>

      <Card>
        <CardHead>
          <CardTitle>{filter.label}</CardTitle>
          <CardMeta>
            Active toggle updates inline. Click a row to edit + view stats.
          </CardMeta>
        </CardHead>

        <div className="flex flex-wrap items-center gap-2 mb-4">
          {FILTERS.map((f) => {
            const active = f.key === filter.key;
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => setQueryParam("filter", f.key === "all" ? null : f.key)}
                className={cn(
                  "px-3 py-1.5 rounded-md border-[1.5px] font-sans text-[12px] transition-colors",
                  active
                    ? "bg-ink text-paper border-ink"
                    : "bg-paper text-ink border-ink hover:bg-paper-2",
                )}
                aria-pressed={active}
              >
                {f.label}
              </button>
            );
          })}
        </div>

        {listQ.isPending ? (
          <ul className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <li
                key={i}
                className="h-14 bg-paper-2 rounded-sm animate-pulse"
                aria-hidden
              />
            ))}
          </ul>
        ) : listQ.isError ? (
          <p className="font-hand text-[12px] text-accent">
            Couldn&apos;t load ads — {listQ.error?.message ?? "try again"}.
          </p>
        ) : items.length === 0 ? (
          <EmptyState />
        ) : (
          <ul className="divide-y divide-ink/10">
            {items.map((ad) => (
              <AdRow
                key={ad.id}
                ad={ad}
                busy={toggleMut.isPending}
                onToggleActive={(next) => handleToggleActive(ad, next)}
              />
            ))}
          </ul>
        )}

        {totalPages > 1 ? (
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-ink/10">
            <span className="font-hand text-[11px] text-muted">
              {`Showing ${(page - 1) * PAGE_LIMIT + 1}–${Math.min(page * PAGE_LIMIT, total)} of ${total}`}
            </span>
            <div className="flex items-center gap-2">
              <Btn
                size="sm"
                variant="default"
                disabled={page <= 1}
                onClick={() => setQueryParam("page", String(page - 1))}
              >
                <ChevronLeft size={12} aria-hidden />
                Prev
              </Btn>
              <span className="font-sans text-[12px] text-muted">
                {page} / {totalPages}
              </span>
              <Btn
                size="sm"
                variant="default"
                disabled={page >= totalPages}
                onClick={() => setQueryParam("page", String(page + 1))}
              >
                Next
                <ChevronRight size={12} aria-hidden />
              </Btn>
            </div>
          </div>
        ) : null}
      </Card>
    </>
  );
}

function AdRow({
  ad,
  busy,
  onToggleActive,
}: {
  ad: AdminAdDTO;
  busy: boolean;
  onToggleActive: (next: boolean) => void;
}) {
  const ctr =
    ad.impressions > 0
      ? `${((ad.clicks / ad.impressions) * 100).toFixed(2)}%`
      : "—";
  const dateRange = formatDateRange(ad.startDate, ad.endDate);

  return (
    <li className="flex items-center gap-3 py-3 pl-2 pr-2 rounded-sm row-hov">
      <div className="shrink-0 w-10 h-10 border-[1.5px] border-ink rounded-sm overflow-hidden bg-paper-2">
        {ad.imageUrl ? (
          <Image
            src={ad.imageUrl}
            alt=""
            width={40}
            height={40}
            className="w-full h-full object-cover"
            unoptimized
          />
        ) : (
          <div className="w-full h-full bg-[repeating-linear-gradient(45deg,var(--color-paper-2)_0_6px,rgba(0,0,0,0.06)_6px_12px)]" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <Link
          href={`/marketing/ads/${ad.id}`}
          className="font-sans text-[13px] font-semibold hover:text-accent truncate block"
        >
          {ad.name}
        </Link>
        <p className="font-hand text-[11px] text-muted truncate">{dateRange}</p>
      </div>

      <Pill tone="muted">{AD_PLACEMENT_LABEL[ad.placement]}</Pill>

      <div className="hidden md:flex items-center gap-3 text-[11px] font-hand text-muted shrink-0">
        <Stat label="impr" value={ad.impressions.toLocaleString()} />
        <Stat label="clicks" value={ad.clicks.toLocaleString()} />
        <Stat label="CTR" value={ctr} />
      </div>

      <ActiveToggle
        active={ad.isActive}
        disabled={busy}
        onChange={onToggleActive}
      />

      <Link href={`/marketing/ads/${ad.id}`}>
        <Btn size="sm" variant="ghost">
          Edit →
        </Btn>
      </Link>
    </li>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex flex-col items-end">
      <span className="font-sans text-[12px] text-ink font-semibold">
        {value}
      </span>
      <span className="font-hand text-[10px] uppercase tracking-wider text-muted">
        {label}
      </span>
    </span>
  );
}

function ActiveToggle({
  active,
  disabled,
  onChange,
}: {
  active: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={active}
      aria-label={active ? "Pause ad" : "Activate ad"}
      disabled={disabled}
      onClick={() => onChange(!active)}
      className={cn(
        "shrink-0 inline-flex items-center gap-1.5 px-2 py-1 border-[1.5px] rounded-md text-[11px] font-hand uppercase tracking-wider",
        active
          ? "border-accent-2 bg-accent-2/10 text-accent-2"
          : "border-muted bg-paper-2 text-muted",
        disabled && "opacity-50 cursor-not-allowed",
      )}
    >
      <span
        className={cn(
          "w-2 h-2 rounded-full",
          active ? "bg-accent-2" : "bg-muted",
        )}
        aria-hidden
      />
      {active ? "Live" : "Paused"}
    </button>
  );
}

function formatDateRange(start: string | null, end: string | null): string {
  if (!start && !end) return "Always-on";
  const s = start ? formatShortDate(start) : "any time";
  const e = end ? formatShortDate(end) : "open-ended";
  return `${s} → ${e}`;
}

function EmptyState() {
  return (
    <div className="py-10 text-center">
      <p className="font-hand text-[13px] text-muted">
        No ads match this filter.
      </p>
      <Link
        href="/marketing/ads/new"
        className="mt-3 inline-block font-hand text-[12px] text-accent hover:underline"
      >
        Create your first ad →
      </Link>
    </div>
  );
}

function PageSkeleton() {
  return (
    <Card>
      <CardHead>
        <CardTitle>Ads</CardTitle>
      </CardHead>
      <ul className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <li
            key={i}
            className="h-14 bg-paper-2 rounded-sm animate-pulse"
            aria-hidden
          />
        ))}
      </ul>
    </Card>
  );
}
