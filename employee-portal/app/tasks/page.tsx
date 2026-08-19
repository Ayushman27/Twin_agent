import { PageStub } from "@shared/components/layout/page-stub";

export default function TasksPage() {
  return (
    <PageStub
      title="Tasks &amp; Work Queue"
      description="Personal backlog and agentic task distribution."
      bullets={[
        "Interactive task board (New, Assigned, In Progress, Review, Completed)",
        "Assigned agent indicator & execution progress",
        "Verification checklist & automated test reports",
        "Create task with AI requirement breakdown",
      ]}
    />
  );
}
