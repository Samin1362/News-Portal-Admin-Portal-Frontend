"use client";

import { useCallback, useState, type ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { Ticker, type TickerItem } from "./Ticker";
import {
  useStoredDrawerExpanded,
  writeStoredDrawerExpanded,
} from "@/hooks/useStoredDrawerExpanded";
import { cn } from "@/lib/utils/cn";

const PLACEHOLDER_TICKER: TickerItem[] = [
  { label: "Uptime", value: "—" },
  { label: "Error rate", value: "—" },
  { label: "Live readers", value: "—" },
  { label: "CDN cache", value: "—" },
  { label: "DB p95", value: "—" },
  { label: "Storage", value: "—" },
];

interface Props {
  children: ReactNode;
}

export function AdminShell({ children }: Props) {
  const expanded = useStoredDrawerExpanded();
  const [mobileOpen, setMobileOpen] = useState(false);

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
        <Ticker items={PLACEHOLDER_TICKER} />

        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-5 pb-10">
          <div className="stagger flex flex-col gap-5 max-w-[1280px] mx-auto w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
