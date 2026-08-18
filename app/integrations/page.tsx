import { PageStub } from "@/components/layout/page-stub";

export default function Page() {
  return (
    <PageStub
      title="Integrations"
      description="Enterprise tool connections."
      bullets={[
        "GitHub, Jira, Slack, Email, MCP, DB, CI/CD",
        "Connection status, last sync, permissions",
      ]}
    />
  );
}
