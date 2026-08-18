"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { CommandPalette } from "@/components/command-palette/command-palette";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthRoute = pathname?.startsWith("/login");

  if (isAuthRoute) return <>{children}</>;

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
