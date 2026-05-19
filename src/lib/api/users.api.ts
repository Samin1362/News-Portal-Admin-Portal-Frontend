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
