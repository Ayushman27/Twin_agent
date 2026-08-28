"use client";

import React, { Suspense } from "react";
import AgentActivityPage from "../activity/page";

export default function ExecutionsPage() {
  return (
    <Suspense fallback={<div className="p-8 font-mono text-xs text-zinc-500">Loading Agent Executions...</div>}>
      <AgentActivityPage />
    </Suspense>
  );
}
