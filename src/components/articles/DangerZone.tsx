"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { Btn } from "@/components/primitives/Btn";
import { Input } from "@/components/primitives/Input";
import { deleteArticle } from "@/lib/api/articles.api";
import { useAdminAuth } from "@/lib/auth/AdminAuthProvider";
import { useToast } from "@/lib/ui/toast";
import type { ArticleFullDTO } from "@/lib/types/article";

interface Props {
  article: ArticleFullDTO;
}

const CONFIRM_TOKEN = "delete";

/**
 * Soft-delete the article. Backend `softRemove` flips `isDeleted = true`
 * and appends a `soft_delete` history entry — the doc still exists in the
 * collection for audit purposes but disappears from every read.
 */
export function DangerZone({ article }: Props) {
  const router = useRouter();
  const { getIdToken } = useAdminAuth();
  const toast = useToast();
  const [confirm, setConfirm] = useState("");

  const mutation = useMutation({
    mutationFn: async () => {
      const token = await getIdToken();
      if (!token) throw new Error("Not signed in.");
      await deleteArticle(article.id, token);
    },
    onSuccess: () => {
      toast.success("Article deleted.");
      router.replace("/content/articles");
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Delete failed.");
    },
  });

  const canDelete = confirm === CONFIRM_TOKEN && !mutation.isPending;

  return (
    <div className="space-y-2">
      <p className="font-sans text-[12px] text-ink/85">
        Soft-deletes the article — it disappears from every public surface
        and admin list, but the doc is preserved in Mongo for audit.
      </p>
      <label className="block">
        <span className="font-hand text-[10px] uppercase tracking-wider text-muted">
          Type <code className="font-mono">{CONFIRM_TOKEN}</code> to confirm
        </span>
        <Input
          type="text"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder={CONFIRM_TOKEN}
        />
      </label>
      <Btn
        type="button"
        variant="primary"
        size="sm"
        onClick={() => mutation.mutate()}
        disabled={!canDelete}
      >
        {mutation.isPending ? "Deleting…" : "Delete article"}
      </Btn>
    </div>
  );
}
