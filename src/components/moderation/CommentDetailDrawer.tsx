"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Check,
  ExternalLink,
  MessageSquareOff,
  Trash2,
  X,
} from "lucide-react";
import { Avatar } from "@/components/primitives/Avatar";
import { Btn } from "@/components/primitives/Btn";
import { CommentStatusPill } from "./StatusPill";
import { ArticleContextCell } from "./ArticleContextCell";
import { useAdminAuth } from "@/lib/auth/AdminAuthProvider";
import { useToast } from "@/lib/ui/toast";
import { getUser } from "@/lib/api/users.api";
import { getArticle } from "@/lib/api/articles.api";
import { patchCommentsEnabled } from "@/lib/api/articles.api";
import { formatRelative, formatShortDate } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import type { ModerationCommentDTO } from "@/lib/types/comment";

interface Props {
  open: boolean;
  onClose: () => void;
  comment: ModerationCommentDTO | null;
  onApprove: () => void;
  onReject: () => void;
  onDelete: () => void;
  busy: boolean;
}

/**
 * Side drawer with full context for one comment. Mirrors the visual weight of
 * the override-editor right rail (1.5px border, 6px ink shadow). Reports list
 * fans out to `/users/:id` lookups (cached 5min via TanStack dedupe).
 */
export function CommentDetailDrawer({
  open,
  onClose,
  comment,
  onApprove,
  onReject,
  onDelete,
  busy,
}: Props) {
  const { role } = useAdminAuth();
  const isAdmin = role === "admin";

  // Render-phase portal mount detection — React 19 compatible.
  const [mounted, setMounted] = useState(false);
  if (!mounted && typeof window !== "undefined") setMounted(true);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !mounted || !comment) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[65] flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-labelledby="comment-drawer-title"
      data-modal-open="true"
    >
      <button
        type="button"
        aria-label="Close drawer"
        onClick={onClose}
        className="absolute inset-0 bg-ink/45 backdrop-blur-[2px]"
      />
      <div className="relative bg-paper border-l-[1.5px] border-ink flex flex-col h-full min-h-0 w-full sm:w-[min(560px,92vw)] shadow-[-6px_0_0_var(--color-ink)]">
        <header className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3 border-b-[1.5px] border-ink bg-paper shrink-0">
          <div className="min-w-0">
            <h2
              id="comment-drawer-title"
              className="serif text-[18px] font-extrabold tracking-tight"
            >
              Comment detail
            </h2>
            <p className="font-hand text-[11px] text-muted">
              {formatShortDate(comment.createdAt)} · {formatRelative(comment.createdAt)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="inline-flex items-center justify-center w-9 h-9 border-[1.5px] border-ink rounded-sm hover:bg-paper-2 shrink-0"
          >
            <X size={16} aria-hidden />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-4 space-y-5">
          <section className="space-y-2">
            <AuthorSnippet comment={comment} />
          </section>

          <section className="space-y-1.5">
            <h3 className="font-hand text-[11px] uppercase tracking-wider text-muted">
              Content
            </h3>
            <CommentStatusPill status={comment.status} />
            <p className="font-sans text-[14px] text-ink whitespace-pre-wrap leading-relaxed border-l-[3px] border-ink/30 pl-3">
              {comment.content}
            </p>
          </section>

          <section className="space-y-1.5">
            <h3 className="font-hand text-[11px] uppercase tracking-wider text-muted">
              On article
            </h3>
            <ArticleContextCell articleId={comment.articleId} withOpenLink />
            <ArticleCommentsToggle articleId={comment.articleId} />
          </section>

          <ReportsSection comment={comment} />
        </div>

        <footer className="border-t-[1.5px] border-ink p-4 flex flex-wrap items-center gap-2 shrink-0 bg-paper">
          {comment.status !== "approved" ? (
            <Btn variant="default" onClick={onApprove} disabled={busy}>
              <Check size={14} aria-hidden />
              Approve
            </Btn>
          ) : null}
          {comment.status !== "rejected" ? (
            <Btn variant="ghost" onClick={onReject} disabled={busy}>
              <X size={14} aria-hidden />
              Reject
            </Btn>
          ) : null}
          <div className="flex-1" />
          <Btn
            variant="default"
            onClick={onDelete}
            disabled={busy || !isAdmin}
            title={isAdmin ? "Hard delete" : "Admin only"}
            className="text-accent border-accent hover:bg-accent/10"
          >
            <Trash2 size={14} aria-hidden />
            Hard delete
          </Btn>
        </footer>
      </div>
    </div>,
    document.body,
  );
}

