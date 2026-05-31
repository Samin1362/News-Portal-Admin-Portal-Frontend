"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, Search } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { crumbForPath } from "./nav.config";
import { CommandPalette } from "./CommandPalette";
import { NotificationsMenu } from "./NotificationsMenu";
import { UserChip } from "./UserChip";
import { Pill } from "@/components/primitives/Pill";
import type { ArticleCardDTO } from "@/lib/types/article";

interface Props {
  /** True only when the mobile overlay is open (used for aria-expanded). */
  drawerOpen: boolean;
  onToggleDrawer: () => void;
}

// Rough proxy: scale the rolling sum of viewCount from the most recent
// published articles down to a plausible concurrent-reader figure.
// Replaced by a real /live endpoint in Phase 8.
const READER_RATIO = 0.0015;

function useLiveReaderEstimate(): number | null {
  const qc = useQueryClient();
  const traffic = qc.getQueryData<{ items: ArticleCardDTO[] }>([
    "overview",
    "traffic-14d",
  ]);
  if (!traffic?.items?.length) return null;
  const total = traffic.items.reduce((s, a) => s + (a.viewCount ?? 0), 0);
  return Math.max(1, Math.round(total * READER_RATIO));
}

export function Topbar({ drawerOpen, onToggleDrawer }: Props) {
  const pathname = usePathname() ?? "/";
  const crumb = crumbForPath(pathname);
  const liveReaders = useLiveReaderEstimate();
  const [paletteOpen, setPaletteOpen] = useState(false);

  const openPalette = useCallback(() => setPaletteOpen(true), []);
  const closePalette = useCallback(() => setPaletteOpen(false), []);

  // Global ⌘K / Ctrl+K opens the palette from anywhere.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const isK = e.key === "k" || e.key === "K";
      if (!isK) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest("input, textarea, [contenteditable='true']")) {
        if (!(e.metaKey || e.ctrlKey)) return;
      }
      if (e.metaKey || e.ctrlKey) {
        e.preventDefault();
        setPaletteOpen((prev) => !prev);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <header className="sticky top-0 z-30 bg-paper border-b-[1.5px] border-ink">
        <div className="flex items-center gap-3 px-4 sm:px-5 h-14">
          <button
            type="button"
            onClick={onToggleDrawer}
            aria-label="Toggle navigation"
            aria-expanded={drawerOpen}
            aria-controls="primary-nav-drawer"
            className="inline-flex items-center justify-center w-9 h-9 border-[1.5px] border-ink rounded-sm hover:bg-paper-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
          >
            <Menu size={16} aria-hidden />
          </button>

          <nav
            aria-label="Breadcrumb"
            className="hidden md:flex items-center gap-2 font-hand text-[12px] text-muted pl-1"
          >
            {crumb.groupLabel ? (
              <>
                <span>{crumb.groupLabel}</span>
                <span className="text-ink/30">/</span>
              </>
            ) : null}
            <span className="text-ink font-semibold truncate max-w-[28ch]">
              {crumb.label}
            </span>
          </nav>

          <div className="flex-1" />

          {/* Search trigger — wide pill on lg+, icon-only on smaller. */}
          <button
            type="button"
            onClick={openPalette}
            aria-label="Open command palette"
            aria-keyshortcuts="Meta+K Control+K"
            className="hidden lg:flex items-center gap-2 px-3 h-9 bg-paper-2 border-[1.5px] border-ink rounded-md min-w-[220px] xl:min-w-[260px] text-left hover:bg-paper transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 shadow-[2px_2px_0_var(--color-ink)]"
          >
            <Search size={14} aria-hidden className="text-muted" />
            <span className="flex-1 font-sans text-[13px] text-muted">
              Search…
            </span>
            <kbd className="font-mono text-[10px] text-muted bg-paper border border-ink/30 rounded px-1.5 py-0.5">
              ⌘K
            </kbd>
          </button>

          <button
            type="button"
            onClick={openPalette}
            aria-label="Open command palette"
            className="lg:hidden inline-flex items-center justify-center w-9 h-9 border-[1.5px] border-ink rounded-sm hover:bg-paper-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
          >
            <Search size={15} aria-hidden />
          </button>

          {liveReaders !== null ? (
            <Pill tone="accent-2" live className="hidden md:inline-flex">
              <span title="Estimated from the rolling sum of recent article views — replaced by a real concurrency stream in Phase 8.">
                live · {liveReaders.toLocaleString()} reader
                {liveReaders === 1 ? "" : "s"}
              </span>
            </Pill>
          ) : null}

          {/* Visual divider between context tools and identity cluster. */}
          <span aria-hidden className="hidden sm:inline-block w-px h-6 bg-ink/15" />

          <NotificationsMenu />

          <UserChip />
        </div>
      </header>
      <CommandPalette open={paletteOpen} onClose={closePalette} />
    </>
  );
}
