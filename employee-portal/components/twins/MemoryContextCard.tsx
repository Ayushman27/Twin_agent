"use client";

import { HumanAgentProfile } from "@/features/twins/mock/humanAgent";
import { Database, Brain, Sparkles, Clock, History } from "lucide-react";

export function MemoryContextCard({ memoryContext }: { memoryContext: HumanAgentProfile["memoryContext"] }) {
  return (
    <div className="dark-glass rounded p-grid_unit flex flex-col h-full border border-border-tech">
      <div className="font-label-caps text-xs text-primary-container border-b border-border-tech pb-2 mb-4 flex justify-between items-center">
        <span>MEMORY &amp; RECENT WORK CONTEXT</span>
        <span className="font-code-sm text-[10px] text-primary-container font-semibold">RAG Vector Stream Active</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
        {/* Recent Work Ingestion */}
        <div className="p-3 bg-surface-container-high border border-border-tech rounded flex flex-col gap-2">
          <div className="flex items-center gap-2 font-code-sm text-xs font-semibold text-on-surface border-b border-border-tech pb-1.5">
            <Brain size={14} className="text-primary-container" />
            <span>Recent Work Ingestion</span>
          </div>
          <ul className="space-y-1.5 font-code-sm text-xs text-on-surface-variant flex-1">
            {memoryContext.recentWork.map((item, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-primary-container">›</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Learned Preferences & Behavior */}
        <div className="p-3 bg-surface-container-high border border-border-tech rounded flex flex-col gap-2">
          <div className="flex items-center gap-2 font-code-sm text-xs font-semibold text-on-surface border-b border-border-tech pb-1.5">
            <Sparkles size={14} className="text-primary-container" />
            <span>Learned Preferences &amp; Behavior</span>
          </div>
          <ul className="space-y-1.5 font-code-sm text-xs text-on-surface-variant flex-1">
            {memoryContext.importantPreferences.map((item, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-primary-container">›</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
