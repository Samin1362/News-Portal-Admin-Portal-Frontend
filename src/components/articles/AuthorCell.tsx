"use client";

import { useQuery } from "@tanstack/react-query";
import { getUser } from "@/lib/api/users.api";
import { useAdminAuth } from "@/lib/auth/AdminAuthProvider";

interface Props {
  authorId: string;
}

/**
 * Lazy user lookup keyed by ID. TanStack dedupes identical queries so a table
 * row repeated 10× for the same author only hits /users/:id once. 5min stale.
 */
export function AuthorCell({ authorId }: Props) {
  const { getIdToken } = useAdminAuth();
  const userQ = useQuery({
    queryKey: ["user", authorId],
    queryFn: async () => {
      const token = await getIdToken();
      if (!token) throw new Error("Not signed in.");
      return getUser(authorId, token);
    },
    staleTime: 5 * 60 * 1000,
  });

  if (userQ.isPending) {
    return (
      <span className="font-hand text-[11px] text-muted">…</span>
    );
  }
  if (userQ.isError || !userQ.data) {
    return (
      <span
        className="font-hand text-[11px] text-muted truncate"
        title={authorId}
      >
        Unknown
      </span>
    );
  }
  return (
    <span
      className="font-sans text-[12.5px] text-ink truncate"
      title={userQ.data.email}
    >
      {userQ.data.displayName}
    </span>
  );
}
