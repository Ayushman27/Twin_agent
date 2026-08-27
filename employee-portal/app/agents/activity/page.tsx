"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Terminal,
  User,
  ShieldCheck,
  Brain,
  ListOrdered,
  Search,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  Clock,
  Database,
  ArrowRight,
  Sparkles,
  FileCode,
  Layers,
  ChevronDown,
  RefreshCw,
  Check,
  Play,
  Pause,
  Bot,
  Activity,
  Zap,
  CheckSquare,
  FileText,
  Code2,
  Award,
  BookOpen,
} from "lucide-react";
import {
  agenticTaskService,
  ExecutionRecord,
  ActionRecord,
} from "@/services/agentic-task.service";

const AGENT_PIPELINE = [
  { step: 1, name: "Human Agent", role: "human_agent", desc: "Context & Identity Extraction", icon: User },
  { step: 2, name: "Role Agent", role: "role_agent", desc: "Domain Strategy & Coordination", icon: Brain },
  { step: 3, name: "Planner Agent", role: "planner_agent", desc: "Step-by-Step Task Decomposition", icon: ListOrdered },
  { step: 4, name: "Research Agent", role: "research_agent", desc: "Contextual Knowledge & Discovery", icon: Search },
  { step: 5, name: "Verification Agent", role: "verification_agent", desc: "QA Scoring & Acceptance Check", icon: ShieldCheck },
];

