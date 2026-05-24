"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryKey,
} from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, HelpCircle } from "lucide-react";
import {
  Card,
  CardHead,
  CardMeta,
  CardTitle,
} from "@/components/primitives/Card";
import { Btn } from "@/components/primitives/Btn";
import { CommentRow } from "@/components/moderation/CommentRow";
import { BulkActionsBar } from "@/components/moderation/BulkActionsBar";
import { CommentDetailDrawer } from "@/components/moderation/CommentDetailDrawer";
import { ShortcutsSheet } from "@/components/moderation/ShortcutsSheet";
import { useAdminAuth } from "@/lib/auth/AdminAuthProvider";
import { useToast } from "@/lib/ui/toast";
import {
  approveComment,
  deleteComment,
  listAdminComments,
  listAllStatusesAggregate,
  rejectComment,
} from "@/lib/api/comments.api";
import type { ApiResult } from "@/lib/types/api";
import type {
  CommentFilterStatus,
  ModerationCommentDTO,
} from "@/lib/types/comment";
import { cn } from "@/lib/utils/cn";

const PAGE_LIMIT = 20;

type FilterKey = "pending" | "reported" | "approved" | "rejected" | "all";

interface FilterDef {
  key: FilterKey;
  label: string;
  status: CommentFilterStatus | undefined;
  reported?: boolean;
}

const FILTERS: FilterDef[] = [
  { key: "pending", label: "Pending", status: "pending" },
  { key: "reported", label: "Reported", status: undefined, reported: true },
  { key: "approved", label: "Approved", status: "approved" },
  { key: "rejected", label: "Rejected", status: "rejected" },
  { key: "all", label: "All", status: "all" },
];

function readFilterKey(value: string | null): FilterKey {
  switch (value) {
    case "reported":
    case "approved":
    case "rejected":
    case "all":
      return value;
    default:
      return "pending";
  }
}

type Action = "approve" | "reject" | "delete";

export default function CommentsPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <CommentsInner />
    </Suspense>
  );
}

