"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Bot,
  Play,
  CheckCircle2,
  AlertCircle,
  Search,
  Sparkles,
  Terminal,
  FileText,
  Clock,
  Check,
  ChevronRight,
  RefreshCw,
  History,
  ShieldCheck,
  ListOrdered,
  ArrowUpRight,
  Database,
  Brain,
  Layers,
  Code2,
  Cpu,
  BookOpen,
} from "lucide-react";
import {
  agenticTaskService,
  ExecutionResponse,
  ExecutionRecord,
} from "@/services/agentic-task.service";
import { useAuth } from "@/hooks/use-auth";

const ROLE_OPTIONS = [
  {
    role: "Software Engineer",
    icon: "💻",
    presets: [
      "Analyze database connection timeout spikes and generate mitigation plan with SQL indexes",
      "Draft OpenAPI specification and Pydantic schemas for document upload webhook",
      "Audit role-based authorization rules for multi-tenant isolation in API v1"
    ]
  },
  {
    role: "QA Engineer",
    icon: "🧪",
    presets: [
      "Design end-to-end regression test suite and assertions for employee auth session flow",
      "Generate boundary test cases for concurrent token refresh and rate limiting",
      "Construct API load testing plan and error rate threshold matrix"
    ]
  },
  {
    role: "DevOps Engineer",
    icon: "🚀",
    presets: [
      "Architect multi-stage hardened Dockerfile and Kubernetes deployment manifests",
      "Set up Prometheus metrics and Grafana alerting thresholds for 5xx latency spikes",
      "Construct zero-downtime rolling deployment pipeline in GitHub Actions"
    ]
  },
  {
    role: "Product Manager",
    icon: "📋",
    presets: [
      "Author comprehensive PRD for AI Digital Twin multi-agent work queue",
      "Formulate user stories with Given/When/Then acceptance criteria for task assignment",
      "Establish product launch milestone roadmap and success KPI tracking matrix"
    ]
  },
  {
    role: "Security Engineer",
    icon: "🛡️",
    presets: [
      "Conduct threat model analysis for JWT token storage and cross-site scripting attack surface",
      "Audit role permissions and enforce least-privilege RBAC policies across endpoints",
      "Formulate incident response protocol for unauthorized organization access attempts"
    ]
  },
  {
    role: "Data Analyst",
    icon: "📊",
    presets: [
      "Design materialized views and ETL aggregation queries for monthly task velocity analytics",
      "Construct retention cohort analysis query for active organization members",
      "Formulate data anomaly detection query for failed task execution bursts"
    ]
  }
];

