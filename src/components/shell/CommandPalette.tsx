"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { FileText, Search, User, ArrowRight, X } from "lucide-react";
import { useAdminAuth } from "@/lib/auth/AdminAuthProvider";
import { listUsers } from "@/lib/api/users.api";
import { listQueue } from "@/lib/api/articles.api";
import type { ArticleCardDTO } from "@/lib/types/article";
import type { UserProfile } from "@/lib/auth/types";
import { NAV } from "./nav.config";
import { cn } from "@/lib/utils/cn";

interface Props {
  open: boolean;
  onClose: () => void;
}

interface FlatPage {
  key: string;
  label: string;
  href: string;
  groupLabel?: string;
}

const PAGE_ENTRIES: FlatPage[] = (() => {
  const out: FlatPage[] = [];
  for (const item of NAV) {
    if (item.kind === "single") {
      out.push({ key: item.key, label: item.label, href: item.href });
    } else {
      for (const child of item.children) {
        out.push({
          key: `${item.key}.${child.key}`,
          label: child.label,
          href: child.href,
          groupLabel: item.label,
        });
      }
    }
  }
  return out;
})();

type ResultRow =
  | { kind: "page"; id: string; label: string; href: string; hint: string }
  | { kind: "user"; id: string; label: string; href: string; hint: string }
  | { kind: "article"; id: string; label: string; href: string; hint: string };

/**
 * Centred overlay command palette. Opens via ⌘K / Ctrl+K or the topbar
 * search input. Three sections — Pages (static, NAV-derived), Users
 * (live /users?q=), Articles (filter cached queue + live /articles?q=).
 *
 * Selecting a row routes to the entry's href and closes the palette.
 */
