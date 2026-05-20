"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { Image as ImageIcon, Trash2, X } from "lucide-react";
import { Btn } from "@/components/primitives/Btn";
import { Input } from "@/components/primitives/Input";
import { listCategories } from "@/lib/api/categories.api";
import {
  updateArticle,
  type UpdateArticleBody,
} from "@/lib/api/articles.api";
import { useAdminAuth } from "@/lib/auth/AdminAuthProvider";
import { useToast } from "@/lib/ui/toast";
import type {
  ArticleFullDTO,
  ArticleMediaItem,
  ArticleVideoItem,
} from "@/lib/types/article";
import type { MediaDTO } from "@/lib/types/media";
import { cn } from "@/lib/utils/cn";
import { TagInput } from "./TagInput";
import { RichTextEditor } from "./RichTextEditor";
import { MediaPicker } from "./MediaPicker";
import { SeoPanel, serialiseKeywords, type SeoFormValue } from "./SeoPanel";

interface FormState {
  headline: string;
  summary: string;
  content: string;
  categoryId: string;
  tags: string[];
  featuredImage: ArticleMediaItem | null;
  gallery: ArticleMediaItem[];
  videos: ArticleVideoItem[];
  seo: SeoFormValue;
}

const validation = z.object({
  headline: z.string().trim().min(5, "Headline must be at least 5 characters."),
  summary: z.string().trim().min(10, "Summary must be at least 10 characters."),
  content: z
    .string()
    .refine(
      (v) => v.replace(/<[^>]*>/g, "").trim().length >= 20,
      "Article body must be at least 20 characters of text.",
    ),
  categoryId: z.string().min(1, "Pick a category."),
});

type ValidationErrors = Partial<Record<keyof FormState, string>>;

interface Props {
  article: ArticleFullDTO;
  /** Called after a successful save with the fresh DTO. */
  onUpdated?: (next: ArticleFullDTO) => void;
}

function fromArticle(a: ArticleFullDTO): FormState {
  return {
    headline: a.headline,
    summary: a.summary,
    content: a.content,
    categoryId: a.categoryId,
    tags: a.tags,
    featuredImage: a.featuredImage,
    gallery: a.gallery,
    videos: a.videos,
    seo: {
      title: a.seo.title,
      description: a.seo.description,
      ogImage: a.seo.ogImage ?? "",
      canonicalUrl: a.seo.canonicalUrl ?? "",
      keywords: a.seo.keywords.join(", "),
    },
  };
}

function toBody(state: FormState): UpdateArticleBody {
  return {
    headline: state.headline.trim(),
    summary: state.summary.trim(),
    content: state.content,
    categoryId: state.categoryId,
    tags: state.tags,
    featuredImage: state.featuredImage,
    gallery: state.gallery,
    videos: state.videos,
    seo: {
      title: state.seo.title || undefined,
      description: state.seo.description || undefined,
      ogImage: state.seo.ogImage || undefined,
      canonicalUrl: state.seo.canonicalUrl || undefined,
      keywords: serialiseKeywords(state.seo.keywords),
    },
  };
}

const AUTOSAVE_KEY = (id: string) => `admin-article-draft:${id}`;

/**
 * Admin override editor — re-uses the journalist ArticleForm shape but
 * scoped to edit-only flows (no "Submit for review" button; admin save
 * patches the article directly via PATCH /articles/:id).
 *
 * Autosaves a local copy to localStorage every 1.5s so an accidental
 * tab-close doesn't lose work. The local copy is cleared after a
 * successful PATCH returns.
 */
