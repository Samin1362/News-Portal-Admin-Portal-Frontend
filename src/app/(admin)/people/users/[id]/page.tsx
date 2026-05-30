"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Trash2 } from "lucide-react";
import {
  Card,
  CardHead,
  CardMeta,
  CardTitle,
} from "@/components/primitives/Card";
import { Avatar } from "@/components/primitives/Avatar";
import { Pill } from "@/components/primitives/Pill";
import { Btn } from "@/components/primitives/Btn";
import { useAdminAuth } from "@/lib/auth/AdminAuthProvider";
import { useToast } from "@/lib/ui/toast";
import {
  deleteUser,
  getUser,
  patchUserBlocked,
  patchUserCommentBlocked,
  patchUserRole,
} from "@/lib/api/users.api";
import { useAuditRecorder } from "@/lib/audit/useAuditRecorder";
import type { UserProfile, UserRole } from "@/lib/auth/types";
import { formatRelative } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

const ROLE_OPTIONS: UserRole[] = ["reader", "journalist", "editor", "admin"];

const ROLE_TONE: Record<UserRole, "ink" | "accent" | "accent-2" | "muted"> = {
  admin: "accent",
  editor: "ink",
  journalist: "accent-2",
  reader: "muted",
};

interface Props {
  params: Promise<{ id: string }>;
}

