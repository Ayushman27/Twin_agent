"use client";

import { useState } from "react";
import { CapabilityAgent } from "@/features/twins/mock/roleAgents";
import { Cpu, Layers, ArrowDown } from "lucide-react";

export function AgentNetworkVisualization({ agents }: { agents: CapabilityAgent[] }) {
  const [hoveredAgent, setHoveredAgent] = useState<string | null>(null);

  // Group top capability categories
  const categories = [
    { title: "Planning & Mgmt", ids: ["agent-planning", "agent-task-mgmt"] },
    { title: "Development & Quality", ids: ["agent-coding", "agent-review", "agent-debugging", "agent-testing"] },
    { title: "Knowledge & Comms", ids: ["agent-research", "agent-docs", "agent-comm"] },
  ];

  return (
    <div className="dark-glass rounded p-grid_unit border border-border-tech flex flex-col gap-4 relative overflow-hidden">
      {/* Background Grid */}
      <div className="absolute inset-0 bg-[radial-gradient(#00ff41_1px,transparent_1px)] [background-size:24px_24px] opacity-5 pointer-events-none" />

      <div className="font-label-caps text-xs text-primary-container border-b border-border-tech pb-2 flex justify-between items-center relative z-10">
        <span>ROLE CAPABILITY AGENT NETWORK VISUALIZATION</span>
        <span className="font-code-sm text-[10px] text-on-surface-variant">Live Architecture Map</span>
      </div>

      <div className="relative z-10 flex flex-col items-center gap-6 py-2">
        {/* Root Node: Role Agent */}
        <div className="p-3 px-6 rounded-lg bg-surface-container-low border-2 border-primary-container text-center shadow-[0_0_15px_rgba(0,255,65,0.15)] max-w-xs w-full">
          <span className="font-label-caps text-[9px] text-primary-container font-bold px-2 py-0.5 rounded bg-primary-container/10 border border-primary-container/20">
            ROLE AGENT PARENT
          </span>
          <h4 className="font-headline-lg text-sm font-bold text-on-surface mt-1 flex items-center justify-center gap-2">
            <Cpu size={16} className="text-primary-container" /> Software Engineer
          </h4>
        </div>

        {/* SVG Connector Lines */}
        <div className="w-full flex justify-center">
          <svg className="w-full max-w-2xl h-10" viewBox="0 0 400 40">
            <line x1="200" y1="0" x2="200" y2="15" stroke="#00FF41" strokeWidth="1.5" strokeDasharray="3 3" className="animate-pulse" />
            <line x1="60" y1="15" x2="340" y2="15" stroke="#1A1A1A" strokeWidth="1.5" />
            <line x1="60" y1="15" x2="60" y2="40" stroke="#00FF41" strokeWidth="1" strokeDasharray="3 3" />
            <line x1="200" y1="15" x2="200" y2="40" stroke="#00FF41" strokeWidth="1" strokeDasharray="3 3" />
            <line x1="340" y1="15" x2="340" y2="40" stroke="#00FF41" strokeWidth="1" strokeDasharray="3 3" />
          </svg>
        </div>

        {/* Categories Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
          {categories.map((cat) => (
            <div key={cat.title} className="p-3 bg-surface-container-high border border-border-tech rounded flex flex-col gap-2">
              <span className="font-label-caps text-[10px] text-on-surface-variant border-b border-border-tech pb-1">
                {cat.title}
              </span>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {cat.ids.map((id) => {
                  const agent = agents.find((a) => a.id === id);
                  if (!agent) return null;
                  const isHovered = hoveredAgent === id;

                  return (
                    <div
                      key={id}
                      onMouseEnter={() => setHoveredAgent(id)}
                      onMouseLeave={() => setHoveredAgent(null)}
                      className={`px-2.5 py-1.5 rounded border font-code-sm text-xs transition-all cursor-pointer flex items-center gap-1.5 ${
                        isHovered
                          ? "border-primary-container bg-primary-container/15 text-primary-fixed-dim"
                          : agent.status === "Active"
                          ? "border-primary-container/40 bg-surface-layer text-on-surface"
                          : "border-border-tech bg-surface-layer text-on-surface-variant"
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        agent.status === "Active" || agent.status === "Ready"
                          ? "bg-primary-container"
                          : "bg-border-tech"
                      }`} />
                      <span>{agent.name}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