function AuthorSnippet({ comment }: { comment: ModerationCommentDTO }) {
  const author = comment.author;
  if (!author) {
    return (
      <p className="font-hand text-[12px] text-muted">
        Author account deleted.
      </p>
    );
  }
  return (
    <Link
      href={`/people/users/${author.id}`}
      className="flex items-center gap-3 group"
    >
      <Avatar name={author.displayName} src={author.photoURL} size="md" tone="ink" />
      <div className="min-w-0">
        <p className="font-sans text-[14px] font-semibold text-ink group-hover:text-accent">
          {author.displayName}
        </p>
        <p className="font-hand text-[11px] text-muted inline-flex items-center gap-1">
          View profile
          <ExternalLink size={10} aria-hidden />
        </p>
      </div>
    </Link>
  );
}

function ReportsSection({ comment }: { comment: ModerationCommentDTO }) {
  if (comment.reports.length === 0) {
    return (
      <section className="space-y-1.5">
        <h3 className="font-hand text-[11px] uppercase tracking-wider text-muted">
          Reports
        </h3>
        <p className="font-hand text-[12px] text-muted">No reports.</p>
      </section>
    );
  }
  return (
    <section className="space-y-2">
      <h3 className="font-hand text-[11px] uppercase tracking-wider text-muted inline-flex items-center gap-1">
        <AlertTriangle size={11} aria-hidden />
        {comment.reports.length} report{comment.reports.length === 1 ? "" : "s"}
      </h3>
      <ul className="space-y-2">
        {comment.reports.map((r) => (
          <li
            key={`${r.userId}-${r.at}`}
            className="bg-paper-2 border-[1.5px] border-ink/30 rounded-sm px-3 py-2"
          >
            <div className="flex items-center justify-between gap-2 mb-1">
              <ReporterCell userId={r.userId} />
              <span className="font-hand text-[10px] text-muted">
                {formatRelative(r.at)}
              </span>
            </div>
            <p className="font-sans text-[12.5px] text-ink whitespace-pre-wrap">
              {r.reason}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ReporterCell({ userId }: { userId: string }) {
  const { getIdToken } = useAdminAuth();
  const q = useQuery({
    queryKey: ["user", userId],
    queryFn: async () => {
      const token = await getIdToken();
      if (!token) throw new Error("Not signed in.");
      return getUser(userId, token);
    },
    staleTime: 5 * 60 * 1000,
  });
  if (q.isPending)
    return <span className="font-hand text-[11px] text-muted">…</span>;
  if (q.isError || !q.data)
    return (
      <span className="font-hand text-[11px] text-muted" title={userId}>
        Unknown reporter
      </span>
    );
  return (
    <Link
      href={`/people/users/${q.data.id}`}
      className="font-sans text-[12px] font-semibold text-ink hover:text-accent truncate"
    >
      {q.data.displayName}
    </Link>
  );
}

function ArticleCommentsToggle({ articleId }: { articleId: string }) {
  const { getIdToken } = useAdminAuth();
  const toast = useToast();
  const qc = useQueryClient();

  const articleQ = useQuery({
    queryKey: ["article-context", articleId],
    queryFn: async () => {
      const token = await getIdToken();
      if (!token) return null;
      return getArticle(articleId, token);
    },
    staleTime: 5 * 60 * 1000,
  });

  const mut = useMutation({
    mutationFn: async (next: boolean) => {
      const token = await getIdToken();
      if (!token) throw new Error("Not signed in.");
      return patchCommentsEnabled(articleId, next, token);
    },
    onSuccess: (updated) => {
      qc.setQueryData(["article-context", articleId], updated);
      toast.success(
        updated.isCommentsEnabled
          ? "Comments re-enabled on this article."
          : "Comments disabled on this article.",
      );
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Update failed.");
    },
  });

  const enabled = articleQ.data?.isCommentsEnabled;
  const ready = !articleQ.isPending && articleQ.data;

  return (
    <button
      type="button"
      onClick={() => {
        if (!ready) return;
        mut.mutate(!enabled);
      }}
      disabled={!ready || mut.isPending}
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border-[1.5px] font-sans text-[12px]",
        "hover:bg-paper-2 disabled:opacity-50 disabled:cursor-not-allowed",
        enabled
          ? "border-ink text-ink"
          : "border-accent text-accent bg-accent/5",
      )}
      title={
        enabled
          ? "Comments are currently open on this article — click to lock it."
          : "Comments are locked — click to re-open."
      }
    >
      <MessageSquareOff size={12} aria-hidden />
      {ready
        ? enabled
          ? "Disable comments on this article"
          : "Comments locked — enable"
        : "Loading…"}
    </button>
  );
}
