"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, X } from "lucide-react";
import { Card, CardHead, CardTitle, CardMeta } from "@/components/primitives/Card";
import { Avatar } from "@/components/primitives/Avatar";
import { Btn } from "@/components/primitives/Btn";
import { useAdminAuth } from "@/lib/auth/AdminAuthProvider";
import { useToast } from "@/lib/ui/toast";
import {
  approveComment,
  listAdminComments,
  rejectComment,
} from "@/lib/api/comments.api";
import type { ModerationCommentDTO } from "@/lib/types/comment";
import { formatRelative } from "@/lib/utils/format";

const QUERY_KEY = ["overview", "moderation-preview"] as const;

export function ModerationPreview() {
  const { getIdToken, role } = useAdminAuth();
  const enabled = role === "admin";
  const qc = useQueryClient();
  const toast = useToast();

  const q = useQuery({
    enabled,
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const token = await getIdToken();
      if (!token) return [] as ModerationCommentDTO[];
      const result = await listAdminComments(
        { status: "pending", limit: 4 },
        token,
      );
      return result.data ?? [];
    },
    staleTime: 30_000,
  });

  const remove = (id: string) => {
    qc.setQueryData<ModerationCommentDTO[]>(QUERY_KEY, (prev) =>
      (prev ?? []).filter((c) => c.id !== id),
    );
  };

  const approveM = useMutation({
    mutationFn: async (id: string) => {
      const token = await getIdToken();
      if (!token) throw new Error("Not signed in.");
      await approveComment(id, token);
    },
    onMutate: (id) => remove(id),
    onSuccess: () => toast.success("Comment approved."),
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : "Approve failed.");
      void qc.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });

  const hideM = useMutation({
    mutationFn: async (id: string) => {
      const token = await getIdToken();
      if (!token) throw new Error("Not signed in.");
      await rejectComment(id, token);
    },
    onMutate: (id) => remove(id),
    onSuccess: () => toast.success("Comment hidden."),
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : "Hide failed.");
      void qc.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });

  return (
    <Card hov accentRail>
      <CardHead>
        <CardTitle>Comments awaiting moderation</CardTitle>
        <CardMeta>
          <Link href="/moderation/comments" className="hover:text-accent">
            Open queue →
          </Link>
        </CardMeta>
      </CardHead>

      {q.isPending && enabled ? (
        <ul className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <li
              key={i}
              className="h-12 bg-paper-2 rounded-sm animate-pulse"
              aria-hidden
            />
          ))}
        </ul>
      ) : q.isError ? (
        <p className="font-hand text-[12px] text-accent">
          Couldn&apos;t load comments.
        </p>
      ) : (q.data ?? []).length === 0 ? (
        <p className="font-hand text-[12px] text-muted">Inbox zero. ✓</p>
      ) : (
        <ul className="divide-y divide-ink/10">
          {(q.data ?? []).map((c) => (
            <li
              key={c.id}
              className="py-2.5 flex items-start gap-3 pl-1 pr-2 row-hov rounded-sm"
            >
              <Avatar
                name={c.author?.displayName}
                src={c.author?.photoURL ?? null}
                size="sm"
                tone="accent"
              />
              <div className="min-w-0 flex-1">
                <p className="font-sans text-[13px] line-clamp-1">
                  {c.content}
                </p>
                <p className="font-hand text-[11px] text-muted mt-0.5">
                  {c.author?.displayName ?? "anon"} · {formatRelative(c.createdAt)}
                  {c.reportCount > 0 ? (
                    <span className="ml-1 text-accent">· {c.reportCount} reports</span>
                  ) : null}
                </p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <Btn
                  size="sm"
                  variant="ghost"
                  onClick={() => hideM.mutate(c.id)}
                  disabled={hideM.isPending}
                  aria-label="Hide"
                >
                  <X size={12} aria-hidden />
                  Hide
                </Btn>
                <Btn
                  size="sm"
                  variant="primary"
                  onClick={() => approveM.mutate(c.id)}
                  disabled={approveM.isPending}
                  aria-label="Approve"
                >
                  <Check size={12} aria-hidden />
                  Approve
                </Btn>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
