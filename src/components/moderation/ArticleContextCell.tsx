"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink } from "lucide-react";
import { getArticle } from "@/lib/api/articles.api";
import { useAdminAuth } from "@/lib/auth/AdminAuthProvider";

interface Props {
  articleId: string;
  /** When true, render an "open public article" trailing icon link. */
  withOpenLink?: boolean;
}

/**
 * Lazy article headline lookup keyed by ID. TanStack dedupes identical queries
 * so a 20-row page where the same article appears five times only hits
 * `/articles/:id` once. 5min stale.
 */
export function ArticleContextCell({ articleId, withOpenLink }: Props) {
  const { getIdToken } = useAdminAuth();
  const q = useQuery({
    queryKey: ["article-context", articleId],
    queryFn: async () => {
      const token = await getIdToken();
      if (!token) return null;
      return getArticle(articleId, token);
    },
    staleTime: 5 * 60 * 1000,
  });

  if (q.isPending) {
    return <span className="font-hand text-[11px] text-muted">loading…</span>;
  }
  if (!q.data) {
    return (
      <span
        className="font-hand text-[11px] text-muted truncate"
        title={articleId}
      >
        Article unavailable
      </span>
    );
  }

  const headline = q.data.headline;
  const slug = q.data.slug;

  return (
    <span className="inline-flex items-center gap-1 min-w-0">
      <Link
        href={`/content/articles/${articleId}/edit`}
        className="font-sans text-[12.5px] text-ink hover:text-accent truncate"
        title={headline}
      >
        {headline}
      </Link>
      {withOpenLink && slug ? (
        <a
          href={`/article/${slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-muted hover:text-accent shrink-0"
          title="Open public article"
          aria-label="Open public article"
        >
          <ExternalLink size={12} aria-hidden />
        </a>
      ) : null}
    </span>
  );
}
