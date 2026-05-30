"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Plus } from "lucide-react";
import {
  Card,
  CardHead,
  CardMeta,
  CardTitle,
} from "@/components/primitives/Card";
import { Btn } from "@/components/primitives/Btn";
import { CategoryRow } from "@/components/taxonomy/CategoryRow";
import { CategoryForm } from "@/components/taxonomy/CategoryForm";
import { DeleteConfirmModal } from "@/components/taxonomy/DeleteConfirmModal";
import { useAdminAuth } from "@/lib/auth/AdminAuthProvider";
import { useToast } from "@/lib/ui/toast";
import {
  createCategory,
  deleteCategory,
  listCategories,
  updateCategory,
  type CreateCategoryBody,
  type UpdateCategoryBody,
} from "@/lib/api/categories.api";
import { ApiError } from "@/lib/api/client";
import { useAuditRecorder } from "@/lib/audit/useAuditRecorder";
import type { CategoryDTO } from "@/lib/types/category";

const QUERY_KEY = ["categories", { includeInactive: true }] as const;
const REORDER_DEBOUNCE_MS = 800;

export default function CategoriesPage() {
  const { getIdToken, role } = useAdminAuth();
  const toast = useToast();
  const qc = useQueryClient();
  const recordAudit = useAuditRecorder();
  const enabled = role === "admin";

  const listQ = useQuery({
    enabled,
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const token = await getIdToken();
      const items = await listCategories(
        { includeInactive: true },
        token ?? undefined,
      );
      // Sort by `order` ascending; ties broken by creation date.
      return [...items].sort(
        (a, b) =>
          a.order - b.order ||
          a.createdAt.localeCompare(b.createdAt),
      );
    },
    staleTime: 30_000,
  });

  const items = useMemo(() => listQ.data ?? [], [listQ.data]);

  // ---- form drawer state ----
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<CategoryDTO | null>(null);

  function openNew() {
    setEditTarget(null);
    setFormOpen(true);
  }
  function openEdit(category: CategoryDTO) {
    setEditTarget(category);
    setFormOpen(true);
  }

  const suggestedOrder = useMemo(() => {
    const max = items.reduce(
      (acc, c) => (c.order > acc ? c.order : acc),
      -10,
    );
    return max + 10;
  }, [items]);

  // ---- delete state ----
  const [deleteTarget, setDeleteTarget] = useState<CategoryDTO | null>(null);

  // ---- mutations ----
  const createMut = useMutation({
    mutationFn: async (body: CreateCategoryBody) => {
      const token = await getIdToken();
      if (!token) throw new Error("Not signed in.");
      return createCategory(body, token);
    },
  });

  const updateMut = useMutation({
    mutationFn: async (input: { id: string; body: UpdateCategoryBody }) => {
      const token = await getIdToken();
      if (!token) throw new Error("Not signed in.");
      return updateCategory(input.id, input.body, token);
    },
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const token = await getIdToken();
      if (!token) throw new Error("Not signed in.");
      return deleteCategory(id, token);
    },
  });

  const handleSubmitForm = useCallback(
    async (body: CreateCategoryBody): Promise<boolean> => {
      try {
        if (editTarget) {
          const updated = await updateMut.mutateAsync({
            id: editTarget.id,
            body: body as UpdateCategoryBody,
          });
          qc.setQueryData<CategoryDTO[]>(QUERY_KEY, (prev) =>
            (prev ?? []).map((c) => (c.id === updated.id ? updated : c)),
          );
          recordAudit({
            action: "category-update",
            targetId: updated.id,
            summary: `Updated category "${updated.name}"`,
            detail: updated.slug,
          });
          toast.success(`"${updated.name}" updated.`);
        } else {
          const created = await createMut.mutateAsync(body);
          qc.setQueryData<CategoryDTO[]>(QUERY_KEY, (prev) =>
            [...(prev ?? []), created].sort(
              (a, b) =>
                a.order - b.order ||
                a.createdAt.localeCompare(b.createdAt),
            ),
          );
          recordAudit({
            action: "category-create",
            targetId: created.id,
            summary: `Created category "${created.name}"`,
            detail: created.slug,
          });
          toast.success(`"${created.name}" created.`);
        }
        qc.invalidateQueries({ queryKey: QUERY_KEY });
        return true;
      } catch (err) {
        const msg =
          err instanceof ApiError
            ? err.code === "CONFLICT"
              ? `${err.message} — pick a different slug or rename it.`
              : err.message
            : "Save failed.";
        toast.error(msg);
        return false;
      }
    },
    [editTarget, updateMut, createMut, qc, toast, recordAudit],
  );

  // ---- toggleActive (optimistic) ----
  const handleToggleActive = useCallback(
    async (category: CategoryDTO, next: boolean) => {
      qc.setQueryData<CategoryDTO[]>(QUERY_KEY, (prev) =>
        (prev ?? []).map((c) =>
          c.id === category.id ? { ...c, isActive: next } : c,
        ),
      );
      try {
        const updated = await updateMut.mutateAsync({
          id: category.id,
          body: { isActive: next },
        });
        qc.setQueryData<CategoryDTO[]>(QUERY_KEY, (prev) =>
          (prev ?? []).map((c) => (c.id === updated.id ? updated : c)),
        );
      } catch (err) {
        // Revert + invalidate to re-sync with server.
        qc.invalidateQueries({ queryKey: QUERY_KEY });
        toast.error(err instanceof Error ? err.message : "Toggle failed.");
      }
    },
    [updateMut, qc, toast],
  );

  // ---- delete (with 409 message) ----
  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      await deleteMut.mutateAsync(deleteTarget.id);
      qc.setQueryData<CategoryDTO[]>(QUERY_KEY, (prev) =>
        (prev ?? []).filter((c) => c.id !== deleteTarget.id),
      );
      recordAudit({
        action: "category-delete",
        targetId: deleteTarget.id,
        summary: `Deleted category "${deleteTarget.name}"`,
        detail: deleteTarget.slug,
      });
      toast.success(`"${deleteTarget.name}" deleted.`);
      setDeleteTarget(null);
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Delete failed.";
      toast.error(msg);
    }
  }, [deleteTarget, deleteMut, qc, toast, recordAudit]);

  // ---- drag-to-reorder ----
  // Pending reorder writes coalesce into a single batch with an 800ms debounce.
  // Only categories whose `order` actually changed are sent.
  const pendingChangesRef = useRef<Map<string, number>>(new Map());
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const flushReorder = useCallback(async () => {
    const changes = pendingChangesRef.current;
    if (changes.size === 0) return;
    const batch = Array.from(changes.entries());
    pendingChangesRef.current = new Map();
    try {
      const token = await getIdToken();
      if (!token) throw new Error("Not signed in.");
      await Promise.all(
        batch.map(([id, order]) => updateCategory(id, { order }, token)),
      );
      toast.success(`Reorder saved · ${batch.length} updated.`);
      qc.invalidateQueries({ queryKey: QUERY_KEY });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Reorder failed.");
      qc.invalidateQueries({ queryKey: QUERY_KEY });
    }
  }, [getIdToken, qc, toast]);

  useEffect(() => {
    return () => {
      if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
    };
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const current = qc.getQueryData<CategoryDTO[]>(QUERY_KEY) ?? items;
      const oldIndex = current.findIndex((c) => c.id === active.id);
      const newIndex = current.findIndex((c) => c.id === over.id);
      if (oldIndex < 0 || newIndex < 0) return;
      const reordered = arrayMove(current, oldIndex, newIndex);
      // Re-pack `order` as 10/20/30… so newly inserted items always have gaps.
      const packed = reordered.map((c, i) => ({ ...c, order: (i + 1) * 10 }));
      qc.setQueryData<CategoryDTO[]>(QUERY_KEY, packed);
      // Record only the rows whose order changed.
      for (const c of packed) {
        const prevOrder = current.find((x) => x.id === c.id)?.order;
        if (prevOrder !== c.order) pendingChangesRef.current.set(c.id, c.order);
      }
      if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
      flushTimerRef.current = setTimeout(flushReorder, REORDER_DEBOUNCE_MS);
    },
    [qc, items, flushReorder],
  );

  const busy =
    createMut.isPending || updateMut.isPending || deleteMut.isPending;

  return (
    <>
      <section className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="font-hand text-[12px] uppercase tracking-wider text-muted">
            Content
          </p>
          <h1 className="serif text-[28px] sm:text-[34px] font-extrabold tracking-tight leading-none mt-1">
            <span className="uline">Categories</span>
          </h1>
          <p className="mt-2 font-hand text-[12px] text-muted">
            {listQ.isPending
              ? "Loading…"
              : `${items.length.toLocaleString()} total · drag to reorder`}
          </p>
        </div>
        <Btn variant="solid" onClick={openNew}>
          <Plus size={14} aria-hidden />
          New category
        </Btn>
      </section>

      <Card>
        <CardHead>
          <CardTitle>Navigation order</CardTitle>
          <CardMeta>Drop changes save automatically after a brief pause.</CardMeta>
        </CardHead>

        {listQ.isPending ? (
          <ul className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <li
                key={i}
                className="h-14 bg-paper-2 rounded-sm animate-pulse"
                aria-hidden
              />
            ))}
          </ul>
        ) : listQ.isError ? (
          <p className="font-hand text-[12px] text-accent">
            Couldn&apos;t load categories — {listQ.error?.message ?? "try again"}.
          </p>
        ) : items.length === 0 ? (
          <div className="py-10 text-center">
            <p className="font-hand text-[13px] text-muted">
              No categories yet. Create the first one to populate the public nav.
            </p>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={items.map((c) => c.id)}
              strategy={verticalListSortingStrategy}
            >
              <ul className="space-y-1">
                {items.map((c) => (
                  <CategoryRow
                    key={c.id}
                    category={c}
                    busy={busy}
                    onEdit={() => openEdit(c)}
                    onDelete={() => setDeleteTarget(c)}
                    onToggleActive={(next) => handleToggleActive(c, next)}
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        )}
      </Card>

      <CategoryForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        existing={editTarget}
        onSubmit={handleSubmitForm}
        suggestedOrder={suggestedOrder}
      />

      <DeleteConfirmModal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title={`Delete "${deleteTarget?.name ?? ""}"?`}
        description="This removes the category from the public navigation. Backend will block the delete if any articles still reference it."
        warning="Reassign or archive referencing articles first if you see a 'still in use' error."
        confirmWord="delete"
        destructiveLabel="Delete category"
      />
    </>
  );
}
