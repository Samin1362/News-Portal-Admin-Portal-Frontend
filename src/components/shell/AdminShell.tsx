"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { Ticker, type TickerItem } from "./Ticker";
import { MobileTabs } from "./MobileTabs";
import {
  useStoredDrawerExpanded,
  writeStoredDrawerExpanded,
} from "@/hooks/useStoredDrawerExpanded";
import { usePortalPrefs } from "@/hooks/usePortalPrefs";
import { useNavCounts } from "@/hooks/useNavCounts";
import { cn } from "@/lib/utils/cn";

interface Props {
  children: ReactNode;
}

/**
 * App shell — sidebar + topbar + main content area.
 *
 * The horizontal `Ticker` strip that used to sit below the Topbar was
 * removed because it only ever rendered placeholder em-dashes (no real
 * `/metrics` stream wired up yet). The same metrics are already surfaced
 * by the `SystemHealth` widget on the overview page and the `live · N
 * readers` pill in the Topbar, so the strip was pure visual noise.
 * Re-add `<Ticker items={…} />` here once it can show real values.
 */
export function AdminShell({ children }: Props) {
  const expanded = useStoredDrawerExpanded();
  const prefs = usePortalPrefs();
  const counts = useNavCounts();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Reflect the chosen density onto <html data-density="…"> so the
  // `--pad` token cascades to every page. Mounted client-side only to
  // keep SSR clean (default ships without the attribute).
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.dataset.density = prefs.density;
    return () => {
      delete document.documentElement.dataset.density;
    };
  }, [prefs.density]);

  // The ticker is opt-in via portal prefs. Until a real /metrics
  // stream exists, surface the live nav counts as a stand-in so the
  // toggle has visible effect.
  const tickerItems: TickerItem[] = [
    { label: "Pending role requests", value: String(counts["role-requests-pending"] ?? 0) },
    { label: "Submitted articles", value: String(counts["queue-submitted"] ?? 0) },
    { label: "Pending comments", value: String(counts["comments-pending"] ?? 0) },
  ];

  // One toggle button drives both: on lg+ it flips the persisted desktop
  // expanded/collapsed state; on smaller widths it toggles the offcanvas
  // overlay.
  const handleToggle = useCallback(() => {
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(min-width: 1024px)").matches
    ) {
      writeStoredDrawerExpanded(!expanded);
    } else {
      setMobileOpen((v) => !v);
    }
  }, [expanded]);

  const expandDesktop = useCallback(() => {
    writeStoredDrawerExpanded(true);
  }, []);

  return (
    <div className="min-h-screen bg-canvas">
      {/* Skip-to-content link — visible only when focused. Keyboard-only
          users land on it via Tab from the URL bar before hitting the
          sidebar's many nav links. */}
      <a
        href="#admin-main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:px-3 focus:py-1.5 focus:bg-ink focus:text-paper focus:rounded-sm focus:font-sans focus:text-[12px] focus:font-semibold"
      >
        Skip to content
      </a>
      <Sidebar
        expanded={expanded}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
        onExpandDesktop={expandDesktop}
      />

      <div
        className={cn(
          "flex flex-col min-h-screen",
          "transition-[padding-left] duration-300",
          "[transition-timing-function:cubic-bezier(0.22,1,0.36,1)]",
          expanded ? "lg:pl-[260px]" : "lg:pl-14",
        )}
      >
        <Topbar onToggleDrawer={handleToggle} drawerOpen={mobileOpen} />
        {prefs.showTicker ? <Ticker items={tickerItems} /> : null}

        <main
          id="admin-main"
          tabIndex={-1}
          className="flex-1 px-4 sm:px-6 lg:px-8 py-5 pb-24 lg:pb-10 focus:outline-none"
        >
          <div className="stagger flex flex-col gap-5 max-w-[1280px] mx-auto w-full">
            {children}
          </div>
        </main>

        <MobileTabs />
      </div>
    </div>
  );
}
