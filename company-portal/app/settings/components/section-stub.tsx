"use client";

import { LucideIcon } from "lucide-react";

interface SectionStubProps {
  title: string;
  subtitle: string;
  badge: string;
  icon: LucideIcon;
  features: string[];
}

export function SectionStub({ title, subtitle, badge, icon: Icon, features }: SectionStubProps) {
  return (
    <div className="p-6 bg-surface-container-low border border-border-tech rounded-sm space-y-6 animate-fade-in-up">
      <div className="border-b border-border-tech pb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 border border-primary-container/40 bg-primary-container/10 text-primary-container rounded-sm">
            <Icon size={20} />
          </div>
          <div>
            <h2 className="font-display-xl text-xl text-on-surface">{title}</h2>
            <p className="font-code-sm text-xs text-on-surface-variant mt-0.5">{subtitle}</p>
          </div>
        </div>
        <span className="font-code-sm text-[10px] text-primary-container uppercase px-2.5 py-1 border border-primary-container/30 bg-primary-container/10 rounded-sm">
          {badge}
        </span>
      </div>

      <div className="space-y-3">
        <div className="font-label-caps text-xs text-on-surface-variant uppercase tracking-wider">
          Planned Configuration Modules:
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {features.map((feature, idx) => (
            <div
              key={idx}
              className="p-3 bg-surface-layer border border-border-tech rounded-sm flex items-start gap-2.5 font-code-sm text-xs text-on-surface"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-primary-container mt-1.5 shrink-0" />
              <span>{feature}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="p-4 bg-surface-container-high border border-border-tech/80 rounded-sm text-xs font-code-sm text-on-surface-variant flex items-center justify-between">
        <span>Section scheduled for implementation in subsequent Phase.</span>
        <span className="text-primary-container font-mono text-[11px]">SYS.NODE: STANDBY</span>
      </div>
    </div>
  );
}
