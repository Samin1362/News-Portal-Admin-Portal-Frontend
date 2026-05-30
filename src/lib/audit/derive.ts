/**
 * Derive audit entries from article `history[]` payloads. Each article
 * history record becomes one audit entry tagged `source: "derived"`. The
 * caller fans out a /articles/queue page for each of a couple of statuses,
 * pipes the full `ArticleFullDTO[]` here, and gets back a flat list.
 *
 * Article cards (`ArticleCardDTO`) don't include `history[]`, so the
 * caller must use the full DTO from `getArticle` — or accept that the
 * /insights/audit page only shows derived entries for articles the user
 * has clicked into. To keep this simple v1, the page hydrates derived
 * entries from `article.publishedAt` / `updatedAt` alone (mirror of the
 * overview AuditFeed) and lets the IndexedDB log carry richer detail.
 */

import type { ArticleCardDTO } from "@/lib/types/article";
import type { AuditEntry } from "./types";

export function deriveFromArticles(articles: ArticleCardDTO[]): AuditEntry[] {
  const out: AuditEntry[] = [];
  for (const article of articles) {
    if (article.publishedAt) {
      out.push({
        id: `derived:${article.id}:publish:${article.publishedAt}`,
        action: "article-publish",
        actorId: null,
        actorName: null,
        targetId: article.id,
        summary: `Published "${article.headline}"`,
        detail: article.slug,
        source: "derived",
        at: article.publishedAt,
      });
    }
    if (article.scheduledAt) {
      out.push({
        id: `derived:${article.id}:schedule:${article.scheduledAt}`,
        action: "article-schedule",
        actorId: null,
        actorName: null,
        targetId: article.id,
        summary: `Scheduled "${article.headline}"`,
        detail: article.slug,
        source: "derived",
        at: article.scheduledAt,
      });
    }
  }
  return out;
}
