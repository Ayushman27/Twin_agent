import { PageHeader } from "@/components/layout/page-header";
import { AgentNetworkGraph } from "@/features/agents";

export default function AgentNetworkPage() {
  return (
    <div>
      <PageHeader title="Agent Network" description="Live topology of orchestrator and subordinate agents." />
      <AgentNetworkGraph />
    </div>
  );
}