function CommentsInner() {
  const router = useRouter();
  const params = useSearchParams();
  const { getIdToken, role } = useAdminAuth();
  const toast = useToast();
  const qc = useQueryClient();

  const isAdmin = role === "admin";
  const filterKey = readFilterKey(params.get("status"));
  const filter = FILTERS.find((f) => f.key === filterKey) ?? FILTERS[0];
  const page = Number.parseInt(params.get("page") ?? "1", 10) || 1;

  const queryKey: QueryKey = useMemo(
    () => ["admin-comments", { filter: filter.key, page }],
    [filter.key, page],
  );

  const listQ = useQuery({
    enabled: isAdmin,
    queryKey,
    queryFn: async () => {
      const token = await getIdToken();
      if (!token)
        return {
          data: [] as ModerationCommentDTO[],
          meta: undefined,
        } satisfies ApiResult<ModerationCommentDTO[]>;
      // The deployed backend rejects `status=all` (Phase-5 server change ships
      // on next deploy) AND defaults missing-status to `pending`, which means
      // `?reported=true` alone only returns *pending* reported comments and
      // hides approved/rejected ones. Both cases need the client-side fan-out
      // — the aggregator forwards `reported` to each per-status request and
      // merges by createdAt, so an approved-but-reported comment surfaces too.
      if (filter.key === "all" || filter.key === "reported") {
        return listAllStatusesAggregate(
          { page, limit: PAGE_LIMIT, reported: filter.reported },
          token,
        );
      }
      return listAdminComments(
        {
          status: filter.status,
          reported: filter.reported,
          page,
          limit: PAGE_LIMIT,
        },
        token,
      );
    },
    staleTime: 15_000,
    refetchOnWindowFocus: true,
  });

  const items = useMemo(
    () => listQ.data?.data ?? [],
    [listQ.data?.data],
  );
  const total = listQ.data?.meta?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT));

  const setQueryParam = useCallback(
    (key: string, value: string | null) => {
      const next = new URLSearchParams(params.toString());
      if (value === null || value === "") next.delete(key);
      else next.set(key, value);
      if (key !== "page") next.delete("page");
      router.replace(`/moderation/comments?${next.toString()}`);
    },
    [params, router],
  );

  // ---- selection state (resets when page or filter changes) ----
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [lastSelectedIdx, setLastSelectedIdx] = useState<number | null>(null);

  const resetKey = `${filter.key}:${page}`;
  const [lastResetKey, setLastResetKey] = useState(resetKey);
  if (resetKey !== lastResetKey) {
    setLastResetKey(resetKey);
    setSelected(new Set());
    setLastSelectedIdx(null);
  }

  function toggleSelectAt(idx: number, e: React.MouseEvent) {
    const id = items[idx]?.id;
    if (!id) return;
    setSelected((prev) => {
      const next = new Set(prev);
      // Shift-click range selection.
      if (e.shiftKey && lastSelectedIdx !== null) {
        const [from, to] =
          lastSelectedIdx < idx ? [lastSelectedIdx, idx] : [idx, lastSelectedIdx];
        const shouldSelect = !prev.has(id);
        for (let i = from; i <= to; i += 1) {
          const targetId = items[i]?.id;
          if (!targetId) continue;
          if (shouldSelect) next.add(targetId);
          else next.delete(targetId);
        }
      } else if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
    setLastSelectedIdx(idx);
  }

  function selectAllOnPage() {
    setSelected(new Set(items.map((c) => c.id)));
  }

  function clearSelection() {
    setSelected(new Set());
    setLastSelectedIdx(null);
  }

  // ---- focus (keyboard nav) ----
  const [focusedIdx, setFocusedIdx] = useState<number | null>(null);
  const focusedKey = `${filter.key}:${page}:${items.length}`;
  const [lastFocusedKey, setLastFocusedKey] = useState(focusedKey);
  if (focusedKey !== lastFocusedKey) {
    setLastFocusedKey(focusedKey);
    setFocusedIdx(items.length > 0 ? 0 : null);
  }

  // ---- drawer ----
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const drawerComment = useMemo(
    () => (drawerId ? items.find((c) => c.id === drawerId) ?? null : null),
    [drawerId, items],
  );

  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  // ---- mutations ----
  const [busy, setBusy] = useState(false);
  const inFlightRef = useRef(false);

  const removeFromCache = useCallback(
    (ids: string[]) => {
      qc.setQueryData<ApiResult<ModerationCommentDTO[]>>(queryKey, (prev) => {
        if (!prev) return prev;
        const filtered = prev.data.filter((c) => !ids.includes(c.id));
        const decrement = prev.data.length - filtered.length;
        return {
          ...prev,
          data: filtered,
          meta: prev.meta
            ? { ...prev.meta, total: Math.max(0, prev.meta.total - decrement) }
            : prev.meta,
        };
      });
    },
    [qc, queryKey],
  );

  const patchStatusInCache = useCallback(
    (ids: string[], nextStatus: ModerationCommentDTO["status"]) => {
      qc.setQueryData<ApiResult<ModerationCommentDTO[]>>(queryKey, (prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          data: prev.data.map((c) =>
            ids.includes(c.id) ? { ...c, status: nextStatus } : c,
          ),
        };
      });
    },
    [qc, queryKey],
  );

  const mut = useMutation({
    mutationFn: async (input: { ids: string[]; action: Action }) => {
      const token = await getIdToken();
      if (!token) throw new Error("Not signed in.");
      const fn =
        input.action === "approve"
          ? approveComment
          : input.action === "reject"
            ? rejectComment
            : deleteComment;
      // Sequential — bulk sets are small (≤PAGE_LIMIT) and this preserves
      // ordering when the backend logs activity. Failure halts the batch.
      for (const id of input.ids) {
        await fn(id, token);
      }
      return input;
    },
  });

  const runAction = useCallback(
    async (action: Action, ids: string[]) => {
      if (ids.length === 0) return;
      if (inFlightRef.current) return;
      if (action === "delete" && !isAdmin) {
        toast.error("Hard delete is admin-only.");
        return;
      }

      inFlightRef.current = true;
      setBusy(true);

      // Optimistic: figure out whether the row should leave the current view
      // entirely (changes status away from the filter, or is hard-deleted) or
      // just have its status pill flipped (e.g. approving on the "All" view).
      const shouldRemove = ((): boolean => {
        if (action === "delete") return true;
        switch (filter.key) {
          case "pending":
            return true; // pending → approved/rejected always leaves the view
          case "approved":
            return action === "reject";
          case "rejected":
            return action === "approve";
          case "reported":
            // Approving/rejecting doesn't clear the report flag — the row stays.
            return false;
          case "all":
            return false;
        }
      })();

      if (shouldRemove) removeFromCache(ids);
      else if (action === "approve") patchStatusInCache(ids, "approved");
      else if (action === "reject") patchStatusInCache(ids, "rejected");

      try {
        await mut.mutateAsync({ ids, action });
        toast.success(
          action === "approve"
            ? `${ids.length} approved.`
            : action === "reject"
              ? `${ids.length} rejected.`
              : `${ids.length} hard-deleted.`,
        );
        clearSelection();
        if (drawerId && ids.includes(drawerId)) setDrawerId(null);
        // Refresh the cache + nav badge.
        qc.invalidateQueries({ queryKey: ["admin-comments"] });
        qc.invalidateQueries({ queryKey: ["nav-count", "comments-pending"] });
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Action failed.");
        qc.invalidateQueries({ queryKey });
      } finally {
        inFlightRef.current = false;
        setBusy(false);
      }
    },
    [
      filter.key,
      isAdmin,
      mut,
      toast,
      drawerId,
      qc,
      queryKey,
      removeFromCache,
      patchStatusInCache,
    ],
  );

  // ---- keyboard shortcuts ----
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (target) {
        const tag = target.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || target.isContentEditable)
          return;
      }
      if (document.querySelector<HTMLElement>('[data-modal-open="true"]'))
        return;

      const focused = focusedIdx !== null ? items[focusedIdx] : null;
      const targetIds: string[] =
        selected.size > 0
          ? Array.from(selected)
          : focused
            ? [focused.id]
            : [];

      if (e.key === "j") {
        e.preventDefault();
        if (items.length === 0) return;
        setFocusedIdx((idx) => Math.min(items.length - 1, (idx ?? -1) + 1));
      } else if (e.key === "k") {
        e.preventDefault();
        if (items.length === 0) return;
        setFocusedIdx((idx) => Math.max(0, (idx ?? items.length) - 1));
      } else if (e.key === "x") {
        e.preventDefault();
        if (focusedIdx === null || items.length === 0) return;
        const id = items[focusedIdx]?.id;
        if (!id) return;
        setSelected((prev) => {
          const next = new Set(prev);
          if (next.has(id)) next.delete(id);
          else next.add(id);
          return next;
        });
        setLastSelectedIdx(focusedIdx);
      } else if (e.key === "Enter") {
        if (!focused) return;
        e.preventDefault();
        setDrawerId(focused.id);
      } else if (e.key === "a") {
        e.preventDefault();
        runAction("approve", targetIds);
      } else if (e.key === "r") {
        e.preventDefault();
        runAction("reject", targetIds);
      } else if (e.key === "d") {
        e.preventDefault();
        runAction("delete", targetIds);
      } else if (e.key === "?") {
        e.preventDefault();
        setShortcutsOpen(true);
      } else if (e.key === "Escape") {
        if (selected.size > 0) {
          e.preventDefault();
          clearSelection();
        }
      }
    }

    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [focusedIdx, items, runAction, selected]);

  const allOnPageSelected =
    items.length > 0 && items.every((c) => selected.has(c.id));

  return (
    <>
      <section className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="font-hand text-[12px] uppercase tracking-wider text-muted">
            Moderation
          </p>
          <h1 className="serif text-[28px] sm:text-[34px] font-extrabold tracking-tight leading-none mt-1">
            <span className="uline">Comments</span>
          </h1>
          <p className="mt-2 font-hand text-[12px] text-muted">
            {listQ.isPending
              ? "Loading…"
              : `${total.toLocaleString()} total · page ${page} of ${totalPages}`}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShortcutsOpen(true)}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 border-[1.5px] border-ink rounded-md hover:bg-paper-2 font-sans text-[12px]"
          title="Keyboard shortcuts (?)"
        >
          <HelpCircle size={14} aria-hidden />
          Shortcuts
        </button>
      </section>

      <Card>
        <CardHead>
          <CardTitle>{filter.label}</CardTitle>
          <CardMeta>Use checkboxes for bulk actions. Press ? for shortcuts.</CardMeta>
        </CardHead>

        <div className="flex flex-wrap items-center gap-2 mb-4">
          {FILTERS.map((f) => {
            const active = f.key === filter.key;
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => setQueryParam("status", f.key === "pending" ? null : f.key)}
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
          <div className="flex-1 min-w-[40px]" />
          {items.length > 0 ? (
            <button
              type="button"
              onClick={() =>
                allOnPageSelected ? clearSelection() : selectAllOnPage()
              }
              className="font-hand text-[11px] text-muted hover:text-accent"
            >
              {allOnPageSelected ? "Deselect page" : "Select page"}
            </button>
          ) : null}
        </div>

        {listQ.isPending ? (
          <ul className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <li
                key={i}
                className="h-20 bg-paper-2 rounded-sm animate-pulse"
                aria-hidden
              />
            ))}
          </ul>
        ) : listQ.isError ? (
          <p className="font-hand text-[12px] text-accent">
            Couldn&apos;t load comments — {listQ.error?.message ?? "try again"}.
          </p>
        ) : items.length === 0 ? (
          <EmptyState filter={filter.key} />
        ) : (
          <ul className="divide-y divide-ink/10">
            {items.map((comment, idx) => (
              <CommentRow
                key={comment.id}
                comment={comment}
                selected={selected.has(comment.id)}
                focused={focusedIdx === idx}
                isAdmin={isAdmin}
                busy={busy}
                onToggleSelect={(e) => toggleSelectAt(idx, e)}
                onOpen={() => {
                  setFocusedIdx(idx);
                  setDrawerId(comment.id);
                }}
                onApprove={() => runAction("approve", [comment.id])}
                onReject={() => runAction("reject", [comment.id])}
                onDelete={() => runAction("delete", [comment.id])}
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

      <BulkActionsBar
        count={selected.size}
        isAdmin={isAdmin}
        busy={busy}
        onApprove={() => runAction("approve", Array.from(selected))}
        onReject={() => runAction("reject", Array.from(selected))}
        onDelete={() => runAction("delete", Array.from(selected))}
        onClear={clearSelection}
      />

      <CommentDetailDrawer
        open={drawerComment !== null}
        onClose={() => setDrawerId(null)}
        comment={drawerComment}
        busy={busy}
        onApprove={() =>
          drawerComment && runAction("approve", [drawerComment.id])
        }
        onReject={() =>
          drawerComment && runAction("reject", [drawerComment.id])
        }
        onDelete={() =>
          drawerComment && runAction("delete", [drawerComment.id])
        }
      />

      <ShortcutsSheet
        open={shortcutsOpen}
        onClose={() => setShortcutsOpen(false)}
        isAdmin={isAdmin}
      />
    </>
  );
}

function EmptyState({ filter }: { filter: FilterKey }) {
  const copy: Record<FilterKey, string> = {
    pending: "Inbox zero — no comments waiting on a decision.",
    reported: "No comments have been reported.",
    approved: "No approved comments in this view.",
    rejected: "No rejected comments in this view.",
    all: "No comments in the system yet.",
  };
  return (
    <div className="py-10 text-center">
      <p className="font-hand text-[13px] text-muted">{copy[filter]}</p>
    </div>
  );
}

function PageSkeleton() {
  return (
    <Card>
      <CardHead>
        <CardTitle>Comments</CardTitle>
      </CardHead>
      <ul className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <li
            key={i}
            className="h-20 bg-paper-2 rounded-sm animate-pulse"
            aria-hidden
          />
        ))}
      </ul>
    </Card>
  );
}
