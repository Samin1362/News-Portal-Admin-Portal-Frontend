"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Btn } from "@/components/primitives/Btn";
import { patchCommentsEnabled } from "@/lib/api/articles.api";
import { useAdminAuth } from "@/lib/auth/AdminAuthProvider";
import { useToast } from "@/lib/ui/toast";
import type { ArticleFullDTO } from "@/lib/types/article";

interface Props {
  article: ArticleFullDTO;
  onUpdated?: (next: ArticleFullDTO) => void;
}

export function CommentsToggle({ article, onUpdated }: Props) {
  const { getIdToken } = useAdminAuth();
  const toast = useToast();
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      const token = await getIdToken();
      if (!token) throw new Error("Not signed in.");
      return patchCommentsEnabled(
        article.id,
        !article.isCommentsEnabled,
        token,
      );
    },
    onSuccess: (next) => {
      qc.setQueryData(["article", article.id], next);
      onUpdated?.(next);
      toast.success(
        next.isCommentsEnabled ? "Comments enabled." : "Comments disabled.",
      );
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : "Couldn't toggle comments.",
      );
    },
  });

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="font-sans text-[13px] font-semibold text-ink">
          Comments
        </p>
        <p className="font-hand text-[10px] text-muted">
          {article.isCommentsEnabled
            ? "Readers can comment on this article."
            : "Comments are disabled on this article."}
        </p>
      </div>
      <Btn
        type="button"
        variant={article.isCommentsEnabled ? "default" : "primary"}
        size="sm"
        onClick={() => mutation.mutate()}
        disabled={mutation.isPending}
      >
        {mutation.isPending
          ? "…"
          : article.isCommentsEnabled
            ? "Disable"
            : "Enable"}
      </Btn>
    </div>
  );
}
