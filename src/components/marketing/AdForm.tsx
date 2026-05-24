"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { Trash2 } from "lucide-react";
import { z } from "zod";
import { Btn } from "@/components/primitives/Btn";
import { Input } from "@/components/primitives/Input";
import { CloudinaryUploader } from "@/components/articles/CloudinaryUploader";
import { PlacementSelect } from "./PlacementSelect";
import { ApiError } from "@/lib/api/client";
import type { AdminAdDTO, AdPlacement } from "@/lib/types/ad";
import { AD_PLACEMENTS } from "@/lib/types/ad";

/**
 * Mirrors backend `createAdBodySchema` field-for-field so 422s are caught
 * client-side. Source: backend/src/validators/ad.validator.ts.
 *
 *  - imageUrl: must be res.cloudinary.com (regex matched against the same one
 *    the server uses).
 *  - linkUrl: must be a valid URL (server accepts http(s); we tighten to https
 *    only since the spec says "linkUrl (must be https://)").
 *  - startDate ≤ endDate when both are present.
 */
const CLOUDINARY_URL_RE = /^https:\/\/res\.cloudinary\.com\/[a-zA-Z0-9_-]+\/.+$/;

export const adFormSchema = z
  .object({
    name: z.string().trim().min(1, "Required").max(120),
    placement: z.enum(AD_PLACEMENTS),
    imageUrl: z
      .string()
      .url("Must be a URL")
      .max(2048)
      .refine((v) => CLOUDINARY_URL_RE.test(v), {
        message: "imageUrl must point to res.cloudinary.com",
      }),
    publicId: z.string().trim().min(1).max(300),
    linkUrl: z
      .string()
      .url("Must be a valid URL")
      .max(2048)
      .refine((v) => v.startsWith("https://"), {
        message: "linkUrl must start with https://",
      }),
    altText: z.string().trim().max(500).default(""),
    isActive: z.boolean().default(true),
    startDate: z.string().nullable().optional(),
    endDate: z.string().nullable().optional(),
  })
  .refine(
    (d) =>
      !d.startDate ||
      !d.endDate ||
      Date.parse(d.startDate) <= Date.parse(d.endDate),
    { message: "startDate must be on or before endDate", path: ["endDate"] },
  );

export type AdFormValues = z.infer<typeof adFormSchema>;

interface Props {
  existing?: AdminAdDTO | null;
  submitting?: boolean;
  /** Returns true if save succeeded (used by callers to redirect). */
  onSubmit: (values: AdFormValues) => Promise<boolean>;
  /** Called whenever the placement/image/altText/name changes so the preview updates live. */
  onPreviewChange?: (preview: {
    placement: AdPlacement;
    imageUrl: string;
    altText: string;
    name: string;
  }) => void;
  submitLabel?: string;
}

interface Errors {
  [field: string]: string | undefined;
}

