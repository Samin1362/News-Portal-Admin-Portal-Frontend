"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { ArrowLeft, Copy, Trash2 } from "lucide-react";
import {
  Card,
  CardHead,
  CardMeta,
  CardTitle,
} from "@/components/primitives/Card";
import { Btn } from "@/components/primitives/Btn";
import { Pill } from "@/components/primitives/Pill";
import { AdForm, type AdFormValues } from "@/components/marketing/AdForm";
import { AdPreviewCard } from "@/components/marketing/AdPreviewCard";
import { DeleteConfirmModal } from "@/components/taxonomy/DeleteConfirmModal";
import { useAdminAuth } from "@/lib/auth/AdminAuthProvider";
import { useToast } from "@/lib/ui/toast";
import { deleteAd, getAd, updateAd } from "@/lib/api/ads.api";
import { useAuditRecorder } from "@/lib/audit/useAuditRecorder";
import { AD_PLACEMENT_LABEL, type AdPlacement } from "@/lib/types/ad";
import { formatShortDate } from "@/lib/utils/format";

interface PreviewState {
  placement: AdPlacement;
  imageUrl: string;
  altText: string;
  name: string;
}

export default function AdDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <AdDetailInner id={id} />;
}

function AdDetailInner({ id }: { id: string }) {
  const router = useRouter();
  const { getIdToken } = useAdminAuth();
  const toast = useToast();
  const qc = useQueryClient();
  const recordAudit = useAuditRecorder();

  const adQ = useQuery({
    queryKey: ["ad", id],
    queryFn: async () => {
      const token = await getIdToken();
      if (!token) throw new Error("Not signed in.");
      return getAd(id, token);
    },
    staleTime: 30_000,
  });

  const updateMut = useMutation({
    mutationFn: async (values: AdFormValues) => {
      const token = await getIdToken();
      if (!token) throw new Error("Not signed in.");
      return updateAd(
        id,
        {
          name: values.name,
          placement: values.placement,
          imageUrl: values.imageUrl,
          publicId: values.publicId,
          linkUrl: values.linkUrl,
          altText: values.altText,
          isActive: values.isActive,
          startDate: values.startDate,
          endDate: values.endDate,
        },
        token,
      );
    },
  });

  const deleteMut = useMutation({
    mutationFn: async () => {
      const token = await getIdToken();
      if (!token) throw new Error("Not signed in.");
      return deleteAd(id, token);
    },
  });

  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  // Seed preview from server payload via render-phase compare-and-set.
  const [seededFor, setSeededFor] = useState<string | null>(null);
  if (adQ.data && seededFor !== adQ.data.id) {
    setSeededFor(adQ.data.id);
    setPreview({
      placement: adQ.data.placement,
      imageUrl: adQ.data.imageUrl,
      altText: adQ.data.altText,
      name: adQ.data.name,
    });
  }

  async function handleSubmit(values: AdFormValues): Promise<boolean> {
    try {
      const updated = await updateMut.mutateAsync(values);
      qc.setQueryData(["ad", id], updated);
      qc.invalidateQueries({ queryKey: ["ads"] });
      recordAudit({
        action: "ad-update",
        targetId: updated.id,
        summary: `Updated ad "${updated.name}"`,
        detail: AD_PLACEMENT_LABEL[updated.placement],
      });
      toast.success("Ad updated.");
      return true;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed.");
      throw err;
    }
  }

  async function handleDelete() {
    try {
      await deleteMut.mutateAsync();
      qc.invalidateQueries({ queryKey: ["ads"] });
      qc.removeQueries({ queryKey: ["ad", id] });
      const target = adQ.data;
      recordAudit({
        action: "ad-delete",
        targetId: id,
        summary: target ? `Deleted ad "${target.name}"` : `Deleted ad ${id}`,
        detail: target ? AD_PLACEMENT_LABEL[target.placement] : null,
      });
      toast.success("Ad deleted.");
      router.push("/marketing/ads");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed.");
    }
  }

  function handleCopyHtml() {
    if (!adQ.data) return;
    const html = `<a href="${escapeHtml(adQ.data.linkUrl)}" target="_blank" rel="noopener sponsored">\n  <img src="${escapeHtml(adQ.data.imageUrl)}" alt="${escapeHtml(adQ.data.altText)}" />\n</a>`;
    navigator.clipboard
      .writeText(html)
      .then(() => toast.success("Preview HTML copied."))
      .catch(() => toast.error("Copy failed."));
  }

  if (adQ.isPending) return <DetailSkeleton />;
  if (adQ.isError || !adQ.data) {
    return (
      <Card>
        <CardHead>
          <CardTitle>Couldn&apos;t load ad</CardTitle>
        </CardHead>
        <p className="font-hand text-[12px] text-accent">
          {adQ.error?.message ?? "Not found."}
        </p>
        <Link
          href="/marketing/ads"
          className="mt-3 inline-block font-hand text-[12px] text-accent hover:underline"
        >
          ← Back to ads
        </Link>
      </Card>
    );
  }

  const ad = adQ.data;
  const ctr =
    ad.impressions > 0
      ? `${((ad.clicks / ad.impressions) * 100).toFixed(2)}%`
      : "—";
  const previewState = preview ?? {
    placement: ad.placement,
    imageUrl: ad.imageUrl,
    altText: ad.altText,
    name: ad.name,
  };

  return (
    <>
      <section className="flex items-end justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <p className="font-hand text-[12px] uppercase tracking-wider text-muted">
            <Link
              href="/marketing/ads"
              className="hover:text-accent inline-flex items-center gap-1"
            >
              <ArrowLeft size={11} aria-hidden /> Marketing / Ads
            </Link>
          </p>
          <h1 className="serif text-[28px] sm:text-[34px] font-extrabold tracking-tight leading-none mt-1 truncate">
            <span className="uline">{ad.name}</span>
          </h1>
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            <Pill tone={ad.isActive ? "accent-2" : "muted"} live={ad.isActive}>
              {ad.isActive ? "Live" : "Paused"}
            </Pill>
            <Pill tone="muted">{AD_PLACEMENT_LABEL[ad.placement]}</Pill>
            <span className="font-hand text-[11px] text-muted">
              Updated {formatShortDate(ad.updatedAt)}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Btn variant="default" onClick={handleCopyHtml}>
            <Copy size={14} aria-hidden />
            Copy preview HTML
          </Btn>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Card>
          <CardHead>
            <CardTitle>Edit</CardTitle>
            <CardMeta>Backend re-validates every patch.</CardMeta>
          </CardHead>
          <AdForm
            existing={ad}
            onSubmit={handleSubmit}
            submitting={updateMut.isPending}
            onPreviewChange={setPreview}
          />
        </Card>

        <div className="space-y-4">
          <Card hov>
            <CardHead>
              <CardTitle>Live preview</CardTitle>
              <CardMeta>Mirrors the public slot.</CardMeta>
            </CardHead>
            <AdPreviewCard
              placement={previewState.placement}
              imageUrl={previewState.imageUrl || undefined}
              altText={previewState.altText}
              name={previewState.name}
            />
          </Card>

          <Card>
            <CardHead>
              <CardTitle>Performance</CardTitle>
              <CardMeta>Lifetime counters from the public click endpoint.</CardMeta>
            </CardHead>
            <div className="grid grid-cols-3 gap-2">
              <Stat label="Impressions" value={ad.impressions.toLocaleString()} />
              <Stat label="Clicks" value={ad.clicks.toLocaleString()} />
              <Stat label="CTR" value={ctr} />
            </div>
            <p className="mt-3 font-hand text-[11px] text-muted">
              Daily breakdown requires a future <code>/ads/:id/stats</code>
              {" "}endpoint — only lifetime totals are exposed today.
            </p>
          </Card>

          <Card>
            <CardHead>
              <CardTitle className="text-accent">Danger zone</CardTitle>
              <CardMeta>Soft-delete — backend keeps the row but hides it from list + public.</CardMeta>
            </CardHead>
            <Btn
              variant="primary"
              onClick={() => setDeleteOpen(true)}
              disabled={deleteMut.isPending}
            >
              <Trash2 size={14} aria-hidden />
              Delete this ad
            </Btn>
          </Card>
        </div>
      </section>

      <DeleteConfirmModal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        title={`Delete "${ad.name}"?`}
        description="The ad will stop serving immediately and disappear from the marketing list. Counters are preserved on the soft-deleted row."
        confirmWord="delete"
        destructiveLabel="Delete ad"
      />
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center bg-paper-2 border-[1.5px] border-ink rounded-sm py-3">
      <p className="serif text-[22px] font-extrabold tracking-tight">{value}</p>
      <p className="font-hand text-[10px] uppercase tracking-wider text-muted mt-0.5">
        {label}
      </p>
    </div>
  );
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function DetailSkeleton() {
  return (
    <Card>
      <CardHead>
        <CardTitle>Loading ad…</CardTitle>
      </CardHead>
      <ul className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <li key={i} className="h-10 bg-paper-2 rounded-sm animate-pulse" aria-hidden />
        ))}
      </ul>
    </Card>
  );
}