export function CommandPalette({ open, onClose }: Props) {
  const router = useRouter();
  const { getIdToken } = useAdminAuth();
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [focused, setFocused] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Reset state every time the palette opens. Render-phase compare-and-set
  // keeps the React 19 set-state-in-effect rule happy. Use a boolean
  // mirror of `open` (not Date.now) so the check stays pure.
  const [wasOpen, setWasOpen] = useState(false);
  if (open && !wasOpen) setWasOpen(true);
  if (!open && wasOpen) {
    setWasOpen(false);
    if (query !== "") setQuery("");
    if (debounced !== "") setDebounced("");
    if (focused !== 0) setFocused(0);
  }

  // Debounce the query so we don't fire a fetch on every keystroke.
  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => setDebounced(query.trim()), 180);
    return () => window.clearTimeout(t);
  }, [query, open]);

  // Focus the input on open + lock background scroll.
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const t = window.setTimeout(() => inputRef.current?.focus(), 30);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.clearTimeout(t);
    };
  }, [open]);

  const usersQ = useQuery({
    enabled: open && debounced.length > 0,
    queryKey: ["palette", "users", debounced],
    queryFn: async () => {
      const token = await getIdToken();
      if (!token) return [] as UserProfile[];
      const res = await listUsers({ q: debounced, page: 1, limit: 5 }, token);
      return res.data ?? [];
    },
    staleTime: 30_000,
  });

  const articlesQ = useQuery({
    enabled: open && debounced.length > 0,
    queryKey: ["palette", "articles", debounced],
    queryFn: async () => {
      const token = await getIdToken();
      if (!token) return [] as ArticleCardDTO[];
      const res = await listQueue(
        { status: "all", page: 1, limit: 50 },
        token,
      );
      const items = res.data ?? [];
      const lc = debounced.toLowerCase();
      return items
        .filter((a) => a.headline.toLowerCase().includes(lc))
        .slice(0, 8);
    },
    staleTime: 30_000,
  });

  const results = useMemo<ResultRow[]>(() => {
    const lc = debounced.toLowerCase();
    const pages: ResultRow[] =
      lc.length === 0
        ? PAGE_ENTRIES.slice(0, 6).map((p) => ({
            kind: "page",
            id: `page:${p.key}`,
            label: p.label,
            href: p.href,
            hint: p.groupLabel ?? "Page",
          }))
        : PAGE_ENTRIES.filter(
            (p) =>
              p.label.toLowerCase().includes(lc) ||
              (p.groupLabel?.toLowerCase().includes(lc) ?? false),
          )
            .slice(0, 6)
            .map((p) => ({
              kind: "page",
              id: `page:${p.key}`,
              label: p.label,
              href: p.href,
              hint: p.groupLabel ?? "Page",
            }));

    const users: ResultRow[] =
      lc.length === 0
        ? []
        : (usersQ.data ?? []).map((u) => ({
            kind: "user",
            id: `user:${u.id}`,
            label: u.displayName,
            href: `/people/users/${u.id}`,
            hint: `${u.role} · ${u.email}`,
          }));

    const articles: ResultRow[] =
      lc.length === 0
        ? []
        : (articlesQ.data ?? []).map((a) => ({
            kind: "article",
            id: `article:${a.id}`,
            label: a.headline,
            href: `/content/articles/${a.id}/edit`,
            hint: a.status,
          }));

    return [...pages, ...users, ...articles];
  }, [debounced, usersQ.data, articlesQ.data]);

  // Clamp focused index when results change.
  if (focused >= results.length && results.length > 0) {
    setFocused(0);
  }

  const choose = useCallback(
    (row: ResultRow) => {
      onClose();
      router.push(row.href);
    },
    [onClose, router],
  );

  function handleKey(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
      return;
    }
    if (results.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocused((i) => (i + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocused((i) => (i - 1 + results.length) % results.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const row = results[focused];
      if (row) choose(row);
    }
  }

  if (!open) return null;
  if (typeof document === "undefined") return null;

  const showLoading =
    debounced.length > 0 && (usersQ.isFetching || articlesQ.isFetching);

  let lastKind: ResultRow["kind"] | null = null;

  return createPortal(
    <div
      data-modal-open="true"
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
      onKeyDown={handleKey}
      className="fixed inset-0 z-[80] flex items-start justify-center px-4 pt-[12vh] bg-ink/45 backdrop-blur-[2px]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-xl bg-paper border-[1.5px] border-ink rounded-sm shadow-[6px_6px_0_var(--color-ink)] overflow-hidden flex flex-col max-h-[70vh]"
      >
        <div className="flex items-center gap-2 px-3 h-12 border-b border-ink/15">
          <Search size={15} aria-hidden className="text-muted" />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search pages, users, articles…"
            className="flex-1 bg-transparent outline-none font-sans text-[14px] placeholder:text-muted"
            aria-label="Search"
            aria-autocomplete="list"
            aria-controls="palette-results"
            aria-activedescendant={
              results[focused] ? `palette-row-${results[focused].id}` : undefined
            }
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close palette"
            className="inline-flex items-center justify-center w-7 h-7 rounded-sm hover:bg-paper-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
          >
            <X size={14} aria-hidden />
          </button>
        </div>

        <div
          id="palette-results"
          role="listbox"
          className="flex-1 overflow-y-auto"
        >
          {results.length === 0 ? (
            <div className="p-6 text-center">
              <p className="font-sans text-[13px] text-muted">
                {debounced.length === 0
                  ? "Start typing to search…"
                  : showLoading
                    ? "Searching…"
                    : "No matches."}
              </p>
            </div>
          ) : (
            <ul className="py-1">
              {results.map((row, idx) => {
                const headerLabel =
                  row.kind !== lastKind
                    ? row.kind === "page"
                      ? "Pages"
                      : row.kind === "user"
                        ? "Users"
                        : "Articles"
                    : null;
                lastKind = row.kind;
                const Icon =
                  row.kind === "page"
                    ? ArrowRight
                    : row.kind === "user"
                      ? User
                      : FileText;
                const active = idx === focused;
                return (
                  <li key={row.id}>
                    {headerLabel ? (
                      <p className="px-3 pt-2 pb-1 font-hand text-[10px] uppercase tracking-wider text-muted">
                        {headerLabel}
                      </p>
                    ) : null}
                    <button
                      id={`palette-row-${row.id}`}
                      type="button"
                      role="option"
                      aria-selected={active}
                      onMouseEnter={() => setFocused(idx)}
                      onClick={() => choose(row)}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2 text-left",
                        "focus:outline-none",
                        active ? "bg-paper-2" : "hover:bg-paper-2/70",
                      )}
                    >
                      <Icon
                        size={14}
                        aria-hidden
                        className={cn(
                          "shrink-0",
                          active ? "text-accent" : "text-muted",
                        )}
                      />
                      <span className="flex-1 min-w-0">
                        <span className="block font-sans text-[13px] font-semibold truncate">
                          {row.label}
                        </span>
                        <span className="block font-hand text-[11px] text-muted truncate">
                          {row.hint}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <footer className="flex items-center justify-between gap-3 px-3 py-2 border-t border-ink/15 bg-paper-2">
          <span className="font-hand text-[10px] text-muted">
            <kbd className="font-mono bg-paper border border-ink/30 rounded px-1 py-0.5 text-[10px] mr-1">↑↓</kbd>
            navigate
            <span className="mx-2">·</span>
            <kbd className="font-mono bg-paper border border-ink/30 rounded px-1 py-0.5 text-[10px] mr-1">Enter</kbd>
            open
            <span className="mx-2">·</span>
            <kbd className="font-mono bg-paper border border-ink/30 rounded px-1 py-0.5 text-[10px] mr-1">Esc</kbd>
            close
          </span>
          <span className="font-hand text-[10px] text-muted hidden sm:inline">
            {results.length} result{results.length === 1 ? "" : "s"}
          </span>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
