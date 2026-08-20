"use client";

import { HumanAgentProfile } from "@/features/twins/mock/humanAgent";
import { Link2, ShieldCheck, CheckCircle2 } from "lucide-react";

export function ToolsAccessCard({ tools }: { tools: HumanAgentProfile["tools"] }) {
  return (
    <div className="dark-glass rounded p-grid_unit flex flex-col h-full border border-border-tech">
      <div className="font-label-caps text-xs text-primary-container border-b border-border-tech pb-2 mb-4 flex justify-between items-center">
        <span>CONNECTED TOOLS &amp; ACCESS PERMISSIONS</span>
        <span className="font-code-sm text-[10px] text-primary-container font-semibold">
          {tools.filter((t) => t.connected).length}/{tools.length} Connected
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 flex-1">
        {tools.map((tool) => (
          <div
            key={tool.id}
            className="p-3 bg-surface-container-high border border-border-tech rounded flex items-center justify-between gap-3 hover:border-primary-container/40 transition-colors"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-1.5 rounded bg-surface-layer text-primary-container shrink-0">
                <span className="material-symbols-outlined text-[18px] leading-none">{tool.icon}</span>
              </div>
              <div className="truncate">
                <span className="font-code-sm text-xs font-semibold text-on-surface block truncate">{tool.name}</span>
                <span className="font-label-caps text-[9px] text-on-surface-variant block">{tool.accessLevel}</span>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0 font-label-caps text-[10px] text-primary-container">
              <span className="w-1.5 h-1.5 rounded-full bg-primary-container" />
              <span>Connected</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
