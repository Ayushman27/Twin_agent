"use client";

import { SettingsNav } from "./components/settings-nav";
import { Sliders } from "lucide-react";

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-6 animate-fade-in-up">
      {/* Top Banner */}
      <div className="border-b border-border-tech pb-4">
        <div className="flex items-center gap-2 mb-1">
          <span className="px-2 py-0.5 border border-primary-container/40 bg-primary-container/10 font-code-sm text-[10px] text-primary-container uppercase flex items-center gap-1">
            <Sliders size={12} />
            Company Administration // Configuration Node
          </span>
        </div>
        <h1 className="font-display-xl text-[26px] sm:text-[30px] text-on-surface">
          Company Settings
        </h1>
        <p className="font-code-sm text-xs text-on-surface-variant mt-1">
          Configure corporate metadata, administrator access, identity security, and autonomous AI twin parameters.
        </p>
      </div>

      {/* Two-Column Responsive Settings View */}
      <div className="flex flex-col lg:flex-row items-start gap-6">
        <SettingsNav />
        <div className="flex-1 w-full min-w-0">{children}</div>
      </div>
    </div>
  );
}
