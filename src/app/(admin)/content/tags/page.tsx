"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Plus, Search, Trash2 } from "lucide-react";
import {
  Card,
  CardHead,
  CardMeta,
  CardTitle,
} from "@/components/primitives/Card";
import { Btn } from "@/components/primitives/Btn";
import { Pill } from "@/components/primitives/Pill";
import { DeleteConfirmModal } from "@/components/taxonomy/DeleteConfirmModal";
import { useAdminAuth } from "@/lib/auth/AdminAuthProvider";
import { useToast } from "@/lib/ui/toast";
import {
  createTag,
  deleteTag,
  listTagsPaginated,
} from "@/lib/api/tags.api";
import { listQueue } from "@/lib/api/articles.api";
import { ApiError } from "@/lib/api/client";
import type { ApiResult } from "@/lib/types/api";
import type { TagDTO } from "@/lib/types/article";
import { cn } from "@/lib/utils/cn";

const PAGE_LIMIT = 30;

export default function TagsPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <TagsInner />
    </Suspense>
  );
}

function TagsInner() {
  const router = useRouter();
  const params = useSearchParams();
  const { getIdToken, role } = useAdminAuth();
  const toast = useToast();
  const qc = useQueryClient();
  const enabled = role === "admin";

  const q = params.get("q") ?? "";
  const page = Number.parseInt(params.get("page") ?? "1", 10) || 1;

  const [searchInput, setSearchInput] = useState(q);
  const [lastUrlQ, setLastUrlQ] = useState(q);
  if (q !== lastUrlQ) {
    setLastUrlQ(q);
    setSearchInput(q);
  }

  useEffect(() => {
    if (searchInput === q) return;
    const timer = window.setTimeout(() => {
      const next = new URLSearchParams(params.toString());
      if (searchInput) next.set("q", searchInput);
      else next.delete("q");
      next.delete("page");
      router.replace(`/content/tags?${next.toString()}`);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [searchInput, q, params, router]);

  const setQueryParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(params.toString());
    if (value === null || value === "") next.delete(key);
    else next.set(key, value);
    if (key !== "page") next.delete("page");
    router.replace(`/content/tags?${next.toString()}`);
  };

  const listQ = useQuery({
    enabled,
    queryKey: ["tags-admin", { q, page }],
    queryFn: async () => {
      const token = await getIdToken();
      return listTagsPaginated(
        { q: q || undefined, page, limit: PAGE_LIMIT },
        token ?? undefined,
      );
    },
    staleTime: 30_000,
  });

  const items = useMemo(() => listQ.data?.data ?? [], [listQ.data?.data]);
  const total = listQ.data?.meta?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT));

  // ---- create ----
  const [newTagName, setNewTagName] = useState("");
  const [creating, setCreating] = useState(false);

  const createMut = useMutation({
    mutationFn: async (name: string) => {
      const token = await getIdToken();
      if (!token) throw new Error("Not signed in.");
      return createTag(name, token);
    },
  });

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = newTagName.trim();
    if (trimmed.length === 0) return;
    setCreating(true);
    try {
      const created = await createMut.mutateAsync(trimmed);
      toast.success(`Tag "${created.name}" created.`);
      setNewTagName("");
      qc.invalidateQueries({ queryKey: ["tags-admin"] });
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.code === "CONFLICT"
            ? `${err.message} — pick a different name.`
            : err.message
          : "Create failed.";
      toast.error(msg);
    } finally {
      setCreating(false);
    }
  }

  // ---- delete ----
  const [deleteTarget, setDeleteTarget] = useState<TagDTO | null>(null);

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const token = await getIdToken();
      if (!token) throw new Error("Not signed in.");
      return deleteTag(id, token);
    },
  });

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteMut.mutateAsync(deleteTarget.id);
      qc.setQueryData<ApiResult<TagDTO[]>>(
        ["tags-admin", { q, page }],
        (prev) => {
          if (!prev) return prev;
          const filtered = prev.data.filter((t) => t.id !== deleteTarget.id);
          return {
            ...prev,
            data: filtered,
            meta: prev.meta
              ? { ...prev.meta, total: Math.max(0, prev.meta.total - 1) }
              : prev.meta,
          };
        },
      );
      toast.success(`"${deleteTarget.name}" deleted.`);
      setDeleteTarget(null);
      qc.invalidateQueries({ queryKey: ["tags-admin"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed.");
    }
  }

  return (
    <>
      <section className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="font-hand text-[12px] uppercase tracking-wider text-muted">
            Content
          </p>
          <h1 className="serif text-[28px] sm:text-[34px] font-extrabold tracking-tight leading-none mt-1">
            <span className="uline">Tags</span>
          </h1>
          <p className="mt-2 font-hand text-[12px] text-muted">
            {listQ.isPending
              ? "Loading…"
              : `${total.toLocaleString()} total · page ${page} of ${totalPages}`}
          </p>
        </div>
      </section>

      <Card>
        <CardHead>
          <CardTitle>Create tag</CardTitle>
          <CardMeta>Tags auto-create on article submit too; use this for housekeeping.</CardMeta>
        </CardHead>
        <form
          onSubmit={handleCreate}
          className="flex flex-wrap items-center gap-2"
        >
          <label className="flex-1 min-w-[220px]">
            <span className="sr-only">New tag name</span>
            <input
              type="text"
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              placeholder="Type a tag name and press Enter…"
              maxLength={60}
              className="w-full bg-paper-2 border-[1.5px] border-ink rounded-md px-3 py-2 font-sans text-[13px] placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/30"
            />
          </label>
          <Btn
            type="submit"
            variant="solid"
            disabled={creating || newTagName.trim().length === 0}
          >
            <Plus size={14} aria-hidden />
            Create
          </Btn>
        </form>
      </Card>

      <Card>
        <CardHead>
          <CardTitle>Directory</CardTitle>
          <CardMeta>{q ? `Filtered by "${q}"` : "All tags"}</CardMeta>
        </CardHead>

        <div className="flex flex-wrap items-center gap-2 mb-4">
          <label className="flex items-center gap-2 px-3 h-9 bg-paper-2 border-[1.5px] border-ink rounded-md min-w-[220px] flex-1 max-w-[420px]">
            <Search size={14} className="text-muted" aria-hidden />
            <input
              type="search"
              placeholder="Search tag name or slug…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="flex-1 bg-transparent outline-none font-sans text-[13px] placeholder:text-muted"
            />
          </label>
          {q ? (
            <button
              type="button"
              onClick={() => setQueryParam("q", null)}
              className="font-hand text-[11px] text-accent hover:underline"
            >
              Clear
            </button>
          ) : null}
        </div>

        {listQ.isPending ? (
          <ul className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <li
                key={i}
                className="h-10 bg-paper-2 rounded-sm animate-pulse"
                aria-hidden
              />
            ))}
          </ul>
        ) : listQ.isError ? (
          <p className="font-hand text-[12px] text-accent">
            Couldn&apos;t load tags — {listQ.error?.message ?? "try again"}.
          </p>
        ) : items.length === 0 ? (
          <div className="py-10 text-center">
            <p className="font-hand text-[13px] text-muted">
              {q ? "No tags match this search." : "No tags yet."}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-ink/10">
            {items.map((tag) => (
              <TagRow
                key={tag.id}
                tag={tag}
                busy={deleteMut.isPending}
                onDelete={() => setDeleteTarget(tag)}
              />
            ))}
          </ul>
        )}

        {totalPages > 1 ? (
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-ink/10">
            <span className="font-hand text-[11px] text-muted">
              {`Showing ${(page - 1) * PAGE_LIMIT + 1}–${Math.min(page * PAGE_LIMIT, total)} of ${total}`}
            </span>
            <div className="flex items-center gap-2">
              <Btn
                size="sm"
                variant="default"
                disabled={page <= 1}
                onClick={() => setQueryParam("page", String(page - 1))}
              >
                <ChevronLeft size={12} aria-hidden />
                Prev
              </Btn>
              <span className="font-sans text-[12px] text-muted">
                {page} / {totalPages}
              </span>
              <Btn
                size="sm"
                variant="default"
                disabled={page >= totalPages}
                onClick={() => setQueryParam("page", String(page + 1))}
              >
                Next
                <ChevronRight size={12} aria-hidden />
              </Btn>
            </div>
          </div>
        ) : null}
      </Card>

      <DeleteConfirmModal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title={`Delete "${deleteTarget?.name ?? ""}"?`}
        description="This removes the tag from the tag directory. Articles that already reference this tag keep its slug — they won't be modified."
        warning={
          deleteTarget
            ? `Tag deletion is destructive and not reversible from the UI.`
            : undefined
        }
        confirmWord="delete"
        destructiveLabel="Delete tag"
      />
    </>
  );
}

