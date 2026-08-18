"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { CommandPalette } from "@/components/command-palette/command-palette";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthRoute = pathname?.startsWith("/login");

  if (isAuthRoute) return <>{children}</>;

  return (
    <div className="h-screen flex flex-col">
      <Topbar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          <Breadcrumbs />
          <div className="p-6">{children}</div>
        </main>
      </div>
      <CommandPalette />
    </div>
  );
}