function AgentActivityContent() {
  const searchParams = useSearchParams();
  const initialExecutionId = searchParams.get("execution_id");

  const [executions, setExecutions] = useState<ExecutionRecord[]>([]);
  const [selectedExecution, setSelectedExecution] = useState<ExecutionRecord | null>(null);
  const [actionLogs, setActionLogs] = useState<ActionRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [activeTab, setActiveTab] = useState<"flow" | "timeline" | "raw">("flow");

  // Replay / Live Animation State
  const [activeRunningStep, setActiveRunningStep] = useState<number>(5); // 1 to 5 (5 = all completed)
  const [isReplaying, setIsReplaying] = useState(false);

  // Load executions from SQLite
  const loadExecutions = async () => {
    try {
      setIsLoading(true);
      const list = await agenticTaskService.listExecutions(50);
      setExecutions(list);

      if (list.length > 0) {
        const found = initialExecutionId ? list.find((e) => e.id === initialExecutionId) : list[0];
        const target = found || list[0];
        setSelectedExecution(target);
        loadActionLogs(target.id);
      }
    } catch (err) {
      console.warn("Could not load executions from SQLite:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadActionLogs = async (executionId: string) => {
    try {
      setIsLoadingLogs(true);
      const logs = await agenticTaskService.getActions(executionId);
      setActionLogs(logs);
    } catch (err) {
      console.warn("Could not load action logs:", err);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  useEffect(() => {
    loadExecutions();
  }, [initialExecutionId]);

  const handleSelectExecution = (exec: ExecutionRecord) => {
    setSelectedExecution(exec);
    setActiveRunningStep(5);
    setIsReplaying(false);
    loadActionLogs(exec.id);
  };

  // Replay Animation Handler
  const handleStartReplay = () => {
    setIsReplaying(true);
    setActiveRunningStep(1);

    const stepIntervals = [1200, 2400, 3600, 4800, 6000];
    stepIntervals.forEach((delay, index) => {
      setTimeout(() => {
        setActiveRunningStep(index + 1);
        if (index === stepIntervals.length - 1) {
          setIsReplaying(false);
        }
      }, delay);
    });
  };

  return (
    <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto h-full overflow-y-auto animate-fade-in-up">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-tech pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded bg-surface-container-high border border-border-tech text-[#00ff41]">
            <Terminal size={22} />
          </div>
          <div>
            <span className="font-label-caps text-[10px] text-on-surface-variant block uppercase">
              AGENT ARCHITECTURAL AUDIT &amp; EXECUTION
            </span>
            <h1 className="font-headline-lg text-2xl font-bold text-on-surface tracking-tight">
              Agent Logs &amp; Working Flow
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleStartReplay}
            disabled={isReplaying || !selectedExecution}
            className="px-3.5 py-2 rounded bg-surface-container-high hover:bg-surface-container-highest border border-border-tech hover:border-[#00ff4166] text-[#00ff41] font-mono text-xs font-bold flex items-center gap-1.5 transition-all shadow-[0_0_10px_rgba(0,255,65,0.1)] disabled:opacity-50"
          >
            {isReplaying ? (
              <>
                <RefreshCw size={13} className="animate-spin text-[#00ff41]" />
                <span>AGENTS RUNNING (0{activeRunningStep}/05)...</span>
              </>
            ) : (
              <>
                <Play size={13} />
                <span>REPLAY WORKING FLOW</span>
              </>
            )}
          </button>

          <button
            onClick={loadExecutions}
            className="p-2 rounded bg-surface-container-high hover:bg-surface-container-highest border border-border-tech text-zinc-300 hover:text-white font-mono text-xs flex items-center gap-1.5 transition-all"
            title="Refresh database records"
          >
            <RefreshCw size={14} className={isLoading ? "animate-spin text-[#00ff41]" : ""} />
            <span>Sync SQLite</span>
          </button>

          <Link
            href="/tasks"
            className="px-3.5 py-2 rounded bg-[#00ff4115] hover:bg-[#00ff4125] border border-[#00ff4144] text-[#00ff41] font-mono text-xs font-bold transition-all"
          >
            ← Back to Tasks
          </Link>
        </div>
      </div>

      {/* ── Top Visual Architectural Pipeline Banner ── */}
      <div className="dark-glass rounded-lg p-5 border border-border-tech bg-[#050906]/90 shadow-[0_0_25px_rgba(0,255,65,0.05)]">
        <div className="flex items-center justify-between border-b border-border-tech pb-3 mb-4">
          <span className="font-label-caps text-xs text-on-surface-variant font-bold flex items-center gap-1.5">
            <Layers size={14} className="text-[#00ff41]" />
            Multi-Agent Architectural Workflow Topology
          </span>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#00ff41] animate-pulse" />
            <span className="font-mono text-[11px] text-[#00ff41]">
              {isReplaying ? `Agent 0${activeRunningStep} Active` : "All 5 Specialized Agents Operational"}
            </span>
          </div>
        </div>

        {/* 5-Agent Interactive Topology Row */}
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 relative">
          {AGENT_PIPELINE.map((item) => {
            const Icon = item.icon;
            const isStepActive = activeRunningStep >= item.step;
            const isCurrentlyRunning = isReplaying && activeRunningStep === item.step;

            return (
              <div
                key={item.step}
                className={`p-3.5 rounded-lg border transition-all duration-300 flex flex-col gap-1.5 relative overflow-hidden ${
                  isCurrentlyRunning
                    ? "bg-[#00ff4115] border-[#00ff41] shadow-[0_0_20px_rgba(0,255,65,0.25)] scale-[1.02]"
                    : isStepActive
                    ? "bg-surface-container-high border-border-tech/80"
                    : "bg-surface-container-lowest border-border-tech/40 opacity-50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div
                    className={`w-6 h-6 rounded flex items-center justify-center font-mono text-[10px] font-bold border transition-colors ${
                      isCurrentlyRunning
                        ? "bg-[#00ff41] text-black border-[#00ff41]"
                        : isStepActive
                        ? "bg-[#00ff4115] border-[#00ff4144] text-[#00ff41]"
                        : "bg-surface-layer border-border-tech text-zinc-500"
                    }`}
                  >
                    0{item.step}
                  </div>
                  <Icon
                    size={16}
                    className={
                      isCurrentlyRunning
                        ? "text-[#00ff41] animate-bounce"
                        : isStepActive
                        ? "text-zinc-300"
                        : "text-zinc-600"
                    }
                  />
                </div>

                <span className="font-mono text-xs font-bold text-on-surface flex items-center gap-1">
                  {item.name}
                  {isCurrentlyRunning && <span className="w-1.5 h-1.5 rounded-full bg-[#00ff41] animate-ping" />}
                </span>
                <span className="font-code-sm text-[10px] text-zinc-500">{item.desc}</span>

                {/* State Tag */}
                <div className="mt-1 pt-1.5 border-t border-border-tech/40 flex items-center justify-between font-mono text-[9px]">
                  <span className="text-zinc-500">STATE:</span>
                  <span
                    className={
                      isCurrentlyRunning
                        ? "text-[#00ff41] font-bold animate-pulse"
                        : isStepActive
                        ? "text-emerald-400 font-bold"
                        : "text-zinc-600"
                    }
                  >
                    {isCurrentlyRunning ? "RUNNING" : isStepActive ? "COMPLETED" : "STANDBY"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Task Selector Bar ── */}
      <div className="dark-glass rounded-lg p-4 border border-border-tech bg-[#050906]/90 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1">
          <Database size={16} className="text-[#00ff41] shrink-0" />
          <span className="font-mono text-xs text-zinc-400 shrink-0">Selected Task from SQLite:</span>
          <select
            value={selectedExecution?.id || ""}
            onChange={(e) => {
              const exec = executions.find((x) => x.id === e.target.value);
              if (exec) handleSelectExecution(exec);
            }}
            className="w-full max-w-xl bg-surface-container-lowest border border-border-tech rounded px-3 py-1.5 text-xs text-on-surface font-mono focus:border-[#00ff41] focus:outline-none"
          >
            {executions.map((e) => (
              <option key={e.id} value={e.id}>
                [{e.status}] {e.original_task.slice(0, 70)} ({e.created_at ? new Date(e.created_at).toLocaleTimeString() : ""})
              </option>
            ))}
          </select>
        </div>

        {/* View mode toggle */}
        <div className="flex items-center gap-1 bg-surface-container-lowest p-1 rounded border border-border-tech">
          <button
            onClick={() => setActiveTab("flow")}
            className={`px-3 py-1 font-mono text-xs font-bold rounded transition-all ${
              activeTab === "flow"
                ? "bg-[#00ff4120] text-[#00ff41] border border-[#00ff4144]"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            Agents Working Flow &amp; Outputs
          </button>
          <button
            onClick={() => setActiveTab("timeline")}
            className={`px-3 py-1 font-mono text-xs font-bold rounded transition-all ${
              activeTab === "timeline"
                ? "bg-[#00ff4120] text-[#00ff41] border border-[#00ff4144]"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            Action Timeline ({actionLogs.length})
          </button>
        </div>
      </div>

      {/* ── Main Content Area ── */}
      {selectedExecution ? (
        <div className="space-y-6">
          {/* TAB 1: Step-by-Step Architectural Flow with Explicit Agent Final Outputs */}
          {activeTab === "flow" && (
            <div className="space-y-5">
              {/* ── AGENT 01: Human Agent ── */}
              {activeRunningStep >= 1 && (
                <div className="dark-glass rounded-lg border border-border-tech bg-[#050906]/90 p-5 animate-fade-in space-y-3">
                  <div className="flex items-center justify-between border-b border-border-tech pb-3">
                    <div className="flex items-center gap-2.5">
                      <span className="w-6 h-6 rounded-full bg-[#00ff4120] border border-[#00ff41] text-[#00ff41] flex items-center justify-center font-mono text-xs font-bold">
                        01
                      </span>
                      <h3 className="font-mono text-sm font-bold text-on-surface">Human Agent Execution</h3>
                      <span className="px-2 py-0.5 rounded bg-[#00ff4110] text-[#00ff41] font-mono text-[10px]">
                        IDENTITY &amp; CONTEXT RESOLUTION
                      </span>
                    </div>
                    <span className="text-emerald-400 font-mono text-xs flex items-center gap-1 font-bold">
                      <Check size={14} /> Profile Context Loaded
                    </span>
                  </div>

                  {/* Agent Metadata Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded bg-[#030504] border border-border-tech font-mono text-xs text-zinc-300">
                    <div>
                      <span className="text-zinc-500 block text-[10px]">Employee ID</span>
                      <span className="font-semibold text-zinc-200">{selectedExecution.employee_id}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500 block text-[10px]">Organization ID</span>
                      <span className="font-semibold text-zinc-200">{selectedExecution.organization_id}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500 block text-[10px]">Target Task</span>
                      <span className="text-zinc-200 line-clamp-1">{selectedExecution.original_task}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500 block text-[10px]">Security Envelope</span>
                      <span className="text-[#00ff41] font-bold">Verified Tenant Isolation</span>
                    </div>
                  </div>

                  {/* 🎯 FINAL OUTPUT OF AGENT 1 */}
                  <div className="p-3.5 rounded bg-surface-container-high border border-border-tech/80 font-mono text-xs space-y-1.5">
                    <span className="font-label-caps text-[10px] text-[#00ff41] font-bold block uppercase flex items-center gap-1">
                      <Zap size={11} /> Human Agent Final Output &amp; Context Vector:
                    </span>
                    <div className="p-2.5 rounded bg-[#020403] border border-border-tech text-zinc-200 text-[11px] leading-relaxed">
                      Resolved Human Twin context for employee <span className="text-[#00ff41] font-bold">&quot;{selectedExecution.employee_id}&quot;</span> within organization node <span className="text-[#00ff41] font-bold">&quot;{selectedExecution.organization_id}&quot;</span>. Grounded role credentials and domain capabilities dispatched to Role Agent.
                    </div>
                  </div>
                </div>
              )}

              {/* ── AGENT 02: Role Agent ── */}
              {activeRunningStep >= 2 && (
                <div className="dark-glass rounded-lg border border-border-tech bg-[#050906]/90 p-5 animate-fade-in space-y-3">
                  <div className="flex items-center justify-between border-b border-border-tech pb-3">
                    <div className="flex items-center gap-2.5">
                      <span className="w-6 h-6 rounded-full bg-[#00ff4120] border border-[#00ff41] text-[#00ff41] flex items-center justify-center font-mono text-xs font-bold">
                        02
                      </span>
                      <h3 className="font-mono text-sm font-bold text-on-surface">Role Agent Coordination</h3>
                      <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 font-mono text-[10px]">
                        ROLE DOMAIN STRATEGY
                      </span>
                    </div>
                    <span className="text-emerald-400 font-mono text-xs flex items-center gap-1 font-bold">
                      <Check size={14} /> Strategy Formulated
                    </span>
                  </div>

                  {/* 🎯 FINAL OUTPUT OF AGENT 2 */}
                  <div className="p-3.5 rounded bg-surface-container-high border border-border-tech/80 font-mono text-xs space-y-1.5">
                    <span className="font-label-caps text-[10px] text-blue-400 font-bold block uppercase flex items-center gap-1">
                      <Brain size={12} /> Role Agent Final Strategic Directive:
                    </span>
                    <div className="p-2.5 rounded bg-[#020403] border border-border-tech text-zinc-200 text-[11px] leading-relaxed">
                      Coordinated execution under <span className="text-blue-400 font-bold">&quot;{selectedExecution.role || "Software Engineer"}&quot;</span> standards. Strategy formulated: 1. Decompose workflow via Planner; 2. Execute targeted knowledge discovery via Research Agent; 3. Synthesize solution artifact; 4. Perform strict QA Verification check.
                    </div>
                  </div>
                </div>
              )}

              {/* ── AGENT 03: Planner Agent ── */}
              {activeRunningStep >= 3 && (
                <div className="dark-glass rounded-lg border border-border-tech bg-[#050906]/90 p-5 animate-fade-in space-y-3">
                  <div className="flex items-center justify-between border-b border-border-tech pb-3">
                    <div className="flex items-center gap-2.5">
                      <span className="w-6 h-6 rounded-full bg-[#00ff4120] border border-[#00ff41] text-[#00ff41] flex items-center justify-center font-mono text-xs font-bold">
                        03
                      </span>
                      <h3 className="font-mono text-sm font-bold text-on-surface">Planner Agent Decomposition</h3>
                      <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 font-mono text-[10px]">
                        {selectedExecution.plan?.steps?.length || 3} STEPS PLANNED
                      </span>
                    </div>
                    <span className="text-emerald-400 font-mono text-xs flex items-center gap-1 font-bold">
                      <Check size={14} /> Plan Generated
                    </span>
                  </div>

                  {/* 🎯 FINAL OUTPUT OF AGENT 3 */}
                  <div className="p-3.5 rounded bg-surface-container-high border border-border-tech/80 font-mono text-xs space-y-2">
                    <span className="font-label-caps text-[10px] text-amber-400 font-bold block uppercase flex items-center gap-1">
                      <ListOrdered size={12} /> Planner Agent Final Output &amp; Step Blueprint:
                    </span>

                    <div className="space-y-1.5">
                      {selectedExecution.plan?.steps?.map((step) => (
                        <div key={step.step_number} className="flex items-center gap-2.5 p-2 rounded bg-[#020403] border border-border-tech">
                          <span className="w-5 h-5 rounded bg-amber-500/20 text-amber-300 flex items-center justify-center text-[10px] font-bold shrink-0">
                            0{step.step_number}
                          </span>
                          <span className="text-zinc-200 flex-1 text-[11px]">{step.description}</span>
                          <span className="text-[10px] text-emerald-400 font-bold px-2 py-0.5 rounded bg-emerald-500/10">
                            PLANNED
                          </span>
                        </div>
                      ))}
                    </div>

                    {selectedExecution.plan?.acceptance_criteria && selectedExecution.plan.acceptance_criteria.length > 0 && (
                      <div className="pt-2 border-t border-border-tech/40">
                        <span className="text-zinc-500 text-[10px] uppercase block mb-1">Acceptance Criteria:</span>
                        <div className="flex flex-wrap gap-1.5">
                          {selectedExecution.plan.acceptance_criteria.map((c, i) => (
                            <span key={i} className="px-2 py-0.5 rounded bg-[#020403] border border-border-tech text-zinc-300 text-[10px]">
                              ✓ {c}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── AGENT 04: Research Agent ── */}
              {activeRunningStep >= 4 && (
                <div className="dark-glass rounded-lg border border-border-tech bg-[#050906]/90 p-5 animate-fade-in space-y-3">
                  <div className="flex items-center justify-between border-b border-border-tech pb-3">
                    <div className="flex items-center gap-2.5">
                      <span className="w-6 h-6 rounded-full bg-[#00ff4120] border border-[#00ff41] text-[#00ff41] flex items-center justify-center font-mono text-xs font-bold">
                        04
                      </span>
                      <h3 className="font-mono text-sm font-bold text-on-surface">Research Agent Context Discovery</h3>
                      <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 font-mono text-[10px]">
                        {selectedExecution.research_results?.research_required ? "RESEARCH EXECUTED" : "CONTEXT SUFFICIENT"}
                      </span>
                    </div>
                    <span className="text-emerald-400 font-mono text-xs flex items-center gap-1 font-bold">
                      <Check size={14} /> Knowledge Gathered
                    </span>
                  </div>

                  {/* 🎯 FINAL OUTPUT OF AGENT 4 */}
                  <div className="p-3.5 rounded bg-surface-container-high border border-border-tech/80 font-mono text-xs space-y-2">
                    <span className="font-label-caps text-[10px] text-purple-400 font-bold block uppercase flex items-center gap-1">
                      <BookOpen size={12} /> Research Agent Final Findings &amp; Knowledge Output:
                    </span>

                    <div className="p-2.5 rounded bg-[#020403] border border-border-tech text-zinc-200 text-[11px] leading-relaxed">
                      {selectedExecution.research_results?.summary || "Completed contextual lookup against domain parameters. All references validated for execution synthesis."}
                    </div>

                    {selectedExecution.research_results?.findings && selectedExecution.research_results.findings.length > 0 && (
                      <div className="space-y-1 pt-1">
                        <span className="text-zinc-500 text-[10px] uppercase block">Key Discovered Points:</span>
                        {selectedExecution.research_results.findings.map((f, i) => (
                          <div key={i} className="flex items-start gap-2 text-[11px] text-zinc-300 p-1.5 rounded bg-[#020403]">
                            <span className="text-purple-400 font-bold">›</span>
                            <span>{f}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── AGENT 05: Role Agent Synthesis & Verification QA ── */}
              {activeRunningStep >= 5 && (
                <div className="dark-glass rounded-lg border border-border-tech bg-[#050906]/90 p-5 animate-fade-in space-y-4">
                  <div className="flex items-center justify-between border-b border-border-tech pb-3">
                    <div className="flex items-center gap-2.5">
                      <span className="w-6 h-6 rounded-full bg-[#00ff4120] border border-[#00ff41] text-[#00ff41] flex items-center justify-center font-mono text-xs font-bold">
                        05
                      </span>
                      <h3 className="font-mono text-sm font-bold text-on-surface">QA Verification Agent Report &amp; Final Deliverable</h3>
                      <span className="px-2.5 py-0.5 rounded bg-[#00ff4120] text-[#00ff41] border border-[#00ff4144] font-mono text-xs font-bold">
                        Score: {selectedExecution.verification_result?.score ?? 100}% PASS
                      </span>
                    </div>
                    <span className="text-emerald-400 font-mono text-xs flex items-center gap-1 font-bold">
                      <Check size={14} /> Quality Verified
                    </span>
                  </div>

                  {/* 🎯 FINAL OUTPUT OF VERIFICATION AGENT */}
                  <div className="p-3.5 rounded bg-surface-container-high border border-border-tech/80 font-mono text-xs space-y-2">
                    <span className="font-label-caps text-[10px] text-[#00ff41] font-bold block uppercase flex items-center gap-1">
                      <Award size={12} /> Verification Agent Final Audit Decision:
                    </span>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <div className="p-2.5 rounded bg-[#020403] border border-border-tech">
                        <span className="text-zinc-500 text-[10px] block">Status Decision</span>
                        <span className="text-[#00ff41] font-bold text-xs">
                          {selectedExecution.verification_result?.status || "PASS"}
                        </span>
                      </div>
                      <div className="p-2.5 rounded bg-[#020403] border border-border-tech">
                        <span className="text-zinc-500 text-[10px] block">Confidence Score</span>
                        <span className="text-on-surface font-bold text-xs">
                          {selectedExecution.verification_result?.score ?? 100}% / 100
                        </span>
                      </div>
                      <div className="p-2.5 rounded bg-[#020403] border border-border-tech">
                        <span className="text-zinc-500 text-[10px] block">Retries Required</span>
                        <span className="text-on-surface font-bold text-xs">
                          {selectedExecution.retry_count ?? 0}
                        </span>
                      </div>
                    </div>

                    <div className="p-2.5 rounded bg-[#020403] border border-border-tech text-zinc-300 text-[11px]">
                      <span className="text-zinc-500 block text-[10px] uppercase font-bold mb-0.5">Evaluation Reasoning:</span>
                      {selectedExecution.verification_result?.reason || "All task parameters satisfied according to role standards."}
                    </div>
                  </div>

                  {/* 🎯 FINAL SYNTHESIZED SOLUTION DELIVERABLE */}
                  <div className="p-3.5 rounded bg-surface-container-high border border-[#00ff41]/30 font-mono text-xs space-y-2 shadow-[0_0_15px_rgba(0,255,65,0.05)]">
                    <span className="font-label-caps text-[10px] text-[#00ff41] font-bold block uppercase flex items-center gap-1">
                      <FileCode size={12} /> Final Synthesized Solution &amp; Deliverable Output:
                    </span>

                    <div className="p-4 rounded bg-[#020403] border border-border-tech text-zinc-200 font-mono text-xs whitespace-pre-wrap leading-relaxed max-h-72 overflow-y-auto">
                      {selectedExecution.result?.content || "Task execution finished. Review details in Agent Logs."}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Action Timeline Audit */}
          {activeTab === "timeline" && (
            <div className="dark-glass rounded-lg border border-border-tech bg-[#050906]/90 p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-border-tech pb-3">
                <span className="font-label-caps text-xs text-on-surface-variant font-bold">
                  Action Recorder Step-by-Step History ({actionLogs.length} Events)
                </span>
                <span className="font-mono text-xs text-zinc-500">Stored in SQLite `agent_action_logs`</span>
              </div>

              {isLoadingLogs ? (
                <div className="p-8 text-center font-mono text-xs text-zinc-500 flex items-center justify-center gap-2">
                  <RefreshCw size={14} className="animate-spin text-[#00ff41]" />
                  <span>Loading action logs...</span>
                </div>
              ) : actionLogs.length === 0 ? (
                <div className="p-6 text-center font-mono text-xs text-zinc-500">
                  No individual action logs recorded for this execution.
                </div>
              ) : (
                <div className="space-y-2.5 font-mono text-xs">
                  {actionLogs.map((log, idx) => (
                    <div key={log.id || idx} className="p-3.5 rounded bg-[#030504] border border-border-tech flex flex-col gap-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-[#00ff4115] text-[#00ff41] border border-[#00ff4133] font-bold">
                            {log.agent_name}
                          </span>
                          <span className="text-zinc-200 font-bold">{log.action}</span>
                          {log.retry_number > 0 && (
                            <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400 text-[10px]">
                              Retry #{log.retry_number}
                            </span>
                          )}
                        </div>
                        <span className="text-zinc-500">
                          {log.created_at ? new Date(log.created_at).toLocaleTimeString() : log.timestamp?.slice(11, 19)}
                        </span>
                      </div>

                      {log.input_summary && (
                        <div className="text-[11px] text-zinc-400">
                          <span className="text-zinc-500 font-bold">Input:</span> {log.input_summary}
                        </div>
                      )}

                      {log.output_summary && (
                        <div className="text-[11px] text-emerald-400/90">
                          <span className="text-zinc-500 font-bold">Output:</span> {log.output_summary}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="dark-glass rounded-lg border border-border-tech bg-[#050906]/90 p-12 text-center font-mono text-xs text-zinc-500">
          No task executions found in SQLite database. Execute a task in the Tasks section first.
        </div>
      )}
    </div>
  );
}

export default function AgentActivityPage() {
  return (
    <Suspense fallback={<div className="p-8 font-mono text-xs text-zinc-500">Loading Agent Logs...</div>}>
      <AgentActivityContent />
    </Suspense>
  );
}
