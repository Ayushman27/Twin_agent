"use client";

export default function DashboardPage() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-grid_unit h-full">
      {/* ── Left Column: Context ── */}
      <div className="flex flex-col gap-grid_unit">
        {/* Human Twin Context */}
        <div className="dark-glass rounded flex flex-col p-grid_unit gap-4">
          <div className="flex items-center gap-4 border-b border-border-tech pb-4">
            <div className="w-12 h-12 border border-border-tech bg-surface-layer flex items-center justify-center">
              <span className="material-symbols-outlined text-primary-container">person</span>
            </div>
            <div>
              <div className="font-label-caps text-label-caps text-on-surface-variant mb-1">
                Human Twin Context
              </div>
              <div className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface">
                ADM_ROOT
              </div>
            </div>
          </div>
          <div className="flex justify-between items-center">
            <span className="font-code-sm text-code-sm text-on-surface-variant">
              Context Synchronization
            </span>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary-container pulse-green" />
              <span className="font-code-sm text-code-sm text-primary-container">100% Loaded</span>
            </div>
          </div>
        </div>

        {/* Persona & Memory Index */}
        <div className="dark-glass rounded flex flex-col p-grid_unit flex-1">
          <div className="font-label-caps text-label-caps text-on-surface-variant border-b border-border-tech pb-2 mb-4">
            Persona &amp; Memory Index
          </div>

          <div className="mb-4">
            <div className="font-code-sm text-code-sm text-on-surface mb-2">Active Projects</div>
            <div className="flex flex-wrap gap-2">
              <span className="px-2 py-1 bg-surface-container-high border border-border-tech font-code-sm text-code-sm text-on-surface rounded-sm">
                Project: Alpha Orionis
              </span>
              <span className="px-2 py-1 bg-surface-container-high border border-border-tech font-code-sm text-code-sm text-on-surface rounded-sm">
                v2.4 Core Upgrade
              </span>
            </div>
          </div>

          <div className="mb-4">
            <div className="font-code-sm text-code-sm text-on-surface mb-2">Skill Matrix Alignment</div>
            <div className="flex flex-wrap gap-2">
              <span className="px-2 py-1 bg-surface-layer border border-border-tech font-code-sm text-[10px] text-on-surface-variant rounded-sm">Python [98%]</span>
              <span className="px-2 py-1 bg-surface-layer border border-border-tech font-code-sm text-[10px] text-on-surface-variant rounded-sm">Rust [92%]</span>
              <span className="px-2 py-1 bg-surface-layer border border-border-tech font-code-sm text-[10px] text-on-surface-variant rounded-sm">System Arch [99%]</span>
            </div>
          </div>

          <div className="flex-1 border-t border-border-tech pt-4">
            <div className="font-code-sm text-code-sm text-on-surface mb-2">Recent Memory Ingestion</div>
            <ul className="space-y-2 font-code-sm text-code-sm text-on-surface-variant">
              <li className="flex items-start gap-2">
                <span className="text-primary-container">›</span>
                Parsed 4,201 lines from legacy auth.py
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary-container">›</span>
                Indexed Slack thread: &quot;Staging deployment fails&quot;
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary-container">›</span>
                Updated conceptual model for Service Mesh routing
              </li>
            </ul>
          </div>
        </div>

        {/* Current Work Context */}
        <div className="dark-glass rounded flex flex-col p-grid_unit glow-active">
          <div className="font-label-caps text-label-caps text-primary-container border-b border-border-tech pb-2 mb-4">
            Current Work Context
          </div>
          <div className="font-code-sm text-code-sm text-on-surface mb-1">
            Target: Project Alpha Orionis
          </div>
          <div className="font-code-sm text-code-sm text-on-surface-variant text-xs mb-4">
            Focus: Dependency analysis for upcoming release.
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="font-label-caps text-label-caps text-on-surface-variant">RAG Status</span>
            <span className="font-code-sm text-code-sm text-primary-container">Active — 4 Vectors</span>
          </div>
        </div>
      </div>

      {/* ── Center Column: Active Agent ── */}
      <div className="flex flex-col gap-grid_unit">
        {/* Terminal Feed */}
        <div className="dark-glass rounded flex flex-col flex-1 overflow-hidden relative min-h-[400px]">
          {/* Terminal header */}
          <div className="bg-surface-layer border-b border-border-tech p-3 flex justify-between items-center">
            <div className="font-label-caps text-label-caps text-on-surface-variant">
              Live Agent Activity
            </div>
            <div className="flex gap-1">
              <div className="w-2 h-2 rounded-full bg-border-tech" />
              <div className="w-2 h-2 rounded-full bg-border-tech" />
              <div className="w-2 h-2 rounded-full bg-primary-container pulse-green" />
            </div>
          </div>

          {/* Log output */}
          <div className="p-grid_unit font-code-sm text-code-sm space-y-3 overflow-y-auto scroll-hidden flex-1">
            <div className="text-on-surface-variant">
              <span className="text-primary-container">[10:42:01] [AGENT_01] </span>
              Initiating task: &apos;Analyzing system dependencies for v2.4 deployment&apos;
            </div>
            <div className="text-on-surface-variant">
              <span className="text-primary-container">[10:42:05] [AGENT_01] </span>
              Querying internal package registry... OK
            </div>
            <div className="text-on-surface-variant">
              <span className="text-primary-container">[10:42:12] [AGENT_01] </span>
              Detected conflict in `lib-auth` version mapping. Resolving...
            </div>
            <div className="text-on-surface">
              <span className="text-primary-container">[10:42:15] [AGENT_01] </span>
              Analyzing impact on dependent microservices...
            </div>

            {/* Thinking block */}
            <div className="flex items-center gap-3 my-4 border border-border-tech p-4 bg-base-layer">
              <span className="material-symbols-outlined text-primary-container pulse-green text-[28px]">psychology</span>
              <div className="flex flex-col">
                <span className="font-label-caps text-label-caps text-primary-container">Agent Thinking</span>
                <span className="text-on-surface-variant text-xs mt-1">
                  Cross-referencing deployment histories...
                </span>
              </div>
            </div>

            <div className="text-on-surface-variant">
              <span className="text-primary-container">[10:42:30] [AGENT_01] </span>
              Cross-reference complete. No breaking changes detected in staging env.
            </div>
            <div className="flex items-center gap-2 text-primary-container">
              <span className="material-symbols-outlined text-sm">check_circle</span>
              <span>Task completed with 94% confidence score.</span>
            </div>
          </div>
        </div>

        {/* Evidence Log + Confidence Score */}
        <div className="grid grid-cols-2 gap-grid_unit">
          {/* Evidence Log */}
          <div className="dark-glass rounded flex flex-col p-grid_unit">
            <div className="font-label-caps text-label-caps text-on-surface-variant border-b border-border-tech pb-2 mb-4">
              Evidence Log
            </div>
            <div className="flex flex-col gap-2 font-code-sm text-code-sm text-on-surface-variant">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary-container text-sm">check</span>
                Code checked
              </div>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary-container text-sm">check</span>
                Tests triggered (All pass)
              </div>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary-container text-sm">check</span>
                Security scan OK
              </div>
              <div className="flex items-center gap-2 opacity-50">
                <span className="material-symbols-outlined text-sm">hourglass_empty</span>
                Policy validation pending
              </div>
            </div>
          </div>

          {/* Confidence Score */}
          <div className="dark-glass rounded flex flex-col items-center justify-center relative p-grid_unit">
            <div className="absolute top-4 left-4 font-label-caps text-label-caps text-on-surface-variant">
              Confidence Score
            </div>
            <div className="relative w-28 h-28 flex items-center justify-center mt-6">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="45" fill="none" stroke="#1A1A1A" strokeWidth="10" />
                <circle
                  cx="50" cy="50" r="45" fill="none"
                  stroke="#00FF41" strokeWidth="10"
                  strokeDasharray="283" strokeDashoffset="17"
                  className="transition-all duration-1000 ease-out"
                />
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="font-display-xl text-[32px] text-primary-container leading-none">
                  94<span className="text-xl">%</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Right Column: Approvals & Health ── */}
      <div className="flex flex-col gap-grid_unit">
        {/* Action Required */}
        <div className="dark-glass rounded flex flex-col p-grid_unit flex-1 border border-error-container relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-error-container" />
          <div className="font-label-caps text-label-caps text-error border-b border-border-tech pb-2 mb-4 flex justify-between items-center">
            <span>Action Required</span>
            <span className="material-symbols-outlined text-sm">warning</span>
          </div>
          <div className="flex flex-col gap-4">
            <div className="bg-background border border-border-tech p-3 rounded-sm">
              <div className="font-code-sm text-code-sm text-on-surface mb-2">
                Approve CI/CD deployment to staging
              </div>
              <div className="font-code-sm text-code-sm text-on-surface-variant text-xs mb-3">
                Agent has prepared v2.4 package. All pre-flight checks passed. Requires human-in-the-loop
                authorization due to sensitive routing changes.
              </div>
              <div className="flex gap-2">
                <button className="flex-1 py-1.5 bg-primary-container text-on-primary font-label-caps text-label-caps font-bold hover:bg-primary-fixed transition-colors text-xs">
                  Approve
                </button>
                <button className="flex-1 py-1.5 bg-transparent border border-border-tech text-on-surface font-label-caps text-label-caps hover:border-primary-container transition-colors text-xs">
                  Review Diff
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Network Notifications */}
        <div className="dark-glass rounded flex flex-col p-grid_unit h-56">
          <div className="font-label-caps text-label-caps text-on-surface-variant border-b border-border-tech pb-2 mb-4">
            Network Notifications
          </div>
          <div className="flex flex-col gap-3 font-code-sm text-code-sm overflow-y-auto scroll-hidden">
            <div className="flex gap-2 border-l-2 border-border-tech pl-2">
              <span className="text-on-surface-variant text-[10px] whitespace-nowrap">10:30 AM</span>
              <span className="text-on-surface">
                Agent <span className="text-primary-container">SYS_OP_02</span> scaled up DB instances.
              </span>
            </div>
            <div className="flex gap-2 border-l-2 border-border-tech pl-2">
              <span className="text-on-surface-variant text-[10px] whitespace-nowrap">10:15 AM</span>
              <span className="text-on-surface">
                Agent <span className="text-primary-container">SEC_09</span> identified anomaly in ingress traffic. Investigating.
              </span>
            </div>
            <div className="flex gap-2 border-l-2 border-border-tech pl-2">
              <span className="text-on-surface-variant text-[10px] whitespace-nowrap">09:55 AM</span>
              <span className="text-on-surface">
                Agent <span className="text-primary-container">DATA_PIPE_1</span> finished daily ETL ingestion.
              </span>
            </div>
          </div>
        </div>

        {/* System Health Chart */}
        <div className="dark-glass rounded flex flex-col p-grid_unit h-56">
          <div className="font-label-caps text-label-caps text-on-surface-variant border-b border-border-tech pb-2 mb-4">
            System Health &amp; Routing
          </div>
          <div className="flex-1 relative flex items-end gap-1">
            <div className="w-1/6 bg-border-tech h-[30%] relative group">
              <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 text-[8px] text-on-surface-variant opacity-0 group-hover:opacity-100">SLM</div>
            </div>
            <div className="w-1/6 bg-border-tech h-[50%] relative group">
              <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 text-[8px] text-on-surface-variant opacity-0 group-hover:opacity-100">SLM</div>
            </div>
            <div className="w-1/6 bg-primary-container/20 border-t border-primary-container h-[80%] relative group">
              <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 text-[8px] text-primary-container opacity-0 group-hover:opacity-100">LLM</div>
            </div>
            <div className="w-1/6 bg-border-tech h-[40%] relative group">
              <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 text-[8px] text-on-surface-variant opacity-0 group-hover:opacity-100">SLM</div>
            </div>
            <div className="w-1/6 bg-primary-container/20 border-t border-primary-container h-[90%] relative group">
              <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 text-[8px] text-primary-container opacity-0 group-hover:opacity-100">LLM</div>
            </div>
            <div className="w-1/6 bg-border-tech h-[60%] relative group">
              <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 text-[8px] text-on-surface-variant opacity-0 group-hover:opacity-100">SLM</div>
            </div>
            {/* Trend line */}
            <svg className="absolute top-0 left-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
              <path d="M0,80 L20,60 L40,30 L60,70 L80,20 L100,50" fill="none" stroke="#00FF41" strokeWidth="1" />
            </svg>
          </div>
          <div className="flex justify-between mt-2 font-code-sm text-[10px] text-on-surface-variant">
            <span>Throughput: 1.2k req/s</span>
            <span>Routing: 70% SLM / 30% LLM</span>
          </div>
        </div>
      </div>
    </div>
  );
}
