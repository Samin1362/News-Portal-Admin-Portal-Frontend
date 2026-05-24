export type CommentStatus = "pending" | "approved" | "rejected";

/**
 * Admin-side filter that includes the `'all'` literal — matches the backend's
 * extended `listAdminCommentsQuerySchema` (the service treats `'all'` as
 * "no status filter").
 */
export type CommentFilterStatus = CommentStatus | "all";

export interface CommentAuthorDTO {
  id: string;
  displayName: string;
  photoURL: string | null;
}

export interface CommentDTO {
  id: string;
  articleId: string;
  parentId: string | null;
  content: string;
  author: CommentAuthorDTO | null;
  likeCount: number;
  hasLiked: boolean;
  status: CommentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ModerationCommentDTO extends CommentDTO {
  reportCount: number;
  reports: Array<{ userId: string; reason: string; at: string }>;
}
