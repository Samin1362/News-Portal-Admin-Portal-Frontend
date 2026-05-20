"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  Archive,
  ArchiveRestore,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Pencil,
  Search,
  Send,
} from "lucide-react";
import {
  Card,
  CardHead,
  CardMeta,
  CardTitle,
} from "@/components/primitives/Card";
import { Btn } from "@/components/primitives/Btn";
import { PortalMenu } from "@/components/primitives/PortalMenu";
import { useAdminAuth } from "@/lib/auth/AdminAuthProvider";
import {
  archiveArticle,
  listAllArticles,
  publishArticle,
  unarchiveArticle,
} from "@/lib/api/articles.api";
import { formatRelative, compactCount } from "@/lib/utils/format";
import type { ArticleCardDTO, ArticleStatus } from "@/lib/types/article";
import { useToast } from "@/lib/ui/toast";
import { StatusPill } from "@/components/articles/StatusPill";
import { FlagsToggleGroup } from "@/components/articles/FlagsToggleGroup";
import { AuthorCell } from "@/components/articles/AuthorCell";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils/cn";

const FILTERS: Array<{ value: ArticleStatus | "all"; label: string }> = [
  { value: "all", label: "All" },
  { value: "submitted", label: "Submitted" },
  { value: "under_review", label: "In review" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "published", label: "Published" },
  { value: "archived", label: "Archived" },
  { value: "draft", label: "Drafts" },
];

const PAGE_LIMIT = 20;

export default function AllArticlesPage() {
  return (
    <Suspense fallback={<Skeleton />}>
      <AllArticlesInner />
    </Suspense>
  );
}

