"use client";

import { AgenticTaskRunner } from "@/components/tasks/agentic-task-runner";
import { CheckSquare } from "lucide-react";

export default function TasksPage() {
  return (
    <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto h-full overflow-y-auto animate-fade-in-up">
      {/* ── Page Header ── */}
      <div className="flex items-center justify-between border-b border-border-tech pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded bg-surface-container-high border border-border-tech text-[#00ff41]">
            <CheckSquare size={22} />
          </div>
          <div>
            <span className="font-label-caps text-[10px] text-on-surface-variant block">WORKSPACE EXECUTION</span>
            <h1 className="font-headline-lg text-2xl font-bold text-on-surface tracking-tight">
              Tasks &amp; Agentic Work Queue
            </h1>
          </div>
        </div>
        <div className="font-mono text-xs text-on-surface-variant hidden sm:flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#00ff41] animate-pulse" />
          <span>SWARM_STATUS: READY</span>
        </div>
      </div>

      {/* ── Main Agentic Task Runner Console ── */}
      <AgenticTaskRunner />
    </div>
  );
}
