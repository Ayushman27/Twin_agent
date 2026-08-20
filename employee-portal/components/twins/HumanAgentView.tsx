"use client";

import { mockHumanAgent } from "@/features/twins/mock/humanAgent";
import { PersonaCard } from "./PersonaCard";
import { SkillsMatrix } from "./SkillsMatrix";
import { WorkProfileCard } from "./WorkProfileCard";
import { ToolsAccessCard } from "./ToolsAccessCard";
import { MemoryContextCard } from "./MemoryContextCard";
import { User, ShieldCheck, Activity, Award } from "lucide-react";

export function HumanAgentView() {
  const profile = mockHumanAgent;

  return (
    <div className="flex flex-col gap-grid_unit animate-fade-in-up">
      {/* ── Header: Employee Twin Summary ── */}
      <div className="dark-glass rounded p-grid_unit border border-border-tech flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          {/* Avatar Circle */}
          <div className="relative">
            <div className="w-16 h-16 rounded-lg border-2 border-primary-container bg-surface-container-high flex items-center justify-center font-display-xl text-2xl text-primary-container font-bold shadow-[0_0_15px_rgba(0,255,65,0.2)]">
              RM
            </div>
            <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-primary-container border-2 border-surface flex items-center justify-center">
              <span className="w-1.5 h-1.5 rounded-full bg-surface" />
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="font-headline-lg text-2xl font-bold text-on-surface">
                {profile.name}
              </h2>
              <span className="font-label-caps text-[10px] px-2 py-0.5 rounded bg-primary-container/10 border border-primary-container/30 text-primary-container font-semibold">
                HUMAN AGENT
              </span>
            </div>
            <div className="font-code-sm text-xs text-on-surface-variant flex items-center gap-2">
              <span className="text-on-surface font-medium">{profile.role}</span>
              <span>•</span>
              <span>{profile.department}</span>
            </div>
            <div className="flex items-center gap-3 mt-2 font-label-caps text-xs text-on-surface-variant">
              <span className="flex items-center gap-1.5 text-primary-container font-semibold">
                <span className="w-2 h-2 rounded-full bg-primary-container pulse-green" />
                Status: {profile.status}
              </span>
              <span>•</span>
              <span>ID: {profile.employeeId}</span>
            </div>
          </div>
        </div>

        {/* Twin Completeness Gauge */}
        <div className="flex items-center gap-4 bg-surface-container-low border border-border-tech p-4 rounded-lg self-stretch md:self-auto justify-between md:justify-start">
          <div className="flex flex-col">
            <span className="font-label-caps text-[10px] text-on-surface-variant">TWIN COMPLETENESS</span>
            <span className="font-display-xl text-2xl font-bold text-primary-container">
              {profile.completeness}%
            </span>
            <span className="font-code-sm text-[10px] text-on-surface-variant mt-0.5">
              Personal Calibration High
            </span>
          </div>
          {/* Circular Progress Gauge */}
          <div className="relative w-14 h-14 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-border-tech stroke-current"
                strokeWidth="3.5"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className="text-primary-container stroke-current transition-all duration-1000 ease-out"
                strokeDasharray={`${profile.completeness}, 100`}
                strokeWidth="3.5"
                strokeLinecap="round"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <span className="absolute font-mono text-[10px] font-bold text-on-surface">
              {profile.completeness}%
            </span>
          </div>
        </div>
      </div>

      {/* ── Grid Layout for Sub-Cards ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-grid_unit">
        <PersonaCard persona={profile.persona} />
        <SkillsMatrix skills={profile.skills} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-grid_unit">
        <WorkProfileCard workProfile={profile.workProfile} />
        <MemoryContextCard memoryContext={profile.memoryContext} />
      </div>

      <ToolsAccessCard tools={profile.tools} />
    </div>
  );
}
