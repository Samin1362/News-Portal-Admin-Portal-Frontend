import { listQueue } from "./articles.api";
import { listUsers } from "./users.api";
import type {
  AnalyticsSnapshot,
  AnalyticsWindow,
  SignupBucket,
  TopArticle,
  TrafficBucket,
} from "@/lib/types/analytics";
import type { ArticleCardDTO } from "@/lib/types/article";
import type { UserProfile, UserRole } from "@/lib/auth/types";

const DAY_MS = 24 * 60 * 60 * 1000;
const PAGE_LIMIT = 100;
const SIGNUP_FETCH_LIMIT = 200;

/**
 * Pulls everything the /insights/analytics page needs in a single async
 * call. The backend has no dedicated analytics endpoint, so we paginate
 * `/articles/queue?status=published` (capped at 100/page) until we have
 * either every article in the window or 5 pages worth (500 max).
 */
export async function loadAnalyticsSnapshot(
  windowDays: AnalyticsWindow,
  token: string,
): Promise<AnalyticsSnapshot> {
  const articles = await collectPublishedArticles(token);
  const recentUsers = await collectRecentUsers(token);
  return { windowDays, articles, recentUsers };
}

async function collectPublishedArticles(
  token: string,
): Promise<ArticleCardDTO[]> {
  const out: ArticleCardDTO[] = [];
  for (let page = 1; page <= 5; page++) {
    const res = await listQueue(
      { status: "published", page, limit: PAGE_LIMIT },
      token,
    );
    const batch = res.data ?? [];
    out.push(...batch);
    const total = res.meta?.total ?? out.length;
    if (out.length >= total) break;
    if (batch.length < PAGE_LIMIT) break;
  }
  return out;
}

async function collectRecentUsers(token: string): Promise<UserProfile[]> {
  const out: UserProfile[] = [];
  const limit = 100;
  for (let page = 1; page <= Math.ceil(SIGNUP_FETCH_LIMIT / limit); page++) {
    const res = await listUsers({ page, limit }, token);
    const batch = res.data ?? [];
    out.push(...batch);
    const total = res.meta?.total ?? out.length;
    if (out.length >= total) break;
    if (batch.length < limit) break;
  }
  return out.slice(0, SIGNUP_FETCH_LIMIT);
}

// ---- Derivation helpers (pure, exported for testability) ----

export function bucketTrafficByDay(
  articles: ArticleCardDTO[],
  windowDays: AnalyticsWindow,
  now: Date = new Date(),
): TrafficBucket[] {
  const today = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  const buckets: TrafficBucket[] = [];
  for (let i = windowDays - 1; i >= 0; i--) {
    buckets.push({
      date: new Date(today.getTime() - i * DAY_MS),
      views: 0,
      publishedCount: 0,
    });
  }
  for (const article of articles) {
    if (!article.publishedAt) continue;
    const pub = new Date(article.publishedAt);
    const pubDay = Date.UTC(
      pub.getUTCFullYear(),
      pub.getUTCMonth(),
      pub.getUTCDate(),
    );
    const ix = Math.floor((today.getTime() - pubDay) / DAY_MS);
    const slot = windowDays - 1 - ix;
    if (slot < 0 || slot >= windowDays) continue;
    buckets[slot].views += article.viewCount ?? 0;
    buckets[slot].publishedCount += 1;
  }
  return buckets;
}

export function topArticlesByMetric(
  articles: ArticleCardDTO[],
  metric: "viewCount" | "commentCount",
  windowDays: AnalyticsWindow,
  now: Date = new Date(),
): TopArticle[] {
  const cutoff = now.getTime() - windowDays * DAY_MS;
  return articles
    .filter((a) => {
      if (!a.publishedAt) return false;
      return Date.parse(a.publishedAt) >= cutoff;
    })
    .sort((a, b) => (b[metric] ?? 0) - (a[metric] ?? 0))
    .slice(0, 10)
    .map((a) => ({
      id: a.id,
      headline: a.headline,
      slug: a.slug,
      viewCount: a.viewCount,
      commentCount: a.commentCount,
      publishedAt: a.publishedAt,
      categoryId: a.categoryId,
    }));
}

export function bucketSignupsByDay(
  users: UserProfile[],
  windowDays: AnalyticsWindow,
  now: Date = new Date(),
): SignupBucket[] {
  const today = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  const emptyByRole = (): Record<UserRole, number> => ({
    reader: 0,
    journalist: 0,
    editor: 0,
    admin: 0,
  });
  const buckets: SignupBucket[] = [];
  for (let i = windowDays - 1; i >= 0; i--) {
    buckets.push({
      date: new Date(today.getTime() - i * DAY_MS),
      count: 0,
      byRole: emptyByRole(),
    });
  }
  for (const user of users) {
    const created = Date.parse(user.createdAt);
    if (Number.isNaN(created)) continue;
    const createdDay = new Date(created);
    const createdUtc = Date.UTC(
      createdDay.getUTCFullYear(),
      createdDay.getUTCMonth(),
      createdDay.getUTCDate(),
    );
    const ix = Math.floor((today.getTime() - createdUtc) / DAY_MS);
    const slot = windowDays - 1 - ix;
    if (slot < 0 || slot >= windowDays) continue;
    buckets[slot].count += 1;
    buckets[slot].byRole[user.role] += 1;
  }
  return buckets;
}
