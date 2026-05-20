"use client";

import { Suspense, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, ShieldCheck } from "lucide-react";
import {
  Card,
  CardHead,
  CardMeta,
  CardTitle,
} from "@/components/primitives/Card";
import { Avatar } from "@/components/primitives/Avatar";
import { Pill } from "@/components/primitives/Pill";
import { Btn } from "@/components/primitives/Btn";
import { useAdminAuth } from "@/lib/auth/AdminAuthProvider";
import { listRoleRequests } from "@/lib/api/roleRequests.api";
import { formatRelative } from "@/lib/utils/format";
import type {
  RoleRequestDTO,
  RoleRequestStatus,
} from "@/lib/types/roleRequest";
import { cn } from "@/lib/utils/cn";

const TABS: Array<{ value: RoleRequestStatus; label: string }> = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "cancelled", label: "Cancelled" },
];

const STATUS_TONE: Record<
  RoleRequestStatus,
  "warn" | "accent-2" | "accent" | "muted"
> = {
  pending: "warn",
  approved: "accent-2",
  rejected: "accent",
  cancelled: "muted",
};

const PAGE_LIMIT = 20;

export default function RoleRequestsPage() {
  return (
    <Suspense fallback={<InboxSkeleton />}>
      <RoleRequestsInner />
    </Suspense>
  );
}

function RoleRequestsInner() {
  const router = useRouter();
  const params = useSearchParams();
  const { getIdToken, role } = useAdminAuth();
  const enabled = role === "admin";

  const status =
    (params.get("status") as RoleRequestStatus | null) ?? "pending";
  const page = Number.parseInt(params.get("page") ?? "1", 10) || 1;

  const setQueryParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(params.toString());
    if (value === null || value === "") next.delete(key);
    else next.set(key, value);
    if (key !== "page") next.delete("page");
    router.replace(`/people/role-requests?${next.toString()}`);
  };

  const q = useQuery({
    enabled,
    queryKey: ["role-requests", { status, page }],
    queryFn: async () => {
      const token = await getIdToken();
      if (!token) return { data: [] as RoleRequestDTO[], meta: undefined };
      return listRoleRequests({ status, page, limit: PAGE_LIMIT }, token);
    },
    staleTime: 30_000,
  });

  const total = q.data?.meta?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT));
  const items = q.data?.data ?? [];

  const emptyMsg = useMemo(() => {
    if (status === "pending") return "Inbox zero — no requests waiting.";
    if (status === "approved") return "No approved requests yet.";
    if (status === "rejected") return "No rejected requests.";
    return "No cancelled requests.";
  }, [status]);

  return (
    <>
      <section className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="font-hand text-[12px] uppercase tracking-wider text-muted">
            People
          </p>
          <h1 className="serif text-[28px] sm:text-[34px] font-extrabold tracking-tight leading-none mt-1">
            <span className="uline">Role requests</span>
          </h1>
          <p className="mt-2 font-hand text-[12px] text-muted">
            {q.isPending
              ? "Loading…"
              : `${total.toLocaleString()} ${status} · page ${page} of ${totalPages}`}
          </p>
        </div>
      </section>

      <Card>
        <CardHead>
          <CardTitle>Inbox</CardTitle>
          <CardMeta>Reader-initiated upgrades</CardMeta>
        </CardHead>

        <div className="flex flex-wrap items-center gap-2 mb-4">
          {TABS.map((tab) => {
            const active = tab.value === status;
            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => setQueryParam("status", tab.value)}
                className={cn(
                  "px-3 py-1.5 rounded-md border-[1.5px] font-sans text-[12px] transition-colors",
                  active
                    ? "bg-ink text-paper border-ink"
                    : "bg-paper text-ink border-ink hover:bg-paper-2",
                )}
                aria-pressed={active}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {q.isPending ? (
          <ul className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <li
                key={i}
                className="h-14 bg-paper-2 rounded-sm animate-pulse"
                aria-hidden
              />
            ))}
          </ul>
        ) : q.isError ? (
          <p className="font-hand text-[12px] text-accent">
            Couldn&apos;t load requests — {q.error?.message ?? "try again"}.
          </p>
        ) : items.length === 0 ? (
          <div className="py-10 text-center">
            <p className="font-hand text-[13px] text-muted">{emptyMsg}</p>
          </div>
        ) : (
          <ul className="divide-y divide-ink/10">
            {items.map((req) => (
              <RequestRow key={req.id} req={req} />
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

function RequestRow({ req }: { req: RoleRequestDTO }) {
  const verified = !!req.emailVerifiedAt;
  return (
    <li className="flex items-center gap-3 py-3 row-hov pl-2 pr-2 rounded-sm">
      <Avatar name={req.submittedInfo.displayName} tone="ink" size="md" />
      <div className="min-w-0 flex-1">
        <p className="font-sans text-[14px] font-semibold truncate flex items-center gap-1.5">
          {req.submittedInfo.displayName}
          {verified ? (
            <ShieldCheck
              size={12}
              aria-label="Email verified"
              className="text-accent-2 shrink-0"
            />
          ) : null}
        </p>
        <p className="font-hand text-[11px] text-muted truncate">
          {req.submittedInfo.fullName}
        </p>
      </div>
      <Pill tone="accent">{req.toRole}</Pill>
      <span className="font-hand text-[11px] text-muted hidden md:inline">
        {formatRelative(req.createdAt)}
      </span>
      <Pill tone={STATUS_TONE[req.status]}>{req.status}</Pill>
      <Link href={`/people/role-requests/${req.id}`}>
        <Btn variant="ghost" size="sm">
          Review →
        </Btn>
      </Link>
    </li>
  );
}

function InboxSkeleton() {
  return (
    <Card>
      <CardHead>
        <CardTitle>Inbox</CardTitle>
      </CardHead>
      <ul className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
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
