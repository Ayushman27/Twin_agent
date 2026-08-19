"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import "reactflow/dist/style.css";
import { useAgentNetwork } from "../hooks/use-agent-network";
import { AgentNode } from "@/components/agents/agent-node";
import { LoadingState } from "@shared/components/status/loading-state";

const ReactFlow = dynamic(() => import("reactflow").then((m) => m.default), { ssr: false });

const nodeTypes = { agent: AgentNode };

export function AgentNetworkGraph() {
  const { data: agents, isLoading } = useAgentNetwork();

  const { nodes, edges } = useMemo(() => {
    if (!agents) return { nodes: [], edges: [] };
    const nodes = agents.map((a, i) => ({
      id: a.id,
      type: "agent",
      data: a,
      position: { x: (i % 3) * 220, y: Math.floor(i / 3) * 140 },
    }));
    const edges = agents
      .filter((a) => a.parentAgentId)
      .map((a) => ({ id: `${a.parentAgentId}-${a.id}`, source: a.parentAgentId!, target: a.id }));
    return { nodes, edges };
  }, [agents]);

  if (isLoading) return <LoadingState label="Loading agent network..." />;

  return (
    <div className="h-[480px] rounded-lg border border-border">
      <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} fitView />
    </div>
  );
}
