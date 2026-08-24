"use client";

import { useAuth } from "@/hooks/use-auth";
import { Bell, HelpCircle, LogOut } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function Topbar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "EP";

  return (
    <header className="bg-surface-dim/80 backdrop-blur-md fixed top-0 right-0 left-[240px] z-50 border-b border-border-tech flex items-center justify-between px-margin_md h-[80px]">
      {/* Left: title + status */}
      <div className="flex items-center gap-6">
        <h2 className="font-headline-lg text-headline-lg font-bold text-on-surface">
          Twin Agent Workspace
        </h2>

        <div className="hidden lg:flex items-center gap-4 text-on-surface-variant">
          <span className="font-label-caps text-label-caps flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-primary-container pulse-green inline-block" />
            Twin Status: Synchronized
          </span>
          <span className="font-label-caps text-label-caps border-l border-border-tech pl-4">
            Portal: Port 3001
          </span>
        </div>
      </div>

      {/* Right: actions + user info + logout */}
      <div className="flex items-center gap-4">
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

        {/* User Info & Avatar */}
        <div className="flex items-center gap-3 pl-2 border-l border-border-tech">
          <div className="hidden sm:flex flex-col items-end text-right">
            <span className="font-code-sm text-xs text-on-surface font-semibold">
              {user?.name || "Employee"}
            </span>
            <span className="font-label-caps text-[10px] text-primary-container">
              {user?.job_title || user?.role || "EMPLOYEE"}
            </span>
          </div>

          <div
            className="w-8 h-8 rounded border border-border-tech bg-surface-container-high flex items-center justify-center font-label-caps text-label-caps text-primary-container font-bold"
            title={user?.email || "Employee"}
          >
            {initials}
          </div>

          <button
            onClick={() => logout()}
            className="p-1.5 text-on-surface-variant hover:text-error hover:bg-surface-container-high transition-colors rounded-sm"
            title="Sign Out"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </header>
  );
}
