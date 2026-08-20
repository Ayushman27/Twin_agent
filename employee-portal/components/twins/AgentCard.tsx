"use client";

import { CapabilityAgent } from "@/features/twins/mock/roleAgents";
import { ChevronRight } from "lucide-react";

const STATUS_CONFIG: Record<CapabilityAgent["status"], { bg: string; text: string; dot: string }> = {
  Ready: { bg: "bg-primary-container/10 border-primary-container/30", text: "text-primary-container", dot: "bg-primary-container" },
  Active: { bg: "bg-primary-container/20 border-primary-container/50", text: "text-primary-fixed-dim", dot: "bg-primary-container pulse-green" },
  Idle: { bg: "bg-surface-container-high border-border-tech", text: "text-on-surface-variant", dot: "bg-border-tech" },
  Waiting: { bg: "bg-amber-500/10 border-amber-500/30", text: "text-amber-400", dot: "bg-amber-400" },
  Disabled: { bg: "bg-surface-layer border-border-tech/40 opacity-60", text: "text-on-surface-variant/50", dot: "bg-gray-600" },
};

export function AgentCard({ agent, onClick }: { agent: CapabilityAgent; onClick: () => void }) {
  const statusStyle = STATUS_CONFIG[agent.status] || STATUS_CONFIG.Idle;

  return (
    <div
      onClick={onClick}
      className="dark-glass rounded p-4 border border-border-tech hover:border-primary-container/60 transition-all duration-200 cursor-pointer group flex flex-col justify-between h-full relative overflow-hidden"
    >
      <div>
        {/* Top Header: Icon + Status Pill */}
        <div className="flex items-center justify-between mb-3">
          <div className="p-2 rounded bg-surface-layer border border-border-tech text-primary-container group-hover:border-primary-container/40 transition-colors">
            <span className="material-symbols-outlined text-[20px] leading-none">{agent.icon}</span>
          </div>

          {/* Status Pill */}
          <span className={`font-label-caps text-[10px] font-bold px-2 py-0.5 rounded border flex items-center gap-1.5 ${statusStyle.bg} ${statusStyle.text}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`} />
            {agent.status}
          </span>
        </div>

        {/* Title & Purpose */}
        <h4 className="font-semibold text-sm text-on-surface group-hover:text-primary-fixed-dim transition-colors">
          {agent.name}
        </h4>
        <p className="font-code-sm text-xs text-on-surface-variant mt-1 line-clamp-2 leading-relaxed">
          {agent.purpose}
        </p>
      </div>

      {/* Footer info */}
      <div className="mt-4 pt-3 border-t border-border-tech flex items-center justify-between font-label-caps text-[10px] text-on-surface-variant">
        <span>Capability: {agent.capability}</span>
        <ChevronRight size={14} className="group-hover:translate-x-1 text-primary-container transition-transform" />
      </div>
    </div>
  );
}
