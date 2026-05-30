"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, ShieldCheck, X } from "lucide-react";
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
import { useAuditRecorder } from "@/lib/audit/useAuditRecorder";
import {
  approveRoleRequest,
  getRoleRequest,
  rejectRoleRequest,
} from "@/lib/api/roleRequests.api";
import type {
  RoleRequestDTO,
  RoleRequestStatus,
} from "@/lib/types/roleRequest";
import { formatRelative } from "@/lib/utils/format";

const STATUS_TONE: Record<
  RoleRequestStatus,
  "warn" | "accent-2" | "accent" | "muted"
> = {
  pending: "warn",
  approved: "accent-2",
  rejected: "accent",
  cancelled: "muted",
};

interface Props {
  params: Promise<{ id: string }>;
}

export default function RoleRequestDetailPage({ params }: Props) {
  const { id } = use(params);
  const router = useRouter();
  const qc = useQueryClient();
  const toast = useToast();
  const { getIdToken, role } = useAdminAuth();
  const recordAudit = useAuditRecorder();
  const enabled = role === "admin";

  const q = useQuery({
    enabled,
    queryKey: ["role-requests", id],
    queryFn: async () => {
      const token = await getIdToken();
      if (!token) throw new Error("Not signed in.");
      return getRoleRequest(id, token);
    },
    staleTime: 30_000,
  });

  const handleAfterDecision = (next: RoleRequestDTO) => {
    qc.setQueryData(["role-requests", id], next);
    void qc.invalidateQueries({ queryKey: ["role-requests"], exact: false });
    void qc.invalidateQueries({
      queryKey: ["nav-count", "role-requests-pending"],
    });
  };

  const approveM = useMutation({
    mutationFn: async () => {
      const token = await getIdToken();
      if (!token) throw new Error("Not signed in.");
      return approveRoleRequest(id, token);
    },
    onSuccess: (next) => {
      handleAfterDecision(next);
      recordAudit({
        action: "role-request-approve",
        targetId: next.id,
        summary: `Approved role request → ${next.toRole}`,
        detail: `userId: ${next.userId}`,
      });
      toast.success("Request approved · email queued");
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : "Approve failed.");
    },
  });

  const rejectM = useMutation({
    mutationFn: async (reason: string) => {
      const token = await getIdToken();
      if (!token) throw new Error("Not signed in.");
      return rejectRoleRequest(id, reason, token);
    },
    onSuccess: (next) => {
      handleAfterDecision(next);
      recordAudit({
        action: "role-request-reject",
        targetId: next.id,
        summary: `Rejected role request → ${next.toRole}`,
        detail: next.decisionReason ?? `userId: ${next.userId}`,
      });
      toast.success("Request rejected · email queued");
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : "Reject failed.");
    },
  });

  const [showApprove, setShowApprove] = useState(false);
  const [showReject, setShowReject] = useState(false);

  if (q.isPending) return <DetailSkeleton />;
  if (q.isError || !q.data) {
    return (
      <Card>
        <p className="font-hand text-[12px] text-accent">
          Couldn&apos;t load request — {q.error?.message ?? "not found"}.
        </p>
        <Link
          href="/people/role-requests"
          className="inline-flex items-center gap-1 mt-3 text-[12px] hover:text-accent"
        >
          <ArrowLeft size={12} aria-hidden /> Back to inbox
        </Link>
      </Card>
    );
  }

  const req = q.data;
  const isPending = req.status === "pending";
  const inFlight = approveM.isPending || rejectM.isPending;

  return (
    <>
      <section className="flex items-center gap-2">
        <Link
          href="/people/role-requests"
          className="inline-flex items-center gap-1 font-hand text-[12px] text-muted hover:text-accent"
        >
          <ArrowLeft size={12} aria-hidden /> Role requests
        </Link>
      </section>

      <Card hov>
        <div className="flex items-start gap-4 flex-wrap">
          <Avatar
            name={req.submittedInfo.displayName}
            size="lg"
            tone="ink"
          />
          <div className="min-w-0 flex-1">
            <h1 className="serif text-[26px] font-extrabold tracking-tight leading-tight">
              {req.submittedInfo.displayName}
            </h1>
            <p className="font-hand text-[12px] text-muted mt-1 truncate">
              {req.submittedInfo.fullName}
            </p>
            <div className="flex items-center gap-2 flex-wrap mt-3">
              <Pill tone="muted">{req.fromRole}</Pill>
              <span className="text-ink/40">→</span>
              <Pill tone="accent">{req.toRole}</Pill>
              <Pill tone={STATUS_TONE[req.status]}>{req.status}</Pill>
            </div>
            <p className="font-hand text-[11px] text-muted mt-3">
              Submitted {formatRelative(req.createdAt)}
              {req.decidedAt
                ? ` · decided ${formatRelative(req.decidedAt)}`
                : ""}
            </p>
          </div>
          {isPending ? (
            <div className="flex items-center gap-2 shrink-0">
              <Btn
                size="sm"
                variant="default"
                onClick={() => setShowReject(true)}
                disabled={inFlight}
              >
                <X size={12} aria-hidden />
                Reject
              </Btn>
              <Btn
                size="sm"
                variant="primary"
                onClick={() => setShowApprove(true)}
                disabled={inFlight}
              >
                <Check size={12} aria-hidden />
                Approve
              </Btn>
            </div>
          ) : null}
        </div>
      </Card>

      <Card>
        <CardHead>
          <CardTitle>Verification</CardTitle>
          <CardMeta>
            {req.emailVerifiedAt
              ? `Verified ${formatRelative(req.emailVerifiedAt)}`
              : "Not verified"}
          </CardMeta>
        </CardHead>
        {req.emailVerifiedAt ? (
          <p className="font-sans text-[13px] flex items-center gap-2">
            <ShieldCheck
              size={14}
              className="text-accent-2 shrink-0"
              aria-hidden
            />
            Email ownership confirmed via OTP at{" "}
            {new Date(req.emailVerifiedAt).toLocaleString()}.
          </p>
        ) : (
          <p className="font-sans text-[13px] text-accent">
            Email not yet verified. This request should not be approvable.
          </p>
        )}
      </Card>

      <Card>
        <CardHead>
          <CardTitle>Submitted info</CardTitle>
          <CardMeta>
            Guidelines v{req.submittedInfo.guidelinesVersion} · agreed{" "}
            {formatRelative(req.submittedInfo.agreedToGuidelinesAt)}
          </CardMeta>
        </CardHead>

        <dl className="grid gap-4">
          <Field label="Bio">
            <p className="font-sans text-[13px] whitespace-pre-line">
              {req.submittedInfo.bio}
            </p>
          </Field>

          <Field label="Motivation">
            <p className="font-sans text-[13px] whitespace-pre-line">
              {req.submittedInfo.motivation}
            </p>
          </Field>

          <Field label="Expertise">
            <div className="flex flex-wrap gap-2">
              {req.submittedInfo.expertiseTags.map((tag) => (
                <Pill key={tag} tone="ink">
                  {tag}
                </Pill>
              ))}
            </div>
          </Field>

          {req.submittedInfo.sampleLinks.length > 0 ? (
            <Field label="Sample work">
              <ul className="space-y-1">
                {req.submittedInfo.sampleLinks.map((url) => (
                  <li key={url}>
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-sans text-[13px] text-accent hover:underline break-all"
                    >
                      {url}
                    </a>
                  </li>
                ))}
              </ul>
            </Field>
          ) : null}

          {req.submittedInfo.phone ? (
            <Field label="Phone">
              <p className="font-sans text-[13px]">{req.submittedInfo.phone}</p>
            </Field>
          ) : null}
        </dl>
      </Card>

      {req.status === "rejected" && req.decisionReason ? (
        <Card accentRail>
          <CardHead>
            <CardTitle>Rejection reason</CardTitle>
            <CardMeta>Sent verbatim to applicant</CardMeta>
          </CardHead>
          <p className="font-sans text-[13px] whitespace-pre-line">
            {req.decisionReason}
          </p>
        </Card>
      ) : null}

      {showApprove ? (
        <ConfirmModal
          title={`Approve ${req.submittedInfo.displayName}?`}
          description={`They will become a ${req.toRole} and receive an approval email. Access takes effect on their next sign-in.`}
          confirmLabel={approveM.isPending ? "Approving…" : "Approve"}
          onCancel={() => setShowApprove(false)}
          onConfirm={() => {
            approveM.mutate();
            setShowApprove(false);
          }}
        />
      ) : null}

      {showReject ? (
        <RejectModal
          name={req.submittedInfo.displayName}
          pending={rejectM.isPending}
          onCancel={() => setShowReject(false)}
          onConfirm={(reason) => {
            rejectM.mutate(reason);
            setShowReject(false);
          }}
        />
      ) : null}

      <noscript>
        <p className="text-accent text-[12px]">
          Approve/Reject actions require JavaScript.{" "}
          <button onClick={() => router.refresh()}>Refresh</button>
        </p>
      </noscript>
    </>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt className="font-hand text-[11px] uppercase tracking-wider text-muted">
        {label}
      </dt>
      <dd className="mt-1">{children}</dd>
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

function RejectModal({
  name,
  pending,
  onCancel,
  onConfirm,
}: {
  name: string;
  pending: boolean;
  onCancel: () => void;
  onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState("");
  const trimmed = reason.trim();
  const valid = trimmed.length >= 20 && trimmed.length <= 1000;

  return (
    <div
      role="dialog"
      aria-modal
      className="fixed inset-0 z-[70] flex items-center justify-center bg-ink/45 backdrop-blur-[2px] p-4"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-lg bg-paper border-[1.5px] border-ink rounded-sm p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="serif text-[18px] font-extrabold mb-1">
          Reject {name}&apos;s request
        </h2>
        <p className="font-hand text-[11px] text-muted mb-3">
          This message is sent to {name} verbatim — keep it specific and
          constructive (20–1000 chars).
        </p>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={5}
          className="w-full px-3 py-2 bg-paper-2 border-[1.5px] border-ink rounded-md outline-none font-sans text-[13px] resize-y"
          placeholder="e.g. Your bio mentions great experience in tech writing, but we currently only need food beat reporters…"
          aria-label="Rejection reason"
        />
        <p className="font-hand text-[11px] text-muted mt-1 text-right">
          {trimmed.length}/1000
        </p>
        <div className="flex justify-end gap-2 mt-3">
          <Btn variant="default" size="sm" onClick={onCancel}>
            Cancel
          </Btn>
          <Btn
            variant="primary"
            size="sm"
            disabled={!valid || pending}
            onClick={() => onConfirm(trimmed)}
          >
            {pending ? "Rejecting…" : "Send rejection"}
          </Btn>
        </div>
      </div>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <Card>
      <div className="space-y-3">
        <div className="h-6 w-48 bg-paper-2 rounded-sm animate-pulse" />
        <div className="h-3 w-64 bg-paper-2 rounded-sm animate-pulse" />
        <div className="h-3 w-96 bg-paper-2 rounded-sm animate-pulse" />
      </div>
    </Card>
  );
}
