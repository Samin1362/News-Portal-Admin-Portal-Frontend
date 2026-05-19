"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardHead, CardTitle, CardMeta } from "@/components/primitives/Card";
import { useAdminAuth } from "@/lib/auth/AdminAuthProvider";
import { listQueue } from "@/lib/api/articles.api";
import { formatRelative } from "@/lib/utils/format";
import type { ArticleCardDTO } from "@/lib/types/article";
import { cn } from "@/lib/utils/cn";

interface FeedEntry {
  id: string;
  kind: "article" | "system";
  title: string;
  detail: string;
  at: string;
}

const KIND_DOT: Record<FeedEntry["kind"], string> = {
  article: "bg-accent",
  system: "bg-accent-2",
};

const PRETTY_ACTION: Record<string, string> = {
  submit: "submitted",
  "start-review": "started review",
  approve: "approved",
  reject: "rejected",
  publish: "published",
  schedule: "scheduled",
  archive: "archived",
  unarchive: "unarchived",
  create: "drafted",
  update: "edited",
  flags: "flagged",
  "comments-enabled": "toggled comments",
};

function synthesise(articles: ArticleCardDTO[]): FeedEntry[] {
  // Article-level events: derive from publishedAt / updatedAt as a thin
  // proxy until the backend ships an /admin/audit-log collection.
  const entries: FeedEntry[] = [];
  for (const a of articles) {
    if (a.publishedAt) {
      entries.push({
        id: `${a.id}-pub`,
        kind: "article",
        title: PRETTY_ACTION.publish,
        detail: a.headline,
        at: a.publishedAt,
      });
    } else {
      entries.push({
        id: `${a.id}-upd`,
        kind: "article",
        title: PRETTY_ACTION.update,
        detail: a.headline,
        at: a.updatedAt,
      });
    }
  }
  entries.sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
  return entries.slice(0, 10);
}

export function AuditFeed() {
  const { getIdToken, role } = useAdminAuth();
  const enabled = role === "admin";

  const q = useQuery({
    enabled,
    queryKey: ["overview", "audit-feed"],
    queryFn: async () => {
      const token = await getIdToken();
      if (!token) return [] as ArticleCardDTO[];
      const result = await listQueue(
        { status: "submitted", page: 1, limit: 20 },
        token,
      );
      const submitted = result.data ?? [];
      const publishedRes = await listQueue(
        { status: "published", page: 1, limit: 20 },
        token,
      );
      return [...submitted, ...(publishedRes.data ?? [])];
    },
    staleTime: 60_000,
  });

  const entries = useMemo(() => synthesise(q.data ?? []), [q.data]);

  return (
    <Card hov>
      <CardHead>
        <CardTitle>Audit feed</CardTitle>
        <CardMeta>derived · §0a will surface email + role events</CardMeta>
      </CardHead>

      {q.isPending && enabled ? (
        <ul className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <li
              key={i}
              className="h-8 bg-paper-2 rounded-sm animate-pulse"
              aria-hidden
            />
          ))}
        </ul>
      ) : entries.length === 0 ? (
        <p className="font-hand text-[12px] text-muted">No recent activity.</p>
      ) : (
        <ul className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
          {entries.map((entry) => (
            <li key={entry.id} className="flex items-start gap-2.5 text-[12.5px]">
              <span
                className={cn("mt-1 inline-block w-2 h-2 rounded-full shrink-0", KIND_DOT[entry.kind])}
                aria-hidden
              />
              <div className="min-w-0 flex-1">
                <p className="font-sans truncate">
                  <span className="font-semibold capitalize">{entry.title}</span>{" "}
                  <span className="text-ink/80">{entry.detail}</span>
                </p>
                <p className="font-hand text-[10.5px] text-muted">
                  {formatRelative(entry.at)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
