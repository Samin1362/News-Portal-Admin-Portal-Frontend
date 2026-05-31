"use client";

import { useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAdminAuth } from "@/lib/auth/AdminAuthProvider";
import { listQueue } from "@/lib/api/articles.api";
import { listAdminComments } from "@/lib/api/comments.api";
import { listRoleRequests } from "@/lib/api/roleRequests.api";
import {
  addDismissed,
  markAllRead,
  useNotificationPrefs,
} from "@/lib/notifications/store";
import type {
  NotificationItem,
  NotificationKind,
} from "@/lib/notifications/types";

interface UseNotificationsResult {
  items: NotificationItem[];
  unreadCount: number;
  isLoading: boolean;
  lastReadAt: string | null;
  markAllRead: () => void;
  dismiss: (id: string) => void;
}

const TONE_BY_KIND: Record<NotificationKind, NotificationItem["tone"]> = {
  "article-submitted": "warn",
  "comment-pending": "accent",
  "role-request-pending": "info",
  "article-published": "accent-2",
};

const PER_SOURCE_LIMIT = 8;

/**
 * Synthesises a unified notification feed from four live admin queries.
 *
 * The backend has no `/admin/notifications` collection (mirroring the
 * `/admin/audit-log` gap documented in §9 of the plan), so each source
 * gets its own short paginated request and the results are merged on
 * the client. Each item carries a stable id so the dismissed-set in
 * localStorage matches across refetches.
 *
 * `unreadCount` compares each item's `at` against the persisted
 * `lastReadAt`. The first time the admin opens the bell on a fresh
 * profile, everything counts as unread until they hit "Mark all read".
 */
export function useNotifications(): UseNotificationsResult {
  const { getIdToken, role } = useAdminAuth();
  const prefs = useNotificationPrefs();
  const enabled = role === "admin";

  const submittedQ = useQuery({
    enabled,
    queryKey: ["notifications", "submitted-articles"],
    queryFn: async () => {
      const token = await getIdToken();
      if (!token) return [];
      const res = await listQueue(
        { status: "submitted", page: 1, limit: PER_SOURCE_LIMIT },
        token,
      );
      return res.data ?? [];
    },
    staleTime: 30_000,
    refetchInterval: 90_000,
  });

  const publishedQ = useQuery({
    enabled,
    queryKey: ["notifications", "published-articles"],
    queryFn: async () => {
      const token = await getIdToken();
      if (!token) return [];
      const res = await listQueue(
        { status: "published", page: 1, limit: 5 },
        token,
      );
      return res.data ?? [];
    },
    staleTime: 60_000,
    refetchInterval: 120_000,
  });

  const commentsQ = useQuery({
    enabled,
    queryKey: ["notifications", "pending-comments"],
    queryFn: async () => {
      const token = await getIdToken();
      if (!token) return [];
      const res = await listAdminComments(
        { status: "pending", page: 1, limit: PER_SOURCE_LIMIT },
        token,
      );
      return res.data ?? [];
    },
    staleTime: 30_000,
    refetchInterval: 90_000,
  });

  const roleRequestsQ = useQuery({
    enabled,
    queryKey: ["notifications", "pending-role-requests"],
    queryFn: async () => {
      const token = await getIdToken();
      if (!token) return [];
      const res = await listRoleRequests(
        { status: "pending", page: 1, limit: PER_SOURCE_LIMIT },
        token,
      );
      return res.data ?? [];
    },
    staleTime: 30_000,
    refetchInterval: 90_000,
  });

  const items = useMemo<NotificationItem[]>(() => {
    const dismissed = new Set(prefs.dismissed);
    const out: NotificationItem[] = [];

    for (const a of submittedQ.data ?? []) {
      const id = `article-submitted:${a.id}:${a.updatedAt}`;
      if (dismissed.has(id)) continue;
      out.push({
        id,
        kind: "article-submitted",
        title: a.headline,
        detail: "Awaiting editorial review",
        href: `/content/articles/${a.id}/edit`,
        at: a.updatedAt,
        tone: TONE_BY_KIND["article-submitted"],
      });
    }

    for (const a of publishedQ.data ?? []) {
      if (!a.publishedAt) continue;
      const id = `article-published:${a.id}:${a.publishedAt}`;
      if (dismissed.has(id)) continue;
      out.push({
        id,
        kind: "article-published",
        title: a.headline,
        detail: a.slug ? `/${a.slug}` : null,
        href: `/content/articles/${a.id}/edit`,
        at: a.publishedAt,
        tone: TONE_BY_KIND["article-published"],
      });
    }

    for (const c of commentsQ.data ?? []) {
      const id = `comment-pending:${c.id}`;
      if (dismissed.has(id)) continue;
      const snippet = (c.content ?? "").trim().slice(0, 80);
      out.push({
        id,
        kind: "comment-pending",
        title: c.author?.displayName ?? "Anonymous reader",
        detail: snippet.length > 0 ? `"${snippet}${(c.content ?? "").length > 80 ? "…" : ""}"` : "(empty comment)",
        href: `/moderation/comments`,
        at: c.createdAt,
        tone: TONE_BY_KIND["comment-pending"],
      });
    }

    for (const r of roleRequestsQ.data ?? []) {
      const id = `role-request-pending:${r.id}`;
      if (dismissed.has(id)) continue;
      out.push({
        id,
        kind: "role-request-pending",
        title: `${r.submittedInfo?.displayName ?? r.submittedInfo?.fullName ?? "User"} → ${r.toRole}`,
        detail: `Requested upgrade from ${r.fromRole}`,
        href: `/people/role-requests/${r.id}`,
        at: r.createdAt,
        tone: TONE_BY_KIND["role-request-pending"],
      });
    }

    out.sort((a, b) => (a.at < b.at ? 1 : -1));
    return out;
  }, [
    submittedQ.data,
    publishedQ.data,
    commentsQ.data,
    roleRequestsQ.data,
    prefs.dismissed,
  ]);

  const unreadCount = useMemo(() => {
    if (!prefs.lastReadAt) return items.length;
    return items.filter((i) => i.at > prefs.lastReadAt!).length;
  }, [items, prefs.lastReadAt]);

  const dismiss = useCallback((id: string) => {
    addDismissed(id);
  }, []);

  const markAllReadCb = useCallback(() => {
    markAllRead();
  }, []);

  return {
    items,
    unreadCount,
    isLoading:
      submittedQ.isLoading ||
      publishedQ.isLoading ||
      commentsQ.isLoading ||
      roleRequestsQ.isLoading,
    lastReadAt: prefs.lastReadAt,
    markAllRead: markAllReadCb,
    dismiss,
  };
}
