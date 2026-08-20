"use client";

// @ts-ignore
import { usePathname } from "next/navigation";

export function Breadcrumbs() {
  const pathname = usePathname() || "/";
  const parts = pathname.split("/").filter(Boolean);

  return (
    <div className="text-xs text-muted-foreground px-6 pt-4 capitalize">
      {parts.length === 0 ? "Dashboard" : parts.map((p: string) => p.replace(/-/g, " ")).join(" / ")}
    </div>
  );
}
