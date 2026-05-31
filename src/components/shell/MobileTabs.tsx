"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  FileText,
  LayoutDashboard,
  ShieldAlert,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useNavCounts } from "@/hooks/useNavCounts";
import { cn } from "@/lib/utils/cn";

interface Tab {
  key: string;
  label: string;
  href: string;
  icon: LucideIcon;
  match: (pathname: string) => boolean;
  badgeKey?: "role-requests-pending" | "queue-submitted" | "comments-pending";
}

const TABS: Tab[] = [
  {
    key: "overview",
    label: "Overview",
    href: "/",
    icon: LayoutDashboard,
    match: (p) => p === "/",
  },
  {
    key: "people",
    label: "People",
    href: "/people/users",
    icon: Users,
    match: (p) => p.startsWith("/people"),
    badgeKey: "role-requests-pending",
  },
  {
    key: "content",
    label: "Content",
    href: "/content/articles",
    icon: FileText,
    match: (p) => p.startsWith("/content"),
    badgeKey: "queue-submitted",
  },
  {
    key: "moderation",
    label: "Moderate",
    href: "/moderation/comments",
    icon: ShieldAlert,
    match: (p) => p.startsWith("/moderation"),
    badgeKey: "comments-pending",
  },
  {
    key: "insights",
    label: "Insights",
    href: "/insights/analytics",
    icon: BarChart3,
    match: (p) => p.startsWith("/insights") || p.startsWith("/marketing"),
  },
];

/**
 * Bottom-tab nav for narrow viewports. Hidden on lg+ where the sidebar
 * is the primary navigation. Mirrors the top five sidebar groups so a
 * mobile user never has to open the drawer for the common destinations.
 */
export function MobileTabs() {
  const pathname = usePathname() ?? "/";
  const counts = useNavCounts();

  return (
    <nav
      aria-label="Primary mobile navigation"
      className={cn(
        "lg:hidden fixed bottom-0 inset-x-0 z-30",
        "bg-paper border-t-[1.5px] border-ink",
        "pb-[env(safe-area-inset-bottom)]",
      )}
    >
      <ul className="grid grid-cols-5">
        {TABS.map((tab) => {
          const active = tab.match(pathname);
          const Icon = tab.icon;
          const badge = tab.badgeKey ? counts[tab.badgeKey] : undefined;
          return (
            <li key={tab.key}>
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                aria-label={tab.label}
                className={cn(
                  "relative flex flex-col items-center justify-center gap-0.5 py-2",
                  "font-sans text-[10px] font-semibold uppercase tracking-wider",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
                  active ? "text-accent" : "text-ink/70 hover:text-ink",
                )}
              >
                <Icon size={18} aria-hidden />
                <span>{tab.label}</span>
                {typeof badge === "number" && badge > 0 ? (
                  <span
                    className="absolute top-1 right-[calc(50%-18px)] inline-flex items-center justify-center min-w-[14px] h-[14px] px-0.5 rounded-full bg-accent text-paper font-sans text-[9px] font-bold"
                    aria-hidden
                  >
                    {badge > 9 ? "9+" : badge}
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
