"use client";

import { RoleAgentNetwork } from "@/features/twins/mock/roleAgents";
import { Cpu, Activity, CheckCircle, TrendingUp } from "lucide-react";

export function AgentMetrics({ metrics }: { metrics: RoleAgentNetwork["metrics"] }) {
  const cards = [
    { label: "TOTAL AGENTS", value: metrics.totalAgents, sub: "Role Capability Pool", icon: Cpu },
    { label: "ACTIVE AGENTS", value: metrics.activeAgents, sub: "Currently Executing", icon: Activity, highlight: true },
    { label: "TASKS ASSISTED", value: metrics.tasksAssisted, sub: "Lifetime Assisted", icon: CheckCircle },
    { label: "SUCCESS RATE", value: `${metrics.successRate}%`, sub: "Execution Confidence", icon: TrendingUp },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {cards.map(({ label, value, sub, icon: Icon, highlight }) => (
        <div
          key={label}
          className={`p-3.5 rounded-lg border flex flex-col justify-between transition-all ${
            highlight
              ? "bg-surface-container-low border-primary-container shadow-[0_0_10px_rgba(0,255,65,0.1)]"
              : "bg-surface-container-high border-border-tech"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="font-label-caps text-[10px] text-on-surface-variant">{label}</span>
            <Icon size={16} className={highlight ? "text-primary-container" : "text-on-surface-variant"} />
          </div>
          <div>
            <span className={`font-display-xl text-2xl font-bold ${highlight ? "text-primary-container" : "text-on-surface"}`}>
              {value}
            </span>
            <span className="font-code-sm text-[10px] text-on-surface-variant block mt-0.5">{sub}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
