import { apiFetch } from "./client";
import type { ApiResult } from "@/lib/types/api";
import type { RoleRequestDTO, RoleRequestStatus } from "@/lib/types/roleRequest";

export interface ListRoleRequestsQuery {
  status?: RoleRequestStatus;
  page?: number;
  limit?: number;
}

function qs(q: ListRoleRequestsQuery): string {
  const parts: string[] = [];
  if (q.status) parts.push(`status=${encodeURIComponent(q.status)}`);
  if (q.page) parts.push(`page=${q.page}`);
  if (q.limit) parts.push(`limit=${q.limit}`);
  return parts.length > 0 ? `?${parts.join("&")}` : "";
}

export async function listRoleRequests(
  query: ListRoleRequestsQuery,
  token: string,
): Promise<ApiResult<RoleRequestDTO[]>> {
  return apiFetch<RoleRequestDTO[]>(`/api/v1/role-requests${qs(query)}`, {
    token,
    cache: "no-store",
  });
}

export async function getRoleRequest(
  id: string,
  token: string,
): Promise<RoleRequestDTO> {
  const result = await apiFetch<RoleRequestDTO>(`/api/v1/role-requests/${id}`, {
    token,
    cache: "no-store",
  });
  return result.data;
}

export async function approveRoleRequest(
  id: string,
  token: string,
): Promise<RoleRequestDTO> {
  const result = await apiFetch<RoleRequestDTO>(
    `/api/v1/role-requests/${id}/approve`,
    { method: "PATCH", token },
  );
  return result.data;
}

export async function rejectRoleRequest(
  id: string,
  reason: string,
  token: string,
): Promise<RoleRequestDTO> {
  const result = await apiFetch<RoleRequestDTO>(
    `/api/v1/role-requests/${id}/reject`,
    {
      method: "PATCH",
      token,
      body: { reason },
    },
  );
  return result.data;
}
