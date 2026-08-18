import { PageStub } from "@/components/layout/page-stub";

export default function Page() {
  return (
    <PageStub
      title="Work Twin"
      description="Current work context."
      bullets={[
        "Current project / task / deadlines",
        "Blockers & dependencies",
        "GitHub / Jira / agent activity",
      ]}
    />
  );
}
