import { Pill } from "@/components/primitives/Pill";
import type { CommentStatus } from "@/lib/types/comment";

const TONE: Record<CommentStatus, "warn" | "accent-2" | "accent"> = {
  pending: "warn",
  approved: "accent-2",
  rejected: "accent",
};

const LABEL: Record<CommentStatus, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
};

export function CommentStatusPill({ status }: { status: CommentStatus }) {
  return <Pill tone={TONE[status]}>{LABEL[status]}</Pill>;
}