function AllArticlesInner() {
  const router = useRouter();
  const params = useSearchParams();
  const { getIdToken, role } = useAdminAuth();
  const enabled = role === "admin";

  const rawStatus = params.get("status");
  const status: ArticleStatus | "all" = isStatusFilter(rawStatus)
    ? rawStatus
    : "all";
  const q = params.get("q") ?? "";
  const page = Number.parseInt(params.get("page") ?? "1", 10) || 1;

  const [searchInput, setSearchInput] = useState(q);
  const [lastUrlQ, setLastUrlQ] = useState(q);
  if (q !== lastUrlQ) {
    setLastUrlQ(q);
    setSearchInput(q);
  }

  useEffect(() => {
    if (searchInput === q) return;
    const timer = window.setTimeout(() => {
      const next = new URLSearchParams(params.toString());
      if (searchInput) next.set("q", searchInput);
      else next.delete("q");
      next.delete("page");
      router.replace(`/content/articles?${next.toString()}`);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [searchInput, q, params, router]);

  const setQueryParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(params.toString());
    if (value === null || value === "") next.delete(key);
    else next.set(key, value);
    if (key !== "page") next.delete("page");
    router.replace(`/content/articles?${next.toString()}`);
  };

  const listQ = useQuery({
    enabled,
    queryKey: ["articles", "all", { status, page }],
    queryFn: async () => {
      const token = await getIdToken();
      if (!token) return { data: [] as ArticleCardDTO[], meta: undefined };
      return listAllArticles({ status, page, limit: PAGE_LIMIT }, token);
    },
    staleTime: 30_000,
  });

  const total = listQ.data?.meta?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT));
  // Client-side filter by headline / slug — server has no search param yet.
  const itemsRaw = listQ.data?.data ?? [];
  const items = q
    ? itemsRaw.filter(
        (a) =>
          a.headline.toLowerCase().includes(q.toLowerCase()) ||
          a.slug.toLowerCase().includes(q.toLowerCase()),
      )
    : itemsRaw;
  const empty = !listQ.isPending && items.length === 0;

  return (
    <>
      <section className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="font-hand text-[12px] uppercase tracking-wider text-muted">
            Content
          </p>
          <h1 className="serif text-[28px] sm:text-[34px] font-extrabold tracking-tight leading-none mt-1">
            <span className="uline">All articles</span>
          </h1>
          <p className="mt-2 font-hand text-[12px] text-muted">
            {listQ.isPending
              ? "Loading…"
              : `${total.toLocaleString()} in this filter · page ${page} of ${totalPages}`}
          </p>
        </div>
      </section>

      <Card>
        <CardHead>
          <CardTitle>Directory</CardTitle>
          <CardMeta>Filter, search, override.</CardMeta>
        </CardHead>

        <div className="flex flex-wrap items-center gap-2 mb-4">
          {FILTERS.map((filter) => {
            const active = filter.value === status;
            return (
              <button
                key={filter.value}
                type="button"
                onClick={() =>
                  setQueryParam(
                    "status",
                    filter.value === "all" ? null : filter.value,
                  )
                }
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
              placeholder="Search headline or slug…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="flex-1 bg-transparent outline-none font-sans text-[13px] placeholder:text-muted"
            />
          </label>
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
            Couldn&apos;t load articles — {listQ.error?.message ?? "try again"}.
          </p>
        ) : empty ? (
          <p className="py-8 text-center font-hand text-[13px] text-muted">
            No articles match these filters.
          </p>
        ) : (
          <ul className="divide-y divide-ink/10">
            {items.map((article) => (
              <ArticleRow key={article.id} article={article} />
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

function isStatusFilter(v: string | null): v is ArticleStatus | "all" {
  if (!v) return false;
  return [
    "all",
    "draft",
    "submitted",
    "under_review",
    "approved",
    "rejected",
    "published",
    "archived",
  ].includes(v);
}

function ArticleRow({ article }: { article: ArticleCardDTO }) {
  const { getIdToken } = useAdminAuth();
  const toast = useToast();
  const qc = useQueryClient();
  const [menuOpen, setMenuOpen] = useState(false);
  const [flagsOpen, setFlagsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  const quickAction = useMutation({
    mutationFn: async (
      action: "archive" | "unarchive" | "publish",
    ): Promise<void> => {
      const token = await getIdToken();
      if (!token) throw new Error("Not signed in.");
      if (action === "archive") {
        await archiveArticle(article.id, token);
      } else if (action === "unarchive") {
        await unarchiveArticle(article.id, token);
      } else {
        await publishArticle(article.id, token);
      }
    },
    onSuccess: () => {
      toast.success("Done.");
      qc.invalidateQueries({ queryKey: ["articles"] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Action failed.");
    },
    onSettled: () => {
      setMenuOpen(false);
      setFlagsOpen(false);
    },
  });

  const closeMenu = () => {
    setMenuOpen(false);
    setFlagsOpen(false);
  };

  return (
    <li className="py-3 row-hov pl-2 pr-2 rounded-sm">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <Link
            href={`/content/articles/${article.id}/edit`}
            className="font-sans text-[14px] font-semibold truncate hover:text-accent block"
          >
            {article.headline}
          </Link>
          <p className="font-hand text-[11px] text-muted truncate">
            /{article.slug}
          </p>
        </div>
        <div className="hidden sm:block min-w-[120px] max-w-[160px] truncate">
          <AuthorCell authorId={article.authorId} />
        </div>
        <StatusPill status={article.status} />
        <span className="font-hand text-[11px] text-muted hidden md:inline min-w-[80px] text-right">
          {article.publishedAt
            ? formatRelative(article.publishedAt)
            : article.scheduledAt
              ? `→ ${formatRelative(article.scheduledAt)}`
              : "—"}
        </span>
        <span className="font-hand text-[11px] text-muted hidden lg:inline min-w-[44px] text-right">
          {compactCount(article.viewCount)} reads
        </span>
        <span className="font-hand text-[11px] text-muted hidden lg:inline min-w-[64px] text-right">
          {compactCount(article.commentCount)} cmts
        </span>
        <Link href={`/content/articles/${article.id}/edit`}>
          <Btn size="sm" variant="ghost">
            <Pencil size={11} aria-hidden />
            Open
          </Btn>
        </Link>
        <button
          ref={triggerRef}
          type="button"
          aria-label="More actions"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          onClick={() => {
            setMenuOpen((o) => !o);
            setFlagsOpen(false);
          }}
          className="inline-flex items-center justify-center w-8 h-8 border-[1.5px] border-ink rounded-sm hover:bg-paper-2"
        >
          <MoreHorizontal size={14} aria-hidden />
        </button>
      </div>

      <PortalMenu open={menuOpen} onClose={closeMenu} anchorRef={triggerRef}>
        <button
          type="button"
          role="menuitem"
          onClick={() => setFlagsOpen((o) => !o)}
          className="w-full text-left px-2 py-1 font-sans text-[12.5px] hover:bg-paper-2 rounded-sm"
        >
          {flagsOpen ? "Hide flags" : "Edit flags"}
        </button>
        {flagsOpen ? (
          <div className="px-2 py-1 border-t border-ink/10">
            <FlagsToggleGroup article={article} size="compact" />
          </div>
        ) : null}
        {article.status !== "archived" ? (
          <button
            type="button"
            role="menuitem"
            onClick={() => quickAction.mutate("archive")}
            className="w-full text-left px-2 py-1 font-sans text-[12.5px] hover:bg-paper-2 rounded-sm flex items-center gap-2"
          >
            <Archive size={12} aria-hidden /> Archive
          </button>
        ) : (
          <button
            type="button"
            role="menuitem"
            onClick={() => quickAction.mutate("unarchive")}
            className="w-full text-left px-2 py-1 font-sans text-[12.5px] hover:bg-paper-2 rounded-sm flex items-center gap-2"
          >
            <ArchiveRestore size={12} aria-hidden /> Restore
          </button>
        )}
        {article.status !== "published" ? (
          <button
            type="button"
            role="menuitem"
            onClick={() => quickAction.mutate("publish")}
            className="w-full text-left px-2 py-1 font-sans text-[12.5px] hover:bg-paper-2 rounded-sm flex items-center gap-2"
          >
            <Send size={12} aria-hidden />
            {article.status === "approved" ? "Publish now" : "Force publish"}
          </button>
        ) : null}
        <Link
          href={`/content/articles/${article.id}/edit`}
          className="block px-2 py-1 font-sans text-[12.5px] hover:bg-paper-2 rounded-sm"
          role="menuitem"
          onClick={closeMenu}
        >
          <Pencil size={12} aria-hidden className="inline mr-1.5" />
          Override edit
        </Link>
      </PortalMenu>
    </li>
  );
}

function Skeleton() {
  return (
    <Card>
      <CardHead>
        <CardTitle>Directory</CardTitle>
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
