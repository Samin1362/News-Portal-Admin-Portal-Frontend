"use client";

import Image from "next/image";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Pencil, Trash2 } from "lucide-react";
import { Btn } from "@/components/primitives/Btn";
import { Pill } from "@/components/primitives/Pill";
import { cn } from "@/lib/utils/cn";
import type { CategoryDTO } from "@/lib/types/category";

interface Props {
  category: CategoryDTO;
  busy: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onToggleActive: (next: boolean) => void;
}

/**
 * Sortable row. `useSortable` returns the transform/transition the parent
 * `<SortableContext>` injects during drag; the GripVertical icon is the
 * drag handle (its `listeners` come from useSortable's `attributes` map).
 */
export function CategoryRow({
  category,
  busy,
  onEdit,
  onDelete,
  onToggleActive,
}: Props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: category.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-3 py-2.5 px-2 rounded-sm border-[1.5px] border-transparent",
        "bg-paper hover:bg-paper-2",
        isDragging && "border-ink shadow-[4px_4px_0_var(--color-ink)] bg-paper z-30 relative",
      )}
    >
      <button
        type="button"
        className="shrink-0 inline-flex items-center justify-center w-7 h-9 text-muted hover:text-ink cursor-grab active:cursor-grabbing"
        aria-label="Drag to reorder"
        {...attributes}
        {...listeners}
      >
        <GripVertical size={16} aria-hidden />
      </button>

      <div className="shrink-0 w-10 h-10 border-[1.5px] border-ink rounded-sm overflow-hidden bg-paper-2 grid place-items-center">
        {category.bannerUrl ? (
          <Image
            src={category.bannerUrl}
            alt=""
            width={40}
            height={40}
            className="w-full h-full object-cover"
            unoptimized
          />
        ) : (
          <span
            aria-hidden
            className="w-full h-full bg-[repeating-linear-gradient(45deg,var(--color-paper-2)_0_6px,rgba(0,0,0,0.06)_6px_12px)]"
          />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="font-sans text-[13px] font-semibold truncate">
          {category.name}
        </p>
        <p className="font-hand text-[11px] text-muted truncate">
          /{category.slug}
          {category.description ? ` · ${category.description}` : ""}
        </p>
      </div>

      <ToggleSwitch
        checked={category.isActive}
        onChange={onToggleActive}
        disabled={busy}
        label={category.isActive ? "Active" : "Inactive"}
      />

      <Pill tone="muted">order {category.order}</Pill>

      <Btn size="sm" variant="ghost" onClick={onEdit} aria-label="Edit category">
        <Pencil size={12} aria-hidden />
        Edit
      </Btn>
      <Btn
        size="sm"
        variant="ghost"
        onClick={onDelete}
        aria-label="Delete category"
        className="text-accent hover:bg-accent/10"
      >
        <Trash2 size={12} aria-hidden />
      </Btn>
    </li>
  );
}

function ToggleSwitch({
  checked,
  onChange,
  disabled,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={`Active (${label})`}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "shrink-0 inline-flex items-center gap-2 px-2 py-1 border-[1.5px] rounded-md text-[11px] font-hand uppercase tracking-wider",
        checked
          ? "bg-accent-2/10 border-accent-2 text-accent-2"
          : "bg-paper-2 border-ink/40 text-muted",
        disabled && "opacity-50 cursor-not-allowed",
      )}
    >
      <span
        className={cn(
          "w-2 h-2 rounded-full",
          checked ? "bg-accent-2" : "bg-muted",
        )}
        aria-hidden
      />
      {label}
    </button>
  );
}
