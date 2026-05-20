import { Pill } from "@/components/primitives/Pill";
import type { ArticleStatus } from "@/lib/types/article";

const TONE: Record<
  ArticleStatus,
  "ink" | "accent" | "accent-2" | "warn" | "info" | "muted"
> = {
  draft: "muted",
  submitted: "warn",
  under_review: "info",
  approved: "accent-2",
  published: "ink",
  rejected: "accent",
  archived: "muted",
};

const LABEL: Record<ArticleStatus, string> = {
  draft: "Draft",
  submitted: "Submitted",
  under_review: "In review",
  approved: "Approved",
  published: "Published",
  rejected: "Rejected",
  archived: "Archived",
};

export function StatusPill({ status }: { status: ArticleStatus }) {
  return <Pill tone={TONE[status]}>{LABEL[status]}</Pill>;
}
