import { apiFetch } from "./client";
import type { PaginationMeta } from "@/lib/types/api";
import type {
  MediaDTO,
  MediaType,
  RegisterMediaBody,
} from "@/lib/types/media";

export interface ListMediaQuery {
  type?: MediaType;
  articleId?: string;
  unattached?: boolean;
  page?: number;
  limit?: number;
}

function qs(query: ListMediaQuery): string {
  const parts: string[] = [];
  if (query.type) parts.push(`type=${encodeURIComponent(query.type)}`);
  if (query.articleId)
    parts.push(`articleId=${encodeURIComponent(query.articleId)}`);
  if (query.unattached !== undefined)
    parts.push(`unattached=${query.unattached ? "true" : "false"}`);
  if (query.page) parts.push(`page=${query.page}`);
  if (query.limit) parts.push(`limit=${query.limit}`);
  return parts.length > 0 ? `?${parts.join("&")}` : "";
}

export interface PaginatedMedia {
  items: MediaDTO[];
  meta?: PaginationMeta;
}

export async function listMine(
  query: ListMediaQuery,
  token: string,
): Promise<PaginatedMedia> {
  const result = await apiFetch<MediaDTO[]>(`/api/v1/media/me${qs(query)}`, {
    token,
    cache: "no-store",
  });
  return { items: result.data, meta: result.meta };
}

export async function registerMedia(
  body: RegisterMediaBody,
  token: string,
): Promise<MediaDTO> {
  const result = await apiFetch<MediaDTO>("/api/v1/media", {
    method: "POST",
    body,
    token,
    cache: "no-store",
  });
  return result.data;
}
