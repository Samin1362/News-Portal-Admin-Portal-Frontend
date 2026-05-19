import { PhasePlaceholder } from "@/components/overview/PhasePlaceholder";

export default function QueuePage() {
  return (
    <PhasePlaceholder
      title="Editorial queue"
      phase="Phase 4"
      description="Editor-style queue with extra admin powers — Force publish, Take over (sets reviewerId = adminUserId), and the full 7-step workflow transitions."
    />
  );
}
