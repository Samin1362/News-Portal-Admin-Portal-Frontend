"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Btn } from "@/components/primitives/Btn";
import { Input } from "@/components/primitives/Input";
import { scheduleArticle } from "@/lib/api/articles.api";
import { useAdminAuth } from "@/lib/auth/AdminAuthProvider";
import { useToast } from "@/lib/ui/toast";
import type { ArticleFullDTO } from "@/lib/types/article";
import { formatRelative } from "@/lib/utils/format";

interface Props {
  article: ArticleFullDTO;
  onUpdated?: (next: ArticleFullDTO) => void;
}

/** datetime-local pickers need yyyy-mm-ddTHH:mm with no timezone suffix. */
function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function ScheduleControl({ article, onUpdated }: Props) {
  const { getIdToken } = useAdminAuth();
  const toast = useToast();
  const qc = useQueryClient();
  const [draft, setDraft] = useState<string>(toLocalInput(article.scheduledAt));

  const mutation = useMutation({
    mutationFn: async (scheduledAt: string) => {
      const token = await getIdToken();
      if (!token) throw new Error("Not signed in.");
      return scheduleArticle(article.id, scheduledAt, token);
    },
    onSuccess: (next) => {
      qc.setQueryData(["article", article.id], next);
      onUpdated?.(next);
      toast.success("Schedule saved.");
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Couldn't schedule.");
    },
  });

  const onSubmit = () => {
    if (!draft) {
      toast.error("Pick a date and time.");
      return;
    }
    const iso = new Date(draft).toISOString();
    mutation.mutate(iso);
  };

  return (
    <div className="space-y-2">
      <label className="block">
        <span className="font-sans text-[12px] font-semibold text-ink">
          Scheduled publish
        </span>
        <Input
          type="datetime-local"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
      </label>
      <div className="flex items-center justify-between gap-2">
        <p className="font-hand text-[10px] text-muted">
          {article.scheduledAt
            ? `Currently scheduled · ${formatRelative(article.scheduledAt)}`
            : "Not scheduled."}
        </p>
        <Btn
          type="button"
          variant="default"
          size="sm"
          onClick={onSubmit}
          disabled={mutation.isPending}
        >
          {mutation.isPending ? "Saving…" : "Schedule"}
        </Btn>
      </div>
    </div>
  );
}
