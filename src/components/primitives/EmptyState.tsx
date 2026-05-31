import type { ReactNode } from "react";
import { Inbox, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface Props {
  title: string;
  description?: string;
  icon?: LucideIcon;
  action?: ReactNode;
  className?: string;
}

/**
 * Shared empty-state visual. Used by lists, tables, and drawers when a
 * query returns zero rows or a filter excludes everything. Keep copy
 * specific — "No articles match this filter" beats "No results".
 */
export function EmptyState({
  title,
  description,
  icon: Icon = Inbox,
  action,
  className,
}: Props) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center py-10 px-4",
        "border border-dashed border-ink/20 rounded-sm bg-paper",
        className,
      )}
      role="status"
    >
      <span
        aria-hidden
        className="inline-flex items-center justify-center w-10 h-10 mb-3 border-[1.5px] border-ink/40 rounded-sm bg-paper-2 text-ink/70"
      >
        <Icon size={18} aria-hidden />
      </span>
      <p className="serif text-[16px] font-extrabold tracking-tight">
        {title}
      </p>
      {description ? (
        <p className="mt-1 font-hand text-[12px] text-muted max-w-[44ch]">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}
