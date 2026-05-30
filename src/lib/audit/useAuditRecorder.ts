"use client";

import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAdminAuth } from "@/lib/auth/AdminAuthProvider";
import { pushAuditEntry } from "./store";
import type { AuditAction, AuditEntry } from "./types";

export const AUDIT_QUERY_KEY = ["audit", "local-entries"] as const;

interface RecordOptions {
  action: AuditAction;
  targetId?: string | null;
  summary: string;
  detail?: string | null;
}

/**
 * Returns a `record` callback that pushes an entry to the local IndexedDB
 * audit log and invalidates the cached list query so any open
 * `/insights/audit` page refreshes in the background.
 *
 * Fire-and-forget — the caller does not await the persist. If the browser
 * lacks IndexedDB (SSR, tests, private mode in older browsers) the call
 * silently no-ops.
 */
export function useAuditRecorder() {
  const { profile } = useAdminAuth();
  const qc = useQueryClient();

  return useCallback(
    (options: RecordOptions) => {
      const entry: AuditEntry = {
        id: cryptoRandomId(),
        action: options.action,
        actorId: profile?.id ?? null,
        actorName: profile?.displayName ?? profile?.email ?? null,
        targetId: options.targetId ?? null,
        summary: options.summary,
        detail: options.detail ?? null,
        source: "local",
        at: new Date().toISOString(),
      };
      void pushAuditEntry(entry).then(() => {
        qc.invalidateQueries({ queryKey: AUDIT_QUERY_KEY });
      });
    },
    [profile?.id, profile?.displayName, profile?.email, qc],
  );
}

function cryptoRandomId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `aud_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}