function TagRow({
  tag,
  busy,
  onDelete,
}: {
  tag: TagDTO;
  busy: boolean;
  onDelete: () => void;
}) {
  return (
    <li className="flex items-center gap-3 py-2.5 pl-2 pr-2 rounded-sm row-hov">
      <div className="min-w-0 flex-1">
        <p className="font-sans text-[13px] font-semibold truncate">
          {tag.name}
        </p>
        <p className="font-hand text-[11px] text-muted truncate">
          /{tag.slug}
        </p>
      </div>
      <TagUsagePill tagSlug={tag.slug} />
      <Btn
        size="sm"
        variant="ghost"
        onClick={onDelete}
        disabled={busy}
        className={cn("text-accent hover:bg-accent/10")}
        aria-label={`Delete tag ${tag.name}`}
      >
        <Trash2 size={12} aria-hidden />
        Delete
      </Btn>
    </li>
  );
}

function TagUsagePill({ tagSlug }: { tagSlug: string }) {
  const { getIdToken, role } = useAdminAuth();
  // `tagSlug` filter was added to the backend queue schema in Phase 6. limit=1
  // gives us `meta.total` cheaply without pulling article payloads.
  const q = useQuery({
    enabled: role === "admin",
    queryKey: ["tag-usage", tagSlug],
    queryFn: async () => {
      const token = await getIdToken();
      if (!token) return 0;
      const result = await listQueue(
        { status: "all", tagSlug, limit: 1 },
        token,
      );
      return result.meta?.total ?? 0;
    },
    staleTime: 5 * 60 * 1000,
  });

  if (q.isPending) {
    return <span className="font-hand text-[11px] text-muted">…</span>;
  }
  const count = q.data ?? 0;
  return (
    <Pill tone={count > 0 ? "info" : "muted"}>
      {count} article{count === 1 ? "" : "s"}
    </Pill>
  );
}

function PageSkeleton() {
  return (
    <Card>
      <CardHead>
        <CardTitle>Tags</CardTitle>
      </CardHead>
      <ul className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <li
            key={i}
            className="h-10 bg-paper-2 rounded-sm animate-pulse"
            aria-hidden
          />
        ))}
      </ul>
    </Card>
  );
}
