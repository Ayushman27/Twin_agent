"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUIStore } from "@/stores/ui.store";
import {
  LayoutDashboard, Building2, Users2, Bot, ListChecks,
  ShieldCheck, BookOpen, Plug, BarChart3, Settings,
} from "lucide-react";

const NAV = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Organization", href: "/organization/people", icon: Building2 },
  { label: "Twins", href: "/twins/human", icon: Users2 },
  { label: "Agents", href: "/agents/network", icon: Bot },
  { label: "Tasks", href: "/tasks", icon: ListChecks },
  { label: "Approvals", href: "/approvals", icon: ShieldCheck },
  { label: "Knowledge", href: "/knowledge", icon: BookOpen },
  { label: "Integrations", href: "/integrations", icon: Plug },
  { label: "Analytics", href: "/analytics", icon: BarChart3 },
  { label: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const collapsed = useUIStore((s) => s.sidebarCollapsed);

  return (
    <aside className={`hidden md:flex flex-col border-r border-border bg-background transition-all
      ${collapsed ? "w-16" : "w-56"}`}>
      <nav className="flex-1 py-4 space-y-1">
        {NAV.map(({ label, href, icon: Icon }) => {
          const active = pathname?.startsWith(href.split("/").slice(0, 2).join("/"));
          return (
            <Link key={href} href={href}
              className={`flex items-center gap-3 px-4 py-2 text-sm rounded-md mx-2
                ${active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"}`}>
              <Icon size={18} />
              {!collapsed && <span>{label}</span>}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
