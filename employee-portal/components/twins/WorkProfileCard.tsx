"use client";

import { HumanAgentProfile } from "@/features/twins/mock/humanAgent";
import { Clock, Briefcase, Award, Activity, Calendar } from "lucide-react";

export function WorkProfileCard({ workProfile }: { workProfile: HumanAgentProfile["workProfile"] }) {
  const items = [
    { label: "Working Hours", value: workProfile.workingHours, icon: Clock },
    { label: "Availability", value: workProfile.availability, icon: Activity },
    { label: "Current Project", value: workProfile.currentProject, icon: Briefcase },
    { label: "Current Focus", value: workProfile.currentTasks, icon: Calendar },
    { label: "Workload Capacity", value: workProfile.workload, icon: Activity },
    { label: "Domain Experience", value: workProfile.experience, icon: Award },
  ];

  return (
    <div className="dark-glass rounded p-grid_unit flex flex-col h-full border border-border-tech">
      <div className="font-label-caps text-xs text-primary-container border-b border-border-tech pb-2 mb-4 flex justify-between items-center">
        <span>WORK PROFILE &amp; AVAILABILITY</span>
        <span className="font-code-sm text-[10px] text-primary-container font-semibold">● Active Duty</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1">
        {items.map(({ label, value, icon: Icon }) => (
          <div key={label} className="p-3 bg-surface-container-high border border-border-tech rounded flex items-start gap-3">
            <div className="p-1.5 rounded bg-surface-layer text-primary-container shrink-0 mt-0.5">
              <Icon size={14} />
            </div>
            <div>
              <span className="font-label-caps text-[10px] text-on-surface-variant block">{label}</span>
              <span className="font-code-sm text-xs font-semibold text-on-surface mt-0.5 block">{value}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
