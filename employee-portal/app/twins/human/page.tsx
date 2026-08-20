"use client";

import { TwinTabs } from "@/components/twins/TwinTabs";
import { HumanAgentView } from "@/components/twins/HumanAgentView";

export default function HumanTwinPage() {
  return (
    <div className="flex flex-col gap-2">
      <TwinTabs activeTab="human" />
      <HumanAgentView />
    </div>
  );
}
