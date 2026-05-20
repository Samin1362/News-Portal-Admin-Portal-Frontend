import { apiFetch } from "./client";
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
