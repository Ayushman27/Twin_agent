"use client";

import { TwinTabs } from "@/components/twins/TwinTabs";
import { RoleAgentView } from "@/components/twins/RoleAgentView";

export default function RoleTwinPage() {
  return (
    <div className="flex flex-col gap-2">
      <TwinTabs activeTab="role" />
      <RoleAgentView />
    </div>
  );
}
