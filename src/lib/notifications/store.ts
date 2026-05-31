"use client";

import { useSyncExternalStore } from "react";

/**
 * Persistent state for the notification bell. Two pieces:
 *   - `lastReadAt`: ISO timestamp updated when the admin clicks
 *     "Mark all as read". Anything newer is counted as unread.
 *   - `dismissed`: set of stable notification ids the admin has actively
 *     swept out of the dropdown. Auto-pruned when it grows past a cap so
 *     localStorage doesn't bloat over months of activity.
 *
 * Persistence mirrors `useStoredDrawerExpanded` — single key, JSON blob,
 * `useSyncExternalStore` so SSR resolves to defaults and other tabs stay
 * in sync via the `storage` event.
 */

const STORAGE_KEY = "admin.notifications.state";
const DISMISSED_CAP = 200;

interface PersistedState {
  lastReadAt: string | null;
  dismissed: string[];
}

const DEFAULT_STATE: PersistedState = {
  lastReadAt: null,
  dismissed: [],
};

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

function parse(raw: string | null): PersistedState {
  if (!raw) return DEFAULT_STATE;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return DEFAULT_STATE;
    const obj = parsed as Record<string, unknown>;
    const lastReadAt =
      typeof obj.lastReadAt === "string" ? obj.lastReadAt : null;
    const dismissed = Array.isArray(obj.dismissed)
      ? obj.dismissed.filter((v): v is string => typeof v === "string")
      : [];
    return { lastReadAt, dismissed };
  } catch {
    return DEFAULT_STATE;
  }
}

let cachedRaw: string | null = null;
let cachedValue: PersistedState = DEFAULT_STATE;

function getSnapshot(): PersistedState {
  if (typeof window === "undefined") return DEFAULT_STATE;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw === cachedRaw) return cachedValue;
  cachedRaw = raw;
  cachedValue = parse(raw);
  return cachedValue;
}

function getServerSnapshot(): PersistedState {
  return DEFAULT_STATE;
}

export function useNotificationPrefs(): PersistedState {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

function write(next: PersistedState): void {
  if (typeof window === "undefined") return;
  const serialised = JSON.stringify(next);
  window.localStorage.setItem(STORAGE_KEY, serialised);
  cachedRaw = serialised;
  cachedValue = next;
  notify();
}

export function markAllRead(): void {
  const current = getSnapshot();
  write({ ...current, lastReadAt: new Date().toISOString() });
}

export function addDismissed(id: string): void {
  const current = getSnapshot();
  if (current.dismissed.includes(id)) return;
  const next = [id, ...current.dismissed];
  // Trim from the tail — newest dismissals are most relevant for the
  // dedupe check on the next live refetch.
  const trimmed = next.length > DISMISSED_CAP ? next.slice(0, DISMISSED_CAP) : next;
  write({ ...current, dismissed: trimmed });
}

export function clearNotificationState(): void {
  write(DEFAULT_STATE);
}
