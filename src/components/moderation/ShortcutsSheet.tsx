"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  isAdmin: boolean;
}

interface Shortcut {
  keys: string[];
  label: string;
  adminOnly?: boolean;
}

const SHORTCUTS: Shortcut[] = [
  { keys: ["j"], label: "Move focus to next comment" },
  { keys: ["k"], label: "Move focus to previous comment" },
  { keys: ["x"], label: "Toggle selection on focused comment" },
  { keys: ["Enter"], label: "Open drawer for focused comment" },
  { keys: ["a"], label: "Approve focused / all selected" },
  { keys: ["r"], label: "Reject focused / all selected" },
  { keys: ["d"], label: "Hard-delete focused / all selected", adminOnly: true },
  { keys: ["?"], label: "Show this sheet" },
  { keys: ["Esc"], label: "Close drawer / sheet / clear selection" },
];

export function ShortcutsSheet({ open, onClose, isAdmin }: Props) {
  const [mounted, setMounted] = useState(false);
  if (!mounted && typeof window !== "undefined") setMounted(true);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-ink/45 backdrop-blur-[2px] p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcuts-title"
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close shortcuts"
        className="absolute inset-0"
      />
      <div className="relative bg-paper border-[1.5px] border-ink rounded-sm shadow-[6px_6px_0_var(--color-ink)] max-w-[440px] w-full">
        <header className="flex items-center justify-between gap-3 px-4 py-3 border-b-[1.5px] border-ink">
          <h2 id="shortcuts-title" className="serif text-[18px] font-extrabold tracking-tight">
            Keyboard shortcuts
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="inline-flex items-center justify-center w-8 h-8 border-[1.5px] border-ink rounded-sm hover:bg-paper-2"
          >
            <X size={14} aria-hidden />
          </button>
        </header>
        <ul className="px-4 py-3 space-y-2">
          {SHORTCUTS.map((s) => {
            const disabled = s.adminOnly && !isAdmin;
            return (
              <li
                key={s.label}
                className="flex items-center justify-between gap-3 text-[13px]"
              >
                <span className={disabled ? "text-muted line-through" : "text-ink"}>
                  {s.label}
                  {disabled ? (
                    <span className="ml-2 font-hand text-[10px] uppercase tracking-wider text-muted">
                      admin only
                    </span>
                  ) : null}
                </span>
                <span className="flex items-center gap-1 shrink-0">
                  {s.keys.map((k) => (
                    <kbd
                      key={k}
                      className="inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 border-[1.5px] border-ink rounded-sm bg-paper-2 font-sans text-[11px] font-semibold"
                    >
                      {k}
                    </kbd>
                  ))}
                </span>
              </li>
            );
          })}
        </ul>
        <footer className="px-4 py-3 border-t-[1.5px] border-ink/30 font-hand text-[11px] text-muted">
          Shortcuts ignore inputs / textareas / open modals.
        </footer>
      </div>
    </div>,
    document.body,
  );
}
