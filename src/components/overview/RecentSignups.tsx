"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Card, CardHead, CardTitle, CardMeta } from "@/components/primitives/Card";
import { Avatar } from "@/components/primitives/Avatar";
import { Pill } from "@/components/primitives/Pill";
import { useAdminAuth } from "@/lib/auth/AdminAuthProvider";
import { listUsers } from "@/lib/api/users.api";
import { formatRelative } from "@/lib/utils/format";
import type { UserProfile, UserRole } from "@/lib/auth/types";

const ROLE_TONE: Record<UserRole, "ink" | "accent" | "accent-2" | "info" | "muted"> = {
  admin: "accent",
  editor: "ink",
  journalist: "accent-2",
  reader: "muted",
};

function statusForUser(user: UserProfile): {
  label: string;
  tone: "accent-2" | "warn" | "muted" | "accent";
} {
  if (user.isBlocked) return { label: "Suspended", tone: "accent" };
  if (user.isCommentBlocked) return { label: "Comment-blocked", tone: "warn" };
  if (!user.lastLoginAt) return { label: "Pending", tone: "muted" };
  return { label: "Active", tone: "accent-2" };
}

export function RecentSignups() {
  const { getIdToken, role } = useAdminAuth();
  const enabled = role === "admin";

  const q = useQuery({
    enabled,
    queryKey: ["overview", "recent-signups"],
    queryFn: async () => {
      const token = await getIdToken();
      if (!token) return [] as UserProfile[];
      const result = await listUsers({ page: 1, limit: 5 }, token);
      return result.data ?? [];
    },
    staleTime: 30_000,
  });

  return (
    <Card hov>
      <CardHead>
        <CardTitle>Recent sign-ups</CardTitle>
        <CardMeta>
          <Link href="/people/users" className="hover:text-accent">
            See all →
          </Link>
        </CardMeta>
      </CardHead>

      {q.isPending && enabled ? (
        <ul className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <li
              key={i}
              className="h-10 bg-paper-2 rounded-sm animate-pulse"
              aria-hidden
            />
          ))}
        </ul>
      ) : q.isError ? (
        <p className="font-hand text-[12px] text-accent">
          Couldn&apos;t load users.
        </p>
      ) : (q.data ?? []).length === 0 ? (
        <p className="font-hand text-[12px] text-muted">No users yet.</p>
      ) : (
        <ul className="divide-y divide-ink/10">
          {(q.data ?? []).map((user) => {
            const status = statusForUser(user);
            return (
              <li
                key={user.id}
                className="flex items-center gap-3 py-2.5 row-hov pl-1 pr-2 rounded-sm"
              >
                <Avatar
                  name={user.displayName}
                  src={user.photoURL}
                  size="sm"
                  tone="ink"
                />
                <div className="min-w-0 flex-1">
                  <p className="font-sans text-[13px] font-semibold truncate">
                    {user.displayName}
                  </p>
                  <p className="font-hand text-[11px] text-muted truncate">
                    {user.email}
                  </p>
                </div>
                <Pill tone={ROLE_TONE[user.role]}>{user.role}</Pill>
                <span className="font-hand text-[11px] text-muted hidden sm:inline">
                  {formatRelative(user.createdAt)}
                </span>
                <Pill tone={status.tone}>{status.label}</Pill>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
