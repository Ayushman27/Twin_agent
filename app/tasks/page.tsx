import { PageStub } from "@/components/layout/page-stub";

export default function Page() {
  return (
    <PageStub
      title="Tasks"
      description="Task list, kanban, filters."
      bullets={[
        "List / Kanban views",
        "Status: NEW..COMPLETED/FAILED",
        "Task detail: plan, subtasks, evidence, approvals",
      ]}
    />
  );
}
