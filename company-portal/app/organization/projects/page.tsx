import { PageStub } from "@shared/components/layout/page-stub";

export default function ProjectsPage() {
  return (
    <PageStub
      title="Projects"
      description="Company project portfolios and agentic delivery tracks."
      bullets={[
        "Active projects overview with progress and risk levels",
        "Assigned squads and dedicated agent instances",
        "GitHub repository & Jira issue tracker bindings",
        "Automated milestone health checks & blocker detection",
      ]}
    />
  );
}
