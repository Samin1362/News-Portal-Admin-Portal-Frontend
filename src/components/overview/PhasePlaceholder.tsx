import { Card, CardHead, CardTitle, CardMeta } from "@/components/primitives/Card";

interface Props {
  title: string;
  phase: string;
  description: string;
}

/**
 * Lightweight placeholder for routes whose implementation lands in a
 * later phase. Keeps the sidebar navigation honest while we build out
 * the shell in Phase 1.
 */
export function PhasePlaceholder({ title, phase, description }: Props) {
  return (
    <Card>
      <CardHead>
        <CardTitle>{title}</CardTitle>
        <CardMeta>{phase}</CardMeta>
      </CardHead>
      <p className="font-sans text-[14px] text-ink/80 max-w-[640px] leading-relaxed">
        {description}
      </p>
      <p className="mt-4 font-hand text-[11px] text-muted">
        Tracked in <code className="font-mono text-[11px]">admin_portal_plan.md</code>.
      </p>
    </Card>
  );
}
