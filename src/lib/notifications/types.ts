/**
 * Notification feed for the admin shell's bell button. The backend has
 * no `/admin/notifications` collection yet (same gap that drives the
 * audit feed), so each entry is synthesised on the client from existing
 * resources — submitted articles, pending comments, pending role
 * requests, and recently published articles. When the backend later
 * ships a dedicated stream, only `useNotifications` has to change.
 */

export type NotificationKind =
  | "article-submitted"
  | "article-published"
  | "comment-pending"
  | "role-request-pending";

export type NotificationTone = "warn" | "info" | "accent" | "accent-2";

export interface NotificationItem {
  /** Stable id — survives refetches so dismiss-state persists. */
  id: string;
  kind: NotificationKind;
  /** Short headline shown on the row. */
  title: string;
  /** Sub-line (author, snippet, etc.). */
  detail: string | null;
  /** Where the bell row routes to when clicked. */
  href: string;
  /** ISO timestamp; drives unread/read comparison + sort order. */
  at: string;
  /** Drives the dot colour. */
  tone: NotificationTone;
}

export const NOTIFICATION_GROUP_LABEL: Record<NotificationKind, string> = {
  "article-submitted": "Awaiting review",
  "comment-pending": "Awaiting moderation",
  "role-request-pending": "Awaiting decision",
  "article-published": "Recently published",
};

export const NOTIFICATION_GROUP_ORDER: NotificationKind[] = [
  "article-submitted",
  "comment-pending",
  "role-request-pending",
  "article-published",
];
