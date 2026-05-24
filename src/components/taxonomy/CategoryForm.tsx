"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { Trash2, X } from "lucide-react";
import { Btn } from "@/components/primitives/Btn";
import { Input } from "@/components/primitives/Input";
import { CloudinaryUploader } from "@/components/articles/CloudinaryUploader";
import { ApiError } from "@/lib/api/client";
import type { CategoryDTO } from "@/lib/types/category";
import { cn } from "@/lib/utils/cn";

interface Props {
  open: boolean;
  onClose: () => void;
  existing: CategoryDTO | null;
  /** Sent to the server. Returns true on success, false on validation error. */
  onSubmit: (body: {
    name: string;
    slug?: string;
    description?: string;
    bannerUrl?: string;
    order?: number;
    isActive?: boolean;
  }) => Promise<boolean>;
  /** For new categories: max(order) + 10 from the current list. */
  suggestedOrder: number;
}

function Field({
  label,
  help,
  required,
  children,
}: {
  label: string;
  help?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block font-hand text-[11px] uppercase tracking-wider text-muted">
        {label}
        {required ? <span className="text-accent ml-0.5">*</span> : null}
      </span>
      {children}
      {help ? (
        <span className="block font-hand text-[10px] text-muted mt-1">{help}</span>
      ) : null}
    </label>
  );
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-\s]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function CategoryForm({
  open,
  onClose,
  existing,
  onSubmit,
  suggestedOrder,
}: Props) {
  const [mounted, setMounted] = useState(false);
  if (!mounted && typeof window !== "undefined") setMounted(true);

  const editing = existing !== null;

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugDirty, setSlugDirty] = useState(false);
  const [description, setDescription] = useState("");
  const [bannerUrl, setBannerUrl] = useState<string>("");
  const [order, setOrder] = useState<number>(0);
  const [isActive, setIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form whenever the drawer opens with a different target — render-phase
  // compare-and-set, per React 19's set-state-in-effect rule.
  const formKey = existing ? `edit:${existing.id}:${existing.updatedAt}` : `new:${suggestedOrder}`;
  const [lastFormKey, setLastFormKey] = useState(formKey);
  if (open && formKey !== lastFormKey) {
    setLastFormKey(formKey);
    if (existing) {
      setName(existing.name);
      setSlug(existing.slug);
      setSlugDirty(true);
      setDescription(existing.description);
      setBannerUrl(existing.bannerUrl ?? "");
      setOrder(existing.order);
      setIsActive(existing.isActive);
    } else {
      setName("");
      setSlug("");
      setSlugDirty(false);
      setDescription("");
      setBannerUrl("");
      setOrder(suggestedOrder);
      setIsActive(true);
    }
    setError(null);
  }

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !submitting) onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose, submitting]);

  if (!open || !mounted) return null;

  function handleNameChange(value: string) {
    setName(value);
    if (!slugDirty) setSlug(slugify(value));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (name.trim().length < 2) {
      setError("Name must be at least 2 characters.");
      return;
    }
    if (slug && !/^[a-z0-9-]+$/.test(slug)) {
      setError("Slug must be lowercase letters, digits, and dashes.");
      return;
    }

    setSubmitting(true);
    try {
      const body = {
        name: name.trim(),
        slug: slug.trim() || undefined,
        description: description.trim() || undefined,
        bannerUrl: bannerUrl.trim() || undefined,
        order,
        isActive,
      };
      const ok = await onSubmit(body);
      if (ok) onClose();
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[65] flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-labelledby="category-form-title"
      data-modal-open="true"
    >
      <button
        type="button"
        aria-label="Close"
        onClick={() => !submitting && onClose()}
        className="absolute inset-0 bg-ink/45 backdrop-blur-[2px]"
      />
      <form
        onSubmit={handleSubmit}
        className="relative bg-paper border-l-[1.5px] border-ink flex flex-col h-full min-h-0 w-full sm:w-[min(540px,92vw)] shadow-[-6px_0_0_var(--color-ink)]"
      >
        <header className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3 border-b-[1.5px] border-ink bg-paper shrink-0">
          <div className="min-w-0">
            <h2
              id="category-form-title"
              className="serif text-[18px] font-extrabold tracking-tight"
            >
              {editing ? "Edit category" : "New category"}
            </h2>
            <p className="font-hand text-[11px] text-muted">
              {editing
                ? `Updating "${existing?.name}"`
                : "Categories drive the public navigation."}
            </p>
          </div>
          <button
            type="button"
            onClick={() => !submitting && onClose()}
            aria-label="Close"
            className="inline-flex items-center justify-center w-9 h-9 border-[1.5px] border-ink rounded-sm hover:bg-paper-2 shrink-0"
          >
            <X size={16} aria-hidden />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-4 space-y-4">
          <Field label="Name" required>
            <Input
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Politics"
              required
            />
          </Field>
          <Field
            label="Slug"
            help="Lowercase letters, digits, dashes. Auto-filled from name."
          >
            <Input
              value={slug}
              onChange={(e) => {
                setSlug(e.target.value.toLowerCase());
                setSlugDirty(true);
              }}
              placeholder="politics"
            />
          </Field>
          <label className="block">
            <span className="block font-hand text-[11px] uppercase tracking-wider text-muted mb-1">
              Description
            </span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
              rows={3}
              placeholder="Short blurb shown on the category landing page."
              className="block w-full bg-paper border-[1.5px] border-ink rounded-md px-3 py-2 font-sans text-[13px] placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/30"
            />
            <span className="block font-hand text-[10px] text-muted mt-1">
              {description.length} / 500
            </span>
          </label>

          <div>
            <span className="block font-hand text-[11px] uppercase tracking-wider text-muted mb-1">
              Banner
            </span>
            {bannerUrl ? (
              <div className="relative border-[1.5px] border-ink rounded-sm overflow-hidden bg-paper-2 mb-2">
                <Image
                  src={bannerUrl}
                  alt=""
                  width={480}
                  height={140}
                  className="w-full h-32 object-cover"
                  unoptimized
                />
                <button
                  type="button"
                  onClick={() => setBannerUrl("")}
                  className="absolute top-1 right-1 inline-flex items-center justify-center w-7 h-7 bg-paper border-[1.5px] border-ink rounded-sm hover:bg-accent hover:text-paper"
                  aria-label="Remove banner"
                >
                  <Trash2 size={12} aria-hidden />
                </button>
              </div>
            ) : (
              <CloudinaryUploader
                accept="image"
                multiple={false}
                size="compact"
                onUploaded={(media) => setBannerUrl(media.url)}
              />
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Order" help="Lower = earlier in the nav.">
              <Input
                type="number"
                value={String(order)}
                onChange={(e) =>
                  setOrder(Number.parseInt(e.target.value, 10) || 0)
                }
                min={0}
              />
            </Field>
            <label className="flex flex-col">
              <span className="block font-hand text-[11px] uppercase tracking-wider text-muted mb-1">
                Active
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={isActive}
                onClick={() => setIsActive((v) => !v)}
                className={cn(
                  "h-10 inline-flex items-center justify-center gap-2 px-3 border-[1.5px] rounded-md font-sans text-[12px]",
                  isActive
                    ? "border-accent-2 bg-accent-2/10 text-accent-2"
                    : "border-muted bg-paper-2 text-muted",
                )}
              >
                <span
                  className={cn(
                    "w-2 h-2 rounded-full",
                    isActive ? "bg-accent-2" : "bg-muted",
                  )}
                  aria-hidden
                />
                {isActive ? "Active" : "Inactive"}
              </button>
            </label>
          </div>

          {error ? (
            <p className="font-sans text-[12.5px] text-accent border-l-[3px] border-accent pl-2 py-1 bg-accent/5">
              {error}
            </p>
          ) : null}
        </div>

        <footer className="border-t-[1.5px] border-ink p-4 flex items-center justify-end gap-2 shrink-0 bg-paper">
          <Btn
            type="button"
            variant="ghost"
            onClick={() => !submitting && onClose()}
            disabled={submitting}
          >
            Cancel
          </Btn>
          <Btn type="submit" variant="solid" disabled={submitting}>
            {submitting
              ? editing
                ? "Saving…"
                : "Creating…"
              : editing
                ? "Save changes"
                : "Create category"}
          </Btn>
        </footer>
      </form>
    </div>,
    document.body,
  );
}
