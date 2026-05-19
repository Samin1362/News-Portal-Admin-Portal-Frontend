import { apiFetch } from "./client";
import type { ApiResult } from "@/lib/types/api";
import type { CommentStatus, ModerationCommentDTO } from "@/lib/types/comment";

export interface ListAdminCommentsQuery {
  status?: CommentStatus;
  reported?: boolean;
  page?: number;
  limit?: number;
}

function qs(query: ListAdminCommentsQuery): string {
  const parts: string[] = [];
  if (query.status) parts.push(`status=${encodeURIComponent(query.status)}`);
  if (typeof query.reported === "boolean")
    parts.push(`reported=${query.reported ? "true" : "false"}`);
  if (query.page) parts.push(`page=${query.page}`);
  if (query.limit) parts.push(`limit=${query.limit}`);
  return parts.length > 0 ? `?${parts.join("&")}` : "";
}

export async function listAdminComments(
  query: ListAdminCommentsQuery,
  token: string,
): Promise<ApiResult<ModerationCommentDTO[]>> {
  return apiFetch<ModerationCommentDTO[]>(`/api/v1/admin/comments${qs(query)}`, {
    token,
    cache: "no-store",
  });
}

export async function approveComment(id: string, token: string): Promise<void> {
  await apiFetch<unknown>(`/api/v1/comments/${encodeURIComponent(id)}/approve`, {
    method: "PATCH",
    token,
    cache: "no-store",
  });
}

export async function rejectComment(id: string, token: string): Promise<void> {
  await apiFetch<unknown>(`/api/v1/comments/${encodeURIComponent(id)}/reject`, {
    method: "PATCH",
    token,
    cache: "no-store",
  });
}
