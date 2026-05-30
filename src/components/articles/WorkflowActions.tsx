"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  approveArticle,
  archiveArticle,
  publishArticle,
  rejectArticle,
  startReview,
  submitArticle,
  unarchiveArticle,
} from "@/lib/api/articles.api";
import { Btn } from "@/components/primitives/Btn";
import { useAdminAuth } from "@/lib/auth/AdminAuthProvider";
import { useToast } from "@/lib/ui/toast";
import { useAuditRecorder } from "@/lib/audit/useAuditRecorder";
import type { ArticleFullDTO } from "@/lib/types/article";
import type { AuditAction } from "@/lib/audit/types";
import { cn } from "@/lib/utils/cn";

interface Props {
  article: ArticleFullDTO;
  onUpdated?: (next: ArticleFullDTO) => void;
  /**
   * Variant controls which buttons render:
   *  - "edit"   → full set + danger publish-from-anywhere
   *  - "queue"  → editor-style approve/reject/publish, plus Take over + Force publish.
   */
  variant?: "edit" | "queue";
}

type Action =
  | "submit"
  | "start-review"
  | "approve"
  | "reject"
  | "publish"
  | "archive"
  | "unarchive";

const LABELS: Record<Action, string> = {
  submit: "Submit",
  "start-review": "Take over",
  approve: "Approve",
  reject: "Reject",
  publish: "Publish",
  archive: "Archive",
  unarchive: "Unarchive",
};

const AUDIT_FOR_ACTION: Record<Action, AuditAction> = {
  submit: "article-submit",
  "start-review": "article-start-review",
  approve: "article-approve",
  reject: "article-reject",
  publish: "article-publish",
  archive: "article-archive",
  unarchive: "article-unarchive",
};

export function WorkflowActions({ article, onUpdated, variant = "edit" }: Props) {
  const { getIdToken } = useAdminAuth();
  const toast = useToast();
  const qc = useQueryClient();
  const recordAudit = useAuditRecorder();
  const [pending, setPending] = useState<Action | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState("");

  const run = useMutation({
    mutationFn: async (action: Action) => {
      const token = await getIdToken();
      if (!token) throw new Error("Not signed in.");
      switch (action) {
        case "submit":
          return submitArticle(article.id, token);
        case "start-review":
          return startReview(article.id, token);
        case "approve":
          return approveArticle(article.id, token);
        case "publish":
          return publishArticle(article.id, token);
        case "archive":
          return archiveArticle(article.id, token);
        case "unarchive":
          return unarchiveArticle(article.id, token);
        case "reject":
          return rejectArticle(article.id, reason.trim(), token);
      }
    },
    onSuccess: (updated, action) => {
      qc.setQueryData(["article", article.id], updated);
      qc.invalidateQueries({ queryKey: ["articles"] });
      qc.invalidateQueries({ queryKey: ["queue"] });
      onUpdated?.(updated);
      if (updated) {
        recordAudit({
          action: AUDIT_FOR_ACTION[action],
          targetId: updated.id,
          summary: `${LABELS[action]} → "${updated.headline}"`,
          detail: action === "reject" && reason ? reason.trim() : updated.slug,
        });
      }
      toast.success("Done.");
      setRejectOpen(false);
      setReason("");
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Action failed.");
    },
    onSettled: () => setPending(null),
  });

  const trigger = (action: Action) => {
    if (action === "reject") {
      setRejectOpen(true);
      return;
    }
    setPending(action);
    run.mutate(action);
  };

  const onRejectSubmit = () => {
    const trimmed = reason.trim();
    if (trimmed.length < 5) {
      toast.error("Reason must be at least 5 characters.");
      return;
    }
    setPending("reject");
    run.mutate("reject");
  };

  // Compose action set per status. Admin gets the full set regardless of
  // backend gating since the backend bypasses status-asserts for admin role.
  const actions: Action[] = (() => {
    switch (article.status) {
      case "draft":
        return ["submit", "publish"];
      case "submitted":
        return ["start-review", "approve", "reject", "publish"];
      case "under_review":
        return ["approve", "reject", "publish"];
      case "approved":
        return ["publish", "reject"];
      case "rejected":
        return ["submit", "publish"];
      case "published":
        return ["archive"];
      case "archived":
        return ["unarchive"];
      default:
        return [];
    }
  })();

  return (
    <>
      <div className={cn("flex flex-wrap items-center gap-2")}>
        {actions.map((action) => {
          const isDanger = action === "reject" || action === "publish";
          const isBusy = pending === action;
          // In the queue variant, surface Force-publish copy for non-approved publishes.
          const label =
            variant === "queue" &&
            action === "publish" &&
            article.status !== "approved"
              ? "Force publish"
              : LABELS[action];
          return (
            <Btn
              key={action}
              type="button"
              variant={isDanger ? "primary" : "default"}
              size="sm"
              onClick={() => trigger(action)}
              disabled={isBusy}
            >
              {isBusy ? "…" : label}
            </Btn>
          );
        })}
      </div>

      {rejectOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[70] flex items-center justify-center px-4 bg-ink/45 backdrop-blur-[2px]"
        >
          <div className="w-full max-w-md bg-paper border-[1.5px] border-ink rounded-sm shadow-[6px_6px_0_var(--color-ink)] p-5 space-y-3">
            <h3 className="serif text-[18px] font-extrabold tracking-tight">
              Reject article
            </h3>
            <p className="font-hand text-[11px] text-muted">
              The reason is sent verbatim to the author. Be specific so they
              can fix and resubmit.
            </p>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={5}
              maxLength={1000}
              placeholder="What needs to change before this can publish?"
              className="w-full border-[1.5px] border-ink rounded-sm bg-paper px-3 py-2 font-sans text-[14px] resize-y focus:outline-none focus:ring-2 focus:ring-accent/30"
            />
            <p className="font-hand text-[10px] text-muted text-right">
              {reason.length} / 1000
            </p>
            <div className="flex items-center justify-end gap-2">
              <Btn
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setRejectOpen(false);
                  setReason("");
                }}
                disabled={pending === "reject"}
              >
                Cancel
              </Btn>
              <Btn
                type="button"
                variant="primary"
                size="sm"
                onClick={onRejectSubmit}
                disabled={pending === "reject" || reason.trim().length < 5}
              >
                {pending === "reject" ? "Rejecting…" : "Reject"}
              </Btn>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
