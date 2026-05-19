import { apiFetch } from "./client";
import type { ApiResult } from "@/lib/types/api";
import type { ArticleCardDTO, ArticleStatus } from "@/lib/types/article";

export interface QueueQuery {
  status?: Extract<
    ArticleStatus,
    "submitted" | "under_review" | "approved" | "rejected" | "published"
  >;
  page?: number;
  limit?: number;
}

function qs(query: QueueQuery): string {
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
  return apiFetch<ArticleCardDTO[]>(`/api/v1/articles/queue${qs(query)}`, {
    token,
    cache: "no-store",
  });
}
