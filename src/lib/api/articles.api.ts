import { apiFetch, ApiError } from "./client";
import type { ApiResult } from "@/lib/types/api";
import type {
  ArticleCardDTO,
  ArticleFullDTO,
  ArticleMediaItem,
  ArticleSeo,
  ArticleStatus,
  ArticleVideoItem,
} from "@/lib/types/article";

/**
 * Statuses that `/articles/queue` accepts as a filter. Mirrors the backend
 * `queueQuerySchema`. `'all'` returns every status with no filter applied,
 * which is what the admin's All-articles table sends.
 */
export type QueueStatus = ArticleStatus | "all";

export interface QueueQuery {
  status?: QueueStatus;
  page?: number;
  limit?: number;
}

function qsQueue(query: QueueQuery): string {
  const parts: string[] = [];
  if (query.status) parts.push(`status=${encodeURIComponent(query.status)}`);
  if (query.page) parts.push(`page=${query.page}`);
  if (query.limit) parts.push(`limit=${query.limit}`);
  return parts.length > 0 ? `?${parts.join("&")}` : "";
}

export async function listQueue(
  query: QueueQuery,
  token: string,
): Promise<ApiResult<ArticleCardDTO[]>> {
  return apiFetch<ArticleCardDTO[]>(`/api/v1/articles/queue${qsQueue(query)}`, {
    token,
    cache: "no-store",
  });
}

/**
 * Admin all-articles list. Passes the filter through to `/articles/queue`
 * directly — backend supports every `ArticleStatus` plus `'all'` after the
 * Phase 4 follow-up extension to `queueQuerySchema`.
 */
export async function listAllArticles(
  query: { status: ArticleStatus | "all"; page?: number; limit?: number },
  token: string,
): Promise<ApiResult<ArticleCardDTO[]>> {
  return listQueue(
    { status: query.status, page: query.page, limit: query.limit },
    token,
  );
}

export async function getArticle(
  id: string,
  token: string,
): Promise<ArticleFullDTO | null> {
  try {
    const result = await apiFetch<ArticleFullDTO>(
      `/api/v1/articles/${encodeURIComponent(id)}`,
      { token, cache: "no-store" },
    );
    return result.data;
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

export interface UpdateArticleBody {
  headline?: string;
  summary?: string;
  content?: string;
  categoryId?: string;
  tags?: string[];
  featuredImage?: ArticleMediaItem | null;
  gallery?: ArticleMediaItem[];
  videos?: ArticleVideoItem[];
  seo?: Partial<ArticleSeo>;
  isCommentsEnabled?: boolean;
}

export async function updateArticle(
  id: string,
  body: UpdateArticleBody,
  token: string,
): Promise<ArticleFullDTO> {
  const result = await apiFetch<ArticleFullDTO>(
    `/api/v1/articles/${encodeURIComponent(id)}`,
    { method: "PATCH", body, token, cache: "no-store" },
  );
  return result.data;
}

export async function deleteArticle(id: string, token: string): Promise<void> {
  await apiFetch<unknown>(`/api/v1/articles/${encodeURIComponent(id)}`, {
    method: "DELETE",
    token,
    cache: "no-store",
  });
}

// ---- Workflow transitions ----
// Admin bypasses the workflow status-check guards on the backend, so calling
// `publish` on a `submitted` article force-publishes it.

async function postWorkflow(
  id: string,
  action: string,
  token: string,
  body?: unknown,
): Promise<ArticleFullDTO> {
  const result = await apiFetch<ArticleFullDTO>(
    `/api/v1/articles/${encodeURIComponent(id)}/${action}`,
    { method: "POST", body, token, cache: "no-store" },
  );
  return result.data;
}

export const submitArticle = (id: string, token: string) =>
  postWorkflow(id, "submit", token);
export const startReview = (id: string, token: string) =>
  postWorkflow(id, "start-review", token);
export const approveArticle = (id: string, token: string) =>
  postWorkflow(id, "approve", token);
export const rejectArticle = (id: string, reason: string, token: string) =>
  postWorkflow(id, "reject", token, { reason });
export const publishArticle = (id: string, token: string) =>
  postWorkflow(id, "publish", token);
export const scheduleArticle = (id: string, scheduledAt: string, token: string) =>
  postWorkflow(id, "schedule", token, { scheduledAt });
export const archiveArticle = (id: string, token: string) =>
  postWorkflow(id, "archive", token);
export const unarchiveArticle = (id: string, token: string) =>
  postWorkflow(id, "unarchive", token);

// ---- Flags ----

export interface FlagsBody {
  isBreaking?: boolean;
  isFeatured?: boolean;
  isTrending?: boolean;
}

export async function patchFlags(
  id: string,
  body: FlagsBody,
  token: string,
): Promise<ArticleFullDTO> {
  const result = await apiFetch<ArticleFullDTO>(
    `/api/v1/articles/${encodeURIComponent(id)}/flags`,
    { method: "PATCH", body, token, cache: "no-store" },
  );
  return result.data;
}

// ---- Comments enabled toggle (routed under /articles in comment.routes.ts) ----

export async function patchCommentsEnabled(
  id: string,
  isCommentsEnabled: boolean,
  token: string,
): Promise<ArticleFullDTO> {
  const result = await apiFetch<ArticleFullDTO>(
    `/api/v1/articles/${encodeURIComponent(id)}/comments-enabled`,
    {
      method: "PATCH",
      body: { isCommentsEnabled },
      token,
      cache: "no-store",
    },
  );
  return result.data;
}
