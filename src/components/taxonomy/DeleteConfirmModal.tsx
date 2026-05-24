"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { Btn } from "@/components/primitives/Btn";

interface Props {
  open: boolean;
  onClose: () => void;
  /** Returns when the destructive action settles. Errors handled by the caller. */
  onConfirm: () => Promise<void> | void;
  title: string;
  description: string;
  /** Optional warning surfaced above the typed-confirmation field. */
  warning?: string;
  /** Word the user must type to enable the destructive button. */
  confirmWord?: string;
  destructiveLabel?: string;
}

export function DeleteConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  description,
  warning,
  confirmWord = "delete",
  destructiveLabel = "Delete",
}: Props) {
  const [mounted, setMounted] = useState(false);
  if (!mounted && typeof window !== "undefined") setMounted(true);

  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);

  // Reset the typed-confirm field whenever the modal re-opens — render-phase
  // compare-and-set, per React 19 rules.
  const [lastOpen, setLastOpen] = useState(open);
  if (open !== lastOpen) {
    setLastOpen(open);
    if (open) {
      setTyped("");
      setBusy(false);
    }
  }

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !busy) onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose, busy]);

  if (!open || !mounted) return null;

  const canConfirm = typed.trim().toLowerCase() === confirmWord.toLowerCase();

  async function handleConfirm() {
    if (!canConfirm || busy) return;
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      setBusy(false);
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-ink/45 backdrop-blur-[2px] p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      data-modal-open="true"
    >
      <button
        type="button"
        aria-label="Cancel"
        onClick={() => !busy && onClose()}
        className="absolute inset-0"
      />
      <div className="relative bg-paper border-[1.5px] border-ink rounded-sm shadow-[6px_6px_0_var(--color-ink)] max-w-[440px] w-full">
        <header className="flex items-center justify-between gap-3 px-4 py-3 border-b-[1.5px] border-ink">
          <h2
            id="confirm-title"
            className="serif text-[18px] font-extrabold tracking-tight text-accent"
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={() => !busy && onClose()}
            aria-label="Close"
            className="inline-flex items-center justify-center w-8 h-8 border-[1.5px] border-ink rounded-sm hover:bg-paper-2"
          >
            <X size={14} aria-hidden />
          </button>
        </header>
        <div className="px-4 py-4 space-y-3">
          <p className="font-sans text-[13.5px] text-ink">{description}</p>
          {warning ? (
            <p className="font-sans text-[12.5px] text-accent border-l-[3px] border-accent pl-2 py-1 bg-accent/5">
              {warning}
            </p>
          ) : null}
          <label className="block">
            <span className="block font-hand text-[11px] uppercase tracking-wider text-muted mb-1">
              Type <code className="font-sans text-accent">{confirmWord}</code> to confirm
            </span>
            <input
              type="text"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoFocus
              className="w-full bg-paper border-[1.5px] border-ink rounded-sm px-3 py-2 font-sans text-[14px] focus:outline-none focus:ring-2 focus:ring-accent/30"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
            />
          </label>
        </div>
        <footer className="border-t-[1.5px] border-ink px-4 py-3 flex items-center justify-end gap-2 bg-paper-2">
          <Btn variant="ghost" onClick={() => !busy && onClose()} disabled={busy}>
            Cancel
          </Btn>
          <Btn
            variant="primary"
            onClick={handleConfirm}
            disabled={!canConfirm || busy}
          >
            {busy ? "Deleting…" : destructiveLabel}
          </Btn>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
