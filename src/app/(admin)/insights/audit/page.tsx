import { PhasePlaceholder } from "@/components/overview/PhasePlaceholder";

export default function AuditPage() {
  return (
    <PhasePlaceholder
      title="Audit log"
      phase="Phase 8"
      description="Filterable, paginated activity feed synthesized from article history + cached mutations. Once the §0a email_log lands, role-change emails surface here too."
    />
  );
}
