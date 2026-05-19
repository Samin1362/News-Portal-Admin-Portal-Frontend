"use client";

import { usePathname } from "next/navigation";
import { Bell, Menu, Search } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { crumbForPath } from "./nav.config";
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

  return (
    <header className="sticky top-0 z-30 bg-paper border-b-[1.5px] border-ink">
      <div className="flex items-center gap-3 px-4 sm:px-5 h-14">
        <button
          type="button"
          onClick={onToggleDrawer}
          aria-label="Toggle navigation"
          aria-expanded={drawerOpen}
          aria-controls="primary-nav-drawer"
          className="inline-flex items-center justify-center w-9 h-9 border-[1.5px] border-ink rounded-sm hover:bg-paper-2 transition-colors"
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

        <div className="hidden lg:flex items-center gap-2 px-3 h-9 bg-paper-2 border-[1.5px] border-ink rounded-md min-w-[220px] xl:min-w-[260px]">
          <Search size={14} aria-hidden className="text-muted" />
          <input
            type="search"
            placeholder="Search — ⌘K"
            className="flex-1 bg-transparent outline-none font-sans text-[13px] placeholder:text-muted"
            disabled
            aria-disabled
          />
        </div>

        {liveReaders !== null ? (
          <Pill tone="accent-2" live className="hidden md:inline-flex">
            <span title="Estimated from the rolling sum of recent article views — replaced by a real concurrency stream in Phase 8.">
              live · {liveReaders.toLocaleString()} reader
              {liveReaders === 1 ? "" : "s"}
            </span>
          </Pill>
        ) : null}

        <button
          type="button"
          aria-label="Notifications"
          className="relative inline-flex items-center justify-center w-9 h-9 border-[1.5px] border-ink rounded-sm hover:bg-paper-2 live-dot"
        >
          <Bell size={15} aria-hidden />
        </button>

        <UserChip />
      </div>
    </header>
  );
}

