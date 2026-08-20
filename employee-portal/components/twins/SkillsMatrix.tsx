"use client";

import { HumanAgentProfile } from "@/features/twins/mock/humanAgent";

export function SkillsMatrix({ skills }: { skills: HumanAgentProfile["skills"] }) {
  return (
    <div className="dark-glass rounded p-grid_unit flex flex-col h-full border border-border-tech">
      <div className="font-label-caps text-xs text-primary-container border-b border-border-tech pb-2 mb-4 flex justify-between items-center">
        <span>SKILL MATRIX ALIGNMENT</span>
        <span className="font-code-sm text-[10px] text-on-surface-variant">{skills.length} Core Competencies</span>
      </div>

      <div className="flex flex-col gap-3 flex-1 justify-center">
        {skills.map((skill) => (
          <div key={skill.name} className="flex flex-col gap-1">
            <div className="flex justify-between items-center font-code-sm text-xs">
              <span className="text-on-surface font-semibold">{skill.name}</span>
              <span className="text-primary-container font-mono">{skill.percentage}%</span>
            </div>
            {/* Clean progress indicator */}
            <div className="w-full h-2 bg-surface-container-high border border-border-tech rounded-full overflow-hidden">
              <div
                className="h-full bg-primary-container transition-all duration-700 ease-out"
                style={{ width: `${skill.percentage}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
