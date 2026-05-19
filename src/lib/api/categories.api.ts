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
