import {
  BarChart3,
  Cog,
  FileText,
  LayoutDashboard,
  Megaphone,
  ShieldAlert,
  Users,
  type LucideIcon,
} from "lucide-react";

export type CountKey =
  | "role-requests-pending"
  | "queue-submitted"
  | "comments-pending";

export interface NavChild {
  key: string;
  label: string;
  href: string;
  countKey?: CountKey;
}

export type NavItem =
  | {
      kind: "single";
      key: string;
      label: string;
      href: string;
      icon: LucideIcon;
      countKey?: CountKey;
    }
  | {
      kind: "group";
      key: string;
      label: string;
      icon: LucideIcon;
      defaultOpen?: boolean;
      children: NavChild[];
    };

/**
 * Single source of truth for sidebar render, breadcrumb resolution, and
 * mobile bottom-tab selection. See admin_portal_plan.md §"Navigation
 * Architecture".
 */
export const NAV: NavItem[] = [
  {
    kind: "single",
    key: "overview",
    label: "Overview",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    kind: "group",
    key: "people",
    label: "People",
    icon: Users,
    defaultOpen: true,
    children: [
      { key: "users", label: "Users", href: "/people/users" },
      {
        key: "role-requests",
        label: "Role requests",
        href: "/people/role-requests",
        countKey: "role-requests-pending",
      },
    ],
  },
  {
    kind: "group",
    key: "content",
    label: "Content",
    icon: FileText,
    defaultOpen: true,
    children: [
      { key: "articles", label: "All articles", href: "/content/articles" },
      {
        key: "queue",
        label: "Editorial queue",
        href: "/content/articles/queue",
        countKey: "queue-submitted",
      },
      { key: "categories", label: "Categories", href: "/content/categories" },
      { key: "tags", label: "Tags", href: "/content/tags" },
    ],
  },
  {
    kind: "group",
    key: "moderation",
    label: "Moderation",
    icon: ShieldAlert,
    children: [
      {
        key: "comments",
        label: "Comments",
        href: "/moderation/comments",
        countKey: "comments-pending",
      },
    ],
  },
  {
    kind: "group",
    key: "marketing",
    label: "Marketing",
    icon: Megaphone,
    children: [
      { key: "ads", label: "Advertisements", href: "/marketing/ads" },
      {
        key: "revenue",
        label: "Revenue & performance",
        href: "/marketing/revenue",
      },
    ],
  },
  {
    kind: "group",
    key: "insights",
    label: "Insights",
    icon: BarChart3,
    children: [
      { key: "analytics", label: "Analytics", href: "/insights/analytics" },
      { key: "audit", label: "Audit log", href: "/insights/audit" },
    ],
  },
  {
    kind: "group",
    key: "system",
    label: "System",
    icon: Cog,
    children: [
      { key: "settings", label: "Settings", href: "/system/settings" },
      { key: "api-keys", label: "API & Webhooks", href: "/system/api-keys" },
    ],
  },
];

/** Flat list of every registered nav href — singles + group children. */
const ALL_HREFS: string[] = (() => {
  const out: string[] = [];
  for (const item of NAV) {
    if (item.kind === "single") out.push(item.href);
    else for (const child of item.children) out.push(child.href);
  }
  return out;
})();

/**
 * Sibling-aware active check. True when:
 *   - pathname exactly equals href, OR
 *   - pathname is a deep descendant (`href + "/…"`) AND no other registered
 *     nav href is a strictly longer matching prefix.
 *
 * Without the longer-prefix guard, "All articles" (`/content/articles`)
 * also lights up when the user is on its sibling "Editorial queue"
 * (`/content/articles/queue`) — two highlights at once. The guard makes
 * the more specific registered entry claim the active state, while deep
 * unregistered routes like `/content/articles/[id]/edit` still bubble up
 * to "All articles" as expected.
 */
export function isNavHrefActive(href: string, pathname: string): boolean {
  if (href === "/") return pathname === "/";
  if (pathname === href) return true;
  if (!pathname.startsWith(href + "/")) return false;
  for (const other of ALL_HREFS) {
    if (other === href) continue;
    if (
      other.length > href.length &&
      (pathname === other || pathname.startsWith(other + "/"))
    ) {
      return false;
    }
  }
  return true;
}

export interface Crumb {
  groupLabel?: string;
  label: string;
}

/**
 * Map a pathname → breadcrumb segments. Falls back to the path itself when
 * no entry matches (useful for dynamic routes during dev).
 */
export function crumbForPath(pathname: string): Crumb {
  // Prefer exact match first.
  for (const item of NAV) {
    if (item.kind === "single" && item.href === pathname) {
      return { label: item.label };
    }
    if (item.kind === "group") {
      for (const child of item.children) {
        if (child.href === pathname) {
          return { groupLabel: item.label, label: child.label };
        }
      }
    }
  }
  // Prefix match (handles deep routes like /people/users/[id] or /content/articles/[id]/edit).
  // Prefer the longest matching child href so siblings like /content/articles
  // and /content/articles/queue don't both claim the same deep path.
  let best: { groupLabel: string; label: string; len: number } | null = null;
  for (const item of NAV) {
    if (item.kind !== "group") continue;
    for (const child of item.children) {
      if (pathname.startsWith(child.href + "/") && child.href.length > (best?.len ?? -1)) {
        best = {
          groupLabel: item.label,
          label: child.label,
          len: child.href.length,
        };
      }
    }
  }
  if (best) return { groupLabel: best.groupLabel, label: best.label };
  return { label: pathname };
}

/** Group key whose subtree contains the given pathname, if any. */
export function groupForPath(pathname: string): string | null {
  for (const item of NAV) {
    if (item.kind === "group") {
      for (const child of item.children) {
        if (pathname === child.href || pathname.startsWith(child.href + "/")) {
          return item.key;
        }
      }
    }
  }
  return null;
}

