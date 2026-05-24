"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import {
  Card,
  CardHead,
  CardMeta,
  CardTitle,
} from "@/components/primitives/Card";
import { AdForm, type AdFormValues } from "@/components/marketing/AdForm";
import { AdPreviewCard } from "@/components/marketing/AdPreviewCard";
import { useAdminAuth } from "@/lib/auth/AdminAuthProvider";
import { useToast } from "@/lib/ui/toast";
import { createAd } from "@/lib/api/ads.api";
import type { AdPlacement } from "@/lib/types/ad";

interface PreviewState {
  placement: AdPlacement;
  imageUrl: string;
  altText: string;
  name: string;
}

export default function NewAdPage() {
  const router = useRouter();
  const { getIdToken } = useAdminAuth();
  const toast = useToast();
  const qc = useQueryClient();

  const [preview, setPreview] = useState<PreviewState>({
    placement: "home_sidebar",
    imageUrl: "",
    altText: "",
    name: "",
  });

  const createMut = useMutation({
    mutationFn: async (values: AdFormValues) => {
      const token = await getIdToken();
      if (!token) throw new Error("Not signed in.");
      return createAd(
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

  async function handleSubmit(values: AdFormValues): Promise<boolean> {
    try {
      const created = await createMut.mutateAsync(values);
      toast.success(`"${created.name}" created.`);
      qc.invalidateQueries({ queryKey: ["ads"] });
      router.push(`/marketing/ads/${created.id}`);
      return true;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Create failed.");
      throw err;
    }
  }

  return (
    <>
      <section className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="font-hand text-[12px] uppercase tracking-wider text-muted">
            <Link href="/marketing/ads" className="hover:text-accent inline-flex items-center gap-1">
              <ArrowLeft size={11} aria-hidden /> Marketing / Ads
            </Link>
          </p>
          <h1 className="serif text-[28px] sm:text-[34px] font-extrabold tracking-tight leading-none mt-1">
            <span className="uline">New ad</span>
          </h1>
          <p className="mt-2 font-hand text-[12px] text-muted">
            Live preview reflects the slot dimensions readers will see.
          </p>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Card>
          <CardHead>
            <CardTitle>Details</CardTitle>
            <CardMeta>Backend validates the same fields — 4xx surfaces inline.</CardMeta>
          </CardHead>
          <AdForm
            onSubmit={handleSubmit}
            submitting={createMut.isPending}
            onPreviewChange={setPreview}
          />
        </Card>

        <Card hov>
          <CardHead>
            <CardTitle>Live preview</CardTitle>
            <CardMeta>Updates as you edit.</CardMeta>
          </CardHead>
          <AdPreviewCard
            placement={preview.placement}
            imageUrl={preview.imageUrl || undefined}
            altText={preview.altText}
            name={preview.name}
          />
        </Card>
      </section>
    </>
  );
}
