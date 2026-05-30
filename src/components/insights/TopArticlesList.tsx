"use client";

import Link from "next/link";
import { Pencil } from "lucide-react";
import { compactCount, formatRelative } from "@/lib/utils/format";
import type { TopArticle } from "@/lib/types/analytics";

interface Props {
  rows: TopArticle[];
  metric: "viewCount" | "commentCount";
}

const METRIC_LABEL: Record<Props["metric"], string> = {
  viewCount: "Views",
  commentCount: "Comments",
};

export function TopArticlesList({ rows, metric }: Props) {
  if (rows.length === 0) {
    return (
      <p className="font-hand text-[12px] text-muted py-6 text-center">
        No published articles in this window.
      </p>
    );
  }

  return (
    <ol className="space-y-1.5">
      {rows.map((row, ix) => (
        <li
          key={row.id}
          className="grid grid-cols-[24px_minmax(0,1fr)_auto] items-center gap-2 px-2 py-1.5 rounded-sm hover:bg-paper-2"
        >
          <span className="serif text-[15px] font-extrabold tabular-nums text-muted">
            {ix + 1}
          </span>
          <div className="min-w-0">
            <Link
              href={`/content/articles/${row.id}/edit`}
              className="font-sans text-[13px] truncate hover:text-accent inline-flex items-center gap-1 max-w-full"
            >
              <span className="truncate">{row.headline}</span>
              <Pencil size={10} aria-hidden className="shrink-0 opacity-50" />
            </Link>
            <p className="font-hand text-[10.5px] text-muted truncate">
              {formatRelative(row.publishedAt)} · {row.slug}
            </p>
          </div>
          <span
            className="font-sans text-[13px] tabular-nums font-semibold text-right"
            title={`${METRIC_LABEL[metric]}: ${row[metric].toLocaleString()}`}
          >
            {compactCount(row[metric])}
          </span>
        </li>
      ))}
    </ol>
  );
}
