"use client";

import { useState } from "react";
import { Check, Flag, Trash2, X } from "lucide-react";
import { Avatar } from "@/components/primitives/Avatar";
import { Pill } from "@/components/primitives/Pill";
import { Btn } from "@/components/primitives/Btn";
import { CommentStatusPill } from "./StatusPill";
import { ArticleContextCell } from "./ArticleContextCell";
import { formatRelative } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import type { ModerationCommentDTO } from "@/lib/types/comment";

export interface CommentRowProps {
  comment: ModerationCommentDTO;
  selected: boolean;
  focused: boolean;
  isAdmin: boolean;
  busy: boolean;
  onToggleSelect: (e: React.MouseEvent) => void;
  onOpen: () => void;
  onApprove: () => void;
  onReject: () => void;
  onDelete: () => void;
}

export function CommentRow({
  comment,
  selected,
  focused,
  isAdmin,
  busy,
  onToggleSelect,
  onOpen,
  onApprove,
  onReject,
  onDelete,
}: CommentRowProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <li
      data-comment-id={comment.id}
      className={cn(
        "flex items-start gap-3 py-3 pl-2 pr-2 rounded-sm row-hov",
        focused && "outline outline-2 outline-offset-[-2px] outline-accent",
        selected && "bg-paper-2",
      )}
    >
      <label
        className="pt-1.5 shrink-0 cursor-pointer"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          type="checkbox"
          checked={selected}
          onClick={onToggleSelect}
          onChange={() => {
            /* handled in onClick to preserve shift state */
          }}
          className="accent-accent w-4 h-4 align-middle"
          aria-label={selected ? "Deselect comment" : "Select comment"}
        />
      </label>

      <Avatar
        name={comment.author?.displayName ?? "Deleted"}
        src={comment.author?.photoURL ?? null}
        size="sm"
        tone="ink"
      />

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5 mb-1">
          <button
            type="button"
            onClick={onOpen}
            className="font-sans text-[13px] font-semibold text-ink hover:text-accent text-left"
          >
            {comment.author?.displayName ?? "[deleted user]"}
          </button>
          <CommentStatusPill status={comment.status} />
          {comment.reportCount > 0 ? (
            <Pill tone="accent">
              <Flag size={10} aria-hidden className="mr-0.5" />
              {comment.reportCount} report{comment.reportCount === 1 ? "" : "s"}
            </Pill>
          ) : null}
        </div>

        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className={cn(
            "block text-left font-sans text-[13px] text-ink whitespace-pre-wrap w-full",
            !expanded && "line-clamp-3",
          )}
          aria-expanded={expanded}
          aria-label={expanded ? "Collapse comment" : "Expand comment"}
        >
          {comment.content}
        </button>

        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted font-hand min-w-0">
          <span className="shrink-0">on</span>
          <span className="min-w-0 max-w-full truncate">
            <ArticleContextCell articleId={comment.articleId} />
          </span>
          <span aria-hidden>·</span>
          <span>{formatRelative(comment.createdAt)}</span>
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0 pt-1">
        {comment.status !== "approved" ? (
          <Btn
            size="sm"
            variant="default"
            onClick={onApprove}
            disabled={busy}
            title="Approve (a)"
          >
            <Check size={12} aria-hidden />
            Approve
          </Btn>
        ) : null}
        {comment.status !== "rejected" ? (
          <Btn
            size="sm"
            variant="ghost"
            onClick={onReject}
            disabled={busy}
            title="Reject (r)"
          >
            <X size={12} aria-hidden />
            Reject
          </Btn>
        ) : null}
        <Btn
          size="sm"
          variant="ghost"
          onClick={onDelete}
          disabled={busy || !isAdmin}
          title={isAdmin ? "Hard delete (d)" : "Admin-only — editors can't hard-delete"}
          className="text-accent hover:bg-accent/10"
        >
          <Trash2 size={12} aria-hidden />
        </Btn>
      </div>
    </li>
  );
}
