import { AlertTriangle } from "lucide-react";
import type { HistoryDTO } from "@/lib/types/article";
import { formatShortDate } from "@/lib/utils/format";

interface Props {
  rejectionReason: string | null;
  history: HistoryDTO[];
}

/**
 * Surfaces the most recent reject entry above the override editor when an
 * article comes back rejected. Mirrors the journalist-portal banner so the
 * admin sees the same context the author would.
 */
export function RejectionBanner({ rejectionReason, history }: Props) {
  if (!rejectionReason) return null;
  const lastReject = [...history].reverse().find((h) => h.action === "reject");

  return (
    <div className="border-[1.5px] border-accent rounded-sm bg-paper p-4">
      <div className="flex items-start gap-2">
        <AlertTriangle
          size={16}
          className="text-accent shrink-0 mt-0.5"
          aria-hidden
        />
        <div className="min-w-0">
          <h3 className="serif text-[15px] font-bold tracking-tight text-ink">
            This article was rejected
          </h3>
          <p className="mt-1 font-sans text-[14px] leading-relaxed text-ink whitespace-pre-wrap">
            {rejectionReason}
          </p>
          {lastReject ? (
            <p className="mt-2 font-hand text-[11px] text-muted">
              Rejected on {formatShortDate(lastReject.at)} — fix the issues
              before publishing.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
