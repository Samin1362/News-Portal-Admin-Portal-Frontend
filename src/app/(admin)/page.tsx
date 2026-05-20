"use client";

import { Pill } from "@/components/primitives/Pill";
import { useAdminAuth } from "@/lib/auth/AdminAuthProvider";
import { KpiGrid } from "@/components/overview/KpiGrid";
import { RecentSignups } from "@/components/overview/RecentSignups";
import { ModerationPreview } from "@/components/overview/ModerationPreview";
import { QuickActions } from "@/components/overview/QuickActions";
import { TrafficArea } from "@/components/insights/TrafficArea";
import { ByCategoryBars } from "@/components/insights/ByCategoryBars";
import { AuditFeed } from "@/components/insights/AuditFeed";
import { SystemHealth } from "@/components/insights/SystemHealth";

export default function OverviewPage() {
  const { profile } = useAdminAuth();
  const firstName = profile?.displayName?.split(" ")[0] ?? "there";

  return (
    <>
      <section className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="font-hand text-[12px] uppercase tracking-wider text-muted">
            Newsroom overview
          </p>
          <h1 className="serif text-[34px] sm:text-[40px] font-extrabold tracking-tight leading-none mt-1">
            Good day, <span className="uline">{firstName}</span>.
          </h1>
          <p className="mt-2 font-hand text-[12px] text-muted">
            Live data — refreshed every 30s.
          </p>
        </div>
        <Pill tone="accent-2" live>
          System OK
        </Pill>
      </section>

      <KpiGrid />

      {/*
        All grid templates use `minmax(0, 1fr)` instead of bare `1fr` —
        the default `1fr` is shorthand for `minmax(auto, 1fr)`, which
        lets a column grow past its share when its child can't shrink.
        That was the source of the "Recent sign-ups taking more width"
        bug on the overview page.

        The 3-card row (Recent sign-ups / Audit feed / Moderation) only
        switches to 3-across at xl (≥1280px) — below that the cards are
        too dense (each card has avatars + multiple pills + buttons).
      */}
      <section className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <TrafficArea />
        <ByCategoryBars />
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]">
        <RecentSignups />
        <AuditFeed />
        <ModerationPreview />
      </section>

      <section className="grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <SystemHealth />
        <QuickActions />
      </section>
    </>
  );
}
