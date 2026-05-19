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
  for (const item of NAV) {
    if (item.kind === "group") {
      for (const child of item.children) {
        if (pathname.startsWith(child.href + "/")) {
          return { groupLabel: item.label, label: child.label };
        }
      }
    }
  }
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

