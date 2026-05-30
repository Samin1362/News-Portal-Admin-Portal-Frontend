"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, Trash2 } from "lucide-react";
import {
  Card,
  CardHead,
  CardMeta,
  CardTitle,
} from "@/components/primitives/Card";
import { Btn } from "@/components/primitives/Btn";
import { SectionTitle } from "@/components/primitives/SectionTitle";
import { AuditEntryRow } from "@/components/insights/AuditEntryRow";
import { useAdminAuth } from "@/lib/auth/AdminAuthProvider";
import { useToast } from "@/lib/ui/toast";
import { listQueue } from "@/lib/api/articles.api";
import { deriveFromArticles } from "@/lib/audit/derive";
import {
  clearAuditEntries,
  listAuditEntries,
  MAX_ENTRIES,
} from "@/lib/audit/store";
import {
  AUDIT_FILTER_BUCKETS,
  AUDIT_FILTER_LABEL,
  AUDIT_ACTION_LABEL,
  matchesBucket,
  type AuditEntry,
  type AuditFilterBucket,
} from "@/lib/audit/types";
import { AUDIT_QUERY_KEY } from "@/lib/audit/useAuditRecorder";
import { cn } from "@/lib/utils/cn";

const PAGE_LIMIT = 25;

export default function AuditPage() {
  const { getIdToken, role } = useAdminAuth();
  const toast = useToast();
  const qc = useQueryClient();
  const enabled = role === "admin";

  const [bucket, setBucket] = useState<AuditFilterBucket>("all");
  const [page, setPage] = useState(1);

  const localQ = useQuery({
    enabled,
    queryKey: AUDIT_QUERY_KEY,
    queryFn: () => listAuditEntries(),
    staleTime: 5_000,
  });

  const derivedQ = useQuery({
    enabled,
    queryKey: ["audit", "derived-articles"],
    queryFn: async () => {
      const token = await getIdToken();
      if (!token) return [];
      const published = await listQueue(
        { status: "published", page: 1, limit: 50 },
        token,
      );
      const submitted = await listQueue(
        { status: "submitted", page: 1, limit: 20 },
        token,
      );
      return deriveFromArticles([
        ...(published.data ?? []),
        ...(submitted.data ?? []),
      ]);
    },
    staleTime: 60_000,
  });

  const merged = useMemo<AuditEntry[]>(() => {
    const all = [...(localQ.data ?? []), ...(derivedQ.data ?? [])];
    // De-dupe by id (derived entries are deterministic by article+action+at).
    const seen = new Set<string>();
    const out: AuditEntry[] = [];
    for (const entry of all) {
      if (seen.has(entry.id)) continue;
      seen.add(entry.id);
      out.push(entry);
    }
    out.sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
    return out;
  }, [localQ.data, derivedQ.data]);

  const filtered = useMemo(
    () => merged.filter((e) => matchesBucket(e.action, bucket)),
    [merged, bucket],
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_LIMIT));
  // Render-phase compare-and-set: clamp the page if filtering reduced the
  // pool below the current page. Avoids the setState-in-effect lint.
  const safePage = Math.min(page, totalPages);
  if (safePage !== page) setPage(safePage);

  const pageItems = useMemo(
    () => filtered.slice((safePage - 1) * PAGE_LIMIT, safePage * PAGE_LIMIT),
    [filtered, safePage],
  );

  function handleExport() {
    const rows = filtered.map((e) => ({
      at: e.at,
      action: AUDIT_ACTION_LABEL[e.action],
      actor: e.actorName ?? "",
      target: e.targetId ?? "",
      summary: e.summary,
      detail: e.detail ?? "",
      source: e.source,
    }));
    const csv = toCsv(rows);
    downloadCsv("audit-log.csv", csv);
    toast.success(`Exported ${rows.length} entries.`);
  }

  async function handleClear() {
    if (!window.confirm("Clear the local audit log for this browser?")) return;
    await clearAuditEntries();
    qc.invalidateQueries({ queryKey: AUDIT_QUERY_KEY });
    toast.success("Local audit log cleared.");
  }

  const localCount = localQ.data?.length ?? 0;

  return (
    <>
      <section className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="font-hand text-[12px] uppercase tracking-wider text-muted">
            Insights / Audit log
          </p>
          <SectionTitle className="mt-1">Audit log</SectionTitle>
          <p className="mt-2 font-hand text-[12px] text-muted">
            Synthesised from article history + this browser&apos;s mutation log
            (max {MAX_ENTRIES} entries, persisted in IndexedDB).
            <code className="ml-1">/admin/audit-log</code> would replace this.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Btn variant="default" size="sm" onClick={handleExport}>
            <Download size={12} aria-hidden /> Export CSV
          </Btn>
          <Btn
            variant="ghost"
            size="sm"
            onClick={handleClear}
            disabled={localCount === 0}
          >
            <Trash2 size={12} aria-hidden /> Clear local log
          </Btn>
        </div>
      </section>

      <Card>
        <div
          role="tablist"
          aria-label="Audit log filter"
          className="flex flex-wrap gap-1.5"
        >
          {AUDIT_FILTER_BUCKETS.map((b) => {
            const active = b === bucket;
            return (
              <button
                key={b}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => {
                  setBucket(b);
                  setPage(1);
                }}
                className={cn(
                  "px-2.5 py-1 rounded-md border-[1.5px] font-sans text-[12px] transition-colors",
                  active
                    ? "bg-ink text-paper border-ink"
                    : "bg-paper text-ink border-ink hover:bg-paper-2",
                )}
              >
                {AUDIT_FILTER_LABEL[b]}
              </button>
            );
          })}
        </div>
      </Card>

      <Card hov>
        <CardHead>
          <CardTitle>Activity</CardTitle>
          <CardMeta>
            {localQ.isPending || derivedQ.isPending
              ? "Loading…"
              : `${filtered.length} entries · ${localCount} local · ${derivedQ.data?.length ?? 0} derived`}
          </CardMeta>
        </CardHead>

        {localQ.isPending || derivedQ.isPending ? (
          <ListSkeleton />
        ) : pageItems.length === 0 ? (
          <p className="font-hand text-[12px] text-muted py-8 text-center">
            {merged.length === 0
              ? "No activity recorded yet — interactions in this browser populate the log going forward."
              : "No entries match this filter."}
          </p>
        ) : (
          <ul className="divide-y divide-ink/10">
            {pageItems.map((entry) => (
              <AuditEntryRow key={entry.id} entry={entry} />
            ))}
          </ul>
        )}

        {totalPages > 1 ? (
          <div className="mt-3 flex items-center justify-between gap-2">
            <Btn
              variant="default"
              size="sm"
              disabled={safePage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              ← Newer
            </Btn>
            <span className="font-hand text-[11px] text-muted">
              Page {safePage} / {totalPages}
            </span>
            <Btn
              variant="default"
              size="sm"
              disabled={safePage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Older →
            </Btn>
          </div>
        ) : null}
      </Card>
    </>
  );
}

function ListSkeleton() {
  return (
    <ul className="space-y-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <li
          key={i}
          className="h-10 bg-paper-2 rounded-sm animate-pulse"
          aria-hidden
        />
      ))}
    </ul>
  );
}

function toCsv(rows: Array<Record<string, string>>): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const escape = (v: string) =>
    /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((h) => escape(row[h] ?? "")).join(","));
  }
  return lines.join("\n");
}

function downloadCsv(filename: string, contents: string) {
  const blob = new Blob([contents], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
