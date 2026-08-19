import { PageStub } from "@shared/components/layout/page-stub";

export default function IntegrationsPage() {
  return (
    <PageStub
      title="Integrations &amp; Tools"
      description="Connect third-party developer tools and collaboration platforms."
      bullets={[
        "GitHub / GitLab code repository connections",
        "Jira / Linear issue tracking synchronization",
        "Slack / Microsoft Teams webhook listeners",
        "MCP (Model Context Protocol) server registry",
      ]}
    />
  );
}
