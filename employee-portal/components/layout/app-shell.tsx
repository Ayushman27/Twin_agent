"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { CommandPalette } from "@shared/components/command-palette/command-palette";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPublicRoute =
    pathname === "/" ||
    pathname?.startsWith("/login") ||
    pathname?.startsWith("/register");

  if (isPublicRoute) return <>{children}</>;

  return (
    <div className="h-screen overflow-hidden">
      <Sidebar />
      <Topbar />
      {/* Main canvas offset from fixed sidebar + topbar */}
      <main className="ml-[240px] mt-[80px] w-[calc(100%-240px)] h-[calc(100vh-80px)] overflow-y-auto scroll-hidden p-grid_unit">
        {children}
      </main>
      <CommandPalette />
    </div>
  );
}
