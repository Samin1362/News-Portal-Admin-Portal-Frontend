import { listAds } from "./ads.api";
import type { AdminAdDTO } from "@/lib/types/ad";

const PAGE_LIMIT = 100;
const MAX_PAGES = 5;

/**
 * Pulls up to MAX_PAGES * PAGE_LIMIT ads across all placements for the
 * /marketing/revenue roll-up. Backend has no aggregated stats endpoint, so
 * the page computes totals + leaders client-side from the list payload.
 */
export async function loadAllAds(token: string): Promise<AdminAdDTO[]> {
  const out: AdminAdDTO[] = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const res = await listAds({ page, limit: PAGE_LIMIT }, token);
    const batch = res.data ?? [];
    out.push(...batch);
    const total = res.meta?.total ?? out.length;
    if (out.length >= total) break;
    if (batch.length < PAGE_LIMIT) break;
  }
  return out;
}

export interface AdLeader {
  id: string;
  name: string;
  placement: AdminAdDTO["placement"];
  impressions: number;
  clicks: number;
  ctr: number;
}

export interface RevenueRollup {
  totalImpressions: number;
  totalClicks: number;
  averageCtr: number;
  activeCount: number;
  inactiveCount: number;
  topByClicks: AdLeader[];
  topByCtr: AdLeader[];
}

export function rollupAds(ads: AdminAdDTO[]): RevenueRollup {
  let totalImpressions = 0;
  let totalClicks = 0;
  let activeCount = 0;
  let inactiveCount = 0;
  const leaders: AdLeader[] = [];
  for (const ad of ads) {
    totalImpressions += ad.impressions;
    totalClicks += ad.clicks;
    if (ad.isActive) activeCount += 1;
    else inactiveCount += 1;
    leaders.push({
      id: ad.id,
      name: ad.name,
      placement: ad.placement,
      impressions: ad.impressions,
      clicks: ad.clicks,
      ctr: ad.impressions > 0 ? ad.clicks / ad.impressions : 0,
    });
  }
  const topByClicks = [...leaders]
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, 5);
  // Tie-breaker for CTR: require at least 1 impression so brand-new ads
  // with 0/0 don't poison the chart.
  const topByCtr = [...leaders]
    .filter((l) => l.impressions > 0)
    .sort((a, b) => b.ctr - a.ctr)
    .slice(0, 5);
  const averageCtr =
    totalImpressions > 0 ? totalClicks / totalImpressions : 0;
  return {
    totalImpressions,
    totalClicks,
    averageCtr,
    activeCount,
    inactiveCount,
    topByClicks,
    topByCtr,
  };
}

export function formatCtr(ratio: number): string {
  if (!Number.isFinite(ratio) || ratio === 0) return "—";
  return `${(ratio * 100).toFixed(2)}%`;
}
