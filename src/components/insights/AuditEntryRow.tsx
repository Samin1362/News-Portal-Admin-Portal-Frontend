"use client";

import { formatRelative } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import { AUDIT_ACTION_LABEL, type AuditEntry } from "@/lib/audit/types";

interface Props {
  entry: AuditEntry;
}

const DOT_BY_ACTION: Record<string, string> = {
  "role-change": "bg-accent",
  "role-request-approve": "bg-accent-2",
  "role-request-reject": "bg-accent",
  "user-block": "bg-accent",
  "user-unblock": "bg-accent-2",
  "user-delete": "bg-accent",
  "article-publish": "bg-accent-2",
  "article-reject": "bg-accent",
  "article-delete": "bg-accent",
  "comment-delete": "bg-accent",
  "comment-reject": "bg-[color:var(--color-warn)]",
  "comment-approve": "bg-accent-2",
  "ad-toggle": "bg-[color:var(--color-info)]",
};

function dotClass(action: AuditEntry["action"]): string {
  return DOT_BY_ACTION[action] ?? "bg-ink";
}

export function AuditEntryRow({ entry }: Props) {
  return (
    <li className="grid grid-cols-[14px_minmax(0,1fr)_auto] gap-2.5 items-start py-2 border-b border-ink/10 last:border-b-0">
      <span
        className={cn(
          "mt-1.5 inline-block w-2.5 h-2.5 rounded-full shrink-0",
          dotClass(entry.action),
        )}
        aria-hidden
      />
      <div className="min-w-0">
        <p className="font-sans text-[13px]">
          <span className="font-semibold">
            {AUDIT_ACTION_LABEL[entry.action]}
          </span>{" "}
          — <span className="text-ink/80">{entry.summary}</span>
        </p>
        <p className="font-hand text-[11px] text-muted mt-0.5">
          {entry.actorName ? <span>by {entry.actorName} · </span> : null}
          {formatRelative(entry.at)}
          {entry.source === "derived" ? <span> · derived</span> : null}
          {entry.detail ? (
            <>
              {" · "}
              <span className="text-ink/70">{entry.detail}</span>
            </>
          ) : null}
        </p>
      </div>
      <span className="font-mono text-[10.5px] text-muted text-right whitespace-nowrap">
        {new Date(entry.at).toLocaleString("en-GB", {
          day: "2-digit",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        })}
      </span>
    </li>
  );
}
