import { Card, CardHead, CardTitle } from "@/components/primitives/Card";
import type { HistoryDTO } from "@/lib/types/article";
import { formatRelative } from "@/lib/utils/format";

const PRETTY_ACTION: Record<string, string> = {
  create: "Created",
  update: "Edited",
  submit: "Submitted for review",
  start_review: "Review started",
  approve: "Approved",
  reject: "Rejected",
  publish: "Published",
  publish_scheduled: "Auto-published from schedule",
  schedule: "Scheduled",
  archive: "Archived",
  unarchive: "Unarchived",
  flags_changed: "Flags updated",
  soft_delete: "Deleted",
};

export function HistoryTimeline({ history }: { history: HistoryDTO[] }) {
  const ordered = [...history].reverse();
  return (
    <Card>
      <CardHead>
        <CardTitle>Status timeline</CardTitle>
      </CardHead>
      {ordered.length === 0 ? (
        <p className="font-hand text-[12px] text-muted">No history yet.</p>
      ) : (
        <ol className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
          {ordered.map((entry, idx) => (
            <li key={idx} className="flex gap-2.5">
              <span
                aria-hidden
                className="mt-1.5 h-1.5 w-1.5 rounded-full bg-accent shrink-0"
              />
              <div className="min-w-0">
                <p className="font-sans text-[13px] text-ink">
                  {PRETTY_ACTION[entry.action] ?? entry.action}
                </p>
                <p className="font-hand text-[10px] text-muted">
                  {formatRelative(entry.at)}
                </p>
                {entry.note ? (
                  <p className="mt-1 font-sans text-[12px] text-ink/85 whitespace-pre-wrap">
                    {entry.note}
                  </p>
                ) : null}
              </div>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}
