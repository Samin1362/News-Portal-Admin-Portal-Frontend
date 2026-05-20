"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import { Btn } from "@/components/primitives/Btn";
import { useAdminAuth } from "@/lib/auth/AdminAuthProvider";
import { useToast } from "@/lib/ui/toast";
import { listMine, type PaginatedMedia } from "@/lib/api/media.api";
import type { MediaDTO, MediaType } from "@/lib/types/media";
import { cn } from "@/lib/utils/cn";
import { CloudinaryUploader } from "./CloudinaryUploader";
import { MediaCard } from "./MediaCard";

interface BaseProps {
  open: boolean;
  onClose: () => void;
  type: MediaType;
  articleId?: string;
  title?: string;
}

interface SingleProps extends BaseProps {
  mode: "single";
  onSelect: (media: MediaDTO) => void;
}
interface MultiProps extends BaseProps {
  mode: "multi";
  onSelect: (media: MediaDTO[]) => void;
}

type Props = SingleProps | MultiProps;

const PAGE_SIZE = 24;

/**
 * Drawer-style modal for picking media from the admin's own library or
 * uploading a new asset. Admin-portal counterpart of frontend/MediaPicker.
 *
 * Note: admin's `/media/me` returns only media the admin user has personally
 * uploaded. Article gallery / featured assets already on the article doc
 * survive untouched even if the admin's library is empty.
 */
export function MediaPicker(props: Props) {
  const { open, onClose, type, articleId, mode, title } = props;
  const { getIdToken } = useAdminAuth();
  const toast = useToast();
  const qc = useQueryClient();
  const queryKey: readonly ["media-library", MediaType] = [
    "media-library",
    type,
  ];

  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Portal mount detection — flips true once on the client, render-phase
  // per React 19's recommended pattern (no useEffect → no cascading render).
  const [mounted, setMounted] = useState(false);
  if (!mounted && typeof window !== "undefined") {
    setMounted(true);
  }

  // Compare-and-set: when `open` flips from closed→open, reset selection.
  const [lastOpen, setLastOpen] = useState(open);
  if (open !== lastOpen) {
    setLastOpen(open);
    if (open && selected.size > 0) setSelected(new Set());
  }

  const libraryQ = useQuery<PaginatedMedia, Error>({
    queryKey,
    enabled: open,
    queryFn: async () => {
      const token = await getIdToken();
      if (!token) throw new Error("Not signed in.");
      return listMine({ type, limit: PAGE_SIZE }, token);
    },
    staleTime: 30_000,
  });

  // Surface load failures via toast (one-shot per error).
  useEffect(() => {
    if (libraryQ.isError && libraryQ.error) {
      toast.error(libraryQ.error.message);
    }
  }, [libraryQ.isError, libraryQ.error, toast]);

  // Lock body scroll only while the picker is mounted+open.
  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !mounted) return null;

  const items: MediaDTO[] = libraryQ.data?.items ?? [];
  const loading = libraryQ.isPending;

  function handleClick(media: MediaDTO) {
    if (mode === "single") {
      props.onSelect(media);
      onClose();
      return;
    }
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(media.id)) next.delete(media.id);
      else next.add(media.id);
      return next;
    });
  }

  function handleConfirmMulti() {
    if (mode !== "multi") return;
    const picked = items.filter((m) => selected.has(m.id));
    props.onSelect(picked);
    onClose();
  }

  function prependItem(media: MediaDTO) {
    qc.setQueryData<PaginatedMedia>(queryKey, (prev) => {
      const prevItems = prev?.items ?? [];
      return { items: [media, ...prevItems], meta: prev?.meta };
    });
  }

  const headerLabel: string =
    title ?? (mode === "single" ? "Pick an asset" : "Pick assets");
  const typeLabel: string = type;

  return createPortal(
    <div
      data-modal-open="true"
      className="fixed inset-0 z-[60] flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-media-picker-title"
    >
      <button
        type="button"
        aria-label="Close media picker"
        onClick={onClose}
        className="absolute inset-0 bg-ink/45 backdrop-blur-[2px]"
      />
      <div
        className={cn(
          "relative bg-paper border-l-[1.5px] border-ink flex flex-col h-full min-h-0",
          "w-full sm:w-[min(640px,92vw)]",
          "shadow-[-6px_0_0_var(--color-ink)]",
        )}
      >
        <header className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3 border-b-[1.5px] border-ink bg-paper shrink-0">
          <div className="min-w-0">
            <h2
              id="admin-media-picker-title"
              className="serif text-[18px] font-extrabold tracking-tight truncate"
            >
              {headerLabel}
            </h2>
            <p className="font-hand text-[11px] text-muted">
              Type: {typeLabel} · {items.length} in library
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="inline-flex items-center justify-center w-9 h-9 border-[1.5px] border-ink rounded-sm hover:bg-paper-2 shrink-0"
          >
            <X size={16} aria-hidden />
          </button>
        </header>

        <div className="px-4 sm:px-5 py-3 border-b-[1.5px] border-ink/30 bg-paper-2 shrink-0">
          <CloudinaryUploader
            accept={type === "video" ? "video" : "image"}
            multiple={mode === "multi"}
            articleId={articleId}
            size="compact"
            onUploaded={(media) => {
              prependItem(media);
              if (mode === "single") {
                props.onSelect(media);
                onClose();
              } else {
                setSelected((prev) => {
                  const next = new Set(prev);
                  next.add(media.id);
                  return next;
                });
              }
            }}
          />
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-5 py-3">
          {loading ? (
            <p className="font-hand text-[12px] text-muted">Loading library…</p>
          ) : items.length === 0 ? (
            <p className="font-hand text-[12px] text-muted">
              No {type === "video" ? "videos" : "images"} in your library —
              upload one above to get started.
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {items.map((m) => (
                <MediaCard
                  key={m.id}
                  media={m}
                  compact
                  selected={selected.has(m.id)}
                  onClick={() => handleClick(m)}
                />
              ))}
            </div>
          )}
        </div>

        {mode === "multi" ? (
          <footer
            className={cn(
              "flex items-center justify-between gap-3 px-4 sm:px-5 py-3",
              "border-t-[1.5px] border-ink bg-paper-2 shrink-0",
            )}
          >
            <span className="font-hand text-[12px] text-muted">
              {selected.size} selected
            </span>
            <div className="flex items-center gap-2">
              <Btn type="button" variant="ghost" size="sm" onClick={onClose}>
                Cancel
              </Btn>
              <Btn
                type="button"
                variant="primary"
                size="sm"
                disabled={selected.size === 0}
                onClick={handleConfirmMulti}
              >
                Add {selected.size > 0 ? `(${selected.size})` : ""}
              </Btn>
            </div>
          </footer>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
