"use client";

import Link from "next/link";
import { User, Cpu, Sparkles } from "lucide-react";

interface TwinTabsProps {
  activeTab: "human" | "role";
}

export function TwinTabs({ activeTab }: TwinTabsProps) {
  return (
    <div className="flex flex-col gap-3 mb-6">
      {/* Top Banner Disclaimer */}
      <div className="bg-surface-container-low border border-border-tech rounded p-3 flex items-center justify-between font-code-sm text-xs text-on-surface-variant">
        <div className="flex items-center gap-2">
          <Sparkles size={14} className="text-primary-container shrink-0" />
          <span>
            <strong className="text-on-surface font-semibold">Digital Twin &amp; Capability Architecture:</strong> Managed by Organizational SLM Engine.
          </span>
        </div>
        <span className="hidden sm:inline font-label-caps text-[10px] text-primary-container px-2 py-0.5 rounded bg-primary-container/10 border border-primary-container/20">
          UI Mock Mode
        </span>
      </div>

      {/* Main Tab Bar */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Human Agent Tab */}
        <Link
          href="/twins/human"
          className={`p-4 rounded-lg border transition-all duration-200 cursor-pointer flex items-start gap-4 ${
            activeTab === "human"
              ? "border-primary-container bg-surface-container-low shadow-[0_0_15px_rgba(0,255,65,0.1)]"
              : "border-border-tech bg-surface-container-lowest hover:border-primary-container/40 hover:bg-surface-container-high"
          }`}
        >
          <div className={`p-2.5 rounded border shrink-0 ${
            activeTab === "human"
              ? "bg-primary-container/20 border-primary-container text-primary-container"
              : "bg-surface-layer border-border-tech text-on-surface-variant"
          }`}>
            <User size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-headline-lg text-base font-bold text-on-surface">HUMAN AGENT</h3>
              {activeTab === "human" && (
                <span className="w-2 h-2 rounded-full bg-primary-container pulse-green" />
              )}
            </div>
            <p className="font-label-caps text-xs text-primary-container font-semibold">
              &quot;WHO THE EMPLOYEE IS&quot;
            </p>
            <p className="font-code-sm text-xs text-on-surface-variant mt-1">
              Digital representation of the employee — persona, preferences, skills, &amp; work memory.
            </p>
          </div>
        </Link>

        {/* Role Agent Tab */}
        <Link
          href="/twins/role"
          className={`p-4 rounded-lg border transition-all duration-200 cursor-pointer flex items-start gap-4 ${
            activeTab === "role"
              ? "border-primary-container bg-surface-container-low shadow-[0_0_15px_rgba(0,255,65,0.1)]"
              : "border-border-tech bg-surface-container-lowest hover:border-primary-container/40 hover:bg-surface-container-high"
          }`}
        >
          <div className={`p-2.5 rounded border shrink-0 ${
            activeTab === "role"
              ? "bg-primary-container/20 border-primary-container text-primary-container"
              : "bg-surface-layer border-border-tech text-on-surface-variant"
          }`}>
            <Cpu size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-headline-lg text-base font-bold text-on-surface">ROLE AGENT</h3>
              {activeTab === "role" && (
                <span className="w-2 h-2 rounded-full bg-primary-container pulse-green" />
              )}
            </div>
            <p className="font-label-caps text-xs text-primary-container font-semibold">
              &quot;WHAT AI CAPABILITIES ARE AVAILABLE FOR THIS ROLE&quot;
            </p>
            <p className="font-code-sm text-xs text-on-surface-variant mt-1">
              AI capability network for the employee&apos;s role — 10 autonomous sub-agents.
            </p>
          </div>
        </Link>
      </div>
    </div>
  );
}