export function AgenticTaskRunner() {
  const { user } = useAuth();
  const [taskPrompt, setTaskPrompt] = useState("");
  const [selectedRole, setSelectedRole] = useState(user?.job_title || "Software Engineer");
  const [isRunning, setIsRunning] = useState(false);
  const [activeTask, setActiveTask] = useState<ExecutionResponse | null>(null);
  const [storedExecutions, setStoredExecutions] = useState<ExecutionRecord[]>([]);
  const [selectedExecutionId, setSelectedExecutionId] = useState<string | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Active role config
  const currentRoleConfig = ROLE_OPTIONS.find((r) => r.role === selectedRole) || ROLE_OPTIONS[0];

  // Fetch all tasks stored in SQLite on load
  const loadStoredTasks = async () => {
    try {
      setIsLoadingHistory(true);
      const list = await agenticTaskService.listExecutions(50);
      setStoredExecutions(list);
      if (list.length > 0 && !selectedExecutionId && !activeTask) {
        setSelectedExecutionId(list[0].id);
      }
    } catch (err: any) {
      console.warn("Could not load stored tasks from SQLite:", err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    loadStoredTasks();
  }, []);

  const handleRunTask = async (customPrompt?: string, existingTaskId?: string) => {
    const promptToUse = customPrompt || taskPrompt;
    if (!promptToUse.trim()) return;

    setIsRunning(true);
    setError(null);

    try {
      const res = await agenticTaskService.executeTask({
        task_id: existingTaskId,
        task: promptToUse,
        employee_id: user?.id,
        organization_id: user?.organization_id,
        role: selectedRole,
        max_retries: 1,
      });
      setActiveTask(res);
      if (res.execution_id) {
        setSelectedExecutionId(res.execution_id);
      }
      setTaskPrompt("");
      // Refresh stored SQLite executions list
      await loadStoredTasks();
    } catch (err: any) {
      setError(err?.message || "Failed to execute agentic workflow");
    } finally {
      setIsRunning(false);
    }
  };

  const currentDisplayItem =
    storedExecutions.find((e) => e.id === selectedExecutionId) ||
    storedExecutions[0] ||
    activeTask;

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* ── Task Submission Box ── */}
      <div className="dark-glass rounded-lg p-6 border border-border-tech bg-[#050906]/90 relative overflow-hidden shadow-[0_0_25px_rgba(0,255,65,0.05)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-tech pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded bg-[#00ff4115] border border-[#00ff4144] flex items-center justify-center text-[#00ff41]">
              <Bot size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-headline-lg text-lg font-bold text-on-surface">Dynamic Agentic Task Execution</h3>
                <span className="px-2 py-0.5 rounded bg-[#00ff4110] border border-[#00ff4133] text-[#00ff41] font-mono text-[10px]">
                  ROLE-AWARE SWARM
                </span>
                <span className="px-2 py-0.5 rounded bg-purple-500/10 border border-purple-500/30 text-purple-300 font-mono text-[10px] flex items-center gap-1">
                  <Brain size={10} />
                  <span>MEMORY ACTIVE</span>
                </span>
              </div>
              <p className="font-code-sm text-xs text-on-surface-variant">
                Grounded execution tailored dynamically to role, prompt scope, and persistent memory.
              </p>
            </div>
          </div>

          {/* Role selector dropdown */}
          <div className="flex items-center gap-2">
            <label className="font-mono text-xs text-on-surface-variant font-bold">Active Role:</label>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="bg-surface-container-lowest border border-border-tech rounded px-3 py-1.5 text-xs text-[#00ff41] font-mono font-bold focus:border-[#00ff41] focus:outline-none"
            >
              {ROLE_OPTIONS.map((opt) => (
                <option key={opt.role} value={opt.role}>
                  {opt.icon} {opt.role}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Role Presets Chips */}
        <div className="mb-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-label-caps text-[10px] text-on-surface-variant uppercase flex items-center gap-1">
              <Sparkles size={11} className="text-[#00ff41]" />
              Role Presets for <strong className="text-zinc-200">{selectedRole}</strong>:
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {currentRoleConfig.presets.map((preset, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setTaskPrompt(preset);
                  handleRunTask(preset);
                }}
                disabled={isRunning}
                className="text-left px-3 py-1.5 rounded bg-surface-container-high hover:bg-surface-container-highest border border-border-tech hover:border-[#00ff4166] text-xs font-mono text-on-surface-variant hover:text-[#00ff41] transition-all disabled:opacity-50"
              >
                › {preset}
              </button>
            ))}
          </div>
        </div>

        {/* Input area */}
        <div className="flex flex-col gap-3">
          <div className="relative">
            <textarea
              rows={3}
              value={taskPrompt}
              onChange={(e) => setTaskPrompt(e.target.value)}
              placeholder={`Describe task for your ${selectedRole} Digital Twin (e.g., '${currentRoleConfig.presets[0]}')...`}
              className="w-full bg-[#030504] border border-border-tech rounded-lg p-3.5 text-sm text-on-surface font-mono placeholder:text-zinc-600 focus:border-[#00ff41] focus:ring-1 focus:ring-[#00ff4133] focus:outline-none transition-all"
            />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span className="font-mono text-[11px] text-on-surface-variant flex items-center gap-1.5">
              <Sparkles size={13} className="text-[#00ff41]" />
              Recalls long-term memory &amp; performs multi-agent planning, research, synthesis, and verification.
            </span>

            <button
              onClick={() => handleRunTask()}
              disabled={isRunning || !taskPrompt.trim()}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#00ff41] hover:bg-[#00e63a] text-[#050505] font-mono text-xs font-bold rounded transition-all shadow-[0_0_15px_rgba(0,255,65,0.25)] hover:shadow-[0_0_20px_rgba(0,255,65,0.4)] disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
            >
              {isRunning ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  <span>EXECUTING SWARM...</span>
                </>
              ) : (
                <>
                  <Play size={14} />
                  <span>EXECUTE WITH AI SWARM</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ── Error Banner ── */}
      {error && (
        <div className="p-4 rounded-lg bg-error-container/20 border border-error text-error text-xs font-mono flex items-center gap-2">
          <AlertCircle size={16} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ── Executing or Done Tasks (Stored in SQLite) ── */}
      <div className="dark-glass rounded-lg border border-border-tech bg-[#050906]/90 p-6 shadow-[0_0_25px_rgba(0,255,65,0.03)]">
        <div className="flex items-center justify-between border-b border-border-tech pb-4 mb-5">
          <div className="flex items-center gap-2.5">
            <Database size={18} className="text-[#00ff41]" />
            <h3 className="font-headline-lg text-base font-bold text-on-surface">
              Task Work Queue &amp; SQLite Executions ({storedExecutions.length})
            </h3>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadStoredTasks}
              className="p-1.5 rounded bg-surface-container-high hover:bg-surface-container-highest border border-border-tech text-zinc-400 hover:text-white font-mono text-xs flex items-center gap-1.5 transition-all"
              title="Refresh SQLite task list"
            >
              <RefreshCw size={13} className={isLoadingHistory ? "animate-spin text-[#00ff41]" : ""} />
              <span>Refresh</span>
            </button>

            <Link
              href="/agents/activity"
              className="px-3 py-1.5 rounded bg-[#00ff4115] hover:bg-[#00ff4125] border border-[#00ff4144] text-[#00ff41] font-mono text-xs font-bold flex items-center gap-1.5 transition-all"
            >
              <Terminal size={14} />
              <span>Open Agent Logs Flow</span>
              <ArrowUpRight size={13} />
            </Link>
          </div>
        </div>

        {/* Task List Grid */}
        {isLoadingHistory && storedExecutions.length === 0 ? (
          <div className="p-8 text-center font-mono text-xs text-zinc-500 flex items-center justify-center gap-2">
            <RefreshCw size={14} className="animate-spin text-[#00ff41]" />
            <span>Loading task executions from SQLite database...</span>
          </div>
        ) : storedExecutions.length === 0 ? (
          <div className="p-8 text-center font-mono text-xs text-zinc-500 border border-dashed border-border-tech rounded-lg">
            No executed tasks found in SQLite yet. Enter a task above and click &quot;EXECUTE WITH AI SWARM&quot;.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Left Column: Task Execution Items List */}
            <div className="lg:col-span-5 flex flex-col gap-2.5 max-h-[550px] overflow-y-auto pr-1">
              {storedExecutions.map((item) => {
                const isSelected = item.id === selectedExecutionId;
                const score = item.verification_result?.score ?? 100;
                const isCompleted = item.status === "COMPLETED";
                const isPending = item.status === "PENDING";

                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedExecutionId(item.id)}
                    className={`p-4 rounded-lg border transition-all cursor-pointer flex flex-col gap-2 ${
                      isSelected
                        ? "bg-surface-container-high border-[#00ff41] shadow-[0_0_15px_rgba(0,255,65,0.15)]"
                        : "bg-surface-container-lowest border-border-tech hover:border-zinc-700 hover:bg-surface-container-low"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-mono text-xs font-bold text-on-surface line-clamp-2">
                        {item.original_task}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold shrink-0 ${
                          isCompleted
                            ? "bg-[#00ff4115] text-[#00ff41] border border-[#00ff4133]"
                            : isPending
                            ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                            : item.status === "FAILED"
                            ? "bg-error/20 text-error border border-error/40"
                            : "bg-amber-500/20 text-amber-400 border border-amber-500/40 animate-pulse"
                        }`}
                      >
                        {item.status}
                      </span>
                    </div>

                    {/* Pending Action Execution Trigger */}
                    {isPending && (
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRunTask(item.original_task, item.task_id);
                          }}
                          disabled={isRunning}
                          className="px-2.5 py-1 bg-[#00ff41] hover:bg-[#00e63a] text-[#050505] font-mono text-[11px] font-bold rounded flex items-center gap-1.5 transition-all shadow-[0_0_10px_rgba(0,255,65,0.2)] disabled:opacity-50"
                        >
                          <Play size={11} />
                          <span>Run with AI Swarm</span>
                        </button>
                        <span className="font-mono text-[10px] text-amber-400/90">
                          (Company Assigned)
                        </span>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500 pt-1 border-t border-border-tech/40">
                      <span>{item.created_at ? new Date(item.created_at).toLocaleTimeString() : "Recent"}</span>
                      <div className="flex items-center gap-2">
                        {isCompleted && <span className="text-[#00ff41]">Score: {score}%</span>}
                        {isCompleted && <span className="text-zinc-600">•</span>}
                        <span>{item.plan?.steps?.length || 1} Steps</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Right Column: Selected Task Deliverable and Solution Summary */}
            <div className="lg:col-span-7 flex flex-col gap-4">
              {currentDisplayItem ? (
                <div className="p-5 rounded-lg bg-surface-container-lowest border border-border-tech flex flex-col gap-4">
                  <div className="flex items-start justify-between gap-3 border-b border-border-tech pb-3">
                    <div>
                      <span className="font-mono text-[10px] text-[#00ff41] font-bold block uppercase">
                        Active Selected Deliverable
                      </span>
                      <h4 className="font-mono text-sm font-bold text-on-surface mt-0.5">
                        {currentDisplayItem.original_task}
                      </h4>
                    </div>

                    <span className="px-2.5 py-1 rounded bg-[#00ff4115] text-[#00ff41] border border-[#00ff4133] font-mono text-xs font-bold shrink-0">
                      QA: {currentDisplayItem.verification_result?.score ?? 100}%
                    </span>
                  </div>

                  {/* Plan Steps Snapshot */}
                  {currentDisplayItem.plan?.steps && currentDisplayItem.plan.steps.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="font-label-caps text-[10px] text-zinc-500 uppercase block">Decomposed Steps:</span>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {currentDisplayItem.plan.steps.map((s) => (
                          <div key={s.step_number} className="p-2 rounded bg-surface-container-high text-[11px] font-mono text-zinc-300">
                            <span className="text-[#00ff41] font-bold block text-[10px]">Step 0{s.step_number}</span>
                            <span className="line-clamp-2">{s.description}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Solution Output Box */}
                  <div className="space-y-1.5">
                    <span className="font-label-caps text-[10px] text-zinc-500 uppercase block">Synthesized Solution Deliverable:</span>
                    <div className="p-4 rounded-lg bg-[#020403] border border-border-tech text-xs font-mono text-zinc-200 whitespace-pre-wrap leading-relaxed max-h-[300px] overflow-y-auto">
                      {currentDisplayItem.result?.content || "Task resolution output pending execution."}
                    </div>
                  </div>

                  {/* Footer link to Agent Logs */}
                  <div className="flex items-center justify-between pt-2 border-t border-border-tech/40 text-xs font-mono">
                    <span className="text-zinc-500">
                      Task ID: <code className="text-zinc-400">{currentDisplayItem.task_id}</code>
                    </span>
                    <Link
                      href={`/agents/activity?execution_id=${currentDisplayItem.id}`}
                      className="text-[#00ff41] hover:underline flex items-center gap-1 font-bold"
                    >
                      <span>View Full 5-Agent Working Flow</span>
                      <ArrowUpRight size={13} />
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="p-12 text-center font-mono text-xs text-zinc-500 border border-dashed border-border-tech rounded-lg">
                  Select a task execution to inspect deliverable.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
