import { PageStub } from "@shared/components/layout/page-stub";

export default function WorkTwinPage() {
  return (
    <PageStub
      title="Work Twin"
      description="Active work context, project sprint deadlines, blockers, and recent activity."
      bullets={[
        "Current project and active sprint targets",
        "Upcoming deliverables and task deadlines",
        "Detected dependency blockers and resolution workflows",
        "Recent cross-tool activity history (GitHub, Jira, Slack)",
      ]}
    />
  );
}
