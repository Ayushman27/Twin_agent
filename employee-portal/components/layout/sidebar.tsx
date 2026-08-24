"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { label: "Home",          href: "/home",                icon: "home" },
  { label: "Dashboard",     href: "/dashboard",           icon: "dashboard" },
  { label: "Tasks",         href: "/tasks",               icon: "checklist" },
  { label: "Approvals",     href: "/approvals",           icon: "verified_user" },
  { label: "Twins",         href: "/twins/human",         icon: "manage_accounts" },
  { label: "Agent Network", href: "/agents/network",      icon: "account_tree" },
  { label: "Agent Logs",    href: "/agents/activity",     icon: "terminal" },
  { label: "Knowledge",     href: "/knowledge",           icon: "database" },
  { label: "Integrations",  href: "/integrations",        icon: "cable" },
  { label: "Analytics",     href: "/analytics",           icon: "bar_chart" },
];

const BOTTOM_NAV = [
  { label: "Settings",      href: "/settings",            icon: "settings" },
];

export function Sidebar() {
  const pathname = usePathname();

  const isActive = (href: string) =>
    pathname === href || (href !== "/home" && href !== "/dashboard" && pathname?.startsWith(href.split("/").slice(0, 2).join("/")));

  return (
    <nav className="w-[240px] h-screen fixed left-0 top-0 border-r border-border-tech bg-surface-container-lowest flex flex-col py-grid_unit z-40">
      {/* Brand */}
      <div className="px-grid_unit mb-margin_md">
        <h1 className="font-display-xl text-display-xl text-primary-container tracking-tighter leading-none">
          Twin Agent
        </h1>
        <p className="font-label-caps text-label-caps text-on-surface-variant mt-2">
          Employee Portal (3001)
        </p>
      </div>

      {/* Main nav */}
      <div className="flex flex-col gap-0.5 flex-1 px-2 overflow-y-auto scroll-hidden">
        {NAV_ITEMS.map(({ label, href, icon }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2 transition-colors duration-200 cursor-pointer active:scale-95 border-l-2 ${
                active
                  ? "border-primary-container text-primary-fixed-dim bg-surface-container-low font-semibold"
                  : "border-transparent text-on-surface-variant hover:bg-surface-container-high"
              }`}
            >
              <span className="material-symbols-outlined text-[18px] leading-none">{icon}</span>
              <span className="font-label-caps text-label-caps">{label}</span>
            </Link>
          );
        })}
      </div>

      {/* Switch Portal Link */}
      <div className="px-4 my-2">
        <a
          href="http://localhost:3000"
          target="_blank"
          rel="noopener noreferrer"
          className="w-full py-1.5 bg-surface-container-high border border-border-tech text-on-surface font-label-caps text-[10px] hover:border-primary-container flex items-center justify-center gap-1.5 transition-colors"
        >
          <span className="material-symbols-outlined text-[14px]">open_in_new</span>
          Company Portal (3000)
        </a>
      </div>

      {/* Bottom nav */}
      <div className="flex flex-col gap-0.5 px-2">
        {BOTTOM_NAV.map(({ label, href, icon }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-3 px-3 py-2 text-on-surface-variant border-l-2 border-transparent hover:bg-surface-container-high transition-colors duration-200 cursor-pointer active:scale-95"
          >
            <span className="material-symbols-outlined text-[18px] leading-none">{icon}</span>
            <span className="font-label-caps text-label-caps">{label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