export default function UserDetailPage({ params }: Props) {
  const { id } = use(params);
  const router = useRouter();
  const qc = useQueryClient();
  const toast = useToast();
  const { getIdToken, role } = useAdminAuth();
  const recordAudit = useAuditRecorder();
  const enabled = role === "admin";

  const q = useQuery({
    enabled,
    queryKey: ["users", id],
    queryFn: async () => {
      const token = await getIdToken();
      if (!token) throw new Error("Not signed in.");
      return getUser(id, token);
    },
    staleTime: 30_000,
  });

  const onUserUpdated = (next: UserProfile) => {
    qc.setQueryData(["users", id], next);
    void qc.invalidateQueries({ queryKey: ["users"], exact: false });
  };

  const roleM = useMutation({
    mutationFn: async (newRole: UserRole) => {
      const token = await getIdToken();
      if (!token) throw new Error("Not signed in.");
      const previous = q.data?.role ?? null;
      const next = await patchUserRole(id, newRole, token);
      return { next, previous };
    },
    onSuccess: ({ next, previous }) => {
      onUserUpdated(next);
      recordAudit({
        action: "role-change",
        targetId: next.id,
        summary: `Changed ${next.displayName}'s role`,
        detail: previous ? `${previous} → ${next.role}` : `→ ${next.role}`,
      });
      toast.success(`Role updated to ${next.role}. Email queued.`);
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : "Role update failed.");
    },
  });

  const blockM = useMutation({
    mutationFn: async (isBlocked: boolean) => {
      const token = await getIdToken();
      if (!token) throw new Error("Not signed in.");
      return patchUserBlocked(id, isBlocked, token);
    },
    onSuccess: (next) => {
      onUserUpdated(next);
      recordAudit({
        action: next.isBlocked ? "user-block" : "user-unblock",
        targetId: next.id,
        summary: next.isBlocked
          ? `Suspended ${next.displayName}`
          : `Restored ${next.displayName}`,
        detail: next.email,
      });
      toast.success(next.isBlocked ? "User suspended." : "User restored.");
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : "Block toggle failed.");
    },
  });

  const commentBlockM = useMutation({
    mutationFn: async (isCommentBlocked: boolean) => {
      const token = await getIdToken();
      if (!token) throw new Error("Not signed in.");
      return patchUserCommentBlocked(id, isCommentBlocked, token);
    },
    onSuccess: (next) => {
      onUserUpdated(next);
      recordAudit({
        action: next.isCommentBlocked
          ? "user-comment-block"
          : "user-comment-unblock",
        targetId: next.id,
        summary: next.isCommentBlocked
          ? `Blocked comments for ${next.displayName}`
          : `Unblocked comments for ${next.displayName}`,
        detail: next.email,
      });
      toast.success(
        next.isCommentBlocked
          ? "Comments blocked."
          : "Comment access restored.",
      );
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : "Update failed.");
    },
  });

  const deleteM = useMutation({
    mutationFn: async () => {
      const token = await getIdToken();
      if (!token) throw new Error("Not signed in.");
      await deleteUser(id, token);
    },
    onSuccess: () => {
      const target = q.data;
      recordAudit({
        action: "user-delete",
        targetId: id,
        summary: target
          ? `Deleted ${target.displayName}`
          : `Deleted user ${id}`,
        detail: target?.email ?? null,
      });
      toast.success("User deleted.");
      void qc.invalidateQueries({ queryKey: ["users"], exact: false });
      router.replace("/people/users");
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : "Delete failed.");
    },
  });

  const [pendingRole, setPendingRole] = useState<UserRole | null>(null);
  const [pendingBlock, setPendingBlock] = useState<boolean | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState("");

  if (q.isPending) return <DetailSkeleton />;
  if (q.isError || !q.data) {
    return (
      <Card>
        <p className="font-hand text-[12px] text-accent">
          Couldn&apos;t load user — {q.error?.message ?? "not found"}.
        </p>
        <Link
          href="/people/users"
          className="inline-flex items-center gap-1 mt-3 text-[12px] hover:text-accent"
        >
          <ArrowLeft size={12} aria-hidden /> Back to users
        </Link>
      </Card>
    );
  }

  const user = q.data;

  return (
    <>
      <section className="flex items-center gap-2">
        <Link
          href="/people/users"
          className="inline-flex items-center gap-1 font-hand text-[12px] text-muted hover:text-accent"
        >
          <ArrowLeft size={12} aria-hidden /> Users
        </Link>
      </section>

      <Card hov>
        <div className="flex items-start gap-4 flex-wrap">
          <Avatar
            name={user.displayName}
            src={user.photoURL}
            size="lg"
            tone="ink"
          />
          <div className="min-w-0 flex-1">
            <h1 className="serif text-[26px] font-extrabold tracking-tight leading-tight">
              {user.displayName}
            </h1>
            <p className="font-hand text-[12px] text-muted mt-1 truncate">
              {user.email}
            </p>
            <div className="flex items-center gap-2 flex-wrap mt-3">
              <Pill tone={ROLE_TONE[user.role]}>{user.role}</Pill>
              {user.isBlocked ? (
                <Pill tone="accent">Suspended</Pill>
              ) : user.isCommentBlocked ? (
                <Pill tone="warn">Comment-blocked</Pill>
              ) : (
                <Pill tone="accent-2">Active</Pill>
              )}
            </div>
            <p className="font-hand text-[11px] text-muted mt-3">
              Joined {formatRelative(user.createdAt)} ·{" "}
              {user.lastLoginAt
                ? `Last seen ${formatRelative(user.lastLoginAt)}`
                : "Never signed in"}
            </p>
          </div>
        </div>
      </Card>

      <Card>
        <CardHead>
          <CardTitle>Role</CardTitle>
          <CardMeta>Triggers an email on change</CardMeta>
        </CardHead>
        <div className="flex flex-wrap items-center gap-2">
          {ROLE_OPTIONS.map((r) => {
            const isCurrent = r === user.role;
            return (
              <button
                key={r}
                type="button"
                onClick={() => setPendingRole(r)}
                disabled={isCurrent || roleM.isPending}
                aria-pressed={isCurrent}
                className={cn(
                  "px-3 py-1.5 rounded-md border-[1.5px] font-sans text-[12px] capitalize transition-colors",
                  isCurrent
                    ? "bg-ink text-paper border-ink"
                    : "bg-paper text-ink border-ink hover:bg-paper-2 disabled:opacity-50",
                )}
              >
                {r}
              </button>
            );
          })}
        </div>
        <p className="font-hand text-[11px] text-muted mt-3">
          Active sessions retain the old role until the next sign-in.
        </p>
      </Card>

      <Card>
        <CardHead>
          <CardTitle>Access</CardTitle>
          <CardMeta>Suspend or restore</CardMeta>
        </CardHead>
        <div className="space-y-3">
          <ToggleRow
            label="Account suspended"
            description="Blocks sign-in across the platform."
            value={user.isBlocked}
            disabled={blockM.isPending}
            onChange={(v) => setPendingBlock(v)}
          />
          <ToggleRow
            label="Comments blocked"
            description="User can sign in but cannot post comments."
            value={user.isCommentBlocked}
            disabled={commentBlockM.isPending}
            onChange={(v) => commentBlockM.mutate(v)}
          />
        </div>
      </Card>

      <Card accentRail>
        <CardHead>
          <CardTitle>Danger zone</CardTitle>
          <CardMeta>Soft delete · irreversible from this UI</CardMeta>
        </CardHead>
        <div className="space-y-3">
          <p className="font-sans text-[13px]">
            Type <span className="font-mono px-1 bg-paper-2 border border-ink/20 rounded">delete</span> to confirm.
          </p>
          <input
            type="text"
            value={deleteConfirm}
            onChange={(e) => setDeleteConfirm(e.target.value)}
            className="w-full max-w-[280px] px-3 h-9 bg-paper-2 border-[1.5px] border-ink rounded-md outline-none font-mono text-[13px]"
            placeholder="delete"
            aria-label="Type delete to confirm"
          />
          <Btn
            variant="primary"
            size="sm"
            disabled={deleteConfirm.trim().toLowerCase() !== "delete" || deleteM.isPending}
            onClick={() => deleteM.mutate()}
          >
            <Trash2 size={12} aria-hidden /> Delete user
          </Btn>
        </div>
      </Card>

      {pendingRole !== null ? (
        <ConfirmModal
          title={`Change role to ${pendingRole}?`}
          description={`${user.displayName} will gain ${pendingRole} access on next sign-in, and receive a role-changed email.`}
          confirmLabel="Update role"
          onCancel={() => setPendingRole(null)}
          onConfirm={() => {
            roleM.mutate(pendingRole);
            setPendingRole(null);
          }}
        />
      ) : null}

      {pendingBlock !== null ? (
        <ConfirmModal
          title={pendingBlock ? "Suspend account?" : "Restore account?"}
          description={
            pendingBlock
              ? `${user.displayName} will lose sign-in access immediately and receive a suspension email.`
              : `${user.displayName} will regain sign-in access and receive a restored email.`
          }
          confirmLabel={pendingBlock ? "Suspend" : "Restore"}
          onCancel={() => setPendingBlock(null)}
          onConfirm={() => {
            blockM.mutate(pendingBlock);
            setPendingBlock(null);
          }}
        />
      ) : null}
    </>
  );
}

