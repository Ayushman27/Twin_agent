"use client";

import { RoleAgentNetwork } from "@/features/twins/mock/roleAgents";
import { Briefcase, CheckCircle2, ShieldAlert, Cpu } from "lucide-react";

export function RoleOverview({ overview }: { overview: RoleAgentNetwork["overview"] }) {
  return (
    <div className="dark-glass rounded p-grid_unit border border-border-tech flex flex-col gap-4">
      <div className="font-label-caps text-xs text-primary-container border-b border-border-tech pb-2 flex justify-between items-center">
        <span>ROLE DEFINITION &amp; GOVERNANCE SCOPE</span>
        <span className="font-code-sm text-[10px] text-on-surface-variant">Role Profile Active</span>
      </div>

      <p className="font-code-sm text-xs text-on-surface-variant leading-relaxed">
        {overview.description}
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
        {/* Primary Responsibilities */}
        <div className="p-3 bg-surface-container-high border border-border-tech rounded flex flex-col gap-2">
          <div className="flex items-center gap-2 font-code-sm text-xs font-semibold text-on-surface border-b border-border-tech pb-1.5">
            <CheckCircle2 size={14} className="text-primary-container" />
            <span>Primary Responsibilities</span>
          </div>
          <ul className="space-y-1.5 font-code-sm text-xs text-on-surface-variant">
            {overview.primaryResponsibilities.map((resp, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-primary-container">✓</span>
                <span>{resp}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Decision Authority */}
        <div className="p-3 bg-surface-container-high border border-border-tech rounded flex flex-col gap-2">
          <div className="flex items-center gap-2 font-code-sm text-xs font-semibold text-on-surface border-b border-border-tech pb-1.5">
            <ShieldAlert size={14} className="text-primary-container" />
            <span>Decision &amp; Governance Boundaries</span>
          </div>
          <ul className="space-y-1.5 font-code-sm text-xs text-on-surface-variant">
            {overview.decisionAuthority.map((auth, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-primary-container">›</span>
                <span>{auth}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
