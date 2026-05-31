import { apiFetch } from "./client";
import type { ApiResult } from "@/lib/types/api";
import type { UserProfile, UserRole } from "@/lib/auth/types";

export interface ListUsersQuery {
  role?: UserRole;
  q?: string;
  page?: number;
  limit?: number;
}

function qs(query: ListUsersQuery): string {
  const parts: string[] = [];
  if (query.role) parts.push(`role=${encodeURIComponent(query.role)}`);
  if (query.q) parts.push(`q=${encodeURIComponent(query.q)}`);
  if (query.page) parts.push(`page=${query.page}`);
  if (query.limit) parts.push(`limit=${query.limit}`);
  return parts.length > 0 ? `?${parts.join("&")}` : "";
}

export async function listUsers(
  query: ListUsersQuery,
  token: string,
): Promise<ApiResult<UserProfile[]>> {
  return apiFetch<UserProfile[]>(`/api/v1/users${qs(query)}`, {
    token,
    cache: "no-store",
  });
}

export async function getUser(
  id: string,
  token: string,
): Promise<UserProfile> {
  const result = await apiFetch<UserProfile>(`/api/v1/users/${id}`, {
    token,
    cache: "no-store",
  });
  return result.data;
}

export async function patchUserRole(
  id: string,
  role: UserRole,
  token: string,
): Promise<UserProfile> {
  const result = await apiFetch<UserProfile>(`/api/v1/users/${id}/role`, {
    method: "PATCH",
    token,
    body: { role },
  });
  return result.data;
}

export async function patchUserBlocked(
  id: string,
  isBlocked: boolean,
  token: string,
): Promise<UserProfile> {
  const result = await apiFetch<UserProfile>(`/api/v1/users/${id}/block`, {
    method: "PATCH",
    token,
    body: { isBlocked },
  });
  return result.data;
}

export async function patchUserCommentBlocked(
  id: string,
  isCommentBlocked: boolean,
  token: string,
): Promise<UserProfile> {
  const result = await apiFetch<UserProfile>(
    `/api/v1/users/${id}/comment-block`,
    {
      method: "PATCH",
      token,
      body: { isCommentBlocked },
    },
  );
  return result.data;
}

export async function deleteUser(id: string, token: string): Promise<void> {
  await apiFetch<void>(`/api/v1/users/${id}`, {
    method: "DELETE",
    token,
  });
}

export interface UpdateMeBody {
  displayName?: string;
  bio?: string;
  photoURL?: string | null;
}

export async function updateMe(
  body: UpdateMeBody,
  token: string,
): Promise<UserProfile> {
  const payload: Record<string, unknown> = {};
  if (body.displayName !== undefined) payload.displayName = body.displayName;
  if (body.bio !== undefined) payload.bio = body.bio;
  if (body.photoURL !== undefined) payload.photoURL = body.photoURL ?? "";
  const result = await apiFetch<UserProfile>(`/api/v1/users/me`, {
    method: "PATCH",
    token,
    body: payload,
  });
  return result.data;
}
