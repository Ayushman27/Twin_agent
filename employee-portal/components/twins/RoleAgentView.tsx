"use client";

import { useState } from "react";
import { mockRoleAgentNetwork, CapabilityAgent } from "@/features/twins/mock/roleAgents";
import { RoleOverview } from "./RoleOverview";
import { AgentMetrics } from "./AgentMetrics";
import { AgentNetworkVisualization } from "./AgentNetworkVisualization";
import { AgentCard } from "./AgentCard";
import { AgentDetailsDrawer } from "./AgentDetailsDrawer";
import { Cpu, Layers, Sparkles } from "lucide-react";

export function RoleAgentView() {
  const roleData = mockRoleAgentNetwork;
  const [selectedAgent, setSelectedAgent] = useState<CapabilityAgent | null>(null);

  return (
    <div className="flex flex-col gap-grid_unit animate-fade-in-up">
      {/* ── Header: Role Capability Network ── */}
      <div className="dark-glass rounded p-grid_unit border border-border-tech flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 rounded-lg border-2 border-primary-container bg-surface-container-high flex items-center justify-center font-display-xl text-primary-container shadow-[0_0_15px_rgba(0,255,65,0.2)]">
            <Cpu size={28} />
          </div>

          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="font-headline-lg text-2xl font-bold text-on-surface">
                {roleData.role} Role Agent
              </h2>
              <span className="font-label-caps text-[10px] px-2 py-0.5 rounded bg-primary-container/10 border border-primary-container/30 text-primary-container font-semibold">
                ROLE CAPABILITY SYSTEM
              </span>
            </div>
            <div className="font-code-sm text-xs text-on-surface-variant flex items-center gap-2">
              <span className="text-on-surface font-medium">{roleData.department} Department</span>
              <span>•</span>
              <span className="text-primary-container font-semibold">● {roleData.status} Role</span>
              <span>•</span>
              <span>{roleData.capabilityCount} Sub-Agents Registered</span>
            </div>
          </div>
        </div>

        {/* Dynamic Capability Count Pill */}
        <div className="bg-surface-container-low border border-border-tech px-4 py-3 rounded-lg flex items-center gap-3">
          <div className="flex flex-col items-end">
            <span className="font-label-caps text-[10px] text-on-surface-variant">CAPABILITY POOL</span>
            <span className="font-display-xl text-xl font-bold text-primary-container">
              {roleData.capabilityCount} Autonomous Agents
            </span>
          </div>
        </div>
      </div>

      {/* ── Role Dashboard Metrics ── */}
      <AgentMetrics metrics={roleData.metrics} />

      {/* ── Role Definition & Scope ── */}
      <RoleOverview overview={roleData.overview} />

      {/* ── Agent Network Topology Visualization ── */}
      <AgentNetworkVisualization agents={roleData.agents} />

      {/* ── 10 Capability Agents Grid Header ── */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between border-b border-border-tech pb-2">
          <div className="flex items-center gap-2">
            <Layers size={18} className="text-primary-container" />
            <h3 className="font-headline-lg text-lg font-bold text-on-surface">
              Software Engineer Capability Agents ({roleData.agents.length})
            </h3>
          </div>
          <span className="font-code-sm text-xs text-on-surface-variant">
            Click any agent tile to inspect capabilities &amp; tools
          </span>
        </div>

        {/* 10 Agent Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {roleData.agents.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              onClick={() => setSelectedAgent(agent)}
            />
          ))}
        </div>
      </div>

      {/* Slide-over Agent Details Drawer */}
      <AgentDetailsDrawer
        agent={selectedAgent}
        onClose={() => setSelectedAgent(null)}
      />
    </div>
  );
}
