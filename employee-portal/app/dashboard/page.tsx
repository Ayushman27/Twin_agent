"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { LoadingState } from "@shared/components/status/loading-state";
import {
  User,
  Brain,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  ShieldCheck,
  Bot,
  Activity,
  Terminal,
  FileCode,
  Check,
  Zap,
  ArrowRight,
} from "lucide-react";

export default function DashboardPage() {
  const router = useRouter();
  const { user, isLoading, isAuthenticated, isEmployee, hasOrganization } = useAuth();
  const [approved, setApproved] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.push("/login?error=unauthorized");
      } else if (!isEmployee) {
        router.push("/login?error=admin_restricted");
      } else if (!hasOrganization) {
        router.push("/login?error=no_organization");
      }
    }
  }, [isLoading, isAuthenticated, isEmployee, hasOrganization, router]);

  if (isLoading) {
    return <LoadingState label="Authenticating Digital Twin workspace..." />;
  }

  if (!isAuthenticated || !isEmployee || !hasOrganization) {
    return <LoadingState label="Redirecting to Employee Login..." />;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 h-full overflow-y-auto scroll-hidden animate-fade-in-up pr-1">
      
      {/* ── Left Column: Human Twin Context (Span 4) ── */}
      <div className="lg:col-span-4 flex flex-col gap-4">
        <div className="dark-glass rounded-lg p-5 border border-border-tech flex flex-col gap-5 h-full">
          
          {/* Header */}
          <div className="flex items-center gap-3 border-b border-border-tech pb-4">
            <div className="p-2 rounded bg-surface-container-high border border-border-tech text-primary-container">
              <User size={20} />
            </div>
            <div>
              <span className="font-label-caps text-[10px] text-on-surface-variant block">Human Twin Context</span>
              <h2 className="font-headline-lg text-xl font-bold text-on-surface tracking-tight">
                {user?.name?.toUpperCase() || "ROHAN MEHTA"}
              </h2>
              <span className="font-code-sm text-xs text-primary-container font-semibold">
                Software Engineer • EMPLOYEE
              </span>
            </div>
          </div>

          {/* Context Sync Status */}
          <div className="flex items-center justify-between bg-surface-container-lowest border border-border-tech rounded p-3 font-code-sm text-xs">
            <span className="text-on-surface-variant">Context Synchronization</span>
            <span className="text-primary-container font-semibold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-primary-container pulse-green inline-block" />
              100% Loaded
            </span>
          </div>

          {/* Persona & Memory Index */}
          <div className="flex flex-col gap-3">
            <span className="font-label-caps text-xs text-on-surface-variant">Persona &amp; Memory Index</span>
            
            {/* Active Projects */}
            <div className="flex flex-col gap-1.5">
              <span className="font-code-sm text-[11px] text-on-surface-variant">Active Projects</span>
              <div className="flex flex-wrap gap-2">
                <span className="px-2.5 py-1 rounded bg-surface-container-high border border-border-tech font-code-sm text-xs text-on-surface font-medium">
                  Project: Alpha Orionis
                </span>
                <span className="px-2.5 py-1 rounded bg-surface-container-high border border-border-tech font-code-sm text-xs text-on-surface font-medium">
                  v2.4 Core Upgrade
                </span>
              </div>
            </div>

            {/* Skill Matrix Alignment */}
            <div className="flex flex-col gap-1.5 mt-2">
              <span className="font-code-sm text-[11px] text-on-surface-variant">Skill Matrix Alignment</span>
              <div className="flex flex-wrap gap-2">
                <span className="px-2 py-0.5 rounded bg-surface-layer border border-border-tech font-code-sm text-xs text-on-surface">
                  Python <span className="text-primary-container font-semibold">[98%]</span>
                </span>
                <span className="px-2 py-0.5 rounded bg-surface-layer border border-border-tech font-code-sm text-xs text-on-surface">
                  Rust <span className="text-primary-container font-semibold">[92%]</span>
                </span>
                <span className="px-2 py-0.5 rounded bg-surface-layer border border-border-tech font-code-sm text-xs text-on-surface">
                  System Arch <span className="text-primary-container font-semibold">[99%]</span>
                </span>
              </div>
            </div>
          </div>

          {/* Recent Memory Ingestion */}
          <div className="flex flex-col gap-2.5 border-t border-border-tech pt-4 mt-auto">
            <span className="font-label-caps text-xs text-on-surface-variant">Recent Memory Ingestion</span>
            <div className="space-y-2 font-code-sm text-xs text-on-surface-variant">
              <div className="flex items-start gap-2">
                <span className="text-primary-container font-bold">›</span>
                <span>Parsed 4,201 lines from legacy auth.py</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-primary-container font-bold">›</span>
                <span>Indexed Slack thread: &quot;Staging deployment fails&quot;</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-primary-container font-bold">›</span>
                <span>Updated conceptual model for Service Mesh routing</span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* ── Middle Column: Live Agent Activity Terminal (Span 5) ── */}
      <div className="lg:col-span-5 flex flex-col gap-4">
        <div className="dark-glass rounded-lg p-5 border border-border-tech flex flex-col gap-4 h-full relative overflow-hidden">
          
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border-tech pb-3">
            <div className="flex items-center gap-2">
              <Terminal size={16} className="text-primary-container" />
              <h3 className="font-label-caps text-xs font-bold text-on-surface">Live Agent Activity</h3>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="w-2 h-2 rounded-full bg-emerald-500/40" />
            </div>
          </div>

          {/* Console Log Stream */}
          <div className="flex-1 bg-[#030504] border border-border-tech rounded p-4 font-mono text-xs space-y-3 overflow-y-auto scroll-hidden">
            <div className="leading-relaxed">
              <span className="text-emerald-500">[10:42:01]</span>{" "}
              <span className="text-primary-container font-semibold">[AGENT_01]</span>{" "}
              <span className="text-zinc-300">Initiating task: &apos;Analyzing system dependencies for v2.4 deployment&apos;</span>
            </div>

            <div className="leading-relaxed">
              <span className="text-emerald-500">[10:42:05]</span>{" "}
              <span className="text-primary-container font-semibold">[AGENT_01]</span>{" "}
              <span className="text-zinc-300">Querying internal package registry...</span>{" "}
              <span className="text-emerald-400 font-bold">OK</span>
            </div>

            <div className="leading-relaxed">
              <span className="text-emerald-500">[10:42:12]</span>{" "}
              <span className="text-primary-container font-semibold">[AGENT_01]</span>{" "}
              <span className="text-zinc-300">Detected conflict in &apos;lib-auth&apos; version mapping. Resolving...</span>
            </div>

            <div className="leading-relaxed">
              <span className="text-emerald-500">[10:42:15]</span>{" "}
              <span className="text-primary-container font-semibold">[AGENT_01]</span>{" "}
              <span className="text-zinc-300">Analyzing impact on dependent microservices...</span>
            </div>

            {/* Agent Thinking Box */}
            <div className="p-3 bg-surface-container-high/60 border border-border-tech rounded flex items-center gap-3 my-2">
              <div className="w-7 h-7 rounded-full bg-primary-container/10 border border-primary-container/30 flex items-center justify-center text-primary-container shrink-0">
                <Brain size={16} className="animate-pulse" />
              </div>
              <div>
                <span className="font-label-caps text-[10px] text-primary-container font-bold block">Agent Thinking</span>
                <span className="font-mono text-xs text-on-surface-variant">Cross-referencing deployment histories...</span>
              </div>
            </div>

            <div className="leading-relaxed">
              <span className="text-emerald-500">[10:42:30]</span>{" "}
              <span className="text-primary-container font-semibold">[AGENT_01]</span>{" "}
              <span className="text-zinc-300">Cross-reference complete. No breaking changes detected in staging env.</span>
            </div>

            <div className="pt-2 border-t border-border-tech/40 flex items-center gap-2 text-primary-container font-semibold">
              <CheckCircle2 size={16} />
              <span>Task completed with 94% confidence score.</span>
            </div>
          </div>

          {/* Footer Metrics */}
          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border-tech font-code-sm text-xs">
            <div className="bg-surface-container-lowest border border-border-tech p-2.5 rounded flex flex-col gap-1">
              <span className="text-on-surface-variant text-[10px] font-label-caps">Evidence Log</span>
              <span className="text-primary-container font-semibold flex items-center gap-1.5">
                <Check size={14} /> Code checked
              </span>
            </div>
            <div className="bg-surface-container-lowest border border-border-tech p-2.5 rounded flex flex-col gap-1">
              <span className="text-on-surface-variant text-[10px] font-label-caps">Confidence Score</span>
              <span className="text-on-surface font-semibold">94% Automated</span>
            </div>
          </div>

        </div>
      </div>

      {/* ── Right Column: Action Required & Notifications (Span 3) ── */}
      <div className="lg:col-span-3 flex flex-col gap-4">
        
        {/* Action Required Card */}
        <div className="dark-glass rounded-lg p-5 border-l-4 border-l-error border-y border-r border-border-tech flex flex-col gap-4 bg-error-container/5">
          <div className="flex items-center justify-between">
            <span className="font-label-caps text-xs font-bold text-error tracking-wider uppercase">
              Action Required
            </span>
            <AlertTriangle size={18} className="text-error" />
          </div>

          <div>
            <h4 className="font-semibold text-sm text-on-surface">
              Approve CI/CD deployment to staging
            </h4>
            <p className="font-code-sm text-xs text-on-surface-variant mt-1.5 leading-relaxed">
              Agent has prepared v2.4 package. All pre-flight checks passed. Requires human-in-the-loop authorization due to sensitive routing changes.
            </p>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button
              onClick={() => setApproved(!approved)}
              className={`flex-1 py-2 px-4 rounded font-label-caps text-xs font-bold transition-all text-center ${
                approved
                  ? "bg-primary-container/20 border border-primary-container text-primary-container"
                  : "bg-primary-container hover:bg-primary-fixed text-on-primary shadow-[0_0_15px_rgba(0,255,65,0.3)]"
              }`}
            >
              {approved ? "Approved ✓" : "Approve"}
            </button>

            <button className="px-3 py-2 border border-border-tech bg-surface-container-high hover:border-primary-container text-on-surface font-label-caps text-xs transition-colors rounded">
              Review Diff
            </button>
          </div>
        </div>

        {/* Network Notifications Card */}
        <div className="dark-glass rounded-lg p-5 border border-border-tech flex flex-col gap-3">
          <span className="font-label-caps text-xs text-on-surface-variant font-bold border-b border-border-tech pb-2">
            Network Notifications
          </span>

          <div className="space-y-3 font-code-sm text-xs">
            <div className="flex items-start gap-2 leading-relaxed">
              <span className="text-on-surface-variant shrink-0">10:30 AM</span>
              <span className="text-on-surface">
                Agent <span className="text-primary-container font-semibold">SYS_OP_02</span> scaled up DB instances.
              </span>
            </div>

            <div className="flex items-start gap-2 leading-relaxed">
              <span className="text-on-surface-variant shrink-0">10:15 AM</span>
              <span className="text-on-surface">
                Agent <span className="text-primary-container font-semibold">SEC_09</span> identified anomaly in ingress traffic. Investigating.
              </span>
            </div>

            <div className="flex items-start gap-2 leading-relaxed">
              <span className="text-on-surface-variant shrink-0">09:55 AM</span>
              <span className="text-on-surface">
                Agent <span className="text-primary-container font-semibold">DATA_PIPE_1</span> finished daily ETL ingestion.
              </span>
            </div>
          </div>
        </div>

        {/* System Health & Routing Card */}
        <div className="dark-glass rounded-lg p-5 border border-border-tech flex flex-col gap-3 mt-auto">
          <span className="font-label-caps text-xs text-on-surface-variant font-bold border-b border-border-tech pb-2">
            System Health &amp; Routing
          </span>

          <div className="space-y-2 font-code-sm text-xs">
            <div className="flex items-center justify-between text-on-surface-variant">
              <span>SLM Inference Latency</span>
              <span className="text-primary-container font-semibold">12 ms</span>
            </div>
            <div className="flex items-center justify-between text-on-surface-variant">
              <span>RAG Vector Synchronization</span>
              <span className="text-primary-container font-semibold">100% Synced</span>
            </div>
            <div className="flex items-center justify-between text-on-surface-variant">
              <span>Security Anomalies</span>
              <span className="text-emerald-400 font-semibold">0 Detected</span>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
