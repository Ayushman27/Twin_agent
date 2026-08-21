"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { LoadingState } from "@shared/components/status/loading-state";
import {
  Cpu,
  Sliders,
  Bot,
  Shield,
  Layers,
  CheckCircle2,
  AlertCircle,
  Save,
  RotateCcw,
  Sparkles,
  Server,
  Zap,
  Lock,
  Compass,
  Check,
  UserCheck,
  Building,
} from "lucide-react";

interface AgentItem {
  id: string;
  name: string;
  category: string;
  description: string;
  status: "ENABLED" | "DISABLED" | "NOT_CONFIGURED";
  scope: "ALL" | "ROLES" | "DEPARTMENTS";
  selectedDepartments: string[];
}

export function AgentsSettingsForm() {
  const { isLoading: isAuthLoading } = useAuth();

  // Section A: AI Configuration Defaults
  const [provider, setProvider] = useState("local_slm");
  const [model, setModel] = useState("qwen3_4b");
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(4096);

  // Section B: Agent System Controls (Organization Policies)
  const [agentCreation, setAgentCreation] = useState(true);
  const [agentMemory, setAgentMemory] = useState(true);
  const [agentToolUsage, setAgentToolUsage] = useState(true);
  const [autonomousActions, setAutonomousActions] = useState(false);
  const [humanApprovalRequired, setHumanApprovalRequired] = useState(true);

  // Section C & D: Available Agents & Permissions
  const [agents, setAgents] = useState<AgentItem[]>([
    {
      id: "career_agent",
      name: "Career & Skill Growth Agent",
      category: "Professional Development",
      description: "Analyzes skills gaps, recommends customized learning paths, and models career progression horizons.",
      status: "ENABLED",
      scope: "ALL",
      selectedDepartments: ["Engineering", "Product & Design", "Operations & HR"],
    },
    {
      id: "productivity_agent",
      name: "Productivity & Workflow Agent",
      category: "Task Automation",
      description: "Assists with task breakdown, priority scheduling, meeting synthesis, and execution checklists.",
      status: "ENABLED",
      scope: "ALL",
      selectedDepartments: ["Engineering", "Product & Design", "Operations & HR"],
    },
    {
      id: "knowledge_agent",
      name: "Knowledge Base & Handbook Agent",
      category: "Enterprise Information",
      description: "Indexes enterprise documentation, answers workplace handbook questions, and resolves policy lookups.",
      status: "ENABLED",
      scope: "ALL",
      selectedDepartments: ["Engineering", "Product & Design", "Operations & HR"],
    },
    {
      id: "hr_agent",
      name: "HR & People Operations Agent",
      category: "Human Resources",
      description: "Assists new employee onboarding, leave management inquiries, and corporate benefits navigation.",
      status: "NOT_CONFIGURED",
      scope: "DEPARTMENTS",
      selectedDepartments: ["Operations & HR"],
    },
    {
      id: "finance_agent",
      name: "Finance & Expense Agent",
      category: "Corporate Finance",
      description: "Automates receipt extraction, travel allowance auditing, and departmental budget queries.",
      status: "NOT_CONFIGURED",
      scope: "ROLES",
      selectedDepartments: ["Executive Leadership", "Finance"],
    },
  ]);

  // UI Feedback States
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Toggle Agent Status
  const handleToggleAgentStatus = (agentId: string) => {
    setAgents((prev) =>
      prev.map((agent) => {
        if (agent.id !== agentId) return agent;
        const newStatus =
          agent.status === "ENABLED"
            ? "DISABLED"
            : agent.status === "DISABLED"
            ? "ENABLED"
            : "ENABLED";
        return { ...agent, status: newStatus };
      })
    );
  };

  // Change Agent Scope
  const handleChangeScope = (agentId: string, scope: "ALL" | "ROLES" | "DEPARTMENTS") => {
    setAgents((prev) =>
      prev.map((agent) => (agent.id === agentId ? { ...agent, scope } : agent))
    );
  };

  // Save Settings
  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      setSuccessMessage("AI & Agent organization policies updated in session. Backend governance endpoints will enforce execution parameters.");
      setTimeout(() => setSuccessMessage(null), 5000);
    }, 600);
  };

  if (isAuthLoading) {
    return <LoadingState label="Loading AI & Agent configuration context..." />;
  }

  return (
    <form onSubmit={handleSaveSettings} className="space-y-8 animate-fade-in-up pb-12">
      {/* Global Success Banner */}
      {successMessage && (
        <div className="p-3.5 bg-primary-container/10 border border-primary-container/40 text-primary-container text-xs font-code-sm flex items-center justify-between rounded-sm animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={15} />
            <span>{successMessage}</span>
          </div>
          <span className="text-[10px] font-mono border border-primary-container/30 px-1.5 py-0.5">
            SAVED
          </span>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* CARD 1: SECTION A — AI CONFIGURATION DEFAULTS */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="p-6 bg-surface-container-low border border-border-tech rounded-sm space-y-5">
        <div className="border-b border-border-tech pb-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 border border-primary-container/40 bg-primary-container/10 text-primary-container rounded-sm">
              <Cpu size={18} />
            </div>
            <div>
              <h2 className="font-label-caps text-xs font-bold text-on-surface uppercase tracking-wider">
                Section A — AI Provider &amp; Model Defaults
              </h2>
              <p className="font-code-sm text-[11px] text-on-surface-variant">
                Configure primary inference engines, temperature sampling, and token context limits.
              </p>
            </div>
          </div>
          <span className="font-code-sm text-[10px] text-primary-container uppercase px-2 py-0.5 border border-primary-container/30 bg-primary-container/10 rounded-sm">
            Inference Engine
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* AI Provider */}
          <div>
            <label className="block font-label-caps text-xs text-on-surface-variant mb-1.5 uppercase">
              Default AI Provider
            </label>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              className="w-full bg-surface-container-low border border-border-tech px-3 py-2.5 font-code-sm text-sm text-on-surface focus:border-primary-container focus:outline-none transition-colors"
            >
              <option value="local_slm">Local SLM (Qwen3-4B Edge Engine)</option>
              <option value="openai">OpenAI (GPT-4o / GPT-4o-mini)</option>
              <option value="anthropic">Anthropic Claude (3.5 Sonnet)</option>
              <option value="groq">Groq (Llama-3.3 Cloud)</option>
              <option value="ollama">Ollama Self-Hosted Cluster</option>
            </select>
          </div>

          {/* Default Model */}
          <div>
            <label className="block font-label-caps text-xs text-on-surface-variant mb-1.5 uppercase">
              Default Model
            </label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full bg-surface-container-low border border-border-tech px-3 py-2.5 font-code-sm text-sm text-on-surface focus:border-primary-container focus:outline-none transition-colors"
            >
              <option value="qwen3_4b">Qwen3-4B-Instruct (Local SLM)</option>
              <option value="gpt_4o_mini">gpt-4o-mini (OpenAI Cloud)</option>
              <option value="claude_35_haiku">claude-3-5-haiku-20241022</option>
              <option value="llama_33_70b">llama-3.3-70b-versatile</option>
            </select>
          </div>

          {/* Temperature */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block font-label-caps text-xs text-on-surface-variant uppercase">
                Temperature
              </label>
              <span className="font-mono text-xs text-primary-container">{temperature.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="0.0"
              max="1.0"
              step="0.05"
              value={temperature}
              onChange={(e) => setTemperature(parseFloat(e.target.value))}
              className="w-full accent-primary-container cursor-pointer mt-2"
            />
            <div className="flex justify-between text-[10px] font-code-sm text-on-surface-variant mt-1">
              <span>0.0 (Precise)</span>
              <span>1.0 (Creative)</span>
            </div>
          </div>

          {/* Maximum Tokens */}
          <div>
            <label className="block font-label-caps text-xs text-on-surface-variant mb-1.5 uppercase">
              Maximum Tokens
            </label>
            <select
              value={maxTokens}
              onChange={(e) => setMaxTokens(parseInt(e.target.value, 10))}
              className="w-full bg-surface-container-low border border-border-tech px-3 py-2.5 font-code-sm text-sm text-on-surface focus:border-primary-container focus:outline-none transition-colors"
            >
              <option value="2048">2,048 Tokens</option>
              <option value="4096">4,096 Tokens (Default)</option>
              <option value="8192">8,192 Tokens (Extended)</option>
              <option value="16384">16,384 Tokens (Max Context)</option>
            </select>
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* CARD 2: SECTION B — AGENT SYSTEM GOVERNANCE CONTROLS */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="p-6 bg-surface-container-low border border-border-tech rounded-sm space-y-6">
        <div className="border-b border-border-tech pb-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 border border-primary-container/40 bg-primary-container/10 text-primary-container rounded-sm">
              <Sliders size={18} />
            </div>
            <div>
              <h2 className="font-label-caps text-xs font-bold text-on-surface uppercase tracking-wider">
                Section B — Agent System Organization Controls
              </h2>
              <p className="font-code-sm text-[11px] text-on-surface-variant">
                Enterprise policy thresholds governing autonomous execution, memory retention, and tool use.
              </p>
            </div>
          </div>
          <span className="font-code-sm text-[10px] text-on-surface-variant uppercase px-2 py-0.5 border border-border-tech">
            Policy Switches
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Control 1: Agent Creation */}
          <div className="p-4 bg-surface-layer border border-border-tech rounded-sm flex items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="font-label-caps text-xs font-semibold text-on-surface uppercase">
                Agent Creation
              </div>
              <p className="font-code-sm text-[11px] text-on-surface-variant leading-relaxed">
                Allow authenticated employees to spin up custom task agents and project assistants.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setAgentCreation(!agentCreation)}
              className={`w-11 h-6 shrink-0 rounded-full border transition-colors relative cursor-pointer ${
                agentCreation
                  ? "bg-primary-container/20 border-primary-container"
                  : "bg-surface-container-high border-border-tech"
              }`}
            >
              <span
                className={`block w-4 h-4 rounded-full transition-transform ${
                  agentCreation
                    ? "bg-primary-container translate-x-5 shadow-[0_0_8px_rgba(0,255,65,0.4)]"
                    : "bg-neutral-500 translate-x-1"
                }`}
              />
            </button>
          </div>

          {/* Control 2: Agent Memory */}
          <div className="p-4 bg-surface-layer border border-border-tech rounded-sm flex items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="font-label-caps text-xs font-semibold text-on-surface uppercase">
                Long-Term Memory
              </div>
              <p className="font-code-sm text-[11px] text-on-surface-variant leading-relaxed">
                Enable SQLite vector memory retrieval across multiple user chat sessions.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setAgentMemory(!agentMemory)}
              className={`w-11 h-6 shrink-0 rounded-full border transition-colors relative cursor-pointer ${
                agentMemory
                  ? "bg-primary-container/20 border-primary-container"
                  : "bg-surface-container-high border-border-tech"
              }`}
            >
              <span
                className={`block w-4 h-4 rounded-full transition-transform ${
                  agentMemory
                    ? "bg-primary-container translate-x-5 shadow-[0_0_8px_rgba(0,255,65,0.4)]"
                    : "bg-neutral-500 translate-x-1"
                }`}
              />
            </button>
          </div>

          {/* Control 3: Agent Tool Usage */}
          <div className="p-4 bg-surface-layer border border-border-tech rounded-sm flex items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="font-label-caps text-xs font-semibold text-on-surface uppercase">
                Tool &amp; Function Invocation
              </div>
              <p className="font-code-sm text-[11px] text-on-surface-variant leading-relaxed">
                Permit agents to invoke external search, calculators, and workspace API tools.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setAgentToolUsage(!agentToolUsage)}
              className={`w-11 h-6 shrink-0 rounded-full border transition-colors relative cursor-pointer ${
                agentToolUsage
                  ? "bg-primary-container/20 border-primary-container"
                  : "bg-surface-container-high border-border-tech"
              }`}
            >
              <span
                className={`block w-4 h-4 rounded-full transition-transform ${
                  agentToolUsage
                    ? "bg-primary-container translate-x-5 shadow-[0_0_8px_rgba(0,255,65,0.4)]"
                    : "bg-neutral-500 translate-x-1"
                }`}
              />
            </button>
          </div>

          {/* Control 4: Autonomous Actions */}
          <div className="p-4 bg-surface-layer border border-border-tech rounded-sm flex items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="font-label-caps text-xs font-semibold text-on-surface uppercase">
                Autonomous Actions
              </div>
              <p className="font-code-sm text-[11px] text-on-surface-variant leading-relaxed">
                Allow agents to execute multi-step tool plans without requiring step-by-step confirmation.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setAutonomousActions(!autonomousActions)}
              className={`w-11 h-6 shrink-0 rounded-full border transition-colors relative cursor-pointer ${
                autonomousActions
                  ? "bg-primary-container/20 border-primary-container"
                  : "bg-surface-container-high border-border-tech"
              }`}
            >
              <span
                className={`block w-4 h-4 rounded-full transition-transform ${
                  autonomousActions
                    ? "bg-primary-container translate-x-5 shadow-[0_0_8px_rgba(0,255,65,0.4)]"
                    : "bg-neutral-500 translate-x-1"
                }`}
              />
            </button>
          </div>

          {/* Control 5: Human Approval Required */}
          <div className="p-4 bg-surface-layer border border-border-tech rounded-sm flex items-start justify-between gap-3 md:col-span-2">
            <div className="space-y-1">
              <div className="font-label-caps text-xs font-semibold text-on-surface uppercase flex items-center gap-2">
                <span>Human-in-the-Loop Approval</span>
                <span className="text-[9px] text-primary-container border border-primary-container/40 px-1">RECOMMENDED</span>
              </div>
              <p className="font-code-sm text-[11px] text-on-surface-variant leading-relaxed">
                Require interactive administrator or employee approval before executing state-modifying actions or writing data.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setHumanApprovalRequired(!humanApprovalRequired)}
              className={`w-11 h-6 shrink-0 rounded-full border transition-colors relative cursor-pointer ${
                humanApprovalRequired
                  ? "bg-primary-container/20 border-primary-container"
                  : "bg-surface-container-high border-border-tech"
              }`}
            >
              <span
                className={`block w-4 h-4 rounded-full transition-transform ${
                  humanApprovalRequired
                    ? "bg-primary-container translate-x-5 shadow-[0_0_8px_rgba(0,255,65,0.4)]"
                    : "bg-neutral-500 translate-x-1"
                }`}
              />
            </button>
          </div>
        </div>

        <div className="p-3.5 border border-border-tech bg-surface-layer font-code-sm text-xs text-on-surface-variant rounded-sm flex items-start gap-2">
          <Sparkles size={14} className="text-primary-container shrink-0 mt-0.5" />
          <span>
            <strong className="text-on-surface">Architecture Isolation Notice: </strong>
            These toggles configure organization governance policies. SQLite agent execution engines remain completely isolated until policy middleware connects to the runtime.
          </span>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* CARD 3 & 4: SECTION C & D — AVAILABLE AGENTS & PERMISSIONS */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="p-6 bg-surface-container-low border border-border-tech rounded-sm space-y-6">
        <div className="border-b border-border-tech pb-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 border border-primary-container/40 bg-primary-container/10 text-primary-container rounded-sm">
              <Bot size={18} />
            </div>
            <div>
              <h2 className="font-label-caps text-xs font-bold text-on-surface uppercase tracking-wider">
                Sections C &amp; D — Available Agents &amp; Scope Permissions
              </h2>
              <p className="font-code-sm text-[11px] text-on-surface-variant">
                Enable specialized agent workflows and restrict availability by departmental hierarchy.
              </p>
            </div>
          </div>
          <span className="font-code-sm text-[10px] text-primary-container uppercase px-2 py-0.5 border border-primary-container/30 bg-primary-container/10 rounded-sm">
            5 Agent Types
          </span>
        </div>

        <div className="space-y-4">
          {agents.map((agent) => (
            <div
              key={agent.id}
              className={`p-4 rounded-sm border transition-all ${
                agent.status === "ENABLED"
                  ? "bg-surface-layer border-border-tech"
                  : "bg-surface-container-high/20 border-border-tech/50 opacity-75"
              }`}
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                {/* Agent Header & Details */}
                <div className="space-y-1.5 max-w-xl">
                  <div className="flex items-center gap-2.5">
                    <span className="font-display-xl text-sm font-semibold text-on-surface">
                      {agent.name}
                    </span>
                    <span className="font-code-sm text-[10px] text-on-surface-variant border border-border-tech px-1.5 py-0.5 rounded-sm">
                      {agent.category}
                    </span>
                    {agent.status === "ENABLED" && (
                      <span className="px-2 py-0.5 bg-primary-container/20 border border-primary-container/40 text-primary-container font-code-sm text-[10px] uppercase font-bold rounded-sm">
                        Enabled
                      </span>
                    )}
                    {agent.status === "DISABLED" && (
                      <span className="px-2 py-0.5 bg-surface-container-high border border-border-tech text-on-surface-variant font-code-sm text-[10px] uppercase rounded-sm">
                        Disabled
                      </span>
                    )}
                    {agent.status === "NOT_CONFIGURED" && (
                      <span className="px-2 py-0.5 bg-amber-500/10 border border-amber-500/30 text-amber-300 font-code-sm text-[10px] uppercase rounded-sm">
                        Not Configured
                      </span>
                    )}
                  </div>
                  <p className="font-code-sm text-xs text-on-surface-variant leading-relaxed">
                    {agent.description}
                  </p>
                </div>

                {/* Status Toggle & Scope Controls */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 shrink-0">
                  {/* Scope Selector */}
                  <div className="flex items-center gap-2 bg-surface-container-low p-1 border border-border-tech rounded-sm font-code-sm text-xs">
                    <span className="text-[10px] font-label-caps text-on-surface-variant uppercase pl-1.5 pr-1">
                      Scope:
                    </span>
                    <button
                      type="button"
                      onClick={() => handleChangeScope(agent.id, "ALL")}
                      className={`px-2 py-0.5 text-[10px] rounded-sm transition-colors cursor-pointer ${
                        agent.scope === "ALL"
                          ? "bg-primary-container text-black font-bold"
                          : "text-on-surface-variant hover:text-on-surface"
                      }`}
                    >
                      All Employees
                    </button>
                    <button
                      type="button"
                      onClick={() => handleChangeScope(agent.id, "ROLES")}
                      className={`px-2 py-0.5 text-[10px] rounded-sm transition-colors cursor-pointer ${
                        agent.scope === "ROLES"
                          ? "bg-primary-container text-black font-bold"
                          : "text-on-surface-variant hover:text-on-surface"
                      }`}
                    >
                      Selected Roles
                    </button>
                    <button
                      type="button"
                      onClick={() => handleChangeScope(agent.id, "DEPARTMENTS")}
                      className={`px-2 py-0.5 text-[10px] rounded-sm transition-colors cursor-pointer ${
                        agent.scope === "DEPARTMENTS"
                          ? "bg-primary-container text-black font-bold"
                          : "text-on-surface-variant hover:text-on-surface"
                      }`}
                    >
                      Selected Depts
                    </button>
                  </div>

                  {/* Enable/Disable Button */}
                  <button
                    type="button"
                    onClick={() => handleToggleAgentStatus(agent.id)}
                    className={`px-3 py-1.5 font-code-sm text-xs font-semibold uppercase tracking-wider rounded-sm transition-colors cursor-pointer ${
                      agent.status === "ENABLED"
                        ? "bg-surface-container-high border border-border-tech text-on-surface hover:border-error-container hover:text-error"
                        : "bg-primary-container text-black font-bold hover:bg-primary-fixed-dim"
                    }`}
                  >
                    {agent.status === "ENABLED" ? "Disable" : "Enable Agent"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* CARD 5: SECTION E — AI PROVIDER STATUS */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="p-6 bg-surface-container-low border border-border-tech rounded-sm space-y-5">
        <div className="border-b border-border-tech pb-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 border border-primary-container/40 bg-primary-container/10 text-primary-container rounded-sm">
              <Server size={18} />
            </div>
            <div>
              <h2 className="font-label-caps text-xs font-bold text-on-surface uppercase tracking-wider">
                Section E — Model Provider Status &amp; Vault Isolation
              </h2>
              <p className="font-code-sm text-[11px] text-on-surface-variant">
                Real-time connection telemetry. API keys are strictly stored server-side.
              </p>
            </div>
          </div>
          <span className="font-code-sm text-[10px] text-on-surface-variant uppercase px-2 py-0.5 border border-border-tech">
            Telemetry Feed
          </span>
        </div>

        <div className="border border-border-tech bg-surface-layer rounded-sm overflow-hidden">
          <table className="w-full text-left border-collapse font-code-sm text-xs">
            <thead>
              <tr className="border-b border-border-tech bg-surface-container-high/30 font-label-caps text-[10px] text-on-surface-variant uppercase tracking-wider">
                <th className="py-3 px-4 font-semibold">Provider / Engine</th>
                <th className="py-3 px-4 font-semibold">Target Model</th>
                <th className="py-3 px-4 font-semibold">Execution Layer</th>
                <th className="py-3 px-4 font-semibold">Vault Credential</th>
                <th className="py-3 px-4 font-semibold text-right">Connection Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-tech/60 text-on-surface">
              {/* Qwen3-4B */}
              <tr className="hover:bg-surface-container-high/20 transition-colors">
                <td className="py-3.5 px-4 font-semibold text-primary-container flex items-center gap-2">
                  <Zap size={14} />
                  <span>Local SLM (Qwen3-4B)</span>
                </td>
                <td className="py-3.5 px-4 font-mono text-on-surface">
                  Qwen3-4B-Instruct-Q4_K_M
                </td>
                <td className="py-3.5 px-4 text-on-surface-variant">
                  Edge / On-Premise NPU
                </td>
                <td className="py-3.5 px-4 text-on-surface-variant font-mono">
                  Self-Hosted (Zero External Key)
                </td>
                <td className="py-3.5 px-4 text-right">
                  <span className="inline-flex items-center gap-1.5 text-emerald-400 text-xs font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Available &amp; Ready</span>
                  </span>
                </td>
              </tr>

              {/* OpenAI */}
              <tr className="hover:bg-surface-container-high/20 transition-colors">
                <td className="py-3.5 px-4 font-semibold text-on-surface flex items-center gap-2">
                  <Server size={14} className="text-on-surface-variant" />
                  <span>OpenAI Cloud</span>
                </td>
                <td className="py-3.5 px-4 font-mono text-on-surface-variant">
                  gpt-4o / gpt-4o-mini
                </td>
                <td className="py-3.5 px-4 text-on-surface-variant">
                  api.openai.com
                </td>
                <td className="py-3.5 px-4 text-on-surface-variant font-mono">
                  •••••••••••••••• (Encrypted)
                </td>
                <td className="py-3.5 px-4 text-right">
                  <span className="inline-flex items-center gap-1.5 text-on-surface-variant text-xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-neutral-600" />
                    <span>Not Configured</span>
                  </span>
                </td>
              </tr>

              {/* Anthropic Claude */}
              <tr className="hover:bg-surface-container-high/20 transition-colors">
                <td className="py-3.5 px-4 font-semibold text-on-surface flex items-center gap-2">
                  <Server size={14} className="text-on-surface-variant" />
                  <span>Anthropic Claude</span>
                </td>
                <td className="py-3.5 px-4 font-mono text-on-surface-variant">
                  claude-3-5-sonnet-20241022
                </td>
                <td className="py-3.5 px-4 text-on-surface-variant">
                  api.anthropic.com
                </td>
                <td className="py-3.5 px-4 text-on-surface-variant font-mono">
                  •••••••••••••••• (Encrypted)
                </td>
                <td className="py-3.5 px-4 text-right">
                  <span className="inline-flex items-center gap-1.5 text-on-surface-variant text-xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-neutral-600" />
                    <span>Not Configured</span>
                  </span>
                </td>
              </tr>

              {/* Ollama */}
              <tr className="hover:bg-surface-container-high/20 transition-colors">
                <td className="py-3.5 px-4 font-semibold text-on-surface flex items-center gap-2">
                  <Server size={14} className="text-on-surface-variant" />
                  <span>Ollama Local Engine</span>
                </td>
                <td className="py-3.5 px-4 font-mono text-on-surface-variant">
                  Self-Hosted Custom Models
                </td>
                <td className="py-3.5 px-4 text-on-surface-variant">
                  http://localhost:11434
                </td>
                <td className="py-3.5 px-4 text-on-surface-variant font-mono">
                  Local REST Bridge
                </td>
                <td className="py-3.5 px-4 text-right">
                  <span className="inline-flex items-center gap-1.5 text-amber-300 text-xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                    <span>Standby</span>
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* ACTION FOOTER */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="p-4 bg-surface-container-high border border-border-tech rounded-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-code-sm text-on-surface-variant">
          <Sparkles size={14} className="text-primary-container" />
          <span>AI configuration controls require organization administrator privileges.</span>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            type="submit"
            disabled={isSaving}
            className="w-full sm:w-auto px-6 py-2.5 bg-primary-container hover:bg-primary-fixed-dim text-black font-code-sm text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-40 cursor-pointer flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(0,255,65,0.2)]"
          >
            {isSaving ? (
              <span>Saving Configuration...</span>
            ) : (
              <>
                <Save size={14} />
                <span>Save AI Configuration</span>
              </>
            )}
          </button>
        </div>
      </div>
    </form>
  );
}
