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

      <section className="grid lg:grid-cols-[2fr_1fr] gap-4">
        <TrafficArea />
        <ByCategoryBars />
      </section>

      <section className="grid md:grid-cols-3 gap-4">
        <RecentSignups />
        <AuditFeed />
        <ModerationPreview />
      </section>

      <section className="grid md:grid-cols-[2fr_1fr] gap-4">
        <SystemHealth />
        <QuickActions />
      </section>
    </>
  );
}
