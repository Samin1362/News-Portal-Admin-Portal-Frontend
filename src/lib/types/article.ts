/**
 * Mirrors the backend's article DTOs (backend/src/views/article.view.ts).
 * Keep in sync whenever the backend contract changes.
 */

export interface ArticleMediaItem {
  url: string;
  publicId: string;
  alt?: string;
  caption?: string;
}

export interface ArticleVideoItem {
  url: string;
  publicId: string;
  thumbnail?: string;
  caption?: string;
}

export interface ArticleSeo {
  title: string;
  description: string;
  ogImage: string | null;
  canonicalUrl: string | null;
  keywords: string[];
}

export type ArticleStatus =
  | "draft"
  | "submitted"
  | "under_review"
  | "approved"
  | "published"
  | "rejected"
  | "archived";

export interface ArticleCardDTO {
  id: string;
  headline: string;
  slug: string;
  summary: string;
  authorId: string;
  categoryId: string;
  tags: string[];
  featuredImage: ArticleMediaItem | null;
  status: ArticleStatus;
  isBreaking: boolean;
  isFeatured: boolean;
  isTrending: boolean;
  publishedAt: string | null;
  scheduledAt: string | null;
  viewCount: number;
  commentCount: number;
  shareCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface HistoryDTO {
  action: string;
  by: string | null;
  at: string;
  note?: string;
}

export interface ArticleFullDTO extends ArticleCardDTO {
  content: string;
  gallery: ArticleMediaItem[];
  videos: ArticleVideoItem[];
  rejectionReason: string | null;
  reviewerId: string | null;
  approverId: string | null;
  history: HistoryDTO[];
  seo: ArticleSeo;
  recentViews: number;
  isCommentsEnabled: boolean;
}

/** Used by TagInput autocomplete suggestions. */
export interface TagDTO {
  id: string;
  name: string;
  slug: string;
}
