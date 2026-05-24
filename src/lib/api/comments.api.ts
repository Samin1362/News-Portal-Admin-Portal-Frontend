import { apiFetch } from "./client";
import type { ApiResult } from "@/lib/types/api";
import type {
  CommentFilterStatus,
  CommentStatus,
  ModerationCommentDTO,
} from "@/lib/types/comment";

export interface ListAdminCommentsQuery {
  status?: CommentFilterStatus;
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

/**
 * Admin-only hard delete. Backend gates this with `requireRole('admin')` —
 * editors calling it get 403.
 */
export async function deleteComment(id: string, token: string): Promise<void> {
  await apiFetch<unknown>(`/api/v1/admin/comments/${encodeURIComponent(id)}`, {
    method: "DELETE",
    token,
    cache: "no-store",
  });
}

/**
 * Client-side "All statuses" aggregator. The deployed backend (pre-Phase-5
 * redeploy) doesn't accept `status=all` — it 400s. To avoid blocking the
 * admin UI on a deploy, we fan-out to the three concrete statuses in
 * parallel, merge by `createdAt` desc, slice for the requested page, and
 * synthesise a paginated envelope from the three `meta.total`s.
 *
 * Backend pagination cap is 100 per request, so very deep pages on the
 * "All" tab may return fewer than `limit` items — fine for an admin tool
 * that typically reviews recent activity.
 */
export async function listAllStatusesAggregate(
  query: { page: number; limit: number; reported?: boolean },
  token: string,
): Promise<ApiResult<ModerationCommentDTO[]>> {
  const statuses: CommentStatus[] = ["pending", "approved", "rejected"];
  const fetchLimit = Math.min(100, Math.max(query.limit, query.page * query.limit));
  const results = await Promise.all(
    statuses.map((s) =>
      listAdminComments(
        {
          status: s,
          reported: query.reported,
          page: 1,
          limit: fetchLimit,
        },
        token,
      ),
    ),
  );
  const merged = results
    .flatMap((r) => r.data)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  const total = results.reduce((sum, r) => sum + (r.meta?.total ?? 0), 0);
  const skip = (query.page - 1) * query.limit;
  const sliced = merged.slice(skip, skip + query.limit);
  const totalPages = Math.max(1, Math.ceil(total / query.limit));
  return {
    data: sliced,
    meta: { page: query.page, limit: query.limit, total, totalPages },
  };
}
