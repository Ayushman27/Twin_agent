"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { useAgentNetwork } from "../hooks/use-agent-network";
import { AgentNode } from "@/components/agents/agent-node";
import { Bot, Cpu, ShieldCheck, Activity, Terminal, Layers } from "lucide-react";

const ReactFlow = dynamic(() => import("reactflow").then((m) => m.default), {
  ssr: false,
  loading: () => <FallbackTopologyGraph />,
});

const nodeTypes = { agent: AgentNode };

const MOCK_TOPOLOGY_AGENTS = [
  { id: "orchestrator-1", name: "Master Orchestrator", type: "orchestrator", status: "running", role: "Root Coordinator" },
  { id: "agent-code", name: "Code Execution Agent", type: "worker", status: "running", role: "DevOps & CI/CD" },
  { id: "agent-sec", name: "Security Audit Twin", type: "worker", status: "idle", role: "Compliance" },
  { id: "agent-data", name: "Data Pipeline Twin", type: "worker", status: "completed", role: "ETL Processing" },
  { id: "agent-rag", name: "Knowledge RAG Agent", type: "worker", status: "running", role: "Doc Indexing" },
];

function FallbackTopologyGraph() {
  const [selectedAgent, setSelectedAgent] = useState<string | null>("orchestrator-1");

  return (
    <div className="w-full min-h-[520px] rounded-lg border border-border-tech bg-surface-container-lowest p-6 relative overflow-hidden flex flex-col justify-between">
      {/* Background Accent Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#00ff410a_1px,transparent_1px),linear-gradient(to_bottom,#00ff410a_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

      {/* Header Info */}
      <div className="relative z-10 flex items-center justify-between border-b border-border-tech pb-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded bg-surface-container-high text-primary-container border border-border-tech">
            <Cpu size={20} />
          </div>
          <div>
            <h3 className="font-headline-lg text-sm font-bold text-on-surface">Agent Network Topology</h3>
            <p className="font-label-caps text-[11px] text-on-surface-variant">5 Active Execution Nodes Connected</p>
          </div>
        </div>
        <div className="flex items-center gap-2 font-label-caps text-xs text-primary-container bg-surface-container-low px-3 py-1.5 rounded border border-border-tech">
          <span className="w-2 h-2 rounded-full bg-primary-container pulse-green" />
          Topology Live
        </div>
      </div>

      {/* Visual Network Topology SVG Graph */}
      <div className="relative z-10 flex-1 grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
        {/* Central Master Node */}
        <div className="md:col-span-1 flex justify-center">
          <div 
            onClick={() => setSelectedAgent("orchestrator-1")}
            className={`w-full max-w-[240px] p-4 rounded-lg border transition-all cursor-pointer ${
              selectedAgent === "orchestrator-1"
                ? "border-primary-container bg-surface-container-low shadow-[0_0_15px_rgba(0,255,65,0.15)]"
                : "border-border-tech bg-surface-container-high hover:border-primary-container/50"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-label-caps text-[10px] text-primary-container font-bold px-2 py-0.5 rounded bg-primary-container/10 border border-primary-container/20">
                ORCHESTRATOR
              </span>
              <span className="w-2 h-2 rounded-full bg-primary-container animate-pulse" />
            </div>
            <h4 className="font-bold text-on-surface text-sm flex items-center gap-2">
              <Bot size={16} className="text-primary-container" /> Master Orchestrator
            </h4>
            <p className="font-label-caps text-[11px] text-on-surface-variant mt-1">Root Coordinator Node</p>
          </div>
        </div>

        {/* Subordinate Worker Nodes Grid */}
        <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {MOCK_TOPOLOGY_AGENTS.slice(1).map((agent) => (
            <div
              key={agent.id}
              onClick={() => setSelectedAgent(agent.id)}
              className={`p-3.5 rounded-lg border transition-all cursor-pointer ${
                selectedAgent === agent.id
                  ? "border-primary-container bg-surface-container-low shadow-[0_0_12px_rgba(0,255,65,0.15)]"
                  : "border-border-tech bg-surface-container-high hover:border-primary-container/40"
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-label-caps text-[9px] text-on-surface-variant uppercase tracking-wider">
                  {agent.role}
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-primary-container" />
              </div>
              <h5 className="font-semibold text-xs text-on-surface flex items-center gap-1.5">
                <Layers size={14} className="text-primary-container" /> {agent.name}
              </h5>
            </div>
          ))}
        </div>
      </div>

      {/* Footer Status Bar */}
      <div className="relative z-10 border-t border-border-tech pt-4 mt-6 flex items-center justify-between text-xs font-label-caps text-on-surface-variant">
        <span className="flex items-center gap-2">
          <Activity size={14} className="text-primary-container" /> Execution Latency: 14ms
        </span>
        <span className="flex items-center gap-2">
          <ShieldCheck size={14} className="text-primary-container" /> Protocol: gRPC / Agentic-v2
        </span>
      </div>
    </div>
  );
}

export function AgentNetworkGraph() {
  const { data: agents, isLoading } = useAgentNetwork();

  const { nodes, edges } = useMemo(() => {
    if (!agents || agents.length === 0) return { nodes: [], edges: [] };
    const nodes = agents.map((a, i) => ({
      id: a.id,
      type: "agent",
      data: a,
      position: { x: (i % 3) * 240 + 20, y: Math.floor(i / 3) * 160 + 20 },
    }));
    const edges = agents
      .filter((a) => a.parentAgentId)
      .map((a) => ({ id: `${a.parentAgentId}-${a.id}`, source: a.parentAgentId!, target: a.id }));
    return { nodes, edges };
  }, [agents]);

  if (isLoading) {
    return <FallbackTopologyGraph />;
  }

  if (!agents || agents.length === 0) {
    return <FallbackTopologyGraph />;
  }

  return (
    <div className="h-[520px] rounded-lg border border-border-tech bg-surface-container-lowest relative overflow-hidden">
      <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} fitView />
    </div>
  );
}
