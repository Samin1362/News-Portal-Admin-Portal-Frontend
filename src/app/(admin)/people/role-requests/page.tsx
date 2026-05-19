import { PhasePlaceholder } from "@/components/overview/PhasePlaceholder";

export default function RoleRequestsPage() {
  return (
    <PhasePlaceholder
      title="Role requests"
      phase="Phase 3 · depends on §0a backend"
      description="Inbox for reader→journalist applications. Each row links to a detail drawer with submitted info + email-verification status + approve / reject actions. Approving fires the role-approved email; rejection requires a reason that is sent verbatim."
    />
  );
}
