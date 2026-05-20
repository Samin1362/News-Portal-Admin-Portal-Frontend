"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils/cn";

interface Props {
  open: boolean;
  onClose: () => void;
  /**
   * The trigger element the menu anchors to. The menu opens directly below
   * the anchor, aligned to its right edge.
   */
  anchorRef: RefObject<HTMLElement | null>;
  children: ReactNode;
  className?: string;
}

interface Position {
  top: number;
  right: number;
}

/**
 * Floating menu rendered through a Portal so it escapes the parent's
 * stacking context. Without the portal, hover/transform on sibling rows
 * (e.g. `.row-hov` in the article table) creates new stacking contexts
 * that paint over the menu — no amount of local `z-index` can fix that.
 *
 * Closes on:
 *  - mousedown outside both the anchor and the menu,
 *  - Escape key,
 *  - parent calling `onClose()` after a menu action.
 *
 * Repositions on scroll / resize while open so a long-scrolling page keeps
 * the menu anchored to the right button even if the user scrolls before
 * picking an action.
 */
export function PortalMenu({
  open,
  onClose,
  anchorRef,
  children,
  className,
}: Props) {
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState<Position | null>(null);

  // Portal mount detection — render-phase per React 19 (no effect needed).
  const [mounted, setMounted] = useState(false);
  if (!mounted && typeof window !== "undefined") {
    setMounted(true);
  }

  const recompute = useCallback(() => {
    const rect = anchorRef.current?.getBoundingClientRect();
    if (!rect) return;
    setPos({
      top: rect.bottom + 6,
      right: window.innerWidth - rect.right,
    });
  }, [anchorRef]);

  // Re-measure on open + on scroll/resize while open. setState fires from
  // rAF / event callbacks, not synchronously inside the effect body, so the
  // React 19 set-state-in-effect rule is satisfied.
  useEffect(() => {
    if (!open) return;
    const raf = requestAnimationFrame(recompute);
    window.addEventListener("scroll", recompute, true);
    window.addEventListener("resize", recompute);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", recompute, true);
      window.removeEventListener("resize", recompute);
    };
  }, [open, recompute]);

  // Outside-click + Escape close.
  useEffect(() => {
    if (!open) return;
    function onDocPointer(e: MouseEvent) {
      const target = e.target as Node;
      if (anchorRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      onClose();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", onDocPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, anchorRef, onClose]);

  if (!open || !mounted || !pos) return null;

  return createPortal(
    <div
      ref={menuRef}
      role="menu"
      style={{ top: pos.top, right: pos.right }}
      className={cn(
        "fixed z-[80] min-w-[220px] border-[1.5px] border-ink bg-paper rounded-sm",
        "shadow-[4px_4px_0_var(--color-ink)] p-2 space-y-1.5",
        className,
      )}
    >
      {children}
    </div>,
    document.body,
  );
}
