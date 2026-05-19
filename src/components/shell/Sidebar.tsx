"use client";

import { useCallback, useEffect, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { useNavCounts } from "@/hooks/useNavCounts";
import {
  useStoredNavExpanded,
  writeStoredNavExpanded,
} from "@/hooks/useStoredNavExpanded";
import { NAV, groupForPath, type NavItem } from "./nav.config";
import { cn } from "@/lib/utils/cn";

interface Props {
  /** Desktop preference: false = rail (icons only), true = full width. */
  expanded: boolean;
  /** Mobile overlay visibility. */
  mobileOpen: boolean;
  onCloseMobile: () => void;
  /** Called when the user clicks a group icon in rail mode — promotes the
   *  drawer to full width so the user can see the sub-routes. */
  onExpandDesktop: () => void;
}

export function Sidebar({
  expanded,
  mobileOpen,
  onCloseMobile,
  onExpandDesktop,
}: Props) {
  const pathname = usePathname() ?? "/";
  const counts = useNavCounts();
  const storedAccordion = useStoredNavExpanded();

  // Effective accordion = persisted set ∪ the group containing the active
  // route. Derived at render time so we never have to setState-in-effect.
  const accordionOpen = useMemo<ReadonlySet<string>>(() => {
    const active = groupForPath(pathname);
    if (!active || storedAccordion.has(active)) return storedAccordion;
    return new Set([...storedAccordion, active]);
  }, [storedAccordion, pathname]);

  const toggleAccordion = useCallback(
    (key: string) => {
      const next = new Set(storedAccordion);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      writeStoredNavExpanded(next);
    },
    [storedAccordion],
  );

  const handleGroupRailClick = useCallback(
    (key: string) => {
      onExpandDesktop();
      if (!storedAccordion.has(key)) {
        const next = new Set(storedAccordion);
        next.add(key);
        writeStoredNavExpanded(next);
      }
    },
    [onExpandDesktop, storedAccordion],
  );

  const isActive = useCallback(
    (href: string) =>
      href === "/"
        ? pathname === "/"
        : pathname === href || pathname.startsWith(href + "/"),
    [pathname],
  );

  // ESC closes the mobile overlay (no-op on desktop where drawer is sticky).
  useEffect(() => {
    if (!mobileOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCloseMobile();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileOpen, onCloseMobile]);

  // Lock body scroll only while the mobile overlay is open.
  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  return (
    <>
      {/* Mobile backdrop — desktop never shows it because drawer is sticky. */}
      <button
        type="button"
        aria-label="Close menu"
        onClick={onCloseMobile}
        tabIndex={mobileOpen ? 0 : -1}
        className={cn(
          "lg:hidden fixed inset-0 z-40 bg-ink/45 backdrop-blur-[2px]",
          "transition-opacity duration-200 ease-out",
          mobileOpen ? "opacity-100" : "opacity-0 pointer-events-none",
        )}
      />

      <aside
        id="primary-nav-drawer"
        aria-label="Primary navigation"
        className={cn(
          "fixed inset-y-0 left-0 z-50 bg-paper-2 border-r-[1.5px] border-ink",
          "shadow-2xl lg:shadow-none",
          "flex flex-col overflow-x-visible",
          "transition-[width,transform] duration-300 will-change-transform",
          "[transition-timing-function:cubic-bezier(0.22,1,0.36,1)]",
          // Width: mobile is always 260 when shown; desktop = 14 or 260.
          "w-[260px]",
          expanded ? "lg:w-[260px]" : "lg:w-14",
          // Mobile translate: hidden offscreen unless mobileOpen.
          mobileOpen ? "translate-x-0" : "-translate-x-full",
          // Desktop: always visible regardless of mobileOpen.
          "lg:translate-x-0",
        )}
      >
        {/* Brand */}
        <div className="flex items-center h-14 border-b-[1.5px] border-ink/40 shrink-0 px-3">
          <Link
            href="/"
            onClick={onCloseMobile}
            className="serif font-extrabold tracking-tight flex items-center"
          >
            <span
              className={cn(
                "text-[18px] whitespace-nowrap",
                expanded ? "lg:inline" : "lg:hidden",
              )}
            >
              Deligo<span className="text-accent">·</span>Admin
            </span>
            <span
              className={cn(
                "text-[20px] leading-none hidden",
                expanded ? "lg:hidden" : "lg:inline-flex",
              )}
            >
              D<span className="text-accent">·</span>
            </span>
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto overflow-x-visible py-3 px-2">
          <ul className="space-y-1">
            {NAV.map((item) =>
              item.kind === "single" ? (
                <SingleItem
                  key={item.key}
                  item={item}
                  active={isActive(item.href)}
                  count={item.countKey ? counts[item.countKey] : undefined}
                  expanded={expanded}
                  onNavigate={onCloseMobile}
                />
              ) : (
                <GroupItem
                  key={item.key}
                  item={item}
                  open={accordionOpen.has(item.key)}
                  activeChildHref={isActive}
                  onToggle={() => toggleAccordion(item.key)}
                  onRailClick={() => handleGroupRailClick(item.key)}
                  counts={counts}
                  expanded={expanded}
                  onNavigate={onCloseMobile}
                />
              ),
            )}
          </ul>
        </nav>

        <footer
          className={cn(
            "px-4 py-3 border-t-[1.5px] border-ink/40 shrink-0",
            expanded ? "" : "lg:hidden",
          )}
        >
          <p className="font-hand text-[11px] text-muted whitespace-nowrap">
            Deligo News · Control Center
          </p>
        </footer>
      </aside>
    </>
  );
}

function SingleItem({
  item,
  active,
  count,
  expanded,
  onNavigate,
}: {
  item: Extract<NavItem, { kind: "single" }>;
  active: boolean;
  count?: number;
  expanded: boolean;
  onNavigate: () => void;
}) {
  const Icon = item.icon;
  return (
    <li className="relative group">
      <Link
        href={item.href}
        onClick={onNavigate}
        aria-current={active ? "page" : undefined}
        className={cn(
          "relative flex items-center gap-2.5 rounded-md font-sans text-[13px] transition-colors",
          "px-3 py-2",
          expanded
            ? "lg:px-3 lg:justify-start"
            : "lg:px-0 lg:justify-center",
          active
            ? "nav-active bg-ink text-paper"
            : "text-ink hover:bg-paper",
        )}
      >
        <Icon size={16} aria-hidden className="shrink-0" />
        <span
          className={cn(
            "flex-1 truncate",
            expanded ? "" : "lg:hidden",
          )}
        >
          {item.label}
        </span>
        {typeof count === "number" && count > 0 ? (
          <>
            <span
              className={cn(
                "inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-accent text-paper font-sans text-[10px] font-bold",
                expanded ? "" : "lg:hidden",
              )}
            >
              {count > 99 ? "99+" : count}
            </span>
            <span
              className={cn(
                "absolute top-0.5 right-0.5 items-center justify-center min-w-[14px] h-[14px] px-0.5 rounded-full bg-accent text-paper font-sans text-[9px] font-bold hidden",
                expanded ? "lg:hidden" : "lg:inline-flex",
              )}
            >
              {count > 9 ? "9+" : count}
            </span>
          </>
        ) : null}
      </Link>
      {!expanded ? <RailTooltip label={item.label} /> : null}
    </li>
  );
}

function GroupItem({
  item,
  open,
  activeChildHref,
  onToggle,
  onRailClick,
  counts,
  expanded,
  onNavigate,
}: {
  item: Extract<NavItem, { kind: "group" }>;
  open: boolean;
  activeChildHref: (href: string) => boolean;
  onToggle: () => void;
  onRailClick: () => void;
  counts: ReturnType<typeof useNavCounts>;
  expanded: boolean;
  onNavigate: () => void;
}) {
  const Icon = item.icon;
  const groupHasActive = useMemo(
    () => item.children.some((c) => activeChildHref(c.href)),
    [item.children, activeChildHref],
  );
  const childCountTotal = useMemo(
    () =>
      item.children.reduce((sum, c) => {
        const n = c.countKey ? counts[c.countKey] : 0;
        return sum + (typeof n === "number" ? n : 0);
      }, 0),
    [item.children, counts],
  );

  // Rail mode on desktop = promote the drawer to full + open the accordion.
  // Anywhere else = toggle the accordion inline.
  const handleClick = () => {
    const isDesktopRail =
      typeof window !== "undefined" &&
      window.matchMedia("(min-width: 1024px)").matches &&
      !expanded;
    if (isDesktopRail) onRailClick();
    else onToggle();
  };

  return (
    <li className="relative group">
      <button
        type="button"
        onClick={handleClick}
        aria-expanded={open}
        aria-controls={`nav-group-${item.key}`}
        className={cn(
          "w-full relative flex items-center gap-2.5 rounded-md font-sans text-[13px] transition-colors",
          "px-3 py-2",
          expanded
            ? "lg:px-3 lg:justify-start"
            : "lg:px-0 lg:justify-center",
          groupHasActive
            ? "text-ink font-semibold bg-paper"
            : "text-ink/85 hover:bg-paper",
        )}
      >
        <Icon size={16} aria-hidden className="shrink-0" />
        <span
          className={cn(
            "flex-1 text-left truncate",
            expanded ? "" : "lg:hidden",
          )}
        >
          {item.label}
        </span>
        {childCountTotal > 0 && !open ? (
          <span
            className={cn(
              "inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-accent text-paper font-sans text-[10px] font-bold",
              expanded ? "" : "lg:hidden",
            )}
          >
            {childCountTotal > 99 ? "99+" : childCountTotal}
          </span>
        ) : null}
        <ChevronDown
          size={14}
          aria-hidden
          className={cn(
            "transition-transform duration-200 shrink-0",
            open ? "rotate-180" : "rotate-0",
            expanded ? "" : "lg:hidden",
          )}
        />
        {childCountTotal > 0 ? (
          <span
            className={cn(
              "absolute top-0.5 right-0.5 items-center justify-center min-w-[14px] h-[14px] px-0.5 rounded-full bg-accent text-paper font-sans text-[9px] font-bold hidden",
              expanded ? "lg:hidden" : "lg:inline-flex",
            )}
          >
            {childCountTotal > 9 ? "9+" : childCountTotal}
          </span>
        ) : null}
      </button>

      {!expanded ? <RailTooltip label={item.label} /> : null}

      {/* Sub-routes — animated accordion, hidden entirely in rail mode on lg+. */}
      <div
        id={`nav-group-${item.key}`}
        inert={!open}
        className={cn(
          "grid transition-[grid-template-rows] duration-200 ease-out",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
          expanded ? "" : "lg:hidden",
        )}
      >
        <div className="overflow-hidden">
          <ul className="mt-1 mb-1.5 pl-3 ml-2.5 border-l border-ink/20 space-y-0.5">
            {item.children.map((child) => {
              const active = activeChildHref(child.href);
              const count = child.countKey ? counts[child.countKey] : undefined;
              return (
                <li key={child.key}>
                  <Link
                    href={child.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "relative flex items-center gap-2 px-3 py-1.5 rounded-md font-sans text-[12.5px] transition-colors",
                      active
                        ? "nav-active bg-ink text-paper"
                        : "text-ink/85 hover:bg-paper",
                    )}
                  >
                    <span className="flex-1 truncate">{child.label}</span>
                    {typeof count === "number" && count > 0 ? (
                      <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-accent text-paper font-sans text-[10px] font-bold">
                        {count > 99 ? "99+" : count}
                      </span>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </li>
  );
}

function RailTooltip({ label }: { label: string }) {
  return (
    <span
      role="tooltip"
      className={cn(
        "hidden lg:block absolute left-full top-1/2 -translate-y-1/2 ml-2",
        "px-2 py-1 bg-ink text-paper font-sans text-[11px] rounded",
        "whitespace-nowrap pointer-events-none shadow-md z-[60]",
        "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100",
        "transition-opacity duration-150",
      )}
    >
      {label}
    </span>
  );
}
