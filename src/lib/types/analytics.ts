/**
 * Client-side analytics DTOs. Phase 8 aggregates these from existing
 * endpoints — there is no dedicated `/admin/analytics` route on the
 * backend yet. The shapes here mirror what the per-page widgets need.
 */

import type { ArticleCardDTO } from "./article";
import type { UserProfile, UserRole } from "@/lib/auth/types";

export type AnalyticsWindow = 14 | 30 | 90;

export interface TrafficBucket {
  /** Midnight UTC of the bucket day. */
  date: Date;
  /** Sum of `viewCount` for articles published that day. */
  views: number;
  /** Articles published that day. */
  publishedCount: number;
}

export interface TopArticle {
  id: string;
  headline: string;
  slug: string;
  viewCount: number;
  commentCount: number;
  publishedAt: string | null;
  categoryId: string;
}

export interface SignupBucket {
  date: Date;
  count: number;
  byRole: Record<UserRole, number>;
}

export interface AnalyticsSnapshot {
  windowDays: AnalyticsWindow;
  /** Articles considered for top-10 / traffic computation. */
  articles: ArticleCardDTO[];
  /** Most recent N users used for the sign-ups chart. */
  recentUsers: UserProfile[];
}
