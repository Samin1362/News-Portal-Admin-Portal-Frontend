import { apiFetch } from "./client";
import type { ApiResult } from "@/lib/types/api";
import type { TagDTO } from "@/lib/types/article";

/**
 * GET /api/v1/tags?q= — public read used for tag-input autocomplete.
 * Returns up to 20 best matches (backend sorts + caps).
 */
export async function listTags(q?: string): Promise<TagDTO[]> {
  const path = q
    ? `/api/v1/tags?q=${encodeURIComponent(q)}`
    : "/api/v1/tags";
  const result = await apiFetch<TagDTO[]>(path, { cache: "no-store" });
  return result.data;
}

export interface ListTagsAdminQuery {
  q?: string;
  page?: number;
  limit?: number;
}

/** Admin-side paginated listing for the taxonomy table — uses meta.total. */
export async function listTagsPaginated(
  query: ListTagsAdminQuery = {},
  token?: string,
): Promise<ApiResult<TagDTO[]>> {
  const parts: string[] = [];
  if (query.q) parts.push(`q=${encodeURIComponent(query.q)}`);
  if (query.page) parts.push(`page=${query.page}`);
  if (query.limit) parts.push(`limit=${query.limit}`);
  const suffix = parts.length > 0 ? `?${parts.join("&")}` : "";
  return apiFetch<TagDTO[]>(`/api/v1/tags${suffix}`, {
    token: token ?? null,
    cache: "no-store",
  });
}

export async function createTag(name: string, token: string): Promise<TagDTO> {
  const result = await apiFetch<TagDTO>("/api/v1/tags", {
    method: "POST",
    body: { name },
    token,
    cache: "no-store",
  });
  return result.data;
}

export async function deleteTag(id: string, token: string): Promise<void> {
  await apiFetch<unknown>(`/api/v1/tags/${encodeURIComponent(id)}`, {
    method: "DELETE",
    token,
    cache: "no-store",
  });
}