function ToggleRow({
  label,
  description,
  value,
  disabled,
  onChange,
}: {
  label: string;
  description: string;
  value: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="font-sans text-[13px] font-semibold">{label}</p>
        <p className="font-hand text-[11px] text-muted">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        disabled={disabled}
        onClick={() => onChange(!value)}
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border-[1.5px] border-ink transition-colors disabled:opacity-50",
          value ? "bg-accent" : "bg-paper-2",
        )}
      >
        <span
          aria-hidden
          className={cn(
            "inline-block h-4 w-4 rounded-full bg-paper border border-ink transition-transform",
            value ? "translate-x-[22px]" : "translate-x-0.5",
          )}
        />
      </button>
    </div>
  );
}

function ConfirmModal({
  title,
  description,
  confirmLabel,
  onCancel,
  onConfirm,
}: {
  title: string;
  description: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-modal
      className="fixed inset-0 z-[70] flex items-center justify-center bg-ink/45 backdrop-blur-[2px] p-4"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-md bg-paper border-[1.5px] border-ink rounded-sm p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="serif text-[18px] font-extrabold mb-2">{title}</h2>
        <p className="font-sans text-[13px] text-ink/80">{description}</p>
        <div className="flex justify-end gap-2 mt-4">
          <Btn variant="default" size="sm" onClick={onCancel}>
            Cancel
          </Btn>
          <Btn variant="primary" size="sm" onClick={onConfirm}>
            {confirmLabel}
          </Btn>
        </div>
      </div>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <>
      <Card>
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-full bg-paper-2 animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-6 w-48 bg-paper-2 rounded-sm animate-pulse" />
            <div className="h-3 w-64 bg-paper-2 rounded-sm animate-pulse" />
          </div>
        </div>
      </Card>
    </>
  );
}
