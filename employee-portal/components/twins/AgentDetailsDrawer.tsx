"use client";

import { CapabilityAgent } from "@/features/twins/mock/roleAgents";
import { X, Check, Bot, Activity, ShieldCheck, Wrench, FileText, ArrowRight } from "lucide-react";

interface AgentDetailsDrawerProps {
  agent: CapabilityAgent | null;
  onClose: () => void;
}

export function AgentDetailsDrawer({ agent, onClose }: AgentDetailsDrawerProps) {
  if (!agent) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-xs flex justify-end animate-fade-in">
      <div
        className="w-full max-w-md h-full bg-surface border-l border-border-tech p-6 flex flex-col justify-between overflow-y-auto shadow-2xl relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Background Grid */}
        <div className="absolute inset-0 bg-[radial-gradient(#00ff41_1px,transparent_1px)] [background-size:24px_24px] opacity-5 pointer-events-none" />

        <div className="relative z-10 flex flex-col gap-6">
          {/* Header & Close */}
          <div className="flex items-center justify-between border-b border-border-tech pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded bg-surface-container-high border border-border-tech text-primary-container">
                <span className="material-symbols-outlined text-[24px] leading-none">{agent.icon}</span>
              </div>
              <div>
                <span className="font-label-caps text-[10px] text-primary-container font-bold px-2 py-0.5 rounded bg-primary-container/10 border border-primary-container/20">
                  {agent.type.toUpperCase()} CAPABILITY AGENT
                </span>
                <h3 className="font-headline-lg text-lg font-bold text-on-surface mt-0.5">{agent.name}</h3>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Status & Capability Badges */}
          <div className="flex items-center justify-between p-3 bg-surface-container-high border border-border-tech rounded font-code-sm text-xs">
            <div className="flex items-center gap-2">
              <span className="font-label-caps text-on-surface-variant text-[10px]">STATUS:</span>
              <span className="flex items-center gap-1.5 font-bold text-primary-container">
                <span className="w-2 h-2 rounded-full bg-primary-container pulse-green" />
                {agent.status}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-on-surface-variant">
              <ShieldCheck size={14} className="text-primary-container" />
              <span>{agent.capability}</span>
            </div>
          </div>

          {/* Description */}
          <div>
            <span className="font-label-caps text-[10px] text-on-surface-variant block mb-1">DESCRIPTION</span>
            <p className="font-code-sm text-xs text-on-surface leading-relaxed p-3 bg-surface-layer border border-border-tech rounded">
              {agent.description}
            </p>
          </div>

          {/* Responsibilities */}
          <div>
            <span className="font-label-caps text-[10px] text-on-surface-variant block mb-2">RESPONSIBILITIES</span>
            <ul className="space-y-2 font-code-sm text-xs text-on-surface-variant">
              {agent.responsibilities.map((resp, i) => (
                <li key={i} className="flex items-start gap-2.5 p-2 bg-surface-container-high border border-border-tech rounded">
                  <Check size={14} className="text-primary-container shrink-0 mt-0.5" />
                  <span className="text-on-surface">{resp}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Connected Tools */}
          <div>
            <span className="font-label-caps text-[10px] text-on-surface-variant block mb-2">CONNECTED TOOLS</span>
            <div className="flex flex-wrap gap-2">
              {agent.connectedTools.map((tool) => (
                <span
                  key={tool}
                  className="px-3 py-1.5 bg-surface-container-high border border-border-tech font-code-sm text-xs text-on-surface rounded flex items-center gap-1.5"
                >
                  <Wrench size={12} className="text-primary-container" />
                  {tool}
                </span>
              ))}
            </div>
          </div>

          {/* Current Activity */}
          <div>
            <span className="font-label-caps text-[10px] text-on-surface-variant block mb-1">CURRENT ACTIVITY</span>
            <div className="p-3 bg-surface-container-lowest border border-border-tech rounded font-code-sm text-xs text-primary-fixed-dim flex items-center gap-2">
              <Activity size={14} className="text-primary-container shrink-0 animate-pulse" />
              <span>{agent.currentActivity || "No active execution"}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="relative z-10 pt-4 border-t border-border-tech flex gap-3 mt-6">
          <button
            onClick={() => alert(`Viewing details for ${agent.name} (Mock Action)`)}
            className="flex-1 py-2.5 bg-primary-container text-on-primary font-label-caps text-xs font-bold rounded hover:bg-primary-fixed transition-colors flex items-center justify-center gap-1.5"
          >
            <FileText size={14} /> View Details
          </button>
          <button
            onClick={() => alert(`Viewing live activity log for ${agent.name} (Mock Action)`)}
            className="flex-1 py-2.5 bg-transparent border border-border-tech text-on-surface font-label-caps text-xs font-bold hover:border-primary-container transition-colors flex items-center justify-center gap-1.5"
          >
            <Activity size={14} /> Activity Log
          </button>
        </div>
      </div>
    </div>
  );
}
