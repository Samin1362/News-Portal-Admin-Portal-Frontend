"use client";

import { useEffect } from "react";
import Link from "next/link";
import { use } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ExternalLink } from "lucide-react";
import {
  Card,
  CardHead,
  CardMeta,
  CardTitle,
} from "@/components/primitives/Card";
import { useAdminAuth } from "@/lib/auth/AdminAuthProvider";
import { getArticle } from "@/lib/api/articles.api";
import type { ArticleFullDTO } from "@/lib/types/article";
import { StatusPill } from "@/components/articles/StatusPill";
import { RejectionBanner } from "@/components/articles/RejectionBanner";
import { ArticleForm } from "@/components/articles/ArticleForm";
import { HistoryTimeline } from "@/components/articles/HistoryTimeline";
import { FlagsToggleGroup } from "@/components/articles/FlagsToggleGroup";
import { WorkflowActions } from "@/components/articles/WorkflowActions";
import { ScheduleControl } from "@/components/articles/ScheduleControl";
import { CommentsToggle } from "@/components/articles/CommentsToggle";
import { DangerZone } from "@/components/articles/DangerZone";

interface Props {
  params: Promise<{ id: string }>;
}

/**
 * Admin override editor. The page owns the data fetch + right rail; the
 * editor body itself is the shared <ArticleForm>. Workflow + flags + schedule
 * + comments toggle + danger zone all live on the right rail.
 */
export default function OverrideEditorPage({ params }: Props) {
  const { id } = use(params);
  const { getIdToken, role } = useAdminAuth();
  const qc = useQueryClient();
  const enabled = role === "admin";

  const articleQ = useQuery({
    enabled,
    queryKey: ["article", id],
    queryFn: async (): Promise<ArticleFullDTO | null> => {
      const token = await getIdToken();
      if (!token) return null;
      return getArticle(id, token);
    },
    staleTime: 30_000,
  });

  // Keep the broader articles + queue lists in sync when an admin edits.
  useEffect(() => {
    if (!articleQ.data) return;
    qc.invalidateQueries({ queryKey: ["articles"] });
    qc.invalidateQueries({ queryKey: ["queue"] });
  }, [articleQ.data?.updatedAt, qc, articleQ.data]);

  if (!enabled) {
    return (
      <Card>
        <p className="font-hand text-[12px] text-muted">
          Admin role required.
        </p>
      </Card>
    );
  }
  if (articleQ.isPending) {
    return <Skeleton />;
  }
  if (articleQ.isError) {
    return (
      <Card>
        <p className="font-hand text-[12px] text-accent">
          Couldn&apos;t load the article — {articleQ.error?.message ?? "try again"}.
        </p>
      </Card>
    );
  }
  if (!articleQ.data) {
    return (
      <Card>
        <p className="font-hand text-[13px] text-ink">
          That article doesn&apos;t exist or has been deleted.
        </p>
      </Card>
    );
  }

  const article = articleQ.data;

  return (
    <>
      <section className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="font-hand text-[12px] uppercase tracking-wider text-muted">
            Content · override editor
          </p>
          <h1 className="serif text-[26px] sm:text-[30px] font-extrabold tracking-tight leading-tight mt-1 max-w-[640px]">
            {article.headline}
          </h1>
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            <StatusPill status={article.status} />
            <span className="font-hand text-[11px] text-muted">
              /{article.slug}
            </span>
            {article.status === "published" ? (
              <a
                href={`/articles/${article.slug}`}
                target="_blank"
                rel="noreferrer"
                className="font-hand text-[11px] text-accent inline-flex items-center gap-1"
              >
                View live <ExternalLink size={11} aria-hidden />
              </a>
            ) : null}
          </div>
        </div>
      </section>

      <div className="border-[1.5px] border-warn rounded-sm bg-paper p-3 flex items-start gap-2">
        <AlertTriangle
          size={14}
          className="text-[color:var(--color-warn)] shrink-0 mt-0.5"
          aria-hidden
        />
        <p className="font-sans text-[13px] text-ink/85">
          Editing as admin — the author will be notified after publish.
          Status, flags, schedule, comments and delete live in the right rail.
        </p>
      </div>

      {article.status === "rejected" ? (
        <RejectionBanner
          rejectionReason={article.rejectionReason}
          history={article.history}
        />
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6 items-start">
        <div className="min-w-0">
          <ArticleForm
            article={article}
            onUpdated={(next) => {
              qc.setQueryData(["article", id], next);
            }}
          />
        </div>

        <aside className="space-y-4 lg:sticky lg:top-4">
          <Card>
            <CardHead>
              <CardTitle>Workflow</CardTitle>
              <CardMeta>
                <StatusPill status={article.status} />
              </CardMeta>
            </CardHead>
            <WorkflowActions
              article={article}
              onUpdated={(next) => qc.setQueryData(["article", id], next)}
              variant="edit"
            />
          </Card>

          <Card>
            <CardHead>
              <CardTitle>Flags</CardTitle>
            </CardHead>
            <FlagsToggleGroup article={article} />
          </Card>

          {article.status === "approved" ||
          article.status === "published" ? (
            <Card>
              <CardHead>
                <CardTitle>Schedule</CardTitle>
              </CardHead>
              <ScheduleControl
                article={article}
                onUpdated={(next) => qc.setQueryData(["article", id], next)}
              />
            </Card>
          ) : null}

          <Card>
            <CardHead>
              <CardTitle>Comments</CardTitle>
            </CardHead>
            <CommentsToggle
              article={article}
              onUpdated={(next) => qc.setQueryData(["article", id], next)}
            />
          </Card>

          <HistoryTimeline history={article.history} />

          <Card className="border-accent">
            <CardHead>
              <CardTitle className="text-accent">Danger zone</CardTitle>
            </CardHead>
            <DangerZone article={article} />
          </Card>

          <Link
            href="/content/articles"
            className="block text-center font-hand text-[12px] text-muted hover:text-accent"
          >
            ← Back to all articles
          </Link>
        </aside>
      </div>
    </>
  );
}

function Skeleton() {
  return (
    <div className="space-y-4">
      <Card>
        <CardHead>
          <CardTitle>Loading override editor</CardTitle>
        </CardHead>
        <div className="h-[460px] bg-paper-2 rounded-sm animate-pulse" />
      </Card>
    </div>
  );
}
