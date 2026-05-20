"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft,
  ChevronRight,
  Pencil,
  Send,
  UserCheck,
} from "lucide-react";
import {
  Card,
  CardHead,
  CardMeta,
  CardTitle,
} from "@/components/primitives/Card";
import { Btn } from "@/components/primitives/Btn";
import { useAdminAuth } from "@/lib/auth/AdminAuthProvider";
import {
  listQueue,
  publishArticle,
  startReview,
  type QueueStatus,
} from "@/lib/api/articles.api";
import { useToast } from "@/lib/ui/toast";
import { formatRelative, compactCount } from "@/lib/utils/format";
import type { ArticleCardDTO } from "@/lib/types/article";
import { StatusPill } from "@/components/articles/StatusPill";
import { AuthorCell } from "@/components/articles/AuthorCell";
import { cn } from "@/lib/utils/cn";

const TABS: Array<{ value: QueueStatus | undefined; label: string }> = [
  { value: undefined, label: "Open (submitted + in review)" },
  { value: "submitted", label: "Submitted" },
  { value: "under_review", label: "In review" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "published", label: "Recently published" },
];

const PAGE_LIMIT = 20;

export default function EditorialQueuePage() {
  return (
    <Suspense fallback={<Skeleton />}>
      <QueueInner />
    </Suspense>
  );
}

function QueueInner() {
  const router = useRouter();
  const params = useSearchParams();
  const { getIdToken, role } = useAdminAuth();
  const enabled = role === "admin";

  const rawStatus = params.get("status");
  const status: QueueStatus | undefined = isQueueStatus(rawStatus)
    ? rawStatus
    : undefined;
  const page = Number.parseInt(params.get("page") ?? "1", 10) || 1;

  const queueQ = useQuery({
    enabled,
    queryKey: ["queue", { status, page }],
    queryFn: async () => {
      const token = await getIdToken();
      if (!token) return { data: [] as ArticleCardDTO[], meta: undefined };
      return listQueue({ status, page, limit: PAGE_LIMIT }, token);
    },
    staleTime: 30_000,
  });

  const total = queueQ.data?.meta?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT));
  const items = queueQ.data?.data ?? [];
  const empty = !queueQ.isPending && items.length === 0;

  const setStatus = (value: QueueStatus | undefined) => {
    const next = new URLSearchParams(params.toString());
    if (value === undefined) next.delete("status");
    else next.set("status", value);
    next.delete("page");
    router.replace(`/content/articles/queue?${next.toString()}`);
  };

  const setPage = (value: number) => {
    const next = new URLSearchParams(params.toString());
    next.set("page", String(value));
    router.replace(`/content/articles/queue?${next.toString()}`);
  };

  return (
    <>
      <section className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="font-hand text-[12px] uppercase tracking-wider text-muted">
            Content
          </p>
          <h1 className="serif text-[28px] sm:text-[34px] font-extrabold tracking-tight leading-none mt-1">
            <span className="uline">Editorial queue</span>
          </h1>
          <p className="mt-2 font-hand text-[12px] text-muted">
            Submissions awaiting review · admin can Take over or Force
            publish from any status.
          </p>
        </div>
      </section>

      <Card>
        <CardHead>
          <CardTitle>Pipeline</CardTitle>
          <CardMeta>
            {queueQ.isPending
              ? "Loading…"
              : `${total.toLocaleString()} in queue`}
          </CardMeta>
        </CardHead>

        <div className="flex flex-wrap items-center gap-2 mb-4">
          {TABS.map((tab) => {
            const active =
              tab.value === undefined ? status === undefined : tab.value === status;
            return (
              <button
                key={tab.label}
                type="button"
                onClick={() => setStatus(tab.value)}
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

        {queueQ.isPending ? (
          <ul className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <li
                key={i}
                className="h-14 bg-paper-2 rounded-sm animate-pulse"
                aria-hidden
              />
            ))}
          </ul>
        ) : queueQ.isError ? (
          <p className="font-hand text-[12px] text-accent">
            Couldn&apos;t load the queue — {queueQ.error?.message ?? "try again"}.
          </p>
        ) : empty ? (
          <p className="py-8 text-center font-hand text-[13px] text-muted">
            Nothing in this slice of the queue right now.
          </p>
        ) : (
          <ul className="divide-y divide-ink/10">
            {items.map((article) => (
              <QueueRow key={article.id} article={article} />
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
                onClick={() => setPage(page - 1)}
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
                onClick={() => setPage(page + 1)}
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

function isQueueStatus(v: string | null): v is QueueStatus {
  if (!v) return false;
  return (
    ["submitted", "under_review", "approved", "rejected", "published"].includes(
      v,
    )
  );
}

function QueueRow({ article }: { article: ArticleCardDTO }) {
  const { getIdToken } = useAdminAuth();
  const toast = useToast();
  const qc = useQueryClient();
  const [pending, setPending] = useState<"take-over" | "force-publish" | null>(
    null,
  );

  const takeOver = useMutation({
    mutationFn: async () => {
      const token = await getIdToken();
      if (!token) throw new Error("Not signed in.");
      return startReview(article.id, token);
    },
    onSuccess: () => {
      toast.success("You're now the reviewer.");
      qc.invalidateQueries({ queryKey: ["queue"] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Couldn't take over.");
    },
    onSettled: () => setPending(null),
  });

  const forcePublish = useMutation({
    mutationFn: async () => {
      const token = await getIdToken();
      if (!token) throw new Error("Not signed in.");
      return publishArticle(article.id, token);
    },
    onSuccess: () => {
      toast.success("Published.");
      qc.invalidateQueries({ queryKey: ["queue"] });
      qc.invalidateQueries({ queryKey: ["articles"] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Couldn't publish.");
    },
    onSettled: () => setPending(null),
  });

  const isOpen =
    article.status === "submitted" || article.status === "under_review";

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
        <span className="font-hand text-[11px] text-muted hidden md:inline min-w-[88px] text-right">
          {formatRelative(article.updatedAt)}
        </span>
        <span className="font-hand text-[11px] text-muted hidden lg:inline min-w-[44px] text-right">
          {compactCount(article.viewCount)} reads
        </span>
        {isOpen ? (
          <Btn
            size="sm"
            variant="default"
            disabled={pending === "take-over"}
            onClick={() => {
              setPending("take-over");
              takeOver.mutate();
            }}
          >
            <UserCheck size={12} aria-hidden />
            {pending === "take-over" ? "…" : "Take over"}
          </Btn>
        ) : null}
        {article.status !== "published" ? (
          <Btn
            size="sm"
            variant="primary"
            disabled={pending === "force-publish"}
            onClick={() => {
              setPending("force-publish");
              forcePublish.mutate();
            }}
          >
            <Send size={12} aria-hidden />
            {pending === "force-publish"
              ? "…"
              : article.status === "approved"
                ? "Publish"
                : "Force publish"}
          </Btn>
        ) : null}
        <Link href={`/content/articles/${article.id}/edit`}>
          <Btn size="sm" variant="ghost">
            <Pencil size={12} aria-hidden />
            Open
          </Btn>
        </Link>
      </div>
    </li>
  );
}

function Skeleton() {
  return (
    <Card>
      <CardHead>
        <CardTitle>Pipeline</CardTitle>
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
