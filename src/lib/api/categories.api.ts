import { apiFetch } from "./client";
import type { CategoryDTO } from "@/lib/types/category";

export interface ListCategoriesQuery {
  includeInactive?: boolean;
}

export async function listCategories(
  query: ListCategoriesQuery = {},
  token?: string,
): Promise<CategoryDTO[]> {
  const parts: string[] = [];
  if (query.includeInactive) parts.push("includeInactive=true");
  const suffix = parts.length > 0 ? `?${parts.join("&")}` : "";
  const result = await apiFetch<CategoryDTO[]>(
    `/api/v1/categories${suffix}`,
    { token: token ?? null, cache: "no-store" },
  );
  return result.data;
}

export interface CreateCategoryBody {
  name: string;
  slug?: string;
  description?: string;
  bannerUrl?: string;
  order?: number;
  isActive?: boolean;
}

export type UpdateCategoryBody = Partial<CreateCategoryBody>;

export async function createCategory(
  body: CreateCategoryBody,
  token: string,
): Promise<CategoryDTO> {
  const result = await apiFetch<CategoryDTO>("/api/v1/categories", {
    method: "POST",
    body,
    token,
    cache: "no-store",
  });
  return result.data;
}

export async function updateCategory(
  id: string,
  body: UpdateCategoryBody,
  token: string,
): Promise<CategoryDTO> {
  const result = await apiFetch<CategoryDTO>(
    `/api/v1/categories/${encodeURIComponent(id)}`,
    { method: "PATCH", body, token, cache: "no-store" },
  );
  return result.data;
}

export async function deleteCategory(id: string, token: string): Promise<void> {
  await apiFetch<unknown>(`/api/v1/categories/${encodeURIComponent(id)}`, {
    method: "DELETE",
    token,
    cache: "no-store",
  });
}
