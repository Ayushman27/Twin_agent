"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  ShieldAlert,
  Users,
  Lock,
  Cpu,
  Bot,
  Layers,
  ChevronRight,
} from "lucide-react";

export interface SettingsNavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  description: string;
}

export const SETTINGS_NAV_ITEMS: SettingsNavItem[] = [
  {
    label: "Organization",
    href: "/settings/organization",
    icon: Building2,
    description: "Company identity, contact, location & size",
  },
  {
    label: "Administrator",
    href: "/settings/administrator",
    icon: ShieldAlert,
    description: "Primary administrator profile & roles",
  },
  {
    label: "Employees",
    href: "/settings/employees",
    icon: Users,
    description: "Onboarding policies & member defaults",
  },
  {
    label: "Security",
    href: "/settings/security",
    icon: Lock,
    description: "Authentication, session & access policies",
  },
  {
    label: "AI & Agents",
    href: "/settings/agents",
    icon: Cpu,
    description: "Autonomous execution & approval thresholds",
  },
  {
    label: "AI Twin",
    href: "/settings/twin",
    icon: Bot,
    description: "Digital twin synchronization & privacy",
  },
  {
    label: "Integrations",
    href: "/settings/integrations",
    icon: Layers,
    description: "API keys & enterprise external providers",
  },
];

export function SettingsNav() {
  const pathname = usePathname();

  const isItemActive = (href: string) => {
    if (href === "/settings/organization") {
      return pathname === "/settings" || pathname === "/settings/organization";
    }
    if (href === "/settings/agents") {
      return pathname === "/settings/agents" || pathname === "/settings/ai-agents";
    }
    if (href === "/settings/twin") {
      return pathname === "/settings/twin" || pathname === "/settings/ai-twin";
    }
    return pathname?.startsWith(href);
  };

  return (
    <nav className="w-full lg:w-64 shrink-0 flex flex-col gap-1.5 font-code-sm">
      <div className="font-label-caps text-[10px] text-on-surface-variant uppercase px-2 mb-1 tracking-wider">
        Settings Navigation
      </div>

      <div className="flex flex-col gap-1">
        {SETTINGS_NAV_ITEMS.map((item) => {
          const active = isItemActive(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`p-3 border rounded-sm transition-all flex items-center justify-between group ${
                active
                  ? "border-primary-container bg-primary-container/10 text-primary-container shadow-[0_0_12px_rgba(0,255,65,0.1)]"
                  : "border-border-tech bg-surface-container-low text-on-surface-variant hover:border-border-tech/80 hover:bg-surface-container-high hover:text-on-surface"
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`p-1.5 rounded-sm border ${
                    active
                      ? "border-primary-container/40 bg-primary-container/20 text-primary-container"
                      : "border-border-tech bg-surface-layer text-on-surface-variant group-hover:text-on-surface"
                  }`}
                >
                  <Icon size={16} />
                </div>
                <div>
                  <div
                    className={`font-label-caps text-xs font-semibold uppercase tracking-wider ${
                      active ? "text-primary-container" : "text-on-surface"
                    }`}
                  >
                    {item.label}
                  </div>
                  <div className="text-[10px] text-on-surface-variant line-clamp-1">
                    {item.description}
                  </div>
                </div>
              </div>

              <ChevronRight
                size={14}
                className={`transition-transform ${
                  active
                    ? "text-primary-container translate-x-0.5"
                    : "text-on-surface-variant opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5"
                }`}
              />
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
