import { PhasePlaceholder } from "@/components/overview/PhasePlaceholder";

export default function AnalyticsPage() {
  return (
    <PhasePlaceholder
      title="Analytics"
      phase="Phase 8"
      description="14 / 30 / 90 day traffic area, top 10 articles by views + comments, new sign-ups by day. Derived from cached counters until a dedicated analytics endpoint exists."
    />
  );
}
