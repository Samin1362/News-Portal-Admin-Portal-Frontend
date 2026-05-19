"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAdminAuth } from "@/lib/auth/AdminAuthProvider";
import { listQueue } from "@/lib/api/articles.api";
import { listAdminComments } from "@/lib/api/comments.api";
import type { CountKey } from "@/components/shell/nav.config";

/**
 * Sidebar count badges. Each entry hits a 1-row paginated request so we
 * pull `meta.total` cheaply. role-requests-pending stays at 0 until the
 * §0a backend lands.
 */
export function useNavCounts(): Partial<Record<CountKey, number>> {
  const { getIdToken, role } = useAdminAuth();
  const enabled = role === "admin";

  const queueQ = useQuery({
    enabled,
    queryKey: ["nav-count", "queue-submitted"],
    queryFn: async () => {
      const token = await getIdToken();
      if (!token) return 0;
      const result = await listQueue({ status: "submitted", limit: 1 }, token);
      return result.meta?.total ?? 0;
    },
    staleTime: 30_000,
  });

  const commentsQ = useQuery({
    enabled,
    queryKey: ["nav-count", "comments-pending"],
    queryFn: async () => {
      const token = await getIdToken();
      if (!token) return 0;
      const result = await listAdminComments(
        { status: "pending", limit: 1 },
        token,
      );
      return result.meta?.total ?? 0;
    },
    staleTime: 30_000,
  });

  return useMemo<Partial<Record<CountKey, number>>>(
    () => ({
      "queue-submitted": queueQ.data,
      "comments-pending": commentsQ.data,
    }),
    [queueQ.data, commentsQ.data],
  );
}
