"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
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
import { listUsers } from "@/lib/api/users.api";
import { formatRelative } from "@/lib/utils/format";
import type { UserProfile, UserRole } from "@/lib/auth/types";
import { cn } from "@/lib/utils/cn";

const ROLE_TONE: Record<UserRole, "ink" | "accent" | "accent-2" | "muted"> = {
  admin: "accent",
  editor: "ink",
  journalist: "accent-2",
  reader: "muted",
};

const ROLE_FILTERS: Array<{ value: UserRole | null; label: string }> = [
  { value: null, label: "All" },
  { value: "reader", label: "Readers" },
  { value: "journalist", label: "Journalists" },
  { value: "editor", label: "Editors" },
  { value: "admin", label: "Admins" },
];

const PAGE_LIMIT = 20;

function statusForUser(user: UserProfile): {
  label: string;
  tone: "accent-2" | "accent" | "warn" | "muted";
} {
  if (user.isBlocked) return { label: "Suspended", tone: "accent" };
  if (user.isCommentBlocked) return { label: "Comment-blocked", tone: "warn" };
  if (!user.lastLoginAt) return { label: "Pending", tone: "muted" };
  return { label: "Active", tone: "accent-2" };
}

export default function UsersPage() {
  return (
    <Suspense fallback={<UsersSkeleton />}>
      <UsersInner />
    </Suspense>
  );
}

function UsersInner() {
  const router = useRouter();
  const params = useSearchParams();
  const { getIdToken, role } = useAdminAuth();
  const enabled = role === "admin";

  const role_ = (params.get("role") as UserRole | null) ?? null;
  const q = params.get("q") ?? "";
  const page = Number.parseInt(params.get("page") ?? "1", 10) || 1;

  const [searchInput, setSearchInput] = useState(q);
  const [lastUrlQ, setLastUrlQ] = useState(q);
  // Re-sync local input when URL `q` changes externally (e.g. back/forward nav).
  // Done in render via compare-and-set per React 19 guidance (avoids cascading effect).
  if (q !== lastUrlQ) {
    setLastUrlQ(q);
    setSearchInput(q);
  }

  // Debounce search input → URL.
  useEffect(() => {
    if (searchInput === q) return;
    const timer = window.setTimeout(() => {
      const next = new URLSearchParams(params.toString());
      if (searchInput) next.set("q", searchInput);
      else next.delete("q");
      next.delete("page");
      router.replace(`/people/users?${next.toString()}`);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [searchInput, q, params, router]);

  const setQueryParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(params.toString());
    if (value === null || value === "") next.delete(key);
    else next.set(key, value);
    if (key !== "page") next.delete("page");
    router.replace(`/people/users?${next.toString()}`);
  };

  const usersQ = useQuery({
    enabled,
    queryKey: ["users", { role: role_, q, page }],
    queryFn: async () => {
      const token = await getIdToken();
      if (!token) return { data: [] as UserProfile[], meta: undefined };
      return listUsers(
        {
          role: role_ ?? undefined,
          q: q || undefined,
          page,
          limit: PAGE_LIMIT,
        },
        token,
      );
    },
    staleTime: 30_000,
  });

  const total = usersQ.data?.meta?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT));
  const items = usersQ.data?.data ?? [];
  const empty = !usersQ.isPending && items.length === 0;

  const hasFilters = useMemo(() => !!role_ || q.length > 0, [role_, q]);

  return (
    <>
      <section className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="font-hand text-[12px] uppercase tracking-wider text-muted">
            People
          </p>
          <h1 className="serif text-[28px] sm:text-[34px] font-extrabold tracking-tight leading-none mt-1">
            <span className="uline">Users</span>
          </h1>
          <p className="mt-2 font-hand text-[12px] text-muted">
            {usersQ.isPending
              ? "Loading…"
              : `${total.toLocaleString()} total · page ${page} of ${totalPages}`}
          </p>
        </div>
      </section>

      <Card>
        <CardHead>
          <CardTitle>Directory</CardTitle>
          <CardMeta>
            {hasFilters ? (
              <button
                type="button"
                onClick={() => router.replace("/people/users")}
                className="hover:text-accent"
              >
                Clear filters
              </button>
            ) : (
              <span>Filter + search</span>
            )}
          </CardMeta>
        </CardHead>

        <div className="flex flex-wrap items-center gap-2 mb-4">
          {ROLE_FILTERS.map((filter) => {
            const active =
              filter.value === null
                ? role_ === null
                : filter.value === role_;
            return (
              <button
                key={filter.label}
                type="button"
                onClick={() => setQueryParam("role", filter.value)}
                className={cn(
                  "px-3 py-1.5 rounded-md border-[1.5px] font-sans text-[12px] transition-colors",
                  active
                    ? "bg-ink text-paper border-ink"
                    : "bg-paper text-ink border-ink hover:bg-paper-2",
                )}
                aria-pressed={active}
              >
                {filter.label}
              </button>
            );
          })}

          <div className="flex-1 min-w-[180px]" />

          <label className="flex items-center gap-2 px-3 h-9 bg-paper-2 border-[1.5px] border-ink rounded-md min-w-[220px] flex-1 max-w-[320px]">
            <Search size={14} className="text-muted" aria-hidden />
            <input
              type="search"
              placeholder="Search name or email…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="flex-1 bg-transparent outline-none font-sans text-[13px] placeholder:text-muted"
            />
          </label>
        </div>

        {usersQ.isPending ? (
          <ul className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <li
                key={i}
                className="h-12 bg-paper-2 rounded-sm animate-pulse"
                aria-hidden
              />
            ))}
          </ul>
        ) : usersQ.isError ? (
          <p className="font-hand text-[12px] text-accent">
            Couldn&apos;t load users — {usersQ.error?.message ?? "try again"}.
          </p>
        ) : empty ? (
          <div className="py-8 text-center">
            <p className="font-hand text-[13px] text-muted">
              No users match these filters.
            </p>
            {hasFilters ? (
              <button
                type="button"
                onClick={() => router.replace("/people/users")}
                className="mt-2 font-hand text-[12px] text-accent hover:underline"
              >
                Clear filters
              </button>
            ) : null}
          </div>
        ) : (
          <ul className="divide-y divide-ink/10">
            {items.map((user) => {
              const status = statusForUser(user);
              return (
                <li
                  key={user.id}
                  className="flex items-center gap-3 py-3 row-hov pl-2 pr-2 rounded-sm"
                >
                  <Avatar
                    name={user.displayName}
                    src={user.photoURL}
                    size="md"
                    tone="ink"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-sans text-[14px] font-semibold truncate">
                      {user.displayName}
                    </p>
                    <p className="font-hand text-[11px] text-muted truncate">
                      {user.email}
                    </p>
                  </div>
                  <Pill tone={ROLE_TONE[user.role]}>{user.role}</Pill>
                  <span className="font-hand text-[11px] text-muted hidden md:inline">
                    {formatRelative(user.createdAt)}
                  </span>
                  <Pill tone={status.tone}>{status.label}</Pill>
                  <Link href={`/people/users/${user.id}`}>
                    <Btn variant="ghost" size="sm">
                      Manage →
                    </Btn>
                  </Link>
                </li>
              );
            })}
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

function UsersSkeleton() {
  return (
    <Card>
      <CardHead>
        <CardTitle>Directory</CardTitle>
      </CardHead>
      <ul className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <li
            key={i}
            className="h-12 bg-paper-2 rounded-sm animate-pulse"
            aria-hidden
          />
        ))}
      </ul>
    </Card>
  );
}
