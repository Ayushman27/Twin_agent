"use client";

import { Menu, Search, Bell, Sparkles } from "lucide-react";
import { useUIStore } from "@/stores/ui.store";

export function Topbar() {
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const openCommandPalette = useUIStore((s) => s.openCommandPalette);
  const notifications = useUIStore((s) => s.notifications);

  return (
    <header className="h-14 border-b border-border flex items-center justify-between px-4 gap-4">
      <div className="flex items-center gap-3">
        <button onClick={toggleSidebar} className="p-1.5 rounded-md hover:bg-muted md:hidden">
          <Menu size={18} />
        </button>
        <span className="font-semibold text-sm">Twin Agent Platform</span>
      </div>

      <button
        onClick={openCommandPalette}
        className="flex-1 max-w-md flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground"
      >
        <Search size={14} />
        Search or run a command...
        <kbd className="ml-auto text-xs">⌘K</kbd>
      </button>

      <div className="flex items-center gap-3">
        <button className="p-1.5 rounded-md hover:bg-muted" title="AI Command">
          <Sparkles size={18} />
        </button>
        <button className="relative p-1.5 rounded-md hover:bg-muted" title="Notifications">
          <Bell size={18} />
          {notifications.length > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-red-500" />
          )}
        </button>
        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
          U
        </div>
      </div>
    </header>
  );
}
