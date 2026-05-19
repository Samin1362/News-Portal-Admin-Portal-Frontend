"use client";

import { useSyncExternalStore } from "react";
import { NAV, type NavItem } from "@/components/shell/nav.config";

const STORAGE_KEY = "admin.nav.expanded";

const DEFAULT_EXPANDED: ReadonlySet<string> = new Set(
  NAV.filter((n): n is Extract<NavItem, { kind: "group" }> => n.kind === "group" && !!n.defaultOpen).map((n) => n.key),
);

// Listeners notified when we write through `writeStoredNavExpanded`.
// Cross-tab updates arrive via the native "storage" window event.
const listeners = new Set<() => void>();

function notify() {
  for (const cb of listeners) cb();
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  if (typeof window !== "undefined") {
    window.addEventListener("storage", cb);
  }
  return () => {
    listeners.delete(cb);
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", cb);
    }
  };
}

// Cache the parsed Set so `useSyncExternalStore` sees a stable reference
// until the underlying string actually changes.
let cachedRaw: string | null = null;
let cachedSet: ReadonlySet<string> = DEFAULT_EXPANDED;

function getSnapshot(): ReadonlySet<string> {
  if (typeof window === "undefined") return DEFAULT_EXPANDED;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw === cachedRaw) return cachedSet;
  cachedRaw = raw;
  if (raw === null) {
    cachedSet = DEFAULT_EXPANDED;
    return cachedSet;
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      cachedSet = new Set(parsed.filter((v): v is string => typeof v === "string"));
      return cachedSet;
    }
  } catch {
    /* fall through */
  }
  cachedSet = DEFAULT_EXPANDED;
  return cachedSet;
}

function getServerSnapshot(): ReadonlySet<string> {
  return DEFAULT_EXPANDED;
}

export function useStoredNavExpanded(): ReadonlySet<string> {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function writeStoredNavExpanded(next: ReadonlySet<string>): void {
  if (typeof window === "undefined") return;
  try {
    const serialised = JSON.stringify(Array.from(next));
    window.localStorage.setItem(STORAGE_KEY, serialised);
    cachedRaw = serialised;
    cachedSet = next;
  } catch {
    /* quota errors ignored — UI still updates via notify() */
  }
  notify();
}