export function ArticleForm({ article, onUpdated }: Props) {
  const { getIdToken } = useAdminAuth();
  const toast = useToast();

  const [state, setState] = useState<FormState>(() => {
    if (typeof window !== "undefined") {
      try {
        const raw = window.localStorage.getItem(AUTOSAVE_KEY(article.id));
        if (raw) {
          const parsed = JSON.parse(raw) as FormState;
          return parsed;
        }
      } catch {
        // ignored — fall through to server state
      }
    }
    return fromArticle(article);
  });
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [isSaving, setSaving] = useState(false);
  const [pickerKind, setPickerKind] = useState<
    null | "featured" | "gallery" | "videos"
  >(null);

  const categoriesQuery = useQuery({
    queryKey: ["categories", "all"],
    queryFn: () => listCategories(),
    staleTime: 5 * 60 * 1000,
  });

  const activeCategories = useMemo(
    () => (categoriesQuery.data ?? []).filter((c) => c.isActive),
    [categoriesQuery.data],
  );

  // Autosave to localStorage. Debounced 1.5s.
  useEffect(() => {
    const handle = window.setTimeout(() => {
      try {
        window.localStorage.setItem(
          AUTOSAVE_KEY(article.id),
          JSON.stringify(state),
        );
      } catch {
        // quota / private mode — silently ignore
      }
    }, 1500);
    return () => window.clearTimeout(handle);
  }, [state, article.id]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setState((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function runValidation(): ValidationErrors | null {
    const result = validation.safeParse(state);
    if (result.success) return null;
    const next: ValidationErrors = {};
    for (const issue of result.error.issues) {
      const k = issue.path[0] as keyof FormState;
      if (k && !next[k]) next[k] = issue.message;
    }
    return next;
  }

  async function handleSave() {
    const found = runValidation();
    if (found) {
      setErrors(found);
      toast.error("Fix the highlighted fields before saving.");
      return;
    }
    setSaving(true);
    try {
      const token = await getIdToken();
      if (!token) throw new Error("Not signed in.");
      const saved = await updateArticle(article.id, toBody(state), token);
      setState(fromArticle(saved));
      try {
        window.localStorage.removeItem(AUTOSAVE_KEY(article.id));
      } catch {
        // ignored
      }
      onUpdated?.(saved);
      toast.success("Article updated.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't save.");
    } finally {
      setSaving(false);
    }
  }

  function handleResetLocal() {
    try {
      window.localStorage.removeItem(AUTOSAVE_KEY(article.id));
    } catch {
      // ignored
    }
    setState(fromArticle(article));
    setErrors({});
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-end gap-2">
        <Btn
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleResetLocal}
          disabled={isSaving}
        >
          Discard local edits
        </Btn>
        <Btn
          type="button"
          variant="primary"
          onClick={handleSave}
          disabled={isSaving}
        >
          {isSaving ? "Saving…" : "Save changes"}
        </Btn>
      </div>

      {/*
        Single-column layout — the override editor page already wraps this
        form in a 2-col grid (`body + right rail`). Nesting another grid
        here squeezed the body. Category/Tags/SEO live below the body in a
        compact 2-col "Settings" row so they don't span the full width.
      */}
      <div className="space-y-5 min-w-0">
        <Section>
          <label className="block">
            <span className="font-sans text-[12px] font-semibold text-ink">
              Headline
            </span>
            <Input
              type="text"
              value={state.headline}
              onChange={(e) => set("headline", e.target.value)}
              placeholder="A clear, specific headline."
              maxLength={300}
              errorText={errors.headline}
            />
          </label>
          <label className="block mt-3">
            <span className="font-sans text-[12px] font-semibold text-ink">
              Summary
            </span>
            <textarea
              value={state.summary}
              onChange={(e) => set("summary", e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="One or two sentences readers see in the feed."
              className={cn(
                "mt-1 w-full border-[1.5px] border-ink rounded-sm bg-paper px-3 py-2",
                "font-sans text-[14px] placeholder:text-muted",
                "focus:outline-none focus:ring-2 focus:ring-accent/30 resize-y",
                errors.summary && "border-accent",
              )}
              aria-invalid={errors.summary ? true : undefined}
            />
            {errors.summary ? (
              <p className="mt-1 font-hand text-[11px] text-accent">
                {errors.summary}
              </p>
            ) : null}
          </label>
        </Section>

        <Section>
          <SectionLabel>Body</SectionLabel>
          <RichTextEditor
            value={state.content}
            onChange={(html) => set("content", html)}
          />
          {errors.content ? (
            <p className="mt-2 font-hand text-[11px] text-accent">
              {errors.content}
            </p>
          ) : null}
        </Section>

        <Section>
          <SectionLabel>Featured image</SectionLabel>
          <FeaturedImagePicker
            value={state.featuredImage}
            onPick={() => setPickerKind("featured")}
            onClear={() => set("featuredImage", null)}
            onCaptionChange={(caption) =>
              set(
                "featuredImage",
                state.featuredImage
                  ? { ...state.featuredImage, caption }
                  : null,
              )
            }
            onAltChange={(alt) =>
              set(
                "featuredImage",
                state.featuredImage
                  ? { ...state.featuredImage, alt }
                  : null,
              )
            }
          />
        </Section>

        <Section>
          <div className="flex items-center justify-between gap-3">
            <SectionLabel>Gallery</SectionLabel>
            <Btn
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setPickerKind("gallery")}
            >
              Add images
            </Btn>
          </div>
          <GalleryGrid
            items={state.gallery}
            onRemove={(publicId) =>
              set(
                "gallery",
                state.gallery.filter((m) => m.publicId !== publicId),
              )
            }
          />
        </Section>

        <Section>
          <div className="flex items-center justify-between gap-3">
            <SectionLabel>Videos</SectionLabel>
            <Btn
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setPickerKind("videos")}
            >
              Add videos
            </Btn>
          </div>
          <VideoList
            items={state.videos}
            onRemove={(publicId) =>
              set(
                "videos",
                state.videos.filter((v) => v.publicId !== publicId),
              )
            }
          />
        </Section>

        {/* Settings row — Category + Tags stacked on the left, SEO on the right. */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-5">
            <Section>
              <SectionLabel>Category</SectionLabel>
              <select
                value={state.categoryId}
                onChange={(e) => set("categoryId", e.target.value)}
                disabled={categoriesQuery.isLoading}
                className="w-full mt-1 border-[1.5px] border-ink rounded-sm bg-paper px-3 py-2 font-sans text-[14px] focus:outline-none focus:ring-2 focus:ring-accent/30"
                aria-invalid={errors.categoryId ? true : undefined}
              >
                <option value="" disabled>
                  {categoriesQuery.isLoading ? "Loading…" : "Pick a category"}
                </option>
                {activeCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              {errors.categoryId ? (
                <p className="mt-1 font-hand text-[11px] text-accent">
                  {errors.categoryId}
                </p>
              ) : null}
            </Section>

            <Section>
              <SectionLabel>Tags</SectionLabel>
              <TagInput
                value={state.tags}
                onChange={(tags) => set("tags", tags)}
              />
            </Section>
          </div>

          <Section>
            <SectionLabel>SEO</SectionLabel>
            <SeoPanel
              value={state.seo}
              onChange={(seo) => set("seo", seo)}
              defaults={{
                title: state.headline || undefined,
                description: state.summary || undefined,
              }}
            />
          </Section>
        </div>
      </div>

      <MediaPicker
        open={pickerKind === "featured"}
        onClose={() => setPickerKind(null)}
        type="image"
        mode="single"
        articleId={article.id}
        title="Pick featured image"
        onSelect={(media) => set("featuredImage", toMediaItem(media))}
      />
      <MediaPicker
        open={pickerKind === "gallery"}
        onClose={() => setPickerKind(null)}
        type="image"
        mode="multi"
        articleId={article.id}
        title="Add to gallery"
        onSelect={(picked) => {
          const existing = new Set(state.gallery.map((m) => m.publicId));
          const merged = [
            ...state.gallery,
            ...picked
              .filter((m) => !existing.has(m.publicId))
              .map(toMediaItem),
          ].slice(0, 50);
          set("gallery", merged);
        }}
      />
      <MediaPicker
        open={pickerKind === "videos"}
        onClose={() => setPickerKind(null)}
        type="video"
        mode="multi"
        articleId={article.id}
        title="Add videos"
        onSelect={(picked) => {
          const existing = new Set(state.videos.map((v) => v.publicId));
          const merged = [
            ...state.videos,
            ...picked
              .filter((m) => !existing.has(m.publicId))
              .map(toVideoItem),
          ].slice(0, 20);
          set("videos", merged);
        }}
      />
    </div>
  );
}

function toMediaItem(m: MediaDTO): ArticleMediaItem {
  return {
    url: m.url,
    publicId: m.publicId,
    alt: m.alt ?? undefined,
    caption: m.caption ?? undefined,
  };
}

function toVideoItem(m: MediaDTO): ArticleVideoItem {
  return {
    url: m.url,
    publicId: m.publicId,
    caption: m.caption ?? undefined,
  };
}

function Section({ children }: { children: React.ReactNode }) {
  return (
    <section className="border-[1.5px] border-ink rounded-sm bg-paper p-4">
      {children}
    </section>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="font-hand text-[11px] uppercase tracking-[0.18em] text-muted mb-2">
      {children}
    </h3>
  );
}

function FeaturedImagePicker({
  value,
  onPick,
  onClear,
  onAltChange,
  onCaptionChange,
}: {
  value: ArticleMediaItem | null;
  onPick: () => void;
  onClear: () => void;
  onAltChange: (alt: string) => void;
  onCaptionChange: (caption: string) => void;
}) {
  if (!value) {
    return (
      <button
        type="button"
        onClick={onPick}
        className="w-full flex flex-col items-center justify-center gap-2 border-[1.5px] border-dashed border-ink rounded-sm bg-paper-2 py-8 px-4 hover:bg-paper transition-colors"
      >
        <ImageIcon size={20} aria-hidden />
        <span className="font-sans text-[13px] text-ink">
          Pick or upload an image
        </span>
        <span className="font-hand text-[10px] text-muted">
          16:9 looks best in cards.
        </span>
      </button>
    );
  }
  return (
    <div className="space-y-2">
      <div className="relative w-full aspect-[16/9] border-[1.5px] border-ink rounded-sm overflow-hidden bg-paper-2">
        <Image
          src={value.url}
          alt={value.alt ?? ""}
          fill
          sizes="640px"
          className="object-cover"
        />
        <button
          type="button"
          onClick={onClear}
          aria-label="Remove featured image"
          className="absolute top-2 right-2 inline-flex items-center justify-center w-8 h-8 bg-paper border-[1.5px] border-ink rounded-sm hover:bg-paper-2"
        >
          <X size={14} aria-hidden />
        </button>
      </div>
      <Input
        type="text"
        placeholder="Alt text"
        value={value.alt ?? ""}
        onChange={(e) => onAltChange(e.target.value)}
        maxLength={500}
      />
      <Input
        type="text"
        placeholder="Caption (optional)"
        value={value.caption ?? ""}
        onChange={(e) => onCaptionChange(e.target.value)}
        maxLength={500}
      />
      <Btn type="button" variant="ghost" size="sm" onClick={onPick}>
        Replace image
      </Btn>
    </div>
  );
}

function GalleryGrid({
  items,
  onRemove,
}: {
  items: ArticleMediaItem[];
  onRemove: (publicId: string) => void;
}) {
  if (items.length === 0) {
    return (
      <p className="mt-2 font-hand text-[11px] text-muted">
        No gallery images yet.
      </p>
    );
  }
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {items.map((m) => (
        <div
          key={m.publicId}
          className="relative border-[1.5px] border-ink rounded-sm overflow-hidden bg-paper-2"
        >
          <div className="relative w-full aspect-square">
            <Image
              src={m.url}
              alt={m.alt ?? ""}
              fill
              sizes="(max-width: 768px) 50vw, 33vw"
              className="object-cover"
            />
          </div>
          <button
            type="button"
            onClick={() => onRemove(m.publicId)}
            aria-label="Remove from gallery"
            className="absolute top-1.5 right-1.5 inline-flex items-center justify-center w-7 h-7 bg-paper border-[1.5px] border-ink rounded-sm hover:bg-accent hover:text-paper"
          >
            <Trash2 size={12} aria-hidden />
          </button>
        </div>
      ))}
    </div>
  );
}

function VideoList({
  items,
  onRemove,
}: {
  items: ArticleVideoItem[];
  onRemove: (publicId: string) => void;
}) {
  if (items.length === 0) {
    return (
      <p className="mt-2 font-hand text-[11px] text-muted">No videos yet.</p>
    );
  }
  return (
    <ul className="space-y-2">
      {items.map((v) => (
        <li
          key={v.publicId}
          className="flex items-center gap-3 border-[1.5px] border-ink rounded-sm bg-paper-2 px-3 py-2"
        >
          <video
            src={v.url}
            preload="metadata"
            muted
            className="w-20 h-14 object-cover bg-ink rounded-sm"
          />
          <span className="flex-1 min-w-0 font-sans text-[13px] truncate">
            {v.caption || v.publicId}
          </span>
          <button
            type="button"
            onClick={() => onRemove(v.publicId)}
            aria-label="Remove video"
            className="inline-flex items-center justify-center w-8 h-8 border-[1.5px] border-ink rounded-sm hover:bg-accent hover:text-paper"
          >
            <Trash2 size={12} aria-hidden />
          </button>
        </li>
      ))}
    </ul>
  );
}
