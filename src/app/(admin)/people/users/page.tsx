import { PhasePlaceholder } from "@/components/overview/PhasePlaceholder";

export default function UsersPage() {
  return (
    <PhasePlaceholder
      title="Users"
      phase="Phase 3"
      description="Filterable user list (reader / journalist / editor / admin), search by name or email, manage roles + block toggles, soft-delete. Detail page surfaces activity + danger zone."
    />
  );
}
