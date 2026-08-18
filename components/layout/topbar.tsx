"use client";

import { Bell, HelpCircle } from "lucide-react";

export function Topbar() {
  return (
    <header className="bg-surface-dim/80 backdrop-blur-md fixed top-0 right-0 left-[240px] z-50 border-b border-border-tech flex items-center justify-between px-margin_md h-[80px]">
      {/* Left: title + status */}
      <div className="flex items-center gap-6">
        <h2 className="font-headline-lg text-headline-lg font-bold text-on-surface">
          Twin Agent Enterprise
        </h2>
        <div className="hidden lg:flex items-center gap-4 text-on-surface-variant">
          <span className="font-label-caps text-label-caps flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-primary-container pulse-green inline-block" />
            Network Status: Optimal
          </span>
          <span className="font-label-caps text-label-caps border-l border-border-tech pl-4">
            Active Nodes: 1,024
          </span>
        </div>
      </div>

      {/* Right: actions + avatar */}
      <div className="flex items-center gap-3">
        <button
          className="text-on-surface-variant hover:text-primary-container transition-colors p-1.5"
          title="Notifications"
        >
          <Bell size={18} />
        </button>
        <button
          className="text-on-surface-variant hover:text-primary-container transition-colors p-1.5"
          title="Help"
        >
          <HelpCircle size={18} />
        </button>

        {/* Avatar */}
        <div className="w-8 h-8 rounded border border-border-tech bg-surface-container-high flex items-center justify-center font-label-caps text-label-caps text-primary-container">
          ADM
        </div>

        <button className="px-4 py-2 border border-border-tech text-on-surface hover:border-primary-container hover:text-primary-container transition-colors font-label-caps text-label-caps ml-2">
          Deploy New Agent
        </button>
      </div>
    </header>
  );
}