function toDateTimeLocal(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  // datetime-local expects YYYY-MM-DDTHH:mm in local time.
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromDateTimeLocal(s: string): string | null {
  if (!s) return null;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

export function AdForm({
  existing,
  submitting,
  onSubmit,
  onPreviewChange,
  submitLabel,
}: Props) {
  const [name, setName] = useState(existing?.name ?? "");
  const [placement, setPlacement] = useState<AdPlacement>(
    existing?.placement ?? "home_sidebar",
  );
  const [imageUrl, setImageUrl] = useState(existing?.imageUrl ?? "");
  const [publicId, setPublicId] = useState(existing?.publicId ?? "");
  const [linkUrl, setLinkUrl] = useState(existing?.linkUrl ?? "");
  const [altText, setAltText] = useState(existing?.altText ?? "");
  const [isActive, setIsActive] = useState(existing?.isActive ?? true);
  const [startDate, setStartDate] = useState(toDateTimeLocal(existing?.startDate));
  const [endDate, setEndDate] = useState(toDateTimeLocal(existing?.endDate));
  const [errors, setErrors] = useState<Errors>({});
  const [serverError, setServerError] = useState<string | null>(null);

  // Live preview side-channel — emits on every relevant edit. Memoised so the
  // parent doesn't reflow on unrelated state changes.
  const preview = useMemo(
    () => ({ placement, imageUrl, altText, name }),
    [placement, imageUrl, altText, name],
  );
  // Render-phase notify (avoids set-state-in-effect on the parent).
  const [lastPreview, setLastPreview] = useState(preview);
  if (
    lastPreview.placement !== preview.placement ||
    lastPreview.imageUrl !== preview.imageUrl ||
    lastPreview.altText !== preview.altText ||
    lastPreview.name !== preview.name
  ) {
    setLastPreview(preview);
    onPreviewChange?.(preview);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerError(null);

    const values = {
      name,
      placement,
      imageUrl,
      publicId,
      linkUrl,
      altText,
      isActive,
      startDate: startDate ? fromDateTimeLocal(startDate) : null,
      endDate: endDate ? fromDateTimeLocal(endDate) : null,
    };
    const parsed = adFormSchema.safeParse(values);
    if (!parsed.success) {
      const next: Errors = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0]?.toString() ?? "";
        if (!next[field]) next[field] = issue.message;
      }
      setErrors(next);
      return;
    }
    setErrors({});

    try {
      const ok = await onSubmit(parsed.data);
      if (!ok) return;
    } catch (err) {
      if (err instanceof ApiError) {
        setServerError(err.message);
      } else {
        setServerError(err instanceof Error ? err.message : "Save failed.");
      }
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <Field label="Name" error={errors.name} required>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Spring promo — sidebar"
          required
        />
      </Field>

      <Field label="Placement" error={errors.placement}>
        <PlacementSelect
          value={placement}
          onChange={setPlacement}
          disabled={submitting}
        />
      </Field>

      <div className="space-y-1.5">
        <span className="block font-hand text-[11px] uppercase tracking-wider text-muted">
          Creative
          <span className="text-accent ml-0.5">*</span>
        </span>
        {imageUrl ? (
          <div className="relative border-[1.5px] border-ink rounded-sm overflow-hidden bg-paper-2">
            <Image
              src={imageUrl}
              alt={altText || ""}
              width={400}
              height={200}
              className="w-full max-h-60 object-contain bg-paper-2"
              unoptimized
            />
            <button
              type="button"
              onClick={() => {
                setImageUrl("");
                setPublicId("");
              }}
              className="absolute top-1 right-1 inline-flex items-center justify-center w-7 h-7 bg-paper border-[1.5px] border-ink rounded-sm hover:bg-accent hover:text-paper"
              aria-label="Remove creative"
            >
              <Trash2 size={12} aria-hidden />
            </button>
          </div>
        ) : (
          <CloudinaryUploader
            accept="image"
            multiple={false}
            size="compact"
            onUploaded={(media) => {
              setImageUrl(media.url);
              setPublicId(media.publicId);
            }}
          />
        )}
        {errors.imageUrl ? (
          <p className="font-hand text-[11px] text-accent">{errors.imageUrl}</p>
        ) : null}
      </div>

      <Field
        label="Link URL"
        help="Where readers go when they click. Must use https://."
        error={errors.linkUrl}
        required
      >
        <Input
          type="url"
          value={linkUrl}
          onChange={(e) => setLinkUrl(e.target.value)}
          placeholder="https://example.com/landing"
          required
        />
      </Field>

      <Field label="Alt text" error={errors.altText}>
        <Input
          value={altText}
          onChange={(e) => setAltText(e.target.value)}
          placeholder="Describes the ad for screen readers."
          maxLength={500}
        />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Start date" error={errors.startDate}>
          <Input
            type="datetime-local"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </Field>
        <Field
          label="End date"
          error={errors.endDate}
          help="Leave blank for an open-ended campaign."
        >
          <Input
            type="datetime-local"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </Field>
      </div>

      <label className="inline-flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
          className="w-4 h-4 accent-accent"
        />
        <span className="font-sans text-[13px]">
          Active — serve this ad on the public site
        </span>
      </label>

      {serverError ? (
        <p className="font-sans text-[12.5px] text-accent border-l-[3px] border-accent pl-2 py-1 bg-accent/5">
          {serverError}
        </p>
      ) : null}

      <div className="flex items-center justify-end gap-2 pt-2 border-t border-ink/10">
        <Btn type="submit" variant="solid" disabled={submitting}>
          {submitting
            ? existing
              ? "Saving…"
              : "Creating…"
            : (submitLabel ?? (existing ? "Save changes" : "Create ad"))}
        </Btn>
      </div>
    </form>
  );
}

function Field({
  label,
  help,
  required,
  error,
  children,
}: {
  label: string;
  help?: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block font-hand text-[11px] uppercase tracking-wider text-muted">
        {label}
        {required ? <span className="text-accent ml-0.5">*</span> : null}
      </span>
      {children}
      {error ? (
        <span className="block font-hand text-[11px] text-accent mt-1">{error}</span>
      ) : help ? (
        <span className="block font-hand text-[10px] text-muted mt-1">{help}</span>
      ) : null}
    </label>
  );
}
