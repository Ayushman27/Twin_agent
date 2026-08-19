import { PageStub } from "@shared/components/layout/page-stub";

export default function TeamsPage() {
  return (
    <PageStub
      title="Teams"
      description="Manage cross-functional squads and team departments."
      bullets={[
        "Team list with lead manager, headcount, and workload distribution",
        "Team-level AI agent mesh routing",
        "Department-level memory isolation and shared knowledge bases",
        "Performance score & project velocity tracking",
      ]}
    />
  );
}
