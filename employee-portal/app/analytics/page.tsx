import { PageStub } from "@shared/components/layout/page-stub";

export default function AnalyticsPage() {
  return (
    <PageStub
      title="Analytics &amp; Productivity"
      description="Twin utilization metrics, time saved, and agentic task benchmarks."
      bullets={[
        "Total hours saved by AI Digital Twin automation",
        "Agent success rate and verification confidence trends",
        "SLM vs LLM cost & token efficiency breakdowns",
        "Average turnaround time per task category",
      ]}
    />
  );
}
