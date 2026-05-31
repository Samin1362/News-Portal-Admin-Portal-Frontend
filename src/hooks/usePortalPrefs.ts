"use client";

import { useSyncExternalStore } from "react";

export type Density = "compact" | "cozy" | "comfy";

export interface PortalPrefs {
  density: Density;
  defaultLanding: string;
  showTicker: boolean;
}

const STORAGE_KEY = "admin.portal.prefs";

export const DEFAULT_PREFS: PortalPrefs = {
  density: "cozy",
  defaultLanding: "/",
  showTicker: false,
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

function isDensity(v: unknown): v is Density {
  return v === "compact" || v === "cozy" || v === "comfy";
}

function parse(raw: string | null): PortalPrefs {
  if (!raw) return DEFAULT_PREFS;
  try {
    const parsed = JSON.parse(raw) as Partial<PortalPrefs>;
    return {
      density: isDensity(parsed.density) ? parsed.density : DEFAULT_PREFS.density,
      defaultLanding:
        typeof parsed.defaultLanding === "string" && parsed.defaultLanding.startsWith("/")
          ? parsed.defaultLanding
          : DEFAULT_PREFS.defaultLanding,
      showTicker:
        typeof parsed.showTicker === "boolean"
          ? parsed.showTicker
          : DEFAULT_PREFS.showTicker,
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

let cachedRaw: string | null = null;
let cachedValue: PortalPrefs = DEFAULT_PREFS;

function getSnapshot(): PortalPrefs {
  if (typeof window === "undefined") return DEFAULT_PREFS;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw === cachedRaw) return cachedValue;
  cachedRaw = raw;
  cachedValue = parse(raw);
  return cachedValue;
}

function getServerSnapshot(): PortalPrefs {
  return DEFAULT_PREFS;
}

export function usePortalPrefs(): PortalPrefs {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function writePortalPrefs(next: Partial<PortalPrefs>): void {
  if (typeof window === "undefined") return;
  const current = getSnapshot();
  const merged: PortalPrefs = { ...current, ...next };
  const serialised = JSON.stringify(merged);
  window.localStorage.setItem(STORAGE_KEY, serialised);
  cachedRaw = serialised;
  cachedValue = merged;
  notify();
}
