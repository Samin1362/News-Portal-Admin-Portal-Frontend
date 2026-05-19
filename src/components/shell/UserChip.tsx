"use client";

import { useEffect, useRef, useState } from "react";
import { LogOut } from "lucide-react";
import { Avatar } from "@/components/primitives/Avatar";
import { useAdminAuth } from "@/lib/auth/AdminAuthProvider";
import { cn } from "@/lib/utils/cn";

export function UserChip() {
  const { profile, signOut } = useAdminAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) {
      document.addEventListener("mousedown", onDoc);
      document.addEventListener("keydown", onKey);
    }
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!profile) return null;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 px-1.5 py-1 border-[1.5px] border-ink rounded-md hover:bg-paper-2"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Avatar
          name={profile.displayName}
          src={profile.photoURL}
          size="xs"
          tone="ink"
        />
        <span className="hidden sm:inline font-sans text-[12px] font-semibold truncate max-w-[120px]">
          {profile.displayName}
        </span>
      </button>

      {open ? (
        <div
          role="menu"
          className={cn(
            "absolute right-0 mt-2 w-56 bg-paper border-[1.5px] border-ink rounded-sm",
            "shadow-[4px_4px_0_var(--color-ink)] p-2",
          )}
        >
          <div className="px-2 py-1.5 border-b border-ink/15">
            <p className="font-sans text-[12px] font-semibold truncate">
              {profile.displayName}
            </p>
            <p className="font-hand text-[11px] text-muted truncate">
              {profile.email}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              void signOut();
            }}
            className="mt-1 w-full flex items-center gap-2 px-2 py-1.5 rounded-sm font-sans text-[13px] hover:bg-paper-2 text-accent"
            role="menuitem"
          >
            <LogOut size={14} aria-hidden />
            Sign out
          </button>
        </div>
      ) : null}
    </div>
  );
}
