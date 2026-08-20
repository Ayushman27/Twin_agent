"use client";

import { HumanAgentProfile } from "@/features/twins/mock/humanAgent";
import { MessageSquare, Zap, Target, Users, Calendar } from "lucide-react";

export function PersonaCard({ persona }: { persona: HumanAgentProfile["persona"] }) {
  const items = [
    { label: "Communication Style", value: persona.communicationStyle, icon: MessageSquare },
    { label: "Preferred Tone", value: persona.preferredTone, icon: Zap },
    { label: "Decision Style", value: persona.decisionStyle, icon: Target },
    { label: "Work Style", value: persona.workStyle, icon: Zap },
    { label: "Collaboration Style", value: persona.collaborationStyle, icon: Users },
    { label: "Meeting Preference", value: persona.meetingPreference, icon: Calendar },
  ];

  return (
    <div className="dark-glass rounded p-grid_unit flex flex-col h-full border border-border-tech">
      <div className="font-label-caps text-xs text-primary-container border-b border-border-tech pb-2 mb-4 flex justify-between items-center">
        <span>PERSONA &amp; BEHAVIORAL PROFILE</span>
        <span className="font-code-sm text-[10px] text-on-surface-variant">Calibrated 100%</span>
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
