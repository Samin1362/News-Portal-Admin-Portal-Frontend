"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Zap, Star, Flame } from "lucide-react";
import { patchFlags, type FlagsBody } from "@/lib/api/articles.api";
import { useAdminAuth } from "@/lib/auth/AdminAuthProvider";
import { useToast } from "@/lib/ui/toast";
import type { ArticleCardDTO, ArticleFullDTO } from "@/lib/types/article";
import { cn } from "@/lib/utils/cn";

interface Props {
  /** Subset of fields needed — works with both ArticleCardDTO and ArticleFullDTO. */
  article: Pick<
    ArticleCardDTO,
    "id" | "isBreaking" | "isFeatured" | "isTrending"
  >;
  /** Compact variant used inside row overflow popovers. */
  size?: "default" | "compact";
}

interface Flag {
  key: "isBreaking" | "isFeatured" | "isTrending";
  label: string;
  Icon: typeof Zap;
}

const FLAGS: Flag[] = [
  { key: "isBreaking", label: "Breaking", Icon: Zap },
  { key: "isFeatured", label: "Featured", Icon: Star },
  { key: "isTrending", label: "Trending", Icon: Flame },
];

/**
 * Three pill-toggles wired to PATCH /articles/:id/flags. Optimistic — the
 * mutation only sends the changed key. On error, the toast surfaces the
 * message and TanStack rolls the cache back via setQueryData.
 */
export function FlagsToggleGroup({ article, size = "default" }: Props) {
  const { getIdToken } = useAdminAuth();
  const toast = useToast();
  const qc = useQueryClient();
  const [pendingKey, setPendingKey] = useState<Flag["key"] | null>(null);

  const mutation = useMutation({
    mutationFn: async (body: FlagsBody) => {
      const token = await getIdToken();
      if (!token) throw new Error("Not signed in.");
      return patchFlags(article.id, body, token);
    },
    onSuccess: (updated) => {
      qc.setQueryData<ArticleFullDTO>(["article", article.id], (prev) =>
        prev ? { ...prev, ...updated } : updated,
      );
      qc.invalidateQueries({ queryKey: ["articles"] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Couldn't update flag.");
    },
    onSettled: () => setPendingKey(null),
  });

  const onToggle = (flag: Flag) => {
    const current = article[flag.key];
    setPendingKey(flag.key);
    mutation.mutate({ [flag.key]: !current } as FlagsBody);
  };

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5")}>
      {FLAGS.map((flag) => {
        const active = article[flag.key];
        const busy = pendingKey === flag.key;
        const Icon = flag.Icon;
        return (
          <button
            key={flag.key}
            type="button"
            onClick={() => onToggle(flag)}
            disabled={busy}
            aria-pressed={active}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border-[1.5px] transition-colors",
              "font-hand uppercase tracking-wider",
              size === "compact"
                ? "px-2 py-0.5 text-[10px]"
                : "px-2.5 py-1 text-[11px]",
              active
                ? "bg-ink text-paper border-ink"
                : "bg-paper text-ink border-ink/40 hover:border-ink",
              busy && "opacity-60 cursor-wait",
            )}
          >
            <Icon size={size === "compact" ? 10 : 12} aria-hidden />
            {flag.label}
          </button>
        );
      })}
    </div>
  );
}
