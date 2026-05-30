/**
 * Shape of one audit entry. The backend has no audit collection yet, so we
 * synthesise entries from two sources:
 *   1. `article.history[]` returned by `/articles/queue` (read-only — derived)
 *   2. Local mutation log persisted in IndexedDB (live — appended by mutations)
 *
 * Once the backend ships `/admin/audit-log`, the IndexedDB layer can be
 * swapped for a server fetch — the `<AuditFeed>` and `/insights/audit` page
 * read from a shared adapter so it's a one-file change.
 */

export type AuditAction =
  | "role-change"
  | "user-block"
  | "user-unblock"
  | "user-comment-block"
  | "user-comment-unblock"
  | "user-delete"
  | "article-publish"
  | "article-schedule"
  | "article-archive"
  | "article-unarchive"
  | "article-reject"
  | "article-approve"
  | "article-submit"
  | "article-start-review"
  | "article-update"
  | "article-flag-toggle"
  | "article-delete"
  | "article-comments-enabled"
  | "comment-approve"
  | "comment-reject"
  | "comment-delete"
  | "category-create"
  | "category-update"
  | "category-delete"
  | "tag-create"
  | "tag-delete"
  | "ad-create"
  | "ad-update"
  | "ad-toggle"
  | "ad-delete"
  | "role-request-approve"
  | "role-request-reject"
  | "role-request-cancel";

/**
 * Audit entry kind drives the dot colour and how the entry's
 * actor / target are read. The local IndexedDB layer always writes `kind`
 * synthesis bucket = `local`; entries pulled from article history get
 * `kind` = `derived`.
 */
export type AuditSource = "local" | "derived";

export interface AuditEntry {
  id: string;
  action: AuditAction;
  /** Admin who performed the action. */
  actorId: string | null;
  actorName: string | null;
  /** Affected resource (article id, user id, comment id, ad id, etc.). */
  targetId: string | null;
  /** Short, human-readable description of the change (1 short sentence). */
  summary: string;
  /** Optional free-form details (e.g. "from journalist to editor"). */
  detail: string | null;
  source: AuditSource;
  /** ISO timestamp. */
  at: string;
}

export const AUDIT_ACTION_LABEL: Record<AuditAction, string> = {
  "role-change": "Role changed",
  "user-block": "User suspended",
  "user-unblock": "User restored",
  "user-comment-block": "Comments blocked for user",
  "user-comment-unblock": "Comments unblocked for user",
  "user-delete": "User deleted",
  "article-publish": "Article published",
  "article-schedule": "Article scheduled",
  "article-archive": "Article archived",
  "article-unarchive": "Article unarchived",
  "article-reject": "Article rejected",
  "article-approve": "Article approved",
  "article-submit": "Article submitted",
  "article-start-review": "Review started",
  "article-update": "Article edited",
  "article-flag-toggle": "Article flags toggled",
  "article-delete": "Article deleted",
  "article-comments-enabled": "Article comments toggled",
  "comment-approve": "Comment approved",
  "comment-reject": "Comment rejected",
  "comment-delete": "Comment deleted",
  "category-create": "Category created",
  "category-update": "Category updated",
  "category-delete": "Category deleted",
  "tag-create": "Tag created",
  "tag-delete": "Tag deleted",
  "ad-create": "Ad created",
  "ad-update": "Ad updated",
  "ad-toggle": "Ad activity toggled",
  "ad-delete": "Ad deleted",
  "role-request-approve": "Role request approved",
  "role-request-reject": "Role request rejected",
  "role-request-cancel": "Role request cancelled",
};

/**
 * Buckets used by the /insights/audit filter chips. Each bucket maps to a
 * set of concrete actions so the filter UI stays compact (6 chips instead
 * of 33).
 */
export const AUDIT_FILTER_BUCKETS = [
  "all",
  "role-change",
  "block",
  "article-published",
  "comment-deleted",
  "category-changed",
  "ad-toggled",
] as const;

export type AuditFilterBucket = (typeof AUDIT_FILTER_BUCKETS)[number];

export const AUDIT_FILTER_LABEL: Record<AuditFilterBucket, string> = {
  all: "All",
  "role-change": "Role changes",
  block: "Blocks & suspensions",
  "article-published": "Articles published",
  "comment-deleted": "Comments deleted",
  "category-changed": "Categories",
  "ad-toggled": "Ads",
};

const BUCKET_ACTIONS: Record<AuditFilterBucket, AuditAction[] | null> = {
  all: null,
  "role-change": ["role-change", "role-request-approve", "role-request-reject"],
  block: [
    "user-block",
    "user-unblock",
    "user-comment-block",
    "user-comment-unblock",
    "user-delete",
  ],
  "article-published": [
    "article-publish",
    "article-schedule",
    "article-archive",
    "article-unarchive",
  ],
  "comment-deleted": ["comment-delete", "comment-reject", "comment-approve"],
  "category-changed": [
    "category-create",
    "category-update",
    "category-delete",
    "tag-create",
    "tag-delete",
  ],
  "ad-toggled": ["ad-create", "ad-update", "ad-toggle", "ad-delete"],
};

export function matchesBucket(
  action: AuditAction,
  bucket: AuditFilterBucket,
): boolean {
  const allowed = BUCKET_ACTIONS[bucket];
  if (allowed === null) return true;
  return allowed.includes(action);
}
