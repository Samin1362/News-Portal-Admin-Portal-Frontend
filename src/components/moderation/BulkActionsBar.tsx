"use client";

import { Check, Trash2, X } from "lucide-react";
import { Btn } from "@/components/primitives/Btn";

interface Props {
  count: number;
  isAdmin: boolean;
  busy: boolean;
  onApprove: () => void;
  onReject: () => void;
  onDelete: () => void;
  onClear: () => void;
}

/**
 * Sticky bottom action bar — only visible when at least one comment is
 * selected. Mirrors the visual weight of the hover-lift cards (1.5px frame +
 * hard-shadow) so it reads as a deliberate surface rather than a notification.
 */
export function BulkActionsBar({
  count,
  isAdmin,
  busy,
  onApprove,
  onReject,
  onDelete,
  onClear,
}: Props) {
  if (count === 0) return null;

  return (
    <div className="sticky bottom-3 z-30 mt-4">
      <div className="bg-paper border-[1.5px] border-ink rounded-sm px-4 py-3 flex flex-wrap items-center gap-3 shadow-[4px_4px_0_var(--color-ink)]">
        <p className="font-sans text-[13px] font-semibold">
          {count} selected
        </p>
        <button
          type="button"
          onClick={onClear}
          className="font-hand text-[11px] text-muted hover:text-accent"
        >
          Clear
        </button>
        <div className="flex-1" />
        <Btn size="sm" variant="default" onClick={onApprove} disabled={busy}>
          <Check size={12} aria-hidden />
          Approve all
        </Btn>
        <Btn size="sm" variant="default" onClick={onReject} disabled={busy}>
          <X size={12} aria-hidden />
          Reject all
        </Btn>
        <Btn
          size="sm"
          variant="default"
          onClick={onDelete}
          disabled={busy || !isAdmin}
          title={isAdmin ? "Hard-delete all selected" : "Admin only"}
          className="text-accent border-accent hover:bg-accent/10"
        >
          <Trash2 size={12} aria-hidden />
          Delete all
        </Btn>
      </div>
    </div>
  );
}
