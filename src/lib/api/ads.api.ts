import { apiFetch } from "./client";
import type { ApiResult } from "@/lib/types/api";
import type { AdminAdDTO, AdPlacement } from "@/lib/types/ad";

export interface ListAdsQuery {
  placement?: AdPlacement;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

function qs(query: ListAdsQuery): string {
  const parts: string[] = [];
  if (query.placement) parts.push(`placement=${encodeURIComponent(query.placement)}`);
  if (typeof query.isActive === "boolean")
    parts.push(`isActive=${query.isActive ? "true" : "false"}`);
  if (query.page) parts.push(`page=${query.page}`);
  if (query.limit) parts.push(`limit=${query.limit}`);
  return parts.length > 0 ? `?${parts.join("&")}` : "";
}

export async function listAds(
  query: ListAdsQuery,
  token: string,
): Promise<ApiResult<AdminAdDTO[]>> {
  return apiFetch<AdminAdDTO[]>(`/api/v1/ads${qs(query)}`, {
    token,
    cache: "no-store",
  });
}

export async function getAd(id: string, token: string): Promise<AdminAdDTO> {
  const result = await apiFetch<AdminAdDTO>(
    `/api/v1/ads/${encodeURIComponent(id)}`,
    { token, cache: "no-store" },
  );
  return result.data;
}

export interface CreateAdBody {
  name: string;
  placement: AdPlacement;
  imageUrl: string;
  publicId: string;
  linkUrl: string;
  altText?: string;
  isActive?: boolean;
  startDate?: string | null;
  endDate?: string | null;
}

export type UpdateAdBody = Partial<CreateAdBody>;

export async function createAd(body: CreateAdBody, token: string): Promise<AdminAdDTO> {
  const result = await apiFetch<AdminAdDTO>("/api/v1/ads", {
    method: "POST",
    body,
    token,
    cache: "no-store",
  });
  return result.data;
}

export async function updateAd(
  id: string,
  body: UpdateAdBody,
  token: string,
): Promise<AdminAdDTO> {
  const result = await apiFetch<AdminAdDTO>(
    `/api/v1/ads/${encodeURIComponent(id)}`,
    { method: "PATCH", body, token, cache: "no-store" },
  );
  return result.data;
}

export async function deleteAd(id: string, token: string): Promise<void> {
  await apiFetch<unknown>(`/api/v1/ads/${encodeURIComponent(id)}`, {
    method: "DELETE",
    token,
    cache: "no-store",
  });
}
