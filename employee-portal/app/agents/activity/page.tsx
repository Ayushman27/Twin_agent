import { PageStub } from "@shared/components/layout/page-stub";

export default function AgentActivityPage() {
  return (
    <PageStub
      title="Agent Activity &amp; Logs"
      description="Real-time terminal logs, tool call traces, and agent execution events."
      bullets={[
        "Streaming live activity log feed",
        "Tool invocation traces (GitHub PR, Jira issue, DB query)",
        "Model routing metrics (SLM vs LLM split)",
        "Step-by-step verification and reason chain logs",
      ]}
    />
  );
}
